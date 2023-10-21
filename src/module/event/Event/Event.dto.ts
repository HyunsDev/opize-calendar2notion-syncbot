import {
    ProtoEvent,
    ProtoEventConstructorProps,
} from '../ProtoEvent/ProtoEvent';

import { EventDateTime } from './EventDateTime.type';

export interface EventConstructorProps extends ProtoEventConstructorProps {
    title: string;
    status: 'confirmed' | 'tentative' | 'cancelled';
    location?: string;
    description?: string;
    date: EventDateTime;
    googleCalendarEventLink?: string;
}

export class EventDto extends ProtoEvent {
    // data
    title: string;
    status: 'confirmed' | 'tentative' | 'cancelled';
    location?: string;
    description?: string;
    date: EventDateTime;
    googleCalendarEventLink?: string;

    constructor(data: EventConstructorProps) {
        super(data);
        this.title = data.title;
        this.status = data.status;
        this.location = data.location;
        this.description = data.description;
        this.date = data.date;
        this.googleCalendarEventLink = data.googleCalendarEventLink;
    }

    /**
     * 인자로 받은 Event와 병합하여 새로운 Event를 반환합니다.
     * 값이 다른 속성이 있을 경우 인자로 받은 Event의 값으로 덮어씁니다.
     */
    merge(event: EventDto): EventDto {
        const mergedEvent = new EventDto({
            eventSource: event.eventSource || this.eventSource,

            eventId: event.eventId || this.eventId,
            googleCalendarEventId:
                event.googleCalendarEventId || this.googleCalendarEventId,
            calendar: event.calendar || this.calendar,
            notionPageId: event.notionPageId || this.notionPageId,
            updatedAt: event.updatedAt || this.updatedAt,
            eventLink: event.eventLink || this.eventLink,

            title: event.title || this.title,
            status: event.status || this.status,
            location: event.location || this.location,
            description: event.description || this.description,
            date: event.date || this.date,
            googleCalendarEventLink:
                event.googleCalendarEventLink || this.googleCalendarEventLink,

            originalNotionEvent:
                event.originalNotionEvent || this.originalNotionEvent,
            originalGoogleCalendarEvent:
                event.originalGoogleCalendarEvent ||
                this.originalGoogleCalendarEvent,
        });
        return mergedEvent;
    }

    isDifferentCalendarId() {
        return (
            this.eventLink.googleCalendarCalendarId !==
            this.calendar.googleCalendarId
        );
    }

    isNewEvent() {
        return !(
            this.eventLink &&
            this.eventLink.googleCalendarEventId &&
            this.eventLink.notionPageId
        );
    }

    isDeletedEvent() {
        return this.status === 'cancelled';
    }

    isReadOnly() {
        return this.calendar?.accessRole === 'reader';
    }
}
