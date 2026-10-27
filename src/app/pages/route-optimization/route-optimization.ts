import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

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
}

@Component({
  selector: 'app-route-optimization',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './route-optimization.html',
  styleUrl: './route-optimization.css'
})
export class RouteOptimization {
  // พิกัดร้านค้า (Store Location)
  storeLat = 13.7456;
  storeLng = 100.5342;

  // สูตร Haversine คำนวณระยะทางระหว่าง 2 พิกัด (กม.)
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // รัศมีโลก (กิโลเมตร)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c; 
    return parseFloat(d.toFixed(2)); // ปัดเศษ 2 ตำแหน่ง
  }

  assignments: OptimizationResult[] = [
    {
      riderId: 1,
      riderName: 'ไรเดอร์ A (เอก)',
      totalBoxes: 7,
      totalOrders: 2,
      totalDistance: 2.3, // คำนวณจาก Lat/Long ของออเดอร์ในคิว
      revenue: 420,
      deliveryCost: 23,
      profit: 397,
      orders: ['#101 สมชาย (4 กล่อง - Lat: 13.7465, Lng: 100.5352)', '#102 สมหญิง (3 กล่อง - Lat: 13.7500, Lng: 100.5400)']
    },
    {
      riderId: 2,
      riderName: 'ไรเดอร์ B (บอย)',
      totalBoxes: 2,
      totalOrders: 1,
      totalDistance: 0.5,
      revenue: 120,
      deliveryCost: 5,
      profit: 115,
      orders: ['#103 กิตติศักดิ์ (2 กล่อง - Lat: 13.7420, Lng: 100.5310)']
    }
  ];

  get totalProfit() {
    return this.assignments.reduce((sum, item) => sum + item.profit, 0);
  }

  get totalBoxes() {
    return this.assignments.reduce((sum, item) => sum + item.totalBoxes, 0);
  }
}