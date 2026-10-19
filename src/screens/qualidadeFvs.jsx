// QUALIDADE · aba FVS (Ficha de Verificação de Serviço): vistorias com checklist OK / NC / N.A.,
// o tratamento das não conformidades (com timeline) e os modelos de ficha da empresa.
import { useEffect, useState } from 'react'
import { useObra } from '../lib/ObraContext.jsx'
import {
  listarFvs, salvarModeloFvs, criarVistoria, salvarVistoria, criarNaoConformidade, salvarNaoConformidade,
} from '../lib/dados.js'
import {
  CATEGORIAS_FVS, GRUPOS_FVS, RESPOSTAS_FVS, SEVERIDADES, rotuloSeveridade, rotuloStatusNC, acoesDaNC, podeEditarModelos,
  numeracaoDosItens, progressoDaVistoria, podeFinalizarVistoria, ncDoItem, podeResponderItem, responderItem, finalizarVistoria,
  validarNovaVistoria, novaVistoria, validarNC, novaNC, aplicarAcaoNC, diasEmAberto, ordenarNCs, kpisDaFVS,
  modeloEmBranco, validarModelo, montarModelo, contarItensDoModelo,
} from '../lib/qualidade.js'
import { formatarData, hojeISO } from '../lib/datas.js'
import { Vazio } from '../components/index.jsx'
import { Campo, Folha, Confirmar } from '../components/formulario.jsx'

const CLASSE_NC = { aberta: 'parada', encaminhada: 'atencao', corrigida: 'azul', fechada: 'ok' }
const CLASSE_SEV = { alta: 'parada', media: 'atencao', baixa: 'neutra' }
const curta = (iso) => formatarData(iso).slice(0, 5)

let contadorTemp = 0
const idProvisorio = () => `temp-${++contadorTemp}`

// Barra dividida: verde OK, vermelho NC, cinza-azulado N.A., cinza pendente.
function BarraVistoria({ p }) {
  const pct = (n) => (p.total ? (n / p.total) * 100 : 0)
  return (
    <span className="barra-fvs" role="img" aria-label={`${p.ok} OK, ${p.nc} NC, ${p.na} N.A., ${p.pendentes} pendentes`}>
      <i className="ok" style={{ width: `${pct(p.ok)}%` }} />
      <i className="nc" style={{ width: `${pct(p.nc)}%` }} />
      <i className="na" style={{ width: `${pct(p.na)}%` }} />
    </span>
  )
}

function Fotos({ fotos, onMudar }) {
  function escolher(e) {
    const novas = [...(e.target.files ?? [])].map((f) => URL.createObjectURL(f))
    if (novas.length) onMudar([...fotos, ...novas])
  }
  return (
    <Campo rotulo="Fotos (opcional)">
      <input type="file" accept="image/*" capture="environment" multiple onChange={escolher} />
      {fotos.length > 0 && (
        <div className="fotos-nc">
          {fotos.map((f, i) => (
            <figure key={i}>
              <img src={f} alt={`Foto ${i + 1}`} />
              <button type="button" className="btn-mini" onClick={() => onMudar(fotos.filter((_, k) => k !== i))}>Tirar</button>
            </figure>
          ))}
        </div>
      )}
    </Campo>
  )
}

