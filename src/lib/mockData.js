// Dados de exemplo (Etapa 4). Na Etapa 7 estas mesmas obras viram o seed do banco.
// Três obras propositalmente diferentes, para o defeito de multi-obra aparecer cedo:
// - JE-01: 6 frentes, uma parada e uma atrasada (entrega em risco);
// - VN-02: 3 frentes, tudo no prazo;
// - CA-03: parada e sem nenhuma frente (estado vazio).
// TODO registro de lançamento leva obra_id.

export const OBRAS = [
  {
    id: 'obra-je', codigo: 'JE-01', nome: 'Residencial Jardim Europa',
    endereco: 'Rua das Acácias, 120 — Jardim Europa', cliente: 'Paula Mendes',
    data_inicio: '2026-06-01', data_entrega: '2027-03-15', situacao: 'Em andamento',
  },
  {
    id: 'obra-vn', codigo: 'VN-02', nome: 'Casa Vila Nova',
    endereco: 'Rua Bento Gonçalves, 45 — Vila Nova', cliente: 'Ricardo Teixeira',
    data_inicio: '2026-07-01', data_entrega: '2026-12-20', situacao: 'Em andamento',
  },
  {
    id: 'obra-ca', codigo: 'CA-03', nome: 'Casa Alphaville',
    endereco: 'Alameda Itapuã, 300 — Alphaville', cliente: 'Fernanda Rocha',
    data_inicio: '2026-09-15', data_entrega: '2027-09-30', situacao: 'Parada',
  },
]

// Pessoas de exemplo (login de demonstração) e o papel de cada uma.
export const USUARIOS = [
  { id: 'u-eng', nome: 'Silvia Costa', role: 'Engenheiro' },
  { id: 'u-welton', nome: 'Welton Amorim', role: 'Mestre' },
  { id: 'u-marcos', nome: 'Marcos Dias', role: 'Mestre' },
  { id: 'u-paula', nome: 'Paula Mendes', role: 'Cliente' },
]

// Quem trabalha em qual obra (vira a tabela `membros`).
export const MEMBROS = [
  { obra_id: 'obra-je', profile_id: 'u-eng', papel: 'Engenheiro' },
  { obra_id: 'obra-vn', profile_id: 'u-eng', papel: 'Engenheiro' },
  { obra_id: 'obra-ca', profile_id: 'u-eng', papel: 'Engenheiro' },
  { obra_id: 'obra-je', profile_id: 'u-welton', papel: 'Mestre' },
  { obra_id: 'obra-vn', profile_id: 'u-marcos', papel: 'Mestre' },
  { obra_id: 'obra-je', profile_id: 'u-paula', papel: 'Cliente' },
]

// Frentes de serviço. folga e dias_sem_andar já calculados (o cálculo real
// a partir do diário entra no módulo do Painel).
export const FRENTES = [
  { id: 'f-laje', obra_id: 'obra-je', servico: 'Laje do 2º pavimento', ambiente: 'Estrutura', responsavel: 'Construtora Pereira', avanco: 40, dias_sem_andar: 17, data_limite: null, folga: null, parada: true, status: 'Em andamento' },
  { id: 'f-eletr', obra_id: 'obra-je', servico: 'Instalações elétricas — tubulação', ambiente: 'Sala', responsavel: 'Elétrica Luz Forte', avanco: 25, dias_sem_andar: 3, data_limite: '2026-10-15', folga: -3, parada: false, status: 'Em andamento' },
  { id: 'f-alv', obra_id: 'obra-je', servico: 'Alvenaria 2º pavimento', ambiente: 'Suíte 1', responsavel: 'Silva Alvenarias', avanco: 60, dias_sem_andar: 5, data_limite: '2026-10-23', folga: 5, parada: false, status: 'Em andamento' },
  { id: 'f-reb', obra_id: 'obra-je', servico: 'Reboco interno', ambiente: 'Cozinha', responsavel: 'Equipe própria', avanco: 10, dias_sem_andar: 2, data_limite: '2026-11-09', folga: 22, parada: false, status: 'Em andamento' },
  { id: 'f-gesso', obra_id: 'obra-je', servico: 'Gesso forro', ambiente: 'Sala', responsavel: 'Gesso & Cia', avanco: 0, dias_sem_andar: null, data_limite: '2026-12-02', folga: 45, parada: false, status: 'Não iniciada' },
  { id: 'f-fund', obra_id: 'obra-je', servico: 'Fundação', ambiente: 'Estrutura', responsavel: 'Construtora Pereira', avanco: 100, dias_sem_andar: null, data_limite: null, folga: null, parada: false, status: 'Concluída' },
  { id: 'f-alv2', obra_id: 'obra-vn', servico: 'Alvenaria', ambiente: 'Pavimento superior', responsavel: 'Silva Alvenarias', avanco: 85, dias_sem_andar: 1, data_limite: '2026-10-20', folga: 2, parada: false, status: 'Em andamento' },
  { id: 'f-muro', obra_id: 'obra-vn', servico: 'Muro de divisa', ambiente: 'Área externa', responsavel: 'Equipe própria', avanco: 0, dias_sem_andar: 8, data_limite: '2026-10-28', folga: 10, parada: false, status: 'Não iniciada' },
  { id: 'f-contra', obra_id: 'obra-vn', servico: 'Contrapiso', ambiente: 'Térreo', responsavel: 'Equipe própria', avanco: 70, dias_sem_andar: 1, data_limite: '2026-11-02', folga: 15, parada: false, status: 'Em andamento' },
]

// ---------- MATERIAIS (Kanban de pedidos) ----------
// Catálogo da empresa: vale para todas as obras (é cadastro, não lançamento).
export const MATERIAIS_CATALOGO = [
  { id: 'm-cimento', nome: 'Cimento CP-II 50 kg', unidade: 'saco', categoria: 'grosso' },
  { id: 'm-areia', nome: 'Areia média', unidade: 'm³', categoria: 'grosso' },
  { id: 'm-brita', nome: 'Brita 1', unidade: 'm³', categoria: 'grosso' },
  { id: 'm-bloco', nome: 'Bloco cerâmico 14x19x39', unidade: 'un', categoria: 'grosso' },
  { id: 'm-vergalhao', nome: 'Vergalhão CA-50 10 mm', unidade: 'barra', categoria: 'grosso' },
  { id: 'm-argamassa', nome: 'Argamassa AC-II 20 kg', unidade: 'saco', categoria: 'acabamento' },
  { id: 'm-porcelanato', nome: 'Porcelanato 60x60 acetinado', unidade: 'm²', categoria: 'acabamento' },
  { id: 'm-tinta', nome: 'Tinta acrílica fosca branca 18 L', unidade: 'lata', categoria: 'acabamento' },
  { id: 'm-rejunte', nome: 'Rejunte flexível cinza', unidade: 'kg', categoria: 'acabamento' },
  { id: 'm-fio', nome: 'Fio flexível 2,5 mm² (rolo 100 m)', unidade: 'rolo', categoria: 'instalacoes' },
  { id: 'm-eletroduto', nome: 'Eletroduto corrugado 25 mm (rolo 50 m)', unidade: 'rolo', categoria: 'instalacoes' },
  { id: 'm-tubo', nome: 'Tubo PVC esgoto 100 mm (barra 6 m)', unidade: 'barra', categoria: 'instalacoes' },
]

