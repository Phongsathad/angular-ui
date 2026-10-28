import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Order {
  id?: number;
  customerName: string;
  quantity: number;
  deliveryWindow: string;
  status: string;
}

@Component({
  selector: 'app-order-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './order-management.html',
  styleUrl: './order-management.css'
})
export class OrderManagement {
  orders: Order[] = [
    { id: 101, customerName: 'สมชาย ใจดี', quantity: 4, deliveryWindow: '11:30 - 12:00', status: 'รอดำเนินการ' },
    { id: 102, customerName: 'สมหญิง รักดี', quantity: 3, deliveryWindow: '12:00 - 12:30', status: 'รอดำเนินการ' },
    { id: 103, customerName: 'กิตติศักดิ์ มีสุข', quantity: 2, deliveryWindow: '11:30 - 12:30', status: 'รอดำเนินการ' }
  ];

  newOrder: Order = { customerName: '', quantity: 1, deliveryWindow: '11:30 - 12:30', status: 'รอดำเนินการ' };

  addOrder() {
    if (!this.newOrder.customerName || this.newOrder.quantity < 1) return;
    this.orders.push({ ...this.newOrder, id: Math.floor(100 + Math.random() * 900) });
    this.newOrder = { customerName: '', quantity: 1, deliveryWindow: '11:30 - 12:30', status: 'รอดำเนินการ' };
  }

  deleteOrder(id?: number) {
    this.orders = this.orders.filter(o => o.id !== id);
  }
} //ldfa,lda