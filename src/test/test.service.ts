import { DB } from '@/database';

import { TestContext } from './test.context';

export class TestService {
    private ctx: TestContext;

    constructor(ctx: TestContext) {
        this.ctx = ctx;
    }

    async getEventLinkFromNotionPageId(pageId: string) {
        const event = await DB.event.findOne({
            where: {
                notionPageId: pageId,
            },
        });

        return event;
    }

    async getEventLinkFromGoogleEventId(eventId: string) {
        const event = await DB.event.findOne({
            where: {
                googleCalendarEventId: eventId,
            },
        });
        return event;
    }
}
