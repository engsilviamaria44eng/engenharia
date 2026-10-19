// MATERIAIS — Kanban de pedidos da obra atual. Cada cartão é um lote de material.
// Mover é por botões (sem arrastar). Tudo otimista: a tela muda na hora e desfaz se der erro.
import { useEffect, useState } from 'react'
import { useObra } from '../lib/ObraContext.jsx'
import { listarPedidos, listarCatalogoMateriais, listarFrentes, criarPedido, salvarPedido } from '../lib/dados.js'
import {
  STATUS, CATEGORIAS, rotuloStatus, rotuloQuantidade, proximoStatus, statusAnterior, podeVoltar, frentesQueRecebemMaterial, estaAtrasado, temAlertaRecebimento,
  diasNaColuna, leadTime, contadores, validarNovoPedido, novoPedido, validarMudanca, aplicarMudanca,
} from '../lib/materiais.js'
import { formatarData, hojeISO } from '../lib/datas.js'
import { Vazio } from '../components/index.jsx'

function Campo({ rotulo, erro, children, dica }) {
  return (
    <label className="campo">
      <span className="campo-rot">{rotulo}</span>
      {children}
      {dica && !erro && <span className="campo-dica">{dica}</span>}
      {erro && <span className="campo-erro" role="alert">{erro}</span>}
    </label>
  )
}

function SimNao({ valor, onMudar, nome }) {
  return (
    <div className="sim-nao" role="radiogroup" aria-label={nome}>
      <button type="button" role="radio" aria-checked={valor === true} className={valor === true ? 'ativo sim' : ''} onClick={() => onMudar(true)}>Sim</button>
      <button type="button" role="radio" aria-checked={valor === false} className={valor === false ? 'ativo nao' : ''} onClick={() => onMudar(false)}>Não</button>
    </div>
  )
}

function CampoFrente({ frentes, valor, onMudar, onSair }) {
  if (frentes.length === 0) {
    return <input type="text" value={valor} onChange={(e) => onMudar(e.target.value)} onBlur={onSair} placeholder="Laje do 2º pavimento" />
  }
  return (
    <select value={valor} onChange={(e) => onMudar(e.target.value)} onBlur={onSair}>
      <option value="">Escolha a frente</option>
      {frentes.map((f) => <option key={f} value={f}>{f}</option>)}
    </select>
  )
}

