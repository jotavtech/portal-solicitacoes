# PRD - Portal de Solicitações Internas

Versão: 1.0 | Data: 01/10/2026 | Estado: MVP implementado e verificado localmente; premissas revisáveis. Evidências em VERIFICATION.md.

## 1. Origem e objetivo

Fonte: `Seleção DEV Jr. 09_2026 - mini-projeto Full Stack.pdf`, fornecido pelo usuário, páginas 1-12. O arquivo original fica fora do repositório; este PRD registra seus requisitos relevantes, sem republicar dados de contato. A solicitação adicional do usuário exige PRD, desenvolvimento orientado a especificações, testes automatizados, documentação e `AGENTS.md`.

Construir uma aplicação web que permita colaboradores registrar solicitações internas, consultar seu andamento e atualizar o atendimento. Demonstrar desenvolvimento full stack, API consistente, modelagem SQL, interface utilizável e decisões técnicas explicáveis por um candidato júnior.

Entrega até **segunda-feira, 05/10/2026**, por repositório GitHub ou similar ou pacote enviado por e-mail, conforme enunciado. Preparar a entrega não autoriza publicação ou envio automático.

## 2. Usuários e jornada

Persona única do MVP: colaborador autenticado. Não há papéis obrigatórios no enunciado.

Jornada principal: login -> dashboard/lista -> criar solicitação -> consultar detalhes -> iniciar atendimento -> concluir -> conferir indicadores -> logout.

Jornada alternativa: criar -> corrigir título, descrição ou categoria enquanto aberta -> excluir enquanto aberta, mediante confirmação.

## 3. Escopo e requisitos funcionais

| ID | Requisito do enunciado | Critério observável de aceite |
| --- | --- | --- |
| RF-001 | Login com usuário e senha, controle de sessão e acesso autenticado | Login válido permite acesso; credenciais inválidas não iniciam sessão; API protegida retorna 401 sem sessão; recarregar página preserva sessão válida. |
| RF-002 | Logout | Encerra a sessão no servidor e no navegador; reutilizar o cookie antigo não permite acesso. |
| RF-003 | Criar solicitação | Título, descrição e categoria válidos produzem registro persistente; servidor define usuário, data e status Aberto; registro aparece após recarregar. |
| RF-004 | Editar solicitação aberta | Atualiza título, descrição e categoria enquanto Aberto; depois de iniciar atendimento, API rejeita edição e mantém os dados anteriores. |
| RF-005 | Excluir solicitação aberta | Confirmação seguida de exclusão remove o registro; cancelar preserva o registro; API rejeita exclusão em outros status. |
| RF-006 | Listar e consultar detalhes | Lista mostra código, título, categoria, solicitante, data de abertura e status; detalhe inclui também descrição. |
| RF-007 | Alterar status | Operação persiste um dos status Aberto, Em Atendimento e Concluído, segundo DEC-002; lista, detalhe e indicadores refletem o resultado. |
| RF-008 | Pesquisa e filtros | Período de abertura, categoria, status e texto no título funcionam sozinhos e combinados; limpar filtros restaura lista completa. |
| RF-009 | Dashboard | Mostra total, abertas, em atendimento e concluídas; total é igual à soma dos três estados; banco vazio mostra quatro zeros. |

Categorias sugeridas no PDF, adotadas para o MVP: TI, RH, Compras, Financeiro e Infraestrutura.

## 4. Decisões locais e ambiguidades resolvidas

Estas decisões completam pontos não especificados no PDF. São revisáveis; uma revisão deve atualizar especificação e testes antes do código.

| ID | Decisão inicial | Justificativa e impacto |
| --- | --- | --- |
| DEC-001 | Todos os autenticados visualizam todas as solicitações e podem alterar status. Somente o autor edita ou exclui uma solicitação aberta. | Compartilha a fila interna e protege conteúdo de terceiros; o PDF não define visibilidade, propriedade nem papéis. |
| DEC-002 | Fluxo Aberto -> Em Atendimento -> Concluído, sem retrocesso ou salto; repetir o estado atual é idempotente. | Define um fluxo simples; as transições não são prescritas pelo PDF. Concluído é terminal no MVP. |
| DEC-003 | Dashboard global, sem filtros; filtros afetam apenas a listagem. | Evita interpretação ambígua dos indicadores. Interface explica o escopo. |
| DEC-004 | Sem cadastro público; dois usuários criados por seed de demonstração. | O requisito é login, não gestão de usuários. |
| DEC-005 | Exclusão física e sem histórico de status. | Mantém escopo; dashboard contabiliza apenas solicitações existentes. Histórico é melhoria futura. |
| DEC-006 | Stack adotada: TypeScript, React/Vite, Express e SQLite. | Uma linguagem na aplicação e banco SQL sem serviço externo para execução local. Não é exigência da seleção. |
| DEC-007 | Período filtra data de criação em America/Sao_Paulo; endpoints recebem datas civis inclusivas. | Evita perder registros do último dia. Persistência em UTC. |
| DEC-008 | Paginação de 20, máximo 100 itens; ordem criação desc e ID desc. | Lista previsível e limitada; a paginação é decisão de implementação. |

