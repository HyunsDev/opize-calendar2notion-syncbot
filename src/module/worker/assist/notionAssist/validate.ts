import { GetDatabaseResponse } from '@notionhq/client/build/src/api-endpoints';

import { DB } from '@/database';
import { contains } from '@/utils';

import { WorkContext } from '../../context/work.context';

import { NotionAssistApi } from './api';
import {
    ADDABLE_REQUIRED_NOTION_PROPS_MAP,
    ADDABLE_REQUIRED_PROPS,
    REQUIRED_NOTION_PROPS_MAP,
    REQUIRED_PROPS,
} from './validate.constant';

export class NotionValidation {
    context: WorkContext;
    api: NotionAssistApi;
    database: GetDatabaseResponse;

    errors: {
        error: string;
        message: string;
    }[] = [];

    constructor(context: WorkContext, api: NotionAssistApi) {
        this.context = context;
        this.api = api;
        this.errors = [];
    }

    async run() {
        const database = await this.api.getDatabase();
        this.database = database;

        await this.validateUserProps();
        await this.validateNotionProps();
        return this.errors;
    }

    private async validateUserProps() {
        const userProps = this.context.user.parsedNotionProps;

        for (const prop of REQUIRED_PROPS) {
            if (!userProps[prop]) {
                if (contains(ADDABLE_REQUIRED_PROPS, prop)) {
                    await this.restoreProp(prop);
                    continue;
                }

                this.errors.push({
                    error: 'prop_not_exist',
                    message: `필수 속성인 ${prop} 이(가) 없습니다`,
                });
            }
        }
    }

    private async validateNotionProps() {
        const userProps = this.context.user.parsedNotionProps;

        for (const userProp in userProps) {
            const prop = Object.values(this.database.properties).find(
                (e) => e.id === userProps[userProp],
            );
            if (!prop) {
                // 해당 prop이 존재 하지 않음
                if (contains(ADDABLE_REQUIRED_PROPS, userProp)) {
                    await this.restoreProp(userProp);
                    continue;
                }

                this.errors.push({
                    error: 'prop_not_found',
                    message: `${userProp}에 해당하는 속성을 찾을 수 없습니다. (아이디: ${userProps[userProp]})`,
                });
                continue;
            }

            if (
                REQUIRED_NOTION_PROPS_MAP[userProp] &&
                prop.type !== REQUIRED_NOTION_PROPS_MAP[userProp]
            ) {
                // 정해진 타입과 일치하지 않음
                this.errors.push({
                    error: 'wrong_prop_type',
                    message: `${userProp} 속성의 유형이 올바르지 않습니다. (기대한 타입: ${REQUIRED_NOTION_PROPS_MAP[userProp]}, 실제 타입: ${prop.type})`,
                });
                continue;
            }
        }
    }

    private async restoreProp(prop: (typeof ADDABLE_REQUIRED_PROPS)[number]) {
        const propType = ADDABLE_REQUIRED_NOTION_PROPS_MAP[prop];

        const newProp = await this.api.addProp(prop, propType);

        const newProps = {
            ...this.context.user.parsedNotionProps,
            [prop]: newProp.id,
        };
        this.context.user.notionProps = JSON.stringify(newProps);
        this.context.user = await DB.user.save(this.context.user);
    }
}
