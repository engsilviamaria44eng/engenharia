// MEDIÇÃO · Tela 2: a FICHA DE MEDIÇÃO de um contrato. Resumo (total, medido, saldo),
// boletins numerados com período, Rascunho → Fechada, e o formulário do boletim:
// global = % OU R$; por escopo = quantidade, % OU R$ por item (a quantidade manda).
// Trava: nada passa de 100% acumulado. No celular, cada item vira um cartão.
import { useState } from 'react'
import {
  formatarReais, formatarPct, rotuloUnidade, resumoDoContrato, itensDoContrato, medicoesDoContrato, valorDaMedicao,
  podeMedir, podeNovaMedicao, tipoDoContrato, rotuloStatusMedicao, proximoNumero, periodoSugerido, medidoAntes, pctDoGlobal, reaisDoPct, quantidadeDaLinha, pctDaQuantidade,
  reaisDaQuantidade, validarBoletim, montarBoletim, previaDoBoletim, podeEditarBoletim, fecharBoletim, boletimParaFormulario,
  csvDoBoletim, soNumero, valorTotal,
} from '../lib/medicoes.js'
import { formatarData, hojeISO } from '../lib/datas.js'
import { Vazio } from '../components/index.jsx'
import { Campo, Folha, Confirmar } from '../components/formulario.jsx'

const numero = (n, casas = 2) => (n === null || n === undefined ? '' : Number(n).toLocaleString('pt-BR', { maximumFractionDigits: casas, useGrouping: false }))

// Campo que mostra o que a pessoa digitou (se é o campo "ativo") ou o valor calculado.
function CampoCalculado({ rotulo, ativo, texto, calculado, onDigitar, sufixo }) {
  return (
    <label className="campo campo-calc">
      <span className="campo-rot">{rotulo}</span>
      <span className="com-sufixo">
        <input type="text" inputMode="decimal" value={ativo ? texto : calculado} placeholder="0"
          onChange={(e) => onDigitar(soNumero(e.target.value))} onFocus={(e) => e.target.select()} />
        {sufixo && <span className="sufixo">{sufixo}</span>}
      </span>
    </label>
  )
}

