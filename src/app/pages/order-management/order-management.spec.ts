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

  customers: Customer[] = [];
  newCustomer: Customer = {
    first_name: '',
    last_name: '',
    phone: '',
    lat: 16.2493037,
    lng: 103.2557389
  };

  ngOnInit() {
    this.loadCustomers();
  }

  loadCustomers() {
    this.customerService.getCustomers().subscribe({
      next: (data) => this.customers = data,
      error: (err) => console.error('Error fetching customers:', err)
    });
  }

  onSubmit() {
    if (!this.newCustomer.first_name || !this.newCustomer.phone) {
      alert('กรุณากรอกชื่อและเบอร์โทรศัพท์');
      return;
    }

    this.customerService.addCustomer(this.newCustomer).subscribe({
      next: () => {
        alert('บันทึกข้อมูลลูกค้าสำเร็จ!');
        this.loadCustomers();
        this.resetForm();
      },
      error: (err) => alert('เกิดข้อผิดพลาด: ' + (err.error?.error || err.message))
    });
  }

  resetForm() {
    this.newCustomer = {
      first_name: '',
      last_name: '',
      phone: '',
      lat: 16.2493037,
      lng: 103.2557389
    };
  }
}