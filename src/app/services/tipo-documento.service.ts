import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TipoDocumento {
  id: number;
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
  results: TipoDocumento[];
}

@Injectable({
  providedIn: 'root'
})
export class TipoDocumentoService {
  private baseUrl = 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  getAll(search?: string): Observable<PaginatedResponse> {
    let params = new HttpParams();
    if (search) {
      params = params.set('search', search);
    }
    return this.http.get<PaginatedResponse>(`${this.baseUrl}/tipos-documento/`, { params });
  }

  getByUrl(url: string): Observable<PaginatedResponse> {
    return this.http.get<PaginatedResponse>(url);
  }

  getAllForDropdown(): Observable<TipoDocumento[]> {
    return this.http.get<TipoDocumento[]>(`${this.baseUrl}/tipos-documento/`);
  }

  getById(id: number): Observable<TipoDocumento> {
    return this.http.get<TipoDocumento>(`${this.baseUrl}/tipos-documento/${id}/`);
  }

  create(data: { nome: string }): Observable<TipoDocumento> {
    return this.http.post<TipoDocumento>(`${this.baseUrl}/tipos-documento/`, data);
  }

  update(id: number, data: { nome: string }): Observable<TipoDocumento> {
    return this.http.patch<TipoDocumento>(`${this.baseUrl}/tipos-documento/${id}/`, data);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/tipos-documento/${id}/`);
  }

  getLixeira(): Observable<TipoDocumento[]> {
    return this.http.get<TipoDocumento[]>(`${this.baseUrl}/tipos-documento/lixeira/`);
  }

  restaurar(id: number): Observable<TipoDocumento> {
    return this.http.post<TipoDocumento>(`${this.baseUrl}/tipos-documento/${id}/restaurar/`, {});
  }
}
