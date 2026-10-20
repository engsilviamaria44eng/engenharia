// RELATÓRIOS (o BI da obra, engenheiro): painéis feitos à mão, com CSS e SVG, sem biblioteca
// de gráfico. Cada painel só liga se o módulo dele tiver dado (motor em lib/biData.js);
// senão mostra "Painel bloqueado". Tudo recalcula ao trocar de obra.
import { useEffect, useState } from 'react'
import { useObra } from '../lib/ObraContext.jsx'
import { carregarFontesDoBI } from '../lib/dados.js'
import {
  modulosDoBI, nomeDoModulo, painelExecutivo, painelRitmo, painelContratos, painelMateriais, painelQualidade, pontosDaSerie,
  filtrarFontes, empresasDoBI, descreverFiltrosBI, PERIODOS_BI, FILTROS_BI_INICIAIS,
} from '../lib/biData.js'
import { dataHoraPorExtenso } from '../lib/diario.js'
import { formatarReais } from '../lib/medicoes.js'
import { formatarData, hojeISO } from '../lib/datas.js'
import { Icon } from '../components/index.jsx'

// ---------- peças de gráfico ----------
function Painel({ titulo, subtitulo, modulo, liberado, erro, aviso, children }) {
  return (
    <section className="painel-bi">
      <div className="painel-bi-cab">
        <h2 className="secao">{titulo}</h2>
        {subtitulo && <span className="nota">{subtitulo}</span>}
      </div>
      {aviso && liberado && !erro && <p className="aviso-filtro no-print">{aviso}</p>}
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

// PPC semanal: uma coluna por semana, verde = metas batidas, vermelho = não batidas.
function PpcSemanal({ ppc }) {
  return (
    <div className="grafico-rolavel">
      <div className="ppc-barras" role="img" aria-label={`PPC semanal, média de ${ppc.media}%`}>
        {ppc.semanas.map((s) => (
          <div key={s.inicio} className="ppc-col">
            <span className="ppc-pct">{s.ppc === null ? '—' : `${s.ppc}%`}</span>
            <div className="ppc-trilho">
              <div className="ppc-pilha" style={{ height: `${(s.total / ppc.maiorTotal) * 100}%` }}>
                {s.naoBatidas > 0 && <i className="ppc-nao" style={{ flexGrow: s.naoBatidas }} title={`${s.naoBatidas} não batida(s)`} />}
                {s.batidas > 0 && <i className="ppc-sim" style={{ flexGrow: s.batidas }} title={`${s.batidas} batida(s)`} />}
              </div>
            </div>
            <span className="ppc-sem">{s.rotulo}</span>
          </div>
        ))}
      </div>
      <ul className="legenda-bi">
        <li><i style={{ background: 'var(--verde)' }} />Metas batidas</li>
        <li><i style={{ background: 'var(--vermelho)' }} />Não batidas</li>
      </ul>
    </div>
  )
}

// Pareto: barras deitadas, da causa mais frequente para a menos.
function Pareto({ pareto }) {
  return (
    <ol className="pareto">
      {pareto.causas.map((c) => (
        <li key={c.causa}>
          <span className="pareto-rot">{c.rotulo}</span>
          <span className="pareto-trilho"><i style={{ width: `${(c.vezes / pareto.maior) * 100}%` }} /></span>
          <span className="pareto-num"><b>{c.vezes}</b> · {c.pct}%</span>
        </li>
      ))}
    </ol>
  )
}

const ICONE_CLIMA = { sol: '☀', nublado: '☁', chuva: '☂', chuva_forte: '⛈' }

// Clima × efetivo: colunas = efetivo do dia; ícone em cima = o pior tempo; dia de chuva com fundo azul.
function ClimaEfetivo({ ce }) {
  const C = 40
  const A = 150
  const M = { t: 40, b: 24 }
  const L = ce.dias.length * C
  return (
    <div className="grafico-rolavel">
      <svg className="clima-efetivo" viewBox={`0 0 ${L} ${A + M.t + M.b}`} style={{ minWidth: Math.max(320, L) }} role="img"
        aria-label={`Efetivo médio de ${ce.mediaEfetivo} pessoas; ${ce.diasDeChuva} dia(s) de chuva`}>
        {ce.dias.map((d, i) => {
          const h = (d.efetivo / ce.maiorEfetivo) * A
          const x = i * C
          return (
            <g key={d.data}>
              {d.chuva && <rect x={x} y="0" width={C} height={A + M.t} className="fundo-chuva" />}
              <text x={x + C / 2} y="16" textAnchor="middle" className="icone-clima">{ICONE_CLIMA[d.clima] ?? '·'}<title>{d.rotuloClima}</title></text>
              <rect x={x + 8} y={M.t + A - h} width={C - 16} height={h} rx="3" className="col-efetivo" />
              <text x={x + C / 2} y={M.t + A - h - 4} textAnchor="middle" className="eixo">{d.efetivo}</text>
              <text x={x + C / 2} y={M.t + A + 16} textAnchor="middle" className="eixo">{d.rotulo}</text>
            </g>
          )
        })}
      </svg>
      <ul className="legenda-bi">
        <li><i style={{ background: 'var(--bi-teal)' }} />Efetivo do dia (pessoas)</li>
        <li><i className="lg-chuva" />Dia de chuva</li>
        <li>☀ sol · ☁ nublado · ☂ chuva · ⛈ chuva forte</li>
      </ul>
    </div>
  )
}

function PainelRitmo({ fontes, hoje, mod, erros, aviso }) {
  const r = painelRitmo(fontes, hoje)
  return (
    <Painel titulo="Ritmo & Produção" subtitulo="Planejamento semanal e Diário de Obra" modulo="diario"
      liberado={mod.planejamento || mod.diario} erro={erros.planejamento || erros.diario} aviso={aviso}>
      <div className="bloco-bi">
        <h3 className="titulo-grafico">PPC semanal — últimas 8 semanas{r.ppc && <span className="nota"> · média {r.ppc.media}%</span>}</h3>
        {r.ppc ? <PpcSemanal ppc={r.ppc} /> : <p className="nota">Nenhuma atividade do Planejamento caiu nas últimas 8 semanas.</p>}
        <p className="nota nota-bi">Meta não batida = marcada "não realizada" na semana, ou que devia terminar nela e não terminou.</p>
      </div>
      <div className="bloco-bi">
        <h3 className="titulo-grafico">Pareto das causas do "não realizado"</h3>
        {r.pareto ? <Pareto pareto={r.pareto} /> : <p className="nota">Nenhuma tarefa foi marcada como não realizada. Bom sinal.</p>}
      </div>
      <div className="bloco-bi">
        <h3 className="titulo-grafico">Clima × efetivo{r.clima && <span className="nota"> · média {r.clima.mediaEfetivo} pessoas · {r.clima.diasDeChuva} {r.clima.diasDeChuva === 1 ? 'dia' : 'dias'} de chuva</span>}</h3>
        {r.clima ? <ClimaEfetivo ce={r.clima} /> : <p className="nota">{mod.diario ? 'Sem diário até hoje.' : 'Lance o Diário de Obra para ver o clima e o efetivo de cada dia.'}</p>}
      </div>
    </Painel>
  )
}

function PainelContratos({ fontes, mod, erros }) {
  const p = painelContratos(fontes)
  return (
    <Painel titulo="Contratos & Medições" subtitulo="Quanto foi contratado, medido e ainda vai sair do caixa" modulo="medicoes" liberado={mod.medicoes} erro={erros.medicoes}>
      {p ? (
        <>
          <div className="mini-cards">
            {p.fluxo.map((f) => (
              <div key={f.status} className={`mini-card st-${f.status}`}>
                <span className="rot">{f.rotulo}</span>
                <b>{f.quantidade}</b>
                <span className="det">{f.valor ? formatarReais(f.valor) : f.quantidade ? 'sem valor ainda' : '—'}</span>
              </div>
            ))}
          </div>
          <div className="bloco-bi">
            <h3 className="titulo-grafico">Matriz de empreiteiros</h3>
            {p.matriz.length === 0 ? <p className="nota">Nenhum contrato aprovado ainda.</p> : (
              <div className="tabela-rolavel">
                <table className="tabela-bi">
                  <thead><tr><th>Empreiteiro</th><th className="num">Valor total</th><th>% medido</th><th className="num">Saldo a medir</th></tr></thead>
                  <tbody>
                    {p.matriz.map((l) => (
                      <tr key={l.empreiteiro}>
                        <td>{l.empreiteiro}{l.contratos > 1 && <span className="nota"> · {l.contratos} contratos</span>}</td>
                        <td className="num">{formatarReais(l.total)}</td>
                        <td><span className="barra-celula"><i style={{ width: `${l.pct}%` }} /><b>{l.pct}%</b></span></td>
                        <td className="num">{formatarReais(l.saldo)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="nota nota-bi">Medido = boletins fechados. Rascunho ainda não conta.</p>
          </div>
          <div className="bloco-bi">
            <h3 className="titulo-grafico">Saldo a medir por contrato{p.saldos && <span className="nota"> · {formatarReais(p.saldos.total)}</span>}</h3>
            {p.saldos ? (
              <ol className="barras-h barras-saldo">
                {p.saldos.linhas.map((l) => (
                  <li key={l.id}>
                    <span className="pareto-rot">{l.empreiteiro}<small>{l.descricao}</small></span>
                    <span className="pareto-trilho"><i style={{ width: `${(l.saldo / p.saldos.maior) * 100}%` }} /></span>
                    <span className="pareto-num"><b>{formatarReais(l.saldo)}</b></span>
                  </li>
                ))}
              </ol>
            ) : <p className="nota">{p.matriz.length ? 'Nenhum saldo a medir: tudo o que foi contratado já foi medido.' : 'Nenhum contrato aprovado ainda.'}</p>}
          </div>
        </>
      ) : <p className="nota">Nada com esses filtros.</p>}
    </Painel>
  )
}

function PainelMateriais({ fontes, hoje, mod, erros, aviso }) {
  const p = painelMateriais(fontes, hoje)
  return (
    <Painel titulo="Materiais" subtitulo="Pedidos, atrasos e quanto o canteiro espera" modulo="materiais" liberado={mod.materiais} erro={erros.materiais} aviso={aviso}>
      {p ? (
        <>
          <div className="mini-cards mini-cards-5">
            {p.etapas.map((e) => (
              <div key={e.status} className="mini-card"><span className="rot">{e.rotulo}</span><b>{e.quantidade}</b></div>
            ))}
          </div>
          <div className="exec-graficos">
            <div className={`bloco-bi card-atraso ${p.atrasados.length ? 'tem' : ''}`}>
              <h3 className="titulo-grafico">Atrasados <b className="num-grande">{p.atrasados.length}</b></h3>
              {p.atrasados.length === 0 ? <p className="nota">Nenhum pedido comprado com a previsão vencida.</p> : (
                <ul className="lista-atraso">
                  {p.atrasados.map((a) => (
                    <li key={a.id}>
                      <b>{a.material}</b>{a.critico && <span className="pill parada">Crítico</span>}
                      <span>{a.frente} · {a.dias} {a.dias === 1 ? 'dia' : 'dias'} de atraso</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="nota nota-bi">{p.criticos} {p.criticos === 1 ? 'pedido crítico' : 'pedidos críticos'} ainda não {p.criticos === 1 ? 'entregue' : 'entregues'}.</p>
            </div>
            <div className="bloco-bi">
              <h3 className="titulo-grafico">Lead time médio</h3>
              {p.leadTime ? (
                <>
                  <span className="lead-grande">{p.leadTime.media} <small>{p.leadTime.media === 1 ? 'dia' : 'dias'}</small></span>
                  <span className="nota">do pedido à chegada no almoxarifado ({p.leadTime.pedidos} {p.leadTime.pedidos === 1 ? 'pedido' : 'pedidos'})</span>
                  <div className="lead-barras" role="img" aria-label="Lead time médio nas últimas 4 semanas">
                    {p.leadTime.semanas.map((s) => (
                      <div key={s.inicio} className="ppc-col">
                        <span className="ppc-pct">{s.media === null ? '—' : `${s.media} d`}</span>
                        <div className="ppc-trilho lead-trilho"><i style={{ height: `${((s.media ?? 0) / p.leadTime.maior) * 100}%` }} /></div>
                        <span className="ppc-sem">{s.rotulo}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : <p className="nota">Nenhum pedido chegou ao almoxarifado ainda.</p>}
            </div>
          </div>
        </>
      ) : <p className="nota">Nada com esses filtros.</p>}
    </Painel>
  )
}

function PainelQualidade({ fontes, mod, erros }) {
  const q = painelQualidade(fontes)
  return (
    <Painel titulo="Qualidade & Entrega" subtitulo="Pendências, FVS e Gemba Walk" modulo="qualidade" liberado={mod.qualidade} erro={erros.qualidade}>
      {q ? (
        <>
          <p className="nota">{q.abertas} {q.abertas === 1 ? 'pendência aberta' : 'pendências abertas'} · {q.ncsAbertas} {q.ncsAbertas === 1 ? 'NC aberta' : 'NCs abertas'}</p>
          <div className="exec-graficos">
            <div className="bloco-bi">
              <h3 className="titulo-grafico">% conforme por modelo de FVS</h3>
              {q.conforme ? (
                <ol className="barras-h barras-conforme">
                  {q.conforme.map((l) => (
                    <li key={l.modelo}>
                      <span className="pareto-rot">{l.modelo}<small>{l.vistorias} {l.vistorias === 1 ? 'vistoria' : 'vistorias'} · {l.nc} NC</small></span>
                      <span className="pareto-trilho"><i className={l.pct < 80 ? 'baixo' : ''} style={{ width: `${l.pct}%` }} /></span>
                      <span className="pareto-num"><b>{l.pct}%</b></span>
                    </li>
                  ))}
                </ol>
              ) : <p className="nota">Nenhum item de FVS respondido como OK ou NC.</p>}
              <p className="nota nota-bi">Barra laranja: abaixo de 80% (está gerando retrabalho). A FVS não registra a empresa: não muda com esse filtro.</p>
            </div>
            <div className="bloco-bi">
              <h3 className="titulo-grafico">Pendências abertas por empresa</h3>
              {q.empresas ? (
                <div className="donut-bloco">
                  <div className="donut" style={{ background: q.empresas.gradiente }} role="img"
                    aria-label={q.empresas.fatias.map((f) => `${f.nome}: ${f.total}`).join(', ')}>
                    <div className="donut-furo"><b>{q.empresas.total}</b><span>abertas</span></div>
                  </div>
                  <ul className="legenda-bi legenda-coluna">
                    {q.empresas.fatias.map((f) => <li key={f.nome}><i style={{ background: f.cor }} />{f.nome} · <b>{f.total}</b> ({f.pct}%)</li>)}
                  </ul>
                </div>
              ) : <p className="nota">Nenhuma pendência aberta.</p>}
            </div>
          </div>
          <div className="bloco-bi">
            <h3 className="titulo-grafico">Mapa de pendências por local</h3>
            {q.locais ? (
              <div className="treemap" role="img" aria-label={q.locais.locais.map((l) => `${l.nome}: ${l.total}`).join(', ')}>
                {q.locais.locais.map((l, i) => (
                  <div key={l.nome} className="treemap-bloco" style={{ flexGrow: l.total, opacity: Math.max(0.55, 1 - i * 0.08) }}>
                    <b>{l.total}</b><span>{l.nome}</span>
                  </div>
                ))}
              </div>
            ) : <p className="nota">Nenhuma pendência aberta.</p>}
          </div>
          <div className="bloco-bi">
            <h3 className="titulo-grafico">Ranking de desperdícios (Gemba Walk)</h3>
            {q.desperdicios ? (
              <ol className="barras-h barras-gemba">
                {q.desperdicios.ranking.map((r) => (
                  <li key={r.tipo}>
                    <span className="pareto-rot">{r.tipo}</span>
                    <span className="pareto-trilho"><i style={{ width: `${(r.total / q.desperdicios.maior) * 100}%` }} /></span>
                    <span className="pareto-num"><b>{r.total}</b></span>
                  </li>
                ))}
              </ol>
            ) : <p className="nota">Nenhuma observação do Gemba Walk.</p>}
          </div>
        </>
      ) : <p className="nota">Nada com esses filtros.</p>}
    </Painel>
  )
}

export default function Relatorios() {
  const { obra } = useObra()
  const [estado, setEstado] = useState({ carregando: true, erro: null })
  const [dados, setDados] = useState(null)
  const [filtros, setFiltros] = useState(FILTROS_BI_INICIAIS)
  const [geradoEm, setGeradoEm] = useState(() => dataHoraPorExtenso(new Date()))
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

  // `mod` olha a obra inteira (o painel liga se o módulo tem dado); os painéis desenham as
  // fontes já filtradas por empresa e período.
  const todas = { ...dados.fontes, obra }
  const mod = modulosDoBI(todas)
  const algum = Object.values(mod).some(Boolean)
  const fontes = filtrarFontes(todas, filtros, hoje)
  const empresas = empresasDoBI(todas)
  const semEmpresa = filtros.empresa ? 'Sem empresa nestes dados: mostra a obra toda.' : null

  function imprimir() {
    setGeradoEm(dataHoraPorExtenso(new Date()))
    setTimeout(() => window.print(), 50)
  }

  return (
    <>
      {cabecalho}
      {!algum ? (
        <div className="vazio">
          <span className="icone"><Icon nome="relatorios" tamanho={36} /></span>
          <h3>Ainda não há dados nesta obra</h3>
          <p>Os painéis se montam sozinhos com o que for lançado no Planejamento, no Diário, nas Medições, nos Materiais e na Qualidade. Comece por um deles.</p>
        </div>
      ) : (
        <>
          <div className="filtros-bi no-print" role="search" aria-label="Filtros dos relatórios">
            <label className="campo campo-empresa">
              <span className="campo-rot">Empresa / empreiteiro</span>
              <select value={filtros.empresa} onChange={(e) => setFiltros({ ...filtros, empresa: e.target.value })}>
                <option value="">Todas</option>
                {empresas.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <div className="chips-periodo" role="group" aria-label="Período">
              {PERIODOS_BI.map((p) => (
                <button key={p.id} className={`chip-filtro ${filtros.periodo === p.id ? 'ativo' : ''}`} aria-pressed={filtros.periodo === p.id}
                  onClick={() => setFiltros({ ...filtros, periodo: p.id })}>{p.rotulo}</button>
              ))}
            </div>
            <button className="btn btn-sec" onClick={imprimir}>Imprimir relatório executivo</button>
            {(filtros.empresa || filtros.periodo !== 'tudo') && (
              <p className="nota">{descreverFiltrosBI(filtros)}. <button className="link-limpar" onClick={() => setFiltros(FILTROS_BI_INICIAIS)}>Limpar filtros</button></p>
            )}
          </div>

          <header className="rel-cab so-impressao">
            <img src="/logo-fmz-recorte.png" alt="FMZ Incorporadora" className="rel-logo" />
            <h1>RELATÓRIO EXECUTIVO DA OBRA</h1>
            <p><b>{obra ? `${obra.codigo} · ${obra.nome}` : ''}</b></p>
            <p>Data: {formatarData(hoje)} · {descreverFiltrosBI(filtros)}</p>
          </header>

          <div className="grade-bi">
            <PainelExecutivo fontes={fontes} hoje={hoje} mod={mod} erros={dados.erros} />
            <PainelRitmo fontes={fontes} hoje={hoje} mod={mod} erros={dados.erros} aviso={semEmpresa} />
            <PainelContratos fontes={fontes} mod={mod} erros={dados.erros} />
            <PainelMateriais fontes={fontes} hoje={hoje} mod={mod} erros={dados.erros} aviso={semEmpresa} />
            <PainelQualidade fontes={fontes} mod={mod} erros={dados.erros} />
          </div>

          <footer className="rel-rodape so-impressao">Gerado automaticamente em {geradoEm}.</footer>
        </>
      )}
    </>
  )
}
