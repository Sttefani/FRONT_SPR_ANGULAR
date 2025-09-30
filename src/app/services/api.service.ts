// Cole este código dentro do seu arquivo api.service.ts

import { Injectable } from '@angular/core';
// Adicione HttpParams se não estiver importado
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

// É uma boa prática definir uma interface para seus objetos de dados.
// Isso ajuda com o autocompletar e a prevenção de erros.
export interface User {
  id: number;
  nome_completo: string;
  email: string;
  cpf: string;
  telefone_celular?: string;
  data_nascimento?: string;
  status: 'PENDENTE' | 'ATIVO' | 'INATIVO';
  perfil: string;
  created_at: string;
  updated_at: string;
  servicos_periciais?: ServicoPericialNested[];  // ← ADICIONE
}

export interface ServicoPericialNested {
  id: number;
  sigla: string;
  nome: string;
}
@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = 'http://localhost:8000/api'; // URL da sua API Django

  constructor(private http: HttpClient) { }

  // Seu método getData() pode continuar aqui se você o usa em outro lugar
  getData(): Observable<any> {
    return this.http.get(`${this.baseUrl}/endpoint`);
  }

}
