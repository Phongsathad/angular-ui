import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OrderManagement } from './order-management';

describe('OrderManagement', () => {
  let component: OrderManagement;
  let fixture: ComponentFixture<OrderManagement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderManagement],
    }).compileComponents();

    fixture = TestBed.createComponent(OrderManagement);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
