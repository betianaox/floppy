// Configuración de la app. Sin los datos de Supabase y n8n, arranca en modo demo:
// datos de ejemplo en memoria y una "IA" de mentira, para probarla y sacar capturas.
export const config = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  n8nUrl: (process.env.EXPO_PUBLIC_N8N_URL ?? '').replace(/\/$/, ''),
};

export const isDemo = !config.supabaseUrl || !config.supabaseAnonKey || !config.n8nUrl;
