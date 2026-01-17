import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// IMPORTAÇÕES DO SERVIÇO (Estrutura Nova - Dinâmica)
import {
  DashboardCriminalService,
  DashboardCriminalResponse,
  FiltrosDashboard,
  MatrizDiaTurnoItem,
  MesItem,
  ClassificacaoItem,
  BairroItem,
  CidadeItem,
  DiaSemanaItem,
  TurnoItem,
  CardCategoria
} from '../../services/dashboard-criminal.service';

import { ClassificacaoOcorrenciaService } from '../../services/classificacao-ocorrencia.service';
import { CidadeService } from '../../services/cidade.service';

// Registrar componentes do Chart.js
Chart.register(...registerables);

interface DropdownItem {
  id: number;
  nome: string;
  codigo?: string;
}

@Component({
  selector: 'app-dashboard-criminal',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './dashboard-criminal.component.html',
  styleUrls: ['./dashboard-criminal.component.scss']
})
export class DashboardCriminalComponent implements OnInit, OnDestroy, AfterViewInit {

  // Referência ao container do dashboard para captura
  @ViewChild('dashboardContent') dashboardContent!: ElementRef;

  // Dados do dashboard
  dashboard: DashboardCriminalResponse | null = null;

  // Filtros
  filtros: FiltrosDashboard = {
    data_inicio: '',
    data_fim: '',
    classificacao_id: undefined,
    cidade_id: undefined,
    bairro: ''
  };

  // Dropdowns
  classificacoes: DropdownItem[] = [];
  cidades: DropdownItem[] = [];

  // Estados
  isLoading = false;
  isExportingPDF = false;

  // Card expandido (para drill-down)
  cardExpandido: number | null = null;

  // Gráficos
  private chartLinha: Chart | null = null;
  private chartDonut: Chart | null = null;
  private chartBarrasBairros: Chart | null = null;
  private chartBarrasCidades: Chart | null = null;

  // Matriz processada para exibição no HTML
  matrizProcessada: { [dia: string]: { [turno: string]: number } } = {};
  diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  turnos = ['00h-04h', '04h-08h', '08h-12h', '12h-16h', '16h-20h', '20h-00h'];

  // Cores para os cards (rotativas)
  coresCards = [
    'danger',
    'warning',
    'purple',
    'teal',
    'slate',
    'info',
    'critical',
    'secondary',
  ];

  // Ícones para os cards (baseado em palavras-chave do nome)
  iconesCards: { [key: string]: string } = {
    'vida': 'bi-heart-pulse-fill',
    'homicídio': 'bi-heart-pulse-fill',
    'morte': 'bi-heart-pulse-fill',
    'patrimônio': 'bi-house-lock-fill',
    'furto': 'bi-house-lock-fill',
    'roubo': 'bi-house-lock-fill',
    'trânsito': 'bi-car-front-fill',
    'acidente': 'bi-cone-striped',
    'químico': 'bi-capsule',
    'droga': 'bi-capsule',
    'entorpecente': 'bi-capsule',
    'balística': 'bi-crosshair',
    'arma': 'bi-crosshair',
    'biológico': 'bi-droplet-fill',
    'dna': 'bi-droplet-fill',
    'genético': 'bi-droplet-fill',
    'default': 'bi-folder-fill'
  };

  constructor(
    private dashboardService: DashboardCriminalService,
    private classificacaoService: ClassificacaoOcorrenciaService,
    private cidadeService: CidadeService
  ) { }

  ngOnInit(): void {
    this.loadDropdowns();
    this.loadDashboard();
  }

