import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service'; // Ajuste o caminho se for diferente
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard-inicial',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-inicial.component.html',
  styleUrls: ['./dashboard-inicial.component.scss']
})
export class DashboardInicialComponent implements OnInit {

  // Estas são as propriedades que o seu HTML de boas-vindas precisa
  currentUser: any;
  today = new Date();

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    // Buscamos o usuário logado quando o componente inicia
    this.currentUser = this.authService.getCurrentUser();
  }

  // Esta é a função que o seu HTML usa para pegar o primeiro nome
  getFirstName(fullName: string | undefined): string {
    if (!fullName) {
      return 'Usuário';
    }
    return fullName.split(' ')[0];
  }

  // E esta é a função que o @if usa para verificar as permissões
  isSuperAdmin(): boolean {
    return this.authService.isSuperAdmin();
  }
}
