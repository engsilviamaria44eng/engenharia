// CAMADA DE DADOS: a única porta de entrada dos dados. Nenhuma tela busca nada sozinha,
// e só este arquivo chama supabase.from(...).
//
// MULTI-OBRA: a camada guarda a obra atual e INJETA o obra_id em toda busca e gravação
// de lançamento. As telas nunca passam obra_id — assim nenhuma consegue esquecer o filtro.
//
// BANCO x MOCK: com o .env.local presente (navegador), obras, Materiais e Planejamento vão
// ao Supabase. Sem ele (testes em Node), tudo usa o mockData. Frentes, Medições e o login de
// demonstração ainda são mock em qualquer caso, até os módulos deles irem para o banco.
import { supabase } from './supabase.js'
import {
  OBRAS, MEMBROS, FRENTES, USUARIOS, MATERIAIS_CATALOGO, PEDIDOS, ATIVIDADES_PLANEJAMENTO,
  CONTRATOS, ITENS_CONTRATO, MEDICOES, PENDENCIAS, MODELOS_FVS, VISTORIAS_FVS, NAO_CONFORMIDADES,
  GEMBA_OBSERVACOES, DIARIOS,
} from './mockData.js'
import { daObra } from './obras.js'
import { CONFIG_PADRAO } from './planejamento.js'

const USAR_MOCK = !supabase

let obraAtualId = null
// código de cada obra do banco (id -> código), para casar com o que ainda é mock
const codigoDaObra = new Map()

// Chamado pelo ObraContext sempre que a obra muda. Não chame de uma tela.
export function definirObraAtual(id) {
  obraAtualId = id
}

function resposta(data) {
  return Promise.resolve({ data, erro: null })
}

function semObra() {
  return Promise.resolve({ data: null, erro: 'Nenhuma obra escolhida.' })
}

// Todo retorno do Supabase passa por aqui: a tela nunca vê o { error } cru.
async function doBanco(consulta, oQue) {
  const { data, error } = await consulta
  if (error) return { data: null, erro: `Não foi possível ${oQue}. ${error.message}` }
  return { data, erro: null }
}

// A obra do mock que tem o mesmo código da obra aberta (frentes e membros ainda são mock).
function idMockDaObraAtual() {
  if (USAR_MOCK) return obraAtualId
  const codigo = codigoDaObra.get(obraAtualId)
  return OBRAS.find((o) => o.codigo === codigo)?.id ?? null
}

// ---------- login de demonstração ----------
export function listarUsuariosDemo() {
  return resposta(USUARIOS)
}

// ---------- obras (o cadastro; não é lançamento) ----------
// As obras em que a pessoa trabalha. É a lista do seletor.
// Provisório até o Login: quem trabalha em qual obra ainda vem do mock (MEMBROS),
// casado pelo código da obra.
export async function listarObrasDoUsuario(usuarioId) {
  const idsMock = MEMBROS.filter((m) => m.profile_id === usuarioId).map((m) => m.obra_id)
  if (USAR_MOCK) return resposta(OBRAS.filter((o) => idsMock.includes(o.id)))

  const codigos = OBRAS.filter((o) => idsMock.includes(o.id)).map((o) => o.codigo)
  if (codigos.length === 0) return resposta([])
  const r = await doBanco(
    supabase.from('obras')
      .select('id, codigo, nome, endereco, cliente, data_inicio, data_entrega, situacao')
      .in('codigo', codigos)
      .order('codigo'),
    'carregar as obras',
  )
  if (r.data) r.data.forEach((o) => codigoDaObra.set(o.id, o.codigo))
  return r
}

// ---------- lançamentos: sempre da obra atual ----------
export function listarFrentes() {
  if (!obraAtualId) return semObra()
  const idMock = idMockDaObraAtual()
  if (!idMock) return Promise.resolve({ data: null, erro: 'Não foi possível achar as frentes desta obra.' })
  return resposta(daObra(FRENTES, idMock))
}