// Pedidos: cada um é um lote de material numa obra. Hoje dos exemplos = 19/10/2026.
// JE-01: 9 pedidos em todas as colunas, 2 críticos, 1 atrasado (vergalhão), 1 com
// alerta de recebimento (cimento com sacos rasgados) e 2 entregues.
// VN-02: 2 pedidos. CA-03 (parada): nenhum, para a tela vazia.
const sem = { qtd_bate_nf: null, estado_ok: null, avarias: '', foto_nf: '' }
export const PEDIDOS = [
  { id: 'pd-01', obra_id: 'obra-je', material_id: 'm-cimento', quantidade: 50, frente: 'Laje do 2º pavimento', prioridade: 'critico', status: 'solicitar', fornecedor: '', previsao_entrega: '', historico: [{ status: 'solicitar', data: '2026-10-17' }], recebimento: { ...sem } },
  { id: 'pd-02', obra_id: 'obra-je', material_id: 'm-fio', quantidade: 6, frente: 'Instalações elétricas — tubulação', prioridade: 'normal', status: 'solicitar', fornecedor: '', previsao_entrega: '', historico: [{ status: 'solicitar', data: '2026-10-18' }], recebimento: { ...sem } },
  { id: 'pd-03', obra_id: 'obra-je', material_id: 'm-bloco', quantidade: 3000, frente: 'Alvenaria 2º pavimento', prioridade: 'normal', status: 'cotacao', fornecedor: '', previsao_entrega: '', historico: [{ status: 'solicitar', data: '2026-10-10' }, { status: 'cotacao', data: '2026-10-13' }], recebimento: { ...sem } },
  { id: 'pd-04', obra_id: 'obra-je', material_id: 'm-eletroduto', quantidade: 8, frente: 'Instalações elétricas — tubulação', prioridade: 'normal', status: 'cotacao', fornecedor: '', previsao_entrega: '', historico: [{ status: 'solicitar', data: '2026-10-14' }, { status: 'cotacao', data: '2026-10-15' }], recebimento: { ...sem } },
  { id: 'pd-05', obra_id: 'obra-je', material_id: 'm-vergalhao', quantidade: 80, frente: 'Laje do 2º pavimento', prioridade: 'critico', status: 'comprado', fornecedor: 'Aço Forte Distribuidora', previsao_entrega: '2026-10-15', historico: [{ status: 'solicitar', data: '2026-10-01' }, { status: 'cotacao', data: '2026-10-03' }, { status: 'comprado', data: '2026-10-07' }], recebimento: { ...sem } },
  { id: 'pd-06', obra_id: 'obra-je', material_id: 'm-areia', quantidade: 12, frente: 'Reboco interno', prioridade: 'normal', status: 'comprado', fornecedor: 'Areial São Jorge', previsao_entrega: '2026-10-22', historico: [{ status: 'solicitar', data: '2026-10-08' }, { status: 'cotacao', data: '2026-10-09' }, { status: 'comprado', data: '2026-10-12' }], recebimento: { ...sem } },
  { id: 'pd-07', obra_id: 'obra-je', material_id: 'm-cimento', quantidade: 40, frente: 'Alvenaria 2º pavimento', prioridade: 'normal', status: 'almoxarifado', fornecedor: 'Casa do Construtor Centro', previsao_entrega: '2026-10-11', historico: [{ status: 'solicitar', data: '2026-09-30' }, { status: 'cotacao', data: '2026-10-02' }, { status: 'comprado', data: '2026-10-06' }, { status: 'almoxarifado', data: '2026-10-11' }], recebimento: { qtd_bate_nf: true, estado_ok: false, avarias: '3 sacos rasgados na descarga', foto_nf: '' } },
  { id: 'pd-08', obra_id: 'obra-je', material_id: 'm-brita', quantidade: 8, frente: 'Laje do 2º pavimento', prioridade: 'normal', status: 'entregue', fornecedor: 'Pedreira Boa Vista', previsao_entrega: '2026-09-20', historico: [{ status: 'solicitar', data: '2026-09-10' }, { status: 'cotacao', data: '2026-09-12' }, { status: 'comprado', data: '2026-09-15' }, { status: 'almoxarifado', data: '2026-09-19' }, { status: 'entregue', data: '2026-09-22' }], recebimento: { qtd_bate_nf: true, estado_ok: true, avarias: '', foto_nf: '' } },
  { id: 'pd-09', obra_id: 'obra-je', material_id: 'm-argamassa', quantidade: 30, frente: 'Reboco interno', prioridade: 'normal', status: 'entregue', fornecedor: 'Casa do Construtor Centro', previsao_entrega: '2026-09-28', historico: [{ status: 'solicitar', data: '2026-09-20' }, { status: 'cotacao', data: '2026-09-22' }, { status: 'comprado', data: '2026-09-24' }, { status: 'almoxarifado', data: '2026-09-29' }, { status: 'entregue', data: '2026-10-02' }], recebimento: { qtd_bate_nf: true, estado_ok: true, avarias: '', foto_nf: '' } },
  { id: 'pd-10', obra_id: 'obra-vn', material_id: 'm-cimento', quantidade: 30, frente: 'Muro de divisa', prioridade: 'normal', status: 'solicitar', fornecedor: '', previsao_entrega: '', historico: [{ status: 'solicitar', data: '2026-10-16' }], recebimento: { ...sem } },
  { id: 'pd-11', obra_id: 'obra-vn', material_id: 'm-bloco', quantidade: 1500, frente: 'Alvenaria', prioridade: 'normal', status: 'comprado', fornecedor: 'Cerâmica Vale Verde', previsao_entrega: '2026-10-24', historico: [{ status: 'solicitar', data: '2026-10-05' }, { status: 'cotacao', data: '2026-10-07' }, { status: 'comprado', data: '2026-10-10' }], recebimento: { ...sem } },
]

