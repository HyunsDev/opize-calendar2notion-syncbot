import { Client } from '@notionhq/client';
import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';

import { NotionEventDto } from '@/module/event';
import { fetchAll } from '@/utils';

import { WorkContext } from '../../context/work.context';

import { NotionAPI } from './api.decorator';
import { extraNotionAPIErrorFilterRules } from './apiErrorFilterRule';

export class NotionAssistApi {
    private context: WorkContext;

    private client: Client;

    constructor({ context }: { context: WorkContext }) {
        this.context = context;

        this.client = new Client({
            auth:
                this.context.user.notionWorkspace?.accessToken ||
                this.context.user.notionAccessToken,
        });
    }

    @NotionAPI('database')
    async getDatabase() {
        return await this.client.databases.retrieve({
            database_id: this.context.user.notionDatabaseId,
        });
    }

    @NotionAPI('database')
    async getDeletedPages() {
        const props = this.context.user.parsedNotionProps;
        const writeAbleCalendarOptions = this.context.writeableCalendars.map(
            (c) => ({
                property: props.calendar,
                select: {
                    equals: c.googleCalendarName,
                },
            }),
        );

        const result = await fetchAll(async (nextCursor) => {
            const res = await this.client.databases.query({
                database_id: this.context.user.notionDatabaseId,
                start_cursor: nextCursor,
                filter: {
                    and: [
                        {
                            property: props.delete,
                            checkbox: {
                                equals: true,
                            },
                        },
                        {
                            property: props.calendar,
                            select: {
                                is_not_empty: true,
                            },
                        },
                        {
                            property: props.date,
                            date: {
                                on_or_after: this.context.config.timeMin,
                                on_or_before: this.context.config.timeMax,
                            },
                        },
                        {
                            or: writeAbleCalendarOptions,
                        },
                    ],
                },
            });
            return {
                results: res.results,
                nextCursor: res.next_cursor,
            };
        });

        return result.map((page: PageObjectResponse) =>
            NotionEventDto.fromNotionEvent(
                page,
                this.getCalendarByPageObject(page),
                props,
            ),
        );
    }

    @NotionAPI('page')
    async getProp(pageId: string, propertyId: string) {
        return await this.client.pages.properties.retrieve({
            page_id: pageId,
            property_id: propertyId,
        });
    }

    @NotionAPI('page', [
        extraNotionAPIErrorFilterRules.IGNORE_ALREADY_ARCHIVED_PAGE,
        extraNotionAPIErrorFilterRules.IGNORE_NOT_FOUND,
    ])
    async deletePage(pageId: string) {
        try {
            await this.client.pages.update({
                page_id: pageId,
                archived: true,
            });
        } catch (err) {
            if (
                err.message ===
                `Can't update a page that is archived. You must unarchive the page before updating.`
            ) {
                return true;
            }

            if (err.status === 404) {
                return true;
            }

            throw err;
        }
    }

    @NotionAPI('database')
    async updateCalendarOptions(
        calendars: {
            name: string;
            id?: string;
        }[],
    ) {
        const { calendar } = this.context.user.parsedNotionProps;
        return await this.client.databases.update({
            database_id: this.context.user.notionDatabaseId,
            properties: {
                [calendar]: {
                    select: {
                        options: calendars,
                    },
                },
            },
        });
    }

    @NotionAPI('page')
    async createPage(event: NotionEventDto) {
        const props = this.context.user.parsedNotionProps;

        const res = await this.client.pages.create({
            parent: {
                type: 'database_id',
                database_id: this.context.user.notionDatabaseId,
            },
            properties: {
                title: {
                    type: 'title',
                    title: [
                        {
                            type: 'text',
                            text: {
                                content: event.title || '',
                            },
                        },
                    ],
                },
                [props.calendar]: {
                    type: 'select',
                    select: {
                        name: event.calendar.googleCalendarName,
                    },
                },
                [props.date]: {
                    type: 'date',
                    date: event.date,
                },
                [props.link]: {
                    type: 'url',
                    url: event.googleCalendarEventLink || null,
                },
                [props.description]: {
                    type: 'rich_text',
                    rich_text: [
                        {
                            type: 'text',
                            text: {
                                content: event.description || '',
                            },
                        },
                    ],
                },
                [props.location]: {
                    type: 'rich_text',
                    rich_text: [
                        {
                            type: 'text',
                            text: {
                                content: event.location || '',
                            },
                        },
                    ],
                },
            },
        });
        return NotionEventDto.fromNotionEvent(
            res as PageObjectResponse,
            event.calendar,
            props,
        );
    }

