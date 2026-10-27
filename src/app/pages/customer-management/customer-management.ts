import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Customer {
  id?: number;
  name: string;
  phone: string;
  address: string;
  distanceKm: number;
}

@Component({
  selector: 'app-customer-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customer-management.html',
  styleUrl: './customer-management.css'
})
export class CustomerManagement {
  customers: Customer[] = [
    { id: 1, name: 'สมชาย ใจดี', phone: '081-234-5678', address: 'อาคาร A ชั้น 4', distanceKm: 2.5 },
    { id: 2, name: 'สมหญิง รักดี', phone: '089-876-5432', address: 'อาคาร B ชั้น 12', distanceKm: 4.0 },
    { id: 3, name: 'กิตติศักดิ์ มีสุข', phone: '082-111-2222', address: 'ตึก C ชั้น 2', distanceKm: 1.8 }
  ];

  newCustomer: Customer = { name: '', phone: '', address: '', distanceKm: 1 };

  addCustomer() {
    if (!this.newCustomer.name || !this.newCustomer.phone) return;
    this.customers.push({ ...this.newCustomer, id: Date.now() });
    this.newCustomer = { name: '', phone: '', address: '', distanceKm: 1 };
  }

  deleteCustomer(id?: number) {
    this.customers = this.customers.filter(c => c.id !== id);
  }
}