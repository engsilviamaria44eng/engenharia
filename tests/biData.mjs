// Motor do BI (Relatórios): painel executivo e o "painel bloqueado" quando falta módulo.
import {
  modulosDoBI, nomeDoModulo, seguro, pctSeguro, curvaS, evolucao, ppcGeral, prazoDaObra, custoMedido, painelExecutivo, pontosDaSerie,
} from '../src/lib/biData.js'
import { OBRAS, ATIVIDADES_PLANEJAMENTO, CONTRATOS, ITENS_CONTRATO, MEDICOES, PEDIDOS, PENDENCIAS } from '../src/lib/mockData.js'
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

console.log(`${ok}/${tot} — biData`)
if (ok !== tot) process.exit(1)
