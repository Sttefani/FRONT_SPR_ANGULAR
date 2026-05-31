import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

import { CustodiaService, VestigioList, VestigioFiltros } from '../../services/custodia.service';
import { AuthService } from '../../services/auth.service';
import { ServicoPericial, ServicoPericialService } from '../../services/servico-pericial.service';
import { UnidadeDemandanteService } from '../../services/unidade-demandante.service';
import { PaginadorComponent } from '../../components/paginador/paginador.component';

// IMPORTAÇÃO DO NOVO PAGINADOR

@Component({
  selector: 'app-custodia-vestigios-list',
  standalone: true,
  // PAGINADOR INCLUÍDO AQUI NOS IMPORTS (Isso evita os erros NG8001 e NG8002)
  imports: [CommonModule, FormsModule, PaginadorComponent],
  templateUrl: './custodia-vestigios-list.component.html',
  styleUrls: ['./custodia-vestigios-list.component.scss']
})
export class CustodiaVestigiosListComponent implements OnInit {

  vestigios: VestigioList[] = [];
  isLoading = true;
  message = '';
  messageType: 'success' | 'error' = 'success';

  // Paginação Nova
  totalCount = 0;
  currentPage = 1;
  pageSize = 10;

  // Filtros
  filtroLacre = '';
  filtroSei = '';
  filtroOcorrencia = '';
  filtroStatus = '';
  filtroServico: number | '' = '';
  filtroUnidade: number | '' = '';
  filtroBiologico: boolean | '' = '';

  // Tab de status
  tabAtiva: '' | 'INICIAL' | 'ANDAMENTO' | 'FINALIZADO' = '';

  // Dados para selects
  servicos: ServicoPericial[] = [];
  unidades: any[] = [];

  // Permissões
  isCustodiante = false;
  isSuperAdmin = false;

  constructor(
    private custodiaService: CustodiaService,
    private authService: AuthService,
    private servicoPericialService: ServicoPericialService,
    private unidadeDemandanteService: UnidadeDemandanteService,
    private router: Router
  ) { }

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.isSuperAdmin = this.authService.isSuperAdmin();
    this.isCustodiante = user?.perfil !== 'EXTERNO';

    this.carregarDropdowns();
    this.buscarVestigios();
  }

  carregarDropdowns(): void {
    this.servicoPericialService.getAllForDropdown?.()?.subscribe?.({
      next: (data: any) => this.servicos = Array.isArray(data) ? data : (data.results ?? []),
      error: () => { }
    });
    this.unidadeDemandanteService.getAllForDropdown?.()?.subscribe?.({
      next: (data: any) => this.unidades = Array.isArray(data) ? data : (data.results ?? []),
      error: () => { }
    });
  }

  get filtros(): VestigioFiltros {
    const f: VestigioFiltros = { page: this.currentPage, page_size: this.pageSize };
    if (this.tabAtiva) f.status = this.tabAtiva;
    if (this.filtroLacre) f.lacre = this.filtroLacre;
    if (this.filtroSei) f.num_processo_sei = this.filtroSei;
    if (this.filtroOcorrencia) f.ocorrencia = this.filtroOcorrencia;
    if (this.filtroServico !== '') f.servico_pericial = +this.filtroServico;
    if (this.filtroUnidade !== '') f.unidade_demandante = +this.filtroUnidade;
    if (this.filtroBiologico !== '') f.biologico = this.filtroBiologico as boolean;
    return f;
  }

  buscarVestigios(resetPage = true): void {
    if (resetPage) this.currentPage = 1;
    this.isLoading = true;

    this.custodiaService.getVestigios(this.filtros).subscribe({
      next: (res) => {
        this.vestigios = res.results;
        this.totalCount = res.count;
        this.isLoading = false;
      },
      error: () => {
        this.message = 'Erro ao carregar vestígios.';
        this.messageType = 'error';
        this.isLoading = false;
      }
    });
  }

  // MÉTODO DO NOVO PAGINADOR
  mudarPagina(novaPagina: number): void {
    this.currentPage = novaPagina;
    this.buscarVestigios(false); // Busca a API na nova página sem resetar para a 1
  }

  mudarTab(tab: '' | 'INICIAL' | 'ANDAMENTO' | 'FINALIZADO'): void {
    this.tabAtiva = tab;
    this.buscarVestigios();
  }

  limparFiltros(): void {
    this.filtroLacre = '';
    this.filtroSei = '';
    this.filtroOcorrencia = '';
    this.filtroServico = '';
    this.filtroUnidade = '';
    this.filtroBiologico = '';
    this.buscarVestigios();
  }

  get totalPages(): number {
    return Math.ceil(this.totalCount / this.pageSize);
  }

  verDetalhes(id: number): void {
    this.router.navigate(['/gabinete-virtual/custodia/vestigios', id]);
  }

  novoVestigio(): void {
    this.router.navigate(['/gabinete-virtual/custodia/vestigios/novo']);
  }

  editarVestigio(id: number): void {
    this.router.navigate(['/gabinete-virtual/custodia/vestigios', id, 'editar']);
  }

  deletarVestigio(v: VestigioList): void {
    Swal.fire({
      title: 'Confirmar exclusão',
      text: `Mover vestígio "${v.lacre || '#' + v.id}" para a lixeira?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, excluir',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed) {
        this.custodiaService.deletarVestigio(v.id).subscribe({
          next: () => {
            this.message = 'Vestígio movido para a lixeira.';
            this.messageType = 'success';
            this.buscarVestigios(false);
          },
          error: () => {
            this.message = 'Erro ao excluir vestígio.';
            this.messageType = 'error';
          }
        });
      }
    });
  }

  badgeStatus(status: string): string {
    const map: Record<string, string> = {
      INICIAL: 'badge-inicial',
      ANDAMENTO: 'badge-andamento',
      FINALIZADO: 'badge-finalizado'
    };
    return map[status] ?? 'badge-inicial';
  }
}
