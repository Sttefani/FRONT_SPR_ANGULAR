import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TipoDocumentoService, TipoDocumento } from '../../services/tipo-documento.service';
import { AuthService } from '../../services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-tipos-documento-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tipos-documento-list.component.html',
  styleUrls: ['./tipos-documento-list.component.scss']
})
export class TiposDocumentoListComponent implements OnInit {
  tiposDocumento: TipoDocumento[] = [];
  tiposDocumentoLixeira: TipoDocumento[] = [];
  isLoading = true;
  isLoadingLixeira = false;
  message = '';
  messageType: 'success' | 'error' = 'success';

  searchTerm = '';
  viewMode: 'ativos' | 'lixeira' = 'ativos';

  count = 0;
  currentPage = 1;
  pageSize = 10;
  nextUrl: string | null = null;
  previousUrl: string | null = null;

  isSuperAdmin = false;

  constructor(
    private tipoDocumentoService: TipoDocumentoService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.isSuperAdmin = this.authService.isSuperAdmin();
    this.loadTiposDocumento();
  }

  loadTiposDocumento(): void {
    this.isLoading = true;
    this.tipoDocumentoService.getAll(this.searchTerm).subscribe({
      next: (data) => {
        this.tiposDocumento = data.results;
        this.count = data.count;
        this.nextUrl = data.next;
        this.previousUrl = data.previous;
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Erro ao carregar tipos de documento:', err);
        this.message = 'Erro ao carregar tipos de documento.';
        this.messageType = 'error';
        this.tiposDocumento = [];
        this.isLoading = false;
      }
    });
  }

  loadLixeira(): void {
    this.isLoadingLixeira = true;
    this.tipoDocumentoService.getLixeira().subscribe({
      next: (data) => {
        this.tiposDocumentoLixeira = data;
        this.isLoadingLixeira = false;
      },
      error: (err: any) => {
        console.error('Erro ao carregar lixeira:', err);
        this.message = 'Erro ao carregar a lixeira.';
        this.messageType = 'error';
        this.tiposDocumentoLixeira = [];
        this.isLoadingLixeira = false;
      }
    });
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadTiposDocumento();
  }

  goToNextPage(): void {
    if (this.nextUrl) {
      this.isLoading = true;
      this.tipoDocumentoService.getByUrl(this.nextUrl).subscribe({
        next: (data) => {
          this.tiposDocumento = data.results;
          this.count = data.count;
          this.nextUrl = data.next;
          this.previousUrl = data.previous;
          this.currentPage++;
          this.isLoading = false;
        },
        error: (err: any) => {
          console.error('Erro ao carregar página:', err);
          this.isLoading = false;
        }
      });
    }
  }

  goToPreviousPage(): void {
    if (this.previousUrl) {
      this.isLoading = true;
      this.tipoDocumentoService.getByUrl(this.previousUrl).subscribe({
        next: (data) => {
          this.tiposDocumento = data.results;
          this.count = data.count;
          this.nextUrl = data.next;
          this.previousUrl = data.previous;
          this.currentPage--;
          this.isLoading = false;
        },
        error: (err: any) => {
          console.error('Erro ao carregar página:', err);
          this.isLoading = false;
        }
      });
    }
  }

  get tiposDocumentoFiltrados(): TipoDocumento[] {
    if (!this.searchTerm.trim()) {
      return this.tiposDocumento;
    }
    const term = this.searchTerm.toLowerCase();
    return this.tiposDocumento.filter(t =>
      t.nome.toLowerCase().includes(term)
    );
  }

  get tiposDocumentoLixeiraFiltrados(): TipoDocumento[] {
    if (!this.searchTerm.trim()) {
      return this.tiposDocumentoLixeira;
    }
    const term = this.searchTerm.toLowerCase();
    return this.tiposDocumentoLixeira.filter(t =>
      t.nome.toLowerCase().includes(term)
    );
  }

  get totalPages(): number {
    return Math.ceil(this.count / this.pageSize);
  }

  switchToAtivos(): void {
    this.viewMode = 'ativos';
    this.searchTerm = '';
    this.currentPage = 1;
    this.loadTiposDocumento();
  }

  switchToLixeira(): void {
    this.viewMode = 'lixeira';
    this.searchTerm = '';
    this.loadLixeira();
  }

  onCreate(): void {
    this.router.navigate(['/gabinete-virtual/cadastros/tipos-documento/novo']);
  }

  onEdit(id: number): void {
    this.router.navigate(['/gabinete-virtual/cadastros/tipos-documento', id, 'editar']);
  }

  onDelete(tipo: TipoDocumento): void {
    Swal.fire({
      title: 'Confirmar exclusão',
      text: `Tem certeza que deseja mover "${tipo.nome}" para a lixeira?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, deletar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.tipoDocumentoService.delete(tipo.id).subscribe({
          next: () => {
            this.message = `Tipo de documento "${tipo.nome}" movido para a lixeira.`;
            this.messageType = 'success';
            this.loadTiposDocumento();
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

  onRestore(tipo: TipoDocumento): void {
    Swal.fire({
      title: 'Restaurar tipo de documento',
      text: `Restaurar "${tipo.nome}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sim, restaurar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.tipoDocumentoService.restaurar(tipo.id).subscribe({
          next: () => {
            this.message = `Tipo de documento "${tipo.nome}" restaurado com sucesso.`;
            this.messageType = 'success';
            this.tiposDocumentoLixeira = this.tiposDocumentoLixeira.filter(t => t.id !== tipo.id);
          },
          error: (err: any) => {
            console.error('Erro ao restaurar:', err);
            this.message = 'Erro ao restaurar o tipo de documento.';
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
