# molinasoluciones.com

Sitio de Molina Soluciones Digitales. Hoy contiene **Tiendas Catrachas** (`/tiendas/`): el directorio público de las tiendas en línea de Gestión de Negocio VM.

- `generar.mjs` escribe todas las páginas (directorio, tipo de negocio, ciudad, ficha de cada tienda, sitemap) en la carpeta `publico/`.
- `.github/workflows/generar.yml` lo ejecuta cada 30 minutos y publica el resultado en GitHub Pages.
- Solo aparecen los negocios que encendieron «Aparecer en Tiendas Catrachas» en «Mi tienda en línea», con la tienda en línea pagada y productos propios.
- No hay claves secretas en este repositorio.

Probar en la computadora: `node generar.mjs --muestra muestra.json`

## Plantillas (`/plantillas/`)

- Los archivos de Excel están en `descargas/` y se crean con `python3 herramientas/plantillas.py` (después se recalculan con LibreOffice para que lleven los valores guardados).
- La plantilla completa es de pago: `herramientas/plantilla_completa.py` la crea sin contraseña en `/tmp` y la cifra con la variable `CLAVE_COMPLETA`. **La contraseña nunca va en este repositorio.**
- Las páginas salen del arreglo `PLANTILLAS` de `generar.mjs`.
