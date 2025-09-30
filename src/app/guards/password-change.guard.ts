import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class PasswordChangeGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): boolean {
    // Só permite acesso à tela de alterar senha se deve_alterar_senha for true
    if (this.authService.deveAlterarSenha()) {
      return true;
    } else {
      this.router.navigate(['/gabinete-virtual']);
      return false;
    }
  }
}
