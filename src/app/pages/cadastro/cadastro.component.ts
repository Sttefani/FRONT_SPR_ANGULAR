import { Component } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
// SUGESTÃO: Importando a interface para garantir a tipagem forte dos dados
import { AuthService, CadastroRequest } from '../../services/auth.service';
import { HeaderComponent } from '../../components/header/header.component';
import { FooterComponent } from '../../components/footer/footer.component';
import { CommonModule } from '@angular/common'; // Necessário para *ngIf

@Component({
  selector: 'app-cadastro',
  standalone: true,
  // SUGESTÃO: Adicionado CommonModule para usar diretivas como *ngIf no template
  imports: [CommonModule, ReactiveFormsModule, RouterLink, HeaderComponent, FooterComponent],
  templateUrl: './cadastro.component.html',
  styleUrls: ['./cadastro.component.scss']
})
export class CadastroComponent {
  cadastroForm: FormGroup;
  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.cadastroForm = this.fb.group({
      nome_completo: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      cpf: ['', [Validators.required, Validators.minLength(11), Validators.maxLength(11)]],
      data_nascimento: [''], // Campo opcional
      telefone_celular: [''], // Campo opcional
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, {

      validators: this.passwordMatchValidator
    });
  }

  /**
   * Validador customizado para verificar se os campos de senha e confirmação de senha coincidem.
   * @param control O FormGroup que contém os campos de senha.
   * @returns Um objeto de erro { mismatch: true } se as senhas não baterem, caso contrário, null.
   */
  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;

    // Se os campos ainda não foram tocados ou as senhas são iguais, a validação passa.
    if (password === confirmPassword) {
      // Se havia um erro, limpa ele
      control.get('confirmPassword')?.setErrors(null);
      return null;
    } else {
      // Se são diferentes, define um erro no campo 'confirmPassword'
      control.get('confirmPassword')?.setErrors({ mismatch: true });
      return { mismatch: true };
    }
  }

  /**
   * Formata e limpa o input de CPF, permitindo apenas a entrada de números.
   * Este método é chamado pelo evento (input) no template HTML.
   * @param event O evento de input do campo.
   */
  onCpfInput(event: any): void {
    const value = event.target.value.replace(/\D/g, ''); // Remove tudo que não é dígito
    this.cadastroForm.get('cpf')?.setValue(value, { emitEvent: false }); // Atualiza o valor no formControl
    event.target.value = value; // Atualiza o valor visual no input
  }

  /**
   * Formata e limpa o input de Telefone, permitindo apenas a entrada de números.
   * @param event O evento de input do campo.
   */
  onTelefoneInput(event: any): void {
    const value = event.target.value.replace(/\D/g, ''); // Remove tudo que não é dígito
    this.cadastroForm.get('telefone_celular')?.setValue(value, { emitEvent: false });
    event.target.value = value;
  }

  /**
   * Método chamado quando o formulário é submetido.
   */
  onSubmit(): void {
    // Marca todos os campos como "tocados" para exibir os erros de validação, se houver.
    this.cadastroForm.markAllAsTouched();

    if (this.cadastroForm.valid) {
      this.loading = true;
      this.errorMessage = '';
      this.successMessage = '';

      // Desestrutura o valor do formulário para remover 'confirmPassword'
      const { confirmPassword, ...formValue } = this.cadastroForm.value;

      // SUGESTÃO DE REFINAMENTO:
      // Utiliza a interface 'CadastroRequest' para garantir que os dados
      // enviados para a API tenham o formato correto.
      const dadosCadastro: CadastroRequest = formValue;

      this.authService.cadastro(dadosCadastro).subscribe({
        next: () => {
          this.loading = false;
          this.successMessage = 'Cadastro realizado com sucesso! Aguarde a aprovação do administrador para fazer login.';
          this.cadastroForm.reset();

          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 3000);
        },
        error: (err) => {
          this.loading = false;

          if (err.status === 400 && err.error) {
            const errors = err.error;

            // Verificamos campo por campo qual foi o erro
            if (errors.email) {
              this.errorMessage = errors.email[0];
            } else if (errors.cpf) {
              this.errorMessage = errors.cpf[0];

            // ===== ADICIONE ESTA VERIFICAÇÃO AQUI =====
            } else if (errors.telefone_celular) {
              this.errorMessage = errors.telefone_celular[0]; // Exibe a mensagem de telefone duplicado
            // ===========================================

            } else {
              this.errorMessage = 'Dados inválidos. Por favor, verifique as informações e tente novamente.';
            }
          } else {
            this.errorMessage = 'Ocorreu um erro inesperado no servidor. Por favor, tente novamente mais tarde.';
          }
        }
      });
    }
  }

  // Função auxiliar para facilitar o acesso aos controles do formulário no template HTML
  get f() {
    return this.cadastroForm.controls;
  }
}
