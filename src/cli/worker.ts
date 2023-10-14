import { AppDataSource } from '@/database';
import { Worker } from '@/module/worker';

export const workerCli = async (userId: number) => {
    await AppDataSource.initialize();

    const worker = new Worker(userId, 'cli');
    try {
        const res = await worker.run();
        console.log(res);
    } catch (err) {
        console.log('=====[ 작업 실패 ]=====');
        console.error(err);
    }

    await AppDataSource.destroy();
};
