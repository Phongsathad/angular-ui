import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomerService, Customer } from '../../services/customer.service';

@Component({
  selector: 'app-customer-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customer-management.html',
  styleUrl: './customer-management.css'
})
export class CustomerManagement implements OnInit {
  private customerService = inject(CustomerService);

  storeLat = 16.2493037;
  storeLng = 103.2557389;

  customers: Customer[] = [];

  newCustomer: Customer = {
    first_name: '',
    last_name: '',
    phone: '',
    lat: this.storeLat,
    lng: this.storeLng
  };

  googleMapsUrlInput: string = '';

  ngOnInit() {
    this.loadCustomers();
  }

  // โหลดข้อมูลจาก MySQL ผ่าน API
  loadCustomers() {
    this.customerService.getCustomers().subscribe({
      next: (data) => this.customers = data,
      error: (err) => console.error('Error fetching customers:', err)
    });
  }

  // ดึง Lat, Long จาก Google Maps URL
  extractLatLngFromUrl() {
    if (!this.googleMapsUrlInput) return;
    const match = this.googleMapsUrlInput.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (match && match[1] && match[2]) {
      this.newCustomer.lat = parseFloat(match[1]);
      this.newCustomer.lng = parseFloat(match[2]);
      alert(`ดึงพิกัดสำเร็จ!\nLat: ${this.newCustomer.lat}\nLng: ${this.newCustomer.lng}`);
    } else {
      alert('ไม่พบพิกัดในลิงก์ Google Maps');
    }
  }

  // ส่งข้อมูลไปบันทึกลง Database จริงผ่าน POST API
  addCustomer() {
    if (!this.newCustomer.first_name || !this.newCustomer.phone) {
      alert('กรุณากรอกชื่อและเบอร์โทรศัพท์');
      return;
    }

    this.customerService.addCustomer(this.newCustomer).subscribe({
      next: () => {
        alert('บันทึกลูกค้าเรียบร้อยแล้ว!');
        this.loadCustomers(); // โหลดข้อมูลใหม่จาก DB
        this.newCustomer = { first_name: '', last_name: '', phone: '', lat: this.storeLat, lng: this.storeLng };
        this.googleMapsUrlInput = '';
      },
      error: (err) => alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + err.message)
    });
  }

  // ลบข้อมูลจริงผ่าน DELETE API
  deleteCustomer(id?: number) {
    if (!id || !confirm('ยืนยันการลบลูกค้ารายนี้?')) return;
    
    this.customerService.deleteCustomer(id).subscribe({
      next: () => this.loadCustomers(),
      error: (err) => alert('เกิดข้อผิดพลาดในการลบข้อมูล')
    });
  }
}