  ngAfterViewInit(): void {
    // Gráficos inicializam após os dados chegarem
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  // ==========================================
  // CARREGAR DADOS
  // ==========================================

  loadDropdowns(): void {
    this.classificacaoService.getAllForDropdown().subscribe({
      next: (data: any) => this.classificacoes = data,
      error: (err: any) => console.error('Erro ao carregar classificações:', err)
    });

    this.cidadeService.getAllForDropdown().subscribe({
      next: (data: any) => this.cidades = data,
      error: (err: any) => console.error('Erro ao carregar cidades:', err)
    });
  }

  loadDashboard(): void {
    this.isLoading = true;

    const filtrosLimpos = this.prepararFiltros();

    this.dashboardService.getDashboard(filtrosLimpos).subscribe({
      next: (data: DashboardCriminalResponse) => {
        this.dashboard = data;

        // Processa a matriz
        if (data.graficos && data.graficos.matriz_dia_turno) {
          this.processarMatrizDiaTurno(data.graficos.matriz_dia_turno);
        }

        this.isLoading = false;

        // Aguardar o DOM atualizar antes de criar os gráficos
        setTimeout(() => {
          this.criarGraficos();
        }, 100);
      },
      error: (err: any) => {
        console.error('Erro ao carregar dashboard:', err);
        this.isLoading = false;
      }
    });
  }

  private prepararFiltros(): FiltrosDashboard {
    const filtrosLimpos: FiltrosDashboard = {};

    if (this.filtros.data_inicio && this.filtros.data_inicio.trim() !== '') {
      filtrosLimpos.data_inicio = this.filtros.data_inicio;
    }
    if (this.filtros.data_fim && this.filtros.data_fim.trim() !== '') {
      filtrosLimpos.data_fim = this.filtros.data_fim;
    }
    if (this.filtros.classificacao_id != null) {
      filtrosLimpos.classificacao_id = this.filtros.classificacao_id;
    }
    if (this.filtros.cidade_id != null) {
      filtrosLimpos.cidade_id = this.filtros.cidade_id;
    }
    if (this.filtros.bairro && this.filtros.bairro.trim() !== '') {
      filtrosLimpos.bairro = this.filtros.bairro.trim();
    }

    return filtrosLimpos;
  }

  aplicarFiltros(): void {
    this.loadDashboard();
  }

  limparFiltros(): void {
    this.filtros = {
      data_inicio: '',
      data_fim: '',
      classificacao_id: undefined,
      cidade_id: undefined,
      bairro: ''
    };
    this.loadDashboard();
  }

  // ==========================================
  // CARDS DINÂMICOS - HELPERS
  // ==========================================

  getCorCard(index: number): string {
    return this.coresCards[index % this.coresCards.length];
  }

  getIconeCard(nome: string): string {
    const nomeLower = nome.toLowerCase();

    for (const [chave, icone] of Object.entries(this.iconesCards)) {
      if (nomeLower.includes(chave)) {
        return icone;
      }
    }

    return this.iconesCards['default'];
  }

  toggleExpandir(cardId: number): void {
    if (this.cardExpandido === cardId) {
      this.cardExpandido = null;
    } else {
      this.cardExpandido = cardId;
    }
  }

  isExpandido(cardId: number): boolean {
    return this.cardExpandido === cardId;
  }

  // ==========================================
  // PROCESSAR MATRIZ DIA x TURNO
  // ==========================================

  private processarMatrizDiaTurno(matriz: MatrizDiaTurnoItem[]): void {
    this.matrizProcessada = {};

    this.diasSemana.forEach(dia => {
      this.matrizProcessada[dia] = {};
      this.turnos.forEach(turno => {
        this.matrizProcessada[dia][turno] = 0;
      });
    });

    if (!matriz) return;

    matriz.forEach(item => {
      if (this.matrizProcessada[item.dia] && this.turnos.includes(item.turno)) {
        this.matrizProcessada[item.dia][item.turno] = item.quantidade;
      }
    });
  }

  getIntensidadeClasse(quantidade: number): string {
    if (quantidade === 0) return 'intensidade-zero';
    if (quantidade <= 2) return 'intensidade-baixa';
    if (quantidade <= 5) return 'intensidade-media';
    if (quantidade <= 10) return 'intensidade-alta';
    return 'intensidade-critica';
  }

  getTotalDia(dia: string): number {
    if (!this.matrizProcessada[dia]) return 0;
    return Object.values(this.matrizProcessada[dia]).reduce((a, b) => a + b, 0);
  }

  getTotalTurno(turno: string): number {
    let total = 0;
    this.diasSemana.forEach(dia => {
      if (this.matrizProcessada[dia] && this.matrizProcessada[dia][turno]) {
        total += this.matrizProcessada[dia][turno];
      }
    });
    return total;
  }

  getTotalGeral(): number {
    let total = 0;
    this.diasSemana.forEach(dia => {
      total += this.getTotalDia(dia);
    });
    return total;
  }

  // ==========================================
  // GRÁFICOS
  // ==========================================

  private destroyCharts(): void {
    if (this.chartLinha) { this.chartLinha.destroy(); this.chartLinha = null; }
    if (this.chartDonut) { this.chartDonut.destroy(); this.chartDonut = null; }
    if (this.chartBarrasBairros) { this.chartBarrasBairros.destroy(); this.chartBarrasBairros = null; }
    if (this.chartBarrasCidades) { this.chartBarrasCidades.destroy(); this.chartBarrasCidades = null; }
  }

  private criarGraficos(): void {
    if (!this.dashboard || !this.dashboard.graficos) return;

    this.destroyCharts();

    this.criarGraficoLinha();
    this.criarGraficoDonut();
    this.criarGraficoBarrasBairros();
    this.criarGraficoBarrasCidades();
  }

  private criarGraficoLinha(): void {
    const canvas = document.getElementById('chartLinha') as HTMLCanvasElement;
    if (!canvas || !this.dashboard?.graficos?.por_mes) return;

    const dados = this.dashboard.graficos.por_mes;

    this.chartLinha = new Chart(canvas, {
      type: 'line',
      data: {
        labels: dados.map((d: MesItem) => d.mes_nome),
        datasets: [{
          label: 'Ocorrências',
          data: dados.map((d: MesItem) => d.quantidade),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#3b82f6',
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  private criarGraficoDonut(): void {
    const canvas = document.getElementById('chartDonut') as HTMLCanvasElement;
    if (!canvas || !this.dashboard?.graficos?.por_classificacao) return;

    const dados = this.dashboard.graficos.por_classificacao.slice(0, 5);
    const cores = ['#ef4444', '#f97316', '#eab308', '#8b5cf6', '#6b7280'];

    this.chartDonut = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: dados.map((d: ClassificacaoItem) => d.nome),
        datasets: [{
          data: dados.map((d: ClassificacaoItem) => d.quantidade),
          backgroundColor: cores,
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        cutout: '70%'
      }
    });
  }

  private criarGraficoBarrasBairros(): void {
    const canvas = document.getElementById('chartBarrasBairros') as HTMLCanvasElement;
    if (!canvas || !this.dashboard?.graficos?.por_bairro) return;

    const dados = this.dashboard.graficos.por_bairro.slice(0, 10);

    this.chartBarrasBairros = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: dados.map((d: BairroItem) => this.truncarTexto(d.bairro, 20)),
        datasets: [{
          label: 'Ocorrências',
          data: dados.map((d: BairroItem) => d.quantidade),
          backgroundColor: '#3b82f6',
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
          y: { grid: { display: false } }
        }
      }
    });
  }

  private criarGraficoBarrasCidades(): void {
    const canvas = document.getElementById('chartBarrasCidades') as HTMLCanvasElement;
    if (!canvas || !this.dashboard?.graficos?.por_cidade) return;

    const dados = this.dashboard.graficos.por_cidade.slice(0, 10);

    this.chartBarrasCidades = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: dados.map((d: CidadeItem) => d.cidade),
        datasets: [{
          label: 'Ocorrências',
          data: dados.map((d: CidadeItem) => d.quantidade),
          backgroundColor: '#8b5cf6',
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
          y: { grid: { display: false } }
        }
      }
    });
  }

  private truncarTexto(texto: string, max: number): string {
    if (!texto) return '';
    if (texto.length <= max) return texto;
    return texto.substring(0, max) + '...';
  }

  exportarPDF(): void {
    this.isExportingPDF = true;

    // Elementos a capturar separadamente
    const containerPrincipal = document.querySelector('.dashboard-container') as HTMLElement;
    const matrizCard = document.querySelector('.matriz-card') as HTMLElement;
    const linkMapaCard = document.querySelector('.link-mapa-card') as HTMLElement;

    if (!containerPrincipal) {
      console.error('Elemento não encontrado');
      this.isExportingPDF = false;
      return;
    }

    // Esconde temporariamente a matriz e link para capturar só a parte 1
    if (matrizCard) matrizCard.style.display = 'none';
    if (linkMapaCard) linkMapaCard.style.display = 'none';

    // Configurações do html2canvas
    const configCanvas = {
      scale: 1.5,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#f7fafc',
      logging: false,
      imageTimeout: 0,
      removeContainer: true
    };

    // PÁGINA 1: Captura tudo menos matriz e insights
    html2canvas(containerPrincipal, configCanvas).then(canvas1 => {

      // Restaura elementos escondidos
      if (matrizCard) matrizCard.style.display = '';
      if (linkMapaCard) linkMapaCard.style.display = '';

      const imgData1 = canvas1.toDataURL('image/jpeg', 0.85);

      // Criar PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 5;
      const contentWidth = pdfWidth - (margin * 2);

      // Calcular dimensões da imagem 1
      const img1Width = canvas1.width;
      const img1Height = canvas1.height;
      const ratio1 = contentWidth / img1Width;
      const img1ScaledHeight = img1Height * ratio1;

      // Adiciona página 1 (cards e gráficos)
      pdf.addImage(imgData1, 'JPEG', margin, margin, contentWidth, img1ScaledHeight);

      // PÁGINA 2: Captura só a matriz e insights
      if (matrizCard) {
        // Criar container temporário só com matriz
        const tempContainer = document.createElement('div');
        tempContainer.style.background = '#f7fafc';
        tempContainer.style.padding = '20px';
        tempContainer.style.width = containerPrincipal.offsetWidth + 'px';

        // Clona a matriz e link
        const matrizClone = matrizCard.cloneNode(true) as HTMLElement;
        tempContainer.appendChild(matrizClone);

        if (linkMapaCard) {
          const linkClone = linkMapaCard.cloneNode(true) as HTMLElement;
          linkClone.style.marginTop = '20px';
          tempContainer.appendChild(linkClone);
        }

        document.body.appendChild(tempContainer);

        html2canvas(tempContainer, configCanvas).then(canvas2 => {
          document.body.removeChild(tempContainer);

          const imgData2 = canvas2.toDataURL('image/jpeg', 0.85);

          // Adiciona página 2
          pdf.addPage();

          const img2Width = canvas2.width;
          const img2Height = canvas2.height;
          const ratio2 = contentWidth / img2Width;
          const img2ScaledHeight = img2Height * ratio2;

          pdf.addImage(imgData2, 'JPEG', margin, margin, contentWidth, img2ScaledHeight);

          // Adicionar rodapé em todas as páginas
          this.adicionarRodapePDF(pdf, pdfWidth, pdfHeight);

          // Salvar
          this.salvarPDF(pdf);

        }).catch(error => {
          console.error('Erro na página 2:', error);
          // Mesmo com erro na página 2, salva o que tem
          this.adicionarRodapePDF(pdf, pdfWidth, pdfHeight);
          this.salvarPDF(pdf);
        });

      } else {
        // Se não tem matriz, salva só com página 1
        this.adicionarRodapePDF(pdf, pdfWidth, pdfHeight);
        this.salvarPDF(pdf);
      }

    }).catch(error => {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
      this.isExportingPDF = false;

      // Restaura elementos caso dê erro
      if (matrizCard) matrizCard.style.display = '';
      if (linkMapaCard) linkMapaCard.style.display = '';
    });
  }

  // Método auxiliar: Adiciona rodapé
  private adicionarRodapePDF(pdf: jsPDF, pdfWidth: number, pdfHeight: number): void {
    const totalPages = pdf.getNumberOfPages();

    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(150);

      const agora = new Date();
      const dataHora = agora.toLocaleString('pt-BR');

      pdf.text(
        `Gerado em: ${dataHora} | Página ${i} de ${totalPages}`,
        pdfWidth / 2,
        pdfHeight - 5,
        { align: 'center' }
      );
    }
  }

  // Método auxiliar: Salva o PDF
  private salvarPDF(pdf: jsPDF): void {
    const hoje = new Date();
    const dataFormatada = hoje.toISOString().split('T')[0];
    const nomeArquivo = `dashboard-criminal-${dataFormatada}.pdf`;

    pdf.save(nomeArquivo);
    this.isExportingPDF = false;
  }
  // ==========================================
  // INSIGHTS AUTOMÁTICOS
  // ==========================================

  getInsights(): string[] {
    if (!this.dashboard || !this.dashboard.graficos) return [];

    const graficos = this.dashboard.graficos;
    const resumo = this.dashboard.resumo;
    const cards = this.dashboard.cards;
    const insights: string[] = [];

    // Categoria mais frequente
    if (cards && cards.length > 0) {
      const categoriaPrincipal = cards[0];
      insights.push(`<strong>Categoria mais frequente:</strong> ${categoriaPrincipal.nome} com ${categoriaPrincipal.quantidade} ocorrências (${categoriaPrincipal.percentual}%)`);
    }

    // Dia mais crítico
    if (graficos.por_dia_semana && graficos.por_dia_semana.length > 0) {
      const diaMaisPerigoso = graficos.por_dia_semana.reduce((prev: DiaSemanaItem, current: DiaSemanaItem) =>
        (prev.quantidade > current.quantidade) ? prev : current
      );
      insights.push(`<strong>Dia mais crítico:</strong> ${diaMaisPerigoso.dia} com ${diaMaisPerigoso.quantidade} ocorrências`);
    }

    // Turno mais crítico
    if (graficos.por_turno && graficos.por_turno.length > 0) {
      const turnoMaisPerigoso = graficos.por_turno.reduce((prev: TurnoItem, current: TurnoItem) =>
        (prev.quantidade > current.quantidade) ? prev : current
      );
      insights.push(`<strong>Turno mais crítico:</strong> ${turnoMaisPerigoso.turno} com ${turnoMaisPerigoso.quantidade} ocorrências`);
    }

    // Cidade concentradora
    if (graficos.por_cidade && graficos.por_cidade.length > 0 && resumo) {
      const cidadePrincipal = graficos.por_cidade[0];
      const total = resumo.total_ocorrencias || 1;
      const percentual = total > 0 ? ((cidadePrincipal.quantidade / total) * 100).toFixed(0) : '0';
      insights.push(`<strong>${cidadePrincipal.cidade}</strong> concentra ${percentual}% das ocorrências`);
    }

    // Bairro mais crítico
    if (graficos.por_bairro && graficos.por_bairro.length > 0) {
      const bairroPrincipal = graficos.por_bairro[0];
      insights.push(`<strong>Bairro mais afetado:</strong> ${bairroPrincipal.bairro} com ${bairroPrincipal.quantidade} ocorrências`);
    }

    return insights;
  }
}
