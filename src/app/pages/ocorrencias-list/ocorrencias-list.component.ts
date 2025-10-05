import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OcorrenciaService, Ocorrencia } from '../../services/ocorrencia.service';
import { ServicoPericialService, ServicoPericial } from '../../services/servico-pericial.service';
import { AuthService } from '../../services/auth.service';
import Swal from 'sweetalert2';
import { UsuarioService } from '../../services/usuario.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-ocorrencias-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
  viewMode: 'todas' | 'pendentes' | 'finalizadas' | 'lixeira' = 'todas';

  count = 0;
  currentPage = 1;
  pageSize = 10;
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
    private authService: AuthService,
    private usuarioService: UsuarioService,
    private router: Router
  ) {}

 ngOnInit(): void {
  console.log('===== ngOnInit INICIOU =====');

  // INICIALIZAR IMEDIATAMENTE
  const user = this.authService.getCurrentUser();
  console.log('getCurrentUser() retornou:', user);

  if (user) {
    this.isSuperAdmin = this.authService.isSuperAdmin();
    this.isAdministrativo = user.perfil === 'ADMINISTRATIVO';
    this.isPerito = user.perfil === 'PERITO';
    this.isOperacional = user.perfil === 'OPERACIONAL';

    console.log('🔐 Perfis carregados (INICIAL):', {
      perfil_do_usuario: user.perfil,
      isSuperAdmin: this.isSuperAdmin,
      isAdministrativo: this.isAdministrativo,
      isPerito: this.isPerito,
      isOperacional: this.isOperacional,
      userId: user.id
    });
  } else {
    console.warn('⚠️ getCurrentUser() retornou NULL!');
  }

  // TAMBÉM se inscrever para mudanças futuras
  this.userSubscription = this.authService.currentUser$.subscribe(changedUser => {
    console.log('📡 Observable currentUser$ emitiu:', changedUser);

    if (changedUser) {
      this.isSuperAdmin = this.authService.isSuperAdmin();
      this.isAdministrativo = changedUser.perfil === 'ADMINISTRATIVO';
      this.isPerito = changedUser.perfil === 'PERITO';
      this.isOperacional = changedUser.perfil === 'OPERACIONAL';

      console.log('🔐 Perfis ATUALIZADOS (Observable):', {
        perfil_do_usuario: changedUser.perfil,
        isSuperAdmin: this.isSuperAdmin,
        isAdministrativo: this.isAdministrativo,
        isPerito: this.isPerito,
        isOperacional: this.isOperacional,
        userId: changedUser.id
      });
    } else {
      this.isSuperAdmin = false;
      this.isAdministrativo = false;
      this.isPerito = false;
      this.isOperacional = false;
      console.log('🔓 Usuário deslogado - permissões resetadas');
    }
  });

  this.loadServicos();
  this.loadOcorrencias();
  this.loadPeritos();

  console.log('===== ngOnInit FINALIZOU =====');
}
  ngOnDestroy(): void {
    // Limpar subscription para evitar memory leak
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  loadServicos(): void {
    this.servicoPericialService.getAllForDropdown().subscribe({
      next: (data: ServicoPericial[]) => {
        this.servicosPericiais = data;
      },
      error: (err: any) => {
        console.error('Erro ao carregar serviços:', err);
      }
    });
  }

  loadPeritos(): void {
    this.usuarioService.getPeritosList().subscribe({
      next: (data: any[]) => {
        this.peritos = data;
        console.log('Peritos:', this.peritos);
      },
      error: (err: any) => {
        console.error('Erro:', err);
      }
    });
  }

  loadOcorrencias(): void {
    this.isLoading = true;

    const params: any = {};
    if (this.searchTerm) params.search = this.searchTerm;
    if (this.statusFiltro) params.status = this.statusFiltro;
    if (this.servicoPericialFiltro) params.servico_pericial = this.servicoPericialFiltro;

    this.ocorrenciaService.getAll(params).subscribe({
      next: (data) => {
        this.ocorrencias = data.results;
        this.count = data.count;
        this.nextUrl = data.next;
        this.previousUrl = data.previous;
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Erro ao carregar ocorrências:', err);
        this.message = 'Erro ao carregar ocorrências.';
        this.messageType = 'error';
        this.ocorrencias = [];
        this.isLoading = false;
      }
    });
  }

  loadPendentes(): void {
    this.isLoading = true;
    this.ocorrenciaService.getPendentes().subscribe({
      next: (data) => {
        this.ocorrencias = data.results;
        this.count = data.count;
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Erro ao carregar pendentes:', err);
        this.message = 'Erro ao carregar ocorrências pendentes.';
        this.messageType = 'error';
        this.isLoading = false;
      }
    });
  }

  loadFinalizadas(): void {
    this.isLoading = true;
    this.ocorrenciaService.getFinalizadas().subscribe({
      next: (data) => {
        this.ocorrencias = data.results;
        this.count = data.count;
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Erro ao carregar finalizadas:', err);
        this.message = 'Erro ao carregar ocorrências finalizadas.';
        this.messageType = 'error';
        this.isLoading = false;
      }
    });
  }

  loadLixeira(): void {
    this.isLoadingLixeira = true;
    this.ocorrenciaService.getLixeira().subscribe({
      next: (data) => {
        this.ocorrenciasLixeira = data;
        this.isLoadingLixeira = false;
      },
      error: (err: any) => {
        console.error('Erro ao carregar lixeira:', err);
        this.message = 'Erro ao carregar a lixeira.';
        this.messageType = 'error';
        this.ocorrenciasLixeira = [];
        this.isLoadingLixeira = false;
      }
    });
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadOcorrencias();
  }

  buscarOcorrencias(): void {
    this.currentPage = 1;
    this.isLoading = true;

    const params: any = {};

    if (this.numeroOcorrenciaBusca.trim()) {
      params.numero_ocorrencia = this.numeroOcorrenciaBusca.trim();
    }

    if (this.searchTerm.trim()) {
      params.search = this.searchTerm.trim();
    }

    if (this.statusFiltro) {
      params.status = this.statusFiltro;
    }

    if (this.servicoPericialFiltro) {
      params.servico_pericial = this.servicoPericialFiltro;
    }

    // REMOVA ISSO:
if (this.dataInicio) {
  params.data_inicio = this.dataInicio;
}

if (this.dataFim) {
  params.data_fim = this.dataFim;
}

// COLOQUE ISSO NO LUGAR:
if (this.dataInicio && !this.dataFim) {
  // Apenas uma data: buscar apenas esse dia
  params.data_fato_de = this.dataInicio;
  params.data_fato_ate = this.dataInicio;
} else if (!this.dataInicio && this.dataFim) {
  // Apenas data fim: buscar apenas esse dia
  params.data_fato_de = this.dataFim;
  params.data_fato_ate = this.dataFim;
} else if (this.dataInicio && this.dataFim) {
  // Intervalo: usar ambas
  params.data_fato_de = this.dataInicio;
  params.data_fato_ate = this.dataFim;
}

    if (this.peritoFiltro) {
      params.perito_atribuido = this.peritoFiltro;
    }

    this.ocorrenciaService.getAll(params).subscribe({
      next: (data) => {
        this.ocorrencias = data.results;
        this.count = data.count;
        this.nextUrl = data.next;
        this.previousUrl = data.previous;
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
    this.loadOcorrencias();
  }

  goToNextPage(): void {
    if (this.nextUrl) {
      this.isLoading = true;
      this.ocorrenciaService.getByUrl(this.nextUrl).subscribe({
        next: (data) => {
          this.ocorrencias = data.results;
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
      this.ocorrenciaService.getByUrl(this.previousUrl).subscribe({
        next: (data) => {
          this.ocorrencias = data.results;
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

  get totalPages(): number {
    return Math.ceil(this.count / this.pageSize);
  }

  switchToTodas(): void {
    this.viewMode = 'todas';
    this.searchTerm = '';
    this.statusFiltro = '';
    this.currentPage = 1;
    this.loadOcorrencias();
  }

  switchToPendentes(): void {
    this.viewMode = 'pendentes';
    this.searchTerm = '';
    this.statusFiltro = '';
    this.currentPage = 1;
    this.loadPendentes();
  }

  switchToFinalizadas(): void {
    this.viewMode = 'finalizadas';
    this.searchTerm = '';
    this.statusFiltro = '';
    this.currentPage = 1;
    this.loadFinalizadas();
  }

  switchToLixeira(): void {
    this.viewMode = 'lixeira';
    this.searchTerm = '';
    this.loadLixeira();
  }

  onCreate(): void {
    this.router.navigate(['/gabinete-virtual/operacional/ocorrencias/novo']);
  }

  onView(id: number): void {
    this.router.navigate(['/gabinete-virtual/operacional/ocorrencias', id]);
  }

onEdit(id: number): void {
  const ocorrencia = this.ocorrencias.find(o => o.id === id);
  if (!ocorrencia) return;

  // SE FOI REABERTA, ignora verificação de finalizada
  if (ocorrencia.reaberta_por) {
    // Verifica permissão normalmente
    if (!this.podeEditar(ocorrencia)) {
      Swal.fire({
        title: 'Acesso Negado',
        text: 'Você não tem permissão para editar esta ocorrência.',
        icon: 'error',
        confirmButtonText: 'Entendi'
      });
      return;
    }

    this.router.navigate(['/gabinete-virtual/operacional/ocorrencias', id, 'editar']);
    return;
  }

  // SE NÃO foi reaberta, verifica se está finalizada
  const jaFinalizada = ocorrencia.esta_finalizada === true ||
                       !!ocorrencia.finalizada_por ||
                       !!ocorrencia.data_finalizacao;

  if (jaFinalizada) {
    Swal.fire({
      title: 'Ocorrência Finalizada',
      html: `
        <p>A ocorrência <strong>${ocorrencia.numero_ocorrencia}</strong> está finalizada e não pode ser editada.</p>
        <p>Solicite ao administrador do sistema que reabra a ocorrência.</p>
      `,
      icon: 'warning',
      confirmButtonText: 'Entendi'
    });
    return;
  }

  // Verifica se tem perito atribuído - com Number() na comparação
  if (ocorrencia.perito_atribuido && !this.isSuperAdmin) {
    const user = this.authService.getCurrentUser();
    // ← MUDANÇA AQUI: Number() nas duas partes
    if (Number(user?.id) !== Number(ocorrencia.perito_atribuido.id)) {
      Swal.fire({
        title: 'Acesso Negado',
        html: `
          <p>Esta ocorrência está atribuída ao perito <strong>${ocorrencia.perito_atribuido.nome_completo}</strong>.</p>
          <p>Somente o perito responsável ou o administrador do sistema pode editá-la.</p>
        `,
        icon: 'error',
        confirmButtonText: 'Entendi'
      });
      return;
    }
  }

  // Verificação final com podeEditar()
  if (!this.podeEditar(ocorrencia)) {
    Swal.fire({
      title: 'Acesso Negado',
      text: 'Você não tem permissão para editar esta ocorrência.',
      icon: 'error',
      confirmButtonText: 'Entendi'
    });
    return;
  }

  this.router.navigate(['/gabinete-virtual/operacional/ocorrencias', id, 'editar']);
}
  onDelete(ocorrencia: Ocorrencia): void {
    Swal.fire({
      title: 'Confirmar exclusão',
      text: `Tem certeza que deseja mover a ocorrência "${ocorrencia.numero_ocorrencia}" para a lixeira?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, deletar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.ocorrenciaService.delete(ocorrencia.id).subscribe({
          next: () => {
            this.message = `Ocorrência "${ocorrencia.numero_ocorrencia}" movida para a lixeira.`;
            this.messageType = 'success';
            this.loadOcorrencias();
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

  onRestore(ocorrencia: Ocorrencia): void {
    Swal.fire({
      title: 'Restaurar ocorrência',
      text: `Restaurar "${ocorrencia.numero_ocorrencia}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sim, restaurar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.ocorrenciaService.restaurar(ocorrencia.id).subscribe({
          next: () => {
            this.message = `Ocorrência "${ocorrencia.numero_ocorrencia}" restaurada com sucesso.`;
            this.messageType = 'success';
            this.ocorrenciasLixeira = this.ocorrenciasLixeira.filter(o => o.id !== ocorrencia.id);
          },
          error: (err: any) => {
            console.error('Erro ao restaurar:', err);
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
      'FINALIZADA': 'Finalizada'
    };
    return labels[status] || status;
  }

  getStatusClass(status: string | undefined): string {
    if (!status) return '';

    const classes: any = {
      'AGUARDANDO_PERITO': 'status-aguardando',
      'EM_ANALISE': 'status-analise',
      'FINALIZADA': 'status-finalizada'
    };
    return classes[status] || '';
  }

  getPrazoClass(statusPrazo: string | undefined): string {
    if (!statusPrazo) return '';

    const classes: any = {
      'NO_PRAZO': 'prazo-ok',
      'PRORROGADO': 'prorrogado',
      'ATRASADO': 'atrasado',
      'CONCLUIDO': 'concluido'
    };
    return classes[statusPrazo] || '';
  }

  getFirstName(fullName: string | undefined): string {
    if (!fullName) return 'N/D';
    return fullName.split(' ')[0];
  }

  podeEditar(ocorrencia: Ocorrencia): boolean {
  // SE FOI REABERTA, pode editar (não está mais finalizada)
  if (ocorrencia.reaberta_por) {
    if (this.isSuperAdmin) return true;

    if (ocorrencia.perito_atribuido) {
      const user = this.authService.getCurrentUser();
      return Number(user?.id) === Number(ocorrencia.perito_atribuido.id);
    }

    return this.isPerito || this.isOperacional;
  }

  // SE NÃO FOI REABERTA, verifica se está finalizada
  const jaFinalizada = ocorrencia.esta_finalizada === true ||
                       !!ocorrencia.finalizada_por ||
                       !!ocorrencia.data_finalizacao;

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
}
