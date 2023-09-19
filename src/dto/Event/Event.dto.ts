import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { CalendarEntity } from '@opize/calendar2notion-object';
import { calendar_v3 } from 'googleapis';

import { EventDateTime } from './EventDateTime.type';

/**
 * Calendar2notion에서 캘린더 간 이벤트를 전달하기 위한 DTO
 */
export class EventDto {
    eventSource: 'self' | 'notionEvent' | 'googleCalendarEvent';

    // ids
    eventId?: string;
    googleCalendarEventId?: string;
    notionEventId?: string;
    calendar: CalendarEntity;

    // data
    title: string;
    status: 'confirmed' | 'tentative' | 'cancelled';
    location?: string;
    description?: string;
    date: EventDateTime;
    googleCalendarEventLink?: string;

    // original data
    readonly originalNotionEvent?: PageObjectResponse;
    readonly originalGoogleCalendarEvent?: calendar_v3.Schema$Event;

    constructor(data: {
        eventSource: EventDto['eventSource'];

        eventId?: string;
        googleCalendarEventId?: string;
        notionEventId?: string;
        calendar: CalendarEntity;

        title: string;
        status: 'confirmed' | 'tentative' | 'cancelled';
        location?: string;
        description?: string;
        date: EventDateTime;
        googleCalendarEventLink?: string;

        originalNotionEvent?: PageObjectResponse;
        originalGoogleCalendarEvent?: calendar_v3.Schema$Event;
    }) {
        this.eventSource = data.eventSource;
        this.eventId = data.eventId;
        this.googleCalendarEventId = data.googleCalendarEventId;
        this.calendar = data.calendar;
        this.notionEventId = data.notionEventId;

        this.title = data.title;
        this.status = data.status;
        this.location = data.location;
        this.description = data.description;
        this.date = data.date;
        this.googleCalendarEventLink = data.googleCalendarEventLink;

        this.originalNotionEvent = data?.originalNotionEvent;
        this.originalGoogleCalendarEvent = data?.originalGoogleCalendarEvent;
    }

    /**
     * 인자로 받은 Event와 병합하여 새로운 Event를 반환합니다. 값이 다른 속성이 있을 경우 인자로 받은 Event의 값으로 덮어씁니다.
     * @param event
     * @returns
     */
    merge(event: EventDto): EventDto {
        const mergedEvent = new EventDto(
            Object.assign({}, this, {
                eventId: event.eventId,
                googleCalendarEventId: event.googleCalendarEventId,
                notionEventId: event.notionEventId,
                calendar: event.calendar,

                title: event.title,
                status: event.status,
                location: event.location,
                description: event.description,
                date: event.date,

                originalNotionData: event.originalNotionEvent,
                originalGoogleCalendarData: event.originalGoogleCalendarEvent,
            }),
        );
        return mergedEvent;
    }
}
