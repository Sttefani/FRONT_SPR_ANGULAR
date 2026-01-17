import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { AnaliseCriminalService, EstatisticaCriminal, OcorrenciaGeo } from '../../services/analise-criminal.service';
import { ClassificacaoOcorrenciaService } from '../../services/classificacao-ocorrencia.service';
import { CidadeService } from '../../services/cidade.service';
import { RouterModule } from '@angular/router';

interface DropdownItem {
  id: number;
  nome: string;
  codigo?: string;
}

@Component({
  selector: 'app-analise-criminal',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './analise-criminal.component.html',
  styleUrls: ['./analise-criminal.component.scss']
})
export class AnaliseCriminalComponent implements OnInit, OnDestroy {
  private map: any = null;
  private heatLayer: any = null;
  private markersLayer: any = null;

  ocorrenciasGeo: OcorrenciaGeo[] = [];
  estatisticas: EstatisticaCriminal | null = null;

  filtros = {
    data_inicio: '',
    data_fim: '',
    classificacao_id: undefined as number | undefined,
    cidade_id: undefined as number | undefined,
    bairro: ''
  };

  classificacoes: DropdownItem[] = [];
  cidades: DropdownItem[] = [];

  isLoading = false;
  visualizacao: 'heatmap' | 'markers' = 'heatmap';
  loadingStep = 0;
  semResultados = false;

  private leafletPluginsLoaded = false;
  private leafletLoaded = false;

  // ✅ Cache dos pontos filtrados para reutilizar na alternância
  private pontosCache: number[][] = [];

  constructor(
    private analiseService: AnaliseCriminalService,
    private classificacaoService: ClassificacaoOcorrenciaService,
    private cidadeService: CidadeService
  ) { }

  ngOnInit(): void {
    this.loadDropdowns();
    this.loadDados();
  }

