import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../components/header/header.component';
import { FooterComponent } from '../../components/footer/footer.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-gabinete-virtual',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    HeaderComponent,
    FooterComponent
  ],
  templateUrl: './gabinete-virtual.component.html',
  styleUrls: ['./gabinete-virtual.component.scss']
})
export class GabineteVirtualComponent {

  constructor(private authService: AuthService) {}

  isSuperAdmin(): boolean {
    return this.authService.isSuperAdmin();
  }

  isGerencial(): boolean {
    const user = this.authService.getCurrentUser();
    return this.authService.isSuperAdmin() || user?.perfil === 'ADMINISTRATIVO';
  }
}