// ---------- registrar a NC ao marcar um item como NC ----------
function FolhaRegistrarNC({ numeroItem, item, sugestoes, onSalvar, onFechar }) {
  const [d, setD] = useState({ fotos: [], descricao: '', solucao: '', severidade: '', responsavel: '' })
  const [enviou, setEnviou] = useState(false)
  const erros = validarNC(d)
  const mostra = (c) => enviou && erros[c]

  function enviar(e) {
    e.preventDefault()
    setEnviou(true)
    if (Object.keys(erros).length === 0) onSalvar(d)
  }

  return (
    <Folha titulo={`Não conformidade · item ${numeroItem}`} onFechar={onFechar}>
      <p className="form-sub">{item.titulo}</p>
      <form className="form" onSubmit={enviar} noValidate>
        <Fotos fotos={d.fotos} onMudar={(fotos) => setD({ ...d, fotos })} />
        <Campo rotulo="Problema encontrado" erro={mostra('descricao')}>
          <textarea rows="3" value={d.descricao} placeholder="Subida no box com 1,40 m" onChange={(e) => setD({ ...d, descricao: e.target.value })} />
        </Campo>
        <Campo rotulo="Solução proposta" erro={mostra('solucao')}>
          <textarea rows="2" value={d.solucao} placeholder="Completar a subida até 1,80 m" onChange={(e) => setD({ ...d, solucao: e.target.value })} />
        </Campo>
        <Campo rotulo="Severidade" erro={mostra('severidade')}>
          <div className="sim-nao" role="radiogroup" aria-label="Severidade">
            {SEVERIDADES.map((s) => (
              <button key={s.id} type="button" role="radio" aria-checked={d.severidade === s.id}
                className={`sev-${s.id} ${d.severidade === s.id ? 'ativo' : ''}`} onClick={() => setD({ ...d, severidade: s.id })}>{s.rotulo}</button>
            ))}
          </div>
        </Campo>
        <Campo rotulo="Responsável pela correção" erro={mostra('responsavel')}>
          <input type="text" list="resp-nc" value={d.responsavel} placeholder="Impermeabiliza Já" onChange={(e) => setD({ ...d, responsavel: e.target.value })} />
          <datalist id="resp-nc">{sugestoes.map((x) => <option key={x} value={x} />)}</datalist>
        </Campo>
        <div className="form-acoes">
          <button type="button" className="btn btn-sec" onClick={onFechar}>Cancelar</button>
          <button type="submit" className="btn btn-pri">Registrar NC</button>
        </div>
      </form>
    </Folha>
  )
}

// ---------- checklist da vistoria ----------
function Checklist({ v, ncs, onVoltar, onResponder, onMarcarNC, onFinalizar, onAbrirNC }) {
  const p = progressoDaVistoria(v)
  const num = numeracaoDosItens(v.grupos)
  const travada = v.status === 'concluida'
  return (
    <>
      <button className="voltar" onClick={onVoltar}>← Vistorias</button>
      <div className="cab-vistoria">
        <h2 className="titulo-tela">{v.modelo_codigo} · {v.modelo_nome}</h2>
        <p className="subtitulo">{v.ambiente} · {formatarData(v.data)} · {v.vistoriado_por}</p>
        {travada && <span className="selo-concluida">✓ Concluída em {formatarData(v.concluida_em)}</span>}
      </div>
      <div className="progresso-fvs">
        <BarraVistoria p={p} />
        <div className="progresso-txt">
          <span><b className="conf">{p.conformidade === null ? '—' : `${p.conformidade}%`}</b> de conformidade</span>
          <span>{p.verificados} de {p.total} itens verificados</span>
        </div>
      </div>
      {v.grupos.map((g) => (
        <section key={g.nome} className="cartao">
          <div className="cartao-cab"><h3 className="secao">{g.nome}</h3></div>
          <ul className="itens-fvs">
            {g.itens.map((it) => {
              const resp = v.respostas[it.id]
              const nc = ncDoItem(ncs, v.id, it.id)
              const pode = podeResponderItem(v, ncs, it.id)
              return (
                <li key={it.id} className={resp ? `resp-${resp}` : ''}>
                  <span className="item-fvs"><b>{num.get(it.id)}</b> {it.titulo}</span>
                  <div className="ok-nc-na" role="radiogroup" aria-label={`Item ${num.get(it.id)}`}>
                    {RESPOSTAS_FVS.map((r) => (
                      <button key={r.id} role="radio" aria-checked={resp === r.id} className={`${r.id} ${resp === r.id ? 'ativo' : ''}`}
                        disabled={!pode || travada}
                        onClick={() => (r.id === 'nc' ? onMarcarNC(v, it) : onResponder(v, it.id, r.id))}>{r.rotulo}</button>
                    ))}
                  </div>
                  {nc && <button className="link-nc" onClick={() => onAbrirNC(nc)}>{nc.codigo} · {rotuloStatusNC(nc.status)}</button>}
                </li>
              )
            })}
          </ul>
        </section>
      ))}
      {!travada && (
        <div className="barra-acoes">
          <button className="btn btn-pri" disabled={!podeFinalizarVistoria(v)} onClick={() => onFinalizar(v)}>Finalizar vistoria</button>
          {p.pendentes > 0 && <span className="nota">Faltam {p.pendentes} {p.pendentes === 1 ? 'item' : 'itens'} para finalizar.</span>}
        </div>
      )}
    </>
  )
}

