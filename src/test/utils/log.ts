import chalk from 'chalk';

const stepLog = (step: string) => {
    console.log(`\n${chalk.bgBlackBright(' STEP ')} ${step}`);
};

const runLog = (name: string, message: string) => {
    console.log(`[${chalk.magenta(name)}] ${message}`);
};

const desc = (message: string, newLine = true) => {
    if (newLine) {
        console.log(`    ${chalk.gray(message)}`);
    } else {
        process.stdout.write(`    ${chalk.gray(message)} `);
    }
};

const validate = {
    pass: (name: string, message: string) =>
        console.log(`[${chalk.blue(`validate:pass ✅`)}:${name}] ${message}`),
    fail: (name: string, message: string) =>
        console.log(`[${chalk.red(`validate:fail ❌`)}:${name}] ${message}`),
};

export const log = {
    step: stepLog,
    run: runLog,
    desc,
    validate,
};
