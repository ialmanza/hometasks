import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DailyActivitiesListComponent } from './daily-activities-list.component';

describe('DailyActivitiesListComponent', () => {
  let component: DailyActivitiesListComponent;
  let fixture: ComponentFixture<DailyActivitiesListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DailyActivitiesListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DailyActivitiesListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
