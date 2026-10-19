// MEDIÇÃO DE EMPREITEIROS (engenheiro). Tela 1: o FLUXO DO CONTRATO em Kanban
// (Em elaboração → Enviado p/ aprovação → Aprovado/Ativo → Concluído), movido por botões.
// Aprovar abre o CADASTRO DO VALOR: contrato global (um valor) ou por escopo (itens).
// Tudo otimista: a tela muda na hora e desfaz se a gravação der erro.
import { useEffect, useState } from 'react'
import { useObra } from '../lib/ObraContext.jsx'
import { listarMedicoesDaObra, criarContrato, salvarContrato, criarMedicao, salvarMedicao } from '../lib/dados.js'
import FichaMedicao from './medicaoFicha.jsx'
import {
  STATUS_CONTRATO, UNIDADES, rotuloStatusContrato, formatarReais, formatarPct, resumoDoContrato, resumoDosAtivos,
  proximoStatusContrato, statusAnteriorContrato, podeMoverContrato, moverContrato, podeEditarValor,
  podeAbrirFicha, podeMedir, tipoDoContrato, acaoDeAvancar,
  validarNovoContrato, novoContrato, validarValor, totalDoEscopo, aplicarValor, valorParaFormulario,
  linhaVaziaDeEscopo, lerNumero, soNumero, arredondar2,
} from '../lib/medicoes.js'
import { Vazio } from '../components/index.jsx'
import { Campo, Folha, Confirmar } from '../components/formulario.jsx'

function FormNovoContrato({ onSalvar, onFechar }) {
  const [d, setD] = useState({ empreiteiro: '', descricao: '' })
  const [tocados, setTocados] = useState({})
  const erros = validarNovoContrato(d)
  const mostra = (c) => (tocados[c] || tocados._enviar) && erros[c]

  function enviar(e) {
    e.preventDefault()
    setTocados({ _enviar: true })
    if (Object.keys(erros).length === 0) onSalvar(d)
  }

  return (
    <Folha titulo="Novo contrato" onFechar={onFechar}>
      <form className="form" onSubmit={enviar} noValidate>
        <Campo rotulo="Empreiteiro" erro={mostra('empreiteiro')}>
          <input type="text" value={d.empreiteiro} placeholder="Gesso & Cia" autoFocus
            onChange={(e) => setD({ ...d, empreiteiro: e.target.value })} onBlur={() => setTocados({ ...tocados, empreiteiro: true })} />
        </Campo>
        <Campo rotulo="Serviço contratado" erro={mostra('descricao')}>
          <input type="text" value={d.descricao} placeholder="Forro de gesso em placas"
            onChange={(e) => setD({ ...d, descricao: e.target.value })} onBlur={() => setTocados({ ...tocados, descricao: true })} />
        </Campo>
        <p className="form-sub">O contrato nasce em "Em elaboração". O valor é cadastrado na aprovação.</p>
        <div className="form-acoes">
          <button type="button" className="btn btn-sec" onClick={onFechar}>Cancelar</button>
          <button type="submit" className="btn btn-pri">Criar contrato</button>
        </div>
      </form>
    </Folha>
  )
}

