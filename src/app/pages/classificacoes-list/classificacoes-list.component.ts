import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClassificacaoOcorrenciaService, ClassificacaoOcorrencia } from '../../services/classificacao-ocorrencia.service';
import { AuthService } from '../../services/auth.service';
import Swal from 'sweetalert2';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-classificacoes-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './classificacoes-list.component.html',
  styleUrls: ['./classificacoes-list.component.scss']
})
export class ClassificacoesListComponent implements OnInit {
  classificacoes: ClassificacaoOcorrencia[] = [];

  // Nova lista específica para resultados de busca (plana)
  classificacoesBusca: ClassificacaoOcorrencia[] = [];

  classificacoesLixeira: ClassificacaoOcorrencia[] = [];

  isLoading = true;
  isLoadingLixeira = false;

  // Controla se estamos no modo busca ou modo árvore
  isSearching = false;

  message = '';
  messageType: 'success' | 'error' = 'success';

  searchTerm = '';
  private searchSubject = new Subject<string>();

  viewMode: 'ativos' | 'lixeira' = 'ativos';
  isSuperAdmin = false;

  constructor(
    private classificacaoService: ClassificacaoOcorrenciaService,
    private authService: AuthService,
    private router: Router
  ) {
    // Configura o debounce para não sobrecarregar o servidor
    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(term => {
      this.executarBusca(term);
    });
  }

  ngOnInit(): void {
    this.isSuperAdmin = this.authService.isSuperAdmin();
    this.loadClassificacoes();
  }

  // Acionado pelo input no HTML
  onSearchInput(term: string): void {
    this.searchTerm = term;
    this.searchSubject.next(term);
  }

  // Carrega a árvore padrão (sem busca)
  loadClassificacoes(): void {
    this.isLoading = true;
    this.isSearching = false;

    // Traz a lista completa para montar a árvore localmente
    this.classificacaoService.getAll().subscribe({
      next: (data: ClassificacaoOcorrencia[]) => {
        this.classificacoes = data;
        this.isLoading = false;
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

  // Executa a busca no servidor (que agora traz pai + filhos em lista plana)
  executarBusca(term: string): void {
    if (!term.trim()) {
      // Se limpou a busca, volta para o modo árvore
      this.isSearching = false;
      return;
    }

    this.isLoading = true;
    this.isSearching = true;

    // Chama o endpoint de busca do backend
    this.classificacaoService.search(term).subscribe({
      next: (data: ClassificacaoOcorrencia[]) => {
        this.classificacoesBusca = data;
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Erro na busca:', err);
        this.isLoading = false;
        // Em caso de erro, volta para o modo árvore para não travar a tela
        this.isSearching = false;
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

  // Getters para a montagem da Árvore (apenas quando NÃO está buscando)
  get gruposPrincipais(): ClassificacaoOcorrencia[] {
    return this.classificacoes.filter(c => !c.parent && !c.parent_id);
  }

  getSubgrupos(parentId: number): ClassificacaoOcorrencia[] {
    return this.classificacoes.filter(c => c.parent?.id === parentId || c.parent_id === parentId);
  }

  // Getter para a Lixeira (filtro local simples)
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

  switchToAtivos(): void {
    this.viewMode = 'ativos';
    this.searchTerm = '';
    this.isSearching = false;
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
            // Recarrega a lista correta
            if (this.isSearching) {
              this.executarBusca(this.searchTerm);
            } else {
              this.loadClassificacoes();
            }
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
