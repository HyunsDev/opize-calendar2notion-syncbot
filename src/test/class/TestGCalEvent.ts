import { CalendarEntity, EventEntity } from '@opize/calendar2notion-object';
import { calendar_v3 } from 'googleapis';

import { GoogleCalendarEventDto } from '@/module/event';

import { TestContext } from '../test.context';

import { TestEventData } from './TestEventData';

export class TestGCalEvent {
    private ctx: TestContext;

    calendar: CalendarEntity;

    event: calendar_v3.Schema$Event;
    eventLink: EventEntity;

    constructor(ctx: TestContext) {
        this.ctx = ctx;
        this.calendar = ctx.calendar;
    }

    async create(data: TestEventData) {
        const res = await this.ctx.gcal.create({
            calendarId: this.calendar.googleCalendarId,
            title: data.title,
            date: GoogleCalendarEventDto.convertDateFromEvent(data.date),
            location: data.location,
            description: data.description,
        });
        this.event = res.data;
        return this.event;
    }

    async update(data: TestEventData) {
        const res = await this.ctx.gcal.update({
            calendarId: this.calendar.googleCalendarId,
            eventId: this.event.id,
            title: data.title,
            date: GoogleCalendarEventDto.convertDateFromEvent(data.date),
            location: data.location,
            description: data.description,
        });
        this.event = res.data;
        return this.event;
    }

    async moveCalendar() {
        this.calendar = this.ctx.calendar2;
        const res = await this.ctx.gcal.moveTestGoogleCalendarEvent(
            this.event.id,
        );
        this.event = res.data;
        return this.event;
    }

    async getEventLink() {
        const res = await this.ctx.service.getEventLinkFromGoogleEventId(
            this.event.id,
        );
        this.eventLink = res;
        return this.eventLink;
    }

    async delete() {
        const res = await this.ctx.gcal.deleteEvent(
            this.event.id,
            this.calendar,
        );
        return res;
    }

    async get() {
        const res = await this.ctx.gcal.getEvent(this.event.id, this.calendar);
        return res;
    }
}
