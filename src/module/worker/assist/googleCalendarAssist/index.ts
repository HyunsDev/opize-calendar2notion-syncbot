import { CalendarEntity } from '@opize/calendar2notion-object';
import dayjs from 'dayjs';

import {
    EventDto,
    GoogleCalendarEventDto,
    NotionEventDto,
} from '@/module/event';

import { WorkContext } from '../../context/work.context';
import { Assist } from '../../types/assist';
import { EventLinkAssist } from '../eventLinkAssist';
import { NotionAssist } from '../notionAssist';

import { GoogleCalendarAssistApi } from './api';

export class GoogleCalendarAssist extends Assist {
    private context: WorkContext;

    private eventLinkAssist: EventLinkAssist;
    private notionAssist: NotionAssist;

    private api: GoogleCalendarAssistApi;

    constructor({ context }: { context: WorkContext }) {
        super();
        this.context = context;
        this.assistName = 'GoogleAssist';
        this.api = new GoogleCalendarAssistApi({
            context,
        });
    }

    public dependencyInjection({
        eventLinkAssist,
        notionAssist,
    }: {
        eventLinkAssist: EventLinkAssist;
        notionAssist: NotionAssist;
    }) {
        this.eventLinkAssist = eventLinkAssist;
        this.notionAssist = notionAssist;
        return;
    }

    public async validation() {
        return true;
    }

    public async deleteEvent(eventId: string, calendarId: string) {
        return await this.api.deleteEvent(eventId, calendarId);
    }

    public async getEventsByCalendar(calendar: CalendarEntity) {
        return await this.api.getEventsByCalendar(calendar);
    }

    public async getUpdatedEvents() {
        const events: GoogleCalendarEventDto[] = [];
        for (const calendar of this.context.connectedCalendars) {
            const res = await this.api.getUpdatedEventsByCalendar(calendar);
            events.push(...res);
        }

        const eventsWithEventLink = (
            await Promise.all(
                events.map(async (event) => {
                    event.eventLink =
                        await this.eventLinkAssist.findByGCalEvent(
                            event.googleCalendarEventId,
                        );
                    return event;
                }),
            )
        ).filter(
            (event) =>
                !event.eventLink ||
                dayjs(event.updatedAt) >
                    dayjs(event.eventLink.lastGoogleCalendarUpdate),
        );

        this.context.result.syncEvents.gCalCalendarCount =
            this.context.connectedCalendars.length;
        this.context.result.syncEvents.gCal2NotionCount = events.length;

        return eventsWithEventLink;
    }

    public async updateEventAfterNotionPageCreate(notionEvent: NotionEventDto) {
        const event = notionEvent.toEvent();
        if (!event.calendar || event.isReadOnly()) return;

        await this._updateEvent(event);
    }

    public async CUDEvent(notionEvent: NotionEventDto) {
        const event = notionEvent.toEvent();
        if (!event.calendar || event.isReadOnly()) return;
        if (event.isNewEvent()) {
            await this._createEvent(event);
        } else {
            await this._updateEvent(event);
        }
    }

    private async _updateEvent(event: EventDto) {
        event.eventId = event.eventLink.id;
        event.googleCalendarEventId = event.eventLink.googleCalendarEventId;

        if (event.isDifferentCalendarId()) {
            await this.api.moveEventCalendar(
                GoogleCalendarEventDto.fromEvent(event),
                event.eventLink.calendar,
            );
            await this.eventLinkAssist.updateCalendar(
                event.eventLink,
                event.calendar,
            );
        }

        await this.api.updateEvent(GoogleCalendarEventDto.fromEvent(event));
        await this.eventLinkAssist.updateLastGCalUpdate(event.eventLink);
    }

    private async _createEvent(event: EventDto) {
        const newEvent = await this.api.createEvent(
            GoogleCalendarEventDto.fromEvent(event),
        );
        const eventLink = await this.eventLinkAssist.create(
            event.merge(newEvent.toEvent()),
        );

        if (event.isReadOnly()) return;

        newEvent.eventLink = eventLink;
        await this.notionAssist.updatePageAfterCreateGCalEvent(newEvent);
    }
}
