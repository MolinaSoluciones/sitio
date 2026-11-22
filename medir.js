/* Tiendas Catrachas · contador propio del sitio (molinasoluciones.com)
 * Manda al servidor de Gestión de Negocio VM qué página se vio, de dónde llegó la persona y si usa celular o computadora.
 * También cuenta los toques para entrar a una tienda y lo que se escribe en el buscador.
 * No guarda nombres ni teléfonos: solo un número al azar del navegador para contar personas distintas.
 * Para no contarse uno mismo: abrir cualquier página del sitio con ?yo=1 (y ?yo=0 para volver a contarse). */
(function () {
  var API = 'https://qvhtlezxjklhwlnvexje.supabase.co/functions/v1/api';
  var L = null, ss = null; try { L = window.localStorage; ss = window.sessionStorage; } catch (e) {}
  var get = function (s, k) { try { return (s && s.getItem(k)) || ''; } catch (e) { return ''; } };
  var set = function (s, k, v) { try { if (s) s.setItem(k, v); } catch (e) {} };
  var q = new URLSearchParams(location.search);
  if (q.get('yo') === '1') set(L, 'mv_yo', '1');
  if (q.get('yo') === '0') { try { L.removeItem('mv_yo'); } catch (e) {} }
  function origen() {
    var s = q.get('src') || q.get('utm_source') || '';
    if (s) { set(ss, 'mv_src', s); return s; }
    if (get(ss, 'mv_src')) return get(ss, 'mv_src');
    var ua = navigator.userAgent || '', r = ''; try { r = document.referrer ? new URL(document.referrer).hostname : ''; } catch (e) {}
    var o = /musical_ly|bytedance|tiktok/i.test(ua) || /tiktok/.test(r) ? 'tiktok' : /instagram/i.test(ua) || /instagram/.test(r) ? 'instagram'
      : /FBAN|FBAV|FB_IAB|FBIOS/i.test(ua) || /facebook|fb\.com|fb\.me/.test(r) ? 'facebook' : /whatsapp/i.test(ua) || /whatsapp|wa\.me/.test(r) ? 'wa'
      : /google\./.test(r) ? 'google' : /bing\./.test(r) ? 'bing' : /youtube/.test(r) ? 'youtube' : r && r === location.hostname ? 'directo' : r ? 'otro-sitio' : 'directo';
    set(ss, 'mv_src', o); return o;
  }
  var ORIGEN = origen();
  function vid() { var v = get(L, 'mv_vid'); if (!v) { v = Date.now().toString(36) + Math.random().toString(36).slice(2, 10); set(L, 'mv_vid', v); } return v; }
  var slug = function (t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); };
  function manda(p) {
    try {
      p = String(p || '').slice(0, 30); if (!p || get(L, 'mv_yo')) return;
      if ((/^(localhost|127\.|192\.168\.)/.test(location.hostname) || location.protocol === 'file:') && !window.__tcPrueba) return;
      var k = 'mv_t_' + p, ult = Number(get(L, k) || 0); if (Date.now() - ult < 30 * 60000) return; // la misma página cuenta una vez cada 30 minutos por navegador
      set(L, k, String(Date.now()));
      var ref = ''; try { ref = document.referrer ? new URL(document.referrer).hostname : ''; } catch (e) {}
      var cuerpo = JSON.stringify({ action: 'visita', data: { p: p, o: ORIGEN, d: /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'cel' : 'pc', v: vid(), r: ref } });
      var ok = false; try { ok = navigator.sendBeacon && navigator.sendBeacon(API, cuerpo); } catch (e) {}
      if (!ok) fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: cuerpo, keepalive: true }).catch(function () {});
    } catch (e) {}
  }
  if (window.tcPagina) manda(window.tcPagina);
  // Toques para entrar a una tienda (botón «Entrar a la tienda» y productos de la ficha)
  document.addEventListener('click', function (e) { var a = e.target && e.target.closest ? e.target.closest('[data-ir]') : null; if (a) manda('tc-ir-' + a.getAttribute('data-ir')); });
  // Descargas de plantillas (botón «Descargar la plantilla»)
  document.addEventListener('click', function (e) { var a = e.target && e.target.closest ? e.target.closest('[data-bajar]') : null; if (a) manda('tc-bajar-' + a.getAttribute('data-bajar')); });
  // Lo que escriben en el buscador del directorio (cuando dejan de escribir)
  var b = document.getElementById('buscar'), t = 0;
  if (b) b.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { var s = slug(b.value).slice(0, 25); if (s.length >= 3) manda('tc-b-' + s); }, 2500); });
})();