// ---------- folhas (formulários) ----------
function Folha({ titulo, onFechar, children }) {
  useEffect(() => {
    const aoTeclar = (e) => { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [])
  return (
    <div className="veu" onClick={(e) => { if (e.target === e.currentTarget) onFechar() }}>
      <div className="folha folha-form" role="dialog" aria-modal="true" aria-label={titulo}>
        <h3>{titulo}</h3>
        {children}
      </div>
    </div>
  )
}

function FormNovo({ catalogo, frentes, onSalvar, onFechar }) {
  const [d, setD] = useState({ material_id: '', quantidade: '', frente: '', prioridade: 'normal' })
  const [tocados, setTocados] = useState({})
  const erros = validarNovoPedido(d)
  const mostra = (c) => (tocados[c] || tocados._enviar) && erros[c]
  const mat = catalogo.find((m) => m.id === d.material_id)

  function enviar(e) {
    e.preventDefault()
    setTocados({ _enviar: true })
    if (Object.keys(erros).length === 0) onSalvar(d)
  }

  return (
    <Folha titulo="Novo pedido de material" onFechar={onFechar}>
      <form className="form" onSubmit={enviar} noValidate>
        <Campo rotulo="Material" erro={mostra('material_id')}>
          <select value={d.material_id} onChange={(e) => setD({ ...d, material_id: e.target.value })} onBlur={() => setTocados({ ...tocados, material_id: true })}>
            <option value="">Escolha do catálogo</option>
            {Object.entries(CATEGORIAS).map(([cat, nome]) => (
              <optgroup key={cat} label={nome}>
                {catalogo.filter((m) => m.categoria === cat).map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </optgroup>
            ))}
          </select>
        </Campo>
        <Campo rotulo={`Quantidade${mat ? ` (${mat.unidade})` : ''}`} erro={mostra('quantidade')}>
          <input type="number" inputMode="decimal" min="0" step="any" value={d.quantidade} placeholder="50"
            onChange={(e) => setD({ ...d, quantidade: e.target.value })} onBlur={() => setTocados({ ...tocados, quantidade: true })} />
        </Campo>
        <Campo rotulo="Frente onde vai ser usado" erro={mostra('frente')}>
          <CampoFrente frentes={frentes} valor={d.frente} onMudar={(v) => setD({ ...d, frente: v })} onSair={() => setTocados({ ...tocados, frente: true })} />
        </Campo>
        <Campo rotulo="Prioridade" erro={mostra('prioridade')}>
          <div className="sim-nao">
            <button type="button" className={d.prioridade === 'normal' ? 'ativo sim' : ''} aria-pressed={d.prioridade === 'normal'} onClick={() => setD({ ...d, prioridade: 'normal' })}>Normal</button>
            <button type="button" className={d.prioridade === 'critico' ? 'ativo nao' : ''} aria-pressed={d.prioridade === 'critico'} onClick={() => setD({ ...d, prioridade: 'critico' })}>Crítico</button>
          </div>
        </Campo>
        <div className="form-acoes">
          <button type="button" className="btn btn-sec" onClick={onFechar}>Cancelar</button>
          <button type="submit" className="btn btn-pri">Criar pedido</button>
        </div>
      </form>
    </Folha>
  )
}

function FormMover({ pedido, destino, material, frentes, onSalvar, onFechar }) {
  const hoje = hojeISO()
  const [d, setD] = useState({
    fornecedor: pedido.fornecedor || '', previsao_entrega: pedido.previsao_entrega || hoje,
    qtd_bate_nf: null, estado_ok: null, avarias: '', foto_nf: '', frente: pedido.frente || '',
  })
  const [tocados, setTocados] = useState({})
  const erros = validarMudanca(destino, d)
  const mostra = (c) => (tocados[c] || tocados._enviar) && erros[c]

  function escolherFoto(e) {
    const arq = e.target.files?.[0]
    if (arq) setD({ ...d, foto_nf: URL.createObjectURL(arq) })
  }

  function enviar(e) {
    e.preventDefault()
    setTocados({ _enviar: true })
    if (Object.keys(erros).length === 0) onSalvar(d)
  }

  const titulos = {
    comprado: 'Marcar como comprado', almoxarifado: 'Recebimento no almoxarifado', entregue: 'Entregar na frente',
    solicitar: 'Voltar para Solicitar', cotacao: 'Mover para Em cotação',
  }

  return (
    <Folha titulo={titulos[destino]} onFechar={onFechar}>
      <p className="form-sub">{material ? material.nome : 'Material'} · {rotuloQuantidade(pedido.quantidade, material?.unidade)}</p>
      <form className="form" onSubmit={enviar} noValidate>
        {destino === 'comprado' && (
          <>
            <Campo rotulo="Fornecedor" erro={mostra('fornecedor')}>
              <input type="text" value={d.fornecedor} placeholder="Casa do Construtor Centro"
                onChange={(e) => setD({ ...d, fornecedor: e.target.value })} onBlur={() => setTocados({ ...tocados, fornecedor: true })} />
            </Campo>
            <Campo rotulo="Previsão de entrega" erro={mostra('previsao_entrega')}>
              <input type="date" value={d.previsao_entrega}
                onChange={(e) => setD({ ...d, previsao_entrega: e.target.value })} onBlur={() => setTocados({ ...tocados, previsao_entrega: true })} />
            </Campo>
          </>
        )}
        {destino === 'almoxarifado' && (
          <>
            <Campo rotulo="A quantidade bate com a nota fiscal?" erro={mostra('qtd_bate_nf')}>
              <SimNao nome="Quantidade bate com a nota fiscal" valor={d.qtd_bate_nf} onMudar={(v) => setD({ ...d, qtd_bate_nf: v })} />
            </Campo>
            <Campo rotulo="O material chegou em perfeito estado?" erro={mostra('estado_ok')}>
              <SimNao nome="Material em perfeito estado" valor={d.estado_ok} onMudar={(v) => setD({ ...d, estado_ok: v })} />
            </Campo>
            {(d.qtd_bate_nf === false || d.estado_ok === false) && (
              <p className="alerta-form">Uma resposta "não" deixa o cartão marcado com alerta para conferir.</p>
            )}
            <Campo rotulo="Avarias (opcional)" dica="Ex.: 3 sacos rasgados na descarga">
              <textarea rows="3" value={d.avarias} onChange={(e) => setD({ ...d, avarias: e.target.value })} />
            </Campo>
            <Campo rotulo="Foto da nota fiscal (opcional)">
              <input type="file" accept="image/*" capture="environment" onChange={escolherFoto} />
              {d.foto_nf && <img className="foto-nf" src={d.foto_nf} alt="Prévia da nota fiscal" />}
            </Campo>
          </>
        )}
        {destino === 'entregue' && (
          <Campo rotulo="Frente onde o material foi aplicado" erro={mostra('frente')}>
            <CampoFrente frentes={frentes} valor={d.frente} onMudar={(v) => setD({ ...d, frente: v })} onSair={() => setTocados({ ...tocados, frente: true })} />
          </Campo>
        )}
        {(destino === 'solicitar' || destino === 'cotacao') && (
          <p className="form-sub">O pedido vai para "{rotuloStatus(destino)}". A mudança fica registrada no histórico.</p>
        )}
        <div className="form-acoes">
          <button type="button" className="btn btn-sec" onClick={onFechar}>Cancelar</button>
          <button type="submit" className="btn btn-pri">Confirmar</button>
        </div>
      </form>
    </Folha>
  )
}

// ---------- cartão ----------
function CartaoPedido({ p, material, hoje, onMover }) {
  const atrasado = estaAtrasado(p, hoje)
  const alerta = temAlertaRecebimento(p)
  const prox = proximoStatus(p.status)
  const ant = statusAnterior(p.status)
  const dias = diasNaColuna(p, hoje)
  const lt = leadTime(p)
  const cat = material?.categoria

  return (
    <article className={`pedido ${atrasado ? 'atrasado' : ''}`}>
      <div className="pedido-topo">
        <b>{material ? material.nome : 'Material'}</b>
        {atrasado && <span className="tag verm">Atrasado</span>}
      </div>
      <span className="pedido-qtd">{rotuloQuantidade(p.quantidade, material?.unidade)}</span>
      <span className="pedido-frente">{p.frente}</span>
      <div className="pills">
        {p.prioridade === 'critico' && <span className="pill parada">Crítico</span>}
        {cat && <span className={`pill ${cat === 'grosso' ? 'azul' : 'ok'}`}>{CATEGORIAS[cat]}</span>}
        {alerta && <span className="pill atencao">Conferir recebimento</span>}
      </div>
      {(p.fornecedor || p.previsao_entrega) && (
        <span className="pedido-info">
          {p.fornecedor}{p.fornecedor && p.previsao_entrega ? ' · ' : ''}
          {p.previsao_entrega && p.status === 'comprado' ? `previsão ${formatarData(p.previsao_entrega)}` : ''}
        </span>
      )}
      {alerta && p.recebimento.avarias && <span className="pedido-info">Avarias: {p.recebimento.avarias}</span>}
      <span className="pedido-info">
        há <b>{dias} {dias === 1 ? 'dia' : 'dias'}</b> nesta coluna{lt !== null ? <> · lead time <b>{lt} {lt === 1 ? 'dia' : 'dias'}</b></> : ''}
      </span>
      <div className="pedido-acoes">
        {podeVoltar(p.status) && (
          <button className="btn-mini" onClick={() => onMover(p, ant)} aria-label={`Voltar para ${rotuloStatus(ant)}`}>Voltar</button>
        )}
        {prox && (
          <button className="btn-mini pri" onClick={() => onMover(p, prox)}>Mover para {rotuloStatus(prox)}</button>
        )}
      </div>
    </article>
  )
}

// ---------- tela ----------
export default function Materiais() {
  const { obra } = useObra()
  const [estado, setEstado] = useState({ carregando: true, erro: null })
  const [pedidos, setPedidos] = useState([])
  const [catalogo, setCatalogo] = useState([])
  const [frentes, setFrentes] = useState([])
  const [verEntregues, setVerEntregues] = useState(false)
  const [folha, setFolha] = useState(null)
  const [aviso, setAviso] = useState(null)
  const hoje = hojeISO()

  async function carregar() {
    setEstado({ carregando: true, erro: null })
    const [rp, rc, rf] = await Promise.all([listarPedidos(), listarCatalogoMateriais(), listarFrentes()])
    const erro = rp.erro || rc.erro || rf.erro
    if (erro) {
      setEstado({ carregando: false, erro: 'Não foi possível carregar os pedidos de material. Confira a internet e tente de novo.' })
      return
    }
    setPedidos(rp.data)
    setCatalogo(rc.data)
    setFrentes(frentesQueRecebemMaterial(rf.data))
    setEstado({ carregando: false, erro: null })
  }

  useEffect(() => { carregar() }, [obra?.id])

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), 3000)
    return () => clearTimeout(t)
  }, [aviso])

  const materialDe = (id) => catalogo.find((m) => m.id === id)

  async function salvarNovo(d) {
    setFolha(null)
    const temp = { ...novoPedido(d, hoje, `temp-${Date.now()}`), obra_id: obra.id }
    setPedidos((lista) => [...lista, temp])
    const { data, erro } = await criarPedido(novoPedido(d, hoje, null))
    if (erro) {
      setPedidos((lista) => lista.filter((p) => p.id !== temp.id))
      setAviso(`Não foi possível criar o pedido: ${erro}`)
      return
    }
    setPedidos((lista) => lista.map((p) => (p.id === temp.id ? data : p)))
    setAviso('Pedido criado em Solicitar')
  }

  async function confirmarMudanca(pedido, destino, d) {
    setFolha(null)
    const antes = pedido
    const depois = aplicarMudanca(pedido, destino, d, hoje)
    setPedidos((lista) => lista.map((p) => (p.id === pedido.id ? depois : p)))
    const { erro } = await salvarPedido(depois)
    if (erro) {
      setPedidos((lista) => lista.map((p) => (p.id === pedido.id ? antes : p)))
      setAviso(`Não foi possível mover o pedido: ${erro}`)
      return
    }
    setAviso(destino === 'entregue' ? 'Entregue na frente. O pedido saiu do quadro ativo.' : `Movido para ${rotuloStatus(destino)}`)
  }

  if (estado.carregando) return <p className="nota">Carregando os pedidos de material…</p>
  if (estado.erro) {
    return (
      <div className="vazio" role="alert">
        <h3>Os pedidos não carregaram</h3>
        <p>{estado.erro}</p>
        <button className="btn btn-pri" onClick={carregar}>Tentar de novo</button>
      </div>
    )
  }

  const novoBtn = <button className="btn btn-pri" onClick={() => setFolha({ tipo: 'novo' })}>Novo pedido</button>
  const formNovo = folha?.tipo === 'novo' && (
    <FormNovo catalogo={catalogo} frentes={frentes} onSalvar={salvarNovo} onFechar={() => setFolha(null)} />
  )

  if (pedidos.length === 0) {
    return (
      <>
        <Vazio icone="orcamento" titulo="Nenhum pedido de material nesta obra"
          texto="Peça o primeiro material: escolha no catálogo, diga a quantidade e a frente. Leva menos de 30 segundos.">
          {novoBtn}
        </Vazio>
        {formNovo}
        {aviso && <div className="aviso-toast" role="status">{aviso}</div>}
      </>
    )
  }

  const c = contadores(pedidos, hoje)
  const entregues = pedidos.filter((p) => p.status === 'entregue').length
  const colunas = STATUS.filter((s) => s.id !== 'entregue' || verEntregues)

  return (
    <>
      <div className="resumo">
        <div className="stat"><span className="rot">Em cotação</span><span className="val">{c.emCotacao}</span></div>
        <div className={`stat ${c.chegandoSemana ? 'verde' : ''}`}><span className="rot">Chegando esta semana</span><span className="val">{c.chegandoSemana}</span></div>
        <div className={`stat ${c.atrasados ? 'verm' : 'verde'}`}><span className="rot">Atrasados</span><span className="val">{c.atrasados}</span></div>
      </div>
      <div className="barra-acoes">
        {novoBtn}
        <button className={`chip-filtro ${verEntregues ? 'ativo' : ''}`} aria-pressed={verEntregues} onClick={() => setVerEntregues(!verEntregues)}>
          Ver entregues ({entregues})
        </button>
      </div>
      <p className="nota so-celular">Arraste o quadro para os lados para ver as outras colunas.</p>
      <div className="kanban" role="list" aria-label="Pedidos por etapa">
        {colunas.map((s) => {
          const daColuna = pedidos.filter((p) => p.status === s.id)
          return (
            <section key={s.id} className="coluna" role="listitem" aria-label={s.rotulo}>
              <div className="coluna-cab"><h2 className="secao">{s.rotulo}</h2><span className="contagem">{daColuna.length}</span></div>
              {daColuna.length === 0
                ? <p className="coluna-vazia">Nenhum pedido aqui.</p>
                : daColuna.map((p) => (
                  <CartaoPedido key={p.id} p={p} material={materialDe(p.material_id)} hoje={hoje}
                    onMover={(ped, destino) => setFolha({ tipo: 'mover', pedido: ped, destino })} />
                ))}
            </section>
          )
        })}
      </div>
      {formNovo}
      {folha?.tipo === 'mover' && (
        <FormMover pedido={folha.pedido} destino={folha.destino} material={materialDe(folha.pedido.material_id)} frentes={frentes}
          onSalvar={(d) => confirmarMudanca(folha.pedido, folha.destino, d)} onFechar={() => setFolha(null)} />
      )}
      {aviso && <div className="aviso-toast" role="status">{aviso}</div>}
    </>
  )
}
