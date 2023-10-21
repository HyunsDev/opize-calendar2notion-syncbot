import dayjs from 'dayjs';

import { WorkerResult } from '@/module/worker/types/result';

import { TestEventData } from '../class/TestEventData';
import { TestNotionPage } from '../class/TestNotionPage';
import { getProp, richText } from '../test.notion.service';

import { TestCase } from './Case';

const NOW = dayjs();
const PAGE1: TestEventData = {
    title: 'N2G 이벤트 캘린더 이동 테스트',
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

export class N2GMoveCalendarCase extends TestCase {
    name = 'N2GMoveCalendarCase';
    page: TestNotionPage;

    async init() {
        this.page = new TestNotionPage(this.ctx);
        await this.page.create(PAGE1);
    }

    async work() {
        await this.page.moveCalendar();
    }

    async validate(result: WorkerResult) {
        const eventLink = await this.page.getEventLink();

        // 작업 결과
        this.expect(result.fail, false);
        this.expect(result.syncEvents.notion2GCalCount > 0, true);

        // 구글 캘린더 이벤트 검증
        const oldGCalEvent = await this.ctx.gcal.getEvent(
            eventLink.googleCalendarEventId,
            this.ctx.calendar,
        );
        this.expect(oldGCalEvent.data.status, 'cancelled');

        const newGCalEvent = await this.ctx.gcal.getEvent(
            eventLink.googleCalendarEventId,
            this.ctx.calendar2,
        );
        this.expect(newGCalEvent?.data.status, 'confirmed');

        // 노션 페이지 검증
        const notionPage = await this.page.get();
        const props = this.ctx.user.parsedNotionProps;

        const calendarProp = getProp(notionPage, props.calendar, 'select');
        this.expect(
            calendarProp?.select?.name,
            this.ctx.calendar2.googleCalendarName,
        );
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
