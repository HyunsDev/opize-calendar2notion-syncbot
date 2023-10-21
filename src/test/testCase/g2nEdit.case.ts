import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { calendar_v3 } from 'googleapis';

import { WorkerResult } from '@/module/worker/types/result';

import { getProp } from '../test.notion.service';

import { EXPECTED_RULE, TestCase } from './Case';

export class G2NEditCase extends TestCase {
    name = 'G2NEditCase';
    private gCalEvent: calendar_v3.Schema$Event;

    async init() {
        const title = 'G2N 이벤트 수정 테스트';
        this.gCalEvent = (
            await this.ctx.gcal.createTestGoogleCalendarEvent(title)
        ).data;
    }

    async work() {
        const title = 'G2N 이벤트 수정 테스트 (수정됨)';
        await this.ctx.gcal.editTestGoogleCalendarEvent(
            this.gCalEvent.id,
            title,
        );
    }

    async validate(result: WorkerResult) {
        const props = this.ctx.user.parsedNotionProps;

        const eventLink = await this.ctx.service.getEventLinkFromGoogleEventId(
            this.gCalEvent.id,
        );
        const notionPage = await this.ctx.notion.getPage(
            eventLink.notionPageId,
        );

        this.expect(result.fail, false);
        this.expect(result.syncEvents.gCal2NotionCount > 0, true);
        this.expect(notionPage?.id, EXPECTED_RULE.NOT_NULL);

        // NOTION
        this.expect(
            getProp(notionPage as PageObjectResponse, props.title, 'title')
                .title.map((v) => v.plain_text)
                .join(''),
            'G2N 이벤트 수정 테스트 (수정됨)',
        );

        this.expect(
            getProp(
                notionPage as PageObjectResponse,
                props.description,
                'rich_text',
            )
                .rich_text.map((v) => v.plain_text)
                .join(''),
            'EDITED TEST DESCRIPTION',
        );

        this.expect(
            getProp(
                notionPage as PageObjectResponse,
                props.location,
                'rich_text',
            )
                .rich_text.map((v) => v.plain_text)
                .join(''),
            'EDITED TEST LOCATION',
        );

        // google calendar
        const gCalEvent = await this.ctx.gcal.getEvent(
            eventLink.googleCalendarEventId,
            this.ctx.calendar,
        );

        this.expect(gCalEvent?.data, EXPECTED_RULE.NOT_NULL);
        this.expect(
            gCalEvent?.data?.summary,
            'G2N 이벤트 수정 테스트 (수정됨)',
        );
        this.expect(gCalEvent?.data?.description, 'EDITED TEST DESCRIPTION');
        this.expect(gCalEvent?.data?.location, 'EDITED TEST LOCATION');
    }

    async cleanUp() {
        await this.ctx.gcal.deleteEvent(this.gCalEvent.id);
    }
}
