import { WorkContext } from '../../context/work.context';
import { SyncErrorCode } from '../../error';
import { NotionAPIError } from '../../error/notion.error';

export async function notionAPIErrorFilter<T>(
    func: () => Promise<T>,
    target: 'database' | 'page',
    context: WorkContext,
    args: any[],
) {
    try {
        return await func();
    } catch (err) {
        const { status } = err;
        const payload = {
            user: context.user,
            err,
            args,
        };

        if (status === 400) {
            throw new NotionAPIError({
                code: SyncErrorCode.notion.api.INVALID_REQUEST,
                ...payload,
            });
        }

        if (status === 401) {
            throw new NotionAPIError({
                code: SyncErrorCode.notion.api.UNAUTHORIZED,
                ...payload,
            });
        }

        if (status === 404) {
            throw new NotionAPIError({
                code:
                    target === 'database'
                        ? SyncErrorCode.notion.api.DATABASE_NOT_FOUND
                        : SyncErrorCode.notion.api.PAGE_NOT_FOUND,
                ...payload,
            });
        }

        if (status === 429) {
            throw new NotionAPIError({
                code: SyncErrorCode.notion.api.RATE_LIMIT,
                ...payload,
            });
        }

        if (status === 500) {
            throw new NotionAPIError({
                code: SyncErrorCode.notion.api.INTERNAL_SERVER_ERROR,
                ...payload,
            });
        }

        if (status === 503) {
            throw new NotionAPIError({
                code: SyncErrorCode.notion.api.SERVICE_UNAVAILABLE,
                ...payload,
            });
        }

        throw new NotionAPIError({
            code: SyncErrorCode.notion.api.UNKNOWN_ERROR,
            ...payload,
        });
    }
}
