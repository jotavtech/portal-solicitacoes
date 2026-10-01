# SPEC-003 - Dashboard e atualização da interface

Requisitos: RF-009, NFR-004. Decisão: DEC-003.

`GET /api/dashboard` exige sessão e retorna `{total, open, inProgress, completed}`, inteiros não negativos. Conta todas as solicitações existentes, de todos os usuários. Filtros da lista não alteram o dashboard; a interface mostra "Indicadores gerais".

Executar agregação em uma consulta/snapshot consistente, evitando quatro consultas independentes produzirem uma soma impossível durante mutações. Invariante: total = open + inProgress + completed. Exclusão física diminui total e abertas. Não inclui sessões, usuários nem registros já excluídos.

Depois de criação, edição, exclusão ou mudança de status confirmada, atualizar as consultas relevantes. Editar não altera contagens, mas não pode deixá-las desatualizadas. Falha em carregar indicadores mostra erro com tentar novamente, sem converter erro em quatro zeros.

| ID | Dado / quando | Então | Nível |
| --- | --- | --- | --- |
| DASH-01 | banco vazio / consulta | quatro zeros e soma válida | Integração + componente |
| DASH-02 | base com todos os estados e dois autores | contagens globais corretas e soma válida | Integração |
| DASH-03 | criar, avançar status e excluir uma aberta | contagens refletem cada operação confirmada | Integração + E2E |
| DASH-04 | aplicar filtros na lista | dashboard permanece global e seu escopo é explicado | Componente + E2E |
| DASH-05 | sem sessão ou sessão expirada | 401; interface solicita login | Integração + E2E |
| DASH-06 | erro ao carregar indicadores | erro e recuperação acessíveis; não mostrar zeros como sucesso | Componente |
