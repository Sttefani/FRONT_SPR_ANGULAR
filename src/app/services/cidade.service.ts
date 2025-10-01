import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Cidade {
  id: number;
  nome: string;
  created_at: string;
  updated_at: string;
  created_by?: {  // ← ADICIONE
    id: number;
    nome_completo: string;
    email: string;
  };
  updated_by?: {  // ← ADICIONE
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
  results: Cidade[];
}

@Injectable({
  providedIn: 'root'
})
export class CidadeService {
  private baseUrl = 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  getAll(search?: string): Observable<PaginatedResponse> {
    let params = new HttpParams();
    if (search) {
      params = params.set('search', search);
    }
    return this.http.get<PaginatedResponse>(`${this.baseUrl}/cidades/`, { params });
  }

  getByUrl(url: string): Observable<PaginatedResponse> {
    return this.http.get<PaginatedResponse>(url);
  }

  getById(id: number): Observable<Cidade> {
    return this.http.get<Cidade>(`${this.baseUrl}/cidades/${id}/`);
  }

  create(data: { nome: string }): Observable<Cidade> {
    return this.http.post<Cidade>(`${this.baseUrl}/cidades/`, data);
  }

  update(id: number, data: { nome: string }): Observable<Cidade> {
    return this.http.patch<Cidade>(`${this.baseUrl}/cidades/${id}/`, data);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/cidades/${id}/`);
  }

  getLixeira(): Observable<Cidade[]> {
    return this.http.get<Cidade[]>(`${this.baseUrl}/cidades/lixeira/`);
  }

  restaurar(id: number): Observable<Cidade> {
    return this.http.post<Cidade>(`${this.baseUrl}/cidades/${id}/restaurar/`, {});
  }
  getAllForDropdown(): Observable<Cidade[]> {
  return this.http.get<Cidade[]>(`${this.baseUrl}/cidades/dropdown/`);
}
}
