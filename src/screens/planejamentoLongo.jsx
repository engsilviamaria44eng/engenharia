// PLANEJAMENTO · aba LONGO PRAZO: o cronograma da obra em barras (CSS puro, sem biblioteca),
// por semana ou por mês, com o real × o previsto para hoje. No celular vira lista.
// Usa as mesmas atividades da EAP; atualizar o progresso aqui muda a EAP e a semana.
import { useEffect, useRef, useState } from 'react'
import { usePlanejamento } from '../lib/PlanejamentoContext.jsx'
import {
  linhasEAP, resumo, resumoDoCronograma, situacaoPrazo, escalaDoCronograma, posicaoNaEscala,
  validarProgresso, aplicarProgresso,
} from '../lib/planejamento.js'
import { formatarData, hojeISO } from '../lib/datas.js'
import { Vazio, useDesktop } from '../components/index.jsx'
import { Campo, Folha } from '../components/formulario.jsx'

const CLASSE_SITUACAO = { atrasada: 'parada', no_prazo: 'ok', concluida: 'ok', a_iniciar: 'neutra' }

function FolhaProgresso({ linha, r, onSalvar, onFechar }) {
  const [valor, setValor] = useState(String(linha.atividade.progresso))
  const [tocado, setTocado] = useState(false)
  const erro = validarProgresso(valor)

  function enviar(e) {
    e.preventDefault()
    setTocado(true)
    if (!erro) onSalvar(valor)
  }

  return (
    <Folha titulo="Atualizar progresso" onFechar={onFechar}>
      <p className="form-sub">
        {linha.codigo} {linha.atividade.titulo} · {formatarData(r.inicio)} → {formatarData(r.fim)}<br />
        Para hoje, o previsto é <b>{r.previsto}%</b>.
      </p>
      <form className="form" onSubmit={enviar} noValidate>
        <Campo rotulo="Progresso real (%)" erro={tocado && erro} dica="100% marca a atividade como concluída.">
          <input type="number" inputMode="numeric" min="0" max="100" step="1" value={valor} autoFocus
            onChange={(e) => setValor(e.target.value)} onBlur={() => setTocado(true)} />
        </Campo>
        <div className="atalhos">
          {[0, 25, 50, 75, 100].map((n) => (
            <button key={n} type="button" className={`chip-filtro ${valor === String(n) ? 'ativo' : ''}`} onClick={() => setValor(String(n))}>{n}%</button>
          ))}
        </div>
        <div className="form-acoes">
          <button type="button" className="btn btn-sec" onClick={onFechar}>Cancelar</button>
          <button type="submit" className="btn btn-pri">Salvar</button>
        </div>
      </form>
    </Folha>
  )
}

// Barra de progresso com a marca do previsto (o traço escuro).
function BarraRealPrevisto({ r }) {
  return (
    <span className="barra-rp" role="img" aria-label={`Real ${r.progresso}%, previsto ${r.previsto}%`}>
      <i style={{ width: `${r.progresso}%` }} />
      <em style={{ left: `${r.previsto}%` }} />
    </span>
  )
}

