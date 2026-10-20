// LOGIN DE DEMONSTRAÇÃO: enquanto não há banco, entra-se escolhendo uma pessoa.
// O proprietário (perfil Cliente) digita o próprio nome antes de entrar.
// Na etapa do Supabase vira e-mail e senha (sem "Criar conta": só entra quem é convidado).
import { useEffect, useState } from 'react'
import { listarUsuariosDemo } from '../lib/dados.js'
import { validarNomeDigitado } from '../lib/obras.js'

const GRUPOS = [
  { titulo: 'Escritório', role: 'Engenheiro', det: 'Vê todas as obras, com valores' },
  { titulo: 'Canteiro', role: 'Mestre', det: 'Lança o diário da sua obra' },
  { titulo: 'Proprietário', role: 'Cliente', det: 'Acompanha a própria obra', digitaNome: true },
]

// O proprietário digita o nome; o erro aparece ao tentar entrar e some ao corrigir.
function EntrarComNome({ usuario, det, onEntrar }) {
  const [texto, setTexto] = useState('')
  const [tentou, setTentou] = useState(false)
  const r = validarNomeDigitado(texto)
  function entrar(e) {
    e.preventDefault()
    setTentou(true)
    if (!r.erro) onEntrar({ ...usuario, nome: r.nome })
  }
  return (
    <form className="perfil-nome" onSubmit={entrar} noValidate>
      <label className="campo">
        <span className="campo-rot">Seu nome</span>
        <input type="text" value={texto} onChange={(e) => setTexto(e.target.value)} autoComplete="name" maxLength={80}
          placeholder="Ex.: Paula Mendes" aria-invalid={tentou && !!r.erro} aria-describedby="erro-nome" />
      </label>
      {tentou && r.erro && <p id="erro-nome" className="campo-erro" role="alert">{r.erro}</p>}
      <button type="submit" className="btn btn-pri">Entrar como proprietário</button>
      <span className="det">{det}</span>
    </form>
  )
}

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
              {g.digitaNome ? <EntrarComNome usuario={doGrupo[0]} det={g.det} onEntrar={onEntrar} /> : doGrupo.map((u) => (
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
