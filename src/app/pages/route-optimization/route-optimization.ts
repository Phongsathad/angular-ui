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
  
  routeStatus = 'กำลังโหลดข้อมูลและจัดสรรเส้นทาง...';

  totalBoxes = 0;
  totalProfit = 0;
  assignments: OptimizationResult[] = [];
  optimizedRiders: RiderRoute[] = [];

  ngOnInit(): void {
    this.fetchAndOptimizeRoutes();
  }

  ngAfterViewInit(): void {}

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
          this.routeStatus = 'ไม่พบข้อมูลคำสั่งซื้อในระบบ';
          return;
        }

        // 1. กรองเอาเฉพาะออเดอร์ที่ยังไม่เสร็จสิ้น (ตัด status === 'completed' ออก)
        const pendingOrders = orders.filter(order => 
          order.status !== 'completed' && order.status !== 'Completed'
        );

        if (pendingOrders.length === 0) {
          this.routeStatus = 'ไม่มีออเดอร์ค้างส่งในระบบ (จัดส่งครบหมดแล้ว)';
          this.assignments = [];
          this.routeStops = [];
          return;
        }

        const activeRiders = riders.filter(r => r.is_active === 1 || r.is_active === true);
        if (activeRiders.length === 0) {
          this.routeStatus = 'ไม่พบไรเดอร์ที่พร้อมปฏิบัติงานในระบบ';
          return;
        }

        // 2. แปลงข้อมูลออเดอร์ที่ยังไม่ส่ง จับคู่กับพิกัดลูกค้า
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

          this.optimizedRiders.push({
            riderId: currentRider.rider_id,
            riderName: currentRider.name,
            totalBoxes: currentBoxes,
            totalOrders: sortedStops.length,
            stops: sortedStops,
            totalDistance: 0,
            duration: 0
          });

          riderIndex++;
        }

        this.routeStops = rawOrders.map(o => ({ latitude: o.lat, longitude: o.lng, name: o.first_name }));
        this.totalBoxes = rawOrders.reduce((sum, o) => sum + o.box_count, 0);

        this.assignments = this.optimizedRiders.map(rider => ({
          riderId: rider.riderId,
          riderName: rider.riderName,
          totalBoxes: rider.totalBoxes,
          totalOrders: rider.totalOrders,
          totalDistance: 0,
          revenue: rider.totalOrders * 50,
          deliveryCost: 15,
          profit: (rider.totalOrders * 50) - 15,
          duration: 0,
          orders: rider.stops.map(s => `${s.customerName} (${s.boxCount} กล่อง)`)
        }));

        this.routeStatus = `จัดสรรงานสำเร็จ (${this.optimizedRiders.length} คัน)`;

        setTimeout(() => {
          this.initializeMap();
        }, 100);
      },
      error: (err) => {
        console.error('ไม่สามารถโหลดข้อมูลจากเซิร์ฟเวอร์ได้', err);
        this.routeStatus = 'โหลดข้อมูลไม่สำเร็จ';
      }
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
      assignments: this.optimizedRiders.map((rider, index) => ({
        riderId: rider.riderId,
        color: index === 0 ? '#ef5148' : index === 1 ? '#3b82f6' : '#10b981',
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

    L.marker([this.store.latitude, this.store.longitude], {
      icon: L.divIcon({
        className: '',
        html: '<span style="display:block;padding:6px 12px;border:2px solid #fff;border-radius:16px;background:#244b37;color:#fff;font:700 13px sans-serif;box-shadow:0 2px 8px #0003">ร้าน</span>',
        iconSize: [58, 34],
        iconAnchor: [29, 17],
      }),
    }).addTo(map).bindTooltip('จุดเริ่มต้น');

    if (stops.length > 1) {
      map.fitBounds(L.latLngBounds(stops), { padding: [40, 40] });
    }
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