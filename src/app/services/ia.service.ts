import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';  // ← IMPORTA ENVIRONMENT

@Injectable({
  providedIn: 'root'
})
export class IaService {
  private apiUrl = `${environment.authUrl}/api/ia`;  // ← USA ENVIRONMENT

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  iniciarChat(tipoLaudo: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/chat/iniciar/`,
      { tipo_laudo: tipoLaudo },
      { headers: this.getHeaders() }
    );
  }

  enviarMensagem(sessionKey: string, mensagem: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/chat/mensagem/`,
      { session_key: sessionKey, mensagem: mensagem },
      { headers: this.getHeaders() }
    );
  }

  gerarLaudo(sessionKey: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/gerar/`,
      { session_key: sessionKey },
      { headers: this.getHeaders() }
    );
  }

  baixarPdf(sessionKey: string): Observable<Blob> {
    return this.http.post(
      `${this.apiUrl}/baixar-pdf/`,
      { session_key: sessionKey },
      {
        headers: this.getHeaders(),
        responseType: 'blob'
      }
    );
  }
}
