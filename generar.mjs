// Tiendas Catrachas · Molina Soluciones Digitales
// Genera las páginas públicas (ya escritas, para que Google las lea) a partir de las tiendas en línea de Negocio VM.
// Uso:  node generar.mjs                → lee las tiendas reales (solo las que encendieron «Aparecer en Tiendas Catrachas»)
//       node generar.mjs --muestra x.json → usa datos de ejemplo (pruebas y capturas)
// No usa claves secretas: la lista sale de una función pública de solo lectura y los productos de la misma
// llamada pública que usa la tienda en línea (por eso salen idénticos).
import { writeFileSync, mkdirSync, readFileSync, rmSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const SITIO = 'https://molinasoluciones.com';
const TIENDA_URL = process.env.TIENDA_URL || 'https://josevic504-bot.github.io/negocio/'; // cambia al mover el repositorio
const API = 'https://qvhtlezxjklhwlnvexje.supabase.co/functions/v1/api';
const SB = 'https://qvhtlezxjklhwlnvexje.supabase.co';
// Llave pública (la misma que ya va en la app): no da acceso a ninguna tabla, solo a la función del directorio
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2aHRsZXp4amtsaHdsbnZleGplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0MDg2NTEsImV4cCI6MjEwODk4NDY1MX0.y95iOCUtPiT-KbMDKsbPtCGs1qXG_SWOL_2Vmsv5bZo';
const SALIDA = process.env.SALIDA || 'publico';
const MAX_PROD = 60;
const WA = 'https://wa.me/50433130265'; // el mismo contacto que muestra la app
// Página de inicio: qué resuelve el programa para cada tipo de negocio
const NEGOCIOS = [
  ['Tienda o pulpería', 'Vende rápido, controla tu inventario y lleva las ventas al crédito de cada cliente.'],
  ['Tienda de variedades', 'Varias secciones en una sola tienda: cada una con sus productos y sus reportes.'],
  ['Restaurante y comida', 'Mesas por zona, meseros, cocina y pedidos para llevar, a domicilio o desde la mesa.'],
  ['Boutique, ropa y calzado', 'Tallas y colores con la existencia de cada uno.'],
  ['Maquillaje y moda por catálogo', 'Tonos, tallas y precio especial por cantidad, en una tienda estilo catálogo.'],
  ['Floristería', 'Arreglos listos y «Arma tu ramo»: el cliente elige sus flores y tú le mandas el precio.'],
  ['Manualidades y detalles', 'Pedidos personalizados: el cliente te manda la foto de lo que quiere.'],
  ['Veterinaria y mascotas', 'Expediente de cada mascota, consultas con receta y carnet de vacunas.'],
  ['Carwash', 'El patio con placa y tiempo, precio por tamaño de vehículo y lavados apartados en línea.'],
  ['Servicios', 'Cotizaciones, contratos y plan de pagos firmados desde el celular del cliente.'],
  ['Tecnología y celulares', 'Ventas, inventario y órdenes de trabajo.'],
  ['Streaming y suscripciones', 'Vencimientos, renovaciones y la cuenta o el perfil de cada cliente.'],
  ['Recargas de juegos', 'Una sección por juego en tu tienda en línea.'],
  ['Compras en línea', 'Pedidos por código, apartados y el seguimiento hasta la entrega.'],
  ['Vitaminas y suplementos', 'Presentaciones y fecha de vencimiento de cada producto.'],
  ['Joyería', 'Tu catálogo con fotos, ventas e inventario.'],
  ['Ferretería', 'Inventario, compras a proveedores, ventas y cuentas por cobrar.'],
  ['Farmacia', 'Inventario con aviso de lo que se agota y lo que está por caducar.'],
  ['Panadería y repostería', 'Ventas del día y pedidos por encargo con fecha y hora.'],
  ['Salón de belleza', 'Agenda de citas, servicios y venta de productos.'],
  ['Taller mecánico y repuestos', 'Órdenes de trabajo por vehículo, repuestos y cuentas de tus clientes.'],
  ['¿Otro tipo de negocio?', 'El programa se adapta: escríbenos y lo vemos contigo.']
];

const GIROS = {
  tienda: 'Pulperías y tiendas', variedades: 'Tiendas de variedades', ferreteria: 'Ferreterías', comida: 'Restaurantes y comida',
  boutique: 'Boutiques de ropa y calzado', farmacia: 'Farmacias', vitaminas: 'Vitaminas y suplementos', repuestos: 'Talleres y repuestos',
  carwash: 'Carwash', tecnologia: 'Tecnología y celulares', belleza: 'Salones de belleza', catalogo: 'Maquillaje y moda',
  panaderia: 'Panaderías y reposterías', servicios: 'Servicios', streaming: 'Streaming y suscripciones', compras: 'Compras en línea',
  recargas: 'Recargas de juegos', floristeria: 'Floristerías', manualidades: 'Manualidades y detalles', joyeria: 'Joyerías',
  veterinaria: 'Veterinarias y mascotas', otro: 'Otros negocios'
};

// Páginas para dueños de negocio: «Programa de ventas e inventario para …» (mismo orden que NEGOCIOS, sin el último)
const PARA = ['pulperías y tiendas', 'tiendas de variedades', 'restaurantes', 'boutiques de ropa y calzado', 'venta por catálogo', 'floristerías', 'manualidades y detalles', 'veterinarias', 'carwash',
  'negocios de servicios', 'tiendas de tecnología y celulares', 'venta de streaming', 'recargas de juegos', 'compras en línea', 'vitaminas y suplementos', 'joyerías', 'ferreterías', 'farmacias',
  'panaderías y reposterías', 'salones de belleza', 'talleres mecánicos y repuestos'];
const GIRO_DE = ['tienda', 'variedades', 'comida', 'boutique', 'catalogo', 'floristeria', 'manualidades', 'veterinaria', 'carwash', 'servicios', 'tecnologia', 'streaming', 'recargas', 'compras', 'vitaminas', 'joyeria', 'ferreteria', 'farmacia', 'panaderia', 'belleza', 'repuestos'];
// Pantallas reales del programa por tipo de negocio: [archivo, pie de foto] (las más relevantes de cada uno)
const PANT = {"tienda": [["tienda-productos", "Tus productos con precio, costo y existencia"], ["tienda-vender", "Vende y cobra desde el celular"], ["tienda-tienda", "Tu tienda en línea, lista para compartir"], ["tienda-inicio", "Tus ventas y tu ganancia del día"]], "variedades": [["variedades-productos", "Tus productos ordenados por categoría"], ["variedades-vender", "Vende y cobra desde el celular"], ["variedades-tienda", "Tu tienda en línea, lista para compartir"], ["variedades-inicio", "Tus ventas y tu ganancia del día"]], "comida": [["mesas", "Mesas por zona y lo vendido por mesero"], ["comida-productos", "Tus platos, bebidas y combos"], ["comida-tienda", "Tu tienda en línea, lista para compartir"], ["comida-inicio", "Tus ventas y tu ganancia del día"]], "boutique": [["p_boutique", "Tallas y colores con su existencia"], ["boutique-vender", "Vende y cobra desde el celular"], ["boutique-tienda", "Tu tienda en línea, lista para compartir"], ["boutique-inicio", "Tus ventas y tu ganancia del día"]], "catalogo": [["p_catalogo", "Tonos, tallas y precio por cantidad"], ["catalogo-vender", "Vende y cobra desde el celular"], ["catalogo-tienda", "Tu tienda en línea, lista para compartir"], ["catalogo-inicio", "Tus ventas y tu ganancia del día"]], "floristeria": [["p_floristeria", "Arreglos con tamaños y precio por opción"], ["floristeria-vender", "Vende y cobra desde el celular"], ["floristeria-tienda", "Tu tienda en línea, lista para compartir"], ["floristeria-inicio", "Tus ventas y tu ganancia del día"]], "manualidades": [["p_manualidades", "Productos personalizados a pedido"], ["manualidades-vender", "Vende y cobra desde el celular"], ["manualidades-tienda", "Tu tienda en línea, lista para compartir"], ["manualidades-inicio", "Tus ventas y tu ganancia del día"]], "veterinaria": [["mascotas", "El expediente de cada mascota"], ["veterinaria-vender", "Vende y cobra desde el celular"], ["veterinaria-tienda", "Tu tienda en línea, lista para compartir"], ["veterinaria-inicio", "Tus ventas y tu ganancia del día"]], "carwash": [["patio", "El patio: recibidos, lavando y listos"], ["carwash-vender", "Vende y cobra desde el celular"], ["carwash-tienda", "Tu tienda en línea, lista para compartir"], ["carwash-inicio", "Tus ventas y tu ganancia del día"]], "servicios": [["proyectos", "Proyectos con su costo y su ganancia"], ["servicios-vender", "Vende y cobra desde el celular"], ["servicios-tienda", "Tu tienda en línea, lista para compartir"], ["servicios-inicio", "Tus ventas y tu ganancia del día"]], "tecnologia": [["tecnologia-productos", "Equipos y accesorios con su existencia"], ["tecnologia-vender", "Vende y cobra desde el celular"], ["tecnologia-tienda", "Tu tienda en línea, lista para compartir"], ["tecnologia-inicio", "Tus ventas y tu ganancia del día"]], "streaming": [["cuentas", "Cuentas y perfiles por plataforma"], ["streaming-vender", "Vende y cobra desde el celular"], ["streaming-tienda", "Tu tienda en línea, lista para compartir"], ["streaming-inicio", "Tus ventas y tu ganancia del día"]], "recargas": [["secciones", "Una sección por juego en tu tienda"], ["recargas-vender", "Vende y cobra desde el celular"], ["recargas-tienda", "Tu tienda en línea, lista para compartir"], ["recargas-inicio", "Tus ventas y tu ganancia del día"]], "compras": [["compras-cfg", "Tipo de cambio, recargo y envío"], ["compras-vender", "Vende y cobra desde el celular"], ["compras-tienda", "Tu tienda en línea, lista para compartir"], ["compras-inicio", "Tus ventas y tu ganancia del día"]], "vitaminas": [["lotes", "Lotes por vencer"], ["vitaminas-vender", "Vende y cobra desde el celular"], ["vitaminas-tienda", "Tu tienda en línea, lista para compartir"], ["vitaminas-inicio", "Tus ventas y tu ganancia del día"]], "joyeria": [["joyeria-productos", "Cada pieza con su precio y existencia"], ["joyeria-vender", "Vende y cobra desde el celular"], ["joyeria-tienda", "Tu tienda en línea, lista para compartir"], ["joyeria-inicio", "Tus ventas y tu ganancia del día"]], "ferreteria": [["ferreteria-productos", "Tu inventario con costo y existencia"], ["ferreteria-vender", "Vende y cobra desde el celular"], ["ferreteria-tienda", "Tu tienda en línea, lista para compartir"], ["ferreteria-inicio", "Tus ventas y tu ganancia del día"]], "farmacia": [["caducan", "Lo que se agota y lo que está por caducar"], ["farmacia-vender", "Vende y cobra desde el celular"], ["farmacia-tienda", "Tu tienda en línea, lista para compartir"], ["farmacia-inicio", "Tus ventas y tu ganancia del día"]], "panaderia": [["encargos", "Pedidos por encargo con fecha y hora"], ["panaderia-vender", "Vende y cobra desde el celular"], ["panaderia-tienda", "Tu tienda en línea, lista para compartir"], ["panaderia-inicio", "Tus ventas y tu ganancia del día"]], "belleza": [["agenda", "Agenda de citas"], ["belleza-vender", "Vende y cobra desde el celular"], ["belleza-tienda", "Tu tienda en línea, lista para compartir"], ["belleza-inicio", "Tus ventas y tu ganancia del día"]], "repuestos": [["ordenes", "Órdenes de trabajo por vehículo"], ["repuestos-vender", "Vende y cobra desde el celular"], ["repuestos-tienda", "Tu tienda en línea, lista para compartir"], ["repuestos-inicio", "Tus ventas y tu ganancia del día"]]};
const PANT_DIM = {"tienda-productos": [480, 935], "tienda-vender": [480, 935], "tienda-tienda": [480, 935], "tienda-inicio": [480, 935], "variedades-productos": [480, 935], "variedades-vender": [480, 935], "variedades-tienda": [480, 935], "variedades-inicio": [480, 935], "mesas": [480, 633], "comida-productos": [480, 935], "comida-tienda": [480, 935], "comida-inicio": [480, 935], "p_boutique": [480, 602], "boutique-vender": [480, 935], "boutique-tienda": [480, 935], "boutique-inicio": [480, 935], "p_catalogo": [480, 936], "catalogo-vender": [480, 935], "catalogo-tienda": [480, 935], "catalogo-inicio": [480, 935], "p_floristeria": [480, 936], "floristeria-vender": [480, 935], "floristeria-tienda": [480, 935], "floristeria-inicio": [480, 935], "p_manualidades": [480, 936], "manualidades-vender": [480, 935], "manualidades-tienda": [480, 935], "manualidades-inicio": [480, 935], "mascotas": [480, 393], "veterinaria-vender": [480, 935], "veterinaria-tienda": [480, 935], "veterinaria-inicio": [480, 935], "patio": [480, 491], "carwash-vender": [480, 935], "carwash-tienda": [480, 935], "carwash-inicio": [480, 935], "proyectos": [480, 467], "servicios-vender": [480, 935], "servicios-tienda": [480, 935], "servicios-inicio": [480, 935], "tecnologia-productos": [480, 935], "tecnologia-vender": [480, 935], "tecnologia-tienda": [480, 935], "tecnologia-inicio": [480, 935], "cuentas": [480, 491], "streaming-vender": [480, 935], "streaming-tienda": [480, 760], "streaming-inicio": [480, 935], "secciones": [480, 467], "recargas-vender": [480, 935], "recargas-tienda": [480, 935], "recargas-inicio": [480, 935], "compras-cfg": [480, 467], "compras-vender": [480, 935], "compras-tienda": [480, 935], "compras-inicio": [480, 935], "lotes": [480, 480], "vitaminas-vender": [480, 935], "vitaminas-tienda": [480, 935], "vitaminas-inicio": [480, 935], "joyeria-productos": [480, 935], "joyeria-vender": [480, 935], "joyeria-tienda": [480, 935], "joyeria-inicio": [480, 935], "ferreteria-productos": [480, 935], "ferreteria-vender": [480, 935], "ferreteria-tienda": [480, 935], "ferreteria-inicio": [480, 935], "caducan": [480, 491], "farmacia-vender": [480, 935], "farmacia-tienda": [480, 935], "farmacia-inicio": [480, 935], "encargos": [480, 418], "panaderia-vender": [480, 935], "panaderia-tienda": [480, 935], "panaderia-inicio": [480, 935], "agenda": [480, 418], "belleza-vender": [480, 935], "belleza-tienda": [480, 935], "belleza-inicio": [480, 935], "ordenes": [480, 491], "repuestos-vender": [480, 935], "repuestos-tienda": [480, 935], "repuestos-inicio": [480, 935]};
const COMUN = [['Vender y cobrar', 'Desde el celular, con recibo y varias formas de pago.'], ['Inventario', 'Sabes qué hay, qué se acaba y cuánto te costó.'], ['Caja y cierre', 'Abres, cierras y la caja te cuadra.'], ['Cuentas por cobrar', 'Quién te debe, cuánto, y su abono registrado.'], ['Reportes', '«¿Cómo me fue hoy?» te lo cuenta en palabras y números.'], ['Tienda en línea', 'Tu catálogo en un enlace para que te hagan pedidos. Incluida en la prueba; después se activa aparte.']];
const faq = l => `<div class="faq">${l.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>`;
const faqLd = l => ({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: l.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });

/* ---------- utilidades ---------- */
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const slug = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);
const txt = (s, n) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n || 200);
const num = n => Number(n) || 0;
const fmtN = n => num(n).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const titulo = s => txt(s, 40).replace(/(^|[\s-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
// Foto: igual que la tienda (dirección https o archivo de Drive). Cualquier otra cosa se descarta.
const fotoSrc = (f, ancho) => {
  f = String(f || '');
  if (!f) return '';
  if (/^https:\/\/[^\s"'<>]+$/i.test(f)) return f;
  if (/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(f)) return f;
  if (/^[A-Za-z0-9_-]{10,80}$/.test(f)) return 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(f) + '&sz=w' + (ancho || 600);
  return '';
};
const waLink = tel => { const d = String(tel || '').replace(/\D/g, ''); const n = d.length === 8 ? '504' + d : d; return n.length >= 11 ? 'https://wa.me/' + n : ''; };
const idMedir = t => String(t.id).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 24);
const linkTienda = (t, extra) => TIENDA_URL + '?tienda=' + encodeURIComponent(t.id) + '&src=catrachas' + (extra || '');

/* ---------- datos ---------- */
async function leerTiendas() {
  const i = process.argv.indexOf('--muestra');
  if (i > 0) return JSON.parse(readFileSync(process.argv[i + 1], 'utf8'));
  const r = await fetch(SB + '/rest/v1/rpc/directorio_tiendas', { method: 'POST', headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'Content-Type': 'application/json' }, body: '{}' });
  if (!r.ok) throw new Error('No se pudo leer la lista de tiendas: ' + r.status + ' ' + (await r.text()).slice(0, 200));
  const lista = await r.json(), out = []; let fallas = 0;
  for (const x of lista) {
    try {
      const q = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'tiendaInfo', data: { negocio: x.id } }) });
      const j = await q.json();
      if (j && j.ok && j.data && j.data.negocio && j.data.negocio.dir) out.push({ id: x.id, visitas: num(x.visitas), info: j.data });
    } catch (e) { fallas++; console.error('Tienda ' + x.id + ' omitida: ' + e.message); }
  }
  // Si el servidor falló con todas, no se publica una página vacía: se conserva la anterior
  if (fallas && !out.length) throw new Error('El servidor no respondió: no se actualiza la página');
  return out;
}

