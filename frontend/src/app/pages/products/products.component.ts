import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProductCardComponent } from '../../components/product-card/product-card.component';
import { ProductService } from '../../services/product.service';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { Product, Category, ProductFilters } from '../../models/product.model';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [RouterLink, FormsModule, ProductCardComponent],
  template: `
    <div class="container">
      <div class="page-header">
        <h1>Tất cả sản phẩm</h1>
      </div>
      <div class="layout">
        <!-- Sidebar filters -->
        <aside class="sidebar">
          <h3>Danh mục</h3>
          <ul class="cat-list">
            <li [class.active]="!filters.category">
              <a href="#" (click)="setCategory(null, $event)">Tất cả</a>
            </li>
            @for (cat of categories; track cat.id) {
              <li [class.active]="filters.category === cat.slug">
                <a href="#" (click)="setCategory(cat.slug, $event)">{{ cat.name }}</a>
              </li>
            }
          </ul>
          <h3>Giá</h3>
          <div class="price-inputs">
            <input type="number" [(ngModel)]="filters.minPrice" placeholder="Từ" (change)="load()" />
            <input type="number" [(ngModel)]="filters.maxPrice" placeholder="Đến" (change)="load()" />
          </div>
        </aside>

        <!-- Product grid -->
        <div class="main">
          <div class="toolbar">
            <input type="search" [(ngModel)]="searchTerm" placeholder="Tìm kiếm sản phẩm..." (keyup.enter)="onSearch()" />
            <span class="count">{{ total }} sản phẩm</span>
          </div>
          @if (loading) {
            <div class="loading">Đang tải...</div>
          } @else if (products.length === 0) {
            <div class="empty">Không tìm thấy sản phẩm nào.</div>
          } @else {
            <div class="products-grid">
              @for (product of products; track product.id) {
                <app-product-card [product]="product" (addToCart)="onAddToCart($event)" />
              }
            </div>
          }
          <!-- Pagination -->
          @if (totalPages > 1) {
            <div class="pagination">
              @for (p of pages; track p) {
                <button [class.active]="p === filters.page" (click)="setPage(p)">{{ p }}</button>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .container { max-width: 1200px; margin: 0 auto; padding: 2rem 1rem; }
    .page-header h1 { font-size: 1.75rem; color: #1a1a2e; margin-bottom: 1.5rem; }
    .layout { display: grid; grid-template-columns: 220px 1fr; gap: 2rem; }
    @media (max-width: 768px) { .layout { grid-template-columns: 1fr; } .sidebar { display: none; } }
    .sidebar h3 { font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.5px; color: #888; margin: 1.5rem 0 0.5rem; }
    .sidebar h3:first-child { margin-top: 0; }
    .cat-list { list-style: none; padding: 0; }
    .cat-list li { padding: 0.4rem 0; }
    .cat-list a { color: #444; text-decoration: none; }
    .cat-list li.active a { color: #e8b86d; font-weight: 600; }
    .price-inputs { display: flex; gap: 0.5rem; }
    .price-inputs input { width: 100%; padding: 0.4rem; border: 1px solid #ddd; border-radius: 4px; font-size: 0.9rem; }
    .toolbar { display: flex; gap: 1rem; align-items: center; margin-bottom: 1.5rem; }
    .toolbar input { flex: 1; padding: 0.6rem 1rem; border: 1px solid #ddd; border-radius: 4px; font-size: 0.95rem; }
    .count { color: #888; font-size: 0.9rem; white-space: nowrap; }
    .products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1.5rem; }
    .loading, .empty { text-align: center; padding: 3rem; color: #888; }
    .pagination { display: flex; gap: 0.5rem; margin-top: 2rem; justify-content: center; }
    .pagination button { padding: 0.5rem 0.9rem; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer; }
    .pagination button.active { background: #1a1a2e; color: white; border-color: #1a1a2e; }
  `]
})
export class ProductsComponent implements OnInit {
  products: Product[] = [];
  categories: Category[] = [];
  filters: ProductFilters = { page: 1, limit: 12 };
  searchTerm = '';
  total = 0;
  totalPages = 0;
  loading = false;

  get pages() { return Array.from({ length: this.totalPages }, (_, i) => i + 1); }

  constructor(
    private productService: ProductService,
    private cartService: CartService,
    private auth: AuthService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.productService.getCategories().subscribe(cats => this.categories = cats);
    this.route.queryParams.subscribe(params => {
      if (params['category']) this.filters.category = params['category'];
      this.load();
    });
  }

  load() {
    this.loading = true;
    this.productService.getProducts({ ...this.filters, search: this.searchTerm }).subscribe(res => {
      this.products = res.products;
      this.total = res.pagination.total;
      this.totalPages = res.pagination.pages;
      this.loading = false;
    });
  }

  setCategory(slug: string | null, event: Event) {
    event.preventDefault();
    this.filters.category = slug || undefined;
    this.filters.page = 1;
    this.load();
  }

  onSearch() {
    this.filters.page = 1;
    this.load();
  }

  setPage(page: number) {
    this.filters.page = page;
    this.load();
    window.scrollTo(0, 0);
  }

  onAddToCart(product: Product) {
    if (!this.auth.isLoggedIn()) { window.location.href = '/auth/login'; return; }
    this.cartService.addItem(product.id).subscribe();
  }
}
