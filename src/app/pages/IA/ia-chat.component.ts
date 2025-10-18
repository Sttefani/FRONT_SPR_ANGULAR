import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IaService } from '../../services/ia.service';
import Swal from 'sweetalert2';

interface Mensagem {
  tipo: 'user' | 'ia';
  conteudo: string;
  timestamp: Date;
}

@Component({
  selector: 'app-ia-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ia-chat.component.html',
  styleUrls: ['./ia-chat.component.scss']
})
export class IaChatComponent implements OnInit {
  mensagens: Mensagem[] = [];
  mensagemAtual: string = '';
  sessionKey: string | null = null;
  tipoLaudo: string = 'GERAL';
  carregando: boolean = false;
  chatIniciado: boolean = false;
  laudoGerado: boolean = false;

  tiposLaudo = ['GERAL', 'THC', 'DNA', 'BALÍSTICA', 'LOCAL DE CRIME'];

  constructor(private iaService: IaService) {}

  ngOnInit(): void {}

  iniciarChat(): void {
    this.carregando = true;

    this.iaService.iniciarChat(this.tipoLaudo).subscribe({
      next: (response) => {
        this.sessionKey = response.session_key;
        this.chatIniciado = true;

        this.mensagens.push({
          tipo: 'ia',
          conteudo: response.mensagem,
          timestamp: new Date()
        });

        this.carregando = false;
      },
      error: (err: any) => {
        console.error('Erro ao iniciar chat:', err);

        Swal.fire({
          title: 'Erro!',
          text: err.error?.erro || 'Erro ao iniciar chat com a IA.',
          icon: 'error',
          confirmButtonText: 'Ok'
        });

        this.carregando = false;
      }
    });
  }

  enviarMensagem(): void {
    if (!this.mensagemAtual.trim() || !this.sessionKey) return;

    const mensagemUser = this.mensagemAtual;

    this.mensagens.push({
      tipo: 'user',
      conteudo: mensagemUser,
      timestamp: new Date()
    });

    this.mensagemAtual = '';
    this.carregando = true;

    this.iaService.enviarMensagem(this.sessionKey, mensagemUser).subscribe({
      next: (response) => {
        this.mensagens.push({
          tipo: 'ia',
          conteudo: response.resposta,
          timestamp: new Date()
        });
        this.carregando = false;
        this.scrollToBottom();
      },
      error: (err: any) => {
        console.error('Erro ao enviar mensagem:', err);

        Swal.fire({
          title: 'Erro!',
          text: 'Erro ao enviar mensagem para a IA.',
          icon: 'error',
          confirmButtonText: 'Ok'
        });

        this.carregando = false;
      }
    });
  }

  gerarLaudoFinal(): void {
    if (!this.sessionKey) return;

    this.carregando = true;

    this.iaService.gerarLaudo(this.sessionKey).subscribe({
      next: (response) => {
        this.mensagens.push({
          tipo: 'ia',
          conteudo: '📄 **LAUDO GERADO COM SUCESSO!**\n\n' + response.laudo,
          timestamp: new Date()
        });
        this.laudoGerado = true;
        this.carregando = false;
        this.scrollToBottom();

        Swal.fire({
          title: 'Sucesso!',
          text: 'Laudo gerado com sucesso! Agora você pode baixar o PDF.',
          icon: 'success',
          confirmButtonText: 'Ok'
        });
      },
      error: (err: any) => {
        console.error('Erro ao gerar laudo:', err);

        Swal.fire({
          title: 'Erro!',
          text: err.error?.erro || 'Erro ao gerar laudo.',
          icon: 'error',
          confirmButtonText: 'Ok'
        });

        this.carregando = false;
      }
    });
  }

  baixarPdf(): void {
    if (!this.sessionKey) return;

    this.carregando = true;

    this.iaService.baixarPdf(this.sessionKey).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `laudo_${this.sessionKey}.pdf`;
        link.click();

        window.URL.revokeObjectURL(url);
        this.carregando = false;

        Swal.fire({
          title: 'Sucesso!',
          text: 'PDF baixado com sucesso!',
          icon: 'success',
          confirmButtonText: 'Ok'
        });
      },
      error: (err: any) => {
        console.error('Erro ao baixar PDF:', err);

        Swal.fire({
          title: 'Erro!',
          text: 'Erro ao baixar o PDF do laudo.',
          icon: 'error',
          confirmButtonText: 'Ok'
        });

        this.carregando = false;
      }
    });
  }

  reiniciarChat(): void {
    Swal.fire({
      title: 'Novo Chat?',
      text: 'Deseja iniciar uma nova conversa? O histórico atual será perdido.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, novo chat',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.mensagens = [];
        this.sessionKey = null;
        this.chatIniciado = false;
        this.laudoGerado = false;
        this.mensagemAtual = '';
      }
    });
  }

  scrollToBottom(): void {
    setTimeout(() => {
      const chatContainer = document.querySelector('.chat-mensagens');
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 100);
  }

  onEnter(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.enviarMensagem();
    }
  }
}