function preparar(crudas) {
  const reservados = new Set(['en', ...Object.values(GIROS).map(slug)]), usados = new Set();
  return crudas.map(c => {
    const n = c.info.negocio, gs = [...new Set([n.gid, ...(n.giros || []).map(g => g.id)])].filter(g => GIROS[g]);
    let s = slug(n.nombre) || 'tienda';
    if (reservados.has(s) || usados.has(s)) s = s + '-' + slug(c.id);
    usados.add(s);
    const ciudad = titulo(n.dir.ciudad);
    return {
      id: String(c.id), visitas: c.visitas, slug: s, nombre: txt(n.nombre, 80) || 'Tienda', giros: gs.length ? gs : ['otro'], giroN: txt(n.giro, 60),
      ciudad, ciudadSlug: slug(ciudad), frase: txt(n.dir.frase, 80) || txt(n.eslogan, 80) || txt(n.sobre, 80),
      sobre: txt(n.sobre, 300), portada: fotoSrc(n.portada, 1400), horario: txt(n.horario, 80), telefono: n.telefono, moneda: txt(n.moneda, 4) || 'L',
      entrega: n.entrega === 'domicilio' ? 'A domicilio' : n.entrega === 'recoger' ? 'Para recoger' : 'A domicilio y para recoger',
      pagos: (n.pagos || []).map(p => txt(p, 20)).filter(Boolean).join(' · '), direccion: txt(n.direccion, 120),
      productos: (c.info.productos || []).map(p => {
        const ps = p.vars ? Object.values(p.vars).map(v => num(v.p) || num(p.precio)) : [num(p.precio)];
        const desde = Math.min(...ps, num(p.precio)), max = Math.max(...ps, num(p.precio));
        return { nombre: txt(p.nombre, 90), cat: txt(p.sub || p.categoria, 40), foto: fotoSrc(p.foto), precio: p.vars ? desde : num(p.precio), desde: !!p.vars && desde < max,
          agotado: !!p.agotado, nuevo: !!p.nuevo && !p.agotado, stock: p.stock, esp: num(p.precioEsp) > 0 && num(p.minEsp) > 1 ? { p: num(p.precioEsp), m: num(p.minEsp) } : null };
      })
    };
  }).filter(t => t.ciudad).sort((a, b) => b.visitas - a.visitas || a.nombre.localeCompare(b.nombre, 'es'));
}

