import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RelatoriosGerenciais } from '../interfaces/realatorios.interface';
import { environment } from '../../environments/environment';  // ← LINHA ADICIONADA

// ===================================================================
//  INÍCIO DAS INTERFACES CORRIGIDAS E COMPLETAS
// ===================================================================

export interface SimpleLookup {
  id: number;
  nome: string;
  sigla?: string;
  codigo?: string;
  estado?: string;
}

export interface UserNested {
  id: number;
  nome_completo: string;
  email?: string;
}

export interface Autoridade {
  id: number;
  nome: string;
  cargo: {
    id: number;
    nome: string;
  };
}

export interface Endereco {
  id: number;
  tipo: 'INTERNA' | 'EXTERNA';
  logradouro?: string;
  numero?: string;
  bairro?: string;
  ponto_referencia?: string;
  latitude?: string;
  longitude?: string;
  endereco_completo?: string;
}

/**
 * Interface OCORRENCIA corrigida para incluir todos os campos necessários.
 */
export interface Ocorrencia {
  id: number;
  numero_ocorrencia: string;
  status: 'AGUARDANDO_PERITO' | 'EM_ANALISE' | 'FINALIZADA';
  servico_pericial: SimpleLookup;
  unidade_demandante: SimpleLookup;
  autoridade: Autoridade;
  cidade: SimpleLookup;
  classificacao: SimpleLookup;
  procedimento_cadastrado?: any;
  tipo_documento_origem?: SimpleLookup;
  perito_atribuido?: UserNested;
  exames_solicitados?: any[];
  data_fato: string;
  hora_fato?: string;
  historico?: string;
  historico_ultima_edicao?: string;
  numero_documento_origem?: string;
  data_documento_origem?: string;
  processo_sei_numero?: string;
  created_at: string;
  updated_at: string;
  created_by?: UserNested;
  updated_by?: UserNested;
  status_prazo?: string;
  dias_prazo?: string;
  esta_finalizada: boolean;
  finalizada_por?: UserNested;
  data_finalizacao?: string;
  data_assinatura_finalizacao?: string;
  ip_assinatura_finalizacao?: string;
  reaberta_por?: UserNested;
  data_reabertura?: string;
  motivo_reabertura?: string;
  endereco?: Endereco;
}

export interface PaginatedResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Ocorrencia[];
}
// Interface específica para o FullCalendar (ADD-ON)
export interface EventoCalendario {
  id: number;
  title: string;
  start: string;
  color: string;
  allDay?: boolean;
  extendedProps: {
    status: string;
  };
}
// ===================================================================
//  FIM DAS INTERFACES
// ===================================================================


@Injectable({
  providedIn: 'root'
})
export class OcorrenciaService {
  private baseUrl = environment.apiUrl;  // ← LINHA MODIFICADA

  constructor(private http: HttpClient) { }

