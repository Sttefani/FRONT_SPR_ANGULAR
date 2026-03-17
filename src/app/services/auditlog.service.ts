import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AuditLog {
  id: number;
  usuario: number | null;
  usuario_nome: string;
  acao: 'criou' | 'editou' | 'deletou';
  app_label: string;
  modelo: string;
  objeto_id: string;
  objeto_repr: string;
  timestamp: string;
}

export interface AuditLogPaginado {
  count: number;
  next: string | null;
  previous: string | null;
  results: AuditLog[];
}

export interface AuditLogFiltros {
  usuario_id?: number | string;
  acao?: string;
  modulo?: string;
  data_inicio?: string;
  data_fim?: string;
  busca?: string;
  page?: number;
  page_size?: number;
}

@Injectable({ providedIn: 'root' })
export class AuditLogService {
  private url = `${environment.apiUrl}/auditlog/`;

  constructor(private http: HttpClient) {}

  listar(filtros: AuditLogFiltros = {}): Observable<AuditLogPaginado> {
    let params = new HttpParams();
    Object.entries(filtros).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<AuditLogPaginado>(this.url, { params });
  }
}
