import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { CartService } from '../../services/cart.service';
import { OrderService } from '../../services/order.service';
import { ShippingAddress } from '../../models/order.model';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [RouterLink, FormsModule, CurrencyPipe],
  template: `
    <div class="container">
      <h1>Thanh toán</h1>
      @if (success) {
        <div class="success-box">
          <div class="check">✓</div>
          <h2>Đặt hàng thành công!</h2>
          <p>Mã đơn hàng: <strong>{{ orderId }}</strong></p>
          <p>Chúng tôi sẽ liên hệ xác nhận và giao hàng sớm nhất.</p>
          <a routerLink="/orders" class="btn">Xem đơn hàng của tôi</a>
        </div>
      } @else {
        <div class="layout">
          <form (ngSubmit)="placeOrder()" #f="ngForm">
            <h2>Địa chỉ giao hàng</h2>
            <div class="form-group">
              <label>Họ và tên *</label>
              <input type="text" name="fullName" [(ngModel)]="address.fullName" required />
            </div>
            <div class="form-group">
              <label>Số điện thoại *</label>
              <input type="tel" name="phone" [(ngModel)]="address.phone" required />
            </div>
            <div class="form-group">
              <label>Địa chỉ *</label>
              <input type="text" name="address" [(ngModel)]="address.address" required placeholder="Số nhà, đường, phường/xã" />
            </div>
            <div class="form-group">
              <label>Thành phố / Tỉnh *</label>
              <input type="text" name="city" [(ngModel)]="address.city" required />
            </div>
            <div class="form-group">
              <label>Ghi chú</label>
              <textarea name="note" [(ngModel)]="address.note" rows="3" placeholder="Ghi chú cho người giao hàng..."></textarea>
            </div>
            @if (error) { <div class="error">{{ error }}</div> }
            <button type="submit" class="btn-order" [disabled]="submitting || !f.valid">
              {{ submitting ? 'Đang xử lý...' : 'Đặt hàng' }}
            </button>
          </form>
          <div class="order-summary">
            <h2>Đơn hàng</h2>
            @for (item of cart.items; track item.id) {
              <div class="order-item">
                <span>{{ item.name }} × {{ item.quantity }}</span>
                <span>{{ item.price * item.quantity | currency:'VND':'symbol':'1.0-0' }}</span>
              </div>
            }
            <div class="total-row">
              <span>Tổng cộng</span>
              <strong>{{ cart.total | currency:'VND':'symbol':'1.0-0' }}</strong>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .container { max-width: 900px; margin: 0 auto; padding: 2rem 1rem; }
    h1 { font-size: 1.75rem; color: #1a1a2e; margin-bottom: 2rem; }
    .layout { display: grid; grid-template-columns: 1fr 340px; gap: 2rem; }
    @media (max-width: 768px) { .layout { grid-template-columns: 1fr; } }
    h2 { font-size: 1.2rem; color: #1a1a2e; margin-bottom: 1.25rem; }
    .form-group { margin-bottom: 1rem; }
    label { display: block; margin-bottom: 0.35rem; font-size: 0.9rem; color: #444; }
    input, textarea { width: 100%; padding: 0.65rem; border: 1px solid #ddd; border-radius: 4px; font-size: 0.95rem; box-sizing: border-box; }
    input:focus, textarea:focus { outline: none; border-color: #1a1a2e; }
    .error { background: #fef2f2; color: #c0392b; padding: 0.75rem; border-radius: 4px; margin-bottom: 1rem; font-size: 0.9rem; }
    .btn-order { background: #1a1a2e; color: white; border: none; padding: 1rem 2rem; border-radius: 4px; font-size: 1rem; cursor: pointer; width: 100%; transition: background 0.2s; }
    .btn-order:hover:not(:disabled) { background: #e8b86d; color: #1a1a2e; }
    .btn-order:disabled { opacity: 0.5; cursor: not-allowed; }
    .order-summary { background: #f8f8f8; border-radius: 8px; padding: 1.5rem; height: fit-content; }
    .order-item { display: flex; justify-content: space-between; padding: 0.5rem 0; font-size: 0.9rem; border-bottom: 1px solid #eee; }
    .total-row { display: flex; justify-content: space-between; padding: 1rem 0 0; font-size: 1.1rem; margin-top: 0.5rem; }
    .success-box { text-align: center; padding: 4rem 2rem; }
    .check { font-size: 4rem; color: #27ae60; margin-bottom: 1rem; }
    .success-box h2 { color: #27ae60; }
    .success-box p { color: #555; margin: 0.5rem 0; }
    .btn { display: inline-block; background: #1a1a2e; color: white; padding: 0.75rem 2rem; border-radius: 4px; text-decoration: none; margin-top: 1.5rem; }
  `]
})
export class CheckoutComponent implements OnInit {
  address: ShippingAddress = { fullName: '', phone: '', address: '', city: '' };
  submitting = false;
  error = '';
  success = false;
  orderId = '';

  get cart() { return this.cartService.cart(); }

  constructor(private cartService: CartService, private orderService: OrderService, private router: Router) {}

  ngOnInit() { this.cartService.loadCart().subscribe(); }

  placeOrder() {
    this.submitting = true;
    this.error = '';
    this.orderService.createOrder(this.address).subscribe({
      next: res => {
        this.orderId = res.order.id;
        this.cartService.clearLocal();
        this.success = true;
        this.submitting = false;
      },
      error: err => {
        this.error = err.error?.error || 'Có lỗi xảy ra. Vui lòng thử lại.';
        this.submitting = false;
      },
    });
  }
}
