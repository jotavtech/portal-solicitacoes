# Registro de verificação do MVP

Data: 01/10/2026. Ambiente observado: Windows, Node.js 24.16.0, npm 11.13.0 e Python 3.12.14. Sem commit ou execução remota de CI. Resultados abaixo são de execução local, não apenas comandos planejados.

## Verificações executadas

| Comando | Resultado |
| --- | --- |
| npm run check | TypeScript estrito, ESLint e validação formal OpenAPI passaram; 42 testes Vitest em 7 arquivos passaram; API e frontend compilados. |
| npm run test:e2e | 12 jornadas Playwright passaram: 6 desktop e 6 em 360 px, com Chromium, HTTP real e SQLite temporário. |
| python -m unittest discover -s tests/specs -p "test_*.py" -v | 31 verificações preparatórias de SQL, contrato e documentação passaram. |
| npm run evidence | 6 capturas reais sobre banco limpo de demonstração; arquivos em docs/evidence. |
| npm ci em cópia limpa | Instalação do lockfile sem node_modules, dist, banco ou .env prévio passou após configuração de .npmrc. |
| db:migrate e db:seed, ambos repetidos | Migrations e seed idempotentes, sem sobrescrever contas existentes. |
| node scripts/smoke-built.mjs em cópia limpa | Login real, API compilada, SQLite, dashboard, fallback SPA e 404 JSON conferidos. |
| HTTP GET http://127.0.0.1:3001 | Frontend compilado disponível, status 200; preview local iniciado com npm start. |

A instalação limpa incluiu check com os 40 testes existentes naquele momento. Depois foram acrescentados testes de checksum alterado e corpo maior que 32 KiB; a verificação final no projeto principal passou com 42. As contagens distinguem testes de aplicação, jornadas e verificações preparatórias; não representam 85 testes de interface.

## Comportamentos observados

Vitest: hash scrypt real, sessão anônima e autenticada, normalização de login, rotação, revogação/expiração, CSRF, cookie Secure, limite de login, autorização por autoria, CRUD, transições/idempotência, escrita condicionada, limites Unicode, consultas parametrizadas, curingas literais, datas civis e horário de verão, paginação, persistência após fechar/reabrir SQLite, migrations/seed e respostas HTTP validadas com schemas OpenAPI. Componentes: validação, erro/vazio, confirmação, filtros e recuperação do dashboard.

Playwright: login/recarregamento/logout; criar, editar, pesquisar, limpar filtros, atender e concluir; cancelar/confirmar exclusão; segundo colaborador; revogação de sessão e redirecionamento; HTML mostrado como texto. Executados em desktop e mobile, com as mesmas migrations da aplicação. Não usam o banco ativo do usuário.

Houve uma resposta 401 intermitente no helper de login de uma execução anterior do teste REQ-14. A execução final completa passou; duas novas execuções consecutivas da suite de API também passaram com 22 testes cada. A causa não foi reproduzida ou identificada. Esse registro preserva a ocorrência; uma nova falha deve ser investigada com o código de erro e contexto da resposta, sem adicionar retries para ocultá-la.

## Correções verificadas durante a implementação

Instalação limpa revelou tentativa implícita de node-gyp apesar dos binários distribuídos pelo driver. .npmrc passou a desabilitar scripts implícitos de instalação; novo npm ci, migrations, seed, check e smoke passaram. ADR-002 registra a decisão.

E2E detectou overflow horizontal em 360 px. O posicionamento do texto acessível e a apresentação mobile da lista foram ajustados; jornadas desktop/mobile passaram. O build passou a definir NODE_ENV=production para compilação, mesmo com .env local de desenvolvimento; o artefato React de produção foi conferido em instalação limpa.

## Revisão visual SPEC-004

Em 01/10/2026, a direção visual foi revisada conforme referência local Truckfighters e preferência do usuário por sobriedade. O cenário E2E AUTH-01/04/05 foi executado antes da implementação e falhou porque o título "Acessar o portal" ainda não existia; após a alteração, npm run check passou com 42 testes e build, e npm run test:e2e passou com as 12 jornadas desktop/mobile. npm run evidence regenerou as seis capturas de login, lista e detalhe. A aba local já aberta foi recarregada e mostrou a marca tipográfica, navegação horizontal e indicadores em faixa. Verificação visual de capturas em 1440 px e 360 px, sem overflow da página nos testes. Não foram adicionados retries ou testes de mera equivalência de classes CSS.

## Correção de alinhamento dos filtros

Em 01/10/2026, a medição na aba aberta revelou busca com 39 px de altura e selects/datas com 42 px, deslocando a busca e seu rótulo em 3 px. Os controles passaram a ter 42 px e labels com line-height uniforme. A grade intermediária usa três colunas iguais e botão na largura da coluna. Após build, medição real em aproximadamente 1086 px confirmou topos idênticos em cada linha, alturas de 42 px e colunas de aproximadamente 335 px. As quatro jornadas existentes de login/recarregamento e CRUD/filtros em desktop/mobile passaram. Evidências regeneradas, com captura adicional filters-aligned.png. Mudança restrita à apresentação; sem alteração de API ou banco.

## Limites de execução externa

CI foi escrito, mas não executado no GitHub. Deploy HTTPS, proxy em produção, Docker e outras plataformas não foram testados; não houve publicação ou envio. O guia DEPLOY.md descreve a configuração esperada, sem afirmar que foi executada. Não foi calculado percentual de cobertura. Prints são reais; vídeo opcional não foi produzido.
