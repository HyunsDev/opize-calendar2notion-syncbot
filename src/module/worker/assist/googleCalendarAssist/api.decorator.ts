import { GOOGLE_CALENDAR_API } from '@/constant/googleCalendar.constant';
import { retry, sleep } from '@/utils';

import { WorkContext } from '../../context/work.context';

import { googleCalendarAPIErrorFilter } from './apiErrorFilter';

export function GoogleCalendarAPI() {
    return function (target: any, key: string, desc: PropertyDescriptor) {
        const method = desc.value;
        desc.value = async function (...args: any) {
            const context = this.context as WorkContext;
            const res = await retry(
                async () =>
                    await googleCalendarAPIErrorFilter(
                        method.bind(this, args),
                        context,
                        args,
                    ),
                GOOGLE_CALENDAR_API.MAX_RETRY,
                GOOGLE_CALENDAR_API.RETRY_DELAY,
            );
            await sleep(GOOGLE_CALENDAR_API.INTERVAL);
            return res;
        };
    };
}
