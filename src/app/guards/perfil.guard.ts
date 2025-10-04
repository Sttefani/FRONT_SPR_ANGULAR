import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const perfilGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.getCurrentUser();
  const requiredPerfis = route.data['requiredPerfis'] as string[];

  if (!user) {
    router.navigate(['/login']);
    return false;
  }

  if (!requiredPerfis || requiredPerfis.length === 0) {
    return true;
  }

  const hasPermission = requiredPerfis.includes(user.perfil);

  if (!hasPermission) {
    router.navigate(['/acesso-negado']);
    return false;
  }

  return true;
};
