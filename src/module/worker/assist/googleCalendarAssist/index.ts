import { CalendarEntity } from '@opize/calendar2notion-object';

import { GoogleCalendarEventDto, NotionEventDto } from '@/module/event';

import { WorkContext } from '../../context/work.context';
import { Assist } from '../../types/assist';
import { EventLinkAssist } from '../eventLinkAssist';

import { GoogleCalendarAssistApi } from './api';

export class GoogleCalendarAssist extends Assist {
    private context: WorkContext;

    private eventLinkAssist: EventLinkAssist;
    private api: GoogleCalendarAssistApi;

    constructor({
        context,
        eventLinkAssist,
    }: {
        context: WorkContext;
        eventLinkAssist: EventLinkAssist;
    }) {
        super();
        this.context = context;
        this.eventLinkAssist = eventLinkAssist;
        this.assistName = 'GoogleAssist';
        this.api = new GoogleCalendarAssistApi({
            context,
        });
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
        const res: GoogleCalendarEventDto[] = [];
        for (const calendar of this.context.connectedCalendars) {
            const res = await this.api.getUpdatedEventsByCalendar(calendar);
            res.push(...res);
        }

        this.context.result.syncEvents.gCalCalendarCount =
            this.context.connectedCalendars.length;
        this.context.result.syncEvents.gCal2NotionCount = res.length;
        return res;
    }

    public async CUDEvent(notionEvent: NotionEventDto) {
        const event = notionEvent.toEvent();

        const eventLink = await this.eventLinkAssist.findByNotionPageId(
            event.notionPageId,
        );

        // 캘린더가 없거나 읽기 전용일 경우 무시
        if (!event.calendar || event.calendar.accessRole === 'reader') return;

        if (eventLink && eventLink.googleCalendarEventId) {
            const newEvent = await this.api.createEvent(
                GoogleCalendarEventDto.fromEvent(event),
            );
            await this.eventLinkAssist.create(event.merge(newEvent.toEvent()));
            return;
        }
    }
}