// ---------- planejamento (Last Planner) ----------
// Tabelas planejamento_atividades e planejamento_config. Restrições e subtarefas vão
// dentro da atividade (jsonb). Mock em memória só nos testes (sem .env.local).
const atividadesMock = ATIVIDADES_PLANEJAMENTO.map((a) => structuredClone(a))
let proximaAtividadeMock = atividadesMock.length + 1
const configMock = new Map() // id da obra -> dias úteis e feriados (só no mock)
const deOutraObraPlanejamento = { data: null, erro: 'Esta atividade não é da obra aberta. Recarregue a tela.' }

// Tela -> banco: só os campos da atividade (sem id e sem obra_id; a camada põe a obra).
function camposDaAtividade(a) {
  return {
    pai_id: a.pai_id ?? null, ordem: a.ordem, titulo: a.titulo, inicio: a.inicio, fim: a.fim,
    progresso: a.progresso, status: a.status, subtarefas: a.subtarefas ?? [], restricoes: a.restricoes ?? [],
    nao_realizado: a.nao_realizado ?? null, arquivada: !!a.arquivada,
  }
}

export async function listarAtividadesPlanejamento() {
  if (!obraAtualId) return semObra()
  if (USAR_MOCK) return resposta(structuredClone(daObra(atividadesMock, obraAtualId)))
  return doBanco(
    supabase.from('planejamento_atividades')
      .select('id, obra_id, pai_id, ordem, titulo, inicio, fim, progresso, status, subtarefas, restricoes, nao_realizado, arquivada')
      .eq('obra_id', obraAtualId).order('ordem'),
    'carregar o planejamento',
  )
}

// A tela manda a atividade sem obra_id; a camada põe.
export async function criarAtividadePlanejamento(atividade) {
  if (!obraAtualId) return semObra()
  if (USAR_MOCK) {
    const nova = { ...structuredClone(atividade), id: `at-${String(proximaAtividadeMock++).padStart(2, '0')}`, obra_id: obraAtualId }
    atividadesMock.push(nova)
    return resposta(structuredClone(nova))
  }
  return doBanco(
    supabase.from('planejamento_atividades').insert({ ...camposDaAtividade(atividade), obra_id: obraAtualId })
      .select('id, obra_id, pai_id, ordem, titulo, inicio, fim, progresso, status, subtarefas, restricoes, nao_realizado, arquivada')
      .single(),
    'criar a atividade',
  )
}

// Grava uma ou várias atividades da obra aberta, tudo junto ou nada (função do banco).
// Recusa tudo se alguma for de outra obra.
export async function salvarAtividadesPlanejamento(lista) {
  if (!obraAtualId) return semObra()
  if (USAR_MOCK) {
    const posicoes = lista.map((a) => atividadesMock.findIndex((x) => x.id === a.id && x.obra_id === obraAtualId))
    if (posicoes.some((i) => i < 0)) return deOutraObraPlanejamento
    posicoes.forEach((i, k) => { atividadesMock[i] = { ...structuredClone(lista[k]), obra_id: obraAtualId } })
    return resposta(structuredClone(posicoes.map((i) => atividadesMock[i])))
  }
  const r = await doBanco(
    supabase.rpc('salvar_atividades_planejamento', {
      p_obra: obraAtualId,
      p_atividades: lista.map((a) => ({ id: a.id, ...camposDaAtividade(a) })),
    }),
    'salvar o planejamento',
  )
  if (r.erro && r.erro.includes('não é da obra aberta')) return deOutraObraPlanejamento
  return r
}

// Sem linha no banco = o padrão (segunda a sexta e os feriados nacionais).
export async function lerConfigPlanejamento() {
  if (!obraAtualId) return semObra()
  if (USAR_MOCK) return resposta(structuredClone(configMock.get(obraAtualId) ?? CONFIG_PADRAO))
  const r = await doBanco(
    supabase.from('planejamento_config').select('dias_uteis, feriados').eq('obra_id', obraAtualId).maybeSingle(),
    'carregar os dias úteis',
  )
  return r.erro ? r : { data: r.data ?? structuredClone(CONFIG_PADRAO), erro: null }
}

