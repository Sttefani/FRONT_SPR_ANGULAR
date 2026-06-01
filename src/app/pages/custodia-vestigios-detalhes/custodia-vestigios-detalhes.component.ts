import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

import {
  CustodiaService,
  VestigioDetalhe,
  VestigioMovimentacao,
  OcorrenciaVinculada,
  DNA
} from '../../services/custodia.service';
import { AuthService } from '../../services/auth.service';
import { ServicoPericialService } from '../../services/servico-pericial.service';
import { UnidadeDemandanteService } from '../../services/unidade-demandante.service';
import { AutoridadeService } from '../../services/autoridade.service';

type Tab = 'movimentacoes' | 'dnas';

@Component({
  selector: 'app-custodia-vestigios-detalhes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './custodia-vestigios-detalhes.component.html',
  styleUrls: ['./custodia-vestigios-detalhes.component.scss']
})
export class CustodiaVestigiosDetalhesComponent implements OnInit {

  vestigio: VestigioDetalhe | null = null;
  movimentacoes: VestigioMovimentacao[] = [];
  dnas: DNA[] = [];

  isLoading = true;
  isLoadingMovs = false;
  isLoadingDnas = false;
  isSaving = false;

  tabAtiva: Tab = 'movimentacoes';
  message = '';
  messageType: 'success' | 'error' = 'success';

  isCustodiante = false;
  isSuperAdmin = false;

  // Form de nova movimentação
  showMovForm = false;
  movForm = {
    lacre: '',
    num_processo_sei: '',
    descricao: '',
    unidade_demandante_id: null as number | null,
    servico_pericial_id: null as number | null,
    autoridade_id: null as number | null,
  };

