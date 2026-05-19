import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OcorrenciaService, Ocorrencia } from '../../services/ocorrencia.service';
import { ServicoPericialService, ServicoPericial } from '../../services/servico-pericial.service';
import { ClassificacaoOcorrenciaService } from '../../services/classificacao-ocorrencia.service';
import { AuthService } from '../../services/auth.service';
import Swal from 'sweetalert2';
import { UsuarioService } from '../../services/usuario.service';
import { Subscription } from 'rxjs';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-ocorrencias-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './ocorrencias-list.component.html',
  styleUrls: ['./ocorrencias-list.component.scss']
})
export class OcorrenciasListComponent implements OnInit, OnDestroy {
  ocorrencias: Ocorrencia[] = [];
  ocorrenciasLixeira: Ocorrencia[] = [];
  servicosPericiais: ServicoPericial[] = [];

  isLoading = true;
  isLoadingLixeira = false;
  message = '';
  messageType: 'success' | 'error' = 'success';

  numeroOcorrenciaBusca = '';
  dataInicio = '';
  dataFim = '';
  peritoFiltro: number | null = null;
  peritos: any[] = [];
  searchTerm = '';
  statusFiltro: string = '';
  servicoPericialFiltro: number | null = null;
  classificacaoFiltro: number | null = null;
  classificacoes: any[] = [];
  viewMode: 'todas' | 'pendentes' | 'laudo_entregue' | 'finalizadas' | 'lixeira' = 'todas';

  private readonly SESSION_KEY = 'spr_filtros_ocorrencias';

  // --- Paginação Modificada ---
  count = 0;
  currentPage = 1;
  pageSize = 10;
  totalPages = 0;
  paginaInput = 1;

  nextUrl: string | null = null;
  previousUrl: string | null = null;

  isSuperAdmin = false;
  isAdministrativo = false;
  isPerito = false;
  isOperacional = false;
  private userSubscription?: Subscription;

  constructor(
    private ocorrenciaService: OcorrenciaService,
    private servicoPericialService: ServicoPericialService,
    private classificacaoService: ClassificacaoOcorrenciaService,
    private authService: AuthService,
    private usuarioService: UsuarioService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.setupUserPermissions();
    this.loadServicos();
    this.loadPeritos();
    this.loadClassificacoes();
    this.carregarFiltrosSalvos();

    // Tenta pegar os filtros da URL primeiro (se veio de um link)
    const params = this.route.snapshot.queryParams;
    if (Object.keys(params).length > 0) {
      this.searchTerm = params['search'] || '';
      this.numeroOcorrenciaBusca = params['numero'] || '';
      this.statusFiltro = params['status'] || '';
      this.servicoPericialFiltro = params['servico'] ? Number(params['servico']) : null;
      this.peritoFiltro = params['perito'] ? Number(params['perito']) : null;
      this.dataInicio = params['dataInicio'] || '';
      this.dataFim = params['dataFim'] || '';
      this.currentPage = params['page'] ? Number(params['page']) : 1;
    } else {
      // Se a URL estiver limpa, restaura a sessão anterior
      this.restaurarFiltrosSession();
    }

    this.buscarOcorrencias(false);
  }

  ngOnDestroy(): void {
    // Salva o estado atual dos filtros antes de destruir o componente.
    // Garante persistência mesmo que o usuário navegue sem clicar em "Buscar".
    this.salvarFiltrosSession();
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  private setupUserPermissions(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.isSuperAdmin = this.authService.isSuperAdmin();
      this.isAdministrativo = user.perfil === 'ADMINISTRATIVO';
      this.isPerito = user.perfil === 'PERITO';
      this.isOperacional = user.perfil === 'OPERACIONAL';
    }
    this.userSubscription = this.authService.currentUser$.subscribe(changedUser => {
      if (changedUser) {
        this.isSuperAdmin = this.authService.isSuperAdmin();
        this.isAdministrativo = changedUser.perfil === 'ADMINISTRATIVO';
        this.isPerito = changedUser.perfil === 'PERITO';
        this.isOperacional = changedUser.perfil === 'OPERACIONAL';
      } else {
        this.isSuperAdmin = false; this.isAdministrativo = false; this.isPerito = false; this.isOperacional = false;
      }
    });
  }

  loadServicos(): void {
    this.servicoPericialService.getAllForDropdown().subscribe({
      next: (data: ServicoPericial[]) => { this.servicosPericiais = data; },
      error: (err: any) => { console.error('Erro ao carregar serviços:', err); }
    });
  }

