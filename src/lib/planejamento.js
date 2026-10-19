// Regras puras do módulo PLANEJAMENTO (Last Planner): EAP, dias úteis e, depois,
// os três horizontes. Sem React, sem banco. Todas as abas usam a MESMA lista de atividades.
//
// Atividade: { id, obra_id, pai_id, ordem, titulo, inicio, fim, progresso, status,
//   subtarefas: [], restricoes: [], nao_realizado: null | {...}, arquivada }
// Atividade com subatividades é um GRUPO: as datas e o progresso dele são calculados.
import { diasEntre, somarDias } from './datas.js'

export const DIAS_SEMANA = [
  { id: 1, curto: 'Seg', nome: 'Segunda' },
  { id: 2, curto: 'Ter', nome: 'Terça' },
  { id: 3, curto: 'Qua', nome: 'Quarta' },
  { id: 4, curto: 'Qui', nome: 'Quinta' },
  { id: 5, curto: 'Sex', nome: 'Sexta' },
  { id: 6, curto: 'Sáb', nome: 'Sábado' },
  { id: 0, curto: 'Dom', nome: 'Domingo' },
]

// Padrão da obra: segunda a sexta, feriados nacionais do período das obras.
export const CONFIG_PADRAO = {
  dias_uteis: [1, 2, 3, 4, 5],
  feriados: ['2026-11-02', '2026-11-15', '2026-11-20', '2026-12-25', '2027-01-01'],
}

export const STATUS_ATIVIDADE = [
  { id: 'a_fazer', rotulo: 'A fazer' },
  { id: 'em_andamento', rotulo: 'Em andamento' },
  { id: 'concluido', rotulo: 'Concluído' },
]

// Dias úteis da obra: pelo menos um dia de trabalho; feriado não se repete.
export function validarConfig(config, novoFeriado = '') {
  const erros = {}
  if (config.dias_uteis.length === 0) erros.dias = 'Marque pelo menos um dia de trabalho.'
  if (novoFeriado && config.feriados.includes(novoFeriado)) erros.novo = 'Este feriado já está na lista.'
  return erros
}

// "Seg, Ter, Qua, Qui, Sex · 5 feriados"
export function resumoDiasUteis(config) {
  const dias = DIAS_SEMANA.filter((d) => config.dias_uteis.includes(d.id)).map((d) => d.curto)
  const n = config.feriados.length
  return `${dias.join(', ')} · ${n} ${n === 1 ? 'feriado' : 'feriados'}`
}

export function rotuloStatusAtividade(id) {
  return STATUS_ATIVIDADE.find((s) => s.id === id)?.rotulo ?? id
}

// ---------- dias úteis ----------
// 0 = domingo ... 6 = sábado, sem passar por fuso.
export function diaDaSemana(iso) {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay()
}

export function ehDiaUtil(iso, config) {
  return config.dias_uteis.includes(diaDaSemana(iso)) && !config.feriados.includes(iso)
}

// Dias úteis de `inicio` até `fim`, contando os dois. Fim antes do início = 0.
export function diasUteisEntre(inicio, fim, config) {
  const total = diasEntre(inicio, fim)
  let n = 0
  for (let i = 0; i <= total; i++) {
    if (ehDiaUtil(somarDias(inicio, i), config)) n++
  }
  return n
}

// ---------- árvore da EAP ----------
const porOrdem = (a, b) => a.ordem - b.ordem

function filhosDe(atividades, paiId) {
  return atividades.filter((a) => (a.pai_id ?? null) === paiId).sort(porOrdem)
}

export function temFilhosAtivos(atividades, id) {
  return atividades.some((a) => a.pai_id === id && !a.arquivada)
}

// Todos os descendentes (filhos, netos...) de uma atividade.
export function descendentes(atividades, id) {
  const ids = []
  for (const f of filhosDe(atividades, id)) ids.push(f.id, ...descendentes(atividades, f.id))
  return ids
}

// Códigos automáticos (1, 1.1, 1.2.1...). Só as ativas recebem código: arquivar
// renumera as irmãs, como no MS Project.
export function codigosEAP(atividades) {
  const codigos = new Map()
  function numerar(paiId, prefixo) {
    filhosDe(atividades, paiId).filter((a) => !a.arquivada).forEach((a, i) => {
      const codigo = prefixo ? `${prefixo}.${i + 1}` : String(i + 1)
      codigos.set(a.id, codigo)
      numerar(a.id, codigo)
    })
  }
  numerar(null, '')
  return codigos
}

