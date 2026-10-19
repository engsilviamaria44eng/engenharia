// Orçamento (engenheiro). Abas: os itens do orçamento (ainda em construção) e Materiais.
import { useState } from 'react'
import { Vazio } from '../components/index.jsx'
import { useObra } from '../lib/ObraContext.jsx'
import Materiais from './materiais.jsx'

const ABAS = [['itens', 'Itens do orçamento'], ['materiais', 'Materiais']]

export default function Orcamento() {
  const { obra } = useObra()
  const [aba, setAba] = useState('itens')

  return (
    <>
      <h1 className="titulo-tela">Orçamento</h1>
      <div className="abas-tela" role="tablist" aria-label="Partes do orçamento">
        {ABAS.map(([id, rotulo]) => (
          <button key={id} role="tab" aria-selected={aba === id} className={`chip-filtro ${aba === id ? 'ativo' : ''}`} onClick={() => setAba(id)}>
            {rotulo}
          </button>
        ))}
      </div>
      {aba === 'materiais' ? <Materiais /> : (
        <Vazio icone="orcamento" titulo="Esta parte ainda está sendo construída"
          texto="Aqui vão ficar as etapas e os itens do orçamento analítico, o cronograma físico-financeiro, as frentes de serviço e a calculadora de materiais.">
          <p className="nota">Obra atual: <span className="obra-atual">{obra ? `${obra.codigo} · ${obra.nome}` : 'nenhuma'}</span></p>
        </Vazio>
      )}
    </>
  )
}
