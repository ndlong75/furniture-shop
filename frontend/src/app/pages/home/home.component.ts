import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductCardComponent } from '../../components/product-card/product-card.component';
import { ProductService } from '../../services/product.service';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { Product, Category } from '../../models/product.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, ProductCardComponent],
  template: `
    <!-- Hero -->
    <section class="hero">
      <div class="hero-content">
        <h1>Nội thất đẹp<br>cho ngôi nhà của bạn</h1>
        <p>Khám phá bộ sưu tập nội thất cao cấp, thiết kế hiện đại<br>với chất lượng tốt nhất.</p>
        <a routerLink="/products" class="btn-cta">Khám phá ngay</a>
      </div>
    </section>

    <!-- Categories -->
    <section class="section">
      <div class="container">
        <h2 class="section-title">Danh mục sản phẩm</h2>
        <div class="categories-grid">
          @for (cat of categories; track cat.id) {
            <a [routerLink]="['/products']" [queryParams]="{category: cat.slug}" class="category-card">
              <div class="cat-icon">{{ catIcons[cat.slug] || '🪑' }}</div>
              <span>{{ cat.name }}</span>
            </a>
          }
        </div>
      </div>
    </section>

    <!-- Featured Products -->
    <section class="section bg-light">
      <div class="container">
        <h2 class="section-title">Sản phẩm nổi bật</h2>
        <div class="products-grid">
          @for (product of featured; track product.id) {
            <app-product-card [product]="product" (addToCart)="onAddToCart($event)" />
          }
        </div>
        <div class="text-center">
          <a routerLink="/products" class="btn-outline">Xem tất cả sản phẩm</a>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .hero { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); color: white; padding: 6rem 2rem; text-align: center; }
    .hero h1 { font-size: 3rem; margin-bottom: 1rem; line-height: 1.2; }
    .hero p { font-size: 1.1rem; opacity: 0.85; margin-bottom: 2rem; line-height: 1.6; }
    .btn-cta { background: #e8b86d; color: #1a1a2e; padding: 1rem 2.5rem; border-radius: 4px; text-decoration: none; font-weight: 700; font-size: 1.1rem; transition: opacity 0.2s; }
    .btn-cta:hover { opacity: 0.9; }
    .section { padding: 4rem 1rem; }
    .bg-light { background: #f8f8f8; }
    .container { max-width: 1200px; margin: 0 auto; }
    .section-title { text-align: center; font-size: 1.75rem; color: #1a1a2e; margin-bottom: 2rem; }
    .categories-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 1rem; }
    .category-card { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 1.5rem 1rem; background: white; border-radius: 8px; text-decoration: none; color: #333; box-shadow: 0 2px 6px rgba(0,0,0,0.06); transition: transform 0.2s; }
    .category-card:hover { transform: translateY(-3px); color: #e8b86d; }
    .cat-icon { font-size: 2rem; }
    .products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
    .text-center { text-align: center; }
    .btn-outline { border: 2px solid #1a1a2e; color: #1a1a2e; padding: 0.75rem 2rem; border-radius: 4px; text-decoration: none; font-weight: 600; transition: all 0.2s; }
    .btn-outline:hover { background: #1a1a2e; color: white; }
  `]
})
export class HomeComponent implements OnInit {
  categories: Category[] = [];
  featured: Product[] = [];
  catIcons: Record<string, string> = {
    sofa: '🛋️', chair: '🪑', table: '🪞', bed: '🛏️', storage: '🗄️', decor: '🖼️'
  };

  constructor(
    private productService: ProductService,
    private cartService: CartService,
    private auth: AuthService
  ) {}

  ngOnInit() {
    this.productService.getCategories().subscribe(cats => this.categories = cats);
    this.productService.getProducts({ limit: 8 }).subscribe(res => this.featured = res.products);
  }

  onAddToCart(product: Product) {
    if (!this.auth.isLoggedIn()) { window.location.href = '/auth/login'; return; }
    this.cartService.addItem(product.id).subscribe();
  }
}
