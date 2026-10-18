// Regras do Painel: cor, ordem e "a entrega está de pé?".
import { corDaFrente, etiquetaDaFrente, ordenarParaPainel, resumoEntrega } from '../src/lib/painel.js'
import { formatarData, somarDias } from '../src/lib/datas.js'

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

conferir('parada é vermelha', corDaFrente({ parada: true, folga: null }), 'verm')
conferir('folga negativa é vermelha', corDaFrente({ parada: false, folga: -1 }), 'verm')
conferir('folga 0 é atenção', corDaFrente({ parada: false, folga: 0 }), 'ocre')
conferir('folga 7 ainda é atenção', corDaFrente({ parada: false, folga: 7 }), 'ocre')
conferir('folga 8 é ok', corDaFrente({ parada: false, folga: 8 }), 'verde')
conferir('etiqueta de atraso', etiquetaDaFrente({ parada: false, folga: -3 }), '−3 DIAS')
conferir('etiqueta de 1 dia no singular', etiquetaDaFrente({ parada: false, folga: 1 }), '1 DIA')

const frentes = [
  { id: 'ok', parada: false, folga: 22, status: 'Em andamento' },
  { id: 'atr', parada: false, folga: -3, status: 'Em andamento' },
  { id: 'par', parada: true, folga: null, status: 'Em andamento' },
  { id: 'fim', parada: false, folga: null, status: 'Concluída' },
  { id: 'aten', parada: false, folga: 5, status: 'Em andamento' },
]
conferir('ordem: parada, depois menor folga; concluída fora', ordenarParaPainel(frentes).map((f) => f.id), ['par', 'atr', 'aten', 'ok'])

const r = resumoEntrega('2027-03-15', frentes)
conferir('risco quando há atrasada ou parada', r.risco, true)
conferir('previsão = contrato + maior atraso', r.previsao, '2027-03-18')
conferir('conta atrasadas e paradas', [r.atrasadas, r.paradas], [1, 1])
conferir('tudo no prazo: entrega de pé', resumoEntrega('2026-12-20', [{ parada: false, folga: 2, status: 'Em andamento' }]).risco, false)

conferir('data sem pulo de fuso', formatarData('2027-03-15'), '15/03/2027')
conferir('somar dias vira o mês', somarDias('2026-10-30', 3), '2026-11-02')

console.log(`${ok}/${tot} — painel`)
process.exit(ok === tot ? 0 : 1)
