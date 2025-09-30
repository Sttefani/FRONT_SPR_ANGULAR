import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { UsuarioService, User } from '../../services/usuario.service';

@Component({
  selector: 'app-usuario-detalhes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './usuario-detalhes.component.html',
  styleUrls: ['./usuario-detalhes.component.scss']
})
export class UsuarioDetalhesComponent implements OnInit {
  user: User | null = null;
  isLoading = true;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private usuarioService: UsuarioService
  ) {}

  ngOnInit(): void {
    const userId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadUser(userId);
  }

  loadUser(userId: number): void {
    this.isLoading = true;
    this.usuarioService.getUserById(userId).subscribe({
      next: (user) => {
        this.user = user;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erro ao carregar usuário:', err);
        this.error = 'Erro ao carregar os dados do usuário.';
        this.isLoading = false;
      }
    });
  }

  voltar(): void {
    this.router.navigate(['/gabinete-virtual/gerencia/usuarios']);
  }

  editar(): void {
    this.router.navigate(['/gabinete-virtual/gerencia/usuarios', this.user?.id, 'editar']);
  }
  onGerenciarServicos(): void {
  if (this.user) {
    this.router.navigate(['/gabinete-virtual/gerencia/usuarios', this.user.id, 'servicos']);
  }
}
}
