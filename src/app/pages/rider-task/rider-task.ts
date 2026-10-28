import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';

interface DeliveryTask {
  stop_id: number;
  stop_seq: number;
  stop_status: string;
  order_id: number;
  box_count: number;
  deadline: string;
  first_name: string;
  last_name: string;
  phone: string;
  lat: number;
  lng: number;
  address_note: string;
}

@Component({
  selector: 'app-rider-task',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './rider-task.html',
  styleUrl: './rider-task.css'
})
export class RiderTask implements OnInit {
  private http = inject(HttpClient);
  
  riderId = 1; // สามารถปรับเปลี่ยนตามระบบล็อกอินจริงของไรเดอร์
  riderName = 'สมศักดิ์ รุ่งไว';
  tasks: DeliveryTask[] = [];
  loading = true;

  ngOnInit(): void {
    this.fetchRiderTasks();
  }

  fetchRiderTasks(): void {
    const url = `https://project-adv-webx.vercel.app/api/riders/${this.riderId}/tasks`;
    this.http.get<DeliveryTask[]>(url).subscribe({
      next: (data) => {
        this.tasks = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load tasks', err);
        this.loading = false;
      }
    });
  }

  // เปิด Google Maps นำทางไปยังพิกัดลูกค้า
  openGoogleMaps(lat: number, lng: number): void {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    window.open(mapsUrl, '_blank');
  }

  // กดอัปเดตสถานะจุดส่งเป็นส่งสำเร็จ
  markAsDelivered(stopId: number): void {
    const updateUrl = `https://project-adv-webx.vercel.app/api/route-stops/${stopId}/deliver`;
    this.http.put(updateUrl, {}).subscribe({
      next: () => {
        alert('บันทึกการจัดส่งสำเร็จ!');
        this.fetchRiderTasks(); // โหลดรายการงานใหม่
      },
      error: (err) => {
        console.error('Update status failed', err);
        alert('เกิดข้อผิดพลาดในการอัปเดตสถานะ');
      }
    });
  }
}