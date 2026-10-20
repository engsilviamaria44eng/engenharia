// Regra multi-obra: em qual obra o app abre, e que nenhum dado de outra obra vaza.
// Node puro: node tests/obras.mjs
import { escolherObraInicial, daObra, podeTrocarDeObra, chaveObraGuardada, validarNomeDigitado, rotuloDoPapel } from '../src/lib/obras.js'
import { definirObraAtual, listarFrentes, listarObrasDoUsuario, listarPedidos, criarPedido, salvarPedido,
  listarAtividadesPlanejamento, criarAtividadePlanejamento, salvarAtividadesPlanejamento,
  lerConfigPlanejamento, salvarConfigPlanejamento,
  listarMedicoesDaObra, criarContrato, salvarContrato, criarMedicao, salvarMedicao,
  listarPendencias, criarPendencia, salvarPendencia,
  listarFvs, criarVistoria, salvarVistoria, criarNaoConformidade, salvarNaoConformidade,
  listarGemba, criarObservacaoGemba, salvarObservacaoGemba,
  listarDiarios, salvarDiario } from '../src/lib/dados.js'

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
conferir('mestre Ricardo vê só o Jardim Europa', (await listarObrasDoUsuario('u-welton')).data.map((o) => o.codigo), ['JE-01'])

