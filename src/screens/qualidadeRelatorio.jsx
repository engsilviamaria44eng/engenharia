// QUALIDADE · RELATÓRIO IMPRIMÍVEL (engenheiro). Junta Pendências, FVS e Gemba da obra aberta,
// respeitando os filtros das abas, num documento pronto para "Imprimir" (window.print).
// O que tem a classe .no-print (botões, menu, cabeçalho do app) não sai no papel.
import { useEffect, useState } from 'react'
import { useObra } from '../lib/ObraContext.jsx'
import { listarPendencias, listarFvs, listarGemba } from '../lib/dados.js'
import {
  kpisDePendencias, pendentesPorResponsavel, filtrarPendencias, estaVencida, rotuloStatusPendencia, linhasDoHistorico,
  progressoDaVistoria, ordenarNCs, diasEmAberto, rotuloSeveridade, rotuloStatusNC,
  rankingDesperdicios, filtrarGemba, prazoVencido, classeDoDesperdicio, descreverFiltros, dataHoraDoRelatorio,
} from '../lib/qualidade.js'
import { formatarData, hojeISO } from '../lib/datas.js'
import { Vazio } from '../components/index.jsx'

const CLASSE_STATUS = { pendente: 'parada', em_andamento: 'atencao', resolvido: 'ok' }
const CLASSE_NC = { aberta: 'parada', encaminhada: 'atencao', corrigida: 'azul', fechada: 'ok' }
const CLASSE_SEV = { alta: 'parada', media: 'atencao', baixa: 'neutra' }

function RegistroPendencia({ p, hoje }) {
  const vencida = estaVencida(p, hoje)
  const historico = linhasDoHistorico(p.observacoes)
  return (
    <article className="rel-registro">
      {p.foto ? <img className="rel-foto" src={p.foto} alt={`Foto da pendência #${p.numero}`} /> : <div className="rel-foto sem-foto">Sem foto</div>}
      <div className="rel-dados">
        <div className="rel-titulo">
          <b>#{p.numero}</b>
          <span className={`pill ${CLASSE_STATUS[p.status]}`}>{rotuloStatusPendencia(p.status)}</span>
          {vencida && <span className="tag verm">VENCIDO</span>}
        </div>
        <dl className="rel-campos">
          <div><dt>Data da vistoria</dt><dd>{formatarData(p.data_vistoria)}</dd></div>
          <div><dt>Vistoriado por</dt><dd>{p.vistoriado_por}</dd></div>
          <div><dt>Responsável</dt><dd>{p.responsavel}</dd></div>
          <div><dt>Prazo</dt><dd className={vencida ? 'txt-verm' : ''}>{formatarData(p.prazo)}</dd></div>
          <div><dt>Local</dt><dd>{p.local}{p.pavimento ? ` · ${p.pavimento}` : ''}</dd></div>
          <div><dt>Empresa</dt><dd>{p.empresa}</dd></div>
        </dl>
        <p className="rel-desc">{p.descricao}</p>
        {p.status === 'resolvido' && p.data_resolucao && <p className="rel-obs">Resolvida em {formatarData(p.data_resolucao)}, com foto da correção.</p>}
        {historico.length > 0 && (
          <div className="rel-obs">
            <b>Observações</b>
            <ul>{historico.map((l, i) => <li key={i}>{l}</li>)}</ul>
          </div>
        )}
      </div>
    </article>
  )
}

