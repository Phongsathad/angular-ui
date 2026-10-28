import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Order {
  order_id?: number;
  customer_id: number;
  box_count: number;
  order_date?: string;
  deadline?: string;
  status?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  lat?: number;
  lng?: number;
}

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private http = inject(HttpClient);
  private apiUrl = 'https://project-adv-webx.vercel.app/api/orders'; 

  getOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(this.apiUrl);
  }

  // สร้างออเดอร์เดี่ยว (Backend กำหนด status เป็น pending ให้อัตโนมัติ)
  addOrder(payload: { customer_id: number; box_count: number }): Observable<any> {
    return this.http.post(this.apiUrl, payload);
  }

  // จำลองสุ่มออเดอร์ชุดใหญ่ 20-30 รายการ
  simulateOrders(): Observable<any> {
    return this.http.post(`${this.apiUrl}/simulate`, {});
  }

  // ลบออเดอร์ตาม ID
  deleteOrder(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  // ล้างออเดอร์ทั้งหมด
  clearAllOrders(): Observable<any> {
    return this.http.delete(this.apiUrl);
  }
}