// DIÁRIO DE OBRA (engenheiro e mestre): a lista dos dias lançados, do mais recente ao mais
// antigo, o dia aberto com tudo o que foi lançado e o "Lançar hoje". O engenheiro também edita
// qualquer dia; o mestre só lança o de hoje e vê os outros.
import { useEffect, useState } from 'react'
import { useObra } from '../lib/ObraContext.jsx'
import { listarDiarios, listarFrentes, salvarDiario } from '../lib/dados.js'
import {
  ordenarDiarios, resumoDoDia, efetivoDoDia, maoDeObraDoDia, equipamentosDoDia, rotuloClima, PERIODOS, diaDaSemanaPorExtenso, numeroDoRdo,
  diasSemDiario, agruparPorMes, atividadesParaAnalisar, analisarAtividade, rotuloAnalise, alternarClienteVe, semanaParaLiberar, liberarTodas,
  validarEscolhaPdf, diariosDoPdf,
} from '../lib/diario.js'
import { formatarData, hojeISO } from '../lib/datas.js'
import { Vazio } from '../components/index.jsx'
import { Folha, Confirmar } from '../components/formulario.jsx'
import LancarDia from './lancarDia.jsx'
import RdoPdf from './rdoPdf.jsx'

// Folha de escolha do PDF: só o dia, ou um período entre os dias lançados; com ou sem fotos.
function EscolhaPdf({ inicial, diarios, onVer, onFechar }) {
  const [e, setE] = useState(inicial)
  const [tentou, setTentou] = useState(false)
  const erro = validarEscolhaPdf(e, diarios)
  const datas = ordenarDiarios(diarios).map((d) => d.data)
  return (
    <Folha titulo="Gerar PDF do diário" onFechar={onFechar}>
      <div className="form">
        <label className="check-linha"><input type="radio" name="modo-pdf" checked={e.modo === 'dia'} onChange={() => setE({ ...e, modo: 'dia' })} /> Só o dia {e.dia ? formatarData(e.dia) : ''}</label>
        {e.modo === 'dia' && (
          <select className="seletor-pdf" value={e.dia} aria-label="Dia do PDF" onChange={(ev) => setE({ ...e, dia: ev.target.value })}>
            {datas.map((d) => <option key={d} value={d}>{formatarData(d)}</option>)}
          </select>
        )}
        <label className="check-linha"><input type="radio" name="modo-pdf" checked={e.modo === 'periodo'} onChange={() => setE({ ...e, modo: 'periodo' })} /> Um período (uma página por dia)</label>
        {e.modo === 'periodo' && (
          <div className="campos-lado">
            <label className="campo"><span className="campo-rot">De</span><select className="seletor-pdf" value={e.de} onChange={(ev) => setE({ ...e, de: ev.target.value })}>{[...datas].reverse().map((d) => <option key={d} value={d}>{formatarData(d)}</option>)}</select></label>
            <label className="campo"><span className="campo-rot">Até</span><select className="seletor-pdf" value={e.ate} onChange={(ev) => setE({ ...e, ate: ev.target.value })}>{datas.map((d) => <option key={d} value={d}>{formatarData(d)}</option>)}</select></label>
          </div>
        )}
        <label className="check-linha"><input type="checkbox" checked={e.fotos} onChange={(ev) => setE({ ...e, fotos: ev.target.checked })} /> Incluir as fotos do dia</label>
        {tentou && erro && <p className="campo-erro" role="alert">{erro}</p>}
        <div className="form-acoes">
          <button type="button" className="btn btn-sec" onClick={onFechar}>Cancelar</button>
          <button type="button" className="btn btn-pri" onClick={() => { setTentou(true); if (!erro) onVer(e) }}>Ver o PDF</button>
        </div>
      </div>
    </Folha>
  )
}

