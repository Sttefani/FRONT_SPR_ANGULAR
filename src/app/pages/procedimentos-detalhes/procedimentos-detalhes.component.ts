import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';

import { ProcedimentoCadastradoService } from '../../services/procedimento-cadastrado.service';
import { CustodiaService } from '../../services/custodia.service';
import { StatusFormatPipe } from '../../shared/pipes/status-format.pipe';
import { AuthService } from '../../services/auth.service';
import { TeiaRelacoesComponent } from '../teia-relacoes/teia-relacoes.component';

@Component({
  selector: 'app-procedimentos-detalhes',
  standalone: true,
  imports: [CommonModule, StatusFormatPipe, TeiaRelacoesComponent],
  templateUrl: './procedimentos-detalhes.component.html',
  styleUrls: ['./procedimentos-detalhes.component.scss']
})
export class ProcedimentosDetalhesComponent implements OnInit {
  procedimento: any = null;
  ocorrencias: any[] = [];
  totalOcorrencias = 0;
  vestigios: any[] = [];
  totalVestigios = 0;
  procedimentoId: number | null = null;
  showTeia = false;
  podeVerTeia = false;
  isCustodiante = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private procedimentoCadastradoService: ProcedimentoCadastradoService,
    private custodiaService: CustodiaService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    const _PERFIS_TEIA = ['PERITO','OPERACIONAL','ADMINISTRATIVO','SUPER_ADMIN'];
    this.podeVerTeia = _PERFIS_TEIA.includes(user?.perfil) || !!user?.is_superuser;
    this.isCustodiante = user?.perfil !== 'EXTERNO';

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.procedimentoId = Number(id);
      this.loadDetalhes();
    }
  }

  loadDetalhes(): void {
    this.procedimentoCadastradoService.getOcorrenciasVinculadas(this.procedimentoId!).subscribe({
      next: (data) => {
        this.procedimento   = data.procedimento;
        this.ocorrencias    = data.ocorrencias;
        this.totalOcorrencias = data.total_ocorrencias;
        this.vestigios      = data.vestigios ?? [];
        this.totalVestigios = data.total_vestigios ?? 0;
      },
      error: (err: any) => console.error('Erro:', err)
    });
  }

  verOcorrencia(id: number): void {
    this.router.navigate(['/gabinete-virtual/operacional/ocorrencias', id]);
  }

  verVestigio(id: number): void {
    this.router.navigate(['/gabinete-virtual/custodia/vestigios', id]);
  }

  desvincularVestigio(vest: any): void {
    Swal.fire({
      title: 'Desvincular vestígio?',
      html: `Remover o vínculo do vestígio <strong>${vest.lacre || '#' + vest.id}</strong> com este procedimento?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, desvincular',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
    }).then(r => {
      if (!r.isConfirmed) return;
      this.custodiaService.vincularProcedimentoAoVestigio(vest.id, this.procedimentoId!, 'remove').subscribe({
        next: () => this.loadDetalhes(),
        error: (err) => Swal.fire('Erro', err?.error?.detail || 'Não foi possível desvincular.', 'error'),
      });
    });
  }

  voltar(): void {
    this.location.back();
  }

  getStatusClass(status: string): string {
    const classes: any = {
      'AGUARDANDO_PERITO': 'status-aguardando',
      'EM_ANALISE':        'status-analise',
      'FINALIZADA':        'status-finalizada'
    };
    return classes[status] || '';
  }

  badgeStatusVest(status: string): string {
    return { INICIAL: 'badge-vest-inicial', ANDAMENTO: 'badge-vest-andamento', FINALIZADO: 'badge-vest-finalizado' }[status] ?? '';
  }
}
