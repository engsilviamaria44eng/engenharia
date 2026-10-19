// Regras do módulo Qualidade (Pendências).
import {
  proximoStatusPendencia, acaoDaPendencia, semanaAtual, carimbo, anexarObservacao, linhasDoHistorico, proximoNumero, estaVencida,
  kpisDePendencias, pendentesPorResponsavel, responsaveisDe, empresasDe, filtrarPendencias, validarPendencia, novaPendencia,
  validarResolucao, avancarPendencia, reabrirPendencia, comObservacao,
  numeracaoDosItens, itensDaFicha, progressoDaVistoria, podeFinalizarVistoria, podeResponderItem, responderItem, finalizarVistoria,
  validarNovaVistoria, novaVistoria, validarNC, novaNC, codigoDaNC, aplicarAcaoNC, acoesDaNC, diasEmAberto, ordenarNCs, kpisDaFVS,
  podeEditarModelos, proximoCodigoModelo, modeloEmBranco, validarModelo, montarModelo, contarItensDoModelo, momento,
  podeTirarRelatorio, descreverFiltros, dataHoraDoRelatorio, FILTROS_INICIAIS_PENDENCIAS, FILTROS_INICIAIS_GEMBA,
  TIPOS_DESPERDICIO, rankingDesperdicios, prazoVencido, filtrarGemba, validarObservacao, alternarDesperdicio, novaObservacao, moverObservacao,
} from '../src/lib/qualidade.js'
import { PENDENCIAS, MODELOS_FVS, VISTORIAS_FVS, NAO_CONFORMIDADES, GEMBA_OBSERVACOES } from '../src/lib/mockData.js'

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

const hoje = '2026-10-19'
const agora = new Date(2026, 9, 19, 14, 5) // 19/10/2026 14:05 no relógio local
const je = PENDENCIAS.filter((p) => p.obra_id === 'obra-je')
const p = (n) => je.find((x) => x.numero === n)

// ---------- fluxo ----------
conferir('pendente → em andamento → resolvido', [proximoStatusPendencia('pendente'), proximoStatusPendencia('em_andamento'), proximoStatusPendencia('resolvido')], ['em_andamento', 'resolvido', null])
conferir('texto dos botões', [acaoDaPendencia('pendente'), acaoDaPendencia('em_andamento'), acaoDaPendencia('resolvido')], ['Colocar em andamento', 'Resolver', null])

// ---------- datas e carimbo ----------
conferir('semana de uma segunda', semanaAtual(hoje), { inicio: '2026-10-19', fim: '2026-10-25' })
conferir('semana de um domingo', semanaAtual('2026-10-25'), { inicio: '2026-10-19', fim: '2026-10-25' })
conferir('carimbo com data e hora locais', carimbo(agora), '[19/10/2026 14:05]')
const hist = anexarObservacao('[18/10/2026 09:00] antiga', ' nova nota ', agora, 'Engenheiro')
conferir('nota nova entra no topo, com carimbo e autor', linhasDoHistorico(hist), ['[19/10/2026 14:05] Engenheiro: nova nota', '[18/10/2026 09:00] antiga'])
conferir('primeira nota sem histórico', anexarObservacao('', 'oi', agora), '[19/10/2026 14:05] oi')

// ---------- exemplos e contas ----------
conferir('próximo número da JE-01 = 7', proximoNumero(je), 7)
conferir('lista vazia começa no 1', proximoNumero([]), 1)
conferir('#1 está vencida (prazo 15/10)', estaVencida(p(1), hoje), true)
conferir('prazo de hoje ainda não venceu', estaVencida(p(5), hoje), false)
conferir('resolvida nunca vence', estaVencida({ ...p(4), prazo: '2026-01-01' }, hoje), false)
conferir('KPIs da JE-01', kpisDePendencias(je), { total: 6, pendentes: 3, andamento: 2, resolvidos: 1 })
conferir('pendentes por responsável, maior primeiro', pendentesPorResponsavel(je), [{ responsavel: 'Mestre Ricardo', total: 4 }, { responsavel: 'Engenheiro', total: 1 }])
conferir('3 empresas na JE-01... e a Pereira', empresasDe(je), ['Construtora Pereira', 'Elétrica Luz Forte', 'Hidráulica Fluxo', 'Silva Alvenarias'])
conferir('responsáveis em ordem', responsaveisDe(je), ['Engenheiro', 'Mestre Ricardo'])

