import Casca from './Casca.jsx'
import Painel from '../screens/painel.jsx'
import Orcamento from '../screens/orcamento.jsx'
import Diario from '../screens/diario.jsx'
import Medicao from '../screens/medicao.jsx'
import Obras from '../screens/obras.jsx'
import Planejamento from '../screens/planejamento.jsx'
import Qualidade from '../screens/qualidade.jsx'
import Relatorios from '../screens/relatorios.jsx'

// [chave, rótulo, rótulo curto da barra do celular]
const MENU = [
  ['painel', 'Painel'], ['planejamento', 'Planejamento', 'Planejar'], ['orcamento', 'Orçamento', 'Orçam.'], ['diario', 'Diário'],
  ['qualidade', 'Qualidade', 'Qualid.'], ['medicao', 'Medição'], ['relatorios', 'Relatórios', 'Relat.'], ['obras', 'Obras'],
]
const TELAS = { painel: Painel, planejamento: Planejamento, orcamento: Orcamento, diario: Diario, qualidade: Qualidade, medicao: Medicao, relatorios: Relatorios, obras: Obras }

export default function AppEngenheiro({ usuario, onSair }) {
  return <Casca usuario={usuario} onSair={onSair} menu={MENU} telas={TELAS} inicial="painel" />
}
