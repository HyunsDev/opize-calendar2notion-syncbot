import { CalendarEntity } from '@opize/calendar2notion-object';

import { DB } from '@/database';
import {
    EventDto,
    GoogleCalendarEventDto,
    NotionEventDto,
} from '@/module/event';

import { WorkContext } from '../../context/work.context';
import { SyncErrorCode } from '../../error';
import { NotionSyncError } from '../../error/notion.error';
import { Assist } from '../../types/assist';
import { EventLinkAssist } from '../eventLinkAssist';
import { GoogleCalendarAssist } from '../googleCalendarAssist';

import { NotionAssistApi } from './api';
import { NotionValidation } from './validate';

export class NotionAssist extends Assist {
    private context: WorkContext;

    private api: NotionAssistApi;
    private eventLinkAssist: EventLinkAssist;
    private googleCalendarAssist: GoogleCalendarAssist;

    constructor({ context }: { context: WorkContext }) {
        super();
        this.context = context;
        this.assistName = 'NotionAssist';

        this.api = new NotionAssistApi({
            context: this.context,
        });
    }

    public dependencyInjection({
        eventLinkAssist,
        googleCalendarAssist,
    }: {
        eventLinkAssist: EventLinkAssist;
        googleCalendarAssist: GoogleCalendarAssist;
    }) {
        this.eventLinkAssist = eventLinkAssist;
        this.googleCalendarAssist = googleCalendarAssist;
    }

    public async validationAndRestore() {
        const validation = new NotionValidation(this.context, this.api);
        const errors = await validation.run();
        if (errors.length !== 0) {
            throw new NotionSyncError({
                code: SyncErrorCode.notion.sync.VALIDATION_ERROR,
                user: this.context.user,
                detail: errors
                    .map((e) => `${e.error}: ${e.message}`)
                    .join('\n'),
            });
        }

        return true;
    }

    public async getDeletedPages() {
        return await this.api.getDeletedPages();
    }

    public async addCalendarProp(calendar: CalendarEntity) {
        // 속성 추가
        const calendarOptions = this.getCalendarOptions();
        calendarOptions.push({
            name: calendar.googleCalendarName,
            id: undefined,
        });
        const database = await this.api.updateCalendarOptions(calendarOptions);

        // 새로운 속성 찾기
        const { calendar: calendarProp } = this.context.user.parsedNotionProps;
        const oldPropIds = this.context.calendars.map(
            (e) => e.notionPropertyId,
        );
        const newProp: {
            id: string;
            name: string;
            color: string;
        } = Object.values(
            (
                Object.values(database.properties).find(
                    (e) => e.id === calendarProp,
                ) as any
            ).select.options,
        ).filter((e: any) => !oldPropIds.includes(e.id))[0] as any;

        await DB.calendar.update(calendar.id, {
            notionPropertyId: newProp.id,
        });
    }

    public async deletePage(pageId: string) {
        await this.api.deletePage(pageId);
    }

    public async getUpdatedPages() {
        const updatedPages = await this.api.getUpdatedPages();

        const updatedPagesWithEventLink = await Promise.all(
            updatedPages.map(async (page) => {
                page.eventLink = await this.eventLinkAssist.findByNotionPageId(
                    page.notionPageId,
                );
                return page;
            }),
        );

        this.context.result.syncEvents.notion2GCalCount = updatedPages.length;
        return updatedPagesWithEventLink;
    }

    public async getPages() {
        const pages = await this.api.getPages();
        return pages;
    }

    public async updatePageAfterCreateGCalEvent(
        googleCalendarEvent: GoogleCalendarEventDto,
    ) {
        const event = googleCalendarEvent.toEvent();
        await this._updatePage(event);
    }

    public async CUDPage(googleCalendarEvent: GoogleCalendarEventDto) {
        const event = googleCalendarEvent.toEvent();
        if (event.isNewEvent()) {
            await this._createPage(event);
        } else {
            await this._updatePage(event);
        }
    }

    private async _updatePage(event: EventDto) {
        event.googleCalendarEventId = event.eventLink.googleCalendarEventId;
        event.notionPageId = event.eventLink.notionPageId;

        if (event.isDeletedEvent()) {
            await this.deletePage(event.notionPageId);
            return;
        }

        if (event.isDifferentCalendarId()) {
            await this.eventLinkAssist.updateCalendar(
                event.eventLink,
                event.calendar,
            );
        }

        await this.api.updatePage(NotionEventDto.fromEvent(event));
        await this.eventLinkAssist.updateLastNotionUpdate(event.eventLink);
    }

    private async _createPage(event: EventDto) {
        if (event.isDeletedEvent()) return;

        const newEvent = await this.api.createPage(
            NotionEventDto.fromEvent(event),
        );
        const eventLink = await this.eventLinkAssist.create(
            event.merge(newEvent.toEvent()),
        );

        if (event.isReadOnly()) return;

        newEvent.eventLink = eventLink;
        await this.googleCalendarAssist.updateEventAfterNotionPageCreate(
            newEvent,
        );
    }

    private getCalendarOptions(): {
        id?: string;
        name: string;
    }[] {
        return this.context.calendars
            .filter((e) => e.notionPropertyId)
            .map((e) => ({
                id: e.notionPropertyId,
                name: e.googleCalendarName,
            }));
    }
}