// ---------- filtros ----------
const nums = (lista) => lista.map((x) => x.numero)
const todos = { status: '', responsavel: '', prazo: 'todos', busca: '' }
conferir('ordem: vencida primeiro, resolvida no fim', nums(filtrarPendencias(je, todos, hoje)), [1, 5, 2, 6, 3, 4])
conferir('filtro atrasados', nums(filtrarPendencias(je, { ...todos, prazo: 'atrasados' }, hoje)), [1])
conferir('filtro prazo hoje', nums(filtrarPendencias(je, { ...todos, prazo: 'hoje' }, hoje)), [5])
conferir('filtro esta semana (19 a 25/10)', nums(filtrarPendencias(je, { ...todos, prazo: 'semana' }, hoje)), [5, 2, 6, 4])
conferir('filtro status + responsável', nums(filtrarPendencias(je, { ...todos, status: 'pendente', responsavel: 'Mestre Ricardo' }, hoje)), [1, 5, 3])
conferir('busca sem acento acha "Suíte"', nums(filtrarPendencias(je, { ...todos, busca: 'suite' }, hoje)), [2])
conferir('busca pelo número', nums(filtrarPendencias(je, { ...todos, busca: '#3' }, hoje)), [3])
conferir('busca pela empresa', nums(filtrarPendencias(je, { ...todos, busca: 'luz forte' }, hoje)), [6, 4])

// ---------- criar ----------
const base = { descricao: 'Trinca', local: 'Sala', pavimento: '', empresa: 'Silva', responsavel: 'Engenheiro', prazo: '2026-10-25', data_vistoria: hoje, foto: null, observacao: '' }
conferir('pendência válida', validarPendencia(base), {})
conferir('vazia avisa os 5 obrigatórios', Object.keys(validarPendencia({ data_vistoria: hoje })), ['descricao', 'local', 'empresa', 'responsavel', 'prazo'])
conferir('prazo antes da vistoria', validarPendencia({ ...base, prazo: '2026-10-18' }).prazo, 'O prazo não pode ser antes da vistoria.')
const nova = novaPendencia({ ...base, descricao: ' Trinca ', observacao: 'ver amanhã' }, { hoje, usuario: 'Ricardo Alves', agora })
conferir('nova nasce pendente, vistoria de hoje, por quem usa', [nova.status, nova.data_vistoria, nova.vistoriado_por, nova.descricao], ['pendente', hoje, 'Ricardo Alves', 'Trinca'])
conferir('observação inicial vira a 1ª linha do histórico', nova.observacoes, '[19/10/2026 14:05] Ricardo Alves: ver amanhã')

