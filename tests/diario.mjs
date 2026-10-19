// Regras do Diário de Obra (RDO).
import {
  resumoClima, alternarClima, numeroDoRdo, diaDaSemanaPorExtenso, funcoesDaObra, ehFuncaoNova, normalizarFuncao, totalDoEfetivo,
  efetivoDoDia, ultimoAvanco, frentesParaLancar, diarioDoDia, formularioDoDia, marcarConcluido, mudarEfetivo, equipamentosDoDiaAnterior,
  validarDiario, avancosMenores, montarDiario, ordenarDiarios, resumoDoDia, FUNCOES_PADRAO, maoDeObraDoDia, equipamentosDoDia,
  ehAtrasado, proximoAvanco, diasSemDiario, agruparPorMes, novaAtividadeFora, atividadesParaAnalisar, analisarAtividade, lerQuantidade,
  alternarClienteVe, semanaParaLiberar, liberarTodas, validarEscolhaPdf, diariosDoPdf, resumoDoPdf, dataHoraPorExtenso, servicosDoRdo,
  folhaDoRdo,
} from '../src/lib/diario.js'
import { DIARIOS, FRENTES, OBRAS } from '../src/lib/mockData.js'

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
const je = DIARIOS.filter((d) => d.obra_id === 'obra-je')
const fje = FRENTES.filter((f) => f.obra_id === 'obra-je')
const frente = (id) => FRENTES.find((f) => f.id === id)
const inicioJE = OBRAS[0].data_inicio

// ---------- clima e RDO ----------
conferir('clima em uma linha', resumoClima({ manha: 'sol', tarde: 'chuva_forte', noite: null }), 'Sol · Chuva forte · —')
conferir('tocar de novo desmarca', alternarClima({ manha: 'sol' }, 'manha', 'sol').manha, null)
conferir('trocar o clima do período', alternarClima({ manha: 'sol' }, 'manha', 'chuva').manha, 'chuva')
conferir('RDO nº 1 no dia do início', numeroDoRdo('2026-06-01', '2026-06-01'), 1)
conferir('RDO = dia da obra em dias corridos', numeroDoRdo(inicioJE, '2026-10-19'), 141)
conferir('dia da semana sem fuso', [diaDaSemanaPorExtenso('2026-10-19'), diaDaSemanaPorExtenso('2026-10-17')], ['segunda', 'sábado'])

// ---------- efetivo ----------
conferir('14 funções padrão', FUNCOES_PADRAO.length, 14)
const funcoes = funcoesDaObra(je)
conferir('funções da obra: padrão + a nova lançada', [funcoes.length, funcoes.at(-1)], [15, 'Ajudante de elétrica'])
conferir('nova função marcada como nova', [ehFuncaoNova('Ajudante de elétrica'), ehFuncaoNova('Pedreiro')], [true, false])
conferir('outra função: primeira letra maiúscula', normalizarFuncao('  vidraceiro ', funcoes), 'Vidraceiro')
conferir('outra função que já existe soma na existente', normalizarFuncao('PEDREIRO', funcoes), 'Pedreiro')
conferir('outra função vazia', normalizarFuncao('  ', funcoes), null)
conferir('total do efetivo', totalDoEfetivo({ Pedreiro: 3, Servente: 2 }), 5)
conferir('efetivo do dia soma as frentes', efetivoDoDia(je.find((d) => d.data === '2026-10-01')), { porFuncao: { Pedreiro: 3, Servente: 3, Eletricista: 2, Carpinteiro: 2, Armador: 2 }, total: 12 })
const s0 = { frente_id: 'x', efetivo: {}, avanco: '10', concluido: false }
conferir('mais e menos no efetivo', mudarEfetivo(mudarEfetivo(s0, 'Pedreiro', 1), 'Pedreiro', 1).efetivo, { Pedreiro: 2 })
conferir('zero sai do efetivo', mudarEfetivo({ ...s0, efetivo: { Pedreiro: 1 } }, 'Pedreiro', -1).efetivo, {})
conferir('não fica negativo', mudarEfetivo(s0, 'Pedreiro', -1).efetivo, {})

