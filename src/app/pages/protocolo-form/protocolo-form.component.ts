import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import Swal from 'sweetalert2';

import { ProtocoloService, TipoEntrega } from '../../services/protocolo.service';
import { AuthService } from '../../services/auth.service';
import { AutoridadeService } from '../../services/autoridade.service';
import { CargoService } from '../../services/cargo.service';
import { UnidadeDemandanteService } from '../../services/unidade-demandante.service';
import { ProcedimentoCadastradoService } from '../../services/procedimento-cadastrado.service';
import { CustodiaService, VestigioDetalhe } from '../../services/custodia.service';

@Component({
  selector: 'app-protocolo-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './protocolo-form.component.html',
  styleUrls: ['./protocolo-form.component.scss'],
})
export class ProtocoloFormComponent implements OnInit {

  // ── Dados do formulário ────────────────────────────────────────────────────
  vestigioId: number | null = null;
  vestigio: VestigioDetalhe | null = null;
  carregandoVestigio = false;
  buscaVestigio = '';

  ocorrenciaId: number | null = null;
  ocorrencias: { id: number; numero_ocorrencia: string }[] = [];

  procedimentoId: number | null = null;
  usarProcedimento = false;
  buscaProcedimento = '';
  procedimentosBusca: any[] = [];
  procedimentoSelecionado: any = null;

  tipoEntrega: TipoEntrega = 'MATERIAL';

  lacreEntrega = '';
  descricaoMaterial = '';

  // ── Autocomplete Híbrido: Autoridade ───────────────────────────────────────
  autoridadeId: number | null = null;
  buscaAutoridade = '';
  autoridadesBusca: any[] = [];
  autoridadeSelecionada: any = null;
  todasAutoridades: any[] = [];
  mostrarListaAutoridades = false;

  // ── Autocomplete Híbrido: Cargo ────────────────────────────────────────────
  cargoSelecionado: number | null = null;
  buscaCargo = '';
  cargosBusca: any[] = [];
  cargoSelecionadoObj: any = null;
  todasCargos: any[] = [];
  mostrarListaCargos = false;

  // ── Autocomplete Híbrido: Unidade Demandante ───────────────────────────────
  unidadeId: number | null = null;
  buscaUnidade = '';
  unidadesBusca: any[] = [];
  unidadeSelecionada: any = null;
  todasUnidades: any[] = [];
  mostrarListaUnidades = false;

  // ── Dados do Recebedor ─────────────────────────────────────────────────────
  recebidoPorNome = '';
  recebidoPorCargo = '';
  recebidoPorCpf = '';
  recebidoPorMatricula = '';

  observacoes = '';

  // ── Mantidos para retrocompatibilidade de tipos com o compilador do template ──
  cargos: any[] = [];
  autoridades: any[] = [];
  unidades: any[] = [];

  // ── Timers de Debounce para busca no Servidor ──────────────────────────────
  private timerUnidade: any;
  private timerCargo: any;
  private timerAutoridade: any;
  private timerProcedimento: any;

