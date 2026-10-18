// Escolhe a casca pelo perfil. A obra atual envolve tudo (ObraProvider), e a casca
// REMONTA quando a obra muda (key={obra.id}): nada da obra anterior sobra na tela.
import { useState } from 'react'
import { ObraProvider, useObra } from './lib/ObraContext.jsx'
import Login from './pages/Login.jsx'
import AppEngenheiro from './pages/AppEngenheiro.jsx'
import AppMestre from './pages/AppMestre.jsx'
import AppCliente from './pages/AppCliente.jsx'

const CHAVE_SESSAO = 'obraemdia:usuario-demo'

function lerSessao() {
  try { return JSON.parse(localStorage.getItem(CHAVE_SESSAO)) } catch { return null }
}

function CascaDoPerfil({ usuario, onSair }) {
  const { obra } = useObra()
  const chave = obra ? obra.id : 'sem-obra'
  if (usuario.role === 'Mestre') return <AppMestre key={chave} usuario={usuario} onSair={onSair} />
  if (usuario.role === 'Cliente') return <AppCliente key={chave} usuario={usuario} onSair={onSair} />
  return <AppEngenheiro key={chave} usuario={usuario} onSair={onSair} />
}

export default function App() {
  const [usuario, setUsuario] = useState(lerSessao)

  function entrar(u) {
    try { localStorage.setItem(CHAVE_SESSAO, JSON.stringify(u)) } catch { /* sem armazenamento: entra assim mesmo */ }
    setUsuario(u)
  }

  function sair() {
    try { localStorage.removeItem(CHAVE_SESSAO) } catch { /* nada a limpar */ }
    setUsuario(null)
  }

  if (!usuario) return <Login onEntrar={entrar} />
  return (
    <ObraProvider key={usuario.id} usuario={usuario}>
      <CascaDoPerfil usuario={usuario} onSair={sair} />
    </ObraProvider>
  )
}
