# Memorial Técnico de Desenvolvimento

Data: 01/10/2026. Relato da implementação local do MVP, sem publicação ou deploy externo. Desenvolvido com apoio do Codex; o candidato deve revisar e compreender o código e as decisões antes da entrega.

## 1. Problema e resultado

Portal de Solicitações Internas com login/logout, fila compartilhada, CRUD condicionado a autoria e estado, fluxo de atendimento, filtros e dashboard. Backend e frontend funcionam com persistência SQLite. Os requisitos e critérios de aceite estão no PRD; decisões não especificadas pela empresa foram marcadas como DEC-* e documentadas em ADRs.

## 2. Tecnologias utilizadas e justificativas

Versões exatas em package.json/package-lock.json. Versões centrais: Node 24.16.0, TypeScript 6.0.3, React 19.3.0, Express 5.2.1, SQLite via better-sqlite3 13.0.3, Vite 8.3.2 e Vitest 5.0.3.

| Tecnologia/biblioteca | Motivo, benefício e comparação |
| --- | --- |
| TypeScript + @types de Node, Express, SQLite, cookies, React/DOM e Supertest | Tipos compartilhados e checagem estrita; JavaScript exige outras formas de detectar esses erros. Tipos não substituem validação runtime. |
| React + react-dom | Componentes para formulário/lista/detalhe e estado explícito. Framework full stack poderia agregar convenções, mas a separação deixa API/frontend claros para avaliação. |
| react-router-dom | Rotas protegidas, deep links e navegação sem recarregar. Evita roteador artesanal e mantém detalhe/edição endereçáveis. |
| Vite + plugin-react | Desenvolvimento com proxy e build frontend. Mais simples para esse SPA que adicionar renderização de servidor não requerida. |
| Node + Express | API HTTP pequena com middleware e tradução de erros. Django/Laravel oferecem convenções adicionais; a escolha mantém uma linguagem no produto. |
| better-sqlite3 | SQLite real com consultas parametrizadas, transações e arquivo local. PostgreSQL teria operação mais adequada a escala horizontal, com preparação extra no MVP. |
| Zod | Valida entradas/saídas no servidor e respostas/forms no cliente, rejeitando campos extras. Evita depender só de tipos estáticos ou validações duplicadas inconsistentes. |
| Temporal polyfill | Fronteiras civis por fuso, inclusive mudança de horário de verão. Somar 24 horas a timestamps falharia em dias de duração diferente. |
| node:crypto, cookie-parser | Scrypt assíncrono, randomness, hashing, comparação segura e leitura de cookie; sessão opaca revogável em vez de JWT no localStorage. |
| Helmet | Headers básicos de segurança sem configurar cada header em controllers. TLS permanece responsabilidade do deploy. |
| dotenv | Configuração local documentada sem secrets no código; Zod confere valores após leitura. |
| lucide-react | Ícones consistentes com nomes acessíveis nas ações. Sem imagens geradas ou fontes externas necessárias para a UI. |
| Vitest + coverage-v8 | Executor de unitários, integração e componentes; cobertura disponível como diagnóstico. Não foi estabelecido percentual arbitrário. |
| Supertest | Verifica HTTP/cookies/middleware sobre aplicação Express instanciável e SQLite real, sem abrir porta em cada teste. |
| Testing Library, user-event, jest-dom e jsdom | Testes observam labels, interação e feedback acessível, em vez de detalhes internos de componentes. |
| Playwright | Jornadas em Chromium real, API/banco reais, desktop/360 px e capturas de evidência. |
| Swagger Parser, Ajv e ajv-formats | Validação formal OpenAPI e schemas JSON de respostas HTTP reais, reduzindo divergência com o contrato. |
| esbuild, tsx | Bundle backend executável e execução TypeScript no desenvolvimento/CLI; frontend usa seu build próprio. |
| ESLint, @eslint/js, typescript-eslint, globals e Prettier | Verificações e formatação reproduzíveis para legibilidade/manutenção. |
| concurrently | Inicia API e Vite num comando e encerra ambos de forma coordenada. |
| Python 3.12, unittest/sqlite3/json | Verificações preparatórias de esquema/contrato; não é linguagem do backend e não é requisito de execução do produto. |
| Markdown, SQL, OpenAPI JSON, YAML/GitHub Actions | Especificações, migrations, documentação técnica, contrato e workflow de verificação. CI remoto ainda não executado. |

