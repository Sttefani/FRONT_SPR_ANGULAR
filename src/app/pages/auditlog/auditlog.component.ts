import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuditLogService, AuditLog, AuditLogFiltros } from '../../services/auditlog.service';
import { UsuarioService } from '../../services/usuario.service';

@Component({
  selector: 'app-auditlog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auditlog.component.html',
  styleUrls: ['./auditlog.component.scss'],
})
export class AuditlogComponent implements OnInit {
  logs: AuditLog[] = [];
  total = 0;
  pagina = 1;
  totalPaginas = 1;
  carregando = false;
  erro = '';

  usuarios: any[] = [];

  filtros: AuditLogFiltros = {
    usuario_id: '',
    acao: '',
    modulo: '',
    data_inicio: '',
    data_fim: '',
    busca: '',
    page_size: 20,
  };

  modulos = [
    { value: 'ocorrencias', label: 'Ocorrências' },
    { value: 'movimentacoes', label: 'Movimentações' },
    { value: 'ordens_servico', label: 'Ordens de Serviço' },
    { value: 'procedimentos_cadastrados', label: 'Procedimentos' },
    { value: 'exames', label: 'Exames' },
    { value: 'usuarios', label: 'Usuários' },
    { value: 'cidades', label: 'Cidades' },
    { value: 'cargos', label: 'Cargos' },
    { value: 'autoridades', label: 'Autoridades' },
    { value: 'unidades_demandantes', label: 'Unidades Demandantes' },
    { value: 'classificacoes', label: 'Classificações' },
    { value: 'tipos_documento', label: 'Tipos de Documento' },
    { value: 'servicos_periciais', label: 'Serviços Periciais' },
    { value: 'IA', label: 'Inteligência Artificial' },
  ];

  constructor(
    private auditLogService: AuditLogService,
    private usuarioService: UsuarioService,
  ) {}

  ngOnInit(): void {
    this.carregarUsuarios();
    this.buscar();
  }

  carregarUsuarios(): void {
    this.usuarioService.getAllUsers('todos').subscribe({
      next: (res: any) => {
        this.usuarios = res.results || res;
      },
      error: () => {},
    });
  }

  buscar(pagina = 1): void {
    this.pagina = pagina;
    this.carregando = true;
    this.erro = '';

    const filtrosAtivos: AuditLogFiltros = { ...this.filtros, page: pagina };

    this.auditLogService.listar(filtrosAtivos).subscribe({
      next: (res) => {
        this.logs = res.results;
        this.total = res.count;
        this.totalPaginas = Math.ceil(res.count / (this.filtros.page_size || 20));
        this.carregando = false;
      },
      error: () => {
        this.erro = 'Não foi possível carregar os logs de auditoria.';
        this.carregando = false;
      },
    });
  }

  limparFiltros(): void {
    this.filtros = {
      usuario_id: '',
      acao: '',
      modulo: '',
      data_inicio: '',
      data_fim: '',
      busca: '',
      page_size: 20,
    };
    this.buscar();
  }

  paginaAnterior(): void {
    if (this.pagina > 1) this.buscar(this.pagina - 1);
  }

  proximaPagina(): void {
    if (this.pagina < this.totalPaginas) this.buscar(this.pagina + 1);
  }

  badgeAcao(acao: string): string {
    const map: Record<string, string> = {
      criou: 'badge-criou',
      editou: 'badge-editou',
      deletou: 'badge-deletou',
    };
    return map[acao] || 'bg-secondary';
  }

  labelAcao(acao: string): string {
    const map: Record<string, string> = {
      criou: 'Criou',
      editou: 'Editou',
      deletou: 'Deletou',
    };
    return map[acao] || acao;
  }
}
