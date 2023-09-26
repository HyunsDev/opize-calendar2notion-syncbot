import { APIResponseError } from '@notionhq/client';

import { WorkContext } from '../../context/work.context';
import { SyncErrorCode } from '../../error';
import { NotionAPIError } from '../../error/notion.error';

export type NotionAPIErrorFilterRule = {
    name: string;
    condition: (
        response: APIResponseError,
        target: 'page' | 'database',
        error: Error,
    ) => boolean;
    callback?: (err: any, context: WorkContext, args: any[]) => Promise<any>;
};

export const baseNotionAPIErrorFilterRules: NotionAPIErrorFilterRule[] = [
    {
        name: 'INVALID_REQUEST',
        condition: (response) => response.status === 400,
        callback: (err, context, args) => {
            throw new NotionAPIError({
                code: SyncErrorCode.notion.api.INVALID_REQUEST,
                user: context.user,
                err,
                args,
            });
        },
    },
    {
        name: 'UNAUTHORIZED',
        condition: (response) => response.status === 401,
        callback: (err, context, args) => {
            throw new NotionAPIError({
                code: SyncErrorCode.notion.api.UNAUTHORIZED,
                user: context.user,
                err,
                args,
            });
        },
    },
    {
        name: 'DATABASE_NOT_FOUND',
        condition: (response, target) =>
            response.status === 404 && target === 'database',
        callback: (err, context, args) => {
            throw new NotionAPIError({
                code: SyncErrorCode.notion.api.DATABASE_NOT_FOUND,
                user: context.user,
                err,
                args,
            });
        },
    },
    {
        name: 'PAGE_NOT_FOUND',
        condition: (response, target) =>
            response.status === 404 && target === 'page',
        callback: (err, context, args) => {
            throw new NotionAPIError({
                code: SyncErrorCode.notion.api.PAGE_NOT_FOUND,
                user: context.user,
                err,
                args,
            });
        },
    },
    {
        name: 'RATE_LIMIT',
        condition: (response) => response.status === 429,
        callback: (err, context, args) => {
            throw new NotionAPIError({
                code: SyncErrorCode.notion.api.RATE_LIMIT,
                user: context.user,
                err,
                args,
            });
        },
    },
    {
        name: 'INTERNAL_SERVER_ERROR',
        condition: (response) => response.status === 500,
        callback: (err, context, args) => {
            throw new NotionAPIError({
                code: SyncErrorCode.notion.api.INTERNAL_SERVER_ERROR,
                user: context.user,
                err,
                args,
            });
        },
    },
    {
        name: 'SERVICE_UNAVAILABLE',
        condition: (response) => response.status === 503,
        callback: (err, context, args) => {
            throw new NotionAPIError({
                code: SyncErrorCode.notion.api.SERVICE_UNAVAILABLE,
                user: context.user,
                err,
                args,
            });
        },
    },
    {
        name: 'UNKNOWN_ERROR',
        condition: () => true,
        callback: (err, context, args) => {
            throw new NotionAPIError({
                code: SyncErrorCode.notion.api.UNKNOWN_ERROR,
                user: context.user,
                err,
                args,
            });
        },
    },
];

export type ExtraNotionAPIErrorFilterRuleNames =
    | 'IGNORE_ALREADY_ARCHIVED_PAGE'
    | 'IGNORE_NOT_FOUND';
export const extraNotionAPIErrorFilterRules: Record<
    ExtraNotionAPIErrorFilterRuleNames,
    NotionAPIErrorFilterRule
> = {
    IGNORE_ALREADY_ARCHIVED_PAGE: {
        name: 'IGNORE_ALREADY_ARCHIVED_PAGE',
        condition: (response, target, err) =>
            err.message ===
            `Can't update a page that is archived. You must unarchive the page before updating.`,
    },
    IGNORE_NOT_FOUND: {
        name: 'IGNORE_NOT_FOUND',
        condition: (response) => response.status === 404,
    },
};