// ---------- avançar, resolver, reabrir, observar ----------
const andando = avancarPendencia(p(1), { hoje, usuario: 'Engenheiro', agora })
conferir('colocar em andamento registra no histórico', [andando.status, linhasDoHistorico(andando.observacoes)[0]], ['em_andamento', '[19/10/2026 14:05] Engenheiro: Colocada em andamento.'])
conferir('resolver sem foto é recusado', validarResolucao(null), 'Tire ou escolha a foto da correção para resolver.')
const resolvida = avancarPendencia(andando, { foto_evidencia: 'blob:x', hoje, usuario: 'Engenheiro', agora })
conferir('resolver guarda a foto e a data', [resolvida.status, resolvida.foto_evidencia, resolvida.data_resolucao], ['resolvido', 'blob:x', hoje])
conferir('resolvida não avança mais', avancarPendencia(resolvida, { hoje, usuario: 'x' }), resolvida)
const reaberta = reabrirPendencia(resolvida, { usuario: 'Engenheiro', agora, motivo: 'manchou de novo' })
conferir('reabrir volta para andamento e tira a evidência', [reaberta.status, reaberta.foto_evidencia, reaberta.data_resolucao, linhasDoHistorico(reaberta.observacoes)[0]], ['em_andamento', null, null, '[19/10/2026 14:05] Engenheiro: Reaberta: manchou de novo'])
conferir('observação a qualquer momento', linhasDoHistorico(comObservacao(p(3), 'Empresa avisada', { usuario: 'Engenheiro', agora }).observacoes), ['[19/10/2026 14:05] Engenheiro: Empresa avisada'])

// =================== FVS ===================
const vf1 = VISTORIAS_FVS[0]
const vf2 = VISTORIAS_FVS[1]
const ncsJE = NAO_CONFORMIDADES.filter((n) => n.obra_id === 'obra-je')
conferir('numeração por grupo', [...numeracaoDosItens(MODELOS_FVS[0].grupos).values()], ['1.1', '1.2', '1.3', '2.1', '2.2', '2.3', '2.4', '3.1', '3.2', '3.3'])
conferir('modelos com 10 e 8 itens', MODELOS_FVS.map(contarItensDoModelo), [10, 8])
conferir('vistoria concluída: 7 OK, 2 NC, 1 N.A. = 78%', progressoDaVistoria(vf1), { total: 10, ok: 7, nc: 2, na: 1, pendentes: 0, verificados: 10, conformidade: 78 })
conferir('vistoria em andamento: 4 de 8, 75%', [progressoDaVistoria(vf2).verificados, progressoDaVistoria(vf2).conformidade, progressoDaVistoria(vf2).pendentes], [4, 75, 4])
conferir('sem OK nem NC, conformidade vazia', progressoDaVistoria({ grupos: vf2.grupos, respostas: { 'f2-01': 'na' } }).conformidade, null)
conferir('só finaliza sem pendente', [podeFinalizarVistoria(vf2), podeFinalizarVistoria({ ...vf2, respostas: Object.fromEntries(itensDaFicha(vf2.grupos).map((it) => [it.id, 'ok'])) })], [false, true])
conferir('concluída não finaliza de novo', podeFinalizarVistoria(vf1), false)
conferir('responder muda a resposta', responderItem(vf2, 'f2-05', 'na').respostas['f2-05'], 'na')
conferir('vistoria concluída é só leitura', responderItem(vf1, 'f1-01', 'nc'), vf1)
conferir('item com NC registrada não muda pela vistoria', [podeResponderItem(vf2, ncsJE, 'f2-03'), podeResponderItem(vf2, ncsJE, 'f2-05')], [false, true])
conferir('finalizar trava com a data', finalizarVistoria({ ...vf2, respostas: Object.fromEntries(itensDaFicha(vf2.grupos).map((it) => [it.id, 'ok'])) }, hoje).status, 'concluida')
conferir('nova vistoria pede ficha e ambiente', Object.keys(validarNovaVistoria({ modelo_id: '', ambiente: ' ' })), ['modelo_id', 'ambiente'])
const nv = novaVistoria(MODELOS_FVS[1], ' Banheiro · Térreo ', { hoje, usuario: 'Ricardo Alves' })
conferir('nova vistoria copia a ficha e começa vazia', [nv.status, nv.ambiente, nv.modelo_versao, Object.keys(nv.respostas).length, itensDaFicha(nv.grupos).length], ['em_andamento', 'Banheiro · Térreo', 1, 0, 8])
conferir('cópia: mexer no modelo depois não muda a vistoria', nv.grupos === MODELOS_FVS[1].grupos, false)

