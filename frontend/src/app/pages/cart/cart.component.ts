import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { CartService } from '../../services/cart.service';
import { CartItem } from '../../models/cart.model';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [RouterLink, CurrencyPipe],
  template: `
    <div class="container">
      <h1>Giỏ hàng</h1>
      @if (cart.items.length === 0) {
        <div class="empty">
          <p>Giỏ hàng trống.</p>
          <a routerLink="/products" class="btn">Tiếp tục mua sắm</a>
        </div>
      } @else {
        <div class="layout">
          <div class="items">
            @for (item of cart.items; track item.id) {
              <div class="item">
                <img [src]="item.image || 'https://placehold.co/100x80?text=No+Img'" [alt]="item.name" />
                <div class="item-info">
                  <a [routerLink]="['/products', item.slug]">{{ item.name }}</a>
                  <span class="unit-price">{{ item.price | currency:'VND':'symbol':'1.0-0' }}</span>
                </div>
                <div class="qty-controls">
                  <button (click)="update(item, item.quantity - 1)">−</button>
                  <span>{{ item.quantity }}</span>
                  <button (click)="update(item, item.quantity + 1)" [disabled]="item.quantity >= item.stock_quantity">+</button>
                </div>
                <span class="subtotal">{{ item.price * item.quantity | currency:'VND':'symbol':'1.0-0' }}</span>
                <button class="btn-remove" (click)="remove(item)">✕</button>
              </div>
            }
          </div>
          <div class="summary">
            <h3>Tóm tắt đơn hàng</h3>
            <div class="summary-row"><span>Tạm tính</span><span>{{ cart.total | currency:'VND':'symbol':'1.0-0' }}</span></div>
            <div class="summary-row"><span>Phí vận chuyển</span><span>Miễn phí</span></div>
            <div class="summary-row total"><span>Tổng cộng</span><span>{{ cart.total | currency:'VND':'symbol':'1.0-0' }}</span></div>
            <a routerLink="/checkout" class="btn-checkout">Tiến hành thanh toán</a>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .container { max-width: 1100px; margin: 0 auto; padding: 2rem 1rem; }
    h1 { font-size: 1.75rem; color: #1a1a2e; margin-bottom: 2rem; }
    .empty { text-align: center; padding: 4rem; }
    .empty p { color: #888; margin-bottom: 1rem; }
    .btn { background: #1a1a2e; color: white; padding: 0.75rem 2rem; border-radius: 4px; text-decoration: none; }
    .layout { display: grid; grid-template-columns: 1fr 320px; gap: 2rem; }
    @media (max-width: 768px) { .layout { grid-template-columns: 1fr; } }
    .item { display: flex; align-items: center; gap: 1rem; padding: 1rem 0; border-bottom: 1px solid #eee; }
    .item img { width: 100px; height: 80px; object-fit: cover; border-radius: 4px; }
    .item-info { flex: 1; }
    .item-info a { color: #1a1a2e; text-decoration: none; font-weight: 500; display: block; margin-bottom: 0.25rem; }
    .unit-price { color: #888; font-size: 0.9rem; }
    .qty-controls { display: flex; align-items: center; gap: 0.75rem; }
    .qty-controls button { width: 30px; height: 30px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer; font-size: 1rem; }
    .qty-controls button:disabled { opacity: 0.4; cursor: not-allowed; }
    .subtotal { font-weight: 600; min-width: 120px; text-align: right; }
    .btn-remove { background: none; border: none; color: #888; cursor: pointer; font-size: 1rem; padding: 0.25rem; }
    .btn-remove:hover { color: #e74c3c; }
    .summary { background: #f8f8f8; border-radius: 8px; padding: 1.5rem; height: fit-content; }
    .summary h3 { margin-top: 0; margin-bottom: 1rem; color: #1a1a2e; }
    .summary-row { display: flex; justify-content: space-between; padding: 0.5rem 0; font-size: 0.95rem; }
    .summary-row.total { border-top: 2px solid #ddd; margin-top: 0.5rem; padding-top: 1rem; font-weight: 700; font-size: 1.1rem; }
    .btn-checkout { display: block; background: #1a1a2e; color: white; text-align: center; padding: 1rem; border-radius: 4px; text-decoration: none; font-weight: 600; margin-top: 1.5rem; transition: background 0.2s; }
    .btn-checkout:hover { background: #e8b86d; color: #1a1a2e; }
  `]
})
export class CartComponent implements OnInit {
  get cart() { return this.cartService.cart(); }

  constructor(private cartService: CartService) {}

  ngOnInit() { this.cartService.loadCart().subscribe(); }

  update(item: CartItem, qty: number) {
    if (qty < 1) { this.remove(item); return; }
    this.cartService.updateItem(item.id, qty).subscribe();
  }

  remove(item: CartItem) {
    this.cartService.removeItem(item.id).subscribe();
  }
}
