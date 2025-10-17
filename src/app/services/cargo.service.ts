import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';  // ← LINHA ADICIONADA

export interface Cargo {
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
  results: Cargo[];
}

@Injectable({
  providedIn: 'root'
})
export class CargoService {
  private baseUrl = environment.apiUrl;  // ← LINHA MODIFICADA

  constructor(private http: HttpClient) {}

  getAll(search?: string): Observable<PaginatedResponse> {
    let params = new HttpParams();
    if (search) {
      params = params.set('search', search);
    }
    return this.http.get<PaginatedResponse>(`${this.baseUrl}/cargos/`, { params });
  }

  getByUrl(url: string): Observable<PaginatedResponse> {
    return this.http.get<PaginatedResponse>(url);
  }

  getById(id: number): Observable<Cargo> {
    return this.http.get<Cargo>(`${this.baseUrl}/cargos/${id}/`);
  }

  create(data: { nome: string }): Observable<Cargo> {
    return this.http.post<Cargo>(`${this.baseUrl}/cargos/`, data);
  }

  update(id: number, data: { nome: string }): Observable<Cargo> {
    return this.http.patch<Cargo>(`${this.baseUrl}/cargos/${id}/`, data);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/cargos/${id}/`);
  }

  getLixeira(): Observable<Cargo[]> {
    return this.http.get<Cargo[]>(`${this.baseUrl}/cargos/lixeira/`);
  }

  restaurar(id: number): Observable<Cargo> {
    return this.http.post<Cargo>(`${this.baseUrl}/cargos/${id}/restaurar/`, {});
  }

  getAllForDropdown(): Observable<Cargo[]> {
    return this.http.get<Cargo[]>(`${this.baseUrl}/cargos/dropdown/`);
  }
}
