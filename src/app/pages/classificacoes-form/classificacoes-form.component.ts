import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClassificacaoOcorrenciaService, ClassificacaoOcorrencia } from '../../services/classificacao-ocorrencia.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-classificacoes-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './classificacoes-form.component.html',
  styleUrls: ['./classificacoes-form.component.scss']
})
export class ClassificacoesFormComponent implements OnInit {
  form!: FormGroup;
  isEditMode = false;
  classificacaoId: number | null = null;
  isLoading = false;
  isLoadingGrupos = true;
  isSaving = false;
  message = '';
  messageType: 'success' | 'error' = 'success';

  gruposPrincipais: ClassificacaoOcorrencia[] = [];
  todasClassificacoes: ClassificacaoOcorrencia[] = [];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private classificacaoService: ClassificacaoOcorrenciaService
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.loadTodasClassificacoes();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.classificacaoId = Number(id);
      this.loadClassificacao(this.classificacaoId);
    }
  }

  initForm(): void {
    this.form = this.fb.group({
      codigo: ['', [Validators.required, Validators.maxLength(20)]],
      nome: ['', [Validators.required, Validators.maxLength(255)]],
      parent_id: [null]
    });
  }

  loadTodasClassificacoes(): void {
    this.isLoadingGrupos = true;
    this.classificacaoService.getAll().subscribe({
      next: (classificacoes) => {
        this.todasClassificacoes = classificacoes;
        this.gruposPrincipais = classificacoes.filter(c => !c.parent);
        this.isLoadingGrupos = false;
      },
      error: (err: any) => {
        console.error('Erro ao carregar classificações:', err);
        this.message = 'Erro ao carregar grupos principais.';
        this.messageType = 'error';
        this.isLoadingGrupos = false;
      }
    });
  }

  loadClassificacao(id: number): void {
    this.isLoading = true;
    this.classificacaoService.getById(id).subscribe({
      next: (classificacao) => {
        this.form.patchValue({
          codigo: classificacao.codigo,
          nome: classificacao.nome,
          parent_id: classificacao.parent?.id || null
        });
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Erro ao carregar classificação:', err);
        this.message = 'Erro ao carregar dados da classificação.';
        this.messageType = 'error';
        this.isLoading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    const formData = this.form.value;

    const request = this.isEditMode
      ? this.classificacaoService.update(this.classificacaoId!, formData)
      : this.classificacaoService.create(formData);

    request.subscribe({
      next: (classificacao) => {
        const action = this.isEditMode ? 'atualizada' : 'cadastrada';

        Swal.fire({
          title: 'Sucesso!',
          text: `Classificação "${classificacao.codigo}" ${action} com sucesso.`,
          icon: 'success',
          confirmButtonText: 'Ok'
        }).then(() => {
          this.router.navigate(['/gabinete-virtual/cadastros/classificacoes']);
        });
      },
      error: (err: any) => {
        console.error('Erro completo:', err);

        let errorMsg = 'Erro ao salvar a classificação.';

        if (err.error) {
          if (err.error.codigo) {
            errorMsg = Array.isArray(err.error.codigo)
              ? err.error.codigo[0]
              : err.error.codigo;
          } else if (err.error.nome) {
            errorMsg = Array.isArray(err.error.nome)
              ? err.error.nome[0]
              : err.error.nome;
          } else if (err.error.parent_id) {
            errorMsg = Array.isArray(err.error.parent_id)
              ? err.error.parent_id[0]
              : err.error.parent_id;
          } else if (err.error.detail) {
            errorMsg = err.error.detail;
          } else if (typeof err.error === 'string') {
            errorMsg = err.error;
          }
        }

        this.message = errorMsg;
        this.messageType = 'error';
        this.isSaving = false;
      }
    });
  }

  cancelar(): void {
    Swal.fire({
      title: 'Cancelar?',
      text: 'As alterações não serão salvas.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, cancelar',
      cancelButtonText: 'Continuar editando'
    }).then((result) => {
      if (result.isConfirmed) {
        this.router.navigate(['/gabinete-virtual/cadastros/classificacoes']);
      }
    });
  }

  get codigo() {
    return this.form.get('codigo');
  }

  get nome() {
    return this.form.get('nome');
  }

  get parent_id() {
    return this.form.get('parent_id');
  }
}
