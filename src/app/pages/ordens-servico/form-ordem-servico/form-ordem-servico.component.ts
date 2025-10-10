// src/app/pages/ordens-servico/form-ordem-servico/form-ordem-servico.component.ts

import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { OrdemServicoService, CriarOrdemServicoPayload } from '../../../services/ordem-servico.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { UsuarioService } from '../../../services/usuario.service';  // Ajuste o caminho


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

  constructor(
    private ordemServicoService: OrdemServicoService,
    private usuarioService: UsuarioService,  // ← ADICIONE
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.carregarDadosIniciais();
  }

  // ===========================================================================
  // CARREGAMENTO DE DADOS
  // ===========================================================================

  carregarDadosIniciais(): void {
    // TODO: Carregar usuários e tipos de documento
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
    this.http.get<any>('http://localhost:8000/api/tipos-documento/').subscribe({
      next: (response) => {
        this.tiposDocumento = response.results || [];
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

    this.buscandoOcorrencia = true;
    this.erroOcorrencia = null;
    this.ocorrenciaEncontrada = null;

    // Busca na API
    this.http.get<any>(
      `http://localhost:8000/api/ocorrencias/?search=${this.numeroOcorrenciaBusca}`
    ).subscribe({
      next: (response) => {
        this.buscandoOcorrencia = false;

        if (response.results && response.results.length > 0) {
          const ocorrencia = response.results[0];

          // Valida se tem perito atribuído
          if (!ocorrencia.perito_atribuido) {
            this.erroOcorrencia = 'Esta ocorrência não possui perito atribuído. Atribua um perito antes de emitir a OS.';
            return;
          }

          // Valida se não está finalizada
          if (ocorrencia.status === 'FINALIZADA') {
            this.erroOcorrencia = 'Esta ocorrência já está finalizada. Não é possível emitir novas OS.';
            return;
          }

          // Sucesso!
          this.ocorrenciaEncontrada = ocorrencia;
          this.form.ocorrencia_id = ocorrencia.id;
          this.erroOcorrencia = null;

        } else {
          this.erroOcorrencia = `Ocorrência "${this.numeroOcorrenciaBusca}" não encontrada. Verifique o número e tente novamente.`;
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
  // Valida SÓ os campos do formulário principal
  if (!this.validarFormularioPrincipal()) {
    return;
  }

  // Se passou, mostra a tela de assinatura
  this.mostrarAssinatura = true;
  this.error = null;  // Limpa erro anterior
}
  confirmarCriacao(): void {
  // Agora usa a validação COMPLETA (com email e senha)
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
      alert(response.message);
      this.router.navigate(['/gabinete-virtual/operacional/ordens-servico', response.ordem_servico.id]);
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
    if (confirm('Deseja cancelar a criação da OS? Os dados serão perdidos.')) {
      this.router.navigate(['/gabinete-virtual/operacional/ordens-servico']);
    }
  }

  voltarParaFormulario(): void {
    this.mostrarAssinatura = false;
    this.senhaConfirmacao = '';
  }
}
