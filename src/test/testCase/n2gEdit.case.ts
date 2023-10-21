import dayjs from 'dayjs';

import { GoogleCalendarEventDto } from '@/module/event';
import { WorkerResult } from '@/module/worker/types/result';

import { TestEventData } from '../class/TestEventData';
import { TestNotionPage } from '../class/TestNotionPage';
import { getProp, richText } from '../test.notion.service';

import { EXPECTED_RULE, TestCase } from './Case';

const NOW = dayjs();

const PAGE1: TestEventData = {
    title: 'N2G 이벤트 수정 테스트',
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

const PAGE2: TestEventData = {
    title: 'N2G 이벤트 수정 테스트 (수정됨)',
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

export class N2GEditCase extends TestCase {
    name = 'N2GEditCase';
    private page: TestNotionPage;

    async init() {
        this.page = new TestNotionPage(this.ctx);
        await this.page.create(PAGE1);
    }

    async work() {
        await this.page.update(PAGE2);
    }

    async validate(result: WorkerResult) {
        const eventLink = await this.page.getEventLink();
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
        this.expect(gcalEvent?.data?.summary, PAGE2.title);
        this.expect(gcalEvent?.data.start?.dateTime, EXPECTED_RULE.NOT_NULL);
        this.expect(gcalEvent?.data?.description, PAGE2.description);
        this.expect(gcalEvent?.data?.location, PAGE2.location);
        const date2 = GoogleCalendarEventDto.convertDateFromEvent(PAGE2?.date);
        this.expect(
            dayjs(gcalEvent?.data?.start?.dateTime).toISOString(),
            dayjs(date2.start.dateTime).toISOString(),
        );
        this.expect(
            dayjs(gcalEvent?.data?.end?.dateTime).toISOString(),
            dayjs(date2.end.dateTime).toISOString(),
        );

        // Notion
        const page = await this.page.get();
        const props = this.ctx.user.parsedNotionProps;

        this.expect(richText(getProp(page, props.title, 'title')), PAGE2.title);
        this.expect(
            richText(getProp(page, props.description, 'rich_text')),
            PAGE2.description,
        );
        this.expect(
            richText(getProp(page, props.location, 'rich_text')),
            PAGE2.location,
        );
    }

    async cleanUp() {
        await this.page.delete();
    }
}
