import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  template: `
    <footer class="footer">
      <div class="container">
        <div class="footer-grid">
          <div>
            <h3>🪑 FurnitureShop</h3>
            <p>Nội thất cao cấp, phong cách sống hiện đại.</p>
          </div>
          <div>
            <h4>Danh mục</h4>
            <ul>
              <li><a routerLink="/products" [queryParams]="{category: 'sofa'}">Sofa</a></li>
              <li><a routerLink="/products" [queryParams]="{category: 'bed'}">Giường</a></li>
              <li><a routerLink="/products" [queryParams]="{category: 'table'}">Bàn</a></li>
              <li><a routerLink="/products" [queryParams]="{category: 'chair'}">Ghế</a></li>
            </ul>
          </div>
          <div>
            <h4>Hỗ trợ</h4>
            <ul>
              <li><a routerLink="/orders">Theo dõi đơn hàng</a></li>
              <li><a href="#">Chính sách đổi trả</a></li>
              <li><a href="#">Liên hệ</a></li>
            </ul>
          </div>
        </div>
        <div class="footer-bottom">
          <p>© 2025 FurnitureShop. All rights reserved.</p>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    .footer { background: #1a1a2e; color: rgba(255,255,255,0.8); padding: 3rem 1rem 1rem; margin-top: 4rem; }
    .container { max-width: 1200px; margin: 0 auto; }
    .footer-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 2rem; }
    h3 { color: #e8b86d; margin-bottom: 0.5rem; }
    h4 { color: white; margin-bottom: 1rem; }
    ul { list-style: none; padding: 0; }
    li { margin-bottom: 0.5rem; }
    a { color: rgba(255,255,255,0.7); text-decoration: none; }
    a:hover { color: #e8b86d; }
    p { font-size: 0.9rem; line-height: 1.6; }
    .footer-bottom { border-top: 1px solid rgba(255,255,255,0.1); margin-top: 2rem; padding-top: 1rem; text-align: center; font-size: 0.85rem; }
  `]
})
export class FooterComponent {}
