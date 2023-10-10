import { env } from '@/env/env';

import packageJson from '@/../package.json';

export class SyncBotContext {
    readonly prefix: string;
    readonly startedAt: Date;
    readonly version: string;
    readonly workerAmount: {
        init: number;
        pro: number;
        free: number;
        sponsor: number;
    };

    timeout: number;
    stop: boolean;

    constructor() {
        this.prefix = env.SYNCBOT_PREFIX;
        this.startedAt = new Date();
        this.version = packageJson.version;
        this.workerAmount = {
            init: 5,
            pro: 10,
            free: 10,
            sponsor: 0,
        };
        this.timeout = 1000 * 60 * 60;
        this.stop = false;
    }
}
