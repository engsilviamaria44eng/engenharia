// Portal do cliente: só a obra dele, só a data do contrato, nenhum valor.
import { useObra } from '../lib/ObraContext.jsx'
import { formatarData } from '../lib/datas.js'
import { Vazio } from '../components/index.jsx'

export default function MinhaObra() {
  const { obra } = useObra()
  if (!obra) {
    return <Vazio titulo="Nenhuma obra liberada para você ainda" texto="Assim que o engenheiro liberar o acesso, a sua obra aparece aqui." />
  }
  return (
    <>
      <h1 className="titulo-tela">Minha obra</h1>
      <section className="cartao">
        <div className="cartao-corpo dados">
          <div><span>Obra</span><b>{obra.nome}</b></div>
          <div><span>Endereço</span><b>{obra.endereco}</b></div>
          <div><span>Entrega prevista em contrato</span><b>{formatarData(obra.data_entrega)}</b></div>
        </div>
      </section>
      <Vazio titulo="O acompanhamento da obra vem aqui"
        texto="Em breve você vai ver aqui o avanço de cada ambiente e as fotos da semana." />
    </>
  )
}
