// O PLANEJAMENTO da obra atual: UMA lista de atividades e a configuração de dias úteis,
// compartilhadas pelas 4 abas (EAP, longo, médio e curto prazo). Mudou numa aba, as outras
// já veem. Tudo otimista: a tela muda na hora e desfaz se a gravação der erro.
import { createContext, useContext, useEffect, useState } from 'react'
import { useObra } from './ObraContext.jsx'
import {
  listarAtividadesPlanejamento, criarAtividadePlanejamento, salvarAtividadesPlanejamento,
  lerConfigPlanejamento, salvarConfigPlanejamento,
} from './dados.js'

const PlanejamentoContext = createContext(null)

export function PlanejamentoProvider({ children }) {
  const { obra } = useObra()
  const [estado, setEstado] = useState({ carregando: true, erro: null })
  const [atividades, setAtividades] = useState([])
  const [config, setConfig] = useState(null)
  const [aviso, setAviso] = useState(null)

  async function carregar() {
    setEstado({ carregando: true, erro: null })
    const [ra, rc] = await Promise.all([listarAtividadesPlanejamento(), lerConfigPlanejamento()])
    const erro = ra.erro || rc.erro
    if (erro) {
      setEstado({ carregando: false, erro })
      return
    }
    setAtividades(ra.data)
    setConfig(rc.data)
    setEstado({ carregando: false, erro: null })
  }

  useEffect(() => { carregar() }, [obra?.id])

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), 3000)
    return () => clearTimeout(t)
  }, [aviso])

  async function criar(nova, mensagem) {
    const temp = { ...nova, id: `temp-${Date.now()}` }
    setAtividades((lista) => [...lista, temp])
    const { data, erro } = await criarAtividadePlanejamento(nova)
    if (erro) {
      setAtividades((lista) => lista.filter((a) => a.id !== temp.id))
      setAviso(`Não foi possível criar a atividade: ${erro}`)
      return
    }
    setAtividades((lista) => lista.map((a) => (a.id === temp.id ? data : a)))
    setAviso(mensagem)
  }

  // Grava uma ou várias atividades já alteradas (a regra da mudança vem de lib/planejamento.js).
  async function salvar(alteradas, mensagem) {
    if (alteradas.length === 0) return
    const novas = new Map(alteradas.map((a) => [a.id, a]))
    const antes = new Map(atividades.filter((a) => novas.has(a.id)).map((a) => [a.id, a]))
    setAtividades((lista) => lista.map((a) => novas.get(a.id) ?? a))
    const { erro } = await salvarAtividadesPlanejamento(alteradas)
    if (erro) {
      // Desfaz só o que ainda está como esta gravação deixou: outra mudança feita
      // depois (e já gravada) não é apagada.
      setAtividades((lista) => lista.map((a) => (novas.get(a.id) === a ? antes.get(a.id) : a)))
      setAviso(`Não foi possível salvar: ${erro}`)
      return
    }
    setAviso(mensagem)
  }

  async function salvarConfig(nova) {
    const antes = config
    setConfig(nova)
    const { erro } = await salvarConfigPlanejamento(nova)
    if (erro) {
      setConfig(antes)
      setAviso(`Não foi possível salvar os dias úteis: ${erro}`)
      return
    }
    setAviso('Dias úteis salvos')
  }

  return (
    <PlanejamentoContext.Provider value={{ estado, atividades, config, aviso, carregar, criar, salvar, salvarConfig }}>
      {children}
    </PlanejamentoContext.Provider>
  )
}

export function usePlanejamento() {
  return useContext(PlanejamentoContext)
}
