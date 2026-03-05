import { Component, Input, Output, EventEmitter } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { Product } from '../../models/product.model';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [RouterLink, CurrencyPipe],
  template: `
    <div class="card">
      <a [routerLink]="['/products', product.slug]">
        <img [src]="product.images[0] || 'https://placehold.co/400x300/eee/999?text=No+Image'"
             [alt]="product.name" loading="lazy" />
      </a>
      <div class="card-body">
        <span class="category">{{ product.category_name }}</span>
        <h3><a [routerLink]="['/products', product.slug]">{{ product.name }}</a></h3>
        <div class="card-footer">
          <span class="price">{{ product.price | currency:'VND':'symbol':'1.0-0' }}</span>
          @if (product.stock_quantity > 0) {
            <button class="btn-add" (click)="addToCart.emit(product)">Thêm vào giỏ</button>
          } @else {
            <span class="out-of-stock">Hết hàng</span>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .card { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); transition: transform 0.2s, box-shadow 0.2s; }
    .card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,0.12); }
    img { width: 100%; height: 220px; object-fit: cover; display: block; }
    .card-body { padding: 1rem; }
    .category { font-size: 0.75rem; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
    h3 { margin: 0.25rem 0 0.75rem; font-size: 1rem; }
    h3 a { color: #1a1a2e; text-decoration: none; }
    h3 a:hover { color: #e8b86d; }
    .card-footer { display: flex; align-items: center; justify-content: space-between; }
    .price { font-weight: 700; color: #c0392b; font-size: 1.05rem; }
    .btn-add { background: #1a1a2e; color: white; border: none; padding: 0.5rem 0.75rem; border-radius: 4px; cursor: pointer; font-size: 0.85rem; transition: background 0.2s; }
    .btn-add:hover { background: #e8b86d; color: #1a1a2e; }
    .out-of-stock { font-size: 0.85rem; color: #e74c3c; font-weight: 500; }
  `]
})
export class ProductCardComponent {
  @Input({ required: true }) product!: Product;
  @Output() addToCart = new EventEmitter<Product>();
}
