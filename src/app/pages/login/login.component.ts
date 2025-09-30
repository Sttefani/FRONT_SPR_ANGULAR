import { Component } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { HeaderComponent } from '../../components/header/header.component';
import { FooterComponent } from '../../components/footer/footer.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    HeaderComponent,
     FooterComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  loginForm: FormGroup;
  loading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });

    // Se já estiver logado, redireciona
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/gabinete-virtual']);
    }
  }

  onSubmit(): void {
  if (this.loginForm.valid) {
    this.loading = true;
    this.errorMessage = '';

    this.authService.login(this.loginForm.value).subscribe({
      next: () => {
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;

        // =================================================================
        // INÍCIO DO NOSSO BLOCO DE DEPURAÇÃO
        // =================================================================

        console.log('--- ERRO RECEBIDO DO BACKEND ---');
        console.log('Objeto de erro completo (err):', err);
        console.log('Corpo do erro (err.error):', err.error);
        console.log('Tipo do corpo do erro (typeof err.error):', typeof err.error);

        // =================================================================
        // FIM DO BLOCO DE DEPURAÇÃO
        // =================================================================

        // Mantemos a lógica original por enquanto para a UI
        if (err.status === 401) {
          if (err.error && err.error.detail) {
            this.errorMessage = err.error.detail;
          } else {
            this.errorMessage = 'E-mail ou senha incorretos.';
          }
        } else {
          this.errorMessage = 'Erro interno do servidor. Tente novamente.';
        }
      }
    });
  }
}
}