export async function salvarConfigPlanejamento(config) {
  if (!obraAtualId) return semObra()
  if (USAR_MOCK) {
    configMock.set(obraAtualId, structuredClone(config))
    return resposta(structuredClone(config))
  }
  return doBanco(
    supabase.from('planejamento_config')
      .upsert({ obra_id: obraAtualId, dias_uteis: config.dias_uteis, feriados: config.feriados }, { onConflict: 'obra_id' })
      .select('dias_uteis, feriados').single(),
    'salvar os dias úteis',
  )
}

// ---------- materiais (Kanban de pedidos) ----------
// Mock em memória (testes): os pedidos mudam durante o uso e voltam ao exemplo ao recarregar.
const pedidosMock = PEDIDOS.map((p) => structuredClone(p))
let proximoIdMock = pedidosMock.length + 1

// Banco -> formato que a tela usa (o mesmo do mock).
function pedidoDoBanco(p) {
  return { ...p, quantidade: Number(p.quantidade), previsao_entrega: p.previsao_entrega ?? '', fornecedor: p.fornecedor ?? '' }
}

// Tela -> banco. obra_id sempre o da obra aberta; data vazia vira null (o banco guarda date).
function pedidoParaBanco(p) {
  return {
    material_id: p.material_id,
    quantidade: p.quantidade,
    frente: p.frente,
    prioridade: p.prioridade,
    status: p.status,
    fornecedor: p.fornecedor ?? '',
    previsao_entrega: p.previsao_entrega || null,
    historico: p.historico,
    recebimento: p.recebimento,
    obra_id: obraAtualId,
  }
}

export async function listarCatalogoMateriais() {
  if (USAR_MOCK) return resposta(MATERIAIS_CATALOGO)
  return doBanco(
    supabase.from('materiais_catalogo').select('id, codigo, nome, unidade, categoria').order('nome'),
    'carregar o catálogo de materiais',
  )
}

export async function listarPedidos() {
  if (!obraAtualId) return semObra()
  if (USAR_MOCK) return resposta(structuredClone(daObra(pedidosMock, obraAtualId)))
  const r = await doBanco(
    // Colunas escritas por extenso (não numa constante) para o tests/check-schema.mjs conferir.
    supabase.from('pedidos_material')
      .select('id, obra_id, material_id, quantidade, frente, prioridade, status, fornecedor, previsao_entrega, historico, recebimento')
      .eq('obra_id', obraAtualId).order('created_at'),
    'carregar os pedidos',
  )
  return r.data ? { data: r.data.map(pedidoDoBanco), erro: null } : r
}

// Cria um pedido na obra atual. A tela manda o pedido sem obra_id; a camada põe.
export async function criarPedido(pedido) {
  if (!obraAtualId) return semObra()
  if (USAR_MOCK) {
    const novo = { ...structuredClone(pedido), id: `pd-${String(proximoIdMock++).padStart(2, '0')}`, obra_id: obraAtualId }
    pedidosMock.push(novo)
    return resposta(structuredClone(novo))
  }
  const r = await doBanco(
    supabase.from('pedidos_material').insert(pedidoParaBanco(pedido))
      .select('id, obra_id, material_id, quantidade, frente, prioridade, status, fornecedor, previsao_entrega, historico, recebimento')
      .single(),
    'criar o pedido',
  )
  return r.data ? { data: pedidoDoBanco(r.data), erro: null } : r
}

// Grava a mudança de um pedido. Recusa pedido de outra obra (nunca salva no lugar errado).
export async function salvarPedido(pedido) {
  if (!obraAtualId) return semObra()
  const deOutraObra = { data: null, erro: 'Este pedido não é da obra aberta. Recarregue a tela.' }
  if (USAR_MOCK) {
    const i = pedidosMock.findIndex((p) => p.id === pedido.id && p.obra_id === obraAtualId)
    if (i < 0) return deOutraObra
    pedidosMock[i] = { ...structuredClone(pedido), obra_id: obraAtualId }
    return resposta(structuredClone(pedidosMock[i]))
  }
  const r = await doBanco(
    supabase.from('pedidos_material').update(pedidoParaBanco(pedido))
      .eq('id', pedido.id).eq('obra_id', obraAtualId)
      .select('id, obra_id, material_id, quantidade, frente, prioridade, status, fornecedor, previsao_entrega, historico, recebimento'),
    'salvar o pedido',
  )
  if (r.erro) return r
  if (!r.data || r.data.length === 0) return deOutraObra
  return { data: pedidoDoBanco(r.data[0]), erro: null }
}

