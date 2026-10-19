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

-- PLANEJAMENTO (atividades da EAP). O id de cada atividade é fixo (vem do id do exemplo),
-- então rodar de novo não duplica. Grupos vêm antes das subatividades.
insert into public.planejamento_atividades (id, obra_id, pai_id, ordem, titulo, inicio, fim, progresso, status, subtarefas, restricoes, nao_realizado, arquivada) values
  ('8591a659-170e-4008-a934-ead7b2d56dc5', (select id from public.obras where codigo = 'JE-01'), null, 1, 'Estrutura', '2026-06-01', '2026-10-16', 0, 'a_fazer', '[]'::jsonb, '[]'::jsonb, null, false),
  ('8bd80608-9d55-4214-a30d-75f5d4858c91', (select id from public.obras where codigo = 'JE-01'), '8591a659-170e-4008-a934-ead7b2d56dc5', 1, 'Fundação', '2026-06-01', '2026-07-17', 100, 'concluido', '[]'::jsonb, '[]'::jsonb, null, false),
  ('9a493a1b-4fba-41e7-a8fd-def7d703dce7', (select id from public.obras where codigo = 'JE-01'), '8591a659-170e-4008-a934-ead7b2d56dc5', 2, 'Laje do 2º pavimento', '2026-09-14', '2026-10-16', 40, 'em_andamento', '[{"id":"st-01","texto":"Escoramento e fôrmas","feita":true,"nao_realizado":null},{"id":"st-02","texto":"Armação (vergalhão CA-50)","feita":false,"nao_realizado":{"causa":"material","obs":"","semana":"2026-10-12"}},{"id":"st-03","texto":"Concretagem","feita":false,"nao_realizado":null}]'::jsonb, '[{"id":"rs-01","descricao":"Vergalhão CA-50 atrasado no fornecedor","tipo":"material","prazo":"2026-10-21","responsavel":"Compras","semana":"2026-10-19","resolvida":false},{"id":"rs-02","descricao":"Confirmar bomba de concreto para a concretagem","tipo":"equipamento","prazo":"2026-10-28","responsavel":"Engenheiro","semana":"2026-10-26","resolvida":false}]'::jsonb, '{"causa":"material","obs":"Vergalhão não chegou","semana":"2026-10-12"}'::jsonb, false),
  ('62048b65-b177-49cc-a540-f6b310bbb5ec', (select id from public.obras where codigo = 'JE-01'), null, 2, 'Alvenaria', '2026-08-03', '2026-11-13', 0, 'a_fazer', '[]'::jsonb, '[]'::jsonb, null, false),
  ('53881e69-43ed-455a-aba1-f311ebad48d1', (select id from public.obras where codigo = 'JE-01'), '62048b65-b177-49cc-a540-f6b310bbb5ec', 1, 'Alvenaria 1º pavimento', '2026-08-03', '2026-10-20', 100, 'concluido', '[]'::jsonb, '[]'::jsonb, null, false),
  ('f4637c22-6a85-4b60-adc5-18586ba9788d', (select id from public.obras where codigo = 'JE-01'), '62048b65-b177-49cc-a540-f6b310bbb5ec', 2, 'Alvenaria 2º pavimento', '2026-10-05', '2026-11-13', 60, 'em_andamento', '[{"id":"st-04","texto":"Marcação da 1ª fiada","feita":true,"nao_realizado":null},{"id":"st-05","texto":"Elevação até o respaldo","feita":false,"nao_realizado":null},{"id":"st-06","texto":"Vergas e contravergas","feita":false,"nao_realizado":null}]'::jsonb, '[{"id":"rs-03","descricao":"Contratar o 2º pedreiro da equipe","tipo":"mao_de_obra","prazo":"2026-10-09","responsavel":"Mestre Ricardo","semana":"2026-10-05","resolvida":true}]'::jsonb, null, false),
  ('66b3f30f-87c1-4e1a-aa8d-038b3ca4726e', (select id from public.obras where codigo = 'JE-01'), null, 3, 'Instalações', '2026-10-01', '2026-11-06', 0, 'a_fazer', '[]'::jsonb, '[]'::jsonb, null, false),
  ('cfc0ca82-c07e-4211-a854-4616e2b64af1', (select id from public.obras where codigo = 'JE-01'), '66b3f30f-87c1-4e1a-aa8d-038b3ca4726e', 1, 'Elétrica — tubulação', '2026-10-01', '2026-10-23', 25, 'em_andamento', '[{"id":"st-07","texto":"Eletrodutos na laje","feita":true,"nao_realizado":null},{"id":"st-08","texto":"Caixas 4x2 nas paredes","feita":false,"nao_realizado":null}]'::jsonb, '[]'::jsonb, null, false),
  ('e0977502-ebc3-4664-a706-478fab11d4da', (select id from public.obras where codigo = 'JE-01'), '66b3f30f-87c1-4e1a-aa8d-038b3ca4726e', 2, 'Hidráulica — água fria', '2026-10-19', '2026-11-06', 0, 'a_fazer', '[]'::jsonb, '[{"id":"rs-04","descricao":"Compatibilizar o shaft com a estrutura","tipo":"projeto","prazo":"2026-10-23","responsavel":"Engenheiro","semana":"2026-10-19","resolvida":false}]'::jsonb, null, false),
  ('0dfb3125-baad-43ac-a0cd-f7371a6bf85b', (select id from public.obras where codigo = 'JE-01'), null, 4, 'Revestimento e acabamento', '2026-10-13', '2026-12-18', 0, 'a_fazer', '[]'::jsonb, '[]'::jsonb, null, false),
  ('d1e85f4d-18bc-423c-ad14-8f128dcfc0d6', (select id from public.obras where codigo = 'JE-01'), '0dfb3125-baad-43ac-a0cd-f7371a6bf85b', 1, 'Chapisco interno', '2026-10-13', '2026-10-21', 100, 'concluido', '[]'::jsonb, '[]'::jsonb, null, false),
  ('5d6411ed-7ea4-4775-aca5-3499a60f5c26', (select id from public.obras where codigo = 'JE-01'), '0dfb3125-baad-43ac-a0cd-f7371a6bf85b', 2, 'Reboco interno', '2026-10-22', '2026-11-20', 0, 'a_fazer', '[]'::jsonb, '[{"id":"rs-05","descricao":"Receber a areia média do Areial São Jorge","tipo":"material","prazo":"2026-10-22","responsavel":"Compras","semana":"2026-10-19","resolvida":true}]'::jsonb, null, false),
  ('67620b44-64cf-4861-a009-4112a1645507', (select id from public.obras where codigo = 'JE-01'), '0dfb3125-baad-43ac-a0cd-f7371a6bf85b', 3, 'Gesso forro', '2026-11-23', '2026-12-18', 0, 'a_fazer', '[]'::jsonb, '[{"id":"rs-06","descricao":"Fechar contrato com a Gesso & Cia","tipo":"mao_de_obra","prazo":"2026-11-13","responsavel":"Engenheiro","semana":"2026-11-09","resolvida":true}]'::jsonb, null, false),
  ('4c5e587b-b3c1-427b-acbc-b78b2e3212ab', (select id from public.obras where codigo = 'VN-02'), null, 1, 'Alvenaria e muro', '2026-09-21', '2026-11-13', 0, 'a_fazer', '[]'::jsonb, '[]'::jsonb, null, false),
  ('0a4e2ac3-be68-4418-adfd-801b87c6cda9', (select id from public.obras where codigo = 'VN-02'), '4c5e587b-b3c1-427b-acbc-b78b2e3212ab', 1, 'Alvenaria do pavimento superior', '2026-09-21', '2026-10-23', 85, 'em_andamento', '[]'::jsonb, '[]'::jsonb, null, false),
  ('3c4fb841-b493-4adf-ab93-01704a93b5fe', (select id from public.obras where codigo = 'VN-02'), '4c5e587b-b3c1-427b-acbc-b78b2e3212ab', 2, 'Muro de divisa', '2026-10-26', '2026-11-13', 0, 'a_fazer', '[]'::jsonb, '[]'::jsonb, null, false),
  ('5f190af7-8223-4bc7-a245-1e59c616b909', (select id from public.obras where codigo = 'VN-02'), null, 2, 'Contrapiso do térreo', '2026-10-13', '2026-10-30', 70, 'em_andamento', '[]'::jsonb, '[]'::jsonb, null, false)
on conflict (id) do nothing;
