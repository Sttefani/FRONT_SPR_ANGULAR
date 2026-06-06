import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';

import {
  ProtocoloService,
  ProtocoloList,
  ProtocoloFiltros,
  StatusRecebimento,
  TipoEntrega,
} from '../../services/protocolo.service';
import { AuthService } from '../../services/auth.service';
import { PaginadorComponent } from '../../components/paginador/paginador.component';

@Component({
  selector: 'app-protocolo-list',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginadorComponent],
  templateUrl: './protocolo-list.component.html',
  styleUrls: ['./protocolo-list.component.scss'],
})
export class ProtocoloListComponent implements OnInit {

  protocolos: ProtocoloList[] = [];
  isLoading = false;
  totalCount = 0;
  currentPage = 1;
  pageSize = 15;
  totalPages = 1;

  // filtros
  busca = '';
  statusFiltro: StatusRecebimento | '' = '';
  tipoFiltro: TipoEntrega | '' = '';
  dataInicio = '';
  dataFim = '';

  podeEmitir = false;

  constructor(
    private protocoloService: ProtocoloService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.podeEmitir = ['CUSTODIANTE', 'ADMINISTRATIVO', 'SUPER_ADMIN'].includes(user?.perfil || '');

    // Lê filtros iniciais da URL (ex: navegação do dashboard com ?status_recebimento=PENDENTE)
    const params = this.route.snapshot.queryParams;
    this.currentPage = params['page'] ? +params['page'] : 1;
    if (params['status_recebimento']) this.statusFiltro = params['status_recebimento'] as StatusRecebimento;
    this.buscar(false);
  }

  buscar(resetPage = true): void {
    if (resetPage) {
      this.currentPage = 1;
      this.router.navigate([], { queryParams: {}, replaceUrl: true });
    }
    this.isLoading = true;

    const filtros: ProtocoloFiltros = {
      page: this.currentPage,
      page_size: this.pageSize,
    };
    if (this.busca.trim())   filtros['search'] = this.busca.trim();
    if (this.statusFiltro)   filtros['status_recebimento'] = this.statusFiltro;
    if (this.tipoFiltro)     filtros['tipo_entrega'] = this.tipoFiltro;
    if (this.dataInicio)     filtros['data_de'] = this.dataInicio;
    if (this.dataFim)        filtros['data_ate'] = this.dataFim;

    this.protocoloService.getProtocolos(filtros).subscribe({
      next: (res) => {
        this.protocolos = res.results;
        this.totalCount = res.count;
        this.totalPages = Math.ceil(res.count / this.pageSize);
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; },
    });
  }

  mudarPagina(page: number): void {
    this.currentPage = page;
    this.router.navigate([], { queryParams: { page }, replaceUrl: true });
    this.buscar(false);
  }

  limparFiltros(): void {
    this.busca = '';
    this.statusFiltro = '';
    this.tipoFiltro = '';
    this.dataInicio = '';
    this.dataFim = '';
    this.buscar();
  }

  verDetalhes(id: number): void {
    this.router.navigate(['/gabinete-virtual/custodia/protocolos', id]);
  }

  novoProtocolo(): void {
    this.router.navigate(['/gabinete-virtual/custodia/protocolos/novo']);
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'ASSINADO_ELETRONICAMENTE': return 'Assinado Eletron.';
      case 'ASSINADO_MANUAL':         return 'Assinado Manual';
      default:                        return 'Pendente';
    }
  }

  statusClass(status: string): string {
    switch (status) {
      case 'ASSINADO_ELETRONICAMENTE': return 'badge--verde';
      case 'ASSINADO_MANUAL':         return 'badge--teal';
      default:                        return 'badge--amber';
    }
  }

  tipoLabel(tipo: string): string {
    switch (tipo) {
      case 'MATERIAL':       return 'Material';
      case 'LAUDO':          return 'Laudo';
      case 'MATERIAL_E_LAUDO': return 'Mat. + Laudo';
      default:               return tipo;
    }
  }
}