// NC
const dNC = { fotos: [], descricao: 'Rejunte falhado na parede do box. Refazer.', solucao: 'Refazer o rejunte', severidade: 'media', responsavel: 'Revest Pisos' }
conferir('NC válida', validarNC(dNC), {})
conferir('NC vazia avisa tudo', Object.keys(validarNC({ fotos: [] })), ['descricao', 'solucao', 'severidade', 'responsavel'])
const nc = novaNC(dNC, { vistoria: vf2, itemId: 'f2-06', hoje, usuario: 'Engenheiro', agora })
conferir('NC nova: ligada ao item, título da 1ª frase, aberta', [nc.item_numero, nc.titulo, nc.status, nc.aberta_em, nc.servico], ['2.1', 'Rejunte falhado na parede do box', 'aberta', hoje, 'Revestimento Cerâmico'])
conferir('timeline começa com "Aberta por"', nc.timeline, [{ data: hoje, hora: '14:05', texto: 'Aberta por Engenheiro na vistoria (item 2.1).' }])
conferir('código da NC', codigoDaNC(7), 'NC-007')
const enc = aplicarAcaoNC(nc, 'encaminhar', { usuario: 'Engenheiro', papel: 'Engenheiro', hoje, agora })
conferir('encaminhar', [enc.status, enc.timeline.at(-1).texto], ['encaminhada', 'Encaminhada a Revest Pisos por Engenheiro.'])
const cor = aplicarAcaoNC(enc, 'corrigir', { usuario: 'Ricardo Alves', papel: 'Mestre', hoje, agora })
conferir('mestre marca corrigida', cor.status, 'corrigida')
conferir('mestre não aprova nem reprova', [acoesDaNC(cor, 'Mestre'), aplicarAcaoNC(cor, 'aprovar', { usuario: 'R', papel: 'Mestre', hoje })], [[], cor])
const rep = aplicarAcaoNC(cor, 'reprovar', { usuario: 'Engenheiro', papel: 'Engenheiro', hoje, agora, motivo: 'ainda falhado' })
conferir('reprovar volta para encaminhada, com o motivo', [rep.status, rep.timeline.at(-1).texto], ['encaminhada', 'Reprovada na reavaliação por Engenheiro: ainda falhado. Volta para correção.'])
const fech = aplicarAcaoNC(aplicarAcaoNC(rep, 'corrigir', { usuario: 'R', papel: 'Mestre', hoje, agora }), 'aprovar', { usuario: 'Engenheiro', papel: 'Engenheiro', hoje: '2026-10-22', agora })
conferir('aprovar fecha com a data', [fech.status, fech.fechada_em, fech.timeline.length], ['fechada', '2026-10-22', 6])
conferir('fechada não tem mais botão', acoesDaNC(fech, 'Engenheiro'), [])
conferir('ação que não existe não muda nada', aplicarAcaoNC(nc, 'aprovar', { usuario: 'E', papel: 'Engenheiro', hoje }), nc)
conferir('dias em aberto (aberta e fechada)', [diasEmAberto(ncsJE[0], hoje), diasEmAberto(ncsJE[2], hoje)], [5, 2])
conferir('ordem: grave e antiga primeiro, fechada no fim', ordenarNCs(ncsJE).map((n) => n.codigo), ['NC-001', 'NC-002', 'NC-003'])
conferir('KPIs da FVS da JE-01', kpisDaFVS(VISTORIAS_FVS.filter((v) => v.obra_id === 'obra-je'), ncsJE), { conformidade: 77, ncsAbertas: 2, concluidas: 1, emAndamento: 1 })
conferir('só o engenheiro edita modelos', [podeEditarModelos('Engenheiro'), podeEditarModelos('Mestre')], [true, false])

