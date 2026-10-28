import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService, Order } from '../../services/order.service';
import { CustomerService, Customer } from '../../services/customer.service';

@Component({
  selector: 'app-order-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './order-management.html',
  styleUrl: './order-management.css'
})
export class OrderManagement implements OnInit {
  private orderService = inject(OrderService);
  private customerService = inject(CustomerService);

  orders: Order[] = [];
  customers: Customer[] = [];

  newOrder = {
    customer_id: 0,
    box_count: 1
  };

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loadOrders();
    this.loadCustomers();
  }

  loadOrders() {
    this.orderService.getOrders().subscribe({
      next: (data) => this.orders = data,
      error: (err) => console.error('Error fetching orders:', err)
    });
  }

  loadCustomers() {
    this.customerService.getCustomers().subscribe({
      next: (data) => {
        this.customers = data;
        if (this.customers.length > 0 && !this.newOrder.customer_id) {
          this.newOrder.customer_id = this.customers[0].customer_id || 0;
        }
      },
      error: (err) => console.error('Error fetching customers:', err)
    });
  }

  addOrder() {
    if (!this.newOrder.customer_id || this.newOrder.box_count <= 0) {
      alert('กรุณาเลือกลูกค้าและระบุจำนวนกล่องให้ถูกต้อง');
      return;
    }

    this.orderService.addOrder(this.newOrder).subscribe({
      next: () => {
        alert('เพิ่มออเดอร์เรียบร้อยแล้ว');
        this.loadOrders();
        this.newOrder.box_count = 1;
      },
      error: (err) => alert('เกิดข้อผิดพลาด: ' + (err.error?.error || err.message))
    });
  }

  simulateOrders() {
    this.orderService.simulateOrders().subscribe({
      next: (res) => {
        alert(res.message);
        this.loadOrders();
      },
      error: (err) => alert('เกิดข้อผิดพลาดในการจำลองออเดอร์: ' + (err.error?.error || err.message))
    });
  }

  updateBoxCount(order: Order) {
    const newCount = prompt('ระบุจำนวนกล่องใหม่:', order.box_count.toString());
    if (newCount !== null && !isNaN(+newCount) && +newCount > 0) {
      this.orderService.updateOrder(order.order_id!, +newCount).subscribe({
        next: () => this.loadOrders(),
        error: (err) => alert('เกิดข้อผิดพลาดในการแก้ไข')
      });
    }
  }

  deleteOrder(id?: number) {
    if (!id || !confirm('ยืนยันการลบออเดอร์นี้?')) return;
    this.orderService.deleteOrder(id).subscribe({
      next: () => this.loadOrders(),
      error: (err) => alert('เกิดข้อผิดพลาดในการลบออเดอร์')
    });
  }

  clearAllOrders() {
    if (!confirm('คำเตือน: ยืนยันการล้างออเดอร์ทั้งหมดในระบบ?')) return;
    this.orderService.deleteAllOrders().subscribe({
      next: (res) => {
        alert(res.message);
        this.loadOrders();
      },
      error: (err) => alert('เกิดข้อผิดพลาดในการล้างออเดอร์')
    });
  }

  getCustomerName(customerId: number): string {
    const c = this.customers.find(item => item.customer_id === customerId);
    return c ? `${c.first_name} ${c.last_name}` : `ลูกค้า ID #${customerId}`;
  }
}