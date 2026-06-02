import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

import {
  CustodiaService,
  VestigioDetalhe,
  VestigioList,
  VestigioMovimentacao,
  OcorrenciaVinculada,
  DNA
} from '../../services/custodia.service';
import { AuthService } from '../../services/auth.service';
import { ServicoPericialService } from '../../services/servico-pericial.service';
import { UnidadeDemandanteService } from '../../services/unidade-demandante.service';
import { AutoridadeService } from '../../services/autoridade.service';

type Tab = 'movimentacoes' | 'dnas' | 'contra-provas';

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
  contraProvas: VestigioList[] = [];

  isLoading = true;
  isLoadingMovs = false;
  isLoadingDnas = false;
  isLoadingContraProvas = false;
  isSaving = false;

  // ── Vincular DNA existente ao vestígio ───────────────────────────────────
  showDnaSearch = false;
  buscaDna = '';
  dnasBuscados: DNA[] = [];
  buscandoDna = false;

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
    this.carregarContraProvas(id);
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

  carregarContraProvas(id: number): void {
    this.isLoadingContraProvas = true;
    this.custodiaService.getContraProvas(id).subscribe({
      next: (data) => { this.contraProvas = data; this.isLoadingContraProvas = false; },
      error: () => { this.isLoadingContraProvas = false; }
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
    const emailUsuario = this.authService.getCurrentUser()?.email ?? '';

    Swal.fire({
      title: 'Finalizar Vestígio',
      html: `
        <div style="text-align:left;font-size:.9rem">

          <div style="margin-bottom:1rem">
            <label style="display:block;font-weight:600;margin-bottom:.3rem">
              Motivo da finalização <span style="color:#e74c3c">*</span>
            </label>
            <textarea id="swal-motivo" rows="4"
              style="width:100%;padding:.5rem;border:1px solid #ccc;border-radius:4px;resize:vertical;font-size:.9rem"
              placeholder="Descreva o motivo da finalização, destinatário, condições de entrega..."></textarea>
          </div>

          <div style="margin-bottom:1rem">
            <label style="display:flex;align-items:center;gap:.5rem">
              <input type="checkbox" id="swal-saiu" style="width:16px;height:16px">
              <span>O vestígio saiu fisicamente da custódia</span>
            </label>
          </div>

          <hr style="margin:1rem 0;border-color:#eee">
          <p style="color:#555;font-size:.85rem;margin-bottom:.8rem">
            <strong>Assinatura digital</strong> — confirme sua identidade para garantir o não-repúdio.
          </p>

          <div style="margin-bottom:.8rem">
            <label style="display:block;font-weight:600;margin-bottom:.3rem">E-mail</label>
            <input id="swal-email" type="email" value="${emailUsuario}" readonly
              style="width:100%;padding:.4rem .5rem;border:1px solid #ccc;border-radius:4px;background:#f8f8f8;font-size:.9rem">
          </div>

          <div>
            <label style="display:block;font-weight:600;margin-bottom:.3rem">
              Senha <span style="color:#e74c3c">*</span>
            </label>
            <input id="swal-senha" type="password"
              style="width:100%;padding:.4rem .5rem;border:1px solid #ccc;border-radius:4px;font-size:.9rem"
              placeholder="Digite sua senha para assinar">
          </div>

        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Assinar e Finalizar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#c0392b',
      width: '520px',
      preConfirm: () => {
        const motivo = (document.getElementById('swal-motivo') as HTMLTextAreaElement)?.value?.trim();
        const saiu   = (document.getElementById('swal-saiu')   as HTMLInputElement)?.checked ?? false;
        const email  = (document.getElementById('swal-email')  as HTMLInputElement)?.value?.trim();
        const senha  = (document.getElementById('swal-senha')  as HTMLInputElement)?.value;

        if (!motivo) {
          Swal.showValidationMessage('O motivo da finalização é obrigatório.');
          return false;
        }
        if (!senha) {
          Swal.showValidationMessage('A senha é obrigatória para assinar.');
          return false;
        }
        return { saiu_da_custodia: saiu, motivo_finalizacao: motivo, assinatura_email: email, assinatura_senha: senha };
      }
    }).then(result => {
      if (result.isConfirmed && this.vestigio) {
        this.custodiaService.finalizarVestigio(this.vestigio.id, result.value).subscribe({
          next: (v) => {
            this.vestigio = v;
            this.carregarMovimentacoes(v.id);
            Swal.fire({ title: 'Vestígio finalizado!', icon: 'success', timer: 1800, showConfirmButton: false });
          },
          error: (err) => {
            const msg = err?.error?.detail || 'Erro ao finalizar vestígio.';
            Swal.fire('Erro', msg, 'error');
          }
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
          error: (err) => {
            if (err.status === 403) {
              this.showMessage(
                'Sem permissão para aceitar esta movimentação. Apenas o destinatário pode confirmar o recebimento.',
                'error'
              );
            } else {
              const msg = err?.error?.detail || 'Erro ao confirmar recebimento.';
              this.showMessage(msg, 'error');
            }
          }
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

  // ── Busca e vínculo de DNA existente ─────────────────────────────────────

  toggleDnaSearch(): void {
    this.showDnaSearch = !this.showDnaSearch;
    if (!this.showDnaSearch) {
      this.buscaDna = '';
      this.dnasBuscados = [];
    }
  }

  buscarDnas(): void {
    if (!this.buscaDna.trim()) return;
    this.buscandoDna = true;
    this.dnasBuscados = [];
    this.custodiaService.getDnasPaginado({ search: this.buscaDna.trim(), page_size: 10 }).subscribe({
      next: (res) => { this.dnasBuscados = res.results; this.buscandoDna = false; },
      error: () => { this.buscandoDna = false; }
    });
  }

  vincularDna(dna: DNA): void {
    if (!this.vestigio) return;
    const jaVinculado = this.dnas.some(d => d.id === dna.id);
    if (jaVinculado) {
      this.showMessage('Este DNA já está vinculado a este vestígio.', 'error');
      return;
    }
    const aviso = dna.vestigio_lacre
      ? `<p style="color:#c05c00;font-size:.85rem;margin-top:.5rem">
           ⚠️ Este cadastro já está vinculado ao lacre <strong>${dna.vestigio_lacre}</strong>.
           O vínculo atual será substituído.
         </p>`
      : '';
    Swal.fire({
      title: 'Vincular DNA ao vestígio?',
      html: `<p>Vincular o cadastro de <strong>${dna.nome}</strong> (CPF: ${dna.cpf || '—'}) a este vestígio?</p>${aviso}`,
      icon: dna.vestigio_lacre ? 'warning' : 'question',
      showCancelButton: true,
      confirmButtonText: 'Sim, vincular',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed && this.vestigio) {
        this.custodiaService.vincularDnaAoVestigio(dna.id, this.vestigio.id).subscribe({
          next: () => {
            this.carregarDnas(this.vestigio!.id);
            this.showDnaSearch = false;
            this.buscaDna = '';
            this.dnasBuscados = [];
            this.showMessage('DNA vinculado ao vestígio com sucesso.', 'success');
          },
          error: () => this.showMessage('Erro ao vincular DNA.', 'error')
        });
      }
    });
  }

  desvincularDnaDoVestigio(dna: DNA): void {
    Swal.fire({
      title: 'Desvincular DNA?',
      html: `Remover o vínculo de <strong>${dna.nome}</strong> com este vestígio?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, desvincular',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed) {
        this.custodiaService.vincularDnaAoVestigio(dna.id, null).subscribe({
          next: () => {
            this.carregarDnas(this.vestigio!.id);
            this.showMessage('DNA desvinculado do vestígio.', 'success');
          },
          error: () => this.showMessage('Erro ao desvincular DNA.', 'error')
        });
      }
    });
  }

  irParaOriginal(): void {
    if (this.vestigio?.vestigio_contra_prova) {
      this.router.navigate(['/gabinete-virtual/custodia/vestigios', this.vestigio.vestigio_contra_prova]);
    }
  }

  irParaVestigio(id: number): void {
    this.router.navigate(['/gabinete-virtual/custodia/vestigios', id]);
  }

  voltar(): void {
    this.router.navigate(['/gabinete-virtual/custodia/vestigios']);
  }
}
