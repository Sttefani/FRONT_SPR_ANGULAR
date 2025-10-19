import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LaudoService, CamposLaudoTHC, LaudoGerado } from '../../services/laudo.service';

interface StringMap {
  [key: string]: string;
}

@Component({
  selector: 'app-gerar-laudo-thc',
  templateUrl: './gerar-laudo-thc.component.html',
  styleUrls: ['./gerar-laudo-thc.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
})
export class GerarLaudoThcComponent implements OnInit {
  laudoForm!: FormGroup;
  campos?: CamposLaudoTHC;
  carregando = false;
  laudoGerado: string | null = null;
  laudoId: number | null = null;
  erro: string | null = null;

  // ✅ NOVO: Detectar modo edição
  modoEdicao = false;
  laudoParaEditar: any = null;

  constructor(
    private fb: FormBuilder,
    private laudoService: LaudoService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    // ✅ Verifica se tem ID na URL
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.modoEdicao = true;
      this.laudoId = Number(id);
      this.carregarLaudoParaEdicao();
    } else {
      this.carregarCampos();
    }
  }

  // ✅ NOVO: Carregar laudo para edição
  carregarLaudoParaEdicao(): void {
    this.carregando = true;

    this.laudoService.obterLaudo(this.laudoId!).subscribe({
      next: (response) => {
        if (response.sucesso) {
          this.laudoParaEditar = response.laudo;
          this.carregarCampos();
        } else {
          this.erro = 'Laudo não encontrado';
          this.carregando = false;
        }
      },
      error: (err) => {
        console.error('Erro ao carregar laudo:', err);
        this.erro = 'Erro ao carregar laudo para edição';
        this.carregando = false;
      }
    });
  }

  carregarCampos(): void {
    this.carregando = true;
    this.laudoService.obterCamposLaudoTHC().subscribe({
      next: (data: CamposLaudoTHC) => {
        this.campos = data;
        this.criarFormulario();

        // ✅ Se for edição, preenche o formulário
        if (this.modoEdicao && this.laudoParaEditar) {
          this.preencherFormularioComDados(this.laudoParaEditar.dados_preenchimento);
        }

        this.carregando = false;
      },
      error: (err: any) => {
        console.error('Erro ao carregar campos:', err);
        this.erro = 'Erro ao carregar campos do laudo';
        this.carregando = false;
      },
    });
  }

  criarFormulario(): void {
    if (!this.campos) return;
    const formControls: any = {};
    this.campos.campos_obrigatorios.forEach((campo: string) => {
      if (!this.campos!.campos_automaticos.includes(campo)) {
        formControls[campo] = ['', Validators.required];
      }
    });
    this.laudoForm = this.fb.group(formControls);
  }

  // ✅ NOVO: Preencher formulário com dados existentes
  preencherFormularioComDados(dados: any): void {
    if (dados && this.laudoForm) {
      this.laudoForm.patchValue(dados);
    }
  }

  preencherExemplo(): void {
    if (this.campos?.exemplo_dados) {
      this.laudoForm.patchValue(this.campos.exemplo_dados);
    }
  }

  limparFormulario(): void {
    this.laudoForm.reset();
    this.laudoGerado = null;
    this.erro = null;
  }

  // ✅ MODIFICADO: Detectar se é criar ou atualizar
  gerarLaudo(): void {
    if (this.laudoForm.invalid) {
      this.laudoForm.markAllAsTouched();
      this.erro = 'Por favor, preencha todos os campos obrigatórios';
      return;
    }

    this.carregando = true;
    this.erro = null;
    const dados = this.laudoForm.value;

    if (this.modoEdicao && this.laudoId) {
      // ✅ MODO EDIÇÃO: Atualizar laudo existente
      alert('🚧 Atualização de laudos ainda não implementada no backend!');
      this.carregando = false;
      // TODO: Criar endpoint de update no backend
    } else {
      // ✅ MODO CRIAÇÃO: Criar novo laudo
      this.laudoService.gerarLaudoTHC(dados).subscribe({
        next: (response: LaudoGerado) => {
          this.laudoGerado = response.laudo_texto;
          this.laudoId = response.laudo_id;
          this.carregando = false;
          setTimeout(() => {
            document.getElementById('laudo-resultado')?.scrollIntoView({
              behavior: 'smooth',
            });
          }, 100);
        },
        error: (err: any) => {
          console.error('Erro ao gerar laudo:', err);
          this.erro = err.error?.mensagem || err.error?.erro || 'Erro desconhecido ao gerar laudo';
          this.carregando = false;
        },
      });
    }
  }

  copiarLaudo(): void {
    if (this.laudoGerado) {
      navigator.clipboard.writeText(this.laudoGerado).then(() => {
        alert('Laudo copiado para área de transferência!');
      });
    }
  }

  baixarPDF(): void {
    if (!this.laudoId) {
      this.erro = 'Gere um laudo primeiro antes de baixar o PDF.';
      return;
    }

    this.carregando = true;
    this.erro = null;

    this.laudoService.baixarLaudoPDF(this.laudoId).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `laudo_${this.laudoId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        this.carregando = false;
      },
      error: (err: any) => {
        console.error('Erro ao baixar o PDF:', err);
        this.erro = 'Não foi possível baixar o PDF.';
        this.carregando = false;
      }
    });
  }

  getCamposGrupo(grupo: string): string[] {
    return (
      this.campos?.campos_agrupados[
        grupo as keyof typeof this.campos.campos_agrupados
      ] || []
    );
  }

  getNomeCampo(campo: string): string {
    const nomes: StringMap = {
      numero_laudo: 'Número do Laudo',
      servico_pericial: 'Serviço Pericial',
      nome_diretor: 'Nome do Diretor',
      nome_perito: 'Nome do Perito',
      matricula_perito: 'Matrícula do Perito',
      tipo_autoridade: 'Tipo da Autoridade',
      nome_autoridade: 'Nome da Autoridade',
      numero_requisicao: 'Número da Requisição',
      data_requisicao: 'Data da Requisição',
      tipo_procedimento: 'Tipo de Procedimento',
      numero_procedimento: 'Número do Procedimento',
      descricao_material: 'Descrição do Material',
      massa_bruta_total: 'Massa Bruta Total',
      lacres_entrada: 'Lacres de Entrada',
      resultado: 'Resultado',
      peso_consumido: 'Peso Consumido',
      peso_contraprova: 'Peso Contraprova',
      lacres_contraprova: 'Lacres Contraprova',
      massa_liquida_final: 'Massa Líquida Final',
      lacres_saida: 'Lacres de Saída',
      nome_perito_assinatura: 'Nome para Assinatura',
    };
    return nomes[campo] || campo.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  getPlaceholder(campo: string): string {
    const placeholders: StringMap = {
      numero_laudo: 'Ex: 167',
      servico_pericial: 'Ex: DPE/IC/PC/SESP/RR',
      data_requisicao: 'DD/MM/AAAA',
      massa_bruta_total: 'Ex: 2,30g (dois gramas e trinta centigramas)',
      lacres_entrada: 'Ex: 123456',
    };
    return placeholders[campo] || '';
  }

  getOpcoesValidacao(campo: string): string[] | null {
    return this.campos?.campos_com_validacao[campo] || null;
  }
}
