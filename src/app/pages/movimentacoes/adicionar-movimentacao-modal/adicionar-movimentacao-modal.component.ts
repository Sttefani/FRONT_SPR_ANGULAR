import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MovimentacaoService } from '../../../services/movimentacao.service';
import { CriarMovimentacao } from '../../../interfaces/movimentacao.interface';
import Swal from 'sweetalert2';


@Component({
  selector: 'app-adicionar-movimentacao-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './adicionar-movimentacao-modal.component.html',
  styleUrls: ['./adicionar-movimentacao-modal.component.scss']
})
export class AdicionarMovimentacaoModalComponent {
  @Input() ocorrenciaId!: number;
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

  salvar() {
    // Validações
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

    this.salvando.set(true);
    this.erro.set(null);

    this.movimentacaoService.criar(this.ocorrenciaId, this.formulario).subscribe({
      next: () => {
        this.salvando.set(false);
        Swal.fire({
          title: 'Sucesso!',
          text: 'Movimentação adicionada com sucesso!',
          icon: 'success',
          confirmButtonText: 'OK'
        });
        this.fechar.emit();
      },
      error: (err) => {
        this.salvando.set(false);
        console.error('Erro ao criar movimentação:', err);

        // Tratamento de erros do backend
        if (err.error) {
          if (err.error.username) {
            this.erro.set(err.error.username[0] || err.error.username);
          } else if (err.error.password) {
            this.erro.set(err.error.password[0] || err.error.password);
          } else if (err.error.non_field_errors) {
            this.erro.set(err.error.non_field_errors[0]);
          } else if (err.error.detail) {
            this.erro.set(err.error.detail);
          } else {
            this.erro.set('Erro ao adicionar movimentação. Verifique os dados.');
          }
        } else {
          this.erro.set('Erro ao adicionar movimentação. Tente novamente.');
        }
      }
    });
  }

  cancelar() {
  if (this.formulario.assunto || this.formulario.descricao) {
    Swal.fire({
      title: 'Confirmar Cancelamento',
      text: 'Deseja realmente cancelar? Os dados não serão salvos.',
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
}