// ---------- avanço ----------
conferir('último avanço da alvenaria antes de hoje', ultimoAvanco(je, frente('f-alv'), hoje), 60)
conferir('último avanço antes de 08/10', ultimoAvanco(je, frente('f-alv'), '2026-10-08'), 40)
conferir('frente sem diário usa o cadastro', ultimoAvanco(je, frente('f-gesso'), hoje), 0)
conferir('os avanços dos exemplos batem com as frentes', fje.filter((f) => f.status !== 'Concluída').map((f) => ultimoAvanco(je, f, hoje) === f.avanco), [true, true, true, true, true])
conferir('concluídas não aparecem para lançar', frentesParaLancar(fje).some((f) => f.status === 'Concluída'), false)
conferir('marcar concluído leva a 100%', marcarConcluido({ avanco: '60', concluido: false }, true), { avanco: '100', concluido: true })

// ---------- formulário ----------
const novo = formularioDoDia(je, fje, hoje)
conferir('dia sem diário: em branco, avanço começa no último', [novo.id, novo.servicos.find((s) => s.frente_id === 'f-alv').avanco, novo.servicos.every((s) => !s.marcada)], [null, '60', true])
const editar = formularioDoDia(je, fje, '2026-10-16')
conferir('dia com diário abre preenchido', [editar.id, editar.servicos.filter((s) => s.marcada).map((s) => s.frente_id), editar.ocorrencias.startsWith('Vergalhão')], ['dr-12', ['f-eletr', 'f-reb'], true])
conferir('diário do dia', diarioDoDia(je, '2026-10-07').id, 'dr-06')
conferir('equipamentos do dia anterior mais próximo', equipamentosDoDiaAnterior(je, '2026-10-08').map((e) => e.situacao)[0], 'Parado')
conferir('sem dia anterior, lista vazia', equipamentosDoDiaAnterior(je, '2026-09-01'), [])

// ---------- validação ----------
const base = { ...novo, servicos: novo.servicos.map((s) => (s.frente_id === 'f-alv' ? { ...s, marcada: true, avanco: '65' } : s)) }
const ctx = { hoje, inicioObra: inicioJE, papel: 'Mestre' }
conferir('diário válido', validarDiario(base, ctx), null)
conferir('nada marcado e sem ocorrência', validarDiario(novo, ctx).vazio, 'Marque pelo menos uma frente trabalhada ou escreva uma ocorrência.')
conferir('só ocorrência também vale', validarDiario({ ...novo, ocorrencias: 'Chuva o dia todo' }, ctx), null)
const ruim = { ...base, servicos: base.servicos.map((s) => (s.frente_id === 'f-alv' ? { ...s, avanco: '120' } : s)) }
conferir('avanço acima de 100', validarDiario(ruim, ctx).servicos['f-alv'], 'Avanço de 0 a 100 (número inteiro).')
conferir('data no futuro', validarDiario({ ...base, data: '2026-10-20' }, { ...ctx, papel: 'Engenheiro' }).data, 'Não dá para lançar diário de um dia que ainda não chegou.')
conferir('antes do início da obra', validarDiario({ ...base, data: '2026-05-30' }, { ...ctx, papel: 'Engenheiro' }).data, 'Esta data é antes do início da obra.')
conferir('mestre só lança hoje', validarDiario({ ...base, data: '2026-10-16' }, ctx).data, 'O mestre só lança o diário de hoje.')
conferir('engenheiro lança outro dia', validarDiario({ ...base, data: '2026-10-16' }, { ...ctx, papel: 'Engenheiro' }), null)
const equipRuim = { ...base, equipamentos: [{ nome: ' ', quantidade: '0', origem: 'Próprio', situacao: 'Em uso' }] }
conferir('equipamento sem nome e quantidade 0', validarDiario(equipRuim, ctx).equipamentos[0], { nome: 'Informe o equipamento.', quantidade: 'Quantidade de 1 para cima.' })

// ---------- avanço menor pede confirmação ----------
const menor = { ...base, servicos: base.servicos.map((s) => (s.frente_id === 'f-alv' ? { ...s, avanco: '55' } : s)) }
conferir('avanço menor que o último', avancosMenores(menor, je, fje), [{ frente_id: 'f-alv', servico: 'Alvenaria 2º pavimento', avanco: 55, ultimo: 60 }])
conferir('avanço igual ou maior não pergunta', avancosMenores(base, je, fje), [])

