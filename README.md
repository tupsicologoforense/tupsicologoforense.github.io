# Mis Frases y Videos

Sitio web sencillo para publicar frases y videos, alojado gratis en GitHub Pages.

## Cómo añadir contenido

Edita **`contenido.js`** (se puede hacer desde la web de GitHub con el ícono ✏️):

- **Frase:** `{ texto: "Tu frase", fecha: "2026-11-04" },`
- **Video de YouTube:** `{ titulo: "Título", youtube: "ID_DEL_VIDEO" },`
- **Video propio:** súbelo a la carpeta `videos/` y añade `{ titulo: "Título", archivo: "videos/nombre.mp4" },`

> GitHub no acepta archivos de más de 100 MB. Para videos largos es mejor subirlos a YouTube.

## Publicar en GitHub Pages

1. En el repositorio: **Settings → Pages**.
2. En *Source*, elige **Deploy from a branch**, rama `main`, carpeta `/ (root)`.
3. Guarda. En 1–2 minutos tu sitio estará en `https://TU-USUARIO.github.io/mis-frases/`.
