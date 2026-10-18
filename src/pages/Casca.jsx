// A "casca" de cada perfil: seletor de obra no topo, menu (lateral ou inferior)
// e a tela atual. Navegação por estado, sem endereço no navegador.
import { useState } from 'react'
import { CabecalhoObra, Navegacao, useDesktop } from '../components/index.jsx'

export default function Casca({ usuario, onSair, menu, telas, inicial }) {
  const desktop = useDesktop()
  const [rota, setRota] = useState({ tela: inicial, params: {} })
  const goto = (tela, params = {}) => { setRota({ tela, params }); window.scrollTo(0, 0) }

  const Tela = telas[rota.tela] || telas[inicial]

  return (
    <div className="app" data-desktop={desktop ? '1' : '0'}>
      {desktop && (
        <Navegacao itens={menu} atual={rota.tela} goto={goto} desktop usuario={usuario} onSair={onSair} />
      )}
      <main className="principal">
        <CabecalhoObra />
        <div className="conteudo">
          <Tela goto={goto} params={rota.params} usuario={usuario} />
          {!desktop && (
            <button className="sair-celular" onClick={onSair}>Sair · {usuario.nome} ({usuario.role})</button>
          )}
        </div>
      </main>
      {!desktop && menu.length > 0 && (
        <Navegacao itens={menu} atual={rota.tela} goto={goto} usuario={usuario} onSair={onSair} />
      )}
    </div>
  )
}
