// QUALIDADE · aba PENDÊNCIAS: a vistoria rápida. Cada cartão é um problema com foto, quem
// corrige (empresa), quem acompanha (responsável) e prazo. Fluxo por botões:
// Pendente → Em andamento → Resolvido (com a foto da correção). Observações com data e hora.
import { useEffect, useState } from 'react'
import { useObra } from '../lib/ObraContext.jsx'
import { listarPendencias, criarPendencia, salvarPendencia } from '../lib/dados.js'
import {
  STATUS_PENDENCIA, FILTROS_PRAZO, rotuloStatusPendencia, acaoDaPendencia, proximoStatusPendencia, estaVencida,
  kpisDePendencias, pendentesPorResponsavel, responsaveisDe, empresasDe, filtrarPendencias, validarPendencia,
  novaPendencia, validarResolucao, avancarPendencia, reabrirPendencia, comObservacao, linhasDoHistorico, proximoNumero,
} from '../lib/qualidade.js'
import { formatarData, hojeISO } from '../lib/datas.js'
import { Icon, Vazio } from '../components/index.jsx'
import { Campo, Folha, Confirmar } from '../components/formulario.jsx'

// Código provisório da pendência recém-criada, até a camada de dados devolver o definitivo.
let contadorTemp = 0
const idProvisorio = () => `temp-${++contadorTemp}`

const CLASSE_STATUS = { pendente: 'parada', em_andamento: 'atencao', resolvido: 'ok' }

function BadgeStatus({ status }) {
  return <span className={`pill ${CLASSE_STATUS[status]}`}>{rotuloStatusPendencia(status)}</span>
}

// Escolher/tirar foto: prévia no aparelho (URL.createObjectURL), sem enviar a lugar nenhum.
// Também usado pelo Gemba Walk.
export function CampoFoto({ rotulo, valor, onMudar, erro, dica }) {
  function escolher(e) {
    const arq = e.target.files?.[0]
    if (arq) onMudar(URL.createObjectURL(arq))
  }
  return (
    <Campo rotulo={rotulo} erro={erro} dica={dica}>
      <input type="file" accept="image/*" capture="environment" onChange={escolher} />
      {valor && <img className="foto-previa" src={valor} alt="Prévia da foto" />}
    </Campo>
  )
}

function FormPendencia({ responsaveis, empresas, numero, usuario, onSalvar, onFechar }) {
  const hoje = hojeISO()
  const [d, setD] = useState({ foto: null, descricao: '', local: '', pavimento: '', empresa: '', responsavel: usuario, prazo: hoje, observacao: '', data_vistoria: hoje })
  const [tocados, setTocados] = useState({})
  const erros = validarPendencia(d)
  const mostra = (c) => (tocados[c] || tocados._enviar) && erros[c]
  const campo = (c) => ({ value: d[c], onChange: (e) => setD({ ...d, [c]: e.target.value }), onBlur: () => setTocados({ ...tocados, [c]: true }) })

  function enviar(e) {
    e.preventDefault()
    setTocados({ _enviar: true })
    if (Object.keys(erros).length === 0) onSalvar(d)
  }

  return (
    <Folha titulo={`Nova pendência #${numero}`} onFechar={onFechar}>
      <p className="form-sub">Vistoria de hoje ({formatarData(hoje)}) por {usuario}.</p>
      <form className="form" onSubmit={enviar} noValidate>
        <CampoFoto rotulo="Foto do problema" valor={d.foto} onMudar={(foto) => setD({ ...d, foto })} dica="No celular, abre direto a câmera." />
        <Campo rotulo="O que está errado" erro={mostra('descricao')}>
          <textarea rows="3" placeholder="Infiltração no forro, perto do ralo" {...campo('descricao')} />
        </Campo>
        <div className="campos-lado">
          <Campo rotulo="Local" erro={mostra('local')}>
            <input type="text" placeholder="Banheiro social" {...campo('local')} />
          </Campo>
          <Campo rotulo="Pavimento (opcional)">
            <input type="text" placeholder="2º pavimento" {...campo('pavimento')} />
          </Campo>
        </div>
        <Campo rotulo="Empresa que corrige" erro={mostra('empresa')}>
          <input type="text" list="empresas-pendencia" placeholder="Silva Alvenarias" {...campo('empresa')} />
          <datalist id="empresas-pendencia">{empresas.map((x) => <option key={x} value={x} />)}</datalist>
        </Campo>
        <div className="campos-lado">
          <Campo rotulo="Responsável (quem acompanha)" erro={mostra('responsavel')}>
            <input type="text" list="resp-pendencia" {...campo('responsavel')} />
            <datalist id="resp-pendencia">{responsaveis.map((x) => <option key={x} value={x} />)}</datalist>
          </Campo>
          <Campo rotulo="Prazo" erro={mostra('prazo')}>
            <input type="date" min={hoje} {...campo('prazo')} />
          </Campo>
        </div>
        <Campo rotulo="Observação (opcional)">
          <input type="text" placeholder="Combinar com a empresa na sexta" {...campo('observacao')} />
        </Campo>
        <div className="form-acoes">
          <button type="button" className="btn btn-sec" onClick={onFechar}>Cancelar</button>
          <button type="submit" className="btn btn-pri">Registrar pendência</button>
        </div>
      </form>
    </Folha>
  )
}

