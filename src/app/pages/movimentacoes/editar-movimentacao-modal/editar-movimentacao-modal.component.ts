import { Component, Input, Output, EventEmitter, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MovimentacaoService } from '../../../services/movimentacao.service';
import { Movimentacao, CriarMovimentacao } from '../../../interfaces/movimentacao.interface';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-editar-movimentacao-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './editar-movimentacao-modal.component.html',
  styleUrls: ['./editar-movimentacao-modal.component.scss']
})
export class EditarMovimentacaoModalComponent implements OnInit {
  @Input() ocorrenciaId!: number;
  @Input() movimentacao!: Movimentacao;
  @Output() fechar = new EventEmitter<void>();

  private movimentacaoService = inject(MovimentacaoService);

  salvando = signal(false);
  erro = signal<string | null>(null);

  // Dados do formulário
  formulario: CriarMovimentacao = {
    assunto: '',
    descricao: '',
    username: '',
    password: ''
  };

  ngOnInit() {
    // Preenche o formulário com os dados existentes
    if (this.movimentacao) {
      this.formulario.assunto = this.movimentacao.assunto;
      this.formulario.descricao = this.movimentacao.descricao;
    }
  }

  salvar() {
    // Validações básicas
    if (!this.formulario.assunto.trim()) {
      this.erro.set('O assunto é obrigatório');
      return;
    }

    if (!this.formulario.descricao.trim()) {
      this.erro.set('A descrição é obrigatória');
      return;
    }

    if (!this.formulario.username.trim()) {
      this.erro.set('O email de confirmação é obrigatório');
      return;
    }

    if (!this.formulario.password) {
      this.erro.set('A senha de confirmação é obrigatória');
      return;
    }

    // Inicia o salvamento
    this.salvando.set(true);
    this.erro.set(null);

    this.movimentacaoService.editar(
      this.ocorrenciaId,
      this.movimentacao.id,
      this.formulario
    ).subscribe({
      next: (response) => {
        console.log('✅ Sucesso:', response);
        this.salvando.set(false);
        Swal.fire({
          title: 'Sucesso!',
          text: 'Movimentação atualizada com sucesso!',
          icon: 'success',
          confirmButtonText: 'OK'
        });
        this.fechar.emit();
      },
      error: (err) => {
        // SÓ chega aqui se DEU ERRO (HTTP 400, 403, 500, etc)
        console.error('❌ Erro completo:', err);
        this.salvando.set(false);

        let mensagemErro = 'Erro ao editar movimentação.';

        if (err.error) {
          console.log('📦 err.error:', err.error);

          // Erro de permissão
          if (err.error.non_field_errors) {
            mensagemErro = Array.isArray(err.error.non_field_errors)
              ? err.error.non_field_errors[0]
              : err.error.non_field_errors;
          }
          // Erro no email
          else if (err.error.username) {
            mensagemErro = Array.isArray(err.error.username)
              ? err.error.username[0]
              : err.error.username;
          }
          // Erro na senha
          else if (err.error.password) {
            mensagemErro = Array.isArray(err.error.password)
              ? err.error.password[0]
              : err.error.password;
          }
          // Erro genérico do backend
          else if (err.error.detail) {
            mensagemErro = err.error.detail;
          }
          // Se for string direta
          else if (typeof err.error === 'string') {
            mensagemErro = err.error;
          }
        }

        console.log('📢 Mensagem de erro:', mensagemErro);
        this.erro.set(mensagemErro);

        // NÃO FECHA O MODAL - usuário vê o erro
      }
    });
  }

  cancelar() {
    const dadosAlterados =
      this.formulario.assunto !== this.movimentacao.assunto ||
      this.formulario.descricao !== this.movimentacao.descricao;

    if (dadosAlterados || this.formulario.username || this.formulario.password) {
      Swal.fire({
        title: 'Confirmar Cancelamento',
        text: 'Deseja realmente cancelar? As alterações não serão salvas.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sim, cancelar',
        cancelButtonText: 'Não, continuar editando',
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6'
      }).then((result) => {
        if (result.isConfirmed) {
          this.fechar.emit();
        }
      });
    } else {
      this.fechar.emit();
    }
  }

  fecharModal(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.cancelar();
    }
  }

  formatarData(data: string): string {
    return new Date(data).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
