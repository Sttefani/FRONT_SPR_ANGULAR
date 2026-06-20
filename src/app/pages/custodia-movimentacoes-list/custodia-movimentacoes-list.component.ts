import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

import {
  CustodiaService,
  VestigioMovimentacao,
  VestigioMovimentacaoFiltros,
} from '../../services/custodia.service';
import { AuthService } from '../../services/auth.service';
import { ServicoPericialService } from '../../services/servico-pericial.service';
import { UnidadeDemandanteService } from '../../services/unidade-demandante.service';
import { PaginadorComponent } from '../../components/paginador/paginador.component';

type TabMov = '' | 'aguardando' | 'pendentes' | 'aceitas';

@Component({
  selector: 'app-custodia-movimentacoes-list',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginadorComponent],
  templateUrl: './custodia-movimentacoes-list.component.html',
  styleUrls: ['./custodia-movimentacoes-list.component.scss'],
})
export class CustodiaMovimentacoesListComponent implements OnInit {

  movimentacoes: VestigioMovimentacao[] = [];
  isLoading = true;
  message = '';
  messageType: 'success' | 'error' = 'success';

  // Paginação
  totalCount = 0;
  currentPage = 1;
  pageSize = 15;

  // Tab de status
  tabAtiva: TabMov = '';

  // Filtros
  filtroSearch = '';
  filtroServico: number | '' = '';
  filtroUnidade: number | '' = '';
  filtroDataDe = '';
  filtroDataAte = '';

  // Dropdowns
  servicos: any[] = [];
  unidades: any[] = [];

  // Perfil
  isCustodiante = false;
  aceitandoId: number | null = null;

  constructor(
    private custodiaService: CustodiaService,
    private authService: AuthService,
    private servicoPericialService: ServicoPericialService,
    private unidadeDemandanteService: UnidadeDemandanteService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.isCustodiante = user?.perfil !== 'EXTERNO';
    this.carregarDropdowns();
    this.buscar();
  }

  carregarDropdowns(): void {
    this.servicoPericialService.getAllForDropdown?.()?.subscribe?.({
      next: (d: any) => this.servicos = Array.isArray(d) ? d : (d.results ?? []),
      error: () => {},
    });
    this.unidadeDemandanteService.getAllForDropdown?.()?.subscribe?.({
      next: (d: any) => this.unidades = Array.isArray(d) ? d : (d.results ?? []),
      error: () => {},
    });
  }

  get filtros(): VestigioMovimentacaoFiltros {
    const f: VestigioMovimentacaoFiltros = {
      page: this.currentPage,
      page_size: this.pageSize,
      ordering: '-created_at',
    };
    if (this.tabAtiva === 'aguardando') (f as any)['aguardando_meu_aceite'] = 'true';
    if (this.tabAtiva === 'pendentes')  f.aceito = false;
    if (this.tabAtiva === 'aceitas')    f.aceito = true;
    if (this.filtroSearch)  f.search              = this.filtroSearch;
    if (this.filtroServico !== '') f.servico_pericial   = +this.filtroServico;
    if (this.filtroUnidade !== '') f.unidade_demandante = +this.filtroUnidade;
    if (this.filtroDataDe)  f.data_de = this.filtroDataDe;
    if (this.filtroDataAte) f.data_ate = this.filtroDataAte;
    return f;
  }

  buscar(resetPage = true): void {
    if (resetPage) this.currentPage = 1;
    this.isLoading = true;
    this.custodiaService.getMovimentacoesPaginado(this.filtros).subscribe({
      next: (res) => {
        this.movimentacoes = res.results;
        this.totalCount = res.count;
        this.isLoading = false;
      },
      error: () => {
        this.message = 'Erro ao carregar movimentações.';
        this.messageType = 'error';
        this.isLoading = false;
      },
    });
  }

  mudarTab(tab: TabMov): void {
    this.tabAtiva = tab;
    this.buscar();
  }

  mudarPagina(p: number): void {
    this.currentPage = p;
    this.buscar(false);
  }

  limparFiltros(): void {
    this.filtroSearch = '';
    this.filtroServico = '';
    this.filtroUnidade = '';
    this.filtroDataDe = '';
    this.filtroDataAte = '';
    this.buscar();
  }

  get totalPages(): number {
    return Math.ceil(this.totalCount / this.pageSize);
  }

  verDetalhes(id: number): void {
    this.router.navigate(['/gabinete-virtual/custodia/movimentacoes', id]);
  }

  verVestigio(vestigioId: number, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/gabinete-virtual/custodia/vestigios', vestigioId]);
  }

  aceitar(mov: VestigioMovimentacao, event: Event): void {
    event.stopPropagation();

    Swal.fire({
      title: 'Confirmar recebimento',
      html: `Confirma o recebimento do vestígio com lacre
             <strong>${mov.lacre || '—'}</strong>?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#166534',
    }).then(result => {
      if (!result.isConfirmed) return;

      this.aceitandoId = mov.id;
      this.custodiaService.aceitarMovimentacao(mov.id).subscribe({
        next: () => {
          this.aceitandoId = null;
          this.buscar(false);
        },
        error: (err) => {
          this.aceitandoId = null;
          const msg = err?.error?.detail || 'Não foi possível confirmar o recebimento.';
          Swal.fire('Erro', msg, 'error');
        },
      });
    });
  }
}
