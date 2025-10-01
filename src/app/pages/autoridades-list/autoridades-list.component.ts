import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AutoridadeService, Autoridade } from '../../services/autoridade.service';
import { AuthService } from '../../services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-autoridades-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './autoridades-list.component.html',
  styleUrls: ['./autoridades-list.component.scss']
})
export class AutoridadesListComponent implements OnInit {
  autoridades: Autoridade[] = [];
  autoridadesLixeira: Autoridade[] = [];
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
    private autoridadeService: AutoridadeService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.isSuperAdmin = this.authService.isSuperAdmin();
    this.loadAutoridades();
  }

  loadAutoridades(url?: string): void {
    this.isLoading = true;

    const request = url
      ? this.autoridadeService.getByUrl(url)
      : this.autoridadeService.getAll(this.searchTerm);

    request.subscribe({
      next: (response) => {
        this.autoridades = response.results;
        this.totalCount = response.count;
        this.nextUrl = response.next;
        this.previousUrl = response.previous;
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Erro ao carregar autoridades:', err);
        this.message = 'Erro ao carregar autoridades.';
        this.messageType = 'error';
        this.autoridades = [];
        this.isLoading = false;
      }
    });
  }

  loadLixeira(): void {
    this.isLoadingLixeira = true;
    this.autoridadeService.getLixeira().subscribe({
      next: (data) => {
        this.autoridadesLixeira = data;
        this.isLoadingLixeira = false;
      },
      error: (err: any) => {
        console.error('Erro ao carregar lixeira:', err);
        this.message = 'Erro ao carregar a lixeira.';
        this.messageType = 'error';
        this.autoridadesLixeira = [];
        this.isLoadingLixeira = false;
      }
    });
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadAutoridades();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.onSearch();
  }

  get autoridadesLixeiraFiltradas(): Autoridade[] {
    if (!this.searchTerm.trim()) {
      return this.autoridadesLixeira;
    }
    const term = this.searchTerm.toLowerCase();
    return this.autoridadesLixeira.filter(a =>
      a.nome.toLowerCase().includes(term) ||
      a.cargo.nome.toLowerCase().includes(term)
    );
  }

  get totalPages(): number {
    return Math.ceil(this.totalCount / this.pageSize);
  }

  nextPage(): void {
    if (this.nextUrl) {
      this.currentPage++;
      this.loadAutoridades(this.nextUrl);
    }
  }

  previousPage(): void {
    if (this.previousUrl) {
      this.currentPage--;
      this.loadAutoridades(this.previousUrl);
    }
  }

  switchToAtivos(): void {
    this.viewMode = 'ativos';
    this.searchTerm = '';
    this.currentPage = 1;
    this.loadAutoridades();
  }

  switchToLixeira(): void {
    this.viewMode = 'lixeira';
    this.searchTerm = '';
    this.loadLixeira();
  }

  onCreate(): void {
    this.router.navigate(['/gabinete-virtual/cadastros/autoridades/novo']);
  }

  onEdit(id: number): void {
    this.router.navigate(['/gabinete-virtual/cadastros/autoridades', id, 'editar']);
  }

  onDelete(autoridade: Autoridade): void {
    Swal.fire({
      title: 'Confirmar exclusão',
      text: `Tem certeza que deseja mover "${autoridade.nome}" para a lixeira?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, deletar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.autoridadeService.delete(autoridade.id).subscribe({
          next: () => {
            this.message = `Autoridade "${autoridade.nome}" movida para a lixeira.`;
            this.messageType = 'success';
            this.loadAutoridades();
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

  onRestore(autoridade: Autoridade): void {
    Swal.fire({
      title: 'Restaurar autoridade',
      text: `Restaurar "${autoridade.nome}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sim, restaurar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.autoridadeService.restaurar(autoridade.id).subscribe({
          next: () => {
            this.message = `Autoridade "${autoridade.nome}" restaurada com sucesso.`;
            this.messageType = 'success';
            this.autoridadesLixeira = this.autoridadesLixeira.filter(a => a.id !== autoridade.id);
          },
          error: (err: any) => {
            console.error('Erro ao restaurar:', err);
            this.message = 'Erro ao restaurar a autoridade.';
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