    @NotionAPI('database')
    async getUpdatedPages() {
        const props = this.context.user.parsedNotionProps;
        const writeAbleCalendarOptions = this.context.writeableCalendars.map(
            (c) => ({
                property: props.calendar,
                select: {
                    equals: c.googleCalendarName,
                },
            }),
        );

        const result = await fetchAll(async (nextCursor) => {
            const res = await this.client.databases.query({
                database_id: this.context.user.notionDatabaseId,
                start_cursor: nextCursor,
                filter: {
                    and: [
                        {
                            property: props.calendar,
                            select: {
                                is_not_empty: true,
                            },
                        },
                        {
                            property: props.date,
                            date: {
                                on_or_after: this.context.config.timeMin,
                                on_or_before: this.context.config.timeMax,
                            },
                        },
                        {
                            or: writeAbleCalendarOptions,
                        },
                        {
                            property: props.last_edited_by,
                            people: {
                                contains:
                                    this.context.user.notionWorkspace.botId,
                            },
                        },
                        {
                            timestamp: 'last_edited_time',
                            last_edited_time: {
                                on_or_after:
                                    this.context.period.start.toISOString(),
                            },
                        },
                        {
                            timestamp: 'last_edited_time',
                            last_edited_time: {
                                before: this.context.period.end.toISOString(),
                            },
                        },
                    ],
                },
            });
            return {
                results: res.results,
                nextCursor: res.next_cursor,
            };
        });

        return result
            .filter(
                (page: PageObjectResponse) =>
                    new Date(page.last_edited_time) < this.context.period.end,
            )
            .map((page: PageObjectResponse) =>
                NotionEventDto.fromNotionEvent(
                    page,
                    this.getCalendarByPageObject(page),
                    props,
                ),
            );
    }

    @NotionAPI('page')
    public async getPages() {
        const props = this.context.user.parsedNotionProps;
        const writeAbleCalendarOptions = this.context.writeableCalendars.map(
            (c) => ({
                property: props.calendar,
                select: {
                    equals: c.googleCalendarName,
                },
            }),
        );

        const result = await fetchAll(async (nextCursor) => {
            const res = await this.client.databases.query({
                database_id: this.context.user.notionDatabaseId,
                start_cursor: nextCursor,
                filter: {
                    and: [
                        {
                            property: props.calendar,
                            select: {
                                is_not_empty: true,
                            },
                        },
                        {
                            property: props.date,
                            date: {
                                on_or_after: this.context.config.timeMin,
                                on_or_before: this.context.config.timeMax,
                            },
                        },
                        {
                            or: writeAbleCalendarOptions,
                        },
                    ],
                },
            });
            return {
                results: res.results,
                nextCursor: res.next_cursor,
            };
        });

        return result.map((page: PageObjectResponse) =>
            NotionEventDto.fromNotionEvent(
                page,
                this.getCalendarByPageObject(page),
                props,
            ),
        );
    }

    @NotionAPI('page', [
        extraNotionAPIErrorFilterRules.IGNORE_NOT_FOUND,
        extraNotionAPIErrorFilterRules.IGNORE_ALREADY_ARCHIVED_PAGE,
    ])
    async updatePage(event: NotionEventDto) {
        const props = this.context.user.parsedNotionProps;
        const res = await this.client.pages.update({
            page_id: event.notionPageId,
            properties: {
                title: {
                    type: 'title',
                    title: [
                        {
                            type: 'text',
                            text: {
                                content: event.title || '',
                            },
                        },
                    ],
                },
                [props.calendar]: {
                    type: 'select',
                    select: {
                        name: event.calendar.googleCalendarName,
                    },
                },
                [props.date]: {
                    type: 'date',
                    date: event.date,
                },
                [props.link]: {
                    type: 'url',
                    url: event.googleCalendarEventLink || null,
                },
                [props.description]: {
                    type: 'rich_text',
                    rich_text: [
                        {
                            type: 'text',
                            text: {
                                content: event.description || '',
                            },
                        },
                    ],
                },
                [props.location]: {
                    type: 'rich_text',
                    rich_text: [
                        {
                            type: 'text',
                            text: {
                                content: event.location || '',
                            },
                        },
                    ],
                },
            },
        });
        return NotionEventDto.fromNotionEvent(
            res as PageObjectResponse,
            event.calendar,
            props,
        );
    }

    /**
     * 노션 데이터베이스에 속성을 추가합니다
     * - 동일한 속성이 이미 있다면 해당 속성을 반환합니다
     * - 이름이 동일하고 타입이 다른 속성이 있다면 '이름 (1)' 형태의 속성을 만들고 반환합니다
     */
    @NotionAPI('database')
    async addProp(
        name: string,
        type:
            | 'last_edited_time'
            | 'checkbox'
            | 'date'
            | 'last_edited_by'
            | 'rich_text'
            | 'url',
    ) {
        let _name = name;
        const existDatabase = await this.getDatabase();
        if (existDatabase.properties[_name]) {
            if (existDatabase.properties[_name].type === type) {
                return existDatabase.properties[_name];
            } else {
                let i = 1;
                while (existDatabase.properties[_name]) {
                    _name = `${name} (${i})`;
                    i++;
                }
            }
        }

        const database = await this.client.databases.update({
            database_id: this.context.user.notionDatabaseId,
            properties: {
                [_name]: {
                    name: _name,
                    [type]: {},
                },
            },
        });
        const prop = database.properties[name];
        return prop;
    }

    private getCalendarByPageObject(page: PageObjectResponse) {
        const props = this.context.user.parsedNotionProps;
        const calendar = this.context.calendars.find(
            (c) =>
                c.googleCalendarName ===
                (
                    Object.values(page.properties).find(
                        (e) => e.id === props.calendar,
                    ) as {
                        type: string;
                        select: {
                            name: string;
                        };
                    }
                ).select.name,
        );
        return calendar;
    }
}
