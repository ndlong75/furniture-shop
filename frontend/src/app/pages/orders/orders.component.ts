import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { OrderService } from '../../services/order.service';
import { Order, OrderStatus } from '../../models/order.model';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, DatePipe],
  template: `
    <div class="container">
      <h1>Đơn hàng của tôi</h1>
      @if (orders.length === 0) {
        <div class="empty">
          <p>Bạn chưa có đơn hàng nào.</p>
          <a routerLink="/products" class="btn">Bắt đầu mua sắm</a>
        </div>
      } @else {
        @for (order of orders; track order.id) {
          <div class="order-card">
            <div class="order-header">
              <div>
                <span class="order-id">#{{ order.id.substring(0, 8).toUpperCase() }}</span>
                <span class="date">{{ order.created_at | date:'dd/MM/yyyy HH:mm' }}</span>
              </div>
              <span class="status" [class]="order.status">{{ statusLabel[order.status] }}</span>
            </div>
            <div class="order-items">
              @for (item of order.items; track item.id) {
                <div class="item-row">
                  <span>{{ item.product_name }} × {{ item.quantity }}</span>
                  <span>{{ item.subtotal | currency:'VND':'symbol':'1.0-0' }}</span>
                </div>
              }
            </div>
            <div class="order-footer">
              <span class="address">📍 {{ order.shipping_address.address }}, {{ order.shipping_address.city }}</span>
              <span class="total">Tổng: <strong>{{ order.total_amount | currency:'VND':'symbol':'1.0-0' }}</strong></span>
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .container { max-width: 800px; margin: 0 auto; padding: 2rem 1rem; }
    h1 { font-size: 1.75rem; color: #1a1a2e; margin-bottom: 2rem; }
    .empty { text-align: center; padding: 3rem; color: #888; }
    .btn { display: inline-block; background: #1a1a2e; color: white; padding: 0.75rem 2rem; border-radius: 4px; text-decoration: none; margin-top: 1rem; }
    .order-card { border: 1px solid #e5e5e5; border-radius: 8px; margin-bottom: 1.25rem; overflow: hidden; }
    .order-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.25rem; background: #f8f8f8; border-bottom: 1px solid #e5e5e5; }
    .order-id { font-weight: 700; font-family: monospace; margin-right: 1rem; color: #1a1a2e; }
    .date { font-size: 0.85rem; color: #888; }
    .status { padding: 0.3rem 0.75rem; border-radius: 12px; font-size: 0.8rem; font-weight: 600; }
    .status.pending { background: #fef9c3; color: #854d0e; }
    .status.processing { background: #dbeafe; color: #1e40af; }
    .status.shipped { background: #d1fae5; color: #065f46; }
    .status.delivered { background: #dcfce7; color: #14532d; }
    .status.cancelled { background: #fee2e2; color: #991b1b; }
    .order-items { padding: 1rem 1.25rem; }
    .item-row { display: flex; justify-content: space-between; padding: 0.35rem 0; font-size: 0.9rem; color: #444; border-bottom: 1px solid #f0f0f0; }
    .item-row:last-child { border: none; }
    .order-footer { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1.25rem; background: #fafafa; border-top: 1px solid #e5e5e5; font-size: 0.9rem; }
    .address { color: #666; }
    .total { color: #1a1a2e; }
    strong { color: #c0392b; }
  `]
})
export class OrdersComponent implements OnInit {
  orders: Order[] = [];
  statusLabel: Record<OrderStatus, string> = {
    pending: 'Chờ xác nhận', processing: 'Đang xử lý',
    shipped: 'Đang giao', delivered: 'Đã giao', cancelled: 'Đã hủy'
  };

  constructor(private orderService: OrderService) {}
  ngOnInit() { this.orderService.getMyOrders().subscribe(orders => this.orders = orders); }
}
