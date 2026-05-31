// src/app/pages/dashboard-inicial/components/dash-operacional/dash-operacional.component.ts

import { Component, OnInit, OnDestroy, Input, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { OcorrenciaService } from '../../../../services/ocorrencia.service';
import { OrdemServicoService } from '../../../../services/ordem-servico.service';
import { CustodiaService } from '../../../../services/custodia.service';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-dash-operacional',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './dash-operacional.component.html',
  styleUrls: ['../../dashboard-inicial.component.scss'] // Partilha os estilos base do painel
})
export class DashOperacionalComponent implements OnInit, OnDestroy {
  @Input() user: any = null;

  estatisticas: any = null;
  estatisticasOS: any = null;
  sinalizadoresCustodia: any = null;
  totalDnas = 0;
  totalConformes = 0;

  isLoading = true;
  isRefreshing = false;
  ultimaAtualizacao: Date | null = null;

  servicosDisponiveis: any[] = [];
  servicoSelecionado: number | null = null;

  private chartOcorrenciasDonut: Chart | null = null;
  private chartOSDonut: Chart | null = null;
  private pollingInterval: any = null;

  constructor(
    private ocorrenciaService: OcorrenciaService,
    private ordemServicoService: OrdemServicoService,
    private custodiaService: CustodiaService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    // Carrega estritamente os setores/serviços que vieram da lotação do utilizador
    this.servicosDisponiveis = this.user?.servicos_periciais || [];
    this.carregarDadosDoSetor();

    // Atualização em tempo real a cada 60 segundos
    this.pollingInterval = setInterval(() => {
      this.atualizarDadosSilenciosamente();
    }, 60000);
  }

  ngOnDestroy(): void {
    if (this.pollingInterval) clearInterval(this.pollingInterval);
    this.destruirGraficos();
  }

  carregarDadosDoSetor(): void {
    this.isLoading = true;
    const params: any = {};
    if (this.servicoSelecionado) params.servico_id = this.servicoSelecionado;
    const filtroCustodia: any = this.servicoSelecionado ? { servico_pericial: this.servicoSelecionado } : {};

    Promise.all([
      this.ocorrenciaService.getEstatisticas(params).toPromise(),
      this.ordemServicoService.getEstatisticas(params).toPromise(),
      this.custodiaService.getDashboard().toPromise(),
      this.custodiaService.getDnasPaginado({ page_size: 1 }).toPromise(),
      this.custodiaService.getVestigios({ ...filtroCustodia, conformidade: true, page_size: 1 }).toPromise()
    ]).then(([ocorrData, osData, custodiaData, dnas, conformes]) => {
      this.estatisticas = ocorrData;
      this.estatisticasOS = osData;
      this.sinalizadoresCustodia = custodiaData;
      this.totalDnas = dnas?.count || 0;
      this.totalConformes = conformes?.count || 0;

      this.ultimaAtualizacao = new Date();
      this.isLoading = false;

      this.cdr.detectChanges();
      this.renderizarGraficosOtimizados();
    }).catch((err) => {
      console.error('Erro ao processar balanço do setor operacional:', err);
      this.isLoading = false;
    });
  }

  atualizarDadosSilenciosamente(): void {
    this.isRefreshing = true;
    const params: any = {};
    if (this.servicoSelecionado) params.servico_id = this.servicoSelecionado;
    const filtroCustodia: any = this.servicoSelecionado ? { servico_pericial: this.servicoSelecionado } : {};

    Promise.all([
      this.ocorrenciaService.getEstatisticas(params).toPromise(),
      this.ordemServicoService.getEstatisticas(params).toPromise(),
      this.custodiaService.getDashboard().toPromise(),
      this.custodiaService.getDnasPaginado({ page_size: 1 }).toPromise(),
      this.custodiaService.getVestigios({ ...filtroCustodia, conformidade: true, page_size: 1 }).toPromise()
    ]).then(([ocorrData, osData, custodiaData, dnas, conformes]) => {
      this.estatisticas = ocorrData;
      this.estatisticasOS = osData;
      this.sinalizadoresCustodia = custodiaData;
      this.totalDnas = dnas?.count || 0;
      this.totalConformes = conformes?.count || 0;

      this.ultimaAtualizacao = new Date();
      this.isRefreshing = false;

      this.cdr.detectChanges();
      this.renderizarGraficosOtimizados();
    }).catch(() => {
      this.isRefreshing = false;
    });
  }

  onServicoChange(): void {
    this.destruirGraficos();
    this.carregarDadosDoSetor();
  }

  private destruirGraficos(): void {
    if (this.chartOcorrenciasDonut) this.chartOcorrenciasDonut.destroy();
    if (this.chartOSDonut) this.chartOSDonut.destroy();
  }

  private renderizarGraficosOtimizados(): void {
    this.destruirGraficos();
    this.criarChartOcorrenciasDonut();
    this.criarChartOSDonut();
  }

  private criarChartOcorrenciasDonut(): void {
    const canvas = document.getElementById('chartOcorrenciasDonutOperacional') as HTMLCanvasElement;
    if (!canvas || !this.estatisticas?.geral) return;
    const g = this.estatisticas.geral;

    this.chartOcorrenciasDonut = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['Aguardando', 'Em Análise', 'Laudo Entregue', 'Finalizadas'],
        datasets: [{
          data: [g.aguardando || 0, g.em_analise || 0, g.laudo_entregue || 0, g.finalizadas || 0],
          backgroundColor: ['#2b6cb0', '#ff9800', '#4a5568', '#28a745'],
          borderColor: '#fff',
          borderWidth: 2
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, cutout: '70%' }
    });
  }

  private criarChartOSDonut(): void {
    const canvas = document.getElementById('chartOSDonutOperacional') as HTMLCanvasElement;
    if (!canvas || !this.estatisticasOS?.geral_os) return;
    const os = this.estatisticasOS.geral_os;

    this.chartOSDonut = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['Ag. Ciência', 'Em Andamento', 'Concluídas'],
        datasets: [{
          data: [os.aguardando_ciencia || 0, os.em_andamento || 0, os.concluidas || 0],
          backgroundColor: ['#e53e3e', '#ff9800', '#28a745'],
          borderColor: '#fff',
          borderWidth: 2
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, cutout: '70%' }
    });
  }

  irParaOSVencidas(): void { this.router.navigate(['/gabinete-virtual/operacional/ordens-servico'], { queryParams: { vencida: true } }); }
  irParaOSSemCiencia(): void { this.router.navigate(['/gabinete-virtual/operacional/ordens-servico'], { queryParams: { sem_ciencia: true } }); }
  irParaOcorrenciasSemPerito(): void { this.router.navigate(['/gabinete-virtual/operacional/ocorrencias'], { queryParams: { sem_perito: true } }); }
  irParaVestigiosGeral(): void { this.router.navigate(['/gabinete-virtual/custodia/vestigios']); }
  irParaDnasGeral(): void { this.router.navigate(['/gabinete-virtual/custodia/dnas']); }

  getFirstName(fullName?: string): string { return fullName ? fullName.split(' ')[0] : 'Supervisor'; }
  getUltimaAtualizacaoLabel(): string { return this.ultimaAtualizacao ? this.ultimaAtualizacao.toLocaleTimeString() : ''; }
  calcularPorcentagem(valor: number, total: number): number { return total ? Math.round((valor / total) * 100) : 0; }
}
