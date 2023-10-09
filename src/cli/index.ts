import 'reflect-metadata';
import 'dotenv/config';

(async () => {
    const CLI_ACTION = ['worker', 'workerTest'];

    const cliAction = process.argv[2];
    const cliArg = process.argv[3];

    if (!CLI_ACTION.includes(cliAction)) {
        console.error(
            `잘못된 액션입니다. ${CLI_ACTION.join(
                ', ',
            )} 중 하나를 선택해주세요`,
        );
    }

    switch (cliAction) {
        case 'worker':
            const { workerCli: syncCli } = await import('./worker');
            await syncCli(parseInt(cliArg));
            process.exit(0);
        case 'workerTest':
            const { workerTestCli: syncTestCli } = await import('./workerTest');
            await syncTestCli(parseInt(cliArg));
            process.exit(0);
    }
})();
