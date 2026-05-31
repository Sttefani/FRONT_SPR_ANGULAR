# CLAUDE.md — SPR-Criminalística / Plano de Implementação

## Contexto geral
Sistema Django + Angular. O Django fornece a API (DRF) e o Angular
monta todas as telas. Estamos incorporando um sistema legado Java.

## Tarefa
Adicionar dois novos perfis de usuário sem modificar nada
dos perfis e dashboards já existentes e funcionais.

## Perfis existentes (NÃO TOCAR)
- perito
- operacional
- administrativo
Dashboards desses três perfis estão no Angular e funcionam.
Não modificar nenhum componente, rota ou endpoint existente.

## Perfis novos a implementar

### externo
- Acesso: módulos DNA e Custódia
- Escopo: SOMENTE dados da própria unidade (unidade_demandante)
- Ações permitidas: SOMENTE leitura/consulta — sem criar,
  editar, movimentar ou transferir
- Campo de vínculo no banco: unidade_demandante (já existe)

### custodiante
- Acesso: módulos DNA e Custódia
- Escopo: GLOBAL — todas as unidades
- Ações permitidas: leitura + operações completas
  (receber, transferir entre unidades, dar baixa)

## Regras de negócio inegociáveis

### Segurança (OWASP A01 — crítico)
O filtro de unidade do perfil "externo" DEVE ser imposto
no backend Django em toda query, usando sempre:
  unidade_demandante = request.user.unidade_demandante
NUNCA confiar em parâmetro vindo do frontend.
O Angular não filtra dados — ele só exibe o que o backend retorna.

### Arquitetura (Open/Closed)
- Adicionar, NUNCA modificar.
- Cada novo dashboard = componente e rota Angular independentes,
  com lazy loading.
- Cada novo perfil = endpoint de agregação próprio no Django/DRF,
  com permissão verificada no servidor.
- Guards de rota no Angular por perfil, resolvendo o perfil
  de forma assíncrona via observable.

## Estrutura de dashboards novos

### Dashboard externo
- Componente Angular novo, rota isolada, lazy-loaded
- Exibe: itens de custódia ativos da sua unidade,
  amostras DNA em processamento da sua unidade,
  movimentações recentes da sua unidade,
  alertas de prazo da sua unidade
- Endpoint backend: filtra sempre por unidade_demandante
  do usuário autenticado
- SEM visão comparativa entre unidades

### Dashboard custodiante
- Componente Angular novo, rota isolada, lazy-loaded
- Exibe: visão global de todas as unidades,
  itens de custódia por unidade (agregado),
  transferências pendentes entre unidades,
  alertas globais
- Endpoint backend: sem filtro de unidade (escopo global)
- COM visão comparativa entre unidades

## Fluxo de cadastro (manter o atual)
Usuário se cadastra → administrador recebe e atribui perfil
(perito / operacional / administrativo / externo / custodiante)

## Restrição de processo
NÃO fazer deploy automaticamente.
Quem revisa, aprova e publica é o usuário.
Sistema tem impacto probatório — cadeia de custódia forense.
