import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProcedimentoService, Procedimento } from '../../services/procedimento.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-procedimentos-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './procedimentos-form.component.html',
  styleUrls: ['./procedimentos-form.component.scss']
})
export class ProcedimentosFormComponent implements OnInit {
  form!: FormGroup;
  isEditMode = false;
  procedimentoId: number | null = null;
  isLoading = false;
  isSaving = false;
  message = '';
  messageType: 'success' | 'error' = 'success';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private procedimentoService: ProcedimentoService
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.procedimentoId = Number(id);
      this.loadProcedimento(this.procedimentoId);
    }
  }

  initForm(): void {
    this.form = this.fb.group({
      sigla: ['', [Validators.required, Validators.maxLength(20)]],
      nome: ['', [Validators.required, Validators.maxLength(255)]]
    });
  }

  loadProcedimento(id: number): void {
    this.isLoading = true;
    this.procedimentoService.getById(id).subscribe({
      next: (procedimento) => {
        this.form.patchValue({
          sigla: procedimento.sigla,
          nome: procedimento.nome
        });
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Erro ao carregar procedimento:', err);
        this.message = 'Erro ao carregar dados do procedimento.';
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
      ? this.procedimentoService.update(this.procedimentoId!, formData)
      : this.procedimentoService.create(formData);

    request.subscribe({
      next: (procedimento) => {
        const action = this.isEditMode ? 'atualizado' : 'cadastrado';

        Swal.fire({
          title: 'Sucesso!',
          text: `Procedimento "${procedimento.sigla}" ${action} com sucesso.`,
          icon: 'success',
          confirmButtonText: 'Ok'
        }).then(() => {
          this.router.navigate(['/gabinete-virtual/cadastros/procedimentos']);
        });
      },
      error: (err: any) => {
        console.error('Erro completo:', err);

        let errorMsg = 'Erro ao salvar o procedimento.';

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
        this.router.navigate(['/gabinete-virtual/cadastros/procedimentos']);
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
