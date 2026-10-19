// Regras do módulo Medições de empreiteiros (contratos, valor e acumulado).
import {
  formatarReais, arredondar2, lerNumero, soNumero, valorTotal, valorDaMedicao, resumoDoContrato, resumoDosAtivos,
  proximoStatusContrato, statusAnteriorContrato, podeMoverContrato, moverContrato, podeEditarValor, podeMedir,
  validarNovoContrato, novoContrato, validarValor, totalDoEscopo, aplicarValor, valorParaFormulario, linhaVaziaDeEscopo,
  proximoNumero, periodoSugerido, medidoAntes, pctDoGlobal, reaisDoPct, quantidadeDaLinha, pctDaQuantidade, reaisDaQuantidade,
  validarBoletim, numerosDoBoletim, previaDoBoletim, montarBoletim, boletimParaFormulario, podeEditarBoletim, fecharBoletim, csvDoBoletim,
} from '../src/lib/medicoes.js'
import { CONTRATOS, ITENS_CONTRATO, MEDICOES } from '../src/lib/mockData.js'

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

const c = (id) => CONTRATOS.find((x) => x.id === id)
const gesso = c('ct-01')
const drywall = c('ct-02')

// ---------- números e reais ----------
conferir('reais no formato brasileiro', formatarReais(30000).replace(/\s/g, ' '), 'R$ 30.000,00')
conferir('centavos sem erro de soma', arredondar2(0.1 + 0.2), 0.3)
conferir('lê número brasileiro', [lerNumero('1.250,50'), lerNumero('30.000'), lerNumero('12,5'), lerNumero('80')], [1250.5, 30000, 12.5, 80])
conferir('texto não é número', [lerNumero('abc'), lerNumero(''), lerNumero('  ')], [null, null, null])
conferir('campo numérico só aceita número', soNumero('R$ 1.2a3,4b'), '1.23,4')

// ---------- valor e acumulado (os exemplos batem) ----------
conferir('gesso global = 30 mil', valorTotal(gesso, ITENS_CONTRATO), 30000)
conferir('drywall por escopo = 16 + 8 + 6 mil', valorTotal(drywall, ITENS_CONTRATO), 30000)
conferir('contrato sem valor', valorTotal(c('ct-03'), ITENS_CONTRATO), null)
conferir('boletim global: 25% de 30 mil', valorDaMedicao(MEDICOES[0], gesso, ITENS_CONTRATO), 7500)
conferir('boletim por escopo: 80×80 + 40×40', valorDaMedicao(MEDICOES[1], drywall, ITENS_CONTRATO), 8000)
const rDry = resumoDoContrato(drywall, ITENS_CONTRATO, MEDICOES)
conferir('drywall: medido 15.600 (52%), saldo 14.400, 2 boletins', [rDry.medido, rDry.pct, rDry.saldo, rDry.boletins], [15600, 52, 14400, 2])
const rFund = resumoDoContrato(c('ct-05'), ITENS_CONTRATO, MEDICOES)
conferir('fundação concluída com 100%', [rFund.pct, rFund.saldo], [100, 0])
const je = (lista) => lista.filter((x) => x.obra_id === 'obra-je')
conferir('obra: 2 ativos, 60 mil contratados, saldo 36.900', resumoDosAtivos(je(CONTRATOS), ITENS_CONTRATO, MEDICOES), { ativos: 2, contratado: 60000, saldo: 36900 })

// ---------- fluxo do Kanban ----------
conferir('ordem das colunas', [proximoStatusContrato('elaboracao'), proximoStatusContrato('ativo'), proximoStatusContrato('concluido')], ['enviado', 'concluido', null])
conferir('em elaboração não volta', statusAnteriorContrato('elaboracao'), null)
conferir('aprovar pede o valor', podeMoverContrato(c('ct-03'), 'ativo', { pct: 0, boletins: 0 }).pedeValor, true)
const bloqueio = podeMoverContrato(drywall, 'concluido', rDry)
conferir('concluir com 52% é bloqueado e avisa', [bloqueio.ok, bloqueio.motivo], [false, 'Só dá para concluir com 100% medido. Este contrato está com 52%.'])
conferir('concluir com 100% pode', podeMoverContrato(gesso, 'concluido', { pct: 100, boletins: 4 }).ok, true)
conferir('ativo com boletim não volta para aprovação', podeMoverContrato(drywall, 'enviado', rDry).ok, false)
conferir('ativo sem boletim pode voltar', podeMoverContrato(c('ct-06'), 'enviado', { pct: 0, boletins: 0 }).ok, true)
conferir('mover troca só o status', moverContrato(c('ct-04'), 'enviado'), { ...c('ct-04'), status: 'enviado' })
conferir('só contrato ativo recebe medição', [podeMedir(gesso), podeMedir(c('ct-03'))], [true, false])
conferir('valor só se edita sem boletim', [podeEditarValor(drywall, rDry), podeEditarValor(c('ct-06'), { boletins: 0 })], [false, true])

