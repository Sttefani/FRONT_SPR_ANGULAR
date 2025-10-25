import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { OcorrenciaService } from '../../services/ocorrencia.service';
import { ServicoPericialService } from '../../services/servico-pericial.service';
import { Chart, registerables } from 'chart.js';

// Registrar componentes do Chart.js
Chart.register(...registerables);

@Component({
  selector: 'app-dashboard-inicial',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
  private chart: Chart | null = null;

  constructor(
    private authService: AuthService,
    private ocorrenciaService: OcorrenciaService,
    private servicoPericialService: ServicoPericialService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    console.log('🔍 Current User:', this.currentUser);
    console.log('🔍 Perfil:', this.currentUser?.perfil);
    console.log('🔍 Servicos Periciais:', this.currentUser?.servicos_periciais);

    this.loadServicos();
    this.loadEstatisticas();
  }

  ngAfterViewInit(): void {
    // Aguardar o DOM estar pronto antes de criar o gráfico
    setTimeout(() => {
      this.criarGrafico();
    }, 500);
  }

  ngOnDestroy(): void {
    // Limpar gráfico ao destruir componente
    if (this.chart) {
      this.chart.destroy();
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
    console.log('📌 mostrarFiltroServico():', resultado);
    console.log('📌 servicosDisponiveis.length:', this.servicosDisponiveis.length);
    return resultado;
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
        console.log('📊 Estatísticas carregadas:', this.estatisticas);

        // Recriar gráfico com novos dados
        setTimeout(() => {
          this.criarGrafico();
        }, 100);
      },
      error: (err) => {
        console.error('Erro ao carregar estatísticas:', err);
        this.isLoading = false;
      }
    });
  }

  onServicoChange(): void {
    console.log('📌 Serviço alterado para:', this.servicoSelecionado);
    this.loadEstatisticas();
  }

  /**
   * Cria o gráfico de BARRAS com os dados REAIS do backend
   */
  private criarGrafico(): void {
    if (!this.estatisticas || this.isLoading) {
      console.log('⏳ Aguardando estatísticas para criar gráfico...');
      return;
    }

    // Determinar qual canvas usar baseado no perfil
    const canvasId = this.isPerito() ? 'chartPerito' : 'chartAdmin';
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;

    if (!canvas) {
      console.warn(`⚠️ Canvas #${canvasId} não encontrado no DOM`);
      return;
    }

    console.log('📈 Criando gráfico no canvas:', canvasId);

    // Destruir gráfico anterior se existir
    if (this.chart) {
      this.chart.destroy();
    }

    // Preparar dados REAIS do backend
    const dadosGrafico = this.prepararDadosGrafico();

    // Configuração do gráfico de BARRAS
    this.chart = new Chart(canvas, {
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
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleFont: {
              size: 13,
              weight: 'bold'
            },
            bodyFont: {
              size: 12
            },
            padding: 12,
            callbacks: {
              label: (context) => {
                return ` ${context.parsed.y} ocorrências`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              font: {
                size: 10,
                weight: 600
              },
              color: '#4a5568'
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.05)',
              lineWidth: 1
            },
            ticks: {
              font: {
                size: 11,
                weight: 600
              },
              color: '#4a5568',
              stepSize: 1,
              callback: (value) => {
                if (Number.isInteger(value)) {
                  return value;
                }
                return '';
              }
            }
          }
        }
      }
    });

    console.log('✅ Gráfico criado com sucesso!');
  }

  /**
   * Prepara dados REAIS do backend (sem simulação)
   */
  private prepararDadosGrafico(): any {
    console.log('🔧 Preparando dados REAIS do gráfico...');

    let labels: string[] = [];
    let valores: number[] = [];
    let cores: string[] = [];

    if (this.isPerito() && this.estatisticas.minhas_ocorrencias) {
      // PERITO: Distribuição das minhas ocorrências
      const dados = this.estatisticas.minhas_ocorrencias;

      labels = ['Em Análise', 'Finalizadas', 'Atrasadas'];
      valores = [
        dados.em_analise || 0,
        dados.finalizadas || 0,
        dados.atrasadas || 0
      ];
      cores = [
        'rgba(255, 152, 0, 0.7)',  // Laranja
        'rgba(40, 167, 69, 0.7)',  // Verde
        'rgba(220, 53, 69, 0.7)'   // Vermelho
      ];

    } else if (this.isAdminOrOperacional() && this.estatisticas.geral) {
      // ADMIN/OPERACIONAL: Distribuição geral
      const dados = this.estatisticas.geral;

      labels = ['Aguardando', 'Em Análise', 'Finalizadas', 'Atrasadas'];
      valores = [
        dados.aguardando || 0,
        dados.em_analise || 0,
        dados.finalizadas || 0,
        dados.atrasadas || 0
      ];
      cores = [
        'rgba(49, 130, 206, 0.7)',  // Azul
        'rgba(255, 152, 0, 0.7)',   // Laranja
        'rgba(40, 167, 69, 0.7)',   // Verde
        'rgba(220, 53, 69, 0.7)'    // Vermelho
      ];
    }

    console.log('✅ Dados REAIS preparados:', { labels, valores });

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
