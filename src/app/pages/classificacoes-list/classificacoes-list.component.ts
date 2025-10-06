import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
// --- INÍCIO DA MODIFICAÇÃO ---
// Importa tanto o serviço quanto a INTERFACE
import { ClassificacaoOcorrenciaService, ClassificacaoOcorrencia } from '../../services/classificacao-ocorrencia.service';
// --- FIM DA MODIFICAÇÃO ---
import { AuthService } from '../../services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-classificacoes-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './classificacoes-list.component.html',
  styleUrls: ['./classificacoes-list.component.scss']
})
export class ClassificacoesListComponent implements OnInit {
  // --- INÍCIO DA MODIFICAÇÃO ---
  // Tipa explicitamente a propriedade com a interface importada
  classificacoes: ClassificacaoOcorrencia[] = [];
  // --- FIM DA MODIFICAÇÃO ---
  classificacoesLixeira: ClassificacaoOcorrencia[] = [];
  isLoading = true;
  isLoadingLixeira = false;
  message = '';
  messageType: 'success' | 'error' = 'success';

  searchTerm = '';
  viewMode: 'ativos' | 'lixeira' = 'ativos';

  isSuperAdmin = false;

  constructor(
    private classificacaoService: ClassificacaoOcorrenciaService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.isSuperAdmin = this.authService.isSuperAdmin();
    this.loadClassificacoes();
  }

  loadClassificacoes(): void {
    this.isLoading = true;
    this.classificacaoService.getAll().subscribe({
      // --- INÍCIO DA MODIFICAÇÃO ---
      // Tipa explicitamente o 'data' que chega da API
      next: (data: ClassificacaoOcorrencia[]) => {
      // --- FIM DA MODIFICAÇÃO ---
        this.classificacoes = data;
        this.isLoading = false;

        console.log("Dados recebidos da API:", data);
        const subgrupos = data.filter(c => c.parent_id);
        if (subgrupos.length > 0) {
          console.log("Exemplo de um SUBGRUPO (verifique se 'parent' e 'parent_id' existem e estão corretos):", subgrupos[0]);
        } else {
          console.log("Nenhum subgrupo encontrado nos dados recebidos.");
        }
      },
      error: (err: any) => {
        console.error('Erro ao carregar classificações:', err);
        this.message = 'Erro ao carregar classificações.';
        this.messageType = 'error';
        this.classificacoes = [];
        this.isLoading = false;
      }
    });
  }

  loadLixeira(): void {
    this.isLoadingLixeira = true;
    this.classificacaoService.getLixeira().subscribe({
      next: (data) => {
        this.classificacoesLixeira = data;
        this.isLoadingLixeira = false;
      },
      error: (err: any) => {
        console.error('Erro ao carregar lixeira:', err);
        this.message = 'Erro ao carregar a lixeira.';
        this.messageType = 'error';
        this.classificacoesLixeira = [];
        this.isLoadingLixeira = false;
      }
    });
  }

  get classificacoesFiltradas(): ClassificacaoOcorrencia[] {
    if (!this.searchTerm.trim()) {
      return this.classificacoes;
    }
    const term = this.searchTerm.toLowerCase();

    const directMatches = this.classificacoes.filter(c =>
      c.codigo.toLowerCase().includes(term) || c.nome.toLowerCase().includes(term)
    );
    const directMatchIds = new Set(directMatches.map(c => c.id));

    const childrenIds = new Set<number>();
    this.classificacoes.forEach(c => {
      if (c.parent_id && directMatchIds.has(c.parent_id)) {
        childrenIds.add(c.id);
      }
    });

    const parentIds = new Set<number>();
    directMatches.forEach(c => {
      if (c.parent_id) {
        parentIds.add(c.parent_id);
      }
    });

    const idsToKeep = new Set([
      ...directMatchIds,
      ...childrenIds,
      ...parentIds
    ]);

    return this.classificacoes.filter(c => idsToKeep.has(c.id));
  }

  get classificacoesLixeiraFiltradas(): ClassificacaoOcorrencia[] {
    if (!this.searchTerm.trim()) {
      return this.classificacoesLixeira;
    }
    const term = this.searchTerm.toLowerCase();
    return this.classificacoesLixeira.filter(c =>
      c.codigo.toLowerCase().includes(term) ||
      c.nome.toLowerCase().includes(term)
    );
  }

  get gruposPrincipais(): ClassificacaoOcorrencia[] {
    return this.classificacoesFiltradas.filter(c => !c.parent);
  }

  getSubgrupos(parentId: number): ClassificacaoOcorrencia[] {
    return this.classificacoesFiltradas.filter(c => c.parent?.id === parentId);
  }

  switchToAtivos(): void {
    this.viewMode = 'ativos';
    this.searchTerm = '';
    this.loadClassificacoes();
  }

  switchToLixeira(): void {
    this.viewMode = 'lixeira';
    this.searchTerm = '';
    this.loadLixeira();
  }

  onCreate(): void {
    this.router.navigate(['/gabinete-virtual/cadastros/classificacoes/novo']);
  }

  onEdit(id: number): void {
    this.router.navigate(['/gabinete-virtual/cadastros/classificacoes', id, 'editar']);
  }

  onDelete(classificacao: ClassificacaoOcorrencia): void {
    const temSubgrupos = this.classificacoes.some(c => c.parent?.id === classificacao.id);

    if (temSubgrupos) {
      Swal.fire({
        title: 'Não é possível deletar',
        text: 'Esta classificação possui subgrupos vinculados. Delete os subgrupos primeiro.',
        icon: 'error',
        confirmButtonText: 'Ok'
      });
      return;
    }

    Swal.fire({
      title: 'Confirmar exclusão',
      text: `Tem certeza que deseja mover "${classificacao.codigo} - ${classificacao.nome}" para a lixeira?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, deletar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.classificacaoService.delete(classificacao.id).subscribe({
          next: () => {
            this.message = `Classificação "${classificacao.codigo}" movida para a lixeira.`;
            this.messageType = 'success';
            this.loadClassificacoes();
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

  onRestore(classificacao: ClassificacaoOcorrencia): void {
    Swal.fire({
      title: 'Restaurar classificação',
      text: `Restaurar "${classificacao.codigo} - ${classificacao.nome}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sim, restaurar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.classificacaoService.restaurar(classificacao.id).subscribe({
          next: () => {
            this.message = `Classificação "${classificacao.codigo}" restaurada com sucesso.`;
            this.messageType = 'success';
            this.classificacoesLixeira = this.classificacoesLixeira.filter(c => c.id !== classificacao.id);
          },
          error: (err: any) => {
            console.error('Erro ao restaurar:', err);
            this.message = 'Erro ao restaurar a classification.';
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

  hasBeenUpdated(item: ClassificacaoOcorrencia): boolean {
    if (!item.updated_at || !item.created_at) {
      return false;
    }
    const createdAt = new Date(item.created_at).getTime();
    const updatedAt = new Date(item.updated_at).getTime();
    return updatedAt > (createdAt + 1000);
  }
}
