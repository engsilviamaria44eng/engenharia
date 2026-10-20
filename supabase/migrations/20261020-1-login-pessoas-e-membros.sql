-- ============================================================================
-- LOGIN, ETAPA 1: quem é cada pessoa (profiles), quem trabalha em qual obra
-- (membros) e as regras por obra. Aplicada em 20/10/2026.
--
-- O que muda para quem FEZ LOGIN (authenticated): só vê as obras em que é membro;
-- pedidos de material e Planejamento, só o engenheiro da obra.
-- O que NÃO muda ainda: quem não fez login (anon) continua com a porta de
-- desenvolvimento (políticas dev_*, agora só para anon) até a ETAPA 2, quando a tela
-- de login entra e a porta fecha junto (migration 20261020-2). Assim o app nunca
-- fica quebrado entre uma etapa e outra.
-- ============================================================================

-- ---------- profiles: uma linha por pessoa com login ----------
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  nome       text not null default '',
  role       text not null default 'Cliente' check (role in ('Engenheiro', 'Mestre', 'Cliente')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Ao criar um login, nasce o perfil. O papel é SEMPRE o menor (Cliente/Proprietário):
-- o que vier nos metadados do cadastro é ignorado. Promover é com o engenheiro,
-- pelo painel do Supabase ou por função no servidor, nunca pelo navegador.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, nome, role)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'nome'), ''), nullif(trim(new.raw_user_meta_data->>'name'), ''), split_part(new.email, '@', 1), ''),
    'Cliente'
  );
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- membros: quem trabalha em qual obra, e com que papel ----------
create table public.membros (
  obra_id    uuid not null references public.obras (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  papel      text not null check (papel in ('Engenheiro', 'Mestre', 'Cliente')),
  created_at timestamptz not null default now(),
  primary key (obra_id, profile_id)
);
create index membros_profile_idx on public.membros (profile_id);

-- ---------- as funções das regras (uma resposta por consulta, não por linha) ----------
-- As obras em que eu (quem fez login) sou membro.
create or replace function public.minhas_obras()
returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select obra_id from public.membros where profile_id = (select auth.uid());
$$;

-- As obras em que eu sou o ENGENHEIRO (orçamento, materiais, planejamento).
create or replace function public.obras_que_engenheiro()
returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select obra_id from public.membros where profile_id = (select auth.uid()) and papel = 'Engenheiro';
$$;

revoke all on function public.minhas_obras() from public, anon;
revoke all on function public.obras_que_engenheiro() from public, anon;
grant execute on function public.minhas_obras() to authenticated;
grant execute on function public.obras_que_engenheiro() to authenticated;

-- ---------- RLS e GRANT das tabelas novas ----------
alter table public.profiles enable row level security;
alter table public.membros enable row level security;

-- Perfil: vejo o meu e o de quem divide alguma obra comigo (o nome na tela).
-- Ninguém de outra obra aparece.
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid())
         or id in (select m.profile_id from public.membros m where m.obra_id in (select public.minhas_obras())));
-- Cada um muda só o próprio NOME (a coluna role não tem grant de update: a trava do papel).
create policy profiles_update_dono on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Membros: vejo a equipe das minhas obras. Incluir e tirar gente é com o engenheiro,
-- por função no servidor (Etapa 3, Convidar) — nada de gravar pelo navegador.
create policy membros_select on public.membros for select to authenticated
  using (obra_id in (select public.minhas_obras()));

revoke all on public.profiles from anon;
revoke all on public.membros from anon;
revoke insert, update, delete on public.profiles from authenticated;
revoke insert, update, delete on public.membros from authenticated;
grant select on public.profiles to authenticated;
grant update (nome) on public.profiles to authenticated;
grant select on public.membros to authenticated;
grant select, insert, update, delete on public.profiles to service_role;
grant select, insert, update, delete on public.membros to service_role;

-- ---------- as tabelas que já existiam: regras de verdade para quem fez login ----------
-- A porta de desenvolvimento passa a valer SÓ para anon (sai na Etapa 2).
alter policy dev_leitura_obras on public.obras to anon;
alter policy dev_leitura_catalogo on public.materiais_catalogo to anon;
alter policy dev_leitura_pedidos on public.pedidos_material to anon;
alter policy dev_insere_pedidos on public.pedidos_material to anon;
alter policy dev_edita_pedidos on public.pedidos_material to anon;
alter policy dev_leitura_planejamento on public.planejamento_atividades to anon;
alter policy dev_insere_planejamento on public.planejamento_atividades to anon;
alter policy dev_edita_planejamento on public.planejamento_atividades to anon;
alter policy dev_leitura_config on public.planejamento_config to anon;
alter policy dev_insere_config on public.planejamento_config to anon;
alter policy dev_edita_config on public.planejamento_config to anon;

-- Obras: cada membro vê as obras dele (o proprietário, só a dele).
create policy obras_select on public.obras for select to authenticated
  using (id in (select public.minhas_obras()));

-- Catálogo de materiais: é da empresa; quem usa é o engenheiro.
create policy catalogo_select on public.materiais_catalogo for select to authenticated
  using (exists (select 1 from public.obras_que_engenheiro()));

-- Pedidos de material: só o engenheiro da obra (o Kanban é dele).
create policy pedidos_select on public.pedidos_material for select to authenticated
  using (obra_id in (select public.obras_que_engenheiro()));
create policy pedidos_insert on public.pedidos_material for insert to authenticated
  with check (obra_id in (select public.obras_que_engenheiro()));
create policy pedidos_update on public.pedidos_material for update to authenticated
  using (obra_id in (select public.obras_que_engenheiro()))
  with check (obra_id in (select public.obras_que_engenheiro()));

-- Planejamento (atividades e dias úteis): só o engenheiro da obra.
create policy planejamento_select on public.planejamento_atividades for select to authenticated
  using (obra_id in (select public.obras_que_engenheiro()));
create policy planejamento_insert on public.planejamento_atividades for insert to authenticated
  with check (obra_id in (select public.obras_que_engenheiro()));
create policy planejamento_update on public.planejamento_atividades for update to authenticated
  using (obra_id in (select public.obras_que_engenheiro()))
  with check (obra_id in (select public.obras_que_engenheiro()));

create policy config_select on public.planejamento_config for select to authenticated
  using (obra_id in (select public.obras_que_engenheiro()));
create policy config_insert on public.planejamento_config for insert to authenticated
  with check (obra_id in (select public.obras_que_engenheiro()));
create policy config_update on public.planejamento_config for update to authenticated
  using (obra_id in (select public.obras_que_engenheiro()))
  with check (obra_id in (select public.obras_que_engenheiro()));
