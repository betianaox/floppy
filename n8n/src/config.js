// Datos de tu proyecto. Es el único nodo que hay que editar después de importar.
// La anon key de Supabase es pública (la usa también la app): no es un secreto.
// La clave de Gemini NO va acá: va en la credencial "Gemini" de n8n.
const config = {
  supabaseUrl: 'https://TU-PROYECTO.supabase.co',
  supabaseAnonKey: 'TU-ANON-KEY',
  model: 'gemini-flash-latest',
  embeddingModel: 'gemini-embedding-001',
};
return { json: { ...$json, config } };
