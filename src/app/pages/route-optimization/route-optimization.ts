import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, inject, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import * as L from 'leaflet';
import { forkJoin } from 'rxjs';

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
  imports: [CommonModule, RouterLink],
  templateUrl: './route-optimization.html',
  styleUrl: './route-optimization.css'
})
export class RouteOptimization implements OnInit, AfterViewInit, OnDestroy {
  private routeMapElement = viewChild('routeMap', { read: ElementRef });

  private http = inject(HttpClient);
  private map?: L.Map;
  private routeRequests: AbortController[] = [];

  // พิกัดร้านค้า (จุดเริ่มต้นและสิ้นสุด)
  private readonly store = { latitude: 16.2470296, longitude: 103.2505615 };
  private routeStops: { latitude: number; longitude: number; name: string }[] = [];
  
  routeStatus = 'กำลังโหลดและจัดสรรเส้นทาง...';

  totalBoxes = 0;
  totalProfit = 0;
  assignments: OptimizationResult[] = [];

  ngOnInit(): void {
    this.fetchAndOptimizeRoutes();
  }

  ngAfterViewInit(): void {
    // แผนที่จะถูกเรียกหลังจากคำนวณเส้นทางและได้ข้อมูลจุดส่งเสร็จสิ้น
  }

  ngOnDestroy(): void {
    this.routeRequests.forEach(req => req.abort());
    this.map?.remove();
  }

  // 1. ฟังก์ชันคำนวณระยะทาง (Haversine Formula) เป็นกิโลเมตร
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

