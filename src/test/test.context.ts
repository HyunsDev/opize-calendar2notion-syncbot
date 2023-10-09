import { CalendarEntity, UserEntity } from '@opize/calendar2notion-object';

import { TestGCalService } from './test.gcal.service';
import { TestNotionService } from './test.notion.service';
import { TestService } from './test.service';

export class TestContext {
    user: UserEntity;
    calendar: CalendarEntity;

    notion: TestNotionService;
    gcal: TestGCalService;
    service: TestService;

    constructor(user: UserEntity, calendar: CalendarEntity) {
        this.user = user;
        this.calendar = calendar;

        this.notion = new TestNotionService(this);
        this.gcal = new TestGCalService(this);
        this.service = new TestService(this);
    }
}
