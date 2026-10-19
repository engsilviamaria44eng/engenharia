// Regras puras do módulo MEDIÇÕES DE EMPREITEIROS. Sem React, sem banco.
// Contrato: { id, obra_id, empreiteiro, descricao, status, tipo: null|'global'|'escopo', valor_global }
// Item (contrato por escopo): { id, obra_id, contrato_id, ordem, descricao, unidade, quantidade, preco_unitario }
// Medição (boletim): { id, obra_id, contrato_id, numero, periodo_inicio, periodo_fim, status,
//   percentual (contrato global), linhas: [{ item_id, quantidade }] (contrato por escopo) }
// Dinheiro sempre em reais com 2 casas; a quantidade é a fonte da verdade (o % e o R$ saem dela).
import { somarDias } from './datas.js'

// `acao` = o texto do botão que leva o contrato DESTA coluna para a próxima.
export const STATUS_CONTRATO = [
  { id: 'elaboracao', rotulo: 'Em elaboração', acao: 'Enviar p/ aprovação' },
  { id: 'enviado', rotulo: 'Enviado p/ aprovação', acao: 'Aprovar e cadastrar valor' },
  { id: 'ativo', rotulo: 'Aprovado / Ativo', acao: 'Concluir' },
  { id: 'concluido', rotulo: 'Concluído', acao: null },
]

export const STATUS_MEDICAO = [
  { id: 'rascunho', rotulo: 'Rascunho' },
  { id: 'fechada', rotulo: 'Fechada' },
]

export const TIPOS_CONTRATO = [
  { id: 'global', rotulo: 'Global', descricao: 'contrato global' },
  { id: 'escopo', rotulo: 'Por escopo', descricao: 'contrato por escopo' },
]

export function rotuloStatusMedicao(id) {
  return STATUS_MEDICAO.find((s) => s.id === id)?.rotulo ?? id
}

export function tipoDoContrato(id) {
  return TIPOS_CONTRATO.find((t) => t.id === id) ?? null
}

export function acaoDeAvancar(status) {
  return STATUS_CONTRATO.find((s) => s.id === status)?.acao ?? null
}

export const UNIDADES = [
  { id: 'm2', rotulo: 'm²' },
  { id: 'm', rotulo: 'm' },
  { id: 'un', rotulo: 'un' },
  { id: 'vb', rotulo: 'vb' },
]

export function rotuloStatusContrato(id) {
  return STATUS_CONTRATO.find((s) => s.id === id)?.rotulo ?? id
}

export function rotuloUnidade(id) {
  return UNIDADES.find((u) => u.id === id)?.rotulo ?? id
}

const formatoReais = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export function formatarReais(valor) {
  return formatoReais.format(valor ?? 0)
}

// Centavos certos: 0,1 + 0,2 = 0,30 e não 0,30000000000000004.
export function arredondar2(v) {
  return Math.round((v + Number.EPSILON) * 100) / 100
}

// Texto digitado ("1.250,50", "30000", "12,5") -> número, ou null se não for número.
export function lerNumero(texto) {
  if (texto === null || texto === undefined) return null
  if (typeof texto === 'number') return Number.isFinite(texto) ? texto : null
  let s = String(texto).trim().replace(/R\$|\s/g, '')
  if (s === '') return null
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '') // "30.000" = trinta mil
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

// Deixa só o que pode ser número enquanto a pessoa digita (dígitos, vírgula e ponto).
export function soNumero(texto) {
  return String(texto ?? '').replace(/[^\d,.]/g, '')
}

// ---------- valor do contrato ----------
export function itensDoContrato(contrato, itens) {
  return itens.filter((i) => i.contrato_id === contrato.id).sort((a, b) => a.ordem - b.ordem)
}

export function valorDoItem(item) {
  return arredondar2(item.quantidade * item.preco_unitario)
}

// Global: o valor fechado. Por escopo: soma de quantidade × preço de cada item. Sem valor: null.
export function valorTotal(contrato, itens) {
  if (contrato.tipo === 'global') return contrato.valor_global ?? null
  if (contrato.tipo === 'escopo') {
    const doContrato = itensDoContrato(contrato, itens)
    return doContrato.length ? arredondar2(doContrato.reduce((s, i) => s + valorDoItem(i), 0)) : null
  }
  return null
}

// ---------- medido ----------
export function medicoesDoContrato(contrato, medicoes) {
  return medicoes.filter((m) => m.contrato_id === contrato.id).sort((a, b) => b.numero - a.numero)
}

