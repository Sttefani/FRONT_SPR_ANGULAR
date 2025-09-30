import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ServicoPericialService, ServicoPericial } from '../../services/servico-pericial.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-servicos-periciais-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './servicos-periciais-form.component.html',
  styleUrls: ['./servicos-periciais-form.component.scss']
})
export class ServicosPericiaisFormComponent implements OnInit {
  form!: FormGroup;
  isEditMode = false;
  servicoId: number | null = null;
  isLoading = false;
  isSaving = false;
  message = '';
  messageType: 'success' | 'error' = 'success';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private servicoPericialService: ServicoPericialService
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.servicoId = Number(id);
      this.loadServico(this.servicoId);
    }
  }

  initForm(): void {
    this.form = this.fb.group({
      sigla: ['', [Validators.required, Validators.maxLength(10)]],
      nome: ['', [Validators.required, Validators.maxLength(50)]]
    });
  }

  loadServico(id: number): void {
    this.isLoading = true;
    this.servicoPericialService.getById(id).subscribe({
      next: (servico) => {
        this.form.patchValue({
          sigla: servico.sigla,
          nome: servico.nome
        });
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erro ao carregar serviço:', err);
        this.message = 'Erro ao carregar dados do serviço.';
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
      ? this.servicoPericialService.update(this.servicoId!, formData)
      : this.servicoPericialService.create(formData);

    request.subscribe({
      next: (servico) => {
        const action = this.isEditMode ? 'atualizado' : 'criado';

        Swal.fire({
          title: 'Sucesso!',
          text: `Serviço "${servico.sigla}" ${action} com sucesso.`,
          icon: 'success',
          confirmButtonText: 'Ok'
        }).then(() => {
          this.router.navigate(['/gabinete-virtual/servicos-periciais']);
        });
      },
      error: (err) => {
        console.error('Erro ao salvar:', err);

        let errorMsg = 'Erro ao salvar o serviço.';
        if (err.error?.sigla) {
          errorMsg = err.error.sigla[0];
        } else if (err.error?.nome) {
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
        this.router.navigate(['/gabinete-virtual/servicos-periciais']);
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