// ---------- PLANEJAMENTO (Last Planner) ----------
// Uma lista só de atividades por obra, usada pelas 4 abas (EAP, longo, médio e curto prazo).
// Hoje dos exemplos = segunda 19/10/2026; semana atual = 19/10 a 23/10.
// JE-01: 4 grupos e 9 atividades; 2 concluídas nesta semana (o PPC já aparece), 1 acumulada
// (laje, devia ter terminado em 16/10; ficou como não realizada na semana passada, por
// falta de material) e 2 impedidas por restrição aberta.
// VN-02: poucos registros (1 grupo, 3 atividades). CA-03 (parada): nenhuma, para a tela vazia.
// Restrição: { id, descricao, tipo, prazo, responsavel, semana (segunda-feira), resolvida }.
// Subtarefa: { id, texto, feita, nao_realizado }. nao_realizado: null ou { causa, obs }.
const atv = (a) => ({ progresso: 0, status: 'a_fazer', subtarefas: [], restricoes: [], nao_realizado: null, arquivada: false, ...a })
export const ATIVIDADES_PLANEJAMENTO = [
  atv({ id: 'at-01', obra_id: 'obra-je', pai_id: null, ordem: 1, titulo: 'Estrutura', inicio: '2026-06-01', fim: '2026-10-16' }),
  atv({ id: 'at-02', obra_id: 'obra-je', pai_id: 'at-01', ordem: 1, titulo: 'Fundação', inicio: '2026-06-01', fim: '2026-07-17', progresso: 100, status: 'concluido' }),
  atv({
    id: 'at-03', obra_id: 'obra-je', pai_id: 'at-01', ordem: 2, titulo: 'Laje do 2º pavimento', inicio: '2026-09-14', fim: '2026-10-16', progresso: 40, status: 'em_andamento',
    nao_realizado: { causa: 'material', obs: 'Vergalhão não chegou', semana: '2026-10-12' },
    subtarefas: [
      { id: 'st-01', texto: 'Escoramento e fôrmas', feita: true, nao_realizado: null },
      { id: 'st-02', texto: 'Armação (vergalhão CA-50)', feita: false, nao_realizado: { causa: 'material', obs: '', semana: '2026-10-12' } },
      { id: 'st-03', texto: 'Concretagem', feita: false, nao_realizado: null },
      { id: 'st-09', texto: 'Fôrmas das vigas', feita: false, nao_realizado: { causa: 'equipamento', obs: 'Serra circular quebrada', semana: '2026-09-21' } },
    ],
    restricoes: [
      { id: 'rs-01', descricao: 'Vergalhão CA-50 atrasado no fornecedor', tipo: 'material', prazo: '2026-10-21', responsavel: 'Compras', semana: '2026-10-19', resolvida: false },
      { id: 'rs-02', descricao: 'Confirmar bomba de concreto para a concretagem', tipo: 'equipamento', prazo: '2026-10-28', responsavel: 'Silvia Costa', semana: '2026-10-26', resolvida: false },
    ],
  }),
  atv({ id: 'at-04', obra_id: 'obra-je', pai_id: null, ordem: 2, titulo: 'Alvenaria', inicio: '2026-08-03', fim: '2026-11-13' }),
  atv({ id: 'at-05', obra_id: 'obra-je', pai_id: 'at-04', ordem: 1, titulo: 'Alvenaria 1º pavimento', inicio: '2026-08-03', fim: '2026-10-20', progresso: 100, status: 'concluido' }),
  atv({
    id: 'at-06', obra_id: 'obra-je', pai_id: 'at-04', ordem: 2, titulo: 'Alvenaria 2º pavimento', inicio: '2026-10-05', fim: '2026-11-13', progresso: 60, status: 'em_andamento',
    subtarefas: [
      { id: 'st-04', texto: 'Marcação da 1ª fiada', feita: true, nao_realizado: null },
      { id: 'st-05', texto: 'Elevação até o respaldo', feita: false, nao_realizado: { causa: 'clima', obs: 'Chuva forte na quarta e na quinta', semana: '2026-10-05' } },
      { id: 'st-06', texto: 'Vergas e contravergas', feita: false, nao_realizado: { causa: 'projeto', obs: 'Faltou o detalhe das vergas das janelas', semana: '2026-10-12' } },
    ],
    restricoes: [
      { id: 'rs-03', descricao: 'Contratar o 2º pedreiro da equipe', tipo: 'mao_de_obra', prazo: '2026-10-09', responsavel: 'Mestre Welton', semana: '2026-10-05', resolvida: true },
    ],
  }),
  atv({ id: 'at-07', obra_id: 'obra-je', pai_id: null, ordem: 3, titulo: 'Instalações', inicio: '2026-10-01', fim: '2026-11-06' }),
  atv({
    id: 'at-08', obra_id: 'obra-je', pai_id: 'at-07', ordem: 1, titulo: 'Elétrica — tubulação', inicio: '2026-10-01', fim: '2026-10-23', progresso: 25, status: 'em_andamento',
    nao_realizado: { causa: 'servico_anterior', obs: 'Laje ainda não liberada para os eletrodutos', semana: '2026-09-28' },
    subtarefas: [
      { id: 'st-07', texto: 'Eletrodutos na laje', feita: true, nao_realizado: null },
      { id: 'st-08', texto: 'Caixas 4x2 nas paredes', feita: false, nao_realizado: { causa: 'mao_de_obra', obs: 'O eletricista faltou dois dias', semana: '2026-10-05' } },
    ],
  }),
  atv({
    id: 'at-09', obra_id: 'obra-je', pai_id: 'at-07', ordem: 2, titulo: 'Hidráulica — água fria', inicio: '2026-10-19', fim: '2026-11-06',
    restricoes: [
      { id: 'rs-04', descricao: 'Compatibilizar o shaft com a estrutura', tipo: 'projeto', prazo: '2026-10-23', responsavel: 'Silvia Costa', semana: '2026-10-19', resolvida: false },
    ],
  }),
  atv({ id: 'at-10', obra_id: 'obra-je', pai_id: null, ordem: 4, titulo: 'Revestimento e acabamento', inicio: '2026-10-13', fim: '2026-12-18' }),
  atv({ id: 'at-11', obra_id: 'obra-je', pai_id: 'at-10', ordem: 1, titulo: 'Chapisco interno', inicio: '2026-10-13', fim: '2026-10-21', progresso: 100, status: 'concluido' }),
  atv({
    id: 'at-12', obra_id: 'obra-je', pai_id: 'at-10', ordem: 2, titulo: 'Reboco interno', inicio: '2026-10-22', fim: '2026-11-20',
    restricoes: [
      { id: 'rs-05', descricao: 'Receber a areia média do Areial São Jorge', tipo: 'material', prazo: '2026-10-22', responsavel: 'Compras', semana: '2026-10-19', resolvida: true },
    ],
  }),
  atv({
    id: 'at-13', obra_id: 'obra-je', pai_id: 'at-10', ordem: 3, titulo: 'Gesso forro', inicio: '2026-11-23', fim: '2026-12-18',
    restricoes: [
      { id: 'rs-06', descricao: 'Fechar contrato com a Gesso & Cia', tipo: 'mao_de_obra', prazo: '2026-11-13', responsavel: 'Silvia Costa', semana: '2026-11-09', resolvida: true },
    ],
  }),
  atv({ id: 'at-14', obra_id: 'obra-vn', pai_id: null, ordem: 1, titulo: 'Alvenaria e muro', inicio: '2026-09-21', fim: '2026-11-13' }),
  atv({ id: 'at-15', obra_id: 'obra-vn', pai_id: 'at-14', ordem: 1, titulo: 'Alvenaria do pavimento superior', inicio: '2026-09-21', fim: '2026-10-23', progresso: 85, status: 'em_andamento' }),
  atv({ id: 'at-16', obra_id: 'obra-vn', pai_id: 'at-14', ordem: 2, titulo: 'Muro de divisa', inicio: '2026-10-26', fim: '2026-11-13' }),
  atv({ id: 'at-17', obra_id: 'obra-vn', pai_id: null, ordem: 2, titulo: 'Contrapiso do térreo', inicio: '2026-10-13', fim: '2026-10-30', progresso: 70, status: 'em_andamento' }),
]

