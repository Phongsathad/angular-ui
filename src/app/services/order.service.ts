import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Order {
  order_id?: number;
  customer_id: number;
  order_date?: string;
  box_count: number;
  deadline: string; // เช่น '12:30:00'
  status?: string;  // เช่น 'assigned'
  app_created?: number;
  first_name?: string;
  last_name?: string;
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

  addOrder(order: Order): Observable<any> {
    return this.http.post<any>(this.apiUrl, order);
  }

  deleteOrder(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}