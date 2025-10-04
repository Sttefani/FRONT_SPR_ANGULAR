import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OcorrenciaService, Ocorrencia } from '../../services/ocorrencia.service';
import { AuthService } from '../../services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-ocorrencias-detalhes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ocorrencias-detalhes.component.html',
  styleUrls: ['./ocorrencias-detalhes.component.scss']
})
export class OcorrenciasDetalhesComponent implements OnInit {
  ocorrencia: Ocorrencia | null = null;
  ocorrenciaId: number | null = null;
  isLoading = true;
  message = '';
  messageType: 'success' | 'error' = 'success';

  isSuperAdmin = false;
  isAdministrativo = false;
  isPerito = false;
  isOperacional = false;
  currentUserId: number | null = null;

  constructor(
    private ocorrenciaService: OcorrenciaService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.currentUserId = user?.id || null;
    this.isSuperAdmin = this.authService.isSuperAdmin();
    this.isAdministrativo = user?.perfil === 'ADMINISTRATIVO';
    this.isPerito = user?.perfil === 'PERITO';
    this.isOperacional = user?.perfil === 'OPERACIONAL';

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.ocorrenciaId = Number(id);
      this.loadOcorrencia(this.ocorrenciaId);
    }
  }

  loadOcorrencia(id: number): void {
    this.isLoading = true;
    this.ocorrenciaService.getById(id).subscribe({
      next: (data) => {
        this.ocorrencia = data;
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Erro ao carregar ocorrência:', err);
        this.message = 'Erro ao carregar dados da ocorrência.';
        this.messageType = 'error';
        this.isLoading = false;
      }
    });
  }

 onEditar(): void {
  if (!this.ocorrencia || !this.ocorrenciaId) return;

  const jaFinalizada = this.ocorrencia.esta_finalizada === true ||
                       !!this.ocorrencia.finalizada_por ||
                       !!this.ocorrencia.data_finalizacao;

  // Verifica se está finalizada
  if (jaFinalizada) {
    Swal.fire({
      title: 'Ocorrência Finalizada',
      html: `
        <p>A ocorrência <strong>${this.ocorrencia.numero_ocorrencia}</strong> está finalizada e não pode ser editada.</p>
        <p>Deseja reabrir esta ocorrência para edição?</p>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, reabrir',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.onReabrir();
      }
    });
    return;
  }

  // Verifica se administrativo está tentando editar ocorrência com perito atribuído
  if (this.isAdministrativo && this.ocorrencia.perito_atribuido) {
    Swal.fire({
      title: 'Acesso Negado',
      text: 'Esta ocorrência está atribuída a um perito. Somente o perito responsável pode editá-la.',
      icon: 'error',
      confirmButtonText: 'Ok'
    });
    return;
  }

  // Navega para edição
  this.router.navigate(['/gabinete-virtual/operacional/ocorrencias', this.ocorrenciaId, 'editar']);
}
  onVoltar(): void {
    this.router.navigate(['/gabinete-virtual/operacional/ocorrencias']);
  }

  onFinalizar(): void {
  console.log('🚀 onFinalizar INICIOU');
  console.log('📊 Dados da ocorrência:', {
    id: this.ocorrencia?.id,
    numero: this.ocorrencia?.numero_ocorrencia,
    esta_finalizada: this.ocorrencia?.esta_finalizada,
    finalizada_por: this.ocorrencia?.finalizada_por?.nome_completo,
    data_finalizacao: this.ocorrencia?.data_finalizacao
  });

  if (!this.ocorrencia) return;

  // VERIFICAR SE JÁ ESTÁ FINALIZADA (múltiplas formas)
  const jaFinalizada = this.ocorrencia.esta_finalizada === true ||
                       !!this.ocorrencia.finalizada_por ||
                       !!this.ocorrencia.data_finalizacao;

  if (jaFinalizada) {
    console.log('⚠️ OCORRÊNCIA JÁ FINALIZADA - mostrando aviso SEM pedir senha');
    Swal.fire({
      title: 'Ocorrência já finalizada',
      html: `
        <p>A ocorrência <strong>${this.ocorrencia!.numero_ocorrencia}</strong> já foi finalizada.</p>
        <p>Finalizada por: <strong>${this.ocorrencia!.finalizada_por?.nome_completo || 'N/D'}</strong></p>
        <p>Data: ${this.ocorrencia!.data_finalizacao ? new Date(this.ocorrencia!.data_finalizacao).toLocaleString('pt-BR') : 'N/D'}</p>
      `,
      icon: 'info',
      confirmButtonText: 'Entendi'
    });
    return;
  }

  // SE NÃO ESTÁ FINALIZADA, PEDE SENHA
  Swal.fire({
    title: 'Finalizar Ocorrência',
    html: `
      <p>Confirme sua senha para finalizar a ocorrência <strong>${this.ocorrencia!.numero_ocorrencia}</strong></p>
      <input type="password" id="senha-finalizacao" class="swal2-input" placeholder="Digite sua senha">
    `,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Finalizar',
    cancelButtonText: 'Cancelar',
    preConfirm: () => {
      const senha = (document.getElementById('senha-finalizacao') as HTMLInputElement).value;
      if (!senha) {
        Swal.showValidationMessage('A senha é obrigatória');
        return false;
      }
      return senha;
    }
  }).then((result) => {
    if (result.isConfirmed && result.value) {
      this.ocorrenciaService.finalizar(this.ocorrencia!.id, result.value).subscribe({
        next: () => {
          Swal.fire('Sucesso!', 'Ocorrência finalizada com assinatura digital.', 'success');
          this.loadOcorrencia(this.ocorrencia!.id);
        },
        error: (err: any) => {
          console.error('Erro ao finalizar:', err);
          const errorMsg = err.error?.password?.[0] || err.error?.error || 'Erro ao finalizar ocorrência.';
          Swal.fire('Erro', errorMsg, 'error');
        }
      });
    }
  });
}
  onReabrir(): void {
  if (!this.ocorrencia) return;

  // VERIFICAR SE JÁ FOI REABERTA
  if (this.ocorrencia.reaberta_por) {
    Swal.fire({
      title: 'Ocorrência já reaberta',
      html: `
        <p>Esta ocorrência já foi reaberta anteriormente.</p>
        <p>Reaberta por: <strong>${this.ocorrencia.reaberta_por.nome_completo}</strong></p>
        <p>Data: ${new Date(this.ocorrencia.data_reabertura!).toLocaleString('pt-BR')}</p>
        <p>Motivo: ${this.ocorrencia.motivo_reabertura}</p>
      `,
      icon: 'info',
      confirmButtonText: 'Entendi'
    });
    return;
  }

  const jaFinalizada = this.ocorrencia.esta_finalizada === true ||
                       !!this.ocorrencia.finalizada_por ||
                       !!this.ocorrencia.data_finalizacao;

  if (!jaFinalizada) {
    Swal.fire({
      title: 'Ocorrência não finalizada',
      text: 'Esta ocorrência não está finalizada.',
      icon: 'info',
      confirmButtonText: 'Entendi'
    });
    return;
  }

  Swal.fire({
    title: 'Reabrir Ocorrência',
    html: `
      <p>Confirme sua senha e informe o motivo para reabrir <strong>${this.ocorrencia.numero_ocorrencia}</strong></p>
      <input type="password" id="senha-reabertura" class="swal2-input" placeholder="Digite sua senha">
      <textarea id="motivo-reabertura" class="swal2-textarea" placeholder="Motivo da reabertura"></textarea>
    `,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Reabrir',
    cancelButtonText: 'Cancelar',
    preConfirm: () => {
      const senha = (document.getElementById('senha-reabertura') as HTMLInputElement).value;
      const motivo = (document.getElementById('motivo-reabertura') as HTMLTextAreaElement).value;

      if (!senha || !motivo) {
        Swal.showValidationMessage('Senha e motivo são obrigatórios');
        return false;
      }
      return { senha, motivo };
    }
  }).then((result) => {
    if (result.isConfirmed && result.value) {
      this.ocorrenciaService.reabrir(this.ocorrencia!.id, result.value.senha, result.value.motivo).subscribe({
        next: () => {
          Swal.fire('Sucesso!', 'Ocorrência reaberta com sucesso.', 'success');
          this.loadOcorrencia(this.ocorrencia!.id);
        },
        error: (err: any) => {
          console.error('Erro ao reabrir:', err);
          const errorMsg = err.error?.password?.[0] || err.error?.error || 'Erro ao reabrir ocorrência.';
          Swal.fire('Erro', errorMsg, 'error');
        }
      });
    }
  });
}
  onImprimirPDF(): void {
    if (!this.ocorrencia) return;

    this.ocorrenciaService.imprimirPDF(this.ocorrencia.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Ocorrencia_${this.ocorrencia!.numero_ocorrencia}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err: any) => {
        console.error('Erro ao gerar PDF:', err);
        Swal.fire('Erro', 'Erro ao gerar PDF da ocorrência.', 'error');
      }
    });
  }

podeEditar(): boolean {
  if (!this.ocorrencia) return false;

  // SE FOI REABERTA, pode editar (reseta a finalização)
  if (this.ocorrencia.reaberta_por) {
    if (this.isSuperAdmin) return true;

    if (this.ocorrencia.perito_atribuido) {
      const user = this.authService.getCurrentUser();
      return user?.id === this.ocorrencia.perito_atribuido.id;
    }

    return this.isPerito || this.isOperacional;
  }

  // SE NÃO FOI REABERTA, verifica se está finalizada
  const jaFinalizada = this.ocorrencia.esta_finalizada === true ||
                       !!this.ocorrencia.finalizada_por ||
                       !!this.ocorrencia.data_finalizacao;

  if (jaFinalizada) {
    return false;
  }

  if (this.isSuperAdmin) return true;

  if (this.ocorrencia.perito_atribuido) {
    const user = this.authService.getCurrentUser();
    return user?.id === this.ocorrencia.perito_atribuido.id;
  }

  return this.isPerito || this.isOperacional;
}


podeFinalizar(): boolean {
  if (!this.ocorrencia) return false;

  // SE FOI REABERTA, PODE FINALIZAR DE NOVO
  if (this.ocorrencia.reaberta_por) {
    return this.isAdministrativo || this.isSuperAdmin;
  }

  // SE NÃO FOI REABERTA, verifica se já está finalizada
  const jaFinalizada = this.ocorrencia.esta_finalizada === true ||
                       !!this.ocorrencia.finalizada_por ||
                       !!this.ocorrencia.data_finalizacao;

  return !jaFinalizada && (this.isAdministrativo || this.isSuperAdmin);
}

  podeReabrir(): boolean {
  if (!this.ocorrencia) return false;

  // SE FOI REABERTA, NÃO PODE REABRIR DE NOVO
  if (this.ocorrencia.reaberta_por) {
    return false;
  }

  // SÓ PODE REABRIR SE ESTIVER FINALIZADA
  const jaFinalizada = this.ocorrencia.esta_finalizada === true ||
                       !!this.ocorrencia.finalizada_por ||
                       !!this.ocorrencia.data_finalizacao;

  return jaFinalizada && this.isSuperAdmin;
}
  getStatusLabel(status: string): string {
    const labels: any = {
      'AGUARDANDO_PERITO': 'Aguardando Atribuição de Perito',
      'EM_ANALISE': 'Em Análise',
      'FINALIZADA': 'Finalizada'
    };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    const classes: any = {
      'AGUARDANDO_PERITO': 'status-aguardando',
      'EM_ANALISE': 'status-analise',
      'FINALIZADA': 'status-finalizada'
    };
    return classes[status] || '';
  }
}
