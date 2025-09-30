import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router'; // Imports para o roteamento
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../components/header/header.component'; // Seus componentes de layout
import { FooterComponent } from '../../components/footer/footer.component';
import { AuthService } from '../../services/auth.service'; // Importamos para a função isSuperAdmin

@Component({
  selector: 'app-gabinete-virtual',
  standalone: true,
  // Adicionamos todos os módulos que o HTML do layout precisa
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

  // A única função que PRECISA ficar aqui é a isSuperAdmin(),
  // porque o menu lateral (que está neste componente) a utiliza.
  constructor(private authService: AuthService) {}

  isSuperAdmin(): boolean {
    return this.authService.isSuperAdmin();
  }
}
