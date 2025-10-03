import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';

import { ExameService, Exame } from '../../services/exame.service';
import { ServicoPericialService, ServicoPericial } from '../../services/servico-pericial.service';

@Component({
  selector: 'app-exames-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './exames-form.component.html',
  styleUrls: ['./exames-form.component.scss']
})
export class ExamesFormComponent implements OnInit {
  exameForm: FormGroup;
  isEditMode = false;
  exameId: number | null = null;
  isLoading = false;
  isLoadingServicos = true;
  isLoadingExamesPais = true;
  isSaving = false;
  message = '';
  messageType: 'success' | 'error' = 'success';

  servicosPericiais: ServicoPericial[] = [];
  examesPais: Exame[] = [];
  todosExames: Exame[] = [];

  constructor(
    private fb: FormBuilder,
    private exameService: ExameService,
    private servicoPericialService: ServicoPericialService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.exameForm = this.fb.group({
      codigo: ['', [Validators.required, Validators.maxLength(20)]],
      nome: ['', [Validators.required, Validators.maxLength(255)]],
      servico_pericial_id: [null, Validators.required],
      parent_id: [null]
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.exameId = Number(id);
    }

    this.loadServicos();
    this.loadTodosExames();

    if (this.isEditMode && this.exameId) {
      this.loadExame(this.exameId);
    }
  }

  loadServicos(): void {
    this.isLoadingServicos = true;
    this.servicoPericialService.getAllForDropdown().subscribe({
      next: (data: ServicoPericial[]) => {
        this.servicosPericiais = data;
        this.isLoadingServicos = false;
      },
      error: (err: any) => {
        console.error('Erro ao carregar serviços periciais:', err);
        this.message = 'Erro ao carregar serviços periciais.';
        this.messageType = 'error';
        this.isLoadingServicos = false;
      }
    });
  }

  loadTodosExames(): void {
  this.isLoadingExamesPais = true;
  this.exameService.getAll().subscribe({
    next: (data) => {
      this.todosExames = data;
      // ← linha removida
      this.isLoadingExamesPais = false;
    },
    error: (err: any) => {
      console.error('Erro ao carregar exames:', err);
      this.message = 'Erro ao carregar exames.';
      this.messageType = 'error';
      this.isLoadingExamesPais = false;
    }
  });
}
  onServicoChange(): void {
    this.exameForm.patchValue({ parent_id: null });
    this.updateExamesPais();
  }

 updateExamesPais(): void {
  const servicoId = this.exameForm.get('servico_pericial_id')?.value;

  if (servicoId) {
    const servicoIdNum = Number(servicoId);
    this.examesPais = this.todosExames.filter(e =>
      e.servico_pericial.id === servicoIdNum && !e.parent
    );
  } else {
    this.examesPais = [];
  }
}

  loadExame(id: number): void {
    this.isLoading = true;
    this.exameService.getById(id).subscribe({
      next: (exame) => {
        this.exameForm.patchValue({
          codigo: exame.codigo,
          nome: exame.nome,
          servico_pericial_id: exame.servico_pericial.id,
          parent_id: exame.parent?.id || null
        });
        this.updateExamesPais();
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Erro ao carregar exame:', err);
        this.message = 'Erro ao carregar dados do exame.';
        this.messageType = 'error';
        this.isLoading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.exameForm.invalid) {
      this.exameForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    const formData = this.exameForm.value;

    const request = this.isEditMode && this.exameId
      ? this.exameService.update(this.exameId, formData)
      : this.exameService.create(formData);

    request.subscribe({
      next: (exame) => {
        const action = this.isEditMode ? 'atualizado' : 'cadastrado';
        Swal.fire({
          title: 'Sucesso!',
          text: `Exame "${exame.codigo}" ${action} com sucesso.`,
          icon: 'success',
          confirmButtonText: 'Ok'
        }).then(() => {
          this.router.navigate(['/gabinete-virtual/cadastros/exames']);
        });
      },
      error: (err: any) => {
        console.error('Erro ao salvar:', err);

        let errorMsg = 'Erro ao salvar o exame.';
        if (err.error) {
          if (err.error.codigo) {
            errorMsg = Array.isArray(err.error.codigo) ? err.error.codigo[0] : err.error.codigo;
          } else if (err.error.nome) {
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
        this.router.navigate(['/gabinete-virtual/cadastros/exames']);
      }
    });
  }

  get codigo() { return this.exameForm.get('codigo'); }
  get nome() { return this.exameForm.get('nome'); }
  get servico_pericial_id() { return this.exameForm.get('servico_pericial_id'); }
  get parent_id() { return this.exameForm.get('parent_id'); }
}
