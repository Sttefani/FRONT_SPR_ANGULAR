import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import 'leaflet.heat';
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
  // Mapa
  private map: L.Map | null = null;
  private heatLayer: L.Layer | null = null;
  private markersLayer: L.LayerGroup = L.layerGroup();

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
  semResultados = false; // ✅ 1. ADICIONADO: A variável que faltava.

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
    this.semResultados = false; // Garante que a mensagem suma ao recarregar
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
        this.estatisticas = estatisticasData;
        this.ocorrenciasGeo = ocorrenciasData;
        this.loadingStep = 3;
        this.isLoading = false;

        // ✅ 2. ADICIONADO: Define se a mensagem deve aparecer.
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
    this.markersLayer.addTo(this.map);
  }

  atualizarMapa(): void {
    if (!this.map) return;
    this.markersLayer.clearLayers();
    if (this.heatLayer) {
      this.map.removeLayer(this.heatLayer);
      this.heatLayer = null;
    }
    const points = this.ocorrenciasGeo
      .filter(o => o.endereco?.latitude && o.endereco?.longitude)
      .map(o => [Number(o.endereco!.latitude), Number(o.endereco!.longitude), 1]);
    if (points.length === 0) {
      this.map.setView([2.8235, -60.6758], 13);
      return;
    }
    if (this.visualizacao === 'heatmap') {
      this.heatLayer = (L as any).heatLayer(points, {
        radius: 25, blur: 15, maxZoom: 17, gradient: { 0.0: 'blue', 0.5: 'lime', 1.0: 'red' }
      }).addTo(this.map);
    } else {
      this.ocorrenciasGeo
        .filter(o => o.endereco?.latitude && o.endereco?.longitude)
        .forEach(o => this.createMarker(o));
    }
    const bounds = L.latLngBounds(points.map(p => [p[0], p[1]]));
    this.map.fitBounds(bounds, { padding: [50, 50] });
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

  createMarker(ocorrencia: OcorrenciaGeo): void {
  const modoEntrada = ocorrencia.endereco?.modo_entrada === 'COORDENADAS_DIRETAS'
    ? '📍 GPS'
    : '🏠 Endereço';

  const coordsManuais = ocorrencia.endereco?.coordenadas_manuais
    ? '(Manual)'
    : '(Auto)';

  const popupContent = `
    <div style="font-size: 12px;">
      <strong>${ocorrencia.numero_ocorrencia}</strong><br>
      <span style="color: #dc3545;">${ocorrencia.classificacao?.nome || 'N/A'}</span><br>
      ${ocorrencia.endereco?.logradouro || ''}, ${ocorrencia.endereco?.bairro || ''}<br>
      ${ocorrencia.data_fato || ''}<br>
      <small style="color: #6c757d;">${modoEntrada} ${coordsManuais}</small>
    </div>`;

  L.marker([Number(ocorrencia.endereco!.latitude), Number(ocorrencia.endereco!.longitude)], {
    icon: this.createLeafletIcon()
  })
  .bindPopup(popupContent)
  .addTo(this.markersLayer);
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
    this.atualizarMapa();
  }
}
