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

  getCustomers(): Observable<Customer[]> {
    return this.http.get<Customer[]>(this.apiUrl);
  }

  addCustomer(customer: Customer): Observable<any> {
    return this.http.post<any>(this.apiUrl, customer);
  }

  // ใหม่: แก้ไขข้อมูลลูกค้า (ต้องมี route PUT /api/customers/:id ที่ backend)
  updateCustomer(id: number, customer: Customer): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, customer);
  }

  deleteCustomer(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}