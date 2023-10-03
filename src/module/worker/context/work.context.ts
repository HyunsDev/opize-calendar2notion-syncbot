import { CalendarEntity, UserEntity } from '@opize/calendar2notion-object';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

import { env } from '@/env/env';

import { WorkerResult } from '../types/result';
import { SyncConfig } from '../types/syncConfig';
dayjs.extend(utc);
dayjs.extend(timezone);

export class WorkContext {
    readonly workerId: string;
    readonly startedAt: Date;
    readonly referenceTime: Date;
    readonly userId: number;
    config: SyncConfig;
    result: WorkerResult;

    user: UserEntity;
    calendars: CalendarEntity[];
    connectedCalendars: CalendarEntity[];
    writeableCalendars: CalendarEntity[];

    constructor(
        workerId: string,
        userId: number,
        startedAt: Date,
        referenceTime: Date,
    ) {
        this.workerId = workerId;
        this.startedAt = startedAt;
        this.referenceTime = referenceTime;
        this.userId = userId;

        this.result = {
            step: 'init',
            fail: false,
            eraseDeletedEvent: {
                notion: -1,
                eventLink: -1,
            },
            syncEvents: {
                gCalCalendarCount: -1,
                notion2GCalCount: -1,
                gCal2NotionCount: -1,
            },
            syncNewCalendar: {},
            simpleResponse: '',
        };
    }

    setCalendars(calendars: CalendarEntity[]) {
        this.calendars = calendars;
        this.connectedCalendars = calendars.filter(
            (e) => e.status === 'CONNECTED',
        );
        this.writeableCalendars = calendars
            .filter((e) => e.status === 'CONNECTED')
            .filter((e) => e.accessRole !== 'reader');
    }

    getInitConfig() {
        const config = {
            timeMin:
                this.user.syncYear === 0
                    ? env.MIN_DATE
                    : dayjs(
                          `${this.user.syncYear - 1}-01-01T01:00:00+09:00`,
                      ).toISOString(),
            timeMax: env.MAX_DATE,
        };
        return config;
    }

    getResult() {
        this.updateSimpleResult();
        return this.result;
    }

    private updateSimpleResult() {
        this.result.simpleResponse = [
            this.user.id,
            this.result?.fail ? 'FAIL' : 'SUCCESS',
            this.result?.step,
            this.result?.eraseDeletedEvent?.notion,
            this.result?.eraseDeletedEvent?.eventLink,
            this.result?.syncEvents?.gCalCalendarCount,
            this.result?.syncEvents?.gCal2NotionCount,
            this.result?.syncEvents?.notion2GCalCount,
            Object.keys(this?.result?.syncNewCalendar || {})?.length,
            Object.values(this?.result?.syncNewCalendar || {}).reduce(
                (pre, cur) => pre + cur?.eventCount,
                0,
            ),
            Math.round(new Date().getTime() - this.startedAt.getTime()) / 1000,
        ].join(' ');
    }
}
