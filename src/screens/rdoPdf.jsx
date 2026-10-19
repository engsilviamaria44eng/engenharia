// PDF DO DIÁRIO (RDO): a prévia das folhas A4, uma por dia, e o "Salvar em PDF", que abre a
// impressão do navegador (sem biblioteca). Engenheiro e mestre; o cliente não vê o RDO.
import { folhaDoRdo, resumoDoPdf, dataHoraPorExtenso } from '../lib/diario.js'
import { formatarData } from '../lib/datas.js'

function FolhaRdo({ f, comFotos }) {
  return (
    <article className="rdo-folha">
      <header className="rdo-cab">
        <img className="rdo-logo" src="/logo-fmz-recorte.png" alt="FMZ Incorporadora" />
        <div className="rdo-titulo">
          <b>RELATÓRIO DIÁRIO DE OBRA</b>
          <span>{f.obra}</span>
        </div>
        <div className="rdo-num">
          <b>RDO nº {f.numero ?? '—'}</b>
          <span>{formatarData(f.data)}</span>
        </div>
      </header>

      <dl className="rdo-dados">
        <div><dt>Obra</dt><dd>{f.obra}</dd></div>
        <div><dt>Data</dt><dd>{f.diaDaSemana}, {formatarData(f.data)}</dd></div>
        <div><dt>Cliente</dt><dd>{f.cliente || '—'}</dd></div>
        <div><dt>Entrega em contrato</dt><dd>{f.entregaContrato ? formatarData(f.entregaContrato) : '—'}</dd></div>
        <div><dt>Lançado por</dt><dd>{f.lancadoPor || '—'}</dd></div>
        <div><dt>Responsável técnico</dt><dd>&nbsp;</dd></div>
      </dl>

      <section className="rdo-secao">
        <h3>Condições do tempo</h3>
        <table className="rdo-tabela">
          <thead><tr>{f.clima.map((c) => <th key={c.periodo}>{c.periodo}</th>)}</tr></thead>
          <tbody><tr>{f.clima.map((c) => <td key={c.periodo}>{c.valor}</td>)}</tr></tbody>
        </table>
      </section>

      <section className="rdo-secao">
        <h3>Mão de obra (efetivo)</h3>
        {f.maoDeObra.length === 0 ? <p className="rdo-vazio">Não informado.</p> : (
          <table className="rdo-tabela">
            <thead><tr><th>Função</th><th className="num">Quantidade</th></tr></thead>
            <tbody>
              {f.maoDeObra.map((m) => <tr key={m.funcao}><td>{m.funcao}</td><td className="num">{m.quantidade}</td></tr>)}
              <tr className="total"><td>Total</td><td className="num">{f.totalMaoDeObra}</td></tr>
            </tbody>
          </table>
        )}
      </section>

      <section className="rdo-secao">
        <h3>Serviços executados</h3>
        {f.servicos.length === 0 ? <p className="rdo-vazio">Nenhum serviço lançado.</p> : (
          <table className="rdo-tabela">
            <thead><tr><th>Serviço</th><th>Ambiente</th><th>Responsável</th><th className="num">No dia</th><th className="num">Acumulado</th><th>Detalhe do dia</th></tr></thead>
            <tbody>
              {f.servicos.map((s, i) => (
                <tr key={i}>
                  <td>{s.servico}{s.fora && <em className="rdo-fora"> · fora do orçamento</em>}</td>
                  <td>{s.ambiente || '—'}</td>
                  <td>{s.responsavel || '—'}</td>
                  <td className="num">{s.fora ? (s.quantidade || '—') : (s.noDia == null ? '—' : `${s.noDia}%`)}</td>
                  <td className="num">{s.fora ? '—' : `${s.acumulado}%${s.concluido ? ' ✓' : ''}`}</td>
                  <td>{s.detalhe || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="rdo-secao">
        <h3>Ferramentas e equipamentos</h3>
        {f.equipamentos.length === 0 ? <p className="rdo-vazio">Nenhum equipamento listado.</p> : (
          <table className="rdo-tabela">
            <thead><tr><th>Equipamento</th><th className="num">Quantidade</th><th>Origem</th><th>Situação</th></tr></thead>
            <tbody>{f.equipamentos.map((e, i) => <tr key={i}><td>{e.nome}</td><td className="num">{e.quantidade}</td><td>{e.origem}</td><td>{e.situacao}</td></tr>)}</tbody>
          </table>
        )}
      </section>

      <section className="rdo-secao">
        <h3>Ocorrências</h3>
        <p className={f.ocorrencias ? '' : 'rdo-vazio'}>{f.ocorrencias || 'Nenhuma ocorrência.'}</p>
      </section>

      {comFotos && f.fotos.length > 0 && (
        <section className="rdo-secao rdo-fotos-secao">
          <h3>Registro fotográfico</h3>
          <div className="rdo-fotos">
            {f.fotos.map((foto, i) => <figure key={i}><img src={foto.url} alt={foto.legenda} /><figcaption>{foto.legenda}</figcaption></figure>)}
          </div>
        </section>
      )}

      <section className="rdo-assinaturas">
        <div><span className="linha-assinatura" /><b>Mestre de obras</b><small>{f.lancadoPor}</small></div>
        <div><span className="linha-assinatura" /><b>Responsável técnico</b><small>&nbsp;</small></div>
      </section>

      <footer className="rdo-rodape">
        <span>Gerado pelo app FMZ Incorporadora em {f.geradoEm}</span>
        {f.rodape && <span>{f.rodape}</span>}
      </footer>
    </article>
  )
}

export default function RdoPdf({ selecionados, todos, obra, frentes, comFotos, onVoltar }) {
  const geradoEm = dataHoraPorExtenso(new Date())
  return (
    <>
      <div className="rdo-topo no-print">
        <button className="voltar" onClick={onVoltar}>← Diário</button>
        <div className="barra-acoes">
          <button className="btn btn-pri" onClick={() => window.print()}>Salvar em PDF</button>
        </div>
        <p className="nota">{resumoDoPdf(selecionados)}. No celular, escolha "Salvar como PDF" na tela de impressão.</p>
      </div>
      <div className="rdo-folhas">
        {selecionados.map((d) => <FolhaRdo key={d.id} f={folhaDoRdo(d, { obra, diarios: todos, frentes, geradoEm })} comFotos={comFotos} />)}
      </div>
    </>
  )
}