// Qualidade: pendências não vazam entre obras, e o número é contado por obra
definirObraAtual('obra-je')
const pqJE = (await listarPendencias()).data
conferir('JE-01: só pendências do Jardim Europa', pqJE.length === 6 && pqJE.every((x) => x.obra_id === 'obra-je'), true)
definirObraAtual('obra-vn')
const pqVN = (await listarPendencias()).data
conferir('VN-02: só as 2 da Vila Nova', pqVN.map((x) => x.numero), [1, 2])
const pqNova = (await criarPendencia({ descricao: 'x', local: 'y', empresa: 'z', responsavel: 'w', prazo: '2026-10-30', status: 'pendente', observacoes: '' })).data
conferir('pendência nova nasce na obra aberta com o nº seguinte DELA', [pqNova.obra_id, pqNova.numero], ['obra-vn', 3])
conferir('salvar pendência de outra obra é recusado', (await salvarPendencia({ ...pqJE[0], status: 'resolvido' })).data, null)
conferir('o número não muda ao salvar', (await salvarPendencia({ ...pqNova, numero: 99 })).data.numero, 3)
definirObraAtual('obra-ca')
conferir('Alphaville: nenhuma pendência', (await listarPendencias()).data, [])
definirObraAtual(null)
conferir('sem obra: pendências devolvem erro', (await listarPendencias()).data, null)
// Qualidade · FVS: vistorias e NCs não vazam; modelos valem para todas; NC numerada por obra
definirObraAtual('obra-je')
const fJE = (await listarFvs()).data
conferir('JE-01: 2 vistorias e 3 NCs dela', [fJE.vistorias.length, fJE.ncs.length, [...fJE.vistorias, ...fJE.ncs].every((x) => x.obra_id === 'obra-je')], [2, 3, true])
definirObraAtual('obra-vn')
const fVN = (await listarFvs()).data
conferir('VN-02: 1 vistoria, 1 NC, os mesmos 2 modelos', [fVN.vistorias.length, fVN.ncs.length, fVN.modelos.length], [1, 1, 2])
const vNova = (await criarVistoria({ modelo_id: 'mf-02', ambiente: 'Sala', status: 'em_andamento', grupos: [], respostas: {} })).data
conferir('vistoria nova nasce na obra aberta', vNova.obra_id, 'obra-vn')
const ncNova = (await criarNaoConformidade({ vistoria_id: vNova.id, item_id: 'x', status: 'aberta', timeline: [] })).data
conferir('NC nova: código seguinte DA OBRA', [ncNova.obra_id, ncNova.codigo], ['obra-vn', 'NC-002'])
conferir('NC em vistoria de outra obra é recusada', (await criarNaoConformidade({ vistoria_id: fJE.vistorias[0].id, item_id: 'x' })).data, null)
conferir('salvar NC de outra obra é recusado', (await salvarNaoConformidade({ ...fJE.ncs[0], status: 'fechada' })).data, null)
await salvarNaoConformidade({ ...ncNova, status: 'fechada' })
conferir('NC fechada não muda mais', (await salvarNaoConformidade({ ...ncNova, status: 'aberta' })).erro, 'Esta não conformidade já está fechada.')
await salvarVistoria({ ...vNova, status: 'concluida' })
conferir('vistoria concluída não muda mais', (await salvarVistoria({ ...vNova, respostas: { a: 'nc' } })).erro, 'Esta vistoria já foi concluída e não pode mudar.')
definirObraAtual('obra-ca')
conferir('Alphaville: nenhuma vistoria nem NC', [(await listarFvs()).data.vistorias, (await listarFvs()).data.ncs], [[], []])
definirObraAtual(null)
conferir('sem obra: FVS devolve erro', (await listarFvs()).data, null)
// Qualidade · Gemba: observações não vazam entre obras
definirObraAtual('obra-je')
const gbJE = (await listarGemba()).data
conferir('JE-01: 8 observações dela', [gbJE.length, gbJE.every((x) => x.obra_id === 'obra-je')], [8, true])
definirObraAtual('obra-vn')
conferir('VN-02: 2 observações', (await listarGemba()).data.map((x) => x.id), ['gb-09', 'gb-10'])
const gbNova = (await criarObservacaoGemba({ local: 'x', descricao: 'y', desperdicios: ['Espera'], status: 'pendente' })).data
conferir('observação nova nasce na obra aberta', gbNova.obra_id, 'obra-vn')
conferir('mover observação de outra obra é recusado', (await salvarObservacaoGemba({ ...gbJE[0], status: 'resolvido' })).data, null)
definirObraAtual('obra-ca')
conferir('Alphaville: nenhuma observação', (await listarGemba()).data, [])
definirObraAtual(null)
conferir('sem obra: Gemba devolve erro', (await listarGemba()).data, null)
// Diário de obra: dias não vazam entre obras; um diário por obra e por dia
definirObraAtual('obra-je')
const drJE = (await listarDiarios()).data
conferir('JE-01: 14 dias dela', [drJE.length, drJE.every((x) => x.obra_id === 'obra-je')], [14, true])
definirObraAtual('obra-vn')
conferir('VN-02: 2 dias', (await listarDiarios()).data.map((x) => x.data), ['2026-10-16', '2026-10-17'])
const drNovo = (await salvarDiario({ data: '2026-10-19', clima: {}, servicos: [], fotos: [], equipamentos: [], ocorrencias: 'teste', lancado_por: 'M', lancado_em: '2026-10-19' })).data
conferir('diário novo nasce na obra aberta', drNovo.obra_id, 'obra-vn')
const drMesmoDia = (await salvarDiario({ data: '2026-10-19', clima: {}, servicos: [], fotos: [], equipamentos: [], ocorrencias: 'mudou', lancado_por: 'Outro', lancado_em: '2026-10-20' })).data
conferir('salvar o mesmo dia atualiza o mesmo diário (e guarda quem lançou primeiro)', [drMesmoDia.id, drMesmoDia.ocorrencias, drMesmoDia.lancado_por, (await listarDiarios()).data.length], [drNovo.id, 'mudou', 'M', 3])
conferir('editar diário de outra obra é recusado', (await salvarDiario({ ...drJE[0], ocorrencias: 'x' })).data, null)
definirObraAtual('obra-ca')
conferir('Alphaville: nenhum diário', (await listarDiarios()).data, [])
definirObraAtual(null)
conferir('sem obra: diário devolve erro', (await listarDiarios()).data, null)
// ---------- nome digitado pelo proprietário no login ----------
conferir('nome do proprietário: limpa espaços', validarNomeDigitado('  Paula   Mendes '), { nome: 'Paula Mendes' })
conferir('nome do proprietário: vazio', validarNomeDigitado('   '), { erro: 'Digite o seu nome.' })
conferir('nome do proprietário: curto demais', validarNomeDigitado('Al'), { erro: 'O nome precisa ter pelo menos 3 letras.' })
conferir('nome do proprietário: comprido demais', validarNomeDigitado('a'.repeat(61)).erro, 'O nome pode ter até 60 letras.')

conferir('papel na tela: Cliente aparece como Proprietário', ['Cliente', 'Mestre', 'Engenheiro'].map(rotuloDoPapel), ['Proprietário', 'Mestre', 'Engenheiro'])

console.log(`${ok}/${tot} — obras`)
process.exit(ok === tot ? 0 : 1)
