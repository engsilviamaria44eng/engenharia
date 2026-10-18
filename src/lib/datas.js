// Datas como texto 'AAAA-MM-DD', sem fuso: evita o pulo de 1 dia do
// toISOString() no horário do Brasil.

export function formatarData(iso) {
  if (!iso) return '—'
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}

export function somarDias(iso, dias) {
  const [a, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(a, m - 1, d + dias))
  const aa = dt.getUTCFullYear()
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(dt.getUTCDate()).padStart(2, '0')
  return `${aa}-${mm}-${dd}`
}
