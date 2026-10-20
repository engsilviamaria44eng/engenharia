// Peças reutilizáveis da interface.
import { useEffect, useState } from 'react'
import { useObra } from '../lib/ObraContext.jsx'
import { classeSituacao, podeTrocarDeObra, rotuloDoPapel } from '../lib/obras.js'
import { formatarData } from '../lib/datas.js'
import { corDaFrente, etiquetaDaFrente } from '../lib/painel.js'

const CAMINHOS = {
  painel: <><rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" /><rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" /></>,
  orcamento: <><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M8 6h8M8 10h3M13 10h3M8 14h3M13 14h3M8 18h3M13 18h3" /></>,
  diario: <><path d="M4 4h12a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4z" /><path d="M8 9h8M8 13h6" /></>,
  medicao: <><path d="M3 17 17 3l4 4L7 21H3z" /><path d="m13 7 2 2M10 10l2 2M7 13l2 2" /></>,
  obras: <><path d="M3 21h18M5 21V9l7-5 7 5v12" /><path d="M10 21v-6h4v6" /></>,
  planejamento: <><path d="M3 3v18h18" /><path d="M7 7h7M10 12h8M8 17h6" /></>,
  // tipos de restrição do Planejamento
  material: <><path d="M21 8 12 3 3 8v8l9 5 9-5z" /><path d="m3 8 9 5 9-5M12 13v8" /></>,
  mao_de_obra: <><circle cx="12" cy="7" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" /></>,
  metodo: <><path d="M9 6h11M9 12h11M9 18h11" /><path d="m3 6 1 1 2-2M3 12l1 1 2-2M3 18l1 1 2-2" /></>,
  equipamento: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1" /></>,
  projeto: <><path d="M3 3h18v18H3z" /><path d="M3 9h6v12M15 3v8h6" /></>,
  seguranca: <><path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5z" /><path d="m9 12 2 2 4-4" /></>,
  logistica: <><path d="M1 4h14v12H1zM15 9h4l4 4v3h-8" /><circle cx="6" cy="18" r="2" /><circle cx="18" cy="18" r="2" /></>,
  qualidade: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 3h6v3H9zM9 13l2 2 4-4" /></>,
  camera: <><path d="M3 8h4l2-3h6l2 3h4v12H3z" /><circle cx="12" cy="13" r="4" /></>,
  relatorios: <><path d="M3 21h18" /><rect x="5" y="11" width="3" height="7" /><rect x="10.5" y="6" width="3" height="12" /><rect x="16" y="13" width="3" height="5" /></>,
  hoje: <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4M12 13v5M9.5 15.5h5" /></>,
  frentes: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  trocar: <path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" />,
}

// Ícones são decorativos: o texto ao lado diz o que é (aria-hidden).
export function Icon({ nome, tamanho = 24 }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {CAMINHOS[nome]}
    </svg>
  )
}

// Tela larga (>= 900px) = menu lateral; estreita = barra inferior.
export function useDesktop() {
  const [desktop, setDesktop] = useState(() => window.innerWidth >= 900)
  useEffect(() => {
    const aoMudar = () => setDesktop(window.innerWidth >= 900)
    window.addEventListener('resize', aoMudar)
    return () => window.removeEventListener('resize', aoMudar)
  }, [])
  return desktop
}

export function Pill({ situacao }) {
  return <span className={`pill ${classeSituacao(situacao)}`}>{situacao}</span>
}

