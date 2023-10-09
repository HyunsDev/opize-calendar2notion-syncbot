import 'reflect-metadata';
import 'dotenv/config';

import chalk from 'chalk';

import { AppDataSource } from '@/database';
import { Worker } from '@/module/worker';
import { sleep } from '@/utils';

import { TestContext } from './test.context';
import { TestCase } from './testCase/Case';
import { G2NCreateCase } from './testCase/g2nCreate.case';
import { G2NDeleteCase } from './testCase/g2nDelete.case';
import { G2NEditCase } from './testCase/g2nEdit.case';
import { N2GCreateCase } from './testCase/n2gCreate.case';
import { N2GDeleteCase } from './testCase/n2gDelete.case';
import { N2GEditCase } from './testCase/n2gEdit.case';
import { log } from './utils/log';
import { getTestCalendar, getTestUser, sleep1m } from './utils/utils';

const TEST_CASE = [
    N2GCreateCase,
    G2NCreateCase,
    N2GEditCase,
    G2NEditCase,
    N2GDeleteCase,
    G2NDeleteCase,
] as const;

class WorkerTest {
    ctx: TestContext;
    cases: TestCase[];

    constructor() {
        this.cases = [];
    }

    public async run() {
        await this.testInit();
        await this.caseInit();
        await this.caseTest();
        await this.caseCleanUp();
    }

    private async testInit() {
        await AppDataSource.initialize();
        const user = await getTestUser();
        const calendar = await getTestCalendar();
        this.ctx = new TestContext(user, calendar);
        for (const Case of TEST_CASE) {
            this.cases.push(new Case(this.ctx));
        }

        console.log(chalk.bgWhite.black(` TEST `) + ` ${user.name}`);

        console.log(
            `    ${chalk.gray('User ID'.padEnd(12, ' '))} ${this.ctx.user.id}`,
        );
        console.log(
            `    ${chalk.gray('User Name'.padEnd(12, ' '))} ${
                this.ctx.user.name
            }`,
        );
        console.log(
            `    ${chalk.gray('Cal ID'.padEnd(12, ' '))} ${
                this.ctx.calendar.googleCalendarId
            }`,
        );
        console.log(
            `    ${chalk.gray('Cal Name'.padEnd(12, ' '))} ${
                this.ctx.calendar.googleCalendarName
            }`,
        );
        console.log(
            `    ${chalk.gray(
                'Notion'.padEnd(12, ' '),
            )} https://notion.so/${this.ctx.user.notionDatabaseId.replaceAll(
                '-',
                '',
            )}`,
        );
        console.log(
            `    ${chalk.gray('Cases'.padEnd(12, ' '))} ${TEST_CASE.map(
                (a) => a.name,
            ).join(', ')}`,
        );
        console.log(``);
    }

    private async caseInit() {
        log.step('init');

        log.desc('Finished'.padEnd(12, ' '), false);
        for (const Case of this.cases) {
            await Case.init();
            process.stdout.write(`${chalk.white(Case.name)} `);
            await sleep(1000);
        }
        console.log('');

        await this.runWorker('init');
    }

    private async caseTest() {
        log.step('Test');

        log.desc('Finished'.padEnd(12, ' '), false);
        for (const Case of this.cases) {
            await Case.work();
            process.stdout.write(`${chalk.white(Case.name)} `);
            await sleep(1000);
        }
        console.log('');

        const workerResult = await this.runWorker('test');

        log.step('Validate');
        for (const Case of this.cases) {
            await Case.__validate(workerResult);
            await sleep(1000);
        }
    }

    private async caseCleanUp() {
        log.step('CleanUp');

        log.desc('Finished'.padEnd(12, ' '), false);
        for (const Case of this.cases) {
            await Case.cleanUp();
            process.stdout.write(`${chalk.white(Case.name)} `);
            await sleep(1000);
        }
        console.log('');

        await this.runWorker('cleanUp');

        await AppDataSource.destroy();
        process.exit(0);
    }

    private async runWorker(step: string) {
        await sleep1m();
        log.run('run', step);
        const worker = new Worker(this.ctx.user.id, 'test');
        const res = await worker.run();
        log.run('finish', step);
        console.log('');
        return res;
    }
}

const run = async () => {
    const worker = new WorkerTest();
    await worker.run();
};

run();
