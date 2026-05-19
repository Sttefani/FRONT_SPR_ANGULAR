// src/app/pages/dashboard-inicial/dashboard-inicial.component.ts

import { Component, OnInit, AfterViewInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { OcorrenciaService } from '../../services/ocorrencia.service';
import { OrdemServicoService } from '../../services/ordem-servico.service';
import { ServicoPericialService } from '../../services/servico-pericial.service';
import { Chart, registerables, ChartConfiguration } from 'chart.js';

Chart.register(...registerables);

// Plugin inline: exibe o valor em cima de cada barra (apenas bar charts)
const barValuePlugin = {
  id: 'barValueLabels',
  afterDatasetsDraw(chart: Chart) {
    if ((chart.config as any).type !== 'bar') return; // ignora donut/doughnut
    const ctx = chart.ctx;
    chart.data.datasets.forEach((_dataset, i) => {
      const meta = chart.getDatasetMeta(i);
      meta.data.forEach((bar: any, index: number) => {
        const value = chart.data.datasets[i].data[index] as number;
        if (!value || value === 0) return;
        ctx.save();
        ctx.font = 'bold 11px Roboto, Segoe UI, sans-serif';
        ctx.fillStyle = '#4a5568';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        const label = value >= 1_000_000 ? (value / 1_000_000).toFixed(1).replace('.0', '') + 'M'
          : value >= 1_000 ? (value / 1_000).toFixed(1).replace('.0', '') + 'k'
            : String(value);
        ctx.fillText(label, bar.x, bar.y - 2);
        ctx.restore();
      });
    });
  }
};
Chart.register(barValuePlugin);

@Component({
  selector: 'app-dashboard-inicial',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DatePipe],
  templateUrl: './dashboard-inicial.component.html',
  styleUrls: ['./dashboard-inicial.component.scss']
})
export class DashboardInicialComponent implements OnInit, AfterViewInit, OnDestroy {
  currentUser: any = null;
  estatisticas: any = null;
  estatisticasOS: any = null;
  relatoriosGerenciais: any = null;
  isLoading = true;
  isLoadingRelatorios = false;
  servicosDisponiveis: any[] = [];
  servicoSelecionado: number | null = null;

  // Gráficos perito
  private chartOcorrenciasPerito: Chart | null = null;
  private chartOSPerito: Chart | null = null;

  // Gráficos admin
  private chartOcorrenciasDonutAdmin: Chart | null = null;
  private chartEvolucaoAdmin: Chart | null = null;
  private chartOSDonutAdmin: Chart | null = null;
  private chartOcorrenciasEvolucaoAdmin: Chart | null = null;

  // Auto-refresh (bolsa de valores)
  private refreshInterval: any = null;
  isRefreshing = false;
  ultimaAtualizacao: Date | null = null;
  private snapshotAnterior: { estat: any; os: any } | null = null;

  constructor(
    private authService: AuthService,
    private ocorrenciaService: OcorrenciaService,
    private ordemServicoService: OrdemServicoService,
    private servicoPericialService: ServicoPericialService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadServicos();
    this.loadEstatisticas();
    this.loadEstatisticasOS();

    if (this.isAdminOrOperacional()) {
      this.loadRelatoriosGerenciais();
      this.iniciarAutoRefresh();
    }
  }

  ngAfterViewInit(): void { }

