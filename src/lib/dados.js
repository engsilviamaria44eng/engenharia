// CAMADA DE DADOS: a única porta de entrada dos dados. Nenhuma tela busca nada sozinha.
//
// MULTI-OBRA: a camada guarda a obra atual e INJETA o obra_id em toda busca de
// lançamento. As telas nunca passam obra_id — assim nenhuma consegue esquecer o filtro.
//
// Nesta fase as funções devolvem os dados de exemplo (mockData). Na etapa do
// Supabase, troca-se só o miolo de cada função; nenhuma tela muda.
import { OBRAS, MEMBROS, FRENTES, USUARIOS } from './mockData.js'
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
