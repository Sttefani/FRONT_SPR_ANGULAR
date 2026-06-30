import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';

import { CustodiaService, OcorrenciaVinculada } from '../../services/custodia.service';
import { ServicoPericialService } from '../../services/servico-pericial.service';
import { UnidadeDemandanteService } from '../../services/unidade-demandante.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-custodia-vestigios-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './custodia-vestigios-form.component.html',
  styleUrls: ['./custodia-vestigios-form.component.scss']
})
export class CustodiaVestigiosFormComponent implements OnInit, OnDestroy {
  form!: FormGroup;
  isEditMode = false;
  vestigioId: number | null = null;
  isLoading = false;
  isSaving = false;
  message = '';
  messageType: 'success' | 'error' = 'success';

  servicos: any[] = [];
  unidades: any[] = [];

  // EXTERNO: destino do cadastro travado na custódia central do IC (sigla CUST)
  isExterno = false;
  private readonly SIGLA_CUSTODIA_IC = 'CUST';

  // ── Vinculação de Ocorrência no momento do cadastro (typeahead) ──────────
  ocorrenciaSelecionada: OcorrenciaVinculada | null = null;
  searchOcorrenciaNr    = '';
  isSearchingOcorrencia = false;
  ocorrenciaErro        = '';
  resultadosOcorrencia: { id: number; numero_ocorrencia: string }[] = [];
  private ocorrenciaSubject$ = new Subject<string>();

  // ── Origem: veio dos detalhes de uma ocorrência ──────────────────────────
  origemOcorrenciaId: number | null = null;

  // ── Contraprova (typeahead) ──────────────────────────────────────────────
  contraProvaSelecionada: any = null;
  searchContraProvaTermo  = '';
  isSearchingContraProva  = false;
  resultadosContraProva: any[] = [];
  contraProvaErro         = '';
  private contraProvaSubject$ = new Subject<string>();

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private custodiaService: CustodiaService,
    private servicoPericialService: ServicoPericialService,
    private unidadeDemandanteService: UnidadeDemandanteService,
    private authService: AuthService
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.isExterno = this.authService.getCurrentUser()?.perfil === 'EXTERNO';
    this.configurarTypeaheads();
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      // MODO EDIÇÃO — carrega o VESTÍGIO primeiro (rápido) e já renderiza o form;
      // os dropdowns carregam em paralelo, SEM bloquear. Antes um forkJoin esperava
      // serviços + unidades + autoridades + vestígio juntos, causando o delay
      // reclamado ao abrir a edição. Os selects preenchem assim que as listas chegam.
      this.isEditMode = true;
      this.vestigioId = Number(id);
      this.isLoading = true;
      this.carregarDropdowns();

