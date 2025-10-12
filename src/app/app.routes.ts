import { Routes } from '@angular/router';

// Guards
import { AuthGuard } from './guards/auth.guard';
import { PasswordChangeGuard } from './guards/password-change.guard';
import { superAdminGuard } from './guards/super-admin.guard';
import { perfilGuard } from './guards/perfil.guard';
import { TiposDocumentoListComponent } from './pages/tipos-documento-list/tipos-documento-list.component';
import { TiposDocumentoFormComponent } from './pages/tipos-documento-form/tipos-documento-form.component';

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
  {
    path: 'acesso-negado',
    loadComponent: () => import('./pages/acesso-negado/acesso-negado.component').then(m => m.AcessoNegadoComponent)
  },

  // =====================================================================
  // LAYOUT PRINCIPAL DO DASHBOARD
  // =====================================================================
  {
    path: 'gabinete-virtual',
    loadComponent: () => import('./pages/gabinete-virtual/gabinete-virtual.component').then(m => m.GabineteVirtualComponent),
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/dashboard-inicial/dashboard-inicial.component').then(m => m.DashboardInicialComponent)
      },

      // =====================================================================
      // GERÊNCIA (SUPER ADMIN)
      // =====================================================================
      {
        path: 'gerencia/usuarios',
        loadComponent: () => import('./pages/usuario-list/usuario-list.component').then(m => m.UsuarioListComponent),
        canActivate: [superAdminGuard]
      },
      {
        path: 'gerencia/aprovacao',
        loadComponent: () => import('./pages/aprovacao-usuarios/aprovacao-usuarios.component').then(m => m.AprovacaoUsuariosComponent),
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
        path: 'gerencia/usuarios/:id/servicos',
        loadComponent: () => import('./pages/usuario-servicos/usuario-servicos.component').then(m => m.UsuarioServicosComponent),
        canActivate: [AuthGuard, superAdminGuard]
      },

      // =====================================================================
      // RELATÓRIOS GERENCIAIS (ADMIN & SUPERUSER)
      // =====================================================================
      {
        path: 'relatorios-gerenciais',
        loadComponent: () => import('./pages/relatorios-gerenciais/relatorios-gerenciais.component').then(m => m.RelatoriosGerenciaisComponent),
        canActivate: [perfilGuard],
        data: { requiredPerfis: ['ADMINISTRATIVO', 'SUPERUSER'] }
      },
      {
        path: 'relatorios-os',
        loadComponent: () => import('./pages/relatorios-os/relatorios-os.component').then(m => m.RelatoriosOsComponent),
        canActivate: [perfilGuard],
        data: { requiredPerfis: ['ADMINISTRATIVO', 'SUPERUSER'] }
      },

      // =====================================================================
      // SERVIÇOS PERICIAIS
      // =====================================================================
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

      // =====================================================================
      // OCORRÊNCIAS
      // =====================================================================
      {
        path: 'operacional/ocorrencias',
        loadComponent: () => import('./pages/ocorrencias-list/ocorrencias-list.component').then(m => m.OcorrenciasListComponent),
        canActivate: [AuthGuard]
      },
      {
        path: 'operacional/ocorrencias/novo',
        loadComponent: () => import('./pages/ocorrencias-form/ocorrencias-form.component').then(m => m.OcorrenciasFormComponent),
        canActivate: [perfilGuard],
        data: { requiredPerfis: ['PERITO', 'OPERACIONAL'] }
      },
      {
        path: 'operacional/ocorrencias/:id',
        loadComponent: () => import('./pages/ocorrencias-detalhes/ocorrencias-detalhes.component').then(m => m.OcorrenciasDetalhesComponent),
        canActivate: [AuthGuard]
      },
      {
        path: 'operacional/ocorrencias/:id/editar',
        loadComponent: () => import('./pages/ocorrencias-form/ocorrencias-form.component').then(m => m.OcorrenciasFormComponent),
        canActivate: [AuthGuard]
      },

      // ORDENS DE SERVIÇO
      // =====================================================================
      {
        path: 'operacional/ordens-servico',
        loadComponent: () => import('./pages/ordens-servico/lista-ordens-servico/lista-ordens-servico.component').then(m => m.ListaOrdensServicoComponent),
        canActivate: [AuthGuard]
      },
      {
        path: 'operacional/ordens-servico/novo',
        loadComponent: () => import('./pages/ordens-servico/form-ordem-servico/form-ordem-servico.component').then(m => m.FormOrdemServicoComponent),
        canActivate: [perfilGuard],
        data: { requiredPerfis: ['ADMINISTRATIVO', 'SUPERUSER'] }
      },
      {
        path: 'operacional/ordens-servico/:id',
        loadComponent: () => import('./pages/ordens-servico/detalhes-ordem-servico/detalhes-ordem-servico.component').then(m => m.DetalhesOrdemServicoComponent),
        canActivate: [AuthGuard]
      },

      // =====================================================================
      // CADASTROS AUXILIARES
      // =====================================================================
      {
        path: 'cadastros/cidades',
        loadComponent: () => import('./pages/cidades-list/cidades-list.component').then(m => m.CidadesListComponent),
        canActivate: [AuthGuard]
      },
      {
        path: 'cadastros/cidades/novo',
        loadComponent: () => import('./pages/cidades-form/cidades-form.component').then(m => m.CidadesFormComponent),
        canActivate: [AuthGuard]
      },
      {
        path: 'cadastros/cidades/:id/editar',
        loadComponent: () => import('./pages/cidades-form/cidades-form.component').then(m => m.CidadesFormComponent),
        canActivate: [AuthGuard]
      },
      {
        path: 'cadastros/cargos',
        loadComponent: () => import('./pages/cargos-list/cargos-list.component').then(m => m.CargosListComponent),
        canActivate: [AuthGuard]
      },
      {
        path: 'cadastros/cargos/novo',
        loadComponent: () => import('./pages/cargos-form/cargos-form.component').then(m => m.CargosFormComponent),
        canActivate: [AuthGuard]
      },
      {
        path: 'cadastros/cargos/:id/editar',
        loadComponent: () => import('./pages/cargos-form/cargos-form.component').then(m => m.CargosFormComponent),
        canActivate: [AuthGuard]
      },
      {
        path: 'cadastros/autoridades',
        loadComponent: () => import('./pages/autoridades-list/autoridades-list.component').then(m => m.AutoridadesListComponent),
        canActivate: [AuthGuard]
      },
      {
        path: 'cadastros/autoridades/novo',
        loadComponent: () => import('./pages/autoridades-form/autoridades-form.component').then(m => m.AutoridadesFormComponent),
        canActivate: [AuthGuard]
      },
      {
        path: 'cadastros/autoridades/:id/editar',
        loadComponent: () => import('./pages/autoridades-form/autoridades-form.component').then(m => m.AutoridadesFormComponent),
        canActivate: [AuthGuard]
      },
      {
        path: 'cadastros/unidades-demandantes',
        loadComponent: () => import('./pages/unidades-demandantes-list/unidades-demandantes-list.component').then(m => m.UnidadesDemandantesListComponent),
        canActivate: [AuthGuard]
      },
      {
        path: 'cadastros/unidades-demandantes/novo',
        loadComponent: () => import('./pages/unidades-demandantes-form/unidades-demandantes-form.component').then(m => m.UnidadesDemandantesFormComponent),
        canActivate: [AuthGuard]
      },
      {
        path: 'cadastros/unidades-demandantes/:id/editar',
        loadComponent: () => import('./pages/unidades-demandantes-form/unidades-demandantes-form.component').then(m => m.UnidadesDemandantesFormComponent),
        canActivate: [AuthGuard]
      },
      {
        path: 'cadastros/procedimentos',
        loadComponent: () => import('./pages/procedimentos-list/procedimentos-list.component').then(m => m.ProcedimentosListComponent),
        canActivate: [AuthGuard]
      },
      {
        path: 'cadastros/procedimentos/novo',
        loadComponent: () => import('./pages/procedimentos-form/procedimentos-form.component').then(m => m.ProcedimentosFormComponent),
        canActivate: [AuthGuard]
      },
      {
        path: 'cadastros/procedimentos/:id/editar',
        loadComponent: () => import('./pages/procedimentos-form/procedimentos-form.component').then(m => m.ProcedimentosFormComponent),
        canActivate: [AuthGuard]
      },
      {
        path: 'cadastros/procedimentos-cadastrados',
        loadComponent: () => import('./pages/procedimentos-cadastrados-list/procedimentos-cadastrados-list.component').then(m => m.ProcedimentosCadastradosListComponent),
        canActivate: [AuthGuard]
      },
      {
        path: 'cadastros/procedimentos-cadastrados/novo',
        loadComponent: () => import('./pages/procedimentos-cadastrados-form/procedimentos-cadastrados-form.component').then(m => m.ProcedimentosCadastradosFormComponent),
        canActivate: [AuthGuard]
      },
      {
        path: 'cadastros/procedimentos-cadastrados/:id/editar',
        loadComponent: () => import('./pages/procedimentos-cadastrados-form/procedimentos-cadastrados-form.component').then(m => m.ProcedimentosCadastradosFormComponent),
        canActivate: [AuthGuard]
      },
      {
        path: 'cadastros/procedimentos-cadastrados/:id',
        loadComponent: () => import('./pages/procedimentos-detalhes/procedimentos-detalhes.component').then(m => m.ProcedimentosDetalhesComponent),
        canActivate: [AuthGuard]
      },
      {
        path: 'cadastros/classificacoes',
        loadComponent: () => import('./pages/classificacoes-list/classificacoes-list.component').then(m => m.ClassificacoesListComponent),
        canActivate: [AuthGuard]
      },
      {
        path: 'cadastros/classificacoes/novo',
        loadComponent: () => import('./pages/classificacoes-form/classificacoes-form.component').then(m => m.ClassificacoesFormComponent),
        canActivate: [AuthGuard]
      },
      {
        path: 'cadastros/classificacoes/:id/editar',
        loadComponent: () => import('./pages/classificacoes-form/classificacoes-form.component').then(m => m.ClassificacoesFormComponent),
        canActivate: [AuthGuard]
      },
      {
        path: 'cadastros/exames',
        loadComponent: () => import('./pages/exames-list/exames-list.component').then(m => m.ExamesListComponent),
        canActivate: [AuthGuard]
      },
      {
        path: 'cadastros/exames/novo',
        loadComponent: () => import('./pages/exames-form/exames-form.component').then(m => m.ExamesFormComponent),
        canActivate: [AuthGuard]
      },
      {
        path: 'cadastros/exames/:id/editar',
        loadComponent: () => import('./pages/exames-form/exames-form.component').then(m => m.ExamesFormComponent),
        canActivate: [AuthGuard]
      },
      {
        path: 'cadastros/tipos-documento',
        component: TiposDocumentoListComponent,
        canActivate: [AuthGuard]
      },
      {
        path: 'cadastros/tipos-documento/novo',
        component: TiposDocumentoFormComponent,
        canActivate: [AuthGuard]
      },
      {
        path: 'cadastros/tipos-documento/:id/editar',
        component: TiposDocumentoFormComponent,
        canActivate: [AuthGuard]
      }
    ]
  },
  // =====================================================================

  // Rota "catch-all" para páginas não encontradas
  { path: '**', redirectTo: '/login' }
];
