# Plano de testes automatizados

Objetivo: comprovar critérios de aceite e proteger regras críticas com evidências reproduzíveis. Estado atual: suites de aplicação e preparatórias implementadas. Resultados executados em VERIFICATION.md; plano e evidência são mantidos separados.

## Níveis e ferramentas adotadas

| Nível | Ferramenta | Comportamentos |
| --- | --- | --- |
| Esquema/contrato, disponível | unittest e sqlite3 da biblioteca padrão Python | Constraints, FKs, triggers, validade estrutural/referências do OpenAPI e rastreabilidade. |
| Unitário | Vitest | Transições, limites de input, normalização, cálculo de fronteiras civis e tradução de erros. |
| Integração | Vitest + Supertest + SQLite real | Cookie, CSRF, autor, status, filtros, paginação, SQL, sessão, dashboard e persistência. |
| Componente | Vitest + Testing Library + user-event | Labels, validação, confirmação, estados de erro/vazio/loading, navegação e atualização da UI. |
| E2E | Playwright | Navegador conectado à API/banco reais, jornada completa e bloqueios do MVP. |

## Casos obrigatórios

Todos os cenários AUTH-01 a AUTH-10, REQ-01 a REQ-16 e DASH-01 a DASH-06 em `specs/` devem ter um teste no nível indicado ou justificativa explícita da alteração. A matriz `docs/TRACEABILITY.md` conecta esses cenários aos requisitos. Segurança e regras de negócio têm integração obrigatória; mock de serviço não é evidência de persistência/autorização.

Testar comprimentos exatamente abaixo/no/acima do limite e strings Unicode cujo comprimento UTF-16 difere de pontos de código. Testar usuário normalizado, senha sem trim, campos extras e datas civis inexistentes. Usar dataset com dois autores, cinco categorias, três estados e horários nas fronteiras do período.

## Jornadas E2E prioritárias

1. Login válido -> criar -> listar -> abrir detalhe -> editar -> filtrar -> iniciar atendimento -> concluir -> conferir dashboard -> logout -> rota protegida.
2. Criar aberta -> cancelar confirmação de exclusão -> confirmar exclusão -> lista/dashboard atualizados.
3. Solicitação em atendimento -> edição/exclusão indisponíveis na UI; integração comprova bloqueio direto da API.
4. Segundo usuário -> visualizar fila compartilhada -> integração comprova 403 ao editar/excluir registro do primeiro; avanço de status permitido.
5. Recarregar autenticado, invalidar sessão e conferir redirecionamento com aviso, sem reenvio de mutações.

## Isolamento e determinismo

- Banco temporário exclusivo por teste/worker; nunca usar o banco de demonstração, desenvolvimento ou produção. Aplicar mesmas migrations que a aplicação.
- Relógio controlado para expiração, rate limiting, timestamps e filtros. Não depender de data real nem sleeps arbitrários.
- Não usar contas, rede ou serviços externos nos testes. Segredos e senhas de fixture são exclusivamente de teste.
- REQ-01 deve testar persistência em arquivo temporário, fechando/reabrindo conexão e recriando a aplicação. Memória apenas não comprova reinício.
- REQ-15 simula leitura de registro aberto, muda status em outra operação e executa write condicionado; verificar que nada foi alterado/excluído. Não confiar em concorrência aleatória.
- Playwright usa seletor por papel/label e espera por estado/resposta observável, com servidor próprio e dados novos. Falha deve salvar trace/screenshot sem segredos.

## Portas de qualidade por incremento

Antes de merge/entrega: tipos e lint; testes do comportamento alterado; suite completa relevante; build. Incrementos que afetam a jornada principal executam E2E. Mudança de contrato exige validar payloads reais contra schemas e atualizar casos de erro. CI só deve chamar scripts existentes e verificados.

Cobertura serve para localizar lacunas, não como prova suficiente. Não fixar percentual arbitrário; todos os cenários críticos devem estar cobertos e nenhuma falha ignorada sem motivo explícito. Teste que sempre passa porque apenas repete valores do código não atende o requisito.

## Verificações disponíveis nesta etapa

```sh
python -m unittest discover -s tests/specs -p "test_*.py" -v
```

Esse comando usa SQLite real para verificar o esquema e checa o contrato estático. Não inicia HTTP/navegador e não substitui as suites de aplicação. Resultados observados em `docs/VERIFICATION.md`.

## Evidências finais

Registrar data, versão/commit quando houver, comando, resultado e limitações. Prints devem mostrar login/painel, criação/detalhe e indicadores com dados de demonstração; vídeo é opcional. Validar instalação limpa seguindo o README e incluir o resultado no Memorial Técnico. Não registrar como concluído um cenário apenas por existir nesta lista.

## Implementação e comandos atuais

`npm run check`: tipos, lint, OpenAPI, Vitest e build. `npm run test:e2e`: seis jornadas em desktop e 360 px. `npm run evidence`: capturas sobre banco temporário limpo, incluindo filtros em largura intermediária. E2E usa banco exclusivo por execução, worker único, contextos novos e títulos específicos; nenhuma dependência de banco de usuário. O limitador é elevado somente no factory do servidor de teste para muitos logins em sequência; AUTH-09 verifica o limite real de 10/minuto na integração.
