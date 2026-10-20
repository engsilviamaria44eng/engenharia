// Regras puras do DIÁRIO DE OBRA (RDO). Sem React, sem banco.
// Datas como texto 'AAAA-MM-DD' (nada de toISOString: vira UTC e pula um dia).
//
// Diário (um por obra e por dia): { id, obra_id, data, clima: { manha, tarde, noite },
//   servicos: [{ frente_id, avanco, concluido, detalhe }] (+ atividades fora do orçamento),
//   efetivo: { Função: n } — o efetivo é DO DIA, não de cada serviço (decisão do engenheiro, 19/10/2026),
//   fotos: [{ id, url, frente_id, ambiente, cliente_ve }],
//   equipamentos: [{ nome, quantidade, origem, situacao }],
//   ocorrencias, lancado_por, lancado_em }
// O avanço é ACUMULADO (o % total da frente naquele dia), não o quanto andou no dia.
import { diasEntre } from './datas.js'

export const CLIMAS = [
  { id: 'sol', rotulo: 'Sol', icone: '☀' },
  { id: 'nublado', rotulo: 'Nublado', icone: '☁' },
  { id: 'chuva', rotulo: 'Chuva', icone: '☂', chuva: true },
  { id: 'chuva_forte', rotulo: 'Chuva forte', icone: '⛈', chuva: true },
]

export const PERIODOS = [
  { id: 'manha', rotulo: 'Manhã' },
  { id: 'tarde', rotulo: 'Tarde' },
  { id: 'noite', rotulo: 'Noite' },
]

// As 14 funções principais, nesta ordem (PRD). Cada obra pode acrescentar outras.
export const FUNCOES_PADRAO = [
  'Pedreiro', 'Servente', 'Carpinteiro', 'Armador', 'Eletricista', 'Encanador', 'Pintor',
  'Gesseiro', 'Azulejista', 'Serralheiro', 'Soldador', 'Impermeabilizador', 'Operador de máquinas', 'Encarregado',
]

export const ORIGENS_EQUIP = ['Próprio', 'Alugado']
export const SITUACOES_EQUIP = ['Em uso', 'Parado', 'Com defeito']

export function rotuloClima(id) {
  return CLIMAS.find((c) => c.id === id)?.rotulo ?? null
}

// "Sol · Chuva · —" (manhã · tarde · noite)
export function resumoClima(clima) {
  return PERIODOS.map((p) => rotuloClima(clima?.[p.id]) ?? '—').join(' · ')
}

// Tocar de novo no clima marcado desmarca.
export function alternarClima(clima, periodo, valor) {
  return { ...clima, [periodo]: clima?.[periodo] === valor ? null : valor }
}

// ---------- RDO ----------
// Número do RDO = o dia da obra, contado em dias corridos desde o início (início = nº 1).
// Calculado, nunca digitado: um diário atrasado não muda o número de outro.
export function numeroDoRdo(dataInicioObra, data) {
  return diasEntre(dataInicioObra, data) + 1
}

const DIAS_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
export function diaDaSemanaPorExtenso(iso) {
  const [a, m, d] = iso.split('-').map(Number)
  return DIAS_SEMANA[new Date(Date.UTC(a, m - 1, d)).getUTCDay()]
}

// ---------- efetivo ----------
const semAcento = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

// As funções da obra: as 14 + as que já foram acrescentadas nos diários dela.
export function funcoesDaObra(diarios, extrasDoFormulario = []) {
  const lista = [...FUNCOES_PADRAO]
  const add = (f) => { if (!lista.some((x) => semAcento(x) === semAcento(f))) lista.push(f) }
  for (const d of diarios ?? []) Object.keys(d.efetivo ?? {}).forEach(add)
  extrasDoFormulario.forEach(add)
  return lista
}

export function ehFuncaoNova(funcao) {
  return !FUNCOES_PADRAO.includes(funcao)
}

// "outra função": primeira letra maiúscula; se já existe com outro jeito de escrever, usa a que existe.
export function normalizarFuncao(nome, existentes) {
  const t = String(nome ?? '').trim().replace(/\s+/g, ' ')
  if (!t) return null
  const igual = existentes.find((f) => semAcento(f) === semAcento(t))
  return igual ?? t.charAt(0).toUpperCase() + t.slice(1)
}

export function totalDoEfetivo(efetivo) {
  return Object.values(efetivo ?? {}).reduce((s, n) => s + (Number(n) || 0), 0)
}

