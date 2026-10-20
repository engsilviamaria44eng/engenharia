// MOTOR DO BI (Relatórios): lê os dados de cada módulo SE eles existirem e devolve séries
// prontas para os gráficos. Sem React, sem banco. Cada painel pergunta `modulosDoBI` se o
// módulo dele tem dado; se não tiver, a tela mostra "Painel bloqueado" — nunca NaN.
//
// `fontes` = o que a camada de dados conseguiu ler da obra aberta. Qualquer campo pode faltar
// (null) quando o módulo ainda não existe ou não carregou:
//   { obra, atividades, config, contratos, itensContrato, medicoes, pedidos, catalogo,
//     pendencias, vistorias, ncs, modelosFvs, gemba, diarios }
import { CONFIG_PADRAO, diasUteisEntre, previstoEm, temFilhosAtivos, segundaDaSemana, rotuloCausa } from './planejamento.js'
import { CLIMAS, rotuloClima, totalDoEfetivo } from './diario.js'
import { valorDaMedicao, valorTotal, arredondar2, STATUS_CONTRATO } from './medicoes.js'
import { STATUS as STATUS_PEDIDO, estaAtrasado, leadTime } from './materiais.js'
import { progressoDaVistoria, rankingDesperdicios } from './qualidade.js'
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