// Quanto da atividade já devia estar feito no começo de `hoje`, em %: os dias úteis
// que já passaram (até ontem) sobre o total — o plano espalha o serviço por igual.
// Assim, no 1º dia o previsto é 0 e a atividade não nasce "atrasada".
export function previstoEm(inicio, fim, hoje, config) {
  if (hoje <= inicio) return 0
  if (hoje > fim) return 100
  const total = diasUteisEntre(inicio, fim, config)
  return total === 0 ? 0 : Math.round((diasUteisEntre(inicio, somarDias(hoje, -1), config) / total) * 100)
}

// Datas, progresso real e previsto de qualquer atividade. Num grupo, vêm das subatividades
// ativas: início mais cedo, fim mais tarde e % pesados pelos dias úteis de cada uma.
// O previsto só é calculado quando se passa `hoje`.
export function resumo(atividades, id, config, hoje = null) {
  const a = atividades.find((x) => x.id === id)
  const filhos = filhosDe(atividades, id).filter((f) => !f.arquivada)
  if (filhos.length === 0) {
    return {
      inicio: a.inicio, fim: a.fim, progresso: a.progresso, dias: diasUteisEntre(a.inicio, a.fim, config),
      previsto: hoje ? previstoEm(a.inicio, a.fim, hoje, config) : null,
    }
  }
  const partes = filhos.map((f) => resumo(atividades, f.id, config, hoje))
  const inicio = partes.map((p) => p.inicio).sort()[0]
  const fim = partes.map((p) => p.fim).sort().at(-1)
  const media = (campo) => {
    const peso = partes.reduce((s, p) => s + Math.max(p.dias, 1), 0)
    return Math.round(partes.reduce((s, p) => s + Math.max(p.dias, 1) * p[campo], 0) / peso)
  }
  return { inicio, fim, progresso: media('progresso'), dias: diasUteisEntre(inicio, fim, config), previsto: hoje ? media('previsto') : null }
}

// A árvore achatada, na ordem de leitura, com código e nível de cada linha.
// Arquivadas só aparecem se pedidas, e sem código.
export function linhasEAP(atividades, { mostrarArquivadas = false } = {}) {
  const codigos = codigosEAP(atividades)
  const linhas = []
  function descer(paiId, nivel) {
    for (const a of filhosDe(atividades, paiId)) {
      if (a.arquivada && !mostrarArquivadas) continue
      linhas.push({ atividade: a, codigo: codigos.get(a.id) ?? null, nivel, grupo: temFilhosAtivos(atividades, a.id) })
      descer(a.id, nivel + 1)
    }
  }
  descer(null, 0)
  return linhas
}

// Onde uma atividade pode ficar: qualquer ativa que não seja ela nem uma descendente dela.
export function opcoesDePai(atividades, id = null) {
  const proibidos = id ? new Set([id, ...descendentes(atividades, id)]) : new Set()
  return linhasEAP(atividades).filter((l) => !proibidos.has(l.atividade.id))
}

// Pôr uma subatividade numa atividade que ainda não tem nenhuma a transforma em grupo:
// as datas e o progresso dela passam a vir das subatividades.
export function viraGrupo(atividades, paiId) {
  return !!paiId && !temFilhosAtivos(atividades, paiId)
}

export function temRestricaoAberta(atividade) {
  return (atividade.restricoes ?? []).some((r) => !r.resolvida)
}

// ---------- criar e editar ----------
export function validarAtividade(d, config, { grupo = false } = {}) {
  const erros = {}
  if (!d.titulo || !d.titulo.trim()) erros.titulo = 'Informe o nome da atividade.'
  if (grupo) return erros
  if (!d.inicio) erros.inicio = 'Informe a data de início.'
  if (!d.fim) erros.fim = 'Informe a data de fim.'
  if (d.inicio && d.fim) {
    if (d.fim < d.inicio) erros.fim = 'O fim não pode ser antes do início.'
    else if (diasUteisEntre(d.inicio, d.fim, config) === 0) erros.fim = 'O período não tem nenhum dia útil.'
  }
  return erros
}

