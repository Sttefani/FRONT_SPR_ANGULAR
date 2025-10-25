// src/app/pages/ordens-servico/lista-ordens-servico/lista-ordens-servico.component.ts

import { Component, OnInit } from '@angular/core';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { OrdemServicoService, OrdemServico, FiltrosOrdemServico } from '../../../services/ordem-servico.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import Swal from 'sweetalert2'; // Ensure Swal is imported

interface Perito {
  id: number;
  nome_completo: string;
}

interface Unidade {
  id: number;
  nome: string;
}

@Component({
  selector: 'app-lista-ordens-servico',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './lista-ordens-servico.component.html',
  styleUrls: ['./lista-ordens-servico.component.scss']
})
export class ListaOrdensServicoComponent implements OnInit {
  ordensServico: OrdemServico[] = [];
  loading = false;
  error: string | null = null;

  // Paginação
  totalItens = 0;
  paginaAtual = 1;
  itensPorPagina = 10;
  totalPaginas = 0;
  paginaInput = 1;

  // Ordenação
  ordenarPor = '-created_at';
  ordenarDirecao: 'asc' | 'desc' = 'desc';

  // Filtros
  filtros: FiltrosOrdemServico = {};

  // Dados para filtros
  peritos: Perito[] = [];
  unidades: Unidade[] = [];

  statusOptions = [
    { value: '', label: 'Todos os status' },
    { value: 'AGUARDANDO_CIENCIA', label: 'Aguardando Ciência' },
    { value: 'ABERTA', label: 'Aberta' },
    { value: 'EM_ANDAMENTO', label: 'Em Andamento' },
    // { value: 'VENCIDA', label: 'Vencida' }, // Linha removida
    { value: 'CONCLUIDA', label: 'Concluída' }
  ];

  urgenciaOptions = [
    { value: '', label: 'Todas as urgências' },
    { value: 'vermelho', label: '🔴 Vencidas/Hoje' },
    { value: 'laranja', label: '🟠 Urgentes' },
    { value: 'amarelo', label: '🟡 Atenção' },
    { value: 'verde', label: '🟢 OK' }
  ];

  modoExibicao: 'tabela' | 'cards' = 'tabela';
  mostrarFiltros = false;
  apiUrl = `${environment.apiUrl}/ordens-servico`;

  constructor(
    private ordemServicoService: OrdemServicoService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.carregarPreferencias();
    this.carregarPeritos();
    this.carregarUnidades();
    this.verificarFiltrosUrl();
    this.carregarOrdens();
  }

  // ===========================================================================
  // CARREGAMENTO DE DADOS
  // ===========================================================================

  carregarOrdens(): void {
    this.loading = true;
    this.error = null;
    const filtrosComPaginacao: any = { // Use any temporarily or define a stricter type
      ...this.filtros,
      page: this.paginaAtual,
      page_size: this.itensPorPagina,
      ordering: this.ordenarPor
    };
    Object.keys(filtrosComPaginacao).forEach(key => {
      if (filtrosComPaginacao[key] === null || filtrosComPaginacao[key] === undefined || filtrosComPaginacao[key] === '') {
        delete filtrosComPaginacao[key];
      }
    });
    this.ordemServicoService.listar(filtrosComPaginacao).subscribe({
      next: (response) => {
        this.ordensServico = response.results;
        this.totalItens = response.count;
        this.totalPaginas = Math.ceil(this.totalItens / this.itensPorPagina);
        this.paginaInput = this.paginaAtual;
        this.loading = false;
        this.salvarPreferencias();
      },
      error: (err) => {
        this.error = 'Erro ao carregar ordens de serviço. Tente novamente.';
        this.loading = false;
        console.error('Erro ao carregar ordens:', err);
      }
    });
  }

  carregarPeritos(): void {
    this.http.get<Perito[]>(`${environment.apiUrl}/usuarios/peritos_dropdown/`).subscribe({
      next: (peritos) => { this.peritos = peritos; },
      error: (err) => { console.error('Erro ao carregar peritos:', err); this.peritos = []; }
    });
  }

  carregarUnidades(): void {
    this.http.get<any>(`${environment.apiUrl}/unidades-demandantes/`).subscribe({
      next: (response) => { this.unidades = response.results || response || []; },
      error: (err) => { console.error('Erro ao carregar unidades:', err); this.unidades = []; }
    });
  }

