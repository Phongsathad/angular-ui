import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Interface ปรับให้ตรงกับ Schema ใน Database เป๊ะๆ
export interface Customer {
  customer_id?: number;
  first_name: string;
  last_name: string;
  phone: string;
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
  // พิกัดเริ่มต้น (มมส.ใหม่)
  storeLat = 16.2493037;
  storeLng = 103.2557389;

  // รายชื่อลูกค้าทดสอบ
  customers: Customer[] = [
    { customer_id: 1, first_name: 'สมชาย', last_name: 'สายลุย', phone: '0812345678', lat: 16.2546296, lng: 103.2505615 },
    { customer_id: 2, first_name: 'วิภา', last_name: 'รักดี', phone: '0898765432', lat: 16.2470296, lng: 103.2609615 },
    { customer_id: 3, first_name: 'กิตติ', last_name: 'มั่งมี', phone: '0821112233', lat: 16.2376296, lng: 103.2469615 }
  ];

  newCustomer: Customer = {
    first_name: '',
    last_name: '',
    phone: '',
    lat: this.storeLat,
    lng: this.storeLng
  };

  googleMapsUrlInput: string = '';

  // สกัด Lat, Long จาก Google Maps URL
  extractLatLngFromUrl() {
    if (!this.googleMapsUrlInput) return;

    const match = this.googleMapsUrlInput.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (match && match[1] && match[2]) {
      this.newCustomer.lat = parseFloat(match[1]);
      this.newCustomer.lng = parseFloat(match[2]);
      alert(`ดึงพิกัดสำเร็จ!\nLat: ${this.newCustomer.lat}\nLng: ${this.newCustomer.lng}`);
    } else {
      alert('ไม่พบพิกัดในลิงก์ กรุณาตรวจสอบว่ามี @lat,long ใน URL');
    }
  }

  addCustomer() {
    if (!this.newCustomer.first_name || !this.newCustomer.phone) {
      alert('กรุณากรอกชื่อและเบอร์โทรศัพท์');
      return;
    }

    this.customers.push({
      ...this.newCustomer,
      customer_id: Date.now()
    });

    // Reset Form
    this.newCustomer = {
      first_name: '',
      last_name: '',
      phone: '',
      lat: this.storeLat,
      lng: this.storeLng
    };
    this.googleMapsUrlInput = '';
  }

  deleteCustomer(id?: number) {
    this.customers = this.customers.filter(c => c.customer_id !== id);
  }
}