## 5. Regras e validações

- Título: texto aparado, 3-120 pontos de código Unicode. Descrição: texto aparado, 10-5000 pontos de código. Categoria e status pertencem aos enums do contrato.
- Criar/editar aceitam somente campos declarados. Campos extras, inclusive autor, data e status na criação, são rejeitados com 422.
- Usuário de login: 3-50 caracteres, letras ASCII, números, ponto, hífen e sublinhado; normalizado para minúsculas. Senha: 1-256 pontos de código no login, sem aparar nem normalizar; senha de demonstração usa pelo menos 12 caracteres.
- API é a autoridade das regras. Controles escondidos/desabilitados na UI não substituem validação no servidor.
- Edição e exclusão verificam autoria e status no momento da gravação. Se atendimento começar entre leitura e escrita, a alteração proibida não ocorre.
- ID positivo inexistente: 404. Falta de sessão: 401. Autoria indevida ou CSRF inválido: 403. Conflito de status: 409. Entrada inválida: 422. Corpo JSON malformado: 400. Corpo acima de 32 KiB: 413. Erro inesperado: 500 com mensagem genérica e identificador de requisição.

## 6. Qualidade exigida pelo usuário

| ID | Critério |
| --- | --- |
| NFR-001 | Autenticação protegida, hashes de senha, cookie HttpOnly, CSRF em mutações, sessão invalidada no logout, SQL parametrizado. |
| NFR-002 | Camadas simples no backend, componentes organizados e validação de entradas no servidor; TypeScript em modo estrito. |
| NFR-003 | Testes unitários de regras, integração API/SQLite, componentes e E2E do caminho principal e bloqueios críticos. Todos os cenários obrigatórios rastreados. |
| NFR-004 | Formulários com labels, erros legíveis, navegação por teclado, feedback de carregamento e ausência de resultados; conteúdo utilizável em largura de 360 px. |
| NFR-005 | Instalação reproduzível com versões e lockfile; criação do banco, seed e execução documentados e conferidos em ambiente limpo. |
| NFR-006 | Datas UTC no banco; apresentação e filtros no fuso configurado; paginação e filtros parametrizados. |

Não há meta formal de desempenho ou percentual de cobertura imposto pela seleção. Não definir números sem contexto. Testes automatizados e responsividade são diferenciais do PDF, mas foram incluídos como critérios deste projeto; testes foram expressamente pedidos pelo usuário.

## 7. Telas

Identidade visual revisada a pedido do usuário: sobriedade do seu projeto Truckfighters, adaptada a um portal geral. Direção, critérios visuais e validação em [SPEC-004](../specs/004-visual.md).

1. Login: usuário, senha, enviar e mensagem genérica para falha de autenticação.
2. Painel/listagem: quatro indicadores, filtros, tabela ou cartões em telas pequenas, nova solicitação e sair.
3. Criação/edição: título, descrição, categoria, salvar e cancelar; erros por campo; conteúdo preservado quando há falha.
4. Detalhe: todos os campos, ação de próximo status e ações de edição/exclusão permitidas. Exclusão abre confirmação.

Após mutação confirmada, invalidar ou recarregar lista, detalhe e dashboard. Se a sessão expirar, levar ao login com aviso; não reenviar automaticamente mutações após novo login.

## 8. Entregáveis

| ID | Entrega e evidência necessária |
| --- | --- |
| ENT-001 | Código completo de backend/frontend e dependências fixadas. |
| ENT-002 | Scripts SQL/migrations de criação e dicionário de dados. |
| ENT-003 | README com pré-requisitos, instalação, configuração, execução, deploy e credenciais de demonstração. |
| ENT-004 | Memorial Técnico de Desenvolvimento com ferramentas reais, justificativas, arquitetura e análise crítica. |
| ENT-005 | Prints da aplicação funcionando; vídeo opcional. Registrar somente após execução real. |
| ENT-006 | PRD, especificações, AGENTS.md, testes automatizados e matriz de rastreabilidade solicitados pelo usuário. |

## 9. Fora do MVP

Cadastro e administração de usuários, perfis de administrador, recuperação de senha, e-mail, anexos, comentários, notificações, SLA, relatórios exportáveis, multiempresa e auditoria completa. Docker/Compose e pipeline de deploy são opcionais depois de cumprir todos os requisitos. CI de testes pode ser simples e já existe para as verificações preparatórias.

## 10. Critério de conclusão

Todos os RF e ENT entregues, decisões implementadas de modo consistente, testes obrigatórios passando, build e verificações estáticas passando, instalação validada em ambiente limpo e memorial fiel ao código. Sem sessão, nenhum dado de negócio deve ser acessível. Não classificar a entrega como concluída apenas porque documentos ou testes preparatórios passaram.
