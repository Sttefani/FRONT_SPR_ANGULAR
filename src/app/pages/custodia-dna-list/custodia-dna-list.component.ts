import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

import { CustodiaService, DNA, DNAFiltros } from '../../services/custodia.service';
import { AuthService } from '../../services/auth.service';
import { PaginadorComponent } from '../../components/paginador/paginador.component';

@Component({
  selector: 'app-custodia-dna-list',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginadorComponent],
  templateUrl: './custodia-dna-list.component.html',
  styleUrls: ['./custodia-dna-list.component.scss']
})
export class CustodiaDnaListComponent implements OnInit {

  dnas: DNA[] = [];
  isLoading = true;
  message = '';
  messageType: 'success' | 'error' = 'success';

  // Paginação
  totalCount = 0;
  currentPage = 1;
  pageSize = 10;
  nextUrl: string | null = null;
  previousUrl: string | null = null;

  // Filtros
  filtroNome = '';
  filtroCpf = '';
  filtroSituacao = '';
  filtroFinalidade = '';
  filtroUf = '';
  filtroDataDe = '';
  filtroDataAte = '';

  // Perfil
  isExterno = false;
  podeEditar = false;

  gerandoCertidao = false;
  gerandoRelatorio = false;

  readonly UFS = [
    'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
    'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
  ];

  constructor(
    private custodiaService: CustodiaService,
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.isExterno  = user?.perfil === 'EXTERNO';
    // EXTERNO não pode editar (regra do SPR-Custódia)
    this.podeEditar = !this.isExterno;
    this.buscarDnas();
  }

  get filtros(): DNAFiltros {
    const f: DNAFiltros = { page: this.currentPage, page_size: this.pageSize };
    if (this.filtroNome)       f.nome = this.filtroNome;
    if (this.filtroCpf)        f.cpf  = this.filtroCpf;
    if (this.filtroSituacao)   f.situacao = this.filtroSituacao;
    if (this.filtroFinalidade) f.finalidade_coleta = this.filtroFinalidade;
    if (this.filtroUf)         f.uf = this.filtroUf;
    if (this.filtroDataDe)     f.data_de  = this.filtroDataDe;
    if (this.filtroDataAte)    f.data_ate = this.filtroDataAte;
    // EXTERNO: filtra automaticamente no backend pela unidade; aqui apenas flag
    return f;
  }

  buscarDnas(resetPage = true): void {
    if (resetPage) this.currentPage = 1;
    this.isLoading = true;
    this.custodiaService.getDnasPaginado(this.filtros).subscribe({
      next: (res) => {
        this.dnas = res.results;
        this.totalCount = res.count;
        this.nextUrl = res.next;
        this.previousUrl = res.previous;
        this.isLoading = false;
      },
      error: () => {
        this.message = 'Erro ao carregar registros de DNA.';
        this.messageType = 'error';
        this.isLoading = false;
      }
    });
  }

  carregarPorUrl(url: string): void {
    this.isLoading = true;
    this.custodiaService.getDnasByUrl(url).subscribe({
      next: (res) => {
        this.dnas = res.results;
        this.totalCount = res.count;
        this.nextUrl = res.next;
        this.previousUrl = res.previous;
        this.isLoading = false;
      }
    });
  }

  limparFiltros(): void {
    this.filtroNome = '';
    this.filtroCpf = '';
    this.filtroSituacao = '';
    this.filtroFinalidade = '';
    this.filtroUf = '';
    this.filtroDataDe = '';
    this.filtroDataAte = '';
    this.buscarDnas();
  }

  mudarPagina(novaPagina: number): void {
    this.currentPage = novaPagina;
    this.buscarDnas(false);
  }

  get totalPages(): number {
    return Math.ceil(this.totalCount / this.pageSize);
  }

  novoDna(): void {
    this.router.navigate(['/gabinete-virtual/custodia/dna/novo']);
  }

  verDna(id: number): void {
    this.router.navigate(['/gabinete-virtual/custodia/dna', id]);
  }

  editarDna(id: number): void {
    this.router.navigate(['/gabinete-virtual/custodia/dna', id, 'editar']);
  }

  irParaVestigio(vestigioId: number | null): void {
    if (vestigioId) this.router.navigate(['/gabinete-virtual/custodia/vestigios', vestigioId]);
  }

  badgeSituacao(s: string): string {
    return s === 'APENADO' ? 'badge-apenado' : 'badge-nao-apenado';
  }

  badgeFinalidade(f: string): string {
    return f === 'LEI' ? 'badge-lei' : 'badge-dj';
  }

  // ── Relatório em lote PDF ───────────────────────────────────────────────

  gerarRelatorio(): void {
    this.gerandoRelatorio = true;
    const { page, page_size, ...filtrosSemPag } = this.filtros as any;
    this.custodiaService.getRelatorioPdfDnas(filtrosSemPag).subscribe({
      next: (blob) => {
        this.gerandoRelatorio = false;
        const url = URL.createObjectURL(blob);
        const aba = window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
        if (!aba) {
          const a = document.createElement('a');
          a.href = url; a.download = 'relatorio_dnas.pdf'; a.click();
        }
      },
      error: () => {
        this.gerandoRelatorio = false;
        Swal.fire('Erro', 'Não foi possível gerar o relatório.', 'error');
      }
    });
  }

