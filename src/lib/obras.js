// Regras puras da OBRA: sem React, sem banco, sem window.
// O app é multi-obra: tudo que é lançamento pertence a uma obra (obra_id).

// Vocabulário de situação: idêntico ao CHECK do banco (PRD-BACKEND).
export const SITUACOES = ['Em andamento', 'Concluída', 'Parada']

export function classeSituacao(situacao) {
  if (situacao === 'Em andamento') return 'ok'
  if (situacao === 'Parada') return 'parada'
  return 'neutra'
}

// Chave do aparelho onde fica guardada a última obra escolhida.
// Leva o id da pessoa: duas pessoas no mesmo aparelho não herdam a obra uma da outra.
export function chaveObraGuardada(usuarioId) {
  return `obraemdia:obra:${usuarioId}`
}

// Decide em qual obra o app abre.
// - Volta na obra guardada, se ela ainda estiver entre as permitidas.
// - Senão, cai na primeira obra em andamento; senão, na primeira da lista.
// - Sem nenhuma obra permitida, devolve null (a tela mostra o estado vazio).
export function escolherObraInicial(obrasPermitidas, idGuardado) {
  if (!obrasPermitidas || obrasPermitidas.length === 0) return null
  const guardada = obrasPermitidas.find((o) => o.id === idGuardado)
  if (guardada) return guardada.id
  const emAndamento = obrasPermitidas.find((o) => o.situacao === 'Em andamento')
  return (emAndamento || obrasPermitidas[0]).id
}

// Recorte de uma lista de lançamentos para UMA obra.
// Sem obra escolhida, não devolve nada: nunca "tudo".
export function daObra(lista, obraId) {
  if (!obraId) return []
  return lista.filter((item) => item.obra_id === obraId)
}

// Só pode trocar de obra quem tem mais de uma.
export function podeTrocarDeObra(obrasPermitidas) {
  return (obrasPermitidas?.length ?? 0) > 1
}
