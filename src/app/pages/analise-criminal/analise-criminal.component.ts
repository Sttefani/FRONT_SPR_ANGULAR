import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  styleUrls: ['./analise-criminal.component.scss']
})
export class AnaliseCriminalComponent implements OnInit {
  private map: any = null;
  private heatLayer: any = null;
  private markersLayer: any = null;

  ocorrenciasGeo: OcorrenciaGeo[] = [];
  estatisticas: EstatisticaCriminal | null = null;

  filtros = {
    data_inicio: '', data_fim: '', classificacao_id: null as number | null,
    cidade_id: null as number | null, bairro: ''
  };

  classificacoes: DropdownItem[] = [];
  cidades: DropdownItem[] = [];

  isLoading = false;
  visualizacao: 'heatmap' | 'markers' = 'heatmap';
  loadingStep = 0;
  semResultados = false;

  private leafletPluginsLoaded = false;
  private leafletLoaded = false;

  constructor(
    private analiseService: AnaliseCriminalService,
    private classificacaoService: ClassificacaoOcorrenciaService,
    private cidadeService: CidadeService
  ) {}

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
      try { this.map.remove(); } catch (e) { /* ignore */ }
      this.map = null;
    }

    const estatisticas$ = this.analiseService.getEstatisticas(this.filtros);
    const ocorrenciasGeo$ = this.analiseService.getOcorrenciasGeo(this.filtros);

    this.loadingStep = 2;
    forkJoin([estatisticas$, ocorrenciasGeo$]).subscribe({
      next: ([estatisticasData, ocorrenciasData]) => {
        console.log("--- TESTE 1: DADOS DA API ---");
        console.log(`Total de ocorrências GEO recebidas: ${ocorrenciasData.length}`);
        console.log("Dados brutos recebidos:", ocorrenciasData);
        console.log("-------------------------------");

        this.estatisticas = estatisticasData;
        this.ocorrenciasGeo = ocorrenciasData;
        this.loadingStep = 3;
        this.isLoading = false;

        if (ocorrenciasData.length === 0) this.semResultados = true;

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
      this.initMap()
        .then(()=> this.atualizarMapa())
        .catch(err => console.error('Erro initMap/atualizarMapa:', err))
        .finally(()=> this.loadingStep = 0);
      return;
    }
    if (tries > 50) {
      console.error('FATAL: O contêiner do mapa #map não foi encontrado no DOM.');
      this.loadingStep = 0;
      return;
    }
    requestAnimationFrame(() => this.waitForMapContainerAndInit(tries + 1));
  }

  // Carrega leaflet e plugins dinamicamente em runtime (sem `import * as L`)
  private async ensureLeafletAndPlugins(): Promise<void> {
    if (!this.leafletLoaded) {
      try {
        // Import Leaflet dinamicamente
        const leafletModule = await import('leaflet');
        // alguns bundlers expõem no default, outros não -> normaliza
        const L = (leafletModule && (leafletModule.default ?? leafletModule)) as any;
        // garante que window.L exista (plugins esperam global L)
        (window as any).L = L;
        this.leafletLoaded = true;
      } catch (err) {
        console.error('Falha ao carregar leaflet dinamicamente:', err);
        throw err;
      }
    }

    if (!this.leafletPluginsLoaded) {
      try {
        // Imports dos plugins — eles executam side-effects e adicionam ao L
        await Promise.all([
          import('leaflet.markercluster'),
          import('leaflet.heat')
        ]);
        this.leafletPluginsLoaded = true;
      } catch (err) {
        console.error('Falha ao carregar plugins leaflet.markercluster/leaflet.heat:', err);
        // não throw para permitir fallback controlado; mas loga
        throw err;
      }
    }
  }

  // Inicializa o mapa após garantir L + plugins
  private async initMap(): Promise<void> {
    if (this.map) return;
    await this.ensureLeafletAndPlugins();

    const L = (window as any).L;
    if (!L) {
      throw new Error('Leaflet (L) não está disponível após import dinâmico.');
    }

    // Cria mapa
    this.map = L.map('map', { center: [2.8235, -60.6758], zoom: 13 });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors', maxZoom: 18,
    }).addTo(this.map);

    // Cria marker cluster (ou LayerGroup como fallback)
    if (typeof L.markerClusterGroup === 'function') {
      this.markersLayer = L.markerClusterGroup({
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        chunkedLoading: true
      });
    } else {
      console.warn('markerClusterGroup não disponível; usando LayerGroup como fallback.');
      this.markersLayer = L.layerGroup();
    }
  }

  async atualizarMapa(): Promise<void> {
    const L = (window as any).L;
    if (!this.map || !L) {
      console.error("Mapa ou Leaflet não inicializado!");
      return;
    }

    if (this.heatLayer && this.map.hasLayer(this.heatLayer)) this.map.removeLayer(this.heatLayer);
    if (this.markersLayer && this.map.hasLayer(this.markersLayer)) this.map.removeLayer(this.markersLayer);

    if (this.markersLayer && typeof this.markersLayer.clearLayers === 'function') {
      this.markersLayer.clearLayers();
    }
    this.heatLayer = null;

    console.log(`--- TESTE 2: DENTRO DO atualizarMapa ---`);
    console.log(`this.ocorrenciasGeo (ANTES do filtro): ${this.ocorrenciasGeo.length} itens`);

    const ocorrenciasFiltradas = this.ocorrenciasGeo.filter(o => o.endereco?.latitude && o.endereco?.longitude);

    console.log(`--- TESTE 3: O PONTO CRÍTICO ---`);
    console.log(`Ocorrências (DEPOIS do filtro de lat/lng): ${ocorrenciasFiltradas.length} itens`);

    if (ocorrenciasFiltradas.length === 0) {
      this.map.setView([2.8235, -60.6758], 13);
      return;
    }

    const points = ocorrenciasFiltradas.map(o => {
      const lat = Number(Number(o.endereco!.latitude).toFixed(4));
      const lng = Number(Number(o.endereco!.longitude).toFixed(4));
      return [lat, lng, 1];
    });

    if (this.visualizacao === 'heatmap') {
      if (typeof L.heatLayer === 'function') {
        this.heatLayer = L.heatLayer(points as any, { radius: 35, blur: 30, gradient: { 0.0: 'blue', 0.5: 'lime', 1.0: 'red' } })
                      .addTo(this.map);
      } else {
        console.warn('heatLayer não disponível; pulando heatmap.');
      }
    } else {
      // Garante markerCluster (re-tenta carregar se necessário)
      if (typeof L.markerClusterGroup !== 'function' && !this.leafletPluginsLoaded) {
        try {
          await import('leaflet.markercluster');
          this.leafletPluginsLoaded = true;
        } catch (err) {
          console.error('Falha ao (re)carregar leaflet.markercluster:', err);
        }
      }

      if (typeof L.markerClusterGroup === 'function') {
        this.markersLayer = L.markerClusterGroup({
          spiderfyOnMaxZoom: true,
          showCoverageOnHover: false,
          zoomToBoundsOnClick: true,
          chunkedLoading: true
        });
      } else {
        this.markersLayer = L.layerGroup();
      }

      const markersToAdd: any[] = [];
      const icon = this.createLeafletIcon();

      ocorrenciasFiltradas.forEach(o => {
        const lat = Number(Number(o.endereco!.latitude).toFixed(4));
        const lng = Number(Number(o.endereco!.longitude).toFixed(4));
        const popupContent = this.createPopupContent(o);
        const marker = L.marker([lat, lng], { icon }).bindPopup(popupContent);
        markersToAdd.push(marker);
      });

      if (typeof this.markersLayer.addLayers === 'function') {
        this.markersLayer.addLayers(markersToAdd);
      } else {
        // fallback: addLayer individual
        markersToAdd.forEach(m => this.markersLayer.addLayer ? this.markersLayer.addLayer(m) : null);
      }

      this.map.addLayer(this.markersLayer);
    }

    const isFiltered = this.filtros.cidade_id != null ||
                       this.filtros.classificacao_id != null ||
                       (this.filtros.data_inicio && this.filtros.data_inicio !== '') ||
                       (this.filtros.data_fim && this.filtros.data_fim !== '') ||
                       (this.filtros.bairro && this.filtros.bairro.trim() !== '');

    if (isFiltered) {
      const bounds = L.latLngBounds(points.map((p: any) => [p[0], p[1]]));
      this.map.fitBounds(bounds.pad(0.1), { padding: [50, 50] });
    } else {
      this.map.setView([2.8235, -60.6758], 13);
    }
  }

  private createLeafletIcon(): any {
    const L = (window as any).L;
    // Usa ícones padrão do Leaflet via URL (CDN)
    return L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
  }

  private createPopupContent(ocorrencia: OcorrenciaGeo): string {
    const modoEntrada = ocorrencia.endereco?.modo_entrada === 'COORDENADAS_DIRETAS' ? '📍 GPS' : '🏠 Endereço';
    const coordsManuais = ocorrencia.endereco?.coordenadas_manuais ? '(Manual)' : '(Auto)';

    return `
      <div style="font-size: 12px;">
        <strong>${ocorrencia.numero_ocorrencia}</strong><br>
        <span style="color: #dc3545;">${ocorrencia.classificacao?.nome || 'N/A'}</span><br>
        ${ocorrencia.endereco?.logradouro || ''}, ${ocorrencia.endereco?.bairro || ''}<br>
        ${ocorrencia.data_fato || ''}<br>
        <small style="color: #6c757d;">${modoEntrada} ${coordsManuais}</small>
      </div>`;
  }

  aplicarFiltros(): void { this.loadDados(); }

  limparFiltros(): void {
    this.filtros = { data_inicio: '', data_fim: '', classificacao_id: null, cidade_id: null, bairro: '' };
    this.loadDados();
  }

  async alternarVisualizacao(): Promise<void> {
    this.visualizacao = this.visualizacao === 'heatmap' ? 'markers' : 'heatmap';
    await this.atualizarMapa();
  }
}
