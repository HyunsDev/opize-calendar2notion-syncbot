import dayjs from 'dayjs';
import { Not } from 'typeorm';

import { DB } from '@/database';
import { workerLogger } from '@/logger/winston';

import { bot } from '../bot';

import {
    EventLinkAssist,
    GoogleCalendarAssist,
    NotionAssist,
    WorkerAssist,
} from './assist';
import { WorkContext } from './context/work.context';
import { workerExceptionFilter } from './exception/exceptionFilter';
import { WorkerResult } from './types/result';
import { timeout } from '@/utils';

export class Worker {
    context: WorkContext;

    notionAssist: NotionAssist;
    googleCalendarAssist: GoogleCalendarAssist;
    eventLinkAssist: EventLinkAssist;
    workerAssist: WorkerAssist;

    private debugLog(message: string) {
        workerLogger.debug(
            `[${this.context.workerId}:${this.context.user.id}] ${message}`,
        );
    }

    constructor(userId: number, workerId: string) {
        const now = dayjs();
        const startedAt = now.toDate();
        const referenceTime = now.second(0).millisecond(0).toDate();
        this.context = new WorkContext(
            workerId,
            userId,
            startedAt,
            referenceTime,
        );
    }

    async run(): Promise<WorkerResult> {
        this.context.user = await this.getTargetUser();
        await workerExceptionFilter(
            async () => await timeout(this.runSteps(), bot.syncBot.timeout),
            this.context,
        );

        const result = this.context.getResult();
        return result;
    }

    private async runSteps() {
        await this.init();
        await this.startSync();
        await this.validation();

        if (this.context.user.lastCalendarSync) {
            await this.eraseDeletedEvent();
            await this.syncEvents();
            await this.syncNewCalendars();
        } else {
            await this.initAccount();
        }

        await this.endSync();
    }

    /**
     * 작업을 시작하기 전에 필요한 데이터를 불러오고, Assist를 초기화합니다.
     */
    private async init() {
        this.debugLog('STEP: init');

        const calendars = await this.getUserCalendar();
        this.context.setCalendars(calendars);

        this.context.config = this.context.getInitConfig();

        this.eventLinkAssist = new EventLinkAssist({
            context: this.context,
        });

        this.notionAssist = new NotionAssist({
            context: this.context,
            eventLinkAssist: this.eventLinkAssist,
        });

        this.googleCalendarAssist = new GoogleCalendarAssist({
            context: this.context,
            eventLinkAssist: this.eventLinkAssist,
        });

        this.workerAssist = new WorkerAssist({
            context: this.context,
            eventLinkAssist: this.eventLinkAssist,
            googleCalendarAssist: this.googleCalendarAssist,
            notionAssist: this.notionAssist,
        });
    }

    /**
     *
     */
    private async startSync() {
        this.debugLog('STEP: startSync');
        this.context.result.step = 'startSync';
        await this.workerAssist.startSyncUserUpdate();
    }

    // 유효성 검증
    private async validation() {
        this.debugLog('STEP: validation');
        this.context.result.step = 'validation';
        await this.workerAssist.validationAndRestore();
    }

    // 제거된 페이지 삭제
    private async eraseDeletedEvent() {
        this.debugLog('STEP: eraseDeletedEvent');
        this.context.result.step = 'eraseDeletedEvent';

        await this.workerAssist.eraseDeletedNotionPage();
        await this.workerAssist.eraseDeletedEventLink();
    }

    // 동기화
    private async syncEvents() {
        this.debugLog('STEP: validation');
        this.context.result.step = 'syncEvents';

        const updatedPages = await this.notionAssist.getUpdatedPages();
        this.debugLog(`updatedPages: ${updatedPages.length}개`);

        const updatedGCalEvents =
            await this.googleCalendarAssist.getUpdatedEvents();
        this.debugLog(`updatedGCalEvents: ${updatedGCalEvents.length}개`);

        for (const event of updatedGCalEvents) {
            await this.notionAssist.CUDPage(event);
        }

        for (const page of updatedPages) {
            await this.googleCalendarAssist.CUDEvent(page);
        }
    }

    // 새로운 캘린더 연결
    private async syncNewCalendars() {
        this.context.result.step = 'syncNewCalendar';

        const newCalendars = this.context.calendars.filter(
            (e) => e.status === 'PENDING',
        );

        for (const newCalendar of newCalendars) {
            await this.workerAssist.syncNewCalendar(newCalendar);
        }
    }

    // 계정 초기 세팅
    private async initAccount() {
        this.context.result.step = 'initAccount';

        const newCalendars = this.context.calendars.filter(
            (e) => e.status === 'PENDING',
        );

        for (const newCalendar of newCalendars) {
            await this.workerAssist.syncNewCalendar(newCalendar);
        }
    }

    // 작업 종료
    private async endSync() {
        this.context.result.step = 'endSync';

        await this.workerAssist.endSyncUserUpdate();
        await this.workerAssist.deleteOldErrorLogs();
    }

    private async getTargetUser() {
        return await DB.user.findOne({
            where: {
                id: this.context.userId,
            },
            relations: ['notionWorkspace'],
        });
    }

    private async getUserCalendar() {
        return await DB.calendar.find({
            where: {
                userId: this.context.userId,
                status: Not('DISCONNECTED'),
            },
        });
    }
}
