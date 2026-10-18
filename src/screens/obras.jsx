// Obras e equipe (engenheiro). Na Fundação: os dados da obra atual e o cadastro
// das obras. A lista de obras é o CADASTRO, não lançamento — não mistura dados de obra.
import { useObra } from '../lib/ObraContext.jsx'
import { formatarData } from '../lib/datas.js'
import { Pill } from '../components/index.jsx'

export default function Obras() {
  const { obras, obra, trocarObra } = useObra()

  return (
    <>
      <h1 className="titulo-tela">Obras e equipe</h1>
      {obra && (
        <section className="cartao">
          <div className="cartao-cab"><h2 className="secao">Obra atual</h2><Pill situacao={obra.situacao} /></div>
          <div className="cartao-corpo dados">
            <div><span>Código</span><b>{obra.codigo}</b></div>
            <div><span>Nome</span><b>{obra.nome}</b></div>
            <div><span>Endereço</span><b>{obra.endereco}</b></div>
            <div><span>Cliente</span><b>{obra.cliente}</b></div>
            <div><span>Início</span><b>{formatarData(obra.data_inicio)}</b></div>
            <div><span>Entrega (a do contrato)</span><b>{formatarData(obra.data_entrega)}</b></div>
          </div>
        </section>
      )}
      <section className="cartao">
        <div className="cartao-cab"><h2 className="secao">Suas obras</h2><span className="contagem">{obras.length}</span></div>
        {obras.map((o) => {
          const atual = obra && o.id === obra.id
          return (
            <button key={o.id} className={`op-obra ${atual ? 'atual' : ''}`} aria-current={atual ? 'true' : undefined}
              onClick={() => { if (!atual) trocarObra(o.id) }}>
              <span className="selo">{o.codigo}</span>
              <span className="txt"><b>{o.nome}</b><span className="det">{o.cliente} · início {formatarData(o.data_inicio)} · entrega {formatarData(o.data_entrega)}</span></span>
              <Pill situacao={o.situacao} />
            </button>
          )
        })}
        <p className="cartao-corpo nota">
          Cadastrar obra, ambientes e empreiteiros e convidar a equipe vão ficar aqui também.
        </p>
      </section>
    </>
  )
}
