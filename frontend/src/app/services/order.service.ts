import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Order, ShippingAddress } from '../models/order.model';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  createOrder(shippingAddress: ShippingAddress) {
    return this.http.post<{ order: Order; itemCount: number }>(`${this.api}/orders`, { shippingAddress });
  }

  getMyOrders() {
    return this.http.get<Order[]>(`${this.api}/orders`);
  }

  getOrderById(id: string) {
    return this.http.get<Order>(`${this.api}/orders/${id}`);
  }

  // Admin
  getAllOrders() {
    return this.http.get<Order[]>(`${this.api}/admin/orders`);
  }

  updateStatus(id: string, status: string) {
    return this.http.put<Order>(`${this.api}/admin/orders/${id}/status`, { status });
  }
}
