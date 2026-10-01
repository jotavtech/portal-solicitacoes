# ADR-001 - Stack, sessões e escopo do MVP

Data: 01/10/2026. Estado: adotado e implementado localmente; revisões exigem atualização de docs e testes. Bibliotecas concretas em ADR-002. Relacionado: DEC-001 a DEC-008.

## Contexto

Prazo curto até 05/10, aplicação full stack para avaliação júnior, SQL obrigatório, API e documentação de decisões. Familiaridade do candidato com a stack ainda não informada. Nenhuma tecnologia é obrigatória no PDF.

## Decisão inicial

TypeScript na aplicação, React/Vite no frontend, Express no backend, SQLite como banco SQL. Sessões persistidas em SQLite e cookie HttpOnly com CSRF, sem token de acesso no armazenamento JavaScript. Vitest para regras/componentes, Supertest para HTTP/SQLite, Playwright para E2E.

## Alternativas consideradas

| Alternativa | Benefício | Motivo de não adotar inicialmente |
| --- | --- | --- |
| Django/DRF ou Laravel | Convenções e autenticação maduras | Introduz outra linguagem; pode ser melhor se o candidato já dominar esse ecossistema. |
| PostgreSQL | Concorrência e operação de servidor | Acrescenta configuração/serviço; SQLite reduz preparação local para o escopo proposto. |
| JWT no navegador | Integração com múltiplos consumidores | Não necessário para aplicação mesma origem; revogação/logout e armazenamento exigem outras decisões. |
| Framework full stack único | Pode simplificar entrega | API e frontend separados deixam as responsabilidades explícitas para a avaliação; reconsiderar se familiaridade justificar. |

## Consequências

Uma linguagem no produto e instalação local sem serviço de banco externo. É preciso implementar sessão/validações com atenção, habilitar foreign keys e manter um volume persistente em deploy. Bibliotecas e versões foram conferidas no bootstrap e fixadas no package.json e lockfile; veja ADR-002.

As decisões de propriedade, visibilidade, fluxo de status e dashboard são premissas do produto, não propriedades das ferramentas. SQLite não elimina testes de integração. A documentação deve distinguir o que foi proposto do que foi efetivamente implementado.
