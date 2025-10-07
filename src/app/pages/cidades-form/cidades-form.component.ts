import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CidadeService } from '../../services/cidade.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-cidades-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './cidades-form.component.html',
  styleUrls: ['./cidades-form.component.scss']
})
export class CidadesFormComponent implements OnInit {
  form!: FormGroup;
  isEditMode = false;
  cidadeId: number | null = null;
  isLoading = false;
  isSaving = false;
  message = '';
  messageType: 'success' | 'error' = 'success';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private cidadeService: CidadeService
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.cidadeId = Number(id);
      this.loadCidade(this.cidadeId);
    }
  }

  initForm(): void {
    this.form = this.fb.group({
      nome: ['', [Validators.required, Validators.maxLength(100)]]
    });
  }

  loadCidade(id: number): void {
    this.isLoading = true;
    this.cidadeService.getById(id).subscribe({
      next: (cidade) => {
        this.form.patchValue({
          nome: cidade.nome
        });
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Erro ao carregar cidade:', err);
        this.message = 'Erro ao carregar dados da cidade.';
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
      ? this.cidadeService.update(this.cidadeId!, formData)
      : this.cidadeService.create(formData);

    request.subscribe({
      next: (cidade) => {
        const action = this.isEditMode ? 'atualizada' : 'cadastrada';

        Swal.fire({
          title: 'Sucesso!',
          text: `Cidade "${cidade.nome}" ${action} com sucesso.`,
          icon: 'success',
          confirmButtonText: 'Ok'
        }).then(() => {
          this.router.navigate(['/gabinete-virtual/cadastros/cidades']);
        });
      },
      error: (err: any) => {
        console.error('Erro ao salvar:', err);

        let errorMsg = 'Erro ao salvar a cidade.';
        if (err.error?.nome) {
          errorMsg = err.error.nome[0];
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
        this.router.navigate(['/gabinete-virtual/cadastros/cidades']);
      }
    });
  }

  get nome() {
    return this.form.get('nome');
  }
}
