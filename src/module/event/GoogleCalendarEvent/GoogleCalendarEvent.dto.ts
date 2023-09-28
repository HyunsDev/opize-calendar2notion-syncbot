import { CalendarEntity } from '@opize/calendar2notion-object';
import { calendar_v3 } from 'googleapis';

import { EventDateTime, EventDto } from '../Event';
import {
    ProtoEvent,
    ProtoEventConstructorProps,
} from '../ProtoEvent/ProtoEvent';

import { GoogleCalendarDateTime } from './GoogleCalendarDateTime.type';

export interface GoogleCalendarEventConstructorProps
    extends ProtoEventConstructorProps {
    summary: string;
    status: 'confirmed' | 'tentative' | 'cancelled';
    location?: string;
    description?: string;
    date: GoogleCalendarDateTime;
    googleCalendarEventLink?: string;
}

export class GoogleCalendarEventDto extends ProtoEvent {
    summary: string;
    status: 'confirmed' | 'tentative' | 'cancelled';
    location?: string;
    description?: string;
    date: GoogleCalendarDateTime;
    googleCalendarEventLink?: string;

    constructor(data: GoogleCalendarEventConstructorProps) {
        super(data);
        this.summary = data.summary;
        this.status = data.status;
        this.location = data.location;
        this.description = data.description;
        this.date = data.date;
    }

    static fromEvent(event: EventDto): GoogleCalendarEventDto {
        const googleCalendarEvent = new GoogleCalendarEventDto({
            eventSource: 'event',

            eventId: event.eventId,
            notionPageId: event.notionPageId,
            googleCalendarEventId: event.googleCalendarEventId,
            calendar: event.calendar,

            date: event.date,
            status: event.status,
            summary: event.title,
            location: event.location,
            description: event.description,
            googleCalendarEventLink: event.googleCalendarEventLink,

            originalNotionEvent: event.originalNotionEvent,
            originalGoogleCalendarEvent: event.originalGoogleCalendarEvent,
        });
        return googleCalendarEvent;
    }

    static fromGoogleCalendar(
        originalEvent: calendar_v3.Schema$Event,
        calendar: CalendarEntity,
    ): GoogleCalendarEventDto {
        const googleCalendarEvent = new GoogleCalendarEventDto({
            eventSource: 'googleCalendar',

            eventId: undefined,
            notionPageId: undefined,
            googleCalendarEventId: originalEvent.id,
            calendar,
            date: GoogleCalendarEventDto.convertDateFromEvent({
                start: originalEvent.start,
                end: originalEvent.end,
            }),
            status: originalEvent.status as
                | 'confirmed'
                | 'tentative'
                | 'cancelled',
            summary: originalEvent.summary,
            location: originalEvent.location,
            description: originalEvent.description,
            googleCalendarEventLink: originalEvent.htmlLink,

            originalGoogleCalendarEvent: originalEvent,
        });
        return googleCalendarEvent;
    }

    toEvent() {
        const event = new EventDto({
            eventSource: this.eventSource,

            eventId: this.eventId,
            notionPageId: this.notionPageId,
            googleCalendarEventId: this.googleCalendarEventId,
            calendar: this.calendar,

            date: GoogleCalendarEventDto.convertDateToEvent(this.date),
            status: this.status,
            title: this.summary,
            location: this.location,
            description: this.description,
            googleCalendarEventLink: this.googleCalendarEventLink,

            originalGoogleCalendarEvent: this.originalGoogleCalendarEvent,
        });
        return event;
    }

    static convertDateToEvent(
        googleCalendarEvent: GoogleCalendarDateTime,
    ): EventDateTime {
        return googleCalendarEvent;
    }

    static convertDateFromEvent(
        eventDate: EventDateTime,
    ): GoogleCalendarDateTime {
        return eventDate;
    }
}