// ---------- ritmo & produção (Planejamento + Diário) ----------
const rotuloDaSemana = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`

// A atividade (ou uma subtarefa dela) foi marcada "não realizada" naquela semana?
function naoRealizadaNaSemana(a, semana) {
  return a.nao_realizado?.semana === semana || (a.subtarefas ?? []).some((s) => s.nao_realizado?.semana === semana)
}

// PPC SEMANAL das últimas `quantas` semanas FECHADAS (a de hoje fica fora: ainda está correndo).
// Metas da semana = atividades (sem filhas, ativas) cujo período cruza a semana. Não batida =
// marcada "não realizada" na semana, ou que devia terminar nela e não está concluída.
// O app não guarda o Kanban de cada semana: o retrato vem desses dois registros.
// Com `desde` (filtro de período), só as semanas que terminam a partir dessa data.
export function ppcSemanal(atividades, hoje, quantas = 8, desde = null) {
  const folhas = folhasAtivas(atividades)
  if (folhas.length === 0) return null
  const atual = segundaDaSemana(hoje)
  const semanas = []
  for (let i = quantas; i >= 1; i--) {
    const inicio = somarDias(atual, -7 * i)
    const fim = somarDias(inicio, 6)
    if (desde && fim < desde) continue
    const metas = folhas.filter((a) => a.inicio <= fim && a.fim >= inicio)
    const naoBatidas = metas.filter((a) => naoRealizadaNaSemana(a, inicio) || (a.fim >= inicio && a.fim <= fim && a.status !== 'concluido')).length
    const batidas = metas.length - naoBatidas
    semanas.push({ inicio, rotulo: rotuloDaSemana(inicio), total: metas.length, batidas, naoBatidas, ppc: metas.length ? pctSeguro(batidas, metas.length) : null })
  }
  const comMeta = semanas.filter((s) => s.total > 0)
  if (comMeta.length === 0) return null
  return { semanas, media: Math.round(comMeta.reduce((s, x) => s + x.ppc, 0) / comMeta.length), maiorTotal: Math.max(...semanas.map((s) => s.total)) }
}

// PARETO DAS CAUSAS: todos os "não realizados" registrados (atividades e subtarefas), da causa
// mais frequente para a menos, com o % de cada uma e o % acumulado. Com `desde`, só os
// registrados em semanas que terminam a partir dessa data.
export function paretoDeCausas(atividades, desde = null) {
  const contagem = new Map()
  const conta = (nr) => nr?.causa && (!desde || somarDias(nr.semana, 6) >= desde)
  const somar = (nr) => { if (conta(nr)) contagem.set(nr.causa, (contagem.get(nr.causa) ?? 0) + 1) }
  for (const a of (atividades ?? []).filter((x) => !x.arquivada)) {
    somar(a.nao_realizado)
    for (const s of a.subtarefas ?? []) somar(s.nao_realizado)
  }
  const total = [...contagem.values()].reduce((s, n) => s + n, 0)
  if (total === 0) return null
  let acumulado = 0
  const causas = [...contagem].map(([causa, vezes]) => ({ causa, rotulo: rotuloCausa(causa), vezes }))
    .sort((x, y) => y.vezes - x.vezes || x.rotulo.localeCompare(y.rotulo, 'pt-BR'))
    .map((c) => { acumulado += c.vezes; return { ...c, pct: pctSeguro(c.vezes, total), acumulado: pctSeguro(acumulado, total) } })
  return { causas, total, maior: causas[0].vezes }
}

// O pior tempo do dia (manhã, tarde e noite), na ordem de CLIMAS: sol < nublado < chuva < chuva forte.
export function piorClima(clima) {
  const ordem = CLIMAS.map((c) => c.id)
  const valores = Object.values(clima ?? {}).filter((v) => ordem.includes(v))
  return valores.length ? valores.sort((a, b) => ordem.indexOf(b) - ordem.indexOf(a))[0] : null
}

// CLIMA × EFETIVO: os últimos `quantos` diários até hoje, um por dia, com o efetivo total e o
// pior tempo do dia. Dia de chuva fica marcado para o gráfico pintar o fundo.
export function climaEEfetivo(diarios, hoje, quantos = 20) {
  const dias = (diarios ?? []).filter((d) => d.data <= hoje).sort((a, b) => a.data.localeCompare(b.data)).slice(-quantos)
    .map((d) => {
      const clima = piorClima(d.clima)
      return { data: d.data, rotulo: rotuloDaSemana(d.data), efetivo: totalDoEfetivo(d.efetivo), clima, rotuloClima: rotuloClima(clima) ?? 'Não informado', chuva: clima === 'chuva' || clima === 'chuva_forte' }
    })
  if (dias.length === 0) return null
  const total = dias.reduce((s, d) => s + d.efetivo, 0)
  return { dias, maiorEfetivo: Math.max(...dias.map((d) => d.efetivo), 1), mediaEfetivo: Math.round(total / dias.length), diasDeChuva: dias.filter((d) => d.chuva).length }
}

// O painel Ritmo & Produção inteiro. Cada pedaço é null quando o módulo dele não tem dado.
export function painelRitmo(fontes, hoje) {
  const mod = modulosDoBI(fontes)
  return {
    ppc: mod.planejamento ? ppcSemanal(fontes.atividades, hoje, 8, fontes.desde) : null,
    pareto: mod.planejamento ? paretoDeCausas(fontes.atividades, fontes.desde) : null,
    clima: mod.diario ? climaEEfetivo(fontes.diarios, hoje) : null,
  }
}

// ---------- contratos & medições ----------
// Medido = só boletins FECHADOS (aprovados), como no Custo medido do Executivo.
function medidoFechado(contrato, itens, medicoes) {
  return arredondar2((medicoes ?? []).filter((m) => m.contrato_id === contrato.id && m.status === 'fechada')
    .reduce((s, m) => s + valorDaMedicao(m, contrato, itens ?? []), 0))
}

// FLUXO DOS CONTRATOS: um cartão por etapa do Kanban, com quantos e quanto (contrato ainda
// sem valor conta na quantidade e aparece em `semValor`).
export function fluxoDosContratos(contratos, itens) {
  return STATUS_CONTRATO.map((s) => {
    const daEtapa = (contratos ?? []).filter((c) => c.status === s.id)
    const valores = daEtapa.map((c) => valorTotal(c, itens ?? []))
    return {
      status: s.id, rotulo: s.rotulo, quantidade: daEtapa.length,
      valor: arredondar2(valores.reduce((t, v) => t + (v ?? 0), 0)), semValor: valores.filter((v) => v === null).length,
    }
  })
}

// Os contratos com valor (ativos e concluídos), com o total, o medido, o % e o saldo a medir.
function contratosComValor(contratos, itens, medicoes) {
  return (contratos ?? []).filter((c) => c.status === 'ativo' || c.status === 'concluido')
    .map((c) => ({ c, total: valorTotal(c, itens ?? []) })).filter((x) => x.total)
    .map(({ c, total }) => {
      const medido = medidoFechado(c, itens, medicoes)
      return { id: c.id, empreiteiro: c.empreiteiro, descricao: c.descricao, total, medido, pct: pctSeguro(medido, total), saldo: arredondar2(Math.max(0, total - medido)) }
    })
}

// MATRIZ DE EMPREITEIROS: uma linha por empreiteiro (somando os contratos dele), do maior valor para o menor.
export function matrizDeEmpreiteiros(contratos, itens, medicoes) {
  const porEmpreiteiro = new Map()
  for (const x of contratosComValor(contratos, itens, medicoes)) {
    const l = porEmpreiteiro.get(x.empreiteiro) ?? { empreiteiro: x.empreiteiro, contratos: 0, total: 0, medido: 0 }
    porEmpreiteiro.set(x.empreiteiro, { ...l, contratos: l.contratos + 1, total: l.total + x.total, medido: l.medido + x.medido })
  }
  return [...porEmpreiteiro.values()]
    .map((l) => ({ ...l, total: arredondar2(l.total), medido: arredondar2(l.medido), pct: pctSeguro(l.medido, l.total), saldo: arredondar2(Math.max(0, l.total - l.medido)) }))
    .sort((a, b) => b.total - a.total || a.empreiteiro.localeCompare(b.empreiteiro, 'pt-BR'))
}

// SALDO A MEDIR POR CONTRATO: o que ainda vai sair do caixa, do maior para o menor (sem os zerados).
export function saldoPorContrato(contratos, itens, medicoes) {
  const linhas = contratosComValor(contratos, itens, medicoes).filter((x) => x.saldo > 0).sort((a, b) => b.saldo - a.saldo)
  if (linhas.length === 0) return null
  return { linhas, total: arredondar2(linhas.reduce((s, x) => s + x.saldo, 0)), maior: linhas[0].saldo }
}

export function painelContratos(fontes) {
  if (!modulosDoBI(fontes).medicoes) return null
  return {
    fluxo: fluxoDosContratos(fontes.contratos, fontes.itensContrato),
    matriz: matrizDeEmpreiteiros(fontes.contratos, fontes.itensContrato, fontes.medicoes),
    saldos: saldoPorContrato(fontes.contratos, fontes.itensContrato, fontes.medicoes),
  }
}

// ---------- materiais ----------
// PEDIDOS POR ETAPA: um cartão por coluna do Kanban de materiais.
export function pedidosPorEtapa(pedidos) {
  return STATUS_PEDIDO.map((s) => ({ status: s.id, rotulo: s.rotulo, quantidade: (pedidos ?? []).filter((p) => p.status === s.id).length }))
}

// ATRASADOS: comprados com previsão vencida, com o nome do material e os dias de atraso.
export function pedidosAtrasados(pedidos, catalogo, hoje) {
  const nome = (id) => (catalogo ?? []).find((m) => m.id === id)?.nome ?? 'Material'
  return (pedidos ?? []).filter((p) => estaAtrasado(p, hoje))
    .map((p) => ({ id: p.id, material: nome(p.material_id), frente: p.frente || '—', dias: diasEntre(p.previsao_entrega, hoje), critico: p.prioridade === 'critico' }))
    .sort((a, b) => b.dias - a.dias)
}

// O dia em que o pedido chegou ao almoxarifado (a última vez que entrou nessa coluna).
function chegadaAoAlmoxarifado(p) {
  return [...(p.historico ?? [])].reverse().find((h) => h.status === 'almoxarifado')?.data ?? null
}

// LEAD TIME: média geral (do pedido à chegada ao almoxarifado) e a média por semana de chegada
// nas 4 últimas semanas (a de hoje incluída). Semana sem chegada fica null ("—").
export function leadTimeDosPedidos(pedidos, hoje) {
  const chegados = (pedidos ?? []).map((p) => ({ dias: leadTime(p), chegada: chegadaAoAlmoxarifado(p) })).filter((x) => x.dias !== null && x.chegada)
  if (chegados.length === 0) return null
  const media = (lista) => (lista.length ? Math.round(lista.reduce((s, x) => s + x.dias, 0) / lista.length) : null)
  const atual = segundaDaSemana(hoje)
  const semanas = [3, 2, 1, 0].map((i) => {
    const inicio = somarDias(atual, -7 * i)
    const daSemana = chegados.filter((x) => x.chegada >= inicio && x.chegada <= somarDias(inicio, 6))
    return { inicio, rotulo: rotuloDaSemana(inicio), media: media(daSemana), pedidos: daSemana.length }
  })
  return { media: media(chegados), pedidos: chegados.length, semanas, maior: Math.max(...semanas.map((s) => s.media ?? 0), 1) }
}

export function painelMateriais(fontes, hoje) {
  if (!modulosDoBI(fontes).materiais) return null
  return {
    etapas: pedidosPorEtapa(fontes.pedidos),
    criticos: fontes.pedidos.filter((p) => p.prioridade === 'critico' && p.status !== 'entregue').length,
    atrasados: pedidosAtrasados(fontes.pedidos, fontes.catalogo, hoje),
    leadTime: leadTimeDosPedidos(fontes.pedidos, hoje),
  }
}

// ---------- qualidade & entrega (Pendências + FVS + Gemba) ----------
// % CONFORME POR MODELO DE FVS: OK ÷ (OK + NC) somando as vistorias de cada modelo; o pior primeiro.
export function conformePorModelo(vistorias) {
  const porModelo = new Map()
  for (const v of vistorias ?? []) {
    const p = progressoDaVistoria(v)
    const l = porModelo.get(v.modelo_nome) ?? { modelo: v.modelo_nome, ok: 0, nc: 0, vistorias: 0 }
    porModelo.set(v.modelo_nome, { ...l, ok: l.ok + p.ok, nc: l.nc + p.nc, vistorias: l.vistorias + 1 })
  }
  const linhas = [...porModelo.values()].filter((l) => l.ok + l.nc > 0).map((l) => ({ ...l, pct: pctSeguro(l.ok, l.ok + l.nc) }))
    .sort((a, b) => a.pct - b.pct || a.modelo.localeCompare(b.modelo, 'pt-BR'))
  return linhas.length ? linhas : null
}

// Cores das fatias do donut (uma por empresa; a 7ª em diante repete).
export const CORES_BI = ['#0E7C86', '#F2AD21', '#175D8E', '#C2412D', '#6B7A8F', '#2F855A']

const abertas = (pendencias) => (pendencias ?? []).filter((p) => p.status !== 'resolvido')

// Conta por um campo, do maior para o menor (empate em ordem alfabética).
function contarPor(lista, campo, semNome) {
  const conta = new Map()
  for (const x of lista) { const k = (x[campo] ?? '').trim() || semNome; conta.set(k, (conta.get(k) ?? 0) + 1) }
  return [...conta].map(([nome, total]) => ({ nome, total })).sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, 'pt-BR'))
}

// PENDÊNCIAS POR EMPRESA (abertas): fatias do donut com cor, % e o conic-gradient pronto.
export function pendenciasPorEmpresa(pendencias) {
  const fatias = contarPor(abertas(pendencias), 'empresa', 'Sem empresa')
  if (fatias.length === 0) return null
  const total = fatias.reduce((s, f) => s + f.total, 0)
  let ate = 0
  const comCor = fatias.map((f, i) => {
    const de = ate
    ate += (f.total / total) * 100
    return { ...f, pct: pctSeguro(f.total, total), cor: CORES_BI[i % CORES_BI.length], de, ate }
  })
  return { fatias: comCor, total, gradiente: `conic-gradient(${comCor.map((f) => `${f.cor} ${f.de.toFixed(2)}% ${f.ate.toFixed(2)}%`).join(', ')})` }
}

// MAPA POR LOCAL (abertas): o bloco maior é o local com mais pendências.
export function pendenciasPorLocal(pendencias) {
  const locais = contarPor(abertas(pendencias), 'local', 'Sem local')
  return locais.length ? { locais, total: locais.reduce((s, l) => s + l.total, 0) } : null
}

// RANKING DE DESPERDÍCIOS (Gemba): só os tipos que apareceram, do maior para o menor.
export function rankingDoGemba(gemba) {
  const ranking = rankingDesperdicios(gemba ?? []).filter((r) => r.total > 0)
  return ranking.length ? { ranking, maior: ranking[0].total } : null
}

export function painelQualidade(fontes) {
  if (!modulosDoBI(fontes).qualidade) return null
  const ncsAbertas = (fontes.ncs ?? []).filter((n) => n.status !== 'fechada').length
  return {
    conforme: conformePorModelo(fontes.vistorias),
    empresas: pendenciasPorEmpresa(fontes.pendencias),
    locais: pendenciasPorLocal(fontes.pendencias),
    desperdicios: rankingDoGemba(fontes.gemba),
    abertas: abertas(fontes.pendencias).length, ncsAbertas,
  }
}

// ---------- filtros cruzados ----------
export const PERIODOS_BI = [
  { id: 'tudo', rotulo: 'Tudo' },
  { id: 'mes', rotulo: 'Este mês' },
  { id: '4semanas', rotulo: 'Últimas 4 semanas' },
]

export const FILTROS_BI_INICIAIS = { empresa: '', periodo: 'tudo' }

// Data de corte do período (null = tudo). "Últimas 4 semanas" = esta semana e as 3 anteriores.
export function inicioDoPeriodo(periodo, hoje) {
  if (periodo === 'mes') return `${hoje.slice(0, 8)}01`
  if (periodo === '4semanas') return somarDias(segundaDaSemana(hoje), -21)
  return null
}

// As empresas que aparecem nos dados da obra (contratos, pendências e NCs), em ordem alfabética.
export function empresasDoBI(fontes) {
  const nomes = [
    ...(fontes?.contratos ?? []).map((c) => c.empreiteiro),
    ...(fontes?.pendencias ?? []).map((p) => p.empresa),
    ...(fontes?.ncs ?? []).map((n) => n.responsavel),
  ].map((n) => (n ?? '').trim()).filter(Boolean)
  return [...new Set(nomes)].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

// Aplica os filtros às fontes ANTES dos painéis. Empresa: contratos (e as medições deles),
// pendências, NCs e Gemba (pelo responsável). Período: o que tem data de acontecimento —
// diários, pedidos (data do pedido), pendências, vistorias, NCs, Gemba, semanas do PPC e causas.
// O acumulado (Curva S, evolução, prazo, contratos e saldos) não muda com o período.
export function filtrarFontes(fontes, filtros, hoje) {
  const { empresa = '', periodo = 'tudo' } = filtros ?? {}
  const desde = inicioDoPeriodo(periodo, hoje)
  const daEmpresa = (nome) => !empresa || (nome ?? '').trim() === empresa
  const noPeriodo = (data) => !desde || (!!data && data >= desde)
  const lista = (l, ok) => (Array.isArray(l) ? l.filter(ok) : l)
  const contratos = lista(fontes.contratos, (c) => daEmpresa(c.empreiteiro))
  const ids = new Set((contratos ?? []).map((c) => c.id))
  const dataDoPedido = (p) => p.historico?.find((h) => h.status === 'solicitar')?.data ?? p.historico?.[0]?.data
  return {
    ...fontes,
    desde,
    contratos,
    medicoes: lista(fontes.medicoes, (m) => ids.has(m.contrato_id)),
    pendencias: lista(fontes.pendencias, (p) => daEmpresa(p.empresa) && noPeriodo(p.data_vistoria)),
    ncs: lista(fontes.ncs, (n) => daEmpresa(n.responsavel) && noPeriodo(n.aberta_em)),
    gemba: lista(fontes.gemba, (g) => daEmpresa(g.responsavel) && noPeriodo(g.data)),
    vistorias: lista(fontes.vistorias, (v) => noPeriodo(v.data)),
    diarios: lista(fontes.diarios, (d) => noPeriodo(d.data)),
    pedidos: lista(fontes.pedidos, (p) => noPeriodo(dataDoPedido(p))),
  }
}

// "Empresa: Silva Alvenarias · Período: Este mês" (para a tela e o cabeçalho da impressão).
export function descreverFiltrosBI(filtros) {
  const periodo = PERIODOS_BI.find((p) => p.id === filtros?.periodo)?.rotulo ?? 'Tudo'
  return `Empresa: ${filtros?.empresa || 'todas'} · Período: ${periodo}`
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
