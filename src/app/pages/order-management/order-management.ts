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

  // ---------- Signals ----------
  orders = signal<Order[]>([]);
  customers = signal<Customer[]>([]);

  selectedCustomerId = signal<number | null>(null);
  newOrderQuantity = signal<number>(1);

  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);

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

  // ---------- Helpers แสดงสถานะ ----------
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

  // ---------- Actions ----------

  // 1. สร้างออเดอร์เดี่ยว
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

    this.isSaving.set(true);
    this.orderService.addOrder({ customer_id: Number(custId), box_count: Number(qty) }).subscribe({
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

  // 2. สุ่มออเดอร์ 1 รายการฝั่ง Client
  randomSingleOrder() {
    const custList = this.customers();
    if (custList.length === 0) {
      this.showToast('ไม่พบข้อมูลลูกค้าในระบบ', 'error');
      return;
    }

    const randomCust = custList[Math.floor(Math.random() * custList.length)];
    const randomQty = Math.floor(Math.random() * 3) + 1;

    this.isSaving.set(true);
    this.orderService.addOrder({ customer_id: Number(randomCust.customer_id), box_count: randomQty }).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.showToast(`🎲 สุ่มออเดอร์สำเร็จ: คุณ${randomCust.first_name} (${randomQty} กล่อง)`, 'success');
        this.loadOrders();
      },
      error: (err) => {
        console.error(err);
        this.isSaving.set(false);
        this.showToast('สุ่มออเดอร์ไม่สำเร็จ', 'error');
      }
    });
  }

  // 3. จำลองสุ่มออเดอร์ชุดใหญ่ 20-30 รายการผ่าน API Backend (/orders/simulate)
  simulateBulkOrders() {
    this.isSaving.set(true);
    this.orderService.simulateOrders().subscribe({
      next: (res) => {
        this.isSaving.set(false);
        this.showToast(`⚡ ${res.message || 'จำลองออเดอร์เรียบร้อยแล้ว'}`, 'success');
        this.loadOrders();
      },
      error: (err) => {
        console.error(err);
        this.isSaving.set(false);
        this.showToast('เกิดข้อผิดพลาดในการจำลองออเดอร์', 'error');
      }
    });
  }

  // 4. ลบออเดอร์เดียว
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

  // 5. ล้างออเดอร์ทั้งหมด
  clearAllOrders() {
    if (confirm('⚠️ คุณแน่ใจหรือไม่ว่าต้องการล้างออเดอร์ทั้งหมดในระบบ?')) {
      this.orderService.clearAllOrders().subscribe({
        next: (res) => {
          this.showToast(res.message || 'ล้างออเดอร์ทั้งหมดเรียบร้อยแล้ว', 'success');
          this.loadOrders();
        },
        error: (err) => {
          console.error(err);
          this.showToast('เกิดข้อผิดพลาดในการล้างออเดอร์', 'error');
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