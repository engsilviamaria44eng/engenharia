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
  { id: 'u-eng', nome: 'Engenheiro', role: 'Engenheiro' },
  { id: 'u-ricardo', nome: 'Ricardo Alves', role: 'Mestre' },
  { id: 'u-marcos', nome: 'Marcos Dias', role: 'Mestre' },
  { id: 'u-paula', nome: 'Paula Mendes', role: 'Cliente' },
]

// Quem trabalha em qual obra (vira a tabela `membros`).
export const MEMBROS = [
  { obra_id: 'obra-je', profile_id: 'u-eng', papel: 'Engenheiro' },
  { obra_id: 'obra-vn', profile_id: 'u-eng', papel: 'Engenheiro' },
  { obra_id: 'obra-ca', profile_id: 'u-eng', papel: 'Engenheiro' },
  { obra_id: 'obra-je', profile_id: 'u-ricardo', papel: 'Mestre' },
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
    ],
    restricoes: [
      { id: 'rs-01', descricao: 'Vergalhão CA-50 atrasado no fornecedor', tipo: 'material', prazo: '2026-10-21', responsavel: 'Compras', semana: '2026-10-19', resolvida: false },
      { id: 'rs-02', descricao: 'Confirmar bomba de concreto para a concretagem', tipo: 'equipamento', prazo: '2026-10-28', responsavel: 'Engenheiro', semana: '2026-10-26', resolvida: false },
    ],
  }),
  atv({ id: 'at-04', obra_id: 'obra-je', pai_id: null, ordem: 2, titulo: 'Alvenaria', inicio: '2026-08-03', fim: '2026-11-13' }),
  atv({ id: 'at-05', obra_id: 'obra-je', pai_id: 'at-04', ordem: 1, titulo: 'Alvenaria 1º pavimento', inicio: '2026-08-03', fim: '2026-10-20', progresso: 100, status: 'concluido' }),
  atv({
    id: 'at-06', obra_id: 'obra-je', pai_id: 'at-04', ordem: 2, titulo: 'Alvenaria 2º pavimento', inicio: '2026-10-05', fim: '2026-11-13', progresso: 60, status: 'em_andamento',
    subtarefas: [
      { id: 'st-04', texto: 'Marcação da 1ª fiada', feita: true, nao_realizado: null },
      { id: 'st-05', texto: 'Elevação até o respaldo', feita: false, nao_realizado: null },
      { id: 'st-06', texto: 'Vergas e contravergas', feita: false, nao_realizado: null },
    ],
    restricoes: [
      { id: 'rs-03', descricao: 'Contratar o 2º pedreiro da equipe', tipo: 'mao_de_obra', prazo: '2026-10-09', responsavel: 'Mestre Ricardo', semana: '2026-10-05', resolvida: true },
    ],
  }),
  atv({ id: 'at-07', obra_id: 'obra-je', pai_id: null, ordem: 3, titulo: 'Instalações', inicio: '2026-10-01', fim: '2026-11-06' }),
  atv({
    id: 'at-08', obra_id: 'obra-je', pai_id: 'at-07', ordem: 1, titulo: 'Elétrica — tubulação', inicio: '2026-10-01', fim: '2026-10-23', progresso: 25, status: 'em_andamento',
    subtarefas: [
      { id: 'st-07', texto: 'Eletrodutos na laje', feita: true, nao_realizado: null },
      { id: 'st-08', texto: 'Caixas 4x2 nas paredes', feita: false, nao_realizado: null },
    ],
  }),
  atv({
    id: 'at-09', obra_id: 'obra-je', pai_id: 'at-07', ordem: 2, titulo: 'Hidráulica — água fria', inicio: '2026-10-19', fim: '2026-11-06',
    restricoes: [
      { id: 'rs-04', descricao: 'Compatibilizar o shaft com a estrutura', tipo: 'projeto', prazo: '2026-10-23', responsavel: 'Engenheiro', semana: '2026-10-19', resolvida: false },
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
      { id: 'rs-06', descricao: 'Fechar contrato com a Gesso & Cia', tipo: 'mao_de_obra', prazo: '2026-11-13', responsavel: 'Engenheiro', semana: '2026-11-09', resolvida: true },
    ],
  }),
  atv({ id: 'at-14', obra_id: 'obra-vn', pai_id: null, ordem: 1, titulo: 'Alvenaria e muro', inicio: '2026-09-21', fim: '2026-11-13' }),
  atv({ id: 'at-15', obra_id: 'obra-vn', pai_id: 'at-14', ordem: 1, titulo: 'Alvenaria do pavimento superior', inicio: '2026-09-21', fim: '2026-10-23', progresso: 85, status: 'em_andamento' }),
  atv({ id: 'at-16', obra_id: 'obra-vn', pai_id: 'at-14', ordem: 2, titulo: 'Muro de divisa', inicio: '2026-10-26', fim: '2026-11-13' }),
  atv({ id: 'at-17', obra_id: 'obra-vn', pai_id: null, ordem: 2, titulo: 'Contrapiso do térreo', inicio: '2026-10-13', fim: '2026-10-30', progresso: 70, status: 'em_andamento' }),
]
