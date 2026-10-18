// Frentes da obra, para o mestre: só leitura, sem nenhum valor em R$.
import { useEffect, useState } from 'react'
import { useObra } from '../lib/ObraContext.jsx'
import { listarFrentes } from '../lib/dados.js'
import { ordenarParaPainel } from '../lib/painel.js'
import { FrenteLinha, Vazio } from '../components/index.jsx'

export default function Frentes() {
  const { obra } = useObra()
  const [frentes, setFrentes] = useState(null)

  useEffect(() => {
    listarFrentes().then(({ data }) => setFrentes(data || []))
  }, [obra?.id])

  if (!frentes) return <p className="nota">Carregando as frentes…</p>
  if (frentes.length === 0) {
    return (
      <>
        <h1 className="titulo-tela">Frentes</h1>
        <Vazio icone="frentes" titulo="Ainda não há frentes nesta obra" texto="Peça ao engenheiro para cadastrar as frentes de serviço." />
      </>
    )
  }
  const lista = ordenarParaPainel(frentes)
  return (
    <>
      <h1 className="titulo-tela">Frentes</h1>
      <section className="cartao">
        <div className="cartao-cab">
          <h2 className="secao">Frentes em aberto<small>as mais apertadas primeiro</small></h2>
          <span className="contagem">{lista.length}</span>
        </div>
        {lista.map((f) => <FrenteLinha key={f.id} frente={f} />)}
      </section>
    </>
  )
}
