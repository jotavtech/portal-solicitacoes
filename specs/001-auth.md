# SPEC-001 - Autenticação e sessão

Requisitos: RF-001, RF-002, NFR-001. Decisão: DEC-004.

## Comportamento

Login com usuário e senha; sem cadastro público. Seed opt-in cria dois colaboradores com senha hasheada, de forma idempotente e sem sobrescrever senhas existentes. Cookie `portal.sid` opaco, HttpOnly, SameSite=Lax, Path=/ e Secure em produção HTTPS. Sessões persistidas no SQLite, com duração absoluta padrão de 8 horas, configurável por SESSION_TTL_SECONDS (máximo 24 horas). IDs gerados por fonte criptograficamente segura; armazenar somente SHA-256 do token do cookie no banco.

`GET /api/auth/session` é público e retorna `{user, csrfToken}`. Sem autenticação, user é null e o endpoint inicializa uma sessão anônima para CSRF, sem conceder acesso ao negócio. Token CSRF ligado à sessão, enviado no header `X-CSRF-Token` em todos os POST/PUT/PATCH/DELETE, inclusive login e logout; não registrar tokens em logs. Login bem-sucedido troca ID e CSRF da sessão, invalida a sessão anterior e retorna usuário público e novo token. O frontend substitui o token após login.

Logout exige sessão autenticada, invalida o registro e expira cookie. Rotas protegidas não confiam em informação de usuário enviada pelo cliente. API verifica autenticação antes de validar regras de negócio; mutação autenticada verifica CSRF antes de executar. Login com CSRF inválido retorna 403; credencial incorreta retorna sempre mensagem genérica 401. Usuário inexistente executa verificação com hash dummy para evitar atalho óbvio de tempo.

Respostas de autenticação usam `Cache-Control: no-store`. Senhas com salt por usuário, hash scrypt com parâmetros de custo registrados e conferidos no bootstrap. Limitar login por IP a 10 tentativas por minuto no processo local; exceder retorna 429 com Retry-After. Documentar limitação do limitador local em produção distribuída. Não restringir contas definitivamente.

## Cenários de aceite e testes

| ID | Dado / quando | Então | Nível |
| --- | --- | --- | --- |
| AUTH-01 | usuário válido e CSRF válido / login | 200, usuário público, cookie e ID rotacionado; senha/hash ausentes | Integração + E2E |
| AUTH-02 | senha inválida ou usuário inexistente / login | 401 genérico, sem acesso ao negócio | Integração + componente |
| AUTH-03 | sem sessão, sessão expirada ou cookie forjado / rota protegida | 401 e nenhum dado de negócio | Integração + E2E |
| AUTH-04 | sessão válida / recarregar interface | permanece autenticado | E2E |
| AUTH-05 | autenticado / logout e reutilização do cookie antigo | 204 no logout e 401 ao reutilizar | Integração + E2E |
| AUTH-06 | mutação sem CSRF ou com token de outra sessão | 403, banco inalterado | Integração |
| AUTH-07 | leitura de sessão anônima / acesso a solicitações | token não concede autenticação; rota retorna 401 | Integração |
| AUTH-08 | sessão anterior ao login / uso após login | cookie anterior não concede acesso; novo cookie funciona | Integração |
| AUTH-09 | limite de login excedido | 429 com Retry-After, sem autenticação | Integração com relógio controlado |
| AUTH-10 | formulário sem campos ou erro HTTP | labels, erro acessível e ação de reenviar; não navegar em falha | Componente |

## Não objetivos

JWT no localStorage, cadastro público, OAuth, recuperação de senha e papéis administrativos.