// ---------- novo contrato ----------
conferir('contrato vazio avisa os dois campos', Object.keys(validarNovoContrato({ empreiteiro: ' ', descricao: '' })), ['empreiteiro', 'descricao'])
conferir('nasce em elaboração, sem valor', novoContrato({ empreiteiro: ' Pinturas Sol ', descricao: 'Pintura' }), { empreiteiro: 'Pinturas Sol', descricao: 'Pintura', status: 'elaboracao', tipo: null, valor_global: null })

// ---------- cadastro do valor ----------
conferir('sem escolher o tipo', validarValor({ tipo: null, valor_global: '', itens: [] }).tipo, 'Escolha como o contrato foi fechado.')
conferir('global sem valor', validarValor({ tipo: 'global', valor_global: '', itens: [] }).valor_global, 'Informe o valor total.')
conferir('global zero', validarValor({ tipo: 'global', valor_global: '0', itens: [] }).valor_global, 'O valor tem que ser um número maior que zero.')
conferir('global válido', validarValor({ tipo: 'global', valor_global: '30.000,00', itens: [] }), null)
const linhaRuim = { descricao: '', unidade: 'kg', quantidade: '0', preco_unitario: 'x' }
conferir('linha de escopo com tudo errado', Object.keys(validarValor({ tipo: 'escopo', itens: [linhaRuim] }).itens[0]), ['descricao', 'unidade', 'quantidade', 'preco_unitario'])
conferir('escopo sem item', validarValor({ tipo: 'escopo', itens: [] }).escopo, 'Acrescente pelo menos um item.')
const escopoOk = [
  { descricao: 'Placas', unidade: 'm2', quantidade: '200', preco_unitario: '80' },
  { descricao: 'Tabica', unidade: 'm', quantidade: '50', preco_unitario: '120,00' },
]
conferir('escopo válido', validarValor({ tipo: 'escopo', itens: escopoOk }), null)
conferir('total ao vivo (linha incompleta conta 0)', totalDoEscopo([...escopoOk, linhaVaziaDeEscopo()]), 22000)
const glob = aplicarValor(c('ct-03'), { tipo: 'global', valor_global: '48.500,50', itens: [] })
conferir('aplicar global', [glob.contrato.tipo, glob.contrato.valor_global, glob.itens.length], ['global', 48500.5, 0])
const esc = aplicarValor(c('ct-03'), { tipo: 'escopo', valor_global: '', itens: escopoOk })
conferir('aplicar escopo gera os itens numerados', esc.itens.map((i) => [i.ordem, i.quantidade, i.preco_unitario]), [[1, 200, 80], [2, 50, 120]])
conferir('escopo zera o valor global', esc.contrato.valor_global, null)
conferir('formulário de edição vem preenchido', valorParaFormulario(drywall, ITENS_CONTRATO).itens[0], { descricao: 'Placas de drywall (montagem)', unidade: 'm2', quantidade: '200', preco_unitario: '80' })

// ---------- ficha de medição ----------
const hoje = '2026-10-19'
conferir('próximo número do drywall = 3', proximoNumero(drywall, MEDICOES), 3)
conferir('primeiro boletim = 1', proximoNumero(c('ct-06'), MEDICOES), 1)
conferir('período começa no dia seguinte ao último', periodoSugerido(drywall, MEDICOES, hoje), { inicio: '2026-10-19', fim: hoje })
conferir('sem boletim, período é hoje', periodoSugerido(c('ct-06'), MEDICOES, hoje), { inicio: hoje, fim: hoje })

const antesG = medidoAntes(gesso, MEDICOES)
conferir('gesso já medido 25%', antesG.pct, 25)
const antesD = medidoAntes(drywall, MEDICOES)
conferir('drywall já medido por item', [antesD.qtd.get('ic-01'), antesD.qtd.get('ic-02'), antesD.qtd.get('ic-03')], [120, 90, 20])
conferir('editando o boletim 2, ele não conta', medidoAntes(drywall, MEDICOES, 'md-03').qtd.get('ic-01'), 80)

// global: % OU R$
conferir('global: digita %', pctDoGlobal('pct', '10', 30000), 10)
conferir('global: digita R$ e vira %', pctDoGlobal('reais', '7.500,00', 30000), 25)
conferir('global: R$ 1.000 em 30 mil volta exato', reaisDoPct(pctDoGlobal('reais', '1000', 30000), 30000), 1000)
const dGlob = (texto, campo = 'pct') => ({ periodo_inicio: '2026-10-12', periodo_fim: hoje, global: { campo, texto }, linhas: {} })
conferir('global válido', validarBoletim(dGlob('30'), gesso, ITENS_CONTRATO, antesG), null)
conferir('global até 100% exato pode', validarBoletim(dGlob('75'), gesso, ITENS_CONTRATO, antesG), null)
conferir('global passa de 100% é travado', validarBoletim(dGlob('80'), gesso, ITENS_CONTRATO, antesG).global, 'Passa de 100%: já foram medidos 25%; o máximo agora é 75%.')
conferir('global em R$ acima do saldo é travado', !!validarBoletim(dGlob('23.000', 'reais'), gesso, ITENS_CONTRATO, antesG).global, true)
conferir('global vazio', validarBoletim(dGlob(''), gesso, ITENS_CONTRATO, antesG).global, 'Informe o % ou o valor medido.')
conferir('período invertido', validarBoletim({ ...dGlob('10'), periodo_inicio: '2026-10-20' }, gesso, ITENS_CONTRATO, antesG).periodo_fim, 'O fim não pode ser antes do início.')

