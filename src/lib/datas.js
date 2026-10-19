// Datas como texto 'AAAA-MM-DD', sem fuso: evita o pulo de 1 dia do
// toISOString() no horário do Brasil.

export function formatarData(iso) {
  if (!iso) return '—'
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}

// Dias corridos de `de` até `ate` (pode ser negativo).
export function diasEntre(de, ate) {
  const [a1, m1, d1] = de.split('-').map(Number)
  const [a2, m2, d2] = ate.split('-').map(Number)
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86400000)
}

// "Hoje" no relógio do aparelho, como texto AAAA-MM-DD (sem passar por UTC).
export function hojeISO(agora = new Date()) {
  const mm = String(agora.getMonth() + 1).padStart(2, '0')
  const dd = String(agora.getDate()).padStart(2, '0')
  return `${agora.getFullYear()}-${mm}-${dd}`
}

export function somarDias(iso, dias) {
  const [a, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(a, m - 1, d + dias))
  const aa = dt.getUTCFullYear()
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(dt.getUTCDate()).padStart(2, '0')
  return `${aa}-${mm}-${dd}`
}
