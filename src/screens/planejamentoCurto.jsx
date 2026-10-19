// PLANEJAMENTO · aba CURTO PRAZO: a semana, no nível do canteiro. Kanban A fazer /
// Em andamento / Concluído (move por seleção, sem arrastar), checklist de subtarefas,
// "não realizado" com causa raiz e o PPC da semana. Mesmas atividades da EAP.
import { useState } from 'react'
import { usePlanejamento } from '../lib/PlanejamentoContext.jsx'
import {
  STATUS_ATIVIDADE, CAUSAS_NAO_REALIZADO, rotuloCausa, semanaDe, atividadesDaSemana, ehAcumulada, ppcDaSemana, causasDaSemana, codigosEAP,
  temRestricaoAberta, aplicarStatus, validarNaoRealizado, marcarNaoRealizada, desfazerNaoRealizada,
  validarSubtarefa, acrescentarSubtarefa, removerSubtarefa, alternarSubtarefa, subtarefaNaoRealizada, desfazerSubtarefaNaoRealizada,
} from '../lib/planejamento.js'
import { formatarData, hojeISO, somarDias } from '../lib/datas.js'
import { Vazio } from '../components/index.jsx'
import { Campo, Folha, Confirmar } from '../components/formulario.jsx'

const curta = (iso) => formatarData(iso).slice(0, 5)

function FolhaCausa({ titulo, oQue, onSalvar, onFechar }) {
  const [d, setD] = useState({ causa: '', obs: '' })
  const [tocado, setTocado] = useState(false)
  const erros = validarNaoRealizado(d)

  function enviar(e) {
    e.preventDefault()
    setTocado(true)
    if (Object.keys(erros).length === 0) onSalvar(d)
  }

  return (
    <Folha titulo={titulo} onFechar={onFechar}>
      <p className="form-sub">{oQue}</p>
      <form className="form" onSubmit={enviar} noValidate>
        <Campo rotulo="Causa raiz" erro={tocado && erros.causa}>
          <div className="causas" role="radiogroup" aria-label="Causa raiz">
            {CAUSAS_NAO_REALIZADO.map((c) => (
              <button key={c.id} type="button" role="radio" aria-checked={d.causa === c.id}
                className={`chip-filtro ${d.causa === c.id ? 'ativo' : ''}`} onClick={() => setD({ ...d, causa: c.id })}>{c.rotulo}</button>
            ))}
          </div>
        </Campo>
        <Campo rotulo={d.causa === 'outra' ? 'Qual foi a causa' : 'Observação (opcional)'} erro={tocado && erros.obs}>
          <input type="text" value={d.obs} placeholder="Vergalhão não chegou" onChange={(e) => setD({ ...d, obs: e.target.value })} />
        </Campo>
        <div className="form-acoes">
          <button type="button" className="btn btn-sec" onClick={onFechar}>Cancelar</button>
          <button type="submit" className="btn btn-pri">Registrar</button>
        </div>
      </form>
    </Folha>
  )
}

function TextoNaoRealizado({ nr }) {
  return <>Não realizada ({curta(nr.semana)}): <b>{rotuloCausa(nr.causa)}</b>{nr.obs ? ` — ${nr.obs}` : ''}</>
}