pypdf/pypdfium2 foram usados para leitura/conferência do PDF inicial, fora das dependências do produto. O lockfile registra dependências transitivas; não são todas ferramentas escolhidas diretamente.

## 3. Arquitetura e organização

Monorepo: apps/api, apps/web e packages/contracts. Controllers traduzem HTTP; serviço de solicitações decide autoria/status; repositório realiza SQL. Aplicação Express é criada por factory com banco/relógio injetáveis. Frontend tem páginas separadas, componentes compartilhados, cliente HTTP e provedor de autenticação.

Contrato OpenAPI antecedeu a implementação, com schemas Zod compartilhados para validação runtime e testes de respostas com Ajv. Migrations SQL versionadas, transacionais e com checksum. FK por conexão, WAL no arquivo e índices dos filtros. users -> requests e sessions; metadados migrations/seed_runs não são dados de negócio.

Não há microsserviços, containerização ou padrões sofisticados sem necessidade. A separação de responsabilidades e injeção de banco/relógio atendem organização e testabilidade no escopo júnior.

## 4. Autenticação, regras e comunicação

Hash scrypt N=32768/r=8/p=3, salt de 16 bytes e chave de 64 bytes. Login desconhecido executa mesmo derivador com hash dummy. Cookie aleatório de 32 bytes, HttpOnly/SameSite=Lax, Secure em HTTPS; somente SHA-256 do cookie no banco. CSRF independente ligado à sessão, incluindo login/logout. Sessão rotacionada no login e invalidada no logout/expiração.

API aplica autorização; UI apenas disponibiliza ações permitidas. Edição/exclusão usam SQL com autor e status aberto na própria escrita, e triggers reforçam invariantes. Transições avançam um passo; mesmo status não muda updatedAt. Duas edições válidas abertas não têm versionamento otimista no MVP.

JSON via HTTP na mesma origem; proxy Vite no desenvolvimento e backend servindo build em execução compilada. Datas UTC; filtro usa início civil inclusivo e próximo início civil exclusivo; apresentação no fuso configurado. Erros por campo, requestId e mensagens sem hashes/tokens/SQL interno.

## 5. Processo spec driven e validação

PRD e cenários escritos antes do código. Suites iniciais rodadas enquanto módulos não existiam, registrando falha esperada; módulos implementados para satisfazer comportamentos. Componentes testados antes das jornadas no navegador. O teste de largura mobile encontrou overflow; listagem foi ajustada para cartões e jornadas repetidas.

Instalação limpa identificou tentativa de compilação implícita node-gyp do driver que já distribui binários; .npmrc usa ignore-scripts, e a instalação/build foram conferidos novamente. Build força NODE_ENV=production para que um .env de desenvolvimento não gere React de desenvolvimento. Resultados finais e limites em VERIFICATION.md; capturas reais em docs/evidence.

## 6. Análise crítica e melhorias

Identidade visual revisada a pedido do usuário após o MVP: referência ao seu projeto Truckfighters, inspecionado localmente, com papel quente, tinta preta, linhas visíveis, tipografia Arial/Helvetica e cantos quase retos. A escala dos títulos e a cor de destaque foram moderadas para o contexto corporativo. Navegação horizontal substitui a lateral com apenas um destino; indicadores usam faixa com separadores; textos promocionais e decoração sem função foram removidos. SPEC-004 registra decisões e aceite, conferido por capturas reais e jornadas desktop/mobile.

Fila sem papéis especializados, exclusão física e sem histórico/auditoria; sem atribuição de atendente, recuperação de senha ou reabertura. Limitador de login é local ao processo. SQLite/processo único simplifica a avaliação, mas múltiplas instâncias exigem rever banco, limitação e operação. Não há garantia de alta disponibilidade.

Produção corporativa exigiria políticas reais de identidade/acesso, observabilidade, backup/restauração e disponibilidade. Melhorias possíveis: auditoria, versionamento otimista, atribuição/SLA e banco de servidor conforme escala. Instalação local Windows e jornadas Chromium foram verificadas; deploy HTTPS público e CI remoto não foram realizados.
