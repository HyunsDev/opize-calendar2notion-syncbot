import { APIResponseError, Client } from '@notionhq/client';
import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import dayjs from 'dayjs';

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

    async createTestNotionPage(title: string) {
        const props = this.ctx.user.parsedNotionProps;
        const date: NotionDateTime = {
            start: dayjs().format('YYYY-MM-DD'),
        };

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
                                content: title,
                            },
                        },
                    ],
                },
                [props.calendar]: {
                    type: 'select',
                    select: {
                        name: this.ctx.calendar.googleCalendarName,
                    },
                },
                [props.date]: {
                    type: 'date',
                    date: date,
                },
                [props.location]: {
                    type: 'rich_text',
                    rich_text: [
                        {
                            type: 'text',
                            text: {
                                content: 'TEST LOCATION',
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
                                content: 'TEST DESCRIPTION',
                            },
                        },
                    ],
                },
            },
        });
    }

    async updateTestNotionPage(pageId: string, title: string) {
        const props = this.ctx.user.parsedNotionProps;
        const date: NotionDateTime = {
            start: dayjs().add(1, 'day').format('YYYY-MM-DD'),
        };

        return await this.notionClient.pages.update({
            page_id: pageId,
            properties: {
                title: {
                    type: 'title',
                    title: [
                        {
                            type: 'text',
                            text: {
                                content: title,
                            },
                        },
                    ],
                },
                [props.date]: {
                    type: 'date',
                    date: date,
                },
                [props.location]: {
                    type: 'rich_text',
                    rich_text: [
                        {
                            type: 'text',
                            text: {
                                content: 'EDITED TEST LOCATION',
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
                                content: 'EDITED TEST DESCRIPTION',
                            },
                        },
                    ],
                },
            },
        });
    }

    async moveCalendar(pageId: string) {
        const props = this.ctx.user.parsedNotionProps;
        return await this.notionClient.pages.update({
            page_id: pageId,
            properties: {
                [props.calendar]: {
                    type: 'select',
                    select: {
                        name: this.ctx.calendar2.googleCalendarName,
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