function DiaAberto({ d, obra, frentes, papel, onEditar, onClienteVe, onFechar }) {
  const ef = efetivoDoDia(d)
  const nome = (id) => frentes.find((f) => f.id === id)?.servico ?? 'Frente'
  return (
    <Folha titulo={`${diaDaSemanaPorExtenso(d.data)}, ${formatarData(d.data)}`} onFechar={onFechar}>
      <div className="detalhe-pend">
        <p className="form-sub">
          {obra?.data_inicio && `RDO nº ${numeroDoRdo(obra.data_inicio, d.data)} · `}lançado por {d.lancado_por}
          {d.lancado_em > d.data && ` · Lançado em ${formatarData(d.lancado_em)}`}
        </p>
        <table className="tabela-simples">
          <thead><tr>{PERIODOS.map((p) => <th key={p.id}>{p.rotulo}</th>)}</tr></thead>
          <tbody><tr>{PERIODOS.map((p) => <td key={p.id}>{rotuloClima(d.clima[p.id]) ?? 'Não informado'}</td>)}</tr></tbody>
        </table>
        <div>
          <span className="campo-rot">Serviços ({d.servicos.length})</span>
          <ul className="servicos-lidos">
            {d.servicos.map((s) => (
              <li key={s.id ?? s.frente_id}>
                {s.fora_orcamento
                  ? <><span className="tag-fora">Fora do orçamento</span> <b>{s.descricao}</b>{s.quantidade != null ? ` — ${String(s.quantidade).replace('.', ',')} ${s.unidade}` : ''}{s.ambiente ? ` · ${s.ambiente}` : ''} · {rotuloAnalise(s.analise ?? 'para_analisar').toLowerCase()}</>
                  : <><b>{nome(s.frente_id)}</b> — {s.avanco}%{s.concluido ? ' · concluído' : ''}</>}
                {s.detalhe && <em> · {s.detalhe}</em>}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <span className="campo-rot">Efetivo do dia · {ef.total} {ef.total === 1 ? 'pessoa' : 'pessoas'}</span>
          <p>{Object.entries(ef.porFuncao).map(([f, n]) => `${f}: ${n}`).join(' · ') || 'Não informado.'}</p>
        </div>
        {d.fotos.length > 0 && (
          <div className="fotos-nc">
            {d.fotos.map((f) => (
              <figure key={f.id}>
                <img src={f.url} alt={`Foto ${f.ambiente || ''}`} />
                <figcaption>{f.ambiente || nome(f.frente_id)}</figcaption>
                {papel === 'Engenheiro' && (
                  <label className="cliente-ve">
                    <input type="checkbox" checked={f.cliente_ve} onChange={() => onClienteVe(d, f.id)} />
                    Cliente vê
                  </label>
                )}
              </figure>
            ))}
          </div>
        )}
        {d.equipamentos.length > 0 && (
          <div>
            <span className="campo-rot">Equipamentos</span>
            <p>{d.equipamentos.map((e) => `${e.quantidade}× ${e.nome} (${e.origem.toLowerCase()}, ${e.situacao.toLowerCase()})`).join(' · ')}</p>
          </div>
        )}
        {d.ocorrencias && <div><span className="campo-rot">Ocorrências</span><p>{d.ocorrencias}</p></div>}
        {papel === 'Engenheiro' && <div className="form-acoes"><button className="btn btn-pri" onClick={() => onEditar(d)}>Editar este dia</button></div>}
      </div>
    </Folha>
  )
}

export default function Diario({ usuario }) {
  const { obra } = useObra()
  const [estado, setEstado] = useState({ carregando: true, erro: null })
  const [frentes, setFrentes] = useState([])
  const [diarios, setDiarios] = useState([])
  const [lancando, setLancando] = useState(null) // data do formulário aberto
  const [aberto, setAberto] = useState(null)
  const [aviso, setAviso] = useState(null)
  const [painel, setPainel] = useState(null) // 'semDiario' | 'analisar' | 'liberar'
  const [ligando, setLigando] = useState({}) // frente escolhida por atividade em análise
  const [escolhaPdf, setEscolhaPdf] = useState(null) // { modo, dia, de, ate, fotos }
  const [pdf, setPdf] = useState(null) // escolha confirmada: mostra as folhas
  const hoje = hojeISO()
  const papel = usuario?.role ?? 'Engenheiro'

  async function carregar() {
    setEstado({ carregando: true, erro: null })
    const [rf, rd] = await Promise.all([listarFrentes(), listarDiarios()])
    const erro = rf.erro || rd.erro
    if (erro) { setEstado({ carregando: false, erro }); return }
    setFrentes(rf.data)
    setDiarios(rd.data)
    setEstado({ carregando: false, erro: null })
  }

  useEffect(() => { carregar() }, [obra?.id])

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), 3000)
    return () => clearTimeout(t)
  }, [aviso])

  // Salva e já mostra na lista (o mesmo dia é substituído).
  async function salvar(diario) {
    const { data, erro } = await salvarDiario(diario)
    if (erro) { setAviso(`Não foi possível salvar: ${erro}`); return false }
    setDiarios((lista) => [...lista.filter((d) => d.id !== data.id), data])
    setLancando(null)
    setAviso(data.data === hoje ? 'Diário de hoje salvo' : `Diário de ${formatarData(data.data)} salvo`)
    return true
  }

  // Mudança rápida num diário já lançado (Cliente vê, análise): otimista, desfaz se der erro.
  async function gravarRapido(alterados, mensagem) {
    const antes = new Map(diarios.filter((d) => alterados.some((x) => x.id === d.id)).map((d) => [d.id, d]))
    setDiarios((lista) => lista.map((d) => alterados.find((x) => x.id === d.id) ?? d))
    for (const d of alterados) {
      const { erro } = await salvarDiario(d)
      if (erro) {
        setDiarios((lista) => lista.map((x) => antes.get(x.id) ?? x))
        setAviso(`Não foi possível salvar: ${erro}`)
        return
      }
    }
    if (mensagem) setAviso(mensagem)
  }

  if (estado.carregando) return <p className="nota">Carregando o diário…</p>
  if (estado.erro) {
    return (
      <div className="vazio" role="alert">
        <h3>O diário não carregou</h3>
        <p>{estado.erro} Confira a internet e tente de novo.</p>
        <button className="btn btn-pri" onClick={carregar}>Tentar de novo</button>
      </div>
    )
  }

  if (lancando) {
    return (
      <>
        <LancarDia key={lancando} obra={obra} frentes={frentes} diarios={diarios} usuario={usuario} data={lancando}
          onSalvar={salvar} onCancelar={() => setLancando(null)} />
        {aviso && <div className="aviso-toast" role="status">{aviso}</div>}
      </>
    )
  }

  if (pdf) {
    return <RdoPdf selecionados={diariosDoPdf(pdf, diarios)} todos={diarios} obra={obra} frentes={frentes} comFotos={pdf.fotos} onVoltar={() => setPdf(null)} />
  }

  const lista = ordenarDiarios(diarios)
  const diaAberto = aberto && diarios.find((d) => d.id === aberto)
  const abrirPdf = (dia) => setEscolhaPdf({ modo: 'dia', dia: dia ?? lista[0]?.data ?? '', de: lista.at(-1)?.data ?? '', ate: lista[0]?.data ?? '', fotos: true })
  const engenheiro = papel === 'Engenheiro'
  const semDiario = engenheiro ? diasSemDiario(diarios, obra?.data_inicio, hoje) : []
  const paraAnalisar = engenheiro ? atividadesParaAnalisar(diarios) : []
  const semana = engenheiro ? semanaParaLiberar(diarios, hoje) : { diarios: [], fotos: 0 }
  const lancarEm = (data) => { setPainel(null); setLancando(data) }

  return (
    <>
      <div className="page-header">
        <h1 className="titulo-tela">Diário de obra</h1>
      </div>
      <div className="barra-acoes">
        <button className="btn btn-pri" onClick={() => setLancando(hoje)}>Lançar hoje</button>
        {lista.length > 0 && <button className="btn btn-sec" onClick={() => abrirPdf()}>Gerar PDF</button>}
        {engenheiro && semana.fotos > 0 && <button className="btn btn-sec" onClick={() => setPainel('liberar')}>Liberar todas da semana</button>}
      </div>
      {paraAnalisar.length > 0 && (
        <button className="aviso-topo" onClick={() => setPainel('analisar')}>
          {paraAnalisar.length} {paraAnalisar.length === 1 ? 'atividade fora do orçamento' : 'atividades fora do orçamento'} para analisar · <b>Ver</b>
        </button>
      )}
      {semDiario.length > 0 && (
        <button className="aviso-topo" onClick={() => setPainel('semDiario')}>
          {semDiario.length} {semDiario.length === 1 ? 'dia de obra sem diário' : 'dias de obra sem diário'} desde o início da obra · <b>Ver</b>
        </button>
      )}
      {lista.length === 0 ? (
        <Vazio icone="diario" titulo="Nenhum diário lançado nesta obra"
          texto="O primeiro diário aparece aqui assim que alguém lançar o dia. Depois, dá para gerar o PDF de um dia ou de um período.">
          <button className="btn btn-pri" onClick={() => setLancando(hoje)}>Lançar o primeiro diário</button>
        </Vazio>
      ) : (
        <ul className="cartao lista-dias">
          {lista.map((d) => {
            const r = resumoDoDia(d, obra?.data_inicio)
            return (
              <li key={d.id} className="dia-item">
                <button className="btn-mini dia-pdf" onClick={() => abrirPdf(d.data)} aria-label={`PDF de ${formatarData(d.data)}`}>PDF</button>
                <button className="dia-linha" onClick={() => setAberto(d.id)}>
                  <span className="dia-data">
                    <b>{formatarData(d.data)}</b>
                    <small>{diaDaSemanaPorExtenso(d.data)}{r.rdo ? ` · RDO nº ${r.rdo}` : ''}</small>
                  </span>
                  <span className="dia-info">
                    <span>{r.clima}</span>
                    <span>{r.frentes} {r.frentes === 1 ? 'frente' : 'frentes'}{r.foras ? ` + ${r.foras} fora do orçamento` : ''} · {r.efetivo} {r.efetivo === 1 ? 'pessoa' : 'pessoas'} · {r.fotos} {r.fotos === 1 ? 'foto' : 'fotos'}
                      {papel === 'Engenheiro' && r.fotosEscondidas > 0 ? ` (${r.fotosEscondidas} não liberada${r.fotosEscondidas === 1 ? '' : 's'})` : ''}</span>
                    {maoDeObraDoDia(d).length > 0 && (
                      <span className="dia-lista" aria-label="Mão de obra do dia">
                        <b>Mão de obra:</b>
                        {maoDeObraDoDia(d).map((m) => <span key={m.funcao} className="chip-dia">{m.funcao} {m.quantidade}</span>)}
                      </span>
                    )}
                    {equipamentosDoDia(d).length > 0 && (
                      <span className="dia-lista" aria-label="Equipamentos do dia">
                        <b>Equipamentos:</b>
                        {equipamentosDoDia(d).map((e, i) => (
                          <span key={i} className={`chip-dia ${e.alerta ? 'alerta' : ''}`}>{e.texto}{e.origem === 'Alugado' ? ' · alugado' : ''}{e.alerta ? ` · ${e.situacao.toLowerCase()}` : ''}</span>
                        ))}
                      </span>
                    )}
                    {d.ocorrencias && <span className="dia-ocorrencia">⚠ {d.ocorrencias}</span>}
                    {r.atrasado && <span className="tag-lancado">Lançado em {formatarData(d.lancado_em)}</span>}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {diaAberto && (
        <DiaAberto d={diaAberto} obra={obra} frentes={frentes} papel={papel} onFechar={() => setAberto(null)}
          onClienteVe={(d, fotoId) => { const novo = alternarClienteVe(d, fotoId); gravarRapido([novo], novo.fotos.find((f) => f.id === fotoId).cliente_ve ? 'Foto liberada para o cliente' : 'Foto escondida do cliente') }}
          onEditar={(d) => { setAberto(null); setLancando(d.data) }} />
      )}
      {escolhaPdf && (
        <EscolhaPdf inicial={escolhaPdf} diarios={diarios} onFechar={() => setEscolhaPdf(null)}
          onVer={(e) => { setEscolhaPdf(null); setPdf(e); window.scrollTo(0, 0) }} />
      )}
      {painel === 'semDiario' && (
        <Folha titulo="Dias sem diário" onFechar={() => setPainel(null)}>
          <p className="form-sub">Dias de obra (segunda a sábado) desde o início, até ontem, sem diário. Toque num dia para lançar.</p>
          <div className="meses-sem-diario">
            {agruparPorMes(semDiario).map((m) => (
              <section key={m.mes}>
                <h4>{m.rotulo} <small>({m.dias.length})</small></h4>
                <div className="dias-botoes">
                  {m.dias.map((dia) => <button key={dia} className="chip-filtro" onClick={() => lancarEm(dia)} aria-label={`Lançar ${formatarData(dia)}`}>{dia.slice(8, 10)}</button>)}
                </div>
              </section>
            ))}
          </div>
        </Folha>
      )}
      {painel === 'analisar' && (
        <Folha titulo="Fora do orçamento: para analisar" onFechar={() => setPainel(null)}>
          <p className="form-sub">Para cada uma: era um serviço previsto (ligue a uma frente) ou é serviço extra, candidato a aditivo.</p>
          {paraAnalisar.length === 0 ? <p className="nota">Nada para analisar.</p> : (
            <ul className="lista-analise">
              {paraAnalisar.map((x) => {
                const diario = diarios.find((d) => d.id === x.diario_id)
                return (
                  <li key={x.atividade.id}>
                    <b>{x.atividade.descricao}</b>
                    <span className="pedido-info">{formatarData(x.data)} · {x.atividade.quantidade != null ? `${String(x.atividade.quantidade).replace('.', ',')} ${x.atividade.unidade} · ` : ''}lançado por {x.lancado_por}</span>
                    <div className="linha-add">
                      <select value={ligando[x.atividade.id] ?? ''} aria-label="Frente para ligar" onChange={(e) => setLigando({ ...ligando, [x.atividade.id]: e.target.value })}>
                        <option value="">Ligar a uma frente…</option>
                        {frentes.map((fr) => <option key={fr.id} value={fr.id}>{fr.servico}</option>)}
                      </select>
                      <button className="btn-mini pri" disabled={!ligando[x.atividade.id]}
                        onClick={() => gravarRapido([analisarAtividade(diario, x.atividade.id, { acao: 'ligar', frenteId: ligando[x.atividade.id] })], 'Atividade ligada à frente')}>Ligar</button>
                    </div>
                    <button className="btn-mini" onClick={() => gravarRapido([analisarAtividade(diario, x.atividade.id, { acao: 'extra' })], 'Marcada como serviço extra')}>Marcar como serviço extra</button>
                  </li>
                )
              })}
            </ul>
          )}
        </Folha>
      )}
      {painel === 'liberar' && (
        <Confirmar titulo="Liberar fotos da semana" rotuloSim="Liberar" onFechar={() => setPainel(null)}
          texto={`Liberar ${semana.fotos} ${semana.fotos === 1 ? 'foto' : 'fotos'} dos últimos 7 dias para o cliente?`}
          onSim={() => { setPainel(null); gravarRapido(semana.diarios.map(liberarTodas), `${semana.fotos} ${semana.fotos === 1 ? 'foto liberada' : 'fotos liberadas'} para o cliente`) }} />
      )}
      {aviso && <div className="aviso-toast" role="status">{aviso}</div>}
    </>
  )
}
