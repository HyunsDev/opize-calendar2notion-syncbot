import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { CalendarEntity, UserNotionProps } from '@opize/calendar2notion-object';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
dayjs.extend(timezone);
dayjs.extend(utc);

import { EventDateTime, EventDto } from '../Event';
import {
    ProtoEvent,
    ProtoEventConstructorProps,
} from '../ProtoEvent/ProtoEvent';

import { NotionDateTime } from './NotionDateTime.type';

const getProp = <
    P extends PageObjectResponse,
    T extends P['properties'][string]['type'],
>(
    page: P,
    propId: string,
    type: T,
): Extract<P['properties'][string], { type: T }> => {
    const prop = Object.values(page.properties).find((e) => e.id === propId);
    if (prop?.type !== type) {
        throw new Error(
            `Property ${propId} is not of type ${type}, but ${prop.type}`,
        );
    }
    return prop as Extract<P['properties'][string], { type: T }>;
};

export interface NotionEventConstructorProps
    extends ProtoEventConstructorProps {
    title: string;
    isDeleted: boolean;
    location?: string;
    description?: string;
    date: NotionDateTime;
    googleCalendarEventLink?: string;
}

export class NotionEventDto extends ProtoEvent {
    title: string;
    isDeleted: boolean;
    location?: string;
    description?: string;
    date: NotionDateTime;
    googleCalendarEventLink?: string;

    constructor(data: NotionEventConstructorProps) {
        super(data);
        this.title = data.title;
        this.isDeleted = data.isDeleted;
        this.location = data.location;
        this.description = data.description;
        this.date = data.date;
        this.googleCalendarEventLink = data.googleCalendarEventLink;
    }

    static fromEvent(event: EventDto): NotionEventDto {
        const notionEvent = new NotionEventDto({
            eventSource: event.eventSource,

            eventId: event.eventId,
            googleCalendarEventId: event.googleCalendarEventId,
            calendar: event.calendar,
            notionPageId: event.notionPageId,

            title: event.title,
            isDeleted: event.status === 'cancelled',
            location: event.location,
            description: event.description,
            date: NotionEventDto.convertDateFromEvent(event.date),
            googleCalendarEventLink: event.googleCalendarEventLink,

            originalNotionEvent: event.originalNotionEvent,
            originalGoogleCalendarEvent: event.originalGoogleCalendarEvent,
        });

        return notionEvent;
    }

    static fromNotionEvent(
        originalEvent: PageObjectResponse,
        calendar: CalendarEntity,
        props: UserNotionProps,
    ) {
        const notionEvent = new NotionEventDto({
            eventSource: 'notion',

            eventId: undefined,
            notionPageId: originalEvent.id,
            googleCalendarEventId: undefined,
            calendar,

            title: getProp(originalEvent, props.title, 'title').title.reduce(
                (pre, cur) => pre + cur.plain_text,
                '',
            ),
            isDeleted: getProp(originalEvent, props.delete, 'checkbox')
                .checkbox,
            location: props.location
                ? getProp(
                      originalEvent,
                      props.location,
                      'rich_text',
                  ).rich_text.reduce((pre, cur) => pre + cur.plain_text, '')
                : '',
            description: props.description
                ? getProp(
                      originalEvent,
                      props.description,
                      'rich_text',
                  ).rich_text.reduce((pre, cur) => pre + cur.plain_text, '')
                : '',
            date: getProp(originalEvent, props.date, 'date').date,
            googleCalendarEventLink: getProp(originalEvent, props.link, 'url')
                .url,

            originalNotionEvent: originalEvent,
        });
        return notionEvent;
    }

    toEvent(): EventDto {
        const event = new EventDto({
            eventSource: this.eventSource,

            eventId: this.eventId,
            googleCalendarEventId: this.googleCalendarEventId,
            notionPageId: this.notionPageId,
            calendar: this.calendar,

            title: this.title,
            status: this.isDeleted ? 'cancelled' : 'confirmed',
            location: this.location,
            description: this.description,
            date: NotionEventDto.convertDateToEvent(this.date),
            googleCalendarEventLink: this.googleCalendarEventLink,

            originalNotionEvent: this.originalNotionEvent,
        });
        return event;
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
        } else {
            if (notionDate.start.length === 10) {
                date.end = {
                    date: notionDate.start,
                };
            } else {
                date.end = {
                    dateTime: notionDate.start,
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
                    : dayjs(eventDate.start.dateTime).utc().toISOString(),
            end: '',
        };
        // const hasTime = 'dateTime' in eventDate.start;

        const start =
            'date' in eventDate.start
                ? eventDate.start.date
                : eventDate.start.dateTime;

        if ('date' in eventDate.start && 'date' in eventDate.end) {
            date.end =
                eventDate.end.date === eventDate.start.date
                    ? eventDate.end.date
                    : dayjs(eventDate.end.date).format('YYYY-MM-DD');
        } else if (
            'dateTime' in eventDate.start &&
            'dateTime' in eventDate.end
        ) {
            date.end = dayjs(eventDate.end.dateTime).utc().toISOString();
        } else {
            throw new Error('Invalid date');
        }

        if (start != date.end) {
            return {
                start: date.start,
                end: date.end,
                // time_zone: hasTime ? 'Asia/Seoul' : null,
            };
        } else {
            return {
                start: date.start,
                // time_zone: hasTime ? 'Asia/Seoul' : null,
            };
        }
    }
}
