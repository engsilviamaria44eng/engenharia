// Motor do BI (Relatórios): painel executivo e o "painel bloqueado" quando falta módulo.
import {
  modulosDoBI, nomeDoModulo, seguro, pctSeguro, curvaS, evolucao, ppcGeral, prazoDaObra, custoMedido, painelExecutivo, pontosDaSerie,
  ppcSemanal, paretoDeCausas, piorClima, climaEEfetivo, painelRitmo,
  painelContratos, matrizDeEmpreiteiros, saldoPorContrato, painelMateriais, pedidosPorEtapa, leadTimeDosPedidos,
  painelQualidade, conformePorModelo, pendenciasPorEmpresa, empresasDoBI, inicioDoPeriodo, filtrarFontes, descreverFiltrosBI, FILTROS_BI_INICIAIS,
} from '../src/lib/biData.js'
import { OBRAS, ATIVIDADES_PLANEJAMENTO, CONTRATOS, ITENS_CONTRATO, MEDICOES, PEDIDOS, PENDENCIAS, DIARIOS, MATERIAIS_CATALOGO, VISTORIAS_FVS, NAO_CONFORMIDADES, GEMBA_OBSERVACOES } from '../src/lib/mockData.js'
import { CONFIG_PADRAO } from '../src/lib/planejamento.js'

let ok = 0
let tot = 0

function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) {
    ok++
  } else {
    console.log(`  ✗ ${descricao}`)
    console.log(`     esperado: ${JSON.stringify(esperado)}`)
    console.log(`     veio:     ${JSON.stringify(real)}`)
  }
}

const hoje = '2026-10-19'
const da = (lista, obra) => lista.filter((x) => x.obra_id === obra)
const obraJE = OBRAS.find((o) => o.id === 'obra-je')
const atvJE = da(ATIVIDADES_PLANEJAMENTO, 'obra-je')

// ---------- módulos disponíveis (motor adaptativo) ----------
const nada = { atividades: null, contratos: null, pedidos: null, pendencias: null, vistorias: null, gemba: null, diarios: null }
conferir('sem fonte nenhuma: tudo bloqueado', modulosDoBI(nada), { planejamento: false, medicoes: false, materiais: false, qualidade: false, diario: false })
conferir('fontes indefinidas não quebram', modulosDoBI(undefined), { planejamento: false, medicoes: false, materiais: false, qualidade: false, diario: false })
conferir('só o planejamento', modulosDoBI({ ...nada, atividades: atvJE }).planejamento, true)
conferir('lista vazia conta como sem dado', modulosDoBI({ ...nada, contratos: [] }).medicoes, false)
conferir('qualidade liga com qualquer uma das 3 partes', modulosDoBI({ ...nada, pendencias: da(PENDENCIAS, 'obra-je') }).qualidade, true)
conferir('materiais com pedidos', modulosDoBI({ ...nada, pedidos: da(PEDIDOS, 'obra-je') }).materiais, true)
conferir('nome do módulo no "Painel bloqueado"', [nomeDoModulo('diario'), nomeDoModulo('medicoes')], ['Diário de Obra', 'Medição de empreiteiros'])

// ---------- nada de NaN ----------
conferir('seguro troca NaN e Infinity', [seguro(NaN), seguro(Infinity, 5), seguro(3)], [0, 5, 3])
conferir('% seguro com total zero', [pctSeguro(3, 0), pctSeguro(1, 3)], [0, 33])
conferir('curva sem atividades', [curvaS([], CONFIG_PADRAO, hoje), curvaS(null, null, hoje)], [null, null])
conferir('evolução e PPC sem atividades', [evolucao([], null, hoje), ppcGeral(null, hoje)], [null, null])
conferir('custo sem contrato', [custoMedido(null, null, null), custoMedido([], [], [])], [null, null])
conferir('prazo sem obra', prazoDaObra(null, hoje), null)
const exVazio = painelExecutivo({ ...nada, obra: null }, hoje)
conferir('painel executivo vazio: tudo null, sem NaN', exVazio, { evolucao: null, prazo: null, custo: null, curva: null, ppc: null })