// ---------- MEDIÇÕES DE EMPREITEIROS ----------
// Contratos de empreiteiro por obra, espalhados pelas 4 colunas do Kanban.
// JE-01: Gesso (GLOBAL, R$ 30.000, 1 boletim fechado de 25%), Drywall (POR ESCOPO, 3 itens =
// R$ 30.000, 2 boletins: nº 1 fechado R$ 8.000 e nº 2 rascunho R$ 7.600 → 52% medido),
// Alvenaria enviada para aprovação, Elétrica em elaboração e Fundação concluída (100%).
// VN-02: poucos registros (muro por escopo, ativo e sem boletim; pintura em elaboração).
// CA-03 (parada): nenhum contrato, para a tela vazia.
export const CONTRATOS = [
  { id: 'ct-01', obra_id: 'obra-je', empreiteiro: 'Gesso & Cia', descricao: 'Forro de gesso em placas e sancas', status: 'ativo', tipo: 'global', valor_global: 30000 },
  { id: 'ct-02', obra_id: 'obra-je', empreiteiro: 'Drywall Forte', descricao: 'Paredes de drywall dos quartos', status: 'ativo', tipo: 'escopo', valor_global: null },
  { id: 'ct-03', obra_id: 'obra-je', empreiteiro: 'Silva Alvenarias', descricao: 'Alvenaria do 2º pavimento', status: 'enviado', tipo: null, valor_global: null },
  { id: 'ct-04', obra_id: 'obra-je', empreiteiro: 'Elétrica Luz Forte', descricao: 'Tubulação e fiação elétrica', status: 'elaboracao', tipo: null, valor_global: null },
  { id: 'ct-05', obra_id: 'obra-je', empreiteiro: 'Construtora Pereira', descricao: 'Fundação (estacas e baldrame)', status: 'concluido', tipo: 'global', valor_global: 85000 },
  { id: 'ct-06', obra_id: 'obra-vn', empreiteiro: 'Equipe Mendes', descricao: 'Muro de divisa', status: 'ativo', tipo: 'escopo', valor_global: null },
  { id: 'ct-07', obra_id: 'obra-vn', empreiteiro: 'Pinturas Sol', descricao: 'Pintura externa', status: 'elaboracao', tipo: null, valor_global: null },
]

// Itens dos contratos POR ESCOPO.
export const ITENS_CONTRATO = [
  { id: 'ic-01', obra_id: 'obra-je', contrato_id: 'ct-02', ordem: 1, descricao: 'Placas de drywall (montagem)', unidade: 'm2', quantidade: 200, preco_unitario: 80 },
  { id: 'ic-02', obra_id: 'obra-je', contrato_id: 'ct-02', ordem: 2, descricao: 'Tratamento de juntas', unidade: 'm2', quantidade: 200, preco_unitario: 40 },
  { id: 'ic-03', obra_id: 'obra-je', contrato_id: 'ct-02', ordem: 3, descricao: 'Tabica de acabamento', unidade: 'm', quantidade: 50, preco_unitario: 120 },
  { id: 'ic-04', obra_id: 'obra-vn', contrato_id: 'ct-06', ordem: 1, descricao: 'Muro em bloco de concreto, h = 2,20 m', unidade: 'm', quantidade: 45, preco_unitario: 180 },
]

// Boletins de medição (numerados por contrato). Global mede em %; por escopo, em quantidade.
export const MEDICOES = [
  { id: 'md-01', obra_id: 'obra-je', contrato_id: 'ct-01', numero: 1, periodo_inicio: '2026-10-05', periodo_fim: '2026-10-11', status: 'fechada', percentual: 25, linhas: [] },
  { id: 'md-02', obra_id: 'obra-je', contrato_id: 'ct-02', numero: 1, periodo_inicio: '2026-09-28', periodo_fim: '2026-10-04', status: 'fechada', percentual: null, linhas: [{ item_id: 'ic-01', quantidade: 80 }, { item_id: 'ic-02', quantidade: 40 }, { item_id: 'ic-03', quantidade: 0 }] },
  { id: 'md-03', obra_id: 'obra-je', contrato_id: 'ct-02', numero: 2, periodo_inicio: '2026-10-05', periodo_fim: '2026-10-18', status: 'rascunho', percentual: null, linhas: [{ item_id: 'ic-01', quantidade: 40 }, { item_id: 'ic-02', quantidade: 50 }, { item_id: 'ic-03', quantidade: 20 }] },
  { id: 'md-04', obra_id: 'obra-je', contrato_id: 'ct-05', numero: 1, periodo_inicio: '2026-06-01', periodo_fim: '2026-06-30', status: 'fechada', percentual: 60, linhas: [] },
  { id: 'md-05', obra_id: 'obra-je', contrato_id: 'ct-05', numero: 2, periodo_inicio: '2026-07-01', periodo_fim: '2026-07-17', status: 'fechada', percentual: 40, linhas: [] },
]