function FormValor({ contrato, inicial, titulo, onSalvar, onFechar }) {
  const [d, setD] = useState(inicial)
  const [enviou, setEnviou] = useState(false)
  const [remover, setRemover] = useState(null) // índice da linha a remover
  const erros = validarValor(d) ?? { itens: [] }
  const mostra = (c) => enviou && erros[c]
  const mostraItem = (i, c) => enviou && erros.itens[i]?.[c]
  const total = d.tipo === 'escopo' ? totalDoEscopo(d.itens) : (lerNumero(d.valor_global) ?? 0)

  const mudarItem = (i, campo, valor) => setD({ ...d, itens: d.itens.map((it, k) => (k === i ? { ...it, [campo]: valor } : it)) })
  const tirarLinha = (i) => setD({ ...d, itens: d.itens.filter((_, k) => k !== i) })

  function pedirRemocao(i) {
    const it = d.itens[i]
    if (it.descricao || it.quantidade || it.preco_unitario) setRemover(i)
    else tirarLinha(i)
  }

  function enviar(e) {
    e.preventDefault()
    setEnviou(true)
    if (!validarValor(d)) onSalvar(d)
  }

  if (remover !== null) {
    return (
      <Confirmar titulo="Remover item" rotuloSim="Remover" onFechar={() => setRemover(null)}
        texto={`Tirar "${d.itens[remover].descricao || 'este item'}" do contrato?`}
        onSim={() => { tirarLinha(remover); setRemover(null) }} />
    )
  }

  return (
    <Folha titulo={titulo} onFechar={onFechar}>
      <p className="form-sub">{contrato.empreiteiro} · {contrato.descricao}</p>
      <form className="form" onSubmit={enviar} noValidate>
        <Campo rotulo="Como o contrato foi fechado" erro={mostra('tipo')}>
          <div className="escolha-tipo" role="radiogroup" aria-label="Tipo de contrato">
            <button type="button" role="radio" aria-checked={d.tipo === 'global'} className={d.tipo === 'global' ? 'ativo' : ''} onClick={() => setD({ ...d, tipo: 'global' })}>
              <b>Global</b><span>Um valor total fechado</span>
            </button>
            <button type="button" role="radio" aria-checked={d.tipo === 'escopo'} className={d.tipo === 'escopo' ? 'ativo' : ''} onClick={() => setD({ ...d, tipo: 'escopo' })}>
              <b>Por escopo</b><span>Itens com quantidade e preço</span>
            </button>
          </div>
        </Campo>

        {d.tipo === 'global' && (
          <Campo rotulo="Valor total do contrato (R$)" erro={mostra('valor_global')}>
            <input type="text" inputMode="decimal" value={d.valor_global} placeholder="30.000,00"
              onChange={(e) => setD({ ...d, valor_global: soNumero(e.target.value) })} />
          </Campo>
        )}

        {d.tipo === 'escopo' && (
          <div className="campo">
            <span className="campo-rot">Itens do contrato</span>
            {mostra('escopo') && <span className="campo-erro" role="alert">{erros.escopo}</span>}
            <div className="escopo">
              {d.itens.map((it, i) => {
                const q = lerNumero(it.quantidade) ?? 0
                const p = lerNumero(it.preco_unitario) ?? 0
                return (
                  <div key={i} className="escopo-linha">
                    <label className="campo escopo-desc">
                      <span className="campo-rot">Item {i + 1}</span>
                      <input type="text" value={it.descricao} placeholder="Placas de drywall" onChange={(e) => mudarItem(i, 'descricao', e.target.value)} />
                      {mostraItem(i, 'descricao') && <span className="campo-erro">{erros.itens[i].descricao}</span>}
                    </label>
                    <label className="campo">
                      <span className="campo-rot">Unidade</span>
                      <select value={it.unidade} onChange={(e) => mudarItem(i, 'unidade', e.target.value)}>
                        {UNIDADES.map((u) => <option key={u.id} value={u.id}>{u.rotulo}</option>)}
                      </select>
                    </label>
                    <label className="campo">
                      <span className="campo-rot">Quantidade</span>
                      <input type="text" inputMode="decimal" value={it.quantidade} placeholder="200" onChange={(e) => mudarItem(i, 'quantidade', soNumero(e.target.value))} />
                      {mostraItem(i, 'quantidade') && <span className="campo-erro">{erros.itens[i].quantidade}</span>}
                    </label>
                    <label className="campo">
                      <span className="campo-rot">Preço unit. (R$)</span>
                      <input type="text" inputMode="decimal" value={it.preco_unitario} placeholder="80,00" onChange={(e) => mudarItem(i, 'preco_unitario', soNumero(e.target.value))} />
                      {mostraItem(i, 'preco_unitario') && <span className="campo-erro">{erros.itens[i].preco_unitario}</span>}
                    </label>
                    <div className="escopo-sub">
                      <span>Subtotal <b>{formatarReais(arredondar2(q * p))}</b></span>
                      <button type="button" className="btn-mini" onClick={() => pedirRemocao(i)} aria-label={`Remover item ${i + 1}`}>Remover</button>
                    </div>
                  </div>
                )
              })}
            </div>
            <button type="button" className="btn btn-sec" onClick={() => setD({ ...d, itens: [...d.itens, linhaVaziaDeEscopo()] })}>+ Acrescentar item</button>
          </div>
        )}

        {d.tipo && (
          <div className="total-contrato" aria-live="polite">
            <span>Valor total do contrato</span><b>{formatarReais(total)}</b>
          </div>
        )}
        <div className="form-acoes">
          <button type="button" className="btn btn-sec" onClick={onFechar}>Cancelar</button>
          <button type="submit" className="btn btn-pri">Salvar valor</button>
        </div>
      </form>
    </Folha>
  )
}