/* ---------- piezas de página ---------- */
const CSS = readFileSync(new URL('./estilo.css', import.meta.url), 'utf8');
const jsonld = o => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;
function pagina({ ruta, title, desc, cuerpo, ld, img, marca, modulo, sinEsquina, medir }) {
  const url = SITIO + ruta;
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:locale" content="es_HN">
<meta property="og:image" content="${esc(img && /^https:/.test(img) ? img : SITIO + '/compartir.png')}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#6B1437">
<link rel="preload" href="/fuentes/inter.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/tiendas/estilo.css">
${ld ? jsonld(ld) : ''}
</head>
<body>
<header class="top"><a class="marca" href="${marca ? '/' : '/tiendas/'}"><span class="sello" aria-hidden="true">M</span><span><b>${marca ? 'Molina' : 'Tiendas Catrachas'}</b><small>${marca ? 'SOLUCIONES DIGITALES' : 'MOLINA SOLUCIONES DIGITALES'}</small></span></a><nav class="menu" aria-label="Secciones"><a href="/tiendas/"${modulo ? '' : ' class="on"'}>Tiendas</a><a href="/para-tu-negocio/"${modulo ? ' class="on"' : ''}>Para tu negocio</a></nav></header>
<main>
${cuerpo}
</main>
<footer class="pie">${marca ? `<p>Molina Soluciones Digitales · San Pedro Sula, Honduras</p><p><a href="/tiendas/">Tiendas Catrachas</a> · <a href="/para-tu-negocio/">Para tu negocio</a> · <a href="${WA}" rel="noopener">WhatsApp</a></p>` : `<p>Cada tienda es responsable de sus productos, precios y entregas.</p><p><a href="/tiendas/">Tiendas Catrachas</a> · <a href="/para-tu-negocio/">Para tu negocio</a> · <a href="/">Molina Soluciones Digitales</a></p>`}</footer>
${modulo || sinEsquina ? '' : '<a class="esquina" href="/aparecer/">¿Ya tienes tienda? Aparece aquí</a>'}
${medir ? `<script>window.tcPagina = ${JSON.stringify(String(medir).slice(0, 30))};</script>` : ''}
<script src="/medir.js" defer></script>
</body>
</html>
`;
}
const migas = l => `<nav class="migas" aria-label="Estás en">${l.map(([t, h]) => h ? `<a href="${esc(h)}">${esc(t)}</a>` : `<span>${esc(t)}</span>`).join(' › ')}</nav>`;
const iniciales = s => esc(txt(s, 40).split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase());
function tarjeta(t) {
  const g = GIROS[t.giros[0]];
  return `<article class="tarjeta" data-q="${esc((t.nombre + ' ' + t.giros.map(x => GIROS[x]).join(' ') + ' ' + t.giroN + ' ' + t.ciudad + ' ' + t.frase).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''))}" data-c="${esc(t.ciudadSlug)}">
<a class="portada" href="/tiendas/${esc(t.slug)}/" tabindex="-1" aria-hidden="true">${t.portada ? `<img src="${esc(t.portada)}" alt="" loading="lazy">` : `<span>${iniciales(t.nombre)}</span>`}</a>
<div class="cuerpo"><h3><a href="/tiendas/${esc(t.slug)}/">${esc(t.nombre)}</a></h3><p class="meta">${esc(g)} · ${esc(t.ciudad)}</p>${t.frase ? `<p class="frase">${esc(t.frase)}</p>` : ''}<a class="btn" href="/tiendas/${esc(t.slug)}/">Ver tienda</a></div>
</article>`;
}
const rejilla = l => l.length ? `<div class="rejilla" id="lista">${l.map(tarjeta).join('\n')}</div><p class="vacio" id="nada" hidden>No encontramos tiendas con esa búsqueda.</p>` : `<p class="vacio">Pronto verás aquí las primeras tiendas.</p>`;
const chips = l => l.length ? `<div class="chips">${l.map(([t, h, on]) => `<a class="chip${on ? ' on' : ''}" href="${esc(h)}">${esc(t)}</a>`).join('')}</div>` : '';
const invita = (t, p) => `<section class="invita"><h2>${esc(t)}</h2><p>${esc(p)}</p><a class="btn oro" href="${esc(TIENDA_URL)}?src=catrachas">Probar gratis 7 días</a></section>`;
const listaLd = (nombre, l) => ({ '@context': 'https://schema.org', '@type': 'ItemList', name: nombre, itemListElement: l.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.nombre, url: SITIO + '/tiendas/' + t.slug + '/' })) });
const FILTRO = `<script>
(function () {
  var q = document.getElementById('buscar'), c = document.getElementById('ciudad'), l = document.getElementById('lista'), n = document.getElementById('nada');
  if (!l) return;
  var norm = function (s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, ''); };
  function f() { var t = norm(q && q.value).trim(), ci = c ? c.value : '', v = 0;
    [].forEach.call(l.children, function (a) { var ok = (!t || a.getAttribute('data-q').indexOf(t) >= 0) && (!ci || a.getAttribute('data-c') === ci); a.hidden = !ok; if (ok) v++; });
    if (n) n.hidden = v > 0; }
  if (q) q.addEventListener('input', f); if (c) c.addEventListener('change', f);
})();
</script>`;

function producto(t, p) {
  const et = p.agotado ? '<span class="et out">Agotado</span>' : p.stock !== undefined ? `<span class="et">${esc(String(Math.floor(num(p.stock))))} disp.</span>` : '';
  return `<a class="prod${p.agotado ? ' dis' : ''}" href="${esc(linkTienda(t))}" data-ir="${idMedir(t)}"><div class="ph">${p.foto ? `<img src="${esc(p.foto)}" alt="${esc(p.nombre)}" loading="lazy">` : `<span>${iniciales(p.nombre)}</span>`}${p.nuevo ? '<span class="nw">Nuevo</span>' : ''}${et}</div>
