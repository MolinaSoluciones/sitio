// Tiendas Catrachas · Molina Soluciones Digitales
// Genera las páginas públicas (ya escritas, para que Google las lea) a partir de las tiendas en línea de Negocio VM.
// Uso:  node generar.mjs                → lee las tiendas reales (solo las que encendieron «Aparecer en Tiendas Catrachas»)
//       node generar.mjs --muestra x.json → usa datos de ejemplo (pruebas y capturas)
// No usa claves secretas: la lista sale de una función pública de solo lectura y los productos de la misma
// llamada pública que usa la tienda en línea (por eso salen idénticos).
import { writeFileSync, mkdirSync, readFileSync, existsSync, rmSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const SITIO = 'https://molinasoluciones.com';
// Imágenes de portada del inicio (portadas/1.jpg, 2.jpg…): marcos ilustrados con el centro en blanco para el título
const PORTADAS = readdirSync(new URL('./portadas/', import.meta.url)).filter(f => /^\d+\.jpg$/.test(f)).map(f => parseInt(f, 10)).sort((a, b) => a - b);
// Versiones WebP de cada portada (n-900.webp y n-1600.webp), más livianas; si faltan se usa el .jpg
const WEBP_P = new Set(PORTADAS.filter(n => existsSync(new URL(`./portadas/${n}-900.webp`, import.meta.url)) && existsSync(new URL(`./portadas/${n}-1600.webp`, import.meta.url))));
const TIENDA_URL = process.env.TIENDA_URL || 'https://app.molinasoluciones.com/'; // dirección del programa (la anterior josevic504-bot.github.io/negocio redirige aquí)
const API = 'https://qvhtlezxjklhwlnvexje.supabase.co/functions/v1/api';
const SB = 'https://qvhtlezxjklhwlnvexje.supabase.co';
// Llave pública (la misma que ya va en la app): no da acceso a ninguna tabla, solo a la función del directorio
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2aHRsZXp4amtsaHdsbnZleGplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0MDg2NTEsImV4cCI6MjEwODk4NDY1MX0.y95iOCUtPiT-KbMDKsbPtCGs1qXG_SWOL_2Vmsv5bZo';
const SALIDA = process.env.SALIDA || 'publico';
const INDEXNOW = '21d0949c7c846b177b3718de1a323f00'; // llave pública de IndexNow: el sitio la publica en /<llave>.txt y avisa a Bing cuando cambia una página
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
  ['Tecnología y celulares', 'Equipos y accesorios con su existencia, y órdenes de reparación con fecha de entrega.'],
  ['Streaming y suscripciones', 'Vencimientos, renovaciones y la cuenta o el perfil de cada cliente.'],
  ['Recargas de juegos', 'Una sección por juego en tu tienda en línea.'],
  ['Compras en línea', 'Pedidos por código, apartados y el seguimiento hasta la entrega.'],
  ['Vitaminas y suplementos', 'Presentaciones y fecha de vencimiento de cada producto.'],
  ['Joyería', 'Cada pieza con foto, precio y existencia, y tu catálogo en línea para recibir pedidos.'],
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
const COMUN = [['Vender y cobrar', 'Desde el celular, con recibo y varias formas de pago.'], ['Inventario', 'Sabes qué hay, qué se acaba y cuánto te costó.'], ['Caja y cierre', 'Abres, cierras y la caja te cuadra.'], ['Cuentas por cobrar', 'Quién te debe, cuánto, y su abono registrado.'], ['Reportes', '«¿Cómo me fue hoy?» te lo cuenta en palabras y números.'], ['Factura del SAR', 'Si tu negocio factura, cada venta sale con tu CAI, la numeración autorizada y el ISV desglosado.'], ['Tienda en línea', 'Tu catálogo en un enlace para que te hagan pedidos. Incluida en la prueba; después se activa aparte.']];
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
      // «ok: false» solo es normal cuando la tienda está cerrada o el enlace ya no existe; cualquier otro error es una falla del servidor
      else if (!j || !j.ok) { const er = String((j && j.error) || 'sin respuesta'); if (!/^TIENDA_CERRADA\||Este enlace de tienda no es válido/.test(er)) { fallas++; console.error('Tienda ' + x.id + ' con error del servidor: ' + er.slice(0, 120)); } }
    } catch (e) { fallas++; console.error('Tienda ' + x.id + ' omitida: ' + e.message); }
  }
  // Si el servidor falló con todas, o con la mitad o más, no se publica una página vacía o a medias: se conserva la anterior
  if (fallas && (!out.length || fallas * 2 >= lista.length)) throw new Error('El servidor falló con ' + fallas + ' de ' + lista.length + ' tiendas: no se actualiza la página');
  return out;
}

function preparar(crudas) {
  const reservados = new Set(['en', ...Object.values(GIROS).map(slug)]), usados = new Set();
  // La dirección de cada tienda se reparte siempre en el mismo orden (por código, o sea por antigüedad): dos tiendas con el
  // mismo nombre no se intercambian la dirección de una publicación a otra
  const slugDe = {};
  [...crudas].sort((a, b) => String(a.id) < String(b.id) ? -1 : 1).forEach(c => { let s = slug(c.info.negocio.nombre) || 'tienda'; if (reservados.has(s) || usados.has(s)) s = s + '-' + slug(c.id); usados.add(s); slugDe[c.id] = s; });
  return crudas.map(c => {
    const n = c.info.negocio, gs = [...new Set([n.gid, ...(n.giros || []).map(g => g.id)])].filter(g => GIROS[g]);
    const s = slugDe[c.id];
    // Ciudad: siempre con la misma forma («SAN PEDRO SULA» y «san pedro sula» son la misma); si no tiene letras («...») cuenta como sin ciudad
    let ciudad = titulo(String(n.dir.ciudad || '').toLowerCase()); if (!slug(ciudad)) ciudad = 'Honduras'; // sin ciudad escrita (negocios nuevos): aparece como «Honduras» hasta que la escriba
    return {
      id: String(c.id), visitas: c.visitas, slug: s, nombre: txt(n.nombre, 80) || 'Tienda', giros: gs.length ? gs : ['otro'], giroN: txt(n.giro, 60),
      ciudad, ciudadSlug: slug(ciudad), frase: txt(n.dir.frase, 80) || txt(n.eslogan, 80) || txt(n.sobre, 80),
      sobre: txt(n.sobre, 300), portada: fotoSrc(n.portada, 1400), portadaMini: fotoSrc(n.portada, 800), horario: txt(n.horario, 80), telefono: n.telefono, moneda: txt(n.moneda, 4) || 'L',
      entrega: n.entrega === 'domicilio' ? 'A domicilio' : n.entrega === 'recoger' ? 'Para recoger' : 'A domicilio y para recoger',
      pagos: (n.pagos || []).map(p => txt(p, 20)).filter(Boolean).join(' · '), direccion: txt(n.direccion, 120),
      productos: (c.info.productos || []).map(p => {
        const ps = p.vars ? Object.values(p.vars).map(v => num(v.p) || num(p.precio)) : [num(p.precio)];
        const desde = Math.min(...ps, num(p.precio)), max = Math.max(...ps, num(p.precio));
        return { nombre: txt(p.nombre, 90), cat: txt(p.sub || p.categoria, 40), foto: fotoSrc(p.foto), precio: p.vars ? desde : num(p.precio), desde: !!p.vars && desde < max,
          desc: txt(p.descripcion || p.desc, 400), agotado: !!p.agotado, nuevo: !!p.nuevo && !p.agotado, stock: p.stock, esp: num(p.precioEsp) > 0 && num(p.minEsp) > 1 ? { p: num(p.precioEsp), m: num(p.minEsp) } : null };
      })
    };
  }).filter(t => t.ciudad).sort((a, b) => b.visitas - a.visitas || a.nombre.localeCompare(b.nombre, 'es'));
}

