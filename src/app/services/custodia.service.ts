import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface LookupSimples {
  id: number;
  nome: string;
  sigla?: string;
}

export interface UsuarioSimples {
  id: number;
  nome_completo: string;
  email?: string;
}

export interface VestigioList {
  id: number;
  lacre: string | null;
  num_processo_sei: string | null;
  ocorrencia: string | null;
  ano_ocorrencia: number | null;
  status: 'INICIAL' | 'ANDAMENTO' | 'FINALIZADO';
  status_display: string;
  conformidade: boolean;
  biologico: boolean;
  saiu_da_custodia: boolean;
  unidade_demandante: LookupSimples | null;
  servico_pericial: LookupSimples | null;
  autoridade_nome: string | null;
  criado_por: string | null;
  created_at: string;
}

export interface OcorrenciaProcedimento {
  id: number;
  numero_completo: string;
  numero: string;
  ano: number;
  tipo: { id: number; sigla: string; nome: string };
}

export interface OcorrenciaVinculada {
  id: number;
  numero_ocorrencia: string;
  status: string;
  status_display: string;
  servico_sigla: string;
  unidade_sigla: string;
  procedimento: OcorrenciaProcedimento | null;
}

export interface VestigioDetalhe extends VestigioList {
  descricao: string | null;
  motivo_finalizacao: string | null;
  autoridade: { id: number; nome: string; cargo_nome: string } | null;
  user_destino: UsuarioSimples | null;
  procedimentos: { id: number; numero: string; ano: number; numero_completo: string }[];
  ocorrencias_vinculadas: OcorrenciaVinculada[];
  vestigio_contra_prova: number | null;
  vestigio_contra_prova_lacre: string | null;
  created_by: UsuarioSimples | null;
  updated_by: UsuarioSimples | null;
  registrado_por: string | null;
  atualizado_por: string | null;
  updated_at: string;
}

export interface VestigioMovimentacao {
  id: number;
  vestigio: number;
  lacre: string | null;
  num_processo_sei: string | null;
  descricao: string | null;
  aceito: boolean;
  data_hora_aceito: string | null;
  unidade_demandante: LookupSimples | null;
  servico_pericial: LookupSimples | null;
  autoridade_nome: string | null;
  user_destino: UsuarioSimples | null;
  criado_por: string | null;
  created_at: string;
}

export interface DNA {
  id: number;
  nome: string;
  cpf: string;
  nascimento: string;
  naturalidade: string;
  uf: string | null;
  finalidade_coleta: string;
  finalidade_coleta_display: string;
  situacao: string;
  situacao_display: string;
  data_da_coleta: string;
  codigo_barras: string | null;
  perito_nome: string | null;
  vestigio_lacre: string | null;
  created_at: string;
}

export interface PaginatedVestigios {
  count: number;
  next: string | null;
  previous: string | null;
  results: VestigioList[];
}

export interface DashboardCustodia {
  total: number;
  inicial: number;
  andamento: number;
  finalizado: number;
  biologicos: number;
}

export interface DNAFiltros {
  nome?: string;
  cpf?: string;
  lacres?: string;
  uf?: string;
  perito?: number;
  situacao?: string;
  finalidade_coleta?: string;
  vestigio?: number;
  registrado_por_usuario_externo?: boolean;
  data_de?: string;
  data_ate?: string;
  search?: string;   // SearchFilter: busca em nome, cpf, codigo_barras
  page?: number;
  page_size?: number;
}

export interface PaginatedDNAs {
  count: number;
  next: string | null;
  previous: string | null;
  results: DNA[];
}

