// Regras puras do módulo QUALIDADE (Pendências, FVS e Gemba Walk). Sem React, sem banco.
// Datas como texto 'AAAA-MM-DD' (sem toISOString: vira UTC e pula um dia no Brasil).
//
// Pendência: { id, obra_id, numero, descricao, local, pavimento, empresa, prazo, responsavel,
//   data_vistoria, vistoriado_por, status, foto, foto_evidencia, data_resolucao, observacoes }
// `observacoes` é um texto que só cresce: cada nota entra NO TOPO com o carimbo [DD/MM/AAAA HH:MM].
import { somarDias } from './datas.js'

// ---------- vocabulário ----------
// `acao` = o botão que leva a pendência deste status para o próximo.
export const STATUS_PENDENCIA = [
  { id: 'pendente', rotulo: 'Pendente', acao: 'Colocar em andamento' },
  { id: 'em_andamento', rotulo: 'Em andamento', acao: 'Resolver' },
  { id: 'resolvido', rotulo: 'Resolvido', acao: null },
]

export const FILTROS_PRAZO = [
  { id: 'todos', rotulo: 'Todos' },
  { id: 'atrasados', rotulo: 'Atrasados' },
  { id: 'hoje', rotulo: 'Hoje' },
  { id: 'semana', rotulo: 'Esta semana' },
]

export function rotuloStatusPendencia(id) {
  return STATUS_PENDENCIA.find((s) => s.id === id)?.rotulo ?? id
}

export function proximoStatusPendencia(status) {
  const i = STATUS_PENDENCIA.findIndex((s) => s.id === status)
  return STATUS_PENDENCIA[i + 1]?.id ?? null
}

export function acaoDaPendencia(status) {
  return STATUS_PENDENCIA.find((s) => s.id === status)?.acao ?? null
}

// ---------- datas e carimbo ----------
// Segunda a domingo da semana de `iso` (sem fuso).
export function semanaAtual(iso) {
  const [a, m, d] = iso.split('-').map(Number)
  const dow = new Date(Date.UTC(a, m - 1, d)).getUTCDay()
  const inicio = somarDias(iso, -((dow + 6) % 7))
  return { inicio, fim: somarDias(inicio, 6) }
}

// "[19/10/2026 14:05]" no relógio do aparelho.
export function carimbo(agora = new Date()) {
  const p = (n) => String(n).padStart(2, '0')
  return `[${p(agora.getDate())}/${p(agora.getMonth() + 1)}/${agora.getFullYear()} ${p(agora.getHours())}:${p(agora.getMinutes())}]`
}

// A nota nova vai para cima do histórico, com data e hora (e quem escreveu, se vier).
export function anexarObservacao(historico, nota, agora = new Date(), autor = '') {
  const linha = `${carimbo(agora)}${autor ? ` ${autor}:` : ''} ${nota.trim()}`
  return historico ? `${linha}\n${historico}` : linha
}

export function linhasDoHistorico(historico) {
  return (historico ?? '').split('\n').filter((l) => l.trim())
}

// ---------- pendências ----------
export function proximoNumero(pendencias) {
  return pendencias.reduce((n, p) => Math.max(n, p.numero ?? 0), 0) + 1
}

export function estaVencida(p, hoje) {
  return p.status !== 'resolvido' && !!p.prazo && p.prazo < hoje
}

export function kpisDePendencias(pendencias) {
  const conta = (s) => pendencias.filter((p) => p.status === s).length
  return { total: pendencias.length, pendentes: conta('pendente'), andamento: conta('em_andamento'), resolvidos: conta('resolvido') }
}

// Quem tem mais pendências em aberto (pendente + em andamento), do maior para o menor.
export function pendentesPorResponsavel(pendencias) {
  const conta = new Map()
  for (const p of pendencias) if (p.status !== 'resolvido') conta.set(p.responsavel, (conta.get(p.responsavel) ?? 0) + 1)
  return [...conta].map(([responsavel, total]) => ({ responsavel, total }))
    .sort((a, b) => b.total - a.total || a.responsavel.localeCompare(b.responsavel, 'pt-BR'))
}

