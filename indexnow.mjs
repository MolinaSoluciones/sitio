// TIENDAS CATRACHAS · Aviso automático a Bing (IndexNow) cuando se crea o cambia una página
// Bing (y los buscadores que usan IndexNow) leen la página en minutos en vez de esperar a pasar por su cuenta. Google no usa IndexNow.
// Uso, en el flujo de publicación:
//   node indexnow.mjs preparar   → antes de subir: compara cada página con la publicada y deja la lista de las que cambiaron
//   node indexnow.mjs enviar     → después de publicar: manda esa lista
// Para no molestar al buscador: una página se avisa como mucho una vez cada 24 horas, aunque cambie más veces (el orden por visitas cambia seguido).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
const SALIDA = process.env.SALIDA || 'publico', SITIO = 'https://molinasoluciones.com', HOST = 'molinasoluciones.com';
const LLAVE = '21d0949c7c846b177b3718de1a323f00';
const ESTADO = '/indexnow.json', LISTA = process.env.INDEXNOW_LISTA || '/tmp/indexnow-lista.json', ESPERA = 24 * 3600 * 1000;
const modo = process.argv[2];

if (modo === 'preparar') {
  const mapa = readFileSync(join(SALIDA, 'sitemap.xml'), 'utf8');
  const rutas = [...mapa.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].replace(/&amp;/g, '&')).filter(u => u.indexOf(SITIO + '/') === 0).map(u => u.slice(SITIO.length));
  // Lo que se avisó la última vez (publicado junto al sitio). Si no se puede leer, no se manda nada: así un fallo de red no vuelve a avisar todo.
  let antes = null;
  if (process.env.INDEXNOW_ANTES) antes = JSON.parse(readFileSync(process.env.INDEXNOW_ANTES, 'utf8'));
  else try { const r = await fetch(SITIO + ESTADO + '?t=' + Date.now(), { signal: AbortSignal.timeout(10000) }); if (r.ok) antes = await r.json(); else if (r.status === 404) antes = {}; } catch (e) { console.log('No se pudo leer el estado anterior:', String(e)); }
  const ahora = Date.now(), nuevo = {}, lista = [];
  for (const ruta of rutas) {
    const f = join(SALIDA, ruta, ruta.endsWith('/') ? 'index.html' : ''); if (!existsSync(f)) continue;
    const h = createHash('sha256').update(readFileSync(f)).digest('hex').slice(0, 16), a = antes && antes[ruta];
    if (!antes) { nuevo[ruta] = a || { h, e: 0 }; continue; }
    if (a && a.h === h) { nuevo[ruta] = a; continue; }                                  // igual que la publicada
    if (a && ahora - (a.e || 0) < ESPERA) { nuevo[ruta] = a; continue; }                // cambió, pero ya se avisó hace poco: queda para la próxima
    nuevo[ruta] = { h, e: ahora }; lista.push(SITIO + ruta);
  }
  writeFileSync(join(SALIDA, ESTADO.slice(1)), JSON.stringify(nuevo));
  writeFileSync(LISTA, JSON.stringify(lista));
  console.log('IndexNow: ' + rutas.length + ' páginas, ' + lista.length + ' por avisar' + (antes ? '' : ' (sin estado anterior: no se avisa nada)'));
} else if (modo === 'enviar') {
  const lista = existsSync(LISTA) ? JSON.parse(readFileSync(LISTA, 'utf8')) : [];
  if (!lista.length) { console.log('IndexNow: nada que avisar'); process.exit(0); }
  const r = await fetch('https://api.indexnow.org/indexnow', { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, signal: AbortSignal.timeout(20000),
    body: JSON.stringify({ host: HOST, key: LLAVE, keyLocation: SITIO + '/' + LLAVE + '.txt', urlList: lista }) });
  console.log('IndexNow: ' + lista.length + ' páginas avisadas · respuesta ' + r.status + ' ' + (await r.text()).slice(0, 200));
  if (r.status !== 200 && r.status !== 202) process.exit(1);
} else { console.log('Uso: node indexnow.mjs preparar | enviar'); process.exit(1); }
