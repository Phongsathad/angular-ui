import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-order-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './order-management.html',
  styleUrl: './order-management.css'
})
export class OrderManagement implements OnInit {
  orders: any[] = [];
  customers: any[] = [];
  selectedCustomerId: number | null = null;
  newOrderQuantity: number = 1;
  newOrderWindow: string = '11:30-12:30';
  newOrder: any = { customer_id: 0, box_count: 1 };

  ngOnInit() {}
  addOrder() {}
  simulateOrders() {}
  deleteAllOrders() {}
}