-- 19/10/2026 — Módulo PLANEJAMENTO (Last Planner): atividades da EAP e dias úteis por obra.
-- As 4 abas do app (EAP, longo, médio e curto prazo) usam a mesma lista de atividades.
-- Restrições e subtarefas ficam DENTRO da atividade (jsonb), como no app; o banco confere
-- que o tipo da restrição e a causa do "não realizado" são só os valores do app.
--
-- publico-de-proposito — TEMPORÁRIO, MODO DESENVOLVIMENTO (fecha no Capítulo 15, Login):
-- como Materiais, anon lê e grava (sem apagar) por políticas liberadas "dev_".

-- ---------- ATIVIDADES (lançamento: leva obra_id) ----------
create table public.planejamento_atividades (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras(id) on delete cascade,
  pai_id uuid references public.planejamento_atividades(id) on delete cascade,
  ordem integer not null check (ordem > 0),
  titulo text not null check (length(trim(titulo)) > 0),
  inicio date not null,
  fim date not null,
  progresso integer not null default 0 check (progresso between 0 and 100),
  status text not null default 'a_fazer' check (status in ('a_fazer', 'em_andamento', 'concluido')),
  -- [{id, texto, feita, nao_realizado: null | {causa, obs, semana}}]
  subtarefas jsonb not null default '[]'::jsonb,
  -- [{id, descricao, tipo, prazo, responsavel, semana, resolvida, resolvida_em}]
  restricoes jsonb not null default '[]'::jsonb,
  -- null ou {causa, obs, semana}
  nao_realizado jsonb,
  arquivada boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint planejamento_fim_depois_do_inicio check (fim >= inicio),
  constraint planejamento_listas check (jsonb_typeof(subtarefas) = 'array' and jsonb_typeof(restricoes) = 'array'),
  constraint planejamento_tipo_restricao check (not jsonb_path_exists(restricoes,
    '$[*] ? (!(@.tipo == "material" || @.tipo == "mao_de_obra" || @.tipo == "metodo" || @.tipo == "equipamento" || @.tipo == "projeto" || @.tipo == "seguranca" || @.tipo == "logistica"))')),
  constraint planejamento_causa_atividade check (nao_realizado is null or nao_realizado->>'causa' in
    ('material', 'mao_de_obra', 'projeto', 'equipamento', 'clima', 'servico_anterior', 'metodo', 'seguranca', 'outra')),
  constraint planejamento_causa_subtarefa check (not jsonb_path_exists(subtarefas,
    '$[*].nao_realizado ? (@ != null && !(@.causa == "material" || @.causa == "mao_de_obra" || @.causa == "projeto" || @.causa == "equipamento" || @.causa == "clima" || @.causa == "servico_anterior" || @.causa == "metodo" || @.causa == "seguranca" || @.causa == "outra"))'))
);
create index planejamento_atividades_obra_idx on public.planejamento_atividades (obra_id, ordem);
create index planejamento_atividades_pai_idx on public.planejamento_atividades (pai_id);
create trigger planejamento_atividades_updated_at before update on public.planejamento_atividades
  for each row execute function public.set_updated_at();

-- ---------- DIAS ÚTEIS DA OBRA (uma linha por obra; sem linha = segunda a sexta) ----------
create table public.planejamento_config (
  obra_id uuid primary key references public.obras(id) on delete cascade,
  dias_uteis smallint[] not null default '{1,2,3,4,5}'
    check (cardinality(dias_uteis) between 1 and 7 and dias_uteis <@ '{0,1,2,3,4,5,6}'::smallint[]),
  feriados date[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger planejamento_config_updated_at before update on public.planejamento_config
  for each row execute function public.set_updated_at();

-- ---------- GRAVAR VÁRIAS ATIVIDADES DE UMA VEZ ----------
-- Arquivar um grupo leva as filhas: grava tudo junto ou nada. Se alguma atividade não
-- for da obra informada, desfaz tudo (nunca grava na obra errada). Roda com as
-- permissões de quem chama (security invoker): a RLS continua valendo.
create or replace function public.salvar_atividades_planejamento(p_obra uuid, p_atividades jsonb)
returns setof public.planejamento_atividades
language plpgsql
security invoker
set search_path = ''
as $$
declare
  n integer;
begin
  return query
  with alteradas as (
    update public.planejamento_atividades a set
      pai_id = nullif(x->>'pai_id', '')::uuid,
      ordem = (x->>'ordem')::integer,
      titulo = x->>'titulo',
      inicio = (x->>'inicio')::date,
      fim = (x->>'fim')::date,
      progresso = (x->>'progresso')::integer,
      status = x->>'status',
      subtarefas = coalesce(x->'subtarefas', '[]'::jsonb),
      restricoes = coalesce(x->'restricoes', '[]'::jsonb),
      nao_realizado = case when jsonb_typeof(x->'nao_realizado') = 'object' then x->'nao_realizado' end,
      arquivada = coalesce((x->>'arquivada')::boolean, false)
    from jsonb_array_elements(p_atividades) x
    where a.id = (x->>'id')::uuid and a.obra_id = p_obra
    returning a.*
  )
  select * from alteradas;
  get diagnostics n = row_count;
  if n <> jsonb_array_length(p_atividades) then
    raise exception 'Esta atividade não é da obra aberta. Recarregue a tela.' using errcode = 'P0001';
  end if;
end;
$$;

-- ---------- GRANT (o que o app faz em cada tabela) ----------
grant select, insert, update on public.planejamento_atividades to anon, authenticated;
grant select, insert, update on public.planejamento_config to anon, authenticated;
grant select, insert, update, delete on public.planejamento_atividades, public.planejamento_config to service_role;
grant execute on function public.salvar_atividades_planejamento(uuid, jsonb) to anon, authenticated;

-- ---------- RLS ligada, com políticas PROVISÓRIAS liberadas (dev) ----------
alter table public.planejamento_atividades enable row level security;
alter table public.planejamento_config enable row level security;

create policy "dev_leitura_planejamento" on public.planejamento_atividades
  for select to anon, authenticated using (true);
create policy "dev_insere_planejamento" on public.planejamento_atividades
  for insert to anon, authenticated with check (true);
create policy "dev_edita_planejamento" on public.planejamento_atividades
  for update to anon, authenticated using (true) with check (true);
create policy "dev_leitura_config" on public.planejamento_config
  for select to anon, authenticated using (true);
create policy "dev_insere_config" on public.planejamento_config
  for insert to anon, authenticated with check (true);
create policy "dev_edita_config" on public.planejamento_config
  for update to anon, authenticated using (true) with check (true);
