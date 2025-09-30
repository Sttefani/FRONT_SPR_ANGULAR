import { Routes } from '@angular/router';

// Seus Guards existentes
import { AuthGuard } from './guards/auth.guard';
import { PasswordChangeGuard } from './guards/password-change.guard';

// Nosso novo Guard, agora importado e pronto para uso
import { superAdminGuard } from './guards/super-admin.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'cadastro',
    loadComponent: () => import('./pages/cadastro/cadastro.component').then(m => m.CadastroComponent)
  },
  {
    path: 'alterar-senha',
    loadComponent: () => import('./pages/alterar-senha/alterar-senha.component').then(m => m.AlterarSenhaComponent),
    canActivate: [AuthGuard, PasswordChangeGuard]
  },

  // =====================================================================
  // AQUI ESTÁ A ARQUITETURA FINAL DO NOSSO DASHBOARD
  // =====================================================================
  {
    path: 'gabinete-virtual',
    // 1. Carrega o componente de Layout (a "moldura")
    loadComponent: () => import('./pages/gabinete-virtual/gabinete-virtual.component').then(m => m.GabineteVirtualComponent),
    // 2. Protege o layout e todas as páginas filhas com o AuthGuard
    canActivate: [AuthGuard],
    // 3. Define as páginas que serão carregadas DENTRO do <router-outlet>
    children: [
      {
        // Rota padrão: /gabinete-virtual -> carrega a tela de boas-vindas
        path: '',
        loadComponent: () => import('./pages/dashboard-inicial/dashboard-inicial.component').then(m => m.DashboardInicialComponent)
      },
      {
        path: 'gerencia/usuarios', // A URL que o usuário verá
        loadComponent: () => import('./pages/usuario-list/usuario-list.component').then(m => m.UsuarioListComponent),
        canActivate: [superAdminGuard] // Protegida pelo mesmo guard
      },
      {
        // Rota de aprovação: /gabinete-virtual/gerencia/aprovacao
        path: 'gerencia/aprovacao',
        loadComponent: () => import('./pages/aprovacao-usuarios/aprovacao-usuarios.component').then(m => m.AprovacaoUsuariosComponent),
        // 4. Adiciona o SuperAdminGuard para proteger SÓ ESTA PÁGINA
        canActivate: [superAdminGuard]
      },

      {
        path: 'gerencia/usuarios/:id/detalhes',
        loadComponent: () => import('./pages/usuario-detalhes/usuario-detalhes.component').then(m => m.UsuarioDetalhesComponent),
        canActivate: [AuthGuard, superAdminGuard]
      },

      {
        path: 'gerencia/usuarios/:id/editar',
        loadComponent: () => import('./pages/usuario-editar/usuario-editar.component').then(m => m.UsuarioEditarComponent),
        canActivate: [AuthGuard, superAdminGuard]
      },
      {
        path: 'servicos-periciais',
        loadComponent: () => import('./pages/servicos-periciais-list/servicos-periciais-list.component').then(m => m.ServicosPericiaisListComponent),
        canActivate: [AuthGuard, superAdminGuard]
      },
      {
        path: 'servicos-periciais/novo',
        loadComponent: () => import('./pages/servicos-periciais-form/servicos-periciais-form.component').then(m => m.ServicosPericiaisFormComponent),
        canActivate: [AuthGuard, superAdminGuard]
      },
      {
        path: 'servicos-periciais/:id/editar',
        loadComponent: () => import('./pages/servicos-periciais-form/servicos-periciais-form.component').then(m => m.ServicosPericiaisFormComponent),
        canActivate: [AuthGuard, superAdminGuard]
      },
      {
        path: 'gerencia/usuarios/:id/servicos',
        loadComponent: () => import('./pages/usuario-servicos/usuario-servicos.component').then(m => m.UsuarioServicosComponent),
        canActivate: [AuthGuard, superAdminGuard]
}
    ]
  },
  // =====================================================================

  // Rota "catch-all": se nenhuma rota acima corresponder, redireciona para o login
  { path: '**', redirectTo: '/login' }
];
