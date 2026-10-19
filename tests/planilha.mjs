// Leitor de planilha (.xlsx e .csv). Monta um .xlsx de verdade (zip + XML) aqui mesmo.
import { deflateRawSync } from 'node:zlib'
import { lerPlanilha, lerCsv, paraNumero, paraData, indiceDaColuna, dataDoExcel } from '../src/lib/planilha.js'

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

async function conferirErro(descricao, promessa, trecho) {
  try {
    await promessa
    conferir(descricao, 'sem erro', trecho)
  } catch (e) {
    conferir(descricao, e.message.includes(trecho), true)
  }
}

// Zip mínimo (sem CRC: o leitor não confere). `guardar` = sem compactar (método 0).
function zip(arquivos, { guardar = [] } = {}) {
  const partes = []
  const central = []
  let pos = 0
  for (const [nome, texto] of Object.entries(arquivos)) {
    const nomeB = Buffer.from(nome)
    const cru = Buffer.from(texto)
    const metodo = guardar.includes(nome) ? 0 : 8
    const dados = metodo === 0 ? cru : deflateRawSync(cru)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(metodo, 8)
    local.writeUInt32LE(dados.length, 18)
    local.writeUInt32LE(cru.length, 22)
    local.writeUInt16LE(nomeB.length, 26)
    const cd = Buffer.alloc(46)
    cd.writeUInt32LE(0x02014b50, 0)
    cd.writeUInt16LE(metodo, 10)
    cd.writeUInt32LE(dados.length, 20)
    cd.writeUInt32LE(cru.length, 24)
    cd.writeUInt16LE(nomeB.length, 28)
    cd.writeUInt32LE(pos, 42)
    partes.push(local, nomeB, dados)
    central.push(cd, nomeB)
    pos += 30 + nomeB.length + dados.length
  }
  const cdBuf = Buffer.concat(central)
  const fim = Buffer.alloc(22)
  fim.writeUInt32LE(0x06054b50, 0)
  fim.writeUInt16LE(Object.keys(arquivos).length, 8)
  fim.writeUInt16LE(Object.keys(arquivos).length, 10)
  fim.writeUInt32LE(cdBuf.length, 12)
  fim.writeUInt32LE(pos, 16)
  return new Uint8Array(Buffer.concat([...partes, cdBuf, fim]))
}

const workbook = `<?xml version="1.0"?><workbook xmlns:r="r"><sheets>
<sheet name="Orçamento" sheetId="1" r:id="rId1"/><sheet name="Cronograma" sheetId="2" r:id="rId2"/></sheets></workbook>`
const rels = `<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Target="/xl/worksheets/sheet2.xml"/></Relationships>`
const shared = `<sst><si><t>Código</t></si><si><t>Alvenaria &amp; reboco</t></si><si><r><t>Tex</t></r><r><t>to rico</t></r></si><si><t>Início</t></si></sst>`
const styles = `<styleSheet><numFmts><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/><numFmt numFmtId="165" formatCode="#,##0.00"/></numFmts>
<cellXfs count="4"><xf numFmtId="0"/><xf numFmtId="14"/><xf numFmtId="164"/><xf numFmtId="165"/></cellXfs></styleSheet>`
const sheet1 = `<worksheet><sheetData>
<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>
<row r="2"><c r="A2"><v>4.1</v></c><c r="C2" s="3"><v>1250.5</v></c><c r="D2" t="s"><v>2</v></c></row>
<row r="4"><c r="A4" t="inlineStr"><is><t>em linha</t></is></c><c r="B4" t="b"><v>1</v></c><c r="C4" t="str"><v>fórmula</v></c></row>
</sheetData></worksheet>`
const sheet2 = `<worksheet><sheetData>
<row r="1"><c r="A1" t="s"><v>3</v></c></row>
<row r="2"><c r="A2" s="1"><v>46314</v></c><c r="B2" s="2"><v>46316.75</v></c><c r="AA2"><v>7</v></c></row>
</sheetData></worksheet>`
const arquivos = {
  'xl/workbook.xml': workbook, 'xl/_rels/workbook.xml.rels': rels, 'xl/sharedStrings.xml': shared,
  'xl/styles.xml': styles, 'xl/worksheets/sheet1.xml': sheet1, 'xl/worksheets/sheet2.xml': sheet2,
}

const abas = await lerPlanilha(zip(arquivos), 'orcamento.xlsx')
conferir('lê as duas abas com o nome', abas.map((a) => a.nome), ['Orçamento', 'Cronograma'])
const [orc, cron] = abas
conferir('textos compartilhados e &amp;', orc.linhas[0], ['Código', 'Alvenaria & reboco'])
conferir('número, buraco na coluna B e texto com formatação', orc.linhas[1], [4.1, null, 1250.5, 'Texto rico'])
conferir('linha pulada vira linha vazia', orc.linhas[2], [])
conferir('texto em linha, verdadeiro e resultado de fórmula', orc.linhas[3], ['em linha', true, 'fórmula'])
conferir('data com formato padrão e próprio viram AAAA-MM-DD', cron.linhas[1].slice(0, 2), ['2026-10-19', '2026-10-21'])
conferir('coluna AA = índice 26', cron.linhas[1][26], 7)
const guardado = await lerPlanilha(zip(arquivos, { guardar: Object.keys(arquivos) }), 'x.xlsx')
conferir('zip sem compactação também lê', guardado[0].linhas[0], ['Código', 'Alvenaria & reboco'])

