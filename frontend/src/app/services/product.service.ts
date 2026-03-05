import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Product, ProductsResponse, ProductFilters, Category } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getProducts(filters: ProductFilters = {}) {
    let params = new HttpParams();
    if (filters.category) params = params.set('category', filters.category);
    if (filters.search) params = params.set('search', filters.search);
    if (filters.minPrice != null) params = params.set('minPrice', filters.minPrice);
    if (filters.maxPrice != null) params = params.set('maxPrice', filters.maxPrice);
    if (filters.page) params = params.set('page', filters.page);
    if (filters.limit) params = params.set('limit', filters.limit);
    return this.http.get<ProductsResponse>(`${this.api}/products`, { params });
  }

  getProductBySlug(slug: string) {
    return this.http.get<Product>(`${this.api}/products/${slug}`);
  }

  getCategories() {
    return this.http.get<Category[]>(`${this.api}/products/categories`);
  }

  // Admin
  createProduct(data: Partial<Product>) {
    return this.http.post<Product>(`${this.api}/admin/products`, data);
  }

  updateProduct(id: string, data: Partial<Product>) {
    return this.http.put<Product>(`${this.api}/admin/products/${id}`, data);
  }

  deleteProduct(id: string) {
    return this.http.delete(`${this.api}/admin/products/${id}`);
  }
}
