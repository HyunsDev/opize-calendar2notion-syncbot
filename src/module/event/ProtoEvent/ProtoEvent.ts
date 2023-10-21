import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { CalendarEntity, EventEntity } from '@opize/calendar2notion-object';
import { calendar_v3 } from 'googleapis';

export interface ProtoEventConstructorProps {
    eventSource: ProtoEvent['eventSource'];

    eventId?: number;
    googleCalendarEventId?: string;
    notionPageId?: string;
    calendar: CalendarEntity;
    updatedAt: Date;
    eventLink?: EventEntity;

    originalNotionEvent?: PageObjectResponse;
    originalGoogleCalendarEvent?: calendar_v3.Schema$Event;
}

export abstract class ProtoEvent {
    eventSource: 'event' | 'notion' | 'googleCalendar' | 'eventLink';

    eventId?: number;
    googleCalendarEventId?: string;
    notionPageId?: string;
    calendar: CalendarEntity;
    updatedAt: Date;
    eventLink: EventEntity;

    readonly originalNotionEvent?: PageObjectResponse;
    readonly originalGoogleCalendarEvent?: calendar_v3.Schema$Event;

    constructor(data: ProtoEventConstructorProps) {
        this.eventSource = data.eventSource;

        this.eventId = data.eventId;
        this.googleCalendarEventId = data.googleCalendarEventId;
        this.calendar = data.calendar;
        this.notionPageId = data.notionPageId;
        this.updatedAt = data.updatedAt;
        this.eventLink = data.eventLink;

        this.originalNotionEvent = data.originalNotionEvent;
        this.originalGoogleCalendarEvent = data.originalGoogleCalendarEvent;
    }
}
