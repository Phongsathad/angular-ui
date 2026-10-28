import { ChangeDetectorRef, AfterViewInit, Component, ElementRef, OnDestroy, OnInit, inject, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { timeout } from 'rxjs';
import * as L from 'leaflet';

@Component({
  selector: 'app-riders-task',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rider-task.html',
  styleUrl: './rider-task.css'
})
export class RiderTask implements OnInit, AfterViewInit, OnDestroy {
  private http = inject(HttpClient);
  private mapElement = viewChild('riderMap', { read: ElementRef });
  private map?: L.Map;
  private routeRequest?: AbortController;

  private readonly storageKey = 'current-logged-in-rider';
  private cdr = inject(ChangeDetectorRef);

  loggedInRider: any = null;
  loginData = { username: '', password: '' };
  isLoggingIn = false;
  loginError = '';

  tasks: any[] = [];
  isLoadingTasks = false;
  taskLoadError = '';

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

  ngOnDestroy(): void {
    this.routeRequest?.abort();
    this.map?.remove();
  }

  loginRider(): void {
    const { username, password } = this.loginData;
    if (!username.trim() || !password) {
      this.loginError = 'กรุณากรอกชื่อผู้ใช้และรหัสผ่านให้ครบถ้วน';
      return;
    }

    this.loginError = '';
    this.isLoggingIn = true;
    this.cdr.detectChanges(); 

    this.http.post('https://project-adv-webx.vercel.app/api/riders/login', {
      username: username.trim(),
      password
    }).pipe(
      timeout({ first: 10000 })
    ).subscribe({
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
        this.loginError = err.name === 'TimeoutError'
          ? 'ระบบใช้เวลาตอบกลับนานเกินไป กรุณาลองเข้าสู่ระบบอีกครั้ง'
          : err.error?.error || 'เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบข้อมูลอีกครั้ง';
        this.cdr.detectChanges(); // 👈 บังคับแสดงข้อความแจ้งเตือนเมื่อเกิด Error
      }
    });
  }

  logout(): void {
    this.loggedInRider = null;
    this.tasks = [];
    localStorage.removeItem(this.storageKey);
    this.routeRequest?.abort();
    if (this.map) {
      this.map.remove();
      this.map = undefined;
    }
  }

  private fetchRiderTasks(riderId: number): void {
    this.isLoadingTasks = true;
    this.taskLoadError = '';
    this.http.get<any[]>(`https://project-adv-webx.vercel.app/api/riders/${riderId}/tasks`).pipe(
      timeout({ first: 5000 })
    ).subscribe({
      next: (tasks) => {
        this.tasks = tasks || [];
        this.isLoadingTasks = false;
        this.cdr.detectChanges();
        setTimeout(() => this.initializeMap(), 100);
      },
      error: (err) => {
        console.error('ไม่สามารถโหลดข้อมูลงานของไรเดอร์ได้', err);
        this.isLoadingTasks = false;
        this.taskLoadError = err.name === 'TimeoutError'
          ? 'ระบบใช้เวลาตอบกลับนานเกินไป กดรีเฟรชเพื่อลองอีกครั้ง'
          : err.error?.error || 'โหลดรายการจุดส่งสินค้าไม่สำเร็จ กรุณาลองใหม่';
        this.cdr.detectChanges();
      }
    });
  }

  retryFetchTasks(): void {
    if (this.loggedInRider) {
      this.fetchRiderTasks(this.loggedInRider.rider_id);
    }
  }

  private initializeMap(): void {
    const element = this.mapElement()?.nativeElement;
    if (!element) return;

    this.routeRequest?.abort();
    if (this.map) {
      this.map.remove();
    }

    const map = L.map(element, { scrollWheelZoom: false });
    this.map = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const store: L.LatLngTuple = [16.2470296, 103.2505615];
    const savedColor = this.tasks.find(task => typeof task.color === 'string')?.color;
    const routeColor = /^#[0-9a-f]{6}$/i.test(savedColor || '') ? savedColor : '#0077b6';
    const allLatLngs: L.LatLngExpression[] = [store];
    const stopLatLngs: L.LatLng[] = [];

    this.tasks.forEach((task, index) => {
      const lat = Number(task.lat);
      const lng = Number(task.lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        allLatLngs.push([lat, lng]);
        stopLatLngs.push(L.latLng(lat, lng));

        L.marker([lat, lng], {
          icon: L.divIcon({
            className: '',
            html: `<span style="display:grid;place-items:center;width:32px;height:32px;border:3px solid #fff;border-radius:50%;background:${routeColor};color:#fff;font:700 13px/1 sans-serif;box-shadow:0 2px 6px #0004">${task.stop_seq || (index + 1)}</span>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          }),
        }).addTo(map).bindTooltip(`<b>${task.first_name} ${task.last_name || ''}</b><br>📦 ${task.box_count} กล่อง`);
      }
    });

    if (stopLatLngs.length > 0) {
      const routePoints = [L.latLng(store), ...stopLatLngs, L.latLng(store)];
      const routeLine = L.polyline(routePoints, {
        color: routeColor,
        weight: 5,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);
      void this.loadRoadRoute(map, routePoints, routeLine);
    }

    if (allLatLngs.length > 1) {
      map.fitBounds(L.latLngBounds(allLatLngs), { padding: [40, 40] });
    } else {
      map.setView(allLatLngs[0], 14);
    }
  }

  private async loadRoadRoute(map: L.Map, points: L.LatLng[], routeLine: L.Polyline): Promise<void> {
    const waypoints = points.map(point => `${point.lng},${point.lat}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${waypoints}?overview=full&geometries=geojson&steps=false`;
    const controller = new AbortController();
    this.routeRequest = controller;

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`Routing service returned ${response.status}`);

      const result = await response.json();
      const coordinates = result.routes?.[0]?.geometry?.coordinates;
      if (result.code !== 'Ok' || !coordinates || controller.signal.aborted || this.map !== map) return;

      routeLine.setLatLngs(coordinates.map(
        ([longitude, latitude]: [number, number]) => [latitude, longitude] as L.LatLngExpression,
      ));
    } catch (error) {
      if (!controller.signal.aborted) {
        console.error('ไม่สามารถโหลดเส้นทางถนนของไรเดอร์ได้', error);
      }
    }
  }
}