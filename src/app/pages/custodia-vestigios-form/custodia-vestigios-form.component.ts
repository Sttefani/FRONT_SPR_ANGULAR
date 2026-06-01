import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import Swal from 'sweetalert2';

import { CustodiaService, OcorrenciaVinculada } from '../../services/custodia.service';
import { ServicoPericialService } from '../../services/servico-pericial.service';
import { UnidadeDemandanteService } from '../../services/unidade-demandante.service';
import { AutoridadeService } from '../../services/autoridade.service';

@Component({
  selector: 'app-custodia-vestigios-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './custodia-vestigios-form.component.html',
  styleUrls: ['./custodia-vestigios-form.component.scss']
})
export class CustodiaVestigiosFormComponent implements OnInit {
  form!: FormGroup;
  isEditMode = false;
  vestigioId: number | null = null;
  isLoading = false;
  isSaving = false;
  message = '';
  messageType: 'success' | 'error' = 'success';

  servicos: any[] = [];
  unidades: any[] = [];
  autoridades: any[] = [];

  // ── Vinculação de Ocorrência no momento do cadastro ──────────────────────
  ocorrenciaSelecionada: OcorrenciaVinculada | null = null;
  searchOcorrenciaNr    = '';
  isSearchingOcorrencia = false;
  ocorrenciaErro        = '';

  // ── Contraprova ───────────────────────────────────────────────────────────
  contraProvaSelecionada: any = null;
  searchContraProvaTermo  = '';
  isSearchingContraProva  = false;
  resultadosContraProva: any[] = [];
  contraProvaErro         = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private custodiaService: CustodiaService,
    private servicoPericialService: ServicoPericialService,
    private unidadeDemandanteService: UnidadeDemandanteService,
    private autoridadeService: AutoridadeService
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      // MODO EDIÇÃO — carrega dropdowns + vestígio em paralelo com forkJoin.
      // catchError em cada observable garante que um erro em qualquer dropdown
      // não mate o carregamento do restante.
      this.isEditMode = true;
      this.vestigioId = Number(id);
      this.isLoading = true;

      forkJoin({
        // Usa endpoints /dropdown/ (sem paginação) para garantir que TODOS
        // os registros sejam carregados, independente do total.
        servicos:    this.servicoPericialService.getAllForDropdown().pipe(catchError(() => of([]))),
        unidades:    this.unidadeDemandanteService.getAllForDropdown().pipe(catchError(() => of([]))),
        autoridades: this.autoridadeService.getAllForDropdown().pipe(catchError(() => of([]))),
        vestigio:    this.custodiaService.getVestigio(this.vestigioId),
      }).subscribe({
        next: ({ servicos, unidades, autoridades, vestigio }) => {
          this.servicos    = servicos    as any[];
          this.unidades    = unidades    as any[];
          this.autoridades = autoridades as any[];

          this.form.patchValue({
            lacre:                    vestigio.lacre                 ?? '',
            num_processo_sei:         vestigio.num_processo_sei      ?? '',
            ocorrencia:               vestigio.ocorrencia            ?? '',
            ano_ocorrencia:           vestigio.ano_ocorrencia        ?? null,
            descricao:                vestigio.descricao             ?? '',
            conformidade:             vestigio.conformidade          ?? false,
            biologico:                vestigio.biologico             ?? false,
            unidade_demandante_id:    vestigio.unidade_demandante?.id ?? null,
            servico_pericial_id:      vestigio.servico_pericial?.id   ?? null,
            autoridade_id:            vestigio.autoridade?.id         ?? null,
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
    }
  }

  initForm(): void {
    this.form = this.fb.group({
      lacre:                      ['', Validators.maxLength(255)],
      num_processo_sei:           ['', Validators.maxLength(255)],
      ocorrencia:                 ['', Validators.maxLength(255)],
      ano_ocorrencia:             [null],
      descricao:                  [''],
      conformidade:               [false],
      biologico:                  [false],
      unidade_demandante_id:      [null, Validators.required],
      servico_pericial_id:        [null, Validators.required],
      autoridade_id:              [null],
      vestigio_contra_prova_id:   [null],
    });
  }

  carregarDropdowns(): void {
    this.servicoPericialService.getAllForDropdown().subscribe({
      next: (res) => this.servicos    = res,
      error: () => {},
    });
    this.unidadeDemandanteService.getAllForDropdown().subscribe({
      next: (res: any) => this.unidades = Array.isArray(res) ? res : (res.results ?? []),
      error: () => {},
    });
    this.autoridadeService.getAllForDropdown().subscribe({
      next: (res) => this.autoridades = res,
      error: () => {},
    });
  }

  get voltarUrl(): string {
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

    const payload: any = { ...this.form.value };

    // Inclui a ocorrência selecionada no próprio payload de criação/edição.
    // O backend aplica a cascata: se a ocorrência tiver procedimento vinculado,
    // ele também é adicionado ao vestígio automaticamente.
    if (this.ocorrenciaSelecionada) {
      payload['ocorrencias_vinculadas_ids'] = [this.ocorrenciaSelecionada.id];
    }

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
          this.router.navigate(['/gabinete-virtual/custodia/vestigios', v.id]);
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

  // ── Busca inline de contraprova ──────────────────────────────────────────

  buscarContraProva(): void {
    const termo = this.searchContraProvaTermo.trim();
    if (!termo) return;

    this.isSearchingContraProva = true;
    this.contraProvaErro = '';
    this.resultadosContraProva = [];

    this.custodiaService.getVestigios({ search: termo, page_size: 10 }).subscribe({
      next: (resp) => {
        this.isSearchingContraProva = false;
        const lista = resp.results.filter(v => v.id !== this.vestigioId);
        if (lista.length === 0) {
          this.contraProvaErro = `Nenhum vestígio encontrado para "${termo}".`;
        } else {
          this.resultadosContraProva = lista;
        }
      },
      error: () => {
        this.isSearchingContraProva = false;
        this.contraProvaErro = 'Erro ao buscar. Tente novamente.';
      },
    });
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

  // ── Busca inline de ocorrência no formulário ────────────────────────────

  buscarOcorrenciaInline(): void {
    const nr = this.searchOcorrenciaNr.trim().toUpperCase();
    if (!nr) return;

    this.isSearchingOcorrencia = true;
    this.ocorrenciaErro = '';
    this.ocorrenciaSelecionada = null;

    this.custodiaService.buscarOcorrenciaPorNumero(nr).subscribe({
      next: (resp) => {
        this.isSearchingOcorrencia = false;
        if (resp.exists && resp.ocorrencia) {
          this.ocorrenciaSelecionada = resp.ocorrencia;
        } else {
          this.ocorrenciaErro = `Ocorrência "${nr}" não encontrada.`;
        }
      },
      error: () => {
        this.isSearchingOcorrencia = false;
        this.ocorrenciaErro = 'Erro ao buscar. Tente novamente.';
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
