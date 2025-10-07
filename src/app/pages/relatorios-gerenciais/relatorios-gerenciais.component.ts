import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { RelatoriosGerenciais } from '../../interfaces/realatorios.interface';
import { OcorrenciaService } from '../../services/ocorrencia.service';
import { ServicoPericialService } from '../../services/servico-pericial.service';
import { CidadeService } from '../../services/cidade.service'; // <-- 1. IMPORTA O SERVIÇO DE CIDADE
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
  isGerandoPDF = false;

  filtros = {
    data_inicio: '',
    data_fim: '',
    servico_id: null as number | null,
    cidade_id: null as number | null, // <-- 2. ADICIONA A PROPRIEDADE DO NOVO FILTRO
    perito_id: null as number | null,
    classificacao_id: null as number | null
  };

  servicosDisponiveis: any[] = [];
  cidadesDisponiveis: any[] = []; // <-- 2. ADICIONA A LISTA PARA O DROPDOWN
  peritosDisponiveis: any[] = [];
  classificacoesDisponiveis: any[] = [];

  constructor(
    private ocorrenciaService: OcorrenciaService,
    private servicoPericialService: ServicoPericialService,
    private cidadeService: CidadeService, // <-- 3. INJETA O SERVIÇO
    private usuarioService: UsuarioService,
    private classificacaoService: ClassificacaoOcorrenciaService
  ) {}

  ngOnInit(): void {
    this.loadFiltroData();
    this.aplicarFiltros();
  }

  loadFiltroData(): void {
    this.servicoPericialService.getAllForDropdown().subscribe((data: any) => this.servicosDisponiveis = data);
    this.cidadeService.getAllForDropdown().subscribe((data: any) => this.cidadesDisponiveis = data); // <-- 4. ADICIONA A CHAMADA PARA CARREGAR AS CIDADES
    this.usuarioService.getPeritosList().subscribe((data: any) => this.peritosDisponiveis = data);
    this.classificacaoService.getAll().subscribe((data: any) => this.classificacoesDisponiveis = data);
  }

  limparFiltros(): void {
    this.filtros = {
      data_inicio: '',
      data_fim: '',
      servico_id: null,
      cidade_id: null, // <-- 2. ADICIONA AQUI TAMBÉM
      perito_id: null,
      classificacao_id: null
    };
    this.aplicarFiltros();
  }

  // A função aplicarFiltros() JÁ ESTÁ PRONTA e vai enviar o 'cidade_id' automaticamente!
  // Nenhuma mudança é necessária nela.
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

  getKeyForHeader(header: string): string {
    return 'total_' + header.toLowerCase().replace(/ /g, '_');
  }
  gerarPDF(): void {
    this.isGerandoPDF = true;

    this.ocorrenciaService.imprimirRelatoriosGerenciais(this.filtros).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `relatorio_gerencial_${new Date().getTime()}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        this.isGerandoPDF = false;
      },
      error: (err: HttpErrorResponse) => {
        console.error('Erro ao gerar PDF:', err);
        alert('Erro ao gerar PDF. Tente novamente.');
        this.isGerandoPDF = false;
      }
    });
  }
}
