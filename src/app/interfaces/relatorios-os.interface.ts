export interface RelatoriosOrdemServico {
  resumo_geral: {
    total_emitidas: number;
    aguardando_ciencia: number;
    abertas: number;
    em_andamento: number;
    vencidas: number;
    concluidas: number;
  };

  producao_por_perito: {
    perito: string;
    total_emitidas: number;
    concluidas: number;
    cumpridas_no_prazo: number;
    cumpridas_com_atraso: number;
    em_andamento: number;
    vencidas: number;
    aguardando_ciencia: number;
    taxa_cumprimento_prazo: number;
  }[];

  por_unidade_demandante: {
    unidade_demandante__nome: string;
    total: number;
    concluidas: number;
    em_andamento: number;
    vencidas: number;
  }[];

  por_servico_pericial: {
    ocorrencia__servico_pericial__sigla: string;
    ocorrencia__servico_pericial__nome: string;
    total: number;
    concluidas: number;
    em_andamento: number;
    vencidas: number;
  }[];

  reiteracoes: {
    total_originais: number;
    total_reiteracoes: number;
    primeira_reiteracao: number;
    segunda_reiteracao: number;
    terceira_ou_mais: number;
  };

  taxa_cumprimento: {
    total_concluidas: number;
    cumpridas_no_prazo: number;
    cumpridas_com_atraso: number;
    percentual_no_prazo: number;
    percentual_com_atraso: number;
  };

  prazos: {
    tempo_medio_conclusao_dias: number;
    prazo_medio_concedido: number;
  };

  evolucao_temporal: {
    mes: string;
    total: number;
    concluidas: number;
  }[];
}