// por escopo: quantidade, % OU R$ (a quantidade manda)
const placas = ITENS_CONTRATO[0]
conferir('quantidade digitada', quantidadeDaLinha(placas, 'quantidade', '50'), 50)
conferir('% vira quantidade', quantidadeDaLinha(placas, 'pct', '25'), 50)
conferir('R$ vira quantidade', quantidadeDaLinha(placas, 'reais', '4.000'), 50)
conferir('% e R$ saem da quantidade', [pctDaQuantidade(50, placas), reaisDaQuantidade(50, placas)], [25, 4000])
conferir('quantidade quebrada não acumula erro', reaisDaQuantidade(quantidadeDaLinha(placas, 'pct', '33,333'), placas), 5333.28)
const dEsc = (linhas) => ({ periodo_inicio: '2026-10-19', periodo_fim: hoje, global: { campo: 'pct', texto: '' }, linhas })
const ok1 = dEsc({ 'ic-01': { campo: 'quantidade', texto: '80' }, 'ic-03': { campo: 'reais', texto: '1.200' } })
conferir('escopo válido (até o limite exato do item)', validarBoletim(ok1, drywall, ITENS_CONTRATO, antesD), null)
const passou = dEsc({ 'ic-01': { campo: 'quantidade', texto: '81' } })
conferir('item passa de 100% é travado', validarBoletim(passou, drywall, ITENS_CONTRATO, antesD).linhas['ic-01'], 'Passa de 100%: o máximo agora é 80 m² (40%).')
conferir('nenhum item medido', validarBoletim(dEsc({}), drywall, ITENS_CONTRATO, antesD).vazio, 'Meça pelo menos um item.')
const nums = numerosDoBoletim(ok1, drywall, ITENS_CONTRATO)
conferir('boletim por escopo: linhas e valor', [nums.linhas.map((l) => l.quantidade), nums.valor], [[80, 0, 10], 7600])
const previa = previaDoBoletim(ok1, drywall, ITENS_CONTRATO, MEDICOES)
conferir('rodapé: total, novo acumulado, % e saldo', previa, { doBoletim: 7600, acumulado: 23200, pct: 77.33, saldo: 6800 })

const novo = montarBoletim(ok1, drywall, ITENS_CONTRATO, 3)
conferir('boletim novo nasce rascunho com o número', [novo.numero, novo.status, novo.contrato_id, novo.percentual], [3, 'rascunho', 'ct-02', null])
const md3 = MEDICOES.find((m) => m.id === 'md-03')
conferir('editar rascunho mantém o id e a situação', [montarBoletim(boletimParaFormulario(md3, drywall), drywall, ITENS_CONTRATO, 2, md3).id, montarBoletim(boletimParaFormulario(md3, drywall), drywall, ITENS_CONTRATO, 2, md3).status], ['md-03', 'rascunho'])
conferir('formulário do rascunho volta com as quantidades', boletimParaFormulario(md3, drywall).linhas['ic-03'], { campo: 'quantidade', texto: '20' })
conferir('rascunho se edita, fechado não', [podeEditarBoletim(md3, drywall), podeEditarBoletim(MEDICOES[1], drywall)], [true, false])
conferir('fechar troca só a situação', fecharBoletim(md3).status, 'fechada')

const csv = csvDoBoletim(md3, drywall, ITENS_CONTRATO).split('\r\n')
conferir('CSV: cabeçalho do boletim', csv[0], 'Boletim de medição nº 2;Drywall Forte;Paredes de drywall dos quartos')
conferir('CSV: período e situação', csv[1], 'Período;05/10/2026 a 18/10/2026;Situação;Rascunho')
conferir('CSV: linha do item com vírgula decimal', csv[4], 'Placas de drywall (montagem);m²;40,00;20,00;80,00;3200,00')
conferir('CSV: total do boletim', csv.at(-2), 'Total do boletim;;;;;7600,00')
conferir('CSV global', csvDoBoletim(MEDICOES[0], gesso, ITENS_CONTRATO).split('\r\n')[4], 'Forro de gesso em placas e sancas;25,00;7500,00')

console.log(`${ok}/${tot} — medicoes`)
if (ok !== tot) process.exit(1)