// ---------- Curva S da JE-01 ----------
const curva = curvaS(atvJE, CONFIG_PADRAO, hoje)
const dow = (iso) => { const [a, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(a, m - 1, d)).getUTCDay() }
conferir('8+ semanas de história', curva.semanas.length >= 8, true)
conferir('toda semana começa na segunda', curva.semanas.every((s) => dow(s.inicio) === 1), true)
conferir('começa na semana do 1º início (01/06)', curva.semanas[0].inicio, '2026-06-01')
conferir('rótulo dd/mm', curva.semanas[0].rotulo, '01/06')
conferir('planejado nunca diminui', curva.semanas.every((s, i) => i === 0 || s.plan >= curva.semanas[i - 1].plan), true)
conferir('planejado termina em 100%', curva.semanas.at(-1).plan, 100)
conferir('hoje cai na semana de 19/10', curva.semanas[curva.indiceHoje].inicio, '2026-10-19')
conferir('real é null no futuro', curva.semanas.slice(curva.indiceHoje + 1).every((s) => s.real === null), true)
conferir('real existe até hoje', curva.semanas.slice(0, curva.indiceHoje + 1).every((s) => Number.isFinite(s.real)), true)
conferir('real nunca passa do planejado no passado (é estimado)', curva.semanas.slice(0, curva.indiceHoje).every((s) => s.real <= s.plan), true)
const ev = evolucao(atvJE, CONFIG_PADRAO, hoje)
conferir('real de hoje na curva = evolução', curva.semanas[curva.indiceHoje].real, ev.real)
conferir('JE-01 atrás do plano', [ev.adiantada, ev.diferenca < 0, ev.real >= 0 && ev.real <= 100], [false, true, true])
conferir('diferença = real − plan', ev.diferenca, ev.real - ev.plan)

// ---------- PPC geral ----------
// Devidas (fim antes de 19/10, sem filhas): Fundação (concluída), Laje (16/10, em andamento) = 1 de 2
conferir('PPC geral da JE-01', ppcGeral(atvJE, hoje), { concluidas: 1, total: 2, pct: 50 })
conferir('PPC geral só com as do passado', ppcGeral(atvJE, '2026-06-02'), null)

// ---------- prazo ----------
conferir('prazo até a entrega do contrato (15/03/2027)', prazoDaObra(obraJE, hoje), { dias: 147, data: '2027-03-15' })
conferir('prazo vencido fica negativo', prazoDaObra({ data_entrega: '2026-10-09' }, hoje).dias, -10)

// ---------- custo medido (só boletins fechados) ----------
// Gesso 25% de 30 mil = 7.500 + Drywall nº 1 = 8.000 + Fundação 60% + 40% de 85 mil = 85.000.
// O boletim nº 2 do Drywall é rascunho: não conta.
conferir('custo medido da JE-01', custoMedido(da(CONTRATOS, 'obra-je'), da(ITENS_CONTRATO, 'obra-je'), da(MEDICOES, 'obra-je')), { valor: 100500, boletins: 4 })
conferir('obra sem boletim fechado mede zero', custoMedido(da(CONTRATOS, 'obra-vn'), da(ITENS_CONTRATO, 'obra-vn'), da(MEDICOES, 'obra-vn')), { valor: 0, boletins: 0 })
conferir('boletim de contrato de outra obra não entra', custoMedido(da(CONTRATOS, 'obra-vn'), ITENS_CONTRATO, MEDICOES).valor, 0)

// ---------- painel executivo completo ----------
const fontesJE = { obra: obraJE, atividades: atvJE, config: CONFIG_PADRAO, contratos: da(CONTRATOS, 'obra-je'), itensContrato: da(ITENS_CONTRATO, 'obra-je'), medicoes: da(MEDICOES, 'obra-je') }
const ex = painelExecutivo(fontesJE, hoje)
conferir('executivo da JE-01 tem tudo', [!!ex.evolucao, ex.prazo.dias, ex.custo.valor, !!ex.curva, ex.ppc.pct], [true, 147, 100500, true, 50])
const soMedicoes = painelExecutivo({ ...fontesJE, atividades: [] }, hoje)
conferir('sem planejamento: só o custo e o prazo', [soMedicoes.evolucao, soMedicoes.curva, soMedicoes.ppc, soMedicoes.custo.valor], [null, null, null, 100500])

