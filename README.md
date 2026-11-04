# Tu Psicólogo Forense

Página oficial de **Tu Psicólogo Forense**: frases y videos sobre desamor, nostalgia, soledad, amor y crecimiento personal.
Sitio estático y gratuito, pensado para **GitHub Pages**. No usa servidores ni servicios de pago.

---

## ✏️ Cómo añadir contenido (lo único que necesitas tocar)

Todo el contenido vive en la carpeta **`datos/`**. Puedes editar esos archivos directamente en GitHub (abre el archivo y pulsa el lápiz ✏️). Al guardar, la página se actualiza sola en 1–2 minutos.

### Añadir una frase → `datos/frases.json`

Copia un bloque, pégalo **al principio de la lista** (justo después de `[`) y cambia el texto:

```json
{ "texto": "Tu nueva frase aquí.", "categoria": "desamor", "fecha": "2026-11-05" },
```

| Campo | Qué poner |
|---|---|
| `texto` | La frase. Si lleva comillas dobles dentro, escríbelas así: `\"` |
| `categoria` | `desamor` · `nostalgia` · `soledad` · `reflexiones` · `amor` · `recuerdos` · `crecimiento` |
| `fecha` | Año-mes-día, por ejemplo `2026-11-05` |

- Las frases se ordenan solas por fecha (la más reciente primero) y reciben su número de «Evidencia Nº».
- Si escribes una categoría nueva (por ejemplo `"categoria": "perdón"`), aparece sola como filtro.

> 🟡 **Contenido provisional.** Solo las 2 primeras frases son tuyas. Las otras 20 son ejemplos escritos para mostrar el diseño y llevan `"provisional": true`. Para reemplazarlas, busca `provisional` en el archivo y cambia o borra esas líneas. A los visitantes no se les muestra ninguna marca: es solo para que tú las identifiques.

### Añadir un video → `datos/videos.json`

Pega el enlace del video tal cual lo copias de la app:

```json
{ "titulo": "Autopsia de una despedida", "url": "https://www.tiktok.com/@tuusuario/video/7312345678901234567", "fecha": "2026-11-05" },
```

- **TikTok**: usa el enlace largo que contiene `/video/números`. Así se reproduce dentro de la página. Si pegas un enlace corto (`vm.tiktok.com/...`), el video abre TikTok en otra pestaña.
- **YouTube Shorts**: sirven `youtube.com/shorts/...`, `youtu.be/...` o `youtube.com/watch?v=...`. La miniatura se obtiene automáticamente.
- **Miniatura propia (opcional)**: sube una imagen vertical a `assets/img/` y añade `"miniatura": "assets/img/mi-portada.jpg"`.
- **Video sin enlace todavía**: deja `"url": ""` y pon `"plataforma": "tiktok"` o `"youtube"`; aparecerá como «Próximamente», sin botones rotos.
- **Los 8 videos actuales son espacios provisionales** (`"provisional": true`): tienen títulos de muestra y ningún enlace, así que se ven como «Próximamente». Cámbialos por tus videos reales o bórralos.
- **Video propio (MP4)**: súbelo a `videos/` y usa `"archivo": "videos/mi-video.mp4"` en lugar de `url` (máx. 100 MB por archivo en GitHub).

### Tus redes y textos → `datos/config.json`

```json
"redes": {
  "tiktok":   { "url": "https://www.tiktok.com/@tuusuario", "usuario": "@tuusuario" },
  "youtube":  { "url": "https://www.youtube.com/@tucanal", "usuario": "@tucanal" },
  "facebook": { "url": "https://www.facebook.com/tupagina", "usuario": "Tu Psicólogo Forense" }
}
```

Ahora mismo todas las `url` y los `usuario` están vacíos a propósito. Mientras una `url` esté vacía, esa red se muestra como «Próximamente».
En este mismo archivo puedes cambiar la **frase principal**, la **presentación**, cuántas frases se muestran por página y las categorías.
Si quieres una foto real en la portada (por ejemplo, una calle tuya bajo la lluvia), súbela a `assets/img/` y escribe su ruta en `"imagenPortada"`.

### ⚠️ Reglas para que el JSON no se rompa

1. Cada bloque `{ ... }` va separado del siguiente por una **coma**.
2. El **último** bloque de la lista **no** lleva coma.
3. Usa siempre comillas dobles `"`.

Si algo queda mal escrito, la página no se rompe: muestra un aviso que dice qué archivo revisar. También puedes pegar el contenido en <https://jsonlint.com> para encontrar el error.

---

## 🚀 Publicar en GitHub Pages

Dirección prevista: **<https://tupsicologoforense.github.io/>**

1. El repositorio debe llamarse exactamente `tupsicologoforense.github.io` y pertenecer a la organización `tupsicologoforense`. Así la dirección queda en la raíz, sin nada después de la barra.
2. **Settings → Pages → Source: Deploy from a branch**, rama `main`, carpeta `/ (root)`.
3. Espera 1–2 minutos y abre la dirección.
4. Para comprobar la vista previa: pega la dirección en el [Depurador de Facebook](https://developers.facebook.com/tools/debug/) y pulsa «Volver a extraer». WhatsApp guarda la vista previa en caché; si cambias la imagen, puede tardar en actualizarse.

La vista previa (`assets/img/compartir.jpg`, 1200×630) y las URL de `index.html` (`og:url`, `og:image`, `twitter:image` y `canonical`) ya apuntan a esa dirección. Si algún día cambia (por ejemplo, con un dominio propio), actualiza esas líneas y la imagen.

## 👀 Verlo en tu computadora antes de publicar

El navegador no deja leer los archivos JSON si abres `index.html` con doble clic. Abre una terminal en esta carpeta y ejecuta:

```bash
python3 -m http.server 8000
```

Luego entra a <http://localhost:8000>.

---

## 🗂️ Estructura

```
index.html            Página principal (estructura)
404.html              Página «Escena no encontrada»
datos/
  config.json         Marca, textos, redes y categorías
  frases.json         Tus frases
  videos.json         Tus videos
assets/
  css/estilos.css     Diseño (colores en la sección 1, «Variables»)
  js/app.js           Funcionamiento (no hace falta tocarlo)
  img/                Favicon, imagen para compartir y tus imágenes
videos/               Videos MP4 propios (opcional)
```

## Identidad visual

- Paleta: negro `#07080a`, grafito, plata `#c3c8d0`, tiza `#ebe9e4` y el amarillo del marcador `#e9b923` (solo como acento).
- Tipografías: *Cormorant Garamond* (frases y títulos) y *Jost* (textos e interfaz), desde Google Fonts.
- Elemento de marca: la silueta forense de tiza y el marcador amarillo numerado, dibujados en SVG dentro de `index.html` (`#silueta` y `#marcador`) para reutilizarlos en cualquier parte.
- La escena de la portada (ciudad, farola, lluvia y reflejos) se dibuja con código: no pesa nada y se adapta a cualquier pantalla. Respeta la opción del sistema «reducir movimiento».