// ---------- medições de empreiteiros ----------
// Ainda sem tabela no banco: em qualquer modo, mock em memória da obra aberta (casada pelo
// código, como as frentes). Volta ao exemplo ao recarregar a página.
const contratosMock = CONTRATOS.map((c) => structuredClone(c))
let itensContratoMock = ITENS_CONTRATO.map((i) => structuredClone(i))
const medicoesMock = MEDICOES.map((m) => structuredClone(m))
let proximoContratoMock = contratosMock.length + 1
let proximoItemContratoMock = itensContratoMock.length + 1
const deOutraObraContrato = { data: null, erro: 'Este contrato não é da obra aberta. Recarregue a tela.' }

function obraDasMedicoes() {
  return obraAtualId ? idMockDaObraAtual() : null
}

// Contratos, itens e boletins da obra aberta, numa leitura só.
export function listarMedicoesDaObra() {
  if (!obraAtualId) return semObra()
  const obraId = obraDasMedicoes()
  if (!obraId) return Promise.resolve({ data: null, erro: 'Não foi possível achar os contratos desta obra.' })
  return resposta(structuredClone({
    contratos: daObra(contratosMock, obraId),
    itens: daObra(itensContratoMock, obraId),
    medicoes: daObra(medicoesMock, obraId),
  }))
}

// A tela manda o contrato sem obra_id; a camada põe.
export function criarContrato(contrato) {
  const obraId = obraDasMedicoes()
  if (!obraId) return semObra()
  const novo = { ...structuredClone(contrato), id: `ct-${String(proximoContratoMock++).padStart(2, '0')}`, obra_id: obraId }
  contratosMock.push(novo)
  return resposta(structuredClone(novo))
}

// Grava o contrato e, se vierem, troca os itens dele inteiros (cadastro do valor).
export function salvarContrato(contrato, itens = null) {
  const obraId = obraDasMedicoes()
  if (!obraId) return semObra()
  const i = contratosMock.findIndex((c) => c.id === contrato.id && c.obra_id === obraId)
  if (i < 0) return Promise.resolve(deOutraObraContrato)
  // Os boletins apontam para os itens: com boletim lançado, o valor não pode ser trocado.
  if (itens && medicoesMock.some((m) => m.contrato_id === contrato.id)) {
    return Promise.resolve({ data: null, erro: 'Este contrato já tem medição: o valor não pode mais ser trocado.' })
  }
  contratosMock[i] = { ...structuredClone(contrato), obra_id: obraId }
  let novosItens = itensContratoMock.filter((it) => it.contrato_id === contrato.id)
  if (itens) {
    novosItens = itens.map((it) => ({ ...structuredClone(it), id: `ic-${String(proximoItemContratoMock++).padStart(2, '0')}`, obra_id: obraId, contrato_id: contrato.id }))
    itensContratoMock = [...itensContratoMock.filter((it) => it.contrato_id !== contrato.id), ...novosItens]
  }
  return resposta(structuredClone({ contrato: contratosMock[i], itens: novosItens }))
}

let proximaMedicaoMock = medicoesMock.length + 1
const soContratoAtivo = { data: null, erro: 'Só contrato "Aprovado / Ativo" recebe medição.' }

// Boletim novo do contrato (a tela manda sem obra_id; a camada põe). Recusa contrato de outra obra.
export function criarMedicao(medicao) {
  const obraId = obraDasMedicoes()
  if (!obraId) return semObra()
  const contrato = contratosMock.find((c) => c.id === medicao.contrato_id && c.obra_id === obraId)
  if (!contrato) return Promise.resolve(deOutraObraContrato)
  if (contrato.status !== 'ativo') return Promise.resolve(soContratoAtivo)
  const nova = { ...structuredClone(medicao), id: `md-${String(proximaMedicaoMock++).padStart(2, '0')}`, obra_id: obraId }
  medicoesMock.push(nova)
  return resposta(structuredClone(nova))
}

