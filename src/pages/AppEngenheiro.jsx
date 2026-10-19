import Casca from './Casca.jsx'
import Painel from '../screens/painel.jsx'
import Orcamento from '../screens/orcamento.jsx'
import Diario from '../screens/diario.jsx'
import Medicao from '../screens/medicao.jsx'
import Obras from '../screens/obras.jsx'
import Planejamento from '../screens/planejamento.jsx'

const MENU = [['painel', 'Painel'], ['planejamento', 'Planejamento', 'Planejar'], ['orcamento', 'Orçamento'], ['diario', 'Diário'], ['medicao', 'Medição'], ['obras', 'Obras']]
const TELAS = { painel: Painel, planejamento: Planejamento, orcamento: Orcamento, diario: Diario, medicao: Medicao, obras: Obras }

export default function AppEngenheiro({ usuario, onSair }) {
  return <Casca usuario={usuario} onSair={onSair} menu={MENU} telas={TELAS} inicial="painel" />
}
