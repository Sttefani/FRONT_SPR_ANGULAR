import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsuarioService, User } from '../../services/usuario.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-usuario-list',
  standalone: true,
  imports: [CommonModule, FormsModule],  // ← Adicione FormsModule
  templateUrl: './usuario-list.component.html',
  styleUrls: ['./usuario-list.component.scss']
})
export class UsuarioListComponent implements OnInit {

  userList: User[] = [];
  isLoading = true;
  message = '';
  messageType: 'success' | 'error' = 'success';

  // Propriedades de paginação
  currentPage = 1;
  totalCount = 0;
  pageSize = 5;
  nextUrl: string | null = null;
  previousUrl: string | null = null;

  // Filtro de status
  statusFilter: string = 'todos';

  constructor(
    private usuarioService: UsuarioService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(url?: string): void {
    this.isLoading = true;

    const request = url
      ? this.usuarioService.getUsersByUrl(url)
      : this.usuarioService.getAllUsers(this.statusFilter);

    request.subscribe({
      next: (response: any) => {
        this.userList = response.results;
        this.totalCount = response.count;
        this.nextUrl = response.next;
        this.previousUrl = response.previous;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erro ao carregar usuários:', err);
        this.isLoading = false;
        this.message = 'Falha ao carregar a lista de usuários.';
        this.messageType = 'error';
      }
    });
  }

  onStatusFilterChange(): void {
    this.currentPage = 1;
    this.loadUsers();
  }

  nextPage(): void {
    if (this.nextUrl) {
      this.currentPage++;
      this.loadUsers(this.nextUrl);
    }
  }

  previousPage(): void {
    if (this.previousUrl) {
      this.currentPage--;
      this.loadUsers(this.previousUrl);
    }
  }

  get totalPages(): number {
    return Math.ceil(this.totalCount / this.pageSize);
  }

  onDelete(user: User): void {
  Swal.fire({
    title: 'Confirmar exclusão',
    text: `Tem certeza que deseja mover "${user.nome_completo}" para a lixeira?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sim, deletar',
    cancelButtonText: 'Cancelar'
  }).then((result) => {
    if (result.isConfirmed) {
      this.usuarioService.softDeleteUser(user.id).subscribe({
        next: () => {
          this.message = `Usuário "${user.nome_completo}" movido para a lixeira com sucesso.`;
          this.messageType = 'success';
          this.userList = this.userList.filter(u => u.id !== user.id);
          this.totalCount--;
        },
        error: (err) => {
          console.error('Erro ao mover usuário para a lixeira', err);
          this.message = 'Falha ao mover o usuário para a lixeira.';
          this.messageType = 'error';
        }
      });
    }
  });
}

  onReactivate(user: User): void {
  Swal.fire({
    title: 'Reativar usuário?',
    text: `Deseja reativar "${user.nome_completo}" para aprovação?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Sim, reativar',
    cancelButtonText: 'Cancelar'
  }).then((result) => {
    if (result.isConfirmed) {
      this.usuarioService.reactivateUser(user.id).subscribe({
        next: () => {
          this.message = `Usuário "${user.nome_completo}" Reativado. Segguiu para aprovação.`;
          this.messageType = 'success';
          this.loadUsers();
        },
        error: (err) => {
          console.error('Erro ao reativar usuário:', err);
          this.message = 'Falha ao reativar o usuário.';
          this.messageType = 'error';
        }
      });
    }
  });
}

  onEdit(userId: number): void {
    this.router.navigate(['/gabinete-virtual/gerencia/usuarios', userId, 'editar']);
  }

  onViewDetails(userId: number): void {
    this.router.navigate(['/gabinete-virtual/gerencia/usuarios', userId, 'detalhes']);
  }
  onResetPassword(user: User): void {
  const confirmation = confirm(
    `Resetar a senha de "${user.nome_completo}" para o CPF?\n\n` +
    `O usuário será forçado a alterar a senha no próximo login.`
  );

  if (confirmation) {
    this.usuarioService.resetPasswordToCpf(user.id).subscribe({
      next: () => {
        this.message = `Senha de "${user.nome_completo}" resetada para o CPF com sucesso.`;
        this.messageType = 'success';
      },
      error: (err) => {
        console.error('Erro ao resetar senha:', err);
        this.message = err.error?.error || 'Erro ao resetar a senha.';
        this.messageType = 'error';
      }
    });
  }
}
}
