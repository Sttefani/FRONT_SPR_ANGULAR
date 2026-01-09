// bairro.service.ts
// Coloque em: src/app/services/bairro.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Bairro {
  id: number;
  nome: string;
  cidade?: number;
  cidade_nome?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BairroService {
  private apiUrl = `${environment.apiUrl}/bairros`;

  constructor(private http: HttpClient) { }

  /**
   * Retorna todos os bairros de uma cidade específica (para dropdown)
   * @param cidadeId ID da cidade
   */
  getDropdownByCidade(cidadeId: number): Observable<Bairro[]> {
    return this.http.get<Bairro[]>(`${this.apiUrl}/dropdown/?cidade_id=${cidadeId}`);
  }

  /**
   * Retorna todos os bairros (com paginação)
   */
  getAll(search?: string): Observable<any> {
    let url = this.apiUrl + '/';
    if (search) {
      url += `?search=${encodeURIComponent(search)}`;
    }
    return this.http.get<any>(url);
  }

  /**
   * Retorna um bairro pelo ID
   */
  getById(id: number): Observable<Bairro> {
    return this.http.get<Bairro>(`${this.apiUrl}/${id}/`);
  }

  /**
   * Cria um novo bairro
   */
  create(bairro: { nome: string; cidade: number }): Observable<Bairro> {
    return this.http.post<Bairro>(`${this.apiUrl}/`, bairro);
  }

  /**
   * Atualiza um bairro existente
   */
  update(id: number, bairro: { nome: string; cidade: number }): Observable<Bairro> {
    return this.http.put<Bairro>(`${this.apiUrl}/${id}/`, bairro);
  }

  /**
   * Deleta um bairro (soft delete)
   */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}/`);
  }
}
