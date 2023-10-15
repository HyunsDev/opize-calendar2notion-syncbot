import dayjs from 'dayjs';
import { GaxiosResponse } from 'googleapis-common';

import { DB } from '@/database';

import { WorkContext } from '../../context/work.context';
import { SyncErrorCode } from '../../error';
import { GoogleCalendarAPIError } from '../../error/googleCalendar.error';

export type GoogleCalendarErrorFilterRule = {
    /**
     * 에러 필터의 이름입니다. 일반적으로 에러의 code와 동일한 이름을 사용하지만 다른 이름을 사용할 수도 있습니다.
     */
    name: string;
    /**
     * 에러 필터가 적용될 조건을 지정합니다. 만약 2개 이상의 에러 필터가 적용될 수 있는 경우, 가장 먼저 조건을 만족하는 에러 필터가 적용됩니다.
     */
    condition: (response: GaxiosResponse) => boolean;
    callback?: (err: any, context: WorkContext, args: any[]) => Promise<any>;
};

export const baseGoogleCalendarAPIErrorFilterRules: GoogleCalendarErrorFilterRule[] =
    [
        {
            name: 'NO_RESPONSE',
            condition: ({ status }) => status === undefined,
            callback: async (err, context, args) => {
                throw new GoogleCalendarAPIError({
                    code: SyncErrorCode.googleCalendar.api.UNKNOWN_ERROR,
                    user: context.user,
                    err,
                    args,
                });
            },
        },
        {
            name: 'INVALID_REQUEST',
            condition: ({ status }) => status === 400,
            callback: async (err, context, args) => {
                throw new GoogleCalendarAPIError({
                    code: SyncErrorCode.googleCalendar.api.INVALID_REQUEST,
                    user: context.user,
                    err,
                    args,
                });
            },
        },
        {
            name: 'INVALID_CREDENTIALS',
            condition: ({ status }) => status === 401,
            callback: async (err, context, args) => {
                throw new GoogleCalendarAPIError({
                    code: SyncErrorCode.googleCalendar.api.INVALID_CREDENTIALS,
                    user: context.user,
                    err,
                    args,
                });
            },
        },
        {
            name: 'RATE_LIMIT',
            condition: ({ status, data }) =>
                status === 403 &&
                ['User Rate Limit Exceeded', 'Rate Limit Exceeded'].includes(
                    data.message,
                ),
            callback: async (err, context, args) => {
                throw new GoogleCalendarAPIError({
                    code: SyncErrorCode.googleCalendar.api.RATE_LIMIT,
                    user: context.user,
                    err,
                    args,
                });
            },
        },
        {
            name: 'USER_CALENDAR_USAGE_LIMIT',
            condition: ({ data, status }) =>
                status === 403 &&
                [
                    'Calendar usage limits exceeded.',
                    'Calendar usage limits exceeded',
                ].includes(data.message),
            callback: async (err, context, args) => {
                throw new GoogleCalendarAPIError({
                    code: SyncErrorCode.googleCalendar.api
                        .USER_CALENDAR_USAGE_LIMIT,
                    user: context.user,
                    err,
                    args,
                });
            },
        },
        {
            name: 'FORBIDDEN',
            condition: ({ status }) => status === 403,
            callback: async (err, context, args) => {
                throw new GoogleCalendarAPIError({
                    code: SyncErrorCode.googleCalendar.api.FORBIDDEN,
                    user: context.user,
                    err,
                    args,
                });
            },
        },
        {
            name: 'NOT_FOUND',
            condition: ({ status }) => status === 404,
            callback: async (err, context, args) => {
                throw new GoogleCalendarAPIError({
                    code: SyncErrorCode.googleCalendar.api.NOT_FOUND,
                    user: context.user,
                    err,
                    args,
                });
            },
        },
        {
            name: 'ALREADY_DELETED',
            condition: ({ status, data }) =>
                status === 410 && data.message === 'deleted',
        },
        {
            name: 'GONE_UPDATED_MIN_TOO_LONG_AGO',
            condition: ({ status, data }) =>
                status === 410 &&
                data.error.errors[0].reason === 'updatedMinTooLongAgo',
            callback: async (err, context, args) => {
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
            },
        },
        {
            name: 'GONE',
            condition: ({ status }) => status === 410,
            callback: async (err, context, args) => {
                throw new GoogleCalendarAPIError({
                    code: SyncErrorCode.googleCalendar.api.GONE,
                    user: context.user,
                    err,
                    args,
                });
            },
        },
        {
            name: 'RATE_LIMIT',
            condition: ({ status }) => status === 429,
            callback: async (err, context, args) => {
                throw new GoogleCalendarAPIError({
                    code: SyncErrorCode.googleCalendar.api.RATE_LIMIT,
                    user: context.user,
                    err,
                    args,
                });
            },
        },
        {
            name: 'INTERNAL_SERVER_ERROR',
            condition: ({ status }) => status === 500,
            callback: async (err, context, args) => {
                throw new GoogleCalendarAPIError({
                    code: SyncErrorCode.googleCalendar.api
                        .INTERNAL_SERVER_ERROR,
                    user: context.user,
                    err,
                    args,
                });
            },
        },
        {
            name: 'UNKNOWN_ERROR',
            condition: () => true,
            callback: async (err, context, args) => {
                throw new GoogleCalendarAPIError({
                    code: SyncErrorCode.googleCalendar.api.UNKNOWN_ERROR,
                    user: context.user,
                    err,
                    args,
                });
            },
        },
    ];

export type ExtraGoogleCalendarAPIErrorFilterRuleNames = 'IGNORE_NOT_FOUND';

export const extraGoogleCalendarAPIErrorFilterRules: Record<
    ExtraGoogleCalendarAPIErrorFilterRuleNames,
    GoogleCalendarErrorFilterRule
> = {
    IGNORE_NOT_FOUND: {
        name: 'IGNORE_NOT_FOUND',
        condition: ({ status }) => status === 404,
    },
};
