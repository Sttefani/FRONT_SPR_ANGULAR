import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExameService, Exame } from '../../services/exame.service';
import { AuthService } from '../../services/auth.service';
import Swal from 'sweetalert2';
import { ServicoPericial, ServicoPericialService } from '../../services/servico-pericial.service';

@Component({
  selector: 'app-exames-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './exames-list.component.html',
  styleUrls: ['./exames-list.component.scss']
})
export class ExamesListComponent implements OnInit {
  exames: Exame[] = [];
  examesLixeira: Exame[] = [];
  servicosPericiais: ServicoPericial[] = [];
  isLoading = true;
  isLoadingLixeira = false;
  isLoadingServicos = true;
  message = '';
  messageType: 'success' | 'error' = 'success';

  searchTerm = '';
  servicoPericialFiltro: number | null = null;
  viewMode: 'ativos' | 'lixeira' = 'ativos';

  isSuperAdmin = false;

  constructor(
    private exameService: ExameService,
    private authService: AuthService,
    private servicoPericialService: ServicoPericialService, // ← Adicione esta linha
    private router: Router
  ) {}

  ngOnInit(): void {
    this.isSuperAdmin = this.authService.isSuperAdmin();
    this.loadServicos();
    this.loadExames();
  }

  loadServicos(): void {
  this.isLoadingServicos = true;
  this.servicoPericialService.getAllForDropdown().subscribe({
    next: (data: ServicoPericial[]) => {
      this.servicosPericiais = data;
      this.isLoadingServicos = false;
    },
    error: (err: any) => {
      console.error('Erro ao carregar serviços periciais:', err);
      this.servicosPericiais = [];
      this.isLoadingServicos = false;
    }
  });
}

  loadExames(): void {
    this.isLoading = true;
    const servicoId = this.servicoPericialFiltro || undefined;
    this.exameService.getAll(servicoId).subscribe({
      next: (data) => {
        this.exames = data;
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Erro ao carregar exames:', err);
        this.message = 'Erro ao carregar exames.';
        this.messageType = 'error';
        this.exames = [];
        this.isLoading = false;
      }
    });
  }

  loadLixeira(): void {
    this.isLoadingLixeira = true;
    this.exameService.getLixeira().subscribe({
      next: (data) => {
        this.examesLixeira = data;
        this.isLoadingLixeira = false;
      },
      error: (err: any) => {
        console.error('Erro ao carregar lixeira:', err);
        this.message = 'Erro ao carregar a lixeira.';
        this.messageType = 'error';
        this.examesLixeira = [];
        this.isLoadingLixeira = false;
      }
    });
  }

  onServicoChange(): void {
    this.loadExames();
  }

  get examesFiltrados(): Exame[] {
    if (!this.searchTerm.trim()) {
      return this.exames;
    }
    const term = this.searchTerm.toLowerCase();
    return this.exames.filter(e =>
      e.codigo.toLowerCase().includes(term) ||
      e.nome.toLowerCase().includes(term)
    );
  }

  get examesLixeiraFiltrados(): Exame[] {
    if (!this.searchTerm.trim()) {
      return this.examesLixeira;
    }
    const term = this.searchTerm.toLowerCase();
    return this.examesLixeira.filter(e =>
      e.codigo.toLowerCase().includes(term) ||
      e.nome.toLowerCase().includes(term)
    );
  }

  get gruposPrincipais(): Exame[] {
    return this.examesFiltrados.filter(e => !e.parent);
  }

  getSubExames(parentId: number): Exame[] {
    return this.examesFiltrados.filter(e => e.parent?.id === parentId);
  }

  switchToAtivos(): void {
    this.viewMode = 'ativos';
    this.searchTerm = '';
    this.loadExames();
  }

  switchToLixeira(): void {
    this.viewMode = 'lixeira';
    this.searchTerm = '';
    this.loadLixeira();
  }

  onCreate(): void {
    this.router.navigate(['/gabinete-virtual/cadastros/exames/novo']);
  }

  onEdit(id: number): void {
    this.router.navigate(['/gabinete-virtual/cadastros/exames', id, 'editar']);
  }

  onDelete(exame: Exame): void {
    const temSubExames = this.exames.some(e => e.parent?.id === exame.id);

    if (temSubExames) {
      Swal.fire({
        title: 'Não é possível deletar',
        text: 'Este exame possui sub-exames vinculados. Delete os sub-exames primeiro.',
        icon: 'error',
        confirmButtonText: 'Ok'
      });
      return;
    }

    Swal.fire({
      title: 'Confirmar exclusão',
      text: `Tem certeza que deseja mover "${exame.codigo} - ${exame.nome}" para a lixeira?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, deletar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.exameService.delete(exame.id).subscribe({
          next: () => {
            this.message = `Exame "${exame.codigo}" movido para a lixeira.`;
            this.messageType = 'success';
            this.loadExames();
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

  onRestore(exame: Exame): void {
    Swal.fire({
      title: 'Restaurar exame',
      text: `Restaurar "${exame.codigo} - ${exame.nome}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sim, restaurar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.exameService.restaurar(exame.id).subscribe({
          next: () => {
            this.message = `Exame "${exame.codigo}" restaurado com sucesso.`;
            this.messageType = 'success';
            this.examesLixeira = this.examesLixeira.filter(e => e.id !== exame.id);
          },
          error: (err: any) => {
            console.error('Erro ao restaurar:', err);
            this.message = 'Erro ao restaurar o exame.';
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
