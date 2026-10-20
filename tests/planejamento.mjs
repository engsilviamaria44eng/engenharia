// Regras do módulo Planejamento (EAP e dias úteis).
import {
  CONFIG_PADRAO, ehDiaUtil, diasUteisEntre, codigosEAP, linhasEAP, resumo, opcoesDePai,
  validarAtividade, novaAtividade, aplicarEdicao, arquivarComFilhos, temRestricaoAberta, viraGrupo,
  previstoEm, situacaoPrazo, resumoDoCronograma, segundaDaSemana, escalaDoCronograma, posicaoNaEscala, validarProgresso, aplicarProgresso,
  semanasDoHorizonte, cruzaSemana, atividadesDaSemana, quadroDeRestricoes, responsaveisDasRestricoes, validarRestricao, novaRestricao,
  acrescentarRestricao, moverRestricao, podeVoltarSemana, marcarResolvida,
  semanaDe, ehAcumulada, ppcDaSemana, aplicarStatus, validarNaoRealizado, marcarNaoRealizada, desfazerNaoRealizada,
  validarSubtarefa, acrescentarSubtarefa, removerSubtarefa, alternarSubtarefa, subtarefaNaoRealizada, desfazerSubtarefaNaoRealizada, causasDaSemana,
  validarConfig, resumoDiasUteis,
} from '../src/lib/planejamento.js'
import { ATIVIDADES_PLANEJAMENTO } from '../src/lib/mockData.js'

let ok = 0
let tot = 0

function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) {
    ok++
  } else {
    console.log(`  ✗ ${descricao}`)
    console.log(`     esperado: ${JSON.stringify(esperado)}`)
    console.log(`     veio:     ${JSON.stringify(real)}`)
  }
}

const cfg = CONFIG_PADRAO
const je = ATIVIDADES_PLANEJAMENTO.filter((a) => a.obra_id === 'obra-je')

// ---------- dias úteis ----------
conferir('segunda é dia útil', ehDiaUtil('2026-10-19', cfg), true)
conferir('sábado não é dia útil', ehDiaUtil('2026-10-24', cfg), false)
conferir('feriado (Finados) não é dia útil', ehDiaUtil('2026-11-02', cfg), false)
conferir('semana cheia = 5 dias úteis', diasUteisEntre('2026-10-19', '2026-10-25', cfg), 5)
conferir('um dia só conta 1', diasUteisEntre('2026-10-19', '2026-10-19', cfg), 1)
conferir('semana do feriado de Finados = 4', diasUteisEntre('2026-11-02', '2026-11-06', cfg), 4)
conferir('fim de semana sozinho = 0', diasUteisEntre('2026-10-24', '2026-10-25', cfg), 0)
conferir('fim antes do início = 0', diasUteisEntre('2026-10-20', '2026-10-19', cfg), 0)
conferir('obra que trabalha sábado', diasUteisEntre('2026-10-19', '2026-10-25', { dias_uteis: [1, 2, 3, 4, 5, 6], feriados: [] }), 6)

// ---------- códigos da EAP ----------
const cod = codigosEAP(je)
conferir('1º grupo = 1', cod.get('at-01'), '1')
conferir('2ª filha do 1º grupo = 1.2', cod.get('at-03'), '1.2')
conferir('3ª filha do 4º grupo = 4.3', cod.get('at-13'), '4.3')
const neto = [...je, { ...novaAtividade({ titulo: 'Armação', pai_id: 'at-03', inicio: '2026-10-19', fim: '2026-10-20' }, je), id: 'x-1', obra_id: 'obra-je' }]
conferir('subatividade de subatividade = 1.2.1', codigosEAP(neto).get('x-1'), '1.2.1')
const semFundacao = je.map((a) => (a.id === 'at-02' ? { ...a, arquivada: true } : a))
conferir('arquivar renumera as irmãs', codigosEAP(semFundacao).get('at-03'), '1.1')
conferir('arquivada fica sem código', codigosEAP(semFundacao).has('at-02'), false)

