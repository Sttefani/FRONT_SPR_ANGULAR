import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { CustodiaService, DashboardExterno } from '../../services/custodia.service';

@Component({
  selector: 'app-dashboard-externo',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './dashboard-externo.component.html',
  styleUrls: ['./dashboard-externo.component.scss'],
})
export class DashboardExternoComponent implements OnInit {

  dados: DashboardExterno | null = null;
  isLoading = true;
  erro: string | null = null;
  currentUser: any = null;

  constructor(
    private authService: AuthService,
    private custodiaService: CustodiaService,
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.custodiaService.getDashboardExterno().subscribe({
      next: (data) => { this.dados = data; this.isLoading = false; },
      error: () => { this.erro = 'Erro ao carregar dados do painel.'; this.isLoading = false; },
    });
  }

  getFirstName(): string {
    const nome = this.currentUser?.nome_completo ?? '';
    return nome.split(' ')[0] || 'Usuário';
  }

  get temPendencias(): boolean {
    return (this.dados?.alertas?.transferencias_pendentes ?? 0) > 0;
  }
}
