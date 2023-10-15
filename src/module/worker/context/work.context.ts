import { CalendarEntity, UserEntity } from '@opize/calendar2notion-object';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

import { env } from '@/env/env';

import { WorkerResult } from '../types/result';
import { SyncConfig } from '../types/syncConfig';
dayjs.extend(utc);
dayjs.extend(timezone);

const getInitConfig = (user: UserEntity) => {
    const config = {
        timeMin:
            user.syncYear === 0
                ? env.MIN_DATE
                : dayjs(
                      `${user.syncYear - 1}-01-01T01:00:00+09:00`,
                  ).toISOString(),
        timeMax: env.MAX_DATE,
    };
    return config;
};

export class WorkContext {
    readonly workerId: string;
    readonly userId: number;

    readonly startedAt: Date;
    period: {
        start: Date;
        end: Date;
    };

    config: SyncConfig;
    result: WorkerResult;

    user: UserEntity;
    calendars: CalendarEntity[];
    connectedCalendars: CalendarEntity[];
    writeableCalendars: CalendarEntity[];

    constructor(workerId: string, userId: number) {
        this.workerId = workerId;
        this.userId = userId;

        const now = dayjs();
        const startedAt = now.toDate();
        this.startedAt = startedAt;

        /**
         * 동기화 기간은 start 이상, end 미만으로 적용됩니다.
         */
        this.period = {
            start: undefined,
            end: now.second(0).millisecond(0).toDate(),
        };

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

    setUser(user: UserEntity) {
        this.user = user;
        this.period.start = dayjs(user.lastCalendarSync).toDate();
        this.config = getInitConfig(this.user);
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