<div class="bd">${p.cat ? `<div class="cat">${esc(p.cat)}</div>` : ''}<div class="nm">${esc(p.nombre)}</div><div class="pr">${p.desde ? '<small>desde </small>' : ''}${esc(t.moneda)}&nbsp;${fmtN(p.precio)}</div>${p.esp ? `<div class="esp">${esc(t.moneda)}&nbsp;${fmtN(p.esp.p)} desde ${p.esp.m} piezas</div>` : ''}</div></a>`;
}

/* ---------- generar ---------- */
const archivos = {};
const poner = (ruta, html) => { archivos[ruta.replace(/\/$/, '/index.html')] = html; };

function generar(T) {
  const ciudades = [...new Map(T.map(t => [t.ciudadSlug, t.ciudad])).entries()].sort((a, b) => a[1].localeCompare(b[1], 'es'));
  const girosCon = Object.keys(GIROS).filter(g => T.some(t => t.giros.includes(g)));
  const selCiudad = ciudades.length > 1 ? `<label class="sel"><span class="oculto">Ciudad</span><select id="ciudad"><option value="">Todas las ciudades</option>${ciudades.map(([s, n]) => `<option value="${esc(s)}">${esc(n)}</option>`).join('')}</select></label>` : '';
  const buscador = `<div class="buscar"><label class="caja"><span class="oculto">Buscar tienda</span><input id="buscar" type="search" placeholder="Busca una tienda o un tipo de negocio" autocomplete="off"></label>${selCiudad}</div>`;
  const urls = ['/'];
  const FAQ_DIR = [['¿Cómo hago un pedido?', 'Entra a la tienda que te interesa, elige tus productos y envía el pedido. El negocio lo recibe en su programa y te atiende directamente.'],
    ['¿Cómo se paga?', 'Cada negocio define sus formas de pago, por ejemplo efectivo o transferencia. Las ves en su página antes de pedir.'],
    ['¿Quién entrega mi pedido?', 'El negocio al que le compras. Cada uno indica si entrega a domicilio, si es para recoger o las dos.'],
    ['¿Tiendas Catrachas vende los productos?', 'No. Es un directorio: cada tienda es de su dueño, que es quien responde por sus productos, precios y entregas.'],
    ['¿Cómo hago para que mi negocio aparezca aquí?', 'Si usas Gestión de Negocio VM, enciende «Aparecer en Tiendas Catrachas» dentro del programa. Si ya tienes tu tienda en otro lado, puedes aparecer por L 150 al mes: toca «Aparece aquí», llena el formulario y te contactamos en 48 horas.']];

  // Portada del directorio
  poner('/tiendas/', pagina({ ruta: '/tiendas/', medir: 'tc-dir', title: 'Tiendas Catrachas · Tiendas en línea de Honduras', desc: 'Tiendas en línea de negocios de Honduras: mira su catálogo, compra por internet y haz tu pedido directo con el negocio, a domicilio o para recoger.',
    ld: listaLd('Tiendas Catrachas', T),
    cuerpo: `<section class="hero"><h1>Tiendas en línea de Honduras</h1><p>Negocios catrachos con su tienda online. Entra, mira el catálogo y haz tu pedido por internet directo con el negocio, a domicilio o para recoger.</p>${buscador}</section>