function FormBoletim({ contrato, itens, medicoes, numeroBoletim, inicial, editandoId, onSalvar, onFechar }) {
  const [d, setD] = useState(inicial)
  const [enviou, setEnviou] = useState(false)
  const antes = medidoAntes(contrato, medicoes, editandoId)
  const erros = validarBoletim(d, contrato, itens, antes) ?? { linhas: {} }
  const mostra = (c) => enviou && erros[c]
  const previa = previaDoBoletim(d, contrato, itens, medicoes, editandoId)
  const total = valorTotal(contrato, itens) ?? 0
  const itensC = itensDoContrato(contrato, itens)

  function enviar(e) {
    e.preventDefault()
    setEnviou(true)
    if (!validarBoletim(d, contrato, itens, antes)) onSalvar(d)
  }

  const linha = (id) => d.linhas[id] ?? { campo: 'quantidade', texto: '' }
  const digitarLinha = (id, campo, texto) => setD({ ...d, linhas: { ...d.linhas, [id]: { campo, texto } } })

  return (
    <Folha titulo={`Medição nº ${numeroBoletim}`} onFechar={onFechar}>
      <p className="form-sub">{contrato.empreiteiro} · {contrato.descricao} · {formatarReais(total)}</p>
      <form className="form" onSubmit={enviar} noValidate>
        <div className="campos-lado">
          <Campo rotulo="Período: início" erro={mostra('periodo_inicio')}>
            <input type="date" value={d.periodo_inicio} onChange={(e) => setD({ ...d, periodo_inicio: e.target.value })} />
          </Campo>
          <Campo rotulo="Período: fim" erro={mostra('periodo_fim')}>
            <input type="date" value={d.periodo_fim} min={d.periodo_inicio || undefined} onChange={(e) => setD({ ...d, periodo_fim: e.target.value })} />
          </Campo>
        </div>

        {contrato.tipo === 'global' ? (() => {
          const pct = pctDoGlobal(d.global.campo, d.global.texto, total)
          return (
            <div className="campo">
              <span className="campo-rot">Quanto foi executado neste boletim</span>
              <span className="campo-dica">Já medido: {formatarPct(antes.pct)} · disponível: {formatarPct(Math.max(0, 100 - antes.pct))}. Digite o % ou o valor; o outro é calculado.</span>
              <div className="campos-lado">
                <CampoCalculado rotulo="% medido" sufixo="%" ativo={d.global.campo === 'pct'} texto={d.global.texto}
                  calculado={pct === null ? '' : numero(pct, 4)} onDigitar={(t) => setD({ ...d, global: { campo: 'pct', texto: t } })} />
                <CampoCalculado rotulo="Valor (R$)" ativo={d.global.campo === 'reais'} texto={d.global.texto}
                  calculado={pct === null ? '' : numero(reaisDoPct(pct, total))} onDigitar={(t) => setD({ ...d, global: { campo: 'reais', texto: t } })} />
              </div>
              {(enviou || d.global.texto !== '') && erros.global && <span className="campo-erro" role="alert">{erros.global}</span>}
            </div>
          )
        })() : (
          <div className="campo">
            <span className="campo-rot">Itens executados neste boletim</span>
            <span className="campo-dica">Em cada item, digite a quantidade, o % ou o valor; os outros dois são calculados pela quantidade.</span>
            {mostra('vazio') && <span className="campo-erro" role="alert">{erros.vazio}</span>}
            <div className="medir-itens">
              {itensC.map((item) => {
                const l = linha(item.id)
                const q = l.texto === '' ? null : quantidadeDaLinha(item, l.campo, l.texto)
                const ja = antes.qtd.get(item.id) ?? 0
                const acum = pctDaQuantidade(ja + (q ?? 0), item)
                const erro = erros.linhas[item.id]
                return (
                  <div key={item.id} className={`medir-item ${erro ? 'com-erro' : ''}`}>
                    <div className="medir-cab">
                      <b>{item.descricao}</b>
                      <span>{numero(item.quantidade)} {rotuloUnidade(item.unidade)} × {formatarReais(item.preco_unitario)} · já medido {numero(ja)} {rotuloUnidade(item.unidade)} ({formatarPct(pctDaQuantidade(ja, item))})</span>
                    </div>
                    <div className="medir-campos">
                      <CampoCalculado rotulo={`Quantidade (${rotuloUnidade(item.unidade)})`} ativo={l.campo === 'quantidade'} texto={l.texto}
                        calculado={q === null ? '' : numero(q, 4)} onDigitar={(t) => digitarLinha(item.id, 'quantidade', t)} />
                      <CampoCalculado rotulo="% do item" sufixo="%" ativo={l.campo === 'pct'} texto={l.texto}
                        calculado={q === null ? '' : numero(pctDaQuantidade(q, item))} onDigitar={(t) => digitarLinha(item.id, 'pct', t)} />
                      <CampoCalculado rotulo="Valor (R$)" ativo={l.campo === 'reais'} texto={l.texto}
                        calculado={q === null ? '' : numero(reaisDaQuantidade(q, item))} onDigitar={(t) => digitarLinha(item.id, 'reais', t)} />
                    </div>
                    <span className={`medir-acum ${acum > 100 ? 'passou' : ''}`}>Acumulado com este boletim: <b>{formatarPct(acum)}</b></span>
                    {erro && <span className="campo-erro" role="alert">{erro}</span>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="rodape-boletim" aria-live="polite">
          <span>Total deste boletim <b>{formatarReais(previa.doBoletim)}</b></span>
          <span>Novo acumulado <b>{formatarReais(previa.acumulado)}</b> ({formatarPct(previa.pct)})</span>
          <span>Saldo a medir <b>{formatarReais(previa.saldo)}</b></span>
        </div>
        <div className="form-acoes">
          <button type="button" className="btn btn-sec" onClick={onFechar}>Cancelar</button>
          <button type="submit" className="btn btn-pri">{editandoId ? 'Salvar boletim' : 'Salvar como rascunho'}</button>
        </div>
      </form>
    </Folha>
  )
}

function baixarCsv(nome, texto) {
  const url = URL.createObjectURL(new Blob(['﻿' + texto], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function FichaMedicao({ contrato, itens, medicoes, onVoltar, onCriar, onSalvar }) {
  const [folha, setFolha] = useState(null)
  const hoje = hojeISO()
  const r = resumoDoContrato(contrato, itens, medicoes)
  const boletins = medicoesDoContrato(contrato, medicoes)
  const pode = podeNovaMedicao(contrato, r)

  function abrirNovo() {
    const p = periodoSugerido(contrato, medicoes, hoje)
    setFolha({ tipo: 'boletim', numero: proximoNumero(contrato, medicoes), inicial: { periodo_inicio: p.inicio, periodo_fim: p.fim, global: { campo: 'pct', texto: '' }, linhas: {} }, editando: null })
  }

  function salvarBoletim(d) {
    const { numero: n, editando } = folha
    setFolha(null)
    const boletim = montarBoletim(d, contrato, itens, n, editando)
    if (editando) onSalvar(boletim, `Medição nº ${n} salva`)
    else onCriar(boletim, `Medição nº ${n} salva como rascunho`)
  }

  return (
    <>
      <button className="voltar" onClick={onVoltar}>← Contratos</button>
      <h1 className="titulo-tela">{contrato.empreiteiro}</h1>
      <p className="subtitulo">{contrato.descricao} · {tipoDoContrato(contrato.tipo)?.descricao}</p>
      <div className="resumo">
        <div className="stat"><span className="rot">Valor total</span><span className="val val-dinheiro">{formatarReais(r.total)}</span></div>
        <div className="stat verde"><span className="rot">Medido</span><span className="val val-dinheiro">{formatarReais(r.medido)}</span><span className="rot">{formatarPct(r.pct)}</span></div>
        <div className="stat"><span className="rot">Saldo a medir</span><span className="val val-dinheiro">{formatarReais(r.saldo)}</span></div>
      </div>
      <span className="barra-rp barra-ficha" role="img" aria-label={`Medido ${formatarPct(r.pct)}`}><i style={{ width: `${r.pct}%` }} /></span>
      {pode && <div className="barra-acoes"><button className="btn btn-pri" onClick={abrirNovo}>Nova medição</button></div>}
      {!podeMedir(contrato) && <p className="nota">Só contrato "Aprovado / Ativo" recebe medição.</p>}
      {podeMedir(contrato) && !pode && <p className="nota">100% medido: feche os rascunhos e conclua o contrato no quadro.</p>}

      {boletins.length === 0 ? (
        <Vazio icone="medicao" titulo="Nenhuma medição ainda para este empreiteiro"
          texto="Lance o primeiro boletim: escolha o período e diga quanto foi executado. O acumulado e o saldo atualizam na hora." />
      ) : (
        <section className="cartao">
          <div className="cartao-cab"><h2 className="secao">Boletins</h2><span className="contagem">{boletins.length}</span></div>
          <ul className="historico">
            {boletins.map((m) => (
              <li key={m.id}>
                <div className="hist-linha">
                  <b>Medição nº {m.numero}</b>
                  <span className={`pill ${m.status === 'fechada' ? 'ok' : 'atencao'}`}>{rotuloStatusMedicao(m.status)}</span>
                </div>
                <span className="pedido-info">{formatarData(m.periodo_inicio)} a {formatarData(m.periodo_fim)}</span>
                <span className="hist-valor">{formatarReais(valorDaMedicao(m, contrato, itens))}</span>
                <div className="pedido-acoes">
                  {podeEditarBoletim(m, contrato) && (
                    <>
                      <button className="btn-mini" onClick={() => setFolha({ tipo: 'boletim', numero: m.numero, inicial: boletimParaFormulario(m, contrato), editando: m })}>Editar</button>
                      <button className="btn-mini pri" onClick={() => setFolha({ tipo: 'fechar', medicao: m })}>Fechar medição</button>
                    </>
                  )}
                  <button className="btn-mini" onClick={() => baixarCsv(`medicao-${m.numero}-${contrato.empreiteiro.replace(/\W+/g, '-').toLowerCase()}.csv`, csvDoBoletim(m, contrato, itens))}>Exportar (CSV)</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {folha?.tipo === 'boletim' && (
        <FormBoletim contrato={contrato} itens={itens} medicoes={medicoes} numeroBoletim={folha.numero} inicial={folha.inicial}
          editandoId={folha.editando?.id ?? null} onSalvar={salvarBoletim} onFechar={() => setFolha(null)} />
      )}
      {folha?.tipo === 'fechar' && (
        <Confirmar titulo={`Fechar a medição nº ${folha.medicao.numero}`} rotuloSim="Fechar medição" onFechar={() => setFolha(null)}
          texto={`Depois de fechada, a medição nº ${folha.medicao.numero} (${formatarReais(valorDaMedicao(folha.medicao, contrato, itens))}) não pode mais ser editada.`}
          onSim={() => { const m = folha.medicao; setFolha(null); onSalvar(fecharBoletim(m), `Medição nº ${m.numero} fechada`) }} />
      )}
    </>
  )
}
