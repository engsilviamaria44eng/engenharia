// PLANEJAMENTO · aba EAP: a árvore de atividades da obra, com código automático.
// É a base das outras abas: o que se cria, edita ou arquiva aqui aparece nelas.
import { useState } from 'react'
import { usePlanejamento } from '../lib/PlanejamentoContext.jsx'
import {
  linhasEAP, opcoesDePai, resumo, temRestricaoAberta, temFilhosAtivos, viraGrupo, rotuloStatusAtividade,
  validarAtividade, novaAtividade, aplicarEdicao, arquivarComFilhos, diasUteisEntre, ehDiaUtil, diaDaSemana, DIAS_SEMANA,
} from '../lib/planejamento.js'
import { formatarData, hojeISO } from '../lib/datas.js'
import { Vazio } from '../components/index.jsx'
import { Campo, Folha, Confirmar } from '../components/formulario.jsx'

const nomeDoDia = (iso) => DIAS_SEMANA.find((d) => d.id === diaDaSemana(iso)).nome.toLowerCase()

function FormAtividade({ titulo, rotuloBotao, inicial, grupo, opcoes, atividades, config, onSalvar, onFechar }) {
  const [d, setD] = useState(inicial)
  const [tocados, setTocados] = useState({})
  const erros = validarAtividade(d, config, { grupo })
  const mostra = (c) => (tocados[c] || tocados._enviar) && erros[c]
  const toca = (c) => () => setTocados({ ...tocados, [c]: true })

  function enviar(e) {
    e.preventDefault()
    setTocados({ _enviar: true })
    if (Object.keys(erros).length === 0) onSalvar(d)
  }

  let dicaFim = null
  if (!grupo && d.inicio && d.fim && !erros.fim) {
    const n = diasUteisEntre(d.inicio, d.fim, config)
    dicaFim = `Duração: ${n} ${n === 1 ? 'dia útil' : 'dias úteis'}`
    if (!ehDiaUtil(d.fim, config)) dicaFim += ` · termina num dia não útil (${nomeDoDia(d.fim)})`
  }
  const dicaInicio = !grupo && d.inicio && !ehDiaUtil(d.inicio, config) ? `Começa num dia não útil (${nomeDoDia(d.inicio)}).` : null

  return (
    <Folha titulo={titulo} onFechar={onFechar}>
      <form className="form" onSubmit={enviar} noValidate>
        <Campo rotulo="Nome da atividade" erro={mostra('titulo')}>
          <input type="text" value={d.titulo} placeholder="Reboco interno" autoFocus
            onChange={(e) => setD({ ...d, titulo: e.target.value })} onBlur={toca('titulo')} />
        </Campo>
        <Campo rotulo="Onde fica na EAP" dica="Escolha uma atividade para esta virar subatividade dela.">
          <select value={d.pai_id ?? ''} onChange={(e) => setD({ ...d, pai_id: e.target.value || null })}>
            <option value="">No nível principal</option>
            {opcoes.map((l) => (
              <option key={l.atividade.id} value={l.atividade.id}>
                {'  '.repeat(l.nivel)}Dentro de {l.codigo} {l.atividade.titulo}
              </option>
            ))}
          </select>
        </Campo>
        {viraGrupo(atividades, d.pai_id) && (
          <p className="alerta-form">
            "{atividades.find((a) => a.id === d.pai_id)?.titulo}" vai virar um grupo: as datas e o progresso dela passam a vir das subatividades.
          </p>
        )}
        {grupo ? (
          <p className="alerta-form">As datas e o progresso deste grupo vêm das subatividades dele.</p>
        ) : (
          <div className="campos-lado">
            <Campo rotulo="Início" erro={mostra('inicio')} dica={dicaInicio}>
              <input type="date" value={d.inicio} onChange={(e) => setD({ ...d, inicio: e.target.value })} onBlur={toca('inicio')} />
            </Campo>
            <Campo rotulo="Fim" erro={mostra('fim')} dica={dicaFim}>
              <input type="date" value={d.fim} min={d.inicio || undefined} onChange={(e) => setD({ ...d, fim: e.target.value })} onBlur={toca('fim')} />
            </Campo>
          </div>
        )}
        <div className="form-acoes">
          <button type="button" className="btn btn-sec" onClick={onFechar}>Cancelar</button>
          <button type="submit" className="btn btn-pri">{rotuloBotao}</button>
        </div>
      </form>
    </Folha>
  )
}

