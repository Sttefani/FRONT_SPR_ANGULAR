// src/app/pages/ordens-servico/lista-ordens-servico/lista-ordens-servico.component.ts

import { Component, OnInit } from '@angular/core';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { OrdemServicoService, OrdemServico, FiltrosOrdemServico } from '../../../services/ordem-servico.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import Swal from 'sweetalert2';

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
  itensPorPagina = 25;
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
    { value: 'VENCIDA', label: 'Vencida' },
    { value: 'CONCLUIDA', label: 'Concluída' }
  ];

  urgenciaOptions = [
    { value: '', label: 'Todas as urgências' },
    { value: 'vermelho', label: '🔴 Vencidas' },
    { value: 'laranja', label: '🟠 Urgentes' },
    { value: 'amarelo', label: '🟡 Atenção' },
    { value: 'verde', label: '🟢 OK' }
  ];

  quantidadeOptions = [10, 25, 50, 100];

  // Exibição
  modoExibicao: 'tabela' | 'cards' = 'tabela';
  mostrarFiltros = false;
  apiUrl = 'http://localhost:8000/api/ordens-servico';

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

    const filtrosComPaginacao = {
      ...this.filtros,
      page: this.paginaAtual,
      page_size: this.itensPorPagina,
      ordering: this.ordenarPor
    };

    this.ordemServicoService.listar(filtrosComPaginacao).subscribe({
      next: (response) => {
        this.ordensServico = response.results;
        this.totalItens = response.count;
        this.totalPaginas = Math.ceil(this.totalItens / this.itensPorPagina);
        this.loading = false;
        this.salvarPreferencias();
      },
      error: (err) => {
        this.error = 'Erro ao carregar ordens de serviço. Tente novamente.';
        this.loading = false;
        console.error('Erro:', err);
      }
    });
  }

  carregarPeritos(): void {
    this.http.get<Perito[]>('http://localhost:8000/api/usuarios/peritos_dropdown/').subscribe({
      next: (peritos) => {
        this.peritos = peritos;
        console.log('✅ Peritos carregados:', this.peritos.length);
      },
      error: (err) => {
        console.error('❌ Erro ao carregar peritos:', err);
        this.peritos = [];
      }
    });
  }

  carregarUnidades(): void {
    this.http.get<any>('http://localhost:8000/api/unidades-demandantes/').subscribe({
      next: (response) => {
        this.unidades = response.results || response;
        console.log('✅ Unidades carregadas:', this.unidades.length);
      },
      error: (err) => {
        console.error('❌ Erro ao carregar unidades:', err);
        this.unidades = [];
      }
    });
  }

  verificarFiltrosUrl(): void {
    this.route.queryParams.subscribe(params => {
      if (params['filtro_status']) {
        this.filtros.status = params['filtro_status'];
      }
    });
  }

  // ===========================================================================
  // FILTROS
  // ===========================================================================

  aplicarFiltros(): void {
    this.paginaAtual = 1;
    this.carregarOrdens();
  }

  limparFiltros(): void {
    this.filtros = {};
    this.paginaAtual = 1;
    this.carregarOrdens();
  }

  toggleFiltros(): void {
    this.mostrarFiltros = !this.mostrarFiltros;
  }

  // ===========================================================================
  // ORDENAÇÃO
  // ===========================================================================

  ordenarColuna(campo: string): void {
    if (this.ordenarPor === campo) {
      this.ordenarPor = `-${campo}`;
      this.ordenarDirecao = 'desc';
    } else if (this.ordenarPor === `-${campo}`) {
      this.ordenarPor = '-created_at';
      this.ordenarDirecao = 'desc';
    } else {
      this.ordenarPor = campo;
      this.ordenarDirecao = 'asc';
    }
    this.carregarOrdens();
  }

  getIconeOrdenacao(campo: string): string {
    if (this.ordenarPor === campo) return 'bi-arrow-up';
    if (this.ordenarPor === `-${campo}`) return 'bi-arrow-down';
    return 'bi-arrow-down-up';
  }

  // ===========================================================================
  // PAGINAÇÃO
  // ===========================================================================

  irParaPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas) {
      this.paginaAtual = pagina;
      this.paginaInput = pagina;
      this.carregarOrdens();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  irParaPaginaDigitada(): void {
    const pagina = parseInt(this.paginaInput.toString(), 10);
    if (pagina >= 1 && pagina <= this.totalPaginas) {
      this.irParaPagina(pagina);
    } else {
      Swal.fire({
        title: 'Página inválida!',
        text: `Digite um número entre 1 e ${this.totalPaginas}`,
        icon: 'warning',
        confirmButtonText: 'OK'
      });
      this.paginaInput = this.paginaAtual;
    }
  }

  getPaginas(): number[] {
    const paginas: number[] = [];
    const inicio = Math.max(1, this.paginaAtual - 2);
    const fim = Math.min(this.totalPaginas, this.paginaAtual + 2);
    for (let i = inicio; i <= fim; i++) {
      paginas.push(i);
    }
    return paginas;
  }

  mudarQuantidadePorPagina(): void {
    this.paginaAtual = 1;
    this.carregarOrdens();
  }

  getIndicePrimeiro(): number {
    return (this.paginaAtual - 1) * this.itensPorPagina + 1;
  }

  getIndiceUltimo(): number {
    return Math.min(this.paginaAtual * this.itensPorPagina, this.totalItens);
  }

  // ===========================================================================
  // PREFERÊNCIAS DO USUÁRIO
  // ===========================================================================

  salvarPreferencias(): void {
    const prefs = {
      itensPorPagina: this.itensPorPagina,
      modoExibicao: this.modoExibicao,
      ordenarPor: this.ordenarPor
    };
    localStorage.setItem('os_preferencias', JSON.stringify(prefs));
  }

  carregarPreferencias(): void {
    const prefs = localStorage.getItem('os_preferencias');
    if (prefs) {
      const parsed = JSON.parse(prefs);
      this.itensPorPagina = parsed.itensPorPagina || 25;
      this.modoExibicao = parsed.modoExibicao || 'tabela';
      this.ordenarPor = parsed.ordenarPor || '-created_at';
    }
  }

  // ===========================================================================
  // NAVEGAÇÃO
  // ===========================================================================

  verDetalhes(os: OrdemServico): void {
    this.router.navigate(['/gabinete-virtual/operacional/ordens-servico', os.id]);
  }

  novaOrdemServico(): void {
    this.router.navigate(['/gabinete-virtual/operacional/ordens-servico/novo']);
  }

  // ===========================================================================
  // AÇÕES
  // ===========================================================================

  tomarCiencia(os: OrdemServico): void {
    Swal.fire({
      title: '🔐 Tomar Ciência',
      html: `
        <p>Para tomar ciência da OS <strong>${os.numero_os}</strong>, confirme sua identidade digitando sua senha:</p>
        <input type="password" id="senha-ciencia" class="swal2-input" placeholder="Digite sua senha" autocomplete="current-password">
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: '✅ Confirmar Ciência',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#28a745',
      cancelButtonColor: '#6c757d',
      focusConfirm: false,
      preConfirm: () => {
        const senha = (document.getElementById('senha-ciencia') as HTMLInputElement).value;
        if (!senha) {
          Swal.showValidationMessage('Por favor, digite sua senha!');
          return false;
        }
        return senha;
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const senha = result.value;

        Swal.fire({
          title: 'Registrando ciência...',
          html: 'Aguarde um momento',
          allowOutsideClick: false,
          allowEscapeKey: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        this.ordemServicoService.tomarCiencia(os.id, { password: senha }).subscribe({
          next: (response) => {
            Swal.fire({
              title: 'Sucesso!',
              html: `
                <p><strong>${response.message}</strong></p>
                <p class="text-muted mt-2">O prazo de ${os.prazo_dias} dia(s) começou a contar!</p>
              `,
              icon: 'success',
              confirmButtonText: 'OK',
              confirmButtonColor: '#28a745'
            }).then(() => {
              this.carregarOrdens();
            });
          },
          error: (err) => {
            console.error('Erro ao tomar ciência:', err);
            Swal.fire({
              title: 'Erro!',
              html: err.error?.password?.[0] || err.error?.error || 'Senha incorreta ou erro ao registrar ciência.',
              icon: 'error',
              confirmButtonText: 'OK',
              confirmButtonColor: '#dc3545'
            });
          }
        });
      }
    });
  }

  iniciarTrabalho(os: OrdemServico): void {
    Swal.fire({
      title: '▶️ Iniciar Trabalho',
      html: `
        <p>Deseja marcar a OS <strong>${os.numero_os}</strong> como <strong>"Em Andamento"</strong>?</p>
        <p class="text-muted mt-2">Isso indica que você começou a trabalhar nos exames periciais.</p>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: '▶️ Sim, iniciar!',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#17a2b8',
      cancelButtonColor: '#6c757d'
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: 'Iniciando trabalho...',
          html: 'Aguarde um momento',
          allowOutsideClick: false,
          allowEscapeKey: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        this.ordemServicoService.iniciarTrabalho(os.id).subscribe({
          next: (response) => {
            Swal.fire({
              title: 'Sucesso!',
              html: `
                <p><strong>${response.message}</strong></p>
                <p class="text-muted mt-2">A OS agora está marcada como "Em Andamento".</p>
              `,
              icon: 'success',
              confirmButtonText: 'OK',
              confirmButtonColor: '#28a745'
            }).then(() => {
              this.carregarOrdens();
            });
          },
          error: (err) => {
            console.error('Erro ao iniciar trabalho:', err);
            Swal.fire({
              title: 'Erro!',
              html: err.error?.error || 'Não foi possível iniciar o trabalho.',
              icon: 'error',
              confirmButtonText: 'OK',
              confirmButtonColor: '#dc3545'
            });
          }
        });
      }
    });
  }

  baixarPdf(ordem: any, oficial: boolean = false): void {
    const url = oficial
      ? `${this.apiUrl}/${ordem.id}/pdf-oficial/`
      : `${this.apiUrl}/${ordem.id}/pdf/`;

    this.http.get(url, { responseType: 'blob', observe: 'response' }).subscribe({
      next: (response: any) => {
        const blob = response.body;
        if (blob) {
          const urlBlob = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = urlBlob;
          link.download = `OS-${ordem.numero_os}.pdf`;
          link.click();
          window.URL.revokeObjectURL(urlBlob);
        }
      },
      error: (err: any) => {
        console.error('Erro ao baixar PDF:', err);

        if (err.status === 403) {
          Swal.fire({
            title: 'Ciência Necessária!',
            html: `
              <p>Você precisa <strong>tomar ciência</strong> desta Ordem de Serviço antes de visualizar o PDF.</p>
              <p class="text-muted mt-2">Clique em "Ver Detalhes" para tomar ciência.</p>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Ver Detalhes da OS',
            cancelButtonText: 'Fechar',
            confirmButtonColor: '#3182ce'
          }).then((result: any) => {
            if (result.isConfirmed) {
              this.router.navigate(['/gabinete-virtual/operacional/ordens-servico', ordem.id]);
            }
          });
        } else {
          Swal.fire({
            title: 'Erro!',
            text: err.error?.error || 'Não foi possível gerar o PDF.',
            icon: 'error',
            confirmButtonText: 'OK'
          });
        }
      }
    });
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  getStatusColor(status: string): string {
    return this.ordemServicoService.getStatusColor(status);
  }

  getStatusLabel(status: string): string {
    return this.ordemServicoService.getStatusLabel(status);
  }

  getUrgenciaInfo(urgencia: string | null): { cor: string; icone: string; label: string } {
    return this.ordemServicoService.getUrgenciaInfo(urgencia);
  }

 getDiasRestantesTexto(os: OrdemServico): string {
  // ✅ 1º: Verificar se está concluída ANTES
  if (os.status === 'CONCLUIDA') {
    if (os.concluida_com_atraso) {  // ✅ CORRETO
      return 'Finalizada com atraso';
    }
    return 'Cumprida no prazo ✓';
  }

  const dias = os.dias_restantes;

  if (dias === null) {
    return 'Prazo não iniciado';
  }

  if (dias < 0) {
    return `Vencida há ${Math.abs(dias)} dia(s)`;
  }

  if (dias === 0) {
    return 'Vence hoje!';
  }

  return `${dias} dia(s) restante(s)`;
}
  alternarModoExibicao(): void {
    this.modoExibicao = this.modoExibicao === 'tabela' ? 'cards' : 'tabela';
    this.salvarPreferencias();
  }

  isAdministrativo(): boolean {
    const user = this.authService.getCurrentUser();
    return this.authService.isSuperAdmin() || user?.perfil === 'ADMINISTRATIVO';
  }
}
