// LANÇAR O DIA: o formulário do diário, de uma coluna só e botões grandes, para o celular em
// pé no canteiro. É a tela "Hoje" do mestre e o "Lançar" do engenheiro (no Diário).
// Se o dia já tem diário, abre preenchido e salvar atualiza o mesmo.
import { useState } from 'react'
import {
  CLIMAS, PERIODOS, ORIGENS_EQUIP, SITUACOES_EQUIP, alternarClima, numeroDoRdo, diaDaSemanaPorExtenso, funcoesDaObra,
  ehFuncaoNova, normalizarFuncao, totalDoEfetivo, marcarConcluido, mudarEfetivo, equipamentosDoDiaAnterior,
  equipamentoEmBranco, validarDiario, avancosMenores, montarDiario, formularioDoDia, ultimoAvanco, ehAtrasado, novaAtividadeFora, rotuloAnalise,
  frentesParaLancar,
} from '../lib/diario.js'
import { formatarData, hojeISO } from '../lib/datas.js'
import { Vazio } from '../components/index.jsx'
import { Campo, Confirmar } from '../components/formulario.jsx'

let contadorFoto = 0
const idFoto = () => `ft-novo-${++contadorFoto}`
let contadorFora = 0
const idFora = () => `fo-novo-${++contadorFora}`

function Servico({ s, frente, erro, onMudar }) {
  return (
    <div className={`servico-dia ${s.marcada ? 'marcada' : ''}`}>
      <label className="servico-topo">
        <input type="checkbox" checked={s.marcada} onChange={(e) => onMudar({ ...s, marcada: e.target.checked })} />
        <span>
          <b>{frente.servico}</b>
          <small>{frente.ambiente} · {frente.responsavel} · último {frente.avancoAnterior}%</small>
        </span>
      </label>
      {s.marcada && (
        <div className="servico-corpo">
          <Campo rotulo="Avanço acumulado (%)" erro={erro}>
            <div className="avanco-linha">
              <input type="range" min="0" max="100" step="5" value={Number(s.avanco) || 0} aria-label={`Avanço de ${frente.servico}`}
                onChange={(e) => onMudar({ ...s, avanco: e.target.value, concluido: e.target.value === '100' })} />
              <input type="text" inputMode="numeric" className="avanco-num" value={s.avanco} aria-label="Avanço em número"
                onChange={(e) => onMudar({ ...s, avanco: e.target.value.replace(/\D/g, '').slice(0, 3), concluido: e.target.value === '100' })} />
            </div>
          </Campo>
          <label className="check-linha">
            <input type="checkbox" checked={s.concluido} onChange={(e) => onMudar(marcarConcluido(s, e.target.checked))} />
            Serviço concluído
          </label>
          <Campo rotulo="Detalhe do dia (opcional)">
            <input type="text" value={s.detalhe} placeholder="Só a parede da escada" onChange={(e) => onMudar({ ...s, detalhe: e.target.value })} />
          </Campo>
        </div>
      )}
    </div>
  )
}

