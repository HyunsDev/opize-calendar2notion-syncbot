/**
 * 테스트 케이스 실행 순서
 *
 * init()
 * 동기화 실행
 * work()
 * 동기화 실행
 * validate()
 * cleanUp()
 * 동기화 실행
 */

import chalk from 'chalk';

import { WorkerResult } from '@/module/worker/types/result';

import { TestContext } from '../test.context';

export enum EXPECTED_RULE {
    NOT_NULL = 'NOT_NULL',
    NULL = 'NULL',
}

const isExpectedRule = (value: any): value is EXPECTED_RULE => {
    return Object.values(EXPECTED_RULE).includes(value);
};

export abstract class TestCase {
    abstract name: string;

    protected ctx: TestContext;
    protected result: {
        pass: boolean;
        message: string;
    }[];

    constructor(ctx: TestContext) {
        this.ctx = ctx;
    }

    log(message: string) {
        console.log(`${chalk.gray(`[${this.name}]`)} ${message}`);
    }

    /**
     * 테스트를 진행하기 전 초기화 작업입니다. init()이 실행된 후 동기화가 한 번 진행됩니다.
     */
    abstract init(): Promise<void>;

    /**
     * 테스트를 진행하기 위한 동기화 작업입니다. work()이 실행된 후 동기화가 한 번 진행됩니다.
     */
    abstract work(): Promise<void>;

    /**
     * 테스트를 진행한 후 정합성 검사를 진행합니다.
     */
    abstract validate(result: WorkerResult): Promise<void>;

    async __validate(result: WorkerResult) {
        console.log('');
        this.result = [];
        await this.validate(result);

        if (this.result.every((e) => e.pass)) {
            console.log(`    ${chalk.bgGreen(' PASS ')} ${this.name}`);
        } else {
            console.log(`    ${chalk.bgRed(' FAIL ')} ${this.name}`);
            this.result.forEach((result) => {
                console.log(
                    `        ${result.pass ? '✅' : '❌'} ${chalk.gray(
                        result.message,
                    )}`,
                );
            });
        }

        console.log('');
    }

    protected expect<T>(value: T, expected: T | EXPECTED_RULE) {
        if (isExpectedRule(expected)) {
            switch (expected) {
                case EXPECTED_RULE.NOT_NULL:
                    if (!value) {
                        this.result.push({
                            pass: false,
                            message: `Expected ${chalk.white(
                                'not null',
                            )} but got ${chalk.white(value)}.`,
                        });
                    } else {
                        this.result.push({
                            pass: true,
                            message: `Expected ${chalk.white(
                                'not null',
                            )} and got ${chalk.white(value)}.`,
                        });
                    }
                    break;

                case EXPECTED_RULE.NULL:
                    if (value) {
                        this.result.push({
                            pass: false,
                            message: `Expected ${chalk.white(
                                'null',
                            )} but got ${chalk.white(value)}.`,
                        });
                    } else {
                        this.result.push({
                            pass: true,
                            message: `Expected ${chalk.white(
                                'null',
                            )} and got ${chalk.white(value)}.`,
                        });
                    }
                    break;
            }
        } else {
            if (value !== expected) {
                this.result.push({
                    pass: false,
                    message: `Expected ${chalk.white(
                        expected,
                    )} but got ${chalk.white(value)} instead.`,
                });
            } else {
                this.result.push({
                    pass: true,
                    message: `Expected ${chalk.white(
                        expected,
                    )} and got ${chalk.white(value)}.`,
                });
            }
        }
    }

    /**
     * 테스트를 진행한 후 정리 작업을 진행합니다. cleanUp()이 실행된 후 동기화가 한 번 진행됩니다.
     */
    abstract cleanUp(): Promise<void>;
}