// Valor de um boletim. Global: % × valor total. Por escopo: soma das linhas, cada uma já em
// centavos (quantidade × preço arredondado), para o total bater com a planilha exportada.
export function valorDaMedicao(medicao, contrato, itens) {
  if (contrato.tipo === 'global') return arredondar2(((medicao.percentual ?? 0) / 100) * (contrato.valor_global ?? 0))
  const precos = new Map(itensDoContrato(contrato, itens).map((i) => [i.id, i.preco_unitario]))
  return arredondar2((medicao.linhas ?? []).reduce((s, l) => s + arredondar2(l.quantidade * (precos.get(l.item_id) ?? 0)), 0))
}

// Acumulado de todos os boletins (rascunho e fechado), em R$ e %, e o saldo a medir.
export function resumoDoContrato(contrato, itens, medicoes) {
  const total = valorTotal(contrato, itens)
  const medido = arredondar2(medicoesDoContrato(contrato, medicoes).reduce((s, m) => s + valorDaMedicao(m, contrato, itens), 0))
  const pct = total ? arredondar2((medido / total) * 100) : 0
  const boletins = medicoesDoContrato(contrato, medicoes)
  return {
    total, medido, pct, saldo: total === null ? null : arredondar2(total - medido),
    boletins: boletins.length, rascunhos: boletins.filter((m) => m.status === 'rascunho').length,
  }
}

// Ficha: abre no contrato ativo (para medir) ou no concluído que tem boletins (para consultar).
export function podeAbrirFicha(contrato, resumo) {
  return contrato.status === 'ativo' || (contrato.status === 'concluido' && resumo.boletins > 0)
}

// Boletim novo: só contrato ativo e com saldo a medir.
export function podeNovaMedicao(contrato, resumo) {
  return contrato.status === 'ativo' && resumo.total !== null && resumo.saldo > 0
}

// Os contratos ativos da obra: quantos, quanto foi contratado e quanto falta medir.
export function resumoDosAtivos(contratos, itens, medicoes) {
  const ativos = contratos.filter((c) => c.status === 'ativo').map((c) => resumoDoContrato(c, itens, medicoes))
  const contratado = arredondar2(ativos.reduce((s, r) => s + (r.total ?? 0), 0))
  const medido = arredondar2(ativos.reduce((s, r) => s + r.medido, 0))
  return { ativos: ativos.length, contratado, saldo: arredondar2(contratado - medido) }
}

// ---------- fluxo do contrato (Kanban) ----------
export function proximoStatusContrato(status) {
  const i = STATUS_CONTRATO.findIndex((s) => s.id === status)
  return STATUS_CONTRATO[i + 1]?.id ?? null
}

export function statusAnteriorContrato(status) {
  const i = STATUS_CONTRATO.findIndex((s) => s.id === status)
  return i > 0 ? STATUS_CONTRATO[i - 1].id : null
}

// Pode mover? Devolve { ok, motivo, pedeValor }.
// - Ir para Aprovado/Ativo abre o cadastro do valor.
// - Concluído só com 100% medido (saldo zero, conferido em centavos) e sem rascunho aberto.
// - Ativo com boletim não volta (o valor já foi usado para medir).
export function podeMoverContrato(contrato, destino, resumo) {
  if (destino === 'ativo' && contrato.status === 'enviado') return { ok: true, motivo: null, pedeValor: true }
  if (destino === 'concluido' && !(resumo.saldo !== null && resumo.saldo <= 0)) {
    return { ok: false, motivo: `Só dá para concluir com 100% medido. Este contrato está com ${formatarPct(resumo.pct)} (saldo ${formatarReais(resumo.saldo)}).`, pedeValor: false }
  }
  if (destino === 'concluido' && resumo.rascunhos > 0) {
    return { ok: false, motivo: 'Feche as medições em rascunho antes de concluir o contrato.', pedeValor: false }
  }
  if (contrato.status === 'ativo' && destino === 'enviado' && resumo.boletins > 0) {
    return { ok: false, motivo: 'Este contrato já tem medição lançada: não volta para aprovação.', pedeValor: false }
  }
  return { ok: true, motivo: null, pedeValor: false }
}

export function formatarPct(pct) {
  return `${Number(pct).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`
}

export function moverContrato(contrato, destino) {
  return { ...contrato, status: destino }
}

// Só contrato ativo recebe medição; só contrato ativo e sem boletim troca o valor.
export function podeMedir(contrato) {
  return contrato.status === 'ativo'
}

export function podeEditarValor(contrato, resumo) {
  return contrato.status === 'ativo' && resumo.boletins === 0
}

