# Matriz de rastreabilidade

Cenários implementados em api.test.ts, contratos/password/config/openapi.test.ts, components.test.tsx, RequestsPage.test.tsx e portal.spec.ts. Resultados reais em VERIFICATION.md; testes preparatórios continuam separados.

| Requisito | Especificação | Cenários | Endpoint / tela | Estado |
| --- | --- | --- | --- | --- |
| RF-001 | SPEC-001 | AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-07, AUTH-08, AUTH-09, AUTH-10 | GET /auth/session, POST /auth/login; login e navegação | Implementado e testado localmente |
| RF-002 | SPEC-001 | AUTH-05 | POST /auth/logout; sair | Implementado e testado localmente |
| RF-003 | SPEC-002 | REQ-01, REQ-02 | POST /requests; formulário | Implementado e testado localmente |
| RF-004 | SPEC-002 | REQ-03, REQ-04, REQ-05, REQ-15 | PUT /requests/{id}; edição | Implementado e testado localmente |
| RF-005 | SPEC-002 | REQ-04, REQ-05, REQ-06, REQ-15 | DELETE /requests/{id}; confirmação | Implementado e testado localmente |
| RF-006 | SPEC-002 | REQ-07, REQ-13, REQ-14, REQ-16 | GET /requests, GET /requests/{id}; lista/detalhe | Implementado e testado localmente |
| RF-007 | SPEC-002 | REQ-08, REQ-09 | PATCH /requests/{id}/status; detalhe | Implementado e testado localmente |
| RF-008 | SPEC-002 | REQ-10, REQ-11, REQ-12, REQ-13 | GET /requests; filtros | Implementado e testado localmente |
| RF-009 | SPEC-003 | DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06 | GET /dashboard; painel | Implementado e testado localmente |
| NFR-001 | SPEC-001, SPEC-002 | AUTH-03, AUTH-05, AUTH-06, AUTH-08, AUTH-09, REQ-05, REQ-12 | middleware, sessão, repositórios | Implementado e testado localmente |
| NFR-002 | SPEC-002 e arquitetura | REQ-02, REQ-09, REQ-14 | validações e organização de código | Implementado e testado localmente |
| NFR-003 | Plano de testes | AUTH-01 a AUTH-10; REQ-01 a REQ-16; DASH-01 a DASH-06 | suites de aplicação + verificações preparatórias | Implementado/verificado localmente |
| NFR-004 | SPEC-001, SPEC-002, SPEC-003 | AUTH-10, REQ-02, REQ-06, REQ-10, REQ-16, DASH-06 | formulários, navegação, estados de UI | Implementado e testado localmente |
| NFR-005 | README e plano | revisão de instalação limpa na entrega | bootstrap, migration, seed e deploy | Entregue localmente |
| NFR-006 | SPEC-002 | REQ-11, REQ-13 | datas/paginação | Implementado e testado localmente |
| ENT-001 | Plano de implementação | suites de aplicação + build | apps/api e apps/web | Entregue localmente |
| ENT-002 | Dicionário e SQL | testes de esquema e integração de migrations | database/001_schema.sql | Implementado/verificado localmente |
| ENT-003 | README | conferência de instalação e execução | README e .env.example | Implementado/verificado localmente |
| ENT-004 | Memorial | revisão contra código/lockfile/resultados | docs/MEMORIAL_TECNICO.md | Atualizado conforme implementação |
| ENT-005 | Plano de testes | execução e captura reais | docs/evidence | Entregue localmente |
| ENT-006 | PRD, specs e AGENTS | testes preparatórios e suites de aplicação | documentos e testes | Implementado/verificado localmente |

Prefixo de todos os endpoints: `/api`. Atualizar estado por evidência; `Especificado` não significa `Implementado` ou `Testado`. Um requisito só fica concluído quando código, teste adequado, documentação e critério de aceite forem verificados.

Instalação limpa e comandos verificados no Windows. CI remoto iniciado, ainda em andamento no registro da entrega; deploy público não executado. Prints reais atendem ENT-005; vídeo é opcional e não produzido. Não extrapolar resultados para TLS ou plataformas não testadas.

Revisão visual solicitada pelo usuário: SPEC-004 complementa NFR-004. Cabeçalho, tipografia, cores, indicadores, lista, login e formulários revisados; ações e regras preservadas. Verificação por jornadas desktop/mobile, componentes, build e seis capturas reais atualizadas.
