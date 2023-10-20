import { CreatePageResponse } from '@notionhq/client/build/src/api-endpoints';
import { EventEntity } from '@opize/calendar2notion-object';

import { WorkerResult } from '@/module/worker/types/result';

import { TestCase } from './Case';

export class N2GDeleteCase extends TestCase {
    name = 'N2GDeleteCase';
    private notionPage: CreatePageResponse;
    private eventLink: EventEntity;

    async init() {
        const title = 'N2G 이벤트 삭제 테스트';
        this.notionPage = await this.ctx.notion.createTestNotionPage(title);
    }

    async work() {
        this.eventLink = await this.ctx.service.getEventLinkFromNotionPageId(
            this.notionPage?.id,
        );
        this.notionPage = await this.ctx.notion.deletePage(this.notionPage.id);
    }

    async validate(result: WorkerResult) {
        const gcalEvent = await this.ctx.gcal.getEvent(
            this?.eventLink?.googleCalendarEventId || '',
            this.ctx.calendar,
        );

        this.expect(result.fail, false);
        this.expect(result.syncEvents.notion2GCalCount > 0, true);
        this.expect(gcalEvent?.data?.status, 'cancelled');
    }

    async cleanUp() {}
}
