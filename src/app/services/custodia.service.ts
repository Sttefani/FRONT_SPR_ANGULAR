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

export interface VestigioDetalhe extends VestigioList {
  descricao: string | null;
  autoridade: { id: number; nome: string; cargo_nome: string } | null;
  user_destino: UsuarioSimples | null;
  procedimentos: { id: number; numero: string; ano: number; numero_completo: string }[];
  vestigio_contra_prova: number | null;
  vestigio_contra_prova_lacre: string | null;
  created_by: UsuarioSimples | null;
  updated_by: UsuarioSimples | null;
  // Campos calculados (priorizam FK, caem para fallback de auditoria histórica)
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
  lacre?: string;
  num_processo_sei?: string;
  ocorrencia?: string;
  page?: number;
  page_size?: number;
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

  finalizarVestigio(id: number, data: { saiu_da_custodia: boolean; descricao?: string }): Observable<VestigioDetalhe> {
    return this.http.post<VestigioDetalhe>(`${this.base}/custodia/vestigios/${id}/finalizar/`, data);
  }

  reabrirVestigio(id: number): Observable<VestigioDetalhe> {
    return this.http.post<VestigioDetalhe>(`${this.base}/custodia/vestigios/${id}/reabrir/`, {});
  }

  getDashboard(): Observable<DashboardCustodia> {
    return this.http.get<DashboardCustodia>(`${this.base}/custodia/vestigios/dashboard/`);
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
    // PATCH com FormData precisa de PUT no DRF quando há arquivo
    // Usa PATCH que aceita atualização parcial
    return this.http.patch<DNA>(`${this.base}/custodia/dnas/${id}/`, data);
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
