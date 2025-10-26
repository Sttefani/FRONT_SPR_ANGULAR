// src/app/pages/dashboard-inicial/dashboard-inicial.component.ts

import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { OcorrenciaService } from '../../services/ocorrencia.service';
import { OrdemServicoService } from '../../services/ordem-servico.service';
import { ServicoPericialService } from '../../services/servico-pericial.service';
import { Chart, registerables, ChartConfiguration } from 'chart.js';

// Registrar componentes do Chart.js
Chart.register(...registerables);

interface GraficoData {
  labels: string[];
  valores: number[];
  cores: string[];
}

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
  isLoading = true;
  servicosDisponiveis: any[] = [];
  servicoSelecionado: number | null = null;

  // Chart.js - Dois gráficos
  private chartOcorrencias: Chart | null = null;
  private chartOS: Chart | null = null;

  constructor(
    private authService: AuthService,
    private ocorrenciaService: OcorrenciaService,
    private ordemServicoService: OrdemServicoService,
    private servicoPericialService: ServicoPericialService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    console.log('🔍 Current User:', this.currentUser);

    this.loadServicos();
    this.loadEstatisticas();
    this.loadEstatisticasOS();
  }

  ngAfterViewInit(): void {
    console.log("ngAfterViewInit: DOM pronto.");
  }

  ngOnDestroy(): void {
    // Limpar gráficos ao destruir componente
    if (this.chartOcorrencias) {
      this.chartOcorrencias.destroy();
      this.chartOcorrencias = null;
    }
    if (this.chartOS) {
      this.chartOS.destroy();
      this.chartOS = null;
    }
  }

  loadServicos(): void {
    console.log('📌 LOAD SERVICOS INICIOU');

    if (this.isPerito() || this.isOperacional()) {
      this.servicosDisponiveis = this.currentUser.servicos_periciais || [];
      console.log('📌 Perito/Operacional - Servicos Disponiveis:', this.servicosDisponiveis);
    } else if (this.isAdminOrSuper()) {
      console.log('📌 Admin/Super - Buscando servicos via API');
      this.servicoPericialService.getAllForDropdown().subscribe({
        next: (servicos) => {
          this.servicosDisponiveis = servicos;
          console.log('📌 Servicos carregados da API:', this.servicosDisponiveis);
        },
        error: (err) => console.error('Erro ao carregar serviços:', err)
      });
    }
  }

  mostrarFiltroServico(): boolean {
    const resultado = this.isPerito() || this.isOperacional() || this.isAdminOrSuper();
    return resultado && this.servicosDisponiveis.length > 0;
  }

  loadEstatisticas(): void {
    this.isLoading = true;
    const params: any = {};

    if (this.servicoSelecionado) {
      params.servico_id = this.servicoSelecionado;
    }

    this.ocorrenciaService.getEstatisticas(params).subscribe({
      next: (data) => {
        this.estatisticas = data;
        this.isLoading = false;
        console.log('📊 Estatísticas de Ocorrências carregadas:', this.estatisticas);
        this.criarGraficoOcorrencias();
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

    if (this.servicoSelecionado) {
      params.servico_id = this.servicoSelecionado;
    }

    console.log('📊 Carregando estatísticas de OS...');

    this.ordemServicoService.getEstatisticas(params).subscribe({
      next: (data) => {
        this.estatisticasOS = data;
        console.log('✅ Estatísticas de OS carregadas:', this.estatisticasOS);
        this.criarGraficoOS();
      },
      error: (err) => {
        console.error('❌ Erro ao carregar estatísticas de OS:', err);
        this.estatisticasOS = null;
      }
    });
  }

  onServicoChange(): void {
    console.log('📌 Serviço alterado para:', this.servicoSelecionado);

    // Destroi gráficos antigos antes de recarregar
    if (this.chartOcorrencias) {
      this.chartOcorrencias.destroy();
      this.chartOcorrencias = null;
    }
    if (this.chartOS) {
      this.chartOS.destroy();
      this.chartOS = null;
    }

    this.loadEstatisticas();
    this.loadEstatisticasOS();
  }

  /**
   * Cria o gráfico de Ocorrências
   */
  private criarGraficoOcorrencias(): void {
    setTimeout(() => {
      if (!this.estatisticas || this.isLoading) {
        console.log('⏳ Aguardando estatísticas de ocorrências...');
        return;
      }

      const canvasId = this.isPerito() ? 'chartOcorrenciasPerito' : 'chartOcorrenciasAdmin';
      const canvas = document.getElementById(canvasId) as HTMLCanvasElement;

      if (!canvas) {
        console.warn(`⚠️ Canvas #${canvasId} não encontrado`);
        return;
      }

      console.log('📈 Criando gráfico de Ocorrências:', canvasId);

      if (this.chartOcorrencias) {
        this.chartOcorrencias.destroy();
        this.chartOcorrencias = null;
      }

      const dadosGrafico = this.prepararDadosGraficoOcorrencias();

      if (!dadosGrafico.labels || dadosGrafico.labels.length === 0 || dadosGrafico.valores.every(v => v === 0)) {
        console.warn("⚠️ Sem dados válidos para gráfico de ocorrências");
        return;
      }

      const config: ChartConfiguration = {
        type: 'bar',
        data: {
          labels: dadosGrafico.labels,
          datasets: [{
            label: 'Ocorrências',
            data: dadosGrafico.valores,
            backgroundColor: dadosGrafico.cores,
            borderColor: dadosGrafico.cores.map((cor: string) => cor.replace('0.7', '1')),
            borderWidth: 2,
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              titleFont: { size: 13, weight: 'bold' },
              bodyFont: { size: 12 },
              padding: 12,
              callbacks: { label: (context) => ` ${context.parsed.y} ocorrências` }
            }
          },
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 10, weight: 600 }, color: '#4a5568' } },
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(0, 0, 0, 0.05)', lineWidth: 1 },
              ticks: { font: { size: 11, weight: 600 }, color: '#4a5568', precision: 0 }
            }
          }
        }
      };

      try {
        this.chartOcorrencias = new Chart(canvas, config);
        console.log('✅ Gráfico de Ocorrências criado!');
      } catch (error) {
        console.error("❌ Erro ao criar gráfico de Ocorrências:", error);
        if (this.chartOcorrencias) {
          this.chartOcorrencias.destroy();
          this.chartOcorrencias = null;
        }
      }
    }, 50);
  }

  /**
   * Cria o gráfico de Ordens de Serviço
   */
  private criarGraficoOS(): void {
    setTimeout(() => {
      if (!this.estatisticasOS) {
        console.log('⏳ Aguardando estatísticas de OS...');
        return;
      }

      const canvasId = this.isPerito() ? 'chartOSPerito' : 'chartOSAdmin';
      const canvas = document.getElementById(canvasId) as HTMLCanvasElement;

      if (!canvas) {
        console.warn(`⚠️ Canvas #${canvasId} não encontrado`);
        return;
      }

      console.log('📈 Criando gráfico de OS:', canvasId);

      if (this.chartOS) {
        this.chartOS.destroy();
        this.chartOS = null;
      }

      const dadosGrafico = this.prepararDadosGraficoOS();

      if (!dadosGrafico.labels || dadosGrafico.labels.length === 0 || dadosGrafico.valores.every(v => v === 0)) {
        console.warn("⚠️ Sem dados válidos para gráfico de OS");
        return;
      }

      const config: ChartConfiguration = {
        type: 'bar',
        data: {
          labels: dadosGrafico.labels,
          datasets: [{
            label: 'Ordens de Serviço',
            data: dadosGrafico.valores,
            backgroundColor: dadosGrafico.cores,
            borderColor: dadosGrafico.cores.map((cor: string) => cor.replace('0.7', '1')),
            borderWidth: 2,
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              titleFont: { size: 13, weight: 'bold' },
              bodyFont: { size: 12 },
              padding: 12,
              callbacks: { label: (context) => ` ${context.parsed.y} ordens` }
            }
          },
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 10, weight: 600 }, color: '#4a5568' } },
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(0, 0, 0, 0.05)', lineWidth: 1 },
              ticks: { font: { size: 11, weight: 600 }, color: '#4a5568', precision: 0 }
            }
          }
        }
      };

      try {
        this.chartOS = new Chart(canvas, config);
        console.log('✅ Gráfico de OS criado!');
      } catch (error) {
        console.error("❌ Erro ao criar gráfico de OS:", error);
        if (this.chartOS) {
          this.chartOS.destroy();
          this.chartOS = null;
        }
      }
    }, 50);
  }

  private prepararDadosGraficoOcorrencias(): GraficoData {
    console.log('🔧 Preparando dados de Ocorrências...');
    let labels: string[] = [];
    let valores: number[] = [];
    let cores: string[] = [];

    const dadosFonte = this.isPerito() ? this.estatisticas?.minhas_ocorrencias : this.estatisticas?.geral;

    if (!dadosFonte) {
      console.warn("⚠️ Dados de ocorrências não encontrados");
      return { labels, valores, cores };
    }

    if (this.isPerito()) {
      labels = ['Em Análise', 'Finalizadas', 'Atrasadas'];
      valores = [
        dadosFonte.em_analise || 0,
        dadosFonte.finalizadas || 0,
        dadosFonte.atrasadas || 0
      ];
      cores = [
        'rgba(255, 152, 0, 0.7)',
        'rgba(40, 167, 69, 0.7)',
        'rgba(220, 53, 69, 0.7)'
      ];
    } else if (this.isAdminOrOperacional()) {
      labels = ['Aguardando', 'Em Análise', 'Finalizadas', 'Atrasadas'];
      valores = [
        dadosFonte.aguardando || 0,
        dadosFonte.em_analise || 0,
        dadosFonte.finalizadas || 0,
        dadosFonte.atrasadas || 0
      ];
      cores = [
        'rgba(49, 130, 206, 0.7)',
        'rgba(255, 152, 0, 0.7)',
        'rgba(40, 167, 69, 0.7)',
        'rgba(220, 53, 69, 0.7)'
      ];
    }

    console.log('✅ Dados de Ocorrências preparados:', { labels, valores });
    return { labels, valores, cores };
  }

  private prepararDadosGraficoOS(): GraficoData {
    console.log('🔧 Preparando dados de OS...');
    let labels: string[] = [];
    let valores: number[] = [];
    let cores: string[] = [];

    const dadosFonte = this.isPerito() ? this.estatisticasOS?.minhas_os : this.estatisticasOS?.geral_os;

    if (!dadosFonte) {
      console.warn("⚠️ Dados de OS não encontrados");
      return { labels, valores, cores };
    }

    labels = ['Aguardando Ciência', 'Abertas', 'Em Andamento', 'Concluídas', 'Vencidas'];
    valores = [
      dadosFonte.aguardando_ciencia || 0,
      dadosFonte.abertas || 0,
      dadosFonte.em_andamento || 0,
      dadosFonte.concluidas || 0,
      dadosFonte.vencidas || 0
    ];
    cores = [
      'rgba(108, 117, 125, 0.7)', // Cinza
      'rgba(49, 130, 206, 0.7)',  // Azul
      'rgba(255, 152, 0, 0.7)',   // Laranja
      'rgba(40, 167, 69, 0.7)',   // Verde
      'rgba(220, 53, 69, 0.7)'    // Vermelho
    ];

    console.log('✅ Dados de OS preparados:', { labels, valores });
    return { labels, valores, cores };
  }

  // ========== MÉTODOS AUXILIARES ==========

  getFirstName(fullName?: string): string {
    if (!fullName) return 'Usuário';
    return fullName.split(' ')[0];
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
}
