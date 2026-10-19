// MOTOR DO BI (Relatórios): lê os dados de cada módulo SE eles existirem e devolve séries
// prontas para os gráficos. Sem React, sem banco. Cada painel pergunta `modulosDoBI` se o
// módulo dele tem dado; se não tiver, a tela mostra "Painel bloqueado" — nunca NaN.
//
// `fontes` = o que a camada de dados conseguiu ler da obra aberta. Qualquer campo pode faltar
// (null) quando o módulo ainda não existe ou não carregou:
//   { obra, atividades, config, contratos, itensContrato, medicoes, pedidos, catalogo,
//     pendencias, vistorias, ncs, modelosFvs, gemba, diarios }
import { CONFIG_PADRAO, diasUteisEntre, previstoEm, temFilhosAtivos, segundaDaSemana } from './planejamento.js'
import { valorDaMedicao } from './medicoes.js'
import { diasEntre, somarDias } from './datas.js'

// Os módulos que alimentam o BI, com o nome que aparece no "Painel bloqueado".
export const MODULOS_BI = [
  { id: 'planejamento', nome: 'Planejamento', tem: (f) => temItens(f.atividades) },
  { id: 'medicoes', nome: 'Medição de empreiteiros', tem: (f) => temItens(f.contratos) },
  { id: 'materiais', nome: 'Materiais', tem: (f) => temItens(f.pedidos) },
  { id: 'qualidade', nome: 'Qualidade', tem: (f) => temItens(f.pendencias) || temItens(f.vistorias) || temItens(f.gemba) },
  { id: 'diario', nome: 'Diário de Obra', tem: (f) => temItens(f.diarios) },
]

function temItens(lista) {
  return Array.isArray(lista) && lista.length > 0
}

// { planejamento: true, medicoes: true, ..., diario: false }
export function modulosDoBI(fontes) {
  return Object.fromEntries(MODULOS_BI.map((m) => [m.id, !!fontes && m.tem(fontes)]))
}

export function nomeDoModulo(id) {
  return MODULOS_BI.find((m) => m.id === id)?.nome ?? id
}

// Número seguro: nada de NaN ou Infinity chegando na tela.
export function seguro(n, padrao = 0) {
  return Number.isFinite(n) ? n : padrao
}

export function pctSeguro(parte, total) {
  return total > 0 ? Math.round((parte / total) * 100) : 0
}

// ---------- planejamento: as atividades que contam (sem filhas, ativas) ----------
function folhasAtivas(atividades) {
  return (atividades ?? []).filter((a) => !a.arquivada && !temFilhosAtivos(atividades, a.id))
}

function pesoDe(a, config) {
  return Math.max(diasUteisEntre(a.inicio, a.fim, config), 1)
}

// Planejado e real acumulados (%) numa data, pesados pelos dias úteis de cada atividade.
// O real do passado é ESTIMADO: o app não guarda o % semana a semana, então cada atividade
// conta como tendo andado no ritmo do plano até chegar no % que tem hoje.
function acumuladoEm(folhas, data, config, { ehHoje }) {
  let peso = 0
  let plan = 0
  let real = 0
  for (const a of folhas) {
    const w = pesoDe(a, config)
    const p = previstoEm(a.inicio, a.fim, data, config)
    peso += w
    plan += w * p
    real += w * (ehHoje ? a.progresso : Math.min(a.progresso, p))
  }
  return { plan: peso ? plan / peso : 0, real: peso ? real / peso : 0 }
}