// ---------- novo contrato ----------
export function validarNovoContrato(d) {
  const erros = {}
  if (!d.empreiteiro || !d.empreiteiro.trim()) erros.empreiteiro = 'Informe o empreiteiro.'
  if (!d.descricao || !d.descricao.trim()) erros.descricao = 'Descreva o serviço contratado.'
  return erros
}

export function novoContrato(d) {
  return { empreiteiro: d.empreiteiro.trim(), descricao: d.descricao.trim(), status: 'elaboracao', tipo: null, valor_global: null }
}

// ---------- cadastro do valor ----------
// d = { tipo: 'global'|'escopo', valor_global: texto, itens: [{ descricao, unidade, quantidade: texto, preco_unitario: texto }] }
export function linhaVaziaDeEscopo() {
  return { descricao: '', unidade: 'm2', quantidade: '', preco_unitario: '' }
}

export function validarValor(d) {
  const erros = { itens: [] }
  if (d.tipo !== 'global' && d.tipo !== 'escopo') erros.tipo = 'Escolha como o contrato foi fechado.'
  if (d.tipo === 'global') {
    const v = lerNumero(d.valor_global)
    if (d.valor_global === '' || d.valor_global === null || d.valor_global === undefined) erros.valor_global = 'Informe o valor total.'
    else if (v === null || v <= 0) erros.valor_global = 'O valor tem que ser um número maior que zero.'
  }
  if (d.tipo === 'escopo') {
    if (d.itens.length === 0) erros.escopo = 'Acrescente pelo menos um item.'
    d.itens.forEach((it, i) => {
      const e = {}
      if (!it.descricao || !it.descricao.trim()) e.descricao = 'Descreva o item.'
      if (!UNIDADES.some((u) => u.id === it.unidade)) e.unidade = 'Escolha a unidade.'
      const q = lerNumero(it.quantidade)
      if (q === null || q <= 0) e.quantidade = 'Quantidade maior que zero.'
      const p = lerNumero(it.preco_unitario)
      if (p === null || p <= 0) e.preco_unitario = 'Preço maior que zero.'
      erros.itens[i] = e
    })
  }
  const temErro = Object.keys(erros).some((k) => k !== 'itens') || erros.itens.some((e) => e && Object.keys(e).length > 0)
  return temErro ? erros : null
}

// Total ao vivo enquanto a pessoa preenche a tabela (linhas incompletas contam 0).
export function totalDoEscopo(linhas) {
  return arredondar2(linhas.reduce((s, it) => s + (lerNumero(it.quantidade) ?? 0) * (lerNumero(it.preco_unitario) ?? 0), 0))
}

// Contrato com o valor cadastrado e os itens (sem id e sem obra; a camada de dados põe).
export function aplicarValor(contrato, d) {
  if (d.tipo === 'global') {
    return { contrato: { ...contrato, tipo: 'global', valor_global: arredondar2(lerNumero(d.valor_global)) }, itens: [] }
  }
  return {
    contrato: { ...contrato, tipo: 'escopo', valor_global: null },
    itens: d.itens.map((it, i) => ({
      contrato_id: contrato.id, ordem: i + 1, descricao: it.descricao.trim(), unidade: it.unidade,
      quantidade: lerNumero(it.quantidade), preco_unitario: arredondar2(lerNumero(it.preco_unitario)),
    })),
  }
}

// Formulário do valor já preenchido com o que o contrato tem (para editar).
export function valorParaFormulario(contrato, itens) {
  const doContrato = itensDoContrato(contrato, itens)
  return {
    tipo: contrato.tipo,
    valor_global: contrato.valor_global != null ? String(contrato.valor_global).replace('.', ',') : '',
    itens: doContrato.length
      ? doContrato.map((i) => ({ descricao: i.descricao, unidade: i.unidade, quantidade: String(i.quantidade).replace('.', ','), preco_unitario: String(i.preco_unitario).replace('.', ',') }))
      : [linhaVaziaDeEscopo()],
  }
}

// ---------- ficha de medição (boletins) ----------
const arredondar = (v, casas) => Math.round((v + Number.EPSILON) * 10 ** casas) / 10 ** casas
const FOLGA = 1e-9 // tolerância de arredondamento nas comparações com 100%

export function proximoNumero(contrato, medicoes) {
  return medicoesDoContrato(contrato, medicoes).reduce((n, m) => Math.max(n, m.numero), 0) + 1
}

// Período sugerido: do dia seguinte ao fim do último boletim até hoje (ou só hoje).
export function periodoSugerido(contrato, medicoes, hoje) {
  const ultimo = medicoesDoContrato(contrato, medicoes)[0]
  if (!ultimo) return { inicio: hoje, fim: hoje }
  const seguinte = somarDias(ultimo.periodo_fim, 1)
  return { inicio: seguinte <= hoje ? seguinte : hoje, fim: hoje }
}