/* ---------- piezas de página ---------- */
const CSS = readFileSync(new URL('./estilo.css', import.meta.url), 'utf8');
// La hoja de estilos va dentro de cada página: así no bloquea la primera pintura (PageSpeed)
const CSS_MIN = CSS.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s*\n\s*/g, '').replace(/\s*([{};:,>])\s*/g, '$1').replace(/;}/g, '}').replace(/<\/style/gi, '');
// Nombre e ícono del sitio en los buscadores: se declaran en la página de inicio (WebSite + Organization con logo)
const MARCA_LD = [
  { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Molina Soluciones Digitales', alternateName: ['Tiendas Catrachas', 'Molina Soluciones'], url: SITIO + '/' },
  { '@context': 'https://schema.org', '@type': 'Organization', name: 'Molina Soluciones Digitales', url: SITIO + '/', logo: SITIO + '/icono-512.png' }
];
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
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" type="image/png" sizes="96x96" href="/icono-96.png">
<link rel="icon" type="image/png" sizes="192x192" href="/icono-192.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preload" href="/fuentes/inter.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fuentes/playfair-700.woff2" as="font" type="font/woff2" crossorigin>
<style>${CSS_MIN}</style>
${ld ? jsonld(ld) : ''}${ruta === '/' ? jsonld(MARCA_LD) : ''}
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
<a class="portada" href="/tiendas/${esc(t.slug)}/" tabindex="-1" aria-hidden="true">${t.portada ? `<img src="${esc(t.portadaMini || t.portada)}" alt="${esc(t.nombre)}" loading="lazy">` : `<span>${iniciales(t.nombre)}</span>`}</a>
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
  try { var pq = new URLSearchParams(location.search).get('q'); if (q && pq) { q.value = pq; f(); } } catch (e) {}
})();
</script>`;

// Página propia por producto (solo los que tienen foto): la tarjeta lleva ahí; los demás siguen llevando a la tienda
const PAG_PROD = process.env.PAG_PROD !== '0'; // encendido desde 2026-11-21 (PAG_PROD=0 lo apaga)
function producto(t, p) {
  const et = p.agotado ? '<span class="et out">Agotado</span>' : p.stock !== undefined ? `<span class="et">${esc(String(Math.floor(num(p.stock))))} disp.</span>` : '';
  return `<a class="prod${p.agotado ? ' dis' : ''}" ${p.slug ? `href="/tiendas/${esc(t.slug)}/${esc(p.slug)}/"` : `href="${esc(linkTienda(t))}" data-ir="${idMedir(t)}"`}><div class="ph">${p.foto ? `<img src="${esc(p.foto)}" alt="${esc(p.nombre)}" loading="lazy">` : `<span>${iniciales(p.nombre)}</span>`}${p.nuevo ? '<span class="nw">Nuevo</span>' : ''}${et}</div>
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
  const nCiud = new Set(T.map(t => t.ciudadSlug)).size;
  // Portada ilustrada (marco con centro blanco): título y buscador dentro; en celular solo el nombre dentro del marco
  const portada = (h1, p, extra) => `<section class="hero portada"><div class="marco"><div class="portadas" id="portadas" aria-hidden="true">${PORTADAS.map((n, i) => `<div class="pt${i ? '' : ' on'}">${WEBP_P.has(n) ? `<img src="/portadas/${n}-1600.webp" srcset="/portadas/${n}-900.webp 900w, /portadas/${n}-1600.webp 1600w" sizes="(max-width:1190px) 100vw, 1160px" width="1600" height="900" alt="Ilustración de comercios y tradiciones de Honduras"${i ? ' loading="lazy"' : ' fetchpriority="high"'}>` : `<img src="/portadas/${n}.jpg" width="1600" height="900" alt="Ilustración de comercios y tradiciones de Honduras"${i ? ' loading="lazy"' : ' fetchpriority="high"'}>`}</div>`).join('')}</div><div class="hero-t"><span class="ceja">Tiendas <span class="sl">Catrachas</span></span><h1>${h1}</h1><p>${p}</p>${extra}</div><span class="pt-dato">${T.length} ${T.length === 1 ? 'tienda' : 'tiendas'} · ${nCiud} ${nCiud === 1 ? 'ciudad' : 'ciudades'}</span></div>${PORTADAS.length > 1 ? `<div class="pt-dots" id="pt-dots">${PORTADAS.map((n, i) => `<button type="button" class="${i ? '' : 'on'}" aria-label="Ver portada ${i + 1}"></button>`).join('')}</div>` : ''}</section>
<script>(function () { var s = [].slice.call(document.querySelectorAll('#portadas .pt')), d = [].slice.call(document.querySelectorAll('#pt-dots button')), i = 0, t = 0; if (s.length < 2) return;
  function ir(n) { i = (n + s.length) % s.length; s.forEach(function (e, k) { e.classList.toggle('on', k === i); }); d.forEach(function (e, k) { e.classList.toggle('on', k === i); }); }
  function auto() { clearInterval(t); if (!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) t = setInterval(function () { ir(i + 1); }, 5000); }
  d.forEach(function (e, k) { e.addEventListener('click', function () { ir(k); auto(); }); }); auto(); })();</script>`;
  const urls = ['/'];
  const FAQ_DIR = [['¿Cómo hago un pedido?', 'Entra a la tienda que te interesa, elige tus productos y envía el pedido. El negocio lo recibe en su programa y te atiende directamente.'],
    ['¿Cómo se paga?', 'Cada negocio define sus formas de pago, por ejemplo efectivo o transferencia. Las ves en su página antes de pedir.'],
    ['¿Quién entrega mi pedido?', 'El negocio al que le compras. Cada uno indica si entrega a domicilio, si es para recoger o las dos.'],
    ['¿Tiendas Catrachas vende los productos?', 'No. Es un directorio: cada tienda es de su dueño, que es quien responde por sus productos, precios y entregas.'],
    ['¿Cómo hago para que mi negocio aparezca aquí?', 'Si usas Gestión de Negocio VM, enciende «Aparecer en Tiendas Catrachas» dentro del programa. Si ya tienes tu tienda en otro lado, puedes aparecer por L 150 al mes: toca «Aparece aquí», llena el formulario y te contactamos en 48 horas.']];

  // Portada del directorio
  poner('/tiendas/', pagina({ ruta: '/tiendas/', medir: 'tc-dir', title: 'Tiendas Catrachas · Tiendas en línea de Honduras', desc: 'Tiendas en línea de negocios de Honduras: mira su catálogo, compra por internet y haz tu pedido directo con el negocio, a domicilio o para recoger.',
    ld: listaLd('Tiendas Catrachas', T),
    cuerpo: `${portada('Tiendas en línea de Honduras', 'Negocios catrachos con su tienda en línea. Mira el catálogo y haz tu pedido directo con el negocio, a domicilio o para recoger.', buscador)}
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
    // Direcciones de los productos con foto: por nombre; si dos se llaman igual, el segundo lleva número
    if (PAG_PROD) { const usados = new Set(); ps.forEach(p => { if (!p.foto) return; let b = slug(p.nombre) || 'producto', k = b, i = 2; while (usados.has(k)) k = b + '-' + (i++); usados.add(k); p.slug = k; }); }
    const desc = txt(`${t.frase || gn + ' en ' + t.ciudad}. Pide desde tu celular y coordina la entrega directo con el negocio.`, 160);
    const datos = [['Horario', t.horario], ['Entrega', t.entrega], ['Formas de pago', t.pagos], ['Dirección', t.direccion]].filter(x => x[1]);
    poner(`/tiendas/${t.slug}/`, pagina({ ruta: `/tiendas/${t.slug}/`, medir: 'tc-t-' + idMedir(t), title: `${t.nombre} · ${gn} en ${t.ciudad}`, desc, img: t.portada,
      ld: { '@context': 'https://schema.org', '@type': 'Store', name: t.nombre, description: desc, url: SITIO + '/tiendas/' + t.slug + '/', ...(t.portada && /^https:/.test(t.portada) ? { image: t.portada } : {}),
        address: { '@type': 'PostalAddress', ...(t.ciudad !== 'Honduras' ? { addressLocality: t.ciudad } : {}), addressCountry: 'HN', ...(t.direccion ? { streetAddress: t.direccion } : {}) } },
      cuerpo: `<section class="cont ficha">${migas([['Tiendas', '/tiendas/'], [gn, `/tiendas/${gs}/`], [t.ciudad, `/tiendas/${gs}/${t.ciudadSlug}/`]])}
<div class="portada-f">${t.portada ? `<img src="${esc(t.portada)}" alt="${esc(t.nombre)}" fetchpriority="high">` : `<span>${iniciales(t.nombre)}</span>`}</div>
<h1>${esc(t.nombre)}</h1><p class="meta">${esc(gn)} · ${esc(t.ciudad)}</p>
${t.frase ? `<p class="intro">${esc(t.frase)}</p>` : ''}${t.sobre && t.sobre !== t.frase ? `<p class="sobre">${esc(t.sobre)}</p>` : ''}
<div class="acciones"><a class="btn grande" href="${esc(linkTienda(t))}" data-ir="${idMedir(t)}">Entrar a la tienda</a>${wa ? `<a class="btn linea" href="${esc(wa)}" rel="nofollow noopener">Escribir por WhatsApp</a>` : ''}</div>
${datos.length ? `<dl class="datos">${datos.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
${ps.length ? `<h2 class="sub">Productos</h2><div class="prods">${ps.map(p => producto(t, p)).join('\n')}</div>${t.productos.length > ps.length ? `<p class="mas"><a class="btn linea" href="${esc(linkTienda(t))}" data-ir="${idMedir(t)}">Ver los ${t.productos.length} productos en la tienda</a></p>` : ''}` : ''}
<div class="caja-l"><h2>Más en ${esc(t.ciudad)}</h2><a href="/tiendas/${gs}/${esc(t.ciudadSlug)}/">${esc(gn)} en ${esc(t.ciudad)}</a><a href="/tiendas/en/${esc(t.ciudadSlug)}/">Todas las tiendas de ${esc(t.ciudad)}</a></div>
<p class="hecho">Tienda creada con Gestión de Negocio VM · <a href="${esc(TIENDA_URL)}?src=catrachas">Crea la tuya</a></p></section>` }));
    urls.push(`/tiendas/${t.slug}/`);
    ps.filter(p => p.slug).forEach(p => {
      const ruta = `/tiendas/${t.slug}/${p.slug}/`, precio = `${t.moneda} ${fmtN(p.precio)}`, donde = t.ciudad !== 'Honduras' ? t.ciudad : 'Honduras';
      const pd = txt(`${p.nombre} en ${donde}: ${p.desde ? 'desde ' : ''}${precio} en ${t.nombre}. ${p.desc || 'Pídelo desde tu celular y coordina la entrega directo con el negocio.'}`, 160);
      const otros = ps.filter(x => x !== p && (!p.cat || x.cat === p.cat)).concat(ps.filter(x => x !== p && p.cat && x.cat !== p.cat)).slice(0, 6);
      const filas = [['Precio', (p.desde ? 'desde ' : '') + precio], ...(p.esp ? [['Por cantidad', `${t.moneda} ${fmtN(p.esp.p)} desde ${p.esp.m} piezas`]] : []), ['Disponibilidad', p.agotado ? 'Agotado' : 'Disponible'], ['Entrega', t.entrega], ['Formas de pago', t.pagos], ['Lo vende', t.nombre + ' · ' + donde]].filter(x => x[1]);
      poner(ruta, pagina({ ruta, medir: 'tc-p-' + idMedir(t), title: `${p.nombre} en ${donde} · ${t.nombre}`, desc: pd, img: p.foto,
        ld: { '@context': 'https://schema.org', '@type': 'Product', name: p.nombre, ...(p.desc ? { description: p.desc } : {}), ...(/^https:/.test(p.foto) ? { image: p.foto } : {}), ...(p.cat ? { category: p.cat } : {}),
          offers: { '@type': 'Offer', price: p.precio, priceCurrency: 'HNL', availability: 'https://schema.org/' + (p.agotado ? 'OutOfStock' : 'InStock'), url: SITIO + ruta, seller: { '@type': 'Store', name: t.nombre, url: SITIO + '/tiendas/' + t.slug + '/' } } },
        cuerpo: `<section class="cont ficha pprod">${migas([['Tiendas', '/tiendas/'], [gn, `/tiendas/${gs}/`], [t.nombre, `/tiendas/${t.slug}/`], [p.nombre]])}
<div class="pp"><div class="pp-f"><img src="${esc(p.foto)}" alt="${esc(p.nombre)}" fetchpriority="high">${p.nuevo ? '<span class="nw">Nuevo</span>' : ''}</div>
<div class="pp-d">${p.cat ? `<div class="cat">${esc(p.cat)}</div>` : ''}<h1>${esc(p.nombre)}</h1><p class="pp-pr">${p.desde ? '<small>desde </small>' : ''}${esc(t.moneda)}&nbsp;${fmtN(p.precio)}</p>
<p class="meta">Lo vende <a href="/tiendas/${esc(t.slug)}/">${esc(t.nombre)}</a> · ${esc(gn)} en ${esc(donde)}</p>
${p.desc ? `<p class="sobre">${esc(p.desc)}</p>` : ''}
<div class="acciones"><a class="btn grande" href="${esc(linkTienda(t))}" data-ir="${idMedir(t)}">${p.agotado ? 'Ver la tienda' : 'Pedir en la tienda'}</a>${wa ? `<a class="btn linea" href="${esc(wa)}" rel="nofollow noopener">Preguntar por WhatsApp</a>` : ''}</div></div></div>
<dl class="datos">${filas.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
${otros.length ? `<h2 class="sub">Más de ${esc(t.nombre)}</h2><div class="prods">${otros.map(x => producto(t, x)).join('\n')}</div><p class="mas"><a class="btn linea" href="/tiendas/${esc(t.slug)}/">Ver toda la tienda</a></p>` : ''}
<p class="hecho">Tienda creada con Gestión de Negocio VM · <a href="${esc(TIENDA_URL)}?src=catrachas">Crea la tuya</a></p></section>` }));
      urls.push(ruta);
    });
  });

  archivos['/tiendas/estilo.css'] = CSS;
  for (const n of PORTADAS) { archivos[`/portadas/${n}.jpg`] = readFileSync(new URL(`./portadas/${n}.jpg`, import.meta.url)); if (WEBP_P.has(n)) for (const w of [900, 1600]) archivos[`/portadas/${n}-${w}.webp`] = readFileSync(new URL(`./portadas/${n}-${w}.webp`, import.meta.url)); }
  archivos['/fondo.webp'] = readFileSync(new URL('./fondo.webp', import.meta.url));
  archivos['/fondo.jpg'] = readFileSync(new URL('./fondo.jpg', import.meta.url)); // fondo de dibujos de la cultura hondureña (color reducido)
  archivos['/medir.js'] = readFileSync(new URL('./medir.js', import.meta.url));
  archivos['/' + INDEXNOW + '.txt'] = INDEXNOW + '\n'; // llave de IndexNow (ver indexnow.mjs)
  archivos['/robots.txt'] = `User-agent: *\nAllow: /\nSitemap: ${SITIO}/sitemap.xml\n`;
  archivos['/CNAME'] = 'molinasoluciones.com\n';
  archivos['/compartir.png'] = readFileSync(new URL('./compartir.png', import.meta.url));
  // Ícono del sitio (sello de la marca): el buscador y la pestaña lo toman de la raíz
  for (const f of readdirSync(new URL('./iconos/', import.meta.url))) archivos['/' + f] = readFileSync(new URL('./iconos/' + f, import.meta.url));
  for (const f of readdirSync(new URL('./fuentes/', import.meta.url))) archivos['/fuentes/' + f] = readFileSync(new URL('./fuentes/' + f, import.meta.url));
  for (const f of readdirSync(new URL('./pantallas/', import.meta.url))) archivos['/pantallas/' + f] = readFileSync(new URL('./pantallas/' + f, import.meta.url));
  archivos['/404.html'] = pagina({ ruta: '/404.html', title: 'Página no encontrada · Tiendas Catrachas', desc: 'Esta página ya no existe.', cuerpo: `<section class="cont"><h1>Esta página ya no existe</h1><p class="intro">Puede que la tienda haya dejado de aparecer aquí.</p><p><a class="btn" href="/tiendas/">Ver todas las tiendas</a></p></section>` });
  // Páginas para dueños de negocio (una por tipo de negocio) y su índice
  const prob = esc(TIENDA_URL) + '?src=sitio';
  const FAQ_PRG = [['¿Puedo probarlo gratis?', 'Sí. La prueba dura 7 días e incluye la tienda en línea.'], ['¿Funciona en el celular?', 'Sí. Se usa desde el celular y también desde una computadora.'],
    ['¿Trae tienda en línea?', 'Sí. Va incluida en la prueba y después se activa aparte.'], ['¿Cuánto cuesta y cómo se paga?', 'Te damos el precio según lo que necesite tu negocio. Puedes pagarlo en un solo pago o con un arreglo de pagos. Escríbenos por WhatsApp y lo vemos contigo.']];
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
      vm: 'Tu catálogo sale de los mismos productos que ya tienes en el programa, con sus fotos y existencias. Los pedidos te llegan al programa con aviso al teléfono, el cliente ve los suyos en «Mis pedidos» y puede mandarte la foto del comprobante de transferencia. Además, tu tienda puede aparecer en Tiendas Catrachas. La tienda en línea va incluida en la prueba y después se activa aparte.' },
    { s: 'como-llevar-el-inventario-de-tu-negocio', t: 'Cómo llevar el inventario de tu negocio desde el celular', d: 'Un método sencillo para controlar existencias, saber qué se acaba y cuánto te costó cada producto, sin cuadernos ni hojas de cálculo.',
      i: 'Llevar inventario no es contar por contar: es saber qué tienes, qué se está acabando y cuánto dinero tienes detenido en producto.',
      p: [['Registra cada producto una sola vez', 'Nombre, categoría, precio de venta y costo. Sin el costo no puedes saber cuánto ganas.'],
        ['Anota la existencia inicial', 'Cuenta lo que hay hoy y empieza desde ahí. No hace falta reconstruir el pasado.'],
        ['Registra las entradas', 'Cada compra a tu proveedor suma existencia. Anótala el mismo día, con su costo.'],
        ['Deja que las ventas descuenten solas', 'Si cada venta se registra, la existencia baja sin que tengas que restar a mano. Ahí es donde un cuaderno se queda corto.'],
        ['Fija un mínimo por producto', 'Decide con cuántas unidades quieres que te avise para volver a comprar antes de quedarte sin nada.'],
        ['Cuenta de vez en cuando', 'Una vez al mes compara lo que dice el sistema con lo que hay en el estante y ajusta la diferencia.']],
      vm: 'Cada venta descuenta la existencia y cada compra la suma. Le pones a cada producto su mínimo y el programa te avisa lo que está por agotarse. Si vendes por tallas, colores o tonos, lleva la existencia de cada uno.' },
    { s: 'como-controlar-las-ventas-al-credito', t: 'Cómo controlar las ventas al crédito de tu negocio', d: 'Cómo llevar las cuentas por cobrar de tus clientes: quién te debe, cuánto, sus abonos y cómo recordarles el pago sin perder al cliente.',
      i: 'Vender al crédito ayuda a vender más, pero sin control se convierte en dinero perdido. La clave es que cada deuda y cada abono queden anotados el mismo día.',
      p: [['Decide a quién le das crédito', 'No a todos. Empieza por clientes que conoces y ponle a cada uno un límite.'],
        ['Anota la venta en el momento', 'Fecha, cliente, qué llevó y cuánto quedó debiendo. Lo que se deja para después se olvida.'],
        ['Registra cada abono', 'Con fecha y monto, y entrégale al cliente su comprobante. Así no hay discusiones sobre el saldo.'],
        ['Revisa la lista cada semana', 'Mira quién lleva más tiempo sin abonar y cuánto suma todo lo que te deben.'],
        ['Recuerda el pago con respeto', 'Un mensaje corto con el saldo y la fecha funciona mejor que una llamada incómoda.']],
      vm: 'Cada cliente tiene su cuenta con lo que debe, sus abonos y su límite de crédito. Le entregas el comprobante de cada abono, ves el total por cobrar y puedes mandarle un recordatorio por WhatsApp con su saldo.' },
    { s: 'como-hacer-el-cierre-de-caja', t: 'Cómo hacer el cierre de caja de tu negocio', d: 'Los pasos para abrir y cerrar caja cada día y que el efectivo cuadre con las ventas, los gastos y los abonos.',
      i: 'El cierre de caja responde una sola pregunta: ¿el dinero que hay coincide con lo que debería haber? Hacerlo todos los días evita que un faltante pequeño se vuelva grande.',
      p: [['Abre la caja con un monto fijo', 'Anota con cuánto efectivo empiezas el día. Sin ese dato no hay con qué comparar.'],
        ['Registra todo lo que entra', 'Ventas en efectivo, abonos de clientes y cualquier otro ingreso, separados de las ventas por transferencia o tarjeta.'],
        ['Registra todo lo que sale', 'Gastos, pagos a proveedores y retiros. Un gasto sin anotar es un faltante al final del día.'],
        ['Cuenta el efectivo', 'Al cerrar, cuenta billetes y monedas y compáralo con lo que debería haber: apertura más entradas menos salidas.'],
        ['Anota la diferencia', 'Si sobra o falta, déjalo escrito con el motivo. Con el tiempo verás si es un error que se repite.']],
      vm: 'Abres la caja, vendes y registras gastos durante el día, y al cerrar el programa te dice cuánto debería haber para que lo compares con lo que contaste.' },
    // Guías con ejemplo en lempiras (ej), errores comunes (er) y preguntas frecuentes (fq): son opcionales
    { s: 'como-calcular-el-precio-de-venta', t: 'Cómo calcular el precio de venta de un producto', d: 'Cómo poner el precio de lo que vendes a partir de su costo y de la ganancia que quieres, con un ejemplo en lempiras y los errores más comunes.',
      i: 'Poner precios «al tanteo» es la forma más rápida de trabajar mucho y ganar poco. El precio sale de dos datos: cuánto te cuesta el producto puesto en tu negocio y qué parte de cada venta quieres que te quede.',
      p: [['Saca el costo completo', 'No es solo lo que pagaste al proveedor. Suma el flete, el empaque, la bolsa o la etiqueta y repártelo entre las unidades que compraste.'],
        ['Decide tu margen', 'El margen es la parte del precio que te queda de ganancia. Un producto que se vende rápido aguanta un margen menor; uno que tarda en salir necesita uno mayor.'],
        ['Aplica la fórmula', 'Precio de venta = costo ÷ (1 − margen). Con un margen de 40 %, divides el costo entre 0.60.'],
        ['Compara con la competencia', 'Si tu precio queda muy arriba de lo que cobra el negocio de la par, revisa si puedes comprar más barato o si ofreces algo que justifique la diferencia.'],
        ['Redondea a un precio fácil de cobrar', 'L 98.33 no es un precio. Súbelo a L 100 o bájalo a L 95, pero que no te obligue a buscar monedas.'],
        ['Revísalo cuando cambie el costo', 'Si el proveedor sube el precio y tú no, la diferencia sale de tu ganancia. Revisa tus precios cada vez que compres.']],
      ej: ['Ejemplo: una blusa que compraste por docena', [['Docena de blusas', 'L 660'], ['Flete y bolsas', 'L 60'], ['Costo de cada blusa (L 720 ÷ 12)', 'L 60'], ['Margen que quieres', '40 %'], ['Precio de venta (L 60 ÷ 0.60)', 'L 100'], ['Ganancia por blusa', 'L 40']]],
      er: [['Sumarle 40 % al costo y creer que ganas 40 %', 'L 60 más 40 % da L 84. Ahí tu ganancia es L 24, que es el 28.6 % del precio y no el 40 %. Sumar sobre el costo y ganar sobre el precio son cuentas distintas.'],
        ['Olvidar el flete y el empaque', 'Si no los metes al costo, los pagas tú de tu ganancia en cada venta.'],
        ['Copiar el precio del vecino', 'Su costo no es el tuyo. Puede comprar más barato que tú o puede estar perdiendo sin saberlo.'],
        ['Dar descuentos sin hacer la cuenta', 'Con margen de 40 %, un descuento de 10 % te quita la cuarta parte de la ganancia de esa venta.']],
      fq: [['¿Qué margen es bueno para un negocio?', 'Depende de lo que vendes y de qué tan rápido se vende. Lo importante es que el total de tus márgenes alcance para pagar los gastos del negocio (alquiler, luz, sueldos) y que todavía te quede ganancia.'],
        ['¿Cuál es la diferencia entre margen y ganancia?', 'La ganancia es una cantidad de dinero: precio menos costo. El margen es esa ganancia dicha como parte del precio. Una blusa de L 100 que te costó L 60 deja L 40 de ganancia y 40 % de margen.'],
        ['¿Cómo calculo el precio si vendo al por mayor y al detalle?', 'Con la misma fórmula y dos márgenes: uno menor para quien compra por cantidad y otro mayor para quien compra una unidad. Revisa que el precio de mayoreo siga dejando ganancia.'],
        ['¿Cada cuánto debo revisar mis precios?', 'Cada vez que compres mercadería y el costo haya cambiado. Si pasa mucho tiempo sin que revises, lo normal es que tu ganancia se haya ido achicando.']],
      vm: 'A cada producto le escribes su costo y su precio de venta. En cada venta el programa calcula la ganancia, y en «¿Cómo me fue hoy?» ves lo vendido, el costo y lo que ganaste en el día, sin sacar cuentas a mano.' },
    { s: 'como-saber-cuanto-gana-tu-negocio', t: 'Cómo saber cuánto gana tu negocio', d: 'Vender mucho no es lo mismo que ganar. Cómo sacar la ganancia real de tu negocio en el mes: ventas, costo de lo vendido y gastos, con un ejemplo en lempiras.',
      i: 'Muchos negocios venden todos los días y aun así no saben si ganan. La cuenta es corta: a lo que vendiste le quitas lo que te costó la mercadería y después los gastos de tener el negocio abierto. Lo que queda es tu ganancia.',
      p: [['Suma lo que vendiste', 'Todas las ventas del mes, en efectivo, por transferencia y al crédito. Esto es lo que entra, no lo que ganas.'],
        ['Réstale el costo de lo vendido', 'Lo que te costó la mercadería que salió, no todo lo que compraste. Lo que sigue en el estante todavía no es costo: es inventario.'],
        ['Réstale los gastos del negocio', 'Alquiler, luz, agua, internet, sueldos, transporte y empaques. Son los pagos que haces vendas mucho o poco.'],
        ['Ponte un sueldo', 'Si trabajas en tu negocio, tu sueldo es un gasto más. Si no lo cuentas, la ganancia que ves es más grande que la real.'],
        ['Separa el dinero del negocio del de la casa', 'Lo que sacas de la caja para la casa sin anotarlo no aparece en ninguna cuenta, pero sí falta al final del mes.'],
        ['Haz la cuenta cada mes', 'Un mes solo no dice mucho. Tres meses seguidos te muestran si el negocio va mejorando o se está comiendo el capital.']],
      ej: ['Ejemplo: un mes de una tienda pequeña', [['Ventas del mes', 'L 60,000'], ['Costo de lo vendido', 'L 39,000'], ['Queda para cubrir gastos', 'L 21,000'], ['Alquiler, luz, agua e internet', 'L 8,000'], ['Sueldo de un ayudante', 'L 6,000'], ['Ganancia del mes', 'L 7,000']]],
      er: [['Creer que lo que hay en la caja es ganancia', 'En la caja también está el dinero para volver a comprar mercadería y para pagar los gastos. Si lo gastas como ganancia, el negocio se queda sin producto.'],
        ['Contar como costo todo lo que compraste', 'Si compraste L 50,000 y vendiste la mitad, tu costo del mes es la mitad. El resto sigue siendo tuyo, en el estante.'],
        ['Olvidar los gastos pequeños', 'Bolsas, recargas, pasajes y propinas parecen poco, pero sumados al mes pueden ser un pago más de alquiler.'],
        ['No contar lo que te deben', 'Una venta al crédito ya es venta, pero ese dinero todavía no entró. Lleva aparte lo que tienes por cobrar.']],
      fq: [['¿Cuál es la diferencia entre ventas y ganancia?', 'Las ventas son todo lo que cobraste. La ganancia es lo que queda después de quitar lo que costó la mercadería y los gastos del negocio. Un negocio puede vender mucho y ganar poco.'],
        ['¿Qué es el costo de lo vendido?', 'Lo que pagaste por los productos que salieron en el período. Si vendiste 10 blusas que te costaron L 60 cada una, el costo de lo vendido es L 600, sin importar cuántas compraste.'],
        ['¿Cómo sé si mi negocio está perdiendo dinero?', 'Si después de restar costo y gastos el resultado es negativo varios meses seguidos, o si cada vez tienes menos mercadería y menos efectivo, el negocio está gastando su capital.'],
        ['¿Cada cuánto debo sacar la ganancia?', 'Una vez al mes es suficiente para decidir. Mirar la ganancia de cada día ayuda a detectar pronto un problema, pero un solo día no dice cómo va el negocio.']],
      vm: 'El programa guarda el costo de cada producto y lo resta en cada venta. En «¿Cómo me fue hoy?» ves lo vendido, el costo y la ganancia del día, de la semana o del mes, y en Reportes tienes el de ganancias. Los gastos los registras en el mismo programa.' },
    { s: 'como-vender-por-whatsapp-con-catalogo', t: 'Cómo vender por WhatsApp con un catálogo', d: 'Cómo dejar de mandar fotos una por una: arma un catálogo con precios, comparte un solo enlace y lleva el control de los pedidos que llegan por WhatsApp.',
      i: 'Vender por WhatsApp funciona, pero mandar cada foto y cada precio a mano te quita el día. Con un catálogo, el cliente ve todo en un enlace y te escribe cuando ya sabe qué quiere.',
      p: [['Reúne tus productos en un solo lugar', 'Nombre, precio y foto de cada uno. Ordénalos por categoría para que el cliente encuentre rápido lo que busca.'],
        ['Pon siempre el precio', '«Precio al privado» hace que muchos clientes no pregunten. Con el precio a la vista, quien te escribe ya viene decidido.'],
        ['Comparte un enlace, no cien fotos', 'Pon el enlace del catálogo en tu estado, en la descripción de tu perfil y en tu respuesta de bienvenida.'],
        ['Di cómo se paga y cómo se entrega', 'Antes de que pregunten: formas de pago, zonas de entrega, costo de envío y horario.'],
        ['Anota cada pedido', 'Un pedido que solo vive en el chat se pierde entre mensajes. Regístralo con cliente, productos, total y estado.'],
        ['Avisa en cada paso', 'Confirma que recibiste el pedido, avisa cuando está listo y cuando va en camino. Eso es lo que hace que el cliente vuelva.']],
      er: [['Mandar el catálogo como un montón de fotos', 'Las fotos se pierden en el chat y quedan viejas cuando cambias un precio. Un enlace siempre muestra lo actual.'],
        ['Ofrecer lo que ya no tienes', 'Nada molesta más al cliente que pedir algo y que le digan que se acabó. El catálogo debe mostrar solo lo que hay.'],
        ['Tardar horas en responder', 'El cliente de WhatsApp le escribe a varios negocios a la vez. Suele comprar donde le contestan primero.'],
        ['No guardar el número del cliente', 'Sin el contacto no puedes avisarle cuando llega mercadería nueva ni saber qué te ha comprado.']],
      fq: [['¿Necesito WhatsApp Business para vender?', 'No es obligatorio, pero ayuda: te deja poner horario, dirección, mensaje de bienvenida y respuestas rápidas. Puedes usarlo con el mismo número de tu negocio.'],
        ['¿Qué es mejor, un catálogo o una tienda en línea?', 'Un catálogo muestra los productos. Una tienda en línea además deja que el cliente arme su pedido y te lo envíe completo, sin que tengas que tomarlo mensaje por mensaje.'],
        ['¿Cómo recibo el pago de un pedido por WhatsApp?', 'Lo más usado es efectivo contra entrega, transferencia bancaria o billetera electrónica. Pide la foto del comprobante antes de despachar cuando el pago no es en efectivo.'],
        ['¿Una tienda en línea vende sola?', 'No. Es una herramienta: los pedidos llegan cuando compartes tu enlace con constancia en tus estados, redes y con tus clientes de siempre.']],
      vm: 'Tu tienda en línea se arma con los productos que ya tienes en el programa, con fotos, precios y existencias. Compartes un solo enlace por WhatsApp, el cliente arma su pedido y te llega al programa con aviso al teléfono. También puedes registrar a mano los pedidos que te hacen por chat o en persona. La tienda en línea va incluida en la prueba y después se activa aparte.' },
    { s: 'como-llevar-el-control-de-gastos-de-un-negocio', t: 'Cómo llevar el control de gastos de un negocio', d: 'Un método sencillo para anotar los gastos de tu negocio, separarlos de los de la casa y saber cuánto necesitas vender cada día solo para cubrirlos.',
      i: 'Los gastos no avisan: se van de a poco y al final del mes no sabes en qué se fue el dinero. Anotarlos el mismo día es lo único que te deja ver cuánto cuesta de verdad tener el negocio abierto.',
      p: [['Anota cada gasto el mismo día', 'Fecha, monto y en qué fue. Lo que dejas para el fin de semana ya no lo recuerdas completo.'],
        ['Sepáralos por tipo', 'Alquiler, servicios, sueldos, transporte, empaques y otros. Así ves cuál es el que más pesa.'],
        ['No mezcles la casa con el negocio', 'La comida, la colegiatura o el recibo de la casa no son gastos del negocio. Si salen de la caja, anótalos como retiro tuyo.'],
        ['Distingue gasto de compra de mercadería', 'Comprar producto para vender no es gasto: es inventario que vuelve cuando lo vendes. Gasto es lo que no vuelve.'],
        ['Suma el mes y divídelo por día', 'Ese número es lo que tu negocio debe ganar cada día, después del costo de la mercadería, solo para no perder.'],
        ['Revisa qué puedes bajar', 'Con la lista a la vista, casi siempre aparece un gasto que se puede reducir o negociar.']],
      ej: ['Ejemplo: los gastos de un mes', [['Alquiler del local', 'L 5,000'], ['Luz y agua', 'L 1,500'], ['Internet y recargas', 'L 700'], ['Transporte y fletes', 'L 1,800'], ['Bolsas y empaques', 'L 600'], ['Total del mes', 'L 9,600'], ['Por día (L 9,600 ÷ 30)', 'L 320']]],
      er: [['Pagar gastos con el dinero de las ventas sin anotarlos', 'Al cerrar la caja falta dinero y no sabes si fue un gasto, un error en un cambio o algo peor.'],
        ['Confundir gasto con inversión en mercadería', 'Si cuentas las compras de producto como gasto, parece que el negocio pierde cuando en realidad tiene el dinero en el estante.'],
        ['Anotar solo los gastos grandes', 'El alquiler no se te olvida. Los que se pierden son los de L 50 y L 100, y son los que más se repiten.'],
        ['No guardar los recibos', 'Sin recibo no puedes revisar después cuánto fue ni reclamar un cobro equivocado.']],
      fq: [['¿Qué se considera gasto en un negocio?', 'Todo pago necesario para operar que no es mercadería para vender: alquiler, servicios, sueldos, transporte, empaques, mantenimiento y publicidad.'],
        ['¿Cuál es la diferencia entre costo y gasto?', 'El costo es lo que pagas por el producto que vendes. El gasto es lo que pagas por tener el negocio funcionando, vendas o no vendas.'],
        ['¿Cómo saco cuánto debo vender para cubrir mis gastos?', 'Divide tus gastos del mes entre tu margen. Con gastos de L 9,600 y un margen de 30 %, necesitas vender L 32,000 al mes solo para cubrirlos.'],
        ['¿Debo anotar lo que saco para mi casa?', 'Sí, pero aparte, como retiro del dueño. No es un gasto del negocio, pero si no lo anotas la caja no te va a cuadrar.']],
      vm: 'Registras cada gasto en el momento, desde el celular. El gasto se descuenta de la caja del día, así el cierre te cuadra, y «¿Cómo me fue hoy?» te dice cuánto pagaste en gastos y cuánto te quedó de ganancia.' },
    { s: 'como-administrar-una-pulperia', t: 'Cómo administrar una pulpería', d: 'Lo básico para que una pulpería deje ganancia: precios con margen, inventario que no se acaba, ventas al crédito con control y caja cuadrada cada día.',
      i: 'Una pulpería mueve muchos productos de poco margen. Por eso los descuidos pequeños pesan tanto: un precio mal puesto o una cuenta sin cobrar se comen la ganancia de muchas ventas.',
      p: [['Ponle precio a todo con su margen', 'Saca el costo de cada producto por unidad y decide cuánto le ganas. Lo que se vende mucho puede llevar menos margen; lo que tarda, más.'],
        ['Compra según lo que se vende', 'Revisa qué sale cada semana antes de ir al proveedor. Comprar de más amarra tu dinero en productos que se pueden vencer.'],
        ['Cuida lo que se vence', 'Pon adelante lo más antiguo y revisa fechas cada semana. Un producto vencido es pérdida completa.'],
        ['Controla lo que das al crédito', 'Anota cada venta al crédito en el momento, con el nombre del cliente, y ponle un límite a cada uno.'],
        ['Cuadra la caja todos los días', 'Empieza con un monto fijo, anota lo que sale y al cerrar compara lo que hay con lo que debería haber.'],
        ['Separa tu dinero del de la pulpería', 'Lo que tomas para la casa, anótalo. Si no, la pulpería parece que no deja nada cuando en realidad lo estás consumiendo.']],
      ej: ['Ejemplo: una caja de refrescos', [['Caja de 24 refrescos', 'L 432'], ['Costo de cada uno (L 432 ÷ 24)', 'L 18'], ['Precio de venta', 'L 22'], ['Ganancia por refresco', 'L 4'], ['Ganancia por caja (L 4 × 24)', 'L 96']]],
      er: [['Vender al crédito sin anotar', 'La memoria falla y el cliente siempre recuerda menos de lo que debe. Sin anotación no hay cómo cobrar.'],
        ['Consumir de la pulpería sin registrarlo', 'Lo que la familia toma del estante también costó dinero. Si no se anota, el inventario nunca cuadra.'],
        ['No subir el precio cuando sube el proveedor', 'Si el costo sube y el precio no, cada venta deja menos hasta que deja de dejar.'],
        ['Tener el dinero amarrado en producto lento', 'Diez productos que casi no se venden ocupan el dinero que necesitas para los que se acaban cada semana.']],
      fq: [['¿Cuánto se le gana a los productos de una pulpería?', 'Varía por producto. Los de consumo diario suelen dejar poco por unidad y se compensan con cantidad; otros dejan más pero se venden menos. Lo importante es conocer el margen de cada uno.'],
        ['¿Cómo llevo el inventario de una pulpería?', 'Registra cada producto con su costo y precio, anota las compras al proveedor y deja que cada venta descuente la existencia. Cuenta el estante una vez al mes para corregir diferencias.'],
        ['¿Conviene vender al crédito en una pulpería?', 'Ayuda a vender más, pero solo con control: clientes conocidos, un límite para cada uno y cada venta anotada el mismo día.'],
        ['¿Puedo llevar la pulpería desde el celular?', 'Sí. Un programa de ventas e inventario en el celular reemplaza el cuaderno: registra ventas, existencias, cuentas por cobrar y la caja.']],
      vm: 'Eliges «Tienda o pulpería» al crear tu cuenta y el programa viene preparado para ese tipo de negocio. Cada venta descuenta la existencia, te avisa de lo que está por agotarse, lleva la cuenta de cada cliente al crédito con su límite y al cerrar la caja te dice cuánto debería haber.' },
    { s: 'como-hacer-un-arqueo-de-caja', t: 'Cómo hacer un arqueo de caja', d: 'Qué es un arqueo de caja, en qué se diferencia del cierre y cómo hacerlo paso a paso, con un ejemplo en lempiras y qué hacer cuando sobra o falta dinero.',
      i: 'Un arqueo de caja es contar el efectivo y compararlo con lo que debería haber según lo anotado. Se puede hacer en cualquier momento del día; cuando se hace al terminar la jornada se le llama cierre de caja.',
      p: [['Ten a mano con cuánto se abrió', 'El monto inicial de la caja es el punto de partida. Sin él no hay contra qué comparar.'],
        ['Suma lo que entró en efectivo', 'Ventas en efectivo y abonos de clientes. Las ventas por transferencia o tarjeta no están en la gaveta: van aparte.'],
        ['Resta lo que salió', 'Gastos pagados, pagos a proveedores y retiros. Cada salida debe tener su anotación o su recibo.'],
        ['Cuenta el efectivo', 'Billetes por denominación y luego las monedas. Cuenta dos veces si el monto es grande.'],
        ['Compara los dos números', 'Lo que debería haber contra lo que contaste. Si coinciden, la caja cuadra.'],
        ['Deja escrita la diferencia', 'Si sobra o falta, anota cuánto, la fecha y quién estaba en caja. Así puedes ver si se repite.']],
      ej: ['Ejemplo: arqueo a las 6 de la tarde', [['Apertura de caja', 'L 500'], ['Ventas en efectivo', 'L 3,200'], ['Abonos de clientes', 'L 400'], ['Gastos pagados', '− L 350'], ['Pago a proveedor', '− L 1,000'], ['Debería haber', 'L 2,750'], ['Se contó', 'L 2,700'], ['Faltante', 'L 50']]],
      er: [['Hacer el arqueo solo cuando algo anda mal', 'Si se hace todos los días, un faltante se detecta el mismo día y todavía se puede saber qué pasó.'],
        ['Meter las transferencias en la cuenta del efectivo', 'Una venta por transferencia no pone billetes en la gaveta. Si la sumas, siempre te va a «faltar» dinero.'],
        ['No anotar los retiros del dueño', 'Lo que el dueño toma de la caja sin anotar aparece como faltante del cajero.'],
        ['Cuadrar la caja «a la fuerza»', 'Poner de la bolsa para que cuadre esconde el problema. La diferencia hay que anotarla tal como salió.']],
      fq: [['¿Qué es un arqueo de caja?', 'Es el conteo del efectivo de la caja para compararlo con el saldo que debería haber según las ventas, los abonos y las salidas registradas.'],
        ['¿Cuál es la diferencia entre arqueo y cierre de caja?', 'El arqueo es el conteo y la comparación, y se puede hacer en cualquier momento, incluso por sorpresa. El cierre de caja es el arqueo que se hace al terminar el día o el turno.'],
        ['¿Qué hago si falta dinero en la caja?', 'Primero revisa si quedó un gasto o un retiro sin anotar, o una venta por transferencia registrada como efectivo. Si no aparece, anota el faltante con fecha y responsable.'],
        ['¿Y si sobra dinero?', 'También es una diferencia: puede ser una venta que no se registró o un cambio mal dado. Se anota igual que un faltante.']],
      vm: 'El programa lleva la cuenta por ti: apertura, ventas en efectivo, abonos, gastos y pagos del día. Al cerrar la caja te muestra cuánto debería haber, escribes lo que contaste y queda guardada la diferencia.' },
    { s: 'como-manejar-pedidos-por-encargo-y-apartados', t: 'Cómo manejar pedidos por encargo y apartados', d: 'Cómo llevar los pedidos por encargo y los apartados de tu negocio sin perder dinero: anticipo, fecha límite, estado de cada pedido y qué hacer si el cliente no lo retira.',
      i: 'Vender por encargo te deja ofrecer más sin llenar el local de mercadería, pero tiene un riesgo: traer el producto y que el cliente no vuelva. El orden y el anticipo son lo que te protege.',
      p: [['Anota el pedido completo', 'Cliente, teléfono, qué pidió con talla o color, precio y fecha en que lo pidió. Lo que no está escrito se discute después.'],
        ['Pide un anticipo', 'Un pedido sin anticipo es un favor, no una venta. Define qué parte del precio pides para traer el producto.'],
        ['Pon una fecha límite para retirar', 'Dile al cliente desde el inicio cuántos días le guardas el producto una vez que llega.'],
        ['Lleva el estado de cada pedido', 'Pedido, en camino, llegó, entregado. Así sabes de un vistazo qué falta por traer y qué falta por entregar.'],
        ['Avisa cuando llega', 'Un mensaje el mismo día que llega el producto reduce mucho los pedidos que se quedan sin retirar.'],
        ['Decide qué pasa si no lo retiran', 'Pasada la fecha, el producto pasa a tu inventario para venderlo. Deja claro desde el principio qué pasa con el anticipo.']],
      ej: ['Ejemplo: un vestido por encargo', [['Precio del vestido', 'L 800'], ['Anticipo al pedir (50 %)', 'L 400'], ['Saldo al entregar', 'L 400'], ['Lo que te costó traerlo', 'L 520'], ['Ganancia', 'L 280']]],
      er: [['Traer el producto sin anticipo', 'Si el cliente se arrepiente, te quedas con un producto que quizá no habrías comprado para tu local.'],
        ['Apartar sin fecha límite', 'Un apartado sin fecha puede quedarse meses ocupando espacio y dinero.'],
        ['Llevar los pedidos solo en el chat', 'Entre tantos mensajes es fácil olvidar un pedido o confundir tallas y colores.'],
        ['No registrar el anticipo como dinero recibido', 'Ese dinero entró a la caja. Si no lo anotas, la caja te va a sobrar hoy y a faltar el día de la entrega.']],
      fq: [['¿Cuánto anticipo debo pedir por un encargo?', 'Lo suficiente para cubrir tu riesgo. Muchos negocios piden la mitad; si el producto es difícil de vender a otra persona, conviene pedir más.'],
        ['¿Cuál es la diferencia entre un encargo y un apartado?', 'En el encargo el producto todavía no está: lo traes porque el cliente lo pidió. En el apartado ya lo tienes y se lo guardas mientras termina de pagar o pasa a retirarlo.'],
        ['¿Qué hago si el cliente no retira su pedido?', 'Recuérdaselo antes de la fecha límite. Si no llega, el producto pasa a tu inventario para la venta, según lo que acordaron al inicio.'],
        ['¿Cómo llevo el control de muchos pedidos a la vez?', 'Con una lista donde cada pedido tenga su estado y su saldo pendiente. Un programa de pedidos te muestra cuáles están en camino y cuáles esperan retiro.']],
      vm: 'Registras el pedido aunque llegue por WhatsApp o en persona, con sus productos y su estado hasta la entrega, y al entregarlo queda como venta. En el tipo de negocio «Compras en línea» llevas además los apartados: lo que está en camino, lo que ya llegó y lo que pasa a inventario si no lo retiran.' }
  ];
  // Las cuatro primeras guías, ampliadas con ejemplo, errores comunes y preguntas frecuentes (2026-11-21)
  const MAS = {
    'como-crear-una-tienda-en-linea-en-honduras': {
      er: [['Publicar sin precios', 'Obligar al cliente a preguntar el precio de cada cosa hace que muchos se vayan sin escribir.'],
        ['Usar fotos oscuras o de internet', 'El cliente quiere ver el producto que le vas a entregar. Una foto propia, con buena luz, genera más confianza.'],
        ['No decir cuánto cuesta el envío', 'Un costo que aparece al final se siente como sorpresa. Dilo desde el principio.'],
        ['Crear la tienda y no compartirla', 'Nadie llega solo. El enlace tiene que estar en tus estados, tus redes y tu local todos los días.']],
      fq: [['¿Necesito una página web propia para vender por internet?', 'No. Puedes empezar con una tienda en línea ya armada, que te da un enlace para compartir, sin pagar un dominio ni un programador.'],
        ['¿Cómo me pagan los clientes de una tienda en línea?', 'Tú decides qué aceptas: efectivo contra entrega, transferencia bancaria, billetera electrónica o un enlace de pago con tarjeta de tu banco o procesador.'],
        ['¿Cuántos productos necesito para empezar?', 'Los que más vendes. Es mejor una tienda pequeña con buenas fotos y precios al día que una grande y descuidada.'],
        ['¿Cómo hago para que la gente encuentre mi tienda?', 'Comparte el enlace con constancia, pide a tus clientes que lo reenvíen y aparece en directorios de negocios de tu país, como Tiendas Catrachas.']] },
    'como-llevar-el-inventario-de-tu-negocio': {
      ej: ['Ejemplo: la libra de arroz en un mes', [['Existencia al empezar', '40 libras'], ['Compras al proveedor', '+ 50 libras'], ['Ventas del mes', '− 62 libras'], ['Debería haber', '28 libras'], ['Se contó en el estante', '26 libras'], ['Diferencia por ajustar', '− 2 libras']]],
      er: [['Registrar el producto sin su costo', 'Sabes cuántos tienes, pero no cuánto dinero hay detenido ni cuánto ganas al venderlo.'],
        ['Dejar las compras para anotarlas después', 'Mientras no las anotas, el sistema dice que no hay producto aunque el estante esté lleno.'],
        ['No contar nunca', 'Por mermas, errores y pérdidas, lo anotado y lo real se van separando. Contar una vez al mes los vuelve a juntar.'],
        ['Tener el mismo producto con dos nombres', 'La existencia se reparte entre los dos y ninguno dice la verdad.']],
      fq: [['¿Qué es un inventario?', 'Es la lista de los productos que tiene tu negocio para vender, con la cantidad de cada uno y lo que te costaron.'],
        ['¿Cada cuánto debo contar mi inventario?', 'Una vez al mes para la mayoría de negocios. Los productos caros o que se pierden con facilidad conviene contarlos cada semana.'],
        ['¿Qué hago si lo contado no coincide con lo anotado?', 'Ajusta la existencia a lo que hay de verdad y anota el motivo. Si la diferencia se repite en el mismo producto, hay que buscar la causa.'],
        ['¿Puedo llevar el inventario sin computadora?', 'Sí. Hay programas que funcionan completos desde el celular, con las ventas descontando la existencia al momento.']] },
    'como-controlar-las-ventas-al-credito': {
      ej: ['Ejemplo: la cuenta de un cliente', [['Límite de crédito', 'L 1,500'], ['Compra al crédito', 'L 1,200'], ['Primer abono', '− L 400'], ['Segundo abono', '− L 300'], ['Saldo que debe', 'L 500'], ['Crédito disponible', 'L 1,000']]],
      er: [['Dar crédito sin límite', 'La deuda crece hasta un monto que el cliente ya no puede pagar, y pierdes el dinero y al cliente.'],
        ['Anotar la deuda pero no los abonos', 'El cliente siente que paga y la cuenta no baja. Cada abono debe quedar escrito y con comprobante.'],
        ['Seguir vendiendo al que no abona', 'Antes de dar más crédito, revisa cuánto debe y hace cuánto no paga.'],
        ['No sumar todo lo que te deben', 'Cada cuenta parece pequeña, pero el total puede ser más que tu ganancia del mes.']],
      fq: [['¿Qué son las cuentas por cobrar?', 'Es el dinero que tus clientes te deben por ventas que ya entregaste y todavía no te han pagado completas.'],
        ['¿Cómo le cobro a un cliente sin perderlo?', 'Con un recordatorio corto y respetuoso que diga el saldo y la fecha. La mayoría paga cuando ve el número claro.'],
        ['¿A quién conviene darle crédito?', 'A clientes que conoces y que compran seguido, con un límite que puedas soportar si se atrasan.'],
        ['¿Qué hago con un cliente que no paga?', 'Deja de darle crédito, ofrécele abonar por partes y anota cada acuerdo. Un abono pequeño es mejor que una cuenta detenida.']] },
    'como-hacer-el-cierre-de-caja': {
      ej: ['Ejemplo: el cierre de un día', [['Apertura de caja', 'L 300'], ['Ventas en efectivo', 'L 2,450'], ['Abonos de clientes', 'L 200'], ['Gastos pagados', '− L 180'], ['Retiro del dueño', '− L 500'], ['Debería haber', 'L 2,270'], ['Se contó', 'L 2,290'], ['Sobrante', 'L 20']]],
      er: [['Cerrar caja solo cuando hay tiempo', 'Si pasan varios días, ya no se puede saber en cuál de ellos apareció la diferencia.'],
        ['Empezar el día sin contar la apertura', 'Si no sabes con cuánto empezaste, el cierre no puede cuadrar.'],
        ['Sumar las transferencias al efectivo', 'Ese dinero está en el banco, no en la gaveta. Se lleva en una línea aparte.'],
        ['Pagar gastos de la caja sin anotarlos', 'Cada gasto sin anotar aparece al final como dinero que falta.']],
      fq: [['¿Qué es un cierre de caja?', 'Es la revisión que se hace al terminar el día o el turno para comprobar que el efectivo que hay coincide con las ventas, los abonos y las salidas registradas.'],
        ['¿Cómo se calcula cuánto debe haber en caja?', 'Apertura, más ventas en efectivo, más abonos recibidos, menos gastos, pagos y retiros hechos en efectivo.'],
        ['¿Cada cuánto se hace el cierre de caja?', 'Todos los días. Si hay varios turnos o cajeros, uno por turno, para que cada quien responda por el suyo.'],
        ['¿Qué hago si la caja no cuadra?', 'Busca primero un gasto, retiro o venta mal registrada. Si no aparece, anota la diferencia con su fecha: lo importante es ver si se repite.']] }
  };
  // Una guía con «borrador: true» no se publica: solo se ve en local con PREVIA=1 (para mostrar la vista previa antes de aprobarla)
  const PREVIA = process.env.PREVIA === '1';
  for (let i = GUIAS.length - 1; i >= 0; i--) if (GUIAS[i].borrador && !PREVIA) GUIAS.splice(i, 1);
  GUIAS.forEach(g => Object.assign(g, MAS[g.s] || {}));
  GUIAS.forEach(g => {
    const ruta = `/guias/${g.s}/`;
    poner(ruta, pagina({ ruta, marca: true, modulo: true, medir: 'tc-guia-' + (GUIAS.indexOf(g) + 1), title: `${g.t} · Guía`, desc: g.d,
      ld: g.fq ? [{ '@context': 'https://schema.org', '@type': 'Article', headline: g.t, description: g.d, inLanguage: 'es', author: { '@type': 'Organization', name: 'Molina Soluciones Digitales' }, publisher: { '@type': 'Organization', name: 'Molina Soluciones Digitales', logo: { '@type': 'ImageObject', url: SITIO + '/icono-512.png' } }, mainEntityOfPage: SITIO + ruta }, faqLd(g.fq)] : { '@context': 'https://schema.org', '@type': 'Article', headline: g.t, description: g.d, inLanguage: 'es', author: { '@type': 'Organization', name: 'Molina Soluciones Digitales' }, publisher: { '@type': 'Organization', name: 'Molina Soluciones Digitales', logo: { '@type': 'ImageObject', url: SITIO + '/icono-512.png' } }, mainEntityOfPage: SITIO + ruta },
      cuerpo: `<section class="hero"><h1>${esc(g.t)}</h1><p>${esc(g.d)}</p></section>
<section class="cont guia">${migas([['Para tu negocio', '/para-tu-negocio/'], ['Guías', '/guias/'], [g.t]])}<p class="intro">${esc(g.i)}</p>
<ol class="pasos">${g.p.map(([n, d]) => `<li><h2>${esc(n)}</h2><p>${esc(d)}</p></li>`).join('')}</ol>
${g.ej ? `<h2 class="tit">${esc(g.ej[0])}</h2><div class="ej">${g.ej[1].map(([n, v]) => `<div><span>${esc(n)}</span><b>${esc(v)}</b></div>`).join('')}</div>` : ''}
${g.er ? `<h2 class="tit">Errores comunes</h2><ul class="errs">${g.er.map(([n, d]) => `<li><b>${esc(n)}.</b> ${esc(d)}</li>`).join('')}</ul>` : ''}
<div class="pto"${g.ej ? ' style="margin-top:22px"' : ''}><h3>Cómo se hace en Gestión de Negocio VM</h3><p>${esc(g.vm)}</p></div>
${g.fq ? `<h2 class="tit">Preguntas frecuentes</h2>${faq(g.fq)}` : ''}
${invita('Pruébalo en tu negocio', 'Crea tu cuenta, elige tu tipo de negocio y usa el programa gratis 7 días.')}
<h2 class="tit">Más guías</h2>${chips(GUIAS.filter(x => x !== g).map(x => [x.t, `/guias/${x.s}/`]))}</section>` }));
    urls.push(ruta);
  });
  poner('/guias/', pagina({ ruta: '/guias/', marca: true, modulo: true, medir: 'tc-guia', title: 'Guías para dueños de negocio en Honduras', desc: 'Guías prácticas para vender por internet, llevar tu inventario, controlar las ventas al crédito y cerrar tu caja.',
    cuerpo: `<section class="hero"><h1>Guías para tu negocio</h1><p>Pasos prácticos para vender más y llevar tu negocio en orden.</p></section>
<section class="cont">${migas([['Para tu negocio', '/para-tu-negocio/'], ['Guías']])}<div class="negocios">${GUIAS.map(g => `<a class="neg" href="/guias/${g.s}/"><h3>${esc(g.t)}</h3><p>${esc(g.d)}</p></a>`).join('')}</div></section>` }));
  urls.push('/guias/');

  // Plantillas gratis para dueños de negocio (archivos de Excel en descargas/, creados con herramientas/plantillas.py).
  // Igual que las guías: con «borrador: true» no se publica; solo se ve en local con PREVIA=1. Sin «a» (archivo) es solo una idea en la lista de la vista previa.
  const PLANTILLAS = [
    { s: 'plantilla-de-inventario-en-excel', n: 'Inventario', t: 'Plantilla de inventario en Excel gratis', a: 'plantilla-de-inventario.xlsx',
      d: 'Descarga gratis una plantilla de inventario en Excel: anotas compras y ventas, y la lista de productos con su existencia se llena sola. Sirve en el celular.',
      i: 'Solo anotas tus compras y tus ventas, una al lado de la otra. La hoja de productos se llena sola: cada producto una vez, con su existencia, su costo y un aviso de lo que hay que comprar.',
      inc: ['Hoja «Compras y ventas»: las dos tablas lado a lado, con espacio para 1,000 compras y 1,000 ventas', 'Hoja «Productos» que se llena sola: cada producto una vez, sin escribirlo dos veces', 'Existencia, costo y precio promedio, y valor de tu inventario calculados solos; las fórmulas vienen bloqueadas para que no se borren', 'Aviso «Comprar» o «Agotado» con el número de unidades que tú elijas'],
      // hojas: vista de cada hoja en la página. calc: columnas rosadas (se calculan solas). cel: columnas que se ven en el celular
      hojas: [{ n: 'Compras y ventas', d: 'Aquí anotas todo.', lados: [
          { n: 'Compras', cab: ['Fecha', 'Producto', 'Cantidad', 'Total'], fil: [['01/11', 'Arroz (libra)', '40', '480.00'], ['03/11', 'Arroz (libra)', '50', '600.00'], ['03/11', 'Frijoles rojos (libra)', '20', '400.00']], calc: [3], cel: [0, 1, 2, 3] },
          { n: 'Ventas', cab: ['Fecha', 'Producto', 'Cantidad', 'Total'], fil: [['04/11', 'Arroz (libra)', '30', '450.00'], ['04/11', 'Frijoles rojos (libra)', '20', '500.00'], ['15/11', 'Arroz (libra)', '32', '480.00']], calc: [3], cel: [0, 1, 2, 3] }] },
        { n: 'Productos', d: 'Se llena sola.', cab: ['Producto', 'Comprado', 'Vendido', 'Existencia', 'Costo prom.', 'Precio prom.', 'Valor', 'Estado'],
          fil: [['Arroz (libra)', '90', '62', '28', '12.00', '15.00', '336.00', 'Bien'], ['Frijoles rojos (libra)', '50', '44', '6', '20.00', '25.00', '120.00', 'Comprar'], ['Aceite 750 ml', '24', '24', '0', '48.00', '58.00', '0.00', 'Agotado'], ['Refresco 3 litros', '42', '20', '22', '42.00', '50.00', '924.00', 'Bien']],
          calc: [0, 1, 2, 3, 4, 5, 6, 7], cel: [0, 2, 3, 7] }],
      p: [['Descarga y abre el archivo', 'En computadora se abre con Excel. En el celular, con Google Sheets o Excel, que son gratis.'],
        ['Empieza con lo que ya tienes', 'En «Compras y ventas», anota como compra del primer día lo que hay hoy en tu estante, con lo que te costó.'],
        ['Anota cada compra y cada venta', 'Compras a la izquierda, ventas a la derecha. El mismo producto se repite las veces que quieras; después de la primera vez lo eliges de la lista.'],
        ['Mira la hoja «Productos»', 'Se llena sola: cada producto una vez, con lo comprado, lo vendido, cuánto te queda y cuánto vale tu inventario.'],
        ['Elige cuándo te avisa', 'Arriba de «Productos» escribes con cuántas unidades quieres el aviso. Al llegar ahí, el estado dice «Comprar».']],
      g: 'como-llevar-el-inventario-de-tu-negocio',
      vm: 'La plantilla funciona, pero cada compra y cada venta la anotas dos veces: al hacerla y en la hoja. En el programa cada venta descuenta la existencia y cada compra la suma, le pones a cada producto su mínimo y te avisa lo que está por agotarse.',
      fq: [['¿La plantilla es gratis?', 'Sí. Se descarga sin registrarte y la puedes usar y copiar las veces que quieras.'],
        ['¿Puedo usarla en el celular?', 'Sí. Ábrela con Google Sheets o con Excel para celular; las fórmulas funcionan igual.'],
        ['¿Sirve para cualquier tipo de negocio?', 'Sí: pulperías, tiendas, boutiques, ferreterías o cualquier negocio que venda productos por unidad, libra o caja.'],
        ['¿Cuántos productos caben?', 'Trae espacio para 200 productos distintos y 1,000 filas de compras y de ventas. Si tienes más, o vendes por tallas y colores, conviene pasar a un programa que lleve la existencia solo.']] },
    { s: 'plantilla-de-cierre-de-caja-en-excel', n: 'Cierre de caja diario', t: 'Plantilla de cierre de caja diario en Excel gratis', a: 'plantilla-cierre-de-caja.xlsx',
      d: 'Descarga gratis una plantilla de cierre de caja en Excel: anotas apertura, ventas, abonos y gastos, y te dice cuánto debería haber y si la caja cuadra, sobra o falta.',
      i: 'Una fila por día. Escribes con cuánto abriste, lo que entró y lo que salió, y lo que contaste al cerrar. La hoja te dice cuánto debería haber y si la caja cuadra, sobra o falta.',
      inc: ['Cuánto debería haber: apertura, más ventas en efectivo y abonos, menos gastos, pagos y retiros', 'Diferencia y resultado del día: cuadra, sobrante o faltante', 'Ventas por transferencia o tarjeta aparte, y el total vendido del día', 'Arriba, lo que ha faltado y sobrado en total, y los días con faltante'],
      hojas: [{ n: 'Cierre de caja', d: 'Una fila por día. Entradas: ventas en efectivo y abonos; salidas: gastos y retiros.', cab: ['Fecha', 'Apertura', 'Entradas', 'Salidas', 'Debería haber', 'Se contó', 'Diferencia', 'Resultado'],
        fil: [['17/11', '300.00', '2,650.00', '680.00', '2,270.00', '2,290.00', '+20.00', 'Sobrante'], ['18/11', '300.00', '1,980.00', '120.00', '2,160.00', '2,160.00', '0.00', 'Cuadra'], ['19/11', '300.00', '2,950.00', '1,200.00', '2,050.00', '2,000.00', '−50.00', 'Faltante']],
        calc: [4, 6, 7], cel: [0, 4, 5, 7] }],
      p: [['Descarga y abre el archivo', 'En computadora se abre con Excel. En el celular, con Google Sheets o Excel, que son gratis.'],
        ['Anota la apertura', 'Cada día, una fila nueva con la fecha y el efectivo con que abriste la caja.'],
        ['Anota lo que entró y lo que salió', 'Ventas en efectivo y abonos; gastos, pagos a proveedores y retiros. Las ventas por transferencia o tarjeta van en su propia columna.'],
        ['Cuenta y escribe lo que hay', 'En «Se contó». La hoja te dice la diferencia y si la caja cuadra, sobra o falta.'],
        ['Anota el motivo', 'Si sobra o falta, escribe por qué en «Nota». Arriba ves si el faltante se repite.']],
      g: 'como-hacer-el-cierre-de-caja', vmA: 'La plantilla sirve, pero cada venta y cada gasto los sumas tú al final del día.',
      fq: [['¿La plantilla es gratis?', 'Sí. Se descarga sin registrarte y la puedes usar y copiar las veces que quieras.'],
        ['¿Las ventas con tarjeta o transferencia van en la caja?', 'No. Ese dinero no está en la gaveta. La plantilla las lleva en una columna aparte para que el total vendido del día salga completo sin descuadrar la caja.'],
        ['¿Qué hago si la caja no cuadra?', 'Busca primero un gasto, retiro o venta sin anotar. Si no aparece, deja escrita la diferencia con su motivo: lo importante es ver si se repite.'],
        ['¿Cuántos días caben?', 'Trae espacio para un año completo, una fila por día.']] },
    { s: 'plantilla-de-arqueo-de-caja-en-excel', n: 'Arqueo de caja', t: 'Plantilla de arqueo de caja en Excel gratis', a: 'plantilla-arqueo-de-caja.xlsx',
      d: 'Descarga gratis una plantilla de arqueo de caja en Excel: abonos de clientes, cobros con tarjeta y transferencia, y conteo de billetes y monedas de lempiras, lista para imprimir.',
      i: 'Una hoja para contar la caja en cualquier momento: escribes lo que debería haber, los abonos de cada cliente y lo cobrado con tarjeta o transferencia, cuentas billetes y monedas de lempiras, y te dice si cuadra, sobra o falta. Cabe en una página para imprimir y firmar.',
      inc: ['Lo que debería haber en la gaveta: apertura, ventas en efectivo y abonos, menos gastos, pagos y retiros', 'Detalle de los clientes que abonaron, con cuánto y cómo pagó cada uno', 'Cobros que no están en la gaveta: tarjeta, transferencias y otros', 'Conteo por billete y moneda de lempiras, resultado y espacio para las firmas'],
      hojas: [{ n: 'Arqueo', t: 'Lo que debería haber y los abonos', lados: [
          { n: 'Lo que debería haber', cab: ['Concepto', 'Monto'], fil: [['Apertura de caja', '500.00'], ['Ventas en efectivo', '3,200.00'], ['Abonos en efectivo', '400.00'], ['Gastos y pagos', '−1,350.00'], ['Debería haber', '2,750.00']], calc: [], fc: [2, 4], cel: [0, 1] },
          { n: 'Abonos de clientes', cab: ['Cliente', 'Monto', 'Cómo pagó'], fil: [['María López', '250.00', 'Efectivo'], ['Carlos Mejía', '150.00', 'Efectivo'], ['Ana Reyes', '300.00', 'Transferencia'], ['Total abonado', '700.00', '']], calc: [], fc: [3], cel: [0, 1, 2] }] },
        { n: 'Arqueo', t: 'Cobros fuera de la gaveta y conteo', lados: [
          { n: 'No están en la gaveta', cab: ['Concepto', 'Monto'], fil: [['Ventas con tarjeta', '1,250.00'], ['Ventas por transferencia', '800.00'], ['Otros', '0.00'], ['Abonos por transferencia', '300.00'], ['Total fuera de la gaveta', '2,350.00']], calc: [], fc: [3, 4], cel: [0, 1] },
          { n: 'Conteo del efectivo', cab: ['Billete o moneda', 'Cantidad', 'Total'], fil: [['Billete de L 500', '3', '1,500.00'], ['Billete de L 200', '3', '600.00'], ['… y el resto', '', ''], ['Total contado', '24', '2,700.00'], ['Faltante', '', '−50.00']], calc: [2], fc: [3, 4], cel: [0, 1, 2] }] }],
      p: [['Descarga y abre el archivo', 'En computadora se abre con Excel. En el celular, con Google Sheets o Excel, que son gratis.'],
        ['Escribe lo que debería haber', 'Con cuánto se abrió, las ventas en efectivo y lo que salió de la caja.'],
        ['Anota los abonos y los otros cobros', 'Cada cliente que abonó y cómo pagó; los abonos en efectivo pasan solos a la caja. Aparte, lo cobrado con tarjeta, transferencia u otros.'],
        ['Cuenta billetes y monedas', 'Escribe cuántos hay de cada uno. La hoja suma el total.'],
        ['Mira el resultado', 'Te dice si la caja cuadra, sobra o falta, y cuánto.'],
        ['Imprime y firma', 'Firman quien estaba en caja y quien hizo el arqueo. Para el siguiente, borra las cantidades o copia la hoja.']],
      g: 'como-hacer-un-arqueo-de-caja', vmA: 'La plantilla sirve, pero lo que debería haber lo sumas tú.',
      fq: [['¿La plantilla es gratis?', 'Sí. Se descarga sin registrarte y la puedes usar y copiar las veces que quieras.'],
        ['¿Qué diferencia hay entre arqueo y cierre de caja?', 'El cierre se hace al terminar el día. El arqueo es un conteo que se puede hacer en cualquier momento, por ejemplo al cambiar de cajero o sin avisar.'],
        ['¿Puedo guardar varios arqueos?', 'Sí. Copia la hoja para cada arqueo: clic derecho en la pestaña, Mover o copiar, Crear una copia.'],
        ['¿Trae las monedas de Honduras?', 'Sí: billetes de L 500, 200, 100, 50, 20, 10, 5, 2 y 1, y monedas de 50, 20, 10 y 5 centavos.']] },
    { s: 'plantilla-de-cuentas-por-cobrar-en-excel', n: 'Ventas al crédito', t: 'Plantilla de ventas al crédito y cuentas por cobrar en Excel gratis', a: 'plantilla-ventas-al-credito.xlsx',
      d: 'Descarga gratis una plantilla de cuentas por cobrar en Excel: ventas al crédito y abonos por cliente, con su saldo, su límite, sus días sin abonar y su estado de cuenta.',
      i: 'Anotas lo que vendes al crédito y los abonos, uno al lado del otro. La hoja de clientes se llena sola con el saldo, el límite y lo disponible de cada uno, y el estado de cuenta te muestra todo lo de un cliente para mandárselo.',
      inc: ['Hoja «Créditos y abonos»: ventas al crédito y abonos lado a lado, 1,000 filas de cada uno', 'Hoja «Clientes» que se llena sola: saldo, límite, disponible, último abono y días sin abonar', 'Límite propio para cada cliente, o uno general para todos', 'Estado de cuenta por cliente: sus compras al crédito y sus abonos, listo para imprimir o guardar en PDF'],
      hojas: [{ n: 'Créditos y abonos', d: 'Aquí anotas todo.', lados: [
          { n: 'Ventas al crédito', cab: ['Fecha', 'Cliente', 'Monto'], fil: [['01/11', 'María López', '1,200.00'], ['10/11', 'Carlos Mejía', '450.00'], ['12/11', 'María López', '600.00']], calc: [], cel: [0, 1, 2] },
          { n: 'Abonos', cab: ['Fecha', 'Cliente', 'Monto'], fil: [['05/11', 'José Martínez', '650.00'], ['08/11', 'María López', '400.00'], ['15/11', 'María López', '300.00']], calc: [], cel: [0, 1, 2] }] },
        { n: 'Clientes', d: 'Se llena sola.', cab: ['Cliente', 'Saldo', 'Límite', 'Disponible', 'Días sin abonar', 'Estado'],
          fil: [['María López', '1,100.00', '2,000.00', '900.00', '7', 'Al día'], ['Ana Reyes', '1,800.00', '1,500.00', '0.00', '33', 'Pasó el límite'], ['José Martínez', '0.00', '1,500.00', '1,500.00', '', 'Pagado'], ['Carlos Mejía', '450.00', '1,500.00', '1,050.00', '12', 'Al día']],
          calc: [0, 1, 2, 3, 4, 5], cel: [0, 1, 3, 5] },
        { n: 'Estado de cuenta', d: 'Eliges el cliente y sale todo lo suyo.', lados: [
          { n: 'María López · compras al crédito', cab: ['Fecha', 'Qué llevó', 'Monto'], fil: [['01/11', 'Ropa y zapatos', '1,200.00'], ['12/11', 'Blusa y cartera', '600.00'], ['Total', '', '1,800.00']], calc: [0, 1, 2], cel: [0, 1, 2] },
          { n: 'María López · abonos', cab: ['Fecha', 'Monto', 'Forma de pago'], fil: [['08/11', '400.00', 'Efectivo'], ['15/11', '300.00', 'Transferencia'], ['Saldo que debe', '1,100.00', '']], calc: [0, 1, 2], cel: [0, 1, 2] }] }],
      p: [['Descarga y abre el archivo', 'En computadora se abre con Excel. En el celular, con Google Sheets o Excel, que son gratis.'],
        ['Anota cada venta al crédito', 'En «Créditos y abonos», a la izquierda: fecha, cliente, qué llevó y monto.'],
        ['Anota cada abono', 'A la derecha: fecha, cliente (lo eliges de la lista), monto y forma de pago.'],
        ['Ponle a cada cliente su límite', 'En «Clientes» está el límite general; si un cliente tiene otro, escríbelo en la tabla «Límite propio».'],
        ['Saca su estado de cuenta', 'En «Estado de cuenta» eliges el cliente y sale todo lo suyo con su saldo, listo para mandárselo.']],
      g: 'como-controlar-las-ventas-al-credito', vmA: 'La plantilla sirve, pero el recordatorio a cada cliente lo mandas tú a mano.',
      fq: [['¿La plantilla es gratis?', 'Sí. Se descarga sin registrarte y la puedes usar y copiar las veces que quieras.'],
        ['¿Tengo que escribir la lista de clientes?', 'No. Cada cliente aparece solo la primera vez que le anotas una venta al crédito o un abono.'],
        ['¿Qué pasa si escribo un nombre distinto?', '«María López» y «Maria Lopez» salen como dos clientes. Después de la primera vez, elige el nombre de la lista.'],
        ['¿Puedo darle a cada cliente un límite distinto?', 'Sí. Hay un límite general y una tabla para escribir el límite propio de los clientes que lo necesiten.'],
        ['¿Cuántos clientes caben?', 'Trae espacio para 300 clientes distintos y 1,000 filas de ventas al crédito y de abonos.']] },
    { s: 'calculadora-de-precio-de-venta-en-excel', n: 'Calculadora de precio de venta', t: 'Calculadora de precio de venta en Excel gratis', a: 'calculadora-precio-de-venta.xlsx',
      d: 'Descarga gratis una calculadora de precio de venta en Excel: escribes el costo y el margen que quieres, y te da el precio redondeado y tu ganancia por unidad.',
      i: 'Escribes lo que te cuesta cada producto, con el flete y el empaque, y el margen que quieres ganar. La hoja calcula el precio con la fórmula costo ÷ (1 − margen), lo redondea a un precio fácil de cobrar y te dice cuánto ganas.',
      inc: ['Costo completo: lo que pagaste más flete, empaque y otros por unidad', 'Un margen para todos los productos, o uno distinto para el que lo necesite', 'Precio redondeado hacia arriba a L 1, L 5 o lo que elijas', 'Ganancia por unidad de cada producto'],
      hojas: [{ n: 'Precios', d: 'Margen general: 40 %.', cab: ['Producto', 'Costo', 'Flete y empaque', 'Margen', 'Precio sugerido', 'Precio para cobrar', 'Ganancia'],
        fil: [['Blusa', '55.00', '5.00', '40%', '100.00', '100.00', '40.00'], ['Pantalón de mezclilla', '250.00', '10.00', '40%', '433.33', '435.00', '175.00'], ['Refresco 3 litros', '42.00', '', '15%', '49.41', '50.00', '8.00']],
        calc: [4, 5, 6], cel: [0, 1, 5, 6] }],
      p: [['Descarga y abre el archivo', 'En computadora se abre con Excel. En el celular, con Google Sheets o Excel, que son gratis.'],
        ['Escribe el costo completo', 'Lo que pagaste por cada unidad y, aparte, el flete, el empaque o la bolsa que le toca a cada una.'],
        ['Elige tu margen', 'Arriba, el margen para todos. Si un producto necesita otro, escríbelo en su fila.'],
        ['Elige cómo redondear', 'Con 5 el precio queda en múltiplos de L 5; con 1, en lempiras enteros; con 0 no se redondea.'],
        ['Lee tu precio', '«Precio para cobrar» es el precio final y «Ganancia» lo que te queda de cada unidad.']],
      g: 'como-calcular-el-precio-de-venta', vmA: 'La calculadora te da el precio, pero no te dice cuánto ganaste al final del día.',
      fq: [['¿La calculadora es gratis?', 'Sí. Se descarga sin registrarte y la puedes usar y copiar las veces que quieras.'],
        ['¿Qué fórmula usa?', 'Precio de venta = costo ÷ (1 − margen). Con un margen de 40 %, divide el costo entre 0.60: un producto que cuesta L 60 se vende en L 100.'],
        ['¿Margen y ganancia sobre el costo son lo mismo?', 'No. Ganar 40 % sobre el costo (L 60 + 40 % = L 84) deja menos que un margen de 40 % del precio (L 100). La calculadora usa el margen sobre el precio.'],
        ['¿Incluye impuestos?', 'No. Calcula el precio a partir de tu costo y tu margen; si tu negocio cobra impuestos, súmalos aparte según tu caso.']] },
    { s: 'plantilla-de-control-de-gastos-en-excel', n: 'Control de gastos del mes', t: 'Plantilla de control de gastos en Excel gratis', a: 'plantilla-control-de-gastos.xlsx',
      d: 'Descarga gratis una plantilla de control de gastos en Excel para tu negocio: anotas cada gasto y te da el total del mes por tipo de gasto, cuánto es por día y el resumen del año.',
      i: 'Anotas cada gasto con su fecha y su tipo. El resumen te dice cuánto gastaste en el mes en cada cosa, qué parte del total es, cuánto te toca ganar por día solo para cubrirlos y cómo va cada mes del año.',
      inc: ['Hoja «Gastos»: fecha, tipo de gasto de una lista, detalle, monto y forma de pago', 'Resumen del mes por tipo de gasto, con su parte del total', 'Cuánto es por día: lo que tu negocio debe ganar solo para cubrir gastos', 'Total de cada mes del año, y tipos de gasto que puedes cambiar'],
      hojas: [{ n: 'Resumen', d: 'Noviembre de 2026.', cab: ['Tipo de gasto', 'Gasto del mes', 'Parte del total'],
        fil: [['Alquiler del local', '5,000.00', '52%'], ['Transporte y fletes', '1,800.00', '19%'], ['Luz y agua', '1,500.00', '16%'], ['Internet y recargas', '700.00', '7%'], ['Bolsas y empaques', '600.00', '6%'], ['Total del mes', '9,600.00', '100%'], ['Por día (÷ 30)', '320.00', '']],
        calc: [1, 2], fc: [5, 6], cel: [0, 1, 2] }],
      p: [['Descarga y abre el archivo', 'En computadora se abre con Excel. En el celular, con Google Sheets o Excel, que son gratis.'],
        ['Anota cada gasto el mismo día', 'En la hoja «Gastos»: fecha, tipo de gasto (de la lista), detalle, monto y cómo pagaste.'],
        ['No mezcles la casa con el negocio', 'Lo de la casa no es gasto del negocio. Comprar mercadería para vender tampoco: es inventario.'],
        ['Mira el resumen', 'Elige el mes y el año, y ves cuánto gastaste en cada cosa y cuánto es por día.'],
        ['Revisa qué puedes bajar', 'Con los gastos ordenados de mayor a menor, casi siempre aparece uno que se puede reducir.']],
      g: 'como-llevar-el-control-de-gastos-de-un-negocio', vmA: 'La plantilla sirve, pero el gasto no se descuenta de tu caja: eso lo cuadras tú.',
      fq: [['¿La plantilla es gratis?', 'Sí. Se descarga sin registrarte y la puedes usar y copiar las veces que quieras.'],
        ['¿Puedo cambiar los tipos de gasto?', 'Sí. En el resumen, la columna «Tipo de gasto» se puede editar: renombra o agrega los tuyos y aparecen en la lista.'],
        ['¿La compra de mercadería es un gasto?', 'No. Lo que compras para vender es inventario que vuelve cuando lo vendes. Gasto es lo que no vuelve: alquiler, luz, fletes, sueldos.'],
        ['¿Sirve para varios meses?', 'Sí. Trae espacio para 1,000 gastos y el resumen muestra cualquier mes y el total de cada mes del año.']] },
    { s: 'plantilla-de-pedidos-por-encargo-y-apartados-en-excel', n: 'Pedidos por encargo y apartados', t: 'Plantilla de pedidos por encargo y apartados en Excel gratis', a: 'plantilla-pedidos-y-apartados.xlsx',
      d: 'Descarga gratis una plantilla en Excel para pedidos por encargo y apartados: cliente, anticipo, saldo, estado del pedido y aviso cuando llega o pasa la fecha para retirar.',
      i: 'Una fila por pedido: qué pidió el cliente, cuánto dejó de anticipo y cuánto le falta. Cambias el estado cuando avanza y la hoja te avisa cuando hay que escribirle al cliente o cuando pasó la fecha para retirar.',
      inc: ['Cliente, teléfono y qué pidió con talla o color', 'Precio, anticipo y abonos, y el saldo calculado solo', 'Estado de cada pedido: Pedido, En camino, Llegó, Entregado', 'Avisos: «Avisar al cliente», «Pasó la fecha» y «Entregado con saldo»'],
      hojas: [{ n: 'Pedidos', d: 'Una fila por pedido.', cab: ['Cliente', 'Qué pidió', 'Precio', 'Pagado', 'Saldo', 'Estado', 'Aviso'],
        fil: [['Sofía Ramos', 'Vestido azul, talla M', '800.00', '400.00', '400.00', 'En camino', ''], ['Luis Castro', 'Zapatos negros, talla 41', '1,200.00', '600.00', '600.00', 'Llegó', 'Avisar al cliente'], ['Marco Flores', 'Camisa blanca, talla L', '350.00', '350.00', '0.00', 'Entregado', 'Completo']],
        calc: [4, 6], cel: [0, 4, 5, 6] }],
      p: [['Descarga y abre el archivo', 'En computadora se abre con Excel. En el celular, con Google Sheets o Excel, que son gratis.'],
        ['Anota el pedido completo', 'Fecha, cliente, teléfono y qué pidió con talla o color.'],
        ['Escribe el precio y el anticipo', 'Si después da más abonos, súmalos en «Pagado». El saldo se calcula solo.'],
        ['Cambia el estado cuando avance', 'Pedido, En camino, Llegó o Entregado. Cuando llega, el aviso te recuerda escribirle al cliente.'],
        ['Pon la fecha límite para retirar', 'Si pasa y no lo retiran, el aviso dice «Pasó la fecha».']],
      g: 'como-manejar-pedidos-por-encargo-y-apartados', vmA: 'La plantilla sirve, pero al entregar el pedido la venta la anotas aparte.',
      fq: [['¿La plantilla es gratis?', 'Sí. Se descarga sin registrarte y la puedes usar y copiar las veces que quieras.'],
        ['¿Sirve para apartados?', 'Sí. Un apartado es un pedido con anticipo: anota el producto, lo que dejó y la fecha límite para retirarlo.'],
        ['¿Qué pasa con el anticipo si no retiran el pedido?', 'Depende de lo que acuerdes con tu cliente. Déjalo claro desde el principio y escríbelo en la nota del pedido.'],
        ['¿Cuántos pedidos caben?', 'Trae espacio para 500 pedidos.']] },
    { s: 'plantilla-completa-para-tu-negocio', n: 'Plantilla completa para tu negocio', t: 'Plantilla completa de Excel para tu negocio: ventas, inventario, caja y créditos', a: 'plantilla-completa-negocio.xlsx', pago: true,
      d: 'Una sola plantilla de Excel con todo conectado: ventas, compras, inventario, caja diaria, ventas al crédito, gastos y el resumen del mes con tu ganancia. Es de pago.',
      i: 'Todas las plantillas en un solo archivo, conectadas entre sí: cada venta descuenta tu inventario, entra a tu caja o a la cuenta del cliente y calcula su ganancia. Al final del mes ves cuánto vendiste, cuánto ganaste y cuánto te deben.',
      inc: ['Ventas que descuentan el inventario, entran a la caja o a la cuenta del cliente y calculan su ganancia', 'Compras, abonos y gastos que se reflejan solos en el inventario, los clientes y la caja', 'Caja diaria que sabe cuánto debería haber sin sumar a mano', 'Resumen del mes: ventas, ganancia, gastos, lo que te deben y lo que hay que comprar'],
      hojas: [{ n: 'Resumen', d: 'Noviembre de 2026 (datos de ejemplo de una boutique).', lados: [
          { n: 'El mes', cab: ['Concepto', 'Monto'], fil: [['Ventas', '13,115.00'], ['Costo de lo vendido', '7,860.00'], ['Ganancia en ventas', '5,255.00'], ['Gastos', '4,400.00'], ['Ganancia del mes', '855.00']], calc: [0, 1], cel: [0, 1] },
          { n: 'Hoy en tu negocio', cab: ['Concepto', 'Dato'], fil: [['Te deben', '1,450.00'], ['Valor del inventario', '6,660.00'], ['Productos por comprar', '1'], ['Días con faltante en caja', '1']], calc: [0, 1], cel: [0, 1] }] },
        { n: 'Ventas', d: 'Lo que anotas cada día.', cab: ['Fecha', 'Producto', 'Cantidad', 'Total', 'Forma de pago', 'Cliente', 'Ganancia'],
          fil: [['03/11', 'Blusa', '4', '400.00', 'Efectivo', '', '160.00'], ['05/11', 'Zapatos de mujer', '1', '750.00', 'Crédito', 'María López', '300.00'], ['08/11', 'Cartera', '2', '1,000.00', 'Transferencia', '', '400.00']],
          calc: [3, 6], cel: [1, 3, 4, 6] }],
      p: [['Cómprala por WhatsApp', 'Escríbenos y te damos la contraseña para abrir el archivo.'],
        ['Descarga el archivo y ábrelo con Excel', 'En computadora o en el celular con la app de Excel. Te pide la contraseña la primera vez que lo abres.'],
        ['Empieza con lo que ya tienes', 'En «Compras», anota tu mercadería de hoy como «Inventario inicial».'],
        ['Anota ventas, compras, abonos y gastos', 'Solo en las celdas amarillas. Productos, clientes, estado de cuenta y resumen se llenan solos.'],
        ['Cierra la caja y mira el resumen', 'La caja te dice cuánto debería haber; el resumen, cuánto ganaste en el mes.']],
      vm: 'La plantilla completa lleva todo tu negocio en Excel. Si además quieres tienda en línea, recibos y recordatorios por WhatsApp desde el celular, eso lo hace Gestión de Negocio VM.',
      fq: [['¿Por qué esta plantilla es de pago?', 'Porque une todas las plantillas en un solo archivo, con las hojas conectadas entre sí. Las plantillas sueltas siguen siendo gratis.'],
        ['¿Cómo la compro?', 'Escríbenos por WhatsApp. Te decimos el precio y la forma de pago, y al pagar te damos la contraseña para abrir el archivo.'],
        ['¿Puedo verla antes de comprarla?', 'Sí: en esta página ves cómo se ven sus hojas, y las plantillas gratis te muestran cómo funciona cada parte.'],
        ['¿Se abre en Google Sheets?', 'No. Google Sheets no abre archivos con contraseña. Se abre con Excel en computadora o con la app de Excel en el celular.']] }
  ];
  for (let i = PLANTILLAS.length - 1; i >= 0; i--) if ((PLANTILLAS[i].borrador && !PREVIA) || (!PLANTILLAS[i].a && !PREVIA)) PLANTILLAS.splice(i, 1);
  const PL_LISTAS = PLANTILLAS.filter(x => x.a);
  const IZQ = ['Producto', 'Cliente', 'Concepto', 'Billete o moneda', 'Tipo de gasto', 'Qué pidió']; // columnas alineadas a la izquierda en «Así se ve»
  const verHoja = h => `<div class="hoja" tabindex="0" role="region" aria-label="${esc(h.n)}"><table><thead><tr>${h.cab.map((c, j) => `<th class="${[h.cel.includes(j) ? '' : 'm-oc', IZQ.includes(c) ? 'iz' : ''].filter(Boolean).join(' ')}">${esc(c)}</th>`).join('')}</tr></thead><tbody>${h.fil.map((f, fi) => `<tr>${f.map((c, j) => `<td class="${[h.calc.includes(j) || (h.fc || []).includes(fi) ? 'calc' : 'llena', ['Comprar', 'Sobrante', 'Avisar al cliente', 'Atrasado'].includes(c) ? 'am' : ['Agotado', 'Faltante', 'Pasó el límite', 'Pasó la fecha'].includes(c) ? 'ro' : ['Cuadra', 'Pagado', 'Completo'].includes(c) ? 've' : '', h.cel.includes(j) ? '' : 'm-oc', IZQ.includes(h.cab[j]) ? 'iz' : ''].filter(Boolean).join(' ')}">${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const plTarjetas = () => `<div class="negocios">${PLANTILLAS.map(x => x.a ? `<a class="neg${x.pago ? ' pago' : ''}" href="/plantillas/${x.s}/"><span class="tag">${x.pago ? 'Excel · de pago' : 'Excel · gratis'}</span><h3>${esc(x.n)}</h3><p>${esc(x.d)}</p></a>` : `<div class="neg prox"><span class="tag">En preparación</span><h3>${esc(x.n)}</h3><p>${esc(x.d)}</p></div>`).join('')}</div>`;
  PL_LISTAS.forEach((x, k) => {
    const ruta = `/plantillas/${x.s}/`, baja = `/descargas/${x.a}`, g = GUIAS.find(y => y.s === x.g);
    archivos[baja] = readFileSync(new URL('./descargas/' + x.a, import.meta.url));
    const boton = x.pago
      ? `<div class="precio"><b>Plantilla de pago</b><span>El archivo pide contraseña para abrirse. Escríbenos por WhatsApp: te decimos el precio y, al pagar, te damos la contraseña.</span></div><p class="bajar"><a class="btn grande oro" href="${WA}?text=${encodeURIComponent('Hola, quiero comprar la Plantilla completa para mi negocio.')}" rel="noopener" data-bajar="${esc(slug(x.n))}-wa">Comprar la contraseña por WhatsApp</a><a class="btn linea" href="${baja}" download data-bajar="${esc(slug(x.n))}">Descargar el archivo (pide contraseña)</a><small>Se abre con Excel en computadora o en la app de Excel del celular. Google Sheets no abre archivos con contraseña.</small></p>`
      : `<p class="bajar"><a class="btn grande" href="${baja}" download data-bajar="${esc(slug(x.n))}">Descargar la plantilla (Excel)</a><small>Gratis · sin registrarte · sirve en Excel y Google Sheets</small></p>`;
    poner(ruta, pagina({ ruta, marca: true, modulo: true, medir: 'tc-plant-' + (k + 1), title: `${x.t} · Molina`, desc: x.d,
      ld: [{ '@context': 'https://schema.org', '@type': 'Article', headline: x.t, description: x.d, inLanguage: 'es', author: { '@type': 'Organization', name: 'Molina Soluciones Digitales' }, publisher: { '@type': 'Organization', name: 'Molina Soluciones Digitales', logo: { '@type': 'ImageObject', url: SITIO + '/icono-512.png' } }, mainEntityOfPage: SITIO + ruta }, faqLd(x.fq)],
      cuerpo: `<section class="hero"><h1>${esc(x.t)}</h1><p>${esc(x.d)}</p></section>
<section class="cont guia">${migas([['Para tu negocio', '/para-tu-negocio/'], ['Plantillas', '/plantillas/'], [x.n]])}<p class="intro">${esc(x.i)}</p>
${boton}
<h2 class="tit">Así se ve</h2>${x.hojas.map((h, k) => `<h3 class="hoja-n"><span>${k + 1}</span>${h.t ? esc(h.t) : `Hoja «${esc(h.n)}»`}${h.d ? ` <small>${esc(h.d)}</small>` : ''}</h3>${h.lados ? `<div class="lados">${h.lados.map(l => `<div><p class="lado-n">${esc(l.n)}</p>${verHoja(l)}</div>`).join('')}</div>` : verHoja(h)}`).join('')}<p class="nota-h"><span class="mu llena"></span>Amarillas: las llenas tú. <span class="mu calc"></span>Rosadas: se calculan solas y vienen bloqueadas para que no se borren. Los datos son de ejemplo.</p>
<h2 class="tit">Qué incluye</h2><ul class="errs">${x.inc.map(c => `<li>${esc(c)}</li>`).join('')}</ul>
<h2 class="tit">Cómo usarla</h2><ol class="pasos">${x.p.map(([n, d]) => `<li><h3>${esc(n)}</h3><p>${esc(d)}</p></li>`).join('')}</ol>
${g ? `<p class="intro">¿Quieres el método completo? Lee la guía <a href="/guias/${g.s}/">${esc(g.t)}</a>.</p>` : x.pago ? `<p class="intro">¿Prefieres empezar con una sola parte? Las <a href="/plantillas/">plantillas sueltas</a> son gratis.</p>` : ''}
<div class="pto" style="margin-top:22px"><h3>${x.pago ? 'Y si quieres llevarlo desde el celular' : 'Y si no quieres llenarla a mano'}</h3><p>${esc(x.vm || (x.vmA + ' En Gestión de Negocio VM: ' + (g ? g.vm.charAt(0).toLowerCase() + g.vm.slice(1) : '')))}</p></div>
<h2 class="tit">Preguntas frecuentes</h2>${faq(x.fq)}
${invita('Pruébalo en tu negocio', 'Crea tu cuenta, elige tu tipo de negocio y usa el programa gratis 7 días.')}
${PLANTILLAS.length > 1 ? `<h2 class="tit">Más plantillas</h2>${PREVIA ? plTarjetas() : chips(PL_LISTAS.filter(y => y !== x).map(y => [y.n, `/plantillas/${y.s}/`]))}` : ''}</section>` }));
    urls.push(ruta);
  });
  if (PL_LISTAS.length) {
    poner('/plantillas/', pagina({ ruta: '/plantillas/', marca: true, modulo: true, medir: 'tc-plant', title: 'Plantillas gratis en Excel para tu negocio · Molina', desc: 'Plantillas gratis en Excel para negocios de Honduras: inventario, cierre y arqueo de caja, ventas al crédito, precios, gastos y pedidos. Se descargan sin registrarte.',
      cuerpo: `<section class="hero"><h1>Plantillas gratis para tu negocio</h1><p>Hojas de Excel listas para llenar. Se descargan sin registrarte y sirven en el celular.</p></section>
<section class="cont">${migas([['Para tu negocio', '/para-tu-negocio/'], ['Plantillas']])}${plTarjetas()}
${invita('¿Y si se llenara sola?', 'Con Gestión de Negocio VM cada venta actualiza tu inventario, tu caja y tus cuentas por cobrar. Pruébalo gratis 7 días.')}</section>` }));
    urls.push('/plantillas/');
  }

  // Módulo aparte «Para tu negocio»: el programa por tipo de negocio y las guías (las tiendas van siempre primero en el resto del sitio)
  poner('/para-tu-negocio/', pagina({ ruta: '/para-tu-negocio/', marca: true, modulo: true, medir: 'tc-negocio', title: 'Para tu negocio · Ventas, inventario y tienda en línea en Honduras', desc: 'Gestión de Negocio VM: sistema de punto de venta, inventario, caja y tienda en línea para negocios de Honduras. Elige tu tipo de negocio y pruébalo gratis 7 días.',
    cuerpo: `<section class="hero"><h1>Un programa hecho para tu tipo de negocio</h1><p>Ventas, inventario, caja y cuentas por cobrar desde tu celular, con tu tienda en línea para aparecer en Tiendas Catrachas.</p><p class="dos"><a class="btn oro" href="${prob}">Probar gratis 7 días</a> <a class="btn linea claro" href="${WA}" rel="noopener">Escríbenos por WhatsApp</a></p></section>
<section class="cont"><h2 class="tit">¿Qué tipo de negocio tienes?</h2><div class="negocios">${PARA.map((pn, k) => `<a class="neg" href="/programa/${slug(pn)}/"><h3>${esc(NEGOCIOS[k][0])}</h3><p>${esc(NEGOCIOS[k][1])}</p></a>`).join('')}</div>
<h2 class="tit">Lo que trae para todos</h2><div class="todos">${COMUN.map(([n, d]) => `<div class="pto"><h3>${esc(n)}</h3><p>${esc(d)}</p></div>`).join('')}</div>
<h2 class="tit">Guías</h2><div class="negocios">${GUIAS.map(g => `<a class="neg" href="/guias/${g.s}/"><h3>${esc(g.t)}</h3><p>${esc(g.d)}</p></a>`).join('')}</div>
${PL_LISTAS.length ? `<h2 class="tit">Plantillas gratis</h2>${plTarjetas()}` : ''}
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
  const girosTop = Object.keys(GIROS).map(g => [g, T.filter(t => t.giros.includes(g)).length]).filter(x => x[1]).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const buscaPortada = `<form class="pt-busca" action="/tiendas/" method="get" role="search"><label><span class="oculto">Buscar tienda</span><input name="q" type="search" placeholder="¿Qué buscas? Flores, comida, mascotas…" autocomplete="off"></label><button type="submit">Buscar</button></form><script>if (innerWidth < 641) document.querySelector('.pt-busca input').placeholder = '¿Qué buscas?';</script>${girosTop.length ? `<div class="pt-chips">${girosTop.map(([g]) => `<a href="/tiendas/${slug(GIROS[g])}/">${esc(GIROS[g])}</a>`).join('')}</div>` : ''}`;
  archivos['/index.html'] = pagina({ ruta: '/', marca: true, medir: 'tc-inicio', title: 'Molina Soluciones Digitales · Negocios de Honduras con tienda en línea', desc: 'Conoce los negocios de Honduras que venden en línea con Gestión de Negocio VM y crea la tienda de tu negocio.', ld: listaLd('Negocios con tienda en línea', top),
    cuerpo: `${portada('Negocios de Honduras con tienda en línea', 'Entra a su tienda, mira el catálogo y haz tu pedido directo con el negocio.', buscaPortada)}
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
