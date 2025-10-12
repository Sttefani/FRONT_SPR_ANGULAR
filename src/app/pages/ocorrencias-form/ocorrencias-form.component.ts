import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import Swal from 'sweetalert2';

import { OcorrenciaService } from '../../services/ocorrencia.service';
import { ServicoPericialService, ServicoPericial } from '../../services/servico-pericial.service';
import { UnidadeDemandanteService } from '../../services/unidade-demandante.service';
import { AutoridadeService } from '../../services/autoridade.service';
import { CidadeService } from '../../services/cidade.service';
import { ClassificacaoOcorrenciaService } from '../../services/classificacao-ocorrencia.service';
import { ProcedimentoCadastradoService } from '../../services/procedimento-cadastrado.service';
import { TipoDocumentoService } from '../../services/tipo-documento.service';
import { ProcedimentoService } from '../../services/procedimento.service';
import { ExameService } from '../../services/exame.service';
import { CargoService } from '../../services/cargo.service';
import { AuthService } from '../../services/auth.service';
import { UsuarioService } from '../../services/usuario.service';
import { ExameSelectorModalComponent } from './exame-selector-modal.component';

// Interfaces
interface UnidadeDemandante { id: number; sigla: string; nome: string; }
interface Cidade { id: number; nome: string; }
interface Classificacao { id: number; codigo: string; nome: string; }
interface TipoDocumento { id: number; nome: string; }
interface TipoProcedimento { id: number; sigla: string; nome: string; }
interface Cargo { id: number; nome: string; }
interface Autoridade { id: number; nome: string; cargo: Cargo; }
interface Exame { id: number; codigo: string; nome: string; }

@Component({
  selector: 'app-ocorrencias-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, ExameSelectorModalComponent],
  templateUrl: './ocorrencias-form.component.html',
  styleUrls: ['./ocorrencias-form.component.scss']
})
export class OcorrenciasFormComponent implements OnInit {
  etapaAtual: 'procedimento-check' | 'busca-procedimento' | 'formulario' = 'procedimento-check';
  ocorrenciaForm!: FormGroup;
  buscaProcedimentoForm!: FormGroup;
  isEditMode = false;
  ocorrenciaId: number | null = null;
  isLoading = false;
  isSaving = false;
  message = '';
  messageType: 'success' | 'error' = 'success';
  temProcedimento = false;
  procedimentoEncontrado = false;
  procedimentoVinculado: any = null;

  // ✅ ADICIONAR 'endereco' AQUI
  secoesAbertas = {
    identificacao: true,
    local: false,
    endereco: true,  // ← ADICIONADO
    documentacao: false,
    atribuicao: false,
    exames: false,
    observacoes: false
  };

  servicosPericiais: ServicoPericial[] = [];
  unidadesDemandantes: UnidadeDemandante[] = [];
  cidades: Cidade[] = [];
  classificacoes: Classificacao[] = [];
  tiposDocumento: TipoDocumento[] = [];
  tiposProcedimento: TipoProcedimento[] = [];
  peritos: any[] = [];
  examesDisponiveis: Exame[] = [];
  examesSelecionados: Exame[] = [];
  cargos: Cargo[] = [];
  autoridades: Autoridade[] = [];
  cargoSelecionado: number | null = null;
  autoridadeBusca = '';
  autoridadeSelecionada: Autoridade | null = null;
  mostrarResultadosAutoridade = false;
  loadingUnidades = false;
  loadingCidades = false;
  loadingClassificacoes = false;
  loadingProcedimentos = false;
  loadingCargos = false;
  loadingAutoridades = false;
  modalExamesAberto = false;

  // ✅ ADICIONAR OBJETO FORM PARA ENDEREÇO
  form = {
    endereco: {
      tipo: 'EXTERNA' as 'INTERNA' | 'EXTERNA',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cep: '',
      longitude:'',
      latitude:'',
      ponto_referencia: ''
    }
  };

  constructor(
    private fb: FormBuilder,
    private ocorrenciaService: OcorrenciaService,
    private servicoPericialService: ServicoPericialService,
    private unidadeDemandanteService: UnidadeDemandanteService,
    private autoridadeService: AutoridadeService,
    private cidadeService: CidadeService,
    private classificacaoOcorrenciaService: ClassificacaoOcorrenciaService,
    private procedimentoCadastradoService: ProcedimentoCadastradoService,
    private tipoDocumentoService: TipoDocumentoService,
    private procedimentoService: ProcedimentoService,
    private exameService: ExameService,
    private cargoService: CargoService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private usuarioService: UsuarioService,
    private http: HttpClient  // ← ADICIONAR HttpClient
  ) {
    this.initForms();
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.ocorrenciaId = Number(id);
      this.etapaAtual = 'formulario';
      this.loadOcorrencia(this.ocorrenciaId);
    } else {
      this.isEditMode = false;
      this.etapaAtual = 'procedimento-check';
    }
    this.loadInitialData();

