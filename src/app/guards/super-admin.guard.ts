import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service'; // Ajuste o caminho se sua estrutura de pastas for diferente

export const superAdminGuard: CanActivateFn = (route, state) => {

  // Injetamos os serviços que precisamos: AuthService para verificar o perfil e Router para redirecionar.
  const authService = inject(AuthService);
  const router = inject(Router);

  // A lógica é simples: o usuário está logado E ele é um Super Admin?
  if (authService.isLoggedIn() && authService.isSuperAdmin()) {
    // Se sim, ele pode passar. O acesso à rota é permitido.
    return true;
  } else {
    // Se não, nós o redirecionamos para a página principal do gabinete virtual.
    // Isso é melhor do que mostrar uma página de erro.
    router.navigate(['/gabinete-virtual']);
    // E retornamos 'false' para bloquear a navegação para a rota protegida.
    return false;
  }
};