function Gantt({ linhas, atividades, config, hoje, modo, onAbrir }) {
  const resumos = new Map(linhas.map((l) => [l.atividade.id, resumo(atividades, l.atividade.id, config, hoje)]))
  const datas = [...resumos.values()]
  const inicio = datas.map((r) => r.inicio).sort()[0]
  const fim = datas.map((r) => r.fim).sort().at(-1)
  const escala = escalaDoCronograma(inicio < hoje ? inicio : hoje, fim > hoje ? fim : hoje, modo)
  const pxDia = modo === 'semana' ? 9 : 3.4
  const hojeX = posicaoNaEscala(escala, hoje).esquerda
  const caixa = useRef(null)

  // Abre já rolado até perto de hoje (com umas semanas de passado à vista).
  useEffect(() => {
    const el = caixa.current
    if (el) el.scrollLeft = Math.max(0, (hojeX / 100) * escala.totalDias * pxDia - 3 * 7 * pxDia * (modo === 'semana' ? 1 : 3))
  }, [modo])

  return (
    <div className="gantt" role="table" aria-label="Cronograma" ref={caixa}>
      <div className="gantt-trilho" style={{ '--largura': `${escala.totalDias * pxDia}px` }}>
        <div className="gantt-linha gantt-cab" role="row">
          <div className="gantt-rot" role="columnheader">Atividade</div>
          <div className="gantt-faixa" role="columnheader">
            {escala.colunas.map((c) => {
              const p = posicaoNaEscala(escala, c.inicio)
              return <span key={c.inicio} className="gantt-col" style={{ left: `${p.esquerda}%`, width: `${(c.dias / escala.totalDias) * 100}%` }}>{c.rotulo}</span>
            })}
          </div>
        </div>
        {linhas.map((l) => {
          const r = resumos.get(l.atividade.id)
          const p = posicaoNaEscala(escala, r.inicio, r.fim)
          const s = situacaoPrazo(r)
          return (
            <div key={l.atividade.id} className={`gantt-linha ${l.grupo ? 'grupo' : ''}`} role="row">
              <div className="gantt-rot" role="rowheader" style={{ '--nivel': l.nivel }}>
                <span className="eap-cod">{l.codigo}</span><span className="gantt-nome">{l.atividade.titulo}</span>
              </div>
              <div className="gantt-faixa" role="cell">
                {escala.colunas.map((c) => <span key={c.inicio} className="gantt-grade" style={{ left: `${posicaoNaEscala(escala, c.inicio).esquerda}%` }} />)}
                <span className="gantt-hoje" style={{ left: `${hojeX}%` }} />
                <button className={`gantt-barra ${s.id}`} style={{ left: `${p.esquerda}%`, width: `${p.largura}%` }}
                  disabled={l.grupo} onClick={() => onAbrir(l, r)}
                  title={`${l.atividade.titulo}: ${formatarData(r.inicio)} a ${formatarData(r.fim)} · real ${r.progresso}% · previsto ${r.previsto}%`}
                  aria-label={`${l.codigo} ${l.atividade.titulo}, real ${r.progresso}%, previsto ${r.previsto}%, ${s.rotulo}${l.grupo ? '' : '. Atualizar progresso'}`}>
                  <i style={{ width: `${r.progresso}%` }} />
                  <em style={{ left: `${r.previsto}%` }} />
                </button>
                <span className="gantt-pct" style={{ left: `calc(${p.esquerda + p.largura}% + 6px)` }}>{r.progresso}%</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ListaCronograma({ linhas, atividades, config, hoje, onAbrir }) {
  return (
    <ul className="cartao eap" aria-label="Cronograma em lista">
      {linhas.map((l) => {
        const r = resumo(atividades, l.atividade.id, config, hoje)
        const s = situacaoPrazo(r)
        return (
          <li key={l.atividade.id} className={`eap-linha ${l.grupo ? 'grupo' : ''}`} style={{ '--nivel': l.nivel }}>
            <div className="eap-topo"><span className="eap-cod">{l.codigo}</span><span className="eap-titulo">{l.atividade.titulo}</span></div>
            <div className="eap-info">
              <span className="nw">{formatarData(r.inicio)} → {formatarData(r.fim)}</span>
              <span className="nw">Real <b>{r.progresso}%</b> · Previsto <b>{r.previsto}%</b></span>
            </div>
            <BarraRealPrevisto r={r} />
            <div className="pills"><span className={`pill ${CLASSE_SITUACAO[s.id]}`}>{s.rotulo}</span></div>
            {!l.grupo && <div className="eap-acoes"><button className="btn-mini" onClick={() => onAbrir(l, r)}>Atualizar progresso</button></div>}
          </li>
        )
      })}
    </ul>
  )
}

export default function AbaLongoPrazo({ irParaEAP }) {
  const { atividades, config, salvar } = usePlanejamento()
  const desktop = useDesktop()
  const [modo, setModo] = useState('semana')
  const [folha, setFolha] = useState(null)
  const hoje = hojeISO()

  const linhas = linhasEAP(atividades)
  if (linhas.length === 0) {
    return (
      <Vazio icone="planejamento" titulo="Sem cronograma ainda"
        texto="O cronograma nasce da EAP. Crie as atividades com início e fim lá, e elas aparecem aqui em barras.">
        <button className="btn btn-pri" onClick={irParaEAP}>Ir para a EAP</button>
      </Vazio>
    )
  }

  const totais = resumoDoCronograma(atividades, config, hoje)
  const abrir = (linha, r) => setFolha({ linha, r })

  function salvarProgresso(valor) {
    const a = folha.linha.atividade
    setFolha(null)
    salvar([aplicarProgresso(a, valor)], `Progresso de "${a.titulo}" salvo`)
  }

  return (
    <>
      <div className="resumo">
        <div className="stat"><span className="rot">Previsto hoje</span><span className="val">{totais.previsto}<small>%</small></span></div>
        <div className={`stat ${totais.progresso < totais.previsto ? 'verm' : 'verde'}`}><span className="rot">Real</span><span className="val">{totais.progresso}<small>%</small></span></div>
        <div className={`stat ${totais.atrasadas ? 'verm' : 'verde'}`}><span className="rot">Atrasadas</span><span className="val">{totais.atrasadas}</span></div>
      </div>
      {desktop ? (
        <>
          <div className="barra-acoes" role="group" aria-label="Escala do cronograma">
            {[['semana', 'Por semana'], ['mes', 'Por mês']].map(([id, rot]) => (
              <button key={id} className={`chip-filtro ${modo === id ? 'ativo' : ''}`} aria-pressed={modo === id} onClick={() => setModo(id)}>{rot}</button>
            ))}
            <span className="legenda">
              <span><i className="lg-real" /> real</span>
              <span><i className="lg-prev" /> previsto para hoje</span>
              <span><i className="lg-hoje" /> hoje</span>
            </span>
          </div>
          <Gantt linhas={linhas} atividades={atividades} config={config} hoje={hoje} modo={modo} onAbrir={abrir} />
          <p className="nota">Toque numa barra para atualizar o progresso real. Os grupos somam as subatividades.</p>
        </>
      ) : (
        <ListaCronograma linhas={linhas} atividades={atividades} config={config} hoje={hoje} onAbrir={abrir} />
      )}
      {folha && <FolhaProgresso linha={folha.linha} r={folha.r} onSalvar={salvarProgresso} onFechar={() => setFolha(null)} />}
    </>
  )
}
