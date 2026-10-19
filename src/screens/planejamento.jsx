// PLANEJAMENTO (engenheiro) — Last Planner em 3 horizontes + EAP.
// As 4 abas usam a MESMA lista de atividades (PlanejamentoContext).
// Ciclo de uso: EAP → Longo prazo → Médio prazo → Curto prazo.
import { useState } from 'react'
import { PlanejamentoProvider, usePlanejamento } from '../lib/PlanejamentoContext.jsx'
import { DIAS_SEMANA, validarConfig, resumoDiasUteis } from '../lib/planejamento.js'
import { formatarData, hojeISO } from '../lib/datas.js'
import { Campo, Folha, Confirmar } from '../components/formulario.jsx'
import AbaEAP from './planejamentoEap.jsx'
import AbaLongoPrazo from './planejamentoLongo.jsx'
import AbaMedioPrazo from './planejamentoMedio.jsx'
import AbaCurtoPrazo from './planejamentoCurto.jsx'

const ABAS = [['eap', 'EAP'], ['longo', 'Longo prazo'], ['medio', 'Médio prazo'], ['curto', 'Curto prazo']]


function FolhaDiasUteis({ config, onSalvar, onFechar }) {
  const [dias, setDias] = useState(config.dias_uteis)
  const [feriados, setFeriados] = useState(config.feriados)
  const [novo, setNovo] = useState(hojeISO())
  const [remover, setRemover] = useState(null)
  const erros = validarConfig({ dias_uteis: dias, feriados }, novo)
  const erroDias = erros.dias ?? null
  const erroNovo = erros.novo ?? null

  const alternar = (id) => setDias(dias.includes(id) ? dias.filter((d) => d !== id) : [...dias, id])

  function acrescentar() {
    if (!novo || erroNovo) return
    setFeriados([...feriados, novo].sort())
    setNovo('')
  }

  if (remover) {
    return (
      <Confirmar titulo="Remover feriado" rotuloSim="Remover" onFechar={() => setRemover(null)}
        texto={`Tirar ${formatarData(remover)} da lista? Esse dia volta a contar como dia útil.`}
        onSim={() => { setFeriados(feriados.filter((f) => f !== remover)); setRemover(null) }} />
    )
  }

  return (
    <Folha titulo="Dias úteis da obra" onFechar={onFechar}>
      <p className="form-sub">Os prazos do planejamento contam só os dias marcados, sem os feriados.</p>
      <div className="form">
        <Campo rotulo="Dias de trabalho" erro={erroDias}>
          <div className="dias-semana">
            {DIAS_SEMANA.map((d) => (
              <button key={d.id} type="button" className={`chip-filtro ${dias.includes(d.id) ? 'ativo' : ''}`}
                aria-pressed={dias.includes(d.id)} aria-label={d.nome} onClick={() => alternar(d.id)}>
                {d.curto}
              </button>
            ))}
          </div>
        </Campo>
        <div className="campo">
          <span className="campo-rot">Feriados</span>
          {feriados.length === 0
            ? <span className="campo-dica">Nenhum feriado cadastrado.</span>
            : (
              <ul className="lista-feriados">
                {feriados.map((f) => (
                  <li key={f}><span>{formatarData(f)}</span><button type="button" className="btn-mini" onClick={() => setRemover(f)}>Remover</button></li>
                ))}
              </ul>
            )}
        </div>
        <Campo rotulo="Acrescentar feriado" erro={erroNovo}>
          <div className="linha-add">
            <input type="date" value={novo} onChange={(e) => setNovo(e.target.value)} />
            <button type="button" className="btn btn-sec" onClick={acrescentar} disabled={!novo || !!erroNovo}>Acrescentar</button>
          </div>
        </Campo>
        <div className="form-acoes">
          <button type="button" className="btn btn-sec" onClick={onFechar}>Cancelar</button>
          <button type="button" className="btn btn-pri" disabled={!!erroDias}
            onClick={() => onSalvar({ dias_uteis: [...dias].sort(), feriados })}>Salvar</button>
        </div>
      </div>
    </Folha>
  )
}

function ConteudoPlanejamento() {
  const { estado, config, aviso, carregar, salvarConfig } = usePlanejamento()
  const [aba, setAba] = useState('eap')
  const [configAberta, setConfigAberta] = useState(false)

  let corpo
  if (estado.carregando) {
    corpo = <p className="nota">Carregando o planejamento…</p>
  } else if (estado.erro) {
    corpo = (
      <div className="vazio" role="alert">
        <h3>O planejamento não carregou</h3>
        <p>{estado.erro} Confira a internet e tente de novo.</p>
        <button className="btn btn-pri" onClick={carregar}>Tentar de novo</button>
      </div>
    )
  } else if (aba === 'eap') {
    corpo = <AbaEAP />
  } else if (aba === 'longo') {
    corpo = <AbaLongoPrazo irParaEAP={() => setAba('eap')} />
  } else if (aba === 'medio') {
    corpo = <AbaMedioPrazo irParaEAP={() => setAba('eap')} />
  } else {
    corpo = <AbaCurtoPrazo irParaEAP={() => setAba('eap')} />
  }

  return (
    <>
      <h1 className="titulo-tela">Planejamento</h1>
      <p className="subtitulo">Ciclo: EAP → Longo prazo → Médio prazo → Curto prazo</p>
      <div className="abas-tela" role="tablist" aria-label="Horizontes do planejamento">
        {ABAS.map(([id, rotulo]) => (
          <button key={id} role="tab" aria-selected={aba === id} className={`chip-filtro ${aba === id ? 'ativo' : ''}`} onClick={() => setAba(id)}>
            {rotulo}
          </button>
        ))}
      </div>
      {config && !estado.erro && (
        <button className="linha-config" onClick={() => setConfigAberta(true)}>
          Dias úteis: <b>{resumoDiasUteis(config)}</b> <span className="link">Alterar</span>
        </button>
      )}
      {corpo}
      {configAberta && (
        <FolhaDiasUteis config={config} onFechar={() => setConfigAberta(false)}
          onSalvar={(nova) => { setConfigAberta(false); salvarConfig(nova) }} />
      )}
      {aviso && <div className="aviso-toast" role="status">{aviso}</div>}
    </>
  )
}

export default function Planejamento() {
  return (
    <PlanejamentoProvider>
      <ConteudoPlanejamento />
    </PlanejamentoProvider>
  )
}
