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
  storeLat = 13.7456;
  storeLng = 100.5342;

  // 📌 เพิ่ม 2 ตัวแปรที่ HTML ฟ้องว่าขาดไป
  totalBoxes: number = 0;
  totalProfit: number = 0;

  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c;
    return parseFloat(d.toFixed(2));
  }

  assignments: OptimizationResult[] = [
    {
      riderId: 1,
      riderName: 'ไรเดอร์ A (เอก)',
      totalBoxes: 0,
      totalOrders: 0,
      totalDistance: 0,
      revenue: 0,
      deliveryCost: 0,
      profit: 0,
      orders: []
    }
  ];
}