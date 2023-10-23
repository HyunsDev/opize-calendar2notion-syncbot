import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { CalendarEntity, UserNotionProps } from '@opize/calendar2notion-object';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
dayjs.extend(timezone);
dayjs.extend(utc);

import { getProp } from '@/utils/getProp';

import { EventDateTime, EventDto } from '../Event';
import {
    ProtoEvent,
    ProtoEventConstructorProps,
} from '../ProtoEvent/ProtoEvent';

import { NotionDateTime } from './NotionDateTime.type';

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
            updatedAt: event.updatedAt,
            eventLink: event.eventLink,

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
        isSyncAdditionalProps: boolean,
    ) {
        const notionEvent = new NotionEventDto({
            eventSource: 'notion',

            eventId: undefined,
            notionPageId: originalEvent.id,
            googleCalendarEventId: undefined,
            calendar,
            updatedAt: new Date(originalEvent.last_edited_time),

            title: getProp(originalEvent, props.title, 'title').title.reduce(
                (pre, cur) => pre + cur.plain_text,
                '',
            ),
            isDeleted: getProp(originalEvent, props.delete, 'checkbox')
                .checkbox,
            location:
                props.location && isSyncAdditionalProps
                    ? getProp(
                          originalEvent,
                          props.location,
                          'rich_text',
                      ).rich_text.reduce((pre, cur) => pre + cur.plain_text, '')
                    : '',
            description:
                props.description && isSyncAdditionalProps
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
            updatedAt: this.updatedAt,
            eventLink: this.eventLink,

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
        const isAllDay = notionDate.start.length === 10;
        const start = {
            date: isAllDay ? notionDate.start : null,
            dateTime: isAllDay ? null : notionDate.start,
        };
        const end = {
            date: isAllDay
                ? dayjs(notionDate.end || notionDate.start)
                      .add(1, 'day')
                      .format('YYYY-MM-DD')
                : null,
            dateTime: isAllDay ? null : notionDate.end || notionDate.start,
        };
        const date = {
            start,
            end,
        };
        return date;
    }

    static convertDateFromEvent(eventDate: EventDateTime): NotionDateTime {
        const isAllDay = 'date' in eventDate.start;
        const isOneDay =
            isAllDay &&
            (dayjs(eventDate.start.date) === dayjs(eventDate.end.date) ||
                dayjs(eventDate.start.date) ===
                    dayjs(eventDate.end.date).add(-1, 'day'));

        const start = isAllDay
            ? dayjs(eventDate.start.date).utc().format('YYYY-MM-DD')
            : dayjs(eventDate.start.dateTime).utc().toISOString();

        const end = isAllDay
            ? eventDate.start.date === eventDate.end.date
                ? dayjs(eventDate.end.date).utc().format('YYYY-MM-DD')
                : dayjs(eventDate.end.date)
                      .add(-1, 'day')
                      .utc()
                      .format('YYYY-MM-DD')
            : dayjs(eventDate.end.dateTime).utc().toISOString();

        if (isOneDay) {
            return {
                start,
            };
        } else {
            return {
                start,
                end,
            };
        }
    }
}
