# Execução compilada e deploy

## Demonstração local verificada

Na raiz, com Node 24 LTS, .env de desenvolvimento, banco criado e seed aplicado:

```sh
npm ci
npm run db:migrate
npm run db:seed
npm run build
npm start
```

Frontend/API em http://127.0.0.1:3001. SQLite permanece em data/portal.sqlite ao encerrar/reiniciar. Esse modo permite avaliar a aplicação compilada por HTTP local. Não requer Vite em execução.

## Deploy em servidor com HTTPS

Preparar um host com Node 24, diretório de aplicação, acesso às dependências, domínio e reverse proxy HTTPS. O servidor Node escuta em 127.0.0.1; o proxy roda no mesmo host. Sem hospedagem externa específica presumida.

1. Copiar/clonar o código, incluindo database, package-lock e .npmrc. Instalar com npm ci --include=dev e compilar com npm run build.
2. Configurar .env conforme README: DATABASE_PATH absoluto em volume persistente gravável; APP_TIMEZONE e VITE_APP_TIMEZONE iguais; PORT=3001; NODE_ENV=production; COOKIE_SECURE=true; TRUST_PROXY_LOOPBACK=true somente com proxy local confiável. O build força bundle frontend de produção mesmo com .env de desenvolvimento.
3. Aplicar npm run db:migrate. Para uma instância de avaliação com contas públicas, preparar o banco de demonstração em modo development antes de ativar production. db:seed é deliberadamente bloqueado em production. Não usar essas credenciais para dados corporativos reais.
4. Executar npm start na raiz com usuário de serviço que pode escrever no diretório do banco. Usar um gerenciador de processo/serviço do host para reinício e logs; executar uma única instância por arquivo SQLite.
5. Configurar o proxy para encaminhar todas as rotas ao Node, preservar Cookie/Set-Cookie e fornecer HTTPS. Frontend e /api permanecem no mesmo domínio.
6. Conferir login, criação, reload, status, filtros, dashboard, logout e cookie Secure via URL HTTPS. Nenhuma implantação externa foi realizada nesta sessão; essa conferência pertence ao ambiente escolhido.

## Persistência e atualização

Manter banco fora do diretório substituído em atualizações e incluir o arquivo em estratégia de backup. Com WAL ativo, usar o mecanismo de backup do SQLite ou encerrar o processo/checkpoint antes de copiar banco; não copiar somente portal.sqlite enquanto writes podem estar no WAL.

Não alterar migrations aplicadas. Uma alteração de schema adiciona novo script numerado; checksum detecta alteração em script anterior. .gitattributes mantém SQL em LF para checksum reproduzível. Atualizações executam instalação/build/migrations e reiniciam a instância sem apagar banco. Guardar o pacote anterior e backup para recuperação; não automatizar rollback destrutivo.

Sessões são persistidas mas respeitam expiração, logout e rotação; nenhuma sessão é preservada por ser apenas conhecida no frontend. Para múltiplas instâncias, rever banco, sessões, limitador de tentativas e estratégia operacional.

## O que foi verificado localmente

Instalação limpa em Windows com Node 24.16; migrations e seed repetidos; tipos/lint/testes/build; frontend/API reais em Chromium. Detalhes e limites em VERIFICATION.md. CI remoto iniciado; execução completa ainda não confirmada. Execução com domínio público, TLS real e serviço de sistema não foi observada.
