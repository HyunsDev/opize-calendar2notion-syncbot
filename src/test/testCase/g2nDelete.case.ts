import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { EventEntity } from '@opize/calendar2notion-object';
import { calendar_v3 } from 'googleapis';

import { WorkerResult } from '@/module/worker/types/result';

import { EXPECTED_RULE, TestCase } from './Case';

export class G2NDeleteCase extends TestCase {
    name = 'G2NDeleteCase';
    private gCalEvent: calendar_v3.Schema$Event;
    private eventLink: EventEntity;

    async init() {
        const title = 'G2N 이벤트 삭제 테스트';
        this.gCalEvent = (
            await this.ctx.gcal.createTestGoogleCalendarEvent(title)
        ).data;
    }

    async work() {
        this.eventLink = await this.ctx.service.getEventLinkFromGoogleEventId(
            this.gCalEvent.id,
        );

        await this.ctx.gcal.deleteEvent(this.gCalEvent.id);
    }

    async validate(result: WorkerResult) {
        if (!this.eventLink) {
            this.expect(this.eventLink, EXPECTED_RULE.NOT_NULL);
            return;
        }

        const notionPage = await this.ctx.notion.getPage(
            this?.eventLink?.notionPageId || '',
        );

        this.expect(result.fail, false);
        this.expect(result.syncEvents.gCal2NotionCount > 0, true);
        this.expect((notionPage as PageObjectResponse).archived, true);
    }

    async cleanUp() {}
}
