// LEITOR DE PLANILHA (.xlsx e .csv), sem biblioteca: o .xlsx é um arquivo .zip com XML
// dentro; o navegador já sabe descompactar (DecompressionStream). Roda igual no Node (testes).
// Devolve as abas com as linhas como listas de células: texto, número ou data 'AAAA-MM-DD'.
// Não lê o .xls antigo (Excel 97-2003): nesse caso, peça para salvar como .xlsx.
import { somarDias } from './datas.js'

// ---------- zip ----------
function lerZip(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let fim = -1
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { fim = i; break }
  }
  if (fim < 0) throw new Error('O arquivo não é uma planilha .xlsx válida.')
  const total = dv.getUint16(fim + 10, true)
  let p = dv.getUint32(fim + 16, true)
  const arquivos = new Map()
  const nomes = new TextDecoder()
  for (let k = 0; k < total; k++) {
    if (dv.getUint32(p, true) !== 0x02014b50) throw new Error('O arquivo .xlsx está corrompido.')
    const metodo = dv.getUint16(p + 10, true)
    const tamanho = dv.getUint32(p + 20, true)
    const lenNome = dv.getUint16(p + 28, true)
    const lenExtra = dv.getUint16(p + 30, true)
    const lenComent = dv.getUint16(p + 32, true)
    const local = dv.getUint32(p + 42, true)
    const nome = nomes.decode(bytes.subarray(p + 46, p + 46 + lenNome))
    arquivos.set(nome, { metodo, tamanho, local })
    p += 46 + lenNome + lenExtra + lenComent
  }
  return { bytes, dv, arquivos }
}

async function abrirArquivo(zip, nome) {
  const a = zip.arquivos.get(nome)
  if (!a) return null
  const ini = a.local + 30 + zip.dv.getUint16(a.local + 26, true) + zip.dv.getUint16(a.local + 28, true)
  const dados = zip.bytes.subarray(ini, ini + a.tamanho)
  if (a.metodo === 0) return new TextDecoder().decode(dados)
  if (a.metodo !== 8) throw new Error('A planilha usa uma compactação que o app não lê. Salve de novo como .xlsx.')
  const fluxo = new Blob([dados]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new TextDecoder().decode(await new Response(fluxo).arrayBuffer())
}

// ---------- XML (só o pedaço que o Excel usa) ----------
const ENTIDADES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }
function textoXml(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => {
    if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10))
    return ENTIDADES[e] ?? m
  })
}

function atributo(tag, nome) {
  const m = tag.match(new RegExp(`\\s${nome}="([^"]*)"`))
  return m ? textoXml(m[1]) : null
}

// Junta todos os <t> de um trecho (texto com formatação vem em vários pedaços).
// A leitura fonética (<rPh>, usada em japonês) não faz parte do texto.
function juntarTextos(xml) {
  return [...xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, '').matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => textoXml(m[1])).join('')
}

// Coluna "AB" -> 27 (base 0: 27). Linha "AB12" -> índice da coluna 27.
export function indiceDaColuna(ref) {
  const letras = ref.match(/^[A-Z]+/)[0]
  return [...letras].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1
}

// Data do Excel (número de dias desde 30/12/1899) -> 'AAAA-MM-DD', sem fuso.
export function dataDoExcel(serial) {
  return somarDias('1899-12-30', Math.floor(serial))
}