// ---------- árvore achatada ----------
const linhas = linhasEAP(je)
conferir('ordem de leitura', linhas.slice(0, 4).map((l) => l.codigo), ['1', '1.1', '1.2', '2'])
conferir('nível da subatividade', linhas[1].nivel, 1)
conferir('grupo é marcado', [linhas[0].grupo, linhas[1].grupo], [true, false])
conferir('arquivadas somem por padrão', linhasEAP(semFundacao).some((l) => l.atividade.id === 'at-02'), false)
conferir('arquivadas aparecem se pedidas', linhasEAP(semFundacao, { mostrarArquivadas: true }).find((l) => l.atividade.id === 'at-02').codigo, null)

// ---------- resumo do grupo ----------
const est = resumo(je, 'at-01', cfg)
conferir('grupo começa na 1ª filha', est.inicio, '2026-06-01')
conferir('grupo termina na última filha', est.fim, '2026-10-16')
const dFund = diasUteisEntre('2026-06-01', '2026-07-17', cfg)
const dLaje = diasUteisEntre('2026-09-14', '2026-10-16', cfg)
conferir('progresso do grupo pesado por dias úteis', est.progresso, Math.round((dFund * 100 + dLaje * 40) / (dFund + dLaje)))
conferir('folha usa as próprias datas', resumo(je, 'at-09', cfg).inicio, '2026-10-19')

// ---------- onde pode ficar ----------
const ops = opcoesDePai(je, 'at-01').map((l) => l.atividade.id)
conferir('não pode ficar dentro de si mesma', ops.includes('at-01'), false)
conferir('nem dentro de uma filha (laço)', ops.includes('at-03'), false)
conferir('pode ficar dentro de outro grupo', ops.includes('at-04'), true)

// ---------- validação ----------
const base = { titulo: 'Reboco', inicio: '2026-10-19', fim: '2026-10-23' }
conferir('atividade válida', validarAtividade(base, cfg), {})
conferir('nome obrigatório', Object.keys(validarAtividade({ ...base, titulo: '  ' }, cfg)), ['titulo'])
conferir('fim antes do início', validarAtividade({ ...base, fim: '2026-10-18' }, cfg).fim, 'O fim não pode ser antes do início.')
conferir('período só de fim de semana', validarAtividade({ ...base, inicio: '2026-10-24', fim: '2026-10-25' }, cfg).fim, 'O período não tem nenhum dia útil.')
conferir('grupo não exige datas', validarAtividade({ titulo: 'Estrutura', inicio: '', fim: '' }, cfg, { grupo: true }), {})

// ---------- criar e editar ----------
const nova = novaAtividade({ ...base, titulo: ' Pintura ', pai_id: 'at-10' }, je)
conferir('nova vai para o fim do grupo', nova.ordem, 4)
conferir('nova nasce a fazer, 0%, sem restrição', [nova.status, nova.progresso, nova.restricoes.length, nova.titulo], ['a_fazer', 0, 0, 'Pintura'])
conferir('nova no nível principal', novaAtividade(base, je).ordem, 5)
const laje = je.find((a) => a.id === 'at-03')
const movida = aplicarEdicao(laje, { titulo: 'Laje', pai_id: 'at-04', inicio: laje.inicio, fim: laje.fim }, je)
conferir('mudar de grupo vai para o fim do novo grupo', [movida.pai_id, movida.ordem], ['at-04', 3])
const grupoEditado = aplicarEdicao(je[0], { titulo: 'Estrutura geral', pai_id: null, inicio: '2030-01-01', fim: '2030-01-02' }, je, { grupo: true })
conferir('editar grupo não muda as datas guardadas', [grupoEditado.titulo, grupoEditado.inicio, grupoEditado.ordem], ['Estrutura geral', '2026-06-01', 1])

