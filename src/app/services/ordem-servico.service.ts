// src/app/services/ordem-servico.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

// =============================================================================
// INTERFACES
// =============================================================================

export interface OrdemServico {
  id: number;
  numero_os: string;
  prazo_dias: number;
  status: 'AGUARDANDO_CIENCIA' | 'ABERTA' | 'EM_ANDAMENTO' | 'VENCIDA' | 'CONCLUIDA';
  data_conclusao: string | null;
  texto_padrao: string;
  observacoes_administrativo: string;
  justificativa_atraso: string;
  numero_documento_referencia: string;
  processo_sei_referencia: string;
  processo_judicial_referencia: string;
  data_primeira_visualizacao: string | null;
  data_ciencia: string | null;
  ip_ciencia: string | null;
  created_at: string;
  updated_at: string;
  numero_reiteracao: number;

  // Relações
  ocorrencia: {
    id: number;
    numero_ocorrencia: string;
    servico_pericial?: {
      id: number;
      nome: string;
    };
  };

  created_by: {
    id: number;
    nome_completo: string;
    email: string;
  } | null;

  ordenada_por: {
    id: number;
    nome_completo: string;
    email: string;
  } | null;

  ciente_por: {
    id: number;
    nome_completo: string;
    email: string;
  } | null;

  unidade_demandante: {
    id: number;
    nome: string;
  } | null;

  autoridade_demandante: {
    id: number;
    nome: string;
  } | null;

 procedimento: {
  id: number;
  tipo_procedimento: {
    id: number;
    sigla: string;
    nome: string;
  };
  numero: string;
  ano: number;
  numero_completo: string;
} | null;

  tipo_documento_referencia: {
    id: number;
    nome: string;
  } | null;

  os_original: number | null;

  // Campos calculados
  data_vencimento: string | null;
  dias_desde_emissao: number;
  dias_restantes: number | null;
  esta_vencida: boolean;
  urgencia: 'verde' | 'amarelo' | 'laranja' | 'vermelho' | 'concluida' | null;
  percentual_prazo_consumido: number;
  prazo_acumulado_total: number;
  acao_necessaria: string | null;
  reiteracoes: any[];
  concluida_com_atraso: boolean | null;  // ← ADICIONAR ESTA LINHA AQUI
  perito_destinatario: {
    id: number;
    nome_completo: string;
    email: string;
  } | null;
  detalhes_ocultos?: boolean;
  mensagem?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface CriarOrdemServicoPayload {
  ocorrencia_id: number;
  prazo_dias: number;
  ordenada_por_id: number;
  observacoes_administrativo?: string;
  tipo_documento_referencia_id?: number;
  numero_documento_referencia?: string;
  processo_sei_referencia?: string;
  processo_judicial_referencia?: string;
  email: string;
  password: string;
}

export interface TomarCienciaPayload {
  password: string;
}

export interface ReiterarPayload {
  prazo_dias: number;
  ordenada_por_id?: number;
  observacoes_administrativo?: string;
  email: string;
  password: string;
}

export interface JustificarAtrasoPayload {
  justificativa: string;
}

export interface FiltrosOrdemServico {
  ocorrencia_id?: number;
  status?: string;
  perito_id?: number;
  data_inicio?: string;
  data_fim?: string;
  vencida?: boolean;
  sem_ciencia?: boolean;
  com_justificativa?: boolean;
  urgencia?: string;
  apenas_originais?: boolean;
  apenas_reiteracoes?: boolean;
  search?: string;
  page?: number;
  unidade_id?: number | string;
  page_size?: number;
  ordering?: string;
}

// =============================================================================
// SERVICE
// =============================================================================

@Injectable({
  providedIn: 'root'
})
export class OrdemServicoService {
  private baseUrl = 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  // ===========================================================================
  // CRUD BÁSICO
  // ===========================================================================

