import dayjs from 'dayjs';
import { Not } from 'typeorm';

import { DB } from '@/database';
import { workerLogger } from '@/logger/winston';
import { timeout } from '@/utils';

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
        this.context = new WorkContext(workerId, userId);
    }

    async run(): Promise<WorkerResult> {
        const user = await this.getTargetUser();
        if (!user) {
            throw new Error('유저를 찾을 수 없습니다.');
        }

        this.context.setUser(user);

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
        const res = await this.validation();

        if (res.skip) {
            await this.endSync();
            return;
        }

        if (this.isUserInitialized()) {
            await this.eraseDeletedEvent();
            await this.syncEvents();
            await this.syncNewCalendars();
        } else {
            await this.initAccount();
        }

        await this.endSync();
    }

    private isUserInitialized() {
        return this.context.user.lastCalendarSync;
    }

    /**
     * 작업을 시작하기 전에 필요한 데이터를 불러오고, Assist를 초기화합니다.
     */
    private async init() {
        this.debugLog('STEP: init');

        if (this.context.user.lastCalendarSync) {
            this.debugLog(
                `period: ${this.context.period.start.toISOString()} ~ ${this.context.period.end.toISOString()}`,
            );
        }

        const calendars = await this.getUserCalendar();
        this.context.setCalendars(calendars);

        this.eventLinkAssist = new EventLinkAssist({
            context: this.context,
        });

        this.notionAssist = new NotionAssist({
            context: this.context,
        });

        this.googleCalendarAssist = new GoogleCalendarAssist({
            context: this.context,
        });

        this.workerAssist = new WorkerAssist({
            context: this.context,
        });

        this.eventLinkAssist.dependencyInjection({});
        this.notionAssist.dependencyInjection({
            eventLinkAssist: this.eventLinkAssist,
            googleCalendarAssist: this.googleCalendarAssist,
        });
        this.googleCalendarAssist.dependencyInjection({
            eventLinkAssist: this.eventLinkAssist,
            notionAssist: this.notionAssist,
        });
        this.workerAssist.dependencyInjection({
            eventLinkAssist: this.eventLinkAssist,
            googleCalendarAssist: this.googleCalendarAssist,
            notionAssist: this.notionAssist,
        });
    }

    private async startSync() {
        this.debugLog('STEP: startSync');
        this.context.result.step = 'startSync';

        await this.workerAssist.startSyncUserUpdate();
    }

    // 유효성 검증
    private async validation() {
        this.debugLog('STEP: validation');
        this.context.result.step = 'validation';

        if (this.context.period.start >= this.context.period.end) {
            return {
                skip: true,
            };
        }

        await this.notionAssist.validationAndRestore();
        await this.googleCalendarAssist.validation();
        return {
            skip: false,
        };
    }

    // 제거된 페이지 삭제
    private async eraseDeletedEvent() {
        this.debugLog('STEP: eraseDeletedEvent');
        this.context.result.step = 'eraseDeletedEvent';

        await this.workerAssist.eraseDeletedNotionPage();
        this.debugLog(
            `eraseDeletedNotionPage: ${this.context.result.eraseDeletedEvent.notion}개`,
        );

        await this.workerAssist.eraseDeletedEventLink();
        this.debugLog(
            `eraseDeletedEventLink: ${this.context.result.eraseDeletedEvent.eventLink}개`,
        );
    }

    // 동기화
    private async syncEvents() {
        this.debugLog('STEP: syncEvents');
        this.context.result.step = 'syncEvents';

        const updatedPages = await this.notionAssist.getUpdatedPages();
        this.debugLog(`updatedPages: ${updatedPages.length}개`);

        const updatedGCalEvents =
            await this.googleCalendarAssist.getUpdatedEvents();
        this.debugLog(`updatedGCalEvents: ${updatedGCalEvents.length}개`);

        const pages = updatedPages.filter((page) => {
            if (!page.eventLink) return true;
            const event = updatedGCalEvents.find(
                (e) =>
                    page?.eventLink?.googleCalendarEventId ===
                    e.googleCalendarEventId,
            );
            if (!event) return true;
            return (
                dayjs(event.updatedAt).second(0) >
                dayjs(page.updatedAt).second(0)
            );
        });

        const events = updatedGCalEvents.filter((event) => {
            if (!event.eventLink) return true;
            const page = updatedPages.find(
                (e) => event?.eventLink?.notionPageId === e.notionPageId,
            );
            if (!page) return true;
            return (
                dayjs(page.updatedAt).second(0) >=
                dayjs(event.updatedAt).second(0)
            );
        });

        for (const event of events) {
            await this.notionAssist.CUDPage(event);
        }

        for (const page of pages) {
            await this.googleCalendarAssist.CUDEvent(page);
        }
    }

    // 새로운 캘린더 연결
    private async syncNewCalendars() {
        this.debugLog('STEP: syncNewCalendar');
        this.context.result.step = 'syncNewCalendar';

        const newCalendars = this.context.calendars.filter(
            (e) => e.status === 'PENDING',
        );

        for (const newCalendar of newCalendars) {
            await this.workerAssist.syncNewCalendar(newCalendar);
            this.debugLog(
                `새로운 캘린더 연결: ${newCalendar.googleCalendarName}`,
            );
        }
    }

    // 계정 초기 세팅
    private async initAccount() {
        this.debugLog('STEP: initAccount');
        this.context.result.step = 'initAccount';

        const newCalendars = this.context.calendars.filter(
            (e) => e.status === 'PENDING',
        );

        for (const newCalendar of newCalendars) {
            await this.workerAssist.syncNewCalendar(newCalendar);
            this.debugLog(
                `새로운 캘린더 연결: ${newCalendar.googleCalendarName}`,
            );
        }
    }

    // 작업 종료
    private async endSync() {
        this.debugLog('STEP: endSync');
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
