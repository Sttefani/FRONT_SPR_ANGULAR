import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Procedimento {
  id: number;
  sigla: string;
  nome: string;
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
  results: Procedimento[];
}

@Injectable({
  providedIn: 'root'
})
export class ProcedimentoService {
  private baseUrl = 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  getAll(search?: string): Observable<PaginatedResponse> {
    let params = new HttpParams();
    if (search) {
      params = params.set('search', search);
    }
    return this.http.get<PaginatedResponse>(`${this.baseUrl}/procedimentos/`, { params });
  }

  getByUrl(url: string): Observable<PaginatedResponse> {
    return this.http.get<PaginatedResponse>(url);
  }

  getAllForDropdown(): Observable<Procedimento[]> {
    return this.http.get<Procedimento[]>(`${this.baseUrl}/procedimentos/dropdown/`);
  }

  getById(id: number): Observable<Procedimento> {
    return this.http.get<Procedimento>(`${this.baseUrl}/procedimentos/${id}/`);
  }

  create(data: { sigla: string; nome: string }): Observable<Procedimento> {
    return this.http.post<Procedimento>(`${this.baseUrl}/procedimentos/`, data);
  }

  update(id: number, data: { sigla: string; nome: string }): Observable<Procedimento> {
    return this.http.patch<Procedimento>(`${this.baseUrl}/procedimentos/${id}/`, data);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/procedimentos/${id}/`);
  }

  getLixeira(): Observable<Procedimento[]> {
    return this.http.get<Procedimento[]>(`${this.baseUrl}/procedimentos/lixeira/`);
  }

  restaurar(id: number): Observable<Procedimento> {
    return this.http.post<Procedimento>(`${this.baseUrl}/procedimentos/${id}/restaurar/`, {});
  }
}
