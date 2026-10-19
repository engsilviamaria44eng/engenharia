// PLANEJAMENTO · aba MÉDIO PRAZO (lookahead): as próximas semanas, com as RESTRIÇÕES
// (o que impede cada atividade de acontecer). Cada coluna é uma semana; o cartão anda
// por setas, sem arrastar. As restrições ficam dentro das mesmas atividades da EAP.
import { useState } from 'react'
import { usePlanejamento } from '../lib/PlanejamentoContext.jsx'
import {
  TIPOS_RESTRICAO, rotuloTipoRestricao, quadroDeRestricoes, atividadesDaSemana, responsaveisDasRestricoes, linhasEAP,
  temFilhosAtivos, validarRestricao, novaRestricao, acrescentarRestricao, podeVoltarSemana, moverRestricao, marcarResolvida,
} from '../lib/planejamento.js'
import { formatarData, hojeISO } from '../lib/datas.js'
import { Icon, Vazio } from '../components/index.jsx'
import { Campo, Folha } from '../components/formulario.jsx'

const curta = (iso) => formatarData(iso).slice(0, 5)

function SeloTipo({ tipo }) {
  return <span className={`selo-tipo tipo-${tipo}`}><Icon nome={tipo} tamanho={16} />{rotuloTipoRestricao(tipo)}</span>
}

function FormRestricao({ atividades, responsaveis, inicial, onSalvar, onFechar }) {
  const [d, setD] = useState(inicial)
  const [tocados, setTocados] = useState({})
  const erros = validarRestricao(d)
  const mostra = (c) => (tocados[c] || tocados._enviar) && erros[c]
  const toca = (c) => () => setTocados({ ...tocados, [c]: true })
  const opcoes = linhasEAP(atividades).filter((l) => !temFilhosAtivos(atividades, l.atividade.id))

  function enviar(e) {
    e.preventDefault()
    setTocados({ _enviar: true })
    if (Object.keys(erros).length === 0) onSalvar(d)
  }

  return (
    <Folha titulo="Nova restrição" onFechar={onFechar}>
      <form className="form" onSubmit={enviar} noValidate>
        <Campo rotulo="Atividade impedida" erro={mostra('atividade_id')}>
          <select value={d.atividade_id} onChange={(e) => setD({ ...d, atividade_id: e.target.value })} onBlur={toca('atividade_id')}>
            <option value="">Escolha a atividade</option>
            {opcoes.map((l) => <option key={l.atividade.id} value={l.atividade.id}>{l.codigo} {l.atividade.titulo}</option>)}
          </select>
        </Campo>
        <Campo rotulo="O que está impedindo" erro={mostra('descricao')}>
          <input type="text" value={d.descricao} placeholder="Vergalhão ainda não chegou"
            onChange={(e) => setD({ ...d, descricao: e.target.value })} onBlur={toca('descricao')} />
        </Campo>
        <Campo rotulo="Tipo" erro={mostra('tipo')}>
          <div className="tipos" role="radiogroup" aria-label="Tipo da restrição">
            {TIPOS_RESTRICAO.map((t) => (
              <button key={t.id} type="button" role="radio" aria-checked={d.tipo === t.id}
                className={`tipo-op tipo-${t.id} ${d.tipo === t.id ? 'ativo' : ''}`} onClick={() => setD({ ...d, tipo: t.id })}>
                <Icon nome={t.id} tamanho={18} />{t.rotulo}
              </button>
            ))}
          </div>
        </Campo>
        <div className="campos-lado">
          <Campo rotulo="Resolver até" erro={mostra('prazo')} dica="O cartão entra na semana deste dia.">
            <input type="date" value={d.prazo} onChange={(e) => setD({ ...d, prazo: e.target.value })} onBlur={toca('prazo')} />
          </Campo>
          <Campo rotulo="Responsável" erro={mostra('responsavel')}>
            <input type="text" list="responsaveis-restricao" value={d.responsavel} placeholder="Compras"
              onChange={(e) => setD({ ...d, responsavel: e.target.value })} onBlur={toca('responsavel')} />
            <datalist id="responsaveis-restricao">{responsaveis.map((r) => <option key={r} value={r} />)}</datalist>
          </Campo>
        </div>
        <div className="form-acoes">
          <button type="button" className="btn btn-sec" onClick={onFechar}>Cancelar</button>
          <button type="submit" className="btn btn-pri">Criar restrição</button>
        </div>
      </form>
    </Folha>
  )
}

function CartaoRestricao({ c, hoje, ehUltima, onMover, onResolver }) {
  const { restricao: r, atividade: a } = c
  return (
    <article className={`restricao tipo-${r.tipo} ${r.resolvida ? 'resolvida' : ''} ${c.vencida ? 'vencida' : ''}`}>
      <div className="pedido-topo">
        <SeloTipo tipo={r.tipo} />
        {c.vencida && <span className="tag verm">Vencida</span>}
        {r.resolvida && <span className="pill ok">Resolvida</span>}
      </div>
      <b className="restricao-desc">{r.descricao}</b>
      <span className="pedido-frente">{c.codigo} {a.titulo}</span>
      <span className="pedido-info">Até <b>{formatarData(r.prazo)}</b> · {r.responsavel}</span>
      {c.deSemanaPassada && <span className="pedido-info">Veio da semana de {curta(r.semana)} sem ser resolvida.</span>}
      <div className="pedido-acoes">
        {!r.resolvida && (
          <>
            <button className="btn-mini seta" disabled={!podeVoltarSemana(r, hoje)} onClick={() => onMover(c, -1)} aria-label="Mover para a semana anterior">←</button>
            <button className="btn-mini seta" onClick={() => onMover(c, 1)} aria-label={ehUltima ? 'Mover para a próxima semana (sai do horizonte)' : 'Mover para a próxima semana'}>→</button>
          </>
        )}
        <button className={`btn-mini ${r.resolvida ? '' : 'pri'}`} onClick={() => onResolver(c, !r.resolvida)}>
          {r.resolvida ? 'Reabrir' : 'Marcar resolvida'}
        </button>
      </div>
    </article>
  )
}

