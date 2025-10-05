import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsuarioService, User } from '../../services/usuario.service';
import { ServicoPericialService, ServicoPericial } from '../../services/servico-pericial.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-usuario-servicos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './usuario-servicos.component.html',
  styleUrls: ['./usuario-servicos.component.scss']
})
export class UsuarioServicosComponent implements OnInit {
  user: User | null = null;
  servicos: ServicoPericial[] = [];
  servicosSelecionados: Set<number> = new Set();
  isLoading = true;
  isSaving = false;
  searchTerm = '';
  message = '';
  messageType: 'success' | 'error' = 'success';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private usuarioService: UsuarioService,
    private servicoPericialService: ServicoPericialService
  ) {}

  ngOnInit(): void {
    const userId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadData(userId);
  }

  loadData(userId: number): void {
  this.isLoading = true;

  Promise.all([
    this.usuarioService.getUserById(userId).toPromise(),
    this.servicoPericialService.getAllForDropdown().toPromise() // ← MUDANÇA AQUI
  ]).then(([user, servicosArray]) => { // ← E AQUI
    this.user = user!;
    this.servicos = servicosArray || []; // ← E AQUI (já é array direto)

    // Marca os serviços já vinculados
    this.servicosSelecionados = new Set(
      this.user.servicos_periciais?.map(s => s.id) || []
    );

    this.isLoading = false;
  }).catch((err: any) => {
    console.error('Erro ao carregar dados:', err);
    this.message = 'Erro ao carregar dados.';
    this.messageType = 'error';
    this.isLoading = false;
  });
}
  get servicosFiltrados(): ServicoPericial[] {
    if (!this.searchTerm.trim()) {
      return this.servicos;
    }
    const term = this.searchTerm.toLowerCase();
    return this.servicos.filter(s =>
      s.sigla.toLowerCase().includes(term) ||
      s.nome.toLowerCase().includes(term)
    );
  }

  toggleServico(servicoId: number): void {
    if (this.servicosSelecionados.has(servicoId)) {
      this.servicosSelecionados.delete(servicoId);
    } else {
      this.servicosSelecionados.add(servicoId);
    }
  }

  isSelected(servicoId: number): boolean {
    return this.servicosSelecionados.has(servicoId);
  }

  get totalSelecionados(): number {
    return this.servicosSelecionados.size;
  }

  onSave(): void {
    if (!this.user) return;

    this.isSaving = true;
    const dados = {
      servicos_periciais_ids: Array.from(this.servicosSelecionados)
    };

    this.usuarioService.updateUser(this.user.id, dados).subscribe({
      next: () => {
        Swal.fire({
          title: 'Sucesso!',
          text: 'Serviços vinculados atualizados com sucesso.',
          icon: 'success',
          confirmButtonText: 'Ok'
        }).then(() => {
          this.router.navigate(['/gabinete-virtual/gerencia/usuarios', this.user!.id, 'detalhes']);
        });
      },
      error: (err: any) => {
        console.error('Erro ao salvar:', err);
        this.message = 'Erro ao atualizar serviços vinculados.';
        this.messageType = 'error';
        this.isSaving = false;
      }
    });
  }

  cancelar(): void {
    Swal.fire({
      title: 'Cancelar alterações?',
      text: 'As modificações não serão salvas.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, cancelar',
      cancelButtonText: 'Continuar editando'
    }).then((result) => {
      if (result.isConfirmed) {
        this.router.navigate(['/gabinete-virtual/gerencia/usuarios', this.user!.id, 'detalhes']);
      }
    });
  }
}
