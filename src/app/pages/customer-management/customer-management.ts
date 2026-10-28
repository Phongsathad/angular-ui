import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomerService, Customer } from '../../services/customer.service';

@Component({
  selector: 'app-customer-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customer-management.html'
})
export class CustomerManagement implements OnInit {
  private customerService = inject(CustomerService);

  // ---------- Data Signals ----------
  customers = signal<Customer[]>([]);
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);

  // ---------- Form เพิ่มลูกค้าใหม่ Signals ----------
  newFirstName = signal<string>('');
  newLastName = signal<string>('');
  newPhone = signal<string>('');
  newLat = signal<number | null>(null);
  newLng = signal<number | null>(null);
  newMapsUrl = signal<string>(''); // สำหรับวางลิงก์ Google Maps
  newAddressNote = signal<string>('');

  // ---------- Modal แก้ไขลูกค้า Signals ----------
  isEditMode = signal<boolean>(false);
  editingCustomer = signal<Customer | null>(null);
  editMapsUrl = signal<string>(''); // สำหรับวางลิงก์ใน Modal แก้ไข

  // ---------- Toast Notification Signals ----------
  toastMessage = signal<string>('');
  toastType = signal<'success' | 'error'>('success');
  private toastTimer: any;

  ngOnInit() {
    this.loadCustomers();
  }

  // โหลดรายการลูกค้าทั้งหมด
  loadCustomers() {
    this.isLoading.set(true);
    this.customerService.getCustomers().subscribe({
      next: (data) => {
        this.customers.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading customers:', err);
        this.isLoading.set(false);
        this.showToast('โหลดข้อมูลลูกค้าไม่สำเร็จ', 'error');
      }
    });
  }

  // ---------- ฟังก์ชันดึงพิกัดจากลิงก์ Google Maps ----------
  extractLatLngFromUrl(url: string): { lat: number; lng: number } | null {
    if (!url) return null;

    // รองรับลิงก์หลายรูปแบบ เช่น @16.1944,103.2536 หรือ ?q=16.1944,103.2536 หรือพิกัด 16.1944,103.2536
    const regexAt = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
    const regexQ = /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/;
    const regexPair = /(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/;

    const match = url.match(regexAt) || url.match(regexQ) || url.match(regexPair);
    if (match && match[1] && match[2]) {
      return {
        lat: parseFloat(match[1]),
        lng: parseFloat(match[2])
      };
    }
    return null;
  }

  // เมื่อวางลิงก์ Google Maps ในฟอร์มเพิ่มลูกค้า
  onAddMapsUrlChange(url: string) {
    this.newMapsUrl.set(url);
    const coords = this.extractLatLngFromUrl(url);
    if (coords) {
      this.newLat.set(coords.lat);
      this.newLng.set(coords.lng);
      this.showToast('📌 ดึงพิกัดจากลิงก์สำเร็จ', 'success');
    }
  }

  // เมื่อวางลิงก์ Google Maps ใน Modal แก้ไข
  onEditMapsUrlChange(url: string) {
    this.editMapsUrl.set(url);
    const coords = this.extractLatLngFromUrl(url);
    const current = this.editingCustomer();
    if (coords && current) {
      this.editingCustomer.set({
        ...current,
        lat: coords.lat,
        lng: coords.lng
      });
      this.showToast('📌 ดึงพิกัดจากลิงก์สำเร็จ', 'success');
    }
  }

  // สร้าง URL ลิงก์ไป Google Maps
  getGoogleMapsLink(lat?: number, lng?: number): string {
    if (lat === undefined || lng === undefined || lat === null || lng === null) {
      return '#';
    }
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }

  // เพิ่มลูกค้าใหม่
  addCustomer() {
    if (!this.newFirstName() || !this.newPhone()) {
      this.showToast('กรุณากรอกชื่อและเบอร์โทรศัพท์ให้ครบถ้วน', 'error');
      return;
    }

    const payload: Customer = {
      first_name: this.newFirstName(),
      last_name: this.newLastName(),
      phone: this.newPhone(),
      lat: this.newLat() ?? 0,
      lng: this.newLng() ?? 0,
      address_note: this.newAddressNote()
    };

    this.isSaving.set(true);
    this.customerService.addCustomer(payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.showToast('เพิ่มข้อมูลลูกค้าใหม่สำเร็จ', 'success');
        this.resetAddForm();
        this.loadCustomers();
      },
      error: (err) => {
        console.error(err);
        this.isSaving.set(false);
        this.showToast('เกิดข้อผิดพลาดในการเพิ่มลูกค้า', 'error');
      }
    });
  }

  resetAddForm() {
    this.newFirstName.set('');
    this.newLastName.set('');
    this.newPhone.set('');
    this.newLat.set(null);
    this.newLng.set(null);
    this.newMapsUrl.set('');
    this.newAddressNote.set('');
  }

  // เปิด Modal แก้ไขลูกค้า
  openEditModal(customer: Customer) {
    this.editingCustomer.set({ ...customer });
    this.editMapsUrl.set(customer.lat && customer.lng ? this.getGoogleMapsLink(customer.lat, customer.lng) : '');
    this.isEditMode.set(true);
  }

  // ปิด Modal แก้ไข
  closeEditModal() {
    this.editingCustomer.set(null);
    this.editMapsUrl.set('');
    this.isEditMode.set(false);
  }

  // บันทึกการแก้ไขข้อมูลลูกค้า
  saveEditCustomer() {
    const cust = this.editingCustomer();
    if (!cust || !cust.customer_id) return;

    if (!cust.first_name || !cust.phone) {
      this.showToast('กรุณากรอกชื่อและเบอร์โทรศัพท์', 'error');
      return;
    }

    this.isSaving.set(true);
    this.customerService.updateCustomer(cust.customer_id, cust).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.showToast('อัปเดตข้อมูลลูกค้าสำเร็จ', 'success');
        this.closeEditModal();
        this.loadCustomers();
      },
      error: (err) => {
        console.error(err);
        this.isSaving.set(false);
        this.showToast('เกิดข้อผิดพลาดในการแก้ไขลูกค้า', 'error');
      }
    });
  }

  // ลบลูกค้า
  deleteCustomer(id: number) {
    if (confirm('คุณต้องการลบข้อมูลลูกค้ารายนี้ใช่หรือไม่?')) {
      this.customerService.deleteCustomer(id).subscribe({
        next: () => {
          this.showToast('ลบข้อมูลลูกค้าเรียบร้อย', 'success');
          this.loadCustomers();
        },
        error: (err) => {
          console.error(err);
          this.showToast('เกิดข้อผิดพลาดในการลบลูกค้า', 'error');
        }
      });
    }
  }

  showToast(msg: string, type: 'success' | 'error') {
    this.toastMessage.set(msg);
    this.toastType.set(type);

    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastMessage.set('');
    }, 3500);
  }
}