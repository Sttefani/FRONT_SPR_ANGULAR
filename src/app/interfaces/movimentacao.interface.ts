export interface Usuario {
  id: number;
  nome_completo: string;
  email: string;
}

export interface Movimentacao {
  id: number;
  ocorrencia: number;
  assunto: string;
  descricao: string;
  ip_registro?: string;
  created_at: string;
  updated_at: string;
  created_by?: Usuario;
  updated_by?: Usuario;
  deleted_at?: string | null;
}

export interface CriarMovimentacao {
  assunto: string;
  descricao: string;
  username: string;  // Email de confirmação (assinatura)
  password: string;  // Senha de confirmação (assinatura)
}
