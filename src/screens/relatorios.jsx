// RELATÓRIOS (o BI da obra, engenheiro): painéis feitos à mão, com CSS e SVG, sem biblioteca
// de gráfico. Cada painel só liga se o módulo dele tiver dado (motor em lib/biData.js);
// senão mostra "Painel bloqueado". Tudo recalcula ao trocar de obra.
import { useEffect, useState } from 'react'
import { useObra } from '../lib/ObraContext.jsx'
import { carregarFontesDoBI } from '../lib/dados.js'
import { modulosDoBI, nomeDoModulo, painelExecutivo, pontosDaSerie } from '../lib/biData.js'
import { formatarReais } from '../lib/medicoes.js'
import { formatarData, hojeISO } from '../lib/datas.js'
import { Icon } from '../components/index.jsx'

// ---------- peças de gráfico ----------
function Painel({ titulo, subtitulo, modulo, liberado, erro, children }) {
  return (
    <section className="painel-bi">
      <div className="painel-bi-cab">
        <h2 className="secao">{titulo}</h2>
        {subtitulo && <span className="nota">{subtitulo}</span>}
      </div>
      {erro ? (
        <div className="bi-bloqueado" role="alert">
          <span className="icone"><Icon nome="relatorios" tamanho={28} /></span>
          <b>Este painel não carregou</b>
          <span>{erro}</span>
        </div>
      ) : liberado ? children : (
        <div className="bi-bloqueado">
          <span className="icone"><Icon nome="relatorios" tamanho={28} /></span>
          <b>Painel bloqueado</b>
          <span>Construa o módulo {nomeDoModulo(modulo)} (ou lance os primeiros dados nele) para liberar este painel.</span>
        </div>
      )}
    </section>
  )
}

// Donut com conic-gradient e furo no meio.
function Donut({ pct, rotulo, legenda }) {
  const p = Math.max(0, Math.min(100, pct ?? 0))
  return (
    <div className="donut-bloco">
      <div className="donut" style={{ background: `conic-gradient(var(--bi-teal) 0 ${p}%, #D5DEE5 ${p}% 100%)` }} role="img" aria-label={`${rotulo}: ${p}%`}>
        <div className="donut-furo"><b>{pct === null ? '—' : `${p}%`}</b><span>{rotulo}</span></div>
      </div>
      {legenda && <ul className="legenda-bi">{legenda.map((l) => <li key={l.rotulo}><i style={{ background: l.cor }} />{l.rotulo}</li>)}</ul>}
    </div>
  )
}

// Curva S em SVG: cinza = planejado acumulado; teal com área = real acumulado; traço = hoje.
function CurvaS({ curva }) {
  const L = 640
  const A = 220
  const M = { e: 36, d: 12, t: 12, b: 28 }
  const plan = pontosDaSerie(curva.semanas.map((s) => s.plan), L, A)
  const real = pontosDaSerie(curva.semanas.map((s) => s.real), L, A)
  const linha = (pts) => pts.filter(Boolean).map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const reais = real.filter(Boolean)
  const area = reais.length ? `M${reais[0].x.toFixed(1)},${A} L${linha(reais).replace(/ /g, ' L')} L${reais.at(-1).x.toFixed(1)},${A} Z` : ''
  const passo = Math.max(1, Math.ceil(curva.semanas.length / 8))
  const hojeX = curva.indiceHoje >= 0 ? plan[curva.indiceHoje].x : null
  const atual = curva.semanas[curva.indiceHoje]
  return (
    <div className="grafico-rolavel">
      <svg className="curva-s" viewBox={`0 0 ${L + M.e + M.d} ${A + M.t + M.b}`} role="img"
        aria-label={`Curva S: hoje ${atual?.real ?? '—'}% realizado contra ${atual?.plan ?? '—'}% planejado`}>
        <g transform={`translate(${M.e},${M.t})`}>
          {[0, 25, 50, 75, 100].map((v) => (
            <g key={v}>
              <line x1="0" x2={L} y1={A - (v / 100) * A} y2={A - (v / 100) * A} className="grade" />
              <text x="-8" y={A - (v / 100) * A + 4} className="eixo" textAnchor="end">{v}%</text>
            </g>
          ))}
          {curva.semanas.map((s, i) => (i % passo === 0 ? <text key={s.inicio} x={plan[i].x} y={A + 18} className="eixo" textAnchor="middle">{s.rotulo}</text> : null))}
          {area && <path d={area} className="area-real" />}
          <polyline points={linha(plan)} className="linha-plan" />
          <polyline points={linha(reais)} className="linha-real" />
          {hojeX !== null && (
            <g>
              <line x1={hojeX} x2={hojeX} y1="0" y2={A} className="linha-hoje" />
              <text x={hojeX + 4} y="12" className="eixo hoje-txt">hoje</text>
            </g>
          )}
        </g>
      </svg>
      <ul className="legenda-bi">
        <li><i className="lg-plan" />Planejado acumulado</li>
        <li><i style={{ background: 'var(--bi-teal)' }} />Realizado acumulado</li>
      </ul>
    </div>
  )
}

