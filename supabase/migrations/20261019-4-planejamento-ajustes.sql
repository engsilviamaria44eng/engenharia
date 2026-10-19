-- 19/10/2026 — Ajustes da revisão de código no Planejamento.
-- 1) A atividade-pai tem que ser da MESMA obra (antes, uma subatividade da obra A podia
--    apontar para um grupo da obra B). Chave estrangeira composta (pai_id, obra_id).
-- 2) Os CHECKs dos campos jsonb deixavam passar restrição SEM tipo e "não realizado" SEM
--    causa (comparação com valor ausente dá "desconhecido" e o CHECK aceita). Agora a
--    restrição precisa ter um tipo da lista e o "não realizado" uma causa da lista.
-- publico-de-proposito — continua o modo desenvolvimento da migration 3 (fecha no Login).

alter table public.planejamento_atividades
  add constraint planejamento_atividades_id_obra_unico unique (id, obra_id);

alter table public.planejamento_atividades
  drop constraint planejamento_atividades_pai_id_fkey,
  add constraint planejamento_pai_mesma_obra foreign key (pai_id, obra_id)
    references public.planejamento_atividades (id, obra_id) on delete cascade;

alter table public.planejamento_atividades
  drop constraint planejamento_tipo_restricao,
  add constraint planejamento_tipo_restricao check (not jsonb_path_exists(restricoes,
    '$[*] ? (!exists(@.tipo ? (@ == "material" || @ == "mao_de_obra" || @ == "metodo" || @ == "equipamento" || @ == "projeto" || @ == "seguranca" || @ == "logistica")))'));

alter table public.planejamento_atividades
  drop constraint planejamento_causa_atividade,
  add constraint planejamento_causa_atividade check (nao_realizado is null or (jsonb_typeof(nao_realizado) = 'object'
    and coalesce(nao_realizado->>'causa', '') in ('material', 'mao_de_obra', 'projeto', 'equipamento', 'clima', 'servico_anterior', 'metodo', 'seguranca', 'outra')));

alter table public.planejamento_atividades
  drop constraint planejamento_causa_subtarefa,
  add constraint planejamento_causa_subtarefa check (not jsonb_path_exists(subtarefas,
    '$[*].nao_realizado ? (@.type() == "object" && !exists(@.causa ? (@ == "material" || @ == "mao_de_obra" || @ == "projeto" || @ == "equipamento" || @ == "clima" || @ == "servico_anterior" || @ == "metodo" || @ == "seguranca" || @ == "outra")))'));

-- A função de gravação só existe para o app: tira o acesso "de todos" (PUBLIC) e deixa
-- só os papéis que o app usa (anon é a exceção de desenvolvimento).
revoke execute on function public.salvar_atividades_planejamento(uuid, jsonb) from public;
grant execute on function public.salvar_atividades_planejamento(uuid, jsonb) to anon, authenticated;
