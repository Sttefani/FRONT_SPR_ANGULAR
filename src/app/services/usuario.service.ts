import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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
  servicos_periciais?: ServicoPericialNested[];
}

export interface ServicoPericialNested {
  id: number;
  sigla: string;
  nome: string;
}

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  private baseUrl = 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  getUsersByUrl(url: string): Observable<any> {
    return this.http.get<any>(url);
  }

  getUserById(userId: number): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/usuarios/${userId}/`);
  }

  updateUser(userId: number, userData: any): Observable<User> {
    return this.http.patch<User>(`${this.baseUrl}/usuarios/${userId}/`, userData);
  }

  softDeleteUser(userId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/usuarios/${userId}/`);
  }

  getUsersByStatus(status: 'PENDENTE'): Observable<User[]> {
    return this.http.get<User[]>(`${this.baseUrl}/usuarios/`, {
      params: { status }
    });
  }

  approveUser(userId: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/usuarios/${userId}/aprovar/`, {});
  }

  rejectUser(userId: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/usuarios/${userId}/reprovar/`, {});
  }
  reactivateUser(userId: number): Observable<any> {
  return this.http.post(`${this.baseUrl}/usuarios/${userId}/reativar/`, {});
}
getAllUsers(statusFilter: string = 'todos'): Observable<any> {
  let params: any = {};

  if (statusFilter !== 'todos') {
    params.status = statusFilter.toUpperCase();
  }

  return this.http.get<any>(`${this.baseUrl}/usuarios/`, { params });
}
resetPasswordToCpf(userId: number): Observable<any> {
  return this.http.post(`${this.baseUrl}/usuarios/${userId}/resetar-senha-cpf/`, {});
}
}
