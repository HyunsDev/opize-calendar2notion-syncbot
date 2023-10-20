import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { calendar_v3 } from 'googleapis';

import { WorkerResult } from '@/module/worker/types/result';

import { getProp } from '../test.notion.service';

import { EXPECTED_RULE, TestCase } from './Case';

export class G2NMoveCalendarCase extends TestCase {
    name = 'G2NMoveCalendarCase';
    private gCalEvent: calendar_v3.Schema$Event;

    async init() {
        const title = 'G2N 이벤트 캘린더 이동 테스트';
        this.gCalEvent = (
            await this.ctx.gcal.createTestGoogleCalendarEvent(title)
        ).data;
    }

    async work() {
        await this.ctx.gcal.moveTestGoogleCalendarEvent(this.gCalEvent.id);
    }

    async validate(result: WorkerResult) {
        const eventLink = await this.ctx.service.getEventLinkFromGoogleEventId(
            this.gCalEvent.id,
        );

        // 작업 결과
        this.expect(result.fail, false);
        this.expect(result.syncEvents.gCal2NotionCount > 0, true);

        // 노션 페이지 검증
        const notionPage = await this.ctx.notion.getPage(
            eventLink.notionPageId,
        );
        this.expect(notionPage?.id, EXPECTED_RULE.NOT_NULL);
        const calendarProp = getProp(
            notionPage as PageObjectResponse,
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
        this.expect(newGCalEvent?.data, EXPECTED_RULE.NOT_NULL);
    }

    async cleanUp() {
        await this.ctx.gcal.deleteEvent(this.gCalEvent.id);
    }
}
