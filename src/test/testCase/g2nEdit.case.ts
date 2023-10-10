import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { calendar_v3 } from 'googleapis';

import { WorkerResult } from '@/module/worker/types/result';

import { getProps } from '../test.notion.service';

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

        const titleProps = (notionPage as PageObjectResponse).properties?.title;
        this.expect(
            titleProps.type === 'title' &&
                titleProps.title[0].plain_text ===
                    'G2N 이벤트 수정 테스트 (수정됨)',
            true,
        );

        const descriptionProps = getProps(
            notionPage as PageObjectResponse,
            props.description,
            'rich_text',
        );
        this.expect(
            descriptionProps.rich_text[0].plain_text,
            'EDITED TEST DESCRIPTION',
        );

        const locationProps = getProps(
            notionPage as PageObjectResponse,
            props.location,
            'rich_text',
        );
        this.expect(
            locationProps.rich_text[0].plain_text,
            'EDITED TEST LOCATION',
        );
    }

    async cleanUp() {
        await this.ctx.gcal.deleteEvent(this.gCalEvent.id);
    }
}
