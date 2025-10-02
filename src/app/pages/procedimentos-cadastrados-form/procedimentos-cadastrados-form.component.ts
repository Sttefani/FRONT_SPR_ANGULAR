import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProcedimentoCadastradoService, ProcedimentoCadastrado } from '../../services/procedimento-cadastrado.service';
import { ProcedimentoService, Procedimento } from '../../services/procedimento.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-procedimentos-cadastrados-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './procedimentos-cadastrados-form.component.html',
  styleUrls: ['./procedimentos-cadastrados-form.component.scss']
})
export class ProcedimentosCadastradosFormComponent implements OnInit {
  form!: FormGroup;
  isEditMode = false;
  procedimentoId: number | null = null;
  isLoading = false;
  isLoadingTipos = true;
  isSaving = false;
  message = '';
  messageType: 'success' | 'error' = 'success';

  tiposProcedimento: Procedimento[] = [];
  anoAtual: number = new Date().getFullYear();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private procedimentoCadastradoService: ProcedimentoCadastradoService,
    private procedimentoService: ProcedimentoService
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.loadTiposProcedimento();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.procedimentoId = Number(id);
      this.loadProcedimento(this.procedimentoId);
    }
  }

  initForm(): void {
    this.form = this.fb.group({
      tipo_procedimento_id: ['', [Validators.required]],
      numero: ['', [Validators.required, Validators.maxLength(50)]],
      ano: [this.anoAtual, [Validators.required, Validators.min(1900), Validators.max(this.anoAtual + 1)]]
    });
  }

  loadTiposProcedimento(): void {
    this.isLoadingTipos = true;
    this.procedimentoService.getAllForDropdown().subscribe({
      next: (tipos) => {
        this.tiposProcedimento = tipos;
        this.isLoadingTipos = false;
      },
      error: (err: any) => {
        console.error('Erro ao carregar tipos de procedimento:', err);
        this.message = 'Erro ao carregar tipos de procedimento.';
        this.messageType = 'error';
        this.isLoadingTipos = false;
      }
    });
  }

  loadProcedimento(id: number): void {
    this.isLoading = true;
    this.procedimentoCadastradoService.getById(id).subscribe({
      next: (procedimento) => {
        this.form.patchValue({
          tipo_procedimento_id: procedimento.tipo_procedimento.id,
          numero: procedimento.numero,
          ano: procedimento.ano
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
      ? this.procedimentoCadastradoService.update(this.procedimentoId!, formData)
      : this.procedimentoCadastradoService.create(formData);

    request.subscribe({
      next: (procedimento) => {
        const action = this.isEditMode ? 'atualizado' : 'cadastrado';

        Swal.fire({
          title: 'Sucesso!',
          text: `Procedimento "${procedimento.numero_completo}" ${action} com sucesso.`,
          icon: 'success',
          confirmButtonText: 'Ok'
        }).then(() => {
          this.router.navigate(['/gabinete-virtual/cadastros/procedimentos-cadastrados']);
        });
      },
      error: (err: any) => {
        console.error('=== DEBUG ERRO ===');
        console.error('err.error:', err.error);
        console.error('non_field_errors:', err.error?.non_field_errors);

        let errorMsg = 'Erro ao salvar o procedimento.';

        if (err.error) {
          if (err.error.non_field_errors && Array.isArray(err.error.non_field_errors)) {
            errorMsg = err.error.non_field_errors[0];
          }
          else if (err.error.numero) {
            errorMsg = Array.isArray(err.error.numero) ? err.error.numero[0] : err.error.numero;
          }
        }

        console.error('Mensagem final:', errorMsg);
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
        this.router.navigate(['/gabinete-virtual/cadastros/procedimentos-cadastrados']);
      }
    });
  }

  get tipo_procedimento_id() {
    return this.form.get('tipo_procedimento_id');
  }

  get numero() {
    return this.form.get('numero');
  }

  get ano() {
    return this.form.get('ano');
  }
}
