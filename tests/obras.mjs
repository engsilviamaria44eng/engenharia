// Regra multi-obra: em qual obra o app abre, e que nenhum dado de outra obra vaza.
// Node puro: node tests/obras.mjs
import { escolherObraInicial, daObra, podeTrocarDeObra, chaveObraGuardada } from '../src/lib/obras.js'
import { definirObraAtual, listarFrentes, listarObrasDoUsuario, listarPedidos, criarPedido, salvarPedido,
  listarAtividadesPlanejamento, criarAtividadePlanejamento, salvarAtividadesPlanejamento,
  lerConfigPlanejamento, salvarConfigPlanejamento,
  listarMedicoesDaObra, criarContrato, salvarContrato, criarMedicao, salvarMedicao } from '../src/lib/dados.js'

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

const obras = [
  { id: 'a', situacao: 'Parada' },
  { id: 'b', situacao: 'Em andamento' },
  { id: 'c', situacao: 'Em andamento' },
]

// Em qual obra o app abre
conferir('volta na obra guardada', escolherObraInicial(obras, 'c'), 'c')
conferir('obra guardada que sumiu: cai na primeira em andamento', escolherObraInicial(obras, 'x'), 'b')
conferir('nada guardado: primeira em andamento, não a parada', escolherObraInicial(obras, null), 'b')
conferir('só obras paradas: abre a primeira mesmo assim', escolherObraInicial([{ id: 'p', situacao: 'Parada' }], null), 'p')
conferir('sem obra nenhuma: null', escolherObraInicial([], 'a'), null)

// Recorte por obra
const lanc = [{ id: 1, obra_id: 'a' }, { id: 2, obra_id: 'b' }, { id: 3, obra_id: 'a' }]
conferir('recorta só a obra pedida', daObra(lanc, 'a').map((x) => x.id), [1, 3])
conferir('sem obra escolhida não devolve tudo: devolve nada', daObra(lanc, null), [])

conferir('quem tem uma obra só não troca', podeTrocarDeObra([{ id: 'a' }]), false)
conferir('quem tem duas troca', podeTrocarDeObra(obras), true)
conferir('a chave guardada é por pessoa', chaveObraGuardada('u1') !== chaveObraGuardada('u2'), true)

// A camada de dados injeta o obra_id: nenhuma frente de outra obra aparece
definirObraAtual('obra-vn')
const vn = await listarFrentes()
conferir('Vila Nova: só frentes da Vila Nova', vn.data.every((f) => f.obra_id === 'obra-vn') && vn.data.length > 0, true)
definirObraAtual('obra-je')
const je = await listarFrentes()
conferir('Jardim Europa: só frentes do Jardim Europa', je.data.every((f) => f.obra_id === 'obra-je') && je.data.length > 0, true)
definirObraAtual('obra-ca')
conferir('Alphaville (parada, sem frentes): lista vazia', (await listarFrentes()).data, [])
definirObraAtual(null)
conferir('sem obra escolhida: erro, nunca a lista de todas', (await listarFrentes()).data, null)

// Materiais: pedidos também não vazam entre obras, e nada é salvo na obra errada
definirObraAtual('obra-je')
const pje = (await listarPedidos()).data
conferir('JE-01: só pedidos do Jardim Europa', pje.length > 0 && pje.every((p) => p.obra_id === 'obra-je'), true)
definirObraAtual('obra-vn')
const pvn = (await listarPedidos()).data
conferir('VN-02: só pedidos da Vila Nova', pvn.length > 0 && pvn.every((p) => p.obra_id === 'obra-vn'), true)
const criado = (await criarPedido({ material_id: 'm-areia', quantidade: 2, status: 'solicitar', historico: [] })).data
conferir('pedido novo nasce na obra aberta', criado.obra_id, 'obra-vn')
conferir('salvar um pedido de outra obra é recusado', (await salvarPedido({ ...pje[0], status: 'entregue' })).data, null)
definirObraAtual('obra-ca')
conferir('Alphaville: nenhum pedido', (await listarPedidos()).data, [])
definirObraAtual(null)
conferir('sem obra: pedidos devolvem erro, nunca todos', (await listarPedidos()).data, null)

