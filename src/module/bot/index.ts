import { ReportContext } from './report.context';
import { SyncBotContext } from './syncbot.context';
import { WorkerContext } from './worker.context';

class BotContext {
    worker: WorkerContext;
    syncBot: SyncBotContext;
    report: ReportContext;

    constructor() {
        this.worker = new WorkerContext();
        this.syncBot = new SyncBotContext();
        this.report = new ReportContext();
    }
}

export const bot = new BotContext();
