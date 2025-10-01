import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProcedimentoService, Procedimento } from '../../services/procedimento.service';
import { AuthService } from '../../services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-procedimentos-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './procedimentos-list.component.html',
  styleUrls: ['./procedimentos-list.component.scss']
})
export class ProcedimentosListComponent implements OnInit {
  procedimentos: Procedimento[] = [];
  procedimentosLixeira: Procedimento[] = [];
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
    private procedimentoService: ProcedimentoService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.isSuperAdmin = this.authService.isSuperAdmin();
    this.loadProcedimentos();
  }

  loadProcedimentos(url?: string): void {
    this.isLoading = true;

    const request = url
      ? this.procedimentoService.getByUrl(url)
      : this.procedimentoService.getAll(this.searchTerm);

    request.subscribe({
      next: (response) => {
        this.procedimentos = response.results;
        this.totalCount = response.count;
        this.nextUrl = response.next;
        this.previousUrl = response.previous;
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Erro ao carregar procedimentos:', err);
        this.message = 'Erro ao carregar procedimentos.';
        this.messageType = 'error';
        this.procedimentos = [];
        this.isLoading = false;
      }
    });
  }

  loadLixeira(): void {
    this.isLoadingLixeira = true;
    this.procedimentoService.getLixeira().subscribe({
      next: (data) => {
        this.procedimentosLixeira = data;
        this.isLoadingLixeira = false;
      },
      error: (err: any) => {
        console.error('Erro ao carregar lixeira:', err);
        this.message = 'Erro ao carregar a lixeira.';
        this.messageType = 'error';
        this.procedimentosLixeira = [];
        this.isLoadingLixeira = false;
      }
    });
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadProcedimentos();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.onSearch();
  }

  get procedimentosLixeiraFiltrados(): Procedimento[] {
    if (!this.searchTerm.trim()) {
      return this.procedimentosLixeira;
    }
    const term = this.searchTerm.toLowerCase();
    return this.procedimentosLixeira.filter(p =>
      p.sigla.toLowerCase().includes(term) ||
      p.nome.toLowerCase().includes(term)
    );
  }

  get totalPages(): number {
    return Math.ceil(this.totalCount / this.pageSize);
  }

  nextPage(): void {
    if (this.nextUrl) {
      this.currentPage++;
      this.loadProcedimentos(this.nextUrl);
    }
  }

  previousPage(): void {
    if (this.previousUrl) {
      this.currentPage--;
      this.loadProcedimentos(this.previousUrl);
    }
  }

  switchToAtivos(): void {
    this.viewMode = 'ativos';
    this.searchTerm = '';
    this.currentPage = 1;
    this.loadProcedimentos();
  }

  switchToLixeira(): void {
    this.viewMode = 'lixeira';
    this.searchTerm = '';
    this.loadLixeira();
  }

  onCreate(): void {
    this.router.navigate(['/gabinete-virtual/cadastros/procedimentos/novo']);
  }

  onEdit(id: number): void {
    this.router.navigate(['/gabinete-virtual/cadastros/procedimentos', id, 'editar']);
  }

  onDelete(procedimento: Procedimento): void {
    Swal.fire({
      title: 'Confirmar exclusão',
      text: `Tem certeza que deseja mover "${procedimento.sigla} - ${procedimento.nome}" para a lixeira?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, deletar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.procedimentoService.delete(procedimento.id).subscribe({
          next: () => {
            this.message = `Procedimento "${procedimento.sigla}" movido para a lixeira.`;
            this.messageType = 'success';
            this.loadProcedimentos();
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

  onRestore(procedimento: Procedimento): void {
    Swal.fire({
      title: 'Restaurar procedimento',
      text: `Restaurar "${procedimento.sigla} - ${procedimento.nome}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sim, restaurar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.procedimentoService.restaurar(procedimento.id).subscribe({
          next: () => {
            this.message = `Procedimento "${procedimento.sigla}" restaurado com sucesso.`;
            this.messageType = 'success';
            this.procedimentosLixeira = this.procedimentosLixeira.filter(p => p.id !== procedimento.id);
          },
          error: (err: any) => {
            console.error('Erro ao restaurar:', err);
            this.message = 'Erro ao restaurar o procedimento.';
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