// ---------- arquivar ----------
const arq = arquivarComFilhos(je, 'at-01', true)
conferir('arquivar grupo leva as filhas', arq.map((a) => a.id), ['at-01', 'at-02', 'at-03'])
conferir('todas marcadas como arquivadas', arq.every((a) => a.arquivada), true)
const tudoArquivado = je.map((a) => (['at-01', 'at-02', 'at-03'].includes(a.id) ? { ...a, arquivada: true } : a))
conferir('desarquivar filha traz o grupo junto', arquivarComFilhos(tudoArquivado, 'at-03', false).map((a) => a.id).sort(), ['at-01', 'at-03'])

// ---------- restrições ----------
conferir('laje está impedida', temRestricaoAberta(laje), true)
conferir('restrição resolvida não impede', temRestricaoAberta(je.find((a) => a.id === 'at-06')), false)

conferir('pôr filha numa atividade sem filhas avisa que vira grupo', viraGrupo(je, 'at-03'), true)
conferir('num grupo que já existe não avisa', viraGrupo(je, 'at-01'), false)
conferir('no nível principal não avisa', viraGrupo(je, null), false)

// ---------- longo prazo ----------
const hoje = '2026-10-19'
conferir('antes do início, previsto 0', previstoEm('2026-10-20', '2026-10-30', hoje, cfg), 0)
conferir('depois do fim, previsto 100', previstoEm('2026-10-01', '2026-10-16', hoje, cfg), 100)
conferir('no último dia, faltava só ele (4 de 5 = 80%)', previstoEm('2026-10-13', '2026-10-19', hoje, cfg), 80)
conferir('no 1º dia, previsto 0 (não nasce atrasada)', previstoEm('2026-10-19', '2026-10-23', hoje, cfg), 0)
conferir('no 2º dia de 5 úteis = 20%', previstoEm('2026-10-19', '2026-10-23', '2026-10-20', cfg), 20)
conferir('fim de semana não conta no previsto', previstoEm('2026-10-15', '2026-10-21', '2026-10-18', cfg), 40)
const rLaje = resumo(je, 'at-03', cfg, hoje)
conferir('laje acumulada: real 40 × previsto 100', [rLaje.progresso, rLaje.previsto], [40, 100])
conferir('sem hoje, não calcula previsto', resumo(je, 'at-03', cfg).previsto, null)
conferir('situação atrasada mostra os pontos', situacaoPrazo(rLaje), { id: 'atrasada', rotulo: 'Atrasada 60 pts' })
conferir('situação concluída', situacaoPrazo({ progresso: 100, previsto: 100 }).id, 'concluida')
conferir('situação a iniciar', situacaoPrazo({ progresso: 0, previsto: 0 }).id, 'a_iniciar')
conferir('adiantada conta como no prazo', situacaoPrazo({ progresso: 50, previsto: 30 }).id, 'no_prazo')
const obraJE = resumoDoCronograma(je, cfg, hoje)
conferir('obra: real abaixo do previsto', obraJE.progresso < obraJE.previsto, true)
conferir('obra: atrasadas = laje e elétrica', obraJE.atrasadas, 2)
conferir('hidráulica começa hoje: a iniciar, não atrasada', situacaoPrazo(resumo(je, 'at-09', cfg, hoje)).id, 'a_iniciar')
conferir('obra vazia', resumoDoCronograma([], cfg, hoje), { previsto: 0, progresso: 0, atrasadas: 0 })

conferir('segunda da semana de um sábado', segundaDaSemana('2026-10-24'), '2026-10-19')
conferir('segunda da semana de um domingo', segundaDaSemana('2026-10-25'), '2026-10-19')
const sem = escalaDoCronograma('2026-10-21', '2026-11-03', 'semana')
conferir('escala semanal começa na segunda', sem.colunas.map((c) => c.rotulo), ['19/10', '26/10', '02/11'])
conferir('escala semanal tem 21 dias', sem.totalDias, 21)
const mes = escalaDoCronograma('2026-11-20', '2027-01-05', 'mes')
conferir('escala mensal vira o ano', mes.colunas.map((c) => c.rotulo), ['nov/26', 'dez/26', 'jan/27'])
conferir('meses com os dias certos', mes.colunas.map((c) => c.dias), [30, 31, 31])
const pos = posicaoNaEscala(sem, '2026-10-19', '2026-10-25')
conferir('primeira semana ocupa 1/3', [Math.round(pos.esquerda), Math.round(pos.largura)], [0, 33])