function proximaOrdem(atividades, paiId) {
  return filhosDe(atividades, paiId).reduce((m, a) => Math.max(m, a.ordem), 0) + 1
}

// Atividade nova vai para o fim da lista do lugar escolhido (nível principal ou dentro de outra).
export function novaAtividade(d, atividades) {
  const pai_id = d.pai_id || null
  return {
    pai_id, ordem: proximaOrdem(atividades, pai_id), titulo: d.titulo.trim(), inicio: d.inicio, fim: d.fim,
    progresso: 0, status: 'a_fazer', subtarefas: [], restricoes: [], nao_realizado: null, arquivada: false,
  }
}

// Edição da EAP: nome, lugar na árvore e datas. Mudou de lugar → vai para o fim do novo lugar.
// Num grupo as datas não mudam (são calculadas das subatividades).
export function aplicarEdicao(a, d, atividades, { grupo = false } = {}) {
  const pai_id = d.pai_id || null
  const mudouDeLugar = pai_id !== (a.pai_id ?? null)
  return {
    ...a,
    titulo: d.titulo.trim(),
    pai_id,
    ordem: mudouDeLugar ? proximaOrdem(atividades, pai_id) : a.ordem,
    ...(grupo ? {} : { inicio: d.inicio, fim: d.fim }),
  }
}

// ---------- longo prazo (cronograma) ----------
// Situação de prazo: compara o real com o previsto para hoje.
export function situacaoPrazo({ progresso, previsto }) {
  if (progresso >= 100) return { id: 'concluida', rotulo: 'Concluída' }
  if (progresso < previsto) return { id: 'atrasada', rotulo: `Atrasada ${previsto - progresso} pts` }
  if (previsto === 0 && progresso === 0) return { id: 'a_iniciar', rotulo: 'A iniciar' }
  return { id: 'no_prazo', rotulo: 'No prazo' }
}

// A obra inteira: previsto e real somando todas as atividades ativas sem filhas,
// e quantas estão atrás do previsto.
export function resumoDoCronograma(atividades, config, hoje) {
  const folhas = atividades.filter((a) => !a.arquivada && !temFilhosAtivos(atividades, a.id))
  if (folhas.length === 0) return { previsto: 0, progresso: 0, atrasadas: 0 }
  const partes = folhas.map((a) => resumo(atividades, a.id, config, hoje))
  const peso = partes.reduce((s, p) => s + Math.max(p.dias, 1), 0)
  const media = (campo) => Math.round(partes.reduce((s, p) => s + Math.max(p.dias, 1) * p[campo], 0) / peso)
  return {
    previsto: media('previsto'),
    progresso: media('progresso'),
    atrasadas: partes.filter((p) => situacaoPrazo(p).id === 'atrasada').length,
  }
}

