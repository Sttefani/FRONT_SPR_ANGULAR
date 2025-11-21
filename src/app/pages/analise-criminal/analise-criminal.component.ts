import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import 'leaflet.heat';
import 'leaflet.markercluster'; // Importa o MarkerCluster
import { forkJoin } from 'rxjs';

import { AnaliseCriminalService, EstatisticaCriminal, OcorrenciaGeo } from '../../services/analise-criminal.service';
import { ClassificacaoOcorrenciaService } from '../../services/classificacao-ocorrencia.service';
import { CidadeService } from '../../services/cidade.service';

interface DropdownItem {
  id: number;
  nome: string;
  codigo?: string;
}

@Component({
  selector: 'app-analise-criminal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './analise-criminal.component.html',
  styleUrls: ['./analise-criminal.component.scss'] // Verifique se os @import do markercluster estão aqui ou em styles.scss
})
export class AnaliseCriminalComponent implements OnInit {
  // Mapa
  private map: L.Map | null = null;
  private heatLayer: L.Layer | null = null;

  // Usa o MarkerClusterGroup
  private markersLayer: L.MarkerClusterGroup = L.markerClusterGroup();

  // Dados
  ocorrenciasGeo: OcorrenciaGeo[] = [];
  estatisticas: EstatisticaCriminal | null = null;

  // Filtros
  filtros = {
    data_inicio: '', data_fim: '', classificacao_id: null as number | null,
    cidade_id: null as number | null, bairro: ''
  };

  // Dropdowns
  classificacoes: DropdownItem[] = [];
  cidades: DropdownItem[] = [];

  // Estados
  isLoading = false;
  visualizacao: 'heatmap' | 'markers' = 'heatmap';
  loadingStep = 0;
  semResultados = false;

  constructor(
    private analiseService: AnaliseCriminalService,
    private classificacaoService: ClassificacaoOcorrenciaService,
    private cidadeService: CidadeService
  ) { }

  ngOnInit(): void {
    this.loadDropdowns();
    this.loadDados();
  }

  loadDropdowns(): void {
    this.classificacaoService.getAllForDropdown().subscribe({
      next: (data) => this.classificacoes = data,
      error: (err) => console.error('Erro ao carregar classificações:', err)
    });

    this.cidadeService.getAllForDropdown().subscribe({
      next: (data) => this.cidades = data,
      error: (err) => console.error('Erro ao carregar cidades:', err)
    });
  }

  loadDados(): void {
    this.isLoading = true;
    this.semResultados = false;
    this.loadingStep = 1;
    if (this.map) {
      this.map.remove();
      this.map = null;
    }

    const estatisticas$ = this.analiseService.getEstatisticas(this.filtros);
    const ocorrenciasGeo$ = this.analiseService.getOcorrenciasGeo(this.filtros);

    this.loadingStep = 2;
    forkJoin([estatisticas$, ocorrenciasGeo$]).subscribe({
      next: ([estatisticasData, ocorrenciasData]) => {

        // =================================================================
        // TESTE 1: DADOS DA API
        // =================================================================
        console.log("--- TESTE 1: DADOS DA API ---");
        console.log(`Total de ocorrências GEO recebidas: ${ocorrenciasData.length}`);
        console.log("Dados brutos recebidos (Clique para expandir e ver o 'endereco'):", ocorrenciasData);
        console.log("-------------------------------");
        // =================================================================

        this.estatisticas = estatisticasData;
        this.ocorrenciasGeo = ocorrenciasData;
        this.loadingStep = 3;
        this.isLoading = false;

        if (ocorrenciasData.length === 0) {
          this.semResultados = true;
        }

        this.waitForMapContainerAndInit();
      },
      error: (err) => {
        console.error('Erro ao carregar dados da análise:', err);
        this.isLoading = false;
        this.loadingStep = 0;
      }
    });
  }

  private waitForMapContainerAndInit(tries = 0): void {
    const mapContainer = document.getElementById('map');
    if (mapContainer) {
      this.initMap();
      this.atualizarMapa();
      this.loadingStep = 0;
      return;
    }
    if (tries > 50) {
      console.error('FATAL: O contêiner do mapa #map não foi encontrado no DOM.');
      this.loadingStep = 0;
      return;
    }
    requestAnimationFrame(() => this.waitForMapContainerAndInit(tries + 1));
  }