      this.custodiaService.getVestigio(this.vestigioId).subscribe({
        next: (vestigio) => {
          this.form.patchValue({
            lacre:                    vestigio.lacre                 ?? '',
            num_processo_sei:         vestigio.num_processo_sei      ?? '',
            descricao:                vestigio.descricao             ?? '',
            conformidade:             vestigio.conformidade          ?? false,
            biologico:                vestigio.biologico             ?? false,
            unidade_demandante_id:    vestigio.unidade_demandante?.id ?? null,
            servico_pericial_id:      vestigio.servico_pericial?.id   ?? null,
            vestigio_contra_prova_id: vestigio.vestigio_contra_prova  ?? null,
          });

          // Pré-preencher label da contraprova em modo edição
          if (vestigio.vestigio_contra_prova) {
            this.contraProvaSelecionada = {
              id: vestigio.vestigio_contra_prova,
              lacre: vestigio.vestigio_contra_prova_lacre ?? `#${vestigio.vestigio_contra_prova}`,
            };
          }

          this.isLoading = false;
        },
        error: () => {
          this.message     = 'Erro ao carregar os dados. Verifique a conexão e tente novamente.';
          this.messageType = 'error';
          this.isLoading   = false;
        },
      });

    } else {
      // MODO CRIAÇÃO — carrega dropdowns de forma independente
      this.carregarDropdowns();

      // Pré-vincula ocorrência quando o formulário foi aberto via botão "Cadastrar Vestígio"
      const ocId = this.route.snapshot.queryParamMap.get('ocorrencia_id');
      if (ocId) {
        this.origemOcorrenciaId = Number(ocId);
        this.custodiaService.getOcorrenciaParaVestigio(this.origemOcorrenciaId).subscribe({
          next: (oc) => {
            // Vincula a ocorrência (M2M) — os campos livres de ocorrência/ano foram
            // removidos do cadastro por serem redundantes com esta vinculação.
            this.ocorrenciaSelecionada = oc;
          },
          error: () => { /* usuário pode buscar manualmente se falhar */ },
        });
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Configura os typeaheads (debounce 300ms) de ocorrência e contraprova. */
  private configurarTypeaheads(): void {
    this.ocorrenciaSubject$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(termo => termo.trim()
        ? this.custodiaService.autoCompleteOcorrencias(termo.trim()).pipe(catchError(() => of([])))
        : of([])),
      takeUntil(this.destroy$),
    ).subscribe(res => {
      this.resultadosOcorrencia = res;
      this.isSearchingOcorrencia = false;
      this.ocorrenciaErro = (this.searchOcorrenciaNr.trim() && res.length === 0)
        ? 'Nenhuma ocorrência encontrada.' : '';
    });

    this.contraProvaSubject$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(termo => termo.trim()
        ? this.custodiaService.autoCompleteVestigios(termo.trim()).pipe(catchError(() => of([])))
        : of([])),
      takeUntil(this.destroy$),
    ).subscribe((res: any[]) => {
      this.resultadosContraProva = (res || []).filter(v => v.id !== this.vestigioId);
      this.isSearchingContraProva = false;
      this.contraProvaErro = (this.searchContraProvaTermo.trim() && this.resultadosContraProva.length === 0)
        ? 'Nenhum vestígio encontrado.' : '';
    });
  }

  initForm(): void {
    this.form = this.fb.group({
      lacre:                      ['', [Validators.required, Validators.maxLength(255)]],
      num_processo_sei:           ['', Validators.maxLength(255)],
      descricao:                  ['', Validators.required],
      conformidade:               [false],
      biologico:                  [false],
      unidade_demandante_id:      [null, Validators.required],
      servico_pericial_id:        [null, Validators.required],
      vestigio_contra_prova_id:   [null],
    });
  }

  carregarDropdowns(): void {
    this.servicoPericialService.getAllForDropdown().subscribe({
      next: (res) => { this.servicos = res; this.aplicarTravaExternoNoServico(); },
      error: () => {},
    });
    this.unidadeDemandanteService.getAllForDropdown().subscribe({
      next: (res: any) => this.unidades = Array.isArray(res) ? res : (res.results ?? []),
      error: () => {},
    });
  }

  /**
   * EXTERNO: trava o destino do cadastro na custódia central do IC (sigla CUST).
   * Pré-seleciona e desabilita o controle — getRawValue() ainda envia o valor, e o
   * backend re-força em perform_create (defesa em profundidade).
   */
  private aplicarTravaExternoNoServico(): void {
    if (!this.isExterno) return;
    const custodia = this.servicos.find(
      s => (s.sigla || '').toUpperCase() === this.SIGLA_CUSTODIA_IC
    );
    if (custodia) {
      this.form.patchValue({ servico_pericial_id: custodia.id });
      this.form.get('servico_pericial_id')?.disable();
    }
  }

  get voltarUrl(): string {
    if (this.origemOcorrenciaId) {
      return `/gabinete-virtual/operacional/ocorrencias/${this.origemOcorrenciaId}`;
    }
    return this.isEditMode && this.vestigioId
      ? `/gabinete-virtual/custodia/vestigios/${this.vestigioId}`
      : '/gabinete-virtual/custodia/vestigios';
  }

  voltar(): void {
    this.router.navigate([this.voltarUrl]);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    this.message  = '';

    const payload: any = { ...this.form.getRawValue() };

    // Inclui a ocorrência selecionada no próprio payload de criação/edição.
    // O backend aplica a cascata: se a ocorrência tiver procedimento vinculado,
    // ele também é adicionado ao vestígio automaticamente.
    if (this.ocorrenciaSelecionada) {
      payload['ocorrencias_vinculadas_ids'] = [this.ocorrenciaSelecionada.id];
    }

    // Contraprova: usa a SELEÇÃO como fonte de verdade (mesmo padrão da ocorrência),
    // garantindo que o vínculo vá no payload mesmo que o form control não o reflita.
    // null quando não há contraprova → o backend limpa/não vincula.
    payload['vestigio_contra_prova_id'] = this.contraProvaSelecionada?.id ?? null;

    const req = this.isEditMode
      ? this.custodiaService.editarVestigio(this.vestigioId!, payload)
      : this.custodiaService.criarVestigio(payload);

    req.subscribe({
      next: (v) => {
        this.isSaving = false;
        Swal.fire({
          title: this.isEditMode ? 'Vestígio atualizado!' : 'Vestígio cadastrado!',
          icon: 'success',
          timer: 1500,
          timerProgressBar: true,
          showConfirmButton: false,
        }).then(() => {
          const destino = this.origemOcorrenciaId
            ? ['/gabinete-virtual/operacional/ocorrencias', this.origemOcorrenciaId]
            : ['/gabinete-virtual/custodia/vestigios', v.id];
          this.router.navigate(destino);
        });
      },
      error: (err: any) => {
        const errors = err?.error ?? {};
        const msg = typeof errors === 'string'
          ? errors
          : Object.values(errors).flat().join(' ');
        this.message     = msg || 'Erro ao salvar. Tente novamente.';
        this.messageType = 'error';
        this.isSaving    = false;
      },
    });
  }

  // ── Typeahead de contraprova (auto-complete por lacre/SEI/ocorrência) ──────

  onContraProvaInput(valor: string): void {
    this.searchContraProvaTermo = valor;
    this.contraProvaErro = '';
    this.isSearchingContraProva = !!valor.trim();
    this.contraProvaSubject$.next(valor);
  }

  selecionarContraProva(v: any): void {
    this.contraProvaSelecionada = v;
    this.form.patchValue({ vestigio_contra_prova_id: v.id });
    this.resultadosContraProva = [];
    this.searchContraProvaTermo = '';
    this.contraProvaErro = '';
  }

  removerContraProva(): void {
    this.contraProvaSelecionada = null;
    this.form.patchValue({ vestigio_contra_prova_id: null });
    this.searchContraProvaTermo = '';
    this.contraProvaErro = '';
    this.resultadosContraProva = [];
  }

  // ── Typeahead de ocorrência (auto-complete por número) ───────────────────

  onOcorrenciaInput(valor: string): void {
    this.searchOcorrenciaNr = valor;
    this.ocorrenciaErro = '';
    this.isSearchingOcorrencia = !!valor.trim();
    this.ocorrenciaSubject$.next(valor);
  }

  selecionarOcorrencia(o: { id: number; numero_ocorrencia: string }): void {
    this.resultadosOcorrencia = [];
    this.searchOcorrenciaNr = '';
    this.isSearchingOcorrencia = true;
    // Busca os dados completos da ocorrência para montar o card de seleção.
    this.custodiaService.getOcorrenciaParaVestigio(o.id).subscribe({
      next: (oc) => { this.ocorrenciaSelecionada = oc; this.isSearchingOcorrencia = false; },
      error: () => {
        this.isSearchingOcorrencia = false;
        this.ocorrenciaErro = 'Erro ao carregar a ocorrência selecionada.';
      },
    });
  }

  removerOcorrencia(): void {
    this.ocorrenciaSelecionada = null;
    this.searchOcorrenciaNr = '';
    this.ocorrenciaErro = '';
  }

  cancelar(): void {
    // Em modo edição, "cancelar" = "descartar alterações" (pré-save)
    // Em modo criação, "cancelar" = "abandonar cadastro"
    const titulo = this.isEditMode ? 'Descartar alterações?' : 'Cancelar cadastro?';
    const texto  = this.isEditMode
      ? 'As alterações não salvas serão descartadas.'
      : 'O vestígio não será cadastrado.';

    Swal.fire({
      title: titulo,
      text: texto,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, sair',
      cancelButtonText: 'Continuar editando',
    }).then(result => {
      if (result.isConfirmed) {
        this.router.navigate([this.voltarUrl]);
      }
    });
  }
}
