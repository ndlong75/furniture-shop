import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="navbar">
      <div class="container">
        <a routerLink="/" class="brand">🪑 FurnitureShop</a>
        <div class="nav-links">
          <a routerLink="/products" routerLinkActive="active">Sản phẩm</a>
          @if (auth.isLoggedIn()) {
            <a routerLink="/orders" routerLinkActive="active">Đơn hàng</a>
            @if (auth.isAdmin()) {
              <a routerLink="/admin" routerLinkActive="active">Quản trị</a>
            }
            <a routerLink="/cart" class="cart-link">
              🛒 <span class="badge">{{ cart.itemCount() }}</span>
            </a>
            <button class="btn-logout" (click)="auth.logout()">Đăng xuất</button>
          } @else {
            <a routerLink="/auth/login">Đăng nhập</a>
            <a routerLink="/auth/register" class="btn-primary">Đăng ký</a>
          }
        </div>
      </div>
    </nav>
  `,
  styles: [`
    .navbar { background: #1a1a2e; color: white; padding: 0 1rem; position: sticky; top: 0; z-index: 100; }
    .container { max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; height: 64px; }
    .brand { color: white; text-decoration: none; font-size: 1.25rem; font-weight: 700; }
    .nav-links { display: flex; align-items: center; gap: 1.5rem; }
    .nav-links a { color: rgba(255,255,255,0.85); text-decoration: none; font-size: 0.95rem; transition: color 0.2s; }
    .nav-links a:hover, .nav-links a.active { color: #e8b86d; }
    .cart-link { position: relative; }
    .badge { background: #e74c3c; color: white; border-radius: 50%; padding: 2px 6px; font-size: 0.75rem; }
    .btn-primary { background: #e8b86d; color: #1a1a2e !important; padding: 0.4rem 1rem; border-radius: 4px; font-weight: 600; }
    .btn-logout { background: none; border: 1px solid rgba(255,255,255,0.4); color: rgba(255,255,255,0.85); padding: 0.4rem 1rem; border-radius: 4px; cursor: pointer; font-size: 0.95rem; }
    .btn-logout:hover { border-color: white; color: white; }
  `]
})
export class NavbarComponent {
  constructor(public auth: AuthService, public cart: CartService) {}
}
