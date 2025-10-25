// src/app/pages/dashboard-inicial/dashboard-inicial.component.ts (VERSÃO CORRIGIDA)

import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common'; // ✅ DecimalPipe removido
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router'; // ✅ RouterModule mantido (necessário para o HTML)
import { AuthService } from '../../services/auth.service';
import { OcorrenciaService } from '../../services/ocorrencia.service';
import { ServicoPericialService } from '../../services/servico-pericial.service';
import { Chart, registerables, ChartConfiguration } from 'chart.js';

// Registrar componentes do Chart.js
Chart.register(...registerables);

// ✅ Interface para tipar os dados do gráfico
interface GraficoData {
  labels: string[];
  valores: number[];
  cores: string[];
}

@Component({
  selector: 'app-dashboard-inicial',
  standalone: true,
  // ✅ CORREÇÃO: DecimalPipe removido da lista de imports
  imports: [CommonModule, FormsModule, RouterModule, DatePipe],
  templateUrl: './dashboard-inicial.component.html',
  styleUrls: ['./dashboard-inicial.component.scss']
})
export class DashboardInicialComponent implements OnInit, AfterViewInit, OnDestroy {
  currentUser: any = null;
  estatisticas: any = null;
  isLoading = true;
  servicosDisponiveis: any[] = [];
  servicoSelecionado: number | null = null;

  // Chart.js
  private chart: Chart | null = null; // Apenas uma variável de gráfico

  constructor(
    private authService: AuthService,
    private ocorrenciaService: OcorrenciaService,
    private servicoPericialService: ServicoPericialService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    console.log('🔍 Current User:', this.currentUser);
    // console.log('🔍 Perfil:', this.currentUser?.perfil);
    // console.log('🔍 Servicos Periciais:', this.currentUser?.servicos_periciais);

    this.loadServicos();
    this.loadEstatisticas(); // Carrega apenas estatísticas de ocorrências
  }

  ngAfterViewInit(): void {
    // A criação do gráfico agora é chamada no 'next' do loadEstatisticas
    console.log("ngAfterViewInit: DOM pronto.");
  }

  ngOnDestroy(): void {
    // Limpar gráfico ao destruir componente
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }

  loadServicos(): void {
    console.log('📌 LOAD SERVICOS INICIOU');

    if (this.isPerito() || this.isOperacional()) {
      // PERITO/OPERACIONAL: apenas serviços linkados
      this.servicosDisponiveis = this.currentUser.servicos_periciais || [];
      console.log('📌 Perito/Operacional - Servicos Disponiveis:', this.servicosDisponiveis);
    } else if (this.isAdminOrSuper()) {
      // ADMIN/SUPER: todos os serviços do sistema
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
    // console.log('📌 mostrarFiltroServico():', resultado);
    // console.log('📌 servicosDisponiveis.length:', this.servicosDisponiveis.length);
    return resultado && this.servicosDisponiveis.length > 0;
  }

  // Nome original da função
  loadEstatisticas(): void {
    this.isLoading = true;
    const params: any = {};

    if (this.servicoSelecionado) {
      params.servico_id = this.servicoSelecionado;
    }

    // Chama o serviço de OCORRÊNCIAS
    this.ocorrenciaService.getEstatisticas(params).subscribe({
      next: (data) => {
        this.estatisticas = data;
        this.isLoading = false;
        console.log('📊 Estatísticas carregadas:', this.estatisticas);

        // Chama criarGrafico AQUI, após os dados chegarem
        this.criarGrafico();
      },
      error: (err) => {
        console.error('Erro ao carregar estatísticas:', err);
        this.isLoading = false;
        this.estatisticas = null; // Limpa em caso de erro
      }
    });
  }

  onServicoChange(): void {
    console.log('📌 Serviço alterado para:', this.servicoSelecionado);
     // Destroi gráfico antigo antes de recarregar
    if (this.chart) { this.chart.destroy(); this.chart = null; }
    this.loadEstatisticas(); // Chama a função original
  }

  /**
   * Cria o gráfico de BARRAS com os dados REAIS do backend (lógica original)
   */
  private criarGrafico(): void {
     // Adicionado delay para garantir que o canvas do @if esteja renderizado
     setTimeout(() => {
        if (!this.estatisticas || this.isLoading) {
          console.log('⏳ Aguardando estatísticas para criar gráfico...');
          return;
        }

        const canvasId = this.isPerito() ? 'chartPerito' : 'chartAdmin';
        const canvas = document.getElementById(canvasId) as HTMLCanvasElement;

        if (!canvas) {
          console.warn(`⚠️ Canvas #${canvasId} não encontrado no DOM`);
          return;
        }

        console.log('📈 Criando gráfico no canvas:', canvasId);

        if (this.chart) {
          this.chart.destroy();
          this.chart = null;
        }

        const dadosGrafico = this.prepararDadosGrafico();

        // Agora 'dadosGrafico.valores' é 'number[]', então '.every' existe.
        if (!dadosGrafico.labels || dadosGrafico.labels.length === 0 || dadosGrafico.valores.every(v => v === 0)) {
            console.warn("⚠️ Sem dados válidos (ou todos são zero) para desenhar o gráfico.");
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
                ticks: {
                  font: { size: 11, weight: 600 },
                  color: '#4a5568',
                  precision: 0 // Mantém a correção de auto-escala
                }
              }
            }
          }
        };

        try {
            this.chart = new Chart(canvas, config);
            console.log('✅ Gráfico criado com sucesso!');
        } catch (error) {
            console.error("❌ Erro ao criar instância do Chart.js:", error);
            if(this.chart) { this.chart.destroy(); this.chart = null; }
        }
     }, 50);
  }

  /**
   * Prepara dados REAIS do backend (lógica original)
   * ✅ Tipado o retorno como 'GraficoData'
   */
  private prepararDadosGrafico(): GraficoData {
    console.log('🔧 Preparando dados REAIS do gráfico...');
    let labels: string[] = [];
    let valores: number[] = [];
    let cores: string[] = [];

    const dadosFonte = this.isPerito() ? this.estatisticas?.minhas_ocorrencias : this.estatisticas?.geral;

    if (!dadosFonte) {
        console.warn("⚠️ Dados fonte para o gráfico não encontrados.");
        return { labels, valores, cores }; // Retorna objeto válido
    }

    if (this.isPerito()) {
      labels = ['Em Análise', 'Finalizadas', 'Atrasadas'];
      valores = [ dadosFonte.em_analise || 0, dadosFonte.finalizadas || 0, dadosFonte.atrasadas || 0 ];
      cores = [ 'rgba(255, 152, 0, 0.7)', 'rgba(40, 167, 69, 0.7)', 'rgba(220, 53, 69, 0.7)' ];
    } else if (this.isAdminOrOperacional()) {
      labels = ['Aguardando', 'Em Análise', 'Finalizadas', 'Atrasadas'];
      valores = [ dadosFonte.aguardando || 0, dadosFonte.em_analise || 0, dadosFonte.finalizadas || 0, dadosFonte.atrasadas || 0 ];
      cores = [ 'rgba(49, 130, 206, 0.7)', 'rgba(255, 152, 0, 0.7)', 'rgba(40, 167, 69, 0.7)', 'rgba(220, 53, 69, 0.7)' ];
    }

    console.log('✅ Dados REAIS preparados:', { labels, valores });
    return { labels, valores, cores };
  }

  // ========== MÉTODOS AUXILIARES ORIGINAIS ==========

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
