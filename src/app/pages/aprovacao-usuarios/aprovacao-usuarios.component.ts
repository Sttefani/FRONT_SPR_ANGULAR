import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UsuarioService, User } from '../../services/usuario.service';

@Component({
  selector: 'app-aprovacao-usuarios',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './aprovacao-usuarios.component.html',
  styleUrls: ['./aprovacao-usuarios.component.scss']
})
export class AprovacaoUsuariosComponent implements OnInit {
  pendingUsers: User[] = [];
  isLoading = true;
  message = '';
  messageType: 'success' | 'error' = 'success';

  constructor(private usuarioService: UsuarioService) {}

  ngOnInit(): void {
    this.loadPendingUsers();
  }

  loadPendingUsers(): void {
  this.isLoading = true;
  console.log('🔍 Buscando usuários pendentes...');

  this.usuarioService.getUsersByStatus('PENDENTE').subscribe({
    next: (response: any) => {
      console.log('✅ Resposta recebida:', response);

      // Verifica se a resposta é paginada (tem 'results') ou array direto
      if (response.results) {
        this.pendingUsers = response.results;
      } else if (Array.isArray(response)) {
        this.pendingUsers = response;
      } else {
        this.pendingUsers = [];
      }

      console.log('📊 Usuários pendentes:', this.pendingUsers.length);
      this.isLoading = false;
    },
    error: (err) => {
      console.error('❌ Erro ao carregar usuários pendentes:', err);
      this.message = 'Erro ao carregar usuários pendentes.';
      this.messageType = 'error';
      this.isLoading = false;
    }
  });
}

  onApprove(userId: number): void {
    const user = this.pendingUsers.find(u => u.id === userId);
    if (!user) return;

    const confirmation = confirm(`Aprovar o cadastro de "${user.nome_completo}"?`);
    if (!confirmation) return;

    this.usuarioService.approveUser(userId).subscribe({
      next: () => {
        this.message = `Cadastro de "${user.nome_completo}" aprovado com sucesso!`;
        this.messageType = 'success';
        this.pendingUsers = this.pendingUsers.filter(u => u.id !== userId);
      },
      error: (err) => {
        console.error('Erro ao aprovar usuário:', err);
        this.message = 'Erro ao aprovar o usuário.';
        this.messageType = 'error';
      }
    });
  }

  onReject(userId: number): void {
    const user = this.pendingUsers.find(u => u.id === userId);
    if (!user) return;

    const confirmation = confirm(`Reprovar o cadastro de "${user.nome_completo}"?`);
    if (!confirmation) return;

    this.usuarioService.rejectUser(userId).subscribe({
      next: () => {
        this.message = `Cadastro de "${user.nome_completo}" reprovado.`;
        this.messageType = 'success';
        this.pendingUsers = this.pendingUsers.filter(u => u.id !== userId);
      },
      error: (err) => {
        console.error('Erro ao reprovar usuário:', err);
        this.message = 'Erro ao reprovar o usuário.';
        this.messageType = 'error';
      }
    });
  }
}
