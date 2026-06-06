import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import Swal from 'sweetalert2';

import { ProtocoloService, ProtocoloDetalhe } from '../../services/protocolo.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-protocolo-detalhes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './protocolo-detalhes.component.html',
  styleUrls: ['./protocolo-detalhes.component.scss'],
})
export class ProtocoloDetalhesComponent implements OnInit {

  protocolo: ProtocoloDetalhe | null = null;
  isLoading = true;
  baixandoPdf = false;
  assinando = false;
  confirmando = false;

  podeEmitir = false;   // CUSTODIANTE + ADMINISTRATIVO + SUPER_ADMIN
  userEmail = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private protocoloService: ProtocoloService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.userEmail = user?.email || '';
    this.podeEmitir = ['CUSTODIANTE', 'ADMINISTRATIVO', 'SUPER_ADMIN'].includes(user?.perfil || '');

    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.carregarProtocolo(id);
  }

  carregarProtocolo(id: number): void {
    this.isLoading = true;
    this.protocoloService.getProtocolo(id).subscribe({
      next: (p) => { this.protocolo = p; this.isLoading = false; },
      error: () => {
        this.isLoading = false;
        Swal.fire('Erro', 'Protocolo não encontrado.', 'error')
          .then(() => this.router.navigate(['/gabinete-virtual/custodia/protocolos']));
      },
    });
  }

  // ── PDF ───────────────────────────────────────────────────────────────────

  baixarPdf(): void {
    if (!this.protocolo) return;
    this.baixandoPdf = true;
    this.protocoloService.getProtocoloPdf(this.protocolo.id).subscribe({
      next: (blob) => {
        this.baixandoPdf = false;
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      },
      error: () => {
        this.baixandoPdf = false;
        Swal.fire('Erro', 'Não foi possível gerar o PDF.', 'error');
      },
    });
  }

  // ── Assinatura eletrônica ─────────────────────────────────────────────────

  async assinarEletronicamente(): Promise<void> {
    if (!this.protocolo) return;

    const result = await Swal.fire({
      title: 'Assinar Eletronicamente',
      html: `
        <p style="margin-bottom:.8rem;font-size:.9rem">
          Confirme sua identidade para registrar o recebimento do protocolo
          <strong>${this.protocolo.numero}</strong>.
        </p>
        <input id="swal-email" class="swal2-input" value="${this.userEmail}" readonly
          style="background:#f8fafc;font-size:.85rem">
        <input id="swal-senha" type="password" class="swal2-input"
          placeholder="Sua senha" style="font-size:.85rem">
      `,
      confirmButtonText: 'Assinar',
      cancelButtonText: 'Cancelar',
      showCancelButton: true,
      confirmButtonColor: '#14532d',
      preConfirm: () => {
        const senha = (document.getElementById('swal-senha') as HTMLInputElement)?.value;
        if (!senha) { Swal.showValidationMessage('A senha é obrigatória.'); return false; }
        return senha;
      },
    });

    if (!result.isConfirmed || !result.value) return;

    this.assinando = true;
    this.protocoloService.assinarProtocolo(this.protocolo.id, this.userEmail, result.value).subscribe({
      next: (p) => {
        this.assinando = false;
        this.protocolo = p;
        Swal.fire({ icon: 'success', title: 'Recebimento confirmado!', timer: 2000, showConfirmButton: false });
      },
      error: (err) => {
        this.assinando = false;
        const msg = err.error?.assinatura_senha || err.error?.detail || 'Senha incorreta.';
        Swal.fire('Erro', msg, 'error');
      },
    });
  }

  // ── Confirmar assinatura manual ───────────────────────────────────────────

  async confirmarManual(): Promise<void> {
    if (!this.protocolo) return;

    const result = await Swal.fire({
      title: 'Confirmar Assinatura Manual',
      text: `Confirma que o recebedor ${this.protocolo.recebido_por_nome} assinou o documento impresso?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sim, confirmar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0891b2',
    });

    if (!result.isConfirmed) return;

    this.confirmando = true;
    this.protocoloService.confirmarManual(this.protocolo.id).subscribe({
      next: (p) => {
        this.confirmando = false;
        this.protocolo = p;
        Swal.fire({ icon: 'success', title: 'Assinatura manual confirmada!', timer: 2000, showConfirmButton: false });
      },
      error: () => {
        this.confirmando = false;
        Swal.fire('Erro', 'Não foi possível confirmar o recebimento.', 'error');
      },
    });
  }

  // ── Navegação ─────────────────────────────────────────────────────────────

  irParaVestigio(): void {
    if (this.protocolo) {
      this.router.navigate(['/gabinete-virtual/custodia/vestigios', this.protocolo.vestigio.id]);
    }
  }

  irParaOcorrencia(): void {
    if (this.protocolo) {
      this.router.navigate(['/gabinete-virtual/operacional/ocorrencias', this.protocolo.ocorrencia.id]);
    }
  }

  voltar(): void { this.location.back(); }

  // ── Helpers ───────────────────────────────────────────────────────────────

  get statusClass(): string {
    switch (this.protocolo?.status_recebimento) {
      case 'ASSINADO_ELETRONICAMENTE': return 'status--assinado-eletronico';
      case 'ASSINADO_MANUAL':         return 'status--assinado-manual';
      default:                        return 'status--pendente';
    }
  }

  get statusLabel(): string {
    switch (this.protocolo?.status_recebimento) {
      case 'ASSINADO_ELETRONICAMENTE': return '✔ Assinado Eletronicamente';
      case 'ASSINADO_MANUAL':         return '✔ Assinado Manualmente';
      default:                        return '⏳ Pendente de Recebimento';
    }
  }

  get isPendente(): boolean {
    return this.protocolo?.status_recebimento === 'PENDENTE';
  }

  perfilLabel(perfil: string): string {
    const map: Record<string, string> = {
      CUSTODIANTE: 'Custodiante', ADMINISTRATIVO: 'Administrativo',
      SUPER_ADMIN: 'Super Admin', PERITO: 'Perito Criminal',
      OPERACIONAL: 'Operacional', EXTERNO: 'Usuário Externo',
    };
    return map[perfil] || perfil;
  }
}
