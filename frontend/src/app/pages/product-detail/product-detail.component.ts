import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CurrencyPipe, KeyValuePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../services/product.service';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { Product } from '../../models/product.model';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, KeyValuePipe, FormsModule],
  template: `
    @if (product) {
      <div class="container">
        <nav class="breadcrumb">
          <a routerLink="/">Trang chủ</a> /
          <a routerLink="/products">Sản phẩm</a> /
          <a [routerLink]="['/products']" [queryParams]="{category: product.category_slug}">{{ product.category_name }}</a> /
          <span>{{ product.name }}</span>
        </nav>
        <div class="detail-grid">
          <div class="images">
            <img [src]="selectedImage" [alt]="product.name" class="main-image" />
            @if (product.images.length > 1) {
              <div class="thumbnails">
                @for (img of product.images; track img) {
                  <img [src]="img" (click)="selectedImage = img" [class.active]="img === selectedImage" />
                }
              </div>
            }
          </div>
          <div class="info">
            <span class="category">{{ product.category_name }}</span>
            <h1>{{ product.name }}</h1>
            <div class="price">{{ product.price | currency:'VND':'symbol':'1.0-0' }}</div>
            @if (product.stock_quantity > 0) {
              <p class="stock in-stock">✓ Còn hàng ({{ product.stock_quantity }} sản phẩm)</p>
            } @else {
              <p class="stock out">✗ Hết hàng</p>
            }
            <div class="quantity-row">
              <label>Số lượng:</label>
              <input type="number" [(ngModel)]="quantity" min="1" [max]="product.stock_quantity" />
            </div>
            <button class="btn-add" [disabled]="product.stock_quantity === 0" (click)="addToCart()">
              🛒 Thêm vào giỏ hàng
            </button>
            <div class="attributes">
              <h3>Thông số</h3>
              <table>
                @for (attr of product.attributes | keyvalue; track attr.key) {
                  <tr>
                    <td class="attr-key">{{ attr.key }}</td>
                    <td>{{ attr.value }}</td>
                  </tr>
                }
              </table>
            </div>
            <div class="description">
              <h3>Mô tả</h3>
              <p>{{ product.description }}</p>
            </div>
          </div>
        </div>
      </div>
    } @else if (loading) {
      <div class="loading">Đang tải...</div>
    } @else {
      <div class="not-found">Sản phẩm không tồn tại. <a routerLink="/products">Quay lại</a></div>
    }
  `,
  styles: [`
    .container { max-width: 1100px; margin: 0 auto; padding: 2rem 1rem; }
    .breadcrumb { font-size: 0.85rem; color: #888; margin-bottom: 2rem; }
    .breadcrumb a { color: #555; text-decoration: none; }
    .breadcrumb a:hover { color: #e8b86d; }
    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; }
    @media (max-width: 768px) { .detail-grid { grid-template-columns: 1fr; } }
    .main-image { width: 100%; height: 420px; object-fit: cover; border-radius: 8px; }
    .thumbnails { display: flex; gap: 0.5rem; margin-top: 0.75rem; }
    .thumbnails img { width: 80px; height: 60px; object-fit: cover; border-radius: 4px; cursor: pointer; opacity: 0.6; border: 2px solid transparent; }
    .thumbnails img.active { opacity: 1; border-color: #e8b86d; }
    .category { font-size: 0.8rem; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
    h1 { font-size: 1.6rem; color: #1a1a2e; margin: 0.5rem 0; }
    .price { font-size: 1.8rem; font-weight: 700; color: #c0392b; margin: 1rem 0; }
    .stock { font-size: 0.9rem; margin-bottom: 1rem; }
    .in-stock { color: #27ae60; }
    .out { color: #e74c3c; }
    .quantity-row { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; }
    .quantity-row input { width: 80px; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem; }
    .btn-add { background: #1a1a2e; color: white; border: none; padding: 1rem 2rem; border-radius: 4px; font-size: 1rem; cursor: pointer; width: 100%; transition: background 0.2s; }
    .btn-add:hover:not(:disabled) { background: #e8b86d; color: #1a1a2e; }
    .btn-add:disabled { opacity: 0.5; cursor: not-allowed; }
    h3 { font-size: 1rem; color: #1a1a2e; margin: 1.5rem 0 0.75rem; border-top: 1px solid #eee; padding-top: 1rem; }
    table { width: 100%; font-size: 0.9rem; }
    tr { border-bottom: 1px solid #f0f0f0; }
    td { padding: 0.4rem 0; }
    .attr-key { color: #888; width: 40%; text-transform: capitalize; }
    .description p { color: #555; line-height: 1.7; }
    .loading, .not-found { text-align: center; padding: 4rem; color: #888; }
  `]
})
export class ProductDetailComponent implements OnInit {
  product: Product | null = null;
  selectedImage = '';
  quantity = 1;
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private productService: ProductService,
    private cartService: CartService,
    private auth: AuthService
  ) {}

  ngOnInit() {
    const slug = this.route.snapshot.paramMap.get('slug')!;
    this.productService.getProductBySlug(slug).subscribe({
      next: p => { this.product = p; this.selectedImage = p.images[0] || ''; this.loading = false; },
      error: () => this.loading = false,
    });
  }

  addToCart() {
    if (!this.auth.isLoggedIn()) { window.location.href = '/auth/login'; return; }
    this.cartService.addItem(this.product!.id, this.quantity).subscribe();
  }
}
