import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';  // ← LINHA ADICIONADA

export interface UnidadeDemandante {
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
  results: UnidadeDemandante[];
}

@Injectable({
  providedIn: 'root'
})
export class UnidadeDemandanteService {
  private baseUrl = environment.apiUrl;  // ← LINHA MODIFICADA

  constructor(private http: HttpClient) {}

  getAll(search?: string): Observable<PaginatedResponse> {
    let params = new HttpParams();
    if (search) {
      params = params.set('search', search);
    }
    return this.http.get<PaginatedResponse>(`${this.baseUrl}/unidades-demandantes/`, { params });
  }

  getByUrl(url: string): Observable<PaginatedResponse> {
    return this.http.get<PaginatedResponse>(url);
  }

  getAllForDropdown(): Observable<UnidadeDemandante[]> {
    return this.http.get<UnidadeDemandante[]>(`${this.baseUrl}/unidades-demandantes/dropdown/`);
  }

  getById(id: number): Observable<UnidadeDemandante> {
    return this.http.get<UnidadeDemandante>(`${this.baseUrl}/unidades-demandantes/${id}/`);
  }

  create(data: { sigla: string; nome: string }): Observable<UnidadeDemandante> {
    return this.http.post<UnidadeDemandante>(`${this.baseUrl}/unidades-demandantes/`, data);
  }

  update(id: number, data: { sigla: string; nome: string }): Observable<UnidadeDemandante> {
    return this.http.patch<UnidadeDemandante>(`${this.baseUrl}/unidades-demandantes/${id}/`, data);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/unidades-demandantes/${id}/`);
  }

  getLixeira(): Observable<UnidadeDemandante[]> {
    return this.http.get<UnidadeDemandante[]>(`${this.baseUrl}/unidades-demandantes/lixeira/`);
  }

  restaurar(id: number): Observable<UnidadeDemandante> {
    return this.http.post<UnidadeDemandante>(`${this.baseUrl}/unidades-demandantes/${id}/restaurar/`, {});
  }
}
