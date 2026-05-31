import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';

import { CustodiaService } from '../../services/custodia.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-custodia-dna-detalhes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './custodia-dna-detalhes.component.html',
  styleUrls: ['./custodia-dna-detalhes.component.scss']
})
export class CustodiaDnaDetalhesComponent implements OnInit {

  dna: any = null;
  isLoading = true;
  message = '';
  messageType: 'success' | 'error' = 'success';

  isExterno = false;
  podeEditar = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private custodiaService: CustodiaService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.isExterno  = user?.perfil === 'EXTERNO';
    this.podeEditar = !this.isExterno;

    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.carregarDna(id);
  }

  carregarDna(id: number): void {
    this.isLoading = true;
    this.custodiaService.getDna(id).subscribe({
      next: (d) => { this.dna = d; this.isLoading = false; },
      error: () => {
        this.message = 'Erro ao carregar registro de DNA.';
        this.messageType = 'error';
        this.isLoading = false;
      }
    });
  }

  editar(): void {
    if (this.dna) this.router.navigate(['/gabinete-virtual/custodia/dna', this.dna.id, 'editar']);
  }

  imprimirFicha(): void {
    if (!this.dna) return;
    this.custodiaService.getFichaDnaPdf(this.dna.id).subscribe({
      next: (blob) => {
        const blobUrl = URL.createObjectURL(blob);
        const aba = window.open(blobUrl, '_blank');
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
        if (!aba) {
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = `ficha_dna_${this.dna.id}.pdf`;
          link.click();
        }
      },
      error: () => {
        this.message = 'Erro ao gerar ficha PDF.';
        this.messageType = 'error';
      }
    });
  }

  irParaVestigio(): void {
    if (this.dna?.vestigio?.id) {
      this.router.navigate(['/gabinete-virtual/custodia/vestigios', this.dna.vestigio.id]);
    }
  }

  voltar(): void {
    this.router.navigate(['/gabinete-virtual/custodia/dnas']);
  }

  simNao(v: string): string {
    return v === 'YES' ? 'Sim' : 'Não';
  }

  badgeSituacao(s: string): string {
    return s === 'APENADO' ? 'badge-apenado' : 'badge-nao-apenado';
  }
}
