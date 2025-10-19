import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CamposLaudoTHC {
  sucesso: boolean;
  campos_obrigatorios: string[];
  campos_com_validacao: { [key: string]: string[] };
  campos_automaticos: string[];
  campos_agrupados: {
    identificacao: string[];
    requisicao: string[];
    material: string[];
    resultado: string[];
    finalizacao: string[];
  };
  exemplo_dados: any;
}

export interface LaudoGerado {
  sucesso: boolean;
  laudo_id: number;
  laudo_texto: string;
  resultado: string;
  mensagem: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
  total_pages?: number;
  current_page?: number;
}

export interface LaudoListaItem {
  id: number;
  template_nome: string;
  resultado: string;
  gerado_por_nome: string;
  gerado_em: string;
}

@Injectable({
  providedIn: 'root'
})
export class LaudoService {
  private apiUrlCompleta = `${environment.apiUrl}/ia`;

  constructor(private http: HttpClient) {}

  obterCamposLaudoTHC(): Observable<CamposLaudoTHC> {
    return this.http.get<CamposLaudoTHC>(`${this.apiUrlCompleta}/laudo/thc/campos/`);
  }

  gerarLaudoTHC(dados: any): Observable<LaudoGerado> {
    return this.http.post<LaudoGerado>(`${this.apiUrlCompleta}/laudo/thc/gerar/`, dados);
  }

  baixarLaudoPDF(laudoId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrlCompleta}/laudo/${laudoId}/pdf/`, {
      responseType: 'blob',
    });
  }

  obterLaudo(laudoId: number): Observable<any> {
    return this.http.get(`${this.apiUrlCompleta}/laudo/${laudoId}/`);
  }

  /**
   * Lista todos os laudos gerados (paginado)
   */
  listarLaudos(page: number = 1): Observable<PaginatedResponse<LaudoListaItem>> {
    const params = new HttpParams().set('page', page.toString());
    return this.http.get<PaginatedResponse<LaudoListaItem>>(
      `${this.apiUrlCompleta}/laudos/listar/`,
      { params }
    );
  }

  /**
   * ✅ NOVO: Lista apenas os laudos do usuário logado (paginado)
   */
  listarMeusLaudos(pagina: number = 1): Observable<PaginatedResponse<LaudoListaItem>> {
    const params = new HttpParams().set('page', pagina.toString());
    return this.http.get<PaginatedResponse<LaudoListaItem>>(
      `${this.apiUrlCompleta}/laudos/listar/meus/`,
      { params }
    );
  }
}
