// Regras puras do módulo MATERIAIS (Kanban de pedidos). Sem React, sem banco.
// Cada pedido é um lote de material (ex.: "50 sacos de cimento") que anda por 5 colunas.
import { diasEntre, somarDias } from './datas.js'

// Vocabulário de status: idêntico ao CHECK do banco quando ele existir.
export const STATUS = [
  { id: 'solicitar', rotulo: 'Solicitar' },
  { id: 'cotacao', rotulo: 'Em cotação' },
  { id: 'comprado', rotulo: 'Comprado / a caminho' },
  { id: 'almoxarifado', rotulo: 'No almoxarifado' },
  { id: 'entregue', rotulo: 'Entregue na frente' },
]

export const CATEGORIAS = {
  grosso: 'Material grosso',
  acabamento: 'Acabamento',
  instalacoes: 'Instalações',
}

export const PRIORIDADES = ['normal', 'critico']

const ORDEM = STATUS.map((s) => s.id)

// "50 sacos", "1 saco", "12 m³": unidades por extenso vão para o plural; símbolos não.
const PLURAIS = { saco: 'sacos', barra: 'barras', lata: 'latas', rolo: 'rolos' }
export function rotuloQuantidade(quantidade, unidade) {
  const n = Number(quantidade).toLocaleString('pt-BR')
  if (!unidade) return n
  const u = Number(quantidade) === 1 ? unidade : (PLURAIS[unidade] || unidade)
  return `${n} ${u}`
}

export function rotuloStatus(id) {
  return STATUS.find((s) => s.id === id)?.rotulo ?? id
}

export function proximoStatus(id) {
  const i = ORDEM.indexOf(id)
  return i >= 0 && i < ORDEM.length - 1 ? ORDEM[i + 1] : null
}

export function statusAnterior(id) {
  const i = ORDEM.indexOf(id)
  return i > 0 ? ORDEM[i - 1] : null
}

// "Voltar" desfaz uma mudança por engano. Pedido entregue na frente não volta.
export function podeVoltar(status) {
  return status !== 'entregue' && statusAnterior(status) !== null
}

// Só frentes abertas recebem material (concluída não pede mais nada).
export function frentesQueRecebemMaterial(frentes) {
  return frentes.filter((f) => f.status !== 'Concluída').map((f) => f.servico)
}

// Comprado, com previsão já vencida, e ainda não chegou ao almoxarifado.
export function estaAtrasado(pedido, hoje) {
  return pedido.status === 'comprado' && !!pedido.previsao_entrega && pedido.previsao_entrega < hoje
}

// Recebimento com "não" em alguma pergunta do checklist.
export function temAlertaRecebimento(pedido) {
  const r = pedido.recebimento || {}
  return r.qtd_bate_nf === false || r.estado_ok === false
}

function dataDoStatus(pedido, status) {
  const ev = [...(pedido.historico || [])].reverse().find((h) => h.status === status)
  return ev ? ev.data : null
}

// "Há X dias nesta coluna": desde a última entrada do pedido no status atual.
export function diasNaColuna(pedido, hoje) {
  const desde = dataDoStatus(pedido, pedido.status)
  return desde ? Math.max(0, diasEntre(desde, hoje)) : 0
}

// Lead time: dias entre o pedido (solicitar) e a chegada ao almoxarifado.
export function leadTime(pedido) {
  const ini = dataDoStatus(pedido, 'solicitar')
  const fim = dataDoStatus(pedido, 'almoxarifado')
  return ini && fim ? diasEntre(ini, fim) : null
}

export function contadores(pedidos, hoje) {
  const daqui7 = somarDias(hoje, 7)
  return {
    emCotacao: pedidos.filter((p) => p.status === 'cotacao').length,
    chegandoSemana: pedidos.filter((p) => p.status === 'comprado' && p.previsao_entrega
      && p.previsao_entrega >= hoje && p.previsao_entrega <= daqui7).length,
    atrasados: pedidos.filter((p) => estaAtrasado(p, hoje)).length,
  }
}

// Cadastro rápido: material, quantidade, frente e prioridade. Devolve { campo: mensagem }.
export function validarNovoPedido(d) {
  const erros = {}
  if (!d.material_id) erros.material_id = 'Escolha o material.'
  const q = Number(d.quantidade)
  if (d.quantidade === '' || d.quantidade === null || d.quantidade === undefined) erros.quantidade = 'Informe a quantidade.'
  else if (!Number.isFinite(q) || q <= 0) erros.quantidade = 'A quantidade tem que ser um número maior que zero.'
  if (!d.frente || !String(d.frente).trim()) erros.frente = 'Informe a frente onde o material vai ser usado.'
  if (!PRIORIDADES.includes(d.prioridade)) erros.prioridade = 'Escolha a prioridade.'
  return erros
}

export function novoPedido(d, hoje, id) {
  return {
    id,
    material_id: d.material_id,
    quantidade: Number(d.quantidade),
    frente: String(d.frente).trim(),
    prioridade: d.prioridade,
    status: 'solicitar',
    fornecedor: '',
    previsao_entrega: '',
    historico: [{ status: 'solicitar', data: hoje }],
    recebimento: { qtd_bate_nf: null, estado_ok: null, avarias: '', foto_nf: '' },
  }
}

// O que cada coluna exige para o pedido entrar nela. Devolve { campo: mensagem }.
export function validarMudanca(destino, d = {}) {
  const erros = {}
  if (destino === 'comprado') {
    if (!d.fornecedor || !String(d.fornecedor).trim()) erros.fornecedor = 'Informe o fornecedor.'
    if (!d.previsao_entrega) erros.previsao_entrega = 'Informe a previsão de entrega.'
  }
  if (destino === 'almoxarifado') {
    if (d.qtd_bate_nf !== true && d.qtd_bate_nf !== false) erros.qtd_bate_nf = 'Responda se a quantidade bate com a nota fiscal.'
    if (d.estado_ok !== true && d.estado_ok !== false) erros.estado_ok = 'Responda se o material chegou em perfeito estado.'
  }
  if (destino === 'entregue') {
    if (!d.frente || !String(d.frente).trim()) erros.frente = 'Confirme a frente onde o material foi aplicado.'
  }
  return erros
}

// Aplica a mudança de coluna e grava {status, data} no histórico.
export function aplicarMudanca(pedido, destino, d, hoje) {
  const novo = { ...pedido, status: destino, historico: [...pedido.historico, { status: destino, data: hoje }] }
  if (destino === 'comprado') {
    novo.fornecedor = String(d.fornecedor).trim()
    novo.previsao_entrega = d.previsao_entrega
  }
  if (destino === 'almoxarifado') {
    novo.recebimento = {
      qtd_bate_nf: d.qtd_bate_nf,
      estado_ok: d.estado_ok,
      avarias: (d.avarias || '').trim(),
      foto_nf: d.foto_nf || '',
    }
  }
  if (destino === 'entregue') novo.frente = String(d.frente).trim()
  return novo
}
