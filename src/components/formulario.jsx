// Peças de formulário em folha (painel que sobe de baixo no celular), usadas pelo Planejamento.
import { useEffect, useRef } from 'react'

export function Campo({ rotulo, erro, children, dica }) {
  return (
    <label className="campo">
      <span className="campo-rot">{rotulo}</span>
      {children}
      {dica && !erro && <span className="campo-dica">{dica}</span>}
      {erro && <span className="campo-erro" role="alert">{erro}</span>}
    </label>
  )
}

export function Folha({ titulo, onFechar, children }) {
  // Guarda sempre o onFechar mais novo: o Esc fecha com o estado de agora, não o da abertura.
  const fechar = useRef(onFechar)
  useEffect(() => { fechar.current = onFechar })
  useEffect(() => {
    const aoTeclar = (e) => { if (e.key === 'Escape') fechar.current() }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [])
  return (
    <div className="veu" onClick={(e) => { if (e.target === e.currentTarget) onFechar() }}>
      <div className="folha folha-form" role="dialog" aria-modal="true" aria-label={titulo}>
        <h3>{titulo}</h3>
        {children}
      </div>
    </div>
  )
}

// Pergunta antes de arquivar, remover ou limpar.
export function Confirmar({ titulo, texto, rotuloSim, onSim, onFechar }) {
  return (
    <Folha titulo={titulo} onFechar={onFechar}>
      <p className="form-sub">{texto}</p>
      <div className="form-acoes">
        <button type="button" className="btn btn-sec" onClick={onFechar}>Cancelar</button>
        <button type="button" className="btn btn-pri" onClick={onSim}>{rotuloSim}</button>
      </div>
    </Folha>
  )
}
