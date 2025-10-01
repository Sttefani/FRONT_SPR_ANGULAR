import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CargoService, Cargo } from '../../services/cargo.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-cargos-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './cargos-form.component.html',
  styleUrls: ['./cargos-form.component.scss']
})
export class CargosFormComponent implements OnInit {
  form!: FormGroup;
  isEditMode = false;
  cargoId: number | null = null;
  isLoading = false;
  isSaving = false;
  message = '';
  messageType: 'success' | 'error' = 'success';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private cargoService: CargoService
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.cargoId = Number(id);
      this.loadCargo(this.cargoId);
    }
  }

  initForm(): void {
    this.form = this.fb.group({
      nome: ['', [Validators.required, Validators.maxLength(100)]]
    });
  }

  loadCargo(id: number): void {
    this.isLoading = true;
    this.cargoService.getById(id).subscribe({
      next: (cargo) => {
        this.form.patchValue({
          nome: cargo.nome
        });
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Erro ao carregar cargo:', err);
        this.message = 'Erro ao carregar dados do cargo.';
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
      ? this.cargoService.update(this.cargoId!, formData)
      : this.cargoService.create(formData);

    request.subscribe({
      next: (cargo) => {
        const action = this.isEditMode ? 'atualizado' : 'cadastrado';

        Swal.fire({
          title: 'Sucesso!',
          text: `Cargo "${cargo.nome}" ${action} com sucesso.`,
          icon: 'success',
          confirmButtonText: 'Ok'
        }).then(() => {
          this.router.navigate(['/gabinete-virtual/cadastros/cargos']);
        });
      },
      error: (err: any) => {
        console.error('Erro ao salvar:', err);

        let errorMsg = 'Erro ao salvar o cargo.';
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
        this.router.navigate(['/gabinete-virtual/cadastros/cargos']);
      }
    });
  }

  get nome() {
    return this.form.get('nome');
  }
}
