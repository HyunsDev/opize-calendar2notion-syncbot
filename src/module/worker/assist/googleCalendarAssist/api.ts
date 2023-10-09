import { CalendarEntity, UserEntity } from '@opize/calendar2notion-object';
import { GaxiosError } from 'gaxios';
import { google, calendar_v3 } from 'googleapis';

import { GoogleCalendarEventDto } from '@/module/event';
import { fetchAll } from '@/utils';

import { WorkContext } from '../../context/work.context';
import { SyncError } from '../../error/error';

import { GoogleCalendarAPI } from './api.decorator';

export const getGoogleCalendarTokensByUser = (user: UserEntity) => {
    const callbackUrls = JSON.parse(process.env.GOOGLE_CALLBACKS || '{}');

    const callbackUrl = callbackUrls[String(user.googleRedirectUrlVersion)];

    if (!callbackUrl) {
        throw new SyncError({
            code: 'GOOGLE_CALLBACK_URL_NOT_FOUND',
            description: '콜백 URL을 찾을 수 없습니다.',
            finishWork: 'STOP',
            from: 'SYNCBOT',
            level: 'ERROR',
            user: user,
            detail: JSON.stringify({
                callbackUrls,
                googleRedirectUrlVersion: user.googleRedirectUrlVersion,
            }),
        });
    }

    return {
        accessToken: user.googleAccessToken,
        refreshToken: user.googleRefreshToken,
        callbackUrl,
    };
};

export class GoogleCalendarAssistApi {
    private context: WorkContext;

    private client: calendar_v3.Calendar;