// O que já foi medido nos OUTROS boletins (para a trava dos 100%).
// Global: % somado. Por escopo: quantidade somada por item.
export function medidoAntes(contrato, medicoes, excetoId = null) {
  const outros = medicoesDoContrato(contrato, medicoes).filter((m) => m.id !== excetoId)
  if (contrato.tipo === 'global') return { pct: arredondar(outros.reduce((s, m) => s + (m.percentual ?? 0), 0), 6), qtd: new Map() }
  const qtd = new Map()
  for (const m of outros) for (const l of m.linhas ?? []) qtd.set(l.item_id, (qtd.get(l.item_id) ?? 0) + l.quantidade)
  return { pct: 0, qtd }
}

// Global: digita % OU R$, e o outro sai na hora. Guarda o % (6 casas) para o R$ fechar certo.
export function pctDoGlobal(campo, texto, total) {
  const n = lerNumero(texto)
  if (n === null) return null
  return arredondar(campo === 'reais' ? (total ? (n / total) * 100 : 0) : n, 6)
}

export function reaisDoPct(pct, total) {
  return arredondar2(((pct ?? 0) / 100) * total)
}

// Por escopo: digita quantidade, % OU R$ e a QUANTIDADE é a fonte da verdade (4 casas).
export function quantidadeDaLinha(item, campo, texto) {
  const n = lerNumero(texto)
  if (n === null) return null
  if (campo === 'pct') return arredondar((n / 100) * item.quantidade, 4)
  if (campo === 'reais') return arredondar(item.preco_unitario ? n / item.preco_unitario : 0, 4)
  return arredondar(n, 4)
}

export function pctDaQuantidade(q, item) {
  return item.quantidade ? arredondar(((q ?? 0) / item.quantidade) * 100, 2) : 0
}

export function reaisDaQuantidade(q, item) {
  return arredondar2((q ?? 0) * item.preco_unitario)
}

// Formulário do boletim -> números. d = { periodo_inicio, periodo_fim, global: {campo, texto},
// linhas: { [item_id]: {campo, texto} } }
export function numerosDoBoletim(d, contrato, itens) {
  const total = valorTotal(contrato, itens) ?? 0
  if (contrato.tipo === 'global') {
    const pct = pctDoGlobal(d.global.campo, d.global.texto, total)
    return { pct, linhas: [], valor: reaisDoPct(pct, total) }
  }
  const linhas = itensDoContrato(contrato, itens).map((item) => {
    const l = d.linhas[item.id]
    const q = l && l.texto !== '' ? quantidadeDaLinha(item, l.campo, l.texto) : 0
    return { item_id: item.id, quantidade: q }
  })
  const precos = new Map(itensDoContrato(contrato, itens).map((i) => [i.id, i]))
  const valor = arredondar2(linhas.reduce((s, l) => s + reaisDaQuantidade(l.quantidade, precos.get(l.item_id)), 0))
  return { pct: null, linhas, valor }
}

// Valida período, números e a TRAVA: nada passa de 100% acumulado.
export function validarBoletim(d, contrato, itens, antes) {
  const erros = { linhas: {} }
  if (!d.periodo_inicio) erros.periodo_inicio = 'Informe o início do período.'
  if (!d.periodo_fim) erros.periodo_fim = 'Informe o fim do período.'
  else if (d.periodo_inicio && d.periodo_fim < d.periodo_inicio) erros.periodo_fim = 'O fim não pode ser antes do início.'
  const nums = numerosDoBoletim(d, contrato, itens)
  if (contrato.tipo === 'global') {
    const livre = arredondar(100 - antes.pct, 6)
    if (d.global.texto === '') erros.global = 'Informe o % ou o valor medido.'
    else if (nums.pct === null || nums.pct <= 0) erros.global = 'Use um número maior que zero.'
    else if (nums.pct > livre + FOLGA) erros.global = `Passa de 100%: já foram medidos ${formatarPct(antes.pct)}; o máximo agora é ${formatarPct(livre)}.`
  } else {
    for (const item of itensDoContrato(contrato, itens)) {
      const l = d.linhas[item.id]
      if (!l || l.texto === '') continue
      const q = quantidadeDaLinha(item, l.campo, l.texto)
      const ja = antes.qtd.get(item.id) ?? 0
      const livre = arredondar(item.quantidade - ja, 4)
      if (q === null || q < 0) erros.linhas[item.id] = 'Use um número.'
      else if (q > livre + FOLGA) erros.linhas[item.id] = `Passa de 100%: o máximo agora é ${livre.toLocaleString('pt-BR')} ${rotuloUnidade(item.unidade)} (${formatarPct(pctDaQuantidade(livre, item))}).`
    }
    if (Object.keys(erros.linhas).length === 0 && !nums.linhas.some((l) => l.quantidade > 0)) erros.vazio = 'Meça pelo menos um item.'
  }
  const temErro = Object.keys(erros).some((k) => k !== 'linhas') || Object.keys(erros.linhas).length > 0
  return temErro ? erros : null
}

