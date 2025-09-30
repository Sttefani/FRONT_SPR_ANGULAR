import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

// Esta é a nova sintaxe para interceptors funcionais.
// Não usamos mais 'class', 'implements' ou 'constructor'.
export const authInterceptor: HttpInterceptorFn = (req, next) => {

  // Usamos 'inject()' para obter instâncias de serviços, em vez do construtor.
  const authService = inject(AuthService);
  const token = authService.getToken();

  // Se o token existir, clonamos a requisição para adicionar o cabeçalho.
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  // Passamos a requisição (original ou clonada) para o próximo manipulador.
  // A lógica de tratamento de erro continua a mesma.
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Se o token expirar ou for inválido, o interceptor faz o logout.
        // Esta é uma ótima prática de segurança!
        authService.logout();
      }
      return throwError(() => error);
    })
  );
};
