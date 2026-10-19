// Regras do módulo Materiais (Kanban de pedidos).
import {
  proximoStatus, statusAnterior, estaAtrasado, temAlertaRecebimento, diasNaColuna, leadTime,
  contadores, validarNovoPedido, novoPedido, validarMudanca, aplicarMudanca, rotuloQuantidade, podeVoltar, frentesQueRecebemMaterial,
} from '../src/lib/materiais.js'
import { diasEntre, hojeISO } from '../src/lib/datas.js'

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

conferir('ordem das colunas', proximoStatus('cotacao'), 'comprado')
conferir('entregue é a última coluna', proximoStatus('entregue'), null)
conferir('solicitar não tem anterior', statusAnterior('solicitar'), null)

const comprado = { status: 'comprado', previsao_entrega: '2026-10-15' }
conferir('previsão vencida em comprado = atrasado', estaAtrasado(comprado, hoje), true)
conferir('previsão de hoje ainda não é atraso', estaAtrasado({ ...comprado, previsao_entrega: hoje }, hoje), false)
conferir('no almoxarifado não está mais atrasado', estaAtrasado({ ...comprado, status: 'almoxarifado' }, hoje), false)

conferir('"não" no checklist marca alerta', temAlertaRecebimento({ recebimento: { qtd_bate_nf: true, estado_ok: false } }), true)
conferir('checklist sem resposta não marca alerta', temAlertaRecebimento({ recebimento: { qtd_bate_nf: null, estado_ok: null } }), false)

const p = {
  status: 'almoxarifado',
  historico: [
    { status: 'solicitar', data: '2026-09-30' }, { status: 'cotacao', data: '2026-10-02' },
    { status: 'comprado', data: '2026-10-06' }, { status: 'almoxarifado', data: '2026-10-11' },
  ],
}
conferir('dias na coluna contam desde a entrada no status atual', diasNaColuna(p, hoje), 8)
conferir('lead time = solicitar até almoxarifado', leadTime(p), 11)
conferir('sem chegada ao almoxarifado não há lead time', leadTime({ historico: [{ status: 'solicitar', data: hoje }] }), null)

const lista = [
  { status: 'cotacao' }, { status: 'cotacao' },
  { status: 'comprado', previsao_entrega: '2026-10-22' },
  { status: 'comprado', previsao_entrega: '2026-11-30' },
  { status: 'comprado', previsao_entrega: '2026-10-15' },
]
conferir('contadores: cotação, chegando em 7 dias, atrasados', contadores(lista, hoje), { emCotacao: 2, chegandoSemana: 1, atrasados: 1 })

conferir('novo pedido vazio aponta os 4 campos', Object.keys(validarNovoPedido({})).sort(), ['frente', 'material_id', 'prioridade', 'quantidade'])
conferir('quantidade negativa é recusada', !!validarNovoPedido({ material_id: 'm1', quantidade: '-3', frente: 'Laje', prioridade: 'normal' }).quantidade, true)
conferir('novo pedido completo passa', validarNovoPedido({ material_id: 'm1', quantidade: '50', frente: 'Laje', prioridade: 'critico' }), {})
const n = novoPedido({ material_id: 'm1', quantidade: '50', frente: ' Laje ', prioridade: 'normal' }, hoje, 'x')
conferir('novo pedido entra em Solicitar com histórico', [n.status, n.historico, n.quantidade, n.frente], ['solicitar', [{ status: 'solicitar', data: hoje }], 50, 'Laje'])

conferir('comprado exige fornecedor e previsão', Object.keys(validarMudanca('comprado', {})).sort(), ['fornecedor', 'previsao_entrega'])
conferir('almoxarifado exige as duas respostas do checklist', Object.keys(validarMudanca('almoxarifado', { qtd_bate_nf: true })), ['estado_ok'])
conferir('responder "não" também vale', validarMudanca('almoxarifado', { qtd_bate_nf: false, estado_ok: false }), {})
conferir('entregue exige a frente', Object.keys(validarMudanca('entregue', { frente: '' })), ['frente'])

const m = aplicarMudanca(n, 'comprado', { fornecedor: 'Casa do Construtor', previsao_entrega: '2026-10-25' }, '2026-10-20')
conferir('mudança grava status e data no histórico', m.historico.at(-1), { status: 'comprado', data: '2026-10-20' })
conferir('mudança não altera o pedido original', n.historico.length, 1)

conferir('pedido entregue não volta', podeVoltar('entregue'), false)
conferir('pedido em Solicitar não tem para onde voltar', podeVoltar('solicitar'), false)
conferir('pedido no almoxarifado pode voltar', podeVoltar('almoxarifado'), true)
conferir('frente concluída não recebe material', frentesQueRecebemMaterial([
  { servico: 'Fundação', status: 'Concluída' }, { servico: 'Reboco interno', status: 'Em andamento' }, { servico: 'Gesso forro', status: 'Não iniciada' },
]), ['Reboco interno', 'Gesso forro'])

conferir('plural da unidade', rotuloQuantidade(50, 'saco'), '50 sacos')
conferir('singular quando é 1', rotuloQuantidade(1, 'saco'), '1 saco')
conferir('símbolo não vai para o plural, milhar com ponto', rotuloQuantidade(3000, 'un'), '3.000 un')

conferir('dias entre datas atravessa o mês', diasEntre('2026-09-30', '2026-10-11'), 11)
conferir('hoje sem pular dia de fuso', hojeISO(new Date(2026, 9, 19, 23, 50)), '2026-10-19')

console.log(`${ok}/${tot} — materiais`)
process.exit(ok === tot ? 0 : 1)
