import { CalendarEntity, EventEntity } from '@opize/calendar2notion-object';
import dayjs from 'dayjs';

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

    /**
     *
     */
    public async findByGCalEvent(gCalEventId: string) {
        const res = await DB.event.find({
            where: {
                googleCalendarEventId: gCalEventId,
                userId: this.context.user.id,
            },
            order: {
                lastGoogleCalendarUpdate: 'DESC',
            },
            relations: ['calendar'],
        });

        if (res.length > 1) {
            for (const eventLink of res.slice(1)) {
                await DB.event.delete({
                    id: eventLink.id,
                });
                return eventLink;
            }
        }

        return res[0];
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
        eventLink.lastNotionUpdate = dayjs().toDate();
        return await DB.event.save(eventLink);
    }

    public async updateLastGCalUpdate(eventLink: EventEntity) {
        eventLink.lastGoogleCalendarUpdate = dayjs().toDate();
        return await DB.event.save(eventLink);
    }

    public async create(event: EventDto) {
        let eventLink = EventEntity.create({
            googleCalendarEventId: event.googleCalendarEventId,
            googleCalendarCalendarId: event.calendar.googleCalendarId,
            lastGoogleCalendarUpdate: dayjs().toDate(),
            lastNotionUpdate: dayjs().toDate(),
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
