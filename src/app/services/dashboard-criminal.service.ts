import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// ==========================================
// 1. INTERFACES - ITENS DOS GRÁFICOS
// ==========================================

export interface ClassificacaoItem {
  codigo: string;
  nome: string;
  quantidade: number;
}

export interface CidadeItem {
  cidade: string;
  quantidade: number;
}

export interface BairroItem {
  bairro: string;
  quantidade: number;
}

export interface MesItem {
  mes: string;
  mes_nome: string;
  quantidade: number;
}

export interface DiaSemanaItem {
  dia: string;
  dia_numero: number;
  quantidade: number;
}

export interface TurnoItem {
  turno: string;
  quantidade: number;
}

export interface MatrizDiaTurnoItem {
  dia: string;
  dia_numero: number;
  turno: string;
  quantidade: number;
}

// ==========================================
// 2. INTERFACES - CARDS DINÂMICOS (NOVO)
// ==========================================

/** Filha de uma classificação (detalhe do drill-down) */
export interface ClassificacaoFilha {
  id: number;
  codigo: string;
  nome: string;
  quantidade: number;
  percentual: number;
}

/** Card de categoria (PAI com suas filhas) */
export interface CardCategoria {
  id: number;
  codigo: string;
  nome: string;
  quantidade: number;
  percentual: number;
  filhas: ClassificacaoFilha[];
}

// ==========================================
// 3. INTERFACES - RESUMO E GRÁFICOS
// ==========================================

/** Resumo executivo do dashboard */
export interface DashboardResumo {
  total_ocorrencias: number;
  total_cidades: number;
  total_categorias: number;
}

/** Gráficos do dashboard */
export interface DashboardGraficos {
  por_classificacao: ClassificacaoItem[];
  por_cidade: CidadeItem[];
  por_bairro: BairroItem[];
  por_mes: MesItem[];
  por_dia_semana: DiaSemanaItem[];
  por_turno: TurnoItem[];
  matriz_dia_turno: MatrizDiaTurnoItem[];
}

// ==========================================
// 4. INTERFACE PRINCIPAL DE RESPOSTA (NOVO)
// ==========================================

export interface DashboardCriminalResponse {
  resumo: DashboardResumo;
  cards: CardCategoria[];
  graficos: DashboardGraficos;
}

// ==========================================
// 5. FILTROS
// ==========================================

export interface FiltrosDashboard {
  data_inicio?: string;
  data_fim?: string;
  classificacao_id?: number;
  cidade_id?: number;
  bairro?: string;
}

// ==========================================
// 6. CLASSE DO SERVICE
// ==========================================

@Injectable({
  providedIn: 'root'
})
export class DashboardCriminalService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  /**
   * Remove chaves com valores nulos ou vazios para limpar a URL
   */
  private buildCleanParams(filtros: FiltrosDashboard): HttpParams {
    let params = new HttpParams();

    if (!filtros) return params;

    Object.keys(filtros).forEach(key => {
      const value = (filtros as any)[key];

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

  /**
   * Busca os dados do Dashboard (Resumo + Cards Dinâmicos + Gráficos)
   */
  getDashboard(filtros?: FiltrosDashboard): Observable<DashboardCriminalResponse> {
    const params = this.buildCleanParams(filtros || {});

    return this.http.get<DashboardCriminalResponse>(
      `${this.baseUrl}/analise-criminal/dashboard/`,
      { params }
    );
  }
}
