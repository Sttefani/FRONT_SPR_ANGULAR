import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

import { CustodiaService, DNA, DNAFiltros } from '../../services/custodia.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-custodia-dna-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './custodia-dna-list.component.html',
  styleUrls: ['./custodia-dna-list.component.scss']
})
export class CustodiaDnaListComponent implements OnInit {

  dnas: DNA[] = [];
  isLoading = true;
  message = '';
  messageType: 'success' | 'error' = 'success';

  // Paginação
  totalCount = 0;
  currentPage = 1;
  pageSize = 10;
  nextUrl: string | null = null;
  previousUrl: string | null = null;

  // Filtros
  filtroNome = '';
  filtroCpf = '';
  filtroSituacao = '';
  filtroFinalidade = '';
  filtroUf = '';
  filtroDataDe = '';
  filtroDataAte = '';

  // Perfil
  isExterno = false;
  podeEditar = false;

  readonly UFS = [
    'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
    'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
  ];

  constructor(
    private custodiaService: CustodiaService,
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.isExterno  = user?.perfil === 'EXTERNO';
    // EXTERNO não pode editar (regra do SPR-Custódia)
    this.podeEditar = !this.isExterno;
    this.buscarDnas();
  }

  get filtros(): DNAFiltros {
    const f: DNAFiltros = { page: this.currentPage, page_size: this.pageSize };
    if (this.filtroNome)       f.nome = this.filtroNome;
    if (this.filtroCpf)        f.cpf  = this.filtroCpf;
    if (this.filtroSituacao)   f.situacao = this.filtroSituacao;
    if (this.filtroFinalidade) f.finalidade_coleta = this.filtroFinalidade;
    if (this.filtroUf)         f.uf = this.filtroUf;
    if (this.filtroDataDe)     f.data_de  = this.filtroDataDe;
    if (this.filtroDataAte)    f.data_ate = this.filtroDataAte;
    // EXTERNO: filtra automaticamente no backend pela unidade; aqui apenas flag
    return f;
  }

  buscarDnas(resetPage = true): void {
    if (resetPage) this.currentPage = 1;
    this.isLoading = true;
    this.custodiaService.getDnasPaginado(this.filtros).subscribe({
      next: (res) => {
        this.dnas = res.results;
        this.totalCount = res.count;
        this.nextUrl = res.next;
        this.previousUrl = res.previous;
        this.isLoading = false;
      },
      error: () => {
        this.message = 'Erro ao carregar registros de DNA.';
        this.messageType = 'error';
        this.isLoading = false;
      }
    });
  }

  carregarPorUrl(url: string): void {
    this.isLoading = true;
    this.custodiaService.getDnasByUrl(url).subscribe({
      next: (res) => {
        this.dnas = res.results;
        this.totalCount = res.count;
        this.nextUrl = res.next;
        this.previousUrl = res.previous;
        this.isLoading = false;
      }
    });
  }

  limparFiltros(): void {
    this.filtroNome = '';
    this.filtroCpf = '';
    this.filtroSituacao = '';
    this.filtroFinalidade = '';
    this.filtroUf = '';
    this.filtroDataDe = '';
    this.filtroDataAte = '';
    this.buscarDnas();
  }

  nextPage(): void {
    if (this.nextUrl) { this.currentPage++; this.carregarPorUrl(this.nextUrl); }
  }

  previousPage(): void {
    if (this.previousUrl) { this.currentPage--; this.carregarPorUrl(this.previousUrl); }
  }

  get totalPages(): number {
    return Math.ceil(this.totalCount / this.pageSize);
  }

  novoDna(): void {
    this.router.navigate(['/gabinete-virtual/custodia/dna/novo']);
  }

  verDna(id: number): void {
    this.router.navigate(['/gabinete-virtual/custodia/dna', id]);
  }

  editarDna(id: number): void {
    this.router.navigate(['/gabinete-virtual/custodia/dna', id, 'editar']);
  }

  irParaVestigio(vestigioId: number | null): void {
    if (vestigioId) this.router.navigate(['/gabinete-virtual/custodia/vestigios', vestigioId]);
  }

  badgeSituacao(s: string): string {
    return s === 'APENADO' ? 'badge-apenado' : 'badge-nao-apenado';
  }

  badgeFinalidade(f: string): string {
    return f === 'LEI' ? 'badge-lei' : 'badge-dj';
  }
}
