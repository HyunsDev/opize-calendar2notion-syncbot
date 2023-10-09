import { TestGCalService } from '../test.gcal.service';
import { TestNotionService } from '../test.notion.service';
import { TestService } from '../test.service';

export type services = {
    notion: TestNotionService;
    gcal: TestGCalService;
    service: TestService;
};
