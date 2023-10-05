import { CalendarEntity, EventEntity } from '@opize/calendar2notion-object';
import dayjs from 'dayjs';
import { LessThan } from 'typeorm';

import { DB } from '@/database';
import { GoogleCalendarEventDto } from '@/module/event';

import { NotionAssist, EventLinkAssist, GoogleCalendarAssist } from '..';
import PackageJSON from '../../../../../package.json';
import { WorkContext } from '../../context/work.context';
import { Assist } from '../../types/assist';

export class WorkerAssist extends Assist {
    private context: WorkContext;

    private eventLinkAssist: EventLinkAssist;
    private googleCalendarAssist: GoogleCalendarAssist;
    private notionAssist: NotionAssist;

    constructor({
        context,
        eventLinkAssist,
        googleCalendarAssist,
        notionAssist,
    }: {
        context: WorkContext;
        eventLinkAssist: EventLinkAssist;
        googleCalendarAssist: GoogleCalendarAssist;
        notionAssist: NotionAssist;
    }) {
        super();
        this.context = context;
        this.eventLinkAssist = eventLinkAssist;
        this.googleCalendarAssist = googleCalendarAssist;
        this.notionAssist = notionAssist;
        this.assistName = 'WorkerAssist';
    }

    public async eraseDeletedNotionPage() {
        const notionDeletedPages = await this.notionAssist.getDeletedPages();
        for (const page of notionDeletedPages) {
            await this.eraseNotionPage(page.notionPageId);
        }
        this.context.result.eraseDeletedEvent.notion =
            notionDeletedPages.length;
    }

    public async eraseDeletedEventLink() {
        const deletedEventLinks =
            await this.eventLinkAssist.findDeletedEventLinks();
        for (const eventLink of deletedEventLinks) {
            await this.eraseEvent(eventLink);
        }
        this.context.result.eraseDeletedEvent.eventLink =
            deletedEventLinks.length;
    }

    private async eraseNotionPage(pageId: string) {
        const eventLink = await this.eventLinkAssist.findByNotionPageId(pageId);
        if (eventLink) {
            await this.eraseEvent(eventLink);
        } else {
            await this.notionAssist.deletePage(pageId);
        }
    }

    private async eraseEvent(eventLink: EventEntity) {
        await this.notionAssist.deletePage(eventLink.notionPageId);
        if (eventLink.calendar.accessRole !== 'reader') {
            await this.googleCalendarAssist.deleteEvent(
                eventLink.googleCalendarEventId,
                eventLink.googleCalendarCalendarId,
            );
        }
        await this.eventLinkAssist.deleteEventLink(eventLink);
    }

    public async addEventByGCal(event: GoogleCalendarEventDto) {
        const page = await this.notionAssist.addPage(event);
        await this.eventLinkAssist.create(event.toEvent());
        return page;
    }

    public async startSyncUserUpdate() {
        await DB.user.update(this.context.user.id, {
            workStartedAt: this.context.startedAt,
            isWork: true,
            syncbotId: process.env.SYNCBOT_PREFIX,
            syncbotVersion: PackageJSON.version,
        });
    }

    public async endSyncUserUpdate() {
        await DB.user.update(this.context.user.id, {
            lastSyncStatus: '',
            isWork: false,
            syncbotId: null,
            lastCalendarSync: this.context.period.end,
        });
    }

    public async deleteOldErrorLogs() {
        await DB.errorLog.delete({
            userId: this.context.user.id,
            createdAt: LessThan(dayjs().add(-21, 'days').toDate()),
            archive: false,
        });
    }

    public async syncNewCalendar(newCalendar: CalendarEntity) {
        this.context.result.syncNewCalendar[`${newCalendar.id}`] = {
            id: newCalendar.id,
            gCalId: newCalendar.googleCalendarId,
            gCalName: newCalendar.googleCalendarName,
            eventCount: 0,
        };

        await DB.calendar.update(newCalendar.id, {
            status: 'CONNECTED',
        });

        await this.notionAssist.addCalendarProp(newCalendar);
        const events =
            await this.googleCalendarAssist.getEventByCalendar(newCalendar);

        const calendar = await DB.calendar.findOne({
            where: {
                id: newCalendar.id,
            },
        });
        for (const event of events) {
            await this.addEventByGCal(GoogleCalendarEventDto.fromEvent(event));
        }

        this.context.result.syncNewCalendar[`${calendar.id}`].eventCount =
            events.length;
    }
}
