import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';

import { TeiaRelacoesComponent } from '../teia-relacoes/teia-relacoes.component';
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
import { ProcedimentoCadastradoService } from '../../services/procedimento-cadastrado.service';
import { ProtocoloService, ProtocoloList } from '../../services/protocolo.service';

type Tab = 'movimentacoes' | 'dnas' | 'contra-provas' | 'protocolos';

@Component({
  selector: 'app-custodia-vestigios-detalhes',
  standalone: true,
  imports: [CommonModule, FormsModule, TeiaRelacoesComponent],
  templateUrl: './custodia-vestigios-detalhes.component.html',
  styleUrls: ['./custodia-vestigios-detalhes.component.scss']
})
export class CustodiaVestigiosDetalhesComponent implements OnInit, OnDestroy {

  vestigio: VestigioDetalhe | null = null;
  movimentacoes: VestigioMovimentacao[] = [];
  dnas: DNA[] = [];
  contraProvas: VestigioList[] = [];
  protocolos: ProtocoloList[] = [];

  isLoading = true;
  isLoadingMovs = false;
  isLoadingDnas = false;
  isLoadingContraProvas = false;
  isLoadingProtocolos = false;
  isSaving = false;

  podeEmitirProtocolo = false;

  // ── Vincular DNA existente ao vestígio ───────────────────────────────────
  showDnaSearch = false;
  buscaDna = '';
  dnasBuscados: DNA[] = [];
  buscandoDna = false;

  tabAtiva: Tab = 'movimentacoes';
  message = '';
  messageType: 'success' | 'error' = 'success';

  isCustodiante = false;
  isExterno = false;
  isSuperAdmin = false;
  showTeia = false;
  podeVerTeia = false;

  // Form de nova movimentação
  showMovForm = false;
  tipoMovimentacao: 'interna' | 'externa' | 'protocolo' | null = null;
  novoLacre = false;                    // toggle "Novo lacre? SIM/NÃO" — SIM exibe o campo de lacre
  editandoMovId: number | null = null;  // id da movimentação em edição (null = nova)
  movForm = {
    lacre: '',
    descricao: '',
    unidade_demandante_id: null as number | null,
    servico_pericial_id: null as number | null,
  };

  servicos: any[] = [];

  // Autocomplete — Unidade Demandante
  unidadeBusca = '';
  todasUnidades: any[] = [];     // cache local (page_size=100)
  unidadesBuscadas: any[] = [];
  showUnidadeDropdown = false;
  private unidadeSubject$ = new Subject<string>();

  private destroy$ = new Subject<void>();


  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private custodiaService: CustodiaService,
    private authService: AuthService,
    private servicoPericialService: ServicoPericialService,
    private unidadeDemandanteService: UnidadeDemandanteService,
    private procedimentoService: ProcedimentoCadastradoService,
    private protocoloService: ProtocoloService,
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.isSuperAdmin = this.authService.isSuperAdmin();
    this.isExterno = user?.perfil === 'EXTERNO';
    this.isCustodiante = !this.isExterno;
    const _PERFIS_TEIA = ['PERITO','OPERACIONAL','ADMINISTRATIVO','SUPER_ADMIN'];
    this.podeVerTeia = _PERFIS_TEIA.includes(user?.perfil) || !!user?.is_superuser;

    this.podeEmitirProtocolo = ['CUSTODIANTE', 'ADMINISTRATIVO', 'SUPER_ADMIN'].includes(user?.perfil || '') || !!user?.is_superuser;

    this.carregarDropdowns();
    this.configurarAutocompletes();

