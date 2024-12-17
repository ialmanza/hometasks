import { TestBed } from '@angular/core/testing';

import { PushSubscriptionService } from './push-subscription.service';

describe('PushSubscriptionService', () => {
  let service: PushSubscriptionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PushSubscriptionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