// ---------- desenho ----------
conferir('pontos da série (0 embaixo, 100 em cima, null pula)', pontosDaSerie([0, 50, null, 100], 300, 100), [{ x: 0, y: 100 }, { x: 100, y: 50 }, null, { x: 300, y: 0 }])
conferir('série de um ponto fica no meio', pontosDaSerie([20], 200, 100), [{ x: 100, y: 80 }])
conferir('valores fora de 0–100 ficam na caixa', pontosDaSerie([-10, 140], 100, 100).map((p) => p.y), [100, 0])

// ---------- ritmo & produção (etapa 2) ----------
const ppcJE = ppcSemanal(atvJE, hoje)
conferir('PPC semanal: 8 semanas fechadas, a de hoje fica fora', [ppcJE.semanas.length, ppcJE.semanas[0].inicio, ppcJE.semanas.at(-1).inicio], [8, '2026-08-24', '2026-10-12'])
conferir('PPC semanal: metas, batidas e % por semana', ppcJE.semanas.map((s) => [s.total, s.batidas, s.ppc]),
  [[1, 1, 100], [1, 1, 100], [1, 1, 100], [2, 2, 100], [2, 1, 50], [3, 2, 67], [4, 2, 50], [5, 3, 60]])
conferir('PPC semanal: média das semanas com meta', ppcJE.media, 78)
const semMeta = ppcSemanal([{ id: 'x', inicio: '2027-01-04', fim: '2027-01-08', status: 'a_fazer', subtarefas: [] }], hoje)
conferir('sem meta nas 8 semanas: null (nada de NaN)', semMeta, null)
const pareto = paretoDeCausas(atvJE)
conferir('Pareto: da causa mais frequente para a menos', pareto.causas.map((c) => [c.causa, c.vezes]),
  [['material', 2], ['clima', 1], ['equipamento', 1], ['mao_de_obra', 1], ['projeto', 1], ['servico_anterior', 1]])
conferir('Pareto: % e acumulado fecham em 100', [pareto.total, pareto.causas[0].pct, pareto.causas.at(-1).acumulado], [7, 29, 100])
conferir('Pareto sem nenhum não realizado: null', paretoDeCausas(da(ATIVIDADES_PLANEJAMENTO, 'obra-vn')), null)
conferir('pior clima do dia', [piorClima({ manha: 'sol', tarde: 'chuva', noite: null }), piorClima({ manha: 'nublado' }), piorClima({})], ['chuva', 'nublado', null])
const ce = climaEEfetivo(da(DIARIOS, 'obra-je'), hoje)
conferir('clima × efetivo: dias em ordem, efetivo e chuva', ce.dias.slice(5, 8).map((d) => [d.rotulo, d.efetivo, d.clima, d.chuva]),
  [['06/10', 3, 'chuva', true], ['07/10', 1, 'chuva_forte', true], ['08/10', 8, 'nublado', false]])
conferir('clima × efetivo: resumo', [ce.dias.length, ce.maiorEfetivo, ce.mediaEfetivo, ce.diasDeChuva], [14, 12, 7, 3])
conferir('clima × efetivo: diário de amanhã não entra', climaEEfetivo([{ data: '2026-10-20', clima: {}, efetivo: { Pedreiro: 2 } }], hoje), null)
conferir('painel Ritmo sem módulo nenhum: tudo null', painelRitmo({}, hoje), { ppc: null, pareto: null, clima: null })
conferir('painel Ritmo da obra parada (CA-03): tudo null', painelRitmo({ atividades: da(ATIVIDADES_PLANEJAMENTO, 'obra-ca'), diarios: da(DIARIOS, 'obra-ca') }, hoje), { ppc: null, pareto: null, clima: null })

