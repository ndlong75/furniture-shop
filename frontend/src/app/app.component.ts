import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';
import { FooterComponent } from './components/footer/footer.component';
import { AuthService } from './services/auth.service';
import { CartService } from './services/cart.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, FooterComponent],
  template: `
    <app-navbar />
    <main class="main-content">
      <router-outlet />
    </main>
    <app-footer />
  `,
  styles: [`
    .main-content { min-height: calc(100vh - 64px - 200px); }
  `]
})
export class AppComponent implements OnInit {
  constructor(private auth: AuthService, private cart: CartService) {}

  ngOnInit() {
    if (this.auth.isLoggedIn()) {
      this.cart.loadCart().subscribe();
    }
  }
}