  ngOnDestroy(): void {
    this.destruirTodosGraficos();
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  private destruirTodosGraficos(): void {
    [
      'chartOcorrenciasPerito',
      'chartOSPerito',
      'chartOcorrenciasDonutAdmin',
      'chartEvolucaoAdmin',
      'chartOSDonutAdmin',
      'chartOcorrenciasEvolucaoAdmin'
    ].forEach(key => {
      const chart = (this as any)[key] as Chart | null;
      if (chart) {
        chart.destroy();
        (this as any)[key] = null;
      }
    });
  }

  // ===========================================================================
  // LOAD DATA
  // ===========================================================================

  loadServicos(): void {
    if (this.isPerito() || this.isOperacional()) {
      this.servicosDisponiveis = this.currentUser.servicos_periciais || [];
    } else if (this.isAdminOrSuper()) {
      this.servicoPericialService.getAllForDropdown().subscribe({
        next: (servicos) => { this.servicosDisponiveis = servicos; },
        error: (err) => console.error('Erro ao carregar serviços:', err)
      });
    }
  }

  mostrarFiltroServico(): boolean {
    return (this.isPerito() || this.isOperacional() || this.isAdminOrSuper())
      && this.servicosDisponiveis.length > 0;
  }

  loadEstatisticas(): void {
    this.isLoading = true;
    const params: any = {};
    if (this.servicoSelecionado) params.servico_id = this.servicoSelecionado;

    this.ocorrenciaService.getEstatisticas(params).subscribe({
      next: (data) => {
        this.estatisticas = data;
        this.isLoading = false;

        if (this.isPerito()) {
          this.cdr.detectChanges();
          this.criarGraficoOcorrenciasPerito();
          if (this.estatisticasOS?.minhas_os) {
            this.criarGraficoOSPerito();
          }
        } else {
          this.tentarCriarGraficosAdmin();
        }
      },
      error: (err) => {
        console.error('Erro ao carregar estatísticas:', err);
        this.isLoading = false;
        this.estatisticas = null;
      }
    });
  }

  loadEstatisticasOS(): void {
    const params: any = {};
    if (this.servicoSelecionado) params.servico_id = this.servicoSelecionado;

    this.ordemServicoService.getEstatisticas(params).subscribe({
      next: (data) => {
        this.estatisticasOS = data;
        if (this.isPerito()) {
          if (!this.isLoading && this.estatisticas) {
            this.cdr.detectChanges();
            this.criarGraficoOSPerito();
          }
        } else {
          this.tentarCriarGraficosAdmin();
        }
      },
      error: (err) => {
        console.error('Erro ao carregar estatísticas OS:', err);
        this.estatisticasOS = null;
      }
    });
  }

  loadRelatoriosGerenciais(): void {
    this.isLoadingRelatorios = true;
    const params: any = {};
    if (this.servicoSelecionado) params.servico_id = this.servicoSelecionado;

    this.ordemServicoService.getRelatoriosGerenciais(params).subscribe({
      next: (data) => {
        this.relatoriosGerenciais = data;
        this.isLoadingRelatorios = false;
        this.tentarCriarGraficosAdmin();
      },
      error: (err) => {
        console.error('Erro ao carregar relatórios gerenciais:', err);
        this.isLoadingRelatorios = false;
        this.relatoriosGerenciais = null;
      }
    });
  }

  private tentarCriarGraficosAdmin(): void {
    if (this.isLoading || !this.estatisticas) return;
    this.cdr.detectChanges();
    this.criarGraficoOcorrenciasAdmin();
    if (this.estatisticas?.evolucao_mensal?.length) this.criarGraficoOcorrenciasEvolucaoAdmin();
    if (this.estatisticasOS?.geral_os) this.criarGraficoOSDonutAdmin();
    if (!this.isLoadingRelatorios && this.relatoriosGerenciais?.evolucao_temporal?.length) {
      this.criarGraficoEvolucaoAdmin();
    }
  }

  onServicoChange(): void {
    this.destruirTodosGraficos();
    this.loadEstatisticas();
    this.loadEstatisticasOS();
    if (this.isAdminOrOperacional()) this.loadRelatoriosGerenciais();
  }

  // ===========================================================================
  // GRÁFICOS PERITO
  // ===========================================================================

  private criarGraficoOcorrenciasPerito(): void {
    setTimeout(() => {
      const canvas = document.getElementById('chartOcorrenciasPerito') as HTMLCanvasElement;
      if (!canvas || !this.estatisticas) return;
      if (this.chartOcorrenciasPerito) { this.chartOcorrenciasPerito.destroy(); this.chartOcorrenciasPerito = null; }

      const d = this.estatisticas.minhas_ocorrencias;
      const labels = ['Em Análise', 'Finalizadas', 'Atrasadas'];
      const valores = [d.em_analise || 0, d.finalizadas || 0, d.atrasadas || 0];
      if (valores.every(v => v === 0)) return;

      const config: ChartConfiguration<'doughnut'> = {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data: valores,
            backgroundColor: ['#ff9800', '#28a745', '#dc3545'],
            borderColor: '#fff',
            borderWidth: 3
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '65%',
          plugins: {
            legend: { display: true, position: 'bottom', labels: { font: { size: 11, weight: 600 }, padding: 8 } },
            tooltip: { backgroundColor: 'rgba(0,0,0,0.8)', bodyFont: { size: 12 }, padding: 10 }
          }
        }
      };
      try { this.chartOcorrenciasPerito = new Chart(canvas, config); } catch (e) { }
    }, 100);
  }

