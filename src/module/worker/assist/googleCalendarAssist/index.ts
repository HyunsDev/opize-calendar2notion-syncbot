import { CalendarEntity } from '@opize/calendar2notion-object';

import { GoogleCalendarEventDto, NotionEventDto } from '@/module/event';

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

    public async getEventByCalendar(calendar: CalendarEntity) {
        return (await this.api.getEventsByCalendar(calendar)).map((event) =>
            event.toEvent(),
        );
    }

    public async getUpdatedEvents() {
        const events: GoogleCalendarEventDto[] = [];
        for (const calendar of this.context.connectedCalendars) {
            const res = await this.api.getUpdatedEventsByCalendar(calendar);
            events.push(...res);
        }

        this.context.result.syncEvents.gCalCalendarCount =
            this.context.connectedCalendars.length;
        this.context.result.syncEvents.gCal2NotionCount = events.length;

        return events;
    }

    public async updateEvent(notionEvent: NotionEventDto) {
        const event = notionEvent.toEvent();
        return await this.api.updateEvent(
            GoogleCalendarEventDto.fromEvent(event),
        );
    }

    public async CUDEvent(notionEvent: NotionEventDto) {
        const event = notionEvent.toEvent();

        let eventLink = await this.eventLinkAssist.findByNotionPageId(
            event.notionPageId,
        );

        // 캘린더가 없거나 읽기 전용일 경우 무시
        if (!event.calendar || event.calendar.accessRole === 'reader') return;

        if (eventLink && eventLink.googleCalendarEventId) {
            event.eventId = eventLink.id;
            event.googleCalendarEventId = eventLink.googleCalendarEventId;

            await this.api.updateEvent(GoogleCalendarEventDto.fromEvent(event));
            await this.eventLinkAssist.updateLastGCalUpdate(eventLink);
            return;
        }

        const newEvent = await this.api.createEvent(
            GoogleCalendarEventDto.fromEvent(event),
        );
        eventLink = await this.eventLinkAssist.create(
            event.merge(newEvent.toEvent()),
        );

        newEvent.notionPageId = eventLink.notionPageId;
        newEvent.calendar.googleCalendarId = eventLink.googleCalendarCalendarId;
        await this.notionAssist.updatePage(newEvent);

        return;
    }
}
