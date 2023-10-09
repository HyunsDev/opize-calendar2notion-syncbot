import { calendar_v3 } from 'googleapis';

import { WorkerResult } from '@/module/worker/types/result';

import { EXPECTED_RULE, TestCase } from './Case';

export class G2NCreateCase extends TestCase {
    name = 'G2NCreateCase';
    private gCalEvent: calendar_v3.Schema$Event;

    async init() {}

    async work() {
        const title = 'G2N 이벤트 생성 테스트';
        this.gCalEvent = (
            await this.ctx.gcal.createTestGoogleCalendarEvent(title)
        ).data;
    }

    async validate(result: WorkerResult) {
        const eventLink = await this.ctx.service.getEventLinkFromGoogleEventId(
            this.gCalEvent.id,
        );
        const notionPage = await this.ctx.notion.getPage(
            eventLink.notionPageId,
        );

        this.log(`페이지: ${notionPage?.id || '(찾을 수 없음)'}`);

        this.expect(result.fail, false);
        this.expect(result.syncEvents.gCal2NotionCount > 0, true);
        this.expect(notionPage, EXPECTED_RULE.NOT_NULL);
    }

    async cleanUp() {
        await this.ctx.gcal.deleteEvent(this.gCalEvent.id);
    }
}
