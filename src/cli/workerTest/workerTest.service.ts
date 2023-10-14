import { Client } from '@notionhq/client';
import { CalendarEntity, UserEntity } from '@opize/calendar2notion-object';
import dayjs from 'dayjs';
import { calendar_v3, google } from 'googleapis';

import { NotionDateTime } from '@/module/event';

const getGoogleCalendarTokensByUser = (user: UserEntity) => {
    const callbackUrls = JSON.parse(process.env.GOOGLE_CALLBACKS || '{}');
    const callbackUrl = callbackUrls[String(user.googleRedirectUrlVersion)];
    if (!callbackUrl) {
        console.log('콜백 오류');
    }

    return {
        accessToken: user.googleAccessToken,
        refreshToken: user.googleRefreshToken,
        callbackUrl,
    };
};

export class WorkerTestService {
    private user: UserEntity;
    private notionClient: Client;
    private googleCalendarClient: calendar_v3.Calendar;

    constructor(user: UserEntity) {
        this.user = user;
        this.notionClient = this.getNotionClient();
        this.googleCalendarClient = this.getGoogleCalendarClient();
    }

    private getNotionClient() {
        return new Client({
            auth:
                this.user.notionWorkspace?.accessToken ||
                this.user.notionAccessToken,
        });
    }

    private getGoogleCalendarClient() {
        const tokens = getGoogleCalendarTokensByUser(this.user);

        const oAuth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_PASSWORD,
            tokens.callbackUrl,
        );
        oAuth2Client.setCredentials({
            refresh_token: tokens.refreshToken,
            access_token: tokens.accessToken,
        });
        return google.calendar({
            version: 'v3',
            auth: oAuth2Client,
        });
    }

    async createTestNotionPage(title: string, calendar: CalendarEntity) {
        const props = this.user.parsedNotionProps;
        const date: NotionDateTime = {
            start: dayjs().format('YYYY-MM-DD'),
        };

        return await this.notionClient.pages.create({
            parent: {
                database_id: this.user.notionDatabaseId,
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
                        name: calendar.googleCalendarName,
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
            },
        });
    }

    async createTestGoogleCalendarEvent(
        title: string,
        calendar: CalendarEntity,
    ) {
        const date = dayjs().format('YYYY-MM-DD');
        return await this.googleCalendarClient.events.insert({
            calendarId: calendar.googleCalendarId,
            requestBody: {
                summary: title,
                location: 'TEST LOCATION',
                description: 'TEST DESCRIPTION',
                start: {
                    date,
                },
                end: {
                    date,
                },
            },
        });
    }
}
