import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import Swal from 'sweetalert2';

import { CustodiaService } from '../../services/custodia.service';
import { UsuarioService } from '../../services/usuario.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-custodia-dna-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './custodia-dna-form.component.html',
  styleUrls: ['./custodia-dna-form.component.scss']
})
export class CustodiaDnaFormComponent implements OnInit {
  form!: FormGroup;
  isEditMode = false;
  dnaId: number | null = null;
  vestigioId: number | null = null;   // pré-vinculado via query param
  isLoading = false;
  isSaving = false;
  message = '';
  messageType: 'success' | 'error' = 'success';

  usuarios: any[] = [];

  // Foto
  @ViewChild('fotoInputRef') fotoInputRef!: ElementRef<HTMLInputElement>;
  fotoSelecionada: File | null = null;
  fotoPreview: string | null = null;
  fotoAtualUrl: string | null = null;   // URL da foto existente (modo edição)

  // Perfil
  isExterno = false;

  readonly UFS = [
    'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
    'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
  ];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private custodiaService: CustodiaService,
    private usuarioService: UsuarioService,
    private authService: AuthService,
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.isExterno = user?.perfil === 'EXTERNO';

    // Regra de negócio SPR-Custódia: EXTERNO só registra não apenados
    if (this.isExterno) {
      this.form.patchValue({ situacao: 'NAO_APENADO', registrado_por_usuario_externo: true });
      this.form.get('situacao')?.disable();
    }

