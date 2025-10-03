import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClassificacaoOcorrenciaService, ClassificacaoOcorrencia } from '../../services/classificacao-ocorrencia.service';
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
  classificacoes: ClassificacaoOcorrencia[] = [];
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
      next: (data) => {
        this.classificacoes = data;
        this.isLoading = false;

        // ===== PASSO DE DEBUG: Verifique os dados recebidos na consola do navegador =====
        console.log("Dados recebidos da API:", data);
        const subgrupos = data.filter(c => c.parent_id);
        if (subgrupos.length > 0) {
          console.log("Exemplo de um SUBGRUPO (verifique se 'parent' e 'parent_id' existem e estão corretos):", subgrupos[0]);
        } else {
          console.log("Nenhum subgrupo encontrado nos dados recebidos.");
        }
        // =================================================================================

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

  // ===== LÓGICA DO FILTRO CORRIGIDA E COMPLETA =====
  get classificacoesFiltradas(): ClassificacaoOcorrencia[] {
    if (!this.searchTerm.trim()) {
      return this.classificacoes;
    }
    const term = this.searchTerm.toLowerCase();

    // 1. Encontra todos os itens que correspondem diretamente ao termo de busca.
    const directMatches = this.classificacoes.filter(c =>
      c.codigo.toLowerCase().includes(term) || c.nome.toLowerCase().includes(term)
    );
    const directMatchIds = new Set(directMatches.map(c => c.id));

    // 2. Encontra os IDs de todos os filhos dos itens que corresponderam diretamente.
    const childrenIds = new Set<number>();
    this.classificacoes.forEach(c => {
      if (c.parent_id && directMatchIds.has(c.parent_id)) {
        childrenIds.add(c.id);
      }
    });

    // 3. Encontra os IDs de todos os pais dos itens que corresponderam diretamente.
    const parentIds = new Set<number>();
    directMatches.forEach(c => {
      if (c.parent_id) {
        parentIds.add(c.parent_id);
      }
    });

    // 4. Combina todos os IDs (correspondências diretas, seus pais e seus filhos) num único conjunto para evitar duplicados.
    const idsToKeep = new Set([
      ...directMatchIds,
      ...childrenIds,
      ...parentIds
    ]);

    // 5. Retorna todos os itens da lista original cujos IDs estão no conjunto final.
    return this.classificacoes.filter(c => idsToKeep.has(c.id));
  }
  // ===== FIM DA CORREÇÃO =====

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

  /**
   * Verifica se as datas de criação e atualização são diferentes,
   * indicando que o item foi editado após a sua criação.
   */
  hasBeenUpdated(item: ClassificacaoOcorrencia): boolean {
    if (!item.updated_at || !item.created_at) {
      return false;
    }
    // Compara os timestamps. Se a diferença for maior que 1 segundo, considera-se atualizado.
    const createdAt = new Date(item.created_at).getTime();
    const updatedAt = new Date(item.updated_at).getTime();
    return updatedAt > (createdAt + 1000);
  }
}

