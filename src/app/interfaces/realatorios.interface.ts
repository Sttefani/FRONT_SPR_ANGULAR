// src/app/interfaces/relatorios.interface.ts

export interface RelatorioGrupoPrincipal {
  grupo_codigo: string;
  grupo_nome: string;
  total: number;
}

export interface RelatorioClassificacaoEspecifica {
  classificacao__codigo: string;
  classificacao__nome: string;
  total: number;
}

export interface RelatorioPerito {
  nome_completo: string;
  total_ocorrencias: number;
  finalizadas: number;
  em_analise: number;
}

// --- INÍCIO DA NOVA INTERFACE ---
export interface RelatorioServico {
  servico_pericial__sigla: string;
  servico_pericial__nome: string;
  total: number;
  finalizadas: number;
  em_analise: number;
}
// --- FIM DA NOVA INTERFACE ---

// A interface principal que agrupa todos os relatórios
export interface RelatoriosGerenciais {
  por_grupo_principal: RelatorioGrupoPrincipal[];
  por_classificacao_especifica: RelatorioClassificacaoEspecifica[];
  producao_por_perito: RelatorioPerito[];
  por_servico: RelatorioServico[]; // <-- ADICIONA A NOVA PROPRIEDADE
}
