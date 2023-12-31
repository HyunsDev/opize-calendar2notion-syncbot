import { UserPlan } from '@opize/calendar2notion-object';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { IsNull, LessThan } from 'typeorm';

import { DB } from '@/database';

import { bot } from '../bot';

dayjs.extend(utc);
dayjs.extend(timezone);

export class RunnerService {
    async restoreWrongSync() {
        const res = await DB.user.update(
            {
                isWork: true,
                syncbotId: process.env.SYNCBOT_PREFIX,
            },
            {
                isWork: false,
            },
        );

        return {
            affected: res.affected,
        };
    }

    async getTargetUserByPlan(plan: UserPlan) {
        const user = await DB.user.findOne({
            where: {
                isWork: false,
                isConnected: true,
                userPlan: plan,
                lastCalendarSync: LessThan(dayjs().add(-1, 'minute').toDate()),
                workStartedAt: LessThan(dayjs().add(-1, 'minute').toDate()),
            },
            order: {
                lastCalendarSync: {
                    direction: 'asc',
                },
            },
            relations: ['notionWorkspace'],
        });

        if (!user || this.isWorkingUser(user.id)) {
            return;
        }

        return user;
    }

    async getUninitializedUser() {
        const user = await DB.user.findOne({
            where: {
                isWork: false,
                isConnected: true,
                lastCalendarSync: IsNull(),
            },
            order: {},
        });

        if (!user || this.isWorkingUser(user.id)) {
            return;
        }

        return user;
    }

    private isWorkingUser(userId: number) {
        return bot.worker.workers.map((e) => e.nowWorkUserId).includes(userId);
    }
}

export const runnerService = new RunnerService();
