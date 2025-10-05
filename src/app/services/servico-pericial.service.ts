import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';


export interface ServicoPericial {
  id: number;
  sigla: string;
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

export interface PaginatedResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ServicoPericial[];
}

@Injectable({
  providedIn: 'root'
})
export class ServicoPericialService {
  private baseUrl = 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  getAll(search?: string): Observable<PaginatedResponse> {
    let params = new HttpParams();
    if (search) {
      params = params.set('search', search);
    }
    return this.http.get<PaginatedResponse>(`${this.baseUrl}/servicos-periciais/`, { params });
  }

  getByUrl(url: string): Observable<PaginatedResponse> {
    return this.http.get<PaginatedResponse>(url);
  }

  getAllForDropdown(): Observable<ServicoPericial[]> {
  return this.http.get<any>(`${this.baseUrl}/servicos-periciais/`)
    .pipe(
      map(response => {
        // Se for array direto, retorna
        if (Array.isArray(response)) {
          return response;
        }
        // Se for objeto paginado, extrai results
        return response.results || [];
      })
    );
}
  getById(id: number): Observable<ServicoPericial> {
    return this.http.get<ServicoPericial>(`${this.baseUrl}/servicos-periciais/${id}/`);
  }

  create(data: { sigla: string; nome: string }): Observable<ServicoPericial> {
    return this.http.post<ServicoPericial>(`${this.baseUrl}/servicos-periciais/`, data);
  }

  update(id: number, data: { sigla?: string; nome?: string }): Observable<ServicoPericial> {
    return this.http.patch<ServicoPericial>(`${this.baseUrl}/servicos-periciais/${id}/`, data);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/servicos-periciais/${id}/`);
  }

  getLixeira(): Observable<ServicoPericial[]> {
    return this.http.get<ServicoPericial[]>(`${this.baseUrl}/servicos-periciais/lixeira/`);
  }

  restaurar(id: number): Observable<ServicoPericial> {
    return this.http.post<ServicoPericial>(`${this.baseUrl}/servicos-periciais/${id}/restaurar/`, {});
  }
}
