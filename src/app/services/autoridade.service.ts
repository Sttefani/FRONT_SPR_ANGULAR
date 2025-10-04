import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Autoridade {
  id: number;
  nome: string;
  cargo: {
    id: number;
    nome: string;
  };
  cargo_id?: number;
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
  results: Autoridade[];
}

@Injectable({
  providedIn: 'root'
})
export class AutoridadeService {
  private baseUrl = 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  getAll(search?: string, cargo?: number): Observable<PaginatedResponse> {
    let params = new HttpParams();
    if (search) {
      params = params.set('search', search);
    }
    if (cargo) {
      params = params.set('cargo', cargo.toString());
    }
    return this.http.get<PaginatedResponse>(`${this.baseUrl}/autoridades/`, { params });
  }

  getByUrl(url: string): Observable<PaginatedResponse> {
    return this.http.get<PaginatedResponse>(url);
  }

  getById(id: number): Observable<Autoridade> {
    return this.http.get<Autoridade>(`${this.baseUrl}/autoridades/${id}/`);
  }

  create(data: { nome: string; cargo_id: number }): Observable<Autoridade> {
    return this.http.post<Autoridade>(`${this.baseUrl}/autoridades/`, data);
  }

  update(id: number, data: { nome: string; cargo_id: number }): Observable<Autoridade> {
    return this.http.patch<Autoridade>(`${this.baseUrl}/autoridades/${id}/`, data);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/autoridades/${id}/`);
  }

  getLixeira(): Observable<Autoridade[]> {
    return this.http.get<Autoridade[]>(`${this.baseUrl}/autoridades/lixeira/`);
  }

  restaurar(id: number): Observable<Autoridade> {
    return this.http.post<Autoridade>(`${this.baseUrl}/autoridades/${id}/restaurar/`, {});
}
}
