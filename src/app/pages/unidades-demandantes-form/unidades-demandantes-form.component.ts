import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UnidadeDemandanteService, UnidadeDemandante } from '../../services/unidade-demandante.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-unidades-demandantes-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './unidades-demandantes-form.component.html',
  styleUrls: ['./unidades-demandantes-form.component.scss']
})
export class UnidadesDemandantesFormComponent implements OnInit {
  form!: FormGroup;
  isEditMode = false;
  unidadeId: number | null = null;
  isLoading = false;
  isSaving = false;
  message = '';
  messageType: 'success' | 'error' = 'success';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private unidadeDemandanteService: UnidadeDemandanteService
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.unidadeId = Number(id);
      this.loadUnidade(this.unidadeId);
    }
  }

  initForm(): void {
    this.form = this.fb.group({
      sigla: ['', [Validators.required, Validators.maxLength(20)]],
      nome: ['', [Validators.required, Validators.maxLength(255)]]
    });
  }

  loadUnidade(id: number): void {
    this.isLoading = true;
    this.unidadeDemandanteService.getById(id).subscribe({
      next: (unidade) => {
        this.form.patchValue({
          sigla: unidade.sigla,
          nome: unidade.nome
        });
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Erro ao carregar unidade:', err);
        this.message = 'Erro ao carregar dados da unidade.';
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
      ? this.unidadeDemandanteService.update(this.unidadeId!, formData)
      : this.unidadeDemandanteService.create(formData);

    request.subscribe({
      next: (unidade) => {
        const action = this.isEditMode ? 'atualizada' : 'cadastrada';

        Swal.fire({
          title: 'Sucesso!',
          text: `Unidade "${unidade.sigla}" ${action} com sucesso.`,
          icon: 'success',
          confirmButtonText: 'Ok'
        }).then(() => {
          this.router.navigate(['/gabinete-virtual/cadastros/unidades-demandantes']);
        });
      },
      error: (err: any) => {
        console.error('Erro completo:', err);

        let errorMsg = 'Erro ao salvar a unidade.';

        if (err.error) {
          if (err.error.sigla) {
            errorMsg = Array.isArray(err.error.sigla)
              ? err.error.sigla[0]
              : err.error.sigla;
          } else if (err.error.nome) {
            errorMsg = Array.isArray(err.error.nome)
              ? err.error.nome[0]
              : err.error.nome;
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
        this.router.navigate(['/gabinete-virtual/cadastros/unidades-demandantes']);
      }
    });
  }

  get sigla() {
    return this.form.get('sigla');
  }

  get nome() {
    return this.form.get('nome');
  }
}