// modelos
conferir('próximo código de modelo', proximoCodigoModelo(MODELOS_FVS), 'FVS-03')
const branco = modeloEmBranco(MODELOS_FVS)
const errosBranco = validarModelo(branco, MODELOS_FVS)
conferir('modelo em branco avisa nome, categoria e item vazio', [errosBranco.nome, errosBranco.categoria, errosBranco.grupos[0].itens], ['Informe o nome do serviço.', 'Escolha a categoria.', 'Preencha todos os itens (ou remova os vazios).'])
conferir('código repetido é recusado', validarModelo({ ...branco, codigo: 'fvs-01' }, MODELOS_FVS).codigo, 'Já existe um modelo com este código.')
conferir('editar o próprio código pode', validarModelo({ codigo: 'FVS-01', nome: 'X', categoria: 'Estrutura', grupos: [{ nome: 'Execução', itens: [{ id: 'a', titulo: 'b' }] }] }, MODELOS_FVS, 'mf-01'), null)
conferir('grupo sem item', validarModelo({ codigo: 'FVS-09', nome: 'X', categoria: 'Estrutura', grupos: [{ nome: 'Execução', itens: [] }] }, MODELOS_FVS).grupos[0].itens, 'O grupo precisa de pelo menos um item.')
let n = 0
const montado = montarModelo({ codigo: ' FVS-03 ', nome: ' Pintura ', categoria: 'Acabamento', grupos: [{ nome: 'Execução', itens: [{ id: null, titulo: ' Lixar ' }, { id: 'x1', titulo: 'Fundo' }] }] }, null, () => `novo-${++n}`)
conferir('novo modelo: versão 1, itens novos ganham id', [montado.codigo, montado.versao, montado.grupos[0].itens.map((it) => it.id)], ['FVS-03', 1, ['novo-1', 'x1']])
conferir('editar sobe a versão', montarModelo({ codigo: 'FVS-01', nome: 'X', categoria: 'Estrutura', grupos: [] }, MODELOS_FVS[0]).versao, 3)
conferir('momento local', momento(agora), { data: hoje, hora: '14:05' })

