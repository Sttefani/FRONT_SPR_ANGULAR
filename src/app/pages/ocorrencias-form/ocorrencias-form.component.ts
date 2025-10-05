import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';

import { OcorrenciaService, Ocorrencia } from '../../services/ocorrencia.service';
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

// Interfaces adequadas
interface UnidadeDemandante {
  id: number;
  sigla: string;
  nome: string;
}

interface Cidade {
  id: number;
  nome: string;
}

interface Classificacao {
  id: number;
  codigo: string;
  nome: string;
}

interface TipoDocumento {
  id: number;
  nome: string;
}

interface TipoProcedimento {
  id: number;
  sigla: string;
  nome: string;
}

interface Cargo {
  id: number;
  nome: string;
}

interface Autoridade {
  id: number;
  nome: string;
  cargo: Cargo;
}

interface Exame {
  id: number;
  codigo: string;
  nome: string;
}

@Component({
  selector: 'app-ocorrencias-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, ExameSelectorModalComponent],
  templateUrl: './ocorrencias-form.component.html',
  styleUrls: ['./ocorrencias-form.component.scss']
})
export class OcorrenciasFormComponent implements OnInit {
  // Wizard Steps
  etapaAtual: 'procedimento-check' | 'busca-procedimento' | 'formulario' = 'procedimento-check';

  // Forms
  ocorrenciaForm!: FormGroup;
  buscaProcedimentoForm!: FormGroup;

  // Estados
  isEditMode = false;
  ocorrenciaId: number | null = null;
  isLoading = false;
  isSaving = false;
  message = '';
  messageType: 'success' | 'error' = 'success';

  // Flags
  temProcedimento = false;
  procedimentoEncontrado = false;
  procedimentoVinculado: any = null;

  // Seções expansíveis
  secoesAbertas = {
    identificacao: true,
    local: false,
    documentacao: false,
    atribuicao: false,
    exames: false,
    observacoes: false
  };

  // Dropdowns com tipos corretos
  servicosPericiais: ServicoPericial[] = [];
  unidadesDemandantes: UnidadeDemandante[] = [];
  cidades: Cidade[] = [];
  classificacoes: Classificacao[] = [];
  tiposDocumento: TipoDocumento[] = [];
  tiposProcedimento: TipoProcedimento[] = [];
  peritos: any[] = [];
  examesDisponiveis: Exame[] = [];
  examesSelecionados: Exame[] = [];

  // Autoridades - lógica correta
  cargos: Cargo[] = [];
  cargoSelecionado: number | null = null;
  autoridades: Autoridade[] = [];
  autoridadeBusca = '';
  autoridadeSelecionada: Autoridade | null = null;
  mostrarResultadosAutoridade = false;