    // vestigio_id pode vir como query param (?vestigio=123)
    const qv = this.route.snapshot.queryParamMap.get('vestigio');
    if (qv) {
      this.vestigioId = Number(qv);
      this.form.patchValue({ vestigio_id: this.vestigioId });
    }

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.dnaId = Number(id);
      // Regra de negócio: EXTERNO não pode editar
      if (this.isExterno) {
        this.router.navigate(['/gabinete-virtual/custodia/dnas']);
        return;
      }
      this.carregarDna(this.dnaId);
    }

    this.carregarUsuarios();
    this.preencherPerito();
  }

  // Mostra campo "Unidade Prisional" e "Tipo Penal" apenas para APENADO
  get isApenado(): boolean {
    return this.form.get('situacao')?.value === 'APENADO';
  }

  initForm(): void {
    this.form = this.fb.group({
      // Identificação pessoal
      nome:         ['', [Validators.required, Validators.maxLength(255)]],
      nascimento:   ['', Validators.required],
      naturalidade: ['', [Validators.required, Validators.maxLength(255)]],
      estrangeiro:  [false],
      uf:           ['RR'],
      pais:         ['BRASIL', Validators.maxLength(100)],
      mae:          ['', [Validators.required, Validators.maxLength(255)]],
      pai:          ['', Validators.maxLength(255)],
      cpf:          ['', [Validators.required, Validators.maxLength(14)]],
      rg:           ['', [Validators.required, Validators.maxLength(30)]],

      // Informações clínicas / legais
      gemeo:                         ['NO'],
      transfusao:                    ['NO'],
      transplante:                   ['NO'],
      processado_banco_perfis_genetico: ['NO'],
      situacao:                      ['NAO_APENADO'],
      unidade_prisional:             ['', Validators.maxLength(255)],
      tipo_penal:                    ['', Validators.maxLength(255)],

      // Coleta
      finalidade_coleta: ['LEI', Validators.required],
      data_da_coleta:    ['', Validators.required],
      codigo_barras:     ['', Validators.maxLength(100)],
      lacres:            ['', Validators.maxLength(255)],
      testemunha:        ['', Validators.maxLength(255)],
      testemunha2:       ['', Validators.maxLength(255)],
      responsavel_coleta:['', Validators.maxLength(255)],

      // Referências
      num_processo_sei:  ['', Validators.maxLength(255)],
      ocorrencia:        ['', Validators.maxLength(255)],
      processo_judicial: ['', Validators.maxLength(255)],
      perito_id:         [null],
      vestigio_id:       [null],

      // Observações
      notas: [''],
      registrado_por_usuario_externo: [false],
    });
  }

  preencherPerito(): void {
    const user = this.authService.getCurrentUser();
    if (user && !this.isEditMode) {
      this.form.patchValue({ perito_id: user.id });
    }
  }

  carregarUsuarios(): void {
    this.usuarioService.getAllForDropdown().subscribe({
      next: (res: any) => this.usuarios = Array.isArray(res) ? res : (res.results ?? []),
      error: () => {}
    });
  }

  carregarDna(id: number): void {
    this.isLoading = true;
    this.custodiaService.getDna(id).subscribe({
      next: (d: any) => {
        this.form.patchValue({
          nome: d.nome,
          nascimento: d.nascimento?.substring(0, 10),
          naturalidade: d.naturalidade,
          estrangeiro: d.estrangeiro,
          uf: d.uf,
          pais: d.pais,
          mae: d.mae,
          pai: d.pai,
          cpf: d.cpf,
          rg: d.rg,
          gemeo: d.gemeo,
          transfusao: d.transfusao,
          transplante: d.transplante,
          processado_banco_perfis_genetico: d.processado_banco_perfis_genetico,
          situacao: d.situacao,
          unidade_prisional: d.unidade_prisional,
          tipo_penal: d.tipo_penal,
          finalidade_coleta: d.finalidade_coleta,
          data_da_coleta: d.data_da_coleta?.substring(0, 10),
          codigo_barras: d.codigo_barras,
          lacres: d.lacres,
          testemunha: d.testemunha,
          testemunha2: d.testemunha2,
          responsavel_coleta: d.responsavel_coleta,
          num_processo_sei: d.num_processo_sei,
          ocorrencia: d.ocorrencia,
          processo_judicial: d.processo_judicial,
          perito_id: d.perito?.id ?? null,
          vestigio_id: d.vestigio?.id ?? null,
          notas: d.notas,
          registrado_por_usuario_externo: d.registrado_por_usuario_externo,
        });
        // Carrega URL da foto existente para pré-visualização
        if (d.foto_url) {
          this.fotoAtualUrl = d.foto_url;
          this.fotoPreview  = d.foto_url;
        }
        this.isLoading = false;
      },
      error: () => {
        this.message = 'Erro ao carregar DNA.';
        this.messageType = 'error';
        this.isLoading = false;
      }
    });
  }

  // ── Upload de foto ──────────────────────────────────────────────────────────

  onFotoSelecionada(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // Validação: apenas imagens, máximo 5 MB
    if (!file.type.startsWith('image/')) {
      this.message = 'Apenas imagens são aceitas (JPG, PNG, etc.).';
      this.messageType = 'error';
      input.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.message = 'A imagem não pode ultrapassar 5 MB.';
      this.messageType = 'error';
      input.value = '';
      return;
    }

    this.fotoSelecionada = file;
    // Pré-visualização local via FileReader
    const reader = new FileReader();
    reader.onload = () => { this.fotoPreview = reader.result as string; };
    reader.readAsDataURL(file);
    this.message = '';
  }

  abrirSeletorFoto(): void {
    this.fotoInputRef?.nativeElement?.click();
  }

  removerFoto(): void {
    this.fotoSelecionada = null;
    this.fotoPreview     = null;
    this.fotoAtualUrl    = null;
    if (this.fotoInputRef?.nativeElement) {
      this.fotoInputRef.nativeElement.value = '';
    }
  }

  // ── Envio do formulário (multipart quando há foto) ───────────────────────

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isSaving = true;

    const raw = { ...this.form.getRawValue() };   // getRawValue inclui campos disabled
    if (raw.nascimento)     raw.nascimento     = raw.nascimento     + 'T00:00:00';
    if (raw.data_da_coleta) raw.data_da_coleta = raw.data_da_coleta + 'T00:00:00';

    // Se há arquivo de foto, usa FormData (multipart); caso contrário, JSON normal
    let payload: FormData | Record<string, any>;
    if (this.fotoSelecionada) {
      const fd = new FormData();
      Object.entries(raw).forEach(([k, v]) => {
        if (v !== null && v !== undefined) fd.append(k, String(v));
      });
      fd.append('foto', this.fotoSelecionada, this.fotoSelecionada.name);
      payload = fd;
    } else {
      payload = raw;
    }

    const req = this.isEditMode
      ? this.custodiaService.editarDna(this.dnaId!, payload)
      : this.custodiaService.criarDna(payload);

    req.subscribe({
      next: () => {
        Swal.fire({
          title: 'Sucesso!',
          text: `DNA ${this.isEditMode ? 'atualizado' : 'cadastrado'} com sucesso.`,
          icon: 'success',
          confirmButtonText: 'Ok'
        }).then(() => {
          if (this.vestigioId) {
            this.router.navigate(['/gabinete-virtual/custodia/vestigios', this.vestigioId]);
          } else {
            this.router.navigate(['/gabinete-virtual/custodia/dnas']);
          }
        });
      },
      error: (err: any) => {
        const msgs = Object.entries(err.error ?? {})
          .map(([k, v]: any) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join(' | ');
        this.message = msgs || 'Erro ao salvar DNA.';
        this.messageType = 'error';
        this.isSaving = false;
      }
    });
  }

  cancelar(): void {
    Swal.fire({
      title: 'Cancelar?',
      text: 'Os dados não serão salvos.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, cancelar',
      cancelButtonText: 'Continuar editando'
    }).then(result => {
      if (result.isConfirmed) {
        if (this.vestigioId) {
          this.router.navigate(['/gabinete-virtual/custodia/vestigios', this.vestigioId]);
        } else {
          this.router.navigate(['/gabinete-virtual/custodia/vestigios']);
        }
      }
    });
  }

  get estrangeiro() { return this.form.get('estrangeiro')?.value; }
}
