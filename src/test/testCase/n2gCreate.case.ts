import { CreatePageResponse } from '@notionhq/client/build/src/api-endpoints';

import { WorkerResult } from '@/module/worker/types/result';

import { EXPECTED_RULE, TestCase } from './Case';

export class N2GCreateCase extends TestCase {
    name = 'N2GCreateCase';
    private notionPage: CreatePageResponse;

    async init() {}

    async work() {
        const title = 'N2G 이벤트 생성 테스트';
        this.notionPage = await this.ctx.notion.createTestNotionPage(title);
    }

    async validate(result: WorkerResult) {
        const eventLink = await this.ctx.service.getEventLinkFromNotionPageId(
            this.notionPage.id,
        );

        if (!eventLink) {
            this.expect(eventLink, EXPECTED_RULE.NOT_NULL);
            return;
        }

        const gcalEvent = await this.ctx.gcal.getEvent(
            eventLink.googleCalendarEventId,
        );

        this.expect(result.fail, false);
        this.expect(result.syncEvents.notion2GCalCount > 0, true);
        this.expect(gcalEvent?.data, EXPECTED_RULE.NOT_NULL);
    }

    async cleanUp() {
        await this.ctx.notion.deletePage(this.notionPage.id);
    }
}