function LinhaEAP({ linha, atividades, config, onEditar, onSub, onArquivar }) {
  const { atividade: a, codigo, nivel, grupo } = linha
  const r = resumo(atividades, a.id, config)
  const impedida = !a.arquivada && temRestricaoAberta(a)
  return (
    <li className={`eap-linha ${grupo ? 'grupo' : ''} ${a.arquivada ? 'arquivada' : ''}`} style={{ '--nivel': nivel }}>
      <div className="eap-topo">
        <span className="eap-cod">{codigo ?? 'arq.'}</span>
        <span className="eap-titulo">{a.titulo}</span>
      </div>
      <div className="eap-info">
        <span className="nw">{formatarData(r.inicio)} → {formatarData(r.fim)}</span>
        <span className="nw">{r.dias} {r.dias === 1 ? 'dia útil' : 'dias úteis'}</span>
        <span className="nw">
          <span className="mini-barra" role="img" aria-label={`Progresso ${r.progresso}%`}><i style={{ width: `${r.progresso}%` }} /></span>
          <b>{r.progresso}%</b>
        </span>
      </div>
      <div className="pills">
        {a.arquivada && <span className="pill neutra">Arquivada</span>}
        {!a.arquivada && !grupo && <span className={`pill ${a.status === 'concluido' ? 'ok' : a.status === 'em_andamento' ? 'azul' : 'neutra'}`}>{rotuloStatusAtividade(a.status)}</span>}
        {impedida && <span className="pill parada">Impedida</span>}
      </div>
      <div className="eap-acoes">
        {!a.arquivada && <button className="btn-mini" onClick={() => onEditar(linha)}>Editar</button>}
        {!a.arquivada && <button className="btn-mini" onClick={() => onSub(a)}>+ Subatividade</button>}
        <button className="btn-mini" onClick={() => onArquivar(a)}>{a.arquivada ? 'Desarquivar' : 'Arquivar'}</button>
      </div>
    </li>
  )
}

