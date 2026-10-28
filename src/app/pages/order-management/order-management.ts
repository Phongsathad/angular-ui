import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService, Order } from '../../services/order.service';
import { CustomerService, Customer } from '../../services/customer.service';

@Component({
  selector: 'app-order-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './order-management.html'
})
export class OrderManagement implements OnInit {
  private orderService = inject(OrderService);
  private customerService = inject(CustomerService);

  // ---------- Data Signals ----------
  orders = signal<Order[]>([]);
  customers = signal<Customer[]>([]);

  // ---------- Form State Signals ----------
  selectedCustomerId = signal<number | null>(null);
  newOrderQuantity = signal<number>(1);

  // ---------- UI State Signals ----------
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);

  // ---------- Toast Signals ----------
  toastMessage = signal<string>('');
  toastType = signal<'success' | 'error'>('success');
  private toastTimer: any;

  ngOnInit() {
    this.loadInitialData();
  }

  loadInitialData() {
    this.isLoading.set(true);
    this.customerService.getCustomers().subscribe({
      next: (custData) => {
        this.customers.set(custData);
        this.loadOrders();
      },
      error: (err) => {
        console.error('Error loading customers:', err);
        this.isLoading.set(false);
        this.showToast('โหลดข้อมูลลูกค้าไม่สำเร็จ', 'error');
      }
    });
  }

  loadOrders() {
    this.orderService.getOrders().subscribe({
      next: (orderData) => {
        this.orders.set(orderData);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading orders:', err);
        this.isLoading.set(false);
        this.showToast('โหลดข้อมูลออเดอร์ไม่สำเร็จ', 'error');
      }
    });
  }

  getCustomerName(customerId: number): string {
    const customer = this.customers().find(c => c.customer_id === customerId);
    return customer ? `${customer.first_name} ${customer.last_name}` : `ลูกค้า ID #${customerId}`;
  }

  // ---------- Helper แสดงสถานะ ----------
  getStatusLabel(status?: string): string {
    const s = status?.toLowerCase().trim();
    switch (s) {
      case 'completed':
      case 'delivered':
        return 'จัดส่งเสร็จแล้ว';
      case 'cancelled':
        return 'ยกเลิกออเดอร์';
      case 'pending':
      case 'assigned':
      default:
        return 'กำลังดำเนินการ';
    }
  }

  getStatusClass(status?: string): string {
    const s = status?.toLowerCase().trim();
    switch (s) {
      case 'completed':
      case 'delivered':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
      case 'assigned':
      default:
        return 'bg-amber-100 text-amber-800 border-amber-200';
    }
  }

  // ---------- Action ----------
  addOrder() {
    const custId = this.selectedCustomerId();
    const qty = this.newOrderQuantity();

    if (!custId) {
      this.showToast('กรุณาเลือกลูกค้า', 'error');
      return;
    }

    if (qty < 1 || qty > 3) {
      this.showToast('จำนวนกล่องต้องอยู่ระหว่าง 1 - 3 กล่อง', 'error');
      return;
    }

    const payload: Order = {
      customer_id: Number(custId),
      box_count: Number(qty),
      deadline: '12:30:00', // ล็อกเป็น 12:30:00 ตามกฎร้าน
      status: 'pending',
      app_created: 1
    };

    this.isSaving.set(true);
    this.orderService.addOrder(payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.showToast('สร้างออเดอร์เรียบร้อย', 'success');
        this.resetForm();
        this.loadOrders();
      },
      error: (err) => {
        console.error(err);
        this.isSaving.set(false);
        this.showToast('เกิดข้อผิดพลาดในการสร้างออเดอร์', 'error');
      }
    });
  }

  deleteOrder(orderId: number) {
    if (confirm('คุณต้องการยกเลิกออเดอร์นี้ใช่หรือไม่?')) {
      this.orderService.deleteOrder(orderId).subscribe({
        next: () => {
          this.showToast('ยกเลิกออเดอร์เรียบร้อย', 'success');
          this.loadOrders();
        },
        error: (err) => {
          console.error(err);
          this.showToast('เกิดข้อผิดพลาดในการยกเลิกออเดอร์', 'error');
        }
      });
    }
  }

  resetForm() {
    this.selectedCustomerId.set(null);
    this.newOrderQuantity.set(1);
  }

  showToast(message: string, type: 'success' | 'error') {
    this.toastMessage.set(message);
    this.toastType.set(type);

    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastMessage.set('');
    }, 3500);
  }
}