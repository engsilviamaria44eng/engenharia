import Casca from './Casca.jsx'
import Hoje from '../screens/hoje.jsx'
import Diario from '../screens/diario.jsx'
import Frentes from '../screens/frentes.jsx'
import Qualidade from '../screens/qualidade.jsx'

const MENU = [['hoje', 'Hoje'], ['diario', 'Diário'], ['qualidade', 'Qualidade'], ['frentes', 'Frentes']]
const TELAS = { hoje: Hoje, diario: Diario, qualidade: Qualidade, frentes: Frentes }

export default function AppMestre({ usuario, onSair }) {
  return <Casca usuario={usuario} onSair={onSair} menu={MENU} telas={TELAS} inicial="hoje" />
}
