import {
  Component, Input, Output, EventEmitter,
  OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef,
  inject, ChangeDetectorRef, NgZone,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CustodiaService } from '../../services/custodia.service';
import { ProcedimentoCadastradoService } from '../../services/procedimento-cadastrado.service';
import Swal from 'sweetalert2';

// Cytoscape é carregado como script global via angular.json
declare const cytoscape: any;

type Tipo = 'vestigio' | 'ocorrencia' | 'procedimento';

interface ProcSimples { id: number; label: string; }

interface GrafoNode {
  data: {
    id: string; tipo: string; label: string; focal?: boolean;
    // vestígio / contraprova
    status?: string; status_display?: string;
    unidade?: string; servico?: string; responsavel?: string; biologico?: boolean;
    procedimentos_diretos?: ProcSimples[];
    // ocorrência
    perito?: string;
    // procedimento
    tipo_nome?: string; numero?: string; ano?: number;
    // DNA
    nome?: string; cpf?: string; rg?: string;
    situacao?: string; situacao_display?: string;
    finalidade?: string; data_coleta?: string;
    // movimentação
    aceito?: boolean;
    criado_por?: string; destinatario?: string;
    data_envio?: string; data_aceite?: string | null; descricao?: string;
    // navegação
    url?: string;
  };
}

interface GrafoData {
  focal_id: string; focal_label: string; focal_tipo: Tipo;
  nodes: GrafoNode[]; edges: any[];
}

