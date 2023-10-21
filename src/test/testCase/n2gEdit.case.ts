import {
    CreatePageResponse,
    PageObjectResponse,
} from '@notionhq/client/build/src/api-endpoints';

import { WorkerResult } from '@/module/worker/types/result';

import { getProp } from '../test.notion.service';

import { EXPECTED_RULE, TestCase } from './Case';

export class N2GEditCase extends TestCase {
    name = 'N2GEditCase';
    private notionPage: CreatePageResponse;

    async init() {
        const title = 'N2G 이벤트 수정 테스트';
        this.notionPage = await this.ctx.notion.createTestNotionPage(title);
    }

    async work() {
        const title = 'N2G 이벤트 수정 테스트 (수정됨)';
        this.notionPage = await this.ctx.notion.updateTestNotionPage(
            this.notionPage.id,
            title,
        );
    }

    async validate(result: WorkerResult) {
        const eventLink = await this.ctx.service.getEventLinkFromNotionPageId(
            this.notionPage.id,
        );
        this.expect(eventLink, EXPECTED_RULE.NOT_NULL);
        if (!eventLink) {
            return;
        }

        const gcalEvent = await this.ctx.gcal.getEvent(
            eventLink.googleCalendarEventId,
            this.ctx.calendar,
        );

        this.expect(result.fail, false);
        this.expect(result.syncEvents.notion2GCalCount > 0, true);

        // GCal
        this.expect(gcalEvent?.data, EXPECTED_RULE.NOT_NULL);
        this.expect(
            gcalEvent?.data?.summary,
            'N2G 이벤트 수정 테스트 (수정됨)',
        );
        this.expect(gcalEvent?.data?.description, 'EDITED TEST DESCRIPTION');
        this.expect(gcalEvent?.data?.location, 'EDITED TEST LOCATION');

        // Notion
        const page = await this.ctx.notion.getPage(this.notionPage.id);
        this.expect(
            getProp(
                page as PageObjectResponse,
                this.ctx.user.parsedNotionProps.title,
                'title',
            )
                .title.map((t) => t.plain_text)
                .join(''),
            'N2G 이벤트 수정 테스트 (수정됨)',
        );

        this.expect(
            getProp(
                page as PageObjectResponse,
                this.ctx.user.parsedNotionProps.description,
                'rich_text',
            )
                .rich_text.map((t) => t.plain_text)
                .join(''),
            'EDITED TEST DESCRIPTION',
        );

        this.expect(
            getProp(
                page as PageObjectResponse,
                this.ctx.user.parsedNotionProps.location,
                'rich_text',
            )
                .rich_text.map((t) => t.plain_text)
                .join(''),
            'EDITED TEST LOCATION',
        );
    }

    async cleanUp() {
        await this.ctx.notion.deletePage(this.notionPage.id);
    }
}
