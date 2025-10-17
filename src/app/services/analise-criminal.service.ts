import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';  // ← LINHA ADICIONADA

export interface EstatisticaCriminal {
  total_ocorrencias: number;
  por_classificacao: Array<{
    classificacao: string;
    quantidade: number;
  }>;
  por_cidade: Array<{
    cidade: string;
    quantidade: number;
  }>;
  por_bairro: Array<{
    bairro: string;
    quantidade: number;
  }>;
  por_mes: Array<{
    mes: string;
    quantidade: number;
  }>;
}

// ✅ 1. É uma boa prática separar a interface do endereço.
export interface EnderecoGeo {
  latitude: number;
  longitude: number;
  bairro: string;
  logradouro: string;
  modo_entrada?: string; // ✅ 2. Propriedade adicionada
  coordenadas_manuais?: boolean; // ✅ 3. Propriedade adicionada
}

export interface OcorrenciaGeo {
  id: number;
  numero_ocorrencia: string;
  classificacao: {
    codigo: string;
    nome: string;
  };
  endereco?: EnderecoGeo; // ✅ 4. Usando a interface corrigida e garantindo que seja opcional
  data_fato: string;
  cidade: {
    nome: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AnaliseCriminalService {
  private baseUrl = environment.apiUrl;  // ← LINHA MODIFICADA

  constructor(private http: HttpClient) {}

  getEstatisticas(filtros?: any): Observable<EstatisticaCriminal> {
    return this.http.get<EstatisticaCriminal>(`${this.baseUrl}/analise-criminal/estatisticas/`, {
      params: filtros || {}
    });
  }

  getOcorrenciasGeo(filtros?: any): Observable<OcorrenciaGeo[]> {
    return this.http.get<OcorrenciaGeo[]>(`${this.baseUrl}/analise-criminal/mapa/`, {
      params: filtros || {}
    });
  }
}