// Detalhe da atividade: o checklist de subtarefas e o "não realizado".
function FolhaDetalhe({ a, codigo, semana, onSalvar, onFechar }) {
  const [nova, setNova] = useState('')
  const [tocado, setTocado] = useState(false)
  const [sub, setSub] = useState(null) // { tipo: 'causa'|'remover'|'causaAtividade', s }
  const erroNova = validarSubtarefa(nova, a.subtarefas)

  function acrescentar(e) {
    e.preventDefault()
    setTocado(true)
    if (erroNova) return
    onSalvar(acrescentarSubtarefa(a, nova, `st-${Date.now()}`), 'Subtarefa acrescentada')
    setNova('')
    setTocado(false)
  }

  if (sub?.tipo === 'causa') {
    return <FolhaCausa titulo="Subtarefa não realizada" oQue={sub.s.texto} onFechar={() => setSub(null)}
      onSalvar={(d) => { setSub(null); onSalvar(subtarefaNaoRealizada(a, sub.s.id, d, semana), 'Subtarefa marcada como não realizada') }} />
  }
  if (sub?.tipo === 'causaAtividade') {
    return <FolhaCausa titulo="Atividade não realizada" oQue={`${codigo} ${a.titulo}`} onFechar={() => setSub(null)}
      onSalvar={(d) => { setSub(null); onSalvar(marcarNaoRealizada(a, d, semana), 'Atividade marcada como não realizada') }} />
  }
  if (sub?.tipo === 'remover') {
    return <Confirmar titulo="Remover subtarefa" rotuloSim="Remover" onFechar={() => setSub(null)}
      texto={`Remover "${sub.s.texto}" do checklist? Não dá para desfazer.`}
      onSim={() => { setSub(null); onSalvar(removerSubtarefa(a, sub.s.id), 'Subtarefa removida') }} />
  }

  return (
    <Folha titulo={`${codigo} ${a.titulo}`} onFechar={onFechar}>
      <p className="form-sub">{formatarData(a.inicio)} → {formatarData(a.fim)} · {a.progresso}%</p>
      <div className="form">
        <div className="campo">
          <span className="campo-rot">Subtarefas</span>
          {a.subtarefas.length === 0
            ? <span className="campo-dica">Nenhuma ainda. Divida a atividade em passos que dá para conferir no fim do dia.</span>
            : (
              <ul className="checklist">
                {a.subtarefas.map((s) => (
                  <li key={s.id} className={s.nao_realizado ? 'nao' : ''}>
                    <label className="check">
                      <input type="checkbox" checked={s.feita} onChange={() => onSalvar(alternarSubtarefa(a, s.id), s.feita ? 'Subtarefa reaberta' : 'Subtarefa feita')} />
                      <span className={s.feita ? 'feita' : ''}>{s.texto}</span>
                    </label>
                    {s.nao_realizado && <span className="nr-texto"><TextoNaoRealizado nr={s.nao_realizado} /></span>}
                    <span className="check-acoes">
                      {!s.feita && (s.nao_realizado
                        ? <button type="button" className="btn-mini" onClick={() => onSalvar(desfazerSubtarefaNaoRealizada(a, s.id), 'Não realizado desfeito')}>Desfazer</button>
                        : <button type="button" className="btn-mini" onClick={() => setSub({ tipo: 'causa', s })}>Não realizada</button>)}
                      <button type="button" className="btn-mini" onClick={() => setSub({ tipo: 'remover', s })} aria-label={`Remover ${s.texto}`}>Remover</button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
        </div>
        <form onSubmit={acrescentar} noValidate>
          <Campo rotulo="Nova subtarefa" erro={tocado && erroNova}>
            <div className="linha-add">
              <input type="text" value={nova} placeholder="Conferir prumo" onChange={(e) => setNova(e.target.value)} />
              <button type="submit" className="btn btn-sec">Acrescentar</button>
            </div>
          </Campo>
        </form>
        <div className="campo">
          <span className="campo-rot">Atividade</span>
          {a.nao_realizado
            ? (
              <div className="nr-bloco">
                <span><TextoNaoRealizado nr={a.nao_realizado} /></span>
                <button type="button" className="btn-mini" onClick={() => onSalvar(desfazerNaoRealizada(a), 'Não realizado desfeito')}>Desfazer</button>
              </div>
            )
            : a.status !== 'concluido' && (
              <button type="button" className="btn btn-sec" onClick={() => setSub({ tipo: 'causaAtividade' })}>Marcar como não realizada</button>
            )}
        </div>
        <div className="form-acoes">
          <button type="button" className="btn btn-pri" onClick={onFechar}>Fechar</button>
        </div>
      </div>
    </Folha>
  )
}

function CartaoAtividade({ a, codigo, semana, onMover, onAbrir }) {
  const feitas = a.subtarefas.filter((s) => s.feita).length
  const acumulada = ehAcumulada(a, semana)
  return (
    <article className={`pedido ${a.nao_realizado ? 'atrasado' : ''}`}>
      <div className="pedido-topo"><b>{codigo} {a.titulo}</b></div>
      <span className="pedido-info">{formatarData(a.inicio)} → {formatarData(a.fim)} · <b>{a.progresso}%</b></span>
      <div className="pills">
        {acumulada && <span className="pill atencao">Acumulada</span>}
        {temRestricaoAberta(a) && <span className="pill parada">Impedida</span>}
        {a.subtarefas.length > 0 && <span className="pill azul">Subtarefas {feitas}/{a.subtarefas.length}</span>}
      </div>
      {a.nao_realizado && <span className="pedido-info nr-texto"><TextoNaoRealizado nr={a.nao_realizado} /></span>}
      <div className="pedido-acoes">
        <label className="mover">
          <span className="sr">Coluna de {a.titulo}</span>
          <select value={a.status} onChange={(e) => onMover(a, e.target.value)}>
            {STATUS_ATIVIDADE.map((s) => <option key={s.id} value={s.id}>{s.rotulo}</option>)}
          </select>
        </label>
        <button className="btn-mini pri" onClick={() => onAbrir(a)}>Detalhes</button>
      </div>
    </article>
  )
}

export default function AbaCurtoPrazo({ irParaEAP }) {
  const { atividades, salvar } = usePlanejamento()
  const hoje = hojeISO()
  const [inicioSemana, setInicioSemana] = useState(semanaDe(hoje).inicio)
  const [aberta, setAberta] = useState(null)

  if (!atividades.some((a) => !a.arquivada)) {
    return (
      <Vazio icone="planejamento" titulo="Nada planejado ainda"
        texto="A semana sai das atividades da EAP: monte a EAP com as datas, e as atividades desta semana aparecem aqui.">
        <button className="btn btn-pri" onClick={irParaEAP}>Ir para a EAP</button>
      </Vazio>
    )
  }

  const semana = semanaDe(inicioSemana)
  const atual = semana.inicio === semanaDe(hoje).inicio
  const planejadas = atividadesDaSemana(atividades, semana, { acumular: true })
  const { total, concluidas, ppc } = ppcDaSemana(planejadas)
  const causas = causasDaSemana(planejadas, semana)
  const codigos = codigosEAP(atividades)
  const detalhe = aberta && atividades.find((a) => a.id === aberta)

  function mover(a, status) {
    salvar([aplicarStatus(a, status)], `Movida para ${STATUS_ATIVIDADE.find((s) => s.id === status).rotulo}`)
  }

  return (
    <>
      <div className="semana-nav" role="group" aria-label="Escolher a semana">
        <button className="btn-mini seta" onClick={() => setInicioSemana(somarDias(semana.inicio, -7))} aria-label="Semana anterior">←</button>
        <div className="semana-nav-txt">
          <b>{atual ? 'Esta semana' : 'Semana'}</b>
          <span>{formatarData(semana.inicio)} a {formatarData(semana.fim)}</span>
        </div>
        <button className="btn-mini seta" onClick={() => setInicioSemana(somarDias(semana.inicio, 7))} aria-label="Próxima semana">→</button>
        {!atual && <button className="chip-filtro" onClick={() => setInicioSemana(semanaDe(hoje).inicio)}>Voltar para esta semana</button>}
      </div>

      <div className="ppc">
        <div className="ppc-num">
          <span className="rot">PPC da semana</span>
          <span className="val">{ppc === null ? '—' : `${ppc}%`}</span>
        </div>
        <div className="ppc-barra" role="img" aria-label={`PPC ${ppc ?? 0}%`}><i style={{ width: `${ppc ?? 0}%` }} /></div>
        <span className="ppc-txt"><b>{concluidas} de {total}</b> {total === 1 ? 'atividade planejada concluída' : 'atividades planejadas concluídas'}</span>
        {causas.length > 0 && (
          <div className="ppc-causas">
            <span className="rot">Causas dos não realizados</span>
            <ul>{causas.map((c) => <li key={c.causa}><b>{c.vezes}×</b> {c.rotulo}</li>)}</ul>
          </div>
        )}
      </div>
      <p className="nota">PPC = concluídas ÷ planejadas da semana. Entra na semana a atividade cujo período cruza a semana ou que já devia ter terminado e não terminou (acumulada).</p>

      {total === 0 ? (
        <Vazio icone="planejamento" titulo="Nenhuma atividade nesta semana"
          texto="Nenhuma atividade da EAP cai nesta semana. Navegue para outra semana ou ajuste as datas na EAP." />
      ) : (
        <>
          <p className="nota so-celular">Arraste o quadro para os lados para ver as outras colunas.</p>
          <div className="kanban" role="list" aria-label="Atividades da semana">
            {STATUS_ATIVIDADE.map((s) => {
              const daColuna = planejadas.filter((a) => a.status === s.id)
              return (
                <section key={s.id} className="coluna" role="listitem" aria-label={s.rotulo}>
                  <div className="coluna-cab"><h2 className="secao">{s.rotulo}</h2><span className="contagem">{daColuna.length}</span></div>
                  {daColuna.length === 0
                    ? <p className="coluna-vazia">Nenhuma atividade aqui.</p>
                    : daColuna.map((a) => (
                      <CartaoAtividade key={a.id} a={a} codigo={codigos.get(a.id)} semana={semana} onMover={mover} onAbrir={(x) => setAberta(x.id)} />
                    ))}
                </section>
              )
            })}
          </div>
        </>
      )}
      {detalhe && (
        <FolhaDetalhe a={detalhe} codigo={codigos.get(detalhe.id)} semana={semana}
          onSalvar={(nova, msg) => salvar([nova], msg)} onFechar={() => setAberta(null)} />
      )}
    </>
  )
}
