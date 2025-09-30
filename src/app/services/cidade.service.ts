import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Cidade {
  id: number;
  nome: string;
  created_at: string;
  updated_at: string;
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
export class CidadeService {
  private baseUrl = 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Cidade[]> {
    return this.http.get<Cidade[]>(`${this.baseUrl}/cidades/`);
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
}