@Component({
  selector: 'app-teia-relacoes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './teia-relacoes.component.html',
  styleUrls: ['./teia-relacoes.component.scss'],
})
export class TeiaRelacoesComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() tipo!: Tipo;
  @Input() id!: number;
  @Output() fechar = new EventEmitter<void>();

  @ViewChild('cyContainer') cyContainer!: ElementRef;

  private cy: any;
  grafo: GrafoData | null = null;
  selectedNode: GrafoNode['data'] | null = null;
  isLoading = true;
  erro = '';

  readonly tipoLabel: Record<Tipo, string> = {
    vestigio: 'Vestígio',
    ocorrencia: 'Ocorrência',
    procedimento: 'Procedimento',
  };

  private doc  = inject(DOCUMENT);
  private host = inject(ElementRef);
  private cdr  = inject(ChangeDetectorRef);
  private zone = inject(NgZone);

  vinculandoProc  = false;
  mostrarCadeia   = false;   // toggle cadeia de custódia
  layoutAtual: 'cose' | 'breadthfirst' | 'concentric' = 'cose';

  constructor(
    private custodiaService: CustodiaService,
    private procService: ProcedimentoCadastradoService,
    private router: Router,
  ) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.doc.body.appendChild(this.host.nativeElement);
    this.carregarGrafo();
  }

  ngOnDestroy(): void {
    this.cy?.destroy();
    const el = this.host.nativeElement;
    if (el.parentNode === this.doc.body) this.doc.body.removeChild(el);
  }

  carregarGrafo(): void {
    this.isLoading = true;
    this.erro = '';
    this.custodiaService.getGrafo(this.tipo, this.id, {
      incluirMovimentacoes: this.mostrarCadeia,
    }).subscribe({
      next: (data: GrafoData) => {
        this.grafo    = data;
        this.isLoading = false;
        this.cdr.detectChanges();
        if (data.nodes.length > 1) {
          requestAnimationFrame(() => this.initCytoscape(data));
        }
      },
      error: () => {
        this.erro     = 'Não foi possível carregar a teia de relações.';
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private initCytoscape(data: GrafoData): void {
    this.cy?.destroy();

    // ── Criar container programático (sem interferência de CSS Angular) ──────
    const host   = this.host.nativeElement as HTMLElement;
    const wrap   = host.querySelector('.teia-graph-wrap') as HTMLElement;
    if (!wrap) { this.erro = 'Elemento .teia-graph-wrap não encontrado.'; this.cdr.detectChanges(); return; }

    // Remove container anterior se existir
    const old = host.querySelector('#cy-root');
    if (old) old.remove();

    const W = Math.round(window.innerWidth  * 0.96);
    const H = Math.round(window.innerHeight * 0.92) - 57;

    const container = document.createElement('div');
    container.id = 'cy-root';
    container.style.cssText = `width:${W}px;height:${H}px;position:relative;display:block;overflow:hidden;`;
    wrap.appendChild(container);

    // O #cyContainer Angular (position:absolute;inset:0;z-index:1) fica
    // em cima do #cy-root e bloqueia todos os cliques — esconde-o.
    const cyCanvas = this.cyContainer?.nativeElement as HTMLElement;
    if (cyCanvas) cyCanvas.style.display = 'none';

    try {
      this.cy = cytoscape({
      container,
      elements: { nodes: data.nodes, edges: data.edges },

      style: [
        {
          selector: 'node',
          style: {
            'label': 'data(label)',      // ESSENCIAL: define o texto exibido no nó
            'shape': 'round-rectangle',
            'width': 160,
            'height': 48,
            'font-family': '"Inter","Segoe UI",sans-serif',
            'font-size': '12px',
            'font-weight': 'bold',
            'color': '#ffffff',
            'text-valign': 'center',
            'text-halign': 'center',
            'text-wrap': 'wrap',
            'text-max-width': '150px',
            'border-width': 2,
          } as any,
        },
        {
          selector: 'node[tipo="vestigio"]',
          style: { 'background-color': '#6d28d9', 'border-color': '#a78bfa' } as any,
        },
        {
          selector: 'node[tipo="ocorrencia"]',
          style: { 'background-color': '#b45309', 'border-color': '#fbbf24' } as any,
        },
        {
          selector: 'node[tipo="procedimento"]',
          style: { 'background-color': '#1d4ed8', 'border-color': '#93c5fd' } as any,
        },
        {
          selector: 'node[tipo="contraprova"]',
          style: { 'background-color': '#c2410c', 'border-color': '#fb923c', 'shape': 'diamond' } as any,
        },
        {
          selector: 'node[?focal]',
          style: {
            'border-color': '#fbbf24',
            'border-width': 4,
            'width': 180,
            'height': 54,
            'font-size': '13px',
          } as any,
        },
        {
          selector: 'node:selected',
          style: { 'overlay-color': '#ffffff', 'overlay-opacity': 0.1, 'overlay-padding': '6px' } as any,
        },
        {
          selector: 'node.hover',
          style: { 'overlay-color': '#ffffff', 'overlay-opacity': 0.06, 'overlay-padding': '4px' } as any,
        },
        {
          selector: 'edge',
          style: {
            'curve-style': 'bezier',
            'width': 2,
            'line-color': '#64748b',
            'target-arrow-color': '#64748b',
            'target-arrow-shape': 'triangle',
            'opacity': 0.9,
          } as any,
        },
        {
          selector: 'edge[tipo="contraprova"]',
          style: { 'line-style': 'dashed', 'line-color': '#fb923c', 'target-arrow-color': '#fb923c' } as any,
        },
        {
          selector: 'edge[tipo="proc_ocorrencia"]',
          style: { 'line-color': '#60a5fa', 'target-arrow-color': '#60a5fa' } as any,
        },
        {
          selector: 'edge[tipo="oc_vestigio"]',
          style: { 'line-color': '#c084fc', 'target-arrow-color': '#c084fc' } as any,
        },
        // ── DNA ───────────────────────────────────────────────────────────
        {
          selector: 'node[tipo="dna"]',
          style: { 'background-color': '#be185d', 'border-color': '#f472b6' } as any,
        },
        // ── Movimentação aceita ───────────────────────────────────────────
        {
          selector: 'node[tipo="movimentacao_aceita"]',
          style: {
            'background-color': '#15803d',
            'border-color': '#4ade80',
            'shape': 'ellipse',
            'width': 140,
            'height': 44,
          } as any,
        },
        // ── Movimentação pendente ─────────────────────────────────────────
        {
          selector: 'node[tipo="movimentacao_pendente"]',
          style: {
            'background-color': '#b45309',
            'border-color': '#fbbf24',
            'shape': 'ellipse',
            'width': 140,
            'height': 44,
          } as any,
        },
        // ── Aresta cadeia de custódia ─────────────────────────────────────
        {
          selector: 'edge[tipo="movimentacao"]',
          style: {
            'line-style': 'solid',
            'line-color': '#4ade80',
            'target-arrow-color': '#4ade80',
            'width': 2,
          } as any,
        },
        // ── Aresta vestígio → DNA ─────────────────────────────────────────
        {
          selector: 'edge[tipo="vestigio_dna"]',
          style: {
            'line-style': 'dashed',
            'line-color': '#f472b6',
            'target-arrow-color': '#f472b6',
            'width': 1.5,
          } as any,
        },
        {
          selector: 'node.dimmed, edge.dimmed',
          style: { 'opacity': 0.2 } as any,
        },
      ],

      layout: {
        name: 'cose',
        animate: false,        // síncrono — nós já estão posicionados ao chamar fit()
        randomize: true,
        componentSpacing: 100,
        nodeRepulsion:     () => 12000,
        idealEdgeLength:   () => 150,
        edgeElasticity:    () => 100,
        gravity: 1,
        numIter: 1000,
        padding: 60,
      } as any,

      wheelSensitivity: 0.3,
      minZoom: 0.15,
      maxZoom: 4,
    });

    // Fit imediato
    this.cy.resize();
    this.cy.fit(this.cy.elements(), 80);

    } catch (err: any) {
      this.erro = `Erro ao inicializar grafo: ${err?.message ?? err}`;
      this.cdr.detectChanges();
      return;
    }

    // Interações — todos os callbacks entram no NgZone para disparar change detection
    this.cy.on('mouseover', 'node', (e: any) => {
      e.target.addClass('hover');
      container.style.cursor = 'pointer';
    });

    this.cy.on('mouseout', 'node', (e: any) => {
      e.target.removeClass('hover');
      container.style.cursor = 'default';
    });

    // Clique simples → abre painel lateral com detalhes
    this.cy.on('tap', 'node', (e: any) => {
      this.zone.run(() => {
        this.selectedNode = e.target.data();
        this._destacar(e.target);
      });
    });

    // Duplo clique → navega diretamente para o registro
    this.cy.on('dbltap', 'node', (e: any) => {
      this.zone.run(() => {
        this.selectedNode = e.target.data();
        this.navegarParaNo();
      });
    });

    // Clique no fundo → fecha painel e remove destaque
    this.cy.on('tap', (e: any) => {
      if (e.target === this.cy) {
        this.zone.run(() => {
          this.selectedNode = null;
          this.cy.elements().removeClass('dimmed');
        });
      }
    });
  }

  private _destacar(node: any): void {
    this.cy.elements().addClass('dimmed');
    node.closedNeighborhood().removeClass('dimmed');
  }

  zoomIn():    void { this.cy?.zoom({ level: this.cy.zoom() * 1.25, renderedPosition: this._mid() }); }
  zoomOut():   void { this.cy?.zoom({ level: this.cy.zoom() * 0.8,  renderedPosition: this._mid() }); }
  fitGraph():  void { this.cy?.fit(this.cy.elements(), 60); }
  centerFocal(): void {
    if (!this.grafo) return;
    const focal = this.cy?.$(`#${this.grafo.focal_id}`);
    if (focal?.length) this.cy.animate({ center: { eles: focal }, zoom: 1.5 }, { duration: 350 });
  }

  private _mid() {
    return {
      x: (this.cyContainer?.nativeElement.offsetWidth  ?? 800) / 2,
      y: (this.cyContainer?.nativeElement.offsetHeight ?? 600) / 2,
    };
  }

  // ── Toggle cadeia de custódia ────────────────────────────────────────────────

  toggleCadeia(): void {
    this.mostrarCadeia = !this.mostrarCadeia;
    this.selectedNode  = null;
    this.carregarGrafo();
  }

  // ── Seletor de layout ─────────────────────────────────────────────────────────

  mudarLayout(nome: 'cose' | 'breadthfirst' | 'concentric'): void {
    this.layoutAtual = nome;
    if (!this.cy) return;
    const cfg: Record<string, any> = {
      cose:         { name: 'cose',        animate: true,  animationDuration: 500, randomize: false, nodeRepulsion: () => 12000, idealEdgeLength: () => 150, padding: 60 },
      breadthfirst: { name: 'breadthfirst', animate: true,  animationDuration: 500, directed: true,  spacingFactor: 1.4, padding: 60 },
      concentric:   { name: 'concentric',   animate: true,  animationDuration: 500, levelWidth: () => 2, minNodeSpacing: 60, padding: 60 },
    };
    this.cy.layout(cfg[nome]).run();
  }

  // ── Exportar PNG ──────────────────────────────────────────────────────────────

  exportarPng(): void {
    if (!this.cy) return;
    const png64 = this.cy.png({ scale: 2, full: true, bg: '#0d1117' });
    const a = document.createElement('a');
    a.href     = png64;
    a.download = `teia-${this.tipo}-${this.id}-${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
  }

  // ── Vincular procedimento a vestígio diretamente pelo grafo ─────────────────

  abrirVincularProcedimento(): void {
    if (!this.selectedNode) return;
    const vestigioId = Number(this.selectedNode.id.replace('vest_', ''));

    Swal.fire({
      title: 'Vincular Procedimento',
      html: `
        <p style="font-size:.88rem;color:#64748b;margin-bottom:.8rem">
          Digite número ou sigla para buscar (ex: IP 001, BO 123)
        </p>
        <input id="swal-proc-search" class="swal2-input" placeholder="Buscar procedimento..."
               style="font-size:.9rem">
        <div id="swal-proc-results" style="margin-top:.5rem;max-height:200px;overflow-y:auto;text-align:left"></div>
      `,
      showConfirmButton: false,
      showCancelButton: true,
      cancelButtonText: 'Fechar',
      width: '480px',
      didOpen: () => {
        const input = document.getElementById('swal-proc-search') as HTMLInputElement;
        const results = document.getElementById('swal-proc-results')!;

        let timer: any;
        input.addEventListener('input', () => {
          clearTimeout(timer);
          timer = setTimeout(() => {
            const q = input.value.trim();
            if (!q) { results.innerHTML = ''; return; }
            results.innerHTML = '<p style="color:#64748b;font-size:.82rem;padding:.4rem">Buscando…</p>';

            this.procService.getAll(q).subscribe({
              next: (resp: any) => {
                const items: any[] = resp.results ?? resp;
                if (!items.length) {
                  results.innerHTML = '<p style="color:#64748b;font-size:.82rem;padding:.4rem">Nenhum resultado.</p>';
                  return;
                }
                results.innerHTML = items.slice(0, 8).map(p => `
                  <div data-id="${p.id}" style="
                    padding:.45rem .75rem;cursor:pointer;border-radius:6px;
                    font-size:.85rem;color:#1e293b;margin:.2rem 0;
                    border:1px solid #e2e8f0;background:#f8fafc;
                    transition:background .15s;">
                    <strong>${p.tipo ?? p.tipo_procedimento?.sigla ?? ''} ${p.numero}/${p.ano}</strong>
                  </div>
                `).join('');

                results.querySelectorAll('[data-id]').forEach(el => {
                  (el as HTMLElement).addEventListener('click', () => {
                    const procId = Number((el as HTMLElement).dataset['id']);
                    Swal.close();
                    this._executarVinculoProc(vestigioId, procId, 'add');
                  });
                  (el as HTMLElement).addEventListener('mouseenter', () =>
                    ((el as HTMLElement).style.background = '#e0f2fe'));
                  (el as HTMLElement).addEventListener('mouseleave', () =>
                    ((el as HTMLElement).style.background = '#f8fafc'));
                });
              },
              error: () => { results.innerHTML = '<p style="color:#ef4444;font-size:.82rem;padding:.4rem">Erro na busca.</p>'; }
            });
          }, 350);
        });
        setTimeout(() => input.focus(), 100);
      },
    });
  }

  desvincularProcedimento(procId: number, procLabel: string): void {
    if (!this.selectedNode) return;
    const vestigioId = Number(this.selectedNode.id.replace('vest_', ''));

    Swal.fire({
      title: 'Desvincular procedimento?',
      html: `Remover o vínculo direto com <strong>${procLabel}</strong> deste vestígio?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, desvincular',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#7f1d1d',
    }).then(r => {
      if (r.isConfirmed) this._executarVinculoProc(vestigioId, procId, 'remove');
    });
  }

  private _executarVinculoProc(vestigioId: number, procId: number, acao: 'add' | 'remove'): void {
    this.vinculandoProc = true;
    this.cdr.detectChanges();
    this.custodiaService.vincularProcedimentoAoVestigio(vestigioId, procId, acao).subscribe({
      next: (resp) => {
        this.vinculandoProc = false;
        // Atualiza a lista de procedimentos no nó selecionado
        if (this.selectedNode) {
          this.selectedNode = { ...this.selectedNode, procedimentos_diretos: resp.procedimentos };
        }
        this.cdr.detectChanges();
        // Recarrega o grafo para refletir a nova aresta
        if (this.grafo) this.carregarGrafo();
        Swal.fire({
          toast: true, position: 'top-end', icon: 'success',
          title: resp.message, timer: 2500, showConfirmButton: false,
        });
      },
      error: (err) => {
        this.vinculandoProc = false;
        this.cdr.detectChanges();
        Swal.fire('Erro', err?.error?.detail || 'Erro ao alterar vínculo.', 'error');
      },
    });
  }

  navegarParaNo(): void {
    if (!this.selectedNode?.url) return;
    const [tipo, idStr] = this.selectedNode.url.split(':');
    const rotas: Record<string, string> = {
      vestigio:     `/gabinete-virtual/custodia/vestigios/${idStr}`,
      ocorrencia:   `/gabinete-virtual/operacional/ocorrencias/${idStr}`,
      procedimento: `/gabinete-virtual/cadastros/procedimentos-cadastrados/${idStr}`,
      dna:          `/gabinete-virtual/custodia/dna/${idStr}`,
      movimentacao: `/gabinete-virtual/custodia/movimentacoes/${idStr}`,
    };
    if (rotas[tipo]) { this.fechar.emit(); this.router.navigate([rotas[tipo]]); }
  }

  get tituloFocal(): string {
    if (!this.grafo) return '';
    return `${this.tipoLabel[this.grafo.focal_tipo]}: ${this.grafo.focal_label}`;
  }

  iconePorTipo(tipo: string): string {
    return ({
      vestigio:              'bi-shield-lock-fill',
      contraprova:           'bi-arrow-repeat',
      ocorrencia:            'bi-file-earmark-text-fill',
      procedimento:          'bi-folder2-open',
      dna:                   'bi-dna',
      movimentacao_aceita:   'bi-check-circle-fill',
      movimentacao_pendente: 'bi-arrow-right-circle',
    })[tipo] ?? 'bi-circle-fill';
  }

  corPorTipo(tipo: string): string {
    return ({
      vestigio:              '#a78bfa',
      contraprova:           '#fb923c',
      ocorrencia:            '#fbbf24',
      procedimento:          '#60a5fa',
      dna:                   '#f472b6',
      movimentacao_aceita:   '#4ade80',
      movimentacao_pendente: '#fbbf24',
    })[tipo] ?? '#94a3b8';
  }

  statusBadgeClass(s?: string): string {
    return ({
      INICIAL: 'badge-vest-inicial', ANDAMENTO: 'badge-vest-andamento', FINALIZADO: 'badge-vest-finalizado',
      AGUARDANDO_PERITO: 'badge-oc-aguardando', EM_ANALISE: 'badge-oc-analise',
      LAUDO_ENTREGUE: 'badge-oc-laudo', FINALIZADA: 'badge-oc-finalizada',
    })[s ?? ''] ?? '';
  }

  get totalNos():     number { return this.grafo?.nodes.length ?? 0; }
  get totalArestas(): number { return this.grafo?.edges.length ?? 0; }
}
