import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface ProtocoloVestigioResumo {
  id: number;
  lacre: string | null;
  num_processo_sei: string | null;
  status: string;
  ocorrencia: string | null;
  ano_ocorrencia: number | null;
}

export interface ProtocoloOcorrenciaResumo {
  id: number;
  numero_ocorrencia: string;
}

export interface ProtocoloProcedimentoResumo {
  id: number;
  descricao: string;
}

export interface ProtocoloAutoridadeResumo {
  id: number;
  nome: string;
  cargo_nome: string | null;
}

export interface ProtocoloUnidadeResumo {
  id: number;
  nome: string;
  sigla: string;
}

export interface ProtocoloUsuarioResumo {
  id: number;
  nome_completo: string;
  email: string;
  perfil: string;
}

export type StatusRecebimento = 'PENDENTE' | 'ASSINADO_ELETRONICAMENTE' | 'ASSINADO_MANUAL';
export type TipoEntrega = 'MATERIAL' | 'LAUDO' | 'MATERIAL_E_LAUDO';

export interface ProtocoloList {
  id: number;
  numero: string;
  tipo_entrega: TipoEntrega;
  status_recebimento: StatusRecebimento;
  vestigio_id: number;
  vestigio_lacre: string | null;
  vestigio_status: string;
  ocorrencia_numero: string;
  recebido_por_nome: string;
  unidade_nome: string;
  unidade_sigla: string;
  autoridade_nome: string;
  entregue_em: string;
  recebido_em: string | null;
  vestigio_foi_finalizado: boolean;
}

export interface ProtocoloDetalhe {
  id: number;
  numero: string;
  tipo_entrega: TipoEntrega;
  vestigio: ProtocoloVestigioResumo;
  lacre_na_entrega: string;
  descricao_material: string;
  ocorrencia: ProtocoloOcorrenciaResumo;
  procedimento: ProtocoloProcedimentoResumo | null;
  autoridade: ProtocoloAutoridadeResumo;
  unidade_demandante: ProtocoloUnidadeResumo;
  entregue_por_nome: string;
  entregue_por_cargo: string;
  entregue_por_cpf: string;
  entregue_em: string;
  entregue_por_obj: ProtocoloUsuarioResumo;
  recebido_por_nome: string;
  recebido_por_cargo: string;
  recebido_por_cpf: string;
  recebido_por_matricula: string;
  recebido_por_usuario_obj: ProtocoloUsuarioResumo | null;
  recebido_em: string | null;
  status_recebimento: StatusRecebimento;
  protocolo_hash: string;
  vestigio_foi_finalizado: boolean;
  observacoes: string;
  created_at: string;
}

export interface PaginatedProtocolos {
  count: number;
  next: string | null;
  previous: string | null;
  results: ProtocoloList[];
}

export interface ProtocoloFiltros {
  search?: string;
  vestigio?: number;
  ocorrencia?: number;
  status_recebimento?: StatusRecebimento;
  tipo_entrega?: TipoEntrega;
  entregue_por?: number;
  unidade_demandante?: number;
  data_de?: string;
  data_ate?: string;
  page?: number;
  page_size?: number;
}

export interface EmitirProtocoloPayload {
  vestigio_id: number;
  tipo_entrega: TipoEntrega;
  lacre_na_entrega?: string;
  descricao_material: string;
  ocorrencia_id: number;
  procedimento_id?: number | null;
  autoridade_id: number;
  unidade_demandante_id: number;
  recebido_por_nome: string;
  recebido_por_cargo: string;
  recebido_por_cpf?: string;
  recebido_por_matricula?: string;
  recebido_por_usuario_id?: number | null;
  observacoes?: string;
  // Assinatura — obrigatória se vestígio não for FINALIZADO
  assinatura_email?: string;
  assinatura_senha?: string;
  motivo_finalizacao?: string;
}

export interface EmitirProtocoloResponse {
  protocolo: ProtocoloDetalhe;
  vestigio_foi_finalizado: boolean;
  mensagem: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class ProtocoloService {
  private api = `${environment.apiUrl}/protocolos`;

  constructor(private http: HttpClient) {}

  getProtocolos(filtros: ProtocoloFiltros = {}): Observable<PaginatedProtocolos> {
    let params = new HttpParams();
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        params = params.set(k, String(v));
      }
    });
    return this.http.get<PaginatedProtocolos>(this.api + '/', { params });
  }

  getProtocolo(id: number): Observable<ProtocoloDetalhe> {
    return this.http.get<ProtocoloDetalhe>(`${this.api}/${id}/`);
  }

  emitirProtocolo(payload: EmitirProtocoloPayload): Observable<EmitirProtocoloResponse> {
    return this.http.post<EmitirProtocoloResponse>(this.api + '/', payload);
  }

  getProtocoloPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.api}/${id}/pdf/`, { responseType: 'blob' });
  }

  assinarProtocolo(id: number, assinaturaEmail: string, assinaturaSenha: string): Observable<ProtocoloDetalhe> {
    return this.http.post<ProtocoloDetalhe>(`${this.api}/${id}/assinar/`, {
      assinatura_email: assinaturaEmail,
      assinatura_senha: assinaturaSenha,
    });
  }

  confirmarManual(id: number): Observable<ProtocoloDetalhe> {
    return this.http.post<ProtocoloDetalhe>(`${this.api}/${id}/confirmar-manual/`, {});
  }

  // Busca ocorrências vinculadas a um vestígio (para o dropdown do formulário)
  getOcorrenciasDoVestigio(vestigioId: number): Observable<{ id: number; numero_ocorrencia: string }[]> {
    return this.http.get<any>(`${environment.apiUrl}/custodia/vestigios/${vestigioId}/`).pipe(
      map((v: any) => (v.ocorrencias_vinculadas || []).map((o: any) => ({
        id: o.id,
        numero_ocorrencia: o.numero_ocorrencia,
      })))
    );
  }
}
