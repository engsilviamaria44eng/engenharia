import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
// Chave publicável (sb_publishable_...). As chaves entram no .env.local na etapa do Supabase.
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// Enquanto o app roda só com dados de exemplo, não há conexão.
export const supabase = url && key ? createClient(url, key) : null