// Planejamento: atividades também não vazam entre obras, e nada é salvo na obra errada
definirObraAtual('obra-je')
const aje = (await listarAtividadesPlanejamento()).data
conferir('JE-01: só atividades do Jardim Europa', aje.length > 0 && aje.every((a) => a.obra_id === 'obra-je'), true)
definirObraAtual('obra-vn')
const avn = (await listarAtividadesPlanejamento()).data
conferir('VN-02: só atividades da Vila Nova', avn.length > 0 && avn.every((a) => a.obra_id === 'obra-vn'), true)
const atvNova = (await criarAtividadePlanejamento({ pai_id: null, ordem: 9, titulo: 'Teste', inicio: '2026-10-19', fim: '2026-10-20' })).data
conferir('atividade nova nasce na obra aberta', atvNova.obra_id, 'obra-vn')
conferir('salvar atividade de outra obra é recusado', (await salvarAtividadesPlanejamento([{ ...aje[0], titulo: 'x' }])).data, null)
definirObraAtual('obra-ca')
conferir('Alphaville: nenhuma atividade', (await listarAtividadesPlanejamento()).data, [])
definirObraAtual(null)
conferir('sem obra: atividades devolvem erro, nunca todas', (await listarAtividadesPlanejamento()).data, null)
// dias úteis: cada obra tem a sua configuração
definirObraAtual('obra-je')
await salvarConfigPlanejamento({ dias_uteis: [1, 2, 3, 4, 5, 6], feriados: [] })
definirObraAtual('obra-vn')
conferir('sábado na JE-01 não muda a VN-02', (await lerConfigPlanejamento()).data.dias_uteis, [1, 2, 3, 4, 5])
definirObraAtual('obra-je')
conferir('JE-01 guarda o próprio sábado', (await lerConfigPlanejamento()).data.dias_uteis, [1, 2, 3, 4, 5, 6])
definirObraAtual(null)
conferir('sem obra: configuração devolve erro', (await lerConfigPlanejamento()).data, null)

// Medições: contratos, itens e boletins não vazam entre obras
definirObraAtual('obra-je')
const mje = (await listarMedicoesDaObra()).data
const todosJE = [...mje.contratos, ...mje.itens, ...mje.medicoes]
conferir('JE-01: só contratos, itens e boletins do Jardim Europa', todosJE.length > 0 && todosJE.every((x) => x.obra_id === 'obra-je'), true)
definirObraAtual('obra-vn')
const mvn = (await listarMedicoesDaObra()).data
conferir('VN-02: só os 2 contratos da Vila Nova', mvn.contratos.map((x) => x.id), ['ct-06', 'ct-07'])
const ctNovo = (await criarContrato({ empreiteiro: 'Teste', descricao: 'x', status: 'elaboracao', tipo: null, valor_global: null })).data
conferir('contrato novo nasce na obra aberta', ctNovo.obra_id, 'obra-vn')
conferir('salvar contrato de outra obra é recusado', (await salvarContrato({ ...mje.contratos[0], status: 'concluido' })).data, null)
const comItens = (await salvarContrato({ ...ctNovo, tipo: 'escopo' }, [{ ordem: 1, descricao: 'Muro', unidade: 'm', quantidade: 10, preco_unitario: 5 }])).data
conferir('itens do valor nascem na obra e no contrato certos', [comItens.itens[0].obra_id, comItens.itens[0].contrato_id], ['obra-vn', ctNovo.id])
const bolInativo = await criarMedicao({ contrato_id: ctNovo.id, numero: 1, periodo_inicio: '2026-10-19', periodo_fim: '2026-10-19', status: 'rascunho', percentual: null, linhas: [] })
conferir('contrato que não está ativo não recebe medição', bolInativo.erro, 'Só contrato "Aprovado / Ativo" recebe medição.')
await salvarContrato({ ...ctNovo, tipo: 'escopo', status: 'ativo' })
const bolVN = (await criarMedicao({ contrato_id: ctNovo.id, numero: 1, periodo_inicio: '2026-10-19', periodo_fim: '2026-10-19', status: 'rascunho', percentual: null, linhas: [] })).data
conferir('boletim novo nasce na obra aberta', bolVN.obra_id, 'obra-vn')
conferir('boletim em contrato de outra obra é recusado', (await criarMedicao({ contrato_id: 'ct-01', numero: 9, linhas: [] })).data, null)
conferir('editar boletim de outra obra é recusado', (await salvarMedicao({ ...mje.medicoes.find((m) => m.status === 'rascunho'), percentual: 99 })).data, null)
conferir('com boletim lançado, o valor do contrato não troca', (await salvarContrato({ ...ctNovo, status: 'ativo' }, [])).erro, 'Este contrato já tem medição: o valor não pode mais ser trocado.')
await salvarMedicao({ ...bolVN, status: 'fechada' })
conferir('boletim fechado não muda mais', (await salvarMedicao({ ...bolVN, status: 'rascunho' })).erro, 'Este boletim já está fechado e não pode mudar.')
definirObraAtual('obra-ca')
conferir('Alphaville: nenhum contrato', (await listarMedicoesDaObra()).data.contratos, [])
definirObraAtual(null)
conferir('sem obra: contratos devolvem erro', (await listarMedicoesDaObra()).data, null)

// Cada pessoa só vê as obras em que trabalha
conferir('engenheiro vê as 3 obras', (await listarObrasDoUsuario('u-eng')).data.length, 3)
conferir('mestre Ricardo vê só o Jardim Europa', (await listarObrasDoUsuario('u-ricardo')).data.map((o) => o.codigo), ['JE-01'])

console.log(`${ok}/${tot} — obras`)
process.exit(ok === tot ? 0 : 1)