// ---------- QUALIDADE: pendências (vistoria rápida) ----------
// Hoje dos exemplos = 19/10/2026. JE-01: 6 pendências em 3 empresas, 1 vencida (#1, prazo
// 15/10), 1 com prazo hoje (#5) e 1 resolvida com foto da correção (#4). VN-02: 2 registros.
// CA-03 (parada): nenhuma, para a tela vazia. Fotos de exemplo em public/exemplos/.
export const PENDENCIAS = [
  { id: 'pq-01', obra_id: 'obra-je', numero: 1, descricao: 'Infiltração no forro do banheiro social, mancha de uns 40 cm perto do ralo do box.', local: 'Banheiro social', pavimento: '2º pavimento', empresa: 'Hidráulica Fluxo', prazo: '2026-10-15', responsavel: 'Mestre Welton', data_vistoria: '2026-10-08', vistoriado_por: 'Silvia Costa', status: 'pendente', foto: '/exemplos/infiltracao.svg', foto_evidencia: null, data_resolucao: null, observacoes: '[14/10/2026 16:40] Mestre Welton: Empresa pediu para voltar na sexta.\n[08/10/2026 09:12] Silvia Costa: Vistoria inicial: mancha de 40 cm no forro.' },
  { id: 'pq-02', obra_id: 'obra-je', numero: 2, descricao: 'Trinca diagonal na alvenaria da suíte, saindo do canto da janela.', local: 'Suíte 1', pavimento: '2º pavimento', empresa: 'Silva Alvenarias', prazo: '2026-10-23', responsavel: 'Silvia Costa', data_vistoria: '2026-10-13', vistoriado_por: 'Silvia Costa', status: 'em_andamento', foto: '/exemplos/trinca.svg', foto_evidencia: null, data_resolucao: null, observacoes: '[16/10/2026 10:05] Silvia Costa: Colocada em andamento.\n[13/10/2026 11:30] Silvia Costa: Colocar tela na verga e refazer o reboco.' },
  { id: 'pq-03', obra_id: 'obra-je', numero: 3, descricao: 'Parede da sala fora de prumo (2 cm em 2,80 m).', local: 'Sala', pavimento: 'Térreo', empresa: 'Silva Alvenarias', prazo: '2026-10-30', responsavel: 'Mestre Welton', data_vistoria: '2026-10-16', vistoriado_por: 'Mestre Welton', status: 'pendente', foto: '/exemplos/prumo.svg', foto_evidencia: null, data_resolucao: null, observacoes: '' },
  { id: 'pq-04', obra_id: 'obra-je', numero: 4, descricao: 'Caixa 4x2 da bancada desalinhada com a do lado.', local: 'Cozinha', pavimento: 'Térreo', empresa: 'Elétrica Luz Forte', prazo: '2026-10-20', responsavel: 'Silvia Costa', data_vistoria: '2026-10-10', vistoriado_por: 'Silvia Costa', status: 'resolvido', foto: '/exemplos/caixa.svg', foto_evidencia: '/exemplos/caixa-corrigida.svg', data_resolucao: '2026-10-17', observacoes: '[17/10/2026 15:20] Silvia Costa: Resolvida, com foto da correção.\n[14/10/2026 08:45] Silvia Costa: Colocada em andamento.' },
  { id: 'pq-05', obra_id: 'obra-je', numero: 5, descricao: 'Respingo de concreto na esquadria de alumínio da fachada.', local: 'Fachada frontal', pavimento: '1º pavimento', empresa: 'Construtora Pereira', prazo: '2026-10-19', responsavel: 'Mestre Welton', data_vistoria: '2026-10-17', vistoriado_por: 'Silvia Costa', status: 'pendente', foto: '/exemplos/respingo.svg', foto_evidencia: null, data_resolucao: null, observacoes: '' },
  { id: 'pq-06', obra_id: 'obra-je', numero: 6, descricao: 'Eletroduto amassado na laje antes da concretagem.', local: 'Laje', pavimento: '2º pavimento', empresa: 'Elétrica Luz Forte', prazo: '2026-10-24', responsavel: 'Mestre Welton', data_vistoria: '2026-10-18', vistoriado_por: 'Mestre Welton', status: 'em_andamento', foto: '/exemplos/eletroduto.svg', foto_evidencia: null, data_resolucao: null, observacoes: '[18/10/2026 17:10] Mestre Welton: Colocada em andamento.' },
  { id: 'pq-07', obra_id: 'obra-vn', numero: 1, descricao: 'Bloco quebrado na 3ª fiada do muro de divisa.', local: 'Área externa', pavimento: '', empresa: 'Equipe Mendes', prazo: '2026-10-28', responsavel: 'Mestre Marcos', data_vistoria: '2026-10-16', vistoriado_por: 'Mestre Marcos', status: 'pendente', foto: '/exemplos/muro.svg', foto_evidencia: null, data_resolucao: null, observacoes: '' },
  { id: 'pq-08', obra_id: 'obra-vn', numero: 2, descricao: 'Contrapiso com desnível na porta da cozinha.', local: 'Cozinha', pavimento: 'Térreo', empresa: 'Equipe própria', prazo: '2026-10-22', responsavel: 'Silvia Costa', data_vistoria: '2026-10-14', vistoriado_por: 'Silvia Costa', status: 'em_andamento', foto: null, foto_evidencia: null, data_resolucao: null, observacoes: '' },
]

// ---------- QUALIDADE: FVS (Ficha de Verificação de Serviço) ----------
// Modelos da empresa (valem para todas as obras).
export const MODELOS_FVS = [
  {
    id: 'mf-01', codigo: 'FVS-01', nome: 'Impermeabilização — Áreas Molhadas', categoria: 'Impermeabilização', versao: 2,
    grupos: [
      { nome: 'Pré-execução', itens: [
        { id: 'f1-01', titulo: 'Superfície limpa, seca e sem partes soltas' },
        { id: 'f1-02', titulo: 'Cantos e arestas arredondados (meia-cana)' },
        { id: 'f1-03', titulo: 'Ralos e tubos passantes chumbados e reforçados' },
      ] },
      { nome: 'Execução', itens: [
        { id: 'f1-04', titulo: 'Primer aplicado em toda a área' },
        { id: 'f1-05', titulo: 'Demãos conforme especificação (mínimo 3, cruzadas)' },
        { id: 'f1-06', titulo: 'Tela de reforço nos ralos, cantos e juntas' },
        { id: 'f1-07', titulo: 'Subida de 30 cm nas paredes (no box, 1,80 m)' },
      ] },
      { nome: 'Proteção e acabamento', itens: [
        { id: 'f1-08', titulo: 'Teste de estanqueidade de 72 h sem vazamento' },
        { id: 'f1-09', titulo: 'Proteção mecânica executada' },
        { id: 'f1-10', titulo: 'Registro fotográfico antes da proteção' },
      ] },
    ],
  },
  {
    id: 'mf-02', codigo: 'FVS-02', nome: 'Revestimento Cerâmico', categoria: 'Acabamento', versao: 1,
    grupos: [
      { nome: 'Execução', itens: [
        { id: 'f2-01', titulo: 'Base regularizada, no prumo e no nível' },
        { id: 'f2-02', titulo: 'Argamassa colante do tipo especificado (AC-II / AC-III)' },
        { id: 'f2-03', titulo: 'Dupla colagem em peças maiores que 30×30 cm' },
        { id: 'f2-04', titulo: 'Juntas com espaçador, alinhadas e no prumo' },
        { id: 'f2-05', titulo: 'Caimento para o ralo conferido' },
      ] },
      { nome: 'Proteção e acabamento', itens: [
        { id: 'f2-06', titulo: 'Rejunte completo e limpo' },
        { id: 'f2-07', titulo: 'Teste de percussão sem peças ocas' },
        { id: 'f2-08', titulo: 'Peças sem trincas, lascas ou manchas' },
      ] },
    ],
  },
]