  loadPeritos(): void {
    this.usuarioService.getPeritosList().subscribe({
      next: (data: any[]) => { this.peritos = data; },
      error: (err: any) => { console.error('Erro:', err); }
    });
  }

  loadClassificacoes(): void {
    this.classificacaoService.getAll().subscribe({
      next: (data: any) => {
        // getAll() em classificações não é paginado (pagination_class = None no backend)
        this.classificacoes = Array.isArray(data) ? data : (data.results || []);
      },
      error: (err: any) => { console.error('Erro ao carregar classificações:', err); }
    });
  }

  // =========================================================================
  // PERSISTÊNCIA DE FILTROS VIA sessionStorage
  // Limpa automaticamente ao fechar a aba (comportamento adequado para sistema
  // de segurança pública). Permite retornar da tela de detalhes sem perder filtros.
  // =========================================================================
  private salvarFiltrosSession(): void {
    const estado = {
      searchTerm: this.searchTerm,
      numeroOcorrenciaBusca: this.numeroOcorrenciaBusca,
      statusFiltro: this.statusFiltro,
      servicoPericialFiltro: this.servicoPericialFiltro,
      peritoFiltro: this.peritoFiltro,
      dataInicio: this.dataInicio,
      dataFim: this.dataFim,
      classificacaoFiltro: this.classificacaoFiltro,
      viewMode: this.viewMode,
      currentPage: this.currentPage
    };
    sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(estado));
  }

  private restaurarFiltrosSession(): void {
    try {
      const salvo = sessionStorage.getItem(this.SESSION_KEY);
      if (salvo) {
        const estado = JSON.parse(salvo);
        this.searchTerm = estado.searchTerm || '';
        this.numeroOcorrenciaBusca = estado.numeroOcorrenciaBusca || '';
        this.statusFiltro = estado.statusFiltro || '';
        this.servicoPericialFiltro = estado.servicoPericialFiltro || null;
        this.peritoFiltro = estado.peritoFiltro || null;
        this.dataInicio = estado.dataInicio || '';
        this.dataFim = estado.dataFim || '';
        this.classificacaoFiltro = estado.classificacaoFiltro || null;
        this.viewMode = estado.viewMode || 'todas';
        this.currentPage = estado.currentPage || 1;
      }
    } catch (_) {
      sessionStorage.removeItem(this.SESSION_KEY);
    }
  }

  private formatDataISO(data: string): string {
    if (!data) return '';
    if (data.match(/^\d{4}-\d{2}-\d{2}$/)) return data;
    if (data.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [dia, mes, ano] = data.split('/');
      return `${ano}-${mes}-${dia}`;
    }
    return data;
  }

  private addOneDay(dateStr: string): string {
    const parts = dateStr.split('-');
    const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    date.setDate(date.getDate() + 1);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  buscarOcorrencias(resetPage: boolean = true): void {
    if (this.viewMode === 'lixeira') {
      this.loadLixeira();
      return;
    }

    if (resetPage) {
      this.currentPage = 1;
      this.paginaInput = 1;
    }

    this.isLoading = true;
    const params: any = {
      page: this.currentPage,
      page_size: this.pageSize
    };

    // =======================================================
    // AQUI ESTÁ A CORREÇÃO DA TELA (Removido LAUDO_ENTREGUE)
    // =======================================================
    if (this.viewMode === 'pendentes') {
      params.status__in = 'AGUARDANDO_PERITO,EM_ANALISE';
      params.esta_finalizada = 'false';
    }
    if (this.viewMode === 'laudo_entregue') params.status = 'LAUDO_ENTREGUE';
    if (this.viewMode === 'finalizadas') params.status = 'FINALIZADA';

    // === CORREÇÃO DOS FILTROS ===

    if (this.numeroOcorrenciaBusca.trim()) params.numero_ocorrencia = this.numeroOcorrenciaBusca.trim();

    if (this.searchTerm.trim()) params.busca_geral = this.searchTerm.trim();

    if (this.statusFiltro) params.status = this.statusFiltro;
    if (this.servicoPericialFiltro) params.servico_pericial = this.servicoPericialFiltro;

    const inicioISO = this.formatDataISO(this.dataInicio);
    const fimISO = this.formatDataISO(this.dataFim);

    if (inicioISO) {
      params.created_at_de = inicioISO;
    }

    if (fimISO) {
      params.created_at_ate = fimISO;
    }

    if (inicioISO && !fimISO) {
      params.created_at_ate = this.addOneDay(inicioISO);
    }

    if (this.peritoFiltro) params.perito_atribuido = this.peritoFiltro;
    if (this.classificacaoFiltro) params.classificacao = this.classificacaoFiltro;

    // Persiste o estado atual antes de buscar
    this.salvarFiltrosSession();

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        search: this.searchTerm || null,
        numero: this.numeroOcorrenciaBusca || null,
        status: this.statusFiltro || null,
        servico: this.servicoPericialFiltro || null,
        perito: this.peritoFiltro || null,
        dataInicio: this.dataInicio || null,
        dataFim: this.dataFim || null,
        page: this.currentPage > 1 ? this.currentPage : null
      },
      queryParamsHandling: 'merge'
    });

    console.log('🔍 Buscando com params:', params);

    this.ocorrenciaService.getAll(params).subscribe({
      next: (data) => {
        this.ocorrencias = data.results;
        this.count = data.count;
        this.nextUrl = data.next;
        this.previousUrl = data.previous;
        this.totalPages = Math.ceil(this.count / this.pageSize);
        this.paginaInput = this.currentPage;
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Erro:', err);
        this.message = 'Erro ao buscar ocorrências.';
        this.messageType = 'error';
        this.ocorrencias = [];
        this.isLoading = false;
      }
    });
  }

  limparFiltros(): void {
    this.searchTerm = '';
    this.numeroOcorrenciaBusca = '';
    this.statusFiltro = '';
    this.servicoPericialFiltro = null;
    this.peritoFiltro = null;
    this.dataInicio = '';
    this.dataFim = '';
    this.classificacaoFiltro = null;
    sessionStorage.removeItem(this.SESSION_KEY);

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {}
    });

    this.buscarOcorrencias(true);
  }

  switchView(newView: 'todas' | 'pendentes' | 'laudo_entregue' | 'finalizadas' | 'lixeira'): void {
    if (this.viewMode === newView) return;
    this.viewMode = newView;
    this.limparFiltros();
  }

  loadLixeira(): void {
    this.isLoadingLixeira = true;
    this.ocorrenciaService.getLixeira().subscribe({
      next: (data) => { this.ocorrenciasLixeira = data; this.isLoadingLixeira = false; },
      error: (err: any) => { this.isLoadingLixeira = false; }
    });
  }

  irParaPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPages) {
      this.currentPage = pagina;
      this.buscarOcorrencias(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  irParaPaginaDigitada(): void {
    const pagina = parseInt(this.paginaInput.toString(), 10);
    if (pagina >= 1 && pagina <= this.totalPages) {
      this.irParaPagina(pagina);
    } else {
      Swal.fire({ title: 'Página inválida!', text: `Digite um número entre 1 e ${this.totalPages}`, icon: 'warning', confirmButtonText: 'OK' });
      this.paginaInput = this.currentPage;
    }
  }

  getPaginas(): number[] {
    const paginas: number[] = [];
    const inicio = Math.max(1, this.currentPage - 2);
    const fim = Math.min(this.totalPages, this.currentPage + 2);
    for (let i = inicio; i <= fim; i++) {
      paginas.push(i);
    }
    return paginas;
  }

  onCreate(): void { this.router.navigate(['/gabinete-virtual/operacional/ocorrencias/novo']); }
  onView(id: number): void { this.router.navigate(['/gabinete-virtual/operacional/ocorrencias', id]); }

  onEdit(id: number): void {
    const ocorrencia = this.ocorrencias.find(o => o.id === id);
    if (!ocorrencia) return;

    if (ocorrencia.reaberta_por) {
      if (!this.podeEditar(ocorrencia)) {
        Swal.fire({ title: 'Acesso Negado', text: 'Você não tem permissão para editar esta ocorrência.', icon: 'error', confirmButtonText: 'Entendi' });
        return;
      }
      this.router.navigate(['/gabinete-virtual/operacional/ocorrencias', id, 'editar']);
      return;
    }

    const jaFinalizada = ocorrencia.esta_finalizada === true || !!ocorrencia.finalizada_por || !!ocorrencia.data_finalizacao;

    if (jaFinalizada) {
      Swal.fire({ title: 'Ocorrência Finalizada', html: `<p>A ocorrência <strong>${ocorrencia.numero_ocorrencia}</strong> está finalizada e não pode ser editada.</p><p>Solicite ao administrador do sistema que reabra a ocorrência.</p>`, icon: 'warning', confirmButtonText: 'Entendi' });
      return;
    }
    this.router.navigate(['/gabinete-virtual/operacional/ocorrencias', id, 'editar']);
  }

  onDelete(ocorrencia: Ocorrencia): void {
    Swal.fire({ title: 'Confirmar exclusão', text: `Tem certeza que deseja mover a ocorrência "${ocorrencia.numero_ocorrencia}" para a lixeira?`, icon: 'warning', showCancelButton: true, confirmButtonText: 'Sim, deletar', cancelButtonText: 'Cancelar' })
      .then((result) => {
        if (result.isConfirmed) {
          this.ocorrenciaService.delete(ocorrencia.id).subscribe({
            next: () => {
              this.message = `Ocorrência "${ocorrencia.numero_ocorrencia}" movida para a lixeira.`;
              this.messageType = 'success';
              this.buscarOcorrencias(false);
            },
            error: (err: any) => {
              this.message = 'Erro ao mover para a lixeira.';
              this.messageType = 'error';
            }
          });
        }
      });
  }

  onRestore(ocorrencia: Ocorrencia): void {
    Swal.fire({ title: 'Restaurar ocorrência', text: `Restaurar "${ocorrencia.numero_ocorrencia}"?`, icon: 'question', showCancelButton: true, confirmButtonText: 'Sim, restaurar', cancelButtonText: 'Cancelar' })
      .then((result) => {
        if (result.isConfirmed) {
          this.ocorrenciaService.restaurar(ocorrencia.id).subscribe({
            next: () => {
              this.message = `Ocorrência "${ocorrencia.numero_ocorrencia}" restaurada com sucesso.`;
              this.messageType = 'success';
              this.loadLixeira();
            },
            error: (err: any) => {
              this.message = 'Erro ao restaurar a ocorrência.';
              this.messageType = 'error';
            }
          });
        }
      });
  }

  getStatusLabel(status: string | undefined): string {
    if (!status) return 'N/D';
    const labels: any = {
      'AGUARDANDO_PERITO': 'Aguardando Perito',
      'EM_ANALISE': 'Em Análise',
      'LAUDO_ENTREGUE': 'Laudo Entregue',
      'FINALIZADA': 'Finalizada'
    };
    return labels[status] || status;
  }

  getStatusClass(status: string | undefined): string {
    if (!status) return '';
    const classes: any = {
      'AGUARDANDO_PERITO': 'status-aguardando',
      'EM_ANALISE': 'status-analise',
      'LAUDO_ENTREGUE': 'status-laudo-entregue',
      'FINALIZADA': 'status-finalizada'
    };
    return classes[status] || '';
  }

  getPrazoClass(statusPrazo: string | undefined): string {
    if (!statusPrazo) return '';
    const classes: any = {
      'NO_PRAZO': 'prazo-ok',
      'PRORROGADO': 'prorrogado',
      'IMINENTE': 'iminente',
      'ATRASADO': 'atrasado',
      'CONCLUIDO': 'concluido',
      'AGUARDANDO_ADMIN': 'aguardando-admin'
    };
    return classes[statusPrazo] || '';
  }

  isIminente(ocorrencia: Ocorrencia): boolean {
    return ocorrencia.status_prazo === 'IMINENTE';
  }

  // ===== FILTROS SALVOS =====
  private readonly FILTROS_SALVOS_KEY = 'spr_filtros_favoritos';
  filtrosSalvos: { nome: string; dados: any }[] = [];
  nomeFiltroSalvar = '';
  mostrarFiltrosSalvos = false;

  carregarFiltrosSalvos(): void {
    try {
      const raw = localStorage.getItem(this.FILTROS_SALVOS_KEY);
      this.filtrosSalvos = raw ? JSON.parse(raw) : [];
    } catch {
      this.filtrosSalvos = [];
    }
  }

  salvarFiltroAtual(): void {
    const nome = this.nomeFiltroSalvar.trim();
    if (!nome) return;
    const dados = {
      searchTerm: this.searchTerm,
      numeroOcorrenciaBusca: this.numeroOcorrenciaBusca,
      statusFiltro: this.statusFiltro,
      servicoPericialFiltro: this.servicoPericialFiltro,
      peritoFiltro: this.peritoFiltro,
      dataInicio: this.dataInicio,
      dataFim: this.dataFim,
      classificacaoFiltro: this.classificacaoFiltro,
      viewMode: this.viewMode
    };
    const existente = this.filtrosSalvos.findIndex(f => f.nome === nome);
    if (existente >= 0) {
      this.filtrosSalvos[existente].dados = dados;
    } else {
      this.filtrosSalvos.push({ nome, dados });
    }
    localStorage.setItem(this.FILTROS_SALVOS_KEY, JSON.stringify(this.filtrosSalvos));
    this.nomeFiltroSalvar = '';
  }

  aplicarFiltroSalvo(filtro: { nome: string; dados: any }): void {
    const d = filtro.dados;
    this.searchTerm = d.searchTerm || '';
    this.numeroOcorrenciaBusca = d.numeroOcorrenciaBusca || '';
    this.statusFiltro = d.statusFiltro || '';
    this.servicoPericialFiltro = d.servicoPericialFiltro || null;
    this.peritoFiltro = d.peritoFiltro || null;
    this.dataInicio = d.dataInicio || '';
    this.dataFim = d.dataFim || '';
    this.classificacaoFiltro = d.classificacaoFiltro || null;
    this.viewMode = d.viewMode || 'todas';
    this.buscarOcorrencias(true);
  }

  deletarFiltroSalvo(nome: string): void {
    this.filtrosSalvos = this.filtrosSalvos.filter(f => f.nome !== nome);
    localStorage.setItem(this.FILTROS_SALVOS_KEY, JSON.stringify(this.filtrosSalvos));
  }

  isExportando = false;

  exportarCSV(): void {
    this.isExportando = true;
    const params: any = {};

    if (this.viewMode === 'pendentes') {
      params.status__in = 'AGUARDANDO_PERITO,EM_ANALISE';
      params.esta_finalizada = 'false';
    }
    if (this.viewMode === 'laudo_entregue') params.status = 'LAUDO_ENTREGUE';
    if (this.viewMode === 'finalizadas') params.status = 'FINALIZADA';

    if (this.numeroOcorrenciaBusca.trim()) params.numero_ocorrencia = this.numeroOcorrenciaBusca.trim();
    if (this.searchTerm.trim()) params.busca_geral = this.searchTerm.trim();
    if (this.statusFiltro) params.status = this.statusFiltro;
    if (this.servicoPericialFiltro) params.servico_pericial = this.servicoPericialFiltro;
    if (this.peritoFiltro) params.perito_atribuido = this.peritoFiltro;
    if (this.classificacaoFiltro) params.classificacao = this.classificacaoFiltro;
    if (this.dataInicio) params.created_at_de = this.dataInicio;
    if (this.dataFim) params.created_at_ate = this.dataFim;

    this.ocorrenciaService.exportarCSV(params).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ocorrencias_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        this.isExportando = false;
      },
      error: () => {
        this.message = 'Erro ao exportar. Tente novamente.';
        this.messageType = 'error';
        this.isExportando = false;
      }
    });
  }

  isLaudoEntregue(ocorrencia: Ocorrencia): boolean {
    return ocorrencia.status === 'LAUDO_ENTREGUE';
  }

  getFirstName(fullName: string | undefined): string {
    if (!fullName) return 'N/D';
    return fullName.split(' ')[0];
  }

  podeEditar(ocorrencia: Ocorrencia): boolean {
    if (ocorrencia.reaberta_por) {
      if (this.isSuperAdmin) return true;
      if (ocorrencia.perito_atribuido) {
        const user = this.authService.getCurrentUser();
        return Number(user?.id) === Number(ocorrencia.perito_atribuido.id);
      }
      return this.isPerito || this.isOperacional;
    }
    const jaFinalizada = ocorrencia.esta_finalizada === true || !!ocorrencia.finalizada_por || !!ocorrencia.data_finalizacao;
    if (jaFinalizada) {
      return false;
    }
    if (this.isSuperAdmin) return true;
    if (ocorrencia.perito_atribuido) {
      const user = this.authService.getCurrentUser();
      return Number(user?.id) === Number(ocorrencia.perito_atribuido.id);
    }
    return this.isPerito || this.isOperacional;
  }

  getTooltipContent(ocorrencia: Ocorrencia): string {
    const perito = ocorrencia.perito_atribuido?.nome_completo || 'Não atribuído';
    const classificacao = ocorrencia.classificacao?.nome || 'N/D';

    return `Perito: ${perito}\nClassificação: ${classificacao}`;
  }
}
