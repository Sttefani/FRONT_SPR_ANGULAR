import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MovimentacaoService } from '../../../services/movimentacao.service';
import { Movimentacao } from '../../../interfaces/movimentacao.interface';
import { AdicionarMovimentacaoModalComponent } from '../adicionar-movimentacao-modal/adicionar-movimentacao-modal.component';
import { EditarMovimentacaoModalComponent } from '../editar-movimentacao-modal/editar-movimentacao-modal.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-movimentacao-timeline',
  standalone: true,
  imports: [
    CommonModule,
    AdicionarMovimentacaoModalComponent,
    EditarMovimentacaoModalComponent
  ],
  templateUrl: './movimentacao-timeline.component.html',
  styleUrls: ['./movimentacao-timeline.component.scss']
})
export class MovimentacaoTimelineComponent implements OnInit {
  @Input() ocorrenciaId!: number;
  @Input() perfilUsuario: string = '';

  private movimentacaoService = inject(MovimentacaoService);

  movimentacoes = signal<Movimentacao[]>([]);
  carregando = signal(false);
  erro = signal<string | null>(null);

  // Controle de modais
  mostrarModalAdicionar = signal(false);
  mostrarModalEditar = signal(false);
  movimentacaoSelecionada = signal<Movimentacao | null>(null);

  ngOnInit() {
    if (!this.ocorrenciaId) {
      console.error('ocorrenciaId é obrigatório!');
      return;
    }
    this.carregarMovimentacoes();
  }

  carregarMovimentacoes() {
    this.carregando.set(true);
    this.erro.set(null);

    this.movimentacaoService.listar(this.ocorrenciaId).subscribe({
      next: (dados) => {
        // Ordena do mais recente para o mais antigo
        const ordenados = dados.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        this.movimentacoes.set(ordenados);
        this.carregando.set(false);
      },
      error: (err) => {
        this.erro.set('Erro ao carregar movimentações');
        this.carregando.set(false);
        console.error(err);
      }
    });
  }

  abrirModalAdicionar() {
    this.mostrarModalAdicionar.set(true);
  }

  fecharModalAdicionar() {
    this.mostrarModalAdicionar.set(false);
    this.movimentacaoSelecionada.set(null);

    // Aguarda um momento antes de recarregar para garantir que o backend processou
    setTimeout(() => {
      this.carregarMovimentacoes();
    }, 300);
  }

  abrirModalEditar(movimentacao: Movimentacao) {
    this.movimentacaoSelecionada.set(movimentacao);
    this.mostrarModalEditar.set(true);
  }

  fecharModalEditar() {
    this.mostrarModalEditar.set(false);
    this.movimentacaoSelecionada.set(null);

    // Aguarda um momento antes de recarregar para garantir que o backend processou
    setTimeout(() => {
      this.carregarMovimentacoes();
    }, 300);
  }

  gerarPdf(movimentacao: Movimentacao) {
  this.movimentacaoService.gerarPdf(this.ocorrenciaId, movimentacao.id).subscribe({
    next: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `movimentacao_${movimentacao.id}_${this.formatarDataArquivo(movimentacao.created_at)}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    },
    error: (err) => {
      Swal.fire('Erro', 'Erro ao gerar PDF', 'error');
      console.error(err);
    }
  });
}
  gerarHistoricoPdf() {
  this.movimentacaoService.gerarHistoricoPdf(this.ocorrenciaId).subscribe({
    next: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `historico_movimentacoes_ocorrencia_${this.ocorrenciaId}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    },
    error: (err) => {
      Swal.fire('Erro', 'Erro ao gerar PDF do histórico', 'error');
      console.error(err);
    }
  });
}

  deletar(movimentacao: Movimentacao) {
  Swal.fire({
    title: 'Confirmar Exclusão',
    html: `Tem certeza que deseja deletar a movimentação<br><strong>"${movimentacao.assunto}"</strong>?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sim, deletar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#d33'
  }).then((result) => {
    if (result.isConfirmed) {
      this.movimentacaoService.deletar(this.ocorrenciaId, movimentacao.id).subscribe({
        next: () => {
          Swal.fire('Sucesso!', 'Movimentação deletada com sucesso!', 'success');
          this.carregarMovimentacoes();
        },
        error: (err) => {
          Swal.fire('Erro', 'Erro ao deletar movimentação', 'error');
          console.error(err);
        }
      });
    }
  });
}
  // Permissões
  podeAdicionar(): boolean {
    return ['SUPER_ADMIN', 'ADMINISTRATIVO', 'PERITO', 'OPERACIONAL'].includes(this.perfilUsuario);
  }

  podeEditar(): boolean {
    return ['SUPER_ADMIN', 'ADMINISTRATIVO', 'PERITO', 'OPERACIONAL'].includes(this.perfilUsuario);
  }

  podeDeletar(): boolean {
    return this.perfilUsuario === 'SUPER_ADMIN';
  }

  // Helpers
  formatarData(data: string): string {
    return new Date(data).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatarDataArquivo(data: string): string {
    return new Date(data).toLocaleDateString('pt-BR').replace(/\//g, '-');
  }

  foiEditado(movimentacao: Movimentacao): boolean {
    return movimentacao.created_at !== movimentacao.updated_at;
  }
}