conferir('progresso válido', validarProgresso('40'), null)
conferir('progresso vazio', validarProgresso(''), 'Informe o progresso.')
conferir('progresso acima de 100', validarProgresso('120'), 'Use um número inteiro de 0 a 100.')
conferir('progresso quebrado', validarProgresso('12.5'), 'Use um número inteiro de 0 a 100.')
conferir('100% conclui', aplicarProgresso(laje, '100').status, 'concluido')
conferir('começar uma a fazer põe em andamento', aplicarProgresso(je.find((a) => a.id === 'at-09'), '10').status, 'em_andamento')
conferir('voltar uma concluída para 0% volta a fazer', aplicarProgresso({ status: 'concluido', progresso: 100 }, '0'), { status: 'a_fazer', progresso: 0 })

// ---------- médio prazo ----------
const horiz = semanasDoHorizonte('2026-10-21', 3)
conferir('horizonte começa na segunda desta semana', horiz.map((s) => s.inicio), ['2026-10-19', '2026-10-26', '2026-11-02'])
conferir('semana vai até domingo', horiz[0].fim, '2026-10-25')
conferir('período cruza a semana', cruzaSemana('2026-10-13', '2026-10-21', horiz[0]), true)
conferir('período antes da semana não cruza', cruzaSemana('2026-10-01', '2026-10-16', horiz[0]), false)
const daSemana = atividadesDaSemana(je, horiz[0]).map((a) => a.id)
conferir('atividades da semana (sem acumular)', daSemana, ['at-05', 'at-06', 'at-08', 'at-09', 'at-11', 'at-12'])
conferir('acumulando, a laje atrasada entra', atividadesDaSemana(je, horiz[0], { acumular: true }).map((a) => a.id).includes('at-03'), true)
conferir('concluída antes da semana não acumula', atividadesDaSemana(je, horiz[0], { acumular: true }).some((a) => a.id === 'at-02'), false)
conferir('grupo não entra na semana', atividadesDaSemana(je, horiz[0], { acumular: true }).some((a) => a.id === 'at-01'), false)

const q = quadroDeRestricoes(je, hoje, { semanas: 4 })
const idsPorSemana = q.quadro.map((c) => c.cartoes.map((x) => x.restricao.id))
conferir('abertas por semana (resolvidas escondidas)', idsPorSemana, [['rs-01', 'rs-04'], ['rs-02'], [], []])
conferir('nada depois do horizonte de 4 semanas', q.depois, 0)
conferir('cartão traz o código da atividade', q.quadro[0].cartoes[0].codigo, '1.2')
const qRes = quadroDeRestricoes(je, hoje, { semanas: 4, mostrarResolvidas: true })
conferir('mostrar resolvidas traz a do reboco', qRes.quadro[0].cartoes.map((x) => x.restricao.id), ['rs-01', 'rs-04', 'rs-05'])
conferir('resolvida de semana passada não volta', qRes.quadro.flatMap((c) => c.cartoes).some((x) => x.restricao.id === 'rs-03'), false)
conferir('3 semanas: a do gesso (09/11) fica depois do horizonte', quadroDeRestricoes(je, hoje, { semanas: 3, mostrarResolvidas: true }).depois, 1)
conferir('filtro por responsável', quadroDeRestricoes(je, hoje, { responsavel: 'Compras' }).quadro.flatMap((c) => c.cartoes).map((x) => x.restricao.id), ['rs-01'])
const passada = je.map((a) => (a.id === 'at-09' ? { ...a, restricoes: [{ ...a.restricoes[0], semana: '2026-10-12', prazo: '2026-10-16' }] } : a))
const qPass = quadroDeRestricoes(passada, hoje).quadro[0].cartoes.find((x) => x.restricao.id === 'rs-04')
conferir('aberta de semana passada cai nesta semana, vencida', [qPass.deSemanaPassada, qPass.vencida], [true, true])
const arquivada = je.map((a) => (a.id === 'at-03' ? { ...a, arquivada: true } : a))
conferir('atividade arquivada some do quadro', quadroDeRestricoes(arquivada, hoje).quadro[0].cartoes.map((x) => x.restricao.id), ['rs-04'])
conferir('responsáveis em ordem', responsaveisDasRestricoes(je), ['Compras', 'Engenheiro', 'Mestre Ricardo'])