function CartaoContrato({ c, resumo, onMover, onEditarValor, onAbrirFicha }) {
  const prox = proximoStatusContrato(c.status)
  const ant = statusAnteriorContrato(c.status)
  return (
    <article className="pedido">
      <div className="pedido-topo"><b>{c.empreiteiro}</b></div>
      <span className="pedido-frente">{c.descricao}</span>
      <div className="pills">
        {tipoDoContrato(c.tipo) && <span className="pill azul">{tipoDoContrato(c.tipo).rotulo}</span>}
        {resumo.boletins > 0 && <span className="pill neutra">{resumo.boletins} {resumo.boletins === 1 ? 'boletim' : 'boletins'}</span>}
      </div>
      {resumo.total !== null && <span className="pedido-qtd">{formatarReais(resumo.total)}</span>}
      {podeAbrirFicha(c, resumo) && resumo.total !== null && (
        <>
          <span className="barra-rp" role="img" aria-label={`Medido ${formatarPct(resumo.pct)}`}><i style={{ width: `${resumo.pct}%` }} /></span>
          <span className="pedido-info">Medido <b>{formatarPct(resumo.pct)}</b> · {formatarReais(resumo.medido)} · saldo {formatarReais(resumo.saldo)}</span>
        </>
      )}
      <div className="pedido-acoes">
        {ant && <button className="btn-mini" onClick={() => onMover(c, ant)} aria-label={`Voltar para ${rotuloStatusContrato(ant)}`}>Voltar</button>}
        {prox && <button className="btn-mini pri" onClick={() => onMover(c, prox)}>{acaoDeAvancar(c.status)}</button>}
      </div>
      {podeAbrirFicha(c, resumo) && (
        <div className="pedido-acoes">
          <button className={`btn-mini ${podeMedir(c) ? 'pri' : ''}`} onClick={() => onAbrirFicha(c)}>{podeMedir(c) ? 'Ficha de medição' : 'Ver medições'}</button>
          {podeEditarValor(c, resumo) && <button className="btn-mini" onClick={() => onEditarValor(c)}>Editar valor</button>}
        </div>
      )}
    </article>
  )
}

