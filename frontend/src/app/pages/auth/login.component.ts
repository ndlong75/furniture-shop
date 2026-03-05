import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <h1>Đăng nhập</h1>
        <form (ngSubmit)="submit()" #f="ngForm">
          <div class="form-group">
            <label>Email</label>
            <input type="email" name="email" [(ngModel)]="email" required autocomplete="email" />
          </div>
          <div class="form-group">
            <label>Mật khẩu</label>
            <input type="password" name="password" [(ngModel)]="password" required autocomplete="current-password" />
          </div>
          @if (error) { <div class="error">{{ error }}</div> }
          <button type="submit" [disabled]="submitting || !f.valid">
            {{ submitting ? 'Đang xử lý...' : 'Đăng nhập' }}
          </button>
        </form>
        <p class="link">Chưa có tài khoản? <a routerLink="/auth/register">Đăng ký ngay</a></p>
      </div>
    </div>
  `,
  styles: [`
    .auth-page { min-height: 80vh; display: flex; align-items: center; justify-content: center; padding: 2rem; background: #f8f8f8; }
    .auth-card { background: white; border-radius: 8px; padding: 2.5rem; width: 100%; max-width: 420px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    h1 { font-size: 1.5rem; color: #1a1a2e; margin-bottom: 1.5rem; }
    .form-group { margin-bottom: 1rem; }
    label { display: block; margin-bottom: 0.35rem; font-size: 0.9rem; color: #444; }
    input { width: 100%; padding: 0.65rem; border: 1px solid #ddd; border-radius: 4px; font-size: 0.95rem; box-sizing: border-box; }
    input:focus { outline: none; border-color: #1a1a2e; }
    .error { background: #fef2f2; color: #c0392b; padding: 0.75rem; border-radius: 4px; margin-bottom: 1rem; font-size: 0.9rem; }
    button { width: 100%; background: #1a1a2e; color: white; border: none; padding: 0.85rem; border-radius: 4px; font-size: 1rem; cursor: pointer; margin-top: 0.5rem; }
    button:hover:not(:disabled) { background: #e8b86d; color: #1a1a2e; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .link { text-align: center; margin-top: 1.25rem; font-size: 0.9rem; color: #555; }
    .link a { color: #1a1a2e; font-weight: 600; text-decoration: none; }
  `]
})
export class LoginComponent {
  email = '';
  password = '';
  submitting = false;
  error = '';

  constructor(private auth: AuthService, private cart: CartService, private router: Router) {}

  submit() {
    this.submitting = true;
    this.error = '';
    this.auth.login(this.email, this.password).subscribe({
      next: () => { this.cart.loadCart().subscribe(); this.router.navigate(['/']); },
      error: err => { this.error = err.error?.error || 'Đăng nhập thất bại'; this.submitting = false; },
    });
  }
}
