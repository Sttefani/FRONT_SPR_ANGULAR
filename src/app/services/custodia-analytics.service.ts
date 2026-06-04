import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface FiltrosAnalytics {
  data_inicio?: string;
  data_fim?: string;
  servico_pericial_id?: number;
}

export interface ResumoAnalytics {
  total_vestigios: number;
  vestigios_ativos: number;
  aguardando_aceite: number;
  finalizados_mes: number;
  total_dnas: number;
  biologicos_ativos: number;
  saiu_custodia: number;
}

export interface CardStatus {
  status: string;
  label: string;
  icon: string;
  quantidade: number;
  percentual: number;
  por_servico: { sigla: string; nome: string; quantidade: number }[];
}

export interface MesItem {
  mes: string;
  mes_nome: string;
  quantidade: number;
}

export interface ServicoItem {
  sigla: string;
  nome: string;
  quantidade: number;
}

export interface UnidadeItem {
  sigla: string;
  nome: string;
  quantidade: number;
}

export interface LabelItem {
  label: string;
  quantidade: number;
}

export interface MatrizItem {
  servico: string;
  status: string;
  quantidade: number;
}

export interface AlertaMovimentacao {
  id: number;
  vestigio_id: number;
  vestigio_lacre: string;
  servico: string;
  registrado_por: string;
  criado_em: string;
  dias_pendente: number;
}

export interface AlertaVestigio {
  id: number;
  lacre: string;
  servico: string;
  responsavel: string;
  ultima_atualizacao: string;
  dias_parado: number;
}

export interface GraficosAnalytics {
  por_servico: ServicoItem[];
  por_unidade: UnidadeItem[];
  por_mes_cadastro: MesItem[];
  por_mes_finalizacao: MesItem[];
  por_mes_mov: MesItem[];
  por_biologico: LabelItem[];
  por_conformidade: LabelItem[];
  dna_por_situacao: LabelItem[];
  dna_por_finalidade: LabelItem[];
  dna_por_mes: MesItem[];
  matriz_servico_status: MatrizItem[];
}

export interface AnalyticsCustodiaResponse {
  resumo: ResumoAnalytics;
  cards_status: CardStatus[];
  graficos: GraficosAnalytics;
  alertas: {
    movimentacoes_pendentes: AlertaMovimentacao[];
    vestigios_parados: AlertaVestigio[];
  };
}

@Injectable({ providedIn: 'root' })
export class CustodiaAnalyticsService {
  private base = `${environment.apiUrl}/custodia/analytics/`;

  constructor(private http: HttpClient) {}

  getAnalytics(filtros?: FiltrosAnalytics): Observable<AnalyticsCustodiaResponse> {
    let params = new HttpParams();
    if (filtros?.data_inicio)         params = params.set('data_inicio', filtros.data_inicio);
    if (filtros?.data_fim)            params = params.set('data_fim', filtros.data_fim);
    if (filtros?.servico_pericial_id) params = params.set('servico_pericial_id', filtros.servico_pericial_id.toString());
    return this.http.get<AnalyticsCustodiaResponse>(this.base, { params });
  }
}
