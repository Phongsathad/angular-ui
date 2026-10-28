import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Customer {
  customer_id?: number;
  first_name: string;
  last_name: string;
  phone: string;
  lat?: number;
  lng?: number;
  address_note?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CustomerService {
  private http = inject(HttpClient);
  private apiUrl = 'https://project-adv-webx.vercel.app/api/customers';

  getCustomers(): Observable<Customer[]> {
    return this.http.get<Customer[]>(this.apiUrl);
  }

  addCustomer(customer: Customer): Observable<any> {
    return this.http.post(this.apiUrl, customer);
  }

  // 🟢 เพิ่มฟังก์ชันยิง API แก้ไขลูกค้า
  updateCustomer(id: number, customer: Customer): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, customer);
  }

  deleteCustomer(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}