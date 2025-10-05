import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user?: {
    id: number;
    nome_completo: string;
    email: string;
    perfil: string;
    deve_alterar_senha: boolean;
  };
}

export interface CadastroRequest {
  nome_completo: string;
  email: string;
  data_nascimento: string;
  cpf: string;
  telefone_celular: string;
  password: string;
}

export interface AlterarSenhaRequest {
  old_password: string;
  new_password: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private baseUrl = 'http://localhost:8000'; // URL da sua API Django
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // Verifica se há um usuário logado ao inicializar
    this.checkCurrentUser();
  }

  private checkCurrentUser(): void {
  const token = this.getToken();

  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));

      // VALIDAR SE TOKEN NÃO EXPIROU
      const isExpired = payload.exp <= Date.now() / 1000;
      if (isExpired) {
        console.warn('Token expirado, fazendo logout automático');
        this.logout();
        return;
      }

      const userData = {
        id: payload.user_id,
        nome_completo: payload.nome_completo || 'Usuário',
        email: payload.email || '',
        perfil: payload.perfil || 'PERITO',
        deve_alterar_senha: payload.deve_alterar_senha || false,
        is_superuser: payload.is_superuser || false,
        servicos_periciais: payload.servicos_periciais || [] // ← ADICIONAR
      };
      this.currentUserSubject.next(userData);
    } catch (error) {
      console.error('Erro ao decodificar token:', error);
      this.logout();
    }
  } else {
    this.currentUserSubject.next(null);
  }

}

 login(credentials: LoginRequest): Observable<LoginResponse> {
  return this.http.post<LoginResponse>(`${this.baseUrl}/api/token/`, credentials)
    .pipe(
      tap(response => {
        // Salva os tokens
        localStorage.setItem('access_token', response.access);
        localStorage.setItem('refresh_token', response.refresh);

        // Decodifica o token para obter dados do usuário
        try {
          const payload = JSON.parse(atob(response.access.split('.')[1]));
          const userData = {
            id: payload.user_id,
            nome_completo: payload.nome_completo || 'Usuário',
            email: payload.email || credentials.email,
            perfil: payload.perfil || 'PERITO',
            deve_alterar_senha: payload.deve_alterar_senha || false,
            is_superuser: payload.is_superuser || false,
            servicos_periciais: payload.servicos_periciais || [] // ← ADICIONAR
          };

          // Atualiza o usuário atual
          this.currentUserSubject.next(userData);

          // Redireciona baseado no deve_alterar_senha
          if (userData.deve_alterar_senha) {
            this.router.navigate(['/alterar-senha']);
          } else {
            this.router.navigate(['/gabinete-virtual']);
          }
        } catch (error) {
          console.error('Erro ao processar login:', error);
          // Se houver erro na decodificação, usa dados da resposta se disponível
          if (response.user) {
            this.currentUserSubject.next(response.user);
            if (response.user.deve_alterar_senha) {
              this.router.navigate(['/alterar-senha']);
            } else {
              this.router.navigate(['/gabinete-virtual']);
            }
          }
        }
      })
    );
}
  cadastro(dados: CadastroRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/registrar/`, dados);
  }

  alterarSenha(dados: AlterarSenhaRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/change-password/`, dados)
      .pipe(
        tap(() => {
          // Após alterar a senha, atualiza o estado do usuário
          const currentUser = this.currentUserSubject.value;
          if (currentUser) {
            currentUser.deve_alterar_senha = false;
            this.currentUserSubject.next(currentUser);
          }
          this.router.navigate(['/gabinete-virtual']);
        })
      );
  }

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  isLoggedIn(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp > Date.now() / 1000;
    } catch {
      return false;
    }
  }

  getCurrentUser(): any {
    return this.currentUserSubject.value;
  }

  deveAlterarSenha(): boolean {
    const user = this.getCurrentUser();
    return user?.deve_alterar_senha || false;
  }

 isSuperAdmin(): boolean {
  const user = this.getCurrentUser();
  return user?.is_superuser === true;
}
}
