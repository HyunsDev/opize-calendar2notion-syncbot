import { NOTION_API } from '@/constant/notion.constant';
import { retry, sleep } from '@/utils';

import { WorkContext } from '../../context/work.context';

import { notionAPIErrorFilter } from './apiErrorFilter';
import { NotionAPIErrorFilterRule } from './apiErrorFilterRule';

export function NotionAPI(
    targetObject: 'database' | 'page',
    extraFilterRules?: NotionAPIErrorFilterRule[],
) {
    return function (target: any, key: string, desc: PropertyDescriptor) {
        const method = desc.value;
        desc.value = async function (...args: any) {
            const context = this.context as WorkContext;
            const res = await retry(
                async () =>
                    await notionAPIErrorFilter(
                        method.bind(this, args),
                        targetObject,
                        context,
                        args,
                        extraFilterRules,
                    ),
                NOTION_API.MAX_RETRY,
                NOTION_API.RETRY_DELAY,
            );
            await sleep(NOTION_API.INTERVAL);
            return res;
        };
    };
}
