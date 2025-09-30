import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UsuarioService, User } from '../../services/usuario.service';
import { ServicoPericialService, ServicoPericial } from '../../services/servico-pericial.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-usuario-editar',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './usuario-editar.component.html',
  styleUrls: ['./usuario-editar.component.scss']
})
export class UsuarioEditarComponent implements OnInit {
  editForm!: FormGroup;
  user: User | null = null;
  isLoading = true;
  isSaving = false;
  message = '';
  messageType: 'success' | 'error' = 'success';

  servicosDisponiveis: ServicoPericial[] = [];  // ← AQUI, fora do construtor

  statusOptions = [
    { value: 'ATIVO', label: 'Ativo' },
    { value: 'PENDENTE', label: 'Pendente' },
    { value: 'INATIVO', label: 'Inativo' }
  ];

  perfilOptions = [
    { value: 'PERITO', label: 'Perito' },
    { value: 'OPERACIONAL', label: 'Operacional' },
    { value: 'ADMIN', label: 'Administrativo' }
  ];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private usuarioService: UsuarioService,
    private servicoPericialService: ServicoPericialService
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.loadServicos();
    const userId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadUser(userId);
  }

  initForm(): void {
    this.editForm = this.fb.group({
      status: ['', Validators.required],
      perfil: ['', Validators.required],
      telefone_celular: [''],
      nome_completo: [''],
      servicos_periciais_ids: [[]]  // ← Array de IDs
    });
  }

  loadServicos(): void {
    this.servicoPericialService.getAll().subscribe({
      next: (response) => {
        this.servicosDisponiveis = response.results;
      },
      error: (err: any) => {
        console.error('Erro ao carregar serviços:', err);
      }
    });
  }

  loadUser(userId: number): void {
    this.isLoading = true;
    this.usuarioService.getUserById(userId).subscribe({
      next: (user) => {
        this.user = user;
        this.editForm.patchValue({
          telefone_celular: user.telefone_celular || '',
          status: user.status,
          perfil: user.perfil,
          servicos_periciais_ids: user.servicos_periciais?.map(s => s.id) || []
        });
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Erro ao carregar usuário:', err);
        this.message = 'Erro ao carregar os dados do usuário.';
        this.messageType = 'error';
        this.isLoading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.editForm.invalid || !this.user) return;

    this.isSaving = true;
    const formData = this.editForm.value;

    this.usuarioService.updateUser(this.user.id, formData).subscribe({
      next: () => {
        this.message = 'Usuário atualizado com sucesso!';
        this.messageType = 'success';
        this.isSaving = false;

        setTimeout(() => {
          this.router.navigate(['/gabinete-virtual/gerencia/usuarios', this.user!.id, 'detalhes']);
        }, 1500);
      },
      error: (err: any) => {
        console.error('Erro ao atualizar usuário:', err);
        this.message = 'Erro ao atualizar o usuário.';
        this.messageType = 'error';
        this.isSaving = false;
      }
    });
  }

  voltar(): void {
    this.router.navigate(['/gabinete-virtual/gerencia/usuarios', this.user?.id, 'detalhes']);
  }

  cancelar(): void {
    Swal.fire({
      title: 'Cancelar edição?',
      text: 'As alterações não serão salvas.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, cancelar',
      cancelButtonText: 'Continuar editando'
    }).then((result) => {
      if (result.isConfirmed) {
        this.voltar();
      }
    });
  }
}
