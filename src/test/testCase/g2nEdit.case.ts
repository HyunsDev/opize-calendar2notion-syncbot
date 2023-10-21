import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import dayjs from 'dayjs';

import { NotionEventDto } from '@/module/event';
import { WorkerResult } from '@/module/worker/types/result';

import { TestEventData } from '../class/TestEventData';
import { TestGCalEvent } from '../class/TestGCalEvent';
import { getProp, richText } from '../test.notion.service';

import { EXPECTED_RULE, TestCase } from './Case';

const NOW = dayjs();

const EVENT1: TestEventData = {
    title: 'G2N 이벤트 수정 테스트',
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

const EVENT2: TestEventData = {
    title: 'G2N 이벤트 수정 테스트 (수정됨)',
    date: {
        start: {
            dateTime: NOW.hour(12).second(0).millisecond(0).toISOString(),
        },
        end: {
            dateTime: NOW.hour(13).second(0).millisecond(0).toISOString(),
        },
    },
    location: 'EDITED TEST LOCATION',
    description: 'EDITED TEST DESCRIPTION',
};

export class G2NEditCase extends TestCase {
    name = 'G2NEditCase';
    private gCalEvent: TestGCalEvent;

    async init() {
        this.gCalEvent = new TestGCalEvent(this.ctx);
        await this.gCalEvent.create(EVENT1);
    }

    async work() {
        await this.gCalEvent.update(EVENT2);
    }

    async validate(result: WorkerResult) {
        const props = this.ctx.user.parsedNotionProps;

        const eventLink = await this.gCalEvent.getEventLink();
        const notionPage = (await this.ctx.notion.getPage(
            eventLink.notionPageId,
        )) as PageObjectResponse;

        this.expect(result.fail, false);
        this.expect(result.syncEvents.gCal2NotionCount > 0, true);
        this.expect(notionPage?.id, EXPECTED_RULE.NOT_NULL);

        // NOTION
        this.expect(
            richText(getProp(notionPage, props.title, 'title')),
            'G2N 이벤트 수정 테스트 (수정됨)',
        );
        this.expect(
            richText(getProp(notionPage, props.description, 'rich_text')),
            'EDITED TEST DESCRIPTION',
        );
        this.expect(
            richText(getProp(notionPage, props.location, 'rich_text')),
            'EDITED TEST LOCATION',
        );
        const date = getProp(notionPage, props.date, 'date');
        const date2 = NotionEventDto.convertDateFromEvent(EVENT2.date);
        this.expect(
            dayjs(date?.date.start).toISOString(),
            dayjs(date2.start).toISOString(),
        );
        this.expect(
            dayjs(date?.date.end).toISOString(),
            dayjs(date2.end).toISOString(),
        );

        // google calendar
        const gCalEvent = await this.gCalEvent.get();

        this.expect(gCalEvent?.data, EXPECTED_RULE.NOT_NULL);
        this.expect(
            gCalEvent?.data?.summary,
            'G2N 이벤트 수정 테스트 (수정됨)',
        );
        this.expect(gCalEvent?.data?.description, 'EDITED TEST DESCRIPTION');
        this.expect(gCalEvent?.data?.location, 'EDITED TEST LOCATION');
    }

    async cleanUp() {
        await this.gCalEvent.delete();
    }
}
