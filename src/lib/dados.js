// CAMADA DE DADOS: a única porta de entrada dos dados. Nenhuma tela busca nada sozinha.
//
// MULTI-OBRA: a camada guarda a obra atual e INJETA o obra_id em toda busca de
// lançamento. As telas nunca passam obra_id — assim nenhuma consegue esquecer o filtro.
//
// Nesta fase as funções devolvem os dados de exemplo (mockData). Na etapa do
// Supabase, troca-se só o miolo de cada função; nenhuma tela muda.
import { OBRAS, MEMBROS, FRENTES, USUARIOS, MATERIAIS_CATALOGO, PEDIDOS } from './mockData.js'
import { daObra } from './obras.js'

let obraAtualId = null

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

// ---------- login de demonstração ----------
export function listarUsuariosDemo() {
  return resposta(USUARIOS)
}

// ---------- obras (o cadastro; não é lançamento) ----------
// As obras em que a pessoa trabalha. É a lista do seletor.
export function listarObrasDoUsuario(usuarioId) {
  const ids = MEMBROS.filter((m) => m.profile_id === usuarioId).map((m) => m.obra_id)
  return resposta(OBRAS.filter((o) => ids.includes(o.id)))
}

// ---------- lançamentos: sempre da obra atual ----------
export function listarFrentes() {
  if (!obraAtualId) return semObra()
  return resposta(daObra(FRENTES, obraAtualId))
}

// ---------- materiais (Kanban de pedidos) ----------
// Mock em memória: os pedidos mudam durante o uso e voltam ao exemplo ao recarregar.
const pedidos = PEDIDOS.map((p) => structuredClone(p))
let proximoId = pedidos.length + 1

export function listarCatalogoMateriais() {
  return resposta(MATERIAIS_CATALOGO)
}

export function listarPedidos() {
  if (!obraAtualId) return semObra()
  return resposta(structuredClone(daObra(pedidos, obraAtualId)))
}

// Cria um pedido na obra atual. A tela manda o pedido sem obra_id; a camada põe.
export function criarPedido(pedido) {
  if (!obraAtualId) return semObra()
  const novo = { ...structuredClone(pedido), id: `pd-${String(proximoId++).padStart(2, '0')}`, obra_id: obraAtualId }
  pedidos.push(novo)
  return resposta(structuredClone(novo))
}

// Grava a mudança de um pedido. Recusa pedido de outra obra (nunca salva no lugar errado).
export function salvarPedido(pedido) {
  if (!obraAtualId) return semObra()
  const i = pedidos.findIndex((p) => p.id === pedido.id && p.obra_id === obraAtualId)
  if (i < 0) return Promise.resolve({ data: null, erro: 'Este pedido não é da obra aberta. Recarregue a tela.' })
  pedidos[i] = { ...structuredClone(pedido), obra_id: obraAtualId }
  return resposta(structuredClone(pedidos[i]))
}