const gruposDe = (id) => structuredClone(MODELOS_FVS.find((m) => m.id === id).grupos)

// JE-01: 1 vistoria concluída (impermeabilização do banheiro, 7 OK, 2 NC, 1 N.A. = 78%) e
// 1 em andamento (cerâmica da cozinha, 4 de 8 verificados). VN-02: 1 em andamento.
export const VISTORIAS_FVS = [
  {
    id: 'vf-01', obra_id: 'obra-je', modelo_id: 'mf-01', modelo_codigo: 'FVS-01', modelo_nome: 'Impermeabilização — Áreas Molhadas', modelo_versao: 2,
    ambiente: 'Banheiro social · 2º pavimento', data: '2026-10-14', vistoriado_por: 'Silvia Costa', status: 'concluida', concluida_em: '2026-10-14',
    grupos: gruposDe('mf-01'),
    respostas: { 'f1-01': 'ok', 'f1-02': 'ok', 'f1-03': 'ok', 'f1-04': 'ok', 'f1-05': 'ok', 'f1-06': 'ok', 'f1-07': 'nc', 'f1-08': 'nc', 'f1-09': 'ok', 'f1-10': 'na' },
  },
  {
    id: 'vf-02', obra_id: 'obra-je', modelo_id: 'mf-02', modelo_codigo: 'FVS-02', modelo_nome: 'Revestimento Cerâmico', modelo_versao: 1,
    ambiente: 'Cozinha · Térreo', data: '2026-10-18', vistoriado_por: 'Mestre Welton', status: 'em_andamento', concluida_em: null,
    grupos: gruposDe('mf-02'),
    respostas: { 'f2-01': 'ok', 'f2-02': 'ok', 'f2-03': 'nc', 'f2-04': 'ok' },
  },
  {
    id: 'vf-03', obra_id: 'obra-vn', modelo_id: 'mf-01', modelo_codigo: 'FVS-01', modelo_nome: 'Impermeabilização — Áreas Molhadas', modelo_versao: 2,
    ambiente: 'Banheiro · Pavimento superior', data: '2026-10-17', vistoriado_por: 'Silvia Costa', status: 'em_andamento', concluida_em: null,
    grupos: gruposDe('mf-01'),
    respostas: { 'f1-01': 'nc', 'f1-02': 'ok' },
  },
]

// Não conformidades em status variados, cada uma com a timeline do que aconteceu.
export const NAO_CONFORMIDADES = [
  {
    id: 'nc-01', obra_id: 'obra-je', codigo: 'NC-001', vistoria_id: 'vf-01', item_id: 'f1-08', item_numero: '3.1', item_titulo: 'Teste de estanqueidade de 72 h sem vazamento',
    titulo: 'Vazamento no teste de estanqueidade', servico: 'Impermeabilização — Áreas Molhadas', ambiente: 'Banheiro social · 2º pavimento',
    descricao: 'Vazamento no teste de estanqueidade: mancha no forro do pavimento de baixo depois de 48 h.', solucao: 'Refazer a manta no entorno do ralo e repetir o teste de 72 h.',
    severidade: 'alta', responsavel: 'Impermeabiliza Já', fotos: ['/exemplos/infiltracao.svg'], status: 'corrigida', aberta_em: '2026-10-14', fechada_em: null,
    timeline: [
      { data: '2026-10-14', hora: '15:02', texto: 'Aberta por Silvia Costa na vistoria (item 3.1).' },
      { data: '2026-10-14', hora: '15:30', texto: 'Encaminhada a Impermeabiliza Já por Silvia Costa.' },
      { data: '2026-10-17', hora: '11:00', texto: 'Marcada como corrigida por Mestre Welton.' },
    ],
  },
  {
    id: 'nc-02', obra_id: 'obra-je', codigo: 'NC-002', vistoria_id: 'vf-02', item_id: 'f2-03', item_numero: '1.3', item_titulo: 'Dupla colagem em peças maiores que 30×30 cm',
    titulo: 'Peças 60×60 assentadas sem dupla colagem', servico: 'Revestimento Cerâmico', ambiente: 'Cozinha · Térreo',
    descricao: 'Peças 60×60 assentadas sem dupla colagem na faixa da bancada.', solucao: 'Remover as peças da faixa e reassentar com dupla colagem.',
    severidade: 'media', responsavel: 'Revest Pisos', fotos: [], status: 'encaminhada', aberta_em: '2026-10-18', fechada_em: null,
    timeline: [
      { data: '2026-10-18', hora: '10:12', texto: 'Aberta por Mestre Welton na vistoria (item 1.3).' },
      { data: '2026-10-18', hora: '10:40', texto: 'Encaminhada a Revest Pisos por Silvia Costa.' },
    ],
  },
  {
    id: 'nc-03', obra_id: 'obra-je', codigo: 'NC-003', vistoria_id: 'vf-01', item_id: 'f1-07', item_numero: '2.4', item_titulo: 'Subida de 30 cm nas paredes (no box, 1,80 m)',
    titulo: 'Subida no box abaixo de 1,80 m', servico: 'Impermeabilização — Áreas Molhadas', ambiente: 'Banheiro social · 2º pavimento',
    descricao: 'Subida da impermeabilização no box com 1,40 m. Especificado: 1,80 m.', solucao: 'Completar a subida até 1,80 m antes do revestimento.',
    severidade: 'baixa', responsavel: 'Impermeabiliza Já', fotos: [], status: 'fechada', aberta_em: '2026-10-14', fechada_em: '2026-10-16',
    timeline: [
      { data: '2026-10-14', hora: '15:05', texto: 'Aberta por Silvia Costa na vistoria (item 2.4).' },
      { data: '2026-10-14', hora: '15:31', texto: 'Encaminhada a Impermeabiliza Já por Silvia Costa.' },
      { data: '2026-10-15', hora: '09:20', texto: 'Marcada como corrigida por Mestre Welton.' },
      { data: '2026-10-15', hora: '16:45', texto: 'Reprovada na reavaliação por Silvia Costa: ainda com 1,60 m no canto. Volta para correção.' },
      { data: '2026-10-16', hora: '10:10', texto: 'Marcada como corrigida por Mestre Welton.' },
      { data: '2026-10-16', hora: '14:20', texto: 'Aprovada e fechada por Silvia Costa.' },
    ],
  },
  {
    id: 'nc-04', obra_id: 'obra-vn', codigo: 'NC-001', vistoria_id: 'vf-03', item_id: 'f1-01', item_numero: '1.1', item_titulo: 'Superfície limpa, seca e sem partes soltas',
    titulo: 'Contrapiso com pó e partes soltas', servico: 'Impermeabilização — Áreas Molhadas', ambiente: 'Banheiro · Pavimento superior',
    descricao: 'Contrapiso com pó e partes soltas perto da porta.', solucao: 'Lixar, limpar e aplicar o primer só depois.',
    severidade: 'media', responsavel: 'Equipe Mendes', fotos: [], status: 'aberta', aberta_em: '2026-10-17', fechada_em: null,
    timeline: [{ data: '2026-10-17', hora: '08:50', texto: 'Aberta por Silvia Costa na vistoria (item 1.1).' }],
  },
]

