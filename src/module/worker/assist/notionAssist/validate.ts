import { GetDatabaseResponse } from '@notionhq/client/build/src/api-endpoints';

import { DB } from '@/database';
import { contains } from '@/utils';

import { WorkContext } from '../../context/work.context';

import { NotionAssistApi } from './api';
import {
    ADDABLE_PROPS_TYPE_MAP,
    ADDABLE_NOTION_PROPS,
    NOTION_PROPS_TYPE_MAP,
    REQUIRED_NOTION_PROPS,
    ADDITIONAL_NOTION_PROPS,
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

        for (const prop of REQUIRED_NOTION_PROPS) {
            if (!userProps[prop]) {
                if (contains(ADDABLE_NOTION_PROPS, prop)) {
                    await this.restoreProp(prop);
                    continue;
                }

                this.errors.push({
                    error: 'prop_not_exist',
                    message: `필수 속성인 ${prop} 이(가) 없습니다`,
                });
            }
        }

        if (this.context.user.isSyncAdditionalProps) {
            for (const prop of ADDITIONAL_NOTION_PROPS) {
                if (!userProps[prop]) {
                    if (contains(ADDABLE_NOTION_PROPS, prop)) {
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
    }

    private async validateNotionProps() {
        const userProps = this.context.user.parsedNotionProps;

        for (const userProp in userProps) {
            const prop = Object.values(this.database.properties).find(
                (e) => e.id === userProps[userProp],
            );
            if (!prop) {
                if (
                    contains(ADDITIONAL_NOTION_PROPS, userProp) &&
                    !this.context.user.isSyncAdditionalProps
                ) {
                    continue;
                }

                // 해당 prop이 존재 하지 않음
                if (contains(ADDABLE_NOTION_PROPS, userProp)) {
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
                NOTION_PROPS_TYPE_MAP[userProp] &&
                prop.type !== NOTION_PROPS_TYPE_MAP[userProp]
            ) {
                // 정해진 타입과 일치하지 않음
                this.errors.push({
                    error: 'wrong_prop_type',
                    message: `${userProp} 속성의 유형이 올바르지 않습니다. (기대한 타입: ${NOTION_PROPS_TYPE_MAP[userProp]}, 실제 타입: ${prop.type})`,
                });
                continue;
            }
        }
    }

    private async restoreProp(prop: (typeof ADDABLE_NOTION_PROPS)[number]) {
        const propType = ADDABLE_PROPS_TYPE_MAP[prop];

        const newProp = await this.api.addProp(prop, propType);

        const newProps = {
            ...this.context.user.parsedNotionProps,
            [prop]: newProp.id,
        };
        this.context.user.notionProps = JSON.stringify(newProps);

        await DB.user.update(
            {
                id: this.context.user.id,
            },
            {
                notionProps: JSON.stringify(newProps),
            },
        );
    }
}