export default function AbaEAP() {
  const { atividades, config, criar, salvar } = usePlanejamento()
  const [mostrarArquivadas, setMostrarArquivadas] = useState(false)
  const [folha, setFolha] = useState(null)
  const hoje = hojeISO()

  const linhas = linhasEAP(atividades, { mostrarArquivadas })
  const ativas = atividades.filter((a) => !a.arquivada)
  const arquivadas = atividades.length - ativas.length
  const folhas = ativas.filter((a) => !temFilhosAtivos(atividades, a.id))
  const fechar = () => setFolha(null)

  function abrirNova(pai = null) {
    setFolha({ tipo: 'nova', inicial: { titulo: '', pai_id: pai?.id ?? null, inicio: hoje, fim: hoje } })
  }

  function salvarNova(d) {
    fechar()
    criar(novaAtividade(d, atividades), d.pai_id ? 'Subatividade criada' : 'Atividade criada')
  }

  function salvarEdicao(linha, d) {
    fechar()
    salvar([aplicarEdicao(linha.atividade, d, atividades, { grupo: linha.grupo })], 'Atividade salva')
  }

  function confirmarArquivo(a) {
    const arquivar = !a.arquivada
    fechar()
    salvar(arquivarComFilhos(atividades, a.id, arquivar), arquivar ? 'Atividade arquivada' : 'Atividade de volta na EAP')
  }

  const novaBtn = <button className="btn btn-pri" onClick={() => abrirNova()}>Nova atividade</button>
  const chipArquivadas = arquivadas > 0 && (
    <button className={`chip-filtro ${mostrarArquivadas ? 'ativo' : ''}`} aria-pressed={mostrarArquivadas} onClick={() => setMostrarArquivadas(!mostrarArquivadas)}>
      Mostrar arquivadas ({arquivadas})
    </button>
  )

  let conteudo
  if (linhas.length === 0) {
    conteudo = (
      <Vazio icone="planejamento" titulo="A EAP desta obra está vazia"
        texto="Comece pelas grandes etapas (Estrutura, Alvenaria, Instalações...) e depois divida cada uma em subatividades. É daqui que saem o cronograma e a semana.">
        <button className="btn btn-pri" onClick={() => abrirNova()}>Criar a primeira atividade</button>
        {chipArquivadas}
      </Vazio>
    )
  } else {
    conteudo = (
      <>
        <div className="resumo">
          <div className="stat"><span className="rot">Atividades</span><span className="val">{folhas.length}</span></div>
          <div className="stat verde"><span className="rot">Concluídas</span><span className="val">{folhas.filter((a) => a.status === 'concluido').length}</span></div>
          <div className={`stat ${ativas.some(temRestricaoAberta) ? 'verm' : ''}`}><span className="rot">Impedidas</span><span className="val">{ativas.filter(temRestricaoAberta).length}</span></div>
        </div>
        <div className="barra-acoes">{novaBtn}{chipArquivadas}</div>
        <ul className="cartao eap" aria-label="Estrutura analítica do projeto">
          {linhas.map((l) => (
            <LinhaEAP key={l.atividade.id} linha={l} atividades={atividades} config={config}
              onEditar={(linha) => setFolha({ tipo: 'editar', linha })}
              onSub={(a) => abrirNova(a)}
              onArquivar={(a) => setFolha({ tipo: 'arquivar', atividade: a })} />
          ))}
        </ul>
      </>
    )
  }

  return (
    <>
      {conteudo}
      {folha?.tipo === 'nova' && (
        <FormAtividade titulo={folha.inicial.pai_id ? 'Nova subatividade' : 'Nova atividade'} rotuloBotao="Criar"
          inicial={folha.inicial} grupo={false} opcoes={opcoesDePai(atividades)} atividades={atividades} config={config}
          onSalvar={salvarNova} onFechar={fechar} />
      )}
      {folha?.tipo === 'editar' && (
        <FormAtividade titulo="Editar atividade" rotuloBotao="Salvar"
          inicial={{ titulo: folha.linha.atividade.titulo, pai_id: folha.linha.atividade.pai_id, inicio: folha.linha.atividade.inicio, fim: folha.linha.atividade.fim }}
          grupo={folha.linha.grupo} opcoes={opcoesDePai(atividades, folha.linha.atividade.id)} atividades={atividades} config={config}
          onSalvar={(d) => salvarEdicao(folha.linha, d)} onFechar={fechar} />
      )}
      {folha?.tipo === 'arquivar' && (() => {
        const a = folha.atividade
        const n = arquivarComFilhos(atividades, a.id, !a.arquivada).length - 1
        const junto = n > 0 ? ` e mais ${n === 1 ? '1 atividade ligada a ela' : `${n} atividades ligadas a ela`}` : ''
        return a.arquivada ? (
          <Confirmar titulo="Desarquivar atividade" rotuloSim="Desarquivar" onFechar={fechar} onSim={() => confirmarArquivo(a)}
            texto={`"${a.titulo}"${junto} voltam para a EAP, o cronograma e a semana.`} />
        ) : (
          <Confirmar titulo="Arquivar atividade" rotuloSim="Arquivar" onFechar={fechar} onSim={() => confirmarArquivo(a)}
            texto={`Arquivar "${a.titulo}"${junto}? Sai da EAP, do cronograma e da semana, mas nada é apagado: dá para trazer de volta em "Mostrar arquivadas".`} />
        )
      })()}
    </>
  )
}
