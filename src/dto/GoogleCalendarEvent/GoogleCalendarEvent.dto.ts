import { CalendarEntity } from '@opize/calendar2notion-object';
import { calendar_v3 } from 'googleapis';

import { EventDateTime, EventDto } from '../Event';

import { GoogleCalendarDateTime } from './GoogleCalendarDateTime.type';

/**
 * Google Calendar의 이벤트와 Event를 사이를 연결하기 위한 DTO
 */
export class GoogleCalendarEventDto {
    eventSource?: 'event' | 'originalEvent';

    eventId?: string;
    googleCalendarEventId?: string;
    notionEventId?: string;
    calendar: CalendarEntity;

    summary: string;
    status: 'confirmed' | 'tentative' | 'cancelled';
    location?: string;
    description?: string;
    date: GoogleCalendarDateTime;
    googleCalendarEventLink?: string;

    /**
     * `eventSource`가 `originalEvent`일 경우, 원본 데이터를 저장합니다.
     */
    readonly originalGoogleCalendarEvent: calendar_v3.Schema$Event;

    constructor(data: {
        eventSource: GoogleCalendarEventDto['eventSource'];

        eventId?: string;
        googleCalendarEventId?: string;
        notionEventId?: string;
        calendar: CalendarEntity;

        summary: string;
        status: 'confirmed' | 'tentative' | 'cancelled';
        location?: string;
        description?: string;
        date: GoogleCalendarDateTime;
        googleCalendarEventLink?: string;

        originalGoogleCalendarEvent?: calendar_v3.Schema$Event;
    }) {
        this.eventSource = data.eventSource;
        this.eventId = data.eventId;
        this.googleCalendarEventId = data.googleCalendarEventId;
        this.calendar;
        this.notionEventId = data.notionEventId;

        this.summary = data.summary;
        this.status = data.status;
        this.location = data.location;
        this.description = data.description;
        this.date = data.date;

        this.originalGoogleCalendarEvent = data?.originalGoogleCalendarEvent;
    }

    /**
     * `Event`를 받아 `GoogleCalendarEvent`로 변환합니다.
     */
    static fromEvent(event: EventDto): GoogleCalendarEventDto {
        const googleCalendarEvent = new GoogleCalendarEventDto({
            eventSource: 'event',

            eventId: event.eventId,
            notionEventId: event.notionEventId,
            googleCalendarEventId: event.googleCalendarEventId,
            calendar: event.calendar,

            date: event.date,
            status: event.status,
            summary: event.title,
            location: event.location,
            description: event.description,
            googleCalendarEventLink: event.googleCalendarEventLink,

            originalGoogleCalendarEvent: undefined,
        });
        return googleCalendarEvent;
    }

    /**
     * `calendar_v3.Schema$Event`를 받아 `GoogleCalendarEvent`로 변환합니다.
     */
    static fromGoogleCalendarEvent(
        originalEvent: calendar_v3.Schema$Event,
        calendar: CalendarEntity,
    ): GoogleCalendarEventDto {
        const googleCalendarEvent = new GoogleCalendarEventDto({
            eventSource: 'originalEvent',

            eventId: undefined,
            notionEventId: undefined,
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

    merge() {}

    /**
     * `GoogleCalendarEvent`를 `Event`로 변환합니다.
     */
    toEvent() {}

    toGoogleCalendarEvent() {}

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