  initMap(): void {
    if (this.map) return;
    this.map = L.map('map', { center: [2.8235, -60.6758], zoom: 13 });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors', maxZoom: 18,
    }).addTo(this.map);

    // Inicializa o cluster group mas NÃO adiciona ao mapa ainda
    this.markersLayer = L.markerClusterGroup({
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      chunkedLoading: true
    });
    // Não adiciona ao mapa aqui
  }

  atualizarMapa(): void {
    if (!this.map) {
      console.error("Mapa não inicializado!");
      return;
    }

    // ✅✅✅ LÓGICA DE LIMPEZA REFINADA ✅✅✅
    // 1. Remove layers DO MAPA
    if (this.heatLayer && this.map.hasLayer(this.heatLayer)) {
      console.log("Removendo heatLayer do mapa.");
      this.map.removeLayer(this.heatLayer);
    }
    if (this.map.hasLayer(this.markersLayer)) {
      console.log("Removendo markersLayer do mapa.");
      this.map.removeLayer(this.markersLayer);
    }
    // 2. Limpa os DADOS dos layers
    this.markersLayer.clearLayers(); // Limpa dados do cluster
    this.heatLayer = null; // Destroi a referência do heatmap


    // =================================================================
    // TESTE 2: DENTRO DO ATUALIZAR MAPA
    // =================================================================
    console.log(`--- TESTE 2: DENTRO DO atualizarMapa ---`);
    console.log(`this.ocorrenciasGeo (ANTES do filtro): ${this.ocorrenciasGeo.length} itens`);
    // =================================================================

    // Filtra os pontos que têm coordenadas válidas
    const ocorrenciasFiltradas = this.ocorrenciasGeo
      .filter(o => o.endereco?.latitude && o.endereco?.longitude);

    // =================================================================
    // TESTE 3: O PONTO CRÍTICO
    // =================================================================
    console.log(`--- TESTE 3: O PONTO CRÍTICO ---`);
    console.log(`Ocorrências (DEPOIS do filtro de lat/lng): ${ocorrenciasFiltradas.length} itens`);
    console.log("-------------------------------");
    // =================================================================

    if (ocorrenciasFiltradas.length === 0) {
      console.log("RESULTADO: Nenhuma ocorrência com coordenadas válidas. Mapa ficará em branco.");
      this.map.setView([2.8235, -60.6758], 13);
      return;
    }

    // Arredonda os pontos (necessário para ambos os modos)
    const points = ocorrenciasFiltradas.map(o => {
      const lat = Number(Number(o.endereco!.latitude).toFixed(4));
      const lng = Number(Number(o.endereco!.longitude).toFixed(4));
      return [lat, lng, 1]; // Intensidade 1 para heatmap
    });

    // Agora, decide qual layer mostrar e ADICIONA AO MAPA
    if (this.visualizacao === 'heatmap') {
      console.log("Modo Heatmap: Criando e adicionando heatLayer AO MAPA.");
      this.heatLayer = L.heatLayer(points as L.HeatLatLngTuple[], {
        radius: 35,
        blur: 30,
        gradient: { 0.0: 'blue', 0.5: 'lime', 1.0: 'red' }
      }).addTo(this.map); // Adiciona diretamente ao mapa

    } else { // visualizacao === 'markers'
      console.log("Modo Markers: Criando marcadores...");
      // Cria marcadores em lote
      const markersToAdd: L.Marker[] = [];
      const icon = this.createLeafletIcon();

      ocorrenciasFiltradas.forEach(o => {
        const lat = Number(Number(o.endereco!.latitude).toFixed(4));
        const lng = Number(Number(o.endereco!.longitude).toFixed(4));
        const popupContent = this.createPopupContent(o);
        const marker = L.marker([lat, lng], { icon: icon })
          .bindPopup(popupContent);
        markersToAdd.push(marker);
      });

      console.log(`Modo Markers: Adicionando ${markersToAdd.length} marcadores ao cluster.`);
      this.markersLayer.addLayers(markersToAdd); // Adiciona DADOS ao cluster

      console.log("Modo Markers: Adicionando cluster layer AO MAPA.");
      this.map.addLayer(this.markersLayer); // Adiciona o cluster (com os dados) AO MAPA
    }

    // Lógica do fitBounds (zoom automático)
    const isFiltered = this.filtros.cidade_id != null ||
      this.filtros.classificacao_id != null ||
      (this.filtros.data_inicio && this.filtros.data_inicio !== '') ||
      (this.filtros.data_fim && this.filtros.data_fim !== '') ||
      (this.filtros.bairro && this.filtros.bairro.trim() !== '');

    // Aplica o fitBounds ou centraliza
    if (isFiltered) {
      console.log("Filtro aplicado, aplicando fitBounds.");
      // Usa os 'points' arredondados para calcular os limites
      const bounds = L.latLngBounds(points.map(p => [p[0], p[1]]));
      // Adiciona um pequeno buffer para garantir que todos os pontos sejam visíveis
      const bufferedBounds = bounds.pad(0.1); // 10% de buffer
      this.map.fitBounds(bufferedBounds, { padding: [50, 50] });
    } else {
      // Se não estiver filtrado, garante que o mapa esteja na visão inicial
      console.log("Nenhum filtro aplicado, centralizando na visão inicial.");
      this.map.setView([2.8235, -60.6758], 13);
    }
  }

  private createLeafletIcon(): L.Icon {
    return L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
  }

  private createPopupContent(ocorrencia: OcorrenciaGeo): string {
    const modoEntrada = ocorrencia.endereco?.modo_entrada === 'COORDENADAS_DIRETAS'
      ? '📍 GPS'
      : '🏠 Endereço';

    const coordsManuais = ocorrencia.endereco?.coordenadas_manuais
      ? '(Manual)'
      : '(Auto)';

    return `
      <div style="font-size: 12px;">
        <strong>${ocorrencia.numero_ocorrencia}</strong><br>
        <span style="color: #dc3545;">${ocorrencia.classificacao?.nome || 'N/A'}</span><br>
        ${ocorrencia.endereco?.logradouro || ''}, ${ocorrencia.endereco?.bairro || ''}<br>
        ${ocorrencia.data_fato || ''}<br>
        <small style="color: #6c757d;">${modoEntrada} ${coordsManuais}</small>
      </div>`;
  }

  aplicarFiltros(): void {
    this.loadDados();
  }

  limparFiltros(): void {
    this.filtros = {
      data_inicio: '', data_fim: '', classificacao_id: null,
      cidade_id: null, bairro: ''
    };
    this.loadDados();
  }

  alternarVisualizacao(): void {
    this.visualizacao = this.visualizacao === 'heatmap' ? 'markers' : 'heatmap';
    console.log(`Alternando visualização para: ${this.visualizacao}`); // Log extra
    this.atualizarMapa();
  }
}

