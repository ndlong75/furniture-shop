import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Cart } from '../models/cart.model';

@Injectable({ providedIn: 'root' })
export class CartService {
  readonly cart = signal<Cart>({ items: [], total: 0 });
  readonly itemCount = signal<number>(0);

  constructor(private http: HttpClient) {}

  loadCart() {
    return this.http.get<Cart>(`${environment.apiUrl}/cart`).pipe(
      tap(cart => {
        this.cart.set(cart);
        this.itemCount.set(cart.items.reduce((sum, i) => sum + i.quantity, 0));
      })
    );
  }

  addItem(productId: string, quantity = 1) {
    return this.http.post(`${environment.apiUrl}/cart`, { productId, quantity }).pipe(
      tap(() => this.loadCart().subscribe())
    );
  }

  updateItem(itemId: string, quantity: number) {
    return this.http.put(`${environment.apiUrl}/cart/${itemId}`, { quantity }).pipe(
      tap(() => this.loadCart().subscribe())
    );
  }

  removeItem(itemId: string) {
    return this.http.delete(`${environment.apiUrl}/cart/${itemId}`).pipe(
      tap(() => this.loadCart().subscribe())
    );
  }

  clearLocal() {
    this.cart.set({ items: [], total: 0 });
    this.itemCount.set(0);
  }
}