  verificarFiltrosUrl(): void {
    this.route.queryParams.subscribe(params => {
      const novosFiltros: FiltrosOrdemServico = {};
      let filtrosAplicadosDaUrl = false;
      Object.keys(params).forEach(key => {
        if (['search', 'status', 'urgencia', 'unidade_id', 'data_inicio', 'data_fim', 'vencida', 'sem_ciencia', 'perito_id'].includes(key)) {
          const typedKey = key as keyof FiltrosOrdemServico;
          if (params[key] === 'true') { (novosFiltros as any)[typedKey] = true; }
          else if (params[key] === 'false') { (novosFiltros as any)[typedKey] = false; }
          else { (novosFiltros as any)[typedKey] = params[key]; }
          filtrosAplicadosDaUrl = true;
        }
      });
      this.filtros = { ...this.filtros, ...novosFiltros };
      if (filtrosAplicadosDaUrl && (this.filtros.status || this.filtros.urgencia || this.filtros.unidade_id || this.filtros.data_inicio || this.filtros.data_fim || this.filtros.vencida || this.filtros.sem_ciencia)) {
          this.mostrarFiltros = true;
      }
      if (params['page']) {
        const pageNum = parseInt(params['page'], 10);
        if (!isNaN(pageNum) && pageNum > 0) { this.paginaAtual = pageNum; }
      }
    });
  }

  // ===========================================================================
  // FILTROS
  // ===========================================================================

  aplicarFiltros(): void {
    this.paginaAtual = 1;
    this.carregarOrdens();
    this.atualizarUrlComFiltros();
  }

  limparFiltros(): void {
    this.filtros = {};
    this.paginaAtual = 1;
    this.carregarOrdens();
    this.atualizarUrlComFiltros();
  }

  toggleFiltros(): void {
    this.mostrarFiltros = !this.mostrarFiltros;
  }

  private atualizarUrlComFiltros(): void {
     const queryParamsAtivos: any = {};
     Object.keys(this.filtros).forEach(key => {
        const typedKey = key as keyof FiltrosOrdemServico;
        if (this.filtros[typedKey] !== null && this.filtros[typedKey] !== undefined && this.filtros[typedKey] !== '') {
            queryParamsAtivos[typedKey] = this.filtros[typedKey];
        }
     });
    this.router.navigate([], { relativeTo: this.route, queryParams: queryParamsAtivos, queryParamsHandling: 'merge', replaceUrl: true });
  }

  // ===========================================================================
  // ORDENAÇÃO
  // ===========================================================================

  ordenarColuna(campo: string): void {
     let novoOrdenarPor = '';
     if (this.ordenarPor === campo) { novoOrdenarPor = `-${campo}`; this.ordenarDirecao = 'desc'; }
     else { novoOrdenarPor = campo; this.ordenarDirecao = 'asc'; }
     if (novoOrdenarPor !== this.ordenarPor) {
        this.ordenarPor = novoOrdenarPor;
        this.paginaAtual = 1;
        this.carregarOrdens();
     }
  }

  getIconeOrdenacao(campo: string): string {
    if (this.ordenarPor === campo) return 'bi-arrow-up';
    if (this.ordenarPor === `-${campo}`) return 'bi-arrow-down';
    return 'bi-arrow-down-up text-muted';
  }

  // ===========================================================================
  // PAGINAÇÃO
  // ===========================================================================

