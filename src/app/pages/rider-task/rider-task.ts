import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Task {
  id: number;
  customerName: string;
  address: string;
  phone: string;
  lat: number;
  lng: number;
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
    { id: 101, customerName: 'สมชาย ใจดี', address: 'อาคาร A ชั้น 4', phone: '081-234-5678', lat: 13.7465, lng: 100.5352, quantity: 4, deliveryWindow: '11:30 - 12:00', isCompleted: false },
    { id: 102, customerName: 'สมหญิง รักดี', address: 'อาคาร B ชั้น 12', phone: '089-876-5432', lat: 13.7500, lng: 100.5400, quantity: 3, deliveryWindow: '12:00 - 12:30', isCompleted: false }
  ];

  openGoogleMaps(lat: number, lng: number) {
    window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
  }

  toggleTaskStatus(task: Task) {
    task.isCompleted = !task.isCompleted;
  }
}