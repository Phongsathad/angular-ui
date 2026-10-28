import { ChangeDetectorRef, AfterViewInit, Component, ElementRef, OnInit, inject, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import * as L from 'leaflet';

@Component({
  selector: 'app-riders-task',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rider-task.html',
  styleUrl: './rider-task.css'
})
export class RiderTask implements OnInit, AfterViewInit {
  private http = inject(HttpClient);
  private mapElement = viewChild('riderMap', { read: ElementRef });
  private map?: L.Map;

  private readonly storageKey = 'current-logged-in-rider';
  private cdr = inject(ChangeDetectorRef);

  loggedInRider: any = null;
  loginData = { username: '', password: '' };
  isLoggingIn = false;
  loginError = '';

  tasks: any[] = [];

  ngOnInit(): void {
    const savedRider = localStorage.getItem(this.storageKey);
    if (savedRider) {
      this.loggedInRider = JSON.parse(savedRider);
      this.fetchRiderTasks(this.loggedInRider.rider_id);
    }
  }

  ngAfterViewInit(): void {
    if (this.loggedInRider && this.tasks.length > 0) {
      setTimeout(() => this.initializeMap(), 100);
    }
  }

  loginRider(): void {
    const { username, password } = this.loginData;
    if (!username.trim() || !password) {
      this.loginError = 'กรุณากรอกชื่อผู้ใช้และรหัสผ่านให้ครบถ้วน';
      return;
    }

    this.loginError = '';
    this.isLoggingIn = true;
    this.cdr.detectChanges(); // 👈 บังคับอัปเดตปุ่มเป็นสถานะกำลังโหลด

    this.http.post('https://project-adv-webx.vercel.app/api/riders/login', {
      username: username.trim(),
      password
    }).subscribe({
      next: (res: any) => {
        this.isLoggingIn = false;
        this.loggedInRider = res.rider;
        localStorage.setItem(this.storageKey, JSON.stringify(res.rider));
        this.loginData = { username: '', password: '' };
        
        this.cdr.detectChanges(); // 👈 บังคับอัปเดต UI ให้เปลี่ยนข้ามไปหน้าแดชบอร์ดทันที
        this.fetchRiderTasks(res.rider.rider_id);
      },
      error: (err) => {
        this.isLoggingIn = false;
        this.loginError = err.error?.error || 'เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบข้อมูลอีกครั้ง';
        this.cdr.detectChanges(); // 👈 บังคับแสดงข้อความแจ้งเตือนเมื่อเกิด Error
      }
    });
  }

  logout(): void {
    this.loggedInRider = null;
    this.tasks = [];
    localStorage.removeItem(this.storageKey);
    if (this.map) {
      this.map.remove();
      this.map = undefined;
    }
  }

  private fetchRiderTasks(riderId: number): void {
    this.http.get<any[]>(`https://project-adv-webx.vercel.app/api/riders/${riderId}/tasks`).subscribe({
      next: (tasks) => {
        this.tasks = tasks || [];
        setTimeout(() => this.initializeMap(), 100);
      },
      error: (err) => {
        console.error('ไม่สามารถโหลดข้อมูลงานของไรเดอร์ได้', err);
      }
    });
  }

  private initializeMap(): void {
    const element = this.mapElement()?.nativeElement;
    if (!element) return;

    if (this.map) {
      this.map.remove();
    }

    const map = L.map(element, { scrollWheelZoom: false });
    this.map = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    let allLatLngs: L.LatLngExpression[] = [[16.2470296, 103.2505615]]; // พิกัดร้านค้าเริ่มต้น

    this.tasks.forEach((task, index) => {
      if (task.lat && task.lng) {
        const lat = Number(task.lat);
        const lng = Number(task.lng);
        allLatLngs.push([lat, lng]);

        L.marker([lat, lng], {
          icon: L.divIcon({
            className: '',
            html: `<span style="display:grid;place-items:center;width:32px;height:32px;border:3px solid #fff;border-radius:50%;background:#0077b6;color:#fff;font:700 13px/1 sans-serif;box-shadow:0 2px 6px #0004">${task.stop_seq || (index + 1)}</span>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          }),
        }).addTo(map).bindTooltip(`<b>${task.first_name} ${task.last_name || ''}</b><br>📦 ${task.box_count} กล่อง`);
      }
    });

    if (allLatLngs.length > 1) {
      map.fitBounds(L.latLngBounds(allLatLngs), { padding: [40, 40] });
    }
  }
}