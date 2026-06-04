import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Chart, registerables } from 'chart.js';

import {
  CustodiaAnalyticsService,
  AnalyticsCustodiaResponse,
  FiltrosAnalytics,
  MesItem,
  MatrizItem,
} from '../../services/custodia-analytics.service';

import { ServicoPericial, ServicoPericialService } from '../../services/servico-pericial.service';

Chart.register(...registerables);

@Component({
  selector: 'app-custodia-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './custodia-analytics.component.html',
  styleUrls: ['./custodia-analytics.component.scss'],
})
export class CustodiaAnalyticsComponent implements OnInit, OnDestroy {

  analytics: AnalyticsCustodiaResponse | null = null;
  isLoading = false;

  filtros: FiltrosAnalytics = { data_inicio: '', data_fim: '', servico_pericial_id: undefined };
  servicos: ServicoPericial[] = [];

  // Drill-down dos cards de status
  cardExpandido: string | null = null;

  // Charts
  private chartEvolucao: Chart | null = null;
  private chartStatus: Chart | null = null;
  private chartServicos: Chart | null = null;
  private chartUnidades: Chart | null = null;
  private chartDnaSituacao: Chart | null = null;
  private chartDnaFinalidade: Chart | null = null;
  private chartDnaMes: Chart | null = null;

  // Matriz Serviço × Status
  servicosList: string[] = [];
  readonly statusList = ['INICIAL', 'ANDAMENTO', 'FINALIZADO'];
  readonly statusLabels: Record<string, string> = {
    INICIAL: 'Inicial', ANDAMENTO: 'Em Andamento', FINALIZADO: 'Finalizado',
  };
  matrizServicosStatus: Record<string, Record<string, number>> = {};

  // Cores dos cards de status
  private readonly coresStatus: Record<string, string> = {
    INICIAL:    'info',
    ANDAMENTO:  'warning',
    FINALIZADO: 'success',
  };

  constructor(
    private analyticsService: CustodiaAnalyticsService,
    private servicoPericialService: ServicoPericialService,
  ) {}

  ngOnInit(): void {
    this.servicoPericialService.getAllForDropdown().subscribe({
      next: data => this.servicos = data,
      error: err  => console.error('Erro ao carregar serviços:', err),
    });
    this.load();
  }

  ngOnDestroy(): void { this.destroyCharts(); }

  // ── Carga de dados ────────────────────────────────────────────────────────

  load(): void {
    this.isLoading = true;
    const f: FiltrosAnalytics = {};
    if (this.filtros.data_inicio)         f.data_inicio = this.filtros.data_inicio;
    if (this.filtros.data_fim)            f.data_fim    = this.filtros.data_fim;
    if (this.filtros.servico_pericial_id) f.servico_pericial_id = this.filtros.servico_pericial_id;

    this.analyticsService.getAnalytics(f).subscribe({
      next: data => {
        this.analytics = data;
        this.processarMatriz(data.graficos.matriz_servico_status);
        this.isLoading = false;
        setTimeout(() => this.criarGraficos(), 100);
      },
      error: err => { console.error('Erro analytics:', err); this.isLoading = false; },
    });
  }

  aplicarFiltros(): void { this.load(); }

  limparFiltros(): void {
    this.filtros = { data_inicio: '', data_fim: '', servico_pericial_id: undefined };
    this.load();
  }

  // ── Cards ─────────────────────────────────────────────────────────────────

  getCorCard(status: string): string {
    return this.coresStatus[status] ?? 'secondary';
  }

  toggleCard(status: string): void {
    this.cardExpandido = this.cardExpandido === status ? null : status;
  }

  isExpandido(status: string): boolean { return this.cardExpandido === status; }

  // ── Matriz Serviço × Status ───────────────────────────────────────────────

  private processarMatriz(matriz: MatrizItem[]): void {
    const set = new Set(matriz.map(i => i.servico));
    this.servicosList = Array.from(set).sort();

    this.matrizServicosStatus = {};
    this.servicosList.forEach(s => {
      this.matrizServicosStatus[s] = { INICIAL: 0, ANDAMENTO: 0, FINALIZADO: 0 };
    });
    matriz.forEach(i => {
      if (this.matrizServicosStatus[i.servico]) {
        this.matrizServicosStatus[i.servico][i.status] = i.quantidade;
      }
    });
  }

