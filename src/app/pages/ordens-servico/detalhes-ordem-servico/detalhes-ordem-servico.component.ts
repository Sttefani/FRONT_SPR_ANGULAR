// src/app/pages/ordens-servico/detalhes-ordem-servico/detalhes-ordem-servico.component.ts

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { OrdemServicoService, OrdemServico } from '../../../services/ordem-servico.service';
import { AuthService } from '../../../services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-detalhes-ordem-servico',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
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
  prazoReiteracao = 5;
  ordenadaPorIdReiteracao: number | null = null;
  observacoesReiteracao = '';
  senhaReiteracao = '';
  emailReiteracao = '';

  Math = Math;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ordemServicoService: OrdemServicoService,
    private authService: AuthService
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
    if (!this.ordemServico || !this.senhaCiencia) {
      Swal.fire({
        title: 'Senha obrigatória!',
        text: 'Digite sua senha para confirmar',
        icon: 'warning',
        confirmButtonText: 'OK'
      });
      return;
    }

    Swal.fire({
      title: '⏳ Registrando ciência...',
      html: 'Aguarde um momento',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.ordemServicoService.tomarCiencia(this.ordemServico.id, {
      password: this.senhaCiencia
    }).subscribe({
      next: (response) => {
        this.mostrarModalCiencia = false;

        Swal.fire({
          title: '✅ Ciência Registrada!',
          html: `
            <div class="text-start">
              <p><strong>${response.message}</strong></p>
              <hr>
              <p class="mb-1">⏱️ <strong>Prazo:</strong> ${this.ordemServico!.prazo_dias} dia(s)</p>
              <p class="text-success mt-2">
                <i class="bi bi-clock-history"></i>
                <strong>O prazo começou a contar agora!</strong>
              </p>
            </div>
          `,
          icon: 'success',
          confirmButtonText: 'OK',
          confirmButtonColor: '#28a745'
        }).then(() => {
          this.carregarOrdemServico(this.ordemServico!.id);
        });
      },
      error: (err) => {
        Swal.fire({
          title: '❌ Erro ao Tomar Ciência',
          text: err.error?.password?.[0] || err.error?.error || 'Senha incorreta',
          icon: 'error',
          confirmButtonText: 'Tentar Novamente',
          confirmButtonColor: '#dc3545'
        });
      }
    });
  }

  iniciarTrabalho(): void {
    if (!this.ordemServico) return;

    Swal.fire({
      title: '▶️ Iniciar Trabalho?',
      text: 'Deseja marcar esta OS como "Em Andamento"?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sim, iniciar!',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3182ce',
      cancelButtonColor: '#6c757d'
    }).then((result) => {
      if (result.isConfirmed) {
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
              title: '✅ Trabalho Iniciado!',
              text: response.message,
              icon: 'success',
              confirmButtonText: 'OK',
              confirmButtonColor: '#28a745'
            }).then(() => {
              this.carregarOrdemServico(this.ordemServico!.id);
            });
          },
          error: (err) => {
            Swal.fire({
              title: '❌ Erro!',
              text: err.error?.error || 'Não foi possível iniciar o trabalho',
              icon: 'error',
              confirmButtonText: 'OK',
              confirmButtonColor: '#dc3545'
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
      Swal.fire({
        title: 'Justificativa obrigatória!',
        text: 'Digite uma justificativa válida para o atraso',
        icon: 'warning',
        confirmButtonText: 'OK'
      });
      return;
    }

    Swal.fire({
      title: '⏳ Salvando justificativa...',
      html: 'Aguarde um momento',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.ordemServicoService.justificarAtraso(this.ordemServico.id, {
      justificativa: this.justificativaAtraso
    }).subscribe({
      next: (response) => {
        this.mostrarModalJustificativa = false;

        Swal.fire({
          title: '✅ Justificativa Salva!',
          text: response.message,
          icon: 'success',
          confirmButtonText: 'OK',
          confirmButtonColor: '#28a745'
        }).then(() => {
          this.carregarOrdemServico(this.ordemServico!.id);
        });
      },
      error: (err) => {
        Swal.fire({
          title: '❌ Erro!',
          text: err.error?.error || 'Erro ao salvar justificativa',
          icon: 'error',
          confirmButtonText: 'OK',
          confirmButtonColor: '#dc3545'
        });
      }
    });
  }

  // ===========================================================================
  // AÇÕES DO ADMINISTRATIVO
  // ===========================================================================

  abrirModalReiterar(): void {
    if (!this.ordemServico) return;

    this.mostrarModalReiterar = true;
    this.prazoReiteracao = 5;
    this.observacoesReiteracao = `Reiteração da OS ${this.ordemServico.numero_os}`;
    this.senhaReiteracao = '';
    this.emailReiteracao = this.authService.getCurrentUser()?.email || '';
    this.ordenadaPorIdReiteracao = this.ordemServico.ordenada_por?.id || null;
  }

  salvarReiteracao(): void {
    if (!this.ordemServico || !this.senhaReiteracao || !this.emailReiteracao) {
      Swal.fire({
        title: 'Dados obrigatórios!',
        text: 'Preencha email e senha para assinar digitalmente',
        icon: 'warning',
        confirmButtonText: 'OK'
      });
      return;
    }

    if (this.prazoReiteracao < 1 || this.prazoReiteracao > 30) {
      Swal.fire({
        title: 'Prazo inválido!',
        text: 'O prazo da reiteração deve ser entre 1 e 30 dias',
        icon: 'warning',
        confirmButtonText: 'OK'
      });
      return;
    }

    Swal.fire({
      title: '⏳ Criando reiteração...',
      html: 'Aguarde um momento',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.ordemServicoService.reiterar(this.ordemServico.id, {
      prazo_dias: this.prazoReiteracao,
      ordenada_por_id: this.ordenadaPorIdReiteracao || undefined,
      observacoes_administrativo: this.observacoesReiteracao,
      email: this.emailReiteracao,
      password: this.senhaReiteracao
    }).subscribe({
      next: (response) => {
        this.mostrarModalReiterar = false;

        Swal.fire({
          title: '✅ Reiteração Criada!',
          html: `
            <div class="text-start">
              <p><strong>${response.message}</strong></p>
              <hr>
              <p class="mb-1">📋 <strong>Nova OS:</strong> ${response.ordem_servico.numero_os}</p>
              <p class="mb-1">⏱️ <strong>Prazo:</strong> ${response.ordem_servico.prazo_dias} dia(s)</p>
              <p class="text-info mt-2">
                <i class="bi bi-info-circle"></i>
                A nova OS foi criada e notificada ao perito.
              </p>
            </div>
          `,
          icon: 'success',
          confirmButtonText: 'Ver Nova OS',
          confirmButtonColor: '#28a745',
          showCancelButton: true,
          cancelButtonText: 'Ficar Aqui'
        }).then((result) => {
          if (result.isConfirmed) {
            this.router.navigate(['/gabinete-virtual/operacional/ordens-servico', response.ordem_servico.id]);
          } else {
            this.carregarOrdemServico(this.ordemServico!.id);
          }
        });
      },
      error: (err) => {
        Swal.fire({
          title: '❌ Erro ao Reiterar',
          text: err.error?.password?.[0] || err.error?.email?.[0] || err.error?.error || 'Erro ao criar reiteração',
          icon: 'error',
          confirmButtonText: 'Tentar Novamente',
          confirmButtonColor: '#dc3545'
        });
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

        Swal.fire({
          title: '✅ PDF Gerado!',
          text: 'O download começará automaticamente',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      },
      error: (err) => {
        console.error('Erro ao gerar PDF:', err);

        if (err.status === 403) {
          Swal.fire({
            title: '🔒 Ciência Necessária!',
            text: 'Você precisa tomar ciência desta OS antes de gerar o PDF',
            icon: 'warning',
            confirmButtonText: 'OK',
            confirmButtonColor: '#ffc107'
          });
        } else {
          Swal.fire({
            title: '❌ Erro ao Gerar PDF',
            text: 'Não foi possível gerar o PDF. Tente novamente.',
            icon: 'error',
            confirmButtonText: 'OK',
            confirmButtonColor: '#dc3545'
          });
        }
      }
    });
  }

  // ===========================================================================
  // VERIFICAÇÕES DE PERMISSÃO
  // ===========================================================================

  isAdministrativo(): boolean {
    const user = this.authService.getCurrentUser();
    return this.authService.isSuperAdmin() || user?.perfil === 'ADMINISTRATIVO';
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
      return 'Prazo não iniciado';
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
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  voltar(): void {
    this.router.navigate(['/gabinete-virtual/operacional/ordens-servico']);
  }

  concluirOS(): void {
    if (!this.ordemServico) return;

    Swal.fire({
      title: '✅ Concluir Ordem de Serviço?',
      html: `
        <div class="text-start">
          <p>Você está prestes a <strong>dar baixa</strong> na OS <strong>${this.ordemServico.numero_os}</strong>.</p>
          <hr>
          <p class="mb-2">
            <strong>Ocorrência:</strong> ${this.ordemServico.ocorrencia.numero_ocorrencia}
          </p>
          <p class="mb-2">
            <strong>Perito:</strong> ${this.ordemServico.perito_destinatario?.nome_completo}
          </p>
          <p class="mb-0">
            <strong>Prazo:</strong> ${this.ordemServico.prazo_dias} dia(s)
          </p>
          <hr>
          <p class="text-warning mb-0">
            <i class="bi bi-exclamation-triangle"></i>
            <strong>Atenção:</strong> Certifique-se de que o laudo foi entregue!
          </p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: '✅ Sim, concluir!',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#28a745',
      cancelButtonColor: '#6c757d',
      width: '600px'
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: '⏳ Concluindo OS...',
          html: 'Aguarde um momento',
          allowOutsideClick: false,
          allowEscapeKey: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        this.ordemServicoService.concluir(this.ordemServico!.id).subscribe({
          next: (response) => {
            Swal.fire({
              title: '✅ OS Concluída!',
              html: `
                <div class="text-start">
                  <p><strong>${response.message}</strong></p>
                  <hr>
                  <p class="text-success mb-0">
                    <i class="bi bi-check-circle"></i>
                    A OS <strong>${this.ordemServico!.numero_os}</strong> foi marcada como <strong>CONCLUÍDA</strong>.
                  </p>
                </div>
              `,
              icon: 'success',
              confirmButtonText: 'OK',
              confirmButtonColor: '#28a745'
            }).then(() => {
              this.carregarOrdemServico(this.ordemServico!.id);
            });
          },
          error: (err) => {
            console.error('Erro ao concluir OS:', err);
            Swal.fire({
              title: '❌ Erro ao Concluir OS',
              text: err.error?.error || 'Não foi possível concluir a ordem de serviço.',
              icon: 'error',
              confirmButtonText: 'OK',
              confirmButtonColor: '#dc3545'
            });
          }
        });
      }
    });
  }
}
