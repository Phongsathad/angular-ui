import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

interface DeliveryTask {
  stop_id: number;
  stop_seq: number;
  stop_status: string;
  order_id: number;
  box_count: number;
  deadline: string;
  first_name: string;
  phone: string;
  lat: number;
  lng: number;
  address_note: string;
}

@Component({
  selector: 'app-rider-task',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './rider-task.html',
  styleUrl: './rider-task.css'
})
export class RiderTask implements OnInit {
  private http = inject(HttpClient);

  @Input() embedded = false;
  @Output() close = new EventEmitter<void>();
  
  riders: any[] = [];
  selectedRiderId: any = null;
  riderName: string = 'เลือกไรเดอร์';

  tasks: DeliveryTask[] = [];
  loading = false;

  ngOnInit(): void {
    this.fetchRiders();
  }

  fetchRiders(): void {
    const url = `https://project-adv-webx.vercel.app/api/riders`;
    this.http.get<any[]>(url).subscribe({
      next: (data) => {
        console.log('Riders loaded:', data);
        this.riders = data;
        if (this.riders.length > 0) {
          // รองรับทั้งฟิลด์ id / rider_id และ name / rider_name
          const first = this.riders[0];
          this.selectedRiderId = first.rider_id || first.id;
          this.riderName = first.rider_name || first.name;
          this.fetchRiderTasks();
        }
      },
      error: (err) => {
        console.error('Failed to load riders', err);
      }
    });
  }

  onRiderChange(): void {
    const currentRider = this.riders.find(r => (r.rider_id || r.id) == this.selectedRiderId);
    if (currentRider) {
      this.riderName = currentRider.rider_name || currentRider.name;
    }
    this.fetchRiderTasks();
  }

  fetchRiderTasks(): void {
    if (!this.selectedRiderId) return;
    this.loading = true;
    const url = `https://project-adv-webx.vercel.app/api/riders/${this.selectedRiderId}/tasks`;
    this.http.get<DeliveryTask[]>(url).subscribe({
      next: (data) => {
        this.tasks = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load tasks', err);
        this.tasks = [];
        this.loading = false;
      }
    });
  }

  openGoogleMaps(lat: number, lng: number): void {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    window.open(mapsUrl, '_blank');
  }

  markAsDelivered(stopId: number): void {
    const updateUrl = `https://project-adv-webx.vercel.app/api/route-stops/${stopId}/deliver`;
    this.http.put(updateUrl, {}).subscribe({
      next: () => {
        alert('บันทึกการจัดส่งสำเร็จ!');
        this.fetchRiderTasks(); 
      },
      error: (err) => {
        console.error('Update status failed', err);
      }
    });
  }
}