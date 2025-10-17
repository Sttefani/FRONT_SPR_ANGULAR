import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CargoService, Cargo } from '../../services/cargo.service';
import { AuthService } from '../../services/auth.service';
import Swal from 'sweetalert2';


@Component({
  selector: 'app-cargos-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cargos-list.component.html',
  styleUrls: ['./cargos-list.component.scss']
})
export class CargosListComponent implements OnInit {
  cargos: Cargo[] = [];
  cargosLixeira: Cargo[] = [];
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
    private cargoService: CargoService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.isSuperAdmin = this.authService.isSuperAdmin();
    this.loadCargos();
  }

  loadCargos(url?: string): void {
    this.isLoading = true;

    const request = url
      ? this.cargoService.getByUrl(url)
      : this.cargoService.getAll(this.searchTerm);

    request.subscribe({
      next: (response) => {
        this.cargos = response.results;
        this.totalCount = response.count;
        this.nextUrl = response.next;
        this.previousUrl = response.previous;
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Erro ao carregar cargos:', err);
        this.message = 'Erro ao carregar cargos.';
        this.messageType = 'error';
        this.cargos = [];
        this.isLoading = false;
      }
    });
  }

  loadLixeira(): void {
    this.isLoadingLixeira = true;
    this.cargoService.getLixeira().subscribe({
      next: (data) => {
        this.cargosLixeira = data;
        this.isLoadingLixeira = false;
      },
      error: (err: any) => {
        console.error('Erro ao carregar lixeira:', err);
        this.message = 'Erro ao carregar a lixeira.';
        this.messageType = 'error';
        this.cargosLixeira = [];
        this.isLoadingLixeira = false;
      }
    });
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadCargos();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.onSearch();
  }

  get cargosLixeiraFiltrados(): Cargo[] {
    if (!this.searchTerm.trim()) {
      return this.cargosLixeira;
    }
    const term = this.searchTerm.toLowerCase();
    return this.cargosLixeira.filter(c => c.nome.toLowerCase().includes(term));
  }

  get totalPages(): number {
    return Math.ceil(this.totalCount / this.pageSize);
  }

  nextPage(): void {
    if (this.nextUrl) {
      this.currentPage++;
      this.loadCargos(this.nextUrl);
    }
  }

  previousPage(): void {
    if (this.previousUrl) {
      this.currentPage--;
      this.loadCargos(this.previousUrl);
    }
  }

  switchToAtivos(): void {
    this.viewMode = 'ativos';
    this.searchTerm = '';
    this.currentPage = 1;
    this.loadCargos();
  }

  switchToLixeira(): void {
    this.viewMode = 'lixeira';
    this.searchTerm = '';
    this.loadLixeira();
  }

  onCreate(): void {
    this.router.navigate(['/gabinete-virtual/cadastros/cargos/novo']);
  }

  onEdit(id: number): void {
    this.router.navigate(['/gabinete-virtual/cadastros/cargos', id, 'editar']);
  }

  onDelete(cargo: Cargo): void {
    Swal.fire({
      title: 'Confirmar exclusão',
      text: `Tem certeza que deseja mover "${cargo.nome}" para a lixeira?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, deletar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.cargoService.delete(cargo.id).subscribe({
          next: () => {
            this.message = `Cargo "${cargo.nome}" movido para a lixeira.`;
            this.messageType = 'success';
            this.loadCargos();
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

  onRestore(cargo: Cargo): void {
    Swal.fire({
      title: 'Restaurar cargo',
      text: `Restaurar "${cargo.nome}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sim, restaurar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.cargoService.restaurar(cargo.id).subscribe({
          next: () => {
            this.message = `Cargo "${cargo.nome}" restaurado com sucesso.`;
            this.messageType = 'success';
            this.cargosLixeira = this.cargosLixeira.filter(c => c.id !== cargo.id);
          },
          error: (err: any) => {
            console.error('Erro ao restaurar:', err);
            this.message = 'Erro ao restaurar o cargo.';
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