  // ── Estado ────────────────────────────────────────────────────────────────
  emitindo = false;
  buscandoCpf = false;
  userEmail = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private protocoloService: ProtocoloService,
    private custodiaService: CustodiaService,
    private authService: AuthService,
    private autoridadeService: AutoridadeService,
    private cargoService: CargoService,
    private unidadeService: UnidadeDemandanteService,
    private procedimentoService: ProcedimentoCadastradoService,
    private http: HttpClient,
  ) { }

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.userEmail = user?.email || '';

    // Carga inicial assíncrona das coleções para preenchimento de dropdowns
    this.carregarUnidadesIniciais();
    this.carregarCargosIniciais();

    // Pré-carregar vestígio se vier via queryParam
    const vestigioParam = this.route.snapshot.queryParamMap.get('vestigio');
    if (vestigioParam) {
      this.vestigioId = Number(vestigioParam);
      this.carregarVestigio(this.vestigioId);
    }
  }

  // ── Carga de Dados Inicial para Dropdown ───────────────────────────────────

  carregarUnidadesIniciais(): void {
    const params = { page_size: '100' };
    this.http.get<any>(`${environment.apiUrl}/unidades-demandantes/`, { params }).subscribe({
      next: (r: any) => {
        this.todasUnidades = r.results || r;
        this.unidadesBusca = [...this.todasUnidades];
      },
    });
  }

  carregarCargosIniciais(): void {
    const params = { page_size: '100' };
    this.http.get<any>(`${environment.apiUrl}/cargos/`, { params }).subscribe({
      next: (r: any) => {
        this.todasCargos = r.results || r;
        this.cargosBusca = [...this.todasCargos];
      },
    });
  }

  // ── Vestígio ────────────────────────────────────────────────────────────────

  buscarVestigio(): void {
    if (!this.buscaVestigio.trim()) return;
    this.carregandoVestigio = true;
    this.custodiaService.getVestigios({ search: this.buscaVestigio, page_size: 10 }).subscribe({
      next: (res) => {
        this.carregandoVestigio = false;
        if (res.results.length === 0) {
          Swal.fire('Não encontrado', 'Nenhum vestígio encontrado com esses dados.', 'warning');
          return;
        }
        if (res.results.length === 1) {
          this.selecionarVestigio(res.results[0].id);
          return;
        }
        // Múltiplos resultados — mostrar seleção
        const inputOptions: Record<string, string> = {};
        res.results.forEach(v => {
          inputOptions[String(v.id)] = `${v.lacre || '(sem lacre)'} — ${v.ocorrencia || ''}/${v.ano_ocorrencia || ''} — ${v.status}`;
        });
        Swal.fire({
          title: 'Selecione o vestígio',
          input: 'select',
          inputOptions,
          showCancelButton: true,
          confirmButtonText: 'Selecionar',
          cancelButtonText: 'Cancelar',
        }).then(result => {
          if (result.isConfirmed && result.value) {
            this.selecionarVestigio(Number(result.value));
          }
        });
      },
      error: () => { this.carregandoVestigio = false; },
    });
  }

  selecionarVestigio(id: number): void {
    this.vestigioId = id;
    this.carregarVestigio(id);
  }

  carregarVestigio(id: number): void {
    this.carregandoVestigio = true;
    this.custodiaService.getVestigio(id).subscribe({
      next: (v) => {
        this.vestigio = v;
        this.lacreEntrega = v.lacre || '';
        this.descricaoMaterial = v.descricao || '';

        // Pré-selecionar unidade do vestígio e montar o chip visual
        if (v.unidade_demandante) {
          this.unidadeId = v.unidade_demandante.id;
          this.unidadeSelecionada = v.unidade_demandante;
        }

        // Pré-selecionar autoridade e cargo vinculados (evita erro de tipo no TS)
        if (v.autoridade) {
          this.autoridadeId = v.autoridade.id;
          this.autoridadeSelecionada = v.autoridade;

          if (v.autoridade.cargo_nome) {
            this.cargoSelecionadoObj = { nome: v.autoridade.cargo_nome };
            this.cargoSelecionado = null;
          }
        }

        // Carregar ocorrências vinculadas ao vestígio
        this.ocorrencias = (v.ocorrencias_vinculadas || []).map((o: any) => ({
          id: o.id,
          numero_ocorrencia: o.numero_ocorrencia,
        }));
        if (this.ocorrencias.length === 1) {
          this.ocorrenciaId = this.ocorrencias[0].id;
        }
        this.carregandoVestigio = false;
      },
      error: () => {
        this.carregandoVestigio = false;
        Swal.fire('Erro', 'Vestígio não encontrado ou sem permissão de acesso.', 'error');
        this.vestigioId = null;
        this.vestigio = null;
      },
    });
  }

  limparVestigio(): void {
    this.vestigio = null;
    this.vestigioId = null;
    this.ocorrencias = [];
    this.ocorrenciaId = null;
    this.buscaVestigio = '';
    this.lacreEntrega = '';
    this.descricaoMaterial = '';
    this.limparUnidade();
    this.limparCargo();
  }

  // ── Procedimento (toggle + Debounce no Servidor) ───────────────────────────

  toggleProcedimento(): void {
    this.usarProcedimento = !this.usarProcedimento;
    if (!this.usarProcedimento) {
      this.procedimentoId = null;
      this.procedimentoSelecionado = null;
      this.buscaProcedimento = '';
    }
  }

  buscarProcedimento(): void {
    clearTimeout(this.timerProcedimento);
    if (this.buscaProcedimento.length < 2) {
      this.procedimentosBusca = [];
      return;
    }
    this.timerProcedimento = setTimeout(() => {
      this.procedimentoService.getAll(this.buscaProcedimento).subscribe({
        next: (r: any) => this.procedimentosBusca = r.results || r,
      });
    }, 300);
  }

  selecionarProcedimento(p: any): void {
    this.procedimentoSelecionado = p;
    this.procedimentoId = p.id;
    this.procedimentosBusca = [];
    this.buscaProcedimento = p.numero_completo || String(p.id);
  }

  // ── Métodos Híbridos: Cargo ────────────────────────────────────────────────

  focarCargo(): void {
    this.mostrarListaCargos = true;
    if (!this.buscaCargo.trim()) {
      this.cargosBusca = [...this.todasCargos];
    }
  }

  desfocarCargo(): void {
    setTimeout(() => {
      this.mostrarListaCargos = false;
    }, 200);
  }

  buscarCargo(): void {
    clearTimeout(this.timerCargo);
    const termo = this.buscaCargo.trim();
    if (!termo) {
      this.cargosBusca = [...this.todasCargos];
      return;
    }
    this.timerCargo = setTimeout(() => {
      const params = { search: termo, page_size: '100' };
      this.http.get<any>(`${environment.apiUrl}/cargos/`, { params }).subscribe({
        next: (r: any) => {
          this.cargosBusca = r.results || r;
        },
        error: () => {
          this.cargosBusca = this.todasCargos.filter(c =>
            c.nome.toLowerCase().includes(termo.toLowerCase())
          );
        }
      });
    }, 300);
  }

  selecionarCargo(c: any): void {
    this.cargoSelecionadoObj = c;
    this.cargoSelecionado = c.id;
    this.buscaCargo = c.nome;
    this.onCargoChange();
  }

  limparCargo(): void {
    this.cargoSelecionadoObj = null;
    this.cargoSelecionado = null;
    this.buscaCargo = '';
    this.limparAutoridade();
  }

  // ── Métodos Híbridos: Autoridade ───────────────────────────────────────────

  focarAutoridade(): void {
    this.mostrarListaAutoridades = true;
    if (!this.buscaAutoridade.trim()) {
      this.autoridadesBusca = [...this.todasAutoridades];
    }
  }

  desfocarAutoridade(): void {
    setTimeout(() => {
      this.mostrarListaAutoridades = false;
    }, 200);
  }

  buscarAutoridadeMetodo(): void {
    clearTimeout(this.timerAutoridade);
    const termo = this.buscaAutoridade.trim();
    if (!termo) {
      this.autoridadesBusca = [...this.todasAutoridades];
      return;
    }
    this.timerAutoridade = setTimeout(() => {
      this.autoridadeService.getAll(termo, this.cargoSelecionado || undefined).subscribe({
        next: (r: any) => {
          this.autoridadesBusca = r.results || r;
        },
        error: () => {
          this.autoridadesBusca = this.todasAutoridades.filter(a =>
            a.nome.toLowerCase().includes(termo.toLowerCase())
          );
        }
      });
    }, 300);
  }

  selecionarAutoridade(a: any): void {
    this.autoridadeSelecionada = a;
    this.autoridadeId = a.id;
    this.buscaAutoridade = a.nome;
  }

  limparAutoridade(): void {
    this.autoridadeSelecionada = null;
    this.autoridadeId = null;
    this.buscaAutoridade = '';
    this.todasAutoridades = [];
  }

  onCargoChange(): void {
    this.limparAutoridade();
    if (this.cargoSelecionado) {
      this.autoridadeService.getAll('', this.cargoSelecionado!).subscribe({
        next: (r: any) => {
          this.todasAutoridades = r.results || r;
          this.autoridadesBusca = [...this.todasAutoridades];
          if (this.todasAutoridades.length === 1) {
            this.selecionarAutoridade(this.todasAutoridades[0]);
          }
        },
      });
    }
  }

  // ── Métodos Híbridos: Unidade Demandante ───────────────────────────────────

  focarUnidade(): void {
    this.mostrarListaUnidades = true;
    if (!this.buscaUnidade.trim()) {
      this.unidadesBusca = [...this.todasUnidades];
    }
  }

  desfocarUnidade(): void {
    setTimeout(() => {
      this.mostrarListaUnidades = false;
    }, 200);
  }

  buscarUnidade(): void {
    clearTimeout(this.timerUnidade);
    const termo = this.buscaUnidade.trim();
    if (!termo) {
      this.unidadesBusca = [...this.todasUnidades];
      return;
    }
    this.timerUnidade = setTimeout(() => {
      const params = { search: termo, page_size: '100' };
      this.http.get<any>(`${environment.apiUrl}/unidades-demandantes/`, { params }).subscribe({
        next: (r: any) => {
          this.unidadesBusca = r.results || r;
        },
        error: () => {
          this.unidadesBusca = this.todasUnidades.filter(u =>
            u.nome.toLowerCase().includes(termo.toLowerCase()) ||
            u.sigla.toLowerCase().includes(termo.toLowerCase())
          );
        }
      });
    }, 300);
  }

  selecionarUnidade(u: any): void {
    this.unidadeSelecionada = u;
    this.unidadeId = u.id;
    this.buscaUnidade = `${u.sigla} — ${u.nome}`;
  }

  limparUnidade(): void {
    this.unidadeSelecionada = null;
    this.unidadeId = null;
    this.buscaUnidade = '';
  }

  // ── Validação inteligente de CPF do Recebedor (Com preservação de Cargo) ───

  verificarCpfRecebedor(): void {
    const cpfLimpo = this.recebidoPorCpf.replace(/\D/g, '');

    if (cpfLimpo.length === 11) {
      this.buscandoCpf = true;
      this.http.get<any>(`${environment.apiUrl}/usuarios/buscar-por-cpf/`, { params: { cpf: cpfLimpo } }).subscribe({
        next: (user) => {
          this.buscandoCpf = false;
          if (user) {
            this.recebidoPorNome = user.nome_completo;

            // Ajuste de UX: Se já houver um cargo digitado (ex: "Agente"), combina com o perfil de forma limpa [14]
            const perfilTexto = this.perfilLabel(user.perfil);
            const cargoAtual = this.recebidoPorCargo ? this.recebidoPorCargo.trim() : '';

            if (cargoAtual && cargoAtual !== perfilTexto) {
              this.recebidoPorCargo = `${perfilTexto} — ${cargoAtual}`; // Evita "Usuário ExternoAgente" [14]
            } else {
              this.recebidoPorCargo = perfilTexto;
            }

            this.recebidoPorMatricula = user.matricula || '';

            Swal.fire({
              icon: 'info',
              title: 'Usuário identificado!',
              text: `O CPF pertence ao usuário ${user.nome_completo}. Dados preenchidos automaticamente.`,
              timer: 3000,
              showConfirmButton: false
            });
          }
        },
        error: () => {
          this.buscandoCpf = false;
        }
      });
    }
  }

  perfilLabel(perfil: string): string {
    const map: Record<string, string> = {
      CUSTODIANTE: 'Custodiante', ADMINISTRATIVO: 'Administrativo',
      SUPER_ADMIN: 'Super Admin', PERITO: 'Perito Criminal',
      OPERACIONAL: 'Operacional', EXTERNO: 'Usuário Externo',
    };
    return map[perfil] || perfil;
  }

  // ── Validação do Formulário Completo ───────────────────────────────────────

  get formularioValido(): boolean {
    // descricaoMaterial NÃO entra na validação: é a descrição imutável do vestígio
    // (read-only, derivada no backend). Eventos vão em "Observações".
    return !!(
      this.vestigioId &&
      this.ocorrenciaId &&
      this.autoridadeId &&
      this.unidadeId &&
      this.recebidoPorNome.trim() &&
      this.recebidoPorCargo.trim() &&
      (!this.usarProcedimento || this.procedimentoId)
    );
  }

  // ── Emissão com confirmação SweetAlert ────────────────────────────────────

  async emitirProtocolo(): Promise<void> {
    if (!this.formularioValido || !this.vestigio) return;

    const jaFinalizado = this.vestigio.status === 'FINALIZADO';
    const motivo_default = 'Devolução de material via Protocolo de Saída';

    const aviso = jaFinalizado
      ? `<p style="color:#ca8a04;font-weight:600">⚠️ Conformidade</p>
         <p>O vestígio <strong>${this.vestigio.lacre || '#' + this.vestigio.id}</strong>
         já está <strong>FINALIZADO</strong>. O protocolo será emitido como documento
         de conformidade, sem nova finalização.</p>`
      : `<p style="color:#dc2626;font-weight:600">⚠️ Atenção — Finalização Automática</p>
         <p>Com a emissão deste protocolo, o vestígio
         <strong>${this.vestigio.lacre || '#' + this.vestigio.id}</strong>
         será <strong>FINALIZADO automaticamente</strong> e marcado como
         <strong>SAIU DA CUSTÓDIA</strong>.</p>
         <p style="font-size:.85rem;color:#6b7280">Esta ação não pode ser desfeita
         sem autorização de SUPER_ADMIN.</p>`;

    const camposAssinatura = jaFinalizado ? '' : `
      <div style="margin-top:1rem;text-align:left">
        <label style="font-size:.85rem;font-weight:600;display:block;margin-bottom:4px">
          Motivo da finalização
        </label>
        <textarea id="swal-motivo" class="swal2-textarea" style="height:64px;font-size:.85rem"
          placeholder="Devolução de material via Protocolo de Saída">${motivo_default}</textarea>
        <label style="font-size:.85rem;font-weight:600;display:block;margin:.6rem 0 4px">
          Seu e-mail (confirmação)
        </label>
        <input id="swal-email" class="swal2-input" value="${this.userEmail}"
          style="font-size:.85rem">
        <label style="font-size:.85rem;font-weight:600;display:block;margin:.6rem 0 4px">
          Sua senha
        </label>
        <input id="swal-senha" type="password" class="swal2-input" placeholder="••••••••"
          style="font-size:.85rem">
      </div>`;

    const result = await Swal.fire({
      title: 'Emitir Protocolo de Saída',
      html: aviso + camposAssinatura,
      showCancelButton: true,
      confirmButtonText: 'Emitir Protocolo',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0891b2',
      cancelButtonColor: '#64748b',
      width: 540,
      preConfirm: () => {
        if (jaFinalizado) return { motivo: null, email: null, senha: null };
        const motivo = (document.getElementById('swal-motivo') as HTMLTextAreaElement)?.value || motivo_default;
        const email = (document.getElementById('swal-email') as HTMLInputElement)?.value || '';
        const senha = (document.getElementById('swal-senha') as HTMLInputElement)?.value || '';
        if (!senha) {
          Swal.showValidationMessage('A senha é obrigatória para finalizar o vestígio.');
          return false;
        }
        return { motivo, email, senha };
      },
    });

    if (!result.isConfirmed) return;

    this.emitindo = true;

    const payload: any = {
      vestigio_id: this.vestigioId!,
      tipo_entrega: this.tipoEntrega,
      lacre_na_entrega: this.lacreEntrega,
      descricao_material: this.descricaoMaterial,
      ocorrencia_id: this.ocorrenciaId!,
      procedimento_id: this.usarProcedimento ? this.procedimentoId : null,
      autoridade_id: this.autoridadeId!,
      unidade_demandante_id: this.unidadeId!,
      recebido_por_nome: this.recebidoPorNome,
      recebido_por_cargo: this.recebidoPorCargo,
      recebido_por_cpf: this.recebidoPorCpf,
      recebido_por_matricula: this.recebidoPorMatricula,
      observacoes: this.observacoes,
    };

    if (!jaFinalizado && result.value) {
      payload.assinatura_email = result.value.email;
      payload.assinatura_senha = result.value.senha;
      payload.motivo_finalizacao = result.value.motivo;
    }

    this.protocoloService.emitirProtocolo(payload).subscribe({
      next: (res) => {
        this.emitindo = false;
        Swal.fire({
          icon: 'success',
          title: `Protocolo ${res.protocolo.numero} emitido!`,
          text: res.mensagem,
          confirmButtonText: 'Ver Protocolo',
          showCancelButton: true,
          cancelButtonText: 'Fechar',
        }).then(r => {
          if (r.isConfirmed) {
            this.router.navigate(['/gabinete-virtual/custodia/protocolos', res.protocolo.id]);
          } else {
            this.router.navigate(['/gabinete-virtual/custodia/protocolos']);
          }
        });
      },
      error: (err) => {
        this.emitindo = false;
        const msg = err.error?.detail || err.error?.assinatura_senha || err.error?.ocorrencia_id
          || JSON.stringify(err.error) || 'Erro ao emitir o protocolo.';
        Swal.fire('Erro', msg, 'error');
      },
    });
  }

  voltar(): void {
    this.router.navigate(['/gabinete-virtual/custodia/protocolos']);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  get statusBadgeClass(): string {
    switch (this.vestigio?.status) {
      case 'FINALIZADO': return 'badge-finalizado';
      case 'ANDAMENTO': return 'badge-andamento';
      default: return 'badge-inicial';
    }
  }

  get vestigioJaFinalizado(): boolean {
    return this.vestigio?.status === 'FINALIZADO';
  }
}
