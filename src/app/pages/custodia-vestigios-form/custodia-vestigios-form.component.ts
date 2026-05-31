import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import Swal from 'sweetalert2';

import { CustodiaService } from '../../services/custodia.service';
import { ServicoPericialService, ServicoPericial } from '../../services/servico-pericial.service';
import { UnidadeDemandanteService } from '../../services/unidade-demandante.service';
import { AutoridadeService } from '../../services/autoridade.service';

@Component({
  selector: 'app-custodia-vestigios-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './custodia-vestigios-form.component.html',
  styleUrls: ['./custodia-vestigios-form.component.scss']
})
export class CustodiaVestigiosFormComponent implements OnInit {
  form!: FormGroup;
  isEditMode = false;
  vestigioId: number | null = null;
  isLoading = false;
  isSaving = false;
  message = '';
  messageType: 'success' | 'error' = 'success';

  servicos: any[] = [];
  unidades: any[] = [];
  autoridades: any[] = [];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private custodiaService: CustodiaService,
    private servicoPericialService: ServicoPericialService,
    private unidadeDemandanteService: UnidadeDemandanteService,
    private autoridadeService: AutoridadeService
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.carregarDropdowns();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.vestigioId = Number(id);
      this.carregarVestigio(this.vestigioId);
    }
  }

  initForm(): void {
    this.form = this.fb.group({
      lacre:              ['', Validators.maxLength(255)],
      num_processo_sei:   ['', Validators.maxLength(255)],
      ocorrencia:         ['', Validators.maxLength(255)],
      ano_ocorrencia:     [null],
      descricao:          [''],
      conformidade:       [false],
      biologico:          [false],
      unidade_demandante_id: [null, Validators.required],
      servico_pericial_id:   [null, Validators.required],
      autoridade_id:      [null],
    });
  }

  carregarDropdowns(): void {
    this.servicoPericialService.getAll().subscribe({
      next: (res: any) => this.servicos = res.results ?? res,
      error: () => {}
    });
    this.unidadeDemandanteService.getAll().subscribe({
      next: (res: any) => this.unidades = res.results ?? res,
      error: () => {}
    });
    this.autoridadeService.getAll().subscribe({
      next: (res: any) => this.autoridades = res.results ?? res,
      error: () => {}
    });
  }

  carregarVestigio(id: number): void {
    this.isLoading = true;
    this.custodiaService.getVestigio(id).subscribe({
      next: (v) => {
        this.form.patchValue({
          lacre: v.lacre,
          num_processo_sei: v.num_processo_sei,
          ocorrencia: v.ocorrencia,
          ano_ocorrencia: v.ano_ocorrencia,
          descricao: v.descricao,
          conformidade: v.conformidade,
          biologico: v.biologico,
          unidade_demandante_id: v.unidade_demandante?.id,
          servico_pericial_id: v.servico_pericial?.id,
          autoridade_id: v.autoridade?.id ?? null,
        });
        this.isLoading = false;
      },
      error: () => {
        this.message = 'Erro ao carregar vestígio.';
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
    const payload = this.form.value;

    const req = this.isEditMode
      ? this.custodiaService.editarVestigio(this.vestigioId!, payload)
      : this.custodiaService.criarVestigio(payload);

    req.subscribe({
      next: (v) => {
        Swal.fire({
          title: 'Sucesso!',
          text: `Vestígio ${this.isEditMode ? 'atualizado' : 'cadastrado'} com sucesso.`,
          icon: 'success',
          confirmButtonText: 'Ok'
        }).then(() => {
          this.router.navigate(['/gabinete-virtual/custodia/vestigios', v.id]);
        });
      },
      error: (err: any) => {
        const msg = Object.values(err.error ?? {}).flat().join(' ') || 'Erro ao salvar.';
        this.message = msg as string;
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
    }).then(result => {
      if (result.isConfirmed) {
        this.router.navigate(['/gabinete-virtual/custodia/vestigios']);
      }
    });
  }
}
