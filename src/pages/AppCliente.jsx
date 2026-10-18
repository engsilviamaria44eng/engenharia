import Casca from './Casca.jsx'
import MinhaObra from '../screens/minhaObra.jsx'

// Cliente tem tela única: sem menu.
export default function AppCliente({ usuario, onSair }) {
  return <Casca usuario={usuario} onSair={onSair} menu={[]} telas={{ minhaObra: MinhaObra }} inicial="minhaObra" />
}