  private criarGraficoOSPerito(): void {
    setTimeout(() => {
      const canvas = document.getElementById('chartOSPerito') as HTMLCanvasElement;
      if (!canvas || !this.estatisticasOS?.minhas_os) return;
      if (this.chartOSPerito) { this.chartOSPerito.destroy(); this.chartOSPerito = null; }

      const d = this.estatisticasOS.minhas_os;
      const labels = ['Ag. Ciência', 'Abertas/Andamento', 'Concluídas', 'Vencidas'];
      const valores = [
        d.aguardando_ciencia || 0,
        (d.abertas || 0) + (d.em_andamento || 0),
        d.concluidas || 0,
        d.vencidas || 0
      ];
      if (valores.every(v => v === 0)) return;

      const config: ChartConfiguration<'doughnut'> = {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data: valores,
            backgroundColor: ['#6c757d', '#3182ce', '#28a745', '#dc3545'],
            borderColor: '#fff',
            borderWidth: 3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '65%',
          plugins: {
            legend: {
              display: true,
              position: 'bottom',
              labels: { font: { size: 11, weight: 600 }, padding: 8 }
            },
            tooltip: { backgroundColor: 'rgba(0,0,0,0.8)', bodyFont: { size: 12 }, padding: 10 }
          }
        }
      };
      try { this.chartOSPerito = new Chart(canvas, config); } catch (e) { console.error('Erro ao gerar gráfico OS Perito:', e); }
    }, 100);
  }

  // ===========================================================================
  // GRÁFICOS ADMIN
  // ===========================================================================

  private criarGraficoOcorrenciasAdmin(): void {
    setTimeout(() => {
      const canvas = document.getElementById('chartOcorrenciasDonutAdmin') as HTMLCanvasElement;
      if (!canvas || !this.estatisticas) return;
      if (this.chartOcorrenciasDonutAdmin) { this.chartOcorrenciasDonutAdmin.destroy(); this.chartOcorrenciasDonutAdmin = null; }

      const d = this.estatisticas.geral;
      const labels = ['Ag. Perito', 'Em Análise', 'Laudo Entregue', 'Finalizada'];
      const valores = [d.aguardando || 0, d.em_analise || 0, d.laudo_entregue || 0, d.finalizadas || 0];
      if (valores.every(v => v === 0)) return;

      const config: ChartConfiguration<'doughnut'> = {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data: valores,
            backgroundColor: ['#3182ce', '#ff9800', '#8B5CF6', '#28a745'],
            borderColor: '#fff',
            borderWidth: 3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '62%',
          plugins: {
            legend: {
              display: true,
              position: 'bottom',
              labels: { font: { size: 10, weight: 600 }, padding: 8, boxWidth: 10 }
            },
            tooltip: {
              backgroundColor: 'rgba(0,0,0,0.8)',
              bodyFont: { size: 11 },
              padding: 10
            }
          }
        }
      };

      try {
        this.chartOcorrenciasDonutAdmin = new Chart(canvas, config);
      } catch (e) {
        console.error('Erro ao criar gráfico ocorrências donut:', e);
      }
    }, 100);
  }

  private criarGraficoEvolucaoAdmin(): void {
    setTimeout(() => {
      const canvas = document.getElementById('chartEvolucaoAdmin') as HTMLCanvasElement;
      if (!canvas || !this.relatoriosGerenciais?.evolucao_temporal?.length) return;

      if (this.chartEvolucaoAdmin) { this.chartEvolucaoAdmin.destroy(); this.chartEvolucaoAdmin = null; }

      const evolucao = this.relatoriosGerenciais.evolucao_temporal.slice(-6);
      const labels = evolucao.map((e: any) => {
        const d = new Date(e.mes + 'T00:00:00');
        return d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      });
      const emitidas = evolucao.map((e: any) => e.total);
      const concluidas = evolucao.map((e: any) => e.concluidas);

      const config: ChartConfiguration = {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Emitidas',
              data: emitidas,
              backgroundColor: 'rgba(49,130,206,0.75)',
              borderColor: 'rgba(49,130,206,1)',
              borderWidth: 2,
              borderRadius: 4
            } as any,
            {
              label: 'Concluídas',
              data: concluidas,
              backgroundColor: 'rgba(40,167,69,0.75)',
              borderColor: 'rgba(40,167,69,1)',
              borderWidth: 2,
              borderRadius: 4
            } as any
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: { top: 22 } },
          plugins: {
            legend: {
              display: true,
              position: 'bottom',
              labels: { font: { size: 11, weight: 'bold' }, padding: 16 }
            },
            tooltip: {
              backgroundColor: 'rgba(0,0,0,0.8)',
              titleFont: { size: 12, weight: 'bold' },
              bodyFont: { size: 11 },
              padding: 10
            }
          },
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 10, weight: 600 }, color: '#4a5568' } },
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(0,0,0,0.05)' },
              ticks: {
                font: { size: 11, weight: 600 }, color: '#4a5568', precision: 0,
                callback: (v: any) => v >= 1_000_000 ? (v / 1_000_000).toFixed(1).replace('.0', '') + 'M'
                  : v >= 1_000 ? (v / 1_000).toFixed(1).replace('.0', '') + 'k' : v
              }
            }
          }
        }
      };

      try {
        this.chartEvolucaoAdmin = new Chart(canvas, config);
      } catch (e) {
        console.error('Erro ao criar gráfico evolução:', e);
      }
    }, 50);
  }

  private criarGraficoOSDonutAdmin(): void {
    setTimeout(() => {
      const canvas = document.getElementById('chartOSDonutAdmin') as HTMLCanvasElement;
      if (!canvas || !this.estatisticasOS?.geral_os) return;

      if (this.chartOSDonutAdmin) { this.chartOSDonutAdmin.destroy(); this.chartOSDonutAdmin = null; }

      const d = this.estatisticasOS.geral_os;
      const labels = ['Ag. Ciência', 'Abertas', 'Em Andamento', 'Concluídas', 'Vencidas'];
      const valores = [d.aguardando_ciencia || 0, d.abertas || 0, d.em_andamento || 0, d.concluidas || 0, d.vencidas || 0];
      if (valores.every(v => v === 0)) return;

      const config: ChartConfiguration<'doughnut'> = {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data: valores,
            backgroundColor: ['#6c757d', '#3182ce', '#ff9800', '#28a745', '#dc3545'],
            borderColor: '#fff',
            borderWidth: 3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '62%',
          plugins: {
            legend: {
              display: true,
              position: 'bottom',
              labels: { font: { size: 10, weight: 600 }, padding: 8, boxWidth: 10 }
            },
            tooltip: {
              backgroundColor: 'rgba(0,0,0,0.8)',
              bodyFont: { size: 11 },
              padding: 10
            }
          }
        }
      };

      try {
        this.chartOSDonutAdmin = new Chart(canvas, config);
      } catch (e) {
        console.error('Erro ao criar gráfico OS donut:', e);
      }
    }, 50);
  }

  private criarGraficoOcorrenciasEvolucaoAdmin(): void {
    setTimeout(() => {
      const canvas = document.getElementById('chartOcorrenciasEvolucaoAdmin') as HTMLCanvasElement;
      if (!canvas || !this.estatisticas?.evolucao_mensal?.length) return;

      if (this.chartOcorrenciasEvolucaoAdmin) { this.chartOcorrenciasEvolucaoAdmin.destroy(); this.chartOcorrenciasEvolucaoAdmin = null; }

      const evolucao = this.estatisticas.evolucao_mensal.slice(-6);
      const labels = evolucao.map((e: any) => {
        const d = new Date(e.mes + 'T00:00:00');
        return d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      });

      const config: ChartConfiguration = {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Total',
              data: evolucao.map((e: any) => e.total),
              backgroundColor: 'rgba(255,152,0,0.75)',
              borderColor: 'rgba(255,152,0,1)',
              borderWidth: 2,
              borderRadius: 4
            } as any,
            {
              label: 'Finalizadas',
              data: evolucao.map((e: any) => e.finalizadas),
              backgroundColor: 'rgba(40,167,69,0.75)',
              borderColor: 'rgba(40,167,69,1)',
              borderWidth: 2,
              borderRadius: 4
            } as any
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: { top: 22 } },
          plugins: {
            legend: {
              display: true,
              position: 'bottom',
              labels: { font: { size: 11, weight: 'bold' }, padding: 16 }
            },
            tooltip: {
              backgroundColor: 'rgba(0,0,0,0.8)',
              titleFont: { size: 12, weight: 'bold' },
              bodyFont: { size: 11 },
              padding: 10
            }
          },
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 10, weight: 600 }, color: '#4a5568' } },
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(0,0,0,0.05)' },
              ticks: {
                font: { size: 11, weight: 600 }, color: '#4a5568', precision: 0,
                callback: (v: any) => v >= 1_000_000 ? (v / 1_000_000).toFixed(1).replace('.0', '') + 'M'
                  : v >= 1_000 ? (v / 1_000).toFixed(1).replace('.0', '') + 'k' : v
              }
            }
          }
        }
      };

      try {
        this.chartOcorrenciasEvolucaoAdmin = new Chart(canvas, config);
      } catch (e) {
        console.error('Erro ao criar gráfico evolução ocorrências:', e);
      }
    }, 50);
  }

  // ===========================================================================
  // BUILDER REUTILIZÁVEL
  // ===========================================================================

  private buildBarConfig(labels: string[], valores: number[], cores: string[], label: string): ChartConfiguration {
    return {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label,
          data: valores,
          backgroundColor: cores,
          borderColor: cores.map(c => c.replace('0.7', '1').replace('0.75', '1')),
          borderWidth: 2,
          borderRadius: 4
        } as any]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 22 } },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(0,0,0,0.8)',
            titleFont: { size: 13, weight: 'bold' },
            bodyFont: { size: 12 },
            padding: 12
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10, weight: 600 }, color: '#4a5568' } },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: { font: { size: 11, weight: 600 }, color: '#4a5568', precision: 0 }
          }
        }
      }
    };
  }

  // ===========================================================================
  // HELPERS DE TEMPLATE
  // ===========================================================================

  getFirstName(fullName?: string): string {
    if (!fullName) return 'Usuário';
    return fullName.split(' ')[0];
  }

  getTopPeritos(limite = 5): any[] {
    if (!this.relatoriosGerenciais?.producao_por_perito) return [];
    return this.relatoriosGerenciais.producao_por_perito
      .filter((p: any) => p.perito && p.perito !== 'Sem perito')
      .slice(0, limite);
  }

  calcularPorcentagem(valor: number, total: number): number {
    if (!total || total === 0) return 0;
    return Math.round((valor / total) * 100);
  }

  getTaxaCumprimento(): number {
    return this.relatoriosGerenciais?.taxa_cumprimento?.percentual_no_prazo ?? 0;
  }

  getTempoMedioOS(): number {
    return this.relatoriosGerenciais?.prazos?.tempo_medio_conclusao_dias ?? 0;
  }

  getPrimeiroNome(nome: string): string {
    if (!nome) return '—';
    const partes = nome.trim().split(' ');
    if (partes.length >= 2) return `${partes[0]} ${partes[partes.length - 1]}`;
    return partes[0];
  }

  isSuperAdmin(): boolean {
    return this.authService.isSuperAdmin();
  }

  isPerito(): boolean {
    return this.currentUser?.perfil === 'PERITO';
  }

  isOperacional(): boolean {
    return this.currentUser?.perfil === 'OPERACIONAL';
  }

  isAdminOrSuper(): boolean {
    return this.currentUser?.perfil === 'ADMINISTRATIVO' || this.isSuperAdmin();
  }

  isAdminOrOperacional(): boolean {
    return this.isOperacional() || this.isAdminOrSuper();
  }

  get today(): Date {
    return new Date();
  }

  // ===========================================================================
  // NAVEGAÇÃO DOS ALERTAS
  // ===========================================================================

  irParaOSVencidas(): void {
    this.router.navigate(['/gabinete-virtual/operacional/ordens-servico'], {
      queryParams: { vencida: true }
    });
  }

  irParaOSSemCiencia(): void {
    this.router.navigate(['/gabinete-virtual/operacional/ordens-servico'], {
      queryParams: { sem_ciencia: true }
    });
  }

  irParaOcorrenciasSemPerito(): void {
    this.router.navigate(['/gabinete-virtual/operacional/ocorrencias'], {
      queryParams: { status: 'AGUARDANDO_PERITO' }
    });
  }

  irParaOSSemCienciaPerito(): void {
    this.router.navigate(['/gabinete-virtual/operacional/ordens-servico'], {
      queryParams: { sem_ciencia: true }
    });
  }

  // ===========================================================================
  // TENDÊNCIAS
  // ===========================================================================

  private getUltimosDoisMeses(): { atual: any; anterior: any } | null {
    const evol = this.relatoriosGerenciais?.evolucao_temporal;
    if (!evol || evol.length < 2) return null;
    return {
      atual: evol[evol.length - 1],
      anterior: evol[evol.length - 2]
    };
  }

  getTendencia(campo: 'total' | 'concluidas'): { valor: number; direcao: 'up' | 'down' | 'neutral' } {
    const meses = this.getUltimosDoisMeses();
    if (!meses) return { valor: 0, direcao: 'neutral' };
    const anterior = meses.anterior[campo] as number;
    const atual = meses.atual[campo] as number;
    if (anterior === 0) return { valor: 0, direcao: 'neutral' };
    const variacao = Math.round(((atual - anterior) / anterior) * 100);
    return {
      valor: Math.abs(variacao),
      direcao: variacao > 2 ? 'up' : variacao < -2 ? 'down' : 'neutral'
    };
  }

  getMesAtualLabel(): string {
    const evol = this.relatoriosGerenciais?.evolucao_temporal;
    if (!evol?.length) return 'este mês';
    const ultimo = evol[evol.length - 1];
    const d = new Date(ultimo.mes + 'T00:00:00');
    return d.toLocaleDateString('pt-BR', { month: 'long' });
  }

  // ===========================================================================
  // AUTO-REFRESH
  // ===========================================================================

  private iniciarAutoRefresh(): void {
    this.refreshInterval = setInterval(() => this.fazerRefresh(), 60000);
  }

  private fazerRefresh(): void {
    if (this.isRefreshing || this.isLoading) return;
    this.isRefreshing = true;
    this.snapshotAnterior = {
      estat: JSON.parse(JSON.stringify(this.estatisticas || {})),
      os: JSON.parse(JSON.stringify(this.estatisticasOS || {}))
    };

    const params: any = {};
    if (this.servicoSelecionado) params.servico_id = this.servicoSelecionado;

    let ocorrDone = false;
    let osDone = false;
    const verificar = () => { if (ocorrDone && osDone) this.finalizarRefresh(); };

    this.ocorrenciaService.getEstatisticas(params).subscribe({
      next: (data) => { this.estatisticas = data; ocorrDone = true; verificar(); },
      error: () => { ocorrDone = true; verificar(); }
    });

    this.ordemServicoService.getEstatisticas(params).subscribe({
      next: (data) => { this.estatisticasOS = data; osDone = true; verificar(); },
      error: () => { osDone = true; verificar(); }
    });
  }

  private finalizarRefresh(): void {
    this.isRefreshing = false;
    this.ultimaAtualizacao = new Date();
    this.destruirTodosGraficos();
    this.tentarCriarGraficosAdmin();
    this.cdr.detectChanges();
  }

  getDeltaAtual(fonte: 'estat' | 'os', ...caminho: string[]): { valor: number; direcao: 'up' | 'down' | 'neutral' } {
    if (!this.snapshotAnterior) return { valor: 0, direcao: 'neutral' };
    let anteriorVal: any = this.snapshotAnterior[fonte];
    let atualVal: any = fonte === 'estat' ? this.estatisticas : this.estatisticasOS;
    for (const p of caminho) {
      anteriorVal = anteriorVal?.[p];
      atualVal = atualVal?.[p];
    }
    const diff = (atualVal ?? 0) - (anteriorVal ?? 0);
    return {
      valor: Math.abs(diff),
      direcao: diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral'
    };
  }

  getBarPerito(concluidas: number, total: number): string {
    const pct = this.calcularPorcentagem(concluidas, total);
    if (pct >= 60) return 'fill-green';
    if (pct >= 30) return 'fill-lilas';
    return 'fill-red';
  }

  getAllPeritos(): any[] {
    if (!this.relatoriosGerenciais?.producao_por_perito) return [];
    return this.relatoriosGerenciais.producao_por_perito
      .filter((p: any) => p.perito && p.perito !== 'Sem perito');
  }

  getUltimaAtualizacaoLabel(): string {
    if (!this.ultimaAtualizacao) return '';
    return this.ultimaAtualizacao.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  // ===========================================================================
  // MÉTODOS AUXILIARES PERITO
  // ===========================================================================

  getTaxaConclusaoOSPerito(): number {
    if (!this.estatisticasOS?.minhas_os?.total) return 0;
    const concluidas = this.estatisticasOS.minhas_os.concluidas || 0;
    const total = this.estatisticasOS.minhas_os.total;
    return Math.round((concluidas / total) * 100);
  }

  irParaMinhasOcorrenciasAtrasadas(): void {
    this.router.navigate(['/gabinete-virtual/operacional/ocorrencias'], {
      queryParams: { status: 'EM_ANALISE' }
    });
  }
}
