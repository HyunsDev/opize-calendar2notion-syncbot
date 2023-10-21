import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { EventEntity } from '@opize/calendar2notion-object';
import dayjs from 'dayjs';

import { WorkerResult } from '@/module/worker/types/result';

import { TestEventData } from '../class/TestEventData';
import { TestGCalEvent } from '../class/TestGCalEvent';

import { EXPECTED_RULE, TestCase } from './Case';

const NOW = dayjs();
const EVENT1: TestEventData = {
    title: 'G2N 이벤트 삭제 테스트',
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

export class G2NDeleteCase extends TestCase {
    name = 'G2NDeleteCase';
    private gCalEvent: TestGCalEvent;

    private eventLink: EventEntity;

    async init() {
        this.gCalEvent = new TestGCalEvent(this.ctx);
        await this.gCalEvent.create(EVENT1);
    }

    async work() {
        this.eventLink = await this.gCalEvent.getEventLink();
        await this.gCalEvent.delete();
    }

    async validate(result: WorkerResult) {
        if (!this.eventLink) {
            this.expect(this.eventLink, EXPECTED_RULE.NOT_NULL);
            return;
        }

        this.expect(result.fail, false);
        this.expect(result.syncEvents.gCal2NotionCount > 0, true);

        // 노션 페이지 검증
        const notionPage = await this.ctx.notion.getPage(
            this?.eventLink?.notionPageId || '',
        );
        this.expect((notionPage as PageObjectResponse).archived, true);

        // 구글 이벤트 검증
        const gCalEvent = await this.gCalEvent.get();
        this.expect(gCalEvent?.data?.status, 'cancelled');
    }

    async cleanUp() {}
}