// Efetivo do dia por função: { Pedreiro: 5, Servente: 3 } e o total.
export function efetivoDoDia(diario) {
  const porFuncao = { ...(diario.efetivo ?? {}) }
  return { porFuncao, total: totalDoEfetivo(porFuncao) }
}

// Mão de obra do dia em lista, na ordem das funções (as 14 primeiro, as novas depois).
export function maoDeObraDoDia(diario) {
  const { porFuncao } = efetivoDoDia(diario)
  const ordem = (f) => { const i = FUNCOES_PADRAO.indexOf(f); return i < 0 ? 99 : i }
  return Object.entries(porFuncao).map(([funcao, quantidade]) => ({ funcao, quantidade }))
    .sort((a, b) => ordem(a.funcao) - ordem(b.funcao) || a.funcao.localeCompare(b.funcao, 'pt-BR'))
}

// Equipamentos do dia em texto curto: "1× Betoneira 400 L" + a situação quando não está em uso.
export function equipamentosDoDia(diario) {
  return (diario.equipamentos ?? []).map((e) => ({
    texto: `${e.quantidade}× ${e.nome}`,
    origem: e.origem,
    situacao: e.situacao,
    alerta: e.situacao !== 'Em uso',
  }))
}

// ---------- avanço ----------
// O avanço lançado para a frente no diário anterior mais próximo da data; null se não há.
export function avancoAntes(diarios, frenteId, data) {
  const anterior = (diarios ?? []).filter((d) => d.data < data && d.servicos.some((s) => s.frente_id === frenteId))
    .sort((a, b) => b.data.localeCompare(a.data))[0]
  return anterior ? anterior.servicos.find((s) => s.frente_id === frenteId).avanco : null
}

// O último avanço lançado para a frente ANTES da data. Sem diário anterior: se já há diário
// DEPOIS (diário atrasado lançado antes do primeiro), parte de 0; senão vale o do cadastro.
export function ultimoAvanco(diarios, frente, data) {
  const antes = avancoAntes(diarios, frente.id, data)
  if (antes != null) return antes
  return proximoAvanco(diarios, frente.id, data) ? 0 : (frente.avanco ?? 0)
}

// O próximo avanço já lançado para a frente DEPOIS da data (para o diário atrasado: o valor
// tem que ficar entre o dia anterior e o seguinte). null quando não há diário depois.
export function proximoAvanco(diarios, frenteId, data) {
  const depois = (diarios ?? []).filter((d) => d.data > data && d.servicos.some((s) => s.frente_id === frenteId))
    .sort((a, b) => a.data.localeCompare(b.data))[0]
  return depois ? { data: depois.data, avanco: depois.servicos.find((s) => s.frente_id === frenteId).avanco } : null
}

// Frentes que aparecem para lançar: em andamento e não iniciadas (concluídas saem).
export function frentesParaLancar(frentes) {
  return (frentes ?? []).filter((f) => f.status !== 'Concluída')
}

// ---------- o formulário ----------
export function diarioDoDia(diarios, data) {
  return (diarios ?? []).find((d) => d.data === data) ?? null
}

// Formulário do dia: o diário que já existe (para editar) ou um em branco.
// Cada frente vira uma linha; `marcada` diz se ela entra no diário. Frente concluída depois
// continua na linha do dia em que foi lançada (editar o dia não apaga o serviço).
export function formularioDoDia(diarios, frentes, data) {
  const existente = diarioDoDia(diarios, data)
  const lancadaNoDia = (f) => existente?.servicos.some((x) => !x.fora_orcamento && x.frente_id === f.id)
  const servicos = (frentes ?? []).filter((f) => f.status !== 'Concluída' || lancadaNoDia(f)).map((f) => {
    const s = existente?.servicos.find((x) => !x.fora_orcamento && x.frente_id === f.id)
    return {
      frente_id: f.id, marcada: !!s, avanco: s ? String(s.avanco) : String(ultimoAvanco(diarios, f, data)),
      concluido: s?.concluido ?? false, detalhe: s?.detalhe ?? '',
    }
  })
  return {
    id: existente?.id ?? null, data,
    clima: { manha: null, tarde: null, noite: null, ...(existente?.clima ?? {}) },
    efetivo: { ...(existente?.efetivo ?? {}) },
    servicos,
    foras: (existente?.servicos ?? []).filter((s) => s.fora_orcamento).map((s) => ({
      id: s.id, descricao: s.descricao, ambiente: s.ambiente ?? '', quantidade: s.quantidade == null ? '' : String(s.quantidade).replace('.', ','),
      unidade: s.unidade ?? '', analise: s.analise ?? 'para_analisar', frente_ligada: s.frente_ligada ?? null,
    })),
    fotos: structuredClone(existente?.fotos ?? []),
    equipamentos: structuredClone(existente?.equipamentos ?? []),
    ocorrencias: existente?.ocorrencias ?? '',
    lancado_por: existente?.lancado_por ?? null, lancado_em: existente?.lancado_em ?? null,
  }
}

