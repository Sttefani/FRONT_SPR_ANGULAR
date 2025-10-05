import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ProcedimentoCadastradoService } from '../../services/procedimento-cadastrado.service';
import { StatusFormatPipe } from '../../shared/pipes/status-format.pipe';

@Component({
  selector: 'app-procedimentos-detalhes',
  standalone: true,
  imports: [CommonModule, StatusFormatPipe],
  templateUrl: './procedimentos-detalhes.component.html',
  styleUrls: ['./procedimentos-detalhes.component.scss']
})
export class ProcedimentosDetalhesComponent implements OnInit {
  procedimento: any = null;
  ocorrencias: any[] = [];
  totalOcorrencias = 0;
  procedimentoId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private procedimentoCadastradoService: ProcedimentoCadastradoService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.procedimentoId = Number(id);
      this.loadDetalhes();
    }
  }

  loadDetalhes(): void {
    this.procedimentoCadastradoService.getOcorrenciasVinculadas(this.procedimentoId!).subscribe({
      next: (data) => {
        this.procedimento = data.procedimento;
        this.ocorrencias = data.ocorrencias;
        this.totalOcorrencias = data.total_ocorrencias;
      },
      error: (err: any) => console.error('Erro:', err) // ← Tipado como any
    });
  }

  verOcorrencia(id: number): void {
    this.router.navigate(['/gabinete-virtual/operacional/ocorrencias', id]);
  }

  voltar(): void {
    this.router.navigate(['/gabinete-virtual/cadastros/procedimentos-cadastrados']);
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
