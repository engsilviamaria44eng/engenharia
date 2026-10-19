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

## As tabelas (3 até agora)

| Tabela | O que guarda | É de uma obra só? |
|---|---|---|
| `obras` | O cadastro de cada obra: código (JE-01…), nome, endereço, cliente, data de início, data de entrega do contrato, situação (Em andamento / Concluída / Parada). | É a própria obra. |
| `materiais_catalogo` | A lista de materiais da empresa: nome, unidade (saco, m³…) e categoria (grosso / acabamento / instalações). Vale para todas as obras. | Não — é cadastro da empresa. |
| `pedidos_material` | Cada cartão do Kanban de Materiais: qual material, quanto, para qual frente, prioridade, coluna (solicitar → cotação → comprado → almoxarifado → entregue), fornecedor, previsão de entrega, o histórico de cada mudança e a conferência do recebimento. | **Sim** — tem `obra_id` obrigatório. |

Toda tabela tem `id` (um código único gerado pelo banco), `created_at` (quando nasceu) e
`updated_at` (última alteração, atualizado sozinho).

**Regras que o próprio banco garante** (mesmo se o app errar):
- status, prioridade, categoria e situação só aceitam os valores da lista acima
  (os mesmos textos do app);
- quantidade tem que ser maior que zero;
- pedido sem obra ou com material que não existe é recusado;
- datas são guardadas como **dia** (sem hora): o dia digitado é o dia salvo.

## Quem pode o quê — PROVISÓRIO (modo desenvolvimento)

Hoje o app não tem login, então a porta está aberta para a chave pública:

- `obras` e `materiais_catalogo`: **só leitura**.
- `pedidos_material`: ler, criar e alterar. **Apagar não** (o banco recusa).
- A proteção por linha (RLS) está **ligada**, mas com regras "deixa passar tudo"
  (as que começam com `dev_`).

⚠️ **Não publique o app na internet antes do Capítulo 15.** Lá estas regras viram:
só quem fez login, e cada pessoa só vê as obras em que trabalha (função `minhas_obras()`).

## O que ainda NÃO está no banco (continua nos dados de exemplo)

- **Quem trabalha em qual obra** (membros) e o login de demonstração.
  O app casa a obra do banco com a do exemplo **pelo código** (JE-01, VN-02, CA-03).
- **Frentes de serviço.** Por isso, no pedido, a frente é guardada como **texto**
  (o nome). Quando as frentes forem para o banco, vira `frente_id`.
- Todo o resto (diário, orçamento, cronograma…): ainda exemplo.

## Dados de exemplo no banco (seed)

O arquivo `supabase-seed.sql` (na pasta do app) carrega 3 obras, 12 materiais e 11
pedidos (9 na JE-01, 2 na VN-02, nenhum na CA-03). Pode rodar de novo sem duplicar.
Para rodar: peça ao Claude "roda o seed de novo", ou cole no SQL Editor do Supabase.

## Histórico das mudanças (migrations, em `supabase/migrations/`)

1. `20261019-obras-e-materiais.sql` — criou as 3 tabelas, as regras e a RLS provisória.
2. `20261019-grants-exatos.sql` — tirou permissões a mais que o Supabase dava sozinho
   (inclusive apagar) e desligou essa liberação automática para as próximas tabelas.

## Conferências automáticas (`npm run check`)

- `tests/check-schema.mjs` compara as colunas que o código usa com o retrato do banco
  em `tests/_schema-snapshot.json`. **Depois de qualquer migration, atualize o retrato.**
- `tests/check-grants.mjs` confere que toda tabela nova liga a RLS e tem permissão escrita.