function FolhaDetalhe({ p, hoje, onAvancar, onReabrir, onObservar, onFechar }) {
  const [evidencia, setEvidencia] = useState(null)
  const [resolvendo, setResolvendo] = useState(false)
  const [tentou, setTentou] = useState(false)
  const [nota, setNota] = useState('')
  const [reabrindo, setReabrindo] = useState(false)
  const proximo = proximoStatusPendencia(p.status)
  const vencida = estaVencida(p, hoje)

  if (reabrindo) {
    return (
      <Confirmar titulo={`Reabrir a pendência #${p.numero}`} rotuloSim="Reabrir" onFechar={() => setReabrindo(false)}
        texto="Ela volta para Em andamento e a foto da correção sai. Use quando a correção não ficou boa."
        onSim={() => { setReabrindo(false); onReabrir(p) }} />
    )
  }

  function clicarAvancar() {
    if (proximo !== 'resolvido') { onAvancar(p, null); return }
    if (!resolvendo) { setResolvendo(true); return }
    setTentou(true)
    if (!validarResolucao(evidencia)) onAvancar(p, evidencia)
  }

  return (
    <Folha titulo={`Pendência #${p.numero}`} onFechar={onFechar}>
      <div className="detalhe-pend">
        <div className="pills"><BadgeStatus status={p.status} />{vencida && <span className="tag verm">VENCIDO</span>}</div>
        <div className={`fotos-pend ${p.foto_evidencia ? 'duas' : ''}`}>
          {p.foto ? <figure><img src={p.foto} alt={`Foto do problema: ${p.descricao}`} /><figcaption>Problema</figcaption></figure> : <div className="sem-foto">Sem foto</div>}
          {p.foto_evidencia && <figure><img src={p.foto_evidencia} alt="Foto da correção" /><figcaption>Correção ({formatarData(p.data_resolucao)})</figcaption></figure>}
        </div>
        <p className="detalhe-desc">{p.descricao}</p>
        <dl className="dados-pend">
          <div><dt>Local</dt><dd>{p.local}{p.pavimento ? ` · ${p.pavimento}` : ''}</dd></div>
          <div><dt>Empresa</dt><dd>{p.empresa}</dd></div>
          <div><dt>Responsável</dt><dd>{p.responsavel}</dd></div>
          <div><dt>Prazo</dt><dd className={vencida ? 'txt-verm' : ''}>{formatarData(p.prazo)}</dd></div>
          <div><dt>Vistoria</dt><dd>{formatarData(p.data_vistoria)} · {p.vistoriado_por}</dd></div>
        </dl>

        {resolvendo && (
          <div className="resolver">
            <CampoFoto rotulo="Foto da correção (evidência)" valor={evidencia} onMudar={setEvidencia} erro={tentou ? validarResolucao(evidencia) : null} />
          </div>
        )}
        <div className="form-acoes">
          {p.status === 'resolvido' && <button className="btn btn-sec" onClick={() => setReabrindo(true)}>Reabrir</button>}
          {resolvendo && <button className="btn btn-sec" onClick={() => { setResolvendo(false); setEvidencia(null); setTentou(false) }}>Cancelar</button>}
          {proximo && <button className="btn btn-pri" onClick={clicarAvancar}>{resolvendo ? 'Confirmar resolução' : acaoDaPendencia(p.status)}</button>}
        </div>

        <div className="campo">
          <span className="campo-rot">Observações</span>
          <form className="linha-add" onSubmit={(e) => { e.preventDefault(); if (nota.trim()) { onObservar(p, nota); setNota('') } }}>
            <input type="text" value={nota} placeholder="Escreva uma nota" onChange={(e) => setNota(e.target.value)} />
            <button type="submit" className="btn btn-sec" disabled={!nota.trim()}>Anotar</button>
          </form>
          {linhasDoHistorico(p.observacoes).length === 0
            ? <span className="campo-dica">Nenhuma observação ainda.</span>
            : <ul className="historico-obs">{linhasDoHistorico(p.observacoes).map((l, i) => <li key={i}>{l}</li>)}</ul>}
        </div>
      </div>
    </Folha>
  )
}