<section class="cont">${chips([['Todos', '/tiendas/', true], ...girosCon.map(g => [GIROS[g], '/tiendas/' + slug(GIROS[g]) + '/'])])}
<p class="cuenta">${T.length} ${T.length === 1 ? 'tienda' : 'tiendas'} · primero las más visitadas</p>
${rejilla(T)}
<h2 class="tit">Preguntas frecuentes</h2>${faq(FAQ_DIR)}
${invita('¿Tienes un negocio?', 'Crea tu tienda en línea con Gestión de Negocio VM: catálogo, pedidos, inventario y caja en un solo programa. Y aparece aquí.')}</section>${FILTRO}` }));
  urls.push('/tiendas/');

  // Por tipo de negocio, y por tipo de negocio + ciudad
  girosCon.forEach(g => {
    const gn = GIROS[g], gs = slug(gn), l = T.filter(t => t.giros.includes(g)), cs = ciudades.filter(([s]) => l.some(t => t.ciudadSlug === s));
    poner(`/tiendas/${gs}/`, pagina({ ruta: `/tiendas/${gs}/`, medir: 'tc-giro-' + g, title: `${gn} en Honduras · Tiendas Catrachas`, desc: `${gn} de Honduras con tienda en línea. Mira lo que ofrecen y haz tu pedido directo con el negocio.`, ld: listaLd(gn + ' en Honduras', l),
      cuerpo: `<section class="cont">${migas([['Tiendas', '/tiendas/'], [gn]])}<h1>${esc(gn)} en Honduras</h1><p class="intro">${esc(gn)} con tienda en línea. Mira lo que ofrecen y haz tu pedido directo con el negocio.</p>
${cs.length ? `<h2 class="sub">Por ciudad</h2>${chips(cs.map(([s, n]) => [n, `/tiendas/${gs}/${s}/`]))}` : ''}
<p class="cuenta">${l.length} ${l.length === 1 ? 'tienda' : 'tiendas'}</p>${rejilla(l)}</section>` }));
    urls.push(`/tiendas/${gs}/`);
    cs.forEach(([s, n]) => {
      const lc = l.filter(t => t.ciudadSlug === s), otras = cs.filter(([x]) => x !== s), otros = girosCon.filter(x => x !== g && T.some(t => t.ciudadSlug === s && t.giros.includes(x)));
      poner(`/tiendas/${gs}/${s}/`, pagina({ ruta: `/tiendas/${gs}/${s}/`, medir: 'tc-gc-' + g + '-' + s, title: `${gn} en ${n} · Tiendas Catrachas`, desc: `${gn} de ${n}, Honduras, con tienda en línea. Mira lo que ofrecen y haz tu pedido directo con el negocio.`, ld: listaLd(`${gn} en ${n}`, lc),
        cuerpo: `<section class="cont">${migas([['Tiendas', '/tiendas/'], [gn, `/tiendas/${gs}/`], [n]])}<h1>${esc(gn)} en ${esc(n)}</h1><p class="intro">${esc(gn)} de ${esc(n)} con tienda en línea. Mira lo que ofrecen y haz tu pedido directo con el negocio.</p>
<p class="cuenta">${lc.length} ${lc.length === 1 ? 'tienda' : 'tiendas'}</p>${rejilla(lc)}
${otras.length ? `<h2 class="sub">${esc(gn)} en otras ciudades</h2>${chips(otras.map(([x, xn]) => [xn, `/tiendas/${gs}/${x}/`]))}` : ''}
${otros.length ? `<h2 class="sub">Más tiendas en ${esc(n)}</h2>${chips(otros.map(x => [GIROS[x], `/tiendas/${slug(GIROS[x])}/${s}/`]))}` : ''}
${invita('¿Tienes un negocio en ' + n + '?', 'Crea tu tienda en línea y aparece en esta página.')}</section>` }));
      urls.push(`/tiendas/${gs}/${s}/`);
    });
  });

  // Por ciudad
  ciudades.forEach(([s, n]) => {
    const l = T.filter(t => t.ciudadSlug === s);
    poner(`/tiendas/en/${s}/`, pagina({ ruta: `/tiendas/en/${s}/`, medir: 'tc-ciudad-' + s, title: `Tiendas en línea en ${n} · Tiendas Catrachas`, desc: `Negocios de ${n}, Honduras, con tienda en línea. Mira su catálogo y haz tu pedido directo con el negocio.`, ld: listaLd('Tiendas en ' + n, l),
      cuerpo: `<section class="cont">${migas([['Tiendas', '/tiendas/'], [n]])}<h1>Tiendas en línea en ${esc(n)}</h1><p class="intro">Negocios de ${esc(n)} con tienda en línea.</p><p class="cuenta">${l.length} ${l.length === 1 ? 'tienda' : 'tiendas'}</p>${rejilla(l)}</section>` }));
    urls.push(`/tiendas/en/${s}/`);
  });

  // Ficha de cada tienda
  T.forEach(t => {
    const g = t.giros[0], gn = GIROS[g], gs = slug(gn), wa = waLink(t.telefono), ps = t.productos.slice(0, MAX_PROD);
    const desc = txt(`${t.frase || gn + ' en ' + t.ciudad}. Pide desde tu celular y coordina la entrega directo con el negocio.`, 160);
    const datos = [['Horario', t.horario], ['Entrega', t.entrega], ['Formas de pago', t.pagos], ['Dirección', t.direccion]].filter(x => x[1]);
    poner(`/tiendas/${t.slug}/`, pagina({ ruta: `/tiendas/${t.slug}/`, medir: 'tc-t-' + idMedir(t), title: `${t.nombre} · ${gn} en ${t.ciudad}`, desc, img: t.portada,
      ld: { '@context': 'https://schema.org', '@type': 'Store', name: t.nombre, description: desc, url: SITIO + '/tiendas/' + t.slug + '/', ...(t.portada && /^https:/.test(t.portada) ? { image: t.portada } : {}),
        address: { '@type': 'PostalAddress', addressLocality: t.ciudad, addressCountry: 'HN', ...(t.direccion ? { streetAddress: t.direccion } : {}) } },
      cuerpo: `<section class="cont ficha">${migas([['Tiendas', '/tiendas/'], [gn, `/tiendas/${gs}/`], [t.ciudad, `/tiendas/${gs}/${t.ciudadSlug}/`]])}