// ---------- contratos & medições + materiais (etapa 3) ----------
const fontesDe = (o) => ({ contratos: da(CONTRATOS, o), itensContrato: ITENS_CONTRATO, medicoes: da(MEDICOES, o), pedidos: da(PEDIDOS, o), catalogo: MATERIAIS_CATALOGO })
const pc = painelContratos(fontesDe('obra-je'))
conferir('fluxo: quantos e quanto em cada etapa', pc.fluxo.map((f) => [f.status, f.quantidade, f.valor, f.semValor]),
  [['elaboracao', 1, 0, 1], ['enviado', 1, 0, 1], ['ativo', 2, 60000, 0], ['concluido', 1, 85000, 0]])
conferir('matriz: do maior valor para o menor, só boletins fechados', pc.matriz.map((l) => [l.empreiteiro, l.total, l.medido, l.pct, l.saldo]),
  [['Construtora Pereira', 85000, 85000, 100, 0], ['Drywall Forte', 30000, 8000, 27, 22000], ['Gesso & Cia', 30000, 7500, 25, 22500]])
conferir('matriz bate com o Custo medido do Executivo', pc.matriz.reduce((s, l) => s + l.medido, 0), custoMedido(da(CONTRATOS, 'obra-je'), ITENS_CONTRATO, da(MEDICOES, 'obra-je')).valor)
conferir('saldo a medir: maior primeiro, sem os zerados', [pc.saldos.linhas.map((l) => [l.id, l.saldo]), pc.saldos.total], [[['ct-01', 22500], ['ct-02', 22000]], 44500])
conferir('saldo a medir sem contrato com valor: null', saldoPorContrato([{ id: 'x', status: 'elaboracao' }], [], []), null)
conferir('matriz de dois contratos do mesmo empreiteiro: uma linha', matrizDeEmpreiteiros([
  { id: 'a', empreiteiro: 'Silva', status: 'ativo', tipo: 'global', valor_global: 1000 },
  { id: 'b', empreiteiro: 'Silva', status: 'concluido', tipo: 'global', valor_global: 3000 }], [], [{ contrato_id: 'b', status: 'fechada', percentual: 100, linhas: [] }]).map((l) => [l.contratos, l.total, l.medido, l.pct]), [[2, 4000, 3000, 75]])
conferir('painel de contratos sem o módulo: null', painelContratos({}), null)
const pm = painelMateriais(fontesDe('obra-je'), hoje)
conferir('pedidos por etapa', pm.etapas.map((e) => e.quantidade), [2, 2, 2, 1, 2])
conferir('críticos ainda não entregues', pm.criticos, 2)
conferir('atrasado: material, frente e dias de atraso', pm.atrasados, [{ id: 'pd-05', material: 'Vergalhão CA-50 10 mm', frente: 'Laje do 2º pavimento', dias: 4, critico: true }])
conferir('lead time: média e as 4 semanas', [pm.leadTime.media, pm.leadTime.semanas.map((s) => [s.rotulo, s.media])], [10, [['28/09', 9], ['05/10', 11], ['12/10', null], ['19/10', null]]])
conferir('lead time sem nenhum pedido chegado: null', leadTimeDosPedidos(da(PEDIDOS, 'obra-vn'), hoje), null)
conferir('pedidos por etapa sem pedidos: tudo zero', pedidosPorEtapa(null).map((e) => e.quantidade), [0, 0, 0, 0, 0])
conferir('painel de materiais sem o módulo: null', painelMateriais({}, hoje), null)

