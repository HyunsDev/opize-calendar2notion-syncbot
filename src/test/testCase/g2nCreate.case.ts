import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import dayjs from 'dayjs';

import { WorkerResult } from '@/module/worker/types/result';

import { TestEventData } from '../class/TestEventData';
import { TestGCalEvent } from '../class/TestGCalEvent';
import { getProp, richText } from '../test.notion.service';

import { EXPECTED_RULE, TestCase } from './Case';

const NOW = dayjs();
const EVENT1: TestEventData = {
    title: 'G2N 이벤트 생성 테스트',
    date: {
        start: {
            date: NOW.format('YYYY-MM-DD'),
        },
        end: {
            date: NOW.add(1, 'day').format('YYYY-MM-DD'),
        },
    },
    location: 'TEST LOCATION',
    description: 'TEST DESCRIPTION',
};

export class G2NCreateCase extends TestCase {
    name = 'G2NCreateCase';

    private gCalEvent: TestGCalEvent;

    async init() {}

    async work() {
        this.gCalEvent = new TestGCalEvent(this.ctx);
        await this.gCalEvent.create(EVENT1);
    }

    async validate(result: WorkerResult) {
        const eventLink = await this.gCalEvent.getEventLink();
        this.expect(eventLink, EXPECTED_RULE.NOT_NULL);
        if (!eventLink) return;

        this.expect(result.fail, false);
        this.expect(result.syncEvents.gCal2NotionCount > 0, true);

        // 구글 이벤트 검증
        const gCalEvent = await this.gCalEvent.get();
        this.expect(gCalEvent?.data, EXPECTED_RULE.NOT_NULL);
        this.expect(gCalEvent?.data?.summary, EVENT1.title);
        this.expect(gCalEvent?.data?.location, EVENT1.location);
        this.expect(gCalEvent?.data?.description, EVENT1.description);
        this.expect(gCalEvent?.data?.start?.date, EVENT1.date?.start?.date);
        this.expect(gCalEvent?.data?.end?.date, EVENT1.date.end?.date);

        // 노션 페이지 검증
        const props = this.ctx.user.parsedNotionProps;
        const notionPage = (await this.ctx.notion.getPage(
            eventLink.notionPageId,
        )) as PageObjectResponse;
        this.expect(notionPage, EXPECTED_RULE.NOT_NULL);
        this.expect(
            richText(getProp(notionPage, props.title, 'title')),
            EVENT1.title,
        );
        this.expect(
            richText(getProp(notionPage, props.location, 'rich_text')),
            EVENT1.location,
        );
        this.expect(
            richText(getProp(notionPage, props.description, 'rich_text')),
            EVENT1.description,
        );
    }

    async cleanUp() {
        await this.gCalEvent.delete();
    }
}
