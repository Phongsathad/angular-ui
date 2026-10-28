import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-rider-task',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rider-task.html',
  styleUrl: './rider-task.css'
})
export class RiderTask implements OnInit {
  riders: any[] = [];
  assignedOrders: any[] = [];
  selectedRiderId: number | null = null;
  isLoading: boolean = false;

  ngOnInit() {}
  onRiderChange() {}
  getSelectedRiderName(): string { return ''; }
  updateOrderStatus(orderId?: number, status?: string) {}
}