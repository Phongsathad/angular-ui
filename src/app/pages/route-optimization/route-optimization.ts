import { ChangeDetectorRef, AfterViewInit, Component, ElementRef, OnDestroy, OnInit, inject, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import * as L from 'leaflet';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';


interface OptimizationResult {
  riderId: number;
  riderName: string;
  totalBoxes: number;
  totalOrders: number;
  totalDistance: number;
  revenue: number;
  deliveryCost: number;
  profit: number;
  orders: string[];
  duration: number;
  color: string;
}

interface DeliveryStop {
  orderId: number;
  customerName: string;
  lat: number;
  lng: number;
  boxCount: number;
  distanceFromPrev?: number;
}

interface RiderRoute {
  riderId: number;
  riderName: string;
  color: string;
  totalBoxes: number;
  totalOrders: number;
  stops: DeliveryStop[];
  totalDistance: number;
  duration: number;
}

interface OsrmRouteResponse {
  code: string;
  routes: {
    distance: number;
    duration: number;
    geometry: {
      coordinates: [number, number][];
    };
  }[];
}

@Component({
  selector: 'app-route-optimization',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './route-optimization.html',
  styleUrl: './route-optimization.css'
})
export class RouteOptimization implements OnInit, AfterViewInit, OnDestroy {
  private readonly selectedRiderStorageKey = 'route-optimization-selected-rider';
  private routeMapElement = viewChild('routeMap', { read: ElementRef });

  private http = inject(HttpClient);
  private map?: L.Map;
  private routeRequests: AbortController[] = [];
  private riderRouteLayers = new Map<number, { outline: L.Polyline; route: L.Polyline }>();

  // พิกัดร้านค้า (จุดเริ่มต้นและสิ้นสุด)
  private readonly store = { latitude: 16.2470296, longitude: 103.2505615 };

  routeStatus = 'กำลังโหลดข้อมูลและจัดสรรเส้นทาง...';

  totalBoxes = 0;
  totalProfit = 0;
  totalRevenue = 0;
  totalDeliveryCost = 0;
  assignments: OptimizationResult[] = [];
  optimizedRiders: RiderRoute[] = [];
  selectedRiderId: number | null = null;
  showAddRiderForm = false;
  isSavingRider = false;
  riderFormError = '';
  newRider = { name: '', phone: '', username: '', password: '', capacity: 10 };

  // สีประจำตัวไรเดอร์แต่ละคัน
  private readonly riderColors = [
    '#d62828', '#0077b6', '#2a9d8f', '#f77f00', '#6a4c93', // 1-5
    '#e76f51', '#264653', '#e9c46a', '#43aa8b', '#f8961e', // 6-10
    '#577590', '#f3722c', '#4d908e', '#90be6d', '#f9844a', // 11-15
    '#b5179e', '#7209b7', '#4361ee', '#4cc9f0', '#3a0ca3', // 16-20
    '#ff006e', '#fb8500', '#8338ec', '#023e8a', '#0096c7', // 21-25
    '#52b788', '#d90429', '#ef233c', '#8d99ae', '#2b2d42'  // 26-30
  ];

  private cdr = inject(ChangeDetectorRef); // 👈 เพิ่มตัวแปรสำหรับบังคับอัปเดต UI

  ngOnInit(): void {
    const savedRiderId = localStorage.getItem(this.selectedRiderStorageKey);
    this.selectedRiderId = savedRiderId ? Number(savedRiderId) : null;
    this.fetchAndOptimizeRoutes();
  }

  ngAfterViewInit(): void { }

  ngOnDestroy(): void {
    this.routeRequests.forEach(req => req.abort());
    this.map?.remove();
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((R * c).toFixed(2));
  }

  private fetchAndOptimizeRoutes(): void {
    const customersUrl = 'https://project-adv-webx.vercel.app/api/customers';
    const ordersUrl = 'https://project-adv-webx.vercel.app/api/orders';
    const ridersUrl = 'https://project-adv-webx.vercel.app/api/riders';

    forkJoin({
      customers: this.http.get<any[]>(customersUrl),
      orders: this.http.get<any[]>(ordersUrl),
      riders: this.http.get<any[]>(ridersUrl)
    }).subscribe({
      next: ({ customers, orders, riders }) => {
        if (!orders || orders.length === 0) {
          this.clearRouteDisplay();
          this.routeStatus = 'ไม่พบข้อมูลคำสั่งซื้อในระบบ';
          return;
        }

        // กรองเฉพาะออเดอร์ที่ยังไม่เสร็จสิ้น (status !== 'completed')
        const pendingOrders = orders.filter(order =>
          order.status !== 'completed' && order.status !== 'Completed'
        );

        if (pendingOrders.length === 0) {
          this.clearRouteDisplay();
          this.routeStatus = 'กำลังโหลดแผนงานที่บันทึกไว้...';
          this.loadSavedRoutes(riders);
          return;
        }

        const activeRiders = riders.filter(r => r.is_active === 1 || r.is_active === true);
        if (activeRiders.length === 0) {
          this.clearRouteDisplay();
          this.routeStatus = 'ไม่พบไรเดอร์ที่พร้อมปฏิบัติงานในระบบ';
          return;
        }

        let rawOrders = pendingOrders.map((order) => {
          const customer = customers.find(c => c.customer_id === order.customer_id);
          return {
            order_id: order.order_id,
            customer_id: order.customer_id,
            box_count: Number(order.box_count) || 1,
            first_name: customer ? `${customer.first_name} ${customer.last_name || ''}`.trim() : `Order #${order.order_id}`,
            lat: customer ? Number(customer.lat) : 16.2493037,
            lng: customer ? Number(customer.lng) : 103.2557389,
          };
        });

        const MAX_CAPACITY = 10;
        this.optimizedRiders = [];

        let unassignedOrders = [...rawOrders];
        let riderIndex = 0;

        // วนลูปแบ่งกลุ่มออเดอร์ให้ไรเดอร์แต่ละคน (สูงสุด 10 กล่องต่อคัน)
        while (unassignedOrders.length > 0 && riderIndex < activeRiders.length) {
          const currentRider = activeRiders[riderIndex];
          let currentBatch: typeof rawOrders = [];
          let currentBoxes = 0;

          unassignedOrders = unassignedOrders.filter(order => {
            if (currentBoxes + order.box_count <= MAX_CAPACITY) {
              currentBatch.push(order);
              currentBoxes += order.box_count;
              return false;
            }
            return true;
          });

          // จัดเรียงจุดส่งด้วย Nearest Neighbor
          let sortedStops: DeliveryStop[] = [];
          let currentLat = this.store.latitude;
          let currentLng = this.store.longitude;
          let remainingBatch = [...currentBatch];

          while (remainingBatch.length > 0) {
            let nearestIndex = 0;
            let minDistance = Infinity;

            remainingBatch.forEach((order, index) => {
              const dist = this.calculateDistance(currentLat, currentLng, order.lat, order.lng);
              if (dist < minDistance) {
                minDistance = dist;
                nearestIndex = index;
              }
            });

            const nextOrder = remainingBatch.splice(nearestIndex, 1)[0];
            sortedStops.push({
              orderId: nextOrder.order_id,
              customerName: nextOrder.first_name,
              lat: nextOrder.lat,
              lng: nextOrder.lng,
              boxCount: nextOrder.box_count,
              distanceFromPrev: minDistance
            });

            currentLat = nextOrder.lat;
            currentLng = nextOrder.lng;
          }

          const assignedColor = this.riderColors[riderIndex % this.riderColors.length];

          this.optimizedRiders.push({
            riderId: currentRider.rider_id,
            riderName: currentRider.name,
            color: assignedColor,
            totalBoxes: currentBoxes,
            totalOrders: sortedStops.length,
            stops: sortedStops,
            totalDistance: 0,
            duration: 0
          });

          riderIndex++;
        }

        this.totalBoxes = rawOrders.reduce((sum, o) => sum + o.box_count, 0);

        // ใน fetchAndOptimizeRoutes() และ loadSavedRoutes() หลังจากกำหนดค่า assignments เสร็จแล้ว:
        this.assignments = this.optimizedRiders.map(rider => ({
          riderId: rider.riderId,
          riderName: rider.riderName,
          color: rider.color,
          totalBoxes: rider.totalBoxes,
          totalOrders: rider.totalOrders,
          totalDistance: 0,
          revenue: rider.totalOrders * 50,
          deliveryCost: 15,
          profit: (rider.totalOrders * 50) - 15,
          duration: 0,
          orders: rider.stops.map(s => `${s.customerName} (${s.boxCount} กล่อง)`)
        }));

        this.cdr.detectChanges(); // 👈 บังคับให้ Angular อัปเดตหน้าจอฝั่งขวาทันทีโดยไม่ต้องรอคลิกปุ่ม

        this.routeStatus = `จัดสรรงานสำเร็จ (${this.optimizedRiders.length} คัน)`;

        setTimeout(() => {
          this.initializeMap();
        }, 100);
      },
      error: (err) => {
        this.clearRouteDisplay();
        console.error('ไม่สามารถโหลดข้อมูลจากเซิร์ฟเวอร์ได้', err);
        this.routeStatus = 'โหลดข้อมูลไม่สำเร็จ';
      }
    });
  }

  private loadSavedRoutes(riders: any[]): void {
    const activeRiders = riders.filter(rider => rider.is_active === 1 || rider.is_active === true);
    if (activeRiders.length === 0) {
      this.routeStatus = 'ไม่พบไรเดอร์ที่พร้อมปฏิบัติงานในระบบ';
      return;
    }

    forkJoin(activeRiders.map(rider =>
      this.http.get<any[]>(`https://project-adv-webx.vercel.app/api/riders/${rider.rider_id}/tasks`)
    )).subscribe({
      next: (tasksByRider) => {
        this.optimizedRiders = activeRiders.flatMap((rider, index) => {
          const tasks = tasksByRider[index] || [];
          const stops: DeliveryStop[] = tasks.map(task => ({
            orderId: Number(task.order_id),
            customerName: `${task.first_name} ${task.last_name || ''}`.trim(),
            lat: Number(task.lat),
            lng: Number(task.lng),
            boxCount: Number(task.box_count) || 1,
          }));

          if (stops.length === 0) return [];

          return [{
            riderId: rider.rider_id,
            riderName: rider.name,
            color: this.riderColors[index % this.riderColors.length],
            totalBoxes: stops.reduce((sum, stop) => sum + stop.boxCount, 0),
            totalOrders: stops.length,
            stops,
            totalDistance: 0,
            duration: 0,
          }];
        });

        this.totalBoxes = this.optimizedRiders.reduce((sum, rider) => sum + rider.totalBoxes, 0);
        this.assignments = this.optimizedRiders.map(rider => ({
          riderId: rider.riderId,
          riderName: rider.riderName,
          color: rider.color,
          totalBoxes: rider.totalBoxes,
          totalOrders: rider.totalOrders,
          totalDistance: 0,
          revenue: rider.totalOrders * 50,
          deliveryCost: 15,
          profit: (rider.totalOrders * 50) - 15,
          duration: 0,
          orders: rider.stops.map(stop => `${stop.customerName} (${stop.boxCount} กล่อง)`),
        }));

        if (this.optimizedRiders.length === 0) {
          this.routeStatus = 'ไม่มีออเดอร์ค้างส่งหรือแผนงานของวันนี้';
          return;
        }

        this.routeStatus = `แสดงแผนงานที่บันทึกไว้ (${this.optimizedRiders.length} คัน)`;
        setTimeout(() => this.initializeMap(), 100);
      },
      error: (err) => {
        console.error('ไม่สามารถโหลดแผนงานที่บันทึกไว้ได้', err);
        this.routeStatus = 'โหลดแผนงานที่บันทึกไว้ไม่สำเร็จ';
      }
    });
  }

  private clearRouteDisplay(): void {
    this.routeRequests.forEach(request => request.abort());
    this.routeRequests = [];
    this.map?.remove();
    this.map = undefined;
    this.optimizedRiders = [];
    this.assignments = [];
    this.totalBoxes = 0;
    this.riderRouteLayers.clear();
  }

  addRider(): void {
    const { name, phone, username, password, capacity } = this.newRider;
    if (!name.trim() || !phone.trim() || !username.trim() || !password || capacity < 1) {
      this.riderFormError = 'กรุณากรอกข้อมูลให้ครบ และระบุความจุมากกว่า 0';
      return;
    }

    this.riderFormError = '';
    this.isSavingRider = true;

    this.http.post('https://project-adv-webx.vercel.app/api/riders', {
      name: name.trim(),
      phone: phone.trim(),
      username: username.trim(),
      password,
      capacity,
      is_active: 1,
    }).pipe(
      finalize(() => {
        this.isSavingRider = false; // 👈 บังคับปลดล็อกปุ่มเสมอไม่ว่าจะสำเร็จหรือพัง
      })
    ).subscribe({
      next: () => {
        this.showAddRiderForm = false;
        this.riderFormError = '';
        this.newRider = { name: '', phone: '', username: '', password: '', capacity: 10 };
        this.routeStatus = 'เพิ่มไรเดอร์สำเร็จ กำลังจัดสรรเส้นทางใหม่...';
        this.fetchAndOptimizeRoutes(); // โหลดข้อมูลใหม่และแสดงผลฝั่งขวาอัตโนมัติ
      },
      error: (error) => {
        console.error('ไม่สามารถเพิ่มไรเดอร์ได้', error);
        const apiMessage = error.error?.error;
        this.riderFormError = typeof apiMessage === 'string'
          ? apiMessage
          : 'เพิ่มไรเดอร์ไม่สำเร็จ กรุณาตรวจสอบข้อมูลและลองอีกครั้ง';
      },
    });
  }

  toggleRiderRoute(riderId: number): void {
    this.selectedRiderId = this.selectedRiderId === riderId ? null : riderId;
    if (this.selectedRiderId === null) {
      localStorage.removeItem(this.selectedRiderStorageKey);
    } else {
      localStorage.setItem(this.selectedRiderStorageKey, String(this.selectedRiderId));
    }
    this.updateRouteHighlight();
  }

  private updateRouteHighlight(): void {
    this.riderRouteLayers.forEach((layers, riderId) => {
      const isHighlighted = this.selectedRiderId === null || this.selectedRiderId === riderId;
      layers.outline.setStyle({ opacity: isHighlighted ? 0.95 : 0.25, weight: isHighlighted ? 12 : 8 });
      layers.route.setStyle({ opacity: isHighlighted ? 1 : 0.18, weight: isHighlighted ? 7 : 4 });
    });
  }

  saveRoutePlanToDatabase(): void {
    if (this.assignments.length === 0) {
      alert('ไม่มีข้อมูลเส้นทางที่จะบันทึก');
      return;
    }

    const payload = {
      plan_date: new Date().toISOString().split('T')[0],
      depart_time: '11:30:00',
      assignments: this.optimizedRiders.map(rider => ({
        riderId: rider.riderId,
        color: rider.color,
        stops: rider.stops.map(stop => ({
          orderId: stop.orderId
        }))
      }))
    };

    const saveUrl = 'https://project-adv-webx.vercel.app/api/route-plans';

    this.http.post(saveUrl, payload).subscribe({
      next: (response: any) => {
        alert('บันทึกแผนเส้นทางและกระจายงานให้ไรเดอร์สำเร็จ!');
        console.log('Saved successfully:', response);
      },
      error: (err) => {
        console.error('ไม่สามารถบันทึกข้อมูลลงฐานข้อมูลได้', err);
        alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    });
  }

  private initializeMap(): void {
    const element = this.routeMapElement()?.nativeElement;
    if (!element) return;

    if (this.map) {
      this.map.remove();
    }
    this.riderRouteLayers.clear();
    if (!this.optimizedRiders.some(rider => rider.riderId === this.selectedRiderId)) {
      this.selectedRiderId = null;
      localStorage.removeItem(this.selectedRiderStorageKey);
    }

    const map = L.map(element, { scrollWheelZoom: false });
    this.map = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    let allLatLngs: L.LatLngExpression[] = [[this.store.latitude, this.store.longitude]];

    // ปักหมุดและวาดเส้นทางแยกตามสีของไรเดอร์แต่ละคน
    this.optimizedRiders.forEach((rider) => {
      rider.stops.forEach((stop, index) => {
        allLatLngs.push([stop.lat, stop.lng]);

        L.marker([stop.lat, stop.lng], {
          icon: L.divIcon({
            className: '',
            html: `<span style="display:grid;place-items:center;width:32px;height:32px;border:3px solid #fff;border-radius:50%;background:${rider.color};color:#fff;font:700 13px/1 sans-serif;box-shadow:0 2px 6px #0004">${index + 1}</span>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          }),
        }).addTo(map).bindTooltip(`<b>${rider.riderName}</b><br>${stop.customerName} (${stop.boxCount} กล่อง)`);
      });

      // โหลดเส้นทางถนนจริง (OSRM) แยกตามเส้นทางของแต่ละไรเดอร์
      void this.loadRoadRouteForRider(map, rider);
    });

    // ปักหมุดร้านค้า
    L.marker([this.store.latitude, this.store.longitude], {
      icon: L.divIcon({
        className: '',
        html: '<span style="display:block;padding:6px 12px;border:2px solid #fff;border-radius:16px;background:#244b37;color:#fff;font:700 13px sans-serif;box-shadow:0 2px 8px #0003">ร้าน</span>',
        iconSize: [58, 34],
        iconAnchor: [29, 17],
      }),
    }).addTo(map).bindTooltip('จุดเริ่มต้น (ร้าน)');

    if (allLatLngs.length > 1) {
      map.fitBounds(L.latLngBounds(allLatLngs), { padding: [40, 40] });
    }
  }

  private async loadRoadRouteForRider(map: L.Map, rider: RiderRoute): Promise<void> {
    if (rider.stops.length === 0) return;

    const waypoints = [
      this.store,
      ...rider.stops.map(s => ({ latitude: s.lat, longitude: s.lng })),
      this.store
    ].map(loc => `${loc.longitude},${loc.latitude}`).join(';');

    const url = `https://router.project-osrm.org/route/v1/driving/${waypoints}?overview=full&geometries=geojson&steps=false`;
    const controller = new AbortController();
    this.routeRequests.push(controller);

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`Routing service returned ${response.status}`);

      const result = await response.json() as OsrmRouteResponse;
      const route = result.routes[0];
      if (result.code !== 'Ok' || !route) throw new Error('No drivable route found');

      if (controller.signal.aborted) return;

      const roadCoordinates = route.geometry.coordinates.map(
        ([longitude, latitude]) => [latitude, longitude] as L.LatLngExpression,
      );

      // วาดเส้นทางโพลีไลน์ด้วยสีประจำตัวของไรเดอร์คนนั้นๆ
      const outline = L.polyline(roadCoordinates, {
        color: '#ffffff',
        weight: 10,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      const routeLine = L.polyline(roadCoordinates, {
        color: rider.color,
        weight: 6,
        opacity: 1,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map).bindTooltip(`<b>${rider.riderName}</b><br>${rider.stops.length} จุดส่ง`);

      this.riderRouteLayers.set(rider.riderId, { outline, route: routeLine });
      this.updateRouteHighlight();

      const calculatedDistance = Number((route.distance / 1000).toFixed(2));
      const calculatedDuration = Math.ceil(route.duration / 60);

      // 💰 กำหนดตัวแปรสูตรการเงิน (Financial Model)
      const pricePerBox = 65; // ราคาขายต่อกล่อง
      const costPerBox = 40;   // ต้นทุนสินค้าต่อกล่อง
      const fixedFee = 15;     // ค่ารอบคงที่ไรเดอร์
      const ratePerKm = 2;     // ค่าบริการตามระยะทางต่อ กม.

      // อัปเดตระยะทาง เวลา และกำไรสุทธิในการ์ดของไรเดอร์คนนั้น
      this.assignments = this.assignments.map((assignment) => {
        if (assignment.riderId === rider.riderId) {
          const totalBoxes = assignment.totalBoxes;
          const revenue = (pricePerBox - costPerBox) * totalBoxes;
          const deliveryCost = fixedFee + (ratePerKm * calculatedDistance * totalBoxes);
          const profit = Number((revenue - deliveryCost).toFixed(2));

          return {
            ...assignment,
            totalDistance: calculatedDistance,
            duration: calculatedDuration,
            revenue,
            deliveryCost,
            profit
          };
        }
        return assignment;
      });

      // 🟢 คำนวณสรุปรวมทั้งร้าน
      this.totalRevenue = Number(this.assignments.reduce((sum, item) => sum + (item.revenue || 0), 0).toFixed(2));
      this.totalProfit = Number(this.assignments.reduce((sum, item) => sum + (item.profit || 0), 0).toFixed(2));
      this.totalDeliveryCost = Number(this.assignments.reduce((sum, item) => sum + (item.deliveryCost || 0), 0).toFixed(2));
      this.cdr.detectChanges();
    } catch (error) {
      if (controller.signal.aborted) return;
      console.error(`Unable to load road route for rider ${rider.riderName}`, error);
    }
  }
}