// Segunda-feira da semana de uma data.
export function segundaDaSemana(iso) {
  return somarDias(iso, -((diaDaSemana(iso) + 6) % 7))
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

// A régua do cronograma: colunas por semana (começam na segunda) ou por mês,
// cobrindo de `inicio` a `fim`. Cada coluna diz em que dia começa e quantos dias tem.
export function escalaDoCronograma(inicio, fim, modo) {
  if (fim < inicio) fim = inicio
  const colunas = []
  if (modo === 'semana') {
    for (let d = segundaDaSemana(inicio); d <= fim; d = somarDias(d, 7)) {
      const [, m, dia] = d.split('-')
      colunas.push({ inicio: d, dias: 7, rotulo: `${dia}/${m}` })
    }
  } else {
    let [a, m] = inicio.split('-').map(Number)
    for (;;) {
      const d = `${a}-${String(m).padStart(2, '0')}-01`
      if (d > fim) break
      const [a2, m2] = m === 12 ? [a + 1, 1] : [a, m + 1]
      const prox = `${a2}-${String(m2).padStart(2, '0')}-01`
      colunas.push({ inicio: d, dias: diasEntre(d, prox), rotulo: `${MESES[m - 1]}/${String(a).slice(2)}` })
      ;[a, m] = [a2, m2]
    }
  }
  const total = colunas.reduce((s, c) => s + c.dias, 0)
  return { inicio: colunas[0].inicio, colunas, totalDias: total }
}

// Onde uma barra (ou a linha de hoje) fica na régua, em % da largura. Dias inclusivos.
export function posicaoNaEscala(escala, de, ate = de) {
  const esquerda = diasEntre(escala.inicio, de)
  const largura = diasEntre(de, ate) + 1
  return { esquerda: (esquerda / escala.totalDias) * 100, largura: (largura / escala.totalDias) * 100 }
}

export function validarProgresso(valor) {
  if (valor === '' || valor === null || valor === undefined) return 'Informe o progresso.'
  const n = Number(valor)
  if (!Number.isInteger(n) || n < 0 || n > 100) return 'Use um número inteiro de 0 a 100.'
  return null
}

// Atualizar o progresso real move o status junto: 100% conclui, mais de 0% está em andamento.
export function aplicarProgresso(a, valor) {
  const progresso = Number(valor)
  const status = progresso >= 100 ? 'concluido' : progresso > 0 ? 'em_andamento' : (a.status === 'concluido' ? 'a_fazer' : a.status)
  return { ...a, progresso, status }
}

// ---------- médio prazo (lookahead e restrições) ----------
// Os 7 tipos de restrição do Last Planner. A cor e o ícone ficam na tela (classe tipo-<id>).
export const TIPOS_RESTRICAO = [
  { id: 'material', rotulo: 'Material' },
  { id: 'mao_de_obra', rotulo: 'Mão de obra' },
  { id: 'metodo', rotulo: 'Método' },
  { id: 'equipamento', rotulo: 'Equipamento' },
  { id: 'projeto', rotulo: 'Projeto' },
  { id: 'seguranca', rotulo: 'Segurança' },
  { id: 'logistica', rotulo: 'Logística' },
]

export function rotuloTipoRestricao(id) {
  return TIPOS_RESTRICAO.find((t) => t.id === id)?.rotulo ?? id
}

// As semanas do horizonte, a partir da semana de hoje (segunda a domingo).
export function semanasDoHorizonte(hoje, quantas) {
  const primeira = segundaDaSemana(hoje)
  return Array.from({ length: quantas }, (_, i) => {
    const inicio = somarDias(primeira, i * 7)
    return { inicio, fim: somarDias(inicio, 6) }
  })
}

// O período [inicio, fim] cruza a semana?
export function cruzaSemana(inicio, fim, semana) {
  return inicio <= semana.fim && fim >= semana.inicio
}

// As atividades (sem subatividades, ativas) planejadas para uma semana: o período cruza a
// semana OU — se `acumular` — deviam ter terminado antes dela e ainda não terminaram.
export function atividadesDaSemana(atividades, semana, { acumular = false } = {}) {
  return atividades.filter((a) => !a.arquivada && !temFilhosAtivos(atividades, a.id)).filter((a) =>
    cruzaSemana(a.inicio, a.fim, semana) || (acumular && ehAcumulada(a, semana)))
}

// Devia ter terminado antes da semana e ainda não terminou: entra na semana como acumulada.
export function ehAcumulada(a, semana) {
  return a.fim < semana.inicio && a.status !== 'concluido'
}

// Quem já aparece como responsável nas restrições da obra (para o filtro e para sugerir).
export function responsaveisDasRestricoes(atividades) {
  const nomes = new Set()
  for (const a of atividades) for (const r of a.restricoes ?? []) if (r.responsavel) nomes.add(r.responsavel)
  return [...nomes].sort((x, y) => x.localeCompare(y, 'pt-BR'))
}

// O quadro: para cada semana do horizonte, os cartões de restrição das atividades ativas.
// Restrição aberta de semana que já passou não some: cai na semana atual, marcada.
// Restrição depois do horizonte não aparece, mas é contada.
export function quadroDeRestricoes(atividades, hoje, { semanas = 4, responsavel = '', mostrarResolvidas = false } = {}) {
  const colunas = semanasDoHorizonte(hoje, semanas)
  const codigos = codigosEAP(atividades)
  const quadro = colunas.map((s) => ({ semana: s, cartoes: [] }))
  let depois = 0
  for (const a of atividades) {
    if (a.arquivada) continue
    for (const r of a.restricoes ?? []) {
      if (r.resolvida && !mostrarResolvidas) continue
      if (responsavel && r.responsavel !== responsavel) continue
      const cartao = {
        restricao: r, atividade: a, codigo: codigos.get(a.id),
        vencida: !r.resolvida && r.prazo < hoje,
        deSemanaPassada: r.semana < colunas[0].inicio,
      }
      if (cartao.deSemanaPassada) {
        if (!r.resolvida) quadro[0].cartoes.push(cartao)
        continue
      }
      const i = colunas.findIndex((s) => s.inicio === r.semana)
      if (i >= 0) quadro[i].cartoes.push(cartao)
      else depois++
    }
  }
  for (const c of quadro) c.cartoes.sort((x, y) => Number(x.restricao.resolvida) - Number(y.restricao.resolvida) || x.restricao.prazo.localeCompare(y.restricao.prazo))
  return { quadro, depois }
}

export function validarRestricao(d) {
  const erros = {}
  if (!d.atividade_id) erros.atividade_id = 'Escolha a atividade que está impedida.'
  if (!d.descricao || !d.descricao.trim()) erros.descricao = 'Descreva o que está impedindo.'
  if (!TIPOS_RESTRICAO.some((t) => t.id === d.tipo)) erros.tipo = 'Escolha o tipo.'
  if (!d.prazo) erros.prazo = 'Informe até quando precisa estar resolvida.'
  if (!d.responsavel || !d.responsavel.trim()) erros.responsavel = 'Informe quem vai resolver.'
  return erros
}

// A restrição nasce na coluna da semana do prazo.
export function novaRestricao(d, id) {
  return {
    id, descricao: d.descricao.trim(), tipo: d.tipo, prazo: d.prazo, responsavel: d.responsavel.trim(),
    semana: segundaDaSemana(d.prazo), resolvida: false,
  }
}

export function acrescentarRestricao(atividade, restricao) {
  return { ...atividade, restricoes: [...(atividade.restricoes ?? []), restricao] }
}

// Mover pela seta: a restrição troca de semana e o prazo anda junto (7 dias).
// Não volta para antes da semana atual.
export function podeVoltarSemana(restricao, hoje) {
  return restricao.semana > segundaDaSemana(hoje)
}

export function moverRestricao(atividade, restricaoId, semanas) {
  return {
    ...atividade,
    restricoes: atividade.restricoes.map((r) => (r.id !== restricaoId ? r : {
      ...r, semana: somarDias(r.semana, 7 * semanas), prazo: somarDias(r.prazo, 7 * semanas),
    })),
  }
}

// Resolvida guarda o dia; reabrir apaga.
export function marcarResolvida(atividade, restricaoId, resolvida, hoje) {
  return {
    ...atividade,
    restricoes: atividade.restricoes.map((r) => (r.id !== restricaoId ? r : { ...r, resolvida, resolvida_em: resolvida ? hoje : null })),
  }
}

// ---------- curto prazo (semana, Kanban e PPC) ----------
export const CAUSAS_NAO_REALIZADO = [
  { id: 'material', rotulo: 'Falta de material' },
  { id: 'mao_de_obra', rotulo: 'Falta de mão de obra' },
  { id: 'projeto', rotulo: 'Projeto (falta ou erro)' },
  { id: 'equipamento', rotulo: 'Equipamento' },
  { id: 'clima', rotulo: 'Clima (chuva)' },
  { id: 'servico_anterior', rotulo: 'Serviço anterior não terminou' },
  { id: 'metodo', rotulo: 'Método / retrabalho' },
  { id: 'seguranca', rotulo: 'Segurança' },
  { id: 'outra', rotulo: 'Outra (descrever)' },
]

export function rotuloCausa(id) {
  return CAUSAS_NAO_REALIZADO.find((c) => c.id === id)?.rotulo ?? id
}

// A semana (segunda a domingo) que contém a data.
export function semanaDe(iso) {
  const inicio = segundaDaSemana(iso)
  return { inicio, fim: somarDias(inicio, 6) }
}

// PPC = Percentual do Plano Concluído: concluídas ÷ planejadas da semana × 100.
// Mede a confiabilidade do planejamento. Semana sem nada planejado não tem PPC (null).
export function ppcDaSemana(planejadas) {
  const total = planejadas.length
  const concluidas = planejadas.filter((a) => a.status === 'concluido').length
  return { total, concluidas, ppc: total === 0 ? null : Math.round((concluidas / total) * 100) }
}

// Mover no Kanban. Concluir põe 100% e apaga o "não realizado"; sair de Concluído
// volta a 0% (A fazer) ou fica abaixo de 100% (Em andamento).
export function aplicarStatus(a, status) {
  if (status === 'concluido') return { ...a, status, progresso: 100, nao_realizado: null }
  if (a.status === 'concluido') return { ...a, status, progresso: status === 'a_fazer' ? 0 : Math.min(a.progresso, 90) }
  return { ...a, status }
}

export function validarNaoRealizado(d) {
  const erros = {}
  if (!CAUSAS_NAO_REALIZADO.some((c) => c.id === d.causa)) erros.causa = 'Escolha a causa raiz.'
  if (d.causa === 'outra' && !(d.obs ?? '').trim()) erros.obs = 'Descreva a causa.'
  return erros
}

const registroNaoRealizado = (d, semana) => ({ causa: d.causa, obs: (d.obs ?? '').trim(), semana: semana.inicio })

// "Não realizado" exige a causa raiz e fica registrado na semana. A atividade não sai
// da coluna: ela só não foi concluída como prometido.
export function marcarNaoRealizada(a, d, semana) {
  return { ...a, nao_realizado: registroNaoRealizado(d, semana) }
}

export function desfazerNaoRealizada(a) {
  return { ...a, nao_realizado: null }
}

// ---------- subtarefas (checklist dentro da atividade) ----------
export function validarSubtarefa(texto, subtarefas) {
  const t = (texto ?? '').trim()
  if (!t) return 'Escreva a subtarefa.'
  if (subtarefas.some((s) => s.texto.toLowerCase() === t.toLowerCase())) return 'Esta subtarefa já existe.'
  return null
}

export function acrescentarSubtarefa(a, texto, id) {
  return { ...a, subtarefas: [...a.subtarefas, { id, texto: texto.trim(), feita: false, nao_realizado: null }] }
}

export function removerSubtarefa(a, id) {
  return { ...a, subtarefas: a.subtarefas.filter((s) => s.id !== id) }
}

// Marcar como feita apaga o "não realizado" da subtarefa.
export function alternarSubtarefa(a, id) {
  return { ...a, subtarefas: a.subtarefas.map((s) => (s.id !== id ? s : { ...s, feita: !s.feita, nao_realizado: null })) }
}

export function subtarefaNaoRealizada(a, id, d, semana) {
  return { ...a, subtarefas: a.subtarefas.map((s) => (s.id !== id ? s : { ...s, feita: false, nao_realizado: registroNaoRealizado(d, semana) })) }
}

export function desfazerSubtarefaNaoRealizada(a, id) {
  return { ...a, subtarefas: a.subtarefas.map((s) => (s.id !== id ? s : { ...s, nao_realizado: null })) }
}

// As causas dos "não realizados" da semana (atividades e subtarefas), da mais frequente
// para a menos. É o que se discute na reunião semanal para o PPC subir.
export function causasDaSemana(planejadas, semana) {
  const contagem = new Map()
  const somar = (nr) => { if (nr && nr.semana === semana.inicio) contagem.set(nr.causa, (contagem.get(nr.causa) ?? 0) + 1) }
  for (const a of planejadas) {
    somar(a.nao_realizado)
    for (const s of a.subtarefas ?? []) somar(s.nao_realizado)
  }
  return [...contagem].map(([causa, vezes]) => ({ causa, rotulo: rotuloCausa(causa), vezes }))
    .sort((x, y) => y.vezes - x.vezes || x.rotulo.localeCompare(y.rotulo, 'pt-BR'))
}

// Arquivar leva junto todas as subatividades; desarquivar traz todas de volta.
// Desarquivar uma subatividade cujo grupo está arquivado traz o grupo também.
export function arquivarComFilhos(atividades, id, arquivar) {
  const ids = new Set([id, ...descendentes(atividades, id)])
  if (!arquivar) {
    let pai = atividades.find((a) => a.id === id)?.pai_id
    while (pai) {
      const p = atividades.find((a) => a.id === pai)
      if (p?.arquivada) ids.add(p.id)
      pai = p?.pai_id
    }
  }
  return atividades.filter((a) => ids.has(a.id) && a.arquivada !== arquivar).map((a) => ({ ...a, arquivada: arquivar }))
}