  servicos: any[] = [];
  unidades: any[] = [];
  autoridades: any[] = [];


  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private custodiaService: CustodiaService,
    private authService: AuthService,
    private servicoPericialService: ServicoPericialService,
    private unidadeDemandanteService: UnidadeDemandanteService,
    private autoridadeService: AutoridadeService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.isSuperAdmin = this.authService.isSuperAdmin();
    this.isCustodiante = user?.perfil !== 'EXTERNO';

    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.carregarVestigio(id);
    this.carregarMovimentacoes(id);
    this.carregarDropdowns();
  }

  carregarVestigio(id: number): void {
    this.isLoading = true;
    this.custodiaService.getVestigio(id).subscribe({
      next: (v) => { this.vestigio = v; this.isLoading = false; },
      error: () => { this.message = 'Erro ao carregar vestígio.'; this.messageType = 'error'; this.isLoading = false; }
    });
  }

  carregarMovimentacoes(id: number): void {
    this.isLoadingMovs = true;
    this.custodiaService.getMovimentacoes(id).subscribe({
      next: (data) => { this.movimentacoes = data; this.isLoadingMovs = false; },
      error: () => { this.isLoadingMovs = false; }
    });
  }

  carregarDnas(id: number): void {
    this.isLoadingDnas = true;
    this.custodiaService.getDnas(id).subscribe({
      next: (data) => { this.dnas = data; this.isLoadingDnas = false; },
      error: () => { this.isLoadingDnas = false; }
    });
  }

  carregarDropdowns(): void {
    this.servicoPericialService.getAll().subscribe({ next: (r: any) => this.servicos = r.results ?? r, error: () => {} });
    this.unidadeDemandanteService.getAll().subscribe({ next: (r: any) => this.unidades = r.results ?? r, error: () => {} });
    this.autoridadeService.getAll().subscribe({ next: (r: any) => this.autoridades = r.results ?? r, error: () => {} });
  }

  mudarTab(tab: Tab): void {
    this.tabAtiva = tab;
    if (tab === 'dnas' && this.dnas.length === 0 && this.vestigio) {
      this.carregarDnas(this.vestigio.id);
    }
  }

  // ── Finalizar / Reabrir ──────────────────────────────────────────────────

  finalizar(): void {
    Swal.fire({
      title: 'Finalizar Vestígio',
      html: `
        <p style="margin-bottom:1rem">O vestígio saiu fisicamente da custódia?</p>
        <label style="display:flex;align-items:center;gap:.5rem;justify-content:center">
          <input type="checkbox" id="saiuCheck"> Sim, saiu da custódia
        </label>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Finalizar',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const el = document.getElementById('saiuCheck') as HTMLInputElement;
        return { saiu_da_custodia: el?.checked ?? false };
      }
    }).then(result => {
      if (result.isConfirmed && this.vestigio) {
        this.custodiaService.finalizarVestigio(this.vestigio.id, result.value).subscribe({
          next: (v) => {
            this.vestigio = v;
            this.showMessage('Vestígio finalizado com sucesso.', 'success');
          },
          error: () => this.showMessage('Erro ao finalizar vestígio.', 'error')
        });
      }
    });
  }

  reabrir(): void {
    Swal.fire({
      title: 'Reabrir Vestígio',
      text: 'Confirma a reabertura do vestígio?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, reabrir',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed && this.vestigio) {
        this.custodiaService.reabrirVestigio(this.vestigio.id).subscribe({
          next: (v) => {
            this.vestigio = v;
            this.showMessage('Vestígio reaberto.', 'success');
          },
          error: () => this.showMessage('Erro ao reabrir vestígio.', 'error')
        });
      }
    });
  }

  // ── Movimentação ──────────────────────────────────────────────────────────

  registrarMovimentacao(): void {
    if (!this.vestigio) return;
    this.isSaving = true;

    const payload = {
      ...this.movForm,
      vestigio_id: this.vestigio.id
    };

    this.custodiaService.criarMovimentacao(payload).subscribe({
      next: (mov) => {
        this.movimentacoes.unshift(mov);
        this.showMovForm = false;
        this.resetMovForm();
        // atualiza status na tela
        if (this.vestigio?.status === 'INICIAL') this.vestigio.status = 'ANDAMENTO';
        this.showMessage('Movimentação registrada com sucesso.', 'success');
        this.isSaving = false;
      },
      error: () => {
        this.showMessage('Erro ao registrar movimentação.', 'error');
        this.isSaving = false;
      }
    });
  }

  aceitarMovimentacao(mov: VestigioMovimentacao): void {
    Swal.fire({
      title: 'Aceitar recebimento?',
      text: 'Confirma que o vestígio foi recebido nesta movimentação?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Confirmar recebimento',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed) {
        this.custodiaService.aceitarMovimentacao(mov.id).subscribe({
          next: (m) => {
            const idx = this.movimentacoes.findIndex(x => x.id === m.id);
            if (idx >= 0) this.movimentacoes[idx] = m;
            this.showMessage('Recebimento confirmado.', 'success');
          },
          error: () => this.showMessage('Erro ao confirmar recebimento.', 'error')
        });
      }
    });
  }

  resetMovForm(): void {
    this.movForm = { lacre: '', num_processo_sei: '', descricao: '', unidade_demandante_id: null, servico_pericial_id: null, autoridade_id: null };
  }

  // ── Ocorrências vinculadas ────────────────────────────────────────────────

  /**
   * Abre o modal de busca por número de ocorrência (mesmo padrão do
   * vincular-procedimento na tela de detalhes da Ocorrência).
   */
  abrirModalVincularOcorrencia(): void {
    Swal.fire({
      title: 'Vincular Ocorrência',
      html: `
        <p style="margin-bottom:1rem;font-size:.9rem;color:#555">
          Digite o número da ocorrência (ex: <strong>2405001/BAL</strong>)
        </p>
        <input id="swal-numero-oc"
               class="swal2-input"
               placeholder="Número da ocorrência"
               style="text-transform:uppercase">
      `,
      confirmButtonText: 'Buscar',
      cancelButtonText: 'Cancelar',
      showCancelButton: true,
      preConfirm: () => {
        const val = (document.getElementById('swal-numero-oc') as HTMLInputElement)?.value?.trim();
        if (!val) { Swal.showValidationMessage('Informe o número da ocorrência.'); return false; }
        return val;
      }
    }).then(result => {
      if (result.isConfirmed && result.value) {
        this.buscarEVincularOcorrencia(result.value);
      }
    });
  }

  private buscarEVincularOcorrencia(numero: string): void {
    this.custodiaService.buscarOcorrenciaPorNumero(numero).subscribe({
      next: (resp) => {
        if (!resp.exists || !resp.ocorrencia) {
          Swal.fire('Não encontrada',
            `Ocorrência <strong>${numero}</strong> não existe ou não foi localizada.`,
            'warning');
          return;
        }
        const oc = resp.ocorrencia;
        const procInfo = oc.procedimento
          ? `<br><small>Procedimento: <strong>${oc.procedimento.numero_completo}</strong> (será vinculado automaticamente)</small>`
          : '';
        Swal.fire({
          title: 'Confirmar vinculação?',
          html: `
            <p><strong>${oc.numero_ocorrencia}</strong></p>
            <p style="font-size:.85rem;color:#555">
              Serviço: ${oc.servico_sigla} &nbsp;|&nbsp; Status: ${oc.status_display}
            </p>
            ${procInfo}
          `,
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Sim, vincular',
          cancelButtonText: 'Cancelar'
        }).then(conf => {
          if (conf.isConfirmed) this.executarVinculo(oc.id, 'add');
        });
      },
      error: () => Swal.fire('Erro', 'Não foi possível buscar a ocorrência.', 'error')
    });
  }

  desvincularOcorrencia(oc: OcorrenciaVinculada): void {
    Swal.fire({
      title: 'Desvincular ocorrência?',
      html: `Remover o vínculo com <strong>${oc.numero_ocorrencia}</strong>?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, desvincular',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed) this.executarVinculo(oc.id, 'remove');
    });
  }

  private executarVinculo(ocorrenciaId: number, acao: 'add' | 'remove'): void {
    if (!this.vestigio) return;
    this.custodiaService.vincularOcorrencia(this.vestigio.id, ocorrenciaId, acao).subscribe({
      next: (resp) => {
        this.vestigio = resp.vestigio;
        const msg = acao === 'add' ? 'Ocorrência vinculada com sucesso.' : 'Ocorrência desvinculada.';
        this.showMessage(msg, 'success');
      },
      error: (err) => {
        const msg = err?.error?.detail || 'Erro ao alterar vínculo com ocorrência.';
        this.showMessage(msg, 'error');
      }
    });
  }

  navegarParaOcorrencia(ocorrenciaId: number): void {
    this.router.navigate(['/gabinete-virtual/operacional/ocorrencias', ocorrenciaId]);
  }

  // ── Utilitários ───────────────────────────────────────────────────────────

  badgeStatus(status: string): string {
    return { INICIAL: 'badge-inicial', ANDAMENTO: 'badge-andamento', FINALIZADO: 'badge-finalizado' }[status] ?? 'badge-inicial';
  }

  showMessage(msg: string, type: 'success' | 'error'): void {
    this.message = msg;
    this.messageType = type;
    setTimeout(() => this.message = '', 4000);
  }

  editar(): void {
    if (this.vestigio) this.router.navigate(['/gabinete-virtual/custodia/vestigios', this.vestigio.id, 'editar']);
  }

  registrarDna(): void {
    if (this.vestigio) {
      this.router.navigate(['/gabinete-virtual/custodia/dna/novo'], {
        queryParams: { vestigio: this.vestigio.id }
      });
    }
  }

  imprimirFicha(): void {
    if (!this.vestigio) return;
    // Busca o PDF autenticado (JWT via HttpClient interceptor) e abre como Blob URL
    this.custodiaService.getFichaVestigioPdf(this.vestigio.id).subscribe({
      next: (blob) => {
        const blobUrl = URL.createObjectURL(blob);
        const aba = window.open(blobUrl, '_blank');
        // Revoga o Blob URL após 60 s para liberar memória
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
        if (!aba) {
          // Fallback: dispara download se o popup foi bloqueado
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = `ficha_vestigio_${this.vestigio!.id}.pdf`;
          link.click();
        }
      },
      error: () => this.showMessage('Erro ao gerar ficha PDF.', 'error')
    });
  }

  voltar(): void {
    this.router.navigate(['/gabinete-virtual/custodia/vestigios']);
  }
}
