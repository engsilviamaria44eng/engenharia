// Painel de frentes: a tela das manhãs do engenheiro. Só a obra atual.
import { useEffect, useState } from 'react'
import { useObra } from '../lib/ObraContext.jsx'
import { listarFrentes } from '../lib/dados.js'
import { ordenarParaPainel, resumoEntrega, DIAS_ATENCAO } from '../lib/painel.js'
import { formatarData } from '../lib/datas.js'
import { FrenteLinha, Vazio } from '../components/index.jsx'

function Entrega({ obra, r }) {
  if (obra.situacao === 'Parada') {
    return (
      <section className="entrega parada" aria-label="Situação da entrega">
        <span className="estado">Obra parada</span>
        <span className="data">{formatarData(obra.data_entrega)}</span>
        <span className="explica">Data de entrega do contrato. A previsão volta a ser calculada quando a obra for retomada.</span>
      </section>
    )
  }
  if (r.risco) {
    const partes = []
    if (r.atrasadas) partes.push(`${r.atrasadas} ${r.atrasadas === 1 ? 'frente atrasada' : 'frentes atrasadas'}`)
    if (r.paradas) partes.push(`${r.paradas} ${r.paradas === 1 ? 'parada' : 'paradas'}`)
    return (
      <section className="entrega risco" aria-label="Situação da entrega">
        <span className="estado">Entrega em risco</span>
        <span className="data">{formatarData(r.previsao)}</span>
        <span className="explica">
          Previsão de entrega{r.atrasoDias ? `, ${r.atrasoDias} ${r.atrasoDias === 1 ? 'dia' : 'dias'} depois` : ''} do contrato ({formatarData(obra.data_entrega)}). {partes.join(' e ')}.
        </span>
      </section>
    )
  }
  return (
    <section className="entrega" aria-label="Situação da entrega">
      <span className="estado">Entrega de pé</span>
      <span className="data">{formatarData(obra.data_entrega)}</span>
      <span className="explica">Nenhuma frente atrasada ou parada.</span>
    </section>
  )
}

export default function Painel({ goto }) {
  const { obra } = useObra()
  const [frentes, setFrentes] = useState(null)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    listarFrentes().then(({ data, erro: e }) => {
      if (e) { setErro(e); return }
      setFrentes(data)
    })
  }, [obra?.id])

  if (erro) return <p>{erro}</p>
  if (!frentes) return <p className="nota">Carregando as frentes…</p>

  if (frentes.length === 0) {
    return (
      <>
        <h1 className="titulo-tela">Painel de frentes</h1>
        <Vazio icone="painel" titulo="Nenhuma frente cadastrada nesta obra"
          texto="Cadastre as frentes do cronograma para o painel mostrar o que está atrasado. Elas nascem dos itens do orçamento.">
          <button className="btn btn-pri" onClick={() => goto('orcamento')}>Ir para o orçamento</button>
        </Vazio>
      </>
    )
  }

  const lista = ordenarParaPainel(frentes)
  const r = resumoEntrega(obra.data_entrega, frentes)
  const corFolga = r.menorFolga === null ? '' : r.menorFolga < 0 ? 'verm' : r.menorFolga <= DIAS_ATENCAO ? 'ocre' : 'verde'

  return (
    <>
      <h1 className="titulo-tela">Painel de frentes</h1>
      <Entrega obra={obra} r={r} />
      <div className="resumo">
        <div className={`stat ${r.atrasadas ? 'verm' : 'verde'}`}><span className="rot">Atrasadas</span><span className="val">{r.atrasadas}</span></div>
        <div className={`stat ${r.paradas ? 'verm' : 'verde'}`}><span className="rot">Paradas</span><span className="val">{r.paradas}</span></div>
        <div className={`stat ${corFolga}`}><span className="rot">Menor folga</span>
          <span className="val">{r.menorFolga === null ? '—' : r.menorFolga < 0 ? `−${Math.abs(r.menorFolga)}` : r.menorFolga}<small>dias</small></span></div>
      </div>
      <section className="cartao">
        <div className="cartao-cab">
          <h2 className="secao">Frentes em aberto<small>da menor folga para a maior</small></h2>
          <span className="contagem">{lista.length}</span>
        </div>
        {lista.map((f) => <FrenteLinha key={f.id} frente={f} />)}
      </section>
    </>
  )
}