  irParaPagina(pagina: number | string): void {
    if (typeof pagina === 'string') return;
    if (pagina >= 1 && pagina <= this.totalPaginas && pagina !== this.paginaAtual) {
      this.paginaAtual = pagina;
      this.paginaInput = pagina;
      this.carregarOrdens();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  irParaPaginaDigitada(): void {
    const pagina = parseInt(this.paginaInput.toString(), 10);
    if (!isNaN(pagina) && pagina >= 1 && pagina <= this.totalPaginas) {
      this.irParaPagina(pagina);
    } else {
      Swal.fire({ title: 'Página inválida!', text: `Digite um número entre 1 e ${this.totalPaginas}`, icon: 'warning', confirmButtonText: 'OK', timer: 3000 });
      this.paginaInput = this.paginaAtual;
    }
  }

  getPaginas(): (number | string)[] {
    const paginas: (number | string)[] = [];
    const maxPaginasVisiveis = 5;
    const metade = Math.floor(maxPaginasVisiveis / 2);
    if (this.totalPaginas <= maxPaginasVisiveis + 2) {
      for (let i = 1; i <= this.totalPaginas; i++) { paginas.push(i); }
    } else {
      paginas.push(1);
      if (this.paginaAtual > metade + 2) { paginas.push('...'); }
      const inicio = Math.max(2, this.paginaAtual - metade);
      const fim = Math.min(this.totalPaginas - 1, this.paginaAtual + metade);
      for (let i = inicio; i <= fim; i++) { paginas.push(i); }
      if (this.paginaAtual < this.totalPaginas - metade - 1) { paginas.push('...'); }
      paginas.push(this.totalPaginas);
    }
    return paginas;
  }

  getIndicePrimeiro(): number {
    if (this.totalItens === 0) return 0;
    return (this.paginaAtual - 1) * this.itensPorPagina + 1;
  }

  getIndiceUltimo(): number {
    return Math.min(this.paginaAtual * this.itensPorPagina, this.totalItens);
  }

  // ===========================================================================
  // PREFERÊNCIAS DO USUÁRIO
  // ===========================================================================

  salvarPreferencias(): void {
    try {
      const prefs = { modoExibicao: this.modoExibicao, ordenarPor: this.ordenarPor };
      localStorage.setItem('os_preferencias', JSON.stringify(prefs));
    } catch (e) { console.error("Erro ao salvar preferências:", e); }
  }

  carregarPreferencias(): void {
    try {
      const prefs = localStorage.getItem('os_preferencias');
      if (prefs) {
        const parsed = JSON.parse(prefs);
        this.modoExibicao = parsed.modoExibicao === 'cards' ? 'cards' : 'tabela';
        this.ordenarPor = typeof parsed.ordenarPor === 'string' ? parsed.ordenarPor : '-created_at';
      }
    } catch (e) {
      console.error("Erro ao carregar preferências:", e);
      localStorage.removeItem('os_preferencias');
      this.modoExibicao = 'tabela'; this.ordenarPor = '-created_at';
    }
  }

  // ===========================================================================
  // NAVEGAÇÃO
  // ===========================================================================

  verDetalhes(os: OrdemServico): void {
    this.router.navigate(['/gabinete-virtual/operacional/ordens-servico', os.id]);
  }

  novaOrdemServico(): void {
    if (this.isAdministrativo()) {
      this.router.navigate(['/gabinete-virtual/operacional/ordens-servico/novo']);
    }
  }

  // ===========================================================================
  // AÇÕES
  // ===========================================================================

  tomarCiencia(os: OrdemServico): void {
    Swal.fire({
      title: '🔐 Tomar Ciência',
      html: `<p>Para tomar ciência da OS <strong>${os.numero_os}</strong>, confirme sua identidade digitando sua senha:</p><input type="password" id="senha-ciencia" class="swal2-input" placeholder="Digite sua senha" autocomplete="current-password">`,
      icon: 'question', showCancelButton: true, confirmButtonText: '✅ Confirmar Ciência', cancelButtonText: 'Cancelar', confirmButtonColor: '#28a745', cancelButtonColor: '#6c757d', focusConfirm: false,
      didOpen: () => { const input = Swal.getPopup()?.querySelector('#senha-ciencia') as HTMLInputElement; input?.focus(); },
      preConfirm: () => { const senha = (document.getElementById('senha-ciencia') as HTMLInputElement)?.value; if (!senha) { Swal.showValidationMessage('Por favor, digite sua senha!'); return false; } return senha; }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const senha = result.value;
        Swal.fire({ title: 'Registrando ciência...', html: 'Aguarde...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        this.ordemServicoService.tomarCiencia(os.id, { password: senha }).subscribe({
          next: (response) => { Swal.fire({ title: 'Sucesso!', html: `<p><strong>${response.message}</strong></p><p class="text-muted mt-2">O prazo de ${os.prazo_dias} dia(s) começou a contar!</p>`, icon: 'success', confirmButtonText: 'OK', confirmButtonColor: '#28a745' }).then(() => { this.carregarOrdens(); }); },
          error: (err) => { this.handleApiError(err, 'Erro ao tomar ciência'); }
        });
      }
    });
  }

  iniciarTrabalho(os: OrdemServico): void {
    Swal.fire({
      title: '▶️ Iniciar Trabalho', html: `<p>Deseja marcar a OS <strong>${os.numero_os}</strong> como <strong>"Em Andamento"</strong>?</p><p class="text-muted mt-2">Isso indica que você começou a trabalhar nos exames periciais.</p>`,
      icon: 'question', showCancelButton: true, confirmButtonText: '▶️ Sim, iniciar!', cancelButtonText: 'Cancelar', confirmButtonColor: '#17a2b8', cancelButtonColor: '#6c757d'
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({ title: 'Iniciando trabalho...', html: 'Aguarde...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        this.ordemServicoService.iniciarTrabalho(os.id).subscribe({
          next: (response) => { Swal.fire({ title: 'Sucesso!', html: `<p><strong>${response.message}</strong></p><p class="text-muted mt-2">A OS agora está marcada como "Em Andamento".</p>`, icon: 'success', confirmButtonText: 'OK', confirmButtonColor: '#28a745' }).then(() => { this.carregarOrdens(); }); },
          error: (err) => { this.handleApiError(err, 'Erro ao iniciar trabalho'); }
        });
      }
    });
  }