// ---------- qualidade & entrega + filtros cruzados (etapa 4) ----------
const fontesQ = { ...fontesDe('obra-je'), atividades: atvJE, pendencias: da(PENDENCIAS, 'obra-je'), vistorias: da(VISTORIAS_FVS, 'obra-je'), ncs: da(NAO_CONFORMIDADES, 'obra-je'), gemba: da(GEMBA_OBSERVACOES, 'obra-je'), diarios: da(DIARIOS, 'obra-je') }
const pq = painelQualidade(fontesQ)
conferir('% conforme por modelo: o pior primeiro', pq.conforme.map((l) => [l.modelo, l.ok, l.nc, l.pct]), [['Revestimento Cerâmico', 3, 1, 75], ['Impermeabilização — Áreas Molhadas', 7, 2, 78]])
conferir('pendências abertas por empresa (resolvida não entra)', pq.empresas.fatias.map((f) => [f.nome, f.total, f.pct]),
  [['Silva Alvenarias', 2, 40], ['Construtora Pereira', 1, 20], ['Elétrica Luz Forte', 1, 20], ['Hidráulica Fluxo', 1, 20]])
conferir('donut: as fatias fecham em 100%', [pq.empresas.fatias[0].de, pq.empresas.fatias.at(-1).ate], [0, 100])
conferir('mapa por local: total das abertas', [pq.locais.total, pq.locais.locais.length], [5, 5])
conferir('ranking do Gemba: só os tipos que apareceram', pq.desperdicios.ranking.map((r) => r.tipo).slice(0, 3), ['Espera', 'Movimentação', 'Retrabalho'])
conferir('conforme sem resposta OK/NC: null', conformePorModelo([]), null)
conferir('pendências sem nenhuma aberta: null', pendenciasPorEmpresa([{ status: 'resolvido', empresa: 'X' }]), null)
conferir('painel de qualidade sem o módulo: null', painelQualidade({}), null)
conferir('empresas do filtro: contratos, pendências e NCs, sem repetir', empresasDoBI(fontesQ), ['Construtora Pereira', 'Drywall Forte', 'Elétrica Luz Forte', 'Gesso & Cia', 'Hidráulica Fluxo', 'Impermeabiliza Já', 'Revest Pisos', 'Silva Alvenarias'])
conferir('início do período', [inicioDoPeriodo('tudo', hoje), inicioDoPeriodo('mes', hoje), inicioDoPeriodo('4semanas', hoje)], [null, '2026-10-01', '2026-09-28'])
const soSilva = filtrarFontes(fontesQ, { empresa: 'Silva Alvenarias', periodo: 'tudo' }, hoje)
conferir('filtro de empresa: contratos, pendências, NCs e Gemba só dela', [soSilva.contratos.length, soSilva.pendencias.length, soSilva.ncs.length, soSilva.gemba.length], [1, 2, 0, 0])
conferir('filtro de empresa: medições só dos contratos dela', soSilva.medicoes.length, 0)
conferir('filtro de empresa não mexe no que não tem empresa', [soSilva.atividades.length, soSilva.diarios.length, soSilva.pedidos.length], [atvJE.length, 14, 9])
const ult4 = filtrarFontes(fontesQ, { empresa: '', periodo: '4semanas' }, hoje)
const r4 = painelRitmo(ult4, hoje)
conferir('4 semanas: PPC só das semanas do período', r4.ppc.semanas.map((s) => s.rotulo), ['28/09', '05/10', '12/10'])
conferir('4 semanas: a causa de 21/09 sai do Pareto', r4.pareto.causas.some((c) => c.causa === 'equipamento'), false)
conferir('4 semanas: diários e pedidos do período', [r4.clima.dias.length, ult4.pedidos.length], [14, 7])
conferir('o acumulado não muda com o período', painelExecutivo({ ...ult4, obra: obraJE }, hoje).custo, painelExecutivo({ ...fontesQ, obra: obraJE }, hoje).custo)
conferir('descrição dos filtros', [descreverFiltrosBI(FILTROS_BI_INICIAIS), descreverFiltrosBI({ empresa: 'Silva Alvenarias', periodo: 'mes' })],
  ['Empresa: todas · Período: Tudo', 'Empresa: Silva Alvenarias · Período: Este mês'])
conferir('filtro sem dado nenhum não quebra', Object.keys(filtrarFontes({}, FILTROS_BI_INICIAIS, hoje)).includes('desde'), true)

console.log(`${ok}/${tot} — biData`)
if (ok !== tot) process.exit(1)
