// LOGIN DE DEMONSTRAÇÃO: enquanto não há banco, entra-se escolhendo uma pessoa.
// Na etapa do Supabase vira e-mail e senha (sem "Criar conta": só entra quem é convidado).
import { useEffect, useState } from 'react'
import { listarUsuariosDemo } from '../lib/dados.js'

const GRUPOS = [
  { titulo: 'Escritório', role: 'Engenheiro', det: 'Vê todas as obras, com valores' },
  { titulo: 'Canteiro', role: 'Mestre', det: 'Lança o diário da sua obra' },
  { titulo: 'Cliente', role: 'Cliente', det: 'Acompanha a própria obra' },
]

export default function Login({ onEntrar }) {
  const [usuarios, setUsuarios] = useState([])

  useEffect(() => {
    listarUsuariosDemo().then(({ data }) => setUsuarios(data || []))
  }, [])

  return (
    <main className="login">
      <img className="login-logo" src="/logo-fmz-recorte.png" alt="FMZ Incorporadora" />
      <div className="login-caixa">
        <h1>Acompanhamento de obras</h1>
        <p className="aviso-demo">Versão de demonstração, com dados de exemplo. Escolha com quem entrar.</p>
        {GRUPOS.map((g) => {
          const doGrupo = usuarios.filter((u) => u.role === g.role)
          if (doGrupo.length === 0) return null
          return (
            <section key={g.role} className="grupo-perfil">
              <h2>{g.titulo}</h2>
              {doGrupo.map((u) => (
                <button key={u.id} className="perfil" onClick={() => onEntrar(u)}>
                  <span className="inicial" aria-hidden="true">{u.nome.charAt(0)}</span>
                  <span><b>{u.nome}</b><span className="det">{u.role} · {g.det}</span></span>
                </button>
              ))}
            </section>
          )
        })}
      </div>
    </main>
  )
}