// ---------- montar e a lista ----------
const comEfetivo = { ...base, efetivo: { Pedreiro: 2, Pintor: 0 }, servicos: base.servicos.map((s) => (s.frente_id === 'f-alv' ? { ...s, detalhe: ' parede da escada ' } : s)) }
const m = montarDiario(comEfetivo, { usuario: 'Ricardo Alves', hoje })
conferir('montar: só a frente marcada, avanço em número, sem efetivo no serviço', m.servicos, [{ frente_id: 'f-alv', avanco: 65, concluido: false, detalhe: 'parede da escada' }])
conferir('montar: o efetivo é do dia, sem zeros', m.efetivo, { Pedreiro: 2 })
conferir('montar: quem e quando lançou', [m.lancado_por, m.lancado_em, m.data], ['Ricardo Alves', hoje, hoje])
conferir('montar: concluído grava 100', montarDiario({ ...base, servicos: base.servicos.map((s) => (s.frente_id === 'f-alv' ? { ...s, concluido: true, avanco: '70' } : s)) }, { usuario: 'R', hoje }).servicos[0].avanco, 100)
conferir('editar mantém quem lançou', montarDiario({ ...editar, lancado_por: 'Ricardo Alves', lancado_em: '2026-10-16' }, { usuario: 'Engenheiro', hoje }).lancado_por, 'Ricardo Alves')
conferir('lista do mais recente ao mais antigo', ordenarDiarios(je).slice(0, 3).map((d) => d.data), ['2026-10-17', '2026-10-16', '2026-10-15'])
conferir('linha do dia', resumoDoDia(je.find((d) => d.data === '2026-10-16'), inicioJE), { rdo: 138, clima: 'Sol · Sol · —', frentes: 2, foras: 0, efetivo: 7, fotos: 1, fotosEscondidas: 1, atrasado: false })
conferir('lançado depois do dia aparece como atrasado', resumoDoDia({ ...je[0], lancado_em: '2026-10-18' }, inicioJE).atrasado, true)

// ---------- mão de obra e equipamentos na lista de dias ----------
const d16 = je.find((d) => d.data === '2026-10-16')
conferir('mão de obra do dia na ordem das funções (nova no fim)', maoDeObraDoDia(d16), [
  { funcao: 'Pedreiro', quantidade: 2 }, { funcao: 'Servente', quantidade: 2 }, { funcao: 'Eletricista', quantidade: 2 }, { funcao: 'Ajudante de elétrica', quantidade: 1 },
])
conferir('dia sem efetivo: lista vazia', maoDeObraDoDia({ servicos: [] }), [])
conferir('equipamentos do dia, com alerta quando não está em uso', equipamentosDoDia(je.find((d) => d.data === '2026-10-07')).map((e) => [e.texto, e.alerta]), [['1× Betoneira 400 L', true], ['20× Andaime (módulos)', false], ['1× Serra circular', false]])
conferir('dia sem equipamento', equipamentosDoDia({ equipamentos: [] }), [])

// =================== 2ª etapa ===================
// ---------- diário atrasado ----------
conferir('atrasado = antes de hoje', [ehAtrasado('2026-10-18', hoje), ehAtrasado(hoje, hoje)], [true, false])
conferir('próximo avanço da alvenaria depois de 04/10', proximoAvanco(je, 'f-alv', '2026-10-04'), { data: '2026-10-05', avanco: 38 })
conferir('sem diário depois', proximoAvanco(je, 'f-alv', hoje), null)
const sete = formularioDoDia(je, fje, '2026-10-04') // domingo sem diário, entre 03/10 (35%) e 05/10 (38%)
const marcar = (form, valor) => ({ ...form, servicos: form.servicos.map((s) => (s.frente_id === 'f-alv' ? { ...s, marcada: true, avanco: valor } : s)) })
const ctxEng = { hoje, inicioObra: inicioJE, papel: 'Engenheiro', diarios: je, frentes: fje }
conferir('atrasado: avanço entre o dia anterior e o seguinte passa', validarDiario(marcar(sete, '37'), ctxEng), null)
conferir('atrasado: passar do diário seguinte é recusado', validarDiario(marcar(sete, '45'), ctxEng).servicos['f-alv'], 'Em 05/10 esta frente já estava em 38%. O valor tem que ficar entre 35% e 38%.')
conferir('atrasado: lançado agora, marcado como atrasado', resumoDoDia(montarDiario(marcar(sete, '37'), { usuario: 'Engenheiro', hoje }), inicioJE).atrasado, true)
conferir('exemplo passado a limpo (30/09) aparece como atrasado', resumoDoDia(je.find((d) => d.data === '2026-09-30'), inicioJE).atrasado, true)