// CURVA S: uma linha por semana (segunda-feira), do início ao fim do planejamento.
// `plan` vale para todas as semanas; `real` só até a semana de hoje (depois é futuro).
export function curvaS(atividades, configIn, hoje) {
  const config = configIn ?? CONFIG_PADRAO
  const folhas = folhasAtivas(atividades)
  if (folhas.length === 0) return null
  const inicio = segundaDaSemana(folhas.map((a) => a.inicio).sort()[0])
  const fim = folhas.map((a) => a.fim).sort().at(-1)
  const semanaHoje = segundaDaSemana(hoje)
  const semanas = []
  for (let s = inicio; s <= fim || s <= semanaHoje; s = somarDias(s, 7)) {
    const fimSemana = somarDias(s, 7) // o previsto conta "até ontem": a segunda seguinte fecha a semana
    const passou = s < semanaHoje
    const atual = s === semanaHoje
    const v = acumuladoEm(folhas, atual ? hoje : fimSemana, config, { ehHoje: atual })
    semanas.push({
      inicio: s, rotulo: `${s.slice(8, 10)}/${s.slice(5, 7)}`,
      plan: Math.round(v.plan), real: passou || atual ? Math.round(v.real) : null, atual,
    })
    if (semanas.length > 120) break // trava de segurança
  }
  return { semanas, indiceHoje: semanas.findIndex((s) => s.atual) }
}

// EVOLUÇÃO: % real × % planejado da obra hoje.
export function evolucao(atividades, configIn, hoje) {
  const folhas = folhasAtivas(atividades)
  if (folhas.length === 0) return null
  const v = acumuladoEm(folhas, hoje, configIn ?? CONFIG_PADRAO, { ehHoje: true })
  const real = Math.round(v.real)
  const plan = Math.round(v.plan)
  return { real, plan, diferenca: real - plan, adiantada: real >= plan }
}

// PPC GERAL: das atividades que já deviam ter terminado (fim antes de hoje), quantas estão concluídas.
export function ppcGeral(atividades, hoje) {
  const devidas = folhasAtivas(atividades).filter((a) => a.fim < hoje)
  if (devidas.length === 0) return null
  const concluidas = devidas.filter((a) => a.status === 'concluido').length
  return { concluidas, total: devidas.length, pct: pctSeguro(concluidas, devidas.length) }
}

// PRAZO: dias até a entrega do contrato (negativo = já passou).
export function prazoDaObra(obra, hoje) {
  if (!obra?.data_entrega) return null
  return { dias: diasEntre(hoje, obra.data_entrega), data: obra.data_entrega }
}

// CUSTO MEDIDO: R$ dos boletins FECHADOS (aprovados) de todos os contratos.
export function custoMedido(contratos, itens, medicoes) {
  if (!temItens(contratos)) return null
  const porId = new Map(contratos.map((c) => [c.id, c]))
  const fechados = (medicoes ?? []).filter((m) => m.status === 'fechada' && porId.has(m.contrato_id))
  const total = fechados.reduce((s, m) => s + valorDaMedicao(m, porId.get(m.contrato_id), itens ?? []), 0)
  return { valor: Math.round(total * 100) / 100, boletins: fechados.length }
}

// O Painel Executivo inteiro. Cada pedaço é null quando o módulo dele não tem dado.
export function painelExecutivo(fontes, hoje) {
  const mod = modulosDoBI(fontes)
  return {
    evolucao: mod.planejamento ? evolucao(fontes.atividades, fontes.config, hoje) : null,
    prazo: prazoDaObra(fontes.obra, hoje),
    custo: mod.medicoes ? custoMedido(fontes.contratos, fontes.itensContrato, fontes.medicoes) : null,
    curva: mod.planejamento ? curvaS(fontes.atividades, fontes.config, hoje) : null,
    ppc: mod.planejamento ? ppcGeral(fontes.atividades, hoje) : null,
  }
}

// ---------- desenho ----------
// Pontos de uma série (0–100%) numa caixa de largura × altura, para o SVG da Curva S.
export function pontosDaSerie(valores, largura, altura) {
  const n = valores.length
  return valores.map((v, i) => (v === null || v === undefined ? null : {
    x: n > 1 ? (i / (n - 1)) * largura : largura / 2,
    y: altura - (Math.max(0, Math.min(100, v)) / 100) * altura,
  }))
}
