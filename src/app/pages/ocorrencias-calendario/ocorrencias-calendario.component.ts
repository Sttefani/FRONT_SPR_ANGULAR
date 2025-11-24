import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
// ✅ Importando Módulos do FullCalendar
import { FullCalendarModule, FullCalendarComponent } from '@fullcalendar/angular';
import { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
// ✅ Importando FormsModule para o input de data funcionar
import { FormsModule } from '@angular/forms';
import { OcorrenciaService } from '../../services/ocorrencia.service';

@Component({
  selector: 'app-ocorrencias-calendario',
  standalone: true,
  // ✅ O FormsModule ESTÁ AQUI? Se não estiver, a tela fica branca!
  imports: [CommonModule, FullCalendarModule, RouterModule, FormsModule],
  templateUrl: './ocorrencias-calendario.component.html',
  styleUrls: ['./ocorrencias-calendario.component.scss']
})
export class OcorrenciasCalendarioComponent {

  // Referência ao calendário para podermos mudar a data via código
  @ViewChild('calendar') calendarComponent!: FullCalendarComponent;

  // Variável que guarda o Mês/Ano selecionado no input (Formato YYYY-MM)
  dataSelecionada: string = new Date().toISOString().slice(0, 7);

  constructor(
    private ocorrenciaService: OcorrenciaService,
    private router: Router
  ) { }

  calendarOptions: CalendarOptions = {
    initialView: 'dayGridMonth',
    plugins: [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin],
    locale: ptBrLocale,

    // Configuração da barra de topo
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,listWeek'
    },
    buttonText: {
      today: 'Hoje',
      month: 'Mês',
      week: 'Semana',
      list: 'Lista'
    },

    // Altura dinâmica para criar barra de rolagem se precisar
    height: '75vh',
    navLinks: true,
    dayMaxEvents: true,

    // =========================================================
    // LÓGICA DE BUSCA DE DADOS
    // =========================================================
    events: (info, successCallback, failureCallback) => {
      const start = info.startStr.split('T')[0];
      const end = info.endStr.split('T')[0];

      // Atualiza o input de data automaticamente quando o usuário navega
      // Ex: Se ele clicou na setinha para "Dezembro", o input muda para Dezembro
      const dataAtual = new Date(info.startStr);
      // Ajuste simples para pegar o mês central da visualização
      dataAtual.setDate(dataAtual.getDate() + 15);
      this.dataSelecionada = dataAtual.toISOString().slice(0, 7);

      this.ocorrenciaService.getOcorrenciasCalendario(start, end)
        .subscribe({
          next: (events) => {
            const eventsFormatted = events.map(event => ({
              ...event,
              id: String(event.id) // Garante que ID é string
            }));
            successCallback(eventsFormatted);
          },
          error: (err) => {
            console.error('Erro ao carregar ocorrências:', err);
            failureCallback(err);
          }
        });
    },

    // Navegação ao clicar no evento
    eventClick: (info) => {
      const id = info.event.id;
      this.router.navigate(['/gabinete-virtual/operacional/ocorrencias', id]);
    },

    // Tooltip ao passar o mouse
    eventMouseEnter: (info) => {
      const status = this.formatarStatus(info.event.extendedProps['status']);
      info.el.title = `${info.event.title}\nStatus: ${status}`;
    }
  };

  // Função chamada quando o usuário muda a data no input
  irParaDataEscolhida(): void {
    if (this.dataSelecionada && this.calendarComponent) {
      const calendarApi = this.calendarComponent.getApi();
      // Adiciona '-01' para formar uma data completa (YYYY-MM-01)
      calendarApi.gotoDate(this.dataSelecionada + '-01');
    }
  }

  private formatarStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      'AGUARDANDO_PERITO': 'Aguardando Perito',
      'EM_ANALISE': 'Em Análise',
      'FINALIZADA': 'Finalizada'
    };
    return statusMap[status] || status;
  }
}