function FolhaNovaVistoria({ modelos, onSalvar, onFechar }) {
  const [d, setD] = useState({ modelo_id: '', ambiente: '' })
  const [enviou, setEnviou] = useState(false)
  const erros = validarNovaVistoria(d)
  return (
    <Folha titulo="Nova vistoria" onFechar={onFechar}>
      <form className="form" noValidate onSubmit={(e) => { e.preventDefault(); setEnviou(true); if (!Object.keys(erros).length) onSalvar(d) }}>
        <Campo rotulo="Ficha (modelo)" erro={enviou && erros.modelo_id}>
          <select value={d.modelo_id} onChange={(e) => setD({ ...d, modelo_id: e.target.value })}>
            <option value="">Escolha a ficha</option>
            {modelos.map((m) => <option key={m.id} value={m.id}>{m.codigo} · {m.nome} (v{m.versao})</option>)}
          </select>
        </Campo>
        <Campo rotulo="Ambiente" erro={enviou && erros.ambiente}>
          <input type="text" value={d.ambiente} placeholder="Banheiro social · Térreo" onChange={(e) => setD({ ...d, ambiente: e.target.value })} />
        </Campo>
        <div className="form-acoes">
          <button type="button" className="btn btn-sec" onClick={onFechar}>Cancelar</button>
          <button type="submit" className="btn btn-pri">Abrir checklist</button>
        </div>
      </form>
    </Folha>
  )
}

// ---------- detalhe da NC (fluxo + timeline) ----------
function FolhaDetalheNC({ nc, hoje, papel, onAcao, onFechar }) {
  const [reprovando, setReprovando] = useState(false)
  const [motivo, setMotivo] = useState('')
  const acoes = acoesDaNC(nc, papel)
  return (
    <Folha titulo={`${nc.codigo} · ${nc.titulo}`} onFechar={onFechar}>
      <div className="detalhe-pend">
        <div className="pills">
          <span className={`pill ${CLASSE_NC[nc.status]}`}>{rotuloStatusNC(nc.status)}</span>
          <span className={`pill ${CLASSE_SEV[nc.severidade]}`}>Severidade {rotuloSeveridade(nc.severidade).toLowerCase()}</span>
          <span className="pill neutra">{diasEmAberto(nc, hoje)} {diasEmAberto(nc, hoje) === 1 ? 'dia' : 'dias'} {nc.status === 'fechada' ? 'até fechar' : 'em aberto'}</span>
        </div>
        <dl className="dados-pend">
          <div><dt>Serviço</dt><dd>{nc.servico}</dd></div>
          <div><dt>Ambiente</dt><dd>{nc.ambiente}</dd></div>
          <div><dt>Item</dt><dd>{nc.item_numero} · {nc.item_titulo}</dd></div>
          <div><dt>Responsável</dt><dd>{nc.responsavel}</dd></div>
        </dl>
        <div><span className="campo-rot">Problema</span><p>{nc.descricao}</p></div>
        <div><span className="campo-rot">Solução proposta</span><p>{nc.solucao}</p></div>
        {nc.fotos.length > 0 && <div className="fotos-nc">{nc.fotos.map((f, i) => <figure key={i}><img src={f} alt={`Foto ${i + 1} da ${nc.codigo}`} /></figure>)}</div>}
        <div>
          <span className="campo-rot">Linha do tempo</span>
          <ol className="timeline">{nc.timeline.map((t, i) => <li key={i}><b>{curta(t.data)} {t.hora}</b> {t.texto}</li>)}</ol>
        </div>
        {reprovando ? (
          <div className="resolver reprovar">
            <Campo rotulo="Por que foi reprovada (opcional)">
              <input type="text" value={motivo} placeholder="Ainda com 1,60 m no canto" onChange={(e) => setMotivo(e.target.value)} />
            </Campo>
            <div className="form-acoes">
              <button className="btn btn-sec" onClick={() => setReprovando(false)}>Cancelar</button>
              <button className="btn btn-pri" onClick={() => onAcao(nc, 'reprovar', motivo)}>Reprovar e devolver</button>
            </div>
          </div>
        ) : (
          <div className="form-acoes">
            {acoes.map((a) => (
              <button key={a.id} className={`btn ${a.id === 'reprovar' ? 'btn-sec' : 'btn-pri'}`}
                onClick={() => (a.id === 'reprovar' ? setReprovando(true) : onAcao(nc, a.id))}>{a.rotulo}</button>
            ))}
          </div>
        )}
        {nc.status === 'corrigida' && acoes.length === 0 && <p className="nota">Aguardando o engenheiro aprovar ou reprovar a correção.</p>}
      </div>
    </Folha>
  )
}