const dr = { atividade_id: 'at-09', descricao: ' Falta registro ', tipo: 'material', prazo: '2026-10-29', responsavel: ' Compras ' }
conferir('restrição válida', validarRestricao(dr), {})
conferir('restrição vazia avisa tudo', Object.keys(validarRestricao({ atividade_id: '', descricao: '', tipo: '', prazo: '', responsavel: '' })), ['atividade_id', 'descricao', 'tipo', 'prazo', 'responsavel'])
conferir('tipo inventado é recusado', validarRestricao({ ...dr, tipo: 'clima' }).tipo, 'Escolha o tipo.')
const rn = novaRestricao(dr, 'rs-x')
conferir('nova nasce na semana do prazo, aberta e sem espaços', [rn.semana, rn.resolvida, rn.descricao, rn.responsavel], ['2026-10-26', false, 'Falta registro', 'Compras'])
const hidr = je.find((a) => a.id === 'at-09')
conferir('acrescentar não perde as que já existiam', acrescentarRestricao(hidr, rn).restricoes.map((r) => r.id), ['rs-04', 'rs-x'])
const movida2 = moverRestricao(hidr, 'rs-04', 1).restricoes[0]
conferir('mover para a próxima semana leva o prazo junto', [movida2.semana, movida2.prazo], ['2026-10-26', '2026-10-30'])
conferir('não volta para antes desta semana', podeVoltarSemana(hidr.restricoes[0], hoje), false)
conferir('na semana seguinte pode voltar', podeVoltarSemana(movida2, hoje), true)
const res = marcarResolvida(hidr, 'rs-04', true, hoje).restricoes[0]
conferir('resolver guarda o dia', [res.resolvida, res.resolvida_em], [true, hoje])
conferir('resolver tira o "impedida"', temRestricaoAberta(marcarResolvida(hidr, 'rs-04', true, hoje)), false)
conferir('reabrir apaga o dia', marcarResolvida(hidr, 'rs-04', false, hoje).restricoes[0].resolvida_em, null)

// ---------- curto prazo ----------
const semAtual = semanaDe('2026-10-22')
conferir('semana de uma quinta', semAtual, { inicio: '2026-10-19', fim: '2026-10-25' })
const planejadasJE = atividadesDaSemana(je, semAtual, { acumular: true })
const ppcJE = ppcDaSemana(planejadasJE)
conferir('JE-01: 7 planejadas, 2 concluídas, PPC 29%', ppcJE, { total: 7, concluidas: 2, ppc: 29 })
conferir('laje é acumulada', ehAcumulada(laje, semAtual), true)
conferir('concluída não acumula', ehAcumulada(je.find((a) => a.id === 'at-02'), semAtual), false)
conferir('semana sem nada planejado: PPC vazio', ppcDaSemana([]), { total: 0, concluidas: 0, ppc: null })
const todasFeitas = planejadasJE.map((a) => aplicarStatus(a, 'concluido'))
conferir('tudo concluído = 100%', ppcDaSemana(todasFeitas).ppc, 100)

conferir('concluir põe 100% e apaga o não realizado', (({ status, progresso, nao_realizado }) => ({ status, progresso, nao_realizado }))(aplicarStatus(laje, 'concluido')), { status: 'concluido', progresso: 100, nao_realizado: null })
conferir('voltar de concluído para A fazer zera', aplicarStatus({ status: 'concluido', progresso: 100 }, 'a_fazer').progresso, 0)
conferir('voltar de concluído para Em andamento fica em 90', aplicarStatus({ status: 'concluido', progresso: 100 }, 'em_andamento').progresso, 90)
conferir('a fazer → em andamento mantém o %', aplicarStatus({ status: 'a_fazer', progresso: 10 }, 'em_andamento').progresso, 10)

