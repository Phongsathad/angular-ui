import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Task {
  id: number;
  customerName: string;
  address: string;
  phone: string;
  quantity: number;
  deliveryWindow: string;
  isCompleted: boolean;
}

@Component({
  selector: 'app-rider-task',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rider-task.html',
  styleUrl: './rider-task.css'
})
export class RiderTask {
  riderName = 'ไรเดอร์ A (เอก)';

  tasks: Task[] = [
    { id: 101, customerName: 'สมชาย ใจดี', address: 'อาคาร A ชั้น 4', phone: '081-234-5678', quantity: 4, deliveryWindow: '11:30 - 12:00', isCompleted: false },
    { id: 102, customerName: 'สมหญิง รักดี', address: 'อาคาร B ชั้น 12', phone: '089-876-5432', quantity: 3, deliveryWindow: '12:00 - 12:30', isCompleted: false }
  ];

  toggleTaskStatus(task: Task) {
    task.isCompleted = !task.isCompleted;
  }
}