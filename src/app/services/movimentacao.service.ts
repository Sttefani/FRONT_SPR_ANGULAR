import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { Movimentacao, CriarMovimentacao } from '../interfaces/movimentacao.interface';
import { environment } from '../../environments/environment';  // ← LINHA ADICIONADA

@Injectable({
  providedIn: 'root'
})
export class MovimentacaoService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;  // ← LINHA MODIFICADA

  // Listar movimentações ativas de uma ocorrência
  listar(ocorrenciaId: number): Observable<Movimentacao[]> {
    return this.http.get<any>(`${this.baseUrl}/ocorrencias/${ocorrenciaId}/movimentacoes/`)
      .pipe(
        map(response => {
          // Se vier paginado (com results), pega os results
          if (response && response.results) {
            return response.results;
          }
          // Se vier array direto, retorna direto
          return response;
        })
      );
  }

  // Criar nova movimentação (com assinatura digital)
  criar(ocorrenciaId: number, dados: CriarMovimentacao): Observable<Movimentacao> {
    return this.http.post<Movimentacao>(
      `${this.baseUrl}/ocorrencias/${ocorrenciaId}/movimentacoes/`,
      dados
    );
  }

  // Editar movimentação (exige nova assinatura)
  editar(
    ocorrenciaId: number,
    movimentacaoId: number,
    dados: Partial<CriarMovimentacao>
  ): Observable<Movimentacao> {
    return this.http.patch<Movimentacao>(
      `${this.baseUrl}/ocorrencias/${ocorrenciaId}/movimentacoes/${movimentacaoId}/`,
      dados
    );
  }

  // Deletar (soft delete - só Super Admin)
  deletar(ocorrenciaId: number, movimentacaoId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/ocorrencias/${ocorrenciaId}/movimentacoes/${movimentacaoId}/`
    );
  }

  // Listar lixeira
  listarLixeira(ocorrenciaId: number): Observable<Movimentacao[]> {
    return this.http.get<any>(`${this.baseUrl}/ocorrencias/${ocorrenciaId}/movimentacoes/lixeira/`)
      .pipe(
        map(response => {
          // Se vier paginado (com results), pega os results
          if (response && response.results) {
            return response.results;
          }
          // Se vier array direto, retorna direto
          return response;
        })
      );
  }

  // Restaurar da lixeira
  restaurar(ocorrenciaId: number, movimentacaoId: number): Observable<Movimentacao> {
    return this.http.post<Movimentacao>(
      `${this.baseUrl}/ocorrencias/${ocorrenciaId}/movimentacoes/${movimentacaoId}/restaurar/`,
      {}
    );
  }

  // Gerar PDF individual de uma movimentação
  gerarPdf(ocorrenciaId: number, movimentacaoId: number): Observable<Blob> {
    return this.http.get(
      `${this.baseUrl}/ocorrencias/${ocorrenciaId}/movimentacoes/${movimentacaoId}/pdf/`,
      { responseType: 'blob' }
    );
  }

  // Gerar PDF do histórico COMPLETO da ocorrência (TODAS as movimentações)
  gerarHistoricoPdf(ocorrenciaId: number): Observable<Blob> {
    return this.http.get(
      `${this.baseUrl}/ocorrencias/${ocorrenciaId}/movimentacoes/historico-pdf/`,
      { responseType: 'blob' }
    );
  }
}