  getIntensidade(qtd: number): string {
    if (qtd === 0)   return 'intensidade-zero';
    if (qtd <= 3)    return 'intensidade-baixa';
    if (qtd <= 10)   return 'intensidade-media';
    if (qtd <= 30)   return 'intensidade-alta';
    return 'intensidade-critica';
  }

  getTotalServico(s: string): number {
    return Object.values(this.matrizServicosStatus[s] ?? {}).reduce((a, b) => a + b, 0);
  }

  getTotalStatus(st: string): number {
    return this.servicosList.reduce((acc, s) => acc + (this.matrizServicosStatus[s]?.[st] ?? 0), 0);
  }

  getTotalGeral(): number {
    return this.servicosList.reduce((acc, s) => acc + this.getTotalServico(s), 0);
  }

  // ── Insights ──────────────────────────────────────────────────────────────

  getInsights(): string[] {
    if (!this.analytics) return [];
    const { resumo, cards_status, graficos } = this.analytics;
    const insights: string[] = [];

    const ativo = cards_status.find(c => c.status === 'ANDAMENTO');
    if (ativo) insights.push(`<strong>Em andamento:</strong> ${ativo.quantidade} vestígios aguardam finalização (${ativo.percentual}% do total)`);

    if (resumo.aguardando_aceite > 0)
      insights.push(`<strong>Atenção:</strong> ${resumo.aguardando_aceite} movimentação(ões) aguardando aceite no momento`);

    if (graficos.por_servico.length > 0)
      insights.push(`<strong>Serviço mais demandado:</strong> ${graficos.por_servico[0].sigla} com ${graficos.por_servico[0].quantidade} vestígios`);

    if (graficos.por_unidade.length > 0)
      insights.push(`<strong>Unidade com mais vestígios:</strong> ${graficos.por_unidade[0].sigla} — ${graficos.por_unidade[0].quantidade} registros`);

    const totalBio = graficos.por_biologico.find(i => i.label === 'Biológico');
    if (totalBio && totalBio.quantidade > 0)
      insights.push(`<strong>Vestígios biológicos:</strong> ${totalBio.quantidade} no período (requerem rastreabilidade especial)`);

    return insights;
  }

  // ── Gráficos ──────────────────────────────────────────────────────────────

  private destroyCharts(): void {
    [this.chartEvolucao, this.chartStatus, this.chartServicos,
     this.chartUnidades, this.chartDnaSituacao, this.chartDnaFinalidade, this.chartDnaMes]
      .forEach(c => { if (c) { c.destroy(); } });
    this.chartEvolucao = this.chartStatus = this.chartServicos =
    this.chartUnidades = this.chartDnaSituacao = this.chartDnaFinalidade = this.chartDnaMes = null;
  }

  private criarGraficos(): void {
    if (!this.analytics?.graficos) return;
    this.destroyCharts();
    this.criarEvolucao();
    this.criarStatus();
    this.criarServicos();
    this.criarUnidades();
    this.criarDnaSituacao();
    this.criarDnaFinalidade();
    this.criarDnaMes();
  }

  private canvas(id: string): HTMLCanvasElement | null {
    return document.getElementById(id) as HTMLCanvasElement | null;
  }

