import { CreatePageResponse } from '@notionhq/client/build/src/api-endpoints';
import { EventEntity } from '@opize/calendar2notion-object';

import { WorkerResult } from '@/module/worker/types/result';

import { EXPECTED_RULE, TestCase } from './Case';

export class N2GDeleteCase extends TestCase {
    name = 'N2GDeleteCase';
    private notionPage: CreatePageResponse;
    private eventLink: EventEntity;

    async init() {
        const title = 'N2G 이벤트 수정 테스트';
        this.notionPage = await this.ctx.notion.createTestNotionPage(title);
        this.eventLink = await this.ctx.service.getEventLinkFromNotionPageId(
            this.notionPage?.id,
        );
    }

    async work() {
        this.notionPage = await this.ctx.notion.deletePage(this.notionPage.id);
    }

    async validate(result: WorkerResult) {
        const gcalEvent = await this.ctx.gcal.getEvent(
            this?.eventLink?.googleCalendarEventId || '',
        );

        this.log(`페이지: ${gcalEvent?.data?.id || '(찾을 수 없음)'}`);

        this.expect(result.fail, false);
        this.expect(result.syncEvents.notion2GCalCount > 0, true);

        this.expect(gcalEvent?.data, EXPECTED_RULE.NULL);
    }

    async cleanUp() {}
}