// ---------- dias sem diário ----------
const sem = diasSemDiario(je, inicioJE, hoje)
conferir('dias sem diário não contam domingo, hoje nem dias com diário', [sem.includes('2026-10-04'), sem.includes(hoje), sem.includes('2026-10-16'), sem.includes('2026-10-12'), sem.includes('2026-10-10')], [false, false, false, true, true])
conferir('primeiro dia sem diário é o início da obra', sem[0], '2026-06-01')
conferir('obra sem início: lista vazia', diasSemDiario(je, null, hoje), [])
const meses = agruparPorMes(['2026-08-03', '2026-08-04', '2026-10-10'])
conferir('agrupado por mês, o mais recente primeiro', meses.map((m) => [m.rotulo, m.dias.length]), [['outubro de 2026', 1], ['agosto de 2026', 2]])

// ---------- fora do orçamento ----------
const fora = { ...novaAtividadeFora('fo-x'), descricao: ' Demolição de mureta ', quantidade: '4,5', unidade: 'm' }
const comFora = { ...novo, foras: [fora] }
conferir('só a atividade fora do orçamento já vale como diário', validarDiario(comFora, ctx), null)
conferir('atividade fora sem descrição', validarDiario({ ...novo, foras: [{ ...fora, descricao: '' }] }, ctx).foras['fo-x'], 'Descreva a atividade.')
conferir('quantidade que não é número', validarDiario({ ...novo, foras: [{ ...fora, quantidade: 'abc' }] }, ctx).foras['fo-x'], 'Quantidade tem que ser um número maior que zero (ou deixe em branco).')
const mFora = montarDiario(comFora, { usuario: 'Ricardo Alves', hoje }).servicos[0]
conferir('montar: fora do orçamento com quantidade em número e para analisar, sem efetivo', [mFora.fora_orcamento, mFora.descricao, mFora.quantidade, 'efetivo' in mFora, mFora.analise], [true, 'Demolição de mureta', 4.5, false, 'para_analisar'])
conferir('efetivo do dia vem do diário, não dos serviços', efetivoDoDia({ efetivo: { Servente: 2 }, servicos: [mFora] }).total, 2)
conferir('mais e menos no efetivo do dia', mudarEfetivo(mudarEfetivo({ efetivo: {} }, 'Servente', 1), 'Servente', 1).efetivo, { Servente: 2 })
conferir('formulário traz o efetivo do dia', formularioDoDia(je, fje, '2026-10-16').efetivo, { Eletricista: 2, 'Ajudante de elétrica': 1, Pedreiro: 2, Servente: 2 })
const d13 = je.find((d) => d.data === '2026-10-13')
conferir('formulário traz a atividade fora do dia', formularioDoDia(je, fje, '2026-10-13').foras.map((x) => [x.id, x.quantidade]), [['fo-01', '4']])
conferir('linha do dia conta frentes e fora separados', [resumoDoDia(d13, inicioJE).frentes, resumoDoDia(d13, inicioJE).foras], [2, 1])
const anal = atividadesParaAnalisar(je)
conferir('para analisar: só a de 13/10 (a de 15/10 já é extra)', anal.map((x) => [x.data, x.atividade.id]), [['2026-10-13', 'fo-01']])
conferir('ligar a uma frente', analisarAtividade(d13, 'fo-01', { acao: 'ligar', frenteId: 'f-alv' }).servicos.find((s) => s.id === 'fo-01').analise, 'ligada')
conferir('ligar sem escolher frente não muda nada', analisarAtividade(d13, 'fo-01', { acao: 'ligar' }), d13)
conferir('marcar como extra', analisarAtividade(d13, 'fo-01', { acao: 'extra' }).servicos.find((s) => s.id === 'fo-01').analise, 'extra')
conferir('lê quantidade brasileira', [lerQuantidade('1.250,5'), lerQuantidade('4'), Number.isNaN(lerQuantidade(''))], [1250.5, 4, true])

