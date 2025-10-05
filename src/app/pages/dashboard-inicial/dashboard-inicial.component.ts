import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { OcorrenciaService } from '../../services/ocorrencia.service';
import { ServicoPericialService } from '../../services/servico-pericial.service';

@Component({
  selector: 'app-dashboard-inicial',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-inicial.component.html',
  styleUrls: ['./dashboard-inicial.component.scss']
})
export class DashboardInicialComponent implements OnInit {
  currentUser: any = null;
  estatisticas: any = null;
  isLoading = true;
  servicosDisponiveis: any[] = []; // ← MUDANÇA: para todos os perfis
  servicoSelecionado: number | null = null;

  constructor(
    private authService: AuthService,
    private ocorrenciaService: OcorrenciaService,
    private servicoPericialService: ServicoPericialService // ← ADICIONAR
  ) {}

 ngOnInit(): void {
  this.currentUser = this.authService.getCurrentUser();
  console.log('🔍 Current User:', this.currentUser);
  console.log('🔍 Perfil:', this.currentUser?.perfil);
  console.log('🔍 Servicos Periciais:', this.currentUser?.servicos_periciais);

  this.loadServicos();
  this.loadEstatisticas();
}

loadServicos(): void {
  console.log('📌 LOAD SERVICOS INICIOU');

  if (this.isPerito() || this.isOperacional()) {
    // PERITO/OPERACIONAL: apenas serviços linkados
    this.servicosDisponiveis = this.currentUser.servicos_periciais || [];
    console.log('📌 Perito/Operacional - Servicos Disponiveis:', this.servicosDisponiveis);
  } else if (this.isAdminOrSuper()) {
    // ADMIN/SUPER: todos os serviços do sistema
    console.log('📌 Admin/Super - Buscando servicos via API');
    this.servicoPericialService.getAllForDropdown().subscribe({
      next: (servicos) => {
        this.servicosDisponiveis = servicos;
        console.log('📌 Servicos carregados da API:', this.servicosDisponiveis);
      },
      error: (err) => console.error('Erro ao carregar serviços:', err)
    });
  }
}

mostrarFiltroServico(): boolean {
  const resultado = this.isPerito() || this.isOperacional() || this.isAdminOrSuper();
  console.log('📌 mostrarFiltroServico():', resultado);
  console.log('📌 servicosDisponiveis.length:', this.servicosDisponiveis.length);
  return resultado;
}
  loadEstatisticas(): void {
    this.isLoading = true;
    const params: any = {};

    if (this.servicoSelecionado) {
      params.servico_id = this.servicoSelecionado;
    }

    this.ocorrenciaService.getEstatisticas(params).subscribe({
      next: (data) => {
        this.estatisticas = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erro ao carregar estatísticas:', err);
        this.isLoading = false;
      }
    });
  }

  onServicoChange(): void {
    this.loadEstatisticas();
  }

  getFirstName(fullName?: string): string {
    if (!fullName) return 'Usuário';
    return fullName.split(' ')[0];
  }

  isSuperAdmin(): boolean {
    return this.authService.isSuperAdmin();
  }

  isPerito(): boolean {
    return this.currentUser?.perfil === 'PERITO';
  }

  isOperacional(): boolean {
    return this.currentUser?.perfil === 'OPERACIONAL';
  }

  isAdminOrSuper(): boolean {
    return this.currentUser?.perfil === 'ADMINISTRATIVO' || this.isSuperAdmin();
  }

  isAdminOrOperacional(): boolean {
    return this.isOperacional() || this.isAdminOrSuper();
  }

  get today(): Date {
    return new Date();
  }
}
