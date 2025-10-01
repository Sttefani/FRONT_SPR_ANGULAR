import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UnidadeDemandanteService, UnidadeDemandante } from '../../services/unidade-demandante.service';
import { AuthService } from '../../services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-unidades-demandantes-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './unidades-demandantes-list.component.html',
  styleUrls: ['./unidades-demandantes-list.component.scss']
})
export class UnidadesDemandantesListComponent implements OnInit {
  unidades: UnidadeDemandante[] = [];
  unidadesLixeira: UnidadeDemandante[] = [];
  isLoading = true;
  isLoadingLixeira = false;
  message = '';
  messageType: 'success' | 'error' = 'success';

  currentPage = 1;
  totalCount = 0;
  pageSize = 7;
  nextUrl: string | null = null;
  previousUrl: string | null = null;

  searchTerm = '';
  viewMode: 'ativos' | 'lixeira' = 'ativos';

  isSuperAdmin = false;

  constructor(
    private unidadeDemandanteService: UnidadeDemandanteService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.isSuperAdmin = this.authService.isSuperAdmin();
    this.loadUnidades();
  }

  loadUnidades(url?: string): void {
    this.isLoading = true;

    const request = url
      ? this.unidadeDemandanteService.getByUrl(url)
      : this.unidadeDemandanteService.getAll(this.searchTerm);

    request.subscribe({
      next: (response) => {
        this.unidades = response.results;
        this.totalCount = response.count;
        this.nextUrl = response.next;
        this.previousUrl = response.previous;
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Erro ao carregar unidades demandantes:', err);
        this.message = 'Erro ao carregar unidades demandantes.';
        this.messageType = 'error';
        this.unidades = [];
        this.isLoading = false;
      }
    });
  }

  loadLixeira(): void {
    this.isLoadingLixeira = true;
    this.unidadeDemandanteService.getLixeira().subscribe({
      next: (data) => {
        this.unidadesLixeira = data;
        this.isLoadingLixeira = false;
      },
      error: (err: any) => {
        console.error('Erro ao carregar lixeira:', err);
        this.message = 'Erro ao carregar a lixeira.';
        this.messageType = 'error';
        this.unidadesLixeira = [];
        this.isLoadingLixeira = false;
      }
    });
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadUnidades();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.onSearch();
  }

  get unidadesLixeiraFiltradas(): UnidadeDemandante[] {
    if (!this.searchTerm.trim()) {
      return this.unidadesLixeira;
    }
    const term = this.searchTerm.toLowerCase();
    return this.unidadesLixeira.filter(u =>
      u.sigla.toLowerCase().includes(term) ||
      u.nome.toLowerCase().includes(term)
    );
  }

  get totalPages(): number {
    return Math.ceil(this.totalCount / this.pageSize);
  }

  nextPage(): void {
    if (this.nextUrl) {
      this.currentPage++;
      this.loadUnidades(this.nextUrl);
    }
  }

  previousPage(): void {
    if (this.previousUrl) {
      this.currentPage--;
      this.loadUnidades(this.previousUrl);
    }
  }

  switchToAtivos(): void {
    this.viewMode = 'ativos';
    this.searchTerm = '';
    this.currentPage = 1;
    this.loadUnidades();
  }

  switchToLixeira(): void {
    this.viewMode = 'lixeira';
    this.searchTerm = '';
    this.loadLixeira();
  }

  onCreate(): void {
    this.router.navigate(['/gabinete-virtual/cadastros/unidades-demandantes/novo']);
  }

  onEdit(id: number): void {
    this.router.navigate(['/gabinete-virtual/cadastros/unidades-demandantes', id, 'editar']);
  }

  onDelete(unidade: UnidadeDemandante): void {
    Swal.fire({
      title: 'Confirmar exclusão',
      text: `Tem certeza que deseja mover "${unidade.sigla} - ${unidade.nome}" para a lixeira?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, deletar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.unidadeDemandanteService.delete(unidade.id).subscribe({
          next: () => {
            this.message = `Unidade "${unidade.sigla}" movida para a lixeira.`;
            this.messageType = 'success';
            this.loadUnidades();
          },
          error: (err: any) => {
            console.error('Erro ao deletar:', err);
            this.message = 'Erro ao mover para a lixeira.';
            this.messageType = 'error';
          }
        });
      }
    });
  }

  onRestore(unidade: UnidadeDemandante): void {
    Swal.fire({
      title: 'Restaurar unidade',
      text: `Restaurar "${unidade.sigla} - ${unidade.nome}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sim, restaurar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.unidadeDemandanteService.restaurar(unidade.id).subscribe({
          next: () => {
            this.message = `Unidade "${unidade.sigla}" restaurada com sucesso.`;
            this.messageType = 'success';
            this.unidadesLixeira = this.unidadesLixeira.filter(u => u.id !== unidade.id);
          },
          error: (err: any) => {
            console.error('Erro ao restaurar:', err);
            this.message = 'Erro ao restaurar a unidade.';
            this.messageType = 'error';
          }
        });
      }
    });
  }

  getFirstName(fullName: string | undefined): string {
    if (!fullName) return 'N/D';
    return fullName.split(' ')[0];
  }
}
