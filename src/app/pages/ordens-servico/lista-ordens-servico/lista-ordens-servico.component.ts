
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';  // ← CORRIGIDO!
import { OrdemServicoService, OrdemServico, FiltrosOrdemServico } from '../../../services/ordem-servico.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import Swal from 'sweetalert2';

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

  // Filtros
  filtros: FiltrosOrdemServico = {};
  statusOptions = [
    { value: '', label: 'Todos' },
    { value: 'AGUARDANDO_CIENCIA', label: 'Aguardando Ciência' },
    { value: 'ABERTA', label: 'Aberta' },
    { value: 'EM_ANDAMENTO', label: 'Em Andamento' },
    { value: 'VENCIDA', label: 'Vencida' },
    { value: 'CONCLUIDA', label: 'Concluída' }
  ];

  urgenciaOptions = [
    { value: '', label: 'Todas' },
    { value: 'vermelho', label: '🔴 Vencidas' },
    { value: 'laranja', label: '🟠 Urgentes' },
    { value: 'amarelo', label: '🟡 Atenção' },
    { value: 'verde', label: '🟢 OK' }
  ];

  // Exibição
  modoExibicao: 'tabela' | 'cards' = 'tabela';
  mostrarFiltros = false;
  apiUrl = 'http://localhost:8000/api/ordens-servico';  // ← ADICIONADO!

  constructor(
    private ordemServicoService: OrdemServicoService,
    private authService: AuthService,
    private router: Router,
    private http: HttpClient  // ← CORRIGIDO! (era HtttpClient com 3 t's)
  ) {}

  ngOnInit(): void {
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
      page: this.paginaAtual
    };

    this.ordemServicoService.listar(filtrosComPaginacao).subscribe({
      next: (response) => {
        this.ordensServico = response.results;
        this.totalItens = response.count;
        this.totalPaginas = Math.ceil(this.totalItens / this.itensPorPagina);
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Erro ao carregar ordens de serviço. Tente novamente.';
        this.loading = false;
        console.error('Erro:', err);
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
  // PAGINAÇÃO
  // ===========================================================================

  irParaPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas) {
      this.paginaAtual = pagina;
      this.carregarOrdens();
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

  // ===========================================================================
  // NAVEGAÇÃO
  // ===========================================================================

  verDetalhes(os: OrdemServico): void {
  this.router.navigate(['/gabinete-virtual/operacional/ordens-servico', os.id]);  // ← CORRIGIDO
}

  novaOrdemServico(): void {
  this.router.navigate(['/gabinete-virtual/operacional/ordens-servico/novo']);  // ← CORRIGIDO
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

      // Mostra loading
      Swal.fire({
        title: 'Registrando ciência...',
        html: 'Aguarde um momento',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // Chama o serviço
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
            this.carregarOrdens(); // Recarrega a lista
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
      // Mostra loading
      Swal.fire({
        title: 'Iniciando trabalho...',
        html: 'Aguarde um momento',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // Chama o serviço
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
            this.carregarOrdens(); // Recarrega a lista
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
    next: (response: any) => {  // ← ADICIONE ": any" AQUI TAMBÉM!
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

      // VERIFICA SE É 403 (bloqueado por falta de ciência)
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
        }).then((result: any) => {  // ← ADICIONE AQUI TAMBÉM!
          if (result.isConfirmed) {
            this.router.navigate(['/ordens-servico', ordem.id]);
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
    const dias = os.dias_restantes;

    if (dias === null) {
      return 'Sem ciência';
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
  }
  isAdministrativo(): boolean {
  const user = this.authService.getCurrentUser();
  return this.authService.isSuperAdmin() || user?.perfil === 'ADMINISTRATIVO';
}
}
