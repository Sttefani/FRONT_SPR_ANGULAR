// src/app/pages/ordens-servico/form-ordem-servico/form-ordem-servico.component.ts

import { Component, OnInit } from '@angular/core';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { OrdemServicoService, CriarOrdemServicoPayload } from '../../../services/ordem-servico.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';  // ← LINHA ADICIONADA
import { HttpClient } from '@angular/common/http';
import { UsuarioService } from '../../../services/usuario.service';
import Swal from 'sweetalert2';
import { expand, of, reduce } from 'rxjs';

@Component({
  selector: 'app-form-ordem-servico',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './form-ordem-servico.component.html',
  styleUrls: ['./form-ordem-servico.component.scss']
})
export class FormOrdemServicoComponent implements OnInit {
  loading = false;
  error: string | null = null;

  // BUSCA DE OCORRÊNCIA
  numeroOcorrenciaBusca = '';
  buscandoOcorrencia = false;
  ocorrenciaEncontrada: any = null;
  erroOcorrencia: string | null = null;

  // Form data
  form: Partial<CriarOrdemServicoPayload> = {
    prazo_dias: 10,
    observacoes_administrativo: '',
    numero_documento_referencia: '',
    processo_sei_referencia: '',
    processo_judicial_referencia: ''
  };

  // Assinatura digital
  emailConfirmacao = '';
  senhaConfirmacao = '';

  // Dados para selects
  usuarios: any[] = [];
  tiposDocumento: any[] = [];

  // Controles
  mostrarAssinatura = false;

  // Modo edição (admin corrige a OS enquanto o perito não tomou ciência)
  isEdit = false;
  ordemId: number | null = null;
  carregandoOrdem = false;

