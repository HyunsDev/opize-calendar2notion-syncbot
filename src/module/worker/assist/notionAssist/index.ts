import { GetDatabaseResponse } from '@notionhq/client/build/src/api-endpoints';
import { CalendarEntity } from '@opize/calendar2notion-object';

import { DB } from '@/database';
import { EventDto, NotionEventDto } from '@/module/event';

import { WorkContext } from '../../context/work.context';
import { SyncErrorCode } from '../../error';
import { NotionSyncError } from '../../error/notion.error';
import { Assist } from '../../types/assist';
import { EventLinkAssist } from '../eventLinkAssist';

import { NotionAssistApi } from './api';

export class NotionAssist extends Assist {
    private context: WorkContext;

    private api: NotionAssistApi;
    private eventLinkAssist: EventLinkAssist;

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
        this.assistName = 'NotionAssist';

        this.api = new NotionAssistApi({
            context: this.context,
        });
    }

    public async validation() {
        const database = await this.api.getDatabase();
        this.checkProps(database);
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

    public async addPage(event: EventDto) {
        const page = await this.api.createPage(NotionEventDto.fromEvent(event));
        return page;
    }

    public async getUpdatedPages() {
        const updatedPages = await this.api.getUpdatedPages();
        this.context.result.syncEvents.notion2GCalCount = updatedPages.length;
        return updatedPages;
    }

    public async getPages() {
        const pages = await this.api.getPages();
        return pages;
    }

    public async CUDPage(event: EventDto) {
        const eventLink = await this.eventLinkAssist.findByGCalEvent(
            event.googleCalendarEventId,
            event.calendar.googleCalendarId,
        );

        if (eventLink && eventLink.notionPageId) {
            if (event.status === 'cancelled') {
                await this.deletePage(event.notionEventId);
                return;
            }

            if (
                eventLink.googleCalendarCalendarId !==
                event.calendar.googleCalendarId
            ) {
                await this.eventLinkAssist.updateCalendar(
                    eventLink,
                    event.calendar,
                );
            }
            await this.api.updatePage(NotionEventDto.fromEvent(event));
        } else {
            if (event.status === 'cancelled') return;
            const newEvent = await this.api.createPage(
                NotionEventDto.fromEvent(event),
            );
            await this.eventLinkAssist.create(event.merge(newEvent.toEvent()));
        }
    }

    private checkProps(database: GetDatabaseResponse) {
        const userProps = this.context.user.parsedNotionProps;

        const requiredProps = ['title', 'calendar', 'date', 'delete'];

        const propsMap = {
            title: 'title',
            calendar: 'select',
            date: 'date',
            delete: 'checkbox',
            link: 'url',
        };

        const errors: {
            error: string;
            message: string;
        }[] = [];

        for (const prop of requiredProps) {
            if (!userProps[prop]) {
                errors.push({
                    error: 'prop_not_exist',
                    message: `필수 속성인 ${prop} 이(가) 없습니다`,
                });
            }
        }

        for (const userProp in userProps) {
            const prop = Object.values(database.properties).find(
                (e) => e.id === userProps[userProp],
            );
            if (!prop) {
                // 해당 prop이 존재 하지 않음
                errors.push({
                    error: 'prop_not_found',
                    message: `${userProp}에 해당하는 속성을 찾을 수 없습니다. (아이디: ${userProps[userProp]})`,
                });
                continue;
            }
            if (propsMap[userProp] && prop.type !== propsMap[userProp]) {
                // 정해진 타입과 일치하지 않음
                errors.push({
                    error: 'wrong_prop_type',
                    message: `${userProp} 속성의 유형이 올바르지 않습니다. (기대한 타입: ${propsMap[userProp]}, 실제 타입: ${prop.type})`,
                });
                continue;
            }
        }

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