  getAll(params?: any): Observable<PaginatedResponse> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key]) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get<PaginatedResponse>(`${this.baseUrl}/ocorrencias/`, { params: httpParams });
  }

  getByUrl(url: string): Observable<PaginatedResponse> {
    return this.http.get<PaginatedResponse>(url);
  }

  getById(id: number): Observable<Ocorrencia> {
    return this.http.get<Ocorrencia>(`${this.baseUrl}/ocorrencias/${id}/`);
  }

  create(data: any): Observable<Ocorrencia> {
    return this.http.post<Ocorrencia>(`${this.baseUrl}/ocorrencias/`, data);
  }

  update(id: number, data: any): Observable<Ocorrencia> {
    return this.http.patch<Ocorrencia>(`${this.baseUrl}/ocorrencias/${id}/`, data);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/ocorrencias/${id}/`);
  }

  atribuirPerito(id: number, peritoId: number): Observable<any> {
    return this.http.patch(`${this.baseUrl}/ocorrencias/${id}/atribuir_perito/`, { perito_id: peritoId });
  }

  finalizar(id: number, senha: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/ocorrencias/${id}/finalizar/`, { password: senha });
  }

  reabrir(id: number, senha: string, motivo: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/ocorrencias/${id}/reabrir/`, {
      password: senha,
      motivo_reabertura: motivo
    });
  }

  adicionarExames(id: number, examesIds: number[]): Observable<any> {
    return this.http.post(`${this.baseUrl}/ocorrencias/${id}/adicionar_exames/`, { exames_ids: examesIds });
  }

  removerExames(id: number, examesIds: number[]): Observable<any> {
    return this.http.post(`${this.baseUrl}/ocorrencias/${id}/remover_exames/`, { exames_ids: examesIds });
  }

  definirExames(id: number, examesIds: number[]): Observable<any> {
    return this.http.post(`${this.baseUrl}/ocorrencias/${id}/definir_exames/`, { exames_ids: examesIds });
  }

  getExamesDisponiveis(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key]) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get(`${this.baseUrl}/ocorrencias/exames_disponiveis/`, { params: httpParams });
  }

  getExamesAtuais(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/ocorrencias/${id}/exames_atuais/`);
  }

  getPendentes(): Observable<any> {
    return this.http.get(`${this.baseUrl}/ocorrencias/pendentes/`);
  }

  getFinalizadas(): Observable<any> {
    return this.http.get(`${this.baseUrl}/ocorrencias/finalizadas/`);
  }

  getLixeira(): Observable<Ocorrencia[]> {
    return this.http.get<Ocorrencia[]>(`${this.baseUrl}/ocorrencias/lixeira/`);
  }

  restaurar(id: number): Observable<Ocorrencia> {
    return this.http.post<Ocorrencia>(`${this.baseUrl}/ocorrencias/${id}/restaurar/`, {});
  }

  getEstatisticas(params?: any): Observable<any> {
    return this.http.get(`${this.baseUrl}/ocorrencias/estatisticas/`, { params });
  }

  getRelatoriosGerenciais(params?: any): Observable<RelatoriosGerenciais> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key]) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get<RelatoriosGerenciais>(`${this.baseUrl}/ocorrencias/relatorios-gerenciais/`, { params: httpParams });
  }

  vincularProcedimento(ocorrenciaId: number, procedimentoId: number | null): Observable<any> {
    return this.http.post(`${this.baseUrl}/ocorrencias/${ocorrenciaId}/vincular_procedimento/`, {
      procedimento_cadastrado_id: procedimentoId
    });
  }

  imprimirPDF(id: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/ocorrencias/${id}/imprimir/`, {
      responseType: 'blob'
    });
  }

  imprimirRelatoriosGerenciais(filtros: any): Observable<Blob> {
    let params = new HttpParams();

    if (filtros.data_inicio) {
      params = params.set('data_inicio', filtros.data_inicio);
    }
    if (filtros.data_fim) {
      params = params.set('data_fim', filtros.data_fim);
    }
    if (filtros.servico_id) {
      params = params.set('servico_id', filtros.servico_id.toString());
    }
    if (filtros.cidade_id) {
      params = params.set('cidade_id', filtros.cidade_id.toString());
    }
    if (filtros.perito_id) {
      params = params.set('perito_id', filtros.perito_id.toString());
    }
    if (filtros.classificacao_id) {
      params = params.set('classificacao_id', filtros.classificacao_id.toString());
    }

    return this.http.get(`${this.baseUrl}/relatorios-gerenciais/pdf/`, {
      params: params,
      responseType: 'blob'
    });
  }
  getOcorrenciasCalendario(start: string, end: string): Observable<EventoCalendario[]> {
    const params = new HttpParams()
      .set('start', start)
      .set('end', end);

    // Certifique-se que a URL está batendo com a do seu Backend Django
    return this.http.get<EventoCalendario[]>(`${this.baseUrl}/ocorrencias/dados-calendario/`, { params });
  }
}
