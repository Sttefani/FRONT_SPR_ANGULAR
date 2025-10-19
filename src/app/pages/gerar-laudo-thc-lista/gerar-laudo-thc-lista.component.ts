import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { LaudoService, LaudoListaItem, PaginatedResponse } from '../../services/laudo.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-gerar-laudo-thc-lista',
  templateUrl: './gerar-laudo-thc-lista.component.html',
  styleUrls: ['./gerar-laudo-thc-lista.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe]
})
export class GerarLaudoThcListaComponent implements OnInit {
  laudos: LaudoListaItem[] = [];
  laudosFiltrados: LaudoListaItem[] = []; // ✅ NOVO
  carregando = false;
  erro: string | null = null;

  // Propriedades para paginação
  paginaAtual = 1;
  totalDePaginas = 1;
  totalDeItens = 0;

  // ✅ NOVO: Filtro "Meus Laudos"
  filtrarMeusLaudos = false;
  nomeUsuarioLogado = '';

  constructor(private laudoService: LaudoService) {
    console.log('Componente da Lista de Laudos CARREGADO - Versão: 2.0');
  }

  ngOnInit(): void {
    this.carregarLaudos();
  }

  carregarLaudos(): void {
  this.carregando = true;
  this.erro = null;

  // ✅ Escolhe qual método chamar baseado no filtro
  const serviceMethod = this.filtrarMeusLaudos
    ? this.laudoService.listarMeusLaudos(this.paginaAtual)
    : this.laudoService.listarLaudos(this.paginaAtual);

  serviceMethod.subscribe({
    next: (response: PaginatedResponse<LaudoListaItem>) => {
      this.laudos = response.results;
      this.laudosFiltrados = response.results; // ✅ Agora já vem filtrado do backend

      // Pega nome do usuário logado (para botão editar)
      try {
        const token = localStorage.getItem('access_token');
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          this.nomeUsuarioLogado = payload.nome_completo;
        }
      } catch (error) {
        console.error('Erro ao pegar usuário logado:', error);
      }

      this.totalDeItens = response.count;
      this.totalDePaginas = Math.ceil(response.count / 10);
      this.carregando = false;
    },
    error: (err: any) => {
      console.error('Erro ao carregar laudos:', err);
      this.erro = 'Não foi possível carregar a lista de laudos.';
      this.carregando = false;
    },
  });
}
  // ✅ NOVO: Aplica filtro
  aplicarFiltro(): void {
    if (this.filtrarMeusLaudos) {
      this.laudosFiltrados = this.laudos.filter(
        laudo => laudo.gerado_por_nome === this.nomeUsuarioLogado
      );
    } else {
      this.laudosFiltrados = this.laudos;
    }
  }

  // ✅ NOVO: Toggle do filtro
  toggleMeusLaudos(): void {
  this.filtrarMeusLaudos = !this.filtrarMeusLaudos;
  this.paginaAtual = 1; // ✅ Volta pra página 1 ao trocar filtro
  this.carregarLaudos(); // ✅ Recarrega com filtro correto
}

  mudarPagina(novaPagina: number): void {
    if (novaPagina > 0 && novaPagina <= this.totalDePaginas) {
      this.paginaAtual = novaPagina;
      this.carregarLaudos();
    }
  }

  proximaPagina(): void {
    this.mudarPagina(this.paginaAtual + 1);
  }

  paginaAnterior(): void {
    this.mudarPagina(this.paginaAtual - 1);
  }

  podeEditar(laudo: any): boolean {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return false;

      const payload = JSON.parse(atob(token.split('.')[1]));
      const nomeLogado = payload.nome_completo;

      return laudo.gerado_por_nome === nomeLogado;
    } catch (error) {
      console.error('Erro ao verificar permissão:', error);
      return false;
    }
  }

  baixarPDF(laudoId: number): void {
    this.laudoService.baixarLaudoPDF(laudoId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `laudo_${laudoId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      },
      error: (err: any) => {
        console.error('Erro ao descarregar PDF:', err);
        this.erro = 'Não foi possível descarregar o PDF do laudo.';
      }
    });
  }
}