// Grava um boletim existente (editar o rascunho ou fechar). Boletim fechado não muda mais.
export function salvarMedicao(medicao) {
  const obraId = obraDasMedicoes()
  if (!obraId) return semObra()
  const i = medicoesMock.findIndex((m) => m.id === medicao.id && m.obra_id === obraId)
  if (i < 0) return Promise.resolve({ data: null, erro: 'Este boletim não é da obra aberta. Recarregue a tela.' })
  if (medicoesMock[i].status === 'fechada') return Promise.resolve({ data: null, erro: 'Este boletim já está fechado e não pode mudar.' })
  if (medicao.contrato_id !== medicoesMock[i].contrato_id) return Promise.resolve(deOutraObraContrato)
  if (contratosMock.find((c) => c.id === medicao.contrato_id)?.status !== 'ativo') return Promise.resolve(soContratoAtivo)
  medicoesMock[i] = { ...structuredClone(medicao), obra_id: obraId }
  return resposta(structuredClone(medicoesMock[i]))
}
// ---------- qualidade: pendências ----------
// Ainda sem tabela no banco: mock em memória da obra aberta (casada pelo código).
const pendenciasMock = PENDENCIAS.map((p) => structuredClone(p))
let proximaPendenciaMock = pendenciasMock.length + 1

function obraDaQualidade() {
  return obraAtualId ? idMockDaObraAtual() : null
}

export function listarPendencias() {
  if (!obraAtualId) return semObra()
  const obraId = obraDaQualidade()
  if (!obraId) return Promise.resolve({ data: null, erro: 'Não foi possível achar as pendências desta obra.' })
  return resposta(structuredClone(daObra(pendenciasMock, obraId)))
}

// A tela manda sem obra_id e sem número; a camada põe a obra e o próximo número DA OBRA.
export function criarPendencia(pendencia) {
  const obraId = obraDaQualidade()
  if (!obraId) return semObra()
  const numero = daObra(pendenciasMock, obraId).reduce((n, p) => Math.max(n, p.numero), 0) + 1
  const nova = { ...structuredClone(pendencia), id: `pq-${String(proximaPendenciaMock++).padStart(2, '0')}`, obra_id: obraId, numero }
  pendenciasMock.push(nova)
  return resposta(structuredClone(nova))
}

export function salvarPendencia(pendencia) {
  const obraId = obraDaQualidade()
  if (!obraId) return semObra()
  const i = pendenciasMock.findIndex((p) => p.id === pendencia.id && p.obra_id === obraId)
  if (i < 0) return Promise.resolve({ data: null, erro: 'Esta pendência não é da obra aberta. Recarregue a tela.' })
  pendenciasMock[i] = { ...structuredClone(pendencia), obra_id: obraId, numero: pendenciasMock[i].numero }
  return resposta(structuredClone(pendenciasMock[i]))
}

// ---------- qualidade: FVS (modelos, vistorias e não conformidades) ----------
// Modelos são da empresa (todas as obras). Vistorias e NCs são da obra aberta.
let modelosFvsMock = MODELOS_FVS.map((m) => structuredClone(m))
const vistoriasMock = VISTORIAS_FVS.map((v) => structuredClone(v))
const ncsMock = NAO_CONFORMIDADES.map((n) => structuredClone(n))
let proximoModeloMock = modelosFvsMock.length + 1
let proximaVistoriaMock = vistoriasMock.length + 1
let proximaNcMock = ncsMock.length + 1

// Modelos, vistorias e NCs da obra aberta, numa leitura só.
export function listarFvs() {
  if (!obraAtualId) return semObra()
  const obraId = obraDaQualidade()
  if (!obraId) return Promise.resolve({ data: null, erro: 'Não foi possível achar as fichas desta obra.' })
  return resposta(structuredClone({ modelos: modelosFvsMock, vistorias: daObra(vistoriasMock, obraId), ncs: daObra(ncsMock, obraId) }))
}

