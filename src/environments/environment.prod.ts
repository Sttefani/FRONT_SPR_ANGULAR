// src/environments/environment.prod.ts
// Este arquivo é usado durante o BUILD DE PRODUÇÃO (ng build --configuration=production)

export const environment = {
  // Indica que está em produção
  production: true,

  // 🚨 IMPORTANTE: Substitua pela URL REAL da sua API em produção
  // Por exemplo: 'https://api.spr-roraima.gov.br/api'
  apiUrl: 'https://SUA-URL-DE-PRODUCAO.com.br/api',

  // URL base para autenticação (sem /api no final)
  authUrl: 'https://SUA-URL-DE-PRODUCAO.com.br',

  // Informações do app
  appName: 'SPR - Sistema Pericial Roraima',
  version: '1.0.0',

  // Desabilita logs de debug em produção (por segurança)
  enableDebug: false,

  // Configurações padrão
  defaultPageSize: 10,

  // Tempo para renovar token (120 minutos)
  tokenRefreshInterval: 120 * 60 * 1000
};
