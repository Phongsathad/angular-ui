import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomerService, Customer } from '../../services/customer.service';

@Component({
  selector: 'app-customer-management',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe],
  templateUrl: './customer-management.html'
})
export class CustomerManagement implements OnInit {
  private customerService = inject(CustomerService);

  // ---------- Data ----------
  customers = signal<Customer[]>([]);
  currentCustomer = signal<Customer>(this.emptyCustomer());
  googleMapsUrl = signal('');
  searchText: string = '';

  // ---------- State ----------
  editingId = signal<number | null>(null);
  deleteTarget = signal<Customer | null>(null);
  isLoading = signal(false);
  isSaving = signal(false);
  formError = signal('');

  // ---------- Toast ----------
  toastMessage = signal('');
  toastType = signal<'success' | 'error'>('success');
  private toastTimer: any;

  ngOnInit() {
    this.loadCustomers();
  }

  emptyCustomer(): Customer {
    return {
      first_name: '',
      last_name: '',
      phone: '',
      lat: 0,
      lng: 0
    };
  }

  // ---------- Load ----------
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

  // ---------- Search Filter ----------
  get filteredCustomers(): Customer[] {
    const keyword = this.searchText.trim().toLowerCase();
    const all = this.customers();
    if (!keyword) {
      return all;
    }

    const result: Customer[] = [];
    for (let i = 0; i < all.length; i++) {
      const c = all[i];
      const text = (c.first_name + ' ' + c.last_name + ' ' + (c.phone || '')).toLowerCase();
      if (text.includes(keyword)) {
        result.push(c);
      }
    }
    return result;
  }

  // ---------- Helpers ----------
  get isEditMode(): boolean {
    return this.editingId() !== null;
  }

  get hasCoordinates(): boolean {
    const c = this.currentCustomer();
    return Number(c.lat) !== 0 || Number(c.lng) !== 0;
  }

  hasLocation(c: Customer): boolean {
    return Number(c.lat) !== 0 || Number(c.lng) !== 0;
  }

  mapsLink(lat: number, lng: number): string {
    return 'https://www.google.com/maps?q=' + lat + ',' + lng;
  }

  startEdit(c: Customer) {
    this.editingId.set(c.customer_id ?? null);
    this.currentCustomer.set({
      customer_id: c.customer_id,
      first_name: c.first_name,
      last_name: c.last_name,
      phone: c.phone || '',
      lat: Number(c.lat),
      lng: Number(c.lng)
    });
    this.googleMapsUrl.set('');
    this.formError.set('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  resetForm() {
    this.editingId.set(null);
    this.googleMapsUrl.set('');
    this.formError.set('');
    this.currentCustomer.set(this.emptyCustomer());
  }

  // ---------- Google Maps Extract ----------
  extractLatLngFromUrl() {
    const url = this.googleMapsUrl().trim();
    if (!url) {
      this.showToast('กรุณาวางลิงก์ Google Maps ก่อน', 'error');
      return;
    }

    const placeMatch = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    const queryMatch = url.match(/[?&](?:q|query|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/);

    const found = placeMatch || atMatch || queryMatch;

    if (found) {
      const lat = parseFloat(found[1]);
      const lng = parseFloat(found[2]);
      this.currentCustomer.update((c) => ({ ...c, lat: lat, lng: lng }));
      this.showToast('ดึงพิกัดสำเร็จ', 'success');
    } else {
      this.showToast('ไม่พบพิกัดในลิงก์นี้ ลองพิมพ์ lat/lng เอง', 'error');
    }
  }

  // ---------- Validate ----------
  validateForm(): string {
    const c = this.currentCustomer();
    if (!c.first_name.trim() || !c.last_name.trim()) {
      return 'กรุณากรอกชื่อและนามสกุล';
    }
    return '';
  }

  // ---------- Save (Add / Update) ----------
  saveCustomer() {
    const error = this.validateForm();
    this.formError.set(error);
    if (error) {
      return;
    }

    const c = this.currentCustomer();
    const payload: Customer = {
      first_name: c.first_name.trim(),
      last_name: c.last_name.trim(),
      phone: c.phone ? c.phone.trim() : '',
      lat: Number(c.lat),
      lng: Number(c.lng)
    };

    this.isSaving.set(true);
    const id = this.editingId();

    if (id !== null) {
      this.customerService.updateCustomer(id, payload).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.showToast('แก้ไขข้อมูลลูกค้าเรียบร้อย', 'success');
          this.loadCustomers();
          this.resetForm();
        },
        error: () => {
          this.isSaving.set(false);
          this.showToast('แก้ไขไม่สำเร็จ', 'error');
        }
      });
    } else {
      this.customerService.addCustomer(payload).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.showToast('เพิ่มลูกค้าใหม่เรียบร้อย', 'success');
          this.loadCustomers();
          this.resetForm();
        },
        error: () => {
          this.isSaving.set(false);
          this.showToast('เกิดข้อผิดพลาดในการเพิ่มลูกค้า', 'error');
        }
      });
    }
  }

  // ---------- Delete Modal Handlers ----------
  askDelete(c: Customer) {
    this.deleteTarget.set(c);
  }

  cancelDelete() {
    this.deleteTarget.set(null);
  }

  confirmDelete() {
    const target = this.deleteTarget();
    if (!target || target.customer_id === undefined) {
      return;
    }

    const id = target.customer_id;
    this.customerService.deleteCustomer(id).subscribe({
      next: () => {
        this.showToast('ลบข้อมูลเรียบร้อย', 'success');
        this.deleteTarget.set(null);
        this.loadCustomers();
        if (this.editingId() === id) {
          this.resetForm();
        }
      },
      error: () => {
        this.deleteTarget.set(null);
        this.showToast('เกิดข้อผิดพลาดในการลบ', 'error');
      }
    });
  }

  // ---------- Toast ----------
  showToast(message: string, type: 'success' | 'error') {
    this.toastMessage.set(message);
    this.toastType.set(type);

    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastMessage.set('');
    }, 3500);
  }
}