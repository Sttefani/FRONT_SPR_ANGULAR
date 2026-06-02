import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';

import { CustodiaService, VestigioMovimentacao } from '../../services/custodia.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-custodia-movimentacao-detalhes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './custodia-movimentacao-detalhes.component.html',
  styleUrls: ['./custodia-movimentacao-detalhes.component.scss'],
})
export class CustodiaMovimentacaoDetalhesComponent implements OnInit {

  mov: VestigioMovimentacao | null = null;
  isLoading = true;
  aceitando = false;

  // Perfil
  isCustodiante = false;  // pode realizar operações de custódia (não-EXTERNO)
  isExterno = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private custodiaService: CustodiaService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.isExterno    = user?.perfil === 'EXTERNO';
    this.isCustodiante = !this.isExterno;

    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.custodiaService.getMovimentacaoById(id).subscribe({
      next: (mov) => {
        this.mov = mov;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        Swal.fire('Erro', 'Movimentação não encontrada ou sem permissão de acesso.', 'error')
          .then(() => this.router.navigate(['/gabinete-virtual/custodia/vestigios']));
      },
    });
  }

  verVestigio(): void {
    if (this.mov) {
      this.router.navigate(['/gabinete-virtual/custodia/vestigios', this.mov.vestigio]);
    }
  }

  voltar(): void {
    if (this.mov) {
      this.router.navigate(['/gabinete-virtual/custodia/vestigios', this.mov.vestigio]);
    } else {
      this.router.navigate(['/gabinete-virtual/custodia/vestigios']);
    }
  }

  aceitar(): void {
    if (!this.mov) return;

    Swal.fire({
      title: 'Confirmar recebimento',
      html: `
        <p>Confirma que você recebeu a custódia do vestígio com lacre
           <strong>${this.mov.lacre || '—'}</strong>?</p>
        <p style="font-size:.85rem;color:#64748b;margin-top:.5rem">
          Ao confirmar, você passa a ser o responsável registrado pela guarda deste vestígio.
        </p>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sim, confirmar recebimento',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#166534',
    }).then(result => {
      if (!result.isConfirmed || !this.mov) return;

      this.aceitando = true;
      this.custodiaService.aceitarMovimentacao(this.mov.id).subscribe({
        next: (atualizada) => {
          this.aceitando = false;
          this.mov = atualizada;
          Swal.fire({
            title: 'Recebimento confirmado',
            text: 'Você é agora o responsável registrado pela custódia.',
            icon: 'success',
            timer: 2200,
            showConfirmButton: false,
          });
        },
        error: (err) => {
          this.aceitando = false;
          const msg = err?.error?.detail || 'Não foi possível confirmar o recebimento.';
          Swal.fire('Erro', msg, 'error');
        },
      });
    });
  }
}