const FORMATOS_DATA = new Set([14, 15, 16, 17, 22, 27, 30, 36, 45, 46, 47, 50, 57])
// Formato próprio é de data se tem dia ou ano (fora de textos entre aspas e de [cores]).
function ehFormatoDeData(codigo) {
  return /[dy]/i.test(codigo.replace(/"[^"]*"|\[[^\]]*\]|\\./g, ''))
}

// Quais estilos de célula são data (para virar 'AAAA-MM-DD' em vez de número).
function estilosDeData(stylesXml) {
  if (!stylesXml) return new Set()
  const proprios = new Map([...stylesXml.matchAll(/<numFmt\s[^>]*>/g)].map((m) => [Number(atributo(m[0], 'numFmtId')), atributo(m[0], 'formatCode') ?? '']))
  const xfs = stylesXml.match(/<cellXfs[^>]*>([\s\S]*?)<\/cellXfs>/)?.[1] ?? ''
  const datas = new Set()
  ;[...xfs.matchAll(/<xf\s[^>]*?\/?>/g)].forEach((m, i) => {
    const id = Number(atributo(m[0], 'numFmtId') ?? 0)
    if (FORMATOS_DATA.has(id) || (proprios.has(id) && ehFormatoDeData(proprios.get(id)))) datas.add(i)
  })
  return datas
}

function lerAba(xml, compartilhados, datas) {
  const linhas = []
  // A linha pode vir fechada sozinha (<row r="3" .../>): o Excel faz isso em linha vazia formatada.
  for (const mLinha of xml.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const numero = Number(atributo(`<row${mLinha[1]}>`, 'r')) || linhas.length + 1
    const celulas = []
    for (const mCel of (mLinha[2] ?? '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const abre = `<c${mCel[1]}>`
      const ref = atributo(abre, 'r')
      const tipo = atributo(abre, 't')
      const estilo = Number(atributo(abre, 's') ?? 0)
      const dentro = mCel[2] ?? ''
      const v = dentro.match(/<v>([\s\S]*?)<\/v>/)?.[1]
      let valor = null
      if (tipo === 's') valor = compartilhados[Number(v)] ?? ''
      else if (tipo === 'inlineStr') valor = juntarTextos(dentro)
      else if (tipo === 'str' || tipo === 'e') valor = v != null ? textoXml(v) : ''
      else if (tipo === 'b') valor = v === '1'
      else if (tipo === 'd') valor = v ? v.slice(0, 10) : null // data já em texto ISO
      else if (v != null && v !== '') valor = datas.has(estilo) ? dataDoExcel(Number(v)) : Number(v)
      const col = ref ? indiceDaColuna(ref) : celulas.length
      celulas[col] = valor
    }
    for (let i = 0; i < celulas.length; i++) if (celulas[i] === undefined) celulas[i] = null
    linhas[numero - 1] = celulas
  }
  for (let i = 0; i < linhas.length; i++) if (!linhas[i]) linhas[i] = []
  return linhas
}

async function lerXlsx(bytes) {
  const zip = lerZip(bytes)
  const workbook = await abrirArquivo(zip, 'xl/workbook.xml')
  if (!workbook) throw new Error('O arquivo não é uma planilha do Excel (.xlsx).')
  const rels = (await abrirArquivo(zip, 'xl/_rels/workbook.xml.rels')) ?? ''
  const alvos = new Map([...rels.matchAll(/<Relationship\s[^>]*>/g)].map((m) => [atributo(m[0], 'Id'), atributo(m[0], 'Target')]))
  const sharedXml = (await abrirArquivo(zip, 'xl/sharedStrings.xml')) ?? ''
  const compartilhados = [...sharedXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => juntarTextos(m[1]))
  const datas = estilosDeData(await abrirArquivo(zip, 'xl/styles.xml'))
  const abas = []
  for (const m of workbook.matchAll(/<sheet\s[^>]*>/g)) {
    const alvo = alvos.get(atributo(m[0], 'r:id'))
    if (!alvo) continue
    const caminho = alvo.startsWith('/') ? alvo.slice(1) : `xl/${alvo.replace(/^\.\//, '')}`
    const xml = await abrirArquivo(zip, caminho)
    if (xml) abas.push({ nome: atributo(m[0], 'name'), linhas: lerAba(xml, compartilhados, datas) })
  }
  return abas
}

// ---------- CSV ----------
// Separador ; ou , (o que aparecer mais na 1ª linha), aspas do Excel, UTF-8 ou o
// padrão antigo do Windows (acentos quebrados viram Latin-1).
export function lerCsv(texto) {
  const primeira = texto.split(/\r?\n/, 1)[0]
  const sep = (primeira.split(';').length >= primeira.split(',').length) ? ';' : ','
  const linhas = [[]]
  let campo = ''
  let aspas = false
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]
    if (aspas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++ } else if (c === '"') aspas = false
      else campo += c
    } else if (c === '"') aspas = true
    else if (c === sep) { linhas.at(-1).push(campo); campo = '' }
    else if (c === '\n') { linhas.at(-1).push(campo.replace(/\r$/, '')); campo = ''; linhas.push([]) }
    else campo += c
  }
  linhas.at(-1).push(campo.replace(/\r$/, ''))
  if (linhas.at(-1).length === 1 && linhas.at(-1)[0] === '') linhas.pop()
  return linhas.map((l) => l.map((v) => (v === '' ? null : v)))
}

function decodificarTexto(bytes) {
  try {
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(bytes)
  } catch {
    return new TextDecoder('windows-1252').decode(bytes)
  }
}

// Entrada única: o conteúdo do arquivo (ArrayBuffer ou bytes) e o nome dele.
export async function lerPlanilha(conteudo, nomeArquivo) {
  const bytes = conteudo instanceof Uint8Array ? conteudo : new Uint8Array(conteudo)
  const nome = (nomeArquivo ?? '').toLowerCase()
  if (nome.endsWith('.xls')) throw new Error('Este é o formato antigo do Excel (.xls). Abra no Excel e salve como .xlsx.')
  if (nome.endsWith('.csv') || nome.endsWith('.txt')) return [{ nome: 'CSV', linhas: lerCsv(decodificarTexto(bytes)) }]
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error('O arquivo não é uma planilha .xlsx nem .csv.')
  return lerXlsx(bytes)
}

// ---------- conversões para o importador ----------
// Número escrito do jeito brasileiro ("1.234,56", "R$ 10,5", "12%") ou já número.
export function paraNumero(v) {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  let s = String(v).replace(/R\$|%|\s/g, '')
  if (/,\d*$/.test(s) || (s.includes(',') && s.includes('.'))) s = s.replace(/\./g, '').replace(',', '.')
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '') // "1.250" = mil duzentos e cinquenta
  const n = Number(s)
  return s !== '' && Number.isFinite(n) ? n : null
}

// Data como 'AAAA-MM-DD' a partir de "25/10/2026", "25/10/26", "2026-10-25", número do Excel
// ou o jeito do MS Project ("Seg 19/10/26 08:00").
export function paraData(v) {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'number') return v > 0 ? dataDoExcel(v) : null
  const s = String(v).trim()
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  m = s.match(/(?:^|[\s,])(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})(?=\s|$)/)
  if (!m) return null
  const ano = m[3].length === 2 ? `20${m[3]}` : m[3]
  const mes = Number(m[2])
  const dia = Number(m[1])
  // Recusa dia que não existe no mês (31/02, 31/04...), contando ano bissexto.
  const diasNoMes = new Date(Date.UTC(Number(ano), mes, 0)).getUTCDate()
  if (mes < 1 || mes > 12 || dia < 1 || dia > diasNoMes) return null
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}
