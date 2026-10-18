// A OBRA ATUAL do app: a lista de obras da pessoa, a escolhida e a troca.
// A escolha fica guardada no aparelho (por pessoa): fechou e abriu, volta na mesma.
import { createContext, useContext, useEffect, useState } from 'react'
import { listarObrasDoUsuario, definirObraAtual } from './dados.js'
import { escolherObraInicial, chaveObraGuardada } from './obras.js'

const ObraContext = createContext(null)

function lerGuardada(chave) {
  try { return localStorage.getItem(chave) } catch { return null }
}

function guardar(chave, id) {
  try { localStorage.setItem(chave, id) } catch { /* aparelho sem armazenamento: só não lembra a obra */ }
}

export function ObraProvider({ usuario, children }) {
  const [obras, setObras] = useState(null)
  const [obraId, setObraId] = useState(null)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    let vivo = true
    listarObrasDoUsuario(usuario.id).then(({ data, erro: e }) => {
      if (!vivo) return
      if (e) { setErro(e); return }
      const chave = chaveObraGuardada(usuario.id)
      const id = escolherObraInicial(data, lerGuardada(chave))
      definirObraAtual(id)
      if (id) guardar(chave, id)
      setObras(data)
      setObraId(id)
    })
    return () => { vivo = false }
  }, [usuario.id])

  function trocarObra(id) {
    // A camada de dados muda ANTES da tela: nenhuma busca sai com a obra anterior.
    definirObraAtual(id)
    guardar(chaveObraGuardada(usuario.id), id)
    setObraId(id)
    window.scrollTo(0, 0)
  }

  if (erro) return <div className="conteudo"><p>{erro}</p></div>
  if (!obras) return <div className="conteudo"><p>Carregando…</p></div>

  const obra = obras.find((o) => o.id === obraId) || null
  return (
    <ObraContext.Provider value={{ obras, obra, trocarObra }}>
      {children}
    </ObraContext.Provider>
  )
}

export function useObra() {
  return useContext(ObraContext)
}