  // 2. ดึงข้อมูลออเดอร์และลูกค้าจาก Backend แล้วนำมาคำนวณจัดกลุ่มความจุ + เรียงเส้นทาง
  private fetchAndOptimizeRoutes(): void {
    const customersUrl = 'https://project-adv-webx.vercel.app/api/customers';
    const ordersUrl = 'https://project-adv-webx.vercel.app/api/orders';

    forkJoin({
      customers: this.http.get<any[]>(customersUrl),
      orders: this.http.get<any[]>(ordersUrl)
    }).subscribe({
      next: ({ customers, orders }) => {
        if (!orders || orders.length === 0) {
          this.routeStatus = 'ไม่พบข้อมูลคำสั่งซื้อในระบบ';
          return;
        }

        // แปลงข้อมูลและรวมร่างข้อมูลออเดอร์เข้ากับพิกัดลูกค้า
        let rawOrders = orders.map((order) => {
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

        // ลุยอัลกอริทึม: แบ่งกลุ่มตามความจุ (Max 10 กล่อง/คัน) และจัดเรียง Nearest Neighbor
        const MAX_CAPACITY = 10;
        const riderNames = ['สมศักดิ์ รุ่งไว', 'มานะ ใจสู้', 'วิชัย พาซิ่ง'];
        const optimizedRiders: RiderRoute[] = [];
        
        let unassignedOrders = [...rawOrders];
        let riderIndex = 0;

        while (unassignedOrders.length > 0) {
          let currentBatch: typeof rawOrders = [];
          let currentBoxes = 0;

          // กรองออเดอร์ใส่กระเป๋าไม่ให้เกิน 10 กล่องต่อคัน
          unassignedOrders = unassignedOrders.filter(order => {
            if (currentBoxes + order.box_count <= MAX_CAPACITY) {
              currentBatch.push(order);
              currentBoxes += order.box_count;
              return false;
            }
            return true;
          });

          // จัดเรียงจุดส่งด้วย Nearest Neighbor (เริ่มจากร้าน)
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

          optimizedRiders.push({
            riderId: riderIndex + 1,
            riderName: riderNames[riderIndex % riderNames.length],
            totalBoxes: currentBoxes,
            totalOrders: sortedStops.length,
            stops: sortedStops,
            totalDistance: 0,
            duration: 0
          });

          riderIndex++;
        }

        // เก็บพิกัดจุดส่งทั้งหมดไว้สำหรับปักหมุดบนแผนที่
        this.routeStops = rawOrders.map(o => ({ latitude: o.lat, longitude: o.lng, name: o.first_name }));
        this.totalBoxes = rawOrders.reduce((sum, o) => sum + o.box_count, 0);

        // แปลงผลลัพธ์เป็น Assignments สำหรับแสดงผลในตาราง
        this.assignments = optimizedRiders.map(rider => ({
          riderId: rider.riderId,
          riderName: rider.riderName,
          totalBoxes: rider.totalBoxes,
          totalOrders: rider.totalOrders,
          totalDistance: 0,
          revenue: rider.totalOrders * 50, // ตัวอย่างคำนวณรายรับ
          deliveryCost: 15,
          profit: (rider.totalOrders * 50) - 15,
          duration: 0,
          orders: rider.stops.map(s => `${s.customerName} (${s.boxCount} กล่อง)`)
        }));

        this.routeStatus = `จัดสรรงานสำเร็จ (${optimizedRiders.length} คัน)`;

        setTimeout(() => {
          this.initializeMap();
        }, 100);
      },
      error: (err) => {
        console.error('ไม่สามารถโหลดข้อมูลคำสั่งซื้อหรือลูกค้าได้', err);
        this.routeStatus = 'โหลดข้อมูลไม่สำเร็จ';
      }
    });
  }

  private initializeMap(): void {
    const element = this.routeMapElement()?.nativeElement;
    if (!element) return;

    const map = L.map(element, { scrollWheelZoom: false });
    this.map = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const stops = [
      [this.store.latitude, this.store.longitude] as L.LatLngExpression,
      ...this.routeStops.map((stop) => [stop.latitude, stop.longitude] as L.LatLngExpression),
      [this.store.latitude, this.store.longitude] as L.LatLngExpression,
    ];

    // ปักหมุดลูกค้าแต่ละคน
    this.routeStops.forEach((stop, index) => {
      L.marker([stop.latitude, stop.longitude], {
        icon: L.divIcon({
          className: '',
          html: `<span style="display:grid;place-items:center;width:34px;height:34px;border:3px solid #fff;border-radius:50%;background:#ef4136;color:#fff;font:700 15px/1 sans-serif;box-shadow:0 2px 8px #0003">${index + 1}</span>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        }),
      }).addTo(map).bindTooltip(stop.name);
    });

    // ปักหมุดร้านค้า
    L.marker([this.store.latitude, this.store.longitude], {
      icon: L.divIcon({
        className: '',
        html: '<span style="display:block;padding:6px 12px;border:2px solid #fff;border-radius:16px;background:#244b37;color:#fff;font:700 13px sans-serif;box-shadow:0 2px 8px #0003">ร้าน</span>',
        iconSize: [58, 34],
        iconAnchor: [29, 17],
      }),
    }).addTo(map).bindTooltip('จุดเริ่มต้น');

    map.fitBounds(L.latLngBounds(stops), { padding: [40, 40] });
    void this.loadRoadRoute(map);
  }

  private async loadRoadRoute(map: L.Map): Promise<void> {
    if (this.routeStops.length === 0) return;

    const waypoints = [this.store, ...this.routeStops, this.store]
      .map(({ latitude, longitude }) => `${longitude},${latitude}`)
      .join(';');
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
      const routeLine = L.polyline(roadCoordinates, {
        color: '#ef5148',
        weight: 5,
        opacity: 0.9,
        lineJoin: 'round',
      }).addTo(map);

      map.fitBounds(routeLine.getBounds(), { padding: [40, 40] });

      const calculatedDistance = Number((route.distance / 1000).toFixed(2));
      const calculatedDuration = Math.ceil(route.duration / 60);

      this.assignments = this.assignments.map((assignment) => ({
        ...assignment,
        totalDistance: calculatedDistance,
        duration: calculatedDuration,
      }));

      this.routeStatus = 'คำนวณเส้นทางถนนจริงสำเร็จ';
    } catch (error) {
      if (controller.signal.aborted) return;
      this.routeStatus = 'โหลดเส้นทางถนนไม่สำเร็จ';
      console.error('Unable to load road route from OSRM', error);
    }
  }
}