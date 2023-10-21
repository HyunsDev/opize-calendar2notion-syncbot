import dayjs from 'dayjs';

import { WorkerResult } from '@/module/worker/types/result';

import { TestEventData } from '../class/TestEventData';
import { TestNotionPage } from '../class/TestNotionPage';

import { TestCase } from './Case';

const NOW = dayjs();
const PAGE1: TestEventData = {
    title: 'N2G 이벤트 삭제 테스트',
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

export class N2GDeleteCase extends TestCase {
    name = 'N2GDeleteCase';

    page: TestNotionPage;
    date: dayjs.Dayjs;

    async init() {
        this.page = new TestNotionPage(this.ctx);
        await this.page.create(PAGE1);
    }

    async work() {
        await this.page.getEventLink();
        await this.page.delete();
    }

    async validate(result: WorkerResult) {
        this.expect(result.fail, false);
        this.expect(result.syncEvents.notion2GCalCount > 0, true);

        // 구글 캘린더
        const gcalEvent = await this.ctx.gcal.getEvent(
            this?.page.eventLink?.googleCalendarEventId || '',
            this.ctx.calendar,
        );
        this.expect(gcalEvent?.data?.status, 'cancelled');

        // 노션
        const notionPage = await this.page.get();
        this.expect(notionPage.archived, true);
    }

    async cleanUp() {}
}
