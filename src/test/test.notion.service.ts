import { APIResponseError, Client } from '@notionhq/client';
import {
    PageObjectResponse,
    RichTextItemResponse,
} from '@notionhq/client/build/src/api-endpoints';
import { CalendarEntity } from '@opize/calendar2notion-object';

import { NotionDateTime } from '@/module/event';

import { TestContext } from './test.context';

export const richText = (
    prop:
        | {
              type: 'rich_text';
              rich_text: RichTextItemResponse[];
          }
        | {
              type: 'title';
              title: RichTextItemResponse[];
          },
) => {
    if (prop.type === 'rich_text') {
        return prop.rich_text.map((t) => t.plain_text).join('');
    } else if (prop.type === 'title') {
        return prop.title.map((t) => t.plain_text).join('');
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
            return (await this.notionClient.pages.retrieve({
                page_id: pageId,
            })) as PageObjectResponse;
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
