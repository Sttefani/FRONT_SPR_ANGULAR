// src/app/pages/ordens-servico/detalhes-ordem-servico/detalhes-ordem-servico.component.ts

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { OrdemServicoService, OrdemServico } from '../../../services/ordem-servico.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-detalhes-ordem-servico',
  standalone: true,  // ← ADICIONE
  imports: [CommonModule, FormsModule, RouterModule],  // ← ADICIONE
  templateUrl: './detalhes-ordem-servico.component.html',
  styleUrls: ['./detalhes-ordem-servico.component.scss']
})
export class DetalhesOrdemServicoComponent implements OnInit {
  ordemServico: OrdemServico | null = null;
  loading = true;
  error: string | null = null;

  // Controles de modais
  mostrarModalCiencia = false;
  mostrarModalJustificativa = false;
  mostrarModalReiterar = false;

  // Forms
  senhaCiencia = '';
  justificativaAtraso = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ordemServicoService: OrdemServicoService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.carregarOrdemServico(+id);
    }
  }

  // ===========================================================================
  // CARREGAMENTO
  // ===========================================================================

  carregarOrdemServico(id: number): void {
    this.loading = true;
    this.error = null;

    this.ordemServicoService.buscarPorId(id).subscribe({
      next: (os) => {
        this.ordemServico = os;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Erro ao carregar ordem de serviço.';
        this.loading = false;
        console.error('Erro:', err);
      }
    });
  }

  // ===========================================================================
  // AÇÕES DO PERITO
  // ===========================================================================

  abrirModalCiencia(): void {
    this.mostrarModalCiencia = true;
    this.senhaCiencia = '';
  }

  confirmarCiencia(): void {
    if (!this.ordemServico || !this.senhaCiencia) return;

    this.ordemServicoService.tomarCiencia(this.ordemServico.id, {
      password: this.senhaCiencia
    }).subscribe({
      next: (response) => {
        alert(response.message);
        this.mostrarModalCiencia = false;
        this.carregarOrdemServico(this.ordemServico!.id);
      },
      error: (err) => {
        alert('Erro: ' + (err.error?.password?.[0] || 'Senha incorreta'));
      }
    });
  }

 iniciarTrabalho(): void {
  if (!this.ordemServico) return;

  // Usando SweetAlert2 (mais bonito!)
  Swal.fire({
    title: 'Iniciar Trabalho?',
    text: 'Deseja marcar esta OS como "Em Andamento"?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Sim, iniciar!',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#3182ce',
    cancelButtonColor: '#6c757d'
  }).then((result) => {
    if (result.isConfirmed) {
      // Mostra loading
      Swal.fire({
        title: 'Iniciando...',
        text: 'Aguarde um momento',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      this.ordemServicoService.iniciarTrabalho(this.ordemServico!.id).subscribe({
        next: (response) => {
          Swal.fire({
            title: 'Sucesso!',
            text: response.message,
            icon: 'success',
            confirmButtonText: 'OK'
          }).then(() => {
            this.carregarOrdemServico(this.ordemServico!.id);
          });
        },
        error: (err) => {
          Swal.fire({
            title: 'Erro!',
            text: err.error?.error || 'Não foi possível iniciar o trabalho',
            icon: 'error',
            confirmButtonText: 'OK'
          });
        }
      });
    }
  });
}

  abrirModalJustificativa(): void {
    this.mostrarModalJustificativa = true;
    this.justificativaAtraso = this.ordemServico?.justificativa_atraso || '';
  }

  salvarJustificativa(): void {
    if (!this.ordemServico || !this.justificativaAtraso.trim()) {
      alert('Digite uma justificativa válida');
      return;
    }

    this.ordemServicoService.justificarAtraso(this.ordemServico.id, {
      justificativa: this.justificativaAtraso
    }).subscribe({
      next: (response) => {
        alert(response.message);
        this.mostrarModalJustificativa = false;
        this.carregarOrdemServico(this.ordemServico!.id);
      },
      error: (err) => {
        alert('Erro ao salvar justificativa');
      }
    });
  }

  // ===========================================================================
  // PDFs
  // ===========================================================================

  baixarPdf(oficial = false): void {
    if (!this.ordemServico) return;

    const metodo = oficial
      ? this.ordemServicoService.gerarPdfOficial(this.ordemServico.id)
      : this.ordemServicoService.gerarPdf(this.ordemServico.id);

    metodo.subscribe({
      next: (blob) => {
        const nomeArquivo = oficial
          ? `OS_${this.ordemServico!.numero_os}_oficial.pdf`
          : `OS_${this.ordemServico!.numero_os}.pdf`;
        this.ordemServicoService.downloadPdf(blob, nomeArquivo);
      },
      error: (err) => {
        alert('Erro ao gerar PDF');
        console.error(err);
      }
    });
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  getStatusColor(status: string): string {
    return this.ordemServicoService.getStatusColor(status);
  }

  getStatusLabel(status: string): string {
    return this.ordemServicoService.getStatusLabel(status);
  }

  getUrgenciaInfo(urgencia: string | null) {
    return this.ordemServicoService.getUrgenciaInfo(urgencia);
  }

  getDiasRestantesTexto(): string {
    if (!this.ordemServico) return '';

    const dias = this.ordemServico.dias_restantes;

    if (dias === null) {
      return 'Aguardando ciência';
    }

    if (dias < 0) {
      return `Vencida há ${Math.abs(dias)} dia(s)`;
    }

    if (dias === 0) {
      return 'Vence hoje!';
    }

    return `${dias} dia(s) restante(s)`;
  }

  formatarData(data: string | null): string {
    if (!data) return '-';

    const d = new Date(data);
    return d.toLocaleString('pt-BR');
  }

  voltar(): void {
  this.router.navigate(['/gabinete-virtual/operacional/ordens-servico']);  // ← CORRIGIDO
}
}
