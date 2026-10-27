import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RiderTask } from './rider-task';

describe('RiderTask', () => {
  let component: RiderTask;
  let fixture: ComponentFixture<RiderTask>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RiderTask],
    }).compileComponents();

    fixture = TestBed.createComponent(RiderTask);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