function CartaoPendencia({ p, hoje, onAbrir }) {
  const vencida = estaVencida(p, hoje)
  return (
    <button className={`card-pend ${p.status === 'resolvido' ? 'resolvido' : ''}`} onClick={() => onAbrir(p)}>
      <div className="card-pend-topo">
        <b className="num-pend">#{p.numero}</b>
        <span className="pills"><BadgeStatus status={p.status} />{vencida && <span className="tag verm">VENCIDO</span>}</span>
      </div>
      {p.foto ? <img className="foto-pend" src={p.foto} alt="" /> : <div className="foto-pend sem-foto">Sem foto</div>}
      <span className="desc-pend">{p.descricao}</span>
      <span className="pedido-info">{p.local}{p.pavimento ? ` · ${p.pavimento}` : ''} · {p.empresa}</span>
      <span className="pedido-info"><b>{p.responsavel}</b> · prazo <b className={vencida ? 'txt-verm' : ''}>{formatarData(p.prazo)}</b></span>
    </button>
  )
}

// Os filtros moram na casca (qualidade.jsx) para o relatório usar os mesmos.
export default function AbaPendencias({ usuario, filtros, onFiltros }) {
  const { obra } = useObra()
  const [estado, setEstado] = useState({ carregando: true, erro: null })
  const [pendencias, setPendencias] = useState([])
  const [folha, setFolha] = useState(null)
  const [aviso, setAviso] = useState(null)
  const hoje = hojeISO()
  const autor = usuario?.nome ?? 'Engenheiro'

  async function carregar() {
    setEstado({ carregando: true, erro: null })
    const { data, erro } = await listarPendencias()
    if (erro) { setEstado({ carregando: false, erro }); return }
    setPendencias(data)
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
    const nova = novaPendencia(d, { hoje, usuario: autor })
    const temp = { ...nova, id: idProvisorio(), numero: proximoNumero(pendencias) }
    setPendencias((lista) => [...lista, temp])
    const { data, erro } = await criarPendencia(nova)
    if (erro) {
      setPendencias((lista) => lista.filter((p) => p.id !== temp.id))
      setAviso(`Não foi possível registrar: ${erro}`)
      return
    }
    setPendencias((lista) => lista.map((p) => (p.id === temp.id ? data : p)))
    setAviso(`Pendência #${data.numero} registrada`)
  }

  async function gravar(depois, mensagem) {
    const antes = pendencias.find((p) => p.id === depois.id)
    setPendencias((lista) => lista.map((p) => (p.id === depois.id ? depois : p)))
    const { erro } = await salvarPendencia(depois)
    if (erro) {
      setPendencias((lista) => lista.map((p) => (p.id === depois.id ? antes : p)))
      setAviso(`Não foi possível salvar: ${erro}`)
      return
    }
    setAviso(mensagem)
  }

  if (estado.carregando) return <p className="nota">Carregando as pendências…</p>
  if (estado.erro) {
    return (
      <div className="vazio" role="alert">
        <h3>As pendências não carregaram</h3>
        <p>{estado.erro} Confira a internet e tente de novo.</p>
        <button className="btn btn-pri" onClick={carregar}>Tentar de novo</button>
      </div>
    )
  }

  const abrirNova = () => setFolha({ tipo: 'nova' })
  const k = kpisDePendencias(pendencias)
  const porResp = pendentesPorResponsavel(pendencias)
  const lista = filtrarPendencias(pendencias, filtros, hoje)
  const aberta = folha?.tipo === 'detalhe' && pendencias.find((p) => p.id === folha.id)
  const mudar = (campo, valor) => onFiltros({ ...filtros, [campo]: valor })

  return (
    <>
      {pendencias.length === 0 ? (
        <Vazio icone="qualidade" titulo="Nenhuma pendência nesta obra"
          texto="Na próxima volta pela obra, fotografe o que precisa de correção: diga o local, quem corrige e o prazo. Leva menos de um minuto.">
          <button className="btn btn-pri" onClick={abrirNova}>Registrar a primeira pendência</button>
        </Vazio>
      ) : (
        <>
          <div className="kpis">
            <div className="kpi neutro"><span className="val">{k.total}</span><span className="rot">Total</span></div>
            <div className="kpi verm"><span className="val">{k.pendentes}</span><span className="rot">Pendentes</span></div>
            <div className="kpi ambar"><span className="val">{k.andamento}</span><span className="rot">Em andamento</span></div>
            <div className="kpi verde"><span className="val">{k.resolvidos}</span><span className="rot">Resolvidos</span></div>
          </div>
          <section className="cartao">
            <div className="cartao-cab"><h2 className="secao">Pendentes por responsável</h2></div>
            {porResp.length === 0
              ? <p className="cartao-corpo nota">Nenhuma pendência em aberto.</p>
              : (
                <div className="badges-resp">
                  {porResp.map((r) => (
                    <button key={r.responsavel} className={`badge-resp ${filtros.responsavel === r.responsavel ? 'ativo' : ''}`}
                      onClick={() => mudar('responsavel', filtros.responsavel === r.responsavel ? '' : r.responsavel)}>
                      {r.responsavel} <b>{r.total}</b>
                    </button>
                  ))}
                </div>
              )}
          </section>
          <div className="filtros-linha">
            <label className="filtro filtro-busca">
              <span>Buscar</span>
              <input type="search" value={filtros.busca} placeholder="Texto, local ou nº" onChange={(e) => mudar('busca', e.target.value)} />
            </label>
            <label className="filtro">
              <span>Status</span>
              <select value={filtros.status} onChange={(e) => mudar('status', e.target.value)}>
                <option value="">Todos</option>
                {STATUS_PENDENCIA.map((s) => <option key={s.id} value={s.id}>{s.rotulo}</option>)}
              </select>
            </label>
            <label className="filtro">
              <span>Responsável</span>
              <select value={filtros.responsavel} onChange={(e) => mudar('responsavel', e.target.value)}>
                <option value="">Todos</option>
                {responsaveisDe(pendencias).map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            <label className="filtro">
              <span>Prazo</span>
              <select value={filtros.prazo} onChange={(e) => mudar('prazo', e.target.value)}>
                {FILTROS_PRAZO.map((f) => <option key={f.id} value={f.id}>{f.rotulo}</option>)}
              </select>
            </label>
          </div>
          <div className="barra-acoes so-desktop"><button className="btn btn-pri" onClick={abrirNova}>Nova pendência</button></div>
          {lista.length === 0
            ? <p className="nota">Nenhuma pendência com esses filtros.</p>
            : <div className="grid-pend">{lista.map((p) => <CartaoPendencia key={p.id} p={p} hoje={hoje} onAbrir={(x) => setFolha({ tipo: 'detalhe', id: x.id })} />)}</div>}
        </>
      )}
      <button className="fab no-print" onClick={abrirNova} aria-label="Nova pendência (abre a câmera)"><Icon nome="camera" tamanho={28} /></button>

      {folha?.tipo === 'nova' && (
        <FormPendencia responsaveis={responsaveisDe(pendencias)} empresas={empresasDe(pendencias)} numero={proximoNumero(pendencias)}
          usuario={autor} onSalvar={criar} onFechar={() => setFolha(null)} />
      )}
      {aberta && (
        <FolhaDetalhe p={aberta} hoje={hoje} onFechar={() => setFolha(null)}
          onAvancar={(p, evid) => {
            const destino = proximoStatusPendencia(p.status)
            if (destino === 'resolvido') setFolha(null)
            gravar(avancarPendencia(p, { foto_evidencia: evid, hoje, usuario: autor }), destino === 'resolvido' ? `Pendência #${p.numero} resolvida` : `Pendência #${p.numero} em andamento`)
          }}
          onReabrir={(p) => gravar(reabrirPendencia(p, { usuario: autor }), `Pendência #${p.numero} reaberta`)}
          onObservar={(p, nota) => gravar(comObservacao(p, nota, { usuario: autor }), 'Observação anotada')} />
      )}
      {aviso && <div className="aviso-toast" role="status">{aviso}</div>}
    </>
  )
}