export interface VestigioFiltros {
  status?: string;
  servico_pericial?: number;
  unidade_demandante?: number;
  biologico?: boolean;
  conformidade?: boolean;
  lacre?: string;
  num_processo_sei?: string;
  ocorrencia?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface DashboardExterno {
  unidade: { id: number; sigla: string; nome: string };
  vestigios: { total: number; inicial: number; andamento: number; finalizado: number; biologicos: number };
  dnas_total: number;
  movimentacoes_recentes: VestigioMovimentacao[];
  alertas: { transferencias_pendentes: number };
}

export interface DashboardCustodianteUnidade {
  'unidade_demandante__id': number;
  'unidade_demandante__sigla': string;
  'unidade_demandante__nome': string;
  total: number;
  ativos: number;
  biologicos: number;
}

export interface DashboardCustodiante {
  vestigios: { total: number; inicial: number; andamento: number; finalizado: number; biologicos: number };
  dnas_total: number;
  vestigios_por_unidade: DashboardCustodianteUnidade[];
  alertas: { transferencias_pendentes: number };
  movimentacoes_recentes: VestigioMovimentacao[];
}

export interface CustodiaResumoFiltros {
  servico_pericial_id?: number;
  unidade_demandante_id?: number;
}

export interface CustodiaResumoUnidade {
  'unidade_demandante__id': number;
  'unidade_demandante__sigla': string;
  'unidade_demandante__nome': string;
  total: number;
  ativos: number;
  biologicos: number;
}

export interface CustodiaResumo {
  vestigios: {
    total: number;
    inicial: number;
    andamento: number;
    finalizado: number;
    biologicos: number;
  };
  dnas_total: number;
  transferencias_pendentes: number;
  vestigios_por_unidade?: CustodiaResumoUnidade[];
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class CustodiaService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Vestígios
  getVestigios(filtros: VestigioFiltros = {}): Observable<PaginatedVestigios> {
    let params = new HttpParams();
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') {
        params = params.set(k, String(v));
      }
    });
    return this.http.get<PaginatedVestigios>(`${this.base}/custodia/vestigios/`, { params });
  }

  getVestigioByUrl(url: string): Observable<PaginatedVestigios> {
    return this.http.get<PaginatedVestigios>(url);
  }

  getVestigio(id: number): Observable<VestigioDetalhe> {
    return this.http.get<VestigioDetalhe>(`${this.base}/custodia/vestigios/${id}/`);
  }

  criarVestigio(data: any): Observable<VestigioDetalhe> {
    return this.http.post<VestigioDetalhe>(`${this.base}/custodia/vestigios/`, data);
  }

  editarVestigio(id: number, data: any): Observable<VestigioDetalhe> {
    return this.http.patch<VestigioDetalhe>(`${this.base}/custodia/vestigios/${id}/`, data);
  }

  deletarVestigio(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/custodia/vestigios/${id}/`);
  }

  finalizarVestigio(id: number, data: {
    saiu_da_custodia: boolean;
    motivo_finalizacao: string;
    assinatura_email: string;
    assinatura_senha: string;
  }): Observable<VestigioDetalhe> {
    return this.http.post<VestigioDetalhe>(`${this.base}/custodia/vestigios/${id}/finalizar/`, data);
  }

  reabrirVestigio(id: number): Observable<VestigioDetalhe> {
    return this.http.post<VestigioDetalhe>(`${this.base}/custodia/vestigios/${id}/reabrir/`, {});
  }

  getContraProvas(vestigioId: number): Observable<VestigioList[]> {
    return this.http.get<VestigioList[]>(`${this.base}/custodia/vestigios/${vestigioId}/contra-provas/`);
  }

  vincularOcorrencia(vestigioId: number, ocorrenciaId: number, acao: 'add' | 'remove'): Observable<any> {
    return this.http.post<any>(
      `${this.base}/custodia/vestigios/${vestigioId}/vincular-ocorrencia/`,
      { ocorrencia_id: ocorrenciaId, acao }
    );
  }

  getGrafoVestigio(vestigioId: number): Observable<any> {
    return this.http.get<any>(`${this.base}/custodia/vestigios/${vestigioId}/grafo/`);
  }

  buscarOcorrenciaPorNumero(numero: string): Observable<{ exists: boolean; ocorrencia: OcorrenciaVinculada | null }> {
    const params = new HttpParams().set('numero_ocorrencia', numero.trim().toUpperCase());
    return this.http.get<any>(`${this.base}/ocorrencias/buscar-por-numero/`, { params });
  }

  getDashboard(): Observable<DashboardCustodia> {
    return this.http.get<DashboardCustodia>(`${this.base}/custodia/vestigios/dashboard/`);
  }

  getDashboardExterno(): Observable<DashboardExterno> {
    return this.http.get<DashboardExterno>(`${this.base}/custodia/dashboard/externo/`);
  }

  getDashboardCustodiante(): Observable<DashboardCustodiante> {
    return this.http.get<DashboardCustodiante>(`${this.base}/custodia/dashboard/custodiante/`);
  }

  getResumo(filtros: CustodiaResumoFiltros = {}): Observable<CustodiaResumo> {
    let params = new HttpParams();
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') params = params.set(k, String(v));
    });
    return this.http.get<CustodiaResumo>(`${this.base}/custodia/resumo/`, { params });
  }

  // Movimentações
  getMovimentacoes(vestigioId: number): Observable<VestigioMovimentacao[]> {
    return this.http.get<VestigioMovimentacao[]>(`${this.base}/custodia/vestigios/${vestigioId}/movimentacoes/`);
  }

  criarMovimentacao(data: any): Observable<VestigioMovimentacao> {
    return this.http.post<VestigioMovimentacao>(`${this.base}/custodia/movimentacoes/`, data);
  }

  aceitarMovimentacao(id: number): Observable<VestigioMovimentacao> {
    return this.http.post<VestigioMovimentacao>(`${this.base}/custodia/movimentacoes/${id}/aceitar/`, {});
  }

  // DNAs
  getDnas(vestigioId: number): Observable<DNA[]> {
    return this.http.get<DNA[]>(`${this.base}/custodia/vestigios/${vestigioId}/dnas/`);
  }

  getDnasPaginado(filtros: DNAFiltros = {}): Observable<PaginatedDNAs> {
    let params = new HttpParams();
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') params = params.set(k, String(v));
    });
    return this.http.get<PaginatedDNAs>(`${this.base}/custodia/dnas/`, { params });
  }

  getDnasByUrl(url: string): Observable<PaginatedDNAs> {
    return this.http.get<PaginatedDNAs>(url);
  }

  criarDna(data: FormData | Record<string, any>): Observable<DNA> {
    return this.http.post<DNA>(`${this.base}/custodia/dnas/`, data);
  }

  editarDna(id: number, data: FormData | Record<string, any>): Observable<DNA> {
    return this.http.patch<DNA>(`${this.base}/custodia/dnas/${id}/`, data);
  }

  /**
   * Vincula ou desvincula um DNA a um vestígio.
   * @param vestigioId  ID do vestígio a vincular; null para desvincular.
   */
  vincularDnaAoVestigio(dnaId: number, vestigioId: number | null): Observable<any> {
    return this.http.patch<any>(
      `${this.base}/custodia/dnas/${dnaId}/`,
      { vestigio_id: vestigioId }
    );
  }

  getDna(id: number): Observable<any> {
    return this.http.get<any>(`${this.base}/custodia/dnas/${id}/`);
  }

  // Busca o PDF da ficha de DNA como Blob (JWT via interceptor)
  getFichaDnaPdf(id: number): Observable<Blob> {
    return this.http.get(
      `${this.base}/custodia/dnas/${id}/ficha-pdf/`,
      { responseType: 'blob' }
    );
  }

  // window.open() direto não passa o JWT — usa HttpClient para buscar como Blob
  getFichaVestigioPdf(vestigioId: number): Observable<Blob> {
    return this.http.get(
      `${this.base}/custodia/vestigios/${vestigioId}/ficha-pdf/`,
      { responseType: 'blob' }
    );
  }
}
