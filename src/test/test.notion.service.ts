import { APIResponseError, Client } from '@notionhq/client';
import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { CalendarEntity } from '@opize/calendar2notion-object';

import { NotionDateTime } from '@/module/event';

import { TestContext } from './test.context';

function isPropType<T extends PageObjectResponse['properties'][string]['type']>(
    obj: PageObjectResponse['properties'][string],
    type: T,
): obj is Extract<PageObjectResponse['properties'][string], { type: T }> {
    return obj.type === type;
}

export const getProp = <
    T extends PageObjectResponse['properties'][string]['type'] = 'title',
>(
    page: PageObjectResponse,
    propId: string,
    type: T,
) => {
    const prop = Object.values(page.properties).find((e) => e.id === propId);
    if (isPropType(prop, type)) {
        return prop;
    } else {
        throw new Error('Invalid prop type');
    }
};

export class TestNotionService {
    private ctx: TestContext;

    private notionClient: Client;

    constructor(ctx: TestContext) {
        this.ctx = ctx;
        this.notionClient = this.getNotionClient();
    }

    private getNotionClient() {
        return new Client({
            auth: process.env.TEST_BOT_2_TOKEN,
        });
    }

    async createPage(data: {
        title: string;
        calendarName: string;
        date: NotionDateTime;
        location: string;
        description: string;
    }) {
        const props = this.ctx.user.parsedNotionProps;
        return await this.notionClient.pages.create({
            parent: {
                database_id: this.ctx.user.notionDatabaseId,
            },
            properties: {
                title: {
                    type: 'title',
                    title: [
                        {
                            type: 'text',
                            text: {
                                content: data.title,
                            },
                        },
                    ],
                },
                [props.calendar]: {
                    type: 'select',
                    select: {
                        name: data.calendarName,
                    },
                },
                [props.date]: {
                    type: 'date',
                    date: data.date,
                },
                [props.location]: {
                    type: 'rich_text',
                    rich_text: [
                        {
                            type: 'text',
                            text: {
                                content: data.location,
                            },
                        },
                    ],
                },
                [props.description]: {
                    type: 'rich_text',
                    rich_text: [
                        {
                            type: 'text',
                            text: {
                                content: data.description,
                            },
                        },
                    ],
                },
            },
        });
    }

    async updatePage(
        pageId: string,
        data: {
            title: string;
            calendarName: string;
            date: NotionDateTime;
            location: string;
            description: string;
        },
    ) {
        const props = this.ctx.user.parsedNotionProps;
        return await this.notionClient.pages.update({
            page_id: pageId,
            properties: {
                title: {
                    type: 'title',
                    title: [
                        {
                            type: 'text',
                            text: {
                                content: data.title,
                            },
                        },
                    ],
                },
                [props.date]: {
                    type: 'date',
                    date: data.date,
                },
                [props.location]: {
                    type: 'rich_text',
                    rich_text: [
                        {
                            type: 'text',
                            text: {
                                content: data.location,
                            },
                        },
                    ],
                },
                [props.description]: {
                    type: 'rich_text',
                    rich_text: [
                        {
                            type: 'text',
                            text: {
                                content: data.description,
                            },
                        },
                    ],
                },
            },
        });
    }

    async moveCalendar(pageId: string, calendar: CalendarEntity) {
        const props = this.ctx.user.parsedNotionProps;
        return await this.notionClient.pages.update({
            page_id: pageId,
            properties: {
                [props.calendar]: {
                    type: 'select',
                    select: {
                        name: calendar.googleCalendarName,
                    },
                },
            },
        });
    }

    async getPage(pageId: string) {
        try {
            return await this.notionClient.pages.retrieve({
                page_id: pageId,
            });
        } catch (err) {
            if (err instanceof APIResponseError && err.status === 404) {
                return null;
            } else throw err;
        }
    }

    async deletePage(pageId: string) {
        try {
            await this.notionClient.pages.update({
                page_id: pageId,
                properties: {
                    [this.ctx.user.parsedNotionProps.delete]: {
                        type: 'checkbox',
                        checkbox: true,
                    },
                },
            });
        } catch (err) {
            if (
                err instanceof APIResponseError &&
                err.message ===
                    "Can't update a page that is archived. You must unarchive the page before updating."
            ) {
                return null;
            } else throw err;
        }
    }
}
