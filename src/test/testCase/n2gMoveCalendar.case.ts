import {
    CreatePageResponse,
    PageObjectResponse,
} from '@notionhq/client/build/src/api-endpoints';

import { WorkerResult } from '@/module/worker/types/result';

import { getProp } from '../test.notion.service';

import { EXPECTED_RULE, TestCase } from './Case';

export class N2GMoveCalendarCase extends TestCase {
    name = 'N2GMoveCalendarCase';
    private notionPage: CreatePageResponse;

    async init() {
        const title = 'N2G 캘린더 이동 테스트';
        this.notionPage = await this.ctx.notion.createTestNotionPage(title);
    }

    async work() {
        this.notionPage = await this.ctx.notion.moveCalendar(
            this.notionPage.id,
        );
    }

    async validate(result: WorkerResult) {
        const eventLink = await this.ctx.service.getEventLinkFromNotionPageId(
            this.notionPage.id,
        );

        // 작업 결과
        this.expect(result.fail, false);
        this.expect(result.syncEvents.notion2GCalCount > 0, true);

        // 구글 캘린더 이벤트 검증
        const oldGCalEvent = await this.ctx.gcal.getEvent(
            eventLink.googleCalendarEventId,
            this.ctx.calendar,
        );
        this.expect(oldGCalEvent.data, null);

        const newGCalEvent = await this.ctx.gcal.getEvent(
            eventLink.googleCalendarEventId,
            this.ctx.calendar2,
        );
        this.expect(newGCalEvent?.data, EXPECTED_RULE.NOT_NULL);

        // 노션 페이지 검증
        const notionPage = await this.ctx.notion.getPage(this.notionPage.id);
        const calendarProp = getProp(
            notionPage as PageObjectResponse,
            this.ctx.user.parsedNotionProps.calendar,
            'select',
        );
        this.expect(
            calendarProp?.select?.name,
            this.ctx.calendar2.googleCalendarName,
        );
    }

    async cleanUp() {
        await this.ctx.notion.deletePage(this.notionPage.id);
    }
}