// ---------- QUALIDADE: Gemba Walk (observações de desperdício) ----------
// JE-01: 8 observações cobrindo os 7 tipos (1 vencida, 1 com prazo hoje, 1 sem prazo,
// 2 resolvidas). VN-02: 2 observações. CA-03: nenhuma.
export const GEMBA_OBSERVACOES = [
  { id: 'gb-01', obra_id: 'obra-je', data: '2026-10-15', registrado_por: 'Silvia Costa', local: 'Cozinha · Térreo', descricao: 'Reboco da parede da pia refeito: saiu fora de prumo.', causa_raiz: 'Taliscas não conferidas antes de liberar o reboco.', acao: 'Mestre confere as taliscas antes de cada pano de reboco.', desperdicios: ['Retrabalho'], prazo: '2026-10-22', responsavel: 'Mestre Welton', status: 'em_andamento', foto: '/exemplos/prumo.svg' },
  { id: 'gb-02', obra_id: 'obra-je', data: '2026-10-13', registrado_por: 'Mestre Welton', local: 'Portão de entrada', descricao: 'Equipe de reboco parada 2 h esperando o caminhão de areia.', causa_raiz: 'Pedido feito no mesmo dia, sem horário combinado.', acao: 'Agendar toda entrega com 48 h e horário marcado.', desperdicios: ['Espera'], prazo: '2026-10-17', responsavel: 'Compras', status: 'pendente', foto: null },
  { id: 'gb-03', obra_id: 'obra-je', data: '2026-10-16', registrado_por: 'Silvia Costa', local: 'Pátio de descarga', descricao: 'Blocos descarregados longe do guincho e levados no braço até o 2º pavimento.', causa_raiz: 'Não há área de descarga definida.', acao: 'Marcar a área de descarga ao lado do guincho.', desperdicios: ['Transporte', 'Movimentação'], prazo: '2026-10-24', responsavel: 'Mestre Welton', status: 'pendente', foto: null },
  { id: 'gb-04', obra_id: 'obra-je', data: '2026-10-14', registrado_por: 'Silvia Costa', local: 'Almoxarifado', descricao: '40 sacos de cimento perto do vencimento, empilhados no fundo.', causa_raiz: 'Compra acima do consumo semanal.', acao: 'Comprar por semana, pelo planejamento de curto prazo.', desperdicios: ['Estoque'], prazo: '2026-10-25', responsavel: 'Silvia Costa', status: 'em_andamento', foto: null },
  { id: 'gb-05', obra_id: 'obra-je', data: '2026-10-17', registrado_por: 'Mestre Welton', local: '2º pavimento', descricao: 'Argamassa preparada demais e jogada fora no fim do dia.', causa_raiz: 'Betoneira cheia no fim do turno sem saber quanto falta.', acao: 'Meia betonada depois das 15 h.', desperdicios: ['Superprodução'], prazo: null, responsavel: 'Mestre Welton', status: 'pendente', foto: null },
  { id: 'gb-06', obra_id: 'obra-je', data: '2026-10-08', registrado_por: 'Silvia Costa', local: 'Portaria', descricao: 'Material conferido duas vezes: na portaria e de novo no almoxarifado.', causa_raiz: 'Ninguém sabia quem era o responsável pela conferência.', acao: 'Conferir só no almoxarifado, com a nota fiscal.', desperdicios: ['Processo desnecessário'], prazo: '2026-10-15', responsavel: 'Silvia Costa', status: 'resolvido', foto: null },
  { id: 'gb-07', obra_id: 'obra-je', data: '2026-10-18', registrado_por: 'Silvia Costa', local: '2º pavimento', descricao: 'Pedreiro desce 3 vezes por hora para buscar ferramenta no térreo.', causa_raiz: 'Ferramentas guardadas só no térreo.', acao: 'Uma caixa de ferramentas por pavimento.', desperdicios: ['Movimentação'], prazo: '2026-10-19', responsavel: 'Mestre Welton', status: 'em_andamento', foto: null },
  { id: 'gb-08', obra_id: 'obra-je', data: '2026-10-06', registrado_por: 'Silvia Costa', local: 'Sala · Térreo', descricao: 'Fiação passada antes da tubulação ser conferida; foi puxada de novo.', causa_raiz: 'Etapa de conferência da tubulação pulada.', acao: 'Liberar fiação só com a tubulação conferida na FVS.', desperdicios: ['Retrabalho', 'Espera'], prazo: '2026-10-12', responsavel: 'Elétrica Luz Forte', status: 'resolvido', foto: '/exemplos/eletroduto.svg' },
  { id: 'gb-09', obra_id: 'obra-vn', data: '2026-10-16', registrado_por: 'Mestre Marcos', local: 'Laje do térreo', descricao: 'Concreto chegou 1 h atrasado e a equipe ficou parada.', causa_raiz: 'Usina sem confirmação na véspera.', acao: 'Confirmar a usina na véspera, às 16 h.', desperdicios: ['Espera'], prazo: '2026-10-23', responsavel: 'Silvia Costa', status: 'pendente', foto: null },
  { id: 'gb-10', obra_id: 'obra-vn', data: '2026-10-10', registrado_por: 'Silvia Costa', local: 'Área externa', descricao: 'Blocos do muro levados de carrinho de um lado a outro do terreno.', causa_raiz: 'Descarga no lado oposto ao muro.', acao: 'Descarregar junto ao muro.', desperdicios: ['Transporte'], prazo: '2026-10-14', responsavel: 'Mestre Marcos', status: 'resolvido', foto: '/exemplos/muro.svg' },
]

