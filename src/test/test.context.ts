import { CalendarEntity, UserEntity } from '@opize/calendar2notion-object';

import { TestGCalService } from './test.gcal.service';
import { TestNotionService } from './test.notion.service';
import { TestService } from './test.service';

export class TestContext {
    user: UserEntity;

    calendar: CalendarEntity;
    calendar2: CalendarEntity;

    notion: TestNotionService;
    gcal: TestGCalService;
    service: TestService;

    constructor(
        user: UserEntity,
        calendar: CalendarEntity,
        calendar2: CalendarEntity,
    ) {
        this.user = user;
        this.calendar = calendar;
        this.calendar2 = calendar2;

        this.notion = new TestNotionService(this);
        this.gcal = new TestGCalService(this);
        this.service = new TestService(this);
    }
}
