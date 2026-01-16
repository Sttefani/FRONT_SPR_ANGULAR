import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

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

export interface EnderecoGeo {
  latitude: number;
  longitude: number;
  bairro: string;
  logradouro: string;
  modo_entrada?: string;
  coordenadas_manuais?: boolean;
}

export interface OcorrenciaGeo {
  id: number;
  numero_ocorrencia: string;
  classificacao: {
    codigo: string;
    nome: string;
  };
  endereco?: EnderecoGeo;
  data_fato: string;
  cidade: {
    nome: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AnaliseCriminalService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  /**
   * ✅ CORREÇÃO: Método utilitário para limpar filtros
   * Remove valores null, undefined, strings vazias e "null" string
   */
  private buildCleanParams(filtros: any): HttpParams {
    let params = new HttpParams();

    if (!filtros) return params;

    Object.keys(filtros).forEach(key => {
      const value = filtros[key];

      // Só adiciona se tiver valor válido
      if (
        value !== null &&
        value !== undefined &&
        value !== '' &&
        value !== 'null'
      ) {
        params = params.set(key, String(value));
      }
    });

    return params;
  }

  getEstatisticas(filtros?: any): Observable<EstatisticaCriminal> {
    const params = this.buildCleanParams(filtros);

    return this.http.get<EstatisticaCriminal>(
      `${this.baseUrl}/analise-criminal/estatisticas/`,
      { params }
    );
  }

  getOcorrenciasGeo(filtros?: any): Observable<OcorrenciaGeo[]> {
    const params = this.buildCleanParams(filtros);

    return this.http.get<OcorrenciaGeo[]>(
      `${this.baseUrl}/analise-criminal/mapa/`,
      { params }
    );
  }
}
