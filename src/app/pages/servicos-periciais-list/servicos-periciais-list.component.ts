import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ServicoPericialService, ServicoPericial } from '../../services/servico-pericial.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-servicos-periciais-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './servicos-periciais-list.component.html',
  styleUrls: ['./servicos-periciais-list.component.scss']
})
export class ServicosPericiaisListComponent implements OnInit {
  servicos: ServicoPericial[] = [];
  servicosLixeira: ServicoPericial[] = [];
  isLoading = true;
  isLoadingLixeira = false;
  message = '';
  messageType: 'success' | 'error' = 'success';

  // Paginação
  currentPage = 1;
  totalCount = 0;
  pageSize = 7;
  nextUrl: string | null = null;
  previousUrl: string | null = null;

  // Busca
  searchTerm = '';

  // Controle de visualização
  viewMode: 'ativos' | 'lixeira' = 'ativos';

  constructor(
    private servicoPericialService: ServicoPericialService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadServicos();
  }

  loadServicos(url?: string): void {
    this.isLoading = true;

    const request = url
      ? this.servicoPericialService.getByUrl(url)
      : this.servicoPericialService.getAll(this.searchTerm);

    request.subscribe({
      next: (response) => {
        this.servicos = response.results;
        this.totalCount = response.count;
        this.nextUrl = response.next;
        this.previousUrl = response.previous;
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Erro ao carregar serviços:', err);
        this.message = 'Erro ao carregar serviços periciais.';
        this.messageType = 'error';
        this.servicos = [];
        this.isLoading = false;
      }
    });
  }

  loadLixeira(): void {
    this.isLoadingLixeira = true;
    this.servicoPericialService.getLixeira().subscribe({
      next: (data) => {
        this.servicosLixeira = data;
        this.isLoadingLixeira = false;
      },
      error: (err: any) => {
        console.error('Erro ao carregar lixeira:', err);
        this.message = 'Erro ao carregar a lixeira.';
        this.messageType = 'error';
        this.servicosLixeira = [];
        this.isLoadingLixeira = false;
      }
    });
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadServicos();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.onSearch();
  }

  get servicosLixeiraFiltrados(): ServicoPericial[] {
    if (!this.searchTerm.trim()) {
      return this.servicosLixeira;
    }
    const term = this.searchTerm.toLowerCase();
    return this.servicosLixeira.filter(s =>
      s.sigla.toLowerCase().includes(term) ||
      s.nome.toLowerCase().includes(term)
    );
  }

  get totalPages(): number {
    return Math.ceil(this.totalCount / this.pageSize);
  }

  nextPage(): void {
    if (this.nextUrl) {
      this.currentPage++;
      this.loadServicos(this.nextUrl);
    }
  }

  previousPage(): void {
    if (this.previousUrl) {
      this.currentPage--;
      this.loadServicos(this.previousUrl);
    }
  }

  switchToAtivos(): void {
    this.viewMode = 'ativos';
    this.searchTerm = '';
    this.currentPage = 1;
    this.loadServicos();
  }

  switchToLixeira(): void {
    this.viewMode = 'lixeira';
    this.searchTerm = '';
    this.loadLixeira();
  }

  onCreate(): void {
    this.router.navigate(['/gabinete-virtual/servicos-periciais/novo']);
  }

  onEdit(id: number): void {
    this.router.navigate(['/gabinete-virtual/servicos-periciais', id, 'editar']);
  }

  onDelete(servico: ServicoPericial): void {
    Swal.fire({
      title: 'Confirmar exclusão',
      text: `Tem certeza que deseja mover "${servico.sigla} - ${servico.nome}" para a lixeira?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, deletar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.servicoPericialService.delete(servico.id).subscribe({
          next: () => {
            this.message = `Serviço "${servico.sigla}" movido para a lixeira.`;
            this.messageType = 'success';
            this.loadServicos();
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

  onRestore(servico: ServicoPericial): void {
    Swal.fire({
      title: 'Restaurar serviço',
      text: `Restaurar "${servico.sigla} - ${servico.nome}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sim, restaurar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.servicoPericialService.restaurar(servico.id).subscribe({
          next: () => {
            this.message = `Serviço "${servico.sigla}" restaurado com sucesso.`;
            this.messageType = 'success';
            this.servicosLixeira = this.servicosLixeira.filter(s => s.id !== servico.id);
          },
          error: (err: any) => {
            console.error('Erro ao restaurar:', err);
            this.message = 'Erro ao restaurar o serviço.';
            this.messageType = 'error';
          }
        });
      }
    });
  }
}
