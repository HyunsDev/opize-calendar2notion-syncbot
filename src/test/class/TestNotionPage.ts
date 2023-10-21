import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { CalendarEntity, EventEntity } from '@opize/calendar2notion-object';

import { NotionEventDto } from '@/module/event';

import { TestContext } from '../test.context';

import { TestEventData } from './TestEventData';

export class TestNotionPage {
    private ctx: TestContext;

    calendar: CalendarEntity;

    page: PageObjectResponse;
    eventLink: EventEntity;

    constructor(ctx: TestContext) {
        this.ctx = ctx;
        this.calendar = ctx.calendar;
    }

    async create(data: TestEventData) {
        const res = await this.ctx.notion.createPage({
            title: data.title,
            calendarName: this.calendar.googleCalendarName,
            date: NotionEventDto.convertDateFromEvent(data.date),
            location: data.location,
            description: data.description,
        });
        this.page = res as PageObjectResponse;
        return this.page;
    }

    async update(data: TestEventData) {
        const res = await this.ctx.notion.updatePage(this.page.id, {
            title: data.title,
            calendarName: this.calendar.googleCalendarName,
            date: NotionEventDto.convertDateFromEvent(data.date),
            location: data.location,
            description: data.description,
        });
        this.page = res as PageObjectResponse;
        return this.page;
    }

    async moveCalendar() {
        this.calendar = this.ctx.calendar2;
        const res = await this.ctx.notion.moveCalendar(
            this.page.id,
            this.calendar,
        );
        this.page = res as PageObjectResponse;
        return this.page;
    }

    async getEventLink() {
        const res = await this.ctx.service.getEventLinkFromNotionPageId(
            this.page.id,
        );
        this.eventLink = res;
        return this.eventLink;
    }

    async delete() {
        await this.ctx.notion.deletePage(this.page.id);
    }

    async get() {
        return (await this.ctx.notion.getPage(
            this.page.id,
        )) as PageObjectResponse;
    }
}
