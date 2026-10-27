import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Customer {
  id: number;
  name: string;
  address: string;
  distanceKm: number;
}

interface Order {
  id: number;
  customerId: number;
  customerName: string;
  address: string;
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
  // จำลองรายการลูกค้าที่มีในระบบ
  customers: Customer[] = [
    { id: 1, name: 'สมชาย ใจดี', address: 'อาคาร A ชั้น 4', distanceKm: 2.5 },
    { id: 2, name: 'สมหญิง รักดี', address: 'อาคาร B ชั้น 12', distanceKm: 4.0 },
    { id: 3, name: 'กิตติศักดิ์ มีสุข', address: 'ตึก C ชั้น 2', distanceKm: 1.8 }
  ];

  orders: Order[] = [
    { id: 101, customerId: 1, customerName: 'สมชาย ใจดี', address: 'อาคาร A ชั้น 4', quantity: 4, deliveryWindow: '11:30 - 12:00', status: 'รอดำเนินการ' },
    { id: 102, customerId: 2, customerName: 'สมหญิง รักดี', address: 'อาคาร B ชั้น 12', quantity: 3, deliveryWindow: '12:00 - 12:30', status: 'รอดำเนินการ' }
  ];

  selectedCustomerId: number | null = null;
  newOrderQuantity = 1;
  newOrderWindow = '11:30 - 12:30';

  addOrder() {
    if (!this.selectedCustomerId) return;
    
    const customer = this.customers.find(c => c.id == this.selectedCustomerId);
    if (!customer) return;

    this.orders.push({
      id: Math.floor(100 + Math.random() * 900),
      customerId: customer.id,
      customerName: customer.name,
      address: customer.address,
      quantity: this.newOrderQuantity,
      deliveryWindow: this.newOrderWindow,
      status: 'รอดำเนินการ'
    });

    // Reset Form
    this.selectedCustomerId = null;
    this.newOrderQuantity = 1;
  }

  deleteOrder(id: number) {
    this.orders = this.orders.filter(o => o.id !== id);
  }
}