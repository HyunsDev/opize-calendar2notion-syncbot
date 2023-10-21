import dayjs from 'dayjs';

import { WorkerResult } from '@/module/worker/types/result';

import { TestEventData } from '../class/TestEventData';
import { TestNotionPage } from '../class/TestNotionPage';
import { getProp, richText } from '../test.notion.service';

import { EXPECTED_RULE, TestCase } from './Case';

const NOW = dayjs();
const PAGE1: TestEventData = {
    title: 'N2G 이벤트 생성 테스트',
    date: {
        start: {
            date: NOW.format('YYYY-MM-DD'),
        },
        end: {
            date: NOW.format('YYYY-MM-DD'),
        },
    },
    location: 'TEST LOCATION',
    description: 'TEST DESCRIPTION',
};

export class N2GCreateCase extends TestCase {
    name = 'N2GCreateCase';
    private page: TestNotionPage;

    async init() {}

    async work() {
        this.page = new TestNotionPage(this.ctx);
        await this.page.create(PAGE1);
    }

    async validate(result: WorkerResult) {
        const eventLink = await this.page.getEventLink();

        if (!eventLink) {
            this.expect(eventLink, EXPECTED_RULE.NOT_NULL);
            return;
        }

        this.expect(result.fail, false);
        this.expect(result.syncEvents.notion2GCalCount > 0, true);

        // 구글 캘린더 이벤트 테스트
        const gcalEvent = await this.ctx.gcal.getEvent(
            eventLink.googleCalendarEventId,
            this.ctx.calendar,
        );
        this.expect(gcalEvent?.data, EXPECTED_RULE.NOT_NULL);

        // 노션 이벤트 테스트
        const notionPage = await this.page.get();
        const props = this.ctx.user.parsedNotionProps;

        this.expect(
            richText(getProp(notionPage, props.title, 'title')),
            PAGE1.title,
        );

        this.expect(
            richText(getProp(notionPage, props.description, 'rich_text')),
            PAGE1.description,
        );

        this.expect(
            richText(getProp(notionPage, props.location, 'rich_text')),
            PAGE1.location,
        );
    }

    async cleanUp() {
        await this.page.delete();
    }
}