// ---------- painéis ----------
function PainelExecutivo({ fontes, hoje, mod, erros }) {
  const ex = painelExecutivo(fontes, hoje)
  const ev = ex.evolucao
  return (
    <Painel titulo="Executivo" subtitulo="Como está a saúde da obra hoje" modulo="planejamento" liberado={mod.planejamento || mod.medicoes} erro={erros.planejamento}>
      <div className="kpis-bi">
        <div className={`kpi-bi ${ev ? (ev.adiantada ? 'bom' : 'ruim') : ''}`}>
          <span className="rot">Evolução</span>
          {ev ? (
            <>
              <span className="val">{ev.real}% <small>| plan {ev.plan}%</small></span>
              <span className="det">{ev.adiantada ? '▲' : '▼'} {Math.abs(ev.diferenca)} {Math.abs(ev.diferenca) === 1 ? 'ponto' : 'pontos'} {ev.adiantada ? 'à frente' : 'atrás'} do plano</span>
            </>
          ) : <span className="val">—</span>}
        </div>
        <div className={`kpi-bi ${ex.prazo ? (ex.prazo.dias < 0 ? 'ruim' : '') : ''}`}>
          <span className="rot">Prazo</span>
          {ex.prazo ? (
            <>
              <span className="val">{Math.abs(ex.prazo.dias)} <small>{ex.prazo.dias < 0 ? 'dias de atraso' : 'dias'}</small></span>
              <span className="det">entrega em {formatarData(ex.prazo.data)}</span>
            </>
          ) : <span className="val">—</span>}
        </div>
        <div className="kpi-bi">
          <span className="rot">Custo medido</span>
          {ex.custo ? (
            <>
              <span className="val val-dinheiro">{formatarReais(ex.custo.valor)}</span>
              <span className="det">{ex.custo.boletins} {ex.custo.boletins === 1 ? 'boletim fechado' : 'boletins fechados'}</span>
            </>
          ) : <><span className="val">—</span><span className="det">sem medição fechada</span></>}
        </div>
      </div>
      <div className="exec-graficos">
        <div className="bloco-bi">
          <h3 className="titulo-grafico">Curva S — planejado × realizado</h3>
          {ex.curva ? <CurvaS curva={ex.curva} /> : <p className="nota">Sem atividades no Planejamento.</p>}
          <p className="nota nota-bi">O realizado das semanas passadas é estimado: o app ainda não guarda o % de cada semana.</p>
        </div>
        <div className="bloco-bi">
          <h3 className="titulo-grafico">PPC geral</h3>
          <Donut pct={ex.ppc ? ex.ppc.pct : null} rotulo="concluídas"
            legenda={[{ rotulo: 'Concluídas no prazo devido', cor: 'var(--bi-teal)' }, { rotulo: 'Não concluídas', cor: '#D5DEE5' }]} />
          <p className="nota nota-bi">{ex.ppc ? `${ex.ppc.concluidas} de ${ex.ppc.total} atividades que já deviam ter terminado.` : 'Nenhuma atividade devia ter terminado ainda.'}</p>
        </div>
      </div>
    </Painel>
  )
}

function PainelEmBreve({ titulo, texto }) {
  return (
    <section className="painel-bi">
      <div className="painel-bi-cab"><h2 className="secao">{titulo}</h2></div>
      <div className="bi-bloqueado"><b>Chega na próxima etapa</b><span>{texto}</span></div>
    </section>
  )
}

export default function Relatorios() {
  const { obra } = useObra()
  const [estado, setEstado] = useState({ carregando: true, erro: null })
  const [dados, setDados] = useState(null)
  const hoje = hojeISO()

  async function carregar() {
    setEstado({ carregando: true, erro: null })
    const { data, erro } = await carregarFontesDoBI()
    if (erro) { setEstado({ carregando: false, erro }); return }
    setDados(data)
    setEstado({ carregando: false, erro: null })
  }

  useEffect(() => { carregar() }, [obra?.id])

  const cabecalho = (
    <div className="page-header no-print">
      <h1 className="titulo-tela">Relatórios</h1>
      <p className="subtitulo">O BI da obra: os números de todos os módulos num lugar só.</p>
    </div>
  )

  if (estado.carregando) return <>{cabecalho}<p className="nota">Montando os painéis…</p></>
  if (estado.erro) {
    return (
      <>
        {cabecalho}
        <div className="vazio" role="alert">
          <h3>Os relatórios não carregaram</h3>
          <p>{estado.erro} Confira a internet e tente de novo.</p>
          <button className="btn btn-pri" onClick={carregar}>Tentar de novo</button>
        </div>
      </>
    )
  }

  const fontes = { ...dados.fontes, obra }
  const mod = modulosDoBI(fontes)
  const algum = Object.values(mod).some(Boolean)

  return (
    <>
      {cabecalho}
      {!algum ? (
        <div className="vazio">
          <span className="icone"><Icon nome="relatorios" tamanho={36} /></span>
          <h3>Ainda não há dados nesta obra</h3>
          <p>Os painéis se montam sozinhos com o que for lançado no Planejamento, nas Medições, nos Materiais e na Qualidade. Comece por um deles.</p>
        </div>
      ) : (
        <div className="grade-bi">
          <PainelExecutivo fontes={fontes} hoje={hoje} mod={mod} erros={dados.erros} />
          <PainelEmBreve titulo="Ritmo & Produção" texto="PPC semanal, Pareto das causas e clima × efetivo." />
          <PainelEmBreve titulo="Contratos & Medições" texto="Fluxo dos contratos, matriz de empreiteiros e saldo a medir." />
          <PainelEmBreve titulo="Materiais" texto="Pedidos por etapa, atrasados e lead time." />
          <PainelEmBreve titulo="Qualidade & Entrega" texto="% conforme por FVS, pendências por empresa e por local, desperdícios." />
        </div>
      )}
    </>
  )
}
