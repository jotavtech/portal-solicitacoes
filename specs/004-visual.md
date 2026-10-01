# SPEC-004 - Identidade visual sóbria

Origem: solicitação do usuário em 01/10/2026, com referência ao seu projeto Truckfighters e preferência por sobriedade, adaptada a um portal de uso geral. Requisitos relacionados: NFR-004, RF-001 e RF-003 a RF-009.

Referência inspecionada: projeto local `2026-09-12/https-www-truckfighters-com-https-www/outputs/truckfighters`, especialmente app/globals.css, layout.tsx e page.tsx. A referência estética não altera regras de negócio, API, autenticação ou SQL.

## Direção adotada

- Fundo branco quente, texto preto e cinza, linhas visíveis e cantos quase retos; cor pontual nas ações e estados.
- Tipografia Arial/Helvetica, títulos fortes com escala moderada; sem tipografia de show, imagens de banda, texturas ou efeitos decorativos.
- Marca tipográfica e navegação horizontal compacta. Identificação do usuário e saída continuam disponíveis em desktop e mobile.
- Indicadores em faixa com separadores, sem ícones ornamentais ou descrições repetidas. Escopo global explícito.
- Listagem como área de trabalho: filtros com labels, tabela com maior legibilidade e linhas de separação; cartões de registros em mobile.
- Filtros com controles de altura uniforme e rótulos alinhados em cada linha. Na grade intermediária de duas linhas, três colunas iguais e botão ocupando a largura da coluna; mobile mantém duas colunas e busca/botão na largura completa.
- Login, criação, edição, detalhe e confirmação usam o mesmo sistema de cores, bordas e espaçamento.
- Texto objetivo: login com título "Acessar o portal", instruções úteis nos formulários, sem slogans de produtividade ou indicador de disponibilidade sem monitoramento real.

## Aceite

Conferir capturas reais de login, lista e detalhe em 1440 px e 360 px. Nenhum overflow da página, contraste legível, foco visível e todas as ações existentes acessíveis. Executar testes de componentes e jornadas E2E existentes; atualizar localizadores somente onde texto de interface foi deliberadamente alterado. Não criar testes que apenas espelhem classes CSS. Manter comportamento de filtros, dashboard, permissões e sessão.