// ---------- editor de modelo ----------
function FolhaModelo({ inicial, modelos, idAtual, onSalvar, onFechar }) {
  const [d, setD] = useState(inicial)
  const [enviou, setEnviou] = useState(false)
  const [remover, setRemover] = useState(null) // { g, i } item, ou { g } grupo
  const erros = validarModelo(d, modelos, idAtual) ?? { grupos: [] }
  const mostra = (c) => enviou && erros[c]

  const mudarGrupo = (gi, campo, valor) => setD({ ...d, grupos: d.grupos.map((g, k) => (k === gi ? { ...g, [campo]: valor } : g)) })
  const mudarItem = (gi, ii, titulo) => mudarGrupo(gi, 'itens', d.grupos[gi].itens.map((it, k) => (k === ii ? { ...it, titulo } : it)))
  const tirar = ({ g, i }) => (i === undefined
    ? setD({ ...d, grupos: d.grupos.filter((_, k) => k !== g) })
    : mudarGrupo(g, 'itens', d.grupos[g].itens.filter((_, k) => k !== i)))

  function pedirRemocao(alvo) {
    const vazio = alvo.i === undefined ? d.grupos[alvo.g].itens.every((it) => !it.titulo.trim()) : !d.grupos[alvo.g].itens[alvo.i].titulo.trim()
    if (vazio) tirar(alvo)
    else setRemover(alvo)
  }

  if (remover) {
    const texto = remover.i === undefined ? `Tirar o grupo "${d.grupos[remover.g].nome}" e todos os itens dele?` : `Tirar o item "${d.grupos[remover.g].itens[remover.i].titulo}"?`
    return <Confirmar titulo="Remover da ficha" rotuloSim="Remover" texto={texto} onFechar={() => setRemover(null)} onSim={() => { tirar(remover); setRemover(null) }} />
  }

  return (
    <Folha titulo={idAtual ? `Editar ${inicial.codigo}` : 'Novo modelo de FVS'} onFechar={onFechar}>
      {idAtual && <p className="form-sub">Salvar cria a próxima versão. Vistorias já feitas continuam com a versão delas.</p>}
      <form className="form" noValidate onSubmit={(e) => { e.preventDefault(); setEnviou(true); if (!validarModelo(d, modelos, idAtual)) onSalvar(d) }}>
        <div className="campos-lado">
          <Campo rotulo="Código" erro={mostra('codigo')}><input type="text" value={d.codigo} onChange={(e) => setD({ ...d, codigo: e.target.value })} /></Campo>
          <Campo rotulo="Categoria" erro={mostra('categoria')}>
            <select value={d.categoria} onChange={(e) => setD({ ...d, categoria: e.target.value })}>
              <option value="">Escolha</option>
              {CATEGORIAS_FVS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Campo>
        </div>
        <Campo rotulo="Nome do serviço" erro={mostra('nome')}><input type="text" value={d.nome} placeholder="Revestimento Cerâmico" onChange={(e) => setD({ ...d, nome: e.target.value })} /></Campo>
        {mostra('semGrupo') && <span className="campo-erro" role="alert">{erros.semGrupo}</span>}
        {d.grupos.map((g, gi) => (
          <div key={gi} className="grupo-modelo">
            <div className="linha-add">
              <input type="text" list="grupos-fvs" value={g.nome} aria-label={`Nome do grupo ${gi + 1}`} onChange={(e) => mudarGrupo(gi, 'nome', e.target.value)} />
              <button type="button" className="btn-mini" onClick={() => pedirRemocao({ g: gi })}>Tirar grupo</button>
            </div>
            {enviou && erros.grupos[gi]?.nome && <span className="campo-erro">{erros.grupos[gi].nome}</span>}
            <ol className="itens-modelo">
              {g.itens.map((it, ii) => (
                <li key={ii} className="linha-add">
                  <span className="num-item">{gi + 1}.{ii + 1}</span>
                  <input type="text" value={it.titulo} placeholder="O que conferir" aria-label={`Item ${gi + 1}.${ii + 1}`} onChange={(e) => mudarItem(gi, ii, e.target.value)} />
                  <button type="button" className="btn-mini" onClick={() => pedirRemocao({ g: gi, i: ii })} aria-label={`Remover item ${gi + 1}.${ii + 1}`}>Tirar</button>
                </li>
              ))}
            </ol>
            {enviou && erros.grupos[gi]?.itens && <span className="campo-erro">{erros.grupos[gi].itens}</span>}
            <button type="button" className="btn-mini" onClick={() => mudarGrupo(gi, 'itens', [...g.itens, { id: null, titulo: '' }])}>+ Item</button>
          </div>
        ))}
        <datalist id="grupos-fvs">{GRUPOS_FVS.map((x) => <option key={x} value={x} />)}</datalist>
        <button type="button" className="btn btn-sec" onClick={() => setD({ ...d, grupos: [...d.grupos, { nome: GRUPOS_FVS[d.grupos.length] ?? '', itens: [{ id: null, titulo: '' }] }] })}>+ Grupo</button>
        <div className="form-acoes">
          <button type="button" className="btn btn-sec" onClick={onFechar}>Cancelar</button>
          <button type="submit" className="btn btn-pri">Salvar modelo</button>
        </div>
      </form>
    </Folha>
  )
}

// ---------- a aba ----------
export default function AbaFVS({ usuario }) {
  const { obra } = useObra()
  const [estado, setEstado] = useState({ carregando: true, erro: null })
  const [modelos, setModelos] = useState([])
  const [vistorias, setVistorias] = useState([])
  const [ncs, setNcs] = useState([])
  const [sub, setSub] = useState('vistorias')
  const [abertaId, setAbertaId] = useState(null)
  const [folha, setFolha] = useState(null)
  const [aviso, setAviso] = useState(null)
  const hoje = hojeISO()
  const autor = usuario?.nome ?? 'Engenheiro'
  const papel = usuario?.role ?? 'Engenheiro'

  async function carregar() {
    setEstado({ carregando: true, erro: null })
    const { data, erro } = await listarFvs()
    if (erro) { setEstado({ carregando: false, erro }); return }
    setModelos(data.modelos)
    setVistorias(data.vistorias)
    setNcs(data.ncs)
    setEstado({ carregando: false, erro: null })
  }

  useEffect(() => { carregar() }, [obra?.id])

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), 3000)
    return () => clearTimeout(t)
  }, [aviso])

  async function gravarVistoria(depois, mensagem) {
    const antes = vistorias.find((v) => v.id === depois.id)
    setVistorias((lista) => lista.map((v) => (v.id === depois.id ? depois : v)))
    const { erro } = await salvarVistoria(depois)
    if (erro) {
      setVistorias((lista) => lista.map((v) => (v.id === depois.id ? antes : v)))
      setAviso(`Não foi possível salvar: ${erro}`)
      return false
    }
    if (mensagem) setAviso(mensagem)
    return true
  }

  async function abrirVistoria(d) {
    setFolha(null)
    const modelo = modelos.find((m) => m.id === d.modelo_id)
    const nova = novaVistoria(modelo, d.ambiente, { hoje, usuario: autor })
    const temp = { ...nova, id: idProvisorio() }
    setVistorias((lista) => [...lista, temp])
    setAbertaId(temp.id)
    const { data, erro } = await criarVistoria(nova)
    if (erro) {
      setVistorias((lista) => lista.filter((v) => v.id !== temp.id))
      setAbertaId(null)
      setAviso(`Não foi possível abrir a vistoria: ${erro}`)
      return
    }
    setVistorias((lista) => lista.map((v) => (v.id === temp.id ? data : v)))
    setAbertaId(data.id)
  }

  async function registrarNC(v, item, d) {
    setFolha(null)
    const nc = novaNC(d, { vistoria: v, itemId: item.id, hoje, usuario: autor })
    const temp = { ...nc, id: idProvisorio(), codigo: 'NC-…' }
    setNcs((lista) => [...lista, temp])
    const ok = await gravarVistoria(responderItem(v, item.id, 'nc'))
    if (!ok) { setNcs((lista) => lista.filter((x) => x.id !== temp.id)); return }
    const { data, erro } = await criarNaoConformidade(nc)
    if (erro) {
      setNcs((lista) => lista.filter((x) => x.id !== temp.id))
      await gravarVistoria(v)
      setAviso(`Não foi possível registrar a NC: ${erro}`)
      return
    }
    setNcs((lista) => lista.map((x) => (x.id === temp.id ? data : x)))
    setAviso(`${data.codigo} registrada`)
  }

  async function acaoNC(nc, acaoId, motivo = '') {
    setFolha(null)
    const depois = aplicarAcaoNC(nc, acaoId, { usuario: autor, papel, hoje, motivo })
    setNcs((lista) => lista.map((x) => (x.id === nc.id ? depois : x)))
    const { erro } = await salvarNaoConformidade(depois)
    if (erro) {
      setNcs((lista) => lista.map((x) => (x.id === nc.id ? nc : x)))
      setAviso(`Não foi possível salvar: ${erro}`)
      return
    }
    setAviso(`${nc.codigo}: ${rotuloStatusNC(depois.status).toLowerCase()}`)
  }

  async function salvarModelo(d, anterior) {
    setFolha(null)
    const modelo = montarModelo(d, anterior)
    const antes = modelos
    setModelos((lista) => (anterior ? lista.map((m) => (m.id === anterior.id ? modelo : m)) : [...lista, { ...modelo, id: idProvisorio() }]))
    const { data, erro } = await salvarModeloFvs(modelo)
    if (erro) { setModelos(antes); setAviso(`Não foi possível salvar o modelo: ${erro}`); return }
    setModelos((lista) => (anterior ? lista.map((m) => (m.id === anterior.id ? data : m)) : [...lista.filter((m) => !String(m.id).startsWith('temp-')), data]))
    setAviso(`${data.codigo} salvo (versão ${data.versao})`)
  }

  if (estado.carregando) return <p className="nota">Carregando as fichas…</p>
  if (estado.erro) {
    return (
      <div className="vazio" role="alert">
        <h3>As fichas não carregaram</h3>
        <p>{estado.erro} Confira a internet e tente de novo.</p>
        <button className="btn btn-pri" onClick={carregar}>Tentar de novo</button>
      </div>
    )
  }

  const aberta = abertaId && vistorias.find((v) => v.id === abertaId)
  const ncAberta = folha?.tipo === 'nc' && ncs.find((x) => x.id === folha.id)
  const sugestoesResp = [...new Set(ncs.map((x) => x.responsavel))]
  const folhas = (
    <>
      {folha?.tipo === 'nova' && <FolhaNovaVistoria modelos={modelos} onSalvar={abrirVistoria} onFechar={() => setFolha(null)} />}
      {folha?.tipo === 'registrar' && (
        <FolhaRegistrarNC numeroItem={numeracaoDosItens(folha.v.grupos).get(folha.item.id)} item={folha.item} sugestoes={sugestoesResp}
          onSalvar={(d) => registrarNC(folha.v, folha.item, d)} onFechar={() => setFolha(null)} />
      )}
      {folha?.tipo === 'finalizar' && (
        <Confirmar titulo="Finalizar vistoria" rotuloSim="Finalizar" onFechar={() => setFolha(null)}
          texto={`Depois de finalizada, a vistoria ${folha.v.modelo_codigo} · ${folha.v.ambiente} fica só para leitura.`}
          onSim={() => { const v = folha.v; setFolha(null); gravarVistoria(finalizarVistoria(v, hoje), 'Vistoria concluída') }} />
      )}
      {ncAberta && <FolhaDetalheNC nc={ncAberta} hoje={hoje} papel={papel} onAcao={acaoNC} onFechar={() => setFolha(null)} />}
      {folha?.tipo === 'modelo' && (
        <FolhaModelo inicial={folha.modelo ? structuredClone({ codigo: folha.modelo.codigo, nome: folha.modelo.nome, categoria: folha.modelo.categoria, grupos: folha.modelo.grupos }) : modeloEmBranco(modelos)}
          modelos={modelos} idAtual={folha.modelo?.id ?? null} onSalvar={(d) => salvarModelo(d, folha.modelo)} onFechar={() => setFolha(null)} />
      )}
      {aviso && <div className="aviso-toast" role="status">{aviso}</div>}
    </>
  )

  if (aberta) {
    return (
      <>
        <Checklist v={aberta} ncs={ncs} onVoltar={() => setAbertaId(null)}
          onResponder={(v, itemId, r) => gravarVistoria(responderItem(v, itemId, r))}
          onMarcarNC={(v, item) => setFolha({ tipo: 'registrar', v, item })}
          onFinalizar={(v) => setFolha({ tipo: 'finalizar', v })}
          onAbrirNC={(nc) => setFolha({ tipo: 'nc', id: nc.id })} />
        {folhas}
      </>
    )
  }

  const k = kpisDaFVS(vistorias, ncs)
  return (
    <>
      <div className="resumo">
        <div className={`stat ${k.conformidade !== null && k.conformidade < 85 ? 'ocre' : 'verde'}`}><span className="rot">% conforme geral</span><span className="val">{k.conformidade === null ? '—' : `${k.conformidade}%`}</span></div>
        <div className={`stat ${k.ncsAbertas ? 'verm' : 'verde'}`}><span className="rot">NCs abertas</span><span className="val">{k.ncsAbertas}</span></div>
        <div className="stat"><span className="rot">Vistorias concluídas</span><span className="val">{k.concluidas}<small>{k.emAndamento ? `+${k.emAndamento} em andamento` : ''}</small></span></div>
      </div>
      <div className="abas-tela" role="tablist" aria-label="Partes da FVS">
        {[['vistorias', `Vistorias (${vistorias.length})`], ['ncs', `Não conformidades (${ncs.length})`], ['modelos', `Modelos (${modelos.length})`]].map(([id, rot]) => (
          <button key={id} role="tab" aria-selected={sub === id} className={`chip-filtro ${sub === id ? 'ativo' : ''}`} onClick={() => setSub(id)}>{rot}</button>
        ))}
      </div>

      {sub === 'vistorias' && (
        <>
          <div className="barra-acoes"><button className="btn btn-pri" onClick={() => setFolha({ tipo: 'nova' })}>Nova vistoria</button></div>
          {vistorias.length === 0 ? (
            <Vazio icone="qualidade" titulo="Nenhuma vistoria FVS nesta obra"
              texto="Escolha uma ficha (ex.: Impermeabilização) e o ambiente, e confira item por item com OK, NC ou N.A." />
          ) : (
            <div className="grid-pend">
              {[...vistorias].sort((a, b) => Number(a.status === 'concluida') - Number(b.status === 'concluida') || b.data.localeCompare(a.data)).map((v) => {
                const p = progressoDaVistoria(v)
                return (
                  <button key={v.id} className="card-pend" onClick={() => setAbertaId(v.id)}>
                    <div className="card-pend-topo">
                      <b className="num-pend">{v.modelo_codigo}</b>
                      {v.status === 'concluida' ? <span className="pill ok">✓ Concluída</span> : <span className="pill atencao">Em andamento</span>}
                    </div>
                    <span className="desc-pend">{v.modelo_nome}</span>
                    <span className="pedido-info">{v.ambiente} · {formatarData(v.data)}</span>
                    <BarraVistoria p={p} />
                    <span className="pedido-info"><b>{p.conformidade === null ? '—' : `${p.conformidade}%`}</b> conforme · {p.verificados} de {p.total} verificados · {p.nc} NC</span>
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}

      {sub === 'ncs' && (ncs.length === 0 ? (
        <Vazio icone="qualidade" titulo="Nenhuma não conformidade" texto="Quando um item da vistoria for marcado como NC, ele aparece aqui para ser tratado até o fechamento." />
      ) : (
        <div className="grid-pend">
          {ordenarNCs(ncs).map((nc) => (
            <button key={nc.id} className={`card-pend ${nc.status === 'fechada' ? 'resolvido' : ''}`} onClick={() => setFolha({ tipo: 'nc', id: nc.id })}>
              <div className="card-pend-topo">
                <b className="num-pend">{nc.codigo}</b>
                <span className="pills"><span className={`pill ${CLASSE_SEV[nc.severidade]}`}>{rotuloSeveridade(nc.severidade)}</span><span className={`pill ${CLASSE_NC[nc.status]}`}>{rotuloStatusNC(nc.status)}</span></span>
              </div>
              <span className="desc-pend">{nc.titulo}</span>
              <span className="pedido-info">{nc.servico} · {nc.ambiente}</span>
              <span className="pedido-info"><b>{nc.responsavel}</b> · {diasEmAberto(nc, hoje)} {diasEmAberto(nc, hoje) === 1 ? 'dia' : 'dias'} {nc.status === 'fechada' ? 'até fechar' : 'em aberto'}</span>
            </button>
          ))}
        </div>
      ))}

      {sub === 'modelos' && (
        <>
          {podeEditarModelos(papel) && <div className="barra-acoes"><button className="btn btn-pri" onClick={() => setFolha({ tipo: 'modelo', modelo: null })}>Novo modelo</button></div>}
          <div className="grid-pend">
            {modelos.map((m) => (
              <div key={m.id} className="card-pend">
                <div className="card-pend-topo"><b className="num-pend">{m.codigo}</b><span className="pill azul">{m.categoria}</span></div>
                <span className="desc-pend">{m.nome}</span>
                <span className="pedido-info">Versão {m.versao} · {m.grupos.length} {m.grupos.length === 1 ? 'grupo' : 'grupos'} · {contarItensDoModelo(m)} itens</span>
                <span className="pedido-info">{m.grupos.map((g) => g.nome).join(' · ')}</span>
                {podeEditarModelos(papel) && <div className="pedido-acoes"><button className="btn-mini" onClick={() => setFolha({ tipo: 'modelo', modelo: m })}>Editar</button></div>}
              </div>
            ))}
          </div>
        </>
      )}
      {folhas}
    </>
  )
}