    constructor({ context }: { context: WorkContext }) {
        this.context = context;

        const tokens = getGoogleCalendarTokensByUser(this.context.user);

        const oAuth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_PASSWORD,
            tokens.callbackUrl,
        );
        oAuth2Client.setCredentials({
            refresh_token: tokens.refreshToken,
            access_token: tokens.accessToken,
        });
        this.client = google.calendar({
            version: 'v3',
            auth: oAuth2Client,
        });
    }

    @GoogleCalendarAPI()
    public async deleteEvent(eventId: string, calendarId: string) {
        try {
            await this.client.events.delete({
                eventId,
                calendarId,
            });
        } catch (err) {
            if (err instanceof GaxiosError) {
                if (err.response?.status === 404) {
                    return;
                }

                if (err.response.status == 410) {
                    return;
                }
            }

            throw err;
        }
    }

    @GoogleCalendarAPI()
    async getEvent(
        eventId: string,
        calendar: CalendarEntity,
    ): Promise<GoogleCalendarEventDto> {
        const res = await this.client.events.get({
            calendarId: calendar.googleCalendarId,
            eventId,
        });
        return GoogleCalendarEventDto.fromGoogleCalendar(res.data, calendar);
    }

    @GoogleCalendarAPI()
    public async getEventsByCalendar(calendar: CalendarEntity) {
        const res = await fetchAll(async (nextPageToken) => {
            const res = await this.client.events.list({
                calendarId: calendar.googleCalendarId,
                maxResults: 2500,
                timeZone: this.context.user.userTimeZone,
                pageToken: nextPageToken,
                singleEvents: true,
                timeMin: this.context.config.timeMin,
                timeMax: this.context.config.timeMax,
            });
            return {
                results: res.data.items || [],
                nextCursor: res.data.nextPageToken,
            };
        });
        return res.map((event) =>
            GoogleCalendarEventDto.fromGoogleCalendar(event, calendar),
        );
    }

    @GoogleCalendarAPI()
    public async getUpdatedEventsByCalendar(calendar: CalendarEntity) {
        const res = await fetchAll(async (nextPageToken) => {
            const res = await this.client.events.list({
                calendarId: calendar.googleCalendarId,
                maxResults: 2500,
                timeZone: this.context.user.userTimeZone,
                pageToken: nextPageToken,
                showDeleted: true,
                singleEvents: true,
                timeMin: this.context.config.timeMin,
                timeMax: this.context.config.timeMax,
                updatedMin: this.context.period.start.toISOString(),
            });
            return {
                results: res.data.items || [],
                nextCursor: res.data.nextPageToken,
            };
        });

        return res
            .filter((e) => new Date(e.updated) < this.context.period.end)
            .map((event) =>
                GoogleCalendarEventDto.fromGoogleCalendar(event, calendar),
            );
    }

    @GoogleCalendarAPI()
    async moveEventCalendar(
        event: GoogleCalendarEventDto,
        newCalendar: CalendarEntity,
    ) {
        const res = await this.client.events.move({
            eventId: event.googleCalendarEventId,
            calendarId: event.calendar.googleCalendarId,
            destination: newCalendar.googleCalendarId,
        });
        return GoogleCalendarEventDto.fromGoogleCalendar(res.data, newCalendar);
    }

    // @GoogleCalendarAPI()
    // public async updateEvent(eventLink: EventEntity, page: PageObjectResponse) {
    //     const props: {
    //         title: string;
    //         calendar: string;
    //         date: string;
    //         delete: string;
    //         link?: string;
    //     } = JSON.parse(this.context.user.notionProps);

    //     const titleProp = Object.values(page.properties).find(
    //         (e) => e.type === 'title',
    //     ) as any;
    //     const title =
    //         titleProp.title.map((e: any) => e?.plain_text).join('') || '';

    //     const dateProp = Object.values(page.properties).find(
    //         (e) => e.id === props.date,
    //     ) as {
    //         date: NotionDateTime;
    //     };
    //     const date = EventDate.fromNotionDate({
    //         start: dateProp.date.start,
    //         end: dateProp.date.end,
    //     }).toGCalDate();

    //     try {
    //         return await this.client.events.patch({
    //             eventId: eventLink.googleCalendarEventId,
    //             calendarId: eventLink.googleCalendarCalendarId,
    //             requestBody: {
    //                 start: date.start,
    //                 end: date.end,
    //                 summary: title,
    //             },
    //         });
    //     } catch (err: unknown) {
    //         if (err instanceof GaxiosError) {
    //             if (
    //                 err.response.status === 403 &&
    //                 err.response.data.error.message === 'Forbidden' &&
    //                 err.response.data.error.errors[0].domain === 'global' &&
    //                 err.response.data.error.errors[0].reason === 'forbidden'
    //             ) {
    //                 return;
    //             }

    //             // TODO: #94 노션에서 수정된 일정이 구글 캘린더에 없을 경우의 처리 수정
    //             if (err.response.status === 404) {
    //                 return;
    //             }
    //         }

    //         throw err;
    //     }
    // }

    @GoogleCalendarAPI()
    async createEvent(
        event: GoogleCalendarEventDto,
    ): Promise<GoogleCalendarEventDto> {
        const res = await this.client.events.insert({
            calendarId: event.calendar.googleCalendarId,
            requestBody: {
                start: event.date.start,
                end: event.date.end,
                summary: event.summary,
                description: event.description,
                location: event.location,
                status: event.status,
                // Cron과의 연결을 위한 extendedProperties
                extendedProperties: {
                    shared: {
                        [`n.attchwsid.${event.notionPageId}`]:
                            'bdcd90fd-4c12-4832-9caf-4fb21fc6c524',
                        [`n.attchwsid.878025b813f54f1996ac4e985d3cd422`]:
                            'bdcd90fd-4c12-4832-9caf-4fb21fc6c524',
                    },
                },
                // Google Calendar에 Notion Event를 첨부하기 위한 attachments
                attachments: [
                    {
                        fileUrl: `https://www.notion.so/${event.notionPageId}`,
                        title: event.summary,
                        iconLink:
                            'https://lh3.googleusercontent.com/pw/AJFCJaU8wzEWMXWYp2glnlt4vX9rdN3h4KJGpgu6zshkAEPSohFfttbcfQh_TJf1LqOwuoWvBQaVZaShLmbFfIUaZlu-kAkaeLkQSKTrMHUoIDviYIbizCzOIOwp-g2Wl6amU0LuYxkqO9kLcOe-L4o_qEg=w32-h32-s-no?authuser=0',
                    },
                ],
            },
        });

        return GoogleCalendarEventDto.fromGoogleCalendar(
            res.data,
            event.calendar,
        );
    }

    @GoogleCalendarAPI()
    async updateEvent(
        event: GoogleCalendarEventDto,
    ): Promise<GoogleCalendarEventDto> {
        const existEvent = await this.getEvent(
            event.googleCalendarEventId,
            event.calendar,
        );

        const extendedProperties = {
            shared: {
                ...existEvent.originalGoogleCalendarEvent.extendedProperties
                    ?.shared,
                [`n.attchwsid.${event.notionPageId}`]:
                    'bdcd90fd-4c12-4832-9caf-4fb21fc6c524',
                [`n.attchwsid.878025b813f54f1996ac4e985d3cd422`]:
                    'bdcd90fd-4c12-4832-9caf-4fb21fc6c524',
            },
            private: {
                ...existEvent.originalGoogleCalendarEvent.extendedProperties
                    ?.private,
            },
        };

        const attachmentsWithoutNotion =
            existEvent.originalGoogleCalendarEvent.attachments?.filter(
                (attachment) =>
                    attachment.fileUrl !==
                    `https://www.notion.so/${event.notionPageId}`,
            ) || [];

        const notionAttachment =
            existEvent.originalGoogleCalendarEvent.attachments?.find(
                (attachment) =>
                    attachment.fileUrl ===
                    `https://www.notion.so/${event.notionPageId}`,
            ) || {
                fileUrl: `https://www.notion.so/${event.notionPageId}`,
                title: event.summary,
                iconLink:
                    'https://lh3.googleusercontent.com/pw/AJFCJaU8wzEWMXWYp2glnlt4vX9rdN3h4KJGpgu6zshkAEPSohFfttbcfQh_TJf1LqOwuoWvBQaVZaShLmbFfIUaZlu-kAkaeLkQSKTrMHUoIDviYIbizCzOIOwp-g2Wl6amU0LuYxkqO9kLcOe-L4o_qEg=w32-h32-s-no?authuser=0',
            };
        notionAttachment.title = event.summary;

        const res = await this.client.events.update({
            calendarId: event.calendar.googleCalendarId,
            eventId: event.googleCalendarEventId,
            requestBody: {
                start: event.date.start,
                end: event.date.end,
                summary: event.summary,
                description: event.description,
                location: event.location,
                status: event.status,
                extendedProperties,
                attachments: [...attachmentsWithoutNotion, notionAttachment],
            },
        });

        return GoogleCalendarEventDto.fromGoogleCalendar(
            res.data,
            event.calendar,
        );
    }
}