  // ── Certidão / Comprovante de Ausência ──────────────────────────────────

  abrirCertidaoAusencia(): void {
    const labelDoc = this.isExterno ? 'Comprovante de Consulta' : 'Certidão de Ausência';
    const descDoc  = this.isExterno
      ? 'O sistema emitirá um <strong>Comprovante de Consulta</strong> confirmando que nenhum registro foi localizado para os dados informados.'
      : 'O sistema emitirá uma <strong>Certidão de Ausência</strong> assinada eletronicamente, apta para instruir processos judiciais e administrativos.';

    Swal.fire({
      title: `📄 ${labelDoc}`,
      html: `
        <p style="text-align:left;font-size:.88rem;color:#555;margin-bottom:1rem">
          Informe os dados da pessoa a ser consultada no banco de perfis genéticos.
          Ao menos um campo é obrigatório.
        </p>
        <div style="text-align:left;font-size:.88rem">
          <div style="margin-bottom:.75rem">
            <label style="display:block;font-weight:600;margin-bottom:.25rem">Nome</label>
            <input id="cert-nome" type="text" class="swal2-input" style="margin:0;width:100%;font-size:.9rem"
                   placeholder="Nome completo...">
          </div>
          <div style="margin-bottom:.75rem">
            <label style="display:block;font-weight:600;margin-bottom:.25rem">CPF</label>
            <input id="cert-cpf" type="text" class="swal2-input" style="margin:0;width:100%;font-size:.9rem"
                   placeholder="000.000.000-00">
          </div>
          <div style="margin-bottom:1rem">
            <label style="display:block;font-weight:600;margin-bottom:.25rem">RG</label>
            <input id="cert-rg" type="text" class="swal2-input" style="margin:0;width:100%;font-size:.9rem"
                   placeholder="Número do RG...">
          </div>
          <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;padding:.75rem;font-size:.82rem;color:#0369a1">
            <strong>ℹ️ O que acontece:</strong><br>
            ${descDoc}
            <br><br>
            Se o registro <em>for encontrado</em>, você será redirecionado ao cadastro existente.
          </div>
        </div>
      `,
      width: '520px',
      showCancelButton: true,
      confirmButtonText: `Gerar ${labelDoc}`,
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#854d0e',
      showLoaderOnConfirm: true,
      allowOutsideClick: () => !Swal.isLoading(),
      preConfirm: () => {
        const nome = (document.getElementById('cert-nome') as HTMLInputElement)?.value?.trim() ?? '';
        const cpf  = (document.getElementById('cert-cpf')  as HTMLInputElement)?.value?.trim() ?? '';
        const rg   = (document.getElementById('cert-rg')   as HTMLInputElement)?.value?.trim() ?? '';
        if (!nome && !cpf && !rg) {
          Swal.showValidationMessage('Informe ao menos Nome, CPF ou RG para realizar a consulta.');
          return false;
        }
        return { nome, cpf, rg };
      },
    }).then(result => {
      if (result.isConfirmed && result.value) {
        this._gerarCertidao(result.value.nome, result.value.cpf, result.value.rg);
      }
    });
  }

  private _gerarCertidao(nome: string, cpf: string, rg: string): void {
    this.gerandoCertidao = true;
    this.custodiaService.getCertidaoAusenciaDna({ nome, cpf, rg }).subscribe({
      next: (blob) => {
        this.gerandoCertidao = false;
        const blobUrl = URL.createObjectURL(blob);
        const aba = window.open(blobUrl, '_blank');
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
        if (!aba) {
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = `certidao_ausencia_dna.pdf`;
          link.click();
        }
      },
      error: (err) => {
        this.gerandoCertidao = false;
        // A API retorna Blob mesmo em erro — precisa ler como texto para extrair o JSON
        const reader = new FileReader();
        reader.onload = () => {
          let detalhe = 'Não foi possível gerar o documento.';
          let dnaId: number | null = null;
          let dnaNome = '';
          try {
            const json = JSON.parse(reader.result as string);
            detalhe  = json.detail ?? detalhe;
            dnaId    = json.dna_id   ?? null;
            dnaNome  = json.dna_nome ?? '';
          } catch { /* mantém mensagem padrão */ }

          if (err.status === 409 && dnaId) {
            Swal.fire({
              title: 'Registro Encontrado',
              html: `
                <p style="font-size:.9rem">
                  O(a) <strong>${dnaNome || 'indivíduo'}</strong> já possui cadastro de perfil
                  genético no sistema.<br><br>
                  Não é possível emitir certidão de ausência para quem já está registrado.
                </p>
              `,
              icon: 'info',
              showCancelButton: true,
              confirmButtonText: 'Ver cadastro existente',
              cancelButtonText: 'Fechar',
              confirmButtonColor: '#1d4ed8',
            }).then(r => {
              if (r.isConfirmed) {
                this.router.navigate(['/gabinete-virtual/custodia/dna', dnaId]);
              }
            });
          } else {
            Swal.fire('Erro', detalhe, 'error');
          }
        };
        reader.readAsText(err.error instanceof Blob ? err.error : new Blob([JSON.stringify(err.error)]));
      }
    });
  }
}
