// HOJE (mestre): a tela de abertura do mestre é lançar o diário do dia.
import { useEffect, useState } from 'react'
import { useObra } from '../lib/ObraContext.jsx'
import { listarDiarios, listarFrentes, salvarDiario } from '../lib/dados.js'
import LancarDia from './lancarDia.jsx'

export default function Hoje({ usuario }) {
  const { obra } = useObra()
  const [estado, setEstado] = useState({ carregando: true, erro: null })
  const [frentes, setFrentes] = useState([])
  const [diarios, setDiarios] = useState([])
  const [aviso, setAviso] = useState(null)

  async function carregar() {
    setEstado({ carregando: true, erro: null })
    const [rf, rd] = await Promise.all([listarFrentes(), listarDiarios()])
    const erro = rf.erro || rd.erro
    if (erro) { setEstado({ carregando: false, erro }); return }
    setFrentes(rf.data)
    setDiarios(rd.data)
    setEstado({ carregando: false, erro: null })
  }

  useEffect(() => { carregar() }, [obra?.id])

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), 3000)
    return () => clearTimeout(t)
  }, [aviso])

  async function salvar(diario) {
    const { data, erro } = await salvarDiario(diario)
    if (erro) { setAviso(`Não foi possível salvar: ${erro}`); return false }
    setDiarios((lista) => [...lista.filter((d) => d.id !== data.id), data])
    setAviso('Diário de hoje salvo')
    return true
  }

  if (estado.carregando) return <p className="nota">Carregando o diário de hoje…</p>
  if (estado.erro) {
    return (
      <div className="vazio" role="alert">
        <h3>O diário não carregou</h3>
        <p>{estado.erro} Confira a internet e tente de novo.</p>
        <button className="btn btn-pri" onClick={carregar}>Tentar de novo</button>
      </div>
    )
  }

  return (
    <>
      <LancarDia key={obra?.id} obra={obra} frentes={frentes} diarios={diarios} usuario={usuario} onSalvar={salvar} />
      {aviso && <div className="aviso-toast" role="status">{aviso}</div>}
    </>
  )
}
