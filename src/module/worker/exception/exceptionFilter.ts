import { DB } from '@/database';
import { workerLogger } from '@/logger/winston';
import { TimeoutError } from '@/utils';

import { WorkContext } from '../context/work.context';

import {
    isSyncError,
    syncErrorFilter,
    unknownErrorFilter,
} from './syncException';

// TODO: #12 최종 예외 처리 로직 업데이트 필요
export const workerExceptionFilter = async (
    func: () => Promise<void>,
    context: WorkContext,
) => {
    try {
        return await func();
    } catch (err) {
        try {
            await DB.user.update(context.user.id, {
                isWork: false,
            });

            if (err instanceof TimeoutError) {
            }

            try {
                context.result.fail = true;

                if (isSyncError(err)) {
                    context.result.failReason = err.code;
                    workerLogger.error(
                        `[${context.workerId}:${context.user.id}] 문제가 발견되어 동기화에 실패하였습니다. (${err.code})`,
                    );
                    await syncErrorFilter(context, err);
                } else {
                    workerLogger.error(
                        `[${context.workerId}:${context.user.id}] 동기화 과정 중 알 수 없는 오류가 발생하여 동기화에 실패하였습니다. \n[알 수 없는 오류 디버그 보고서]\nname: ${err.name}\nmessage: ${err.message}\nstack: ${err.stack}`,
                    );
                    await unknownErrorFilter(context, err);
                }
            } catch (err) {
                workerLogger.error(
                    `[${context.workerId}:${context.user.id}] **에러 필터 실패** 동기화 과정 중 알 수 없는 오류가 발생하여 동기화에 실패하였습니다. \n[알 수 없는 오류 디버그 보고서]\nname: ${err.name}\nmessage: ${err.message}\nstack: ${err.stack}`,
                );
                console.error('처리할 수 없는 에러');
                console.log(err);
            }
        } catch (err) {
            // 최종 예외 처리
            throw err;
        }
    }
};