// Marcar "Serviço concluído" leva o avanço para 100%.
export function marcarConcluido(servico, concluido) {
  return { ...servico, concluido, avanco: concluido ? '100' : servico.avanco }
}

// − e + do efetivo do dia (zero sai da lista).
export function mudarEfetivo(diario, funcao, delta) {
  const atual = diario.efetivo?.[funcao] ?? 0
  const novo = Math.max(0, atual + delta)
  const efetivo = { ...(diario.efetivo ?? {}) }
  if (novo === 0) delete efetivo[funcao]
  else efetivo[funcao] = novo
  return { ...diario, efetivo }
}

// Copia os equipamentos do diário com a data anterior MAIS PRÓXIMA (não do último lançado).
export function equipamentosDoDiaAnterior(diarios, data) {
  const anterior = (diarios ?? []).filter((d) => d.data < data && d.equipamentos?.length).sort((a, b) => b.data.localeCompare(a.data))[0]
  return anterior ? structuredClone(anterior.equipamentos) : []
}

export function equipamentoEmBranco() {
  return { nome: '', quantidade: '1', origem: 'Próprio', situacao: 'Em uso' }
}

const ehInteiro = (v, min) => /^\d+$/.test(String(v ?? '').trim()) && Number(v) >= min

// Validação. Avanço: inteiro de 0 a 100 em toda frente marcada; equipamento: nome e quantidade ≥ 1.
// Data: nunca no futuro nem antes do início da obra; o mestre só lança o dia de hoje.
export function validarDiario(d, { hoje, inicioObra, papel, diarios = null, frentes = null }) {
  const erros = { servicos: {}, equipamentos: {}, foras: {} }
  if (!d.data) erros.data = 'Informe a data.'
  else if (d.data > hoje) erros.data = 'Não dá para lançar diário de um dia que ainda não chegou.'
  else if (inicioObra && d.data < inicioObra) erros.data = 'Esta data é antes do início da obra.'
  else if (papel !== 'Engenheiro' && d.data !== hoje) erros.data = 'O mestre só lança o diário de hoje.'
  for (const s of d.servicos) {
    if (!s.marcada) continue
    if (!ehInteiro(s.avanco, 0) || Number(s.avanco) > 100) erros.servicos[s.frente_id] = 'Avanço de 0 a 100 (número inteiro).'
    else if (diarios) {
      // Diário atrasado: não pode passar do avanço do diário seguinte já lançado.
      const prox = proximoAvanco(diarios, s.frente_id, d.data)
      if (prox && Number(s.avanco) > prox.avanco) {
        const frente = (frentes ?? []).find((f) => f.id === s.frente_id)
        const minimo = frente ? ultimoAvanco(diarios, frente, d.data) : 0
        erros.servicos[s.frente_id] = `Em ${prox.data.slice(8, 10)}/${prox.data.slice(5, 7)} esta frente já estava em ${prox.avanco}%. O valor tem que ficar entre ${Math.min(minimo, prox.avanco)}% e ${prox.avanco}%.`
      }
    }
  }
  erros.foras = {}
  for (const fo of d.foras ?? []) {
    if (!fo.descricao || !fo.descricao.trim()) erros.foras[fo.id] = 'Descreva a atividade.'
    else if (fo.quantidade !== '' && !(lerQuantidade(fo.quantidade) > 0)) erros.foras[fo.id] = 'Quantidade tem que ser um número maior que zero (ou deixe em branco).'
  }
  if (!d.servicos.some((s) => s.marcada) && !(d.foras ?? []).length && !d.ocorrencias.trim()) erros.vazio = 'Marque pelo menos uma frente trabalhada ou escreva uma ocorrência.'
  d.equipamentos.forEach((e, i) => {
    const m = {}
    if (!e.nome || !e.nome.trim()) m.nome = 'Informe o equipamento.'
    if (!ehInteiro(e.quantidade, 1)) m.quantidade = 'Quantidade de 1 para cima.'
    if (Object.keys(m).length) erros.equipamentos[i] = m
  })
  const temErro = Object.keys(erros).some((k) => !['servicos', 'equipamentos', 'foras'].includes(k))
    || Object.keys(erros.servicos).length || Object.keys(erros.equipamentos).length || Object.keys(erros.foras).length
  return temErro ? erros : null
}

