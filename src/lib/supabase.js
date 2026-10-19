import { createClient } from '@supabase/supabase-js'

// No navegador o Vite preenche import.meta.env; nos testes (Node puro) ele não existe.
const env = import.meta.env ?? {}
const url = env.VITE_SUPABASE_URL
// Chave PÚBLICA (publicável, sb_publishable_...). Nunca a service_role.
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY

// Sem .env.local (ou nos testes) não há conexão: a camada de dados usa o mock.
export const supabase = url && key ? createClient(url, key) : null
