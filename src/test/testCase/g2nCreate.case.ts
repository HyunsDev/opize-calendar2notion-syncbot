import dayjs from 'dayjs';

import { WorkerResult } from '@/module/worker/types/result';

import { TestEventData } from '../class/TestEventData';
import { TestGCalEvent } from '../class/TestGCalEvent';

import { EXPECTED_RULE, TestCase } from './Case';

const NOW = dayjs();
const EVENT1: TestEventData = {
    title: 'G2N 이벤트 생성 테스트',
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

        const notionPage = await this.ctx.notion.getPage(
            eventLink.notionPageId,
        );

        this.expect(result.fail, false);
        this.expect(result.syncEvents.gCal2NotionCount > 0, true);
        this.expect(notionPage, EXPECTED_RULE.NOT_NULL);
    }

    async cleanUp() {
        await this.gCalEvent.delete();
    }
}
