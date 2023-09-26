import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { CalendarEntity, EventEntity } from '@opize/calendar2notion-object';
import { calendar_v3 } from 'googleapis';

export interface ProtoEventConstructorProps {
    eventSource: ProtoEvent['eventSource'];

    eventId?: number;
    googleCalendarEventId?: string;
    notionEventId?: string;
    calendar: CalendarEntity;
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

    readonly originalNotionEvent?: PageObjectResponse;
    readonly originalGoogleCalendarEvent?: calendar_v3.Schema$Event;

    constructor(data: ProtoEventConstructorProps) {
        this.eventSource = data.eventSource;

        this.eventId = data.eventId;
        this.googleCalendarEventId = data.googleCalendarEventId;
        this.calendar = data.calendar;
        this.notionPageId = data.notionEventId;

        this.originalNotionEvent = data.originalNotionEvent;
        this.originalGoogleCalendarEvent = data.originalGoogleCalendarEvent;
    }
}
