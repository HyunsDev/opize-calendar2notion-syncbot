import readline from 'readline';

import dayjs from 'dayjs';

import { AppDataSource, DB } from '@/database';
import { Worker } from '@/module/worker';
import { sleep } from '@/utils';

import { WorkerTestService } from './workerTest.service';

const getUser = async (userId: number) => {
    const user = await DB.user.findOne({
        where: {
            id: userId,
        },
        relations: ['notionWorkspace'],
    });
    return user;
};

const getCalendar = async (userId: number) => {
    const calendars = await DB.calendar.findOne({
        where: {
            userId,
        },
    });
    return calendars;
};

export const workerTestCli = async (userId: number) => {
    await AppDataSource.initialize();

    const user = await getUser(userId);
    const calendar = await getCalendar(userId);
    const service = new WorkerTestService(user);
    console.log(`${user.name}유저의 동기화 테스트를 시작합니다.`);
    console.log(
        `테스트 캘린더: ${calendar.googleCalendarName} (${calendar.id})`,
    );

    // Create Notion Event
    console.log('[ Notion 이벤트 생성 테스트 ]');
    const notionPage = await service.createTestNotionPage(
        `${dayjs().format('HH:mm:ss')} N2G 테스트 이벤트`,
        calendar,
    );
    console.log(`테스트 페이지 정보: ${notionPage.id}`);

    // Create Google Calendar Event
    console.log('[ Google Calendar 이벤트 생성 테스트 ]');
    const googleCalendarEvent = await service.createTestGoogleCalendarEvent(
        `${dayjs().format('HH:mm:ss')} G2N 테스트 이벤트`,
        calendar,
    );
    console.log(`테스트 이벤트 정보: ${googleCalendarEvent.data.id}`);

    for (let i = 0; i < 60; i++) {
        process.stdout.write(`1분 대기 (${60 - i})`);
        await sleep(1000);
        readline.cursorTo(process.stdout, 0);
        process.stdout.clearLine(0);
    }

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
