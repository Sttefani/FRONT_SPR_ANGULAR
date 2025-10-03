import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PaginatedResponse, ServicoPericial } from './servico-pericial.service';
import { map } from 'rxjs/operators';


export interface Exame {
  id: number;
  codigo: string;
  nome: string;
  servico_pericial: {
    id: number;
    nome: string;
  };
  servico_pericial_id?: number;
  parent?: {
    id: number;
    codigo: string;
    nome: string;
  } | null;
  parent_id?: number | null;
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
export class ExameService {
  private baseUrl = 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  getAll(servicoPericialId?: number): Observable<Exame[]> {
    let params = new HttpParams();
    if (servicoPericialId) {
      params = params.set('servico_pericial', servicoPericialId.toString());
    }
    return this.http.get<Exame[]>(`${this.baseUrl}/exames/`, { params });
  }

  getById(id: number): Observable<Exame> {
    return this.http.get<Exame>(`${this.baseUrl}/exames/${id}/`);
  }

  getGruposPrincipais(servicoPericialId?: number): Observable<Exame[]> {
    let params = new HttpParams().set('parent__isnull', 'true');
    if (servicoPericialId) {
      params = params.set('servico_pericial', servicoPericialId.toString());
    }
    return this.http.get<Exame[]>(`${this.baseUrl}/exames/`, { params });
  }

  create(data: { codigo: string; nome: string; servico_pericial_id: number; parent_id?: number | null }): Observable<Exame> {
    return this.http.post<Exame>(`${this.baseUrl}/exames/`, data);
  }

  update(id: number, data: { codigo: string; nome: string; servico_pericial_id: number; parent_id?: number | null }): Observable<Exame> {
    return this.http.patch<Exame>(`${this.baseUrl}/exames/${id}/`, data);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/exames/${id}/`);
  }

  getLixeira(): Observable<Exame[]> {
    return this.http.get<Exame[]>(`${this.baseUrl}/exames/lixeira/`);
  }

  restaurar(id: number): Observable<Exame> {
    return this.http.post<Exame>(`${this.baseUrl}/exames/${id}/restaurar/`, {});
  }
}