  constructor(
    private ordemServicoService: OrdemServicoService,
    private usuarioService: UsuarioService,
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.carregarDadosIniciais();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.ordemId = Number(id);
      this.carregarOrdemParaEdicao(this.ordemId);
    }
  }

  carregarOrdemParaEdicao(id: number): void {
    this.carregandoOrdem = true;
    this.ordemServicoService.buscarPorId(id).subscribe({
      next: (os) => {
        // Guard de segurança: o backend já bloqueia, mas evitamos abrir o form à toa
        if (os.pode_editar === false) {
          Swal.fire({
            title: 'Edição bloqueada',
            text: 'Esta OS não pode mais ser editada porque já houve ciência (do perito ou automática por inércia).',
            icon: 'warning',
            confirmButtonText: 'OK'
          }).then(() => this.router.navigate(['/gabinete-virtual/operacional/ordens-servico', id]));
          return;
        }
        // Pré-preenche os campos editáveis
        this.form = {
          ocorrencia_id: os.ocorrencia?.id,
          prazo_dias: os.prazo_dias,
          ordenada_por_id: os.ordenada_por?.id,
          observacoes_administrativo: os.observacoes_administrativo || '',
          tipo_documento_referencia_id: os.tipo_documento_referencia?.id,
          numero_documento_referencia: os.numero_documento_referencia || '',
          processo_sei_referencia: os.processo_sei_referencia || '',
          processo_judicial_referencia: os.processo_judicial_referencia || ''
        };
        // Reaproveita o card "Passo 2" exibindo a ocorrência fixa (sem busca)
        this.ocorrenciaEncontrada = {
          numero_ocorrencia: os.ocorrencia?.numero_ocorrencia,
          perito_atribuido: os.perito_destinatario,
          servico_pericial: os.ocorrencia?.servico_pericial
        };
        this.carregandoOrdem = false;
      },
      error: () => {
        this.error = 'Não foi possível carregar a OS para edição.';
        this.carregandoOrdem = false;
      }
    });
  }

  salvarEdicao(): void {
    if (!this.validarFormularioPrincipal() || !this.ordemId) {
      return;
    }
    this.loading = true;
    this.error = null;

    // Envia apenas os campos editáveis (PATCH parcial)
    const payload: any = {
      prazo_dias: this.form.prazo_dias,
      ordenada_por_id: this.form.ordenada_por_id,
      observacoes_administrativo: this.form.observacoes_administrativo,
      tipo_documento_referencia_id: this.form.tipo_documento_referencia_id ?? null,
      numero_documento_referencia: this.form.numero_documento_referencia,
      processo_sei_referencia: this.form.processo_sei_referencia,
      processo_judicial_referencia: this.form.processo_judicial_referencia
    };

    this.ordemServicoService.atualizar(this.ordemId, payload).subscribe({
      next: () => {
        Swal.fire({
          title: 'Alterações salvas!',
          text: 'A Ordem de Serviço foi atualizada.',
          icon: 'success',
          confirmButtonText: 'Ver Detalhes'
        }).then(() => {
          this.router.navigate(['/gabinete-virtual/operacional/ordens-servico', this.ordemId]);
        });
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.detail || err.error?.error || 'Erro ao salvar as alterações. Tente novamente.';
      }
    });
  }

  // ===========================================================================
  // CARREGAMENTO DE DADOS
  // ===========================================================================

  carregarDadosIniciais(): void {
    this.carregarUsuarios();
    this.carregarTiposDocumento();
  }

  carregarUsuarios(): void {
    this.usuarioService.getPeritosList().subscribe({
      next: (peritos) => {
        this.usuarios = peritos;
        console.log('Peritos carregados:', this.usuarios.length);
      },
      error: (err) => console.error('Erro ao carregar peritos:', err)
    });
  }

  carregarTiposDocumento(): void {
    this.http.get<any>(`${environment.apiUrl}/tipos-documento/`)  // ← LINHA MODIFICADA
      .pipe(
        expand(response => response.next ? this.http.get<any>(response.next) : of()),
        reduce((acc: any[], response) => [...acc, ...(response.results || [])], [])
      )
      .subscribe({
        next: (todosResultados) => {
          this.tiposDocumento = todosResultados;
        },
        error: (err) => console.error('Erro ao carregar tipos documento:', err)
      });
  }

  // ===========================================================================
  // BUSCA DE OCORRÊNCIA
  // ===========================================================================

  buscarOcorrencia(): void {
    if (!this.numeroOcorrenciaBusca.trim()) {
      this.erroOcorrencia = 'Digite o número da ocorrência';
      return;
    }

    const numeroBuscado = this.numeroOcorrenciaBusca.trim();

    this.buscandoOcorrencia = true;
    this.erroOcorrencia = null;
    this.ocorrenciaEncontrada = null;

    this.http.get<any>(
      `${environment.apiUrl}/ocorrencias/?numero_ocorrencia=${numeroBuscado}`  // ← LINHA MODIFICADA
    ).subscribe({
      next: (response) => {
        this.buscandoOcorrencia = false;

        const ocorrenciaExata = response.results?.find(
          (occ: any) => occ.numero_ocorrencia === numeroBuscado
        );

        if (ocorrenciaExata) {
          const ocorrencia = ocorrenciaExata;

          if (!ocorrencia.perito_atribuido) {
            this.erroOcorrencia = 'Esta ocorrência não possui perito atribuído. Atribua um perito antes de emitir a OS.';
            return;
          }

          if (ocorrencia.status === 'FINALIZADA') {
            this.erroOcorrencia = `Você não pode emitir OS para a ocorrência ${ocorrencia.numero_ocorrencia}, pois ela já foi finalizada.`;
            return;
          }

          this.ocorrenciaEncontrada = ocorrencia;
          this.form.ocorrencia_id = ocorrencia.id;
          this.erroOcorrencia = null;
        } else {
          this.erroOcorrencia = `Ocorrência "${numeroBuscado}" não encontrada ou não está disponível para receber OS. Verifique o número e o status.`;
        }
      },
      error: (err) => {
        this.buscandoOcorrencia = false;
        this.erroOcorrencia = 'Erro ao buscar ocorrência. Tente novamente.';
        console.error('Erro:', err);
      }
    });
  }

  limparBusca(): void {
    this.numeroOcorrenciaBusca = '';
    this.ocorrenciaEncontrada = null;
    this.erroOcorrencia = null;
    this.form.ocorrencia_id = undefined;
  }

  // ===========================================================================
  // VALIDAÇÃO
  // ===========================================================================

  validarFormularioPrincipal(): boolean {
    if (!this.form.ocorrencia_id) {
      this.error = 'Busque e selecione uma ocorrência';
      return false;
    }

    if (!this.form.prazo_dias || this.form.prazo_dias < 1) {
      this.error = 'Informe um prazo válido (mínimo 1 dia)';
      return false;
    }

    if (!this.form.ordenada_por_id) {
      this.error = 'Selecione quem ordenou a OS';
      return false;
    }

    this.error = null;
    return true;
  }

  // ===========================================================================
  // AÇÕES
  // ===========================================================================

  prepararAssinatura(): void {
    if (!this.validarFormularioPrincipal()) {
      return;
    }

    this.mostrarAssinatura = true;
    this.error = null;
  }

  confirmarCriacao(): void {
    if (!this.validarFormularioPrincipal()) {
      return;
    }

    this.loading = true;
    this.error = null;

    const payload: CriarOrdemServicoPayload = {
      ocorrencia_id: this.form.ocorrencia_id!,
      prazo_dias: this.form.prazo_dias!,
      ordenada_por_id: this.form.ordenada_por_id!,
      observacoes_administrativo: this.form.observacoes_administrativo,
      tipo_documento_referencia_id: this.form.tipo_documento_referencia_id,
      numero_documento_referencia: this.form.numero_documento_referencia,
      processo_sei_referencia: this.form.processo_sei_referencia,
      processo_judicial_referencia: this.form.processo_judicial_referencia,
      email: this.emailConfirmacao,
      password: this.senhaConfirmacao
    };

    this.ordemServicoService.criar(payload).subscribe({
      next: (response) => {
        Swal.fire({
          title: 'Sucesso!',
          text: response.message,
          icon: 'success',
          confirmButtonText: 'Ver Detalhes',
          showCancelButton: true,
          cancelButtonText: 'Voltar à Lista'
        }).then((result) => {
          if (result.isConfirmed) {
            this.router.navigate(['/gabinete-virtual/operacional/ordens-servico', response.ordem_servico.id]);
          } else {
            this.router.navigate(['/gabinete-virtual/operacional/ordens-servico']);
          }
        });
      },
      error: (err) => {
        this.loading = false;

        if (err.error?.email) {
          this.error = 'Email incorreto: ' + err.error.email[0];
        } else if (err.error?.password) {
          this.error = 'Senha incorreta: ' + err.error.password[0];
        } else if (err.error?.error) {
          this.error = err.error.error;
        } else {
          this.error = 'Erro ao criar ordem de serviço. Tente novamente.';
        }

        console.error('Erro:', err);
      }
    });
  }

  cancelar(): void {
    if (this.isEdit && this.ordemId) {
      this.router.navigate(['/gabinete-virtual/operacional/ordens-servico', this.ordemId]);
      return;
    }
    if (confirm('Deseja cancelar a criação da OS? Os dados serão perdidos.')) {
      this.router.navigate(['/gabinete-virtual/operacional/ordens-servico']);
    }
  }

  voltarParaFormulario(): void {
    this.mostrarAssinatura = false;
    this.senhaConfirmacao = '';
  }
}
