import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && anonKey);

if (!supabaseConfigured) {
  // eslint-disable-next-line no-console
  console.warn('[supabase] Variáveis de ambiente ausentes ou inválidas. Auth cairá no modo demonstração; dados continuam mock.');
}

// createClient lança se url/key forem vazias. Usa placeholders seguros quando
// não configurado, e o auth-demo bypass em useAuth evita chamadas reais.
export const supabase: SupabaseClient = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  },
);
