import { TestBed } from '@angular/core/testing';

import { WeeklyScheduleService } from './weekly-schedule.service';

describe('WeeklyScheduleService', () => {
  let service: WeeklyScheduleService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WeeklyScheduleService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
