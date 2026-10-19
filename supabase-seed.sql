-- Carga inicial (seed) do banco fmz-obras: obras + módulo Materiais.
-- Gerado a partir de src/lib/mockData.js. Pode rodar de novo: não duplica nada
-- (obras e catálogo pelo código; pedidos só entram na obra que ainda não tem pedido).
-- Rode no SQL Editor do Supabase ou peça ao Claude ("roda o seed de novo").

-- OBRAS
insert into public.obras (codigo, nome, endereco, cliente, data_inicio, data_entrega, situacao) values
  ('JE-01', 'Residencial Jardim Europa', 'Rua das Acácias, 120 — Jardim Europa', 'Paula Mendes', '2026-06-01', '2027-03-15', 'Em andamento'),
  ('VN-02', 'Casa Vila Nova', 'Rua Bento Gonçalves, 45 — Vila Nova', 'Ricardo Teixeira', '2026-07-01', '2026-12-20', 'Em andamento'),
  ('CA-03', 'Casa Alphaville', 'Alameda Itapuã, 300 — Alphaville', 'Fernanda Rocha', '2026-09-15', '2027-09-30', 'Parada')
on conflict (codigo) do nothing;

-- CATÁLOGO DE MATERIAIS
insert into public.materiais_catalogo (codigo, nome, unidade, categoria) values
  ('m-cimento', 'Cimento CP-II 50 kg', 'saco', 'grosso'),
  ('m-areia', 'Areia média', 'm³', 'grosso'),
  ('m-brita', 'Brita 1', 'm³', 'grosso'),
  ('m-bloco', 'Bloco cerâmico 14x19x39', 'un', 'grosso'),
  ('m-vergalhao', 'Vergalhão CA-50 10 mm', 'barra', 'grosso'),
  ('m-argamassa', 'Argamassa AC-II 20 kg', 'saco', 'acabamento'),
  ('m-porcelanato', 'Porcelanato 60x60 acetinado', 'm²', 'acabamento'),
  ('m-tinta', 'Tinta acrílica fosca branca 18 L', 'lata', 'acabamento'),
  ('m-rejunte', 'Rejunte flexível cinza', 'kg', 'acabamento'),
  ('m-fio', 'Fio flexível 2,5 mm² (rolo 100 m)', 'rolo', 'instalacoes'),
  ('m-eletroduto', 'Eletroduto corrugado 25 mm (rolo 50 m)', 'rolo', 'instalacoes'),
  ('m-tubo', 'Tubo PVC esgoto 100 mm (barra 6 m)', 'barra', 'instalacoes')
on conflict (codigo) do nothing;

