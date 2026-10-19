// CAMADA DE DADOS: a única porta de entrada dos dados. Nenhuma tela busca nada sozinha,
// e só este arquivo chama supabase.from(...).
//
// MULTI-OBRA: a camada guarda a obra atual e INJETA o obra_id em toda busca e gravação
// de lançamento. As telas nunca passam obra_id — assim nenhuma consegue esquecer o filtro.
//
// BANCO x MOCK: com o .env.local presente (navegador), obras e Materiais vão ao Supabase.
// Sem ele (testes em Node), tudo usa o mockData. Frentes e o login de demonstração ainda
// são mock em qualquer caso, até os módulos deles irem para o banco.
import { supabase } from './supabase.js'
import { OBRAS, MEMBROS, FRENTES, USUARIOS, MATERIAIS_CATALOGO, PEDIDOS } from './mockData.js'
import { daObra } from './obras.js'

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