  ngOnDestroy(): void {
    if (this.map) {
      try {
        this.map.remove();
      } catch (e) { /* ignore */ }
      this.map = null;
    }
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

  private prepararFiltros(): any {
    const filtrosLimpos: any = {};

    if (this.filtros.data_inicio && this.filtros.data_inicio.trim() !== '') {
      filtrosLimpos.data_inicio = this.filtros.data_inicio;
    }
    if (this.filtros.data_fim && this.filtros.data_fim.trim() !== '') {
      filtrosLimpos.data_fim = this.filtros.data_fim;
    }
    if (this.filtros.classificacao_id != null && this.filtros.classificacao_id !== undefined) {
      filtrosLimpos.classificacao_id = this.filtros.classificacao_id;
    }
    if (this.filtros.cidade_id != null && this.filtros.cidade_id !== undefined) {
      filtrosLimpos.cidade_id = this.filtros.cidade_id;
    }
    if (this.filtros.bairro && this.filtros.bairro.trim() !== '') {
      filtrosLimpos.bairro = this.filtros.bairro.trim();
    }

    console.log('Filtros preparados para envio:', filtrosLimpos);
    return filtrosLimpos;
  }

  loadDados(): void {
    this.isLoading = true;
    this.semResultados = false;
    this.loadingStep = 1;
    this.pontosCache = []; // Limpar cache

    // Limpar mapa existente
    if (this.map) {
      try {
        this.map.remove();
      } catch (e) { /* ignore */ }
      this.map = null;
      this.heatLayer = null;
      this.markersLayer = null;
    }

    const filtrosParaEnvio = this.prepararFiltros();
    const estatisticas$ = this.analiseService.getEstatisticas(filtrosParaEnvio);
    const ocorrenciasGeo$ = this.analiseService.getOcorrenciasGeo(filtrosParaEnvio);

    this.loadingStep = 2;
    forkJoin([estatisticas$, ocorrenciasGeo$]).subscribe({
      next: ([estatisticasData, ocorrenciasData]) => {
        console.log("--- DADOS DA API ---");
        console.log(`Total de ocorrências GEO recebidas: ${ocorrenciasData.length}`);

        if (ocorrenciasData.length > 0) {
          console.log("Exemplo de ocorrência:", JSON.stringify(ocorrenciasData[0], null, 2));
        }

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
      this.initMap()
        .then(() => this.atualizarMapa())
        .catch(err => console.error('Erro initMap/atualizarMapa:', err))
        .finally(() => this.loadingStep = 0);
      return;
    }
    if (tries > 50) {
      console.error('FATAL: O contêiner do mapa #map não foi encontrado no DOM.');
      this.loadingStep = 0;
      return;
    }
    requestAnimationFrame(() => this.waitForMapContainerAndInit(tries + 1));
  }

  private async ensureLeafletAndPlugins(): Promise<void> {
    if (!this.leafletLoaded) {
      try {
        const leafletModule = await import('leaflet');
        const L = (leafletModule && (leafletModule.default ?? leafletModule)) as any;
        (window as any).L = L;
        this.leafletLoaded = true;
      } catch (err) {
        console.error('Falha ao carregar leaflet dinamicamente:', err);
        throw err;
      }
    }

    if (!this.leafletPluginsLoaded) {
      try {
        await Promise.all([
          import('leaflet.markercluster'),
          import('leaflet.heat')
        ]);
        this.leafletPluginsLoaded = true;
      } catch (err) {
        console.error('Falha ao carregar plugins leaflet:', err);
        throw err;
      }
    }
  }

  private async initMap(): Promise<void> {
    if (this.map) return;
    await this.ensureLeafletAndPlugins();

    const L = (window as any).L;
    if (!L) {
      throw new Error('Leaflet (L) não está disponível após import dinâmico.');
    }

    this.map = L.map('map', { center: [2.8235, -60.6758], zoom: 13 });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(this.map);
  }

  atualizarMapa(): void {
    if (!this.map) {
      console.error("Mapa não inicializado!");
      return;
    }

    const L = (window as any).L;

    // ✅ CORREÇÃO 1: Limpar layers de forma mais robusta
    this.limparLayers();

    // Filtrar ocorrências com coordenadas válidas
    const ocorrenciasFiltradas = this.ocorrenciasGeo.filter(o => {
      const lat = o.endereco?.latitude;
      const lng = o.endereco?.longitude;
      const latValido = lat !== null && lat !== undefined && !isNaN(Number(lat)) && Number(lat) !== 0;
      const lngValido = lng !== null && lng !== undefined && !isNaN(Number(lng)) && Number(lng) !== 0;
      return latValido && lngValido;
    });

    console.log(`Ocorrências com coordenadas válidas: ${ocorrenciasFiltradas.length} de ${this.ocorrenciasGeo.length}`);

    if (ocorrenciasFiltradas.length === 0) {
      console.warn('Nenhuma ocorrência com coordenadas válidas encontrada.');
      this.map.setView([2.8235, -60.6758], 13);
      return;
    }

    // ✅ CORREÇÃO 2: Guardar pontos no cache para reutilizar na alternância
    this.pontosCache = ocorrenciasFiltradas.map(o => {
      const lat = Number(o.endereco!.latitude);
      const lng = Number(o.endereco!.longitude);
      return [lat, lng, 1];
    });

    console.log(`Pontos no cache: ${this.pontosCache.length}`);

    // Renderizar conforme modo de visualização
    if (this.visualizacao === 'heatmap') {
      this.renderizarHeatmap();
    } else {
      this.renderizarMarcadores(ocorrenciasFiltradas);
    }

    // ✅ CORREÇÃO 3: Ajustar visualização DEPOIS de adicionar os layers
    setTimeout(() => {
      this.ajustarVisualizacaoMapa();
    }, 100);
  }

  /**
   * ✅ NOVO: Método separado para limpar layers
   */
  private limparLayers(): void {
    const L = (window as any).L;

    // Remover heatLayer
    if (this.heatLayer) {
      try {
        if (this.map.hasLayer(this.heatLayer)) {
          this.map.removeLayer(this.heatLayer);
        }
      } catch (e) {
        console.warn('Erro ao remover heatLayer:', e);
      }
      this.heatLayer = null;
    }

    // Remover markersLayer
    if (this.markersLayer) {
      try {
        if (this.map.hasLayer(this.markersLayer)) {
          this.map.removeLayer(this.markersLayer);
        }
        this.markersLayer.clearLayers();
      } catch (e) {
        console.warn('Erro ao remover markersLayer:', e);
      }
      this.markersLayer = null;
    }
  }

  /**
   * ✅ NOVO: Método separado para renderizar heatmap
   */
  private renderizarHeatmap(): void {
    const L = (window as any).L;

    if (typeof L.heatLayer !== 'function') {
      console.error('L.heatLayer não está disponível!');
      return;
    }

    if (this.pontosCache.length === 0) {
      console.warn('Sem pontos para renderizar heatmap');
      return;
    }

    // ✅ CONFIGURAÇÃO EQUILIBRADA DO HEATMAP
    this.heatLayer = L.heatLayer(this.pontosCache, {
      radius: 18,           // Raio base
      blur: 12,             // Blur para suavizar
      maxZoom: 14,          // ✅ Ajuste fino
      max: 1.0,             // Intensidade máxima
      minOpacity: 0.4,      // Opacidade mínima
      gradient: {
        0.0: 'blue',
        0.3: 'cyan',
        0.5: 'lime',
        0.7: 'yellow',
        0.85: 'orange',
        1.0: 'red'
      }
    });

    this.heatLayer.addTo(this.map);
    console.log('✅ HeatLayer adicionado ao mapa com', this.pontosCache.length, 'pontos');
  }

  /**
   * ✅ NOVO: Método separado para renderizar marcadores
   */
  private renderizarMarcadores(ocorrenciasFiltradas: OcorrenciaGeo[]): void {
    const L = (window as any).L;

    // Criar markersLayer
    if (typeof L.markerClusterGroup === 'function') {
      this.markersLayer = L.markerClusterGroup({
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        chunkedLoading: true,
        maxClusterRadius: 50
      });
    } else {
      this.markersLayer = L.layerGroup();
    }

    const icon = this.createLeafletIcon();
    const markersToAdd: any[] = [];

    ocorrenciasFiltradas.forEach(o => {
      const lat = Number(o.endereco!.latitude);
      const lng = Number(o.endereco!.longitude);
      const popupContent = this.createPopupContent(o);
      const marker = L.marker([lat, lng], { icon }).bindPopup(popupContent);
      markersToAdd.push(marker);
    });

    if (typeof this.markersLayer.addLayers === 'function') {
      this.markersLayer.addLayers(markersToAdd);
    } else {
      markersToAdd.forEach(m => this.markersLayer.addLayer(m));
    }

    this.map.addLayer(this.markersLayer);
    console.log('✅ MarkersLayer adicionado ao mapa com', markersToAdd.length, 'marcadores');
  }

  /**
   * ✅ CORREÇÃO: Ajustar bounds do mapa de forma robusta
   */
  private ajustarVisualizacaoMapa(): void {
    const L = (window as any).L;

    if (this.pontosCache.length === 0) {
      this.map.setView([2.8235, -60.6758], 13);
      return;
    }

    const temFiltroAtivo =
      (this.filtros.cidade_id != null && this.filtros.cidade_id !== undefined) ||
      (this.filtros.classificacao_id != null && this.filtros.classificacao_id !== undefined) ||
      (this.filtros.data_inicio && this.filtros.data_inicio.trim() !== '') ||
      (this.filtros.data_fim && this.filtros.data_fim.trim() !== '') ||
      (this.filtros.bairro && this.filtros.bairro.trim() !== '');

    // ✅ CORREÇÃO: Sempre centralizar nos pontos quando há filtro OU poucos pontos
    if (temFiltroAtivo || this.pontosCache.length <= 10) {
      console.log("Ajustando bounds para os pontos filtrados...");

      const latLngs = this.pontosCache.map((p: number[]) => L.latLng(p[0], p[1]));

      if (latLngs.length === 1) {
        // ✅ CORREÇÃO ESPECIAL: Para 1 único ponto, centralizar com zoom fixo
        const ponto = latLngs[0];
        console.log(`Único ponto encontrado: [${ponto.lat}, ${ponto.lng}]`);
        this.map.setView([ponto.lat, ponto.lng], 14);
      } else {
        // Múltiplos pontos: usar fitBounds
        const bounds = L.latLngBounds(latLngs);

        // ✅ CORREÇÃO: Verificar se bounds é válido
        if (bounds.isValid()) {
          const bufferedBounds = bounds.pad(0.2); // 20% de margem
          this.map.fitBounds(bufferedBounds, {
            padding: [50, 50],
            maxZoom: 15  // ✅ Limitar zoom máximo
          });
          console.log("fitBounds aplicado com sucesso");
        } else {
          console.warn("Bounds inválido, usando vista padrão");
          this.map.setView([2.8235, -60.6758], 13);
        }
      }
    } else {
      console.log("Nenhum filtro aplicado, centralizando na visão inicial.");
      this.map.setView([2.8235, -60.6758], 13);
    }

    // ✅ CORREÇÃO: Forçar redesenho do mapa
    setTimeout(() => {
      this.map.invalidateSize();
    }, 100);
  }

  private createLeafletIcon(): any {
    const L = (window as any).L;
    return L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
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

  aplicarFiltros(): void {
    console.log('Aplicando filtros:', this.filtros);
    this.loadDados();
  }

  limparFiltros(): void {
    this.filtros = {
      data_inicio: '',
      data_fim: '',
      classificacao_id: undefined,
      cidade_id: undefined,
      bairro: ''
    };
    this.loadDados();
  }

  /**
   * ✅ CORREÇÃO: Alternar visualização SEM recarregar dados
   */
  alternarVisualizacao(): void {
    this.visualizacao = this.visualizacao === 'heatmap' ? 'markers' : 'heatmap';
    console.log(`Alternando para: ${this.visualizacao}`);

    // ✅ Limpar layers atuais
    this.limparLayers();

    // ✅ Re-renderizar com os dados em cache
    if (this.pontosCache.length > 0) {
      if (this.visualizacao === 'heatmap') {
        this.renderizarHeatmap();
      } else {
        // Para marcadores, precisamos das ocorrências filtradas
        const ocorrenciasFiltradas = this.ocorrenciasGeo.filter(o => {
          const lat = o.endereco?.latitude;
          const lng = o.endereco?.longitude;
          const latValido = lat !== null && lat !== undefined && !isNaN(Number(lat)) && Number(lat) !== 0;
          const lngValido = lng !== null && lng !== undefined && !isNaN(Number(lng)) && Number(lng) !== 0;
          return latValido && lngValido;
        });
        this.renderizarMarcadores(ocorrenciasFiltradas);
      }

      // Manter a mesma visualização (não resetar zoom)
      // Apenas forçar redesenho
      setTimeout(() => {
        this.map.invalidateSize();
      }, 100);
    }
  }
}