  baixarPdf(ordem: OrdemServico, oficial: boolean = false): void {
    const url = oficial ? `${this.apiUrl}/${ordem.id}/pdf-oficial/` : `${this.apiUrl}/${ordem.id}/pdf/`;

    // Mostra o loading AQUI
    Swal.fire({ title: 'Gerando PDF...', html: 'Aguarde um momento.', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });

    this.http.get(url, { responseType: 'blob', observe: 'response' }).subscribe({
      next: (response: any) => {
        Swal.close(); // ✅ CORREÇÃO: Usa Swal.close() para fechar o loading
        const blob = response.body;
        const contentDisposition = response.headers.get('content-disposition');
        let filename = `OS-${ordem.numero_os.replace('/', '_')}.pdf`;
        if (contentDisposition) {
            const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
            const matches = filenameRegex.exec(contentDisposition);
            if (matches != null && matches[1]) { filename = matches[1].replace(/['"]/g, ''); }
        }
        if (blob && blob.size > 0) {
          const urlBlob = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = urlBlob; link.download = filename; document.body.appendChild(link); link.click(); link.remove(); window.URL.revokeObjectURL(urlBlob);
        } else {
             console.error("Blob vazio recebido."); Swal.fire('Erro', 'O arquivo PDF recebido está vazio.', 'error');
        }
      },
      error: (err: any) => {
        Swal.close(); // ✅ CORREÇÃO: Usa Swal.close() para fechar o loading em caso de erro também
        console.error('Erro ao baixar PDF:', err);
        if (err.error instanceof Blob && err.error.type === "application/json") {
             const reader = new FileReader();
             reader.onload = (e: any) => {
                 try { const errorJson = JSON.parse(e.target.result); this.handlePdfError(err.status, errorJson, ordem); }
                 catch (parseError) { this.handlePdfError(err.status, { error: 'Não foi possível interpretar a resposta de erro.' }, ordem); }
             };
             reader.readAsText(err.error);
        } else { this.handlePdfError(err.status, err.error || { error: 'Erro desconhecido ao gerar PDF.' }, ordem); }
      }
    });
  }

  private handlePdfError(status: number, errorBody: any, ordem: OrdemServico): void {
      if (status === 403) {
          Swal.fire({ title: 'Ciência Necessária!', html: `<p>${errorBody?.error || 'Você precisa tomar ciência desta Ordem de Serviço antes de visualizar o PDF.'}</p><p class="text-muted mt-2">Clique em "Ver Detalhes" para tomar ciência.</p>`, icon: 'warning', showCancelButton: true, confirmButtonText: 'Ver Detalhes da OS', cancelButtonText: 'Fechar', confirmButtonColor: '#3182ce' })
          .then((result: any) => { if (result.isConfirmed) { this.verDetalhes(ordem); } });
      } else { this.handleApiError({ status: status, error: errorBody }, 'Erro ao gerar PDF'); }
  }

  private handleApiError(err: any, defaultMessage: string): void {
      console.error(defaultMessage + ':', err);
      let errorMessage = defaultMessage;
       if (err.error) {
            if (err.error.password && Array.isArray(err.error.password)) { errorMessage = err.error.password[0]; }
            else if (err.error.error) { errorMessage = err.error.error; }
            else if (err.error.details) { errorMessage = err.error.details; }
            else if (typeof err.error === 'string') { errorMessage = err.error; }
       } else if (err.message) { errorMessage = err.message; }
      Swal.fire({ title: 'Erro!', html: errorMessage, icon: 'error', confirmButtonText: 'OK', confirmButtonColor: '#dc3545' });
  }

  // ===========================================================================
  // HELPERS VISUAIS
  // ===========================================================================

  getStatusColor(status: string): string { return this.ordemServicoService.getStatusColor(status); }
  getStatusLabel(status: string): string { return this.ordemServicoService.getStatusLabel(status); }
  getUrgenciaInfo(urgencia: string | null): { cor: string; icone: string; label: string } { return this.ordemServicoService.getUrgenciaInfo(urgencia); }

  getDiasRestantesTexto(os: OrdemServico): string {
    if (os.status === 'CONCLUIDA') {
      if (os.concluida_com_atraso === true) return 'Finalizada com atraso ⚠';
      if (os.concluida_com_atraso === false) return 'Cumprida no prazo ✓';
      return 'Finalizada';
    }
    const dias = os.dias_restantes;
    if (dias === null || dias === undefined) return 'Prazo não iniciado';
    if (dias < 0) return `Vencida há ${Math.abs(dias)} dia(s)`;
    if (dias === 0) return 'Vence hoje!';
    return `${dias} dia(s) restante(s)`;
  }

  alternarModoExibicao(): void {
    this.modoExibicao = this.modoExibicao === 'tabela' ? 'cards' : 'tabela';
    this.salvarPreferencias();
  }

  // ✅ REVERSÃO: Lógica original mantida
  isAdministrativo(): boolean {
    const user = this.authService.getCurrentUser();
    return this.authService.isSuperAdmin() || user?.perfil === 'ADMINISTRATIVO';
  }

} // Fim da classe