    this.ocorrenciaForm.get('servico_pericial_id')?.valueChanges.subscribe(servicoId => {
      this.onServicoPericialChange(servicoId);
    });
  }

  initForms(): void {
    this.buscaProcedimentoForm = this.fb.group({
      tipo_procedimento_id: [null, Validators.required],
      numero: ['', Validators.required],
      ano: [new Date().getFullYear(), Validators.required]
    });

    this.ocorrenciaForm = this.fb.group({
      servico_pericial_id: [null, Validators.required],
      unidade_demandante_id: [null, Validators.required],
      autoridade_id: [null, Validators.required],
      cidade_id: [null, Validators.required],
      classificacao_id: [{ value: null, disabled: true }, Validators.required],
      data_fato: [''],
      hora_fato: [''],
      procedimento_cadastrado_id: [null],
      tipo_documento_origem_id: [null],
      numero_documento_origem: [''],
      data_documento_origem: [''],
      processo_sei_numero: [''],
      perito_atribuido_id: [null],
      historico: ['']
    });
  }

  onServicoPericialChange(servicoId: number | null): void {
    const classificacaoControl = this.ocorrenciaForm.get('classificacao_id');
    this.classificacoes = [];
    if (classificacaoControl?.value) {
      classificacaoControl.reset();
    }
    classificacaoControl?.disable();

    if (servicoId) {
      this.loadingClassificacoes = true;
      this.classificacaoOcorrenciaService.getAllForDropdown(servicoId).subscribe({
        next: (data: Classificacao[]) => {
          this.classificacoes = data;
          classificacaoControl?.enable();
          this.loadingClassificacoes = false;
        },
        error: (err: any) => {
          console.error('Erro ao carregar classificações filtradas:', err);
          this.loadingClassificacoes = false;
        }
      });
    }
  }

  loadInitialData(): void {
    this.loadServicos();
    this.loadTiposProcedimento();
    this.loadTiposDocumento();
    this.loadPeritos();
  }

  loadServicos(): void {
    this.servicoPericialService.getAllForDropdown().subscribe({
      next: (data: ServicoPericial[]) => { this.servicosPericiais = data; },
      error: (err: any) => console.error('Erro ao carregar serviços:', err)
    });
  }

  loadUnidades(): void {
    this.loadingUnidades = true;
    this.unidadeDemandanteService.getAllForDropdown().subscribe({
      next: (data: UnidadeDemandante[]) => { this.unidadesDemandantes = data; this.loadingUnidades = false; },
      error: (err: any) => { console.error('Erro:', err); this.loadingUnidades = false; }
    });
  }

  loadCargos(): void {
    this.loadingCargos = true;
    this.cargoService.getAll().subscribe({
      next: (response: any) => { this.cargos = response.results || []; this.loadingCargos = false; },
      error: (err: any) => { console.error('Erro:', err); this.loadingCargos = false; }
    });
  }

  onCargoChange(): void {
    this.autoridades = [];
    this.autoridadeBusca = '';
    this.autoridadeSelecionada = null;
    this.mostrarResultadosAutoridade = false;
    this.ocorrenciaForm.patchValue({ autoridade_id: null });
  }

  buscarAutoridades(): void {
    if (!this.cargoSelecionado || this.autoridadeBusca.length < 2) {
      this.mostrarResultadosAutoridade = false;
      return;
    }
    this.loadingAutoridades = true;
    this.autoridadeService.getAll(this.autoridadeBusca, this.cargoSelecionado).subscribe({
      next: (response: any) => { this.autoridades = response.results || []; this.mostrarResultadosAutoridade = true; this.loadingAutoridades = false; },
      error: (err: any) => { console.error('Erro:', err); this.loadingAutoridades = false; }
    });
  }

  selecionarAutoridade(autoridade: Autoridade): void {
    this.autoridadeSelecionada = autoridade;
    this.autoridadeBusca = autoridade.nome;
    this.mostrarResultadosAutoridade = false;
    this.ocorrenciaForm.patchValue({ autoridade_id: autoridade.id });
  }

  loadCidades(): void {
    this.loadingCidades = true;
    this.cidadeService.getAllForDropdown().subscribe({
      next: (data: Cidade[]) => { this.cidades = data; this.loadingCidades = false; },
      error: (err: any) => { console.error('Erro:', err); this.loadingCidades = false; }
    });
  }

  loadClassificacoes(servicoId?: number): void {
    this.loadingClassificacoes = true;
    this.classificacaoOcorrenciaService.getAllForDropdown(servicoId).subscribe({
      next: (data: Classificacao[]) => {
        this.classificacoes = data;
        this.loadingClassificacoes = false;
        this.ocorrenciaForm.get('classificacao_id')?.enable();
      },
      error: (err: any) => {
        console.error('Erro:', err);
        this.loadingClassificacoes = false;
      }
    });
  }

  loadTiposProcedimento(): void {
    this.procedimentoService.getAllForDropdown().subscribe({
      next: (data: TipoProcedimento[]) => { this.tiposProcedimento = data; },
      error: (err: any) => console.error('Erro:', err)
    });
  }

  loadTiposDocumento(): void {
    this.tipoDocumentoService.getAllForDropdown().subscribe({
      next: (data: any) => { this.tiposDocumento = data || []; },
      error: (err: any) => console.error('❌ ERRO:', err)
    });
  }

  loadPeritos(): void {
    this.usuarioService.getPeritosList().subscribe({
      next: (data: any) => { this.peritos = data; },
      error: (err: any) => console.error('Erro ao carregar peritos:', err)
    });
  }

  onTemProcedimentoSim(): void {
    this.temProcedimento = true;
    this.etapaAtual = 'busca-procedimento';
  }

  onTemProcedimentoNao(): void {
    this.temProcedimento = false;
    this.etapaAtual = 'formulario';
    this.abrirSecao('identificacao');
    this.loadUnidades();
    this.loadCargos();
    this.loadCidades();
  }

  buscarProcedimento(): void {
    if (this.buscaProcedimentoForm.invalid) {
      this.buscaProcedimentoForm.markAllAsTouched();
      return;
    }

    const { tipo_procedimento_id, numero, ano } = this.buscaProcedimentoForm.value;
    this.loadingProcedimentos = true;

    this.procedimentoCadastradoService.verificarExistente(tipo_procedimento_id, numero, ano).subscribe({
      next: (response: any) => {
        this.loadingProcedimentos = false;
        if (response.exists) {
          this.procedimentoVinculado = response.procedimento;
          Swal.fire({
            title: 'Procedimento já cadastrado!',
            html: `
              <p>Já existe um procedimento <strong>${this.procedimentoVinculado.tipo_procedimento.sigla}</strong>
              com o número <strong>${this.procedimentoVinculado.numero}/${this.procedimentoVinculado.ano}</strong>
              cadastrado no sistema.</p>
              <p><strong>Vincule sua ocorrência a este procedimento.</strong></p>
            `,
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: 'Vincular',
            cancelButtonText: 'Continuar sem procedimento',
            allowOutsideClick: false
          }).then((result) => {
            if (result.isConfirmed) {
              this.ocorrenciaForm.patchValue({ procedimento_cadastrado_id: this.procedimentoVinculado.id });
              this.irParaFormulario();
            } else {
              this.procedimentoVinculado = null;
              this.ocorrenciaForm.patchValue({ procedimento_cadastrado_id: null });
              this.irParaFormulario();
            }
          });
        } else {
          this.procedimentoEncontrado = false;
          Swal.fire({
            title: 'Procedimento não encontrado',
            text: 'Este procedimento não está cadastrado. Deseja cadastrá-lo agora?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sim, cadastrar',
            cancelButtonText: 'Continuar sem procedimento'
          }).then((result) => {
            if (result.isConfirmed) {
              this.cadastrarProcedimento();
            } else {
              this.procedimentoVinculado = null;
              this.irParaFormulario();
            }
          });
        }
      },
      error: (err: any) => {
        console.error('Erro ao verificar:', err);
        this.loadingProcedimentos = false;
        Swal.fire('Erro', 'Erro ao verificar procedimento.', 'error');
      }
    });
  }

  cadastrarProcedimento(): void {
    const { tipo_procedimento_id, numero, ano } = this.buscaProcedimentoForm.value;
    this.procedimentoCadastradoService.create({ tipo_procedimento_id, numero, ano }).subscribe({
      next: (novoProcedimento: any) => {
        this.procedimentoVinculado = novoProcedimento;
        this.ocorrenciaForm.patchValue({ procedimento_cadastrado_id: novoProcedimento.id });
        Swal.fire('Sucesso!', 'Procedimento cadastrado e vinculado.', 'success');
        this.irParaFormulario();
      },
      error: (err: any) => {
        console.error('Erro:', err);
        Swal.fire('Erro', 'Erro ao cadastrar procedimento.', 'error');
      }
    });
  }

  irParaFormulario(): void {
    this.etapaAtual = 'formulario';
    this.abrirSecao('identificacao');
    this.loadUnidades();
    this.loadCargos();
    this.loadCidades();
  }

  voltarParaBusca(): void {
    this.etapaAtual = 'busca-procedimento';
  }

  toggleSecao(secao: keyof typeof this.secoesAbertas): void {
    (this.secoesAbertas as any)[secao] = !(this.secoesAbertas as any)[secao];
  }

  abrirSecao(secao: keyof typeof this.secoesAbertas): void {
    Object.keys(this.secoesAbertas).forEach(key => { (this.secoesAbertas as any)[key] = false; });
    (this.secoesAbertas as any)[secao] = true;
  }

  // ==========================================
  // MÉTODO PRINCIPAL - CARREGAR OCORRÊNCIA
  // ==========================================
  loadOcorrencia(id: number): void {
    this.isLoading = true;
    this.isEditMode = true;

    this.ocorrenciaService.getById(id).subscribe({
      next: (ocorrencia: any) => {
        console.log('📦 DADOS CARREGADOS:', ocorrencia);

        if (!this.podeEditarOcorrencia(ocorrencia)) {
          this.isLoading = false;
          return;
        }

        this.carregarDadosComplementares(ocorrencia);
        this.preencherFormulario(ocorrencia);

       if (ocorrencia.endereco) {
        this.form.endereco = {
          tipo: ocorrencia.endereco.tipo || 'EXTERNA',
          logradouro: ocorrencia.endereco.logradouro || '',
          numero: ocorrencia.endereco.numero || '',
          complemento: ocorrencia.endereco.complemento || '',
          bairro: ocorrencia.endereco.bairro || '',
          cep: ocorrencia.endereco.cep || '',
          latitude: ocorrencia.endereco.latitude || '',        // ← ADICIONAR
          longitude: ocorrencia.endereco.longitude || '',      // ← ADICIONAR
          ponto_referencia: ocorrencia.endereco.ponto_referencia || ''
        };
      }

        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('❌ Erro ao carregar ocorrência:', err);
        this.isLoading = false;
        Swal.fire({
          title: 'Erro',
          text: 'Não foi possível carregar a ocorrência.',
          icon: 'error',
          confirmButtonText: 'Voltar'
        }).then(() => {
          this.router.navigate(['/gabinete-virtual/operacional/ocorrencias']);
        });
      }
    });
  }

  private podeEditarOcorrencia(ocorrencia: any): boolean {
    const user = this.authService.getCurrentUser();
    const isSuperAdmin = this.authService.isSuperAdmin();
    const isAdmin = user?.perfil === 'ADMINISTRATIVO';

    if (isSuperAdmin || isAdmin) {
      return true;
    }

    if (this.estaFinalizada(ocorrencia)) {
      Swal.fire({
        title: 'Ocorrência Finalizada',
        text: 'Esta ocorrência está finalizada e não pode ser editada.',
        icon: 'warning',
        confirmButtonText: 'Voltar'
      }).then(() => {
        this.router.navigate(['/gabinete-virtual/operacional/ocorrencias']);
      });
      return false;
    }

    if (ocorrencia.perito_atribuido) {
      if (Number(user?.id) !== Number(ocorrencia.perito_atribuido.id)) {
        Swal.fire({
          title: 'Acesso Negado',
          text: 'Esta ocorrência está atribuída a outro perito.',
          icon: 'error',
          confirmButtonText: 'Voltar'
        }).then(() => {
          this.router.navigate(['/gabinete-virtual/operacional/ocorrencias']);
        });
        return false;
      }
    }

    return true;
  }

  private estaFinalizada(ocorrencia: any): boolean {
    return ocorrencia.esta_finalizada === true ||
           !!ocorrencia.finalizada_por ||
           !!ocorrencia.data_finalizacao;
  }

  private carregarDadosComplementares(ocorrencia: any): void {
    this.loadUnidades();
    this.loadCargos();
    this.loadCidades();
    this.loadPeritos();

    if (ocorrencia.servico_pericial?.id) {
      this.loadClassificacoes(ocorrencia.servico_pericial.id);
    }

    if (ocorrencia.autoridade) {
      this.cargoSelecionado = ocorrencia.autoridade.cargo?.id || null;
      this.autoridadeSelecionada = ocorrencia.autoridade;
      this.autoridadeBusca = ocorrencia.autoridade.nome || '';

      if (this.cargoSelecionado) {
        this.autoridadeService.getAll('', this.cargoSelecionado).subscribe({
          next: (response: any) => {
            this.autoridades = response.results || [];
          },
          error: (err: any) => {
            console.error('❌ Erro ao carregar autoridades:', err);
          }
        });
      }
    }
  }

  private preencherFormulario(ocorrencia: any): void {
    this.ocorrenciaForm.patchValue({
      servico_pericial_id: ocorrencia.servico_pericial?.id || null,
      unidade_demandante_id: ocorrencia.unidade_demandante?.id || null,
      autoridade_id: ocorrencia.autoridade?.id || null,
      cidade_id: ocorrencia.cidade?.id || null,
      classificacao_id: ocorrencia.classificacao?.id || null,
      data_fato: ocorrencia.data_fato || null,
      hora_fato: ocorrencia.hora_fato || null,
      procedimento_cadastrado_id: ocorrencia.procedimento_cadastrado?.id || null,
      tipo_documento_origem_id: ocorrencia.tipo_documento_origem?.id || null,
      numero_documento_origem: ocorrencia.numero_documento_origem || '',
      data_documento_origem: ocorrencia.data_documento_origem || null,
      processo_sei_numero: ocorrencia.processo_sei_numero || '',
      perito_atribuido_id: ocorrencia.perito_atribuido?.id || null,
      historico: ocorrencia.historico || ''
    });

    this.examesSelecionados = ocorrencia.exames_solicitados || [];
    this.procedimentoVinculado = ocorrencia.procedimento_cadastrado || null;
  }

  abrirModalExames(): void {
    const servicoId = this.ocorrenciaForm.get('servico_pericial_id')?.value;
    if (!servicoId) {
      Swal.fire('Atenção', 'Selecione primeiro o serviço pericial.', 'warning');
      return;
    }
    this.exameService.getAll(servicoId).subscribe({
      next: (exames: Exame[]) => {
        this.examesDisponiveis = exames;
        this.modalExamesAberto = true;
      },
      error: (err: any) => {
        console.error('❌ Erro ao carregar exames:', err);
        Swal.fire('Erro', 'Não foi possível carregar os exames.', 'error');
      }
    });
  }

  onExamesConfirmados(exames: Exame[]): void {
    this.examesSelecionados = exames;
    this.modalExamesAberto = false;
  }

  removerExame(exame: Exame): void {
    this.examesSelecionados = this.examesSelecionados.filter(e => e.id !== exame.id);
  }

  onTipoOcorrenciaChange(): void {
  if (this.form.endereco.tipo === 'INTERNA') {
    this.form.endereco.logradouro = '';
    this.form.endereco.numero = '';
    this.form.endereco.complemento = '';
    this.form.endereco.bairro = '';
    this.form.endereco.cep = '';
    this.form.endereco.latitude = '';      // ← ADICIONAR
    this.form.endereco.longitude = '';     // ← ADICIONAR
    this.form.endereco.ponto_referencia = '';
  }
}

  // ✅ MÉTODO PARA SALVAR ENDEREÇO
  private salvarEndereco(ocorrenciaId: number): Observable<any> {
    const enderecoPayload = {
      ocorrencia: ocorrenciaId,
      tipo: this.form.endereco.tipo,
      logradouro: this.form.endereco.logradouro || '',
      numero: this.form.endereco.numero || '',
      complemento: this.form.endereco.complemento || '',
      bairro: this.form.endereco.bairro || '',
      cep: this.form.endereco.cep || '',
      ponto_referencia: this.form.endereco.ponto_referencia || ''
    };

  const baseUrl = 'http://localhost:8000/api'; // ← Ajuste se sua URL for diferente
  return this.http.post(`${baseUrl}/enderecos-ocorrencia/`, enderecoPayload);
  }

  // ✅ MÉTODO onSubmit ATUALIZADO
  onSubmit(): void {
    if (this.ocorrenciaForm.invalid) {
      this.ocorrenciaForm.markAllAsTouched();
      Swal.fire('Atenção', 'Preencha todos os campos obrigatórios.', 'warning');
      return;
    }

    this.isSaving = true;
    const formValues = this.ocorrenciaForm.getRawValue();
    let payload: any;

    if (this.isEditMode) {
      payload = {
        classificacao_id: formValues.classificacao_id,
        unidade_demandante_id: formValues.unidade_demandante_id,
        autoridade_id: formValues.autoridade_id,
        cidade_id: formValues.cidade_id,
        historico: formValues.historico,
        processo_sei_numero: formValues.processo_sei_numero,
        numero_documento_origem: formValues.numero_documento_origem,
        data_documento_origem: formValues.data_documento_origem || null,
        tipo_documento_origem_id: formValues.tipo_documento_origem_id,
        perito_atribuido_id: formValues.perito_atribuido_id,
        exames_ids: this.examesSelecionados.map(e => e.id)
      };
    } else {
      payload = {
        servico_pericial_id: formValues.servico_pericial_id,
        unidade_demandante_id: formValues.unidade_demandante_id,
        autoridade_id: formValues.autoridade_id,
        cidade_id: formValues.cidade_id,
        classificacao_id: formValues.classificacao_id,
        data_fato: formValues.data_fato || null,
        hora_fato: formValues.hora_fato || null,
        tipo_documento_origem_id: formValues.tipo_documento_origem_id,
        numero_documento_origem: formValues.numero_documento_origem,
        data_documento_origem: formValues.data_documento_origem || null,
        processo_sei_numero: formValues.processo_sei_numero,
        perito_atribuido_id: formValues.perito_atribuido_id,
        historico: formValues.historico,
        exames_ids: this.examesSelecionados.map(e => e.id),
        procedimento_cadastrado_id: this.procedimentoVinculado ? this.procedimentoVinculado.id : null
      };
    }

    const request = this.isEditMode && this.ocorrenciaId
      ? this.ocorrenciaService.update(this.ocorrenciaId, payload)
      : this.ocorrenciaService.create(payload);

    request.subscribe({
      next: (ocorrencia: any) => {
        // ✅ SALVAR ENDEREÇO APÓS CRIAR/ATUALIZAR OCORRÊNCIA
        this.salvarEndereco(ocorrencia.id).subscribe({
          next: () => {
            const action = this.isEditMode ? 'atualizada' : 'cadastrada';
            Swal.fire({
              title: 'Sucesso!',
              text: `Ocorrência ${action} com sucesso! Número: ${ocorrencia.numero_ocorrencia}`,
              icon: 'success',
              confirmButtonText: 'Ok'
            }).then(() => {
              this.router.navigate(['/gabinete-virtual/operacional/ocorrencias']);
            });
          },
          error: (enderecoErr: any) => {
            console.error('Erro ao salvar endereço:', enderecoErr);
            Swal.fire({
              title: 'Aviso',
              text: 'Ocorrência salva, mas houve erro ao salvar o endereço.',
              icon: 'warning',
              confirmButtonText: 'Ok'
            }).then(() => {
              this.router.navigate(['/gabinete-virtual/operacional/ocorrencias']);
            });
          }
        });
      },
      error: (err: any) => {
        console.error('ERRO DETALHADO DO BACKEND:', err);
        let errorMsg = 'Ocorreu um erro ao salvar. Verifique os dados e tente novamente.';
        if (err.error) {
          if (err.error.non_field_errors && err.error.non_field_errors.length > 0) {
            errorMsg = err.error.non_field_errors[0];
          }
          else if (typeof err.error === 'object' && !Array.isArray(err.error)) {
            const firstKey = Object.keys(err.error)[0];
            if (firstKey && Array.isArray(err.error[firstKey])) {
              errorMsg = err.error[firstKey][0];
            }
          }
          else if (typeof err.error === 'string') {
            errorMsg = err.error;
          }
        }
        Swal.fire({
          title: 'Erro ao Salvar',
          text: errorMsg,
          icon: 'error',
          customClass: { popup: 'modal-erro-largo' }
        });
        this.isSaving = false;
      },
      complete: () => {
        this.isSaving = false;
      }
    });
  }

  cancelar(): void {
    Swal.fire({
      title: 'Cancelar?',
      text: 'As alterações não serão salvas.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, cancelar',
      cancelButtonText: 'Continuar editando'
    }).then((result) => {
      if (result.isConfirmed) {
        this.router.navigate(['/gabinete-virtual/operacional/ocorrencias']);
      }
    });
  }
}
