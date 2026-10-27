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
  pricePerBox = 60; // ราคาข้าวกล่องละ 60 บาท
  deliveryCostPerKm = 10; // ค่าจัดส่ง กม.ละ 10 บาท

  assignments: OptimizationResult[] = [
    {
      riderId: 1,
      riderName: 'ไรเดอร์ A (เอก)',
      totalBoxes: 7,
      totalOrders: 2,
      totalDistance: 6.5,
      revenue: 420,
      deliveryCost: 65,
      profit: 355,
      orders: ['#101 สมชาย (4 กล่อง - 2.5 กม.)', '#102 สมหญิง (3 กล่อง - 4.0 กม.)']
    },
    {
      riderId: 2,
      riderName: 'ไรเดอร์ B (บอย)',
      totalBoxes: 2,
      totalOrders: 1,
      totalDistance: 1.8,
      revenue: 120,
      deliveryCost: 18,
      profit: 102,
      orders: ['#103 กิตติศักดิ์ (2 กล่อง - 1.8 กม.)']
    }
  ];

  get totalProfit() {
    return this.assignments.reduce((sum, item) => sum + item.profit, 0);
  }

  get totalBoxes() {
    return this.assignments.reduce((sum, item) => sum + item.totalBoxes, 0);
  }
}