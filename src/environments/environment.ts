// src/environments/environment.ts
// Este arquivo é usado durante o DESENVOLVIMENTO (ng serve)

export const environment = {
  // Indica se está em produção ou não
  production: false,

  // URL da API Django em desenvolvimento (localhost)
  apiUrl: 'http://localhost:8000/api',

  // URL base para autenticação (sem /api no final)
  authUrl: 'http://localhost:8000',

  // Informações do app
  appName: 'SPR - Sistema Pericial Roraima',
  version: '1.0.0',

  // Habilita logs de debug no console
  enableDebug: true,

  // Configurações padrão
  defaultPageSize: 10,

  // Tempo para renovar token (50 minutos em milissegundos)
  tokenRefreshInterval: 50 * 60 * 1000
};
