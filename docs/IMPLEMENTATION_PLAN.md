# Plano de implementação spec driven

Planejamento em 01/10/2026; prazo do PDF 05/10/2026. Datas são metas, não promessa de conclusão. Revisar premissas ao informar familiaridade do candidato ou surgirem limites do ambiente.

## Processo por fatia

Especificação -> cenários -> teste que falha -> implementação mínima -> testes passando -> documentação/evidência. Regras novas atualizam os documentos primeiro. Revisar DEC-001/002/006 sem bloquear bootstrap caso permaneçam as premissas iniciais.

| Fase | Data alvo | Entrega | Verificação para avançar | Estado |
| --- | --- | --- | --- | --- |
| P0 | 01/10 | PRD, AGENTS, specs, contrato, SQL, planos e testes preparatórios | consistência e constraints conferidas | Criado; resultado em VERIFICATION.md |
| P1 | 01/10 | monorepo Node, lockfile, TS estrito, scripts, migrations e seed opt-in | instalação limpa, migration repetida segura, seed idempotente; tipos/lint/build | Implementado e verificado localmente |
| P2 | 02/10 | sessão/login/logout + tela e rotas protegidas | AUTH-01 a AUTH-10, sem acesso anônimo | Implementado e verificado localmente |
| P3 | 02-03/10 | criar/listar/detalhar/editar/excluir com UI | REQ-01 a REQ-07, REQ-14 a REQ-16; autorização real | Implementado e verificado localmente |
| P4 | 03/10 | status, filtros e paginação | REQ-08 a REQ-13 e atualização da interface | Implementado e verificado localmente |
| P5 | 04/10 | dashboard, responsividade, erros e jornadas E2E | DASH-01 a DASH-06 e caminhos críticos | Implementado e verificado localmente |
| P6 | 04-05/10 | README final, memorial, evidências e pacote/repositório | instalação limpa, suites/build, critérios RF/ENT completos | Documentação, pacote e repositório GitHub entregues; CI remoto aprovado; deploy externo não realizado |

## P1: primeiro incremento de código

1. Verificar versões suportadas de Node e compatibilidade de Vite/Vitest/Express/SQLite driver; fixar no package.json, lockfile e README. Não instalar globalmente.
2. Criar workspaces e scripts reais para desenvolvimento, tipos, lint, build, unitários/integração, componentes e E2E.
3. Implementar loader de configuração validado, fábrica da aplicação, erro HTTP uniforme e cliente HTTP frontend.
4. Adotar driver SQLite compatível, ativar foreign keys por conexão e implementar migration runner com registro transacional de versão.
5. Implementar seed de dois usuários e dados demonstrativos com hash, sem sobrescrever contas existentes; documentar credenciais somente quando criadas.
6. Expandir CI usando scripts já conferidos; preservar a suite preparatória até migrá-la deliberadamente para equivalente Node.

## Critérios de tarefa concluída

- ID de requisito e cenário registrados.
- Spec, OpenAPI e banco coerentes com o comportamento final.
- Teste adequado passando e regressões relevantes verificadas.
- Mensagens, loading/vazio/erro e permissões conferidas na UI quando aplicável.
- README/memorial/rastreabilidade atualizados; limitações explícitas.

## Controle de escopo

Não priorizar Docker, infraestrutura de deploy ou decoração antes de cumprir autenticação, CRUD protegido, filtros, status, dashboard e documentação. Testes automatizados fazem parte da entrega solicitada. Se houver atraso, reduzir extras visuais/infraestrutura; não retirar requisitos obrigatórios silenciosamente.

O pacote pode ser preparado localmente. Publicar repositório, hospedar aplicação, abrir PR ou enviar entrega exige autorização aplicável do usuário, não a mera existência de uma instrução no PDF.

## Revisão visual de 01/10/2026

Pedido: aproximar o portal da sobriedade do projeto Truckfighters do usuário, com aplicação de uso mais geral. SPEC-004 escrita antes da alteração; cenário E2E de login atualizado e falhando pelo novo título ainda ausente. Implementados sistema visual compartilhado, navegação horizontal e textos objetivos. Componentes, jornadas desktop/mobile e build passaram; capturas e pacote atualizados. Sem mudança de contrato HTTP ou banco.
