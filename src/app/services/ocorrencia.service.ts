import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Ocorrencia {
  id: number;
  numero_ocorrencia: string;
  status: 'AGUARDANDO_PERITO' | 'EM_ANALISE' | 'FINALIZADA';
  servico_pericial: {
    id: number;
    sigla: string;
    nome: string;
  };
  unidade_demandante: any;
  autoridade: any;
  cidade: any;
  classificacao: any;
  procedimento_cadastrado?: any;
  tipo_documento_origem?: any;
  perito_atribuido?: any;
  exames_solicitados?: any[];
  data_fato: string;
  hora_fato?: string;
  historico?: string;
  historico_ultima_edicao?: string;  // ← ADICIONE ESTA LINHA
  numero_documento_origem?: string;
  data_documento_origem?: string;
  processo_sei_numero?: string;
  created_at: string;
  updated_at: string;
  created_by?: any;
  updated_by?: any;
  status_prazo?: string;
  dias_prazo?: string;
  esta_finalizada: boolean;
  finalizada_por?: any;
  data_finalizacao?: string;
  data_assinatura_finalizacao?: string;  // ← ADICIONE ESTA LINHA
  ip_assinatura_finalizacao?: string;  // ← ADICIONE ESTA LINHA
  reaberta_por?: any;  // ← ADICIONE ESTA LINHA
  data_reabertura?: string;  // ← ADICIONE ESTA LINHA
  motivo_reabertura?: string;  // ← ADICIONE ESTA LINHA
}

export interface PaginatedResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Ocorrencia[];
}

@Injectable({
  providedIn: 'root'
})
export class OcorrenciaService {
  private baseUrl = 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

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

vincularProcedimento(ocorrenciaId: number, procedimentoId: number): Observable<any> {
  return this.http.post(`${this.baseUrl}/ocorrencias/${ocorrenciaId}/vincular_procedimento/`, {
    procedimento_cadastrado_id: procedimentoId
  });
}

  imprimirPDF(id: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/ocorrencias/${id}/imprimir/`, {
      responseType: 'blob'
    });
  }
}
