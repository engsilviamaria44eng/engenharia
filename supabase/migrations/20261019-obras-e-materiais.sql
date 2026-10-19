-- 19/10/2026 — Primeira migration: obras (entidade principal, multi-obra) e o módulo Materiais.
-- Projeto Supabase: fmz-obras (sa-east-1).
--
-- publico-de-proposito — TEMPORÁRIO, MODO DESENVOLVIMENTO:
-- o app ainda não tem login (roda só no computador do engenheiro), então as tabelas
-- abaixo aceitam leitura e gravação pela chave pública (papel anon) com políticas
-- liberadas. Isto CONTRARIA a regra "tabela nasce fechada" de propósito e será
-- trocado no Capítulo 15 (Login) por GRANT só para authenticated e RLS por obra
-- (função minhas_obras()). Não publicar o app na internet antes disso.

-- updated_at automático
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- OBRAS ----------
create table public.obras (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  endereco text,
  cliente text not null,
  data_inicio date not null,
  data_entrega date not null,          -- data-meta de entrega = a do contrato
  situacao text not null default 'Em andamento'
    check (situacao in ('Em andamento', 'Concluída', 'Parada')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger obras_updated_at before update on public.obras
  for each row execute function public.set_updated_at();

-- ---------- CATÁLOGO DE MATERIAIS (cadastro da empresa, vale para todas as obras) ----------
create table public.materiais_catalogo (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,          -- ex.: m-cimento (o mesmo id do mock)
  nome text not null,
  unidade text not null,
  categoria text not null check (categoria in ('grosso', 'acabamento', 'instalacoes')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger materiais_catalogo_updated_at before update on public.materiais_catalogo
  for each row execute function public.set_updated_at();

-- ---------- PEDIDOS DE MATERIAL (Kanban) — lançamento: leva obra_id ----------
create table public.pedidos_material (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras(id) on delete cascade,
  material_id uuid not null references public.materiais_catalogo(id),
  quantidade numeric(14,3) not null check (quantidade > 0),
  frente text not null,                 -- nome da frente (vira frente_id quando frentes for para o banco)
  prioridade text not null default 'normal' check (prioridade in ('normal', 'critico')),
  status text not null default 'solicitar'
    check (status in ('solicitar', 'cotacao', 'comprado', 'almoxarifado', 'entregue')),
  fornecedor text not null default '',
  previsao_entrega date,
  historico jsonb not null default '[]'::jsonb,       -- [{status, data}]
  recebimento jsonb not null default '{"qtd_bate_nf": null, "estado_ok": null, "avarias": "", "foto_nf": ""}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index pedidos_material_obra_status_idx on public.pedidos_material (obra_id, status);
create index pedidos_material_material_idx on public.pedidos_material (material_id);
create trigger pedidos_material_updated_at before update on public.pedidos_material
  for each row execute function public.set_updated_at();

-- ---------- GRANT (o que o app faz em cada tabela) ----------
grant select on public.obras to anon, authenticated;
grant select on public.materiais_catalogo to anon, authenticated;
grant select, insert, update on public.pedidos_material to anon, authenticated;
grant select, insert, update, delete on public.obras, public.materiais_catalogo, public.pedidos_material to service_role;

-- ---------- RLS ligada, com políticas PROVISÓRIAS liberadas (dev) ----------
alter table public.obras enable row level security;
alter table public.materiais_catalogo enable row level security;
alter table public.pedidos_material enable row level security;

create policy "dev_leitura_obras" on public.obras
  for select to anon, authenticated using (true);
create policy "dev_leitura_catalogo" on public.materiais_catalogo
  for select to anon, authenticated using (true);
create policy "dev_leitura_pedidos" on public.pedidos_material
  for select to anon, authenticated using (true);
create policy "dev_insere_pedidos" on public.pedidos_material
  for insert to anon, authenticated with check (true);
create policy "dev_edita_pedidos" on public.pedidos_material
  for update to anon, authenticated using (true) with check (true);