// ---------- DIÁRIO DE OBRA (RDO) ----------
// Um diário por obra e por dia. Os avanços batem com as frentes acima (alvenaria parou em
// 14/10, laje em 02/10, elétrica andou em 16/10, reboco em 17/10). 12/10 é feriado: sem diário.
// JE-01: 13 dias com clima variado (chuva em 06, 07 e 15/10), 2 ocorrências e 2 fotos.
// VN-02: 2 dias. CA-03: nenhum. Um diário passado a limpo depois (30/09, lançado em 18/10) e\n// 2 atividades fora do orçamento (uma para analisar, uma já marcada como serviço extra).
const sv = (frente_id, avanco, efetivo, detalhe = '') => ({ frente_id, avanco, concluido: avanco === 100, detalhe, efetivo })
const equipJE = (betoneira = 'Em uso') => [
  { nome: 'Betoneira 400 L', quantidade: 1, origem: 'Próprio', situacao: betoneira },
  { nome: 'Andaime (módulos)', quantidade: 20, origem: 'Alugado', situacao: 'Em uso' },
  { nome: 'Serra circular', quantidade: 1, origem: 'Próprio', situacao: 'Em uso' },
]
// O efetivo é do dia: soma o que cada serviço trouxe e guarda só no diário.
const somaEfetivo = (servicos) => servicos.reduce((tot, s) => { for (const [f, q] of Object.entries(s.efetivo ?? {})) tot[f] = (tot[f] ?? 0) + q; return tot }, {})
const semEfetivo = (servicos) => servicos.map((s) => { const c = { ...s }; delete c.efetivo; return c })
const rdo = (id, obra_id, data, [manha, tarde, noite], servicos, extra = {}) => ({
  id, obra_id, data, clima: { manha, tarde, noite }, efetivo: somaEfetivo(servicos), servicos: semEfetivo(servicos), fotos: [], equipamentos: equipJE(), ocorrencias: '',
  lancado_por: obra_id === 'obra-je' ? 'Welton Amorim' : 'Marcos Dias', lancado_em: data, ...extra,
})
const alv = { Pedreiro: 3, Servente: 2 }
const alv4 = { Pedreiro: 4, Servente: 2 }
const ele = { Eletricista: 2 }
const laje = { Carpinteiro: 2, Armador: 2, Servente: 1 }
const reb = { Pedreiro: 2, Servente: 2 }
export const DIARIOS = [
  // passado a limpo depois (diário atrasado): lançado em 18/10 pelo engenheiro
  rdo('dr-16', 'obra-je', '2026-09-30', ['sol', 'sol', null], [sv('f-alv', 28, alv)], { lancado_por: 'Silvia Costa', lancado_em: '2026-10-18' }),
  rdo('dr-01', 'obra-je', '2026-10-01', ['sol', 'sol', null], [sv('f-alv', 30, alv), sv('f-eletr', 5, ele), sv('f-laje', 38, laje)]),
  rdo('dr-02', 'obra-je', '2026-10-02', ['sol', 'nublado', null], [sv('f-alv', 33, alv), sv('f-laje', 40, laje, 'Fôrmas e escoramento concluídos')]),
  rdo('dr-03', 'obra-je', '2026-10-03', ['nublado', 'nublado', null], [sv('f-alv', 35, { Pedreiro: 2, Servente: 1 })]),
  rdo('dr-04', 'obra-je', '2026-10-05', ['sol', 'sol', 'sol'], [sv('f-alv', 38, alv), sv('f-eletr', 8, ele)]),
  rdo('dr-05', 'obra-je', '2026-10-06', ['chuva', 'nublado', 'chuva'], [sv('f-alv', 40, { Pedreiro: 2, Servente: 1 })]),
  rdo('dr-06', 'obra-je', '2026-10-07', ['chuva', 'chuva_forte', 'chuva'], [sv('f-alv', 40, { Pedreiro: 1 }, 'Só limpeza e marcação, por causa da chuva')], {
    equipamentos: equipJE('Parado'), ocorrencias: 'Chuva forte à tarde: serviço externo parado às 14h e equipe liberada às 15h.',
  }),
  rdo('dr-07', 'obra-je', '2026-10-08', ['nublado', 'sol', null], [sv('f-alv', 44, alv4), sv('f-eletr', 12, ele)]),
  rdo('dr-08', 'obra-je', '2026-10-09', ['sol', 'sol', null], [sv('f-alv', 48, alv4), sv('f-eletr', 15, ele)]),
  rdo('dr-09', 'obra-je', '2026-10-13', ['sol', 'nublado', null], [sv('f-alv', 52, alv4), sv('f-eletr', 18, ele),
    { id: 'fo-01', fora_orcamento: true, frente_id: null, descricao: 'Demolição de mureta não prevista no quintal', ambiente: 'Quintal', quantidade: 4, unidade: 'm', efetivo: { Servente: 2 }, analise: 'para_analisar', frente_ligada: null }]),
  rdo('dr-10', 'obra-je', '2026-10-14', ['sol', 'sol', 'nublado'], [sv('f-alv', 60, alv4, 'Fechamento da suíte 1 até o respaldo')], {
    fotos: [{ id: 'ft-01', url: '/exemplos/prumo.svg', frente_id: 'f-alv', ambiente: 'Suíte 1', cliente_ve: true }],
  }),
  rdo('dr-11', 'obra-je', '2026-10-15', ['nublado', 'chuva', 'chuva'], [sv('f-eletr', 22, ele), sv('f-reb', 4, reb),
    { id: 'fo-02', fora_orcamento: true, frente_id: null, descricao: 'Retirada de entulho do terreno vizinho (pedido do cliente)', ambiente: 'Área externa', quantidade: null, unidade: '', efetivo: { Servente: 1 }, analise: 'extra', frente_ligada: null }]),
  rdo('dr-12', 'obra-je', '2026-10-16', ['sol', 'sol', null], [sv('f-eletr', 25, { Eletricista: 2, 'Ajudante de elétrica': 1 }), sv('f-reb', 7, reb)], {
    ocorrencias: 'Vergalhão não chegou: a armação da laje continua parada.',
    fotos: [{ id: 'ft-02', url: '/exemplos/eletroduto.svg', frente_id: 'f-eletr', ambiente: 'Sala', cliente_ve: false }],
  }),
  rdo('dr-13', 'obra-je', '2026-10-17', ['sol', 'nublado', null], [sv('f-reb', 10, reb)]),
  rdo('dr-14', 'obra-vn', '2026-10-16', ['sol', 'sol', null], [sv('f-alv2', 82, { Pedreiro: 2, Servente: 1 }), sv('f-contra', 65, { Pedreiro: 1, Servente: 2 })], {
    equipamentos: [{ nome: 'Betoneira 400 L', quantidade: 1, origem: 'Próprio', situacao: 'Em uso' }],
  }),
  rdo('dr-15', 'obra-vn', '2026-10-17', ['sol', 'sol', null], [sv('f-alv2', 85, { Pedreiro: 2, Servente: 1 }), sv('f-contra', 70, { Pedreiro: 1, Servente: 2 })], {
    equipamentos: [{ nome: 'Betoneira 400 L', quantidade: 1, origem: 'Próprio', situacao: 'Em uso' }],
  }),
]
