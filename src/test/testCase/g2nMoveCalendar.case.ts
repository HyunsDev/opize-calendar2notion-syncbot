import { EventEntity } from '@opize/calendar2notion-object';
import dayjs from 'dayjs';

import { WorkerResult } from '@/module/worker/types/result';
import { getProp } from '@/utils/getProp';

import { TestEventData } from '../class/TestEventData';
import { TestGCalEvent } from '../class/TestGCalEvent';

import { EXPECTED_RULE, TestCase } from './Case';

const NOW = dayjs();
const EVENT1: TestEventData = {
    title: 'G2N 이벤트 캘린더 이동 테스트',
    date: {
        start: {
            date: NOW.format('YYYY-MM-DD'),
        },
        end: {
            date: NOW.add(1, 'day').format('YYYY-MM-DD'),
        },
    },
    location: 'TEST LOCATION',
    description: 'TEST DESCRIPTION',
};

export class G2NMoveCalendarCase extends TestCase {
    name = 'G2NMoveCalendarCase';
    private gCalEvent: TestGCalEvent;
    private oldEventLink: EventEntity;

    async init() {
        this.gCalEvent = new TestGCalEvent(this.ctx);
        await this.gCalEvent.create(EVENT1);
        this.oldEventLink = await this.gCalEvent.getEventLink();
    }

    async work() {
        await this.gCalEvent.moveCalendar();
    }

    async validate(result: WorkerResult) {
        const eventLink = await this.gCalEvent.getEventLink();

        // 작업 결과
        this.expect(result.fail, false);
        this.expect(result.syncEvents.gCal2NotionCount > 0, true);

        // 노션 페이지 검증
        const notionPage = await this.ctx.notion.getPage(
            eventLink.notionPageId,
        );

        this.expect(notionPage?.id, EXPECTED_RULE.NOT_NULL);
        const calendarProp = getProp(
            notionPage,
            this.ctx.user.parsedNotionProps.calendar,
            'select',
        );
        this.expect(
            calendarProp?.select?.name,
            this.ctx.calendar2.googleCalendarName,
        );

        // 구글 캘린더 이벤트 검증
        const oldGCalEvent = await this.ctx.gcal.getEvent(
            eventLink.googleCalendarEventId,
            this.ctx.calendar,
        );
        this.expect(oldGCalEvent.data.status, 'cancelled');

        const newGCalEvent = await this.ctx.gcal.getEvent(
            eventLink.googleCalendarEventId,
            this.ctx.calendar2,
        );
        this.expect(newGCalEvent.data.status, 'confirmed');
        this.expect(newGCalEvent?.data, EXPECTED_RULE.NOT_NULL);
    }

    async cleanUp() {
        await this.gCalEvent.delete();
    }
}
