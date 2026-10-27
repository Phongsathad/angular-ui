import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface Customer {
  id?: number;
  name: string;
  phone: string;
  address: string;
  lat: number;
  lng: number;
}

@Component({
  selector: 'app-customer-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customer-management.html',
  styleUrl: './customer-management.css'
})
export class CustomerManagement {
  // พิกัดร้านตัวอย่าง (เช่น แถวสยามสแควร์ Bangkok: 13.7456, 100.5342)
  customers: Customer[] = [
    { id: 1, name: 'สมชาย ใจดี', phone: '081-234-5678', address: 'อาคาร A ชั้น 4', lat: 13.7465, lng: 100.5352 },
    { id: 2, name: 'สมหญิง รักดี', phone: '089-876-5432', address: 'อาคาร B ชั้น 12', lat: 13.7500, lng: 100.5400 },
    { id: 3, name: 'กิตติศักดิ์ มีสุข', phone: '082-111-2222', address: 'ตึก C ชั้น 2', lat: 13.7420, lng: 100.5310 }
  ];

  newCustomer: Customer = { name: '', phone: '', address: '', lat: 13.7456, lng: 100.5342 };

  addCustomer() {
    if (!this.newCustomer.name || !this.newCustomer.phone) return;
    this.customers.push({ ...this.newCustomer, id: Date.now() });
    this.newCustomer = { name: '', phone: '', address: '', lat: 13.7456, lng: 100.5342 };
  }

  deleteCustomer(id?: number) {
    this.customers = this.customers.filter(c => c.id !== id);
  }
}