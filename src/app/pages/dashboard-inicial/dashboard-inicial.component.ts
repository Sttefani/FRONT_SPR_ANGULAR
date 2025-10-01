import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard-inicial',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-inicial.component.html',
  styleUrls: ['./dashboard-inicial.component.scss']
})
export class DashboardInicialComponent implements OnInit {
  currentUser: any;
  today = new Date();

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
  }

  getFirstName(fullName: string | undefined): string {
    if (!fullName) {
      return 'Usuário';
    }
    return fullName.split(' ')[0];
  }

  isSuperAdmin(): boolean {
    return this.authService.isSuperAdmin();
  }

  // ← ADICIONE ESTE MÉTODO
  isPerito(): boolean {
    if (!this.currentUser?.perfil) {
      return false;
    }
    // Verifica se o perfil contém "PERITO" (ajuste conforme necessário)
    return this.currentUser.perfil.toUpperCase().includes('PERITO');
  }
}
