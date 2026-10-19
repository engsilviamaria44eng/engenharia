// QUALIDADE (engenheiro e mestre): três abas — Pendências (vistoria rápida), FVS (fichas
// de verificação de serviço) e Gemba Walk (caça aos desperdícios) — e o relatório.
// Os filtros de Pendências e Gemba moram aqui: o relatório imprime o que está filtrado.
import { useState } from 'react'
import { FILTROS_INICIAIS_PENDENCIAS, FILTROS_INICIAIS_GEMBA, podeTirarRelatorio } from '../lib/qualidade.js'
import AbaPendencias from './qualidadePendencias.jsx'
import AbaFVS from './qualidadeFvs.jsx'
import AbaGemba from './qualidadeGemba.jsx'
import RelatorioQualidade from './qualidadeRelatorio.jsx'

const ABAS = [['pendencias', 'Pendências'], ['fvs', 'FVS'], ['gemba', 'Gemba Walk']]

export default function Qualidade({ usuario }) {
  const [aba, setAba] = useState('pendencias')
  const [filtrosPend, setFiltrosPend] = useState(FILTROS_INICIAIS_PENDENCIAS)
  const [filtrosGemba, setFiltrosGemba] = useState(FILTROS_INICIAIS_GEMBA)
  const [relatorio, setRelatorio] = useState(false)

  if (relatorio) {
    return <RelatorioQualidade filtrosPend={filtrosPend} filtrosGemba={filtrosGemba} onVoltar={() => setRelatorio(false)} />
  }

  return (
    <>
      <div className="page-header no-print">
        <h1 className="titulo-tela">Qualidade</h1>
        {podeTirarRelatorio(usuario?.role) && <button className="btn btn-sec" onClick={() => { setRelatorio(true); window.scrollTo(0, 0) }}>Relatório</button>}
      </div>
      <div className="segmentado no-print" role="tablist" aria-label="Partes da qualidade">
        {ABAS.map(([id, rotulo]) => (
          <button key={id} role="tab" aria-selected={aba === id} className={aba === id ? 'ativo' : ''} onClick={() => setAba(id)}>{rotulo}</button>
        ))}
      </div>
      {aba === 'pendencias' && <AbaPendencias usuario={usuario} filtros={filtrosPend} onFiltros={setFiltrosPend} />}
      {aba === 'fvs' && <AbaFVS usuario={usuario} />}
      {aba === 'gemba' && <AbaGemba usuario={usuario} filtros={filtrosGemba} onFiltros={setFiltrosGemba} />}
    </>
  )
}
