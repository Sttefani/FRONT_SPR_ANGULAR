import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AutoridadeService, Autoridade } from '../../services/autoridade.service';
import { CargoService, Cargo } from '../../services/cargo.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-autoridades-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './autoridades-form.component.html',
  styleUrls: ['./autoridades-form.component.scss']
})
export class AutoridadesFormComponent implements OnInit {
  form!: FormGroup;
  isEditMode = false;
  autoridadeId: number | null = null;
  isLoading = false;
  isLoadingCargos = true;
  isSaving = false;
  message = '';
  messageType: 'success' | 'error' = 'success';

  cargos: Cargo[] = [];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private autoridadeService: AutoridadeService,
    private cargoService: CargoService
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.loadCargos();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.autoridadeId = Number(id);
      this.loadAutoridade(this.autoridadeId);
    }
  }

  initForm(): void {
    this.form = this.fb.group({
      nome: ['', [Validators.required, Validators.maxLength(255)]],
      cargo_id: ['', [Validators.required]]
    });
  }

  loadCargos(): void {
  this.isLoadingCargos = true;
  this.cargoService.getAllForDropdown().subscribe({
    next: (cargos) => {
      this.cargos = cargos;
      this.isLoadingCargos = false;
    },
    error: (err: any) => {
      console.error('Erro ao carregar cargos:', err);
      this.message = 'Erro ao carregar lista de cargos.';
      this.messageType = 'error';
      this.isLoadingCargos = false;
    }
  });
}

  loadAutoridade(id: number): void {
    this.isLoading = true;
    this.autoridadeService.getById(id).subscribe({
      next: (autoridade) => {
        this.form.patchValue({
          nome: autoridade.nome,
          cargo_id: autoridade.cargo.id
        });
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Erro ao carregar autoridade:', err);
        this.message = 'Erro ao carregar dados da autoridade.';
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
      ? this.autoridadeService.update(this.autoridadeId!, formData)
      : this.autoridadeService.create(formData);

    request.subscribe({
      next: (autoridade) => {
        const action = this.isEditMode ? 'atualizada' : 'cadastrada';

        Swal.fire({
          title: 'Sucesso!',
          text: `Autoridade "${autoridade.nome}" ${action} com sucesso.`,
          icon: 'success',
          confirmButtonText: 'Ok'
        }).then(() => {
          this.router.navigate(['/gabinete-virtual/cadastros/autoridades']);
        });
      },
      error: (err: any) => {
        console.error('Erro ao salvar:', err);

        let errorMsg = 'Erro ao salvar a autoridade.';
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
        this.router.navigate(['/gabinete-virtual/cadastros/autoridades']);
      }
    });
  }

  get nome() {
    return this.form.get('nome');
  }

  get cargo_id() {
    return this.form.get('cargo_id');
  }
}
