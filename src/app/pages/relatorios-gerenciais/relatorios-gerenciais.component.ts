import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { RelatoriosGerenciais } from '../../interfaces/realatorios.interface';
import { OcorrenciaService } from '../../services/ocorrencia.service';
import { ServicoPericialService } from '../../services/servico-pericial.service';
import { CidadeService } from '../../services/cidade.service';
import { UsuarioService } from '../../services/usuario.service';
import { ClassificacaoOcorrenciaService } from '../../services/classificacao-ocorrencia.service';

@Component({
  selector: 'app-relatorios-gerenciais',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './relatorios-gerenciais.component.html',
  styleUrl: './relatorios-gerenciais.component.scss'
})
export class RelatoriosGerenciaisComponent implements OnInit {

  relatorios: RelatoriosGerenciais | null = null;
  isLoading = true;

  filtros = {
    data_inicio: '',
    data_fim: '',
    servico_id: null as number | null,
    cidade_id: null as number | null,
    perito_id: null as number | null,
    classificacao_id: null as number | null
  };

  servicosDisponiveis: any[] = [];
  cidadesDisponiveis: any[] = [];
  peritosDisponiveis: any[] = [];
  classificacoesDisponiveis: any[] = [];

  constructor(
    private ocorrenciaService: OcorrenciaService,
    private servicoPericialService: ServicoPericialService,
    private cidadeService: CidadeService,
    private usuarioService: UsuarioService,
    private classificacaoService: ClassificacaoOcorrenciaService
  ) {}

  ngOnInit(): void {
    this.loadFiltroData();
    this.aplicarFiltros();
  }

  loadFiltroData(): void {
    this.servicoPericialService.getAllForDropdown().subscribe(data => this.servicosDisponiveis = data);
    this.cidadeService.getAllForDropdown().subscribe(data => this.cidadesDisponiveis = data);
    this.usuarioService.getPeritosList().subscribe(data => this.peritosDisponiveis = data);
    this.classificacaoService.getAll().subscribe((data: any) => this.classificacoesDisponiveis = data);
  }

  limparFiltros(): void {
    this.filtros = {
      data_inicio: '',
      data_fim: '',
      servico_id: null,
      cidade_id: null,
      perito_id: null,
      classificacao_id: null
    };
    this.aplicarFiltros();
  }

  aplicarFiltros(): void {
    this.isLoading = true;
    const params: any = {};
    for (const key in this.filtros) {
      const value = (this.filtros as any)[key];
      if (value) {
        params[key] = value;
      }
    }

    this.ocorrenciaService.getRelatoriosGerenciais(params).subscribe({
      next: (data: RelatoriosGerenciais) => {
        this.relatorios = data;
        this.isLoading = false;
      },
      error: (err: HttpErrorResponse) => {
        console.error('Erro ao carregar relatórios gerenciais:', err);
        this.isLoading = false;
      }
    });
  }

  /**
   * Função auxiliar para o HTML. Gera a chave do objeto de dados a partir do nome do cabeçalho.
   * Ex: "CRIMES CONTRA A VIDA" -> "total_crimes_contra_a_vida"
   */
  getKeyForHeader(header: string): string {
    return 'total_' + header.toLowerCase().replace(/ /g, '_');
  }
}
