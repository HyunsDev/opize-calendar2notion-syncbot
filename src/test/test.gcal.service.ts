import { CalendarEntity, UserEntity } from '@opize/calendar2notion-object';
import dayjs from 'dayjs';
import { calendar_v3, google } from 'googleapis';
import { GaxiosError } from 'googleapis-common';

import { TestContext } from './test.context';

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

export class TestGCalService {
    private ctx: TestContext;

    private googleCalendarClient: calendar_v3.Calendar;

    constructor(ctx: TestContext) {
        this.ctx = ctx;

        this.googleCalendarClient = this.getGoogleCalendarClient();
    }

    private getGoogleCalendarClient() {
        const tokens = getGoogleCalendarTokensByUser(this.ctx.user);

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

    async createTestGoogleCalendarEvent(title: string) {
        const date = dayjs().format('YYYY-MM-DD');
        return await this.googleCalendarClient.events.insert({
            calendarId: this.ctx.calendar.googleCalendarId,
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

    async editTestGoogleCalendarEvent(eventId: string, title: string) {
        const date = dayjs().format('YYYY-MM-DD');
        return await this.googleCalendarClient.events.patch({
            calendarId: this.ctx.calendar.googleCalendarId,
            eventId: eventId,
            requestBody: {
                summary: title,
                location: 'EDITED TEST LOCATION',
                description: 'EDITED TEST DESCRIPTION',
                start: {
                    date,
                },
                end: {
                    date,
                },
            },
        });
    }

    async moveTestGoogleCalendarEvent(eventId: string) {
        return await this.googleCalendarClient.events.move({
            calendarId: this.ctx.calendar.googleCalendarId,
            eventId: eventId,
            destination: this.ctx.calendar2.googleCalendarId,
        });
    }

    async getEvent(eventId: string, calendar: CalendarEntity) {
        try {
            const event = await this.googleCalendarClient.events.get({
                calendarId: calendar.googleCalendarId,
                eventId: eventId,
            });
            return event;
        } catch (err) {
            if (err instanceof GaxiosError && err.response.status === 404) {
                return null;
            } else throw err;
        }
    }

    async deleteEvent(eventId: string) {
        try {
            return await this.googleCalendarClient.events.delete({
                calendarId: this.ctx.calendar.googleCalendarId,
                eventId: eventId,
            });
        } catch (err) {
            if (err instanceof GaxiosError && err.response.status === 410) {
                return null;
            } else throw err;
        }
    }
}