  private criarEvolucao(): void {
    const c = this.canvas('chartEvolucao');
    if (!c) return;
    const cad  = this.analytics!.graficos.por_mes_cadastro;
    const fin  = this.analytics!.graficos.por_mes_finalizacao;
    const labels = [...new Set([...cad.map(d => d.mes_nome), ...fin.map(d => d.mes_nome)])];
    const cadQtd = labels.map(l => cad.find(d => d.mes_nome === l)?.quantidade ?? 0);
    const finQtd = labels.map(l => fin.find(d => d.mes_nome === l)?.quantidade ?? 0);

    this.chartEvolucao = new Chart(c, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Cadastros', data: cadQtd, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', fill: true, tension: 0.4, pointRadius: 4 },
          { label: 'Finalizações', data: finQtd, borderColor: '#DAA520', backgroundColor: 'rgba(218,165,32,0.08)', fill: true, tension: 0.4, pointRadius: 4 },
        ],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } },
    });
  }

  private criarStatus(): void {
    const c = this.canvas('chartStatus');
    if (!c) return;
    const dados = this.analytics!.cards_status;
    this.chartStatus = new Chart(c, {
      type: 'doughnut',
      data: {
        labels: dados.map(d => d.label),
        datasets: [{ data: dados.map(d => d.quantidade), backgroundColor: ['#3b82f6', '#f59e0b', '#22c55e'], borderWidth: 0 }],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: '70%' },
    });
  }

  private criarServicos(): void {
    const c = this.canvas('chartServicos');
    if (!c || !this.analytics!.graficos.por_servico.length) return;
    const dados = this.analytics!.graficos.por_servico.slice(0, 10);
    this.chartServicos = new Chart(c, {
      type: 'bar',
      data: {
        labels: dados.map(d => d.sigla),
        datasets: [{ label: 'Vestígios', data: dados.map(d => d.quantidade), backgroundColor: '#3b82f6', borderRadius: 4 }],
      },
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true } } },
    });
  }

  private criarUnidades(): void {
    const c = this.canvas('chartUnidades');
    if (!c || !this.analytics!.graficos.por_unidade.length) return;
    const dados = this.analytics!.graficos.por_unidade.slice(0, 10);
    this.chartUnidades = new Chart(c, {
      type: 'bar',
      data: {
        labels: dados.map(d => d.sigla),
        datasets: [{ label: 'Vestígios', data: dados.map(d => d.quantidade), backgroundColor: '#8b5cf6', borderRadius: 4 }],
      },
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true } } },
    });
  }

  private criarDnaSituacao(): void {
    const c = this.canvas('chartDnaSituacao');
    if (!c || !this.analytics!.graficos.dna_por_situacao.length) return;
    const dados = this.analytics!.graficos.dna_por_situacao;
    // Cores amarradas ao valor do label — não à posição — para resistir a reordenação por quantidade
    const coresSituacao: Record<string, string> = {
      APENADO:    '#ef4444',  // vermelho
      NAO_APENADO:'#14b8a6', // teal
    };
    this.chartDnaSituacao = new Chart(c, {
      type: 'doughnut',
      data: {
        labels: dados.map(d => d.label === 'APENADO' ? 'Apenado' : 'Não Apenado'),
        datasets: [{ data: dados.map(d => d.quantidade), backgroundColor: dados.map(d => coresSituacao[d.label] ?? '#6b7280'), borderWidth: 0 }],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, cutout: '65%' },
    });
  }

  private criarDnaFinalidade(): void {
    const c = this.canvas('chartDnaFinalidade');
    if (!c || !this.analytics!.graficos.dna_por_finalidade.length) return;
    const dados = this.analytics!.graficos.dna_por_finalidade;
    this.chartDnaFinalidade = new Chart(c, {
      type: 'doughnut',
      data: {
        labels: dados.map(d => d.label === 'LEI' ? 'Por lei' : 'Judicial'),
        datasets: [{ data: dados.map(d => d.quantidade), backgroundColor: ['#8b5cf6', '#f97316'], borderWidth: 0 }],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, cutout: '65%' },
    });
  }

  private criarDnaMes(): void {
    const c = this.canvas('chartDnaMes');
    if (!c || !this.analytics!.graficos.dna_por_mes.length) return;
    const dados = this.analytics!.graficos.dna_por_mes;
    this.chartDnaMes = new Chart(c, {
      type: 'bar',
      data: {
        labels: dados.map(d => d.mes_nome),
        datasets: [{ label: 'Coletas DNA', data: dados.map(d => d.quantidade), backgroundColor: '#14b8a6', borderRadius: 4 }],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } },
    });
  }

  // ── Utilitários ───────────────────────────────────────────────────────────

  formatarData(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
}