    // Reage à mudança do :id — navegar entre vestígios (contraprova ↔ original)
    // reutiliza este componente na mesma rota, então o snapshot não bastava:
    // recarregamos os dados a cada novo id em vez de só na 1ª montagem.
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const id = Number(params.get('id'));
      if (!id) { return; }
      this.resetEstadoVestigio();
      this.carregarVestigio(id);
      this.carregarMovimentacoes(id);
      this.carregarContraProvas(id);
    });
  }

  /** Reseta o estado da tela ao alternar entre vestígios na mesma rota. */
  private resetEstadoVestigio(): void {
    this.tabAtiva = 'movimentacoes';
    this.showMovForm = false;
    this.showDnaSearch = false;
    this.dnas = [];
    this.protocolos = [];
    this.contraProvas = [];
    this.message = '';
    this.resetMovForm();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private configurarAutocompletes(): void {
    this.unidadeSubject$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(q => this.unidadeDemandanteService.getAll(q || undefined)),
      takeUntil(this.destroy$)
    ).subscribe(res => {
      this.unidadesBuscadas = res.results ?? [];
      this.showUnidadeDropdown = this.unidadesBuscadas.length > 0;
    });
  }

  carregarVestigio(id: number): void {
    this.isLoading = true;
    this.custodiaService.getVestigio(id).subscribe({
      next: (v) => { this.vestigio = v; this.isLoading = false; },
      error: (err: any) => {
        this.message = err?.status === 404
          ? 'Vestígio não encontrado ou sem permissão de acesso para este perfil.'
          : 'Erro ao carregar vestígio. Verifique a conexão e tente novamente.';
        this.messageType = 'error';
        this.isLoading = false;
      }
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

  carregarProtocolos(vestigioId: number): void {
    this.isLoadingProtocolos = true;
    this.protocoloService.getProtocolos({ vestigio: vestigioId, page_size: 50 }).subscribe({
      next: (res) => { this.protocolos = res.results; this.isLoadingProtocolos = false; },
      error: () => { this.isLoadingProtocolos = false; },
    });
  }

  emitirProtocolo(): void {
    if (!this.vestigio) return;
    this.router.navigate(['/gabinete-virtual/custodia/protocolos/novo'], {
      queryParams: { vestigio: this.vestigio.id }
    });
  }

  verProtocolo(id: number): void {
    this.router.navigate(['/gabinete-virtual/custodia/protocolos', id]);
  }

  carregarDropdowns(): void {
    this.servicoPericialService.getAll(undefined, 50).subscribe({
      next: (r: any) => this.servicos = r.results ?? r,
      error: () => {}
    });

    // Pré-carrega todas as unidades para filtro local imediato
    this.unidadeDemandanteService.getAllForDropdown().subscribe({
      next: (r: any) => this.todasUnidades = Array.isArray(r) ? r : (r.results ?? []),
      error: () => {}
    });
  }

  // ── Autocomplete — Unidade Demandante ──────────────────────────────────────

  onUnidadeFocus(): void {
    this.movForm.unidade_demandante_id = null;
    this.unidadesBuscadas = this.todasUnidades;
    this.showUnidadeDropdown = this.todasUnidades.length > 0;
    if (this.todasUnidades.length === 0) {
      // fallback: busca no servidor se o cache ainda não carregou
      this.unidadeSubject$.next('');
    }
  }

  onUnidadeInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value.toLowerCase().trim();
    this.movForm.unidade_demandante_id = null;

    if (this.todasUnidades.length > 0) {
      // Filtra localmente — sem chamada ao servidor
      this.unidadesBuscadas = val
        ? this.todasUnidades.filter(u =>
            u.sigla?.toLowerCase().includes(val) ||
            u.nome?.toLowerCase().includes(val)
          )
        : this.todasUnidades;
      this.showUnidadeDropdown = true;
    } else {
      // Fallback para busca no servidor (cache ainda carregando)
      if (val.length >= 1) {
        this.unidadeSubject$.next(val);
      } else {
        this.unidadesBuscadas = [];
        this.showUnidadeDropdown = false;
      }
    }
  }

  selecionarUnidade(u: any): void {
    this.movForm.unidade_demandante_id = u.id;
    this.unidadeBusca = `${u.sigla} — ${u.nome}`;
    this.unidadesBuscadas = [];
    this.showUnidadeDropdown = false;
  }

  limparUnidade(): void {
    this.movForm.unidade_demandante_id = null;
    this.unidadeBusca = '';
    this.unidadesBuscadas = [];
    this.showUnidadeDropdown = false;
  }

  fecharDropdownUnidade(): void {
    setTimeout(() => { this.showUnidadeDropdown = false; }, 150);
  }

  mudarTab(tab: Tab): void {
    this.tabAtiva = tab;
    if (tab === 'dnas' && this.dnas.length === 0 && this.vestigio) {
      this.carregarDnas(this.vestigio.id);
    }
    if (tab === 'protocolos' && this.protocolos.length === 0 && this.vestigio) {
      this.carregarProtocolos(this.vestigio.id);
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

    if (this.tipoMovimentacao === 'interna' && !this.movForm.servico_pericial_id) {
      Swal.fire('Campo obrigatório', 'Selecione o serviço de destino para a transferência interna.', 'warning');
      return;
    }
    if (this.tipoMovimentacao === 'externa' && !this.movForm.unidade_demandante_id) {
      Swal.fire('Campo obrigatório', 'Selecione a unidade de destino para o envio externo.', 'warning');
      return;
    }

    this.isSaving = true;
    const editando = this.editandoMovId !== null;

    // "Novo lacre? NÃO" → lacre vazio = lacre mantido (a FAV herda o lacre vigente).
    // "Novo lacre? SIM" → envia o número informado.
    const lacre = this.novoLacre ? (this.movForm.lacre || '').trim() : '';

    // garante que apenas o campo relevante é enviado (interna → serviço, externa → unidade)
    const payload: any = {
      vestigio_id: this.vestigio.id,
      lacre,
      descricao: this.movForm.descricao,
      servico_pericial_id: this.tipoMovimentacao === 'interna' ? this.movForm.servico_pericial_id : null,
      unidade_demandante_id: this.tipoMovimentacao === 'externa' ? this.movForm.unidade_demandante_id : null,
    };

    const req = editando
      ? this.custodiaService.editarMovimentacao(this.editandoMovId!, payload)
      : this.custodiaService.criarMovimentacao(payload);

    req.subscribe({
      next: (mov) => {
        if (editando) {
          const idx = this.movimentacoes.findIndex(x => x.id === mov.id);
          if (idx >= 0) this.movimentacoes[idx] = mov;
        } else {
          this.movimentacoes.unshift(mov);
          if (this.vestigio?.status === 'INICIAL') this.vestigio.status = 'ANDAMENTO';
        }
        this.showMovForm = false;
        this.resetMovForm();
        this.isSaving = false;
        Swal.fire({
          title: editando ? 'Movimentação atualizada!' : 'Movimentação registrada!',
          html: editando
            ? 'As alterações foram salvas.<br><br>' +
              '<small style="color:#555">A edição só é possível enquanto o recebimento não for confirmado.</small>'
            : 'A movimentação foi enviada com sucesso.<br><br>' +
              '<small style="color:#555">O destinatário deverá confirmar o recebimento ' +
              'acessando a listagem de movimentações ou os detalhes deste vestígio.</small>',
          icon: 'success',
          timer: 4000,
          showConfirmButton: true,
          confirmButtonText: 'OK'
        });
      },
      error: (err: any) => {
        const msg = err?.error?.detail || 'Erro ao salvar movimentação.';
        Swal.fire('Erro', msg, 'error');
        this.isSaving = false;
      }
    });
  }

  /**
   * Abre o formulário de movimentação em modo EDIÇÃO, pré-preenchido com os
   * dados de uma movimentação ainda não aceita. O backend bloqueia a edição
   * após o aceite (perform_update) — o botão só aparece quando pode_editar=true.
   */
  editarMovimentacaoInline(mov: VestigioMovimentacao): void {
    this.editandoMovId = mov.id;
    this.showMovForm = true;
    // cenário derivado do destino atual da movimentação
    this.tipoMovimentacao = mov.unidade_demandante ? 'externa' : 'interna';
    this.novoLacre = !!mov.lacre;
    this.movForm = {
      lacre: mov.lacre || '',
      descricao: mov.descricao || '',
      unidade_demandante_id: mov.unidade_demandante?.id ?? null,
      servico_pericial_id: mov.servico_pericial?.id ?? null,
    };
    // rótulo do autocomplete de unidade
    this.unidadeBusca = mov.unidade_demandante
      ? `${mov.unidade_demandante.sigla} — ${mov.unidade_demandante.nome}` : '';
    this.unidadesBuscadas = [];
    this.showUnidadeDropdown = false;
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

  toggleMovForm(): void {
    this.showMovForm = !this.showMovForm;
    if (!this.showMovForm) {
      this.resetMovForm();
    } else if (this.isExterno) {
      this.tipoMovimentacao = 'interna';
    }
  }

  setTipoMovimentacao(tipo: 'interna' | 'externa' | 'protocolo'): void {
    if (this.tipoMovimentacao === tipo) return;
    this.tipoMovimentacao = tipo;
    // limpa campos do outro cenário ao trocar de tipo
    this.movForm.servico_pericial_id = null;
    this.limparUnidade();
  }

  resetMovForm(): void {
    this.tipoMovimentacao = null;
    this.novoLacre = false;
    this.editandoMovId = null;
    this.movForm = { lacre: '', descricao: '', unidade_demandante_id: null, servico_pericial_id: null };
    this.unidadeBusca = '';
    this.unidadesBuscadas = [];
    this.showUnidadeDropdown = false;
  }

  /**
   * Lacre atualmente vigente: o da movimentação mais recente que informou um
   * número, ou o lacre de cadastro do vestígio. Usado no hint de "Novo lacre? Não"
   * para mostrar qual lacre será mantido (a FAV aplica a mesma herança).
   * `movimentacoes` vem ordenada por -created_at (mais recente primeiro).
   */
  get lacreVigente(): string {
    const comLacre = this.movimentacoes.find(m => !!(m.lacre && m.lacre.trim()));
    return (comLacre?.lacre || this.vestigio?.lacre || '').trim();
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

  // ── Procedimentos vinculados ──────────────────────────────────────────────

  abrirModalVincularProcedimento(): void {
    let resultados: any[] = [];

    Swal.fire({
      title: 'Vincular Procedimento',
      html: `
        <p style="font-size:.88rem;color:#64748b;margin-bottom:.8rem">
          Digite número ou sigla para buscar (ex: IP 001, BO 123)
        </p>
        <input id="swal-proc-search" class="swal2-input" placeholder="Buscar procedimento...">
        <div id="swal-proc-results" style="margin-top:.5rem;max-height:200px;overflow-y:auto;text-align:left"></div>
      `,
      showConfirmButton: false,
      showCancelButton: true,
      cancelButtonText: 'Fechar',
      didOpen: () => {
        const input = document.getElementById('swal-proc-search') as HTMLInputElement;
        const container = document.getElementById('swal-proc-results')!;
        let timer: any;
        input.addEventListener('input', () => {
          clearTimeout(timer);
          const q = input.value.trim();
          if (!q) { container.innerHTML = ''; return; }
          container.innerHTML = '<p style="font-size:.8rem;color:#94a3b8;padding:.5rem">Buscando…</p>';
          timer = setTimeout(() => {
            this.procedimentoService.getAll(q).subscribe({
              next: (res) => {
                resultados = res.results;
                if (!resultados.length) {
                  container.innerHTML = '<p style="font-size:.8rem;color:#94a3b8;padding:.5rem">Nenhum resultado.</p>';
                  return;
                }
                container.innerHTML = resultados.map((p, i) => `
                  <div data-i="${i}" style="padding:.45rem .6rem;cursor:pointer;border-radius:6px;
                    font-size:.83rem;border:1px solid #e2e8f0;margin-bottom:.3rem;background:#f8fafc">
                    <strong>${p.tipo_procedimento?.sigla ?? ''} ${p.numero}/${p.ano}</strong>
                    <span style="color:#64748b;font-size:.78rem"> — ${p.tipo_procedimento?.nome ?? ''}</span>
                  </div>`).join('');
                container.querySelectorAll('[data-i]').forEach(el => {
                  el.addEventListener('click', () => {
                    const proc = resultados[+(el as HTMLElement).dataset['i']!];
                    Swal.close();
                    this.executarVinculoProcedimento(proc.id, `${proc.tipo_procedimento?.sigla} ${proc.numero}/${proc.ano}`, 'add');
                  });
                });
              },
              error: () => { container.innerHTML = '<p style="font-size:.8rem;color:#ef4444;padding:.5rem">Erro na busca.</p>'; }
            });
          }, 350);
        });
      }
    });
  }

  desvincularProcedimento(proc: { id: number; numero_completo: string }): void {
    Swal.fire({
      title: 'Desvincular procedimento?',
      html: `Remover o vínculo com <strong>${proc.numero_completo}</strong>?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, desvincular',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
    }).then(r => {
      if (r.isConfirmed) this.executarVinculoProcedimento(proc.id, proc.numero_completo, 'remove');
    });
  }

  private executarVinculoProcedimento(procId: number, label: string, acao: 'add' | 'remove'): void {
    if (!this.vestigio) return;
    this.custodiaService.vincularProcedimentoAoVestigio(this.vestigio.id, procId, acao).subscribe({
      next: () => {
        const msg = acao === 'add' ? `Procedimento ${label} vinculado.` : `Procedimento ${label} desvinculado.`;
        this.showMessage(msg, 'success');
        this.custodiaService.getVestigio(this.vestigio!.id).subscribe(v => this.vestigio = v);
      },
      error: (err) => this.showMessage(err?.error?.detail || 'Erro ao alterar vínculo.', 'error')
    });
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

  verMovimentacao(id: number): void {
    this.router.navigate(['/gabinete-virtual/custodia/movimentacoes', id]);
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
    this.location.back();
  }
}
