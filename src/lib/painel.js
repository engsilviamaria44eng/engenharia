// Regras puras do Painel de frentes (PRD-FRONTEND, "As contas do painel").
// Nesta fase os números de cada frente (avanço, dias sem andar, folga) vêm
// prontos dos dados de exemplo; a cor, a ordem e o resumo da entrega moram aqui.
import { somarDias } from './datas.js'

export const DIAS_ATENCAO = 7 // folga de 0 a 7 dias = atenção (amarelo)

export function corDaFrente(frente) {
  if (frente.parada) return 'verm'
  if (frente.folga === null || frente.folga === undefined) return 'verde'
  if (frente.folga < 0) return 'verm'
  if (frente.folga <= DIAS_ATENCAO) return 'ocre'
  return 'verde'
}

export function etiquetaDaFrente(frente) {
  if (frente.parada) return 'PARADA'
  if (frente.folga === null || frente.folga === undefined) return '—'
  const n = frente.folga
  return `${n < 0 ? '−' + Math.abs(n) : n} ${Math.abs(n) === 1 ? 'DIA' : 'DIAS'}`
}

// Paradas primeiro; depois a menor folga. Concluídas não entram no painel.
export function ordenarParaPainel(frentes) {
  return frentes
    .filter((f) => f.status !== 'Concluída')
    .slice()
    .sort((a, b) => {
      if (a.parada !== b.parada) return a.parada ? -1 : 1
      return (a.folga ?? Infinity) - (b.folga ?? Infinity)
    })
}

// Resposta da segunda-feira: a entrega está de pé?
// Previsão = data do contrato + o maior atraso entre as frentes (se houver).
export function resumoEntrega(dataEntrega, frentes) {
  const abertas = frentes.filter((f) => f.status !== 'Concluída')
  const atrasadas = abertas.filter((f) => !f.parada && f.folga !== null && f.folga < 0)
  const paradas = abertas.filter((f) => f.parada)
  const folgas = abertas.filter((f) => !f.parada && f.folga !== null).map((f) => f.folga)
  const menorFolga = folgas.length ? Math.min(...folgas) : null
  const atraso = atrasadas.length ? Math.max(...atrasadas.map((f) => -f.folga)) : 0
  return {
    risco: atrasadas.length > 0 || paradas.length > 0,
    atrasadas: atrasadas.length,
    paradas: paradas.length,
    menorFolga,
    atrasoDias: atraso,
    previsao: dataEntrega ? somarDias(dataEntrega, atraso) : null,
  }
}
