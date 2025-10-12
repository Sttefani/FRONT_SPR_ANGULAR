import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { RelatoriosOrdemServico } from '../../interfaces/relatorios-os.interface';
import { OrdemServicoService } from '../../services/ordem-servico.service';
import { ServicoPericialService } from '../../services/servico-pericial.service';
import { UsuarioService } from '../../services/usuario.service';
import { UnidadeDemandanteService } from '../../services/unidade-demandante.service';

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

  filtros = {
    data_inicio: '',
    data_fim: '',
    servico_id: null as number | null,
    unidade_id: null as number | null,
    perito_id: null as number | null,
    status: null as string | null
  };

  servicosDisponiveis: any[] = [];
  unidadesDisponiveis: any[] = [];
  peritosDisponiveis: any[] = [];
  statusDisponiveis = [
    { value: 'AGUARDANDO_CIENCIA', label: 'Aguardando Ciência' },
    { value: 'ABERTA', label: 'Aberta' },
    { value: 'EM_ANDAMENTO', label: 'Em Andamento' },
    { value: 'VENCIDA', label: 'Vencida' },
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
  this.servicoPericialService.getAllForDropdown().subscribe((data: any) => {
    this.servicosDisponiveis = data;
  });

  this.usuarioService.getPeritosList().subscribe((data: any) => {
    this.peritosDisponiveis = data;
  });

  this.unidadeDemandanteService.getAllForDropdown().subscribe((data: any) => {
    this.unidadesDisponiveis = data;
  });
}

  limparFiltros(): void {
    this.filtros = {
      data_inicio: '',
      data_fim: '',
      servico_id: null,
      unidade_id: null,
      perito_id: null,
      status: null
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

    this.ordemServicoService.getRelatoriosGerenciais(params).subscribe({
      next: (data: RelatoriosOrdemServico) => {
        this.relatorios = data;
        this.isLoading = false;
      },
      error: (err: HttpErrorResponse) => {
        console.error('Erro ao carregar relatórios de OS:', err);
        this.isLoading = false;
      }
    });
  }

  gerarPDF(): void {
    this.isGerandoPDF = true;

    this.ordemServicoService.imprimirRelatoriosOS(this.filtros).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `relatorio_os_${new Date().getTime()}.pdf`;
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

  getPercentualClass(percentual: number): string {
    if (percentual >= 80) return 'percentual-excelente';
    if (percentual >= 60) return 'percentual-bom';
    if (percentual >= 40) return 'percentual-regular';
    return 'percentual-ruim';
  }
}