// =================== GEMBA WALK ===================
const gJE = GEMBA_OBSERVACOES.filter((o) => o.obra_id === 'obra-je')
conferir('os 7 tipos exatos', TIPOS_DESPERDICIO.map((t) => t.id), ['Retrabalho', 'Espera', 'Transporte', 'Movimentação', 'Estoque', 'Superprodução', 'Processo desnecessário'])
conferir('exemplos da JE-01 cobrem os 7 tipos', TIPOS_DESPERDICIO.every((t) => gJE.some((o) => o.desperdicios.includes(t.id))), true)
conferir('ranking da JE-01, maior primeiro', rankingDesperdicios(gJE).map((r) => `${r.tipo} ${r.total}`), ['Espera 2', 'Movimentação 2', 'Retrabalho 2', 'Estoque 1', 'Processo desnecessário 1', 'Superprodução 1', 'Transporte 1'])
conferir('ranking vazio mostra os 7 com zero', rankingDesperdicios([]).every((r) => r.total === 0) && rankingDesperdicios([]).length === 7, true)
conferir('prazo vencido (e resolvida nunca vence)', [prazoVencido(gJE[1], hoje), prazoVencido(gJE[6], hoje), prazoVencido(gJE[5], hoje)], [true, false, false])
const ids = (l) => l.map((o) => o.id)
const fg = { tipo: '', prazo: 'todos', busca: '' }
conferir('vencidos primeiro', filtrarGemba(gJE, fg, hoje)[0].id, 'gb-02')
conferir('filtro por tipo', ids(filtrarGemba(gJE, { ...fg, tipo: 'Movimentação' }, hoje)), ['gb-07', 'gb-03'])
conferir('filtro vencidos', ids(filtrarGemba(gJE, { ...fg, prazo: 'vencidos' }, hoje)), ['gb-02'])
conferir('filtro hoje', ids(filtrarGemba(gJE, { ...fg, prazo: 'hoje' }, hoje)), ['gb-07'])
conferir('filtro esta semana', ids(filtrarGemba(gJE, { ...fg, prazo: 'semana' }, hoje)), ['gb-07', 'gb-01', 'gb-03', 'gb-04'])
conferir('filtro sem prazo', ids(filtrarGemba(gJE, { ...fg, prazo: 'sem_prazo' }, hoje)), ['gb-05'])
conferir('busca sem acento', ids(filtrarGemba(gJE, { ...fg, busca: 'betonada' }, hoje)), ['gb-05'])
const dObs = { local: 'Pátio', descricao: 'Material espalhado', causa_raiz: 'Sem baia', acao: 'Fazer baia', desperdicios: ['Movimentação'], responsavel: 'Mestre', prazo: null, foto: null }
conferir('observação válida (prazo opcional)', validarObservacao(dObs, hoje), {})
conferir('vazia avisa tudo', Object.keys(validarObservacao({ desperdicios: [] }, hoje)), ['local', 'descricao', 'causa_raiz', 'acao', 'desperdicios', 'responsavel'])
conferir('tipo inventado é recusado', validarObservacao({ ...dObs, desperdicios: ['Preguiça'] }, hoje).desperdicios, 'Tipo de desperdício desconhecido.')
conferir('prazo antes de hoje é recusado', validarObservacao({ ...dObs, prazo: '2026-10-18' }, hoje).prazo, 'O prazo não pode ser antes de hoje.')
conferir('marcar tipos mantém a ordem oficial', alternarDesperdicio(alternarDesperdicio(['Estoque'], 'Retrabalho'), 'Estoque'), ['Retrabalho'])
conferir('marcar dois tipos', alternarDesperdicio(['Estoque'], 'Espera'), ['Espera', 'Estoque'])
const obs = novaObservacao({ ...dObs, local: ' Pátio ', prazo: '' }, { hoje, usuario: 'Ricardo Alves' })
conferir('nova nasce pendente, sem prazo, com data e autor', [obs.status, obs.prazo, obs.data, obs.registrado_por, obs.local], ['pendente', null, hoje, 'Ricardo Alves', 'Pátio'])
conferir('mover entre as 3 colunas', [moverObservacao(obs, 'resolvido').status, moverObservacao(obs, 'qualquer').status], ['resolvido', 'pendente'])

// =================== RELATÓRIO ===================
conferir('só o engenheiro tira o relatório', [podeTirarRelatorio('Engenheiro'), podeTirarRelatorio('Mestre'), podeTirarRelatorio(undefined)], [true, false, false])
conferir('sem filtros', descreverFiltros(FILTROS_INICIAIS_PENDENCIAS, FILTROS_INICIAIS_GEMBA), 'Sem filtros')
conferir('sem argumentos também', descreverFiltros(), 'Sem filtros')
conferir('filtros em texto', descreverFiltros({ status: 'pendente', responsavel: 'Mestre Ricardo', prazo: 'atrasados', busca: ' suite ' }, { tipo: 'Espera', prazo: 'sem_prazo', busca: '' }),
  'Pendências: status pendente · Pendências: responsável Mestre Ricardo · Pendências: prazo atrasados · Pendências: busca "suite" · Gemba: Espera · Gemba: prazo sem prazo')
conferir('data e hora do rodapé, no relógio local', dataHoraDoRelatorio(agora), '19/10/2026 às 14:05')
conferir('meia-noite e dia de um dígito', dataHoraDoRelatorio(new Date(2027, 0, 5, 0, 7)), '05/01/2027 às 00:07')
conferir('filtros iniciais = os mesmos das abas', [FILTROS_INICIAIS_PENDENCIAS.prazo, FILTROS_INICIAIS_GEMBA.prazo], ['todos', 'todos'])

console.log(`${ok}/${tot} — qualidade`)
if (ok !== tot) process.exit(1)