conferir('não realizado sem causa é recusado', validarNaoRealizado({ causa: '', obs: '' }).causa, 'Escolha a causa raiz.')
conferir('causa "outra" exige descrição', validarNaoRealizado({ causa: 'outra', obs: ' ' }).obs, 'Descreva a causa.')
conferir('causa da lista basta', validarNaoRealizado({ causa: 'clima', obs: '' }), {})
const hidrNR = marcarNaoRealizada(hidr, { causa: 'clima', obs: ' chuva forte ' }, semAtual)
conferir('não realizado guarda causa, obs e semana', hidrNR.nao_realizado, { causa: 'clima', obs: 'chuva forte', semana: '2026-10-19' })
conferir('desfazer apaga', desfazerNaoRealizada(hidrNR).nao_realizado, null)

const alv2 = je.find((a) => a.id === 'at-06')
conferir('subtarefa vazia é recusada', validarSubtarefa('  ', alv2.subtarefas), 'Escreva a subtarefa.')
conferir('subtarefa repetida é recusada', validarSubtarefa('vergas e contravergas', alv2.subtarefas), 'Esta subtarefa já existe.')
const comNova = acrescentarSubtarefa(alv2, ' Conferir prumo ', 'st-x')
conferir('acrescentar vai para o fim, aberta', comNova.subtarefas.at(-1), { id: 'st-x', texto: 'Conferir prumo', feita: false, nao_realizado: null })
conferir('remover tira só ela', removerSubtarefa(comNova, 'st-x').subtarefas.length, 3)
const subNR = subtarefaNaoRealizada(alv2, 'st-05', { causa: 'mao_de_obra', obs: '' }, semAtual)
conferir('subtarefa não realizada guarda a causa', subNR.subtarefas[1].nao_realizado.causa, 'mao_de_obra')
conferir('marcar como feita apaga o não realizado', alternarSubtarefa(subNR, 'st-05').subtarefas[1], { id: 'st-05', texto: 'Elevação até o respaldo', feita: true, nao_realizado: null })
conferir('desfazer o não realizado da subtarefa', desfazerSubtarefaNaoRealizada(subNR, 'st-05').subtarefas[1].nao_realizado, null)

const comCausas = planejadasJE.map((a) => (a.id === 'at-09' ? hidrNR : a.id === 'at-06' ? subtarefaNaoRealizada(alv2, 'st-05', { causa: 'clima', obs: '' }, semAtual) : a))
conferir('causas da semana, mais frequente primeiro', causasDaSemana(comCausas, semAtual), [{ causa: 'clima', rotulo: 'Clima (chuva)', vezes: 2 }])
conferir('causas de outra semana não entram', causasDaSemana(planejadasJE, semAtual), [])
conferir('na semana passada aparecem as da laje e a das vergas', causasDaSemana(je, semanaDe('2026-10-12')),
  [{ causa: 'material', rotulo: 'Falta de material', vezes: 2 }, { causa: 'projeto', rotulo: 'Projeto (falta ou erro)', vezes: 1 }])

// ---------- configuração e casos de borda ----------
conferir('config padrão é válida', validarConfig(cfg), {})
conferir('sem nenhum dia útil é recusado', validarConfig({ dias_uteis: [], feriados: [] }).dias, 'Marque pelo menos um dia de trabalho.')
conferir('feriado repetido é recusado', validarConfig(cfg, '2026-11-02').novo, 'Este feriado já está na lista.')
conferir('resumo dos dias úteis', resumoDiasUteis(cfg), 'Seg, Ter, Qua, Qui, Sex · 5 feriados')
conferir('escala com fim antes do início não quebra', escalaDoCronograma('2026-10-21', '2026-10-01', 'semana').colunas.length, 1)

console.log(`${ok}/${tot} — planejamento`)
if (ok !== tot) process.exit(1)
