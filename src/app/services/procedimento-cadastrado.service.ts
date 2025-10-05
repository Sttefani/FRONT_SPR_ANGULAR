import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ProcedimentoCadastrado {
  id: number;
  tipo_procedimento: {
    id: number;
    sigla: string;
    nome: string;
  };
  tipo_procedimento_id?: number;
  numero: string;
  ano: number;
  numero_completo: string;
  created_at: string;
  updated_at: string;
  created_by?: {
    id: number;
    nome_completo: string;
    email: string;
  };
  updated_by?: {
    id: number;
    nome_completo: string;
    email: string;
  };
  deleted_at?: string;
  deleted_by?: {
    id: number;
    nome_completo: string;
    email: string;
  };
}

export interface PaginatedResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ProcedimentoCadastrado[];
}

@Injectable({
  providedIn: 'root'
})
export class ProcedimentoCadastradoService {
  private baseUrl = 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  getAll(search?: string): Observable<PaginatedResponse> {
    let params = new HttpParams();
    if (search) {
      params = params.set('search', search);
    }
    return this.http.get<PaginatedResponse>(`${this.baseUrl}/procedimentos-cadastrados/`, { params });
  }

  getByUrl(url: string): Observable<PaginatedResponse> {
    return this.http.get<PaginatedResponse>(url);
  }

  getById(id: number): Observable<ProcedimentoCadastrado> {
    return this.http.get<ProcedimentoCadastrado>(`${this.baseUrl}/procedimentos-cadastrados/${id}/`);
  }

  create(data: { tipo_procedimento_id: number; numero: string; ano: number }): Observable<ProcedimentoCadastrado> {
    return this.http.post<ProcedimentoCadastrado>(`${this.baseUrl}/procedimentos-cadastrados/`, data);
  }

  update(id: number, data: { tipo_procedimento_id: number; numero: string; ano: number }): Observable<ProcedimentoCadastrado> {
    return this.http.patch<ProcedimentoCadastrado>(`${this.baseUrl}/procedimentos-cadastrados/${id}/`, data);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/procedimentos-cadastrados/${id}/`);
  }

  getLixeira(): Observable<ProcedimentoCadastrado[]> {
    return this.http.get<ProcedimentoCadastrado[]>(`${this.baseUrl}/procedimentos-cadastrados/lixeira/`);
  }

  restaurar(id: number): Observable<ProcedimentoCadastrado> {
    return this.http.post<ProcedimentoCadastrado>(`${this.baseUrl}/procedimentos-cadastrados/${id}/restaurar/`, {});
  }
  buscar(tipoProcedimentoId: number, numero: string, ano: number): Observable<any[]> {
  let params = new HttpParams()
    .set('tipo_procedimento', tipoProcedimentoId.toString())
    .set('numero', numero)
    .set('ano', ano.toString());

  return this.http.get<any[]>(`${this.baseUrl}/procedimentos-cadastrados/`, { params });
}
verificarExistente(tipoProcedimentoId: number, numero: string, ano: number): Observable<any> {
  const params = new HttpParams()
    .set('tipo_procedimento_id', tipoProcedimentoId.toString())
    .set('numero', numero.toUpperCase())
    .set('ano', ano.toString());

  return this.http.get<any>(`${this.baseUrl}/procedimentos-cadastrados/verificar_existente/`, { params });
}
getOcorrenciasVinculadas(procedimentoId: number): Observable<any> {
  return this.http.get(`${this.baseUrl}/${procedimentoId}/ocorrencias_vinculadas/`);
}
}
