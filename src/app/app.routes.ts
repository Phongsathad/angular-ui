import { Routes } from '@angular/router';
import { CustomerManagement } from './pages/customer-management/customer-management';
import { OrderManagement } from './pages/order-management/order-management';
import { RouteOptimization } from './pages/route-optimization/route-optimization';
import { RiderTask } from './pages/rider-task/rider-task';

export const routes: Routes = [
  { path: '', redirectTo: 'customers', pathMatch: 'full' }, // 👈 ปรับมาเข้าหน้าลูกค้าก่อนเป็นหน้าแรก
  { path: 'customers', component: CustomerManagement },
  { path: 'orders', component: OrderManagement },
  { path: 'route-optimization', component: RouteOptimization },
  { path: 'rider-task', component: RiderTask },
];