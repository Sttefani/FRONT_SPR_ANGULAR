import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
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
import { ClassificacaoOcorrenciaService } from '../../services/classificacao-ocorrencia.service';

@Component({
  selector: 'app-ocorrencias-calendario',
  standalone: true,
  // ✅ O FormsModule ESTÁ AQUI? Se não estiver, a tela fica branca!
  imports: [CommonModule, FullCalendarModule, RouterModule, FormsModule],
  templateUrl: './ocorrencias-calendario.component.html',
  styleUrls: ['./ocorrencias-calendario.component.scss']
})
export class OcorrenciasCalendarioComponent implements OnInit, OnDestroy {

  // Referência ao calendário para podermos mudar a data via código
  @ViewChild('calendar') calendarComponent!: FullCalendarComponent;

  // =========================================================
  // PERSISTÊNCIA DE ESTADO VIA sessionStorage
  // Lê o estado salvo UMA VEZ na inicialização dos campos.
  // A ordem de declaração importa: SESSION_KEY → _saved → campos → calendarOptions.
  // =========================================================
  private readonly SESSION_KEY = 'spr_filtros_calendario';
  private readonly _saved = this.readSession();

  // Mês/Ano exibido (Formato YYYY-MM) — restaurado da sessão ou mês atual
  dataSelecionada: string = this._saved.dataSelecionada;

  // =========================================================
  // FILTROS DO CALENDÁRIO — restaurados da sessão
  // =========================================================
  classificacaoFiltro: number | null = this._saved.classificacaoFiltro;
  statusFiltro: string = this._saved.statusFiltro;
  classificacoes: any[] = [];

  constructor(
    private ocorrenciaService: OcorrenciaService,
    private classificacaoService: ClassificacaoOcorrenciaService,
    private router: Router
  ) { }

  ngOnInit(): void {
    // Carrega todas as classificações para o dropdown de filtro
    this.classificacaoService.getAll().subscribe({
      next: (data: any) => {
        this.classificacoes = Array.isArray(data) ? data : (data.results || []);
      },
      error: (err: any) => { console.error('Erro ao carregar classificações:', err); }
    });
  }

  ngOnDestroy(): void {
    // Salva o estado atual antes de destruir o componente (navegação de saída)
    this.salvarFiltrosSession();
  }

  calendarOptions: CalendarOptions = {
    initialView: 'listMonth',

    // ← Ponto de entrada restaurado da sessão.
    // Evita o double-fetch: o FullCalendar já abre no mês correto sem
    // precisar chamar gotoDate() depois (que causaria dois fetches).
    initialDate: this.dataSelecionada + '-01',

    plugins: [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin],
    locale: ptBrLocale,

    // Configuração da barra de topo
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'listMonth,dayGridMonth,dayGridWeek'
    },
    buttonText: {
      today: 'Hoje',
      month: 'Mês (grade)',
      week: 'Semana',
      list: 'Lista do Mês'
    },

    // Texto exibido quando não há ocorrências na visualização em lista
    noEventsText: 'Nenhuma ocorrência encontrada neste período.',

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
      // e persiste imediatamente para capturar a navegação de mês
      const dataAtual = new Date(info.startStr);
      dataAtual.setDate(dataAtual.getDate() + 15);
      this.dataSelecionada = dataAtual.toISOString().slice(0, 7);
      this.salvarFiltrosSession();

      // Monta filtros ativos no momento do fetch (lidos do estado do componente)
      const filtros: { [key: string]: any } = {};
      if (this.classificacaoFiltro) filtros['classificacao'] = this.classificacaoFiltro;
      if (this.statusFiltro)        filtros['status']        = this.statusFiltro;

      this.ocorrenciaService.getOcorrenciasCalendario(start, end, filtros)
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
      // Sinaliza para os componentes de detalhe/edição que o retorno deve ser o calendário
      sessionStorage.setItem('spr_return_url', '/gabinete-virtual/operacional/ocorrencias/calendario');
      this.router.navigate(['/gabinete-virtual/operacional/ocorrencias', id]);
    },

    // Tooltip ao passar o mouse
    eventMouseEnter: (info) => {
      const status = this.formatarStatus(info.event.extendedProps['status']);
      info.el.title = `${info.event.title}\nStatus: ${status}`;
    }
  };

  // =========================================================
  // Aplica os filtros forçando o calendário a re-buscar os eventos.
  // refetchEvents() chama a função events() acima com o range atual,
  // que por sua vez lê this.classificacaoFiltro e this.statusFiltro.
  // =========================================================
  aplicarFiltros(): void {
    this.salvarFiltrosSession();
    if (this.calendarComponent) {
      this.calendarComponent.getApi().refetchEvents();
    }
  }

  limparFiltrosCalendario(): void {
    this.classificacaoFiltro = null;
    this.statusFiltro = '';
    this.salvarFiltrosSession();
    if (this.calendarComponent) {
      this.calendarComponent.getApi().refetchEvents();
    }
  }

  // Função chamada quando o usuário muda a data no input
  irParaDataEscolhida(): void {
    if (this.dataSelecionada && this.calendarComponent) {
      const calendarApi = this.calendarComponent.getApi();
      // Adiciona '-01' para formar uma data completa (YYYY-MM-01)
      calendarApi.gotoDate(this.dataSelecionada + '-01');
    }
  }

  // =========================================================
  // PERSISTÊNCIA VIA sessionStorage
  // =========================================================
  private readSession(): { dataSelecionada: string; classificacaoFiltro: number | null; statusFiltro: string } {
    try {
      const saved = sessionStorage.getItem(this.SESSION_KEY);
      if (saved) {
        const estado = JSON.parse(saved);
        return {
          dataSelecionada:    estado.dataSelecionada    || new Date().toISOString().slice(0, 7),
          classificacaoFiltro: estado.classificacaoFiltro || null,
          statusFiltro:        estado.statusFiltro        || ''
        };
      }
    } catch (_) { /* JSON inválido: ignora e usa defaults */ }
    return {
      dataSelecionada: new Date().toISOString().slice(0, 7),
      classificacaoFiltro: null,
      statusFiltro: ''
    };
  }

  private salvarFiltrosSession(): void {
    sessionStorage.setItem(this.SESSION_KEY, JSON.stringify({
      dataSelecionada:     this.dataSelecionada,
      classificacaoFiltro: this.classificacaoFiltro,
      statusFiltro:        this.statusFiltro
    }));
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