// Avanços menores que o último lançado: pedem confirmação ("Menor que o último lançado (60%). Confirma?").
export function avancosMenores(d, diarios, frentes) {
  return d.servicos.filter((s) => s.marcada).map((s) => {
    const frente = frentes.find((f) => f.id === s.frente_id)
    const ultimo = frente ? ultimoAvanco(diarios, frente, d.data) : 0
    return { frente_id: s.frente_id, servico: frente?.servico ?? '', avanco: Number(s.avanco), ultimo }
  }).filter((x) => x.avanco < x.ultimo)
}

// O diário pronto para gravar: só as frentes marcadas, efetivo do dia sem zeros, concluído = 100%.
export function montarDiario(d, { usuario, hoje }) {
  return {
    ...(d.id ? { id: d.id } : {}),
    data: d.data,
    clima: { manha: d.clima.manha ?? null, tarde: d.clima.tarde ?? null, noite: d.clima.noite ?? null },
    efetivo: Object.fromEntries(Object.entries(d.efetivo ?? {}).filter(([, n]) => n > 0)),
    servicos: d.servicos.filter((s) => s.marcada).map((s) => ({
      frente_id: s.frente_id, avanco: s.concluido ? 100 : Number(s.avanco), concluido: !!s.concluido,
      detalhe: s.detalhe.trim(),
    })).concat((d.foras ?? []).map((fo) => ({
      id: fo.id, fora_orcamento: true, frente_id: null, descricao: fo.descricao.trim(), ambiente: fo.ambiente.trim(),
      quantidade: fo.quantidade === '' ? null : lerQuantidade(fo.quantidade), unidade: fo.unidade.trim(),
      analise: fo.analise ?? 'para_analisar', frente_ligada: fo.frente_ligada ?? null,
    }))),
    fotos: d.fotos,
    equipamentos: d.equipamentos.map((e) => ({ nome: e.nome.trim(), quantidade: Number(e.quantidade), origem: e.origem, situacao: e.situacao })),
    ocorrencias: d.ocorrencias.trim(),
    lancado_por: d.lancado_por ?? usuario,
    lancado_em: d.lancado_em ?? hoje,
  }
}

// ---------- a lista de dias ----------
export function ordenarDiarios(diarios) {
  return [...(diarios ?? [])].sort((a, b) => b.data.localeCompare(a.data))
}

// O que a linha de cada dia mostra.
export function resumoDoDia(diario, inicioObra) {
  const ef = efetivoDoDia(diario)
  return {
    rdo: inicioObra ? numeroDoRdo(inicioObra, diario.data) : null,
    clima: resumoClima(diario.clima),
    frentes: diario.servicos.filter((s) => !s.fora_orcamento).length,
    foras: diario.servicos.filter((s) => s.fora_orcamento).length,
    efetivo: ef.total,
    fotos: diario.fotos.length,
    fotosEscondidas: diario.fotos.filter((f) => !f.cliente_ve).length,
    atrasado: !!diario.lancado_em && diario.lancado_em > diario.data,
  }
}

// "4,5" ou "4.5" -> 4.5 (quantidade da atividade fora do orçamento). Não é número: NaN.
export function lerQuantidade(texto) {
  const s = String(texto ?? '').trim().replace(/\s/g, '')
  if (!s) return NaN
  return Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s)
}