<div class="portada-f">${t.portada ? `<img src="${esc(t.portada)}" alt="${esc(t.nombre)}">` : `<span>${iniciales(t.nombre)}</span>`}</div>
<h1>${esc(t.nombre)}</h1><p class="meta">${esc(gn)} · ${esc(t.ciudad)}</p>
${t.frase ? `<p class="intro">${esc(t.frase)}</p>` : ''}${t.sobre && t.sobre !== t.frase ? `<p class="sobre">${esc(t.sobre)}</p>` : ''}
<div class="acciones"><a class="btn grande" href="${esc(linkTienda(t))}" data-ir="${idMedir(t)}">Entrar a la tienda</a>${wa ? `<a class="btn linea" href="${esc(wa)}" rel="nofollow noopener">Escribir por WhatsApp</a>` : ''}</div>
${datos.length ? `<dl class="datos">${datos.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
${ps.length ? `<h2 class="sub">Productos</h2><div class="prods">${ps.map(p => producto(t, p)).join('\n')}</div>${t.productos.length > ps.length ? `<p class="mas"><a class="btn linea" href="${esc(linkTienda(t))}" data-ir="${idMedir(t)}">Ver los ${t.productos.length} productos en la tienda</a></p>` : ''}` : ''}
<div class="caja-l"><h2>Más en ${esc(t.ciudad)}</h2><a href="/tiendas/${gs}/${esc(t.ciudadSlug)}/">${esc(gn)} en ${esc(t.ciudad)}</a><a href="/tiendas/en/${esc(t.ciudadSlug)}/">Todas las tiendas de ${esc(t.ciudad)}</a></div>
<p class="hecho">Tienda creada con Gestión de Negocio VM · <a href="${esc(TIENDA_URL)}?src=catrachas">Crea la tuya</a></p></section>` }));
    urls.push(`/tiendas/${t.slug}/`);
  });

  archivos['/tiendas/estilo.css'] = CSS;
  archivos['/medir.js'] = readFileSync(new URL('./medir.js', import.meta.url));
  archivos['/robots.txt'] = `User-agent: *\nAllow: /\nSitemap: ${SITIO}/sitemap.xml\n`;
  archivos['/CNAME'] = 'molinasoluciones.com\n';
  archivos['/compartir.png'] = readFileSync(new URL('./compartir.png', import.meta.url));
  for (const f of readdirSync(new URL('./fuentes/', import.meta.url))) archivos['/fuentes/' + f] = readFileSync(new URL('./fuentes/' + f, import.meta.url));
  for (const f of readdirSync(new URL('./pantallas/', import.meta.url))) archivos['/pantallas/' + f] = readFileSync(new URL('./pantallas/' + f, import.meta.url));
  archivos['/404.html'] = pagina({ ruta: '/404.html', title: 'Página no encontrada · Tiendas Catrachas', desc: 'Esta página ya no existe.', cuerpo: `<section class="cont"><h1>Esta página ya no existe</h1><p class="intro">Puede que la tienda haya dejado de aparecer aquí.</p><p><a class="btn" href="/tiendas/">Ver todas las tiendas</a></p></section>` });
  // Páginas para dueños de negocio (una por tipo de negocio) y su índice
  const prob = esc(TIENDA_URL) + '?src=sitio';
  const FAQ_PRG = [['¿Puedo probarlo gratis?', 'Sí. La prueba dura 7 días e incluye la tienda en línea.'], ['¿Funciona en el celular?', 'Sí. Se usa desde el celular y también desde una computadora.'],
    ['¿Trae tienda en línea?', 'Sí. Va incluida en la prueba y después se activa aparte.'], ['¿Cuánto cuesta?', 'Escríbenos por WhatsApp y te damos el precio según lo que necesite tu negocio.']];
  PARA.forEach((pn, k) => {
    const [nombre, que] = NEGOCIOS[k], ps = slug(pn), ej = T.filter(t => t.giros.includes(GIRO_DE[k])).slice(0, 3), ruta = `/programa/${ps}/`;
    poner(ruta, pagina({ ruta, marca: true, modulo: true, medir: 'tc-prog-' + GIRO_DE[k], title: `Programa de ventas e inventario para ${pn} en Honduras`, desc: txt(`${que} Además ventas, inventario, caja y tienda en línea desde tu celular. Pruébalo gratis 7 días.`, 160), ld: faqLd(FAQ_PRG),
      cuerpo: `<section class="hero"><h1>Programa de ventas e inventario para ${esc(pn)}</h1><p>${esc(que)}</p><p class="dos"><a class="btn oro" href="${prob}">Probar gratis 7 días</a> <a class="btn linea claro" href="${WA}" rel="noopener">Escríbenos por WhatsApp</a></p></section>
<section class="cont">${migas([['Para tu negocio', '/para-tu-negocio/'], ['Programa por tipo de negocio', '/programa/'], [nombre]])}
<p class="intro">Gestión de Negocio VM es un sistema de punto de venta e inventario para ${esc(pn)} que se usa como una app desde el celular o la computadora: registras tus ventas, controlas tus existencias y cierras tu caja sin cuadernos ni hojas de cálculo.</p>
<h2 class="tit">Así se ve el programa en tu negocio</h2><div class="pantallas">${(PANT[GIRO_DE[k]] || []).map(([f, t]) => `<figure><div class="marco${PANT_DIM[f][1] / PANT_DIM[f][0] < 1.6 ? ' corta' : ''}"><img src="/pantallas/${f}.webp" width="${PANT_DIM[f][0]}" height="${PANT_DIM[f][1]}" alt="${esc(t)} · Gestión de Negocio VM para ${esc(pn)}" loading="lazy"></div><figcaption>${esc(t)}</figcaption></figure>`).join('')}</div>
<h2 class="tit">Lo que hace por tu negocio</h2><div class="todos"><div class="pto dest"><h3>${esc(nombre)}</h3><p>${esc(que)}</p></div>${COMUN.map(([n, d]) => `<div class="pto"><h3>${esc(n)}</h3><p>${esc(d)}</p></div>`).join('')}</div>
${ej.length ? `<h2 class="tit">Negocios como el tuyo que ya venden en línea</h2><div class="rejilla">${ej.map(tarjeta).join('')}</div>` : ''}
<h2 class="tit">Preguntas frecuentes</h2>${faq(FAQ_PRG)}
${invita('Empieza hoy', 'Crea tu cuenta, elige tu tipo de negocio y prueba el programa 7 días.')}</section>` }));
    urls.push(ruta);
  });
  poner('/programa/', pagina({ ruta: '/programa/', marca: true, modulo: true, medir: 'tc-prog', title: 'Programa de ventas e inventario para negocios de Honduras', desc: 'Gestión de Negocio VM se adapta a tu tipo de negocio: restaurante, floristería, veterinaria, carwash, boutique, pulpería y más. Pruébalo gratis 7 días.',
    cuerpo: `<section class="hero"><h1>Un programa para cada tipo de negocio</h1><p>Ventas, inventario, caja y tienda en línea desde tu celular.</p></section>
<section class="cont">${migas([['Para tu negocio', '/para-tu-negocio/'], ['Programa por tipo de negocio']])}<div class="negocios">${PARA.map((pn, k) => `<a class="neg" href="/programa/${slug(pn)}/"><h3>${esc(NEGOCIOS[k][0])}</h3><p>${esc(NEGOCIOS[k][1])}</p></a>`).join('')}</div>
${invita('¿Tu negocio no está en la lista?', 'El programa se adapta. Escríbenos y lo vemos contigo.')}</section>` }));
  urls.push('/programa/');

  // Guías: cada una responde una búsqueda de un dueño de negocio
  const GUIAS = [
    { s: 'como-crear-una-tienda-en-linea-en-honduras', t: 'Cómo crear una tienda en línea en Honduras', d: 'Los pasos para vender por internet en Honduras: catálogo con fotos, formas de pago, entregas y cómo dar a conocer tu enlace.',
      i: 'No necesitas una página web hecha a la medida para vender por internet. Lo que necesitas es un catálogo ordenado, una forma clara de recibir pedidos y constancia para compartir tu enlace.',
      p: [['Ordena lo que vendes', 'Haz la lista de tus productos con nombre, precio y categoría. Empieza con los que más se venden; el resto lo agregas después.'],
        ['Tómale foto a cada producto', 'Una foto clara, con buena luz y fondo limpio, vende más que una descripción larga. Usa el mismo estilo en todas para que el catálogo se vea ordenado.'],
        ['Define cómo te pagan', 'Decide qué aceptas: efectivo contra entrega, transferencia, billetera electrónica o enlace de pago con tarjeta. Dilo antes de que el cliente pida, no después.'],
        ['Define cómo entregas', 'A domicilio, para recoger o las dos. Si cobras envío, pon el costo a la vista. Si hay un pedido mínimo, también.'],
        ['Comparte tu enlace', 'Una tienda en línea no vende sola: ponla en tu estado de WhatsApp, en tu perfil de Facebook, Instagram y TikTok, y en un código QR en tu local.'],
        ['Responde rápido', 'El cliente que pide por internet espera respuesta pronto. Confirma cada pedido y avisa cuando va en camino.']],
      vm: 'Tu catálogo sale de los mismos productos que ya tienes en el programa, con sus fotos y existencias. Los pedidos llegan solos, el cliente puede seguir el suyo y tu tienda puede aparecer en Tiendas Catrachas. La tienda en línea va incluida en la prueba y después se activa aparte.' },
    { s: 'como-llevar-el-inventario-de-tu-negocio', t: 'Cómo llevar el inventario de tu negocio desde el celular', d: 'Un método sencillo para controlar existencias, saber qué se acaba y cuánto te costó cada producto, sin cuadernos ni hojas de cálculo.',
      i: 'Llevar inventario no es contar por contar: es saber qué tienes, qué se está acabando y cuánto dinero tienes detenido en producto.',
      p: [['Registra cada producto una sola vez', 'Nombre, categoría, precio de venta y costo. Sin el costo no puedes saber cuánto ganas.'],
        ['Anota la existencia inicial', 'Cuenta lo que hay hoy y pártelo desde ahí. No hace falta reconstruir el pasado.'],
        ['Registra las entradas', 'Cada compra a tu proveedor suma existencia. Anótala el mismo día, con su costo.'],
        ['Deja que las ventas descuenten solas', 'Si cada venta se registra, la existencia baja sin que tengas que restar a mano. Ahí es donde un cuaderno se queda corto.'],
        ['Fija un mínimo por producto', 'Decide con cuántas unidades quieres que te avise para volver a comprar antes de quedarte sin nada.'],
        ['Cuenta de vez en cuando', 'Una vez al mes compara lo que dice el sistema con lo que hay en el estante y ajusta la diferencia.']],
      vm: 'Cada venta descuenta la existencia, cada compra la suma y el programa te muestra lo que se está acabando. Si vendes por tallas, colores o tonos, lleva la existencia de cada uno.' },
    { s: 'como-controlar-las-ventas-al-credito', t: 'Cómo controlar las ventas al crédito de tu negocio', d: 'Cómo llevar las cuentas por cobrar de tus clientes: quién te debe, cuánto, sus abonos y cómo recordarles el pago sin perder al cliente.',
      i: 'Vender al crédito ayuda a vender más, pero sin control se convierte en dinero perdido. La clave es que cada deuda y cada abono queden anotados el mismo día.',
      p: [['Decide a quién le das crédito', 'No a todos. Empieza por clientes que conoces y ponle a cada uno un límite.'],
        ['Anota la venta en el momento', 'Fecha, cliente, qué llevó y cuánto quedó debiendo. Lo que se deja para después se olvida.'],
        ['Registra cada abono', 'Con fecha y monto, y entrégale al cliente su comprobante. Así no hay discusiones sobre el saldo.'],
        ['Revisa la lista cada semana', 'Mira quién lleva más tiempo sin abonar y cuánto suma todo lo que te deben.'],
        ['Recuerda el pago con respeto', 'Un mensaje corto con el saldo y la fecha funciona mejor que una llamada incómoda.']],
      vm: 'Cada cliente tiene su cuenta con lo que debe y sus abonos, ves el total por cobrar y puedes mandarle un recordatorio por WhatsApp con su saldo.' },
    { s: 'como-hacer-el-cierre-de-caja', t: 'Cómo hacer el cierre de caja de tu negocio', d: 'Los pasos para abrir y cerrar caja cada día y que el efectivo cuadre con las ventas, los gastos y los abonos.',
      i: 'El cierre de caja responde una sola pregunta: ¿el dinero que hay coincide con lo que debería haber? Hacerlo todos los días evita que un faltante pequeño se vuelva grande.',
      p: [['Abre la caja con un monto fijo', 'Anota con cuánto efectivo empiezas el día. Sin ese dato no hay con qué comparar.'],
        ['Registra todo lo que entra', 'Ventas en efectivo, abonos de clientes y cualquier otro ingreso, separados de las ventas por transferencia o tarjeta.'],
        ['Registra todo lo que sale', 'Gastos, pagos a proveedores y retiros. Un gasto sin anotar es un faltante al final del día.'],
        ['Cuenta el efectivo', 'Al cerrar, cuenta billetes y monedas y compáralo con lo que debería haber: apertura más entradas menos salidas.'],
        ['Anota la diferencia', 'Si sobra o falta, déjalo escrito con el motivo. Con el tiempo verás si es un error que se repite.']],
      vm: 'Abres la caja, vendes y registras gastos durante el día, y al cerrar el programa te dice cuánto debería haber para que lo compares con lo que contaste.' }
  ];
  GUIAS.forEach(g => {
    const ruta = `/guias/${g.s}/`;
    poner(ruta, pagina({ ruta, marca: true, modulo: true, medir: 'tc-guia-' + (GUIAS.indexOf(g) + 1), title: `${g.t} · Guía`, desc: g.d,
      ld: { '@context': 'https://schema.org', '@type': 'Article', headline: g.t, description: g.d, inLanguage: 'es', author: { '@type': 'Organization', name: 'Molina Soluciones Digitales' }, publisher: { '@type': 'Organization', name: 'Molina Soluciones Digitales' }, mainEntityOfPage: SITIO + ruta },
      cuerpo: `<section class="hero"><h1>${esc(g.t)}</h1><p>${esc(g.d)}</p></section>
<section class="cont guia">${migas([['Para tu negocio', '/para-tu-negocio/'], ['Guías', '/guias/'], [g.t]])}<p class="intro">${esc(g.i)}</p>
<ol class="pasos">${g.p.map(([n, d]) => `<li><h2>${esc(n)}</h2><p>${esc(d)}</p></li>`).join('')}</ol>
<div class="pto"><h3>Cómo se hace en Gestión de Negocio VM</h3><p>${esc(g.vm)}</p></div>
${invita('Pruébalo en tu negocio', 'Crea tu cuenta, elige tu tipo de negocio y usa el programa gratis 7 días.')}
<h2 class="tit">Más guías</h2>${chips(GUIAS.filter(x => x !== g).map(x => [x.t, `/guias/${x.s}/`]))}</section>` }));
    urls.push(ruta);
  });
  poner('/guias/', pagina({ ruta: '/guias/', marca: true, modulo: true, medir: 'tc-guia', title: 'Guías para dueños de negocio en Honduras', desc: 'Guías prácticas para vender por internet, llevar tu inventario, controlar las ventas al crédito y cerrar tu caja.',
    cuerpo: `<section class="hero"><h1>Guías para tu negocio</h1><p>Pasos prácticos para vender más y llevar tu negocio en orden.</p></section>
<section class="cont">${migas([['Para tu negocio', '/para-tu-negocio/'], ['Guías']])}<div class="negocios">${GUIAS.map(g => `<a class="neg" href="/guias/${g.s}/"><h3>${esc(g.t)}</h3><p>${esc(g.d)}</p></a>`).join('')}</div></section>` }));
  urls.push('/guias/');

  // Módulo aparte «Para tu negocio»: el programa por tipo de negocio y las guías (las tiendas van siempre primero en el resto del sitio)
  poner('/para-tu-negocio/', pagina({ ruta: '/para-tu-negocio/', marca: true, modulo: true, medir: 'tc-negocio', title: 'Para tu negocio · Programa de ventas, inventario y tienda en línea en Honduras', desc: 'Gestión de Negocio VM: sistema de punto de venta, inventario, caja y tienda en línea para negocios de Honduras. Elige tu tipo de negocio y pruébalo gratis 7 días.',
    cuerpo: `<section class="hero"><h1>Un programa hecho para tu tipo de negocio</h1><p>Ventas, inventario, caja y cuentas por cobrar desde tu celular, con tu tienda en línea para aparecer en Tiendas Catrachas.</p><p class="dos"><a class="btn oro" href="${prob}">Probar gratis 7 días</a> <a class="btn linea claro" href="${WA}" rel="noopener">Escríbenos por WhatsApp</a></p></section>
<section class="cont"><h2 class="tit">¿Qué tipo de negocio tienes?</h2><div class="negocios">${PARA.map((pn, k) => `<a class="neg" href="/programa/${slug(pn)}/"><h3>${esc(NEGOCIOS[k][0])}</h3><p>${esc(NEGOCIOS[k][1])}</p></a>`).join('')}</div>
<h2 class="tit">Lo que trae para todos</h2><div class="todos">${COMUN.map(([n, d]) => `<div class="pto"><h3>${esc(n)}</h3><p>${esc(d)}</p></div>`).join('')}</div>
<h2 class="tit">Guías</h2><div class="negocios">${GUIAS.map(g => `<a class="neg" href="/guias/${g.s}/"><h3>${esc(g.t)}</h3><p>${esc(g.d)}</p></a>`).join('')}</div>
${invita('Empieza hoy', 'Crea tu cuenta, elige tu tipo de negocio y prueba el programa 7 días.')}</section>` }));
  urls.push('/para-tu-negocio/');

  // Tiendas que no usan el programa: por ahora solo dejan sus datos y Vic las contacta (L 150 al mes)
  poner('/aparecer/', pagina({ ruta: '/aparecer/', sinEsquina: true, medir: 'tc-aparecer', title: 'Aparece en Tiendas Catrachas con tu tienda · L 150 al mes', desc: '¿Ya tienes tu tienda en línea, tu página o tu catálogo? Aparece en Tiendas Catrachas por L 150 al mes. Déjanos tus datos y te contactamos en 48 horas.',
    cuerpo: `<section class="hero"><h1>Aparece en Tiendas Catrachas</h1><p>¿Ya tienes tu tienda en línea, tu página o tu catálogo en otro lado? También puedes aparecer aquí.</p></section>
<section class="cont guia">${migas([['Tiendas', '/tiendas/'], ['Aparecer aquí']])}
<div class="precio"><b>L 150 al mes</b><span>Tu negocio en el directorio, con su nombre, tipo de negocio, ciudad, foto y un botón que lleva a tu tienda.</span></div>
<h2 class="tit">Déjanos tus datos y te contactamos</h2>
<form id="f-ap" class="formu" novalidate>
<label>Nombre del negocio<input name="negocio" required maxlength="80" autocomplete="organization"></label>
<label>Tu nombre<input name="nombre" required maxlength="60" autocomplete="name"></label>
<label>Tu WhatsApp<input name="whatsapp" required inputmode="tel" maxlength="20" autocomplete="tel" placeholder="9999-9999"></label>
<label>Tipo de negocio<select name="tipo"><option value="">Elige uno</option>${Object.values(GIROS).map(g => `<option>${esc(g)}</option>`).join('')}</select></label>
<label>Ciudad<input name="ciudad" required maxlength="40" placeholder="San Pedro Sula"></label>
<label>Enlace de tu tienda, página o Instagram<input name="enlace" required maxlength="200" placeholder="https://… o @tunegocio"></label>
<label>Algo más que quieras contarnos (opcional)<textarea name="nota" rows="3" maxlength="300"></textarea></label>
<p class="aviso-f" id="f-err" role="alert" hidden>Llena los campos marcados para poder enviarlo.</p>
<button class="btn grande" type="submit">Enviar solicitud</button>
<p class="nota-f">Evaluamos cada solicitud y te contactamos por WhatsApp en un máximo de 48 horas.</p>
</form>
<div class="listo" id="f-ok" role="status" tabindex="-1" hidden><h2>Recibimos tu solicitud</h2><p>La vamos a evaluar y en un máximo de 48 horas te contactamos por WhatsApp al número que nos dejaste.</p><p><a class="btn" href="/tiendas/">Ver las tiendas</a></p></div>
<div class="pto"><h3>¿Aún no tienes tienda en línea?</h3><p>Con Gestión de Negocio VM tienes tu tienda, tus productos aparecen aquí solos y además llevas ventas, inventario y caja. <a href="/para-tu-negocio/">Ver «Para tu negocio»</a></p></div>
</section>
<script>
(function () {
  var f = document.getElementById('f-ap'), e = document.getElementById('f-err'); if (!f) return;
  f.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var d = {}, falta = false;
    [].forEach.call(f.elements, function (c) { if (!c.name) return; d[c.name] = String(c.value || '').trim(); var mal = c.required && !d[c.name]; c.setAttribute('aria-invalid', mal ? 'true' : 'false'); if (mal) falta = true; });
    e.textContent = 'Llena los campos marcados para poder enviarlo.'; e.hidden = !falta; if (falta) { var p = f.querySelector('[aria-invalid="true"]'); if (p) p.focus(); return; }
    var b = f.querySelector('button[type=submit]'); b.disabled = true; b.textContent = 'Enviando…';
    fetch('${API}', { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify({ action: 'solicitudDir', data: d }) })
      .then(function (r) { return r.json(); })
      .then(function (r) { if (!r || !r.ok) throw new Error((r && r.error) || 'No se pudo enviar');
        f.hidden = true; var ok = document.getElementById('f-ok'); ok.hidden = false; ok.focus(); ok.scrollIntoView({ block: 'center' }); })
      .catch(function (x) { b.disabled = false; b.textContent = 'Enviar solicitud'; e.textContent = (x && x.message && x.message.length < 140 && !/fetch|network|json/i.test(x.message) ? x.message : 'No se pudo enviar. Revisa tu conexión e inténtalo de nuevo.'); e.hidden = false; });
  });
})();
</script>` }));
  urls.push('/aparecer/');

  // Página de inicio del dominio: primero los negocios; los tipos de negocio, en un párrafo
  const probar = esc(TIENDA_URL) + '?src=sitio', top = T.slice(0, 12);
  archivos['/index.html'] = pagina({ ruta: '/', marca: true, medir: 'tc-inicio', title: 'Molina Soluciones Digitales · Negocios de Honduras con tienda en línea', desc: 'Conoce los negocios de Honduras que venden en línea con Gestión de Negocio VM y crea la tienda de tu negocio.', ld: listaLd('Negocios con tienda en línea', top),
    cuerpo: `<section class="hero"><h1>Negocios de Honduras con tienda en línea</h1><p>Entra a su tienda, mira el catálogo y haz tu pedido directo con el negocio.</p></section>
<section class="cont"><p class="cuenta">${T.length > top.length ? 'Los ' + top.length + ' más visitados' : T.length + (T.length === 1 ? ' negocio' : ' negocios') + ' · primero los más visitados'}</p>
${rejilla(top)}
${T.length > top.length ? `<p class="mas"><a class="btn linea" href="/tiendas/">Ver los ${T.length} negocios</a></p>` : `<p class="mas"><a class="btn linea" href="/tiendas/">Buscar por ciudad o tipo de negocio</a></p>`}
<section class="invita"><h2>¿Tienes un negocio?</h2><p>Gestión de Negocio VM es un programa de ventas, inventario, caja y tienda en línea que se adapta a tu tipo de negocio: ${NEGOCIOS.slice(0, -1).map(x => x[0].toLowerCase()).join(', ')}. Si el tuyo no está en la lista, también se adapta.</p><p class="dos"><a class="btn oro" href="/para-tu-negocio/">Ver «Para tu negocio»</a></p></section></section>` });
  archivos['/sitemap.xml'] = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `<url><loc>${esc(SITIO + u)}</loc></url>`).join('\n')}\n</urlset>\n`;
  return urls.length;
}

const crudas = await leerTiendas();
const T = preparar(crudas);
const n = generar(T);
rmSync(SALIDA, { recursive: true, force: true });
for (const [ruta, html] of Object.entries(archivos)) { const f = join(SALIDA, ruta); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, html); }
console.log(`Tiendas: ${T.length} · páginas: ${n} · archivos: ${Object.keys(archivos).length}`);
