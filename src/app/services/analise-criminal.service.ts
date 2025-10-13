import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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

export interface OcorrenciaGeo {
  id: number;
  numero_ocorrencia: string;
  classificacao: {
    codigo: string;
    nome: string;
  };
  endereco: {
    latitude: number;   // ✅ CORRIGIDO DE string PARA number
    longitude: number;  // ✅ CORRIGIDO DE string PARA number
    bairro: string;
    logradouro: string;
  };
  data_fato: string;
  cidade: {
    nome: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AnaliseCriminalService {
  private baseUrl = 'http://localhost:8000/api';

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
