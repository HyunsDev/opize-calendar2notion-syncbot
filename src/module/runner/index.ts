import { UserPlan } from '@opize/calendar2notion-object';

import { runnerLogger } from '@/logger/winston';

import { bot } from '../bot';

import { InitUserLoop, Loop, UserLoop } from './loop';
import { RunnerService, runnerService } from './runner.service';

export class Runner {
    runnerService: RunnerService;

    constructor() {
        this.runnerService = runnerService;
    }

    public async run() {
        await this.runnerService.restoreWrongSync();

        const loopPromises = this.getLoopPromises();
        await Promise.allSettled(loopPromises);

        if (bot.syncBot.stop) {
            runnerLogger.info(`[Runner] 모든 루프가 정상적으로 종료되었습니다`);
        } else {
            runnerLogger.error(
                `[Runner] 모든 루프가 종료 신호 없이 종료되었습니다`,
            );
        }
    }

    private getLoopPromises() {
        const loops = this.getLoops();
        const promises: Promise<void>[] = [];
        for (const loop of loops) {
            promises.push(loop.run());
        }
        return promises;
    }

    private getLoops() {
        const workerAmount = Object.entries(bot.syncBot.workerAmount);
        const loops: Loop[] = [];

        for (const [plan, amount] of workerAmount) {
            if (plan === 'init') {
                for (let i = 0; i < amount; i++) {
                    loops.push(
                        new InitUserLoop(
                            `${process.env.SYNCBOT_PREFIX}_w_init_${i}`,
                        ),
                    );
                }
            } else {
                for (let i = 0; i < amount; i++) {
                    loops.push(
                        new UserLoop(
                            `${process.env.SYNCBOT_PREFIX}_w_${plan}_${i}`,
                            plan as UserPlan,
                        ),
                    );
                }
            }
        }
        return loops;
    }
}