export function salvarModeloFvs(modelo) {
  if (!modelo.id) {
    const novo = { ...structuredClone(modelo), id: `mf-${String(proximoModeloMock++).padStart(2, '0')}` }
    modelosFvsMock = [...modelosFvsMock, novo]
    return resposta(structuredClone(novo))
  }
  if (!modelosFvsMock.some((m) => m.id === modelo.id)) return Promise.resolve({ data: null, erro: 'Este modelo não existe mais. Recarregue a tela.' })
  modelosFvsMock = modelosFvsMock.map((m) => (m.id === modelo.id ? structuredClone(modelo) : m))
  return resposta(structuredClone(modelo))
}

export function criarVistoria(vistoria) {
  const obraId = obraDaQualidade()
  if (!obraId) return semObra()
  const nova = { ...structuredClone(vistoria), id: `vf-${String(proximaVistoriaMock++).padStart(2, '0')}`, obra_id: obraId }
  vistoriasMock.push(nova)
  return resposta(structuredClone(nova))
}

// Vistoria concluída fica travada: não muda mais.
export function salvarVistoria(vistoria) {
  const obraId = obraDaQualidade()
  if (!obraId) return semObra()
  const i = vistoriasMock.findIndex((v) => v.id === vistoria.id && v.obra_id === obraId)
  if (i < 0) return Promise.resolve({ data: null, erro: 'Esta vistoria não é da obra aberta. Recarregue a tela.' })
  if (vistoriasMock[i].status === 'concluida') return Promise.resolve({ data: null, erro: 'Esta vistoria já foi concluída e não pode mudar.' })
  vistoriasMock[i] = { ...structuredClone(vistoria), obra_id: obraId }
  return resposta(structuredClone(vistoriasMock[i]))
}

// NC nova: a camada põe a obra e o próximo código DA OBRA (NC-001, NC-002…).
export function criarNaoConformidade(nc) {
  const obraId = obraDaQualidade()
  if (!obraId) return semObra()
  if (!vistoriasMock.some((v) => v.id === nc.vistoria_id && v.obra_id === obraId)) return Promise.resolve({ data: null, erro: 'Esta vistoria não é da obra aberta. Recarregue a tela.' })
  const numero = daObra(ncsMock, obraId).reduce((n, x) => Math.max(n, Number(x.codigo.slice(3))), 0) + 1
  const nova = { ...structuredClone(nc), id: `nc-${String(proximaNcMock++).padStart(2, '0')}`, obra_id: obraId, codigo: `NC-${String(numero).padStart(3, '0')}` }
  ncsMock.push(nova)
  return resposta(structuredClone(nova))
}

export function salvarNaoConformidade(nc) {
  const obraId = obraDaQualidade()
  if (!obraId) return semObra()
  const i = ncsMock.findIndex((x) => x.id === nc.id && x.obra_id === obraId)
  if (i < 0) return Promise.resolve({ data: null, erro: 'Esta não conformidade não é da obra aberta. Recarregue a tela.' })
  if (ncsMock[i].status === 'fechada') return Promise.resolve({ data: null, erro: 'Esta não conformidade já está fechada.' })
  ncsMock[i] = { ...structuredClone(nc), obra_id: obraId, codigo: ncsMock[i].codigo }
  return resposta(structuredClone(ncsMock[i]))
}

// ---------- qualidade: Gemba Walk ----------
const gembaMock = GEMBA_OBSERVACOES.map((o) => structuredClone(o))
let proximaGembaMock = gembaMock.length + 1

export function listarGemba() {
  if (!obraAtualId) return semObra()
  const obraId = obraDaQualidade()
  if (!obraId) return Promise.resolve({ data: null, erro: 'Não foi possível achar as observações desta obra.' })
  return resposta(structuredClone(daObra(gembaMock, obraId)))
}