-- PEDIDOS DE MATERIAL (só se a obra ainda não tiver nenhum)
insert into public.pedidos_material (obra_id, material_id, quantidade, frente, prioridade, status, fornecedor, previsao_entrega, historico, recebimento)
select o.id, m.id, v.quantidade, v.frente, v.prioridade, v.status, v.fornecedor, v.previsao_entrega::date, v.historico, v.recebimento
from (values
  ('JE-01', 'm-cimento', 50, 'Laje do 2º pavimento', 'critico', 'solicitar', '', null, '[{"status":"solicitar","data":"2026-10-17"}]'::jsonb, '{"qtd_bate_nf":null,"estado_ok":null,"avarias":"","foto_nf":""}'::jsonb),
  ('JE-01', 'm-fio', 6, 'Instalações elétricas — tubulação', 'normal', 'solicitar', '', null, '[{"status":"solicitar","data":"2026-10-18"}]'::jsonb, '{"qtd_bate_nf":null,"estado_ok":null,"avarias":"","foto_nf":""}'::jsonb),
  ('JE-01', 'm-bloco', 3000, 'Alvenaria 2º pavimento', 'normal', 'cotacao', '', null, '[{"status":"solicitar","data":"2026-10-10"},{"status":"cotacao","data":"2026-10-13"}]'::jsonb, '{"qtd_bate_nf":null,"estado_ok":null,"avarias":"","foto_nf":""}'::jsonb),
  ('JE-01', 'm-eletroduto', 8, 'Instalações elétricas — tubulação', 'normal', 'cotacao', '', null, '[{"status":"solicitar","data":"2026-10-14"},{"status":"cotacao","data":"2026-10-15"}]'::jsonb, '{"qtd_bate_nf":null,"estado_ok":null,"avarias":"","foto_nf":""}'::jsonb),
  ('JE-01', 'm-vergalhao', 80, 'Laje do 2º pavimento', 'critico', 'comprado', 'Aço Forte Distribuidora', '2026-10-15', '[{"status":"solicitar","data":"2026-10-01"},{"status":"cotacao","data":"2026-10-03"},{"status":"comprado","data":"2026-10-07"}]'::jsonb, '{"qtd_bate_nf":null,"estado_ok":null,"avarias":"","foto_nf":""}'::jsonb),
  ('JE-01', 'm-areia', 12, 'Reboco interno', 'normal', 'comprado', 'Areial São Jorge', '2026-10-22', '[{"status":"solicitar","data":"2026-10-08"},{"status":"cotacao","data":"2026-10-09"},{"status":"comprado","data":"2026-10-12"}]'::jsonb, '{"qtd_bate_nf":null,"estado_ok":null,"avarias":"","foto_nf":""}'::jsonb),
  ('JE-01', 'm-cimento', 40, 'Alvenaria 2º pavimento', 'normal', 'almoxarifado', 'Casa do Construtor Centro', '2026-10-11', '[{"status":"solicitar","data":"2026-09-30"},{"status":"cotacao","data":"2026-10-02"},{"status":"comprado","data":"2026-10-06"},{"status":"almoxarifado","data":"2026-10-11"}]'::jsonb, '{"qtd_bate_nf":true,"estado_ok":false,"avarias":"3 sacos rasgados na descarga","foto_nf":""}'::jsonb),
  ('JE-01', 'm-brita', 8, 'Laje do 2º pavimento', 'normal', 'entregue', 'Pedreira Boa Vista', '2026-09-20', '[{"status":"solicitar","data":"2026-09-10"},{"status":"cotacao","data":"2026-09-12"},{"status":"comprado","data":"2026-09-15"},{"status":"almoxarifado","data":"2026-09-19"},{"status":"entregue","data":"2026-09-22"}]'::jsonb, '{"qtd_bate_nf":true,"estado_ok":true,"avarias":"","foto_nf":""}'::jsonb),
  ('JE-01', 'm-argamassa', 30, 'Reboco interno', 'normal', 'entregue', 'Casa do Construtor Centro', '2026-09-28', '[{"status":"solicitar","data":"2026-09-20"},{"status":"cotacao","data":"2026-09-22"},{"status":"comprado","data":"2026-09-24"},{"status":"almoxarifado","data":"2026-09-29"},{"status":"entregue","data":"2026-10-02"}]'::jsonb, '{"qtd_bate_nf":true,"estado_ok":true,"avarias":"","foto_nf":""}'::jsonb),
  ('VN-02', 'm-cimento', 30, 'Muro de divisa', 'normal', 'solicitar', '', null, '[{"status":"solicitar","data":"2026-10-16"}]'::jsonb, '{"qtd_bate_nf":null,"estado_ok":null,"avarias":"","foto_nf":""}'::jsonb),
  ('VN-02', 'm-bloco', 1500, 'Alvenaria', 'normal', 'comprado', 'Cerâmica Vale Verde', '2026-10-24', '[{"status":"solicitar","data":"2026-10-05"},{"status":"cotacao","data":"2026-10-07"},{"status":"comprado","data":"2026-10-10"}]'::jsonb, '{"qtd_bate_nf":null,"estado_ok":null,"avarias":"","foto_nf":""}'::jsonb)
) as v(obra_codigo, material_codigo, quantidade, frente, prioridade, status, fornecedor, previsao_entrega, historico, recebimento)
join public.obras o on o.codigo = v.obra_codigo
join public.materiais_catalogo m on m.codigo = v.material_codigo
where not exists (select 1 from public.pedidos_material p where p.obra_id = o.id);
