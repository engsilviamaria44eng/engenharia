// Regra multi-obra: em qual obra o app abre, e que nenhum dado de outra obra vaza.
// Node puro: node tests/obras.mjs
import { escolherObraInicial, daObra, podeTrocarDeObra, chaveObraGuardada } from '../src/lib/obras.js'
import { definirObraAtual, listarFrentes, listarObrasDoUsuario } from '../src/lib/dados.js'

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

// Cada pessoa só vê as obras em que trabalha
conferir('engenheiro vê as 3 obras', (await listarObrasDoUsuario('u-eng')).data.length, 3)
conferir('mestre Ricardo vê só o Jardim Europa', (await listarObrasDoUsuario('u-ricardo')).data.map((o) => o.codigo), ['JE-01'])

console.log(`${ok}/${tot} — obras`)
process.exit(ok === tot ? 0 : 1)