// ---------- diário atrasado (só o engenheiro) ----------
export function ehAtrasado(data, hoje) {
  return !!data && data < hoje
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

// Dias de obra (segunda a sábado) desde o início da obra até ONTEM que não têm diário.
// Hoje não conta: o dia ainda não acabou.
export function diasSemDiario(diarios, inicioObra, hoje) {
  if (!inicioObra) return []
  const com = new Set((diarios ?? []).map((d) => d.data))
  const dias = []
  const [a, m, d] = inicioObra.split('-').map(Number)
  for (let t = Date.UTC(a, m - 1, d); ; t += 86400000) {
    const dt = new Date(t)
    const iso = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
    if (iso >= hoje) break
    if (dt.getUTCDay() !== 0 && !com.has(iso)) dias.push(iso)
    if (dias.length > 2000) break
  }
  return dias
}

// [{ mes: '2026-08', rotulo: 'agosto de 2026', dias: [...] }] — o mês mais recente primeiro.
export function agruparPorMes(datas) {
  const grupos = new Map()
  for (const iso of datas) {
    const mes = iso.slice(0, 7)
    if (!grupos.has(mes)) grupos.set(mes, [])
    grupos.get(mes).push(iso)
  }
  return [...grupos].sort((x, y) => y[0].localeCompare(x[0]))
    .map(([mes, dias]) => ({ mes, rotulo: `${MESES[Number(mes.slice(5, 7)) - 1]} de ${mes.slice(0, 4)}`, dias }))
}

// ---------- atividade fora do orçamento ----------
export const ANALISES_FORA = [
  { id: 'para_analisar', rotulo: 'Para analisar' },
  { id: 'ligada', rotulo: 'Ligada a uma frente' },
  { id: 'extra', rotulo: 'Serviço extra' },
]

export function rotuloAnalise(id) {
  return ANALISES_FORA.find((a) => a.id === id)?.rotulo ?? id
}

export function novaAtividadeFora(id) {
  return { id, descricao: '', ambiente: '', quantidade: '', unidade: '', analise: 'para_analisar', frente_ligada: null }
}

// O que o engenheiro ainda precisa analisar, do mais recente ao mais antigo.
export function atividadesParaAnalisar(diarios) {
  const lista = []
  for (const d of diarios ?? []) {
    for (const s of d.servicos ?? []) {
      if (s.fora_orcamento && (s.analise ?? 'para_analisar') === 'para_analisar') {
        lista.push({ diario_id: d.id, data: d.data, lancado_por: d.lancado_por, atividade: s })
      }
    }
  }
  return lista.sort((a, b) => b.data.localeCompare(a.data))
}

// "Ligar a um item" (por enquanto, a uma frente: o orçamento ainda não existe) ou "serviço extra".
export function analisarAtividade(diario, atividadeId, { acao, frenteId = null }) {
  if (acao === 'ligar' && !frenteId) return diario
  return {
    ...diario,
    servicos: diario.servicos.map((s) => (s.id !== atividadeId ? s : {
      ...s, analise: acao === 'ligar' ? 'ligada' : 'extra', frente_ligada: acao === 'ligar' ? frenteId : null,
    })),
  }
}

// ---------- fotos: "Cliente vê" (só o engenheiro) ----------
export function alternarClienteVe(diario, fotoId) {
  return { ...diario, fotos: diario.fotos.map((f) => (f.id === fotoId ? { ...f, cliente_ve: !f.cliente_ve } : f)) }
}

// Os diários dos últimos 7 dias (hoje e os 6 anteriores) com foto ainda escondida do cliente.
export function semanaParaLiberar(diarios, hoje) {
  const [a, m, d] = hoje.split('-').map(Number)
  const t = new Date(Date.UTC(a, m - 1, d - 6))
  const inicio = `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`
  const diariosDaSemana = (diarios ?? []).filter((x) => x.data >= inicio && x.data <= hoje && x.fotos.some((f) => !f.cliente_ve))
  return { diarios: diariosDaSemana, fotos: diariosDaSemana.reduce((s, x) => s + x.fotos.filter((f) => !f.cliente_ve).length, 0) }
}

// Liga a chave de todas as fotos daqueles diários.
export function liberarTodas(diario) {
  return { ...diario, fotos: diario.fotos.map((f) => ({ ...f, cliente_ve: true })) }
}
// =====================================================================================
// PDF DO DIÁRIO (RDO): uma folha A4 por dia, pela impressão do navegador (sem biblioteca).
// Nunca entra no RDO: valores em R$, folga, data limite nem previsão de entrega calculada.
// =====================================================================================
// Escolha do PDF: só um dia, ou um período entre os dias lançados (com ou sem fotos).
export function validarEscolhaPdf(e, diarios) {
  if (e.modo === 'dia') return e.dia && diarios.some((d) => d.data === e.dia) ? null : 'Escolha um dia lançado.'
  if (!e.de || !e.ate) return 'Escolha o começo e o fim do período.'
  if (e.ate < e.de) return 'O fim do período não pode ser antes do começo.'
  return diariosDoPdf(e, diarios).length ? null : 'Nenhum diário lançado nesse período.'
}

// Os diários que entram no PDF, em ordem de data (do mais antigo para o mais novo).
export function diariosDoPdf(e, diarios) {
  const lista = e.modo === 'dia'
    ? (diarios ?? []).filter((d) => d.data === e.dia)
    : (diarios ?? []).filter((d) => d.data >= e.de && d.data <= e.ate)
  return [...lista].sort((a, b) => a.data.localeCompare(b.data))
}

// "5 RDOs · 13/10/2026 a 17/10/2026"
export function resumoDoPdf(diarios) {
  if (!diarios.length) return 'Nenhum RDO'
  const br = (iso) => iso.split('-').reverse().join('/')
  const n = `${diarios.length} ${diarios.length === 1 ? 'RDO' : 'RDOs'}`
  const primeiro = diarios[0].data
  const ultimo = diarios.at(-1).data
  return primeiro === ultimo ? `${n} · ${br(primeiro)}` : `${n} · ${br(primeiro)} a ${br(ultimo)}`
}

// "19/10/2026 às 14:05" no relógio do aparelho (rodapé "Gerado pelo app…").
export function dataHoraPorExtenso(agora = new Date()) {
  const p = (x) => String(x).padStart(2, '0')
  return `${p(agora.getDate())}/${p(agora.getMonth() + 1)}/${agora.getFullYear()} às ${p(agora.getHours())}:${p(agora.getMinutes())}`
}

// Linhas da tabela "Serviços executados": as frentes (avanço no dia = acumulado − o último
// lançado antes; null no primeiro diário da frente, que não tem com o que comparar) e, no fim,
// as atividades fora do orçamento.
export function servicosDoRdo(diario, diarios, frentes) {
  const daFrente = diario.servicos.filter((s) => !s.fora_orcamento).map((s) => {
    const frente = (frentes ?? []).find((f) => f.id === s.frente_id)
    const antes = avancoAntes((diarios ?? []).filter((d) => d.id !== diario.id), s.frente_id, diario.data)
    return {
      fora: false, servico: frente?.servico ?? 'Frente', ambiente: frente?.ambiente ?? '', responsavel: frente?.responsavel ?? '',
      noDia: antes == null ? null : Math.max(0, s.avanco - antes), acumulado: s.avanco, concluido: !!s.concluido, detalhe: s.detalhe ?? '',
    }
  })
  const foras = diario.servicos.filter((s) => s.fora_orcamento).map((s) => ({
    fora: true, servico: s.descricao, ambiente: s.ambiente ?? '', responsavel: '',
    quantidade: s.quantidade == null ? '' : `${String(s.quantidade).replace('.', ',')} ${s.unidade ?? ''}`.trim(),
    detalhe: s.detalhe ?? '',
  }))
  return [...daFrente, ...foras]
}

// Tudo o que uma folha do RDO mostra.
export function folhaDoRdo(diario, { obra, diarios, frentes, geradoEm }) {
  const ef = efetivoDoDia(diario)
  const frenteDe = (id) => (frentes ?? []).find((f) => f.id === id)
  return {
    numero: obra?.data_inicio ? numeroDoRdo(obra.data_inicio, diario.data) : null,
    data: diario.data,
    diaDaSemana: diaDaSemanaPorExtenso(diario.data),
    obra: obra ? `${obra.codigo} · ${obra.nome}` : '',
    cliente: obra?.cliente ?? '',
    entregaContrato: obra?.data_entrega ?? null,
    lancadoPor: diario.lancado_por ?? '',
    clima: PERIODOS.map((p) => ({ periodo: p.rotulo, valor: rotuloClima(diario.clima?.[p.id]) ?? 'Não informado' })),
    maoDeObra: maoDeObraDoDia(diario),
    totalMaoDeObra: ef.total,
    servicos: servicosDoRdo(diario, diarios, frentes),
    equipamentos: diario.equipamentos ?? [],
    ocorrencias: diario.ocorrencias ?? '',
    fotos: (diario.fotos ?? []).map((f) => ({ url: f.url, legenda: [f.ambiente, frenteDe(f.frente_id)?.servico, diario.data.split('-').reverse().join('/')].filter(Boolean).join(' · ') })),
    rodape: diario.lancado_em && diario.lancado_em > diario.data
      ? `Lançado em ${diario.lancado_em.split('-').reverse().join('/')} · referente a ${diario.data.split('-').reverse().join('/')}`
      : null,
    geradoEm,
  }
}