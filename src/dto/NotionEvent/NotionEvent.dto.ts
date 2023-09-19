import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { CalendarEntity, UserNotionProps } from '@opize/calendar2notion-object';
import dayjs from 'dayjs';

import { EventDateTime, EventDto } from '../Event';

import { NotionDateTime } from './NotionDateTime.type';

const getProp = <
    P extends PageObjectResponse,
    T extends P['properties'][string]['type'],
>(
    page: P,
    propName: string,
    type: T,
): Extract<P['properties'][string], { type: T }> => {
    const prop = page.properties[propName];
    if (prop.type !== type) {
        throw new Error(
            `Property ${propName} is not of type ${type}, but ${prop.type}`,
        );
    }
    return prop as Extract<P['properties'][string], { type: T }>;
};

export class NotionEventDto {
    eventSource?: 'event' | 'originalEvent';

    eventId?: string;
    googleCalendarEventId?: string;
    notionEventId?: string;
    calendar: CalendarEntity;

    title: string;
    status: boolean;
    location?: string;
    description?: string;
    date: NotionDateTime;
    googleCalendarEventLink?: string;

    originalNotionData?: PageObjectResponse;

    constructor(data: {
        eventSource: NotionEventDto['eventSource'];

        eventId?: string;
        googleCalendarEventId?: string;
        notionEventId?: string;
        calendar: CalendarEntity;

        title: string;
        status: boolean;
        location?: string;
        description?: string;
        date: NotionDateTime;
        googleCalendarEventLink?: string;

        originalNotionData?: PageObjectResponse;
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

        this.originalNotionData = data?.originalNotionData;
    }

    static fromEvent(event: EventDto): NotionEventDto {
        const notionEvent = new NotionEventDto({
            eventSource: 'event',
            eventId: event.eventId,
            googleCalendarEventId: event.googleCalendarEventId,
            calendar: event.calendar,
            notionEventId: event.notionEventId,

            title: event.title,
            status: event.status === 'confirmed',
            location: event.location,
            description: event.description,
            date: NotionEventDto.convertDateFromEvent(event.date),
            googleCalendarEventLink: event.googleCalendarEventLink,

            originalNotionData: undefined,
        });
        return notionEvent;
    }

    static fromNotionEvent(
        originalEvent: PageObjectResponse,
        calendar: CalendarEntity,
        props: UserNotionProps,
    ) {
        const notionEvent = new NotionEventDto({
            eventSource: 'originalEvent',

            eventId: undefined,
            notionEventId: originalEvent.id,
            googleCalendarEventId: undefined,
            calendar,

            title: getProp(originalEvent, props.title, 'title').title.reduce(
                (pre, cur) => pre + cur.plain_text,
                '',
            ),
            status: getProp(originalEvent, props.delete, 'checkbox').checkbox,
            location: getProp(
                originalEvent,
                props.location,
                'rich_text',
            ).rich_text.reduce((pre, cur) => pre + cur.plain_text, ''),
            description: getProp(
                originalEvent,
                props.description,
                'rich_text',
            ).rich_text.reduce((pre, cur) => pre + cur.plain_text, ''),
            date: getProp(originalEvent, props.date, 'date').date,
            googleCalendarEventLink: getProp(originalEvent, props.link, 'url')
                .url,

            originalNotionData: originalEvent,
        });
        return notionEvent;
    }

    static convertDateToEvent(notionDate: NotionDateTime) {
        const date: EventDateTime = {
            start: {},
            end: {},
        };

        if (notionDate.start.length === 10) {
            date.start = {
                date: notionDate.start,
            };
        } else {
            date.start = {
                dateTime: notionDate.start,
            };
        }

        if (notionDate.end) {
            if (notionDate.end.length === 10) {
                date.end = {
                    date: notionDate.end,
                };
            } else {
                date.end = {
                    dateTime: notionDate.end,
                };
            }
        }
        return date;
    }

    static convertDateFromEvent(eventDate: EventDateTime) {
        const date = {
            start:
                'date' in eventDate.start
                    ? eventDate.start.date
                    : eventDate.start.dateTime,
            end: '',
        };

        const start =
            'date' in eventDate.start
                ? eventDate.start.date
                : eventDate.start.dateTime;

        if ('date' in eventDate.start && 'date' in eventDate.end) {
            date.end =
                eventDate.end.date === eventDate.start.date
                    ? eventDate.end.date
                    : dayjs(eventDate.end.date).toISOString().split('T')[0];
        } else if (
            'dateTime' in eventDate.start &&
            'dateTime' in eventDate.end
        ) {
            date.end = eventDate.end.dateTime;
        } else {
            throw new Error('Invalid date');
        }

        if (start != date.end) {
            return {
                start: date.start,
                end: date.end,
            };
        } else {
            return {
                start: date.start,
            };
        }
    }

    toEvent(): EventDto {
        const event = new EventDto({
            eventSource: 'notionEvent',

            eventId: this.eventId,
            googleCalendarEventId: this.googleCalendarEventId,
            notionEventId: this.notionEventId,
            calendar: this.calendar,

            title: this.title,
            status: this.status ? 'confirmed' : 'cancelled',
            location: this.location,
            description: this.description,
            date: NotionEventDto.convertDateToEvent(this.date),
            googleCalendarEventLink: this.googleCalendarEventLink,

            originalNotionEvent: this.originalNotionData,
        });
        return event;
    }
}