  listar(filtros?: FiltrosOrdemServico): Observable<PaginatedResponse<OrdemServico>> {
    let params = new HttpParams();

    if (filtros) {
      Object.keys(filtros).forEach(key => {
        const value = (filtros as any)[key];
        if (value !== null && value !== undefined && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get<PaginatedResponse<OrdemServico>>(`${this.baseUrl}/ordens-servico/`, { params });
  }

  buscarPorId(id: number): Observable<OrdemServico> {
    return this.http.get<OrdemServico>(`${this.baseUrl}/ordens-servico/${id}/`);
  }

  criar(payload: CriarOrdemServicoPayload): Observable<{ message: string; ordem_servico: OrdemServico }> {
    return this.http.post<{ message: string; ordem_servico: OrdemServico }>(
      `${this.baseUrl}/ordens-servico/`,
      payload
    );
  }

  atualizar(id: number, payload: Partial<OrdemServico>): Observable<OrdemServico> {
    return this.http.patch<OrdemServico>(`${this.baseUrl}/ordens-servico/${id}/`, payload);
  }

  deletar(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/ordens-servico/${id}/`);
  }

  // ===========================================================================
  // ACTIONS DO PERITO
  // ===========================================================================

  tomarCiencia(id: number, payload: TomarCienciaPayload): Observable<{ message: string; ordem_servico: OrdemServico }> {
    return this.http.post<{ message: string; ordem_servico: OrdemServico }>(
      `${this.baseUrl}/ordens-servico/${id}/tomar-ciencia/`,
      payload
    );
  }

  iniciarTrabalho(id: number): Observable<{ message: string; ordem_servico: OrdemServico }> {
    return this.http.post<{ message: string; ordem_servico: OrdemServico }>(
      `${this.baseUrl}/ordens-servico/${id}/iniciar-trabalho/`,
      {}
    );
  }

  justificarAtraso(id: number, payload: JustificarAtrasoPayload): Observable<{ message: string; ordem_servico: OrdemServico }> {
    return this.http.post<{ message: string; ordem_servico: OrdemServico }>(
      `${this.baseUrl}/ordens-servico/${id}/justificar-atraso/`,
      payload
    );
  }

  // ===========================================================================
  // ACTIONS DO ADMINISTRATIVO
  // ===========================================================================

  reiterar(id: number, payload: ReiterarPayload): Observable<{ message: string; ordem_servico: OrdemServico }> {
    return this.http.post<{ message: string; ordem_servico: OrdemServico }>(
      `${this.baseUrl}/ordens-servico/${id}/reiterar/`,
      payload
    );
  }

  concluir(id: number): Observable<{ message: string; ordem_servico: OrdemServico }> {
    return this.http.post<{ message: string; ordem_servico: OrdemServico }>(
      `${this.baseUrl}/ordens-servico/${id}/concluir/`,
      {}
    );
  }

  // ===========================================================================
  // LIXEIRA
  // ===========================================================================

  listarLixeira(): Observable<OrdemServico[]> {
    return this.http.get<OrdemServico[]>(`${this.baseUrl}/ordens-servico/lixeira/`);
  }

  restaurar(id: number): Observable<{ message: string; ordem_servico: OrdemServico }> {
    return this.http.post<{ message: string; ordem_servico: OrdemServico }>(
      `${this.baseUrl}/ordens-servico/${id}/restaurar/`,
      {}
    );
  }

  // ===========================================================================
  // PDFs
  // ===========================================================================

  gerarPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/ordens-servico/${id}/pdf/`, {
      responseType: 'blob'
    });
  }

  gerarPdfOficial(id: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/ordens-servico/${id}/pdf-oficial/`, {
      responseType: 'blob'
    });
  }

  gerarListagemPdf(ocorrenciaId: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/ordens-servico/listagem-pdf/`, {
      params: { ocorrencia_id: ocorrenciaId.toString() },
      responseType: 'blob'
    });
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  downloadPdf(blob: Blob, nomeArquivo: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nomeArquivo;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  getStatusColor(status: string): string {
    const cores: { [key: string]: string } = {
      'AGUARDANDO_CIENCIA': 'secondary',
      'ABERTA': 'primary',
      'EM_ANDAMENTO': 'info',
      'VENCIDA': 'danger',
      'CONCLUIDA': 'success'
    };
    return cores[status] || 'secondary';
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'AGUARDANDO_CIENCIA': 'Aguardando Ciência',
      'ABERTA': 'Aberta',
      'EM_ANDAMENTO': 'Em Andamento',
      'VENCIDA': 'Vencida',
      'CONCLUIDA': 'Concluída'
    };
    return labels[status] || status;
  }

  getUrgenciaInfo(urgencia: string | null): { cor: string; icone: string; label: string } {
    if (!urgencia) {
      return { cor: 'secondary', icone: '🔒', label: 'Sem Ciência' };
    }

    const info: { [key: string]: { cor: string; icone: string; label: string } } = {
      'verde': { cor: 'success', icone: '🟢', label: 'OK' },
      'amarelo': { cor: 'warning', icone: '🟡', label: 'Atenção' },
      'laranja': { cor: 'warning', icone: '🟠', label: 'Urgente' },
      'vermelho': { cor: 'danger', icone: '🔴', label: 'Vencida' },
      'concluida': { cor: 'success', icone: '✅', label: 'Concluída' }
    };

    return info[urgencia] || { cor: 'secondary', icone: '', label: urgencia };
  }

  getOsPendentesCiencia(): Observable<{ count: number; ordens: any[] }> {
    return this.http.get<{ count: number; ordens: any[] }>(
      `${this.baseUrl}/ordens-servico/pendentes-ciencia/`
    );
  }
  // ===========================================================================
// RELATÓRIOS GERENCIAIS
// ===========================================================================

getRelatoriosGerenciais(filtros?: {
  data_inicio?: string;
  data_fim?: string;
  perito_id?: number;
  unidade_id?: number;
  servico_id?: number;
  status?: string;
}): Observable<any> {
  let params = new HttpParams();

  if (filtros) {
    Object.keys(filtros).forEach(key => {
      const value = (filtros as any)[key];
      if (value !== null && value !== undefined && value !== '') {
        params = params.set(key, value.toString());
      }
    });
  }

  return this.http.get<any>(`${this.baseUrl}/ordens-servico/relatorios-gerenciais/`, { params });
}

// Método para gerar PDF dos relatórios (implementar depois no backend se necessário)
imprimirRelatoriosOS(filtros?: any): Observable<Blob> {
  let params = new HttpParams();

  if (filtros) {
    Object.keys(filtros).forEach(key => {
      const value = (filtros as any)[key];
      if (value !== null && value !== undefined && value !== '') {
        params = params.set(key, value.toString());
      }
    });
  }

  return this.http.get(`${this.baseUrl}/ordens-servico/relatorios-gerenciais-pdf/`, {
    params,
    responseType: 'blob'
  });
}
}