export function responsaveisDe(pendencias) {
  return [...new Set(pendencias.map((p) => p.responsavel).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

export function empresasDe(pendencias) {
  return [...new Set(pendencias.map((p) => p.empresa).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

const semAcento = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Filtros: status, responsável, prazo (todos/atrasados/hoje/esta semana) e busca por texto ou local.
// Ordem: vencidas primeiro, depois pelo prazo; resolvidas no fim.
export function filtrarPendencias(pendencias, filtros, hoje) {
  const { status = '', responsavel = '', prazo = 'todos', busca = '' } = filtros
  const semana = semanaAtual(hoje)
  const termo = semAcento(busca.trim()).replace(/^#/, '')
  return pendencias.filter((p) => {
    if (status && p.status !== status) return false
    if (responsavel && p.responsavel !== responsavel) return false
    if (prazo === 'atrasados' && !estaVencida(p, hoje)) return false
    if (prazo === 'hoje' && p.prazo !== hoje) return false
    if (prazo === 'semana' && !(p.prazo >= semana.inicio && p.prazo <= semana.fim)) return false
    if (termo) {
      const alvo = semAcento([p.descricao, p.local, p.pavimento, p.empresa, p.responsavel, String(p.numero)].join(' '))
      if (!alvo.includes(termo)) return false
    }
    return true
  }).sort((a, b) => {
    const r = Number(a.status === 'resolvido') - Number(b.status === 'resolvido')
    if (r) return r
    const v = Number(estaVencida(b, hoje)) - Number(estaVencida(a, hoje))
    if (v) return v
    return (a.prazo ?? '9999').localeCompare(b.prazo ?? '9999') || a.numero - b.numero
  })
}

export function validarPendencia(d) {
  const erros = {}
  if (!d.descricao || !d.descricao.trim()) erros.descricao = 'Descreva o problema.'
  if (!d.local || !d.local.trim()) erros.local = 'Informe o local.'
  if (!d.empresa || !d.empresa.trim()) erros.empresa = 'Informe a empresa que vai corrigir.'
  if (!d.responsavel || !d.responsavel.trim()) erros.responsavel = 'Informe quem acompanha.'
  if (!d.prazo) erros.prazo = 'Informe o prazo.'
  else if (d.data_vistoria && d.prazo < d.data_vistoria) erros.prazo = 'O prazo não pode ser antes da vistoria.'
  return erros
}

// Nasce pendente, com a vistoria de hoje feita por quem está usando o app.
// O número definitivo é dado pela camada de dados (o próximo da obra).
export function novaPendencia(d, { hoje, usuario, agora = new Date() }) {
  return {
    descricao: d.descricao.trim(), local: d.local.trim(), pavimento: (d.pavimento ?? '').trim(), empresa: d.empresa.trim(),
    prazo: d.prazo, responsavel: d.responsavel.trim(), data_vistoria: hoje, vistoriado_por: usuario,
    status: 'pendente', foto: d.foto || null, foto_evidencia: null, data_resolucao: null,
    observacoes: d.observacao?.trim() ? anexarObservacao('', d.observacao, agora, usuario) : '',
  }
}

// Fluxo por botões: Pendente → Em andamento → Resolvido. Resolver exige a foto da correção.
export function validarResolucao(fotoEvidencia) {
  return fotoEvidencia ? null : 'Tire ou escolha a foto da correção para resolver.'
}

export function avancarPendencia(p, { foto_evidencia = null, hoje, usuario, agora = new Date() }) {
  const destino = proximoStatusPendencia(p.status)
  if (!destino) return p
  if (destino === 'resolvido') {
    return {
      ...p, status: 'resolvido', foto_evidencia, data_resolucao: hoje,
      observacoes: anexarObservacao(p.observacoes, 'Resolvida, com foto da correção.', agora, usuario),
    }
  }
  return { ...p, status: destino, observacoes: anexarObservacao(p.observacoes, 'Colocada em andamento.', agora, usuario) }
}

// Voltar uma resolvida para andamento (a correção não ficou boa): tira a evidência.
export function reabrirPendencia(p, { usuario, agora = new Date(), motivo = '' }) {
  return {
    ...p, status: 'em_andamento', foto_evidencia: null, data_resolucao: null,
    observacoes: anexarObservacao(p.observacoes, `Reaberta${motivo.trim() ? `: ${motivo.trim()}` : '.'}`, agora, usuario),
  }
}

export function comObservacao(p, nota, { usuario, agora = new Date() }) {
  return { ...p, observacoes: anexarObservacao(p.observacoes, nota, agora, usuario) }
}

// =====================================================================================
// FVS — Ficha de Verificação de Serviço
// Modelo (da empresa, vale para todas as obras): { id, codigo, nome, categoria, versao,
//   grupos: [{ nome, itens: [{ id, titulo }] }] }
// Vistoria (da obra): { id, obra_id, modelo_id, modelo_codigo, modelo_nome, modelo_versao,
//   ambiente, data, vistoriado_por, status: 'em_andamento'|'concluida', concluida_em,
//   grupos (cópia do modelo no dia: editar o modelo depois não muda a vistoria),
//   respostas: { [item_id]: 'ok'|'nc'|'na' } }
// Não conformidade (da obra): { id, obra_id, codigo 'NC-001', vistoria_id, item_id, item_numero,
//   item_titulo, titulo, servico, ambiente, descricao, solucao, severidade, responsavel, fotos,
//   status, aberta_em, fechada_em, timeline: [{ data, hora, texto }] }
// =====================================================================================
export const CATEGORIAS_FVS = ['Impermeabilização', 'Estrutura', 'Instalações', 'Acabamento']
export const GRUPOS_FVS = ['Pré-execução', 'Execução', 'Proteção e acabamento']

export const RESPOSTAS_FVS = [
  { id: 'ok', rotulo: 'OK' },
  { id: 'nc', rotulo: 'NC' },
  { id: 'na', rotulo: 'N.A.' },
]

export const SEVERIDADES = [
  { id: 'baixa', rotulo: 'Baixa' },
  { id: 'media', rotulo: 'Média' },
  { id: 'alta', rotulo: 'Alta' },
]

// `acoes` = os botões de cada status. `so_engenheiro`: aprovar e reprovar são do engenheiro.
export const STATUS_NC = [
  { id: 'aberta', rotulo: 'Aberta', acoes: [{ id: 'encaminhar', rotulo: 'Encaminhar p/ correção', destino: 'encaminhada' }] },
  { id: 'encaminhada', rotulo: 'Encaminhada', acoes: [{ id: 'corrigir', rotulo: 'Marcar corrigida', destino: 'corrigida' }] },
  {
    id: 'corrigida', rotulo: 'Corrigida', acoes: [
      { id: 'aprovar', rotulo: 'Aprovar e fechar', destino: 'fechada', so_engenheiro: true },
      { id: 'reprovar', rotulo: 'Reprovar', destino: 'encaminhada', so_engenheiro: true },
    ],
  },
  { id: 'fechada', rotulo: 'Fechada', acoes: [] },
]

export function rotuloSeveridade(id) {
  return SEVERIDADES.find((s) => s.id === id)?.rotulo ?? id
}

export function rotuloStatusNC(id) {
  return STATUS_NC.find((s) => s.id === id)?.rotulo ?? id
}

// Os botões que a pessoa vê numa NC (aprovar/reprovar só para o engenheiro).
export function acoesDaNC(nc, papel) {
  const acoes = STATUS_NC.find((s) => s.id === nc.status)?.acoes ?? []
  return acoes.filter((a) => !a.so_engenheiro || papel === 'Engenheiro')
}

export function podeEditarModelos(papel) {
  return papel === 'Engenheiro'
}

// "19/10/2026" e "14:05" no relógio do aparelho, para a timeline.
export function momento(agora = new Date()) {
  const p = (n) => String(n).padStart(2, '0')
  return { data: `${agora.getFullYear()}-${p(agora.getMonth() + 1)}-${p(agora.getDate())}`, hora: `${p(agora.getHours())}:${p(agora.getMinutes())}` }
}

// Numeração dos itens por grupo: 1.1, 1.2, 2.1…
export function numeracaoDosItens(grupos) {
  const n = new Map()
  grupos.forEach((g, gi) => g.itens.forEach((it, ii) => n.set(it.id, `${gi + 1}.${ii + 1}`)))
  return n
}

export function itensDaFicha(grupos) {
  return grupos.flatMap((g) => g.itens)
}

// Barra e % de conformidade: conformidade = OK ÷ (OK + NC) × 100, arredondado.
// N.A. não entra na conta; sem nenhum OK nem NC, ainda não há conformidade (null).
export function progressoDaVistoria(v) {
  const itens = itensDaFicha(v.grupos)
  const conta = (r) => itens.filter((it) => v.respostas[it.id] === r).length
  const ok = conta('ok')
  const nc = conta('nc')
  const na = conta('na')
  const total = itens.length
  return { total, ok, nc, na, pendentes: total - ok - nc - na, verificados: ok + nc + na, conformidade: ok + nc ? Math.round((ok / (ok + nc)) * 100) : null }
}

export function podeFinalizarVistoria(v) {
  return v.status === 'em_andamento' && progressoDaVistoria(v).pendentes === 0
}

export function ncDoItem(ncs, vistoriaId, itemId) {
  return ncs.find((n) => n.vistoria_id === vistoriaId && n.item_id === itemId) ?? null
}

// Responder um item (OK ou N.A.). Vistoria concluída não muda; item com NC registrada também
// não (a NC é tratada na lista de não conformidades).
export function podeResponderItem(v, ncs, itemId) {
  return v.status === 'em_andamento' && !ncDoItem(ncs, v.id, itemId)
}

export function responderItem(v, itemId, resposta) {
  if (v.status !== 'em_andamento') return v
  return { ...v, respostas: { ...v.respostas, [itemId]: resposta } }
}

export function finalizarVistoria(v, hoje) {
  return podeFinalizarVistoria(v) ? { ...v, status: 'concluida', concluida_em: hoje } : v
}

export function validarNovaVistoria(d) {
  const erros = {}
  if (!d.modelo_id) erros.modelo_id = 'Escolha a ficha (modelo).'
  if (!d.ambiente || !d.ambiente.trim()) erros.ambiente = 'Informe o ambiente (ex.: Banheiro social · Térreo).'
  return erros
}

export function novaVistoria(modelo, ambiente, { hoje, usuario }) {
  return {
    modelo_id: modelo.id, modelo_codigo: modelo.codigo, modelo_nome: modelo.nome, modelo_versao: modelo.versao,
    ambiente: ambiente.trim(), data: hoje, vistoriado_por: usuario, status: 'em_andamento', concluida_em: null,
    grupos: structuredClone(modelo.grupos), respostas: {},
  }
}

// ---------- não conformidades ----------
export function validarNC(d) {
  const erros = {}
  if (!d.descricao || !d.descricao.trim()) erros.descricao = 'Descreva o problema encontrado.'
  if (!d.solucao || !d.solucao.trim()) erros.solucao = 'Diga a solução proposta.'
  if (!SEVERIDADES.some((s) => s.id === d.severidade)) erros.severidade = 'Escolha a severidade.'
  if (!d.responsavel || !d.responsavel.trim()) erros.responsavel = 'Informe o responsável pela correção.'
  return erros
}

// NC nova, ligada ao item da vistoria. O código (NC-001…) é dado pela camada de dados, por obra.
export function novaNC(d, { vistoria, itemId, hoje, usuario, agora = new Date() }) {
  const item = itensDaFicha(vistoria.grupos).find((it) => it.id === itemId)
  const m = momento(agora)
  return {
    vistoria_id: vistoria.id, item_id: itemId, item_numero: numeracaoDosItens(vistoria.grupos).get(itemId), item_titulo: item?.titulo ?? '',
    titulo: d.descricao.trim().split(/[.\n]/)[0].slice(0, 80), servico: vistoria.modelo_nome, ambiente: vistoria.ambiente,
    descricao: d.descricao.trim(), solucao: d.solucao.trim(), severidade: d.severidade, responsavel: d.responsavel.trim(),
    fotos: d.fotos ?? [], status: 'aberta', aberta_em: hoje, fechada_em: null,
    timeline: [{ ...m, texto: `Aberta por ${usuario} na vistoria (item ${numeracaoDosItens(vistoria.grupos).get(itemId)}).` }],
  }
}

export function codigoDaNC(numero) {
  return `NC-${String(numero).padStart(3, '0')}`
}

// Aplica uma ação do fluxo. Cada mudança entra na timeline com data, hora e quem fez.
export function aplicarAcaoNC(nc, acaoId, { usuario, papel, hoje, agora = new Date(), motivo = '' }) {
  const acao = acoesDaNC(nc, papel).find((a) => a.id === acaoId)
  if (!acao) return nc
  const textos = {
    encaminhar: `Encaminhada a ${nc.responsavel} por ${usuario}.`,
    corrigir: `Marcada como corrigida por ${usuario}.`,
    aprovar: `Aprovada e fechada por ${usuario}.`,
    reprovar: `Reprovada na reavaliação por ${usuario}${motivo.trim() ? `: ${motivo.trim().replace(/\.$/, '')}.` : '.'} Volta para correção.`,
  }
  return {
    ...nc, status: acao.destino, fechada_em: acao.destino === 'fechada' ? hoje : null,
    timeline: [...nc.timeline, { ...momento(agora), texto: textos[acaoId] }],
  }
}

export function diasEmAberto(nc, hoje) {
  const [a1, m1, d1] = nc.aberta_em.split('-').map(Number)
  const [a2, m2, d2] = (nc.fechada_em ?? hoje).split('-').map(Number)
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86400000)
}

// Mais grave e mais antiga primeiro; fechadas no fim.
export function ordenarNCs(ncs) {
  const peso = { alta: 0, media: 1, baixa: 2 }
  return [...ncs].sort((a, b) => Number(a.status === 'fechada') - Number(b.status === 'fechada')
    || peso[a.severidade] - peso[b.severidade] || a.aberta_em.localeCompare(b.aberta_em) || a.codigo.localeCompare(b.codigo))
}

// KPIs da aba: % conforme geral (somando todas as vistorias), NCs em aberto e vistorias concluídas.
export function kpisDaFVS(vistorias, ncs) {
  const soma = vistorias.reduce((s, v) => { const p = progressoDaVistoria(v); return { ok: s.ok + p.ok, nc: s.nc + p.nc } }, { ok: 0, nc: 0 })
  return {
    conformidade: soma.ok + soma.nc ? Math.round((soma.ok / (soma.ok + soma.nc)) * 100) : null,
    ncsAbertas: ncs.filter((n) => n.status !== 'fechada').length,
    concluidas: vistorias.filter((v) => v.status === 'concluida').length,
    emAndamento: vistorias.filter((v) => v.status === 'em_andamento').length,
  }
}

// ---------- modelos ----------
export function proximoCodigoModelo(modelos) {
  const n = modelos.reduce((m, x) => Math.max(m, Number(String(x.codigo).replace(/\D/g, '')) || 0), 0) + 1
  return `FVS-${String(n).padStart(2, '0')}`
}

export function modeloEmBranco(modelos) {
  return { codigo: proximoCodigoModelo(modelos), nome: '', categoria: '', grupos: [{ nome: 'Execução', itens: [{ id: null, titulo: '' }] }] }
}

export function validarModelo(d, modelos, idAtual = null) {
  const erros = { grupos: [] }
  if (!d.codigo || !d.codigo.trim()) erros.codigo = 'Informe o código.'
  else if (modelos.some((m) => m.id !== idAtual && m.codigo.toLowerCase() === d.codigo.trim().toLowerCase())) erros.codigo = 'Já existe um modelo com este código.'
  if (!d.nome || !d.nome.trim()) erros.nome = 'Informe o nome do serviço.'
  if (!CATEGORIAS_FVS.includes(d.categoria)) erros.categoria = 'Escolha a categoria.'
  if (d.grupos.length === 0) erros.semGrupo = 'Acrescente pelo menos um grupo.'
  d.grupos.forEach((g, i) => {
    const e = {}
    if (!g.nome || !g.nome.trim()) e.nome = 'Dê um nome ao grupo.'
    if (g.itens.length === 0) e.itens = 'O grupo precisa de pelo menos um item.'
    else if (g.itens.some((it) => !it.titulo || !it.titulo.trim())) e.itens = 'Preencha todos os itens (ou remova os vazios).'
    erros.grupos[i] = e
  })
  const temErro = Object.keys(erros).some((k) => k !== 'grupos') || erros.grupos.some((e) => Object.keys(e).length)
  return temErro ? erros : null
}

// Salvar o modelo: itens novos ganham id; editar um modelo que já existe sobe a versão.
export function montarModelo(d, anterior = null, gerarId = () => `it-${Math.random().toString(36).slice(2, 9)}`) {
  return {
    ...(anterior ?? {}),
    codigo: d.codigo.trim(), nome: d.nome.trim(), categoria: d.categoria,
    versao: anterior ? anterior.versao + 1 : 1,
    grupos: d.grupos.map((g) => ({ nome: g.nome.trim(), itens: g.itens.map((it) => ({ id: it.id ?? gerarId(), titulo: it.titulo.trim() })) })),
  }
}

export function contarItensDoModelo(m) {
  return itensDaFicha(m.grupos).length
}
// =====================================================================================
// GEMBA WALK — caça aos desperdícios
// Observação: { id, obra_id, data, registrado_por, local, descricao, causa_raiz, acao,
//   desperdicios: [1+ dos 7 tipos], prazo (ou null), responsavel, status, foto }
// O status usa o mesmo vocabulário das pendências (pendente / em andamento / resolvido).
// =====================================================================================
// Os 7 desperdícios, com o texto EXATO. `classe` dá a cor da etiqueta na tela.
export const TIPOS_DESPERDICIO = [
  { id: 'Retrabalho', classe: 'retrabalho' },
  { id: 'Espera', classe: 'espera' },
  { id: 'Transporte', classe: 'transporte' },
  { id: 'Movimentação', classe: 'movimentacao' },
  { id: 'Estoque', classe: 'estoque' },
  { id: 'Superprodução', classe: 'superproducao' },
  { id: 'Processo desnecessário', classe: 'processo' },
]

export const FILTROS_PRAZO_GEMBA = [
  { id: 'todos', rotulo: 'Todos' },
  { id: 'vencidos', rotulo: 'Vencidos' },
  { id: 'hoje', rotulo: 'Hoje' },
  { id: 'semana', rotulo: 'Esta semana' },
  { id: 'sem_prazo', rotulo: 'Sem prazo' },
]

export function classeDoDesperdicio(tipo) {
  return TIPOS_DESPERDICIO.find((t) => t.id === tipo)?.classe ?? ''
}

export function prazoVencido(o, hoje) {
  return o.status !== 'resolvido' && !!o.prazo && o.prazo < hoje
}

// Onde a obra mais perde: quantas observações citam cada tipo, do maior para o menor
// (os 7 sempre aparecem; empate em ordem alfabética).
export function rankingDesperdicios(observacoes) {
  const conta = new Map(TIPOS_DESPERDICIO.map((t) => [t.id, 0]))
  for (const o of observacoes) for (const t of o.desperdicios) if (conta.has(t)) conta.set(t, conta.get(t) + 1)
  return [...conta].map(([tipo, total]) => ({ tipo, total })).sort((a, b) => b.total - a.total || a.tipo.localeCompare(b.tipo, 'pt-BR'))
}

export function filtrarGemba(observacoes, { tipo = '', prazo = 'todos', busca = '' }, hoje) {
  const semana = semanaAtual(hoje)
  const termo = semAcento(busca.trim())
  return observacoes.filter((o) => {
    if (tipo && !o.desperdicios.includes(tipo)) return false
    if (prazo === 'vencidos' && !prazoVencido(o, hoje)) return false
    if (prazo === 'hoje' && o.prazo !== hoje) return false
    if (prazo === 'semana' && !(o.prazo && o.prazo >= semana.inicio && o.prazo <= semana.fim)) return false
    if (prazo === 'sem_prazo' && o.prazo) return false
    if (termo && !semAcento([o.local, o.descricao, o.causa_raiz, o.acao, o.responsavel].join(' ')).includes(termo)) return false
    return true
  }).sort((a, b) => Number(prazoVencido(b, hoje)) - Number(prazoVencido(a, hoje)) || (a.prazo ?? '9999').localeCompare(b.prazo ?? '9999'))
}

export function validarObservacao(d, hoje) {
  const erros = {}
  if (!d.local || !d.local.trim()) erros.local = 'Informe o local.'
  if (!d.descricao || !d.descricao.trim()) erros.descricao = 'Descreva o que você viu.'
  if (!d.causa_raiz || !d.causa_raiz.trim()) erros.causa_raiz = 'Qual é a causa raiz?'
  if (!d.acao || !d.acao.trim()) erros.acao = 'O que será feito?'
  if (!d.desperdicios?.length) erros.desperdicios = 'Marque pelo menos um tipo de desperdício.'
  else if (d.desperdicios.some((t) => !TIPOS_DESPERDICIO.some((x) => x.id === t))) erros.desperdicios = 'Tipo de desperdício desconhecido.'
  if (!d.responsavel || !d.responsavel.trim()) erros.responsavel = 'Informe o responsável.'
  if (d.prazo && d.prazo < hoje) erros.prazo = 'O prazo não pode ser antes de hoje.'
  return erros
}

// Marcar/desmarcar um tipo, mantendo a ordem oficial dos 7.
export function alternarDesperdicio(lista, tipo) {
  const tem = lista.includes(tipo)
  return TIPOS_DESPERDICIO.map((t) => t.id).filter((t) => (t === tipo ? !tem : lista.includes(t)))
}

export function novaObservacao(d, { hoje, usuario }) {
  return {
    data: hoje, registrado_por: usuario, local: d.local.trim(), descricao: d.descricao.trim(), causa_raiz: d.causa_raiz.trim(),
    acao: d.acao.trim(), desperdicios: d.desperdicios, prazo: d.prazo || null, responsavel: d.responsavel.trim(),
    status: 'pendente', foto: d.foto || null,
  }
}

export function moverObservacao(o, status) {
  return STATUS_PENDENCIA.some((s) => s.id === status) ? { ...o, status } : o
}
// =====================================================================================
// RELATÓRIO IMPRIMÍVEL (só o engenheiro). Usa os MESMOS filtros das abas.
// =====================================================================================
export const FILTROS_INICIAIS_PENDENCIAS = { status: '', responsavel: '', prazo: 'todos', busca: '' }
export const FILTROS_INICIAIS_GEMBA = { tipo: '', prazo: 'todos', busca: '' }

export function podeTirarRelatorio(papel) {
  return papel === 'Engenheiro'
}

// Os filtros em texto, para o cabeçalho do relatório. Sem filtro: "Sem filtros".
export function descreverFiltros(pend = FILTROS_INICIAIS_PENDENCIAS, gemba = FILTROS_INICIAIS_GEMBA) {
  const partes = []
  if (pend.status) partes.push(`Pendências: status ${rotuloStatusPendencia(pend.status).toLowerCase()}`)
  if (pend.responsavel) partes.push(`Pendências: responsável ${pend.responsavel}`)
  if (pend.prazo && pend.prazo !== 'todos') partes.push(`Pendências: prazo ${FILTROS_PRAZO.find((x) => x.id === pend.prazo)?.rotulo.toLowerCase()}`)
  if (pend.busca?.trim()) partes.push(`Pendências: busca "${pend.busca.trim()}"`)
  if (gemba.tipo) partes.push(`Gemba: ${gemba.tipo}`)
  if (gemba.prazo && gemba.prazo !== 'todos') partes.push(`Gemba: prazo ${FILTROS_PRAZO_GEMBA.find((x) => x.id === gemba.prazo)?.rotulo.toLowerCase()}`)
  if (gemba.busca?.trim()) partes.push(`Gemba: busca "${gemba.busca.trim()}"`)
  return partes.length ? partes.join(' · ') : 'Sem filtros'
}

// "19/10/2026 às 14:05" no relógio do aparelho (sem toISOString).
export function dataHoraDoRelatorio(agora = new Date()) {
  const p = (n) => String(n).padStart(2, '0')
  return `${p(agora.getDate())}/${p(agora.getMonth() + 1)}/${agora.getFullYear()} às ${p(agora.getHours())}:${p(agora.getMinutes())}`
}