// src/app/pages/dashboard-inicial/components/dash-admin/dash-admin.component.ts

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
  selector: 'app-dash-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './dash-admin.component.html',
  styleUrls: ['../../dashboard-inicial.component.scss']
})
export class DashAdminComponent implements OnInit, OnDestroy {
  @Input() user: any = null;

  // Variáveis do ecossistema mapeadas pelo HTML original
  estatisticas: any = null;
  estatisticasOS: any = null;
  relatoriosGerenciais: any = null;

  // Variáveis do barramento de custódia e DNA
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
    this.servicosDisponiveis = this.user?.servicos_periciais || [];
    this.carregarDadosGlobais();

    this.pollingInterval = setInterval(() => {
      this.atualizarDadosSilenciosamente();
    }, 60000);
  }

  ngOnDestroy(): void {
    if (this.pollingInterval) clearInterval(this.pollingInterval);
    this.destruirGraficos();
  }

  carregarDadosGlobais(): void {
    this.isLoading = true;
    const params: any = {};
    if (this.servicoSelecionado) params.servico_id = this.servicoSelecionado;

    const filtroCustodia: VestigioFiltros = {
      page_size: 1,
      conformidade: true,
      servico_pericial: this.servicoSelecionado ?? undefined
    };

    Promise.all([
      this.ocorrenciaService.getEstatisticas(params).toPromise().catch(() => null),
      this.ordemServicoService.getEstatisticas(params).toPromise().catch(() => null),
      this.custodiaService.getDashboard().toPromise().catch(() => null),
      this.custodiaService.getDnasPaginado({ page_size: 1 }).toPromise().catch(() => null),
      this.custodiaService.getVestigios(filtroCustodia).toPromise().catch(() => null),
      this.ocorrenciaService.getRelatoriosGerenciais(params).toPromise().catch(() => null)
    ]).then(([ocorrData, osData, custodiaData, dnas, conformes, gerenciaisData]) => {

      this.estatisticas = ocorrData || { geral: { total: 0, aguardando: 0, em_analise: 0, laudo_entregue: 0, finalizadas: 0, atrasadas: 0, finalizadas_este_mes: 0 }, por_servico: [], ultimos_30_dias: { criadas: 0, finalizadas: 0 } };
      this.estatisticasOS = osData || { geral_os: { total: 0, em_andamento: 0, concluidas: 0, vencidas: 0, aguardando_ciencia: 0 } };
      this.sinalizadoresCustodia = custodiaData || { total: 0, biologicos: 0 };
      this.totalDnas = dnas?.count || 0;
      this.totalConformes = conformes?.count || 0;
      this.relatoriosGerenciais = gerenciaisData;

      if (this.servicosDisponiveis.length === 0 && ocorrData?.por_servico) {
        this.servicosDisponiveis = ocorrData.por_servico.map((item: any, index: number) => ({
          id: item.id || index + 1,
          sigla: item.servico_pericial__sigla,
          nome: item.servico_pericial__nome
        }));
      }

      this.ultimaAtualizacao = new Date();
      this.isLoading = false;

      this.cdr.detectChanges();
      this.renderizarGraficosAvançados();
    }).catch((err) => {
      console.error('Erro crítico no barramento do Dashboard Administrativo:', err);
      this.isLoading = false;
    });
  }

  atualizarDadosSilenciosamente(): void {
    this.isRefreshing = true;
    const params: any = {};
    if (this.servicoSelecionado) params.servico_id = this.servicoSelecionado;

    const filtroCustodia: VestigioFiltros = {
      page_size: 1,
      conformidade: true,
      servico_pericial: this.servicoSelecionado ?? undefined
    };

    Promise.all([
      this.ocorrenciaService.getEstatisticas(params).toPromise().catch(() => null),
      this.ordemServicoService.getEstatisticas(params).toPromise().catch(() => null),
      this.custodiaService.getDashboard().toPromise().catch(() => null),
      this.custodiaService.getDnasPaginado({ page_size: 1 }).toPromise().catch(() => null),
      this.custodiaService.getVestigios(filtroCustodia).toPromise().catch(() => null),
      this.ocorrenciaService.getRelatoriosGerenciais(params).toPromise().catch(() => null)
    ]).then(([ocorrData, osData, custodiaData, dnas, conformes, gerenciaisData]) => {
      if (ocorrData) this.estatisticas = ocorrData;
      if (osData) this.estatisticasOS = osData;
      if (custodiaData) this.sinalizadoresCustodia = custodiaData;
      if (dnas) this.totalDnas = dnas.count;
      if (conformes) this.totalConformes = conformes.count;
      if (gerenciaisData) this.relatoriosGerenciais = gerenciaisData;

      this.ultimaAtualizacao = new Date();
      this.isRefreshing = false;

      this.cdr.detectChanges();
      this.renderizarGraficosAvançados();
    }).catch(() => {
      this.isRefreshing = false;
    });
  }

  // Métodos de cálculo e retorno de arrays exigidos pelas diretivas do HTML
  getTaxaCumprimento(): number {
    if (this.relatoriosGerenciais?.taxa_cumprimento?.percentual_no_prazo !== undefined) {
      return Math.round(this.relatoriosGerenciais.taxa_cumprimento.percentual_no_prazo);
    }
    const os = this.estatisticasOS?.geral_os;
    return os?.total ? Math.round((os.concluidas / os.total) * 100) : 0;
  }

  getTempoMedioOS(): number {
    return this.relatoriosGerenciais?.tempo_medio_conclusao_dias || 0;
  }

  getAllPeritos(): any[] {
    return this.relatoriosGerenciais?.producao_por_perito || [];
  }

  getPrimeiroNome(fullName?: string): string {
    return fullName ? fullName.split(' ')[0] : 'Perito';
  }

  getBarPerito(concluidas: number, total: number): string {
    const pct = total ? (concluidas / total) * 100 : 0;
    if (pct >= 70) return 'bg-success';
    if (pct >= 40) return 'bg-warning';
    return 'bg-danger';
  }

  onServicoChange(): void {
    this.destruirGraficos();
    this.carregarDadosGlobais();
  }

  private destruirGraficos(): void {
    if (this.chartOcorrenciasDonut) this.chartOcorrenciasDonut.destroy();
    if (this.chartOSDonut) this.chartOSDonut.destroy();
  }

  private renderizarGraficosAvançados(): void {
    this.destruirGraficos();
    this.criarChartOcorrenciasDonut();
    this.criarChartOSDonut();
  }

  private criarChartOcorrenciasDonut(): void {
    const canvas = document.getElementById('chartOcorrenciasDonutAdmin') as HTMLCanvasElement;
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
    const canvas = document.getElementById('chartOSDonutAdmin') as HTMLCanvasElement;
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

  irParaOSVencidas(): void { this.router.navigate(['/gabinete-virtual/operacional/ordens-servico']); }
  irParaOSSemCiencia(): void { this.router.navigate(['/gabinete-virtual/operacional/ordens-servico']); }
  irParaOcorrenciasSemPerito(): void { this.router.navigate(['/gabinete-virtual/operacional/ocorrencias']); }
  irParaVestigiosGeral(): void { this.router.navigate(['/gabinete-virtual/custodia/vestigios']); }
  irParaDnasGeral(): void { this.router.navigate(['/gabinete-virtual/custodia/dnas']); }

  getFirstName(fullName?: string): string { return fullName ? fullName.split(' ')[0] : 'Administrador'; }
  getUltimaAtualizacaoLabel(): string { return this.ultimaAtualizacao ? this.ultimaAtualizacao.toLocaleTimeString() : ''; }
  calcularPorcentagem(valor: number, total: number): number { return total ? Math.round((valor / total) * 100) : 0; }
}