export default function Medicao() {
  const { obra } = useObra()
  const [estado, setEstado] = useState({ carregando: true, erro: null })
  const [contratos, setContratos] = useState([])
  const [itens, setItens] = useState([])
  const [medicoes, setMedicoes] = useState([])
  const [folha, setFolha] = useState(null)
  const [aviso, setAviso] = useState(null)
  const [fichaId, setFichaId] = useState(null)

  async function carregar() {
    setEstado({ carregando: true, erro: null })
    const { data, erro } = await listarMedicoesDaObra()
    if (erro) {
      setEstado({ carregando: false, erro: `${erro} Confira a internet e tente de novo.` })
      return
    }
    setContratos(data.contratos)
    setItens(data.itens)
    setMedicoes(data.medicoes)
    setEstado({ carregando: false, erro: null })
  }

  useEffect(() => { carregar() }, [obra?.id])

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), 3500)
    return () => clearTimeout(t)
  }, [aviso])

  const resumoDe = (c) => resumoDoContrato(c, itens, medicoes)

  async function criar(d) {
    setFolha(null)
    const temp = { ...novoContrato(d), id: `temp-${Date.now()}`, obra_id: obra.id }
    setContratos((lista) => [...lista, temp])
    const { data, erro } = await criarContrato(novoContrato(d))
    if (erro) {
      setContratos((lista) => lista.filter((c) => c.id !== temp.id))
      setAviso(`Não foi possível criar o contrato: ${erro}`)
      return
    }
    setContratos((lista) => lista.map((c) => (c.id === temp.id ? data : c)))
    setAviso('Contrato criado em "Em elaboração"')
  }

  async function gravar(depois, novosItens, mensagem) {
    // Desfaz só o que é deste contrato (mudança em outro contrato, feita no meio, fica).
    const antes = contratos.find((c) => c.id === depois.id)
    const itensAntes = itens.filter((i) => i.contrato_id === depois.id)
    const marca = Date.now()
    setContratos((lista) => lista.map((c) => (c.id === depois.id ? depois : c)))
    if (novosItens) setItens((lista) => [...lista.filter((i) => i.contrato_id !== depois.id), ...novosItens.map((it, k) => ({ ...it, id: `temp-${marca}-${k}` }))])
    const { data, erro } = await salvarContrato(depois, novosItens)
    if (erro) {
      setContratos((lista) => lista.map((c) => (c.id === depois.id ? antes : c)))
      setItens((lista) => [...lista.filter((i) => i.contrato_id !== depois.id), ...itensAntes])
      setAviso(`Não foi possível salvar: ${erro}`)
      return
    }
    setItens((lista) => [...lista.filter((i) => i.contrato_id !== depois.id), ...data.itens])
    setAviso(mensagem)
  }

  function mover(c, destino) {
    const regra = podeMoverContrato(c, destino, resumoDe(c))
    if (!regra.ok) { setAviso(regra.motivo); return }
    if (regra.pedeValor) { setFolha({ tipo: 'valor', contrato: c, aprovar: true }); return }
    gravar(moverContrato(c, destino), null, `Movido para ${rotuloStatusContrato(destino)}`)
  }

  // Boletins: otimista (acumulado e saldo mudam na hora) e desfaz se der erro.
  async function criarBoletim(boletim, mensagem) {
    const temp = { ...boletim, id: `temp-${Date.now()}`, obra_id: obra.id }
    setMedicoes((lista) => [...lista, temp])
    const { data, erro } = await criarMedicao(boletim)
    if (erro) {
      setMedicoes((lista) => lista.filter((m) => m.id !== temp.id))
      setAviso(`Não foi possível salvar a medição: ${erro}`)
      return
    }
    setMedicoes((lista) => lista.map((m) => (m.id === temp.id ? data : m)))
    setAviso(mensagem)
  }

  async function salvarBoletim(boletim, mensagem) {
    const antes = medicoes.find((m) => m.id === boletim.id)
    setMedicoes((lista) => lista.map((m) => (m.id === boletim.id ? boletim : m)))
    const { erro } = await salvarMedicao(boletim)
    if (erro) {
      setMedicoes((lista) => lista.map((m) => (m.id === boletim.id ? antes : m)))
      setAviso(`Não foi possível salvar a medição: ${erro}`)
      return
    }
    setAviso(mensagem)
  }

  function salvarValor(contrato, d, aprovar) {
    setFolha(null)
    const { contrato: comValor, itens: novos } = aplicarValor(contrato, d)
    gravar(aprovar ? moverContrato(comValor, 'ativo') : comValor, novos, aprovar ? 'Contrato aprovado e ativo' : 'Valor do contrato salvo')
  }

  if (estado.carregando) return <><h1 className="titulo-tela">Medição de empreiteiros</h1><p className="nota">Carregando os contratos…</p></>
  if (estado.erro) {
    return (
      <>
        <h1 className="titulo-tela">Medição de empreiteiros</h1>
        <div className="vazio" role="alert">
          <h3>Os contratos não carregaram</h3>
          <p>{estado.erro}</p>
          <button className="btn btn-pri" onClick={carregar}>Tentar de novo</button>
        </div>
      </>
    )
  }

  const ficha = fichaId && contratos.find((c) => c.id === fichaId)
  if (ficha) {
    return (
      <>
        <FichaMedicao contrato={ficha} itens={itens} medicoes={medicoes} onVoltar={() => setFichaId(null)}
          onCriar={criarBoletim} onSalvar={salvarBoletim} />
        {aviso && <div className="aviso-toast" role="status">{aviso}</div>}
      </>
    )
  }

  const novoBtn = <button className="btn btn-pri" onClick={() => setFolha({ tipo: 'novo' })}>Novo contrato</button>
  const obraTotais = resumoDosAtivos(contratos, itens, medicoes)

  return (
    <>
      <h1 className="titulo-tela">Medição de empreiteiros</h1>
      {contratos.length === 0 ? (
        <Vazio icone="medicao" titulo="Nenhum contrato de empreiteiro nesta obra"
          texto="Cadastre o primeiro contrato: o empreiteiro e o serviço. O valor entra quando ele for aprovado, e depois você lança as medições.">
          {novoBtn}
        </Vazio>
      ) : (
        <>
          <div className="resumo">
            <div className="stat"><span className="rot">Contratos ativos</span><span className="val">{obraTotais.ativos}</span></div>
            <div className="stat"><span className="rot">Contratado (ativos)</span><span className="val val-dinheiro">{formatarReais(obraTotais.contratado)}</span></div>
            <div className="stat"><span className="rot">Saldo a medir</span><span className="val val-dinheiro">{formatarReais(obraTotais.saldo)}</span></div>
          </div>
          <div className="barra-acoes">{novoBtn}</div>
          <p className="nota so-celular">Arraste o quadro para os lados para ver as outras colunas.</p>
          <div className="kanban" role="list" aria-label="Contratos por etapa">
            {STATUS_CONTRATO.map((s) => {
              const daColuna = contratos.filter((c) => c.status === s.id)
              return (
                <section key={s.id} className="coluna" role="listitem" aria-label={s.rotulo}>
                  <div className="coluna-cab"><h2 className="secao">{s.rotulo}</h2><span className="contagem">{daColuna.length}</span></div>
                  {daColuna.length === 0
                    ? <p className="coluna-vazia">Nenhum contrato aqui.</p>
                    : daColuna.map((c) => (
                      <CartaoContrato key={c.id} c={c} resumo={resumoDe(c)} onMover={mover}
                        onEditarValor={(x) => setFolha({ tipo: 'valor', contrato: x, aprovar: false })}
                        onAbrirFicha={(x) => { setFichaId(x.id); window.scrollTo(0, 0) }} />
                    ))}
                </section>
              )
            })}
          </div>
        </>
      )}
      {folha?.tipo === 'novo' && <FormNovoContrato onSalvar={criar} onFechar={() => setFolha(null)} />}
      {folha?.tipo === 'valor' && (
        <FormValor contrato={folha.contrato} titulo={folha.aprovar ? 'Aprovar: cadastrar o valor' : 'Editar valor do contrato'}
          inicial={folha.contrato.tipo ? valorParaFormulario(folha.contrato, itens) : { tipo: null, valor_global: '', itens: [linhaVaziaDeEscopo()] }}
          onSalvar={(d) => salvarValor(folha.contrato, d, folha.aprovar)} onFechar={() => setFolha(null)} />
      )}
      {aviso && <div className="aviso-toast" role="status">{aviso}</div>}
    </>
  )
}
