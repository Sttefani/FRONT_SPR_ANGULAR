import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';

import { TipoDocumentoService, TipoDocumento } from '../../services/tipo-documento.service';

@Component({
  selector: 'app-tipos-documento-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './tipos-documento-form.component.html',
  styleUrls: ['./tipos-documento-form.component.scss']
})
export class TiposDocumentoFormComponent implements OnInit {
  tipoDocumentoForm: FormGroup;
  isEditMode = false;
  tipoDocumentoId: number | null = null;
  isLoading = false;
  isSaving = false;
  message = '';
  messageType: 'success' | 'error' = 'success';

  constructor(
    private fb: FormBuilder,
    private tipoDocumentoService: TipoDocumentoService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.tipoDocumentoForm = this.fb.group({
      nome: ['', [Validators.required, Validators.maxLength(100)]]
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.tipoDocumentoId = Number(id);
      this.loadTipoDocumento(this.tipoDocumentoId);
    }
  }

  loadTipoDocumento(id: number): void {
    this.isLoading = true;
    this.tipoDocumentoService.getById(id).subscribe({
      next: (tipo) => {
        this.tipoDocumentoForm.patchValue({
          nome: tipo.nome
        });
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Erro ao carregar tipo de documento:', err);
        this.message = 'Erro ao carregar dados do tipo de documento.';
        this.messageType = 'error';
        this.isLoading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.tipoDocumentoForm.invalid) {
      this.tipoDocumentoForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    const formData = this.tipoDocumentoForm.value;

    const request = this.isEditMode && this.tipoDocumentoId
      ? this.tipoDocumentoService.update(this.tipoDocumentoId, formData)
      : this.tipoDocumentoService.create(formData);

    request.subscribe({
      next: (tipo) => {
        const action = this.isEditMode ? 'atualizado' : 'cadastrado';
        Swal.fire({
          title: 'Sucesso!',
          text: `Tipo de documento "${tipo.nome}" ${action} com sucesso.`,
          icon: 'success',
          confirmButtonText: 'Ok'
        }).then(() => {
          this.router.navigate(['/gabinete-virtual/cadastros/tipos-documento']);
        });
      },
      error: (err: any) => {
        console.error('Erro ao salvar:', err);

        let errorMsg = 'Erro ao salvar o tipo de documento.';
        if (err.error) {
          if (err.error.nome) {
            errorMsg = Array.isArray(err.error.nome) ? err.error.nome[0] : err.error.nome;
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
        this.router.navigate(['/gabinete-virtual/cadastros/tipos-documento']);
      }
    });
  }

  get nome() { return this.tipoDocumentoForm.get('nome'); }
}
