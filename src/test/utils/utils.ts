import chalk from 'chalk';
import * as cliProgress from 'cli-progress';

import { DB } from '@/database';
import { sleep } from '@/utils';

export const getTestUser = async () => {
    const userId = +process.env.TEST_USER_ID;
    const user = await DB.user.findOne({
        where: {
            id: userId,
        },
        relations: ['notionWorkspace'],
    });
    return user;
};

export const getTestCalendar = async () => {
    const userId = +process.env.TEST_USER_ID;
    const calendars = await DB.calendar.findOne({
        where: {
            userId,
        },
    });
    return calendars;
};

export const sleep1m = async () => {
    const bar1 = new cliProgress.SingleBar(
        {
            format: `    ${chalk.gray(
                `Wait 1m`.padEnd(12, ' '),
            )} {bar} {value}s/{total}s`,
        },
        cliProgress.Presets.shades_classic,
    );

    bar1.start(60, 0);
    for (let i = 0; i < 60; i++) {
        bar1.update(i + 1);
        await sleep(1000);
    }
    bar1.stop();
    console.log('');
};
