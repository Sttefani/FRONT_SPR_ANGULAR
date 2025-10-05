// src/app/interfaces/relatorios.interface.ts

export interface RelatorioGrupoPrincipal {
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

// Interface para os dados de uma cidade, com chaves dinâmicas
export interface RelatorioCidadeDados {
  cidade__nome: string;
  total: number;
  [key: string]: any; // Permite chaves dinâmicas como 'total_crimes_contra_a_vida'
}

// Interface para o relatório completo por cidade
export interface RelatorioCidade {
  grupos_cabecalho: string[]; // Nomes dos grupos para o cabeçalho da tabela
  dados: RelatorioCidadeDados[];
}

// A interface principal que agrupa todos os relatórios
export interface RelatoriosGerenciais {
  por_grupo_principal: RelatorioGrupoPrincipal[];
  por_classificacao_especifica: RelatorioClassificacaoEspecifica[];
  producao_por_perito: RelatorioPerito[];
  ocorrencias_por_cidade: RelatorioCidade;
}
