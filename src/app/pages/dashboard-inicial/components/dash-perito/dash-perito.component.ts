// src/app/pages/dashboard-inicial/components/dash-perito/dash-perito.component.ts

import { Component, OnInit, OnDestroy, Input, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { OcorrenciaService } from '../../../../services/ocorrencia.service';
import { OrdemServicoService } from '../../../../services/ordem-servico.service';
import { CustodiaService, VestigioFiltros } from '../../../../services/custodia.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-dash-perito',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './dash-perito.component.html',
  styleUrls: ['../../dashboard-inicial.component.scss']
})
export class DashPeritoComponent implements OnInit, OnDestroy {
  @Input() user: any = null;

  // Variáveis do ecossistema mapeadas pelo HTML original do Git
  estatisticas: any = null;
  estatisticasOS: any = null;

  // Variáveis agregadas do módulo de custódia e DNA (Prevenção de quebras de tipagem)
  sinalizadoresCustodia: any = null;
  totalDnas = 0;
  totalConformes = 0;

  isLoading = true;
  isRefreshing = false;
  ultimaAtualizacao: Date | null = null;

  // Variável exigida pelo template original do perito (loop de ocorrências recentes)
  ultimasOcorrencias: any[] = [];

  private pollingInterval: any = null;

  constructor(
    private ocorrenciaService: OcorrenciaService,
    private ordemServicoService: OrdemServicoService,
    private custodiaService: CustodiaService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.carregarDadosDoPerito();

    // Polling de sincronização automática a cada 60 segundos
    this.pollingInterval = setInterval(() => {
      this.atualizarDadosSilenciosamente();
    }, 60000);
  }

  ngOnDestroy(): void {
    if (this.pollingInterval) clearInterval(this.pollingInterval);
  }

  carregarDadosDoPerito(): void {
    this.isLoading = true;

    // Interface oficial tipada na raiz para evitar problemas com o TypeScript estrito
    const filtroCustodia: VestigioFiltros = {
      page_size: 1,
      conformidade: true
    };

    Promise.all([
      this.ocorrenciaService.getEstatisticas({}).toPromise().catch(() => null),
      this.ordemServicoService.getEstatisticas({}).toPromise().catch(() => null),
      this.custodiaService.getDashboard().toPromise().catch(() => null),
      this.custodiaService.getDnasPaginado({ page_size: 1 }).toPromise().catch(() => null),
      this.custodiaService.getVestigios(filtroCustodia).toPromise().catch(() => null)
    ]).then(([ocorrData, osData, custodiaData, dnas, conformes]) => {

      this.estatisticas = ocorrData || { minhas_ocorrencias: { total: 0, em_analise: 0, finalizadas: 0, taxa_finalizacao: 0, finalizadas_este_mes: 0, atrasadas: 0 }, servico: { total_geral: 0, minha_participacao: 0 }, ultimas_ocorrencias: [] };
      this.estatisticasOS = osData || { minhas_os: { total: 0, abertas: 0, em_andamento: 0, concluidas: 0, vencidas: 0, aguardando_ciencia: 0 } };

      this.ultimasOcorrencias = ocorrData?.ultimas_ocorrencias || [];

      // Alimentação das novas variáveis do barramento de custódia
      this.sinalizadoresCustodia = custodiaData || { total: 0, biologicos: 0 };
      this.totalDnas = dnas?.count || 0;
      this.totalConformes = conformes?.count || 0;

      this.ultimaAtualizacao = new Date();
      this.isLoading = false;
      this.cdr.detectChanges();
    }).catch((err) => {
      console.error('Erro ao processar barramento do Perito:', err);
      this.isLoading = false;
    });
  }

  atualizarDadosSilenciosamente(): void {
    this.isRefreshing = true;

    const filtroCustodia: VestigioFiltros = {
      page_size: 1,
      conformidade: true
    };

    Promise.all([
      this.ocorrenciaService.getEstatisticas({}).toPromise().catch(() => null),
      this.ordemServicoService.getEstatisticas({}).toPromise().catch(() => null),
      this.custodiaService.getDashboard().toPromise().catch(() => null),
      this.custodiaService.getDnasPaginado({ page_size: 1 }).toPromise().catch(() => null),
      this.custodiaService.getVestigios(filtroCustodia).toPromise().catch(() => null)
    ]).then(([ocorrData, osData, custodiaData, dnas, conformes]) => {
      if (ocorrData) {
        this.estatisticas = ocorrData;
        this.ultimasOcorrencias = ocorrData.ultimas_ocorrencias || [];
      }
      if (osData) this.estatisticasOS = osData;
      if (custodiaData) this.sinalizadoresCustodia = custodiaData;
      if (dnas) this.totalDnas = dnas.count;
      if (conformes) this.totalConformes = conformes.count;

      this.ultimaAtualizacao = new Date();
      this.isRefreshing = false;
      this.cdr.detectChanges();
    }).catch(() => {
      this.isRefreshing = false;
    });
  }

  // ─── Métodos Auxiliares de Navegação Exigidos pelo HTML ──────────────────────

  irParaMinhasOcorrencias(): void {
    this.router.navigate(['/gabinete-virtual/operacional/ocorrencias']);
  }

  irParaMinhasOS(): void {
    this.router.navigate(['/gabinete-virtual/operacional/ordens-servico']);
  }

  irParaVestigiosSetor(): void {
    this.router.navigate(['/gabinete-virtual/custodia/vestigios']);
  }

  irParaDnasSetor(): void {
    this.router.navigate(['/gabinete-virtual/custodia/dnas']);
  }

  irParaMinhasOcorrenciasAtrasadas(): void {
    this.router.navigate(['/gabinete-virtual/operacional/ocorrencias'], { queryParams: { atrasada: true } });
  }

  irParaOSVencidas(): void {
    this.router.navigate(['/gabinete-virtual/operacional/ordens-servico'], { queryParams: { vencida: true } });
  }

  irParaOSSemCienciaPerito(): void {
    this.router.navigate(['/gabinete-virtual/operacional/ordens-servico'], { queryParams: { sem_ciencia: true } });
  }

  getTaxaConclusaoOSPerito(): number {
    const os = this.estatisticasOS?.minhas_os;
    return os?.total ? Math.round((os.concluidas / os.total) * 100) : 0;
  }

  // Métodos Utilitários Globais
  calcularPorcentagem(valor: number, total: number): number {
    return total ? Math.round((valor / total) * 100) : 0;
  }

  getFirstName(fullName?: string): string {
    return fullName ? fullName.split(' ')[0] : 'Perito';
  }

  getUltimaAtualizacaoLabel(): string {
    return this.ultimaAtualizacao ? this.ultimaAtualizacao.toLocaleTimeString() : '';
  }
}