export default function RelatorioQualidade({ filtrosPend, filtrosGemba, onVoltar }) {
  const { obra } = useObra()
  const [estado, setEstado] = useState({ carregando: true, erro: null })
  const [dados, setDados] = useState(null)
  const [geradoEm] = useState(() => dataHoraDoRelatorio())
  const hoje = hojeISO()

  async function carregar() {
    setEstado({ carregando: true, erro: null })
    const [rp, rf, rg] = await Promise.all([listarPendencias(), listarFvs(), listarGemba()])
    const erro = rp.erro || rf.erro || rg.erro
    if (erro) { setEstado({ carregando: false, erro }); return }
    setDados({ pendencias: rp.data, vistorias: rf.data.vistorias, ncs: rf.data.ncs, gemba: rg.data })
    setEstado({ carregando: false, erro: null })
  }

  useEffect(() => { carregar() }, [obra?.id])

  const barra = (podeImprimir) => (
    <div className="barra-acoes no-print">
      <button className="voltar" onClick={onVoltar}>← Qualidade</button>
      <button className="btn btn-pri" onClick={() => window.print()} disabled={!podeImprimir}>Imprimir</button>
    </div>
  )

  if (estado.carregando) return <>{barra(false)}<p className="nota">Montando o relatório…</p></>
  if (estado.erro) {
    return (
      <>
        {barra(false)}
        <div className="vazio" role="alert">
          <h3>O relatório não carregou</h3>
          <p>{estado.erro} Confira a internet e tente de novo.</p>
          <button className="btn btn-pri" onClick={carregar}>Tentar de novo</button>
        </div>
      </>
    )
  }

  const { pendencias, vistorias, ncs, gemba } = dados
  if (pendencias.length + vistorias.length + ncs.length + gemba.length === 0) {
    return (
      <>
        {barra(false)}
        <Vazio icone="qualidade" titulo="Nada para relatar nesta obra ainda"
          texto="Registre pendências, vistorias FVS ou observações de Gemba e o relatório se monta sozinho." />
      </>
    )
  }

  const listaPend = filtrarPendencias(pendencias, filtrosPend, hoje)
  const k = kpisDePendencias(listaPend)
  const porResp = pendentesPorResponsavel(listaPend)
  const listaGemba = filtrarGemba(gemba, filtrosGemba, hoje)
  const gembaAberto = listaGemba.filter((o) => o.status !== 'resolvido')
  const ranking = rankingDesperdicios(listaGemba)
  const maior = Math.max(1, ranking[0]?.total ?? 1)

  return (
    <>
      {barra(true)}
      <div className="relatorio">
        <header className="rel-cab">
          <img src="/logo-fmz-recorte.png" alt="" className="rel-logo" />
          <p className="rel-empresa">FMZ Incorporadora</p>
          <h1>RELATÓRIO DE QUALIDADE</h1>
          <p className="rel-obra">{obra ? `${obra.codigo} · ${obra.nome}` : ''}</p>
          <p className="rel-meta">Data: {formatarData(hoje)} · Filtros: {descreverFiltros(filtrosPend, filtrosGemba)}</p>
        </header>

        <section className="rel-secao">
          <h2>Pendências</h2>
          <div className="kpis">
            <div className="kpi neutro"><span className="val">{k.total}</span><span className="rot">Total</span></div>
            <div className="kpi verm"><span className="val">{k.pendentes}</span><span className="rot">Pendentes</span></div>
            <div className="kpi ambar"><span className="val">{k.andamento}</span><span className="rot">Em andamento</span></div>
            <div className="kpi verde"><span className="val">{k.resolvidos}</span><span className="rot">Resolvidos</span></div>
          </div>
          <div className="rel-bloco">
            <h3>Pendentes por responsável</h3>
            {porResp.length === 0
              ? <p className="nota">Nenhuma pendência em aberto.</p>
              : <p className="rel-resp">{porResp.map((r) => <span key={r.responsavel} className="badge-resp">{r.responsavel} <b>{r.total}</b></span>)}</p>}
          </div>
          {listaPend.length === 0
            ? <p className="nota">Nenhuma pendência com esses filtros.</p>
            : listaPend.map((p) => <RegistroPendencia key={p.id} p={p} hoje={hoje} />)}
        </section>

        <section className="rel-secao">
          <h2>FVS — Fichas de Verificação de Serviço</h2>
          <div className="rel-bloco">
            <h3>Andamento das vistorias</h3>
            {vistorias.length === 0 ? <p className="nota">Nenhuma vistoria FVS.</p> : (
              <table className="rel-tabela">
                <thead><tr><th>Ficha / ambiente</th><th>OK</th><th>NC</th><th>% conformidade</th><th>Situação</th></tr></thead>
                <tbody>
                  {vistorias.map((v) => {
                    const p = progressoDaVistoria(v)
                    return (
                      <tr key={v.id}>
                        <td><b>{v.modelo_codigo}</b> {v.modelo_nome}<br /><span className="nota">{v.ambiente} · {formatarData(v.data)}</span></td>
                        <td>{p.ok}</td><td>{p.nc}</td>
                        <td>{p.conformidade === null ? '—' : `${p.conformidade}%`}</td>
                        <td>{v.status === 'concluida' ? '✓ Concluída' : `Em andamento (${p.verificados}/${p.total})`}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
          <div className="rel-bloco">
            <h3>Não conformidades</h3>
            {ncs.length === 0 ? <p className="nota">Nenhuma não conformidade.</p> : (
              <table className="rel-tabela">
                <thead><tr><th>Código</th><th>Título</th><th>Severidade</th><th>Situação</th><th>Responsável</th><th>Dias em aberto</th></tr></thead>
                <tbody>
                  {ordenarNCs(ncs).map((n) => (
                    <tr key={n.id}>
                      <td><b>{n.codigo}</b></td>
                      <td>{n.titulo}<br /><span className="nota">{n.servico} · {n.ambiente}</span></td>
                      <td><span className={`pill ${CLASSE_SEV[n.severidade]}`}>{rotuloSeveridade(n.severidade)}</span></td>
                      <td><span className={`pill ${CLASSE_NC[n.status]}`}>{rotuloStatusNC(n.status)}</span></td>
                      <td>{n.responsavel}</td>
                      <td>{diasEmAberto(n, hoje)}{n.status === 'fechada' ? ' (fechada)' : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="rel-secao">
          <h2>Gemba Walk — desperdícios</h2>
          <div className="rel-bloco">
            <h3>Ranking de desperdícios</h3>
            <ol className="ranking">
              {ranking.map((r) => (
                <li key={r.tipo} className="ranking-linha">
                  <span className="ranking-nome">{r.tipo}</span>
                  <span className="ranking-barra"><i className={classeDoDesperdicio(r.tipo)} style={{ width: `${(r.total / maior) * 100}%` }} /></span>
                  <b>{r.total}</b>
                </li>
              ))}
            </ol>
          </div>
          <div className="rel-bloco">
            <h3>Observações em aberto ({gembaAberto.length})</h3>
            {gembaAberto.length === 0 ? <p className="nota">Nenhuma observação em aberto.</p> : (
              <table className="rel-tabela">
                <thead><tr><th>Local</th><th>O que foi visto</th><th>Desperdícios</th><th>Ação</th><th>Responsável</th><th>Prazo</th></tr></thead>
                <tbody>
                  {gembaAberto.map((o) => (
                    <tr key={o.id}>
                      <td>{o.local}</td>
                      <td>{o.descricao}</td>
                      <td>{o.desperdicios.map((t) => <span key={t} className={`tag-desp ${classeDoDesperdicio(t)}`}>{t}</span>)}</td>
                      <td>{o.acao}</td>
                      <td>{o.responsavel}</td>
                      <td className={prazoVencido(o, hoje) ? 'txt-verm' : ''}>{o.prazo ? formatarData(o.prazo) : 'Sem prazo'}{prazoVencido(o, hoje) ? ' (vencido)' : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <footer className="rel-rodape">Relatório gerado automaticamente em {geradoEm}.</footer>
      </div>
    </>
  )
}
