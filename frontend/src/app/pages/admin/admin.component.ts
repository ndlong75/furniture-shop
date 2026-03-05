import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ProductService } from '../../services/product.service';
import { OrderService } from '../../services/order.service';
import { Product, Category } from '../../models/product.model';
import { Order, OrderStatus } from '../../models/order.model';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [FormsModule, CurrencyPipe, DatePipe],
  template: `
    <div class="container">
      <h1>Admin Dashboard</h1>
      <div class="tabs">
        <button [class.active]="tab === 'products'" (click)="tab = 'products'">Sản phẩm</button>
        <button [class.active]="tab === 'orders'" (click)="tab = 'orders'; loadOrders()">Đơn hàng</button>
      </div>

      <!-- Products Tab -->
      @if (tab === 'products') {
        <div>
          <button class="btn-new" (click)="openForm()">+ Thêm sản phẩm</button>
          @if (showForm) {
            <div class="form-panel">
              <h3>{{ editId ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới' }}</h3>
              <div class="form-grid">
                <div class="form-group"><label>Tên *</label><input [(ngModel)]="form.name" /></div>
                <div class="form-group"><label>Danh mục</label>
                  <select [(ngModel)]="form.category_id">
                    @for (c of categories; track c.id) { <option [value]="c.id">{{ c.name }}</option> }
                  </select>
                </div>
                <div class="form-group"><label>Giá (VND) *</label><input type="number" [(ngModel)]="form.price" /></div>
                <div class="form-group"><label>Tồn kho</label><input type="number" [(ngModel)]="form.stock_quantity" /></div>
                <div class="form-group full"><label>Mô tả</label><textarea [(ngModel)]="form.description" rows="3"></textarea></div>
                <div class="form-group full"><label>URL ảnh (JSON array)</label><input [(ngModel)]="imagesStr" placeholder='["https://..."]' /></div>
              </div>
              @if (formError) { <div class="error">{{ formError }}</div> }
              <div class="form-actions">
                <button class="btn-save" (click)="saveProduct()">{{ editId ? 'Lưu thay đổi' : 'Tạo sản phẩm' }}</button>
                <button class="btn-cancel" (click)="closeForm()">Hủy</button>
              </div>
            </div>
          }
          <table>
            <thead><tr><th>Tên</th><th>Danh mục</th><th>Giá</th><th>Tồn kho</th><th>Thao tác</th></tr></thead>
            <tbody>
              @for (p of products; track p.id) {
                <tr>
                  <td>{{ p.name }}</td>
                  <td>{{ p.category_name }}</td>
                  <td>{{ p.price | currency:'VND':'symbol':'1.0-0' }}</td>
                  <td>{{ p.stock_quantity }}</td>
                  <td class="actions">
                    <button (click)="editProduct(p)">Sửa</button>
                    <button class="btn-del" (click)="deleteProduct(p.id)">Xóa</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- Orders Tab -->
      @if (tab === 'orders') {
        <table>
          <thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Ngày</th><th>Tổng</th><th>Trạng thái</th></tr></thead>
          <tbody>
            @for (o of orders; track o.id) {
              <tr>
                <td class="mono">#{{ o.id.substring(0,8).toUpperCase() }}</td>
                <td>{{ (o as any).user_name }}</td>
                <td>{{ o.created_at | date:'dd/MM/yy HH:mm' }}</td>
                <td>{{ o.total_amount | currency:'VND':'symbol':'1.0-0' }}</td>
                <td>
                  <select [value]="o.status" (change)="updateStatus(o.id, $event)">
                    @for (s of statuses; track s.value) {
                      <option [value]="s.value">{{ s.label }}</option>
                    }
                  </select>
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
  styles: [`
    .container { max-width: 1200px; margin: 0 auto; padding: 2rem 1rem; }
    h1 { font-size: 1.75rem; color: #1a1a2e; margin-bottom: 1.5rem; }
    .tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; }
    .tabs button { padding: 0.6rem 1.5rem; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer; }
    .tabs button.active { background: #1a1a2e; color: white; border-color: #1a1a2e; }
    .btn-new { background: #27ae60; color: white; border: none; padding: 0.6rem 1.25rem; border-radius: 4px; cursor: pointer; margin-bottom: 1rem; }
    .form-panel { background: #f8f8f8; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; }
    .form-panel h3 { margin-top: 0; color: #1a1a2e; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .form-group.full { grid-column: 1 / -1; }
    .form-group label { display: block; margin-bottom: 0.35rem; font-size: 0.85rem; color: #555; }
    .form-group input, .form-group select, .form-group textarea { width: 100%; padding: 0.55rem; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
    .form-actions { display: flex; gap: 0.75rem; margin-top: 1rem; }
    .btn-save { background: #1a1a2e; color: white; border: none; padding: 0.65rem 1.5rem; border-radius: 4px; cursor: pointer; }
    .btn-cancel { background: white; border: 1px solid #ddd; padding: 0.65rem 1.5rem; border-radius: 4px; cursor: pointer; }
    .error { color: #c0392b; font-size: 0.9rem; margin: 0.5rem 0; }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    th { background: #f8f8f8; padding: 0.75rem; text-align: left; border-bottom: 2px solid #e5e5e5; }
    td { padding: 0.75rem; border-bottom: 1px solid #f0f0f0; }
    .actions { display: flex; gap: 0.5rem; }
    .actions button { padding: 0.3rem 0.75rem; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer; font-size: 0.8rem; }
    .btn-del { color: #e74c3c; border-color: #e74c3c !important; }
    .mono { font-family: monospace; font-size: 0.85rem; }
    select { padding: 0.3rem; border: 1px solid #ddd; border-radius: 4px; font-size: 0.85rem; }
  `]
})
export class AdminComponent implements OnInit {
  tab = 'products';
  products: Product[] = [];
  categories: Category[] = [];
  orders: Order[] = [];
  showForm = false;
  editId: string | null = null;
  form: Partial<Product> = {};
  imagesStr = '[]';
  formError = '';
  statuses = [
    { value: 'pending', label: 'Chờ xác nhận' }, { value: 'processing', label: 'Đang xử lý' },
    { value: 'shipped', label: 'Đang giao' }, { value: 'delivered', label: 'Đã giao' },
    { value: 'cancelled', label: 'Đã hủy' },
  ];

  constructor(private productService: ProductService, private orderService: OrderService) {}

  ngOnInit() {
    this.productService.getCategories().subscribe(c => this.categories = c);
    this.productService.getProducts({ limit: 100 }).subscribe(r => this.products = r.products);
  }

  openForm() { this.showForm = true; this.editId = null; this.form = {}; this.imagesStr = '[]'; }
  closeForm() { this.showForm = false; this.formError = ''; }

  editProduct(p: Product) {
    this.showForm = true;
    this.editId = p.id;
    this.form = { ...p };
    this.imagesStr = JSON.stringify(p.images);
  }

  saveProduct() {
    try { this.form.images = JSON.parse(this.imagesStr); } catch { this.formError = 'Images JSON không hợp lệ'; return; }
    const op = this.editId
      ? this.productService.updateProduct(this.editId, this.form)
      : this.productService.createProduct(this.form);
    op.subscribe({
      next: () => { this.closeForm(); this.productService.getProducts({ limit: 100 }).subscribe(r => this.products = r.products); },
      error: err => { this.formError = err.error?.error || 'Lỗi'; },
    });
  }

  deleteProduct(id: string) {
    if (!confirm('Xác nhận xóa sản phẩm này?')) return;
    this.productService.deleteProduct(id).subscribe(() =>
      this.products = this.products.filter(p => p.id !== id)
    );
  }

  loadOrders() { this.orderService.getAllOrders().subscribe(o => this.orders = o); }

  updateStatus(id: string, event: Event) {
    const status = (event.target as HTMLSelectElement).value;
    this.orderService.updateStatus(id, status).subscribe();
  }
}
