import { CalendarEntity, EventEntity } from '@opize/calendar2notion-object';

import { DB } from '@/database';
import { EventDto } from '@/module/event';

import { WorkContext } from '../../context/work.context';
import { Assist } from '../../types/assist';

export class EventLinkAssist extends Assist {
    context: WorkContext;

    constructor({ context }: { context: WorkContext }) {
        super();
        this.context = context;
    }

    public dependencyInjection({}) {
        return;
    }

    public async findByNotionPageId(pageId: string) {
        return await DB.event.findOne({
            where: {
                notionPageId: pageId,
                userId: this.context.user.id,
            },
            relations: ['calendar'],
        });
    }

    public async findByGCalEvent(gCalEventId: string, gCalCalendarId: string) {
        return await DB.event.findOne({
            where: {
                googleCalendarCalendarId: gCalCalendarId,
                googleCalendarEventId: gCalEventId,
                userId: this.context.user.id,
            },
            relations: ['calendar'],
        });
    }

    public async findDeletedEventLinks() {
        return await DB.event.find({
            where: {
                userId: this.context.user.id,
                willRemove: true,
            },
            relations: ['calendar'],
        });
    }

    public async deleteEventLink(eventLink: EventEntity) {
        return await DB.event.delete({
            id: eventLink.id,
            userId: this.context.user.id,
        });
    }

    public async updateCalendar(
        eventLink: EventEntity,
        calendar: CalendarEntity,
    ) {
        eventLink.calendar = calendar;
        eventLink.googleCalendarCalendarId = calendar.googleCalendarId;
        return await DB.event.save(eventLink);
    }

    public async updateLastNotionUpdate(eventLink: EventEntity) {
        eventLink.lastNotionUpdate = this.context.period.end;
        return await DB.event.save(eventLink);
    }

    public async updateLastGCalUpdate(eventLink: EventEntity) {
        eventLink.lastGoogleCalendarUpdate = this.context.period.end;
        return await DB.event.save(eventLink);
    }

    public async create(event: EventDto) {
        let eventLink = EventEntity.create({
            googleCalendarEventId: event.googleCalendarEventId,
            googleCalendarCalendarId: event.calendar.googleCalendarId,
            lastGoogleCalendarUpdate: this.context.period.end,
            lastNotionUpdate: this.context.period.end,
            status: 'SYNCED',
            willRemove: false,
            notionPageId: event.notionPageId,
            calendar: event.calendar,
            user: this.context.user,
        });
        eventLink = await DB.event.save(eventLink);
        return eventLink;
    }
}
