import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeTasksComponent } from './home-tasks.component';

describe('HomeTasksComponent', () => {
  let component: HomeTasksComponent;
  let fixture: ComponentFixture<HomeTasksComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeTasksComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomeTasksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