// O boletim pronto para gravar (sem id e sem obra; a camada põe). Nasce em rascunho.
export function montarBoletim(d, contrato, itens, numero, anterior = null) {
  const nums = numerosDoBoletim(d, contrato, itens)
  return {
    ...(anterior ?? {}),
    contrato_id: contrato.id, numero, periodo_inicio: d.periodo_inicio, periodo_fim: d.periodo_fim,
    status: anterior?.status ?? 'rascunho', percentual: nums.pct, linhas: nums.linhas,
  }
}

// Rodapé: total deste boletim e como fica o acumulado do contrato com ele.
export function previaDoBoletim(d, contrato, itens, medicoes, excetoId = null) {
  const total = valorTotal(contrato, itens) ?? 0
  const outros = medicoesDoContrato(contrato, medicoes).filter((m) => m.id !== excetoId)
  const jaMedido = arredondar2(outros.reduce((s, m) => s + valorDaMedicao(m, contrato, itens), 0))
  const doBoletim = numerosDoBoletim(d, contrato, itens).valor
  const acumulado = arredondar2(jaMedido + doBoletim)
  return { doBoletim, acumulado, pct: total ? arredondar2((acumulado / total) * 100) : 0, saldo: arredondar2(total - acumulado) }
}

// Rascunho se edita e se fecha; fechado não muda mais. Só em contrato ativo.
export function podeEditarBoletim(medicao, contrato) {
  return medicao.status === 'rascunho' && contrato.status === 'ativo'
}

export function fecharBoletim(medicao) {
  return { ...medicao, status: 'fechada' }
}

// Formulário de edição de um rascunho, já preenchido (por quantidade).
export function boletimParaFormulario(medicao, contrato) {
  const base = { periodo_inicio: medicao.periodo_inicio, periodo_fim: medicao.periodo_fim }
  if (contrato.tipo === 'global') return { ...base, global: { campo: 'pct', texto: String(medicao.percentual ?? '').replace('.', ',') }, linhas: {} }
  const linhas = {}
  for (const l of medicao.linhas ?? []) linhas[l.item_id] = { campo: 'quantidade', texto: l.quantidade ? String(l.quantidade).replace('.', ',') : '' }
  return { ...base, global: { campo: 'pct', texto: '' }, linhas }
}

// Planilha (CSV com ; e vírgula decimal, abre no Excel) de um boletim.
export function csvDoBoletim(medicao, contrato, itens) {
  const num = (v, casas = 2) => Number(v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas, useGrouping: false })
  // Texto que começa com = + - @ viraria fórmula no Excel: entra com um apóstrofo na frente.
  const campo = (t) => {
    let s = String(t)
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
    return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const cab = [
    `Boletim de medição nº ${medicao.numero};${campo(contrato.empreiteiro)};${campo(contrato.descricao)}`,
    `Período;${medicao.periodo_inicio.split('-').reverse().join('/')} a ${medicao.periodo_fim.split('-').reverse().join('/')};Situação;${rotuloStatusMedicao(medicao.status)}`,
    '',
  ]
  if (contrato.tipo === 'global') {
    return [...cab, 'Item;% medido;Valor (R$)', `${campo(contrato.descricao)};${num(medicao.percentual, 2)};${num(valorDaMedicao(medicao, contrato, itens))}`, ''].join('\r\n')
  }
  const porId = new Map(itensDoContrato(contrato, itens).map((i) => [i.id, i]))
  const linhas = (medicao.linhas ?? []).filter((l) => l.quantidade > 0).map((l) => {
    const it = porId.get(l.item_id)
    return [campo(it.descricao), rotuloUnidade(it.unidade), num(l.quantidade, 4), num(pctDaQuantidade(l.quantidade, it), 2), num(it.preco_unitario), num(reaisDaQuantidade(l.quantidade, it))].join(';')
  })
  return [...cab, 'Item;Unidade;Quantidade;% do item;Preço unitário (R$);Valor (R$)', ...linhas, `Total do boletim;;;;;${num(valorDaMedicao(medicao, contrato, itens))}`, ''].join('\r\n')
}