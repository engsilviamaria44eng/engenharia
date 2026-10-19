// QUALIDADE · aba GEMBA WALK: caminhar pela obra e anotar os desperdícios. Ranking dos 7 tipos
// (onde a obra mais perde), filtros e mini-Kanban Pendente | Em andamento | Resolvido,
// movido por seleção (sem arrastar). No celular as colunas ficam uma embaixo da outra.
import { useEffect, useState } from 'react'
import { useObra } from '../lib/ObraContext.jsx'
import { listarGemba, criarObservacaoGemba, salvarObservacaoGemba } from '../lib/dados.js'
import {
  STATUS_PENDENCIA, TIPOS_DESPERDICIO, FILTROS_PRAZO_GEMBA, classeDoDesperdicio, prazoVencido, rankingDesperdicios,
  filtrarGemba, validarObservacao, alternarDesperdicio, novaObservacao, moverObservacao, rotuloStatusPendencia,
} from '../lib/qualidade.js'
import { formatarData, hojeISO } from '../lib/datas.js'
import { Vazio } from '../components/index.jsx'
import { Campo, Folha } from '../components/formulario.jsx'
import { CampoFoto } from './qualidadePendencias.jsx'

let contadorTemp = 0
const idProvisorio = () => `temp-${++contadorTemp}`

function Tags({ tipos }) {
  return <div className="pills">{tipos.map((t) => <span key={t} className={`tag-desp ${classeDoDesperdicio(t)}`}>{t}</span>)}</div>
}

function FormObservacao({ responsaveis, usuario, onSalvar, onFechar }) {
  const hoje = hojeISO()
  const [d, setD] = useState({ local: '', descricao: '', causa_raiz: '', acao: '', desperdicios: [], responsavel: usuario, prazo: hoje, foto: null })
  const [enviou, setEnviou] = useState(false)
  const erros = validarObservacao(d, hoje)
  const mostra = (c) => enviou && erros[c]
  const campo = (c) => ({ value: d[c] ?? '', onChange: (e) => setD({ ...d, [c]: e.target.value }) })

  return (
    <Folha titulo="Nova observação" onFechar={onFechar}>
      <form className="form" noValidate onSubmit={(e) => { e.preventDefault(); setEnviou(true); if (!Object.keys(erros).length) onSalvar(d) }}>
        <CampoFoto rotulo="Foto (opcional)" valor={d.foto} onMudar={(foto) => setD({ ...d, foto })} />
        <Campo rotulo="Local" erro={mostra('local')}><input type="text" placeholder="2º pavimento" {...campo('local')} /></Campo>
        <Campo rotulo="O que você viu" erro={mostra('descricao')}><textarea rows="2" placeholder="Equipe parada esperando material" {...campo('descricao')} /></Campo>
        <Campo rotulo="Tipos de desperdício" erro={mostra('desperdicios')}>
          <div className="tipos" role="group" aria-label="Tipos de desperdício">
            {TIPOS_DESPERDICIO.map((t) => (
              <button key={t.id} type="button" aria-pressed={d.desperdicios.includes(t.id)}
                className={`tag-desp escolha ${t.classe} ${d.desperdicios.includes(t.id) ? 'ativo' : ''}`}
                onClick={() => setD({ ...d, desperdicios: alternarDesperdicio(d.desperdicios, t.id) })}>{t.id}</button>
            ))}
          </div>
        </Campo>
        <Campo rotulo="Causa raiz" erro={mostra('causa_raiz')}><input type="text" placeholder="Entrega sem horário combinado" {...campo('causa_raiz')} /></Campo>
        <Campo rotulo="Ação (o que será feito)" erro={mostra('acao')}><input type="text" placeholder="Agendar entregas com 48 h" {...campo('acao')} /></Campo>
        <div className="campos-lado">
          <Campo rotulo="Responsável" erro={mostra('responsavel')}>
            <input type="text" list="resp-gemba" {...campo('responsavel')} />
            <datalist id="resp-gemba">{responsaveis.map((x) => <option key={x} value={x} />)}</datalist>
          </Campo>
          <Campo rotulo="Prazo (opcional)" erro={mostra('prazo')} dica={d.prazo ? null : 'Sem prazo.'}>
            <span className="linha-add">
              <input type="date" min={hoje} value={d.prazo ?? ''} onChange={(e) => setD({ ...d, prazo: e.target.value || null })} />
              {d.prazo && <button type="button" className="btn-mini" onClick={() => setD({ ...d, prazo: null })}>Sem prazo</button>}
            </span>
          </Campo>
        </div>
        <div className="form-acoes">
          <button type="button" className="btn btn-sec" onClick={onFechar}>Cancelar</button>
          <button type="submit" className="btn btn-pri">Registrar observação</button>
        </div>
      </form>
    </Folha>
  )
}

function SeletorStatus({ o, onMover }) {
  return (
    <label className="mover">
      <span className="sr">Coluna de {o.local}</span>
      <select value={o.status} onChange={(e) => onMover(o, e.target.value)}>
        {STATUS_PENDENCIA.map((s) => <option key={s.id} value={s.id}>{s.rotulo}</option>)}
      </select>
    </label>
  )
}

function CartaoGemba({ o, hoje, onMover, onAbrir }) {
  const vencido = prazoVencido(o, hoje)
  return (
    <article className={`card-gemba ${o.status === 'resolvido' ? 'resolvido' : ''}`}>
      {o.foto && <img className="foto-gemba" src={o.foto} alt="" />}
      <button className="card-gemba-corpo" onClick={() => onAbrir(o)}>
        <span className="local-gemba"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>{o.local}</span>
        <span className="desc-pend">{o.descricao}</span>
        <Tags tipos={o.desperdicios} />
        <span className="pedido-info"><b>{o.responsavel}</b>{' · '}
          {o.prazo ? <span className={vencido ? 'tag-vencido' : ''}>prazo {formatarData(o.prazo)}{vencido ? ' · vencido' : ''}</span> : 'sem prazo'}
        </span>
      </button>
      <div className="pedido-acoes"><SeletorStatus o={o} onMover={onMover} /></div>
    </article>
  )
}

function FolhaDetalheGemba({ o, hoje, onMover, onFechar }) {
  const vencido = prazoVencido(o, hoje)
  return (
    <Folha titulo={o.local} onFechar={onFechar}>
      <div className="detalhe-pend">
        {o.foto && <img className="foto-pend" src={o.foto} alt={`Foto: ${o.descricao}`} />}
        <Tags tipos={o.desperdicios} />
        <p className="detalhe-desc">{o.descricao}</p>
        <dl className="dados-pend">
          <div><dt>Causa raiz</dt><dd>{o.causa_raiz}</dd></div>
          <div><dt>Ação</dt><dd>{o.acao}</dd></div>
          <div><dt>Responsável</dt><dd>{o.responsavel}</dd></div>
          <div><dt>Prazo</dt><dd className={vencido ? 'txt-verm' : ''}>{o.prazo ? formatarData(o.prazo) : 'Sem prazo'}{vencido ? ' (vencido)' : ''}</dd></div>
          <div><dt>Registrada</dt><dd>{formatarData(o.data)} · {o.registrado_por}</dd></div>
          <div><dt>Situação</dt><dd>{rotuloStatusPendencia(o.status)}</dd></div>
        </dl>
        <Campo rotulo="Mover para"><SeletorStatus o={o} onMover={onMover} /></Campo>
      </div>
    </Folha>
  )
}

// Os filtros moram na casca (qualidade.jsx) para o relatório usar os mesmos.
export default function AbaGemba({ usuario, filtros, onFiltros }) {
  const { obra } = useObra()
  const [estado, setEstado] = useState({ carregando: true, erro: null })
  const [observacoes, setObservacoes] = useState([])
  const [folha, setFolha] = useState(null)
  const [aviso, setAviso] = useState(null)
  const hoje = hojeISO()
  const autor = usuario?.nome ?? 'Engenheiro'

  async function carregar() {
    setEstado({ carregando: true, erro: null })
    const { data, erro } = await listarGemba()
    if (erro) { setEstado({ carregando: false, erro }); return }
    setObservacoes(data)
    setEstado({ carregando: false, erro: null })
  }

  useEffect(() => { carregar() }, [obra?.id])

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), 3000)
    return () => clearTimeout(t)
  }, [aviso])

  async function criar(d) {
    setFolha(null)
    const nova = novaObservacao(d, { hoje, usuario: autor })
    const temp = { ...nova, id: idProvisorio() }
    setObservacoes((lista) => [...lista, temp])
    const { data, erro } = await criarObservacaoGemba(nova)
    if (erro) {
      setObservacoes((lista) => lista.filter((o) => o.id !== temp.id))
      setAviso(`Não foi possível registrar: ${erro}`)
      return
    }
    setObservacoes((lista) => lista.map((o) => (o.id === temp.id ? data : o)))
    setAviso('Observação registrada em Pendente')
  }

  async function mover(o, status) {
    const depois = moverObservacao(o, status)
    setObservacoes((lista) => lista.map((x) => (x.id === o.id ? depois : x)))
    const { erro } = await salvarObservacaoGemba(depois)
    if (erro) {
      setObservacoes((lista) => lista.map((x) => (x.id === o.id ? o : x)))
      setAviso(`Não foi possível mover: ${erro}`)
      return
    }
    setAviso(`Movida para ${rotuloStatusPendencia(status)}`)
  }

  if (estado.carregando) return <p className="nota">Carregando as observações…</p>
  if (estado.erro) {
    return (
      <div className="vazio" role="alert">
        <h3>As observações não carregaram</h3>
        <p>{estado.erro} Confira a internet e tente de novo.</p>
        <button className="btn btn-pri" onClick={carregar}>Tentar de novo</button>
      </div>
    )
  }

  const novaBtn = <button className="btn btn-pri" onClick={() => setFolha({ tipo: 'nova' })}>Nova observação</button>
  const ranking = rankingDesperdicios(observacoes)
  const maior = Math.max(1, ranking[0]?.total ?? 1)
  const lista = filtrarGemba(observacoes, filtros, hoje)
  const responsaveis = [...new Set(observacoes.map((o) => o.responsavel))].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  const aberta = folha?.tipo === 'detalhe' && observacoes.find((o) => o.id === folha.id)
  const mudar = (c, v) => onFiltros({ ...filtros, [c]: v })

  return (
    <>
      {observacoes.length === 0 ? (
        <Vazio icone="qualidade" titulo="Nenhuma observação de Gemba nesta obra"
          texto="Caminhe pela obra e anote o que é desperdício: espera, retrabalho, transporte… Cada observação leva a causa raiz e a ação.">
          {novaBtn}
        </Vazio>
      ) : (
        <>
          <section className="cartao">
            <div className="cartao-cab"><h2 className="secao">Onde a obra mais perde</h2><span className="contagem">{observacoes.length} observações</span></div>
            <ol className="ranking">
              {ranking.map((r) => (
                <li key={r.tipo}>
                  <button className={`ranking-linha ${filtros.tipo === r.tipo ? 'ativo' : ''}`} onClick={() => mudar('tipo', filtros.tipo === r.tipo ? '' : r.tipo)} aria-pressed={filtros.tipo === r.tipo}>
                    <span className="ranking-nome">{r.tipo}</span>
                    <span className="ranking-barra"><i className={classeDoDesperdicio(r.tipo)} style={{ width: `${(r.total / maior) * 100}%` }} /></span>
                    <b>{r.total}</b>
                  </button>
                </li>
              ))}
            </ol>
          </section>
          <div className="filtros-linha">
            <label className="filtro filtro-busca"><span>Buscar</span><input type="search" value={filtros.busca} placeholder="Local, descrição, ação…" onChange={(e) => mudar('busca', e.target.value)} /></label>
            <label className="filtro"><span>Desperdício</span>
              <select value={filtros.tipo} onChange={(e) => mudar('tipo', e.target.value)}>
                <option value="">Todos</option>
                {TIPOS_DESPERDICIO.map((t) => <option key={t.id} value={t.id}>{t.id}</option>)}
              </select>
            </label>
            <label className="filtro"><span>Prazo</span>
              <select value={filtros.prazo} onChange={(e) => mudar('prazo', e.target.value)}>
                {FILTROS_PRAZO_GEMBA.map((f) => <option key={f.id} value={f.id}>{f.rotulo}</option>)}
              </select>
            </label>
          </div>
          <div className="barra-acoes">{novaBtn}</div>
          <div className="gemba-kanban">
            {STATUS_PENDENCIA.map((s) => {
              const daColuna = lista.filter((o) => o.status === s.id)
              return (
                <section key={s.id} className="coluna-gemba" aria-label={s.rotulo}>
                  <div className="coluna-cab"><h2 className="secao">{s.rotulo}</h2><span className="contagem">{daColuna.length}</span></div>
                  {daColuna.length === 0
                    ? <p className="coluna-vazia">Nada aqui{filtros.tipo || filtros.busca || filtros.prazo !== 'todos' ? ' com esses filtros' : ''}.</p>
                    : daColuna.map((o) => <CartaoGemba key={o.id} o={o} hoje={hoje} onMover={mover} onAbrir={(x) => setFolha({ tipo: 'detalhe', id: x.id })} />)}
                </section>
              )
            })}
          </div>
        </>
      )}
      {folha?.tipo === 'nova' && <FormObservacao responsaveis={responsaveis} usuario={autor} onSalvar={criar} onFechar={() => setFolha(null)} />}
      {aberta && <FolhaDetalheGemba o={aberta} hoje={hoje} onMover={mover} onFechar={() => setFolha(null)} />}
      {aviso && <div className="aviso-toast" role="status">{aviso}</div>}
    </>
  )
}
