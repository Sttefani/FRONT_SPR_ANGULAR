import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UsuarioService, User } from '../../services/usuario.service';
import { ServicoPericialService, ServicoPericial } from '../../services/servico-pericial.service';
import { UnidadeDemandanteService } from '../../services/unidade-demandante.service';
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

  servicosDisponiveis: ServicoPericial[] = [];
  unidades: { id: number; sigla: string; nome: string }[] = [];

  statusOptions = [
    { value: 'ATIVO',     label: 'Ativo' },
    { value: 'PENDENTE',  label: 'Pendente' },
    { value: 'INATIVO',   label: 'Inativo' }
  ];

  perfilOptions = [
    { value: 'PERITO',          label: 'Perito',          hint: 'Acessa ocorrências, OS e custódia da sua unidade.' },
    { value: 'OPERACIONAL',     label: 'Operacional',     hint: 'Acesso operacional à custódia da sua unidade.' },
    { value: 'ADMINISTRATIVO',  label: 'Administrativo',  hint: 'Acesso administrativo global ao sistema.' },
    { value: 'CUSTODIANTE',     label: 'Custodiante',     hint: 'Gerencia custódia de todas as unidades (global).' },
    { value: 'EXTERNO',         label: 'Externo',         hint: 'Acesso restrito à custódia da própria unidade. Requer unidade demandante.' },
  ];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private usuarioService: UsuarioService,
    private servicoPericialService: ServicoPericialService,
    private unidadeService: UnidadeDemandanteService
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.loadServicos();
    this.loadUnidades();
    const userId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadUser(userId);
  }

  initForm(): void {
    this.editForm = this.fb.group({
      status:                 ['', Validators.required],
      perfil:                 ['', Validators.required],
      telefone_celular:       [''],
      nome_completo:          [''],
      servicos_periciais_ids: [[]],
      unidade_demandante_id:  [null],   // obrigatório apenas para EXTERNO
    });
  }

  /** True quando o perfil selecionado no form é EXTERNO. */
  get isExterno(): boolean {
    return this.editForm.get('perfil')?.value === 'EXTERNO';
  }

  /** Hint do perfil atualmente selecionado. */
  get perfilHint(): string {
    const v = this.editForm.get('perfil')?.value;
    return this.perfilOptions.find(p => p.value === v)?.hint ?? '';
  }

  loadServicos(): void {
    this.servicoPericialService.getAll().subscribe({
      next: (response) => { this.servicosDisponiveis = response.results; },
      error: (err: any) => console.error('Erro ao carregar serviços:', err)
    });
  }

  loadUnidades(): void {
    this.unidadeService.getAllForDropdown().subscribe({
      next: (res) => { this.unidades = res; },
      error: (err: any) => console.error('Erro ao carregar unidades:', err)
    });
  }

  loadUser(userId: number): void {
    this.isLoading = true;
    this.usuarioService.getUserById(userId).subscribe({
      next: (user) => {
        this.user = user;
        this.editForm.patchValue({
          telefone_celular:      user.telefone_celular || '',
          status:                user.status,
          perfil:                user.perfil,
          servicos_periciais_ids: user.servicos_periciais?.map(s => s.id) || [],
          unidade_demandante_id: user.unidade_demandante?.id ?? null,
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

    // Validação extra: EXTERNO exige unidade demandante
    if (this.isExterno && !this.editForm.value.unidade_demandante_id) {
      this.message = 'O perfil Externo exige uma Unidade Demandante selecionada.';
      this.messageType = 'error';
      return;
    }

    this.isSaving = true;
    const raw = this.editForm.value;

    // Remove unidade_demandante_id do payload quando não é EXTERNO
    // para não apagar um vínculo existente acidentalmente
    const formData: any = { ...raw };
    if (!this.isExterno) {
      delete formData.unidade_demandante_id;
    }

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
