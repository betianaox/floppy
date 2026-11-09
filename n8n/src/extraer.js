// Saca de la página lo que sirve para entenderla: título, descripción y algo de texto.
const pedido = $('Normalizar').item.json;
const html = typeof $json.body === 'string' ? $json.body : '';
const meta = (name) => {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i');
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${name}["']`, 'i');
  return (html.match(re) || html.match(re2) || [])[1] || '';
};
const title = meta('og:title') || (html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1] || '';
const description = meta('og:description') || meta('description');
const texto = html
  .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, 6000);
return {
  json: {
    ...pedido,
    page: { ok: $json.statusCode >= 200 && $json.statusCode < 400, title, description, image: meta('og:image'), text: texto },
  },
};
