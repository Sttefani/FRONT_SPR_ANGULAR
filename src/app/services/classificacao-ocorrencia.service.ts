import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ClassificacaoOcorrencia {
  id: number;
  codigo: string;
  nome: string;
  parent?: {
    id: number;
    codigo: string;
    nome: string;
  } | null;
  parent_id?: number | null;
  servicos_periciais?: any[];
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

@Injectable({
  providedIn: 'root'
})
export class ClassificacaoOcorrenciaService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  getAll(): Observable<ClassificacaoOcorrencia[]> {
    return this.http.get<ClassificacaoOcorrencia[]>(`${this.baseUrl}/classificacoes/`);
  }

  // --- ADICIONEI ESTE MÉTODO QUE FALTAVA ---
  search(term: string): Observable<ClassificacaoOcorrencia[]> {
    let params = new HttpParams().set('search', term);
    return this.http.get<ClassificacaoOcorrencia[]>(`${this.baseUrl}/classificacoes/`, { params });
  }
  // ----------------------------------------

  getById(id: number): Observable<ClassificacaoOcorrencia> {
    return this.http.get<ClassificacaoOcorrencia>(`${this.baseUrl}/classificacoes/${id}/`);
  }

  getGruposPrincipais(): Observable<ClassificacaoOcorrencia[]> {
    let params = new HttpParams().set('parent__isnull', 'true');
    return this.http.get<ClassificacaoOcorrencia[]>(`${this.baseUrl}/classificacoes/`, { params });
  }

  create(data: { codigo: string; nome: string; parent_id?: number | null }): Observable<ClassificacaoOcorrencia> {
    return this.http.post<ClassificacaoOcorrencia>(`${this.baseUrl}/classificacoes/`, data);
  }

  update(id: number, data: { codigo: string; nome: string; parent_id?: number | null }): Observable<ClassificacaoOcorrencia> {
    return this.http.patch<ClassificacaoOcorrencia>(`${this.baseUrl}/classificacoes/${id}/`, data);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/classificacoes/${id}/`);
  }

  getLixeira(): Observable<ClassificacaoOcorrencia[]> {
    return this.http.get<ClassificacaoOcorrencia[]>(`${this.baseUrl}/classificacoes/lixeira/`);
  }

  restaurar(id: number): Observable<ClassificacaoOcorrencia> {
    return this.http.post<ClassificacaoOcorrencia>(`${this.baseUrl}/classificacoes/${id}/restaurar/`, {});
  }

  getAllForDropdown(servicoId?: number | null): Observable<any[]> {
    let params = new HttpParams();
    if (servicoId) {
      params = params.set('servico_id', servicoId.toString());
    }
    return this.http.get<any[]>(`${this.baseUrl}/classificacoes/dropdown/`, { params });
  }
}
