# SPEC-002 - Solicitações, consulta e filtros

Requisitos: RF-003 a RF-008, NFR-002, NFR-004, NFR-006. Decisões: DEC-001, DEC-002, DEC-005, DEC-007 e DEC-008.

## Modelo e contrato

Categoria: `TI`, `RH`, `COMPRAS`, `FINANCEIRO`, `INFRAESTRUTURA`. Status: `ABERTO`, `EM_ATENDIMENTO`, `CONCLUIDO`. Rótulos em português na interface. Código exibido é o ID inteiro positivo; sem sequência adicional.

Objeto público: `id`, `title`, `description`, `category`, `requester: {id, username, name}`, `status`, `createdAt`, `updatedAt`. Datas RFC 3339 UTC. Nunca retornar hash, dados de sessão ou campos privados.

Criação aceita title, description e category. Edição usa PUT com os mesmos três campos obrigatórios. O servidor apara título/descrição e valida os limites do PRD; rejeita campos desconhecidos. Datas, autor e status inicial são definidos pelo servidor.

Todas as solicitações são visíveis a todos os autenticados. Somente autor edita/exclui e somente em Aberto. Qualquer autenticado pode avançar o status. Ordem de erros depois de sessão/CSRF/input: não encontrado -> autoria, se aplicável -> estado. Repositório deve aplicar condições de status/autoria na escrita atômica; se zero registros forem alterados, reler e traduzir para 404/403/409. Não aceitar um estado lido antes como autorização definitiva.

Transições: Aberto -> Em Atendimento -> Concluído. Sem salto, retrocesso ou reabertura. Solicitar o mesmo status retorna 200 com registro atual, sem modificar updatedAt. Concluído é terminal. Não há campo de descrição atualizado na rota de status.

## Consulta

Filtros de listagem são combinados por AND: `q` pesquisa substring literal no título, sem diferenciar maiúsculas/minúsculas ASCII; não há normalização de acentos no MVP. `%` e `_` são texto literal, não curingas. Aparar q; vazio equivale a ausência; máximo 120 pontos de código. Categoria/status devem ser enums válidos.

`from` e `to`: datas reais YYYY-MM-DD; ambas opcionais. `from` inclui início do dia civil no fuso America/Sao_Paulo; `to` inclui todo o último dia, implementado como limite exclusivo do início do dia seguinte no mesmo fuso. Converta cada fronteira civil para UTC usando regras do fuso; não suponha que todo dia tem 24 horas. from > to retorna 422. Uma única fronteira produz intervalo aberto do outro lado.

`page` inteiro >= 1 e `pageSize` entre 1 e 100, padrão 20. Ordem createdAt DESC e id DESC. Retorno: `{items, page, pageSize, total}`; total é a quantidade filtrada antes da paginação. Página além do fim retorna items vazio. Parâmetros desconhecidos, repetidos ou arrays são rejeitados com 422.

UI explica filtros ativos, oferece limpar e redefine página para 1 quando o filtro muda. Lista vazia é um estado válido, diferente de erro. Confirmar exclusão com título e ações cancelar/excluir. Desabilitar envio enquanto em andamento; nunca mostrar sucesso antes da resposta.

## Cenários de aceite e testes

| ID | Dado / quando | Então | Nível |
| --- | --- | --- | --- |
| REQ-01 | usuário autenticado / criação válida | 201, autoria e data do servidor, status Aberto; persiste após reinício | Integração + E2E |
| REQ-02 | texto vazio, curto/longo, categoria inválida ou campo extra / criação/edição | 422 por campo; banco inalterado; UI preserva valores | Unitário + integração + componente |
| REQ-03 | solicitação aberta do próprio usuário / edição | 200, campos atualizados, autoria/data inicial preservadas | Integração + E2E |
| REQ-04 | status Em Atendimento ou Concluído / editar ou excluir | 409 e registro inalterado | Integração + E2E |
| REQ-05 | solicitação aberta de outro autor / editar ou excluir | 403, mesmo via chamada direta à API | Integração |
| REQ-06 | solicitação própria aberta / cancelar confirmação, depois confirmar | cancelar mantém; confirmar retorna 204 e remove | Integração + componente + E2E |
| REQ-07 | solicitações existentes / listar e abrir detalhe | campos exigidos presentes, descrição no detalhe e usuário público | Integração + E2E |
| REQ-08 | Aberto -> Em Atendimento -> Concluído | grava transições e reflete UI; repetir mesmo status não muda data | Unitário + integração + E2E |
| REQ-09 | salto, retrocesso ou reabertura | 409; status mantido | Unitário + integração |
| REQ-10 | filtros individuais e combinados | retorna somente interseção; limpar restaura; total filtrado correto | Integração + componente + E2E |
| REQ-11 | registros antes/no início/no fim/depois do período e fuso | inclui exatamente fronteiras civis esperadas; intervalo inválido 422 | Unitário + integração |
| REQ-12 | título com aspas, %, _, HTML e texto Unicode | consulta segura, curingas literais e renderização como texto | Integração + componente |
| REQ-13 | mais de uma página e datas iguais | paginação estável, IDs desempatem; fora do fim vazio; limites inválidos 422 | Integração |
| REQ-14 | ID positivo inexistente ou ID inválido | 404 para inexistente, 422 para inválido | Integração |
| REQ-15 | atendimento inicia entre leitura e tentativa de editar/excluir | escrita condicionada bloqueia alteração em estado não aberto | Integração com interleaving controlado |
| REQ-16 | falha de rede/API durante envio ou listagem | feedback acessível, botão recuperável, sem sucesso falso | Componente |

Não há garantia de evitar sobrescrita entre duas edições simultâneas enquanto aberto; último write válido vence. Controle otimista de versão é melhoria futura. A corrida de mudança para estado não editável precisa ser protegida no MVP.
