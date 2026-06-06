import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CustodiaService, DashboardCustodiante } from '../../services/custodia.service';
import { ProtocoloService } from '../../services/protocolo.service';

@Component({
  selector: 'app-dashboard-custodiante',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './dashboard-custodiante.component.html',
  styleUrls: ['./dashboard-custodiante.component.scss'],
})
export class DashboardCustodianteComponent implements OnInit {

  dados: DashboardCustodiante | null = null;
  isLoading = true;
  erro: string | null = null;
  currentUser: any = null;
  protocolosPendentes = 0;

  constructor(
    private authService: AuthService,
    private custodiaService: CustodiaService,
    private protocoloService: ProtocoloService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.custodiaService.getDashboardCustodiante().subscribe({
      next: (data) => { this.dados = data; this.isLoading = false; },
      error: () => { this.erro = 'Erro ao carregar dados do painel.'; this.isLoading = false; },
    });
    this.protocoloService.getProtocolos({ status_recebimento: 'PENDENTE', page_size: 1 }).subscribe({
      next: (res) => { this.protocolosPendentes = res.count; },
      error: () => {},
    });
  }

  getFirstName(): string {
    const nome = this.currentUser?.nome_completo ?? '';
    return nome.split(' ')[0] || 'Usuário';
  }

  irParaProtocolosPendentes(): void {
    this.router.navigate(['/gabinete-virtual/custodia/protocolos'], {
      queryParams: { status_recebimento: 'PENDENTE' }
    });
  }

  get temPendencias(): boolean {
    return (this.dados?.alertas?.transferencias_pendentes ?? 0) > 0;
  }

  get totalUnidades(): number {
    return this.dados?.vestigios_por_unidade?.length ?? 0;
  }
}
