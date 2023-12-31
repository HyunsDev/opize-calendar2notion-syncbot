import { UserEntity, UserPlan } from '@opize/calendar2notion-object';
import axios from 'axios';

import { runnerLogger } from '@/logger/winston';
import { sleep } from '@/utils';

import { bot } from '../bot';
import { Worker } from '../worker';
import { WorkerResult } from '../worker/types/result';

import { RunnerService, runnerService } from './runner.service';

export abstract class Loop {
    loopId: string;
    type: 'init' | 'user';
    runnerService: RunnerService;

    constructor(loopId: string) {
        this.loopId = loopId;
        this.runnerService = runnerService;
    }

    abstract run(): Promise<void>;

    protected getStopSignal() {
        return bot.syncBot.stop;
    }

    protected async runWorker(user: UserEntity) {
        const contextWorker = bot.worker.workers.find(
            (worker) => worker.loopId === this.loopId,
        );
        contextWorker.nowWorkUserId = user.id;
        contextWorker.startedAt = new Date().toISOString();

        const worker = new Worker(user.id, this.loopId);
        runnerLogger.info(`[${this.loopId}:${user.id}:loop] 동기화 시작`);
        const res = await worker.run();

        if (!res.fail) {
            runnerLogger.info(
                `[${this.loopId}:${user.id}:loop] 동기화 성공 (${res.simpleResponse})`,
            );
            bot.report.successfulSyncCount += 1;
        } else {
            runnerLogger.error(
                `[${this.loopId}:${user.id}:loop] 동기화 실패 (${
                    res.failReason || 'No Response'
                })`,
            );
            bot.report.failedSyncCount += 1;
        }
        contextWorker.completedSyncCount += 1;
        contextWorker.nowWorkUserId = null;
        contextWorker.startedAt = null;

        await this.pushLoopResult(user.id, res);
        return res;
    }

    private async pushLoopResult(userId: number, res: WorkerResult) {
        try {
            await axios.post(
                `${process.env.SYNCBOT_BACKEND}/syncbot/stream/message`,
                {
                    prefix: process.env.SYNCBOT_PREFIX,
                    data: {
                        prefix: process.env.SYNCBOT_PREFIX,
                        workerId: this.loopId,
                        userId: userId,
                        result: res,
                        finishedAt: new Date().toISOString(),
                    },
                },
                {
                    headers: {
                        authorization: `Bearer ${process.env.SYNCBOT_CONTROL_SECRET}`,
                    },
                },
            );
        } catch (err) {
            if (err.response) {
                runnerLogger.warn(
                    `[${this.loopId}:${userId}:loop] API 서버가 오류를 반환함 ${err.response?.status}`,
                );
            } else {
                runnerLogger.warn(
                    `[${this.loopId}:${userId}:loop] API 서버에 연결할 수 없음`,
                );
            }
        }
    }
}

export class InitUserLoop extends Loop {
    type = 'init' as const;

    constructor(loopId: string) {
        super(loopId);
        bot.worker.workers.push({
            loopId: loopId,
            completedSyncCount: 0,
            nowWorkUserId: null,
            startedAt: null,
        });
    }

    async run() {
        while (true) {
            const stopSignal = this.getStopSignal();
            if (stopSignal) {
                break;
            }

            const user = await this.runnerService.getUninitializedUser();
            if (!user) {
                await sleep(1000 * 5);
                continue;
            }
            await this.runWorker(user);
            bot.report.initCount += 1;
        }
    }
}

export class UserLoop extends Loop {
    type = 'user' as const;
    plan: UserPlan;

    constructor(loopId: string, plan: UserPlan) {
        super(loopId);
        this.plan = plan;
        bot.worker.workers.push({
            loopId: loopId,
            completedSyncCount: 0,
            nowWorkUserId: null,
            startedAt: null,
        });
    }

    async run() {
        while (true) {
            const stopSignal = this.getStopSignal();
            if (stopSignal) {
                break;
            }

            const user = await this.runnerService.getTargetUserByPlan(
                this.plan,
            );

            if (!user) {
                await sleep(1000 * 5);
                continue;
            }
            await this.runWorker(user);
            bot.report.syncCount += 1;
        }
    }
}
