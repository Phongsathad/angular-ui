import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Customer {
  customer_id?: number;
  first_name: string;
  last_name: string;
  phone: string;
  lat: number;
  lng: number;
}

@Injectable({
  providedIn: 'root'
})
export class CustomerService {
  private http = inject(HttpClient);
  
  private apiUrl = 'https://project-adv-webx.vercel.app/api/customers';

  // ดึงรายการลูกค้าทั้งหมดจาก DB
  getCustomers(): Observable<Customer[]> {
    return this.http.get<Customer[]>(this.apiUrl);
  }

  // เพิ่มลูกค้าลง DB
  addCustomer(customer: Customer): Observable<Customer> {
    return this.http.post<Customer>(this.apiUrl, customer);
  }

  // ลบลูกค้าออกจาก DB
  deleteCustomer(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}