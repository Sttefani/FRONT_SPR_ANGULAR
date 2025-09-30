import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CidadeService, Cidade } from '../../services/cidade.service';
import { AuthService } from '../../services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-cidades-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cidades-list.component.html',
  styleUrls: ['./cidades-list.component.scss']
})
export class CidadesListComponent implements OnInit {
  cidades: Cidade[] = [];
  cidadesLixeira: Cidade[] = [];
  isLoading = true;
  isLoadingLixeira = false;
  message = '';
  messageType: 'success' | 'error' = 'success';

  searchTerm = '';
  viewMode: 'ativos' | 'lixeira' = 'ativos';

  isSuperAdmin = false;

  constructor(
    private cidadeService: CidadeService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.isSuperAdmin = this.authService.isSuperAdmin();
    this.loadCidades();
  }

  loadCidades(): void {
    this.isLoading = true;
    this.cidadeService.getAll().subscribe({
      next: (data) => {
        this.cidades = data;
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Erro ao carregar cidades:', err);
        this.message = 'Erro ao carregar cidades.';
        this.messageType = 'error';
        this.cidades = [];
        this.isLoading = false;
      }
    });
  }

  loadLixeira(): void {
    this.isLoadingLixeira = true;
    this.cidadeService.getLixeira().subscribe({
      next: (data) => {
        this.cidadesLixeira = data;
        this.isLoadingLixeira = false;
      },
      error: (err: any) => {
        console.error('Erro ao carregar lixeira:', err);
        this.message = 'Erro ao carregar a lixeira.';
        this.messageType = 'error';
        this.cidadesLixeira = [];
        this.isLoadingLixeira = false;
      }
    });
  }

  get cidadesFiltradas(): Cidade[] {
    if (!this.searchTerm.trim()) {
      return this.cidades;
    }
    const term = this.searchTerm.toLowerCase();
    return this.cidades.filter(c => c.nome.toLowerCase().includes(term));
  }

  get cidadesLixeiraFiltradas(): Cidade[] {
    if (!this.searchTerm.trim()) {
      return this.cidadesLixeira;
    }
    const term = this.searchTerm.toLowerCase();
    return this.cidadesLixeira.filter(c => c.nome.toLowerCase().includes(term));
  }

  switchToAtivos(): void {
    this.viewMode = 'ativos';
    this.searchTerm = '';
    this.loadCidades();
  }

  switchToLixeira(): void {
    this.viewMode = 'lixeira';
    this.searchTerm = '';
    this.loadLixeira();
  }

  onCreate(): void {
    this.router.navigate(['/gabinete-virtual/cadastros/cidades/novo']);
  }

  onEdit(id: number): void {
    this.router.navigate(['/gabinete-virtual/cadastros/cidades', id, 'editar']);
  }

  onDelete(cidade: Cidade): void {
    Swal.fire({
      title: 'Confirmar exclusão',
      text: `Tem certeza que deseja mover "${cidade.nome}" para a lixeira?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, deletar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.cidadeService.delete(cidade.id).subscribe({
          next: () => {
            this.message = `Cidade "${cidade.nome}" movida para a lixeira.`;
            this.messageType = 'success';
            this.loadCidades();
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

  onRestore(cidade: Cidade): void {
    Swal.fire({
      title: 'Restaurar cidade',
      text: `Restaurar "${cidade.nome}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sim, restaurar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.cidadeService.restaurar(cidade.id).subscribe({
          next: () => {
            this.message = `Cidade "${cidade.nome}" restaurada com sucesso.`;
            this.messageType = 'success';
            this.cidadesLixeira = this.cidadesLixeira.filter(c => c.id !== cidade.id);
          },
          error: (err: any) => {
            console.error('Erro ao restaurar:', err);
            this.message = 'Erro ao restaurar a cidade.';
            this.messageType = 'error';
          }
        });
      }
    });
  }
}
