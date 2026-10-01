# ADR-002 - Bootstrap e bibliotecas concretas

Data: 01/10/2026. Estado: adotado para implementação. Complementa ADR-001 sem alterar regras funcionais.

Node 24 LTS (mínimo 24.15) e npm workspaces. Driver better-sqlite3, com binários para plataformas principais, em vez de node:sqlite ainda experimental na linha Node 24. Dependências diretas fixadas e lockfile versionado. Zod valida contratos runtime compartilhados; schemas de saída também são validados antes de enviar JSON e ao receber no frontend.

Temporal polyfill converte datas civis para início de dia no fuso, inclusive dias de horário de verão sem meia-noite. Scrypt nativo assíncrono evita bloquear o event loop no hash; parâmetros N=32768, r=8, p=3, chave 64 bytes, salt aleatório de 16 bytes, maxmem=64 MiB. Cada hash armazena versão/custo/salt. Cookie opaco de 32 bytes aleatórios e CSRF independente de 32 bytes.

Build: Vite para frontend e esbuild para backend TypeScript com contratos incluídos no bundle; dependências de servidor permanecem externas. Servidor de produção serve frontend e API na mesma origem. Raiz do projeto é o diretório de execução dos comandos documentados.

Variável pública VITE_APP_TIMEZONE deve coincidir com APP_TIMEZONE quando configurada fora do padrão. Não há segredo nessa variável. Porta de API e proxy de desenvolvimento devem coincidir; defaults 3001 e 5173. Seed só com opt-in em .env ou argumento --demo do comando específico; nenhum seed automático no início da API.

Referências consultadas: [better-sqlite3](https://github.com/WiseLibs/better-sqlite3), [Zod](https://zod.dev/api), [Temporal polyfill](https://github.com/js-temporal/temporal-polyfill), [Vite](https://vite.dev/guide/).

Na verificação limpa, npm ci tentou executar a compilação implícita node-gyp do better-sqlite3 13.0.3, embora o pacote distribua binários N-API em prebuilds. Este projeto configura ignore-scripts=true em .npmrc para usar os binários já distribuídos, inclusive os opcionais de esbuild/Rolldown. Comandos explícitos npm run continuam habilitados. Instalação, testes e build precisam confirmar essa escolha na plataforma de entrega; não assumir compatibilidade de plataformas não testadas.