export function criarObservacaoGemba(observacao) {
  const obraId = obraDaQualidade()
  if (!obraId) return semObra()
  const nova = { ...structuredClone(observacao), id: `gb-${String(proximaGembaMock++).padStart(2, '0')}`, obra_id: obraId }
  gembaMock.push(nova)
  return resposta(structuredClone(nova))
}

export function salvarObservacaoGemba(observacao) {
  const obraId = obraDaQualidade()
  if (!obraId) return semObra()
  const i = gembaMock.findIndex((o) => o.id === observacao.id && o.obra_id === obraId)
  if (i < 0) return Promise.resolve({ data: null, erro: 'Esta observação não é da obra aberta. Recarregue a tela.' })
  gembaMock[i] = { ...structuredClone(observacao), obra_id: obraId }
  return resposta(structuredClone(gembaMock[i]))
}

// ---------- relatórios (BI) ----------
// Lê de uma vez o que cada módulo tem da obra aberta. Um módulo que falhar não derruba os
// outros: ele volta como null e o erro vai em `erros` (o painel dele mostra o aviso).
// Módulo que ainda não existe (ex.: Diário de Obra) também volta como null.
export async function carregarFontesDoBI() {
  if (!obraAtualId) return semObra()
  const [ra, rc, rm, rp, rcat, rq, rf, rg] = await Promise.all([
    listarAtividadesPlanejamento(), lerConfigPlanejamento(), listarMedicoesDaObra(), listarPedidos(),
    listarCatalogoMateriais(), listarPendencias(), listarFvs(), listarGemba(),
  ])
  const erros = {}
  const pega = (r, modulo) => { if (r.erro) { erros[modulo] = r.erro; return null } return r.data }
  const med = pega(rm, 'medicoes')
  const fvs = pega(rf, 'qualidade')
  return resposta({
    fontes: {
      atividades: pega(ra, 'planejamento'), config: pega(rc, 'planejamento'),
      contratos: med?.contratos ?? null, itensContrato: med?.itens ?? null, medicoes: med?.medicoes ?? null,
      pedidos: pega(rp, 'materiais'), catalogo: pega(rcat, 'materiais'),
      pendencias: pega(rq, 'qualidade'), vistorias: fvs?.vistorias ?? null, ncs: fvs?.ncs ?? null, modelosFvs: fvs?.modelos ?? null,
      gemba: pega(rg, 'qualidade'),
      diarios: null, // entra na etapa 2 do BI (Ritmo e Produção), via listarDiarios
    },
    erros,
  })
}

// ---------- diário de obra (RDO) ----------
// Ainda sem tabela no banco: mock em memória da obra aberta (casada pelo código, como as
// frentes). Um diário por obra e por dia: salvar um dia que já tem diário atualiza o mesmo.
const diariosMock = DIARIOS.map((d) => structuredClone(d))
let proximoDiarioMock = diariosMock.length + 1

export function listarDiarios() {
  if (!obraAtualId) return semObra()
  const obraId = idMockDaObraAtual()
  if (!obraId) return Promise.resolve({ data: null, erro: 'Não foi possível achar o diário desta obra.' })
  return resposta(structuredClone(daObra(diariosMock, obraId)))
}

export function salvarDiario(diario) {
  if (!obraAtualId) return semObra()
  const obraId = idMockDaObraAtual()
  if (!obraId) return semObra()
  const i = diariosMock.findIndex((d) => d.obra_id === obraId && (diario.id ? d.id === diario.id : d.data === diario.data))
  if (diario.id && i < 0) return Promise.resolve({ data: null, erro: 'Este diário não é da obra aberta. Recarregue a tela.' })
  if (i >= 0) {
    diariosMock[i] = { ...structuredClone(diario), id: diariosMock[i].id, obra_id: obraId, lancado_em: diariosMock[i].lancado_em, lancado_por: diariosMock[i].lancado_por }
    return resposta(structuredClone(diariosMock[i]))
  }
  const novo = { ...structuredClone(diario), id: `dr-${String(proximoDiarioMock++).padStart(2, '0')}`, obra_id: obraId }
  diariosMock.push(novo)
  return resposta(structuredClone(novo))
}