// SELETOR DE OBRA: sempre visível no topo, diz em qual obra a pessoa está.
export function CabecalhoObra() {
  const { obras, obra, trocarObra } = useObra()
  const [aberto, setAberto] = useState(false)
  const pode = podeTrocarDeObra(obras)

  useEffect(() => {
    if (!aberto) return
    const aoTeclar = (e) => { if (e.key === 'Escape') setAberto(false) }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [aberto])

  return (
    <header className="cab">
      <img className="cab-logo" src="/logo-fmz-recorte.png" alt="FMZ Incorporadora" />
      <div className="cab-linha">
        <div className="cab-obra">
          <div className="cab-topo">
            {obra && <span className="selo" aria-label={`Obra ${obra.codigo}`}>{obra.codigo}</span>}
            <b>{obra ? obra.nome : 'Nenhuma obra'}</b>
          </div>
          {obra && (
            <div className="cab-info">
              <Pill situacao={obra.situacao} />
              <span>Entrega {formatarData(obra.data_entrega)}</span>
            </div>
          )}
        </div>
        {pode && (
          <button className="btn-trocar" onClick={() => setAberto(true)} aria-haspopup="dialog" aria-expanded={aberto}>
            <Icon nome="trocar" tamanho={18} /> Trocar
          </button>
        )}
      </div>
      {aberto && (
        <div className="veu" onClick={(e) => { if (e.target === e.currentTarget) setAberto(false) }}>
          <div className="folha" role="dialog" aria-modal="true" aria-label="Trocar de obra">
            <h3>Trocar de obra</h3>
            {obras.map((o) => {
              const atual = obra && o.id === obra.id
              return (
                <button key={o.id} className={`op-obra ${atual ? 'atual' : ''}`} aria-current={atual ? 'true' : undefined}
                  onClick={() => { setAberto(false); if (!atual) trocarObra(o.id) }}>
                  <span className="selo">{o.codigo}</span>
                  <span className="txt"><b>{o.nome}</b><span className="det">{o.cliente} · entrega {formatarData(o.data_entrega)}</span></span>
                  <Pill situacao={o.situacao} />
                </button>
              )
            })}
          </div>
        </div>
      )}
    </header>
  )
}

export function Navegacao({ itens, atual, goto, desktop, usuario, onSair }) {
  // Item do menu: [chave, rótulo, rótulo curto opcional para a barra do celular].
  const botoes = itens.map(([chave, rotulo, curto]) => (
    <button key={chave} className={`nav-item ${atual === chave ? 'ativo' : ''}`}
      onClick={() => goto(chave)} aria-current={atual === chave ? 'page' : undefined} aria-label={rotulo}>
      <span className="ic"><Icon nome={chave} /></span><span>{desktop ? rotulo : (curto ?? rotulo)}</span>
    </button>
  ))
  if (desktop) {
    return (
      <aside className="lateral" aria-label="Menu">
        <div className="nome-app">FMZ Incorporadora<span>Acompanhamento de obras</span></div>
        <nav aria-label="Telas">{botoes}</nav>
        <div className="rodape">
          <span><b>{usuario.nome}</b> · {rotuloDoPapel(usuario.role)}</span>
          <button onClick={onSair}>Sair</button>
        </div>
      </aside>
    )
  }
  return (
    <nav className={`barra-inf ${itens.length > 6 ? 'apertada' : ''}`} style={{ gridTemplateColumns: `repeat(${itens.length}, 1fr)` }} aria-label="Menu">
      {botoes}
    </nav>
  )
}

export function FrenteLinha({ frente }) {
  const cor = corDaFrente(frente)
  const sem = frente.dias_sem_andar === null
    ? 'ainda não começou'
    : <>há <b>{frente.dias_sem_andar} {frente.dias_sem_andar === 1 ? 'dia' : 'dias'}</b> sem andar</>
  return (
    <div className={`frente ${cor}`}>
      <span className="serv">{frente.servico}</span>
      <span className={`tag ${cor}`}>{etiquetaDaFrente(frente)}</span>
      <span className="meta">{frente.ambiente} · {frente.responsavel}</span>
      <span className="linha3">
        <span className="nw">
          <span className="mini-barra" role="img" aria-label={`Avanço ${frente.avanco}%`}><i style={{ width: `${frente.avanco}%` }} /></span>
          <b>{frente.avanco}%</b>
        </span>
        <span className="nw">{sem}</span>
        <span className="nw">decidir até <b>{frente.parada ? '—' : formatarData(frente.data_limite)}</b></span>
      </span>
    </div>
  )
}

export function Vazio({ icone = 'obras', titulo, texto, children }) {
  return (
    <div className="vazio">
      <span className="icone"><Icon nome={icone} tamanho={36} /></span>
      <h3>{titulo}</h3>
      <p>{texto}</p>
      {children}
    </div>
  )
}

// Tela-esqueleto: diz o que a tela vai fazer e em qual obra está.
export function EmConstrucao({ titulo, icone, oQueFaz }) {
  const { obra } = useObra()
  return (
    <>
      <h1 className="titulo-tela">{titulo}</h1>
      <Vazio icone={icone} titulo="Esta tela ainda está sendo construída" texto={oQueFaz}>
        <p className="nota">Obra atual: <span className="obra-atual">{obra ? `${obra.codigo} · ${obra.nome}` : 'nenhuma'}</span></p>
      </Vazio>
    </>
  )
}
