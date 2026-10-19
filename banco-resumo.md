# Banco de dados — resumo em linguagem simples

Memória do banco para os próximos módulos e para o Capítulo 15 (Login).
Atualize este arquivo toda vez que uma tabela nova nascer.

## Onde fica

- **Projeto Supabase:** `fmz-obras` (organização "FMZ Incorporadora"), servidor em São Paulo (sa-east-1).
- **Endereço:** `https://wzwjkgrxzbvnfqglkbxo.supabase.co`
- **Chaves:** no arquivo `.env.local` (na pasta do app). Ele **não vai para o GitHub**.
  O app usa só a chave **pública** (`sb_publishable_...`). A chave secreta (service_role)
  nunca entra no app.
- **Plano:** gratuito (US$ 0/mês). Projeto gratuito parado por 7 dias é pausado pelo
  Supabase; é só reativar no painel.

## As tabelas (5 até agora)

| Tabela | O que guarda | É de uma obra só? |
|---|---|---|
| `obras` | O cadastro de cada obra: código (JE-01…), nome, endereço, cliente, data de início, data de entrega do contrato, situação (Em andamento / Concluída / Parada). | É a própria obra. |
| `materiais_catalogo` | A lista de materiais da empresa: nome, unidade (saco, m³…) e categoria (grosso / acabamento / instalações). Vale para todas as obras. | Não — é cadastro da empresa. |
| `pedidos_material` | Cada cartão do Kanban de Materiais: qual material, quanto, para qual frente, prioridade, coluna (solicitar → cotação → comprado → almoxarifado → entregue), fornecedor, previsão de entrega, o histórico de cada mudança e a conferência do recebimento. | **Sim** — tem `obra_id` obrigatório. |
| `planejamento_atividades` | Cada atividade do Planejamento (Last Planner): a EAP (grupo e subatividades, ordem), início e fim, % feito, coluna da semana (a fazer / em andamento / concluído), se está arquivada, e **dentro dela**: as restrições (o que impede: tipo, prazo, responsável, semana, resolvida), as subtarefas (checklist) e o "não realizado" com a causa raiz. | **Sim** — tem `obra_id` obrigatório. |
| `planejamento_config` | Os dias úteis de cada obra (quais dias da semana se trabalha) e os feriados. Obra sem linha aqui usa o padrão: segunda a sexta e os feriados nacionais. | **Sim** — uma linha por obra. |

Toda tabela tem `id` (um código único gerado pelo banco), `created_at` (quando nasceu) e
`updated_at` (última alteração, atualizado sozinho).

**Regras que o próprio banco garante** (mesmo se o app errar):
- status, prioridade, categoria e situação só aceitam os valores da lista acima
  (os mesmos textos do app);
- quantidade tem que ser maior que zero;
- pedido sem obra ou com material que não existe é recusado;
- datas são guardadas como **dia** (sem hora): o dia digitado é o dia salvo;
- no Planejamento: a subatividade só fica dentro de um grupo da mesma obra; o fim não pode ser antes do início, o % vai de 0 a 100, e o tipo da
  restrição e a causa do "não realizado" só aceitam as opções do app;
- gravar várias atividades de uma vez (ex.: arquivar um grupo com as filhas) passa pela
  função `salvar_atividades_planejamento`: grava tudo junto ou nada, e recusa se alguma
  atividade for de outra obra.

## Quem pode o quê — PROVISÓRIO (modo desenvolvimento)

Hoje o app não tem login, então a porta está aberta para a chave pública:

- `obras` e `materiais_catalogo`: **só leitura**.
- `pedidos_material`, `planejamento_atividades` e `planejamento_config`: ler, criar e
  alterar. **Apagar não** (o banco recusa). Arquivar no Planejamento não apaga nada.
- A proteção por linha (RLS) está **ligada**, mas com regras "deixa passar tudo"
  (as que começam com `dev_`).

⚠️ **Não publique o app na internet antes do Capítulo 15.** Lá estas regras viram:
só quem fez login, e cada pessoa só vê as obras em que trabalha (função `minhas_obras()`).

## O que ainda NÃO está no banco (continua nos dados de exemplo)

- **Quem trabalha em qual obra** (membros) e o login de demonstração.
  O app casa a obra do banco com a do exemplo **pelo código** (JE-01, VN-02, CA-03).
- **Frentes de serviço.** Por isso, no pedido, a frente é guardada como **texto**
  (o nome). Quando as frentes forem para o banco, vira `frente_id`.
- **PPC congelado por semana:** hoje o PPC de uma semana passada é recalculado com a
  situação atual. Guardar o fechamento de cada semana precisa de uma tabela nova.
- **Medições de empreiteiros** (contratos, itens do contrato e boletins): ainda exemplo, sem
  tabela. Quando for para o banco: contratos, itens e boletins levam `obra_id`; status do
  contrato e do boletim com CHECK; valores em numeric(14,2) e quantidades em numeric(14,4).
- Todo o resto (diário, orçamento, cronograma físico-financeiro…): ainda exemplo.

## Dados de exemplo no banco (seed)

O arquivo `supabase-seed.sql` (na pasta do app) carrega 3 obras, 12 materiais e 11
pedidos (9 na JE-01, 2 na VN-02, nenhum na CA-03), e 17 atividades do Planejamento (13 na
JE-01, 4 na VN-02, nenhuma na CA-03). Pode rodar de novo sem duplicar.
Para rodar: peça ao Claude "roda o seed de novo", ou cole no SQL Editor do Supabase.

## Histórico das mudanças (migrations, em `supabase/migrations/`)

1. `20261019-1-obras-e-materiais.sql` — criou as 3 tabelas, as regras e a RLS provisória.
2. `20261019-2-grants-exatos.sql` — tirou permissões a mais que o Supabase dava sozinho
   (inclusive apagar) e desligou essa liberação automática para as próximas tabelas.
3. `20261019-3-planejamento.sql` — criou as 2 tabelas do Planejamento, as regras, a função
   de gravação e a RLS provisória.
4. `20261019-4-planejamento-ajustes.sql` — a subatividade só pode ficar dentro de um grupo
   da mesma obra; restrição sem tipo e "não realizado" sem causa passam a ser recusados.

## Conferências automáticas (`npm run check`)

- `tests/check-schema.mjs` compara as colunas que o código usa com o retrato do banco
  em `tests/_schema-snapshot.json`. **Depois de qualquer migration, atualize o retrato.**
- `tests/check-grants.mjs` confere que toda tabela nova liga a RLS e tem permissão escrita.