export default function AbaMedioPrazo({ irParaEAP }) {
  const { atividades, salvar } = usePlanejamento()
  const [semanas, setSemanas] = useState(4)
  const [responsavel, setResponsavel] = useState('')
  const [mostrarResolvidas, setMostrarResolvidas] = useState(false)
  const [formAberto, setFormAberto] = useState(false)
  const hoje = hojeISO()

  if (!atividades.some((a) => !a.arquivada)) {
    return (
      <Vazio icone="planejamento" titulo="Sem atividades para olhar à frente"
        texto="O médio prazo mostra o que impede as atividades das próximas semanas. Monte a EAP primeiro.">
        <button className="btn btn-pri" onClick={irParaEAP}>Ir para a EAP</button>
      </Vazio>
    )
  }

  const { quadro, depois } = quadroDeRestricoes(atividades, hoje, { semanas, responsavel, mostrarResolvidas })
  const responsaveis = responsaveisDasRestricoes(atividades)
  const abertas = quadro.reduce((s, c) => s + c.cartoes.filter((x) => !x.restricao.resolvida).length, 0)
  const vencidas = quadro.reduce((s, c) => s + c.cartoes.filter((x) => x.vencida).length, 0)
  const ultima = quadro.at(-1).semana.inicio

  function criar(d) {
    setFormAberto(false)
    const a = atividades.find((x) => x.id === d.atividade_id)
    salvar([acrescentarRestricao(a, novaRestricao(d, `rs-${Date.now()}`))], 'Restrição criada')
  }

  function mover(c, delta) {
    const fora = delta > 0 && c.restricao.semana >= ultima
    salvar([moverRestricao(c.atividade, c.restricao.id, delta)],
      fora ? 'Movida para depois do horizonte. Aumente o nº de semanas para ver.' : 'Restrição movida de semana')
  }

  function resolver(c, resolvida) {
    salvar([marcarResolvida(c.atividade, c.restricao.id, resolvida, hoje)], resolvida ? 'Restrição resolvida' : 'Restrição reaberta')
  }

  return (
    <>
      <div className="resumo">
        <div className={`stat ${abertas ? 'ocre' : 'verde'}`}><span className="rot">Abertas</span><span className="val">{abertas}</span></div>
        <div className={`stat ${vencidas ? 'verm' : 'verde'}`}><span className="rot">Vencidas</span><span className="val">{vencidas}</span></div>
        <div className="stat"><span className="rot">Depois do horizonte</span><span className="val">{depois}</span></div>
      </div>
      <div className="barra-acoes">
        <button className="btn btn-pri" onClick={() => setFormAberto(true)}>Nova restrição</button>
        <button className={`chip-filtro ${mostrarResolvidas ? 'ativo' : ''}`} aria-pressed={mostrarResolvidas} onClick={() => setMostrarResolvidas(!mostrarResolvidas)}>
          Mostrar resolvidas
        </button>
      </div>
      <div className="filtros-linha">
        <label className="filtro">
          <span>Semanas à vista</span>
          <select value={semanas} onChange={(e) => setSemanas(Number(e.target.value))}>
            {[3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} semanas</option>)}
          </select>
        </label>
        <label className="filtro">
          <span>Responsável</span>
          <select value={responsavel} onChange={(e) => setResponsavel(e.target.value)}>
            <option value="">Todos</option>
            {responsaveis.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
      </div>
      <p className="nota so-celular">Arraste o quadro para os lados para ver as outras semanas.</p>
      <div className="kanban" role="list" aria-label="Restrições por semana">
        {quadro.map(({ semana, cartoes }, i) => {
          const planejadas = atividadesDaSemana(atividades, semana).length
          return (
            <section key={semana.inicio} className="coluna" role="listitem" aria-label={`Semana de ${curta(semana.inicio)}`}>
              <div className="coluna-cab">
                <h2 className="secao">{i === 0 ? 'Esta semana' : `Semana ${i + 1}`} <small className="semana-datas">{curta(semana.inicio)} a {curta(semana.fim)}</small></h2>
                <span className="contagem">{cartoes.length}</span>
              </div>
              <p className="coluna-info">{planejadas} {planejadas === 1 ? 'atividade planejada' : 'atividades planejadas'}</p>
              {cartoes.length === 0
                ? <p className="coluna-vazia">Nenhuma restrição nesta semana.</p>
                : cartoes.map((c) => (
                  <CartaoRestricao key={c.restricao.id} c={c} hoje={hoje} ehUltima={semana.inicio === ultima} onMover={mover} onResolver={resolver} />
                ))}
            </section>
          )
        })}
      </div>
      {formAberto && (
        <FormRestricao atividades={atividades} responsaveis={responsaveis}
          inicial={{ atividade_id: '', descricao: '', tipo: '', prazo: hoje, responsavel: '' }}
          onSalvar={criar} onFechar={() => setFormAberto(false)} />
      )}
    </>
  )
}