  // Loading states
  loadingUnidades = false;
  loadingCidades = false;
  loadingClassificacoes = false;
  loadingProcedimentos = false;
  loadingCargos = false;
  loadingAutoridades = false;

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
    private usuarioService: UsuarioService, // ADICIONE ESTA LINHA
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
    }

    this.loadInitialData();
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
      classificacao_id: [null, Validators.required],
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

  loadInitialData(): void {
    this.loadServicos();
    this.loadTiposProcedimento();
    this.loadTiposDocumento();
    this.loadPeritos(); // ADICIONE AQUI
  }

  loadServicos(): void {
    this.servicoPericialService.getAllForDropdown().subscribe({
      next: (data: ServicoPericial[]) => {
        this.servicosPericiais = data;
      },
      error: (err: any) => console.error('Erro ao carregar serviços:', err)
    });
  }

  loadUnidades(): void {
    this.loadingUnidades = true;
    this.unidadeDemandanteService.getAllForDropdown().subscribe({
      next: (data: UnidadeDemandante[]) => {
        this.unidadesDemandantes = data;
        this.loadingUnidades = false;
      },
      error: (err: any) => {
        console.error('Erro:', err);
        this.loadingUnidades = false;
      }
    });
  }

  loadCargos(): void {
  this.loadingCargos = true;
  this.cargoService.getAll().subscribe({
    next: (response: any) => {
      this.cargos = response.results || [];
      this.loadingCargos = false;
    },
    error: (err: any) => {
      console.error('Erro:', err);
      this.loadingCargos = false;
    }
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
    next: (response: any) => {  // ← Mude para 'response' e tipo 'any'
    this.autoridades = response.results || [];  // ← Acessa 'results'
    this.mostrarResultadosAutoridade = true;
    this.loadingAutoridades = false;
  },
  error: (err: any) => {
    console.error('Erro:', err);
    this.loadingAutoridades = false;
      }
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
      next: (data: Cidade[]) => {
        this.cidades = data;
        this.loadingCidades = false;
      },
      error: (err: any) => {
        console.error('Erro:', err);
        this.loadingCidades = false;
      }
    });
  }

  loadClassificacoes(): void {
    this.loadingClassificacoes = true;
    this.classificacaoOcorrenciaService.getAll().subscribe({
      next: (data: Classificacao[]) => {
        this.classificacoes = data;
        this.loadingClassificacoes = false;
      },
      error: (err: any) => {
        console.error('Erro:', err);
        this.loadingClassificacoes = false;
      }
    });
  }

  loadTiposProcedimento(): void {
    this.procedimentoService.getAllForDropdown().subscribe({
      next: (data: TipoProcedimento[]) => {
        this.tiposProcedimento = data;
      },
      error: (err: any) => console.error('Erro:', err)
    });
  }

  loadTiposDocumento(): void {
  console.log('🔍 INICIANDO loadTiposDocumento');
  console.log('Service:', this.tipoDocumentoService);

  this.tipoDocumentoService.getAllForDropdown().subscribe({
    next: (data: any) => {
      console.log('📄 RESPOSTA RECEBIDA:', data);
      console.log('É array?', Array.isArray(data));
      console.log('Quantidade:', data?.length);

      this.tiposDocumento = data || [];
      console.log('tiposDocumento agora:', this.tiposDocumento);
    },
    error: (err: any) => {
      console.error('❌ ERRO:', err);
      console.error('Status:', err.status);
      console.error('URL:', err.url);
    }
  });
}
loadPeritos(): void {
  this.usuarioService.getPeritosList().subscribe({
    next: (data: any) => {
      this.peritos = data;
      console.log('👨‍🔬 Peritos carregados:', this.peritos.length);
    },
    error: (err: any) => {
      console.error('Erro ao carregar peritos:', err);
    }
  });
}

  // WIZARD - Etapa 1
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
    this.loadClassificacoes();
  }

  // WIZARD - Etapa 2
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
        // PROCEDIMENTO JÁ EXISTE - OBRIGAR VINCULAÇÃO
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
            // VINCULAR O PROCEDIMENTO EXISTENTE
            this.ocorrenciaForm.patchValue({
              procedimento_cadastrado_id: this.procedimentoVinculado.id
            });
            this.irParaFormulario();
          } else {
            // CONTINUAR SEM PROCEDIMENTO
            this.procedimentoVinculado = null;
            this.ocorrenciaForm.patchValue({
              procedimento_cadastrado_id: null
            });
            this.irParaFormulario();
          }
        });
      } else {
        // PROCEDIMENTO NÃO EXISTE - OFERECE CADASTRAR
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

    this.procedimentoCadastradoService.create({
      tipo_procedimento_id,
      numero,
      ano
    }).subscribe({
      next: (novoProcedimento: any) => {
        this.procedimentoVinculado = novoProcedimento;
        this.ocorrenciaForm.patchValue({
          procedimento_cadastrado_id: novoProcedimento.id
        });
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
    this.loadClassificacoes();
  }

  voltarParaBusca(): void {
    this.etapaAtual = 'busca-procedimento';
  }

  toggleSecao(secao: keyof typeof this.secoesAbertas): void {
    this.secoesAbertas[secao] = !this.secoesAbertas[secao];
  }

  abrirSecao(secao: keyof typeof this.secoesAbertas): void {
    Object.keys(this.secoesAbertas).forEach(key => {
      this.secoesAbertas[key as keyof typeof this.secoesAbertas] = false;
    });
    this.secoesAbertas[secao] = true;
  }

loadOcorrencia(id: number): void {
  this.isLoading = true;
  this.ocorrenciaService.getById(id).subscribe({
    next: (ocorrencia: any) => {
      const user = this.authService.getCurrentUser();
      const isAdminOrSuper = this.authService.isSuperAdmin() || user?.perfil === 'ADMINISTRATIVO';

      // VERIFICAÇÃO 1: Se foi REABERTA, pode editar (ignora finalização)
      if (ocorrencia.reaberta_por) {
        // Só valida se é o perito responsável (se houver perito atribuído)
        if (ocorrencia.perito_atribuido && !isAdminOrSuper) {
          if (Number(user?.id) !== Number(ocorrencia.perito_atribuido.id)) {
            Swal.fire({
              title: 'Acesso Negado',
              text: 'Esta ocorrência está atribuída a outro perito.',
              icon: 'error',
              confirmButtonText: 'Voltar'
            }).then(() => {
              this.router.navigate(['/gabinete-virtual/operacional/ocorrencias']);
            });
            return;
          }
        }
        // Se passou, continua carregando normalmente
      } else {
        // VERIFICAÇÃO 2: Se NÃO foi reaberta, verifica se está finalizada
        const jaFinalizada = ocorrencia.esta_finalizada === true ||
                             !!ocorrencia.finalizada_por ||
                             !!ocorrencia.data_finalizacao;

        if (jaFinalizada && !this.authService.isSuperAdmin()) {
          Swal.fire({
            title: 'Ocorrência Finalizada',
            text: 'Esta ocorrência está finalizada e não pode ser editada.',
            icon: 'warning',
            confirmButtonText: 'Voltar'
          }).then(() => {
            this.router.navigate(['/gabinete-virtual/operacional/ocorrencias']);
          });
          return;
        }

        // VERIFICAÇÃO 3: Valida permissão de perito (se não for finalizada)
        if (ocorrencia.perito_atribuido && !isAdminOrSuper) {
          if (Number(user?.id) !== Number(ocorrencia.perito_atribuido.id)) {
            Swal.fire({
              title: 'Acesso Negado',
              text: 'Esta ocorrência está atribuída a outro perito.',
              icon: 'error',
              confirmButtonText: 'Voltar'
            }).then(() => {
              this.router.navigate(['/gabinete-virtual/operacional/ocorrencias']);
            });
            return;
          }
        }
      }

      // ===== CARREGAR DROPDOWNS =====
      this.loadUnidades();
      this.loadCargos();
      this.loadCidades();
      this.loadClassificacoes();
      this.loadPeritos();

      // ===== AUTORIDADE: Carregar cargo e autoridades =====
      if (ocorrencia.autoridade) {
        this.cargoSelecionado = ocorrencia.autoridade.cargo.id;
        this.autoridadeSelecionada = ocorrencia.autoridade;
        this.autoridadeBusca = ocorrencia.autoridade.nome;

        this.autoridadeService.getAll('', this.cargoSelecionado ?? undefined).subscribe({
          next: (response: any) => {
            this.autoridades = response.results || [];
          },
          error: (err: any) => console.error('Erro ao carregar autoridades:', err)
        });
      }

      // ===== PATCH FORM =====
      this.ocorrenciaForm.patchValue({
        servico_pericial_id: ocorrencia.servico_pericial.id,
        unidade_demandante_id: ocorrencia.unidade_demandante?.id,
        autoridade_id: ocorrencia.autoridade?.id,
        cidade_id: ocorrencia.cidade?.id,
        classificacao_id: ocorrencia.classificacao?.id,
        data_fato: ocorrencia.data_fato,
        hora_fato: ocorrencia.hora_fato,
        procedimento_cadastrado_id: ocorrencia.procedimento_cadastrado?.id,
        tipo_documento_origem_id: ocorrencia.tipo_documento_origem?.id,
        numero_documento_origem: ocorrencia.numero_documento_origem,
        data_documento_origem: ocorrencia.data_documento_origem,
        processo_sei_numero: ocorrencia.processo_sei_numero,
        perito_atribuido_id: ocorrencia.perito_atribuido?.id,
        historico: ocorrencia.historico
      });

      // Desabilitar campos não editáveis
      this.ocorrenciaForm.get('data_fato')?.disable();
      this.ocorrenciaForm.get('hora_fato')?.disable();

      this.examesSelecionados = ocorrencia.exames_solicitados || [];
      this.procedimentoVinculado = ocorrencia.procedimento_cadastrado || null;

      this.isLoading = false;


    },
    error: (err: any) => {
      console.error('Erro:', err);
      Swal.fire({
        title: 'Erro',
        text: 'Erro ao carregar ocorrência.',
        icon: 'error'
      }).then(() => {
        this.router.navigate(['/gabinete-virtual/operacional/ocorrencias']);
      });
      this.isLoading = false;
    }
  });
}
  modalExamesAberto = false;

abrirModalExames(): void {
  console.log('🔵 CLICOU EM ADICIONAR EXAMES');

  const servicoId = this.ocorrenciaForm.get('servico_pericial_id')?.value;

  console.log('🔍 Serviço ID:', servicoId);

  if (!servicoId) {
    console.log('❌ SEM SERVIÇO SELECIONADO');
    Swal.fire('Atenção', 'Selecione primeiro o serviço pericial.', 'warning');
    return;
  }

  console.log('✅ Buscando exames...');

  this.exameService.getAll(servicoId).subscribe({
    next: (exames: Exame[]) => {
      console.log('📋 Exames recebidos:', exames);
      console.log('📋 Quantidade:', exames.length);
      this.examesDisponiveis = exames;
      console.log('🔵 Abrindo modal...');
      this.modalExamesAberto = true;
      console.log('🔵 modalExamesAberto:', this.modalExamesAberto);
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

  onSubmit(): void {
  if (this.ocorrenciaForm.invalid) {
    this.ocorrenciaForm.markAllAsTouched();
    Swal.fire('Atenção', 'Preencha todos os campos obrigatórios.', 'warning');
    return;
  }

  this.isSaving = true;
  const formValues = this.ocorrenciaForm.getRawValue();
  let payload: any; // Usamos 'any' para flexibilidade entre create e update

  if (this.isEditMode) {
    // MODO DE EDIÇÃO: Envia apenas os campos permitidos pelo OcorrenciaUpdateSerializer
    payload = {
      historico: formValues.historico,
      processo_sei_numero: formValues.processo_sei_numero,
      numero_documento_origem: formValues.numero_documento_origem,
      data_documento_origem: formValues.data_documento_origem || null,
      tipo_documento_origem_id: formValues.tipo_documento_origem_id,
      perito_atribuido_id: formValues.perito_atribuido_id,
      exames_ids: this.examesSelecionados.map(e => e.id)
      // CRUCIAL: NÃO ENVIAMOS 'procedimento_cadastrado_id' na edição!
    };
    console.log(' DADOS DE ATUALIZAÇÃO (PATCH) ENVIADOS PARA A API: ', payload);

  } else {
    // MODO DE CRIAÇÃO: Envia o payload completo
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
    console.log(' DADOS DE CRIAÇÃO (POST) ENVIADOS PARA A API: ', payload);
  }

  const request = this.isEditMode && this.ocorrenciaId
    ? this.ocorrenciaService.update(this.ocorrenciaId, payload)
    : this.ocorrenciaService.create(payload);

  request.subscribe({
    next: (ocorrencia: any) => {
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
    error: (err: any) => {
      console.error('ERRO DETALHADO DO BACKEND:', err);
      let errorMsg = 'Ocorreu um erro ao salvar. Tente novamente.';
      if (err.error) {
          errorMsg = Object.entries(err.error)
              .map(([field, messages]) => `${field}: ${(messages as string[]).join(', ')}`)
              .join('\n');
      }
      Swal.fire('Erro ao Salvar', `<pre style="text-align: left; font-size: 0.9em;">${errorMsg}</pre>`, 'error');
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
