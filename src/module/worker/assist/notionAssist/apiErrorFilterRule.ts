import { APIResponseError } from '@notionhq/client';

import { WorkContext } from '../../context/work.context';
import { SyncErrorCode } from '../../error';
import { NotionAPIError } from '../../error/notion.error';

export type NotionAPIErrorFilterRule = {
    name: string;
    condition: (
        response: APIResponseError,
        target: 'page' | 'database',
    ) => boolean;
    callback?: (err: any, context: WorkContext, args: any[]) => Promise<any>;
};

export const baseNotionAPIErrorFilterRules: NotionAPIErrorFilterRule[] = [
    {
        name: 'INVALID_REQUEST',
        condition: (err) => err.status === 400,
        callback: async (err, context, args) => {
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
        condition: (err) => err.status === 401,
        callback: async (err, context, args) => {
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
        condition: (err, target) => err.status === 404 && target === 'database',
        callback: async (err, context, args) => {
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
        condition: (err, target) => err.status === 404 && target === 'page',
        callback: async (err, context, args) => {
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
        condition: (err) => err.status === 429,
        callback: async (err, context, args) => {
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
        condition: (err) => err.status === 500,
        callback: async (err, context, args) => {
            throw new NotionAPIError({
                code: SyncErrorCode.notion.api.INTERNAL_SERVER_ERROR,
                user: context.user,
                err,
                args,
            });
        },
    },
    {
        name: 'BAD_GATEWAY',
        condition: (err) => err.status === 502,
        callback: async (err, context, args) => {
            throw new NotionAPIError({
                code: SyncErrorCode.notion.api.BAD_GATEWAY,
                user: context.user,
                err,
                args,
            });
        },
    },
    {
        name: 'SERVICE_UNAVAILABLE',
        condition: (err) => err.status === 503,
        callback: async (err, context, args) => {
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
        callback: async (err, context, args) => {
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
    | 'IGNORE_NOT_FOUND'
    | 'ARCHIVE_DATABASE';

export const extraNotionAPIErrorFilterRules: Record<
    ExtraNotionAPIErrorFilterRuleNames,
    NotionAPIErrorFilterRule
> = {
    IGNORE_ALREADY_ARCHIVED_PAGE: {
        name: 'IGNORE_ALREADY_ARCHIVED_PAGE',
        condition: (err) =>
            err.message ===
            `Can't update a page that is archived. You must unarchive the page before updating.`,
    },
    IGNORE_NOT_FOUND: {
        name: 'IGNORE_NOT_FOUND',
        condition: (err) => err.status === 404,
    },
    ARCHIVE_DATABASE: {
        name: 'ARCHIVE_DATABASE',
        condition: (err) =>
            err.message ===
            `Can't update a page with an archived ancestor. You must unarchive the ancestor before updating.`,
        callback: async (err, context, args) => {
            throw new NotionAPIError({
                code: SyncErrorCode.notion.api.DATABASE_NOT_FOUND,
                user: context.user,
                err,
                args,
            });
        },
    },
};