// ---------- Cliente vê ----------
const comFoto = je.find((d) => d.data === '2026-10-16')
conferir('alternar a chave da foto', alternarClienteVe(comFoto, 'ft-02').fotos[0].cliente_ve, true)
const sem7 = semanaParaLiberar(je, hoje)
conferir('semana: só os diários dos últimos 7 dias com foto escondida', [sem7.diarios.map((d) => d.data), sem7.fotos], [['2026-10-16'], 1])
conferir('liberar todas', liberarTodas(comFoto).fotos.every((f) => f.cliente_ve), true)

// ---------- PDF do diário (RDO) ----------
const frJe = FRENTES.filter((f) => f.obra_id === 'obra-je')
const obraJe = OBRAS.find((o) => o.id === 'obra-je')
const periodo = { modo: 'periodo', de: '2026-10-13', ate: '2026-10-17' }
conferir('período: os dias lançados, em ordem de data', diariosDoPdf(periodo, je).map((d) => d.data), ['2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17'])
conferir('só o dia', diariosDoPdf({ modo: 'dia', dia: '2026-10-16' }, je).map((d) => d.data), ['2026-10-16'])
conferir('escolha: fim antes do começo', validarEscolhaPdf({ modo: 'periodo', de: '2026-10-17', ate: '2026-10-13' }, je), 'O fim do período não pode ser antes do começo.')
conferir('escolha: período sem diário', validarEscolhaPdf({ modo: 'periodo', de: '2026-10-18', ate: '2026-10-19' }, je), 'Nenhum diário lançado nesse período.')
conferir('escolha: dia sem diário', validarEscolhaPdf({ modo: 'dia', dia: '2026-10-19' }, je), 'Escolha um dia lançado.')
conferir('escolha: período sem datas', validarEscolhaPdf({ modo: 'periodo', de: '', ate: '' }, je), 'Escolha o começo e o fim do período.')
conferir('escolha válida', [validarEscolhaPdf({ modo: 'dia', dia: '2026-10-16' }, je), validarEscolhaPdf(periodo, je)], [null, null])
conferir('resumo do PDF', [resumoDoPdf(diariosDoPdf(periodo, je)), resumoDoPdf([d16]), resumoDoPdf([])], ['5 RDOs · 13/10/2026 a 17/10/2026', '1 RDO · 16/10/2026', 'Nenhum RDO'])
conferir('data e hora da geração', dataHoraPorExtenso(new Date(2026, 9, 19, 14, 5)), '19/10/2026 às 14:05')
const sv16 = servicosDoRdo(d16, je, frJe)
conferir('serviços: no dia = avanço menos o anterior; acumulado', sv16.map((s) => [s.servico, s.noDia, s.acumulado]), [['Instalações elétricas — tubulação', 3, 25], ['Reboco interno', 3, 7]])
const fora13 = servicosDoRdo(je.find((d) => d.data === '2026-10-13'), je, frJe).filter((s) => s.fora)
conferir('serviço fora do orçamento entra marcado, com quantidade', fora13.length > 0 && fora13.every((s) => s.quantidade && s.responsavel === ''), true)
const folha16 = folhaDoRdo(d16, { obra: obraJe, diarios: je, frentes: frJe, geradoEm: '19/10/2026 às 14:05' })
conferir('folha: número, dia, obra, cliente', [folha16.numero, folha16.diaDaSemana, folha16.obra, folha16.cliente], [138, 'sexta', 'JE-01 · Residencial Jardim Europa', 'Paula Mendes'])
conferir('folha: período sem clima vira "Não informado"', folha16.clima.map((c) => c.valor), ['Sol', 'Sol', 'Não informado'])
conferir('folha: mão de obra e total', [folha16.maoDeObra.length, folha16.totalMaoDeObra], [4, 7])
conferir('folha: legenda da foto', folha16.fotos.map((x) => x.legenda), ['Sala · Instalações elétricas — tubulação · 16/10/2026'])
conferir('folha em dia: sem rodapé de atraso', folha16.rodape, null)
const folha30 = folhaDoRdo(je.find((d) => d.id === 'dr-16'), { obra: obraJe, diarios: je, frentes: frJe, geradoEm: 'x' })
conferir('folha atrasada: rodapé com as duas datas', [folha30.numero, folha30.rodape], [122, 'Lançado em 18/10/2026 · referente a 30/09/2026'])

console.log(`${ok}/${tot} — diario`)
if (ok !== tot) process.exit(1)
