import { Component } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { HeaderComponent } from '../../components/header/header.component';
import { FooterComponent } from '../../components/footer/footer.component';

@Component({
  selector: 'app-alterar-senha',
  standalone: true,
  imports: [ReactiveFormsModule, HeaderComponent, FooterComponent],
  templateUrl: './alterar-senha.component.html',
  styleUrls: ['./alterar-senha.component.scss']
})
export class AlterarSenhaComponent {
  alterarSenhaForm: FormGroup;
  loading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService
  ) {
    this.alterarSenhaForm = this.fb.group({
      old_password: ['', [Validators.required]],
      new_password: ['', [Validators.required, Validators.minLength(6)]],
      confirm_password: ['', [Validators.required]]
    });

    // Adiciona validação customizada para confirmar senha
    this.alterarSenhaForm.get('confirm_password')?.setValidators([
      Validators.required,
      this.matchPassword.bind(this)
    ]);
  }

  matchPassword(control: any) {
    const newPassword = this.alterarSenhaForm?.get('new_password')?.value;
    const confirmPassword = control.value;

    if (newPassword !== confirmPassword) {
      return { mismatch: true };
    }
    return null;
  }

  onSubmit(): void {
    if (this.alterarSenhaForm.valid) {
      this.loading = true;
      this.errorMessage = '';

      // Remove confirm_password do objeto enviado
      const { confirm_password, ...dadosAlteracao } = this.alterarSenhaForm.value;

      this.authService.alterarSenha(dadosAlteracao).subscribe({
        next: () => {
          this.loading = false;
          // O redirecionamento é feito no service
        },
        error: (error) => {
          this.loading = false;
          if (error.status === 400) {
            this.errorMessage = 'Senha atual incorreta. Verifique se digitou seu CPF corretamente.';
          } else {
            this.errorMessage = 'Erro interno do servidor. Tente novamente.';
          }
        }
      });
    }
  }
}