await conferirErro('.xls antigo pede para salvar como .xlsx', lerPlanilha(new Uint8Array([0xd0, 0xcf]), 'velho.xls'), 'salve como .xlsx')
await conferirErro('arquivo qualquer é recusado', lerPlanilha(new Uint8Array([1, 2, 3]), 'foto.png'), 'não é uma planilha')
await conferirErro('zip sem planilha dentro', lerPlanilha(zip({ 'a.txt': 'oi' }), 'a.xlsx'), 'não é uma planilha do Excel')

// CSV
conferir('csv com ponto e vírgula e aspas', lerCsv('a;b;c\r\n"x; y";"diz ""oi""";\n1,5;2;3\n'), [['a', 'b', 'c'], ['x; y', 'diz "oi"', null], ['1,5', '2', '3']])
conferir('csv com vírgula', lerCsv('a,b\n1,2'), [['a', 'b'], ['1', '2']])
conferir('quebra de linha dentro de aspas', lerCsv('a;b\n"linha 1\nlinha 2";x'), [['a', 'b'], ['linha 1\nlinha 2', 'x']])
const latin1 = new Uint8Array([0x43, 0xf3, 0x64, 0x3b, 0x78]) // "Cód;x" no padrão antigo do Windows
conferir('csv do Windows antigo (acentos)', (await lerPlanilha(latin1, 'a.csv'))[0].linhas, [['Cód', 'x']])
const comBom = new TextEncoder().encode('﻿tipo;codigo')
conferir('csv UTF-8 com BOM', (await lerPlanilha(comBom, 'a.csv'))[0].linhas, [['tipo', 'codigo']])

// conversões
conferir('número brasileiro', paraNumero('1.234,56'), 1234.56)
conferir('milhar sem decimal', paraNumero('1.250'), 1250)
conferir('decimal com vírgula', paraNumero('10,5'), 10.5)
conferir('moeda e porcentagem', [paraNumero('R$ 45,90'), paraNumero('12%')], [45.9, 12])
conferir('número já número', paraNumero(3.5), 3.5)
conferir('texto não é número', [paraNumero('abc'), paraNumero(''), paraNumero(null)], [null, null, null])
conferir('data brasileira', paraData('25/10/2026'), '2026-10-25')
conferir('data com ano curto e dia de 1 dígito', paraData('5/1/27'), '2027-01-05')
conferir('data ISO com hora', paraData('2026-10-25 08:00'), '2026-10-25')
conferir('data do Excel em número', paraData(46314), '2026-10-19')
conferir('data inválida', [paraData('32/13/2026'), paraData('amanhã')], [null, null])
conferir('coluna A e Z', [indiceDaColuna('A1'), indiceDaColuna('Z9')], [0, 25])
conferir('dia 1 do Excel antigo', dataDoExcel(61), '1900-03-01')

// casos de borda apontados na revisão
const sheetBorda = `<worksheet><sheetData>
<row r="1"><c r="A1" t="s"><v>0</v></c></row>
<row r="2" ht="20" customHeight="1"/>
<row r="3"><c r="A3" t="d"><v>2026-10-25T00:00:00</v></c><c r="B3" t="s"><v>1</v></c></row>
</sheetData></worksheet>`
const sharedFonetico = `<sst><si><t>Código</t></si><si><t>Texto</t><rPh sb="0" eb="1"><t>テキスト</t></rPh></si></sst>`
const borda = await lerPlanilha(zip({ ...arquivos, 'xl/worksheets/sheet1.xml': sheetBorda, 'xl/sharedStrings.xml': sharedFonetico }), 'b.xlsx')
conferir('linha vazia fechada sozinha não engole a seguinte', borda[0].linhas.map((l) => l.length), [1, 0, 2])
conferir('célula de data em texto (t="d")', borda[0].linhas[2][0], '2026-10-25')
conferir('leitura fonética fica de fora', borda[0].linhas[2][1], 'Texto')
conferir('dia que não existe no mês', [paraData('31/02/2026'), paraData('31/04/2026'), paraData('29/02/2028'), paraData('29/02/2027')], [null, null, '2028-02-29', null])
conferir('data do MS Project com dia da semana', paraData('Seg 19/10/26 08:00'), '2026-10-19')

console.log(`${ok}/${tot} — planilha`)
if (ok !== tot) process.exit(1)
