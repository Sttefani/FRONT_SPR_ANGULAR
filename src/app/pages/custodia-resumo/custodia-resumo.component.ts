import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import {
  CustodiaService,
  CustodiaResumo,
  CustodiaResumoFiltros,
} from '../../services/custodia.service';
import { UnidadeDemandanteService, UnidadeDemandante } from '../../services/unidade-demandante.service';

@Component({
  selector: 'app-custodia-resumo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './custodia-resumo.component.html',
  styleUrls: ['./custodia-resumo.component.scss'],
})
export class CustodiaResumoComponent implements OnInit {

  resumo: CustodiaResumo | null = null;
  isLoading = true;
  erro: string | null = null;

  currentUser: any = null;

  servicoSelecionado: number | null = null;
  unidadeSelecionada: number | null = null;

  servicosDisponiveis: { id: number; sigla: string; nome: string }[] = [];
  unidadesDisponiveis: UnidadeDemandante[] = [];

  constructor(
    private authService: AuthService,
    private custodiaService: CustodiaService,
    private unidadeService: UnidadeDemandanteService,
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (!this.mostrarWidget()) return;

    if (this.isPeritoOuOperacional()) {
      this.servicosDisponiveis = this.currentUser?.servicos_periciais ?? [];
    }

    if (this.isAdminOrSuper()) {
      this.unidadeService.getAllForDropdown().subscribe({
        next: (u) => { this.unidadesDisponiveis = u; },
        error: (e) => console.error('Erro ao carregar unidades:', e),
      });
    }

    this.carregarResumo();
  }

  carregarResumo(): void {
    this.isLoading = true;
    this.erro = null;

    const filtros: CustodiaResumoFiltros = {};
    if (this.servicoSelecionado) filtros.servico_pericial_id = this.servicoSelecionado;
    if (this.unidadeSelecionada) filtros.unidade_demandante_id = this.unidadeSelecionada;

    this.custodiaService.getResumo(filtros).subscribe({
      next: (data) => { this.resumo = data; this.isLoading = false; },
      error: (e) => {
        console.error('Erro ao carregar resumo custódia:', e);
        this.erro = 'Não foi possível carregar os dados de custódia.';
        this.isLoading = false;
      },
    });
  }

  onFiltroChange(): void { this.carregarResumo(); }

  mostrarWidget(): boolean {
    return this.isPeritoOuOperacional() || this.isAdminOrSuper();
  }

  isPeritoOuOperacional(): boolean {
    return ['PERITO', 'OPERACIONAL'].includes(this.currentUser?.perfil);
  }

  isAdminOrSuper(): boolean {
    return ['ADMINISTRATIVO', 'SUPER_ADMIN'].includes(this.currentUser?.perfil)
      || this.currentUser?.is_superuser === true;
  }

  mostrarTabelaUnidades(): boolean {
    return this.isAdminOrSuper()
      && !this.unidadeSelecionada
      && (this.resumo?.vestigios_por_unidade?.length ?? 0) > 0;
  }

  get unidadeLabel(): string {
    const ud = this.currentUser?.unidade_demandante;
    return ud ? `${ud.sigla} – ${ud.nome}` : '';
  }
}
