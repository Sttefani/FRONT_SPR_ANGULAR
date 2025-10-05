import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProcedimentoCadastradoService, ProcedimentoCadastrado } from '../../services/procedimento-cadastrado.service';
import { AuthService } from '../../services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-procedimentos-cadastrados-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './procedimentos-cadastrados-list.component.html',
  styleUrls: ['./procedimentos-cadastrados-list.component.scss']
})
export class ProcedimentosCadastradosListComponent implements OnInit {
  procedimentos: ProcedimentoCadastrado[] = [];
  procedimentosLixeira: ProcedimentoCadastrado[] = [];
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
    private procedimentoCadastradoService: ProcedimentoCadastradoService,
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
      ? this.procedimentoCadastradoService.getByUrl(url)
      : this.procedimentoCadastradoService.getAll(this.searchTerm);

    request.subscribe({
      next: (response) => {
        this.procedimentos = response.results;
        this.totalCount = response.count;
        this.nextUrl = response.next;
        this.previousUrl = response.previous;
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Erro ao carregar procedimentos cadastrados:', err);
        this.message = 'Erro ao carregar procedimentos cadastrados.';
        this.messageType = 'error';
        this.procedimentos = [];
        this.isLoading = false;
      }
    });
  }

  loadLixeira(): void {
    this.isLoadingLixeira = true;
    this.procedimentoCadastradoService.getLixeira().subscribe({
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

  get procedimentosLixeiraFiltrados(): ProcedimentoCadastrado[] {
    if (!this.searchTerm.trim()) {
      return this.procedimentosLixeira;
    }
    const term = this.searchTerm.toLowerCase();
    return this.procedimentosLixeira.filter(p =>
      p.numero.toLowerCase().includes(term) ||
      p.tipo_procedimento.sigla.toLowerCase().includes(term) ||
      p.tipo_procedimento.nome.toLowerCase().includes(term) ||
      p.ano.toString().includes(term)
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
    this.router.navigate(['/gabinete-virtual/cadastros/procedimentos-cadastrados/novo']);
  }

  onEdit(id: number): void {
    this.router.navigate(['/gabinete-virtual/cadastros/procedimentos-cadastrados', id, 'editar']);
  }

  onDelete(procedimento: ProcedimentoCadastrado): void {
    Swal.fire({
      title: 'Confirmar exclusão',
      text: `Tem certeza que deseja mover "${procedimento.numero_completo}" para a lixeira?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, deletar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.procedimentoCadastradoService.delete(procedimento.id).subscribe({
          next: () => {
            this.message = `Procedimento "${procedimento.numero_completo}" movido para a lixeira.`;
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

  onRestore(procedimento: ProcedimentoCadastrado): void {
    Swal.fire({
      title: 'Restaurar procedimento',
      text: `Restaurar "${procedimento.numero_completo}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sim, restaurar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.procedimentoCadastradoService.restaurar(procedimento.id).subscribe({
          next: () => {
            this.message = `Procedimento "${procedimento.numero_completo}" restaurado com sucesso.`;
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
  verDetalhes(id: number): void {
  this.router.navigate(['/gabinete-virtual/cadastros/procedimentos-cadastrados', id]);
}
}
