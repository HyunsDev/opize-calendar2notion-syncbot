import dayjs from 'dayjs';
import { GaxiosError } from 'googleapis-common';

import { DB } from '@/database';

import { WorkContext } from '../../context/work.context';
import { SyncErrorCode } from '../../error';
import { GoogleCalendarAPIError } from '../../error/googleCalendar.error';

export async function googleCalendarAPIErrorFilter<T>(
    func: () => Promise<T>,
    context: WorkContext,
    args: any[],
) {
    try {
        return await func();
    } catch (err) {
        if (!(err instanceof GaxiosError)) {
            throw err;
        }

        if (!err.response) {
            throw new GoogleCalendarAPIError({
                code: SyncErrorCode.googleCalendar.api.UNKNOWN_ERROR,
                user: context.user,
                err,
                args,
            });
        }

        const { status, data } = err.response;
        if (status === 400) {
            throw new GoogleCalendarAPIError({
                code: SyncErrorCode.googleCalendar.api.INVALID_REQUEST,
                user: context.user,
                err,
                args,
            });
        }

        if (status === 401) {
            throw new GoogleCalendarAPIError({
                code: SyncErrorCode.googleCalendar.api.INVALID_CREDENTIALS,
                user: context.user,
                err,
                args,
            });
        }

        if (status === 403) {
            if (
                ['User Rate Limit Exceeded', 'Rate Limit Exceeded'].includes(
                    data.message,
                )
            ) {
                throw new GoogleCalendarAPIError({
                    code: SyncErrorCode.googleCalendar.api.RATE_LIMIT,
                    user: context.user,
                    err,
                    args,
                });
            }

            if (
                [
                    'Calendar usage limits exceeded.',
                    'Calendar usage limits exceeded',
                ].includes(data.message)
            ) {
                throw new GoogleCalendarAPIError({
                    code: SyncErrorCode.googleCalendar.api.FORBIDDEN,
                    user: context.user,
                    err,
                    args,
                });
            }

            throw new GoogleCalendarAPIError({
                code: SyncErrorCode.googleCalendar.api
                    .USER_CALENDAR_USAGE_LIMIT,
                user: context.user,
                err,
                args,
            });
        }

        if (status === 404) {
            throw new GoogleCalendarAPIError({
                code: SyncErrorCode.googleCalendar.api.NOT_FOUND,
                user: context.user,
                err,
                args,
            });
        }

        if (status === 410) {
            if (data.message === 'deleted') {
                return;
            }

            if (data.error.errors[0].reason === 'updatedMinTooLongAgo') {
                await DB.user.update(
                    {
                        id: context.user.id,
                    },
                    {
                        lastCalendarSync: dayjs().add(-10, 'days').toDate(),
                    },
                );

                throw new GoogleCalendarAPIError({
                    code: SyncErrorCode.googleCalendar.api
                        .GONE_UPDATED_MIN_TOO_LONG_AGO,
                    user: context.user,
                    err,
                    args,
                });
            }

            throw new GoogleCalendarAPIError({
                code: SyncErrorCode.googleCalendar.api.GONE,
                user: context.user,
                err,
                args,
            });
        }

        if (status === 429) {
            throw new GoogleCalendarAPIError({
                code: SyncErrorCode.googleCalendar.api.RATE_LIMIT,
                user: context.user,
                err,
                args,
            });
        }

        if (status === 500) {
            throw new GoogleCalendarAPIError({
                code: SyncErrorCode.googleCalendar.api.INTERNAL_SERVER_ERROR,
                user: context.user,
                err,
                args,
            });
        }

        throw new GoogleCalendarAPIError({
            code: SyncErrorCode.googleCalendar.api.UNKNOWN_ERROR,
            user: context.user,
            err,
            args,
        });
    }
}
