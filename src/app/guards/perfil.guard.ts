import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const perfilGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.getCurrentUser();
  const requiredPerfis = route.data['requiredPerfis'] as string[];

  // 1. Verifica se o usuário está logado. Se não, vai para o login.
  if (!user) {
    router.navigate(['/login']);
    return false;
  }

  // --- INÍCIO DA CORREÇÃO ---
  // 2. Regra de Ouro: Se o usuário é Super Admin, ele pode acessar TUDO.
  // Acesso liberado imediatamente, sem verificar a lista de perfis.
  if (authService.isSuperAdmin()) {
    return true;
  }
  // --- FIM DA CORREÇÃO ---

  // 3. Se a rota não exige nenhum perfil específico, libera o acesso.
  if (!requiredPerfis || requiredPerfis.length === 0) {
    return true;
  }

  // 4. Verifica se o perfil do usuário (que não é Super Admin) está na lista de perfis permitidos.
  const hasPermission = requiredPerfis.includes(user.perfil);

  if (!hasPermission) {
    router.navigate(['/acesso-negado']);
    return false;
  }

  // 5. Se passou em todas as verificações, o acesso é permitido.
  return true;
};