// O EFETIVO DO DIA: uma lista só, por função (não por serviço).
function EfetivoDoDia({ efetivo, funcoes, onMudar, onNovaFuncao }) {
  const [outra, setOutra] = useState('')
  const total = totalDoEfetivo(efetivo)
  return (
    <section className="cartao bloco-diario">
      <div className="cartao-cab"><h3 className="secao">Efetivo do dia</h3><span className="contagem">{total} {total === 1 ? 'pessoa' : 'pessoas'}</span></div>
      <div className="cartao-corpo">
        <ul className="efetivo-lista">
          {funcoes.map((f) => {
            const n = efetivo[f] ?? 0
            return (
              <li key={f} className={n > 0 ? 'tem' : ''}>
                <span>{f}{ehFuncaoNova(f) && <em className="tag-nova">nova</em>}</span>
                <span className="mais-menos">
                  <button type="button" onClick={() => onMudar(f, -1)} disabled={n === 0} aria-label={`Menos um ${f}`}>−</button>
                  <b>{n}</b>
                  <button type="button" onClick={() => onMudar(f, 1)} aria-label={`Mais um ${f}`}>+</button>
                </span>
              </li>
            )
          })}
        </ul>
        <div className="linha-add">
          <input type="text" value={outra} placeholder="Outra função (ex.: Vidraceiro)" aria-label="Outra função" onChange={(e) => setOutra(e.target.value)} />
          <button type="button" className="btn btn-sec" disabled={!outra.trim()} onClick={() => {
            const nome = normalizarFuncao(outra, funcoes)
            if (nome) { onNovaFuncao(nome); onMudar(nome, 1) }
            setOutra('')
          }}>+ Acrescentar</button>
        </div>
      </div>
    </section>
  )
}
export default function LancarDia({ obra, frentes, diarios, usuario, data, onSalvar, onCancelar }) {
  const hoje = hojeISO()
  const papel = usuario?.role ?? 'Engenheiro'
  const autor = usuario?.nome ?? 'Engenheiro'
  const [d, setD] = useState(() => formularioDoDia(diarios, frentes, data ?? hoje))
  const [extras, setExtras] = useState([])
  const [enviou, setEnviou] = useState(false)
  const [confirmar, setConfirmar] = useState(null) // { tipo: 'avanco', lista } | { tipo: 'equip', i }
  const [salvando, setSalvando] = useState(false)
  const funcoes = funcoesDaObra(diarios, extras)
  const ctxValidacao = { hoje, inicioObra: obra?.data_inicio, papel, diarios, frentes }
  const erros = validarDiario(d, ctxValidacao) ?? { servicos: {}, equipamentos: {}, foras: {} }
  const atrasado = ehAtrasado(d.data, hoje)
  const mudarFora = (id, novo) => setD({ ...d, foras: d.foras.map((fo) => (fo.id === id ? novo : fo)) })
  const mostra = (c) => enviou && erros[c]
  const atualizarServico = (novo) => setD({ ...d, servicos: d.servicos.map((s) => (s.frente_id === novo.frente_id ? novo : s)) })
  const mudarEquip = (i, campo, valor) => setD({ ...d, equipamentos: d.equipamentos.map((e, k) => (k === i ? { ...e, [campo]: valor } : e)) })

  if (frentesParaLancar(frentes).length === 0) {
    return <Vazio icone="hoje" titulo="Ainda não há frentes nesta obra" texto="Peça ao engenheiro para cadastrar as frentes. O diário lança o avanço de cada uma." />
  }

  async function gravar() {
    setConfirmar(null)
    setSalvando(true)
    const ok = await onSalvar(montarDiario(d, { usuario: autor, hoje }))
    setSalvando(false)
    if (ok) setD((atual) => ({ ...atual, lancado_por: atual.lancado_por ?? autor, lancado_em: atual.lancado_em ?? hoje }))
  }

  function salvar() {
    setEnviou(true)
    if (validarDiario(d, ctxValidacao)) return
    const menores = avancosMenores(d, diarios, frentes)
    if (menores.length) { setConfirmar({ tipo: 'avanco', lista: menores }); return }
    gravar()
  }

  function escolherFotos(e) {
    const novas = [...(e.target.files ?? [])].map((f) => ({ id: idFoto(), url: URL.createObjectURL(f), frente_id: '', ambiente: '', cliente_ve: false }))
    if (novas.length) setD({ ...d, fotos: [...d.fotos, ...novas] })
    e.target.value = ''
  }

  const existe = !!d.lancado_por

  return (
    <div className="lancar-dia">
      <div className="lancar-cab">
        <h2 className="titulo-tela">{d.data === hoje ? 'Diário de hoje' : `Diário de ${formatarData(d.data)}`}</h2>
        <p className="subtitulo">
          {diaDaSemanaPorExtenso(d.data)}, {formatarData(d.data)}
          {obra?.data_inicio && ` · RDO nº ${numeroDoRdo(obra.data_inicio, d.data)}`}
          {existe && ` · lançado por ${d.lancado_por}`}
        </p>
        {papel === 'Engenheiro' && (
          <Campo rotulo="Data do diário" dica="Qualquer dia desde o início da obra até hoje.">
            <input type="date" value={d.data} min={obra?.data_inicio} max={hoje}
              onChange={(e) => { const nova = e.target.value; if (nova) { setEnviou(false); setD(formularioDoDia(diarios, frentes, nova)) } }} />
          </Campo>
        )}
        {atrasado && <p className="faixa-atraso">Diário de {formatarData(d.data)} · lançado com atraso</p>}
        {existe && <p className="alerta-form">Este dia já tem diário: você está editando. Salvar atualiza o mesmo diário.</p>}
        {mostra('data') && <p className="campo-erro" role="alert">{erros.data}</p>}
      </div>

      <section className="cartao bloco-diario">
        <div className="cartao-cab"><h3 className="secao">Clima</h3></div>
        <div className="cartao-corpo clima-grade">
          {PERIODOS.map((p) => (
            <div key={p.id} className="clima-linha" role="group" aria-label={`Clima da ${p.rotulo.toLowerCase()}`}>
              <span className="clima-periodo">{p.rotulo} <small>{CLIMAS.find((c) => c.id === d.clima[p.id])?.rotulo ?? 'não informado'}</small></span>
              <div className="clima-botoes">
                {CLIMAS.map((c) => (
                  <button key={c.id} type="button" aria-pressed={d.clima[p.id] === c.id} className={`clima-${c.id} ${d.clima[p.id] === c.id ? 'ativo' : ''}`}
                    onClick={() => setD({ ...d, clima: alternarClima(d.clima, p.id, c.id) })}>{c.rotulo}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="cartao bloco-diario">
        <div className="cartao-cab"><h3 className="secao">Serviços do dia</h3><span className="contagem">{d.servicos.filter((s) => s.marcada).length + d.foras.length} no dia</span></div>
        <div className="cartao-corpo">
          <p className="nota">Marque os serviços que andaram. A lista vem das frentes da obra (do orçamento, quando ele existir). Serviço que não está na lista? Use "+ Atividade fora do orçamento".</p>
          {mostra('vazio') && <p className="campo-erro" role="alert">{erros.vazio}</p>}
          <div className="servicos-dia">
            {d.servicos.map((s) => {
              const frente = frentes.find((f) => f.id === s.frente_id)
              return (
                <Servico key={s.frente_id} s={s} frente={{ ...frente, avancoAnterior: ultimoAvanco(diarios, frente, d.data) }}
                  erro={enviou ? erros.servicos[s.frente_id] : null} onMudar={atualizarServico} />
              )
            })}
            {d.foras.map((fo) => (
              <div key={fo.id} className="servico-dia marcada fora">
                <div className="servico-corpo">
                  <span className="tag-fora">Fora do orçamento{fo.analise !== 'para_analisar' ? ` · ${rotuloAnalise(fo.analise).toLowerCase()}` : ''}</span>
                  <Campo rotulo="Atividade" erro={enviou ? erros.foras[fo.id] : null}>
                    <input type="text" value={fo.descricao} placeholder="Demolição de mureta não prevista" onChange={(e) => mudarFora(fo.id, { ...fo, descricao: e.target.value })} />
                  </Campo>
                  <div className="campos-lado">
                    <Campo rotulo="Ambiente (opcional)"><input type="text" value={fo.ambiente} placeholder="Quintal" onChange={(e) => mudarFora(fo.id, { ...fo, ambiente: e.target.value })} /></Campo>
                    <div className="campos-lado">
                      <Campo rotulo="Quantidade"><input type="text" inputMode="decimal" value={fo.quantidade} placeholder="4" onChange={(e) => mudarFora(fo.id, { ...fo, quantidade: e.target.value.replace(/[^\d,.]/g, '') })} /></Campo>
                      <Campo rotulo="Unidade"><input type="text" value={fo.unidade} placeholder="m" onChange={(e) => mudarFora(fo.id, { ...fo, unidade: e.target.value })} /></Campo>
                    </div>
                  </div>
                  <button type="button" className="btn-mini" onClick={() => (fo.descricao.trim() ? setConfirmar({ tipo: 'fora', id: fo.id }) : setD({ ...d, foras: d.foras.filter((x) => x.id !== fo.id) }))}>Tirar esta atividade</button>
                </div>
              </div>
            ))}
          </div>
          <button type="button" className="btn btn-sec botao-fora" onClick={() => setD({ ...d, foras: [...d.foras, novaAtividadeFora(idFora())] })}>+ Atividade fora do orçamento</button>
        </div>
      </section>

      <EfetivoDoDia efetivo={d.efetivo} funcoes={funcoes} onMudar={(f, delta) => setD(mudarEfetivo(d, f, delta))} onNovaFuncao={(f) => setExtras((x) => [...x, f])} />
      <section className="cartao bloco-diario">
        <div className="cartao-cab"><h3 className="secao">Fotos</h3><span className="contagem">{d.fotos.length}</span></div>
        <div className="cartao-corpo">
          <label className="btn btn-sec botao-arquivo">
            {atrasado ? 'Escolher fotos da galeria' : 'Tirar foto'}
            {atrasado
              ? <input type="file" accept="image/*" multiple onChange={escolherFotos} />
              : <input type="file" accept="image/*" capture="environment" multiple onChange={escolherFotos} />}
          </label>
          {d.fotos.length > 0 && (
            <ul className="fotos-dia">
              {d.fotos.map((f) => (
                <li key={f.id}>
                  <img src={f.url} alt="Foto do dia" />
                  <select value={f.frente_id} aria-label="Frente da foto" onChange={(e) => setD({ ...d, fotos: d.fotos.map((x) => (x.id === f.id ? { ...x, frente_id: e.target.value } : x)) })}>
                    <option value="">Frente (opcional)</option>
                    {frentes.map((fr) => <option key={fr.id} value={fr.id}>{fr.servico}</option>)}
                  </select>
                  <input type="text" value={f.ambiente} placeholder="Ambiente (opcional)" aria-label="Ambiente da foto"
                    onChange={(e) => setD({ ...d, fotos: d.fotos.map((x) => (x.id === f.id ? { ...x, ambiente: e.target.value } : x)) })} />
                  <button type="button" className="btn-mini" onClick={() => setD({ ...d, fotos: d.fotos.filter((x) => x.id !== f.id) })}>Tirar</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="cartao bloco-diario">
        <div className="cartao-cab"><h3 className="secao">Ferramentas e equipamentos</h3></div>
        <div className="cartao-corpo">
          <div className="barra-acoes">
            <button type="button" className="btn btn-sec" onClick={() => setD({ ...d, equipamentos: equipamentosDoDiaAnterior(diarios, d.data) })}>Repetir a lista do dia anterior</button>
            <button type="button" className="btn btn-sec" onClick={() => setD({ ...d, equipamentos: [...d.equipamentos, equipamentoEmBranco()] })}>+ Equipamento</button>
          </div>
          {d.equipamentos.length === 0 ? <p className="nota">Nenhum equipamento listado hoje.</p> : (
            <ul className="equip-lista">
              {d.equipamentos.map((e, i) => {
                const er = enviou ? erros.equipamentos[i] ?? {} : {}
                return (
                  <li key={i}>
                    <input type="text" value={e.nome} placeholder="Betoneira 400 L" aria-label={`Equipamento ${i + 1}`} onChange={(ev) => mudarEquip(i, 'nome', ev.target.value)} />
                    <input type="text" inputMode="numeric" className="equip-qtd" value={e.quantidade} aria-label="Quantidade" onChange={(ev) => mudarEquip(i, 'quantidade', ev.target.value.replace(/\D/g, ''))} />
                    <select value={e.origem} aria-label="Origem" onChange={(ev) => mudarEquip(i, 'origem', ev.target.value)}>{ORIGENS_EQUIP.map((o) => <option key={o}>{o}</option>)}</select>
                    <select value={e.situacao} aria-label="Situação" onChange={(ev) => mudarEquip(i, 'situacao', ev.target.value)}>{SITUACOES_EQUIP.map((o) => <option key={o}>{o}</option>)}</select>
                    <button type="button" className="btn-mini" onClick={() => (e.nome.trim() ? setConfirmar({ tipo: 'equip', i }) : setD({ ...d, equipamentos: d.equipamentos.filter((_, k) => k !== i) }))}>Tirar</button>
                    {(er.nome || er.quantidade) && <span className="campo-erro">{er.nome ?? er.quantidade}</span>}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>

      <section className="cartao bloco-diario">
        <div className="cartao-cab"><h3 className="secao">Ocorrências</h3></div>
        <div className="cartao-corpo">
          <Campo rotulo="O que aconteceu fora do normal (opcional)">
            <textarea rows="3" value={d.ocorrencias} placeholder="Chuva forte à tarde, equipe liberada às 15h" onChange={(e) => setD({ ...d, ocorrencias: e.target.value })} />
          </Campo>
        </div>
      </section>

      <div className="salvar-diario">
        {onCancelar && <button type="button" className="btn btn-sec" onClick={onCancelar}>Voltar</button>}
        <button type="button" className="btn btn-pri" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar diário'}</button>
      </div>

      {confirmar?.tipo === 'avanco' && (
        <Confirmar titulo="Avanço menor que o último lançado" rotuloSim="Confirmo, salvar assim" onFechar={() => setConfirmar(null)} onSim={gravar}
          texto={confirmar.lista.map((x) => `${x.servico}: ${x.avanco}% — menor que o último lançado (${x.ultimo}%).`).join(' ') + ' Confirma?'} />
      )}
      {confirmar?.tipo === 'fora' && (
        <Confirmar titulo="Tirar atividade" rotuloSim="Tirar" onFechar={() => setConfirmar(null)}
          texto={`Tirar "${d.foras.find((x) => x.id === confirmar.id)?.descricao}" do diário deste dia?`}
          onSim={() => { const id = confirmar.id; setConfirmar(null); setD({ ...d, foras: d.foras.filter((x) => x.id !== id) }) }} />
      )}
      {confirmar?.tipo === 'equip' && (
        <Confirmar titulo="Tirar equipamento" rotuloSim="Tirar" onFechar={() => setConfirmar(null)}
          texto={`Tirar "${d.equipamentos[confirmar.i].nome}" da lista de hoje?`}
          onSim={() => { const i = confirmar.i; setConfirmar(null); setD({ ...d, equipamentos: d.equipamentos.filter((_, k) => k !== i) }) }} />
      )}
    </div>
  )
}
