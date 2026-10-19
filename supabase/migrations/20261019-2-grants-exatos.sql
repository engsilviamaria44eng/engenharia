-- 19/10/2026 — Permissões exatas.
-- O projeto veio com a liberação automática antiga do Supabase: toda tabela nova em
-- public ganhava TODAS as permissões (inclusive DELETE e TRUNCATE) para anon e
-- authenticated. Aqui tiramos tudo e devolvemos só o que o app usa, e desligamos a
-- liberação automática para as próximas tabelas (cada migration escreve o seu GRANT).
--
-- publico-de-proposito — TEMPORÁRIO, MODO DESENVOLVIMENTO (fecha no Capítulo 15, Login):
-- anon ainda recebe leitura/gravação porque o app roda sem login.

revoke all on public.obras, public.materiais_catalogo, public.pedidos_material from anon, authenticated;

grant select on public.obras to anon, authenticated;
grant select on public.materiais_catalogo to anon, authenticated;
grant select, insert, update on public.pedidos_material to anon, authenticated;

alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated;
