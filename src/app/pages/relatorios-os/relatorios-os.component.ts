// src/app/pages/relatorios/relatorios-os/relatorios-os.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { RelatoriosOrdemServico } from '../../interfaces/relatorios-os.interface';
import { OrdemServicoService } from '../../services/ordem-servico.service';
import { ServicoPericialService } from '../../services/servico-pericial.service';
import { UsuarioService } from '../../services/usuario.service';
import { UnidadeDemandanteService } from '../../services/unidade-demandante.service';

// Interfaces simples para os dropdowns
interface DropdownItem {
  id: number;
  nome: string; // Assumindo 'nome' para unidade e serviço
  sigla?: string; // Adicionado opcional para serviço
}

interface PeritoDropdownItem {
  id: number;
  nome_completo: string;
}

@Component({
  selector: 'app-relatorios-os',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './relatorios-os.component.html',
  styleUrl: './relatorios-os.component.scss'
})
export class RelatoriosOsComponent implements OnInit {

  relatorios: RelatoriosOrdemServico | null = null;
  isLoading = true;
  isGerandoPDF = false;
  errorMessage: string | null = null;

  // ✅ CORREÇÃO: Padronizar 'status' para usar null como valor inicial/reset e tipo string | null
  filtros = {
    data_inicio: '',
    data_fim: '',
    servico_id: null as number | null,
    unidade_id: null as number | null,
    perito_id: null as number | null,
    status: null as string | null // <-- Garantir que está null e o tipo permite null
  };

  servicosDisponiveis: DropdownItem[] = [];
  unidadesDisponiveis: DropdownItem[] = [];
  peritosDisponiveis: PeritoDropdownItem[] = [];

  // ✅ CORREÇÃO: Opção explícita 'Todos' removida daqui, pois o HTML já tem [ngValue]="null"
  statusDisponiveis = [
    { value: 'AGUARDANDO_CIENCIA', label: 'Aguardando Ciência' },
    { value: 'ABERTA', label: 'Aberta' },
    { value: 'EM_ANDAMENTO', label: 'Em Andamento' },
    // { value: 'VENCIDA', label: 'Vencida' }, // Já removido antes
    { value: 'CONCLUIDA', label: 'Concluída' }
  ];

  constructor(
    private ordemServicoService: OrdemServicoService,
    private servicoPericialService: ServicoPericialService,
    private usuarioService: UsuarioService,
    private unidadeDemandanteService: UnidadeDemandanteService
  ) {}

  ngOnInit(): void {
    this.loadFiltroData();
    this.aplicarFiltros();
  }

  loadFiltroData(): void {
    this.servicoPericialService.getAllForDropdown().subscribe({
      next: (data: DropdownItem[]) => { this.servicosDisponiveis = data || []; },
      error: (err) => { console.error('Erro ao carregar serviços:', err); this.servicosDisponiveis = []; }
    });
    this.usuarioService.getPeritosList().subscribe({
        next: (data: PeritoDropdownItem[]) => { this.peritosDisponiveis = data || []; },
        error: (err) => { console.error('Erro ao carregar peritos:', err); this.peritosDisponiveis = []; }
    });
    this.unidadeDemandanteService.getAllForDropdown().subscribe({
        next: (data: DropdownItem[]) => { this.unidadesDisponiveis = data || []; },
        error: (err) => { console.error('Erro ao carregar unidades:', err); this.unidadesDisponiveis = []; }
    });
  }

  limparFiltros(): void {
    this.filtros = {
      data_inicio: '',
      data_fim: '',
      servico_id: null,
      unidade_id: null,
      perito_id: null,
      status: null // ✅ CORREÇÃO: Garantir que reseta para null
    };
    this.aplicarFiltros();
  }

  aplicarFiltros(): void {
    this.isLoading = true;
    this.errorMessage = null;
    const params: any = {};
    for (const key in this.filtros) {
        if (Object.prototype.hasOwnProperty.call(this.filtros, key)) {
            const typedKey = key as keyof typeof this.filtros;
            const value = this.filtros[typedKey];
            // Envia o parâmetro apenas se tiver valor (não nulo, não undefined, não string vazia)
            if (value !== null && value !== undefined && value !== '') {
                params[typedKey] = value;
            }
        }
    }
    this.ordemServicoService.getRelatoriosGerenciais(params).subscribe({
      next: (data: RelatoriosOrdemServico) => {
        this.relatorios = data;
        this.isLoading = false;
      },
      error: (err: HttpErrorResponse) => {
        console.error('Erro ao carregar relatórios de OS:', err);
        this.errorMessage = `Erro ao carregar relatórios (${err.status}): ${err.error?.error || err.message}`;
        this.relatorios = null;
        this.isLoading = false;
      }
    });
  }

  gerarPDF(): void {
    this.isGerandoPDF = true;
    this.errorMessage = null;
     const params: any = {};
     for (const key in this.filtros) {
        if (Object.prototype.hasOwnProperty.call(this.filtros, key)) {
            const typedKey = key as keyof typeof this.filtros;
            const value = this.filtros[typedKey];
            if (value !== null && value !== undefined && value !== '') {
                params[typedKey] = value;
            }
        }
    }
    this.ordemServicoService.imprimirRelatoriosOS(params).subscribe({
      next: (blob: Blob) => {
        if (blob && blob.size > 0) {
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `relatorio_os_${new Date().toISOString().slice(0,10)}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } else {
             console.error("PDF Blob vazio recebido.");
             this.errorMessage = 'Erro ao gerar PDF: O arquivo recebido está vazio.';
             alert('Erro ao gerar PDF: O arquivo recebido está vazio.');
        }
        this.isGerandoPDF = false;
      },
      error: (err: HttpErrorResponse) => {
        console.error('Erro ao gerar PDF:', err);
        this.errorMessage = `Erro ao gerar PDF (${err.status}): Tente novamente.`;
        alert('Erro ao gerar PDF. Verifique o console para mais detalhes.');
        this.isGerandoPDF = false;
      }
    });
  }

  getPercentualClass(percentual: number | undefined | null): string {
    if (percentual === null || percentual === undefined) return 'percentual-indefinido';
    if (percentual >= 90) return 'percentual-excelente';
    if (percentual >= 70) return 'percentual-bom';
    if (percentual >= 50) return 'percentual-regular';
    return 'percentual-ruim';
  }

  formatarNumero(valor: number | undefined | null): string {
      if (valor === null || valor === undefined) return '-';
      // Simples formatação, ajuste locale se necessário no app config
      return valor.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
  }

  formatarMesAno(dataString: string | undefined | null): string {
      if (!dataString) return '-';
      try {
          // Assume que a string é YYYY-MM-DD
          const [ano, mes] = dataString.split('-');
          if (mes && ano) {
              return `${mes}/${ano}`;
          }
          return dataString; // Retorna original se não conseguir parsear
      } catch (e) {
          console.error("Erro ao formatar data:", dataString, e);
          return dataString;
      }
  }
}
