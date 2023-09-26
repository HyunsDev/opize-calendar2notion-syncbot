import { APIResponseError } from '@notionhq/client';

import { WorkContext } from '../../context/work.context';

import {
    NotionAPIErrorFilterRule,
    baseNotionAPIErrorFilterRules,
} from './apiErrorFilterRule';

export async function notionAPIErrorFilter<T>(
    func: () => Promise<T>,
    target: 'database' | 'page',
    context: WorkContext,
    args: any[],
    extraFilterRules: NotionAPIErrorFilterRule[] = [],
): Promise<T> {
    try {
        return await func();
    } catch (err) {
        if (!(err instanceof APIResponseError)) {
            throw err;
        }

        const filterRules: NotionAPIErrorFilterRule[] = [
            ...extraFilterRules,
            ...baseNotionAPIErrorFilterRules,
        ];

        const filterRule = filterRules.find((rule) =>
            rule.condition(err.response, target, err),
        );

        if (filterRule) {
            await filterRule?.callback(err, context, args);
        }
    }
}
