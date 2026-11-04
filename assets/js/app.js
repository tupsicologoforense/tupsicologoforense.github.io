/* ==========================================================================
   TU PSICÓLOGO FORENSE — lógica de la página
   No necesitas tocar este archivo para añadir contenido:
   edita datos/frases.json, datos/videos.json y datos/config.json
   ========================================================================== */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const normalizar = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const movimientoReducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tactil = matchMedia('(pointer: coarse)').matches;

  const CONFIG_BASE = {
    marca: 'Tu Psicólogo Forense',
    frasesPorPagina: 12,
    redes: {},
    categorias: [
      { id: 'desamor', nombre: 'Desamor' }, { id: 'nostalgia', nombre: 'Nostalgia' },
      { id: 'soledad', nombre: 'Soledad' }, { id: 'reflexiones', nombre: 'Reflexiones' },
      { id: 'amor', nombre: 'Amor' }, { id: 'recuerdos', nombre: 'Recuerdos' },
      { id: 'crecimiento', nombre: 'Crecimiento personal' }
    ]
  };
  const REDES = {
    tiktok: { nombre: 'TikTok', texto: 'Videos cortos para las noches largas.' },
    youtube: { nombre: 'YouTube', texto: 'Shorts y reflexiones en video.' },
    facebook: { nombre: 'Facebook', texto: 'Frases y conversación en comunidad.' }
  };

  const estado = {
    config: CONFIG_BASE, categorias: new Map(), frases: [], videos: [],
    categoria: 'todas', busqueda: '', visibles: 12, plataforma: 'todos', destacada: null
  };

  /* ---------- Utilidades ---------- */
  const formatoFecha = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', year: 'numeric' });
  function leerFecha(texto) {
    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(texto ?? '').trim());
    if (!m) return null;
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    return isNaN(d) ? null : d;
  }
  const fechaLarga = d => (d ? formatoFecha.format(d) : '');
  const fechaISO = d => (d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '');
  function huella(texto) { // identificador estable a partir del texto de la frase
    let h = 2166136261;
    for (const c of normalizar(texto)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(36);
  }
  function urlValida(u) {
    try { const x = new URL(u); return x.protocol === 'https:' || x.protocol === 'http:'; } catch { return false; }
  }
  const marca = () => estado.config.marca || CONFIG_BASE.marca;

  let temporizadorAviso;
  function avisar(texto) {
    const el = $('#aviso');
    el.textContent = texto;
    el.classList.add('visible');
    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(() => el.classList.remove('visible'), 2200);
  }

  async function copiarTexto(texto) {
    try { await navigator.clipboard.writeText(texto); return true; } catch {
      const ta = Object.assign(document.createElement('textarea'), { value: texto });
      ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0;top:0';
      document.body.append(ta); ta.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch { /* sin soporte */ }
      ta.remove(); return ok;
    }
  }

  async function cargarJSON(ruta) {
    const r = await fetch(ruta, { cache: 'no-cache' });
    if (!r.ok) throw new Error(`No se encontró el archivo <code>${esc(ruta)}</code>.`);
    const texto = await r.text();
    try { return JSON.parse(texto); } catch (e) {
      throw new Error(`Hay un error de formato en <code>${esc(ruta)}</code> (revisa comas y comillas). Detalle: ${esc(e.message)}`);
    }
  }
  function mostrarError(contenedor, mensaje) {
    const local = location.protocol === 'file:';
    contenedor.innerHTML = `<div class="error"><strong>No se pudo cargar el contenido.</strong><br>${local
      ? 'Abriste el archivo directamente desde la carpeta. Para verlo en tu computadora usa un servidor local (lee el README) o publícalo en GitHub Pages.'
      : mensaje}</div>`;
  }

  /* ---------- Intro ---------- */
  function iniciarIntro() {
    const intro = $('#intro');
    try { sessionStorage.setItem('tpf-intro', '1'); } catch { /* modo privado */ }
    intro.addEventListener('click', () => intro.classList.add('fuera'));
    intro.addEventListener('animationend', e => { if (e.animationName === 'intro-fuera') intro.classList.add('fuera'); });
  }

  /* ---------- Navegación ---------- */
  function iniciarNavegacion() {
    const nav = $('#nav'), boton = $('#menuBoton');
    const alternar = abrir => {
      nav.classList.toggle('nav--abierta', abrir);
      boton.setAttribute('aria-expanded', abrir);
      boton.setAttribute('aria-label', abrir ? 'Cerrar menú' : 'Abrir menú');
      document.body.style.overflow = abrir ? 'hidden' : '';
    };
    boton.addEventListener('click', () => alternar(!nav.classList.contains('nav--abierta')));
    $$('#menu a').forEach(a => a.addEventListener('click', () => alternar(false)));
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('nav--abierta')) alternar(false); });

    const alDesplazar = () => nav.classList.toggle('nav--solida', scrollY > 40);
    addEventListener('scroll', alDesplazar, { passive: true }); alDesplazar();

    const enlaces = new Map($$('#menu a').map(a => [a.getAttribute('href').slice(1), a]));
    const obs = new IntersectionObserver(entradas => entradas.forEach(e => {
      if (e.isIntersecting) enlaces.forEach((a, id) => a.classList.toggle('actual', id === e.target.id));
    }), { rootMargin: '-45% 0px -50% 0px' });
    enlaces.forEach((_, id) => { const s = document.getElementById(id); if (s) obs.observe(s); });
  }

  /* ---------- Aparición suave al hacer scroll ---------- */
  function iniciarRevelado() {
    const obs = new IntersectionObserver(entradas => entradas.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
    }), { threshold: .12, rootMargin: '0px 0px -40px 0px' });
    $$('.revelar').forEach(el => obs.observe(el));
  }

  /* ---------- Linterna en la sección "El universo" ---------- */
  function iniciarLinterna() {
    const seccion = $('#universo'), luz = $('.linterna');
    if (tactil || movimientoReducido) return;
    seccion.addEventListener('pointermove', e => {
      const r = seccion.getBoundingClientRect();
      luz.classList.add('siguiendo');
      luz.style.transform = `translate(${e.clientX - r.left}px, ${e.clientY - r.top}px)`;
    });
    seccion.addEventListener('pointerleave', () => { luz.classList.remove('siguiendo'); luz.style.transform = ''; });
  }

  /* ---------- Escena de la portada: ciudad, farola y lluvia ---------- */
  function iniciarEscena() {
    const portada = $('#inicio'), lienzo = $('#lluvia'), ctx = lienzo.getContext('2d');
    const fondo = document.createElement('canvas');
    fondo.className = 'escena__lienzo'; fondo.setAttribute('aria-hidden', 'true');
    lienzo.before(fondo);

    let W = 0, H = 0, dpr = 1, gotas = [], salpicaduras = [], animando = false, visible = true, raf = 0;

    function aleatorio(semilla) { return () => ((semilla = Math.imul(semilla ^ (semilla >>> 15), 2246822507) + 0x6d2b79f5 | 0) >>> 0) / 4294967296; }

    function dibujarFondo() {
      const g = fondo.getContext('2d');
      fondo.width = W * dpr; fondo.height = H * dpr;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);
      const conFoto = portada.classList.contains('con-foto');
      const horizonte = H * (parseFloat(getComputedStyle(portada).getPropertyValue('--horizonte')) || 70) / 100;
      const lamparaX = W * (parseFloat(getComputedStyle(portada).getPropertyValue('--lampara-x')) || 74) / 100;
      const r = aleatorio(7);

      if (!conFoto) {
        const ciudad = document.createElement('canvas');
        ciudad.width = W * dpr; ciudad.height = horizonte * dpr;
        const c = ciudad.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
        const capas = [
          { color: '#121820', min: .2, max: .48, luz: .05, ancho: [40, 110] },
          { color: '#0c0f14', min: .1, max: .34, luz: .09, ancho: [30, 90] }
        ];
        for (const capa of capas) {
          let x = -20;
          while (x < W) {
            const w = capa.ancho[0] + r() * (capa.ancho[1] - capa.ancho[0]);
            const h = H * (capa.min + r() * (capa.max - capa.min));
            const y = horizonte - h;
            c.fillStyle = capa.color; c.fillRect(x, y, w, h);
            if (r() < .25) c.fillRect(x + w * .4, y - 18 - r() * 30, 2, 20 + r() * 30); // antenas
            for (let wy = y + 10; wy < horizonte - 8; wy += 9) {
              for (let wx = x + 6; wx < x + w - 6; wx += 8) {
                if (r() < capa.luz) {
                  const calida = r() < .7;
                  c.fillStyle = calida ? `rgba(255,${190 + r() * 40 | 0},${120 + r() * 40 | 0},${.25 + r() * .5})` : `rgba(170,195,230,${.2 + r() * .4})`;
                  c.fillRect(wx, wy, 3, 4);
                }
              }
            }
            x += w + (r() < .3 ? r() * 14 : 0);
          }
        }
        g.drawImage(ciudad, 0, 0, W, horizonte);
        // Reflejo sobre el asfalto mojado
        g.save();
        g.globalAlpha = .22;
        if ('filter' in g) g.filter = 'blur(2px)';
        g.translate(0, horizonte * 2); g.scale(1, -1);
        g.drawImage(ciudad, 0, 0, W, horizonte);
        g.restore();
        const piso = g.createLinearGradient(0, horizonte, 0, H);
        piso.addColorStop(0, 'rgba(9,11,14,.35)'); piso.addColorStop(.4, 'rgba(7,8,10,.85)'); piso.addColorStop(1, '#07080a');
        g.fillStyle = piso; g.fillRect(0, horizonte, W, H - horizonte);
        g.fillStyle = 'rgba(200,210,225,.08)'; g.fillRect(0, horizonte, W, 1);
      }

      // Farola
      const tope = H * .21, base = H * .9, grosor = Math.max(3, W * .0035);
      g.fillStyle = '#050608';
      g.fillRect(lamparaX - grosor / 2, tope + 14, grosor, base - tope - 14);
      g.fillRect(lamparaX - grosor * 2, base - 8, grosor * 4, 8);
      g.beginPath(); g.moveTo(lamparaX - 13, tope + 16); g.lineTo(lamparaX + 13, tope + 16); g.lineTo(lamparaX + 8, tope - 6); g.lineTo(lamparaX - 8, tope - 6); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(lamparaX - 11, tope - 6); g.lineTo(lamparaX, tope - 16); g.lineTo(lamparaX + 11, tope - 6); g.fill();
      const foco = g.createRadialGradient(lamparaX, tope + 5, 0, lamparaX, tope + 5, 16);
      foco.addColorStop(0, 'rgba(255,236,200,.95)'); foco.addColorStop(1, 'rgba(255,205,140,0)');
      g.fillStyle = foco; g.fillRect(lamparaX - 16, tope - 12, 32, 34);
      // Charco de luz en el suelo
      const charco = g.createRadialGradient(lamparaX, base - 10, 0, lamparaX, base - 10, W * .22);
      charco.addColorStop(0, 'rgba(255,205,140,.13)'); charco.addColorStop(1, 'rgba(255,205,140,0)');
      g.save(); g.translate(lamparaX, base - 10); g.scale(1, .28); g.translate(-lamparaX, -(base - 10));
      g.fillStyle = charco; g.beginPath(); g.arc(lamparaX, base - 10, W * .22, 0, Math.PI * 2); g.fill(); g.restore();

      estado.escena = { horizonte, lamparaX };
    }

    function crearGotas() {
      const cantidad = Math.min(tactil ? 140 : 320, Math.round(W * H / 4200));
      gotas = Array.from({ length: cantidad }, () => nuevaGota(true));
    }
    function nuevaGota(inicial) {
      const z = Math.random();
      return {
        x: Math.random() * (W + 200) - 100,
        y: inicial ? Math.random() * H : -40 - Math.random() * 200,
        largo: 10 + z * 22, vel: 9 + z * 14, alfa: .08 + z * .28,
        suelo: estado.escena ? estado.escena.horizonte + Math.random() * (H - estado.escena.horizonte) : H
      };
    }

    function cuadro() {
      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 1;
      const viento = .14;
      for (const g of gotas) {
        // las gotas cerca de la farola brillan más
        const cerca = estado.escena ? Math.max(0, 1 - Math.abs(g.x - estado.escena.lamparaX) / (W * .16)) : 0;
        ctx.strokeStyle = cerca > 0 ? `rgba(255,${225 - cerca * 20 | 0},${200 - cerca * 50 | 0},${Math.min(.75, g.alfa + cerca * .35)})` : `rgba(200,210,225,${g.alfa})`;
        ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(g.x - g.largo * viento, g.y + g.largo); ctx.stroke();
        if (animando) {
          g.y += g.vel; g.x -= g.vel * viento;
          if (g.y > g.suelo) {
            if (salpicaduras.length < 60 && Math.random() < .35) salpicaduras.push({ x: g.x, y: g.suelo, r: 1, a: g.alfa + .15 });
            Object.assign(g, nuevaGota(false));
          }
        }
      }
      for (let i = salpicaduras.length - 1; i >= 0; i--) {
        const s = salpicaduras[i];
        ctx.strokeStyle = `rgba(200,210,225,${s.a})`;
        ctx.beginPath(); ctx.ellipse(s.x, s.y, s.r * 2.2, s.r * .55, 0, 0, Math.PI * 2); ctx.stroke();
        s.r += .45; s.a -= .025;
        if (s.a <= 0) salpicaduras.splice(i, 1);
      }
      if (animando) raf = requestAnimationFrame(cuadro);
    }

    function arrancar() {
      const debe = visible && !document.hidden && !movimientoReducido;
      if (debe && !animando) { animando = true; raf = requestAnimationFrame(cuadro); }
      if (!debe && animando) { animando = false; cancelAnimationFrame(raf); }
    }

    function medir() {
      const r = portada.getBoundingClientRect();
      W = r.width; H = r.height; dpr = Math.min(devicePixelRatio || 1, 1.5);
      lienzo.width = W * dpr; lienzo.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dibujarFondo(); crearGotas(); cuadro();
    }

    let anchoPrevio = 0, espera;
    addEventListener('resize', () => {
      // en celulares la barra del navegador cambia la altura al hacer scroll: solo redibujamos si cambia el ancho
      if (tactil && Math.abs(innerWidth - anchoPrevio) < 2) return;
      clearTimeout(espera); espera = setTimeout(() => { anchoPrevio = innerWidth; medir(); }, 150);
    });
    anchoPrevio = innerWidth;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; arrancar(); }).observe(portada);
    document.addEventListener('visibilitychange', arrancar);
    medir(); arrancar();
    return { redibujar: medir };
  }

  /* ---------- Configuración ---------- */
  function aplicarConfig() {
    const c = estado.config;
    $$('[data-config]').forEach(el => { const v = c[el.dataset.config]; if (typeof v === 'string' && v.trim()) el.textContent = v; });
    if (c.imagenPortada) {
      $('#portadaFoto').style.backgroundImage = `url("${encodeURI(c.imagenPortada)}")`;
      $('#inicio').classList.add('con-foto');
    }
    estado.visibles = Math.max(3, parseInt(c.frasesPorPagina, 10) || 12);
    estado.categorias = new Map();
    (Array.isArray(c.categorias) ? c.categorias : CONFIG_BASE.categorias).forEach(cat => {
      if (cat && cat.id) estado.categorias.set(normalizar(cat.id), { id: normalizar(cat.id), nombre: cat.nombre || cat.id });
    });
    $('#anio').textContent = new Date().getFullYear();
  }

  function categoriaDe(valor) {
    const v = normalizar(valor);
    if (!v) return null;
    for (const cat of estado.categorias.values()) if (cat.id === v || normalizar(cat.nombre) === v) return cat;
    // categoría nueva escrita en frases.json: se crea automáticamente
    const nueva = { id: v, nombre: String(valor).trim().replace(/^./, l => l.toUpperCase()) };
    estado.categorias.set(v, nueva);
    return nueva;
  }

  /* ---------- Frases ---------- */
  function prepararFrases(lista) {
    if (!Array.isArray(lista)) throw new Error('<code>datos/frases.json</code> debe empezar con <code>[</code> y terminar con <code>]</code>.');
    const vistas = new Set();
    const frases = lista
      .filter(f => f && typeof f.texto === 'string' && f.texto.trim())
      .map((f, orden) => {
        let id = f.id ? normalizar(f.id).replace(/[^a-z0-9-]/g, '') : huella(f.texto);
        while (vistas.has(id)) id += 'x';
        vistas.add(id);
        return { id, orden, texto: f.texto.trim(), categoria: categoriaDe(f.categoria), fecha: leerFecha(f.fecha) };
      })
      .sort((a, b) => ((b.fecha?.getTime() ?? 0) - (a.fecha?.getTime() ?? 0)) || (a.orden - b.orden));
    frases.forEach((f, i) => { f.numero = String(frases.length - i).padStart(3, '0'); f.busqueda = normalizar(`${f.texto} ${f.categoria?.nombre ?? ''}`); });
    return frases;
  }

  function filtradas() {
    const q = normalizar(estado.busqueda);
    return estado.frases.filter(f =>
      (estado.categoria === 'todas' || f.categoria?.id === estado.categoria) && (!q || f.busqueda.includes(q)));
  }

  function pintarChips() {
    const cuenta = id => estado.frases.filter(f => id === 'todas' || f.categoria?.id === id).length;
    const chips = [{ id: 'todas', nombre: 'Todas' }, ...estado.categorias.values()];
    $('#chips').innerHTML = chips.map(c => `
      <button class="chip${c.id === estado.categoria ? ' activo' : ''}" data-categoria="${esc(c.id)}" aria-pressed="${c.id === estado.categoria}">
        ${esc(c.nombre)} <small>${cuenta(c.id)}</small>
      </button>`).join('');
  }

  function tarjetaHTML(f, i, nueva) {
    return `
      <article class="tarjeta${nueva ? ' nueva' : ''}" id="f-${esc(f.id)}" data-id="${esc(f.id)}" style="--i:${i}">
        <div class="tarjeta__meta">
          <span class="tarjeta__num">Evidencia Nº ${f.numero}</span>
          ${f.categoria ? `<button class="etiqueta" data-categoria="${esc(f.categoria.id)}" title="Ver todas las frases de ${esc(f.categoria.nombre)}">${esc(f.categoria.nombre)}</button>` : ''}
        </div>
        <blockquote><p>${esc(f.texto)}</p></blockquote>
        <footer class="tarjeta__pie">
          <time datetime="${fechaISO(f.fecha)}">${fechaLarga(f.fecha)}</time>
          <div class="acciones">
            <button class="accion" data-accion="copiar" aria-label="Copiar frase" title="Copiar"><svg aria-hidden="true"><use href="#i-copiar"/></svg></button>
            <button class="accion" data-accion="compartir" aria-label="Compartir frase" title="Compartir"><svg aria-hidden="true"><use href="#i-compartir"/></svg></button>
          </div>
        </footer>
      </article>`;
  }

  function pintarFrases(desde = 0) {
    const lista = filtradas();
    const mostrar = lista.slice(0, estado.visibles);
    const cont = $('#tarjetas');
    cont.innerHTML = mostrar.map((f, i) => tarjetaHTML(f, Math.max(0, i - desde) % 12, i >= desde)).join('');
    $('#frasesVacio').hidden = lista.length > 0;
    $('#frasesVacio').textContent = estado.busqueda ? 'No hay evidencias que coincidan con la búsqueda.' : 'Aún no hay frases en esta categoría.';
    const boton = $('#masFrases');
    boton.hidden = lista.length <= estado.visibles;
    boton.textContent = `Abrir más expedientes (${lista.length - mostrar.length})`;
  }

  function cambiarCategoria(id) {
    estado.categoria = id;
    estado.visibles = Math.max(3, parseInt(estado.config.frasesPorPagina, 10) || 12);
    pintarChips(); pintarFrases();
  }

  function iniciarFrases() {
    $('#chips').addEventListener('click', e => { const b = e.target.closest('[data-categoria]'); if (b) cambiarCategoria(b.dataset.categoria); });
    let espera;
    $('#buscar').addEventListener('input', e => {
      clearTimeout(espera);
      espera = setTimeout(() => { estado.busqueda = e.target.value; estado.visibles = parseInt(estado.config.frasesPorPagina, 10) || 12; pintarFrases(); }, 180);
    });
    $('#masFrases').addEventListener('click', () => {
      const antes = estado.visibles;
      estado.visibles += parseInt(estado.config.frasesPorPagina, 10) || 12;
      pintarFrases(antes);
    });
    document.addEventListener('click', e => {
      const etiqueta = e.target.closest('.tarjeta .etiqueta');
      if (etiqueta) { cambiarCategoria(etiqueta.dataset.categoria); $('#chips').scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
      const accion = e.target.closest('[data-accion]');
      if (!accion) return;
      const id = accion.closest('[data-id]')?.dataset.id;
      const frase = estado.frases.find(f => f.id === id);
      if (!frase) return;
      if (accion.dataset.accion === 'copiar') copiarFrase(frase);
      else compartirFrase(frase, accion);
    });
  }

  const textoFrase = f => `“${f.texto}”\n— ${marca()}`;
  const enlaceFrase = f => `${location.href.split('#')[0]}#f-${f.id}`;
  async function copiarFrase(f) { avisar(await copiarTexto(textoFrase(f)) ? 'Frase copiada' : 'No se pudo copiar'); }

  function compartirFrase(f, boton) {
    const url = enlaceFrase(f), texto = textoFrase(f);
    if (navigator.share && tactil) {
      navigator.share({ title: marca(), text: texto, url }).catch(() => { /* el usuario canceló */ });
      return;
    }
    const menu = $('#compartir');
    $('#cWhatsapp').href = `https://wa.me/?text=${encodeURIComponent(`${texto}\n${url}`)}`;
    $('#cFacebook').href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    $('#cX').href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(texto)}&url=${encodeURIComponent(url)}`;
    $('#cEnlace').onclick = async () => { avisar(await copiarTexto(url) ? 'Enlace copiado' : 'No se pudo copiar'); cerrarMenu(); };
    menu.hidden = false;
    const r = boton.getBoundingClientRect(), m = menu.getBoundingClientRect();
    menu.style.left = `${Math.min(Math.max(8, r.right - m.width), innerWidth - m.width - 8)}px`;
    menu.style.top = `${r.bottom + 8 + m.height > innerHeight ? r.top - m.height - 8 : r.bottom + 8}px`;
    menu.querySelector('a').focus({ preventScroll: true });
    setTimeout(() => {
      document.addEventListener('click', cerrarFuera);
      addEventListener('scroll', cerrarMenu, { once: true, passive: true });
    });
  }
  function cerrarFuera(e) { if (!e.target.closest('#compartir')) cerrarMenu(); }
  function cerrarMenu() { $('#compartir').hidden = true; document.removeEventListener('click', cerrarFuera); }
  $('#compartir').addEventListener('click', e => { if (e.target.closest('a')) setTimeout(cerrarMenu, 50); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#compartir').hidden) cerrarMenu(); });

  function irAFraseDelEnlace() {
    if (!location.hash.startsWith('#f-')) return;
    const id = decodeURIComponent(location.hash.slice(3));
    const f = estado.frases.find(x => x.id === id);
    if (!f) return;
    estado.categoria = 'todas'; estado.busqueda = ''; $('#buscar').value = '';
    estado.visibles = Math.max(estado.visibles, estado.frases.indexOf(f) + 1);
    pintarChips(); pintarFrases(Infinity);
    const el = document.getElementById(`f-${f.id}`);
    $$('.tarjeta.senalada').forEach(t => t.classList.remove('senalada'));
    el.classList.add('senalada');
    $('#intro').classList.add('fuera');
    setTimeout(() => el.scrollIntoView({ behavior: movimientoReducido ? 'auto' : 'smooth', block: 'center' }), 300);
  }

  /* ---------- Evidencia del día ---------- */
  function pintarDestacada(f) {
    const caja = $('#destacada');
    if (!f) { caja.closest('section').hidden = true; return; }
    estado.destacada = f;
    caja.dataset.id = f.id;
    caja.innerHTML = `
      <p>“${esc(f.texto)}”</p>
      <footer>
        ${f.categoria ? `<span>${esc(f.categoria.nombre)}</span><span aria-hidden="true">·</span>` : ''}
        <time datetime="${fechaISO(f.fecha)}">${fechaLarga(f.fecha)}</time>
        <span class="acciones">
          <button class="accion" data-accion="copiar" aria-label="Copiar frase" title="Copiar"><svg aria-hidden="true"><use href="#i-copiar"/></svg></button>
          <button class="accion" data-accion="compartir" aria-label="Compartir frase" title="Compartir"><svg aria-hidden="true"><use href="#i-compartir"/></svg></button>
        </span>
      </footer>`;
  }
  function iniciarDestacada() {
    const lista = estado.frases;
    if (!lista.length) return pintarDestacada(null);
    // La evidencia del día es siempre la frase más reciente (la lista ya está ordenada por fecha)
    pintarDestacada(lista[0]);
    $('#otraFrase').addEventListener('click', () => {
      if (lista.length < 2) return;
      let f; do { f = lista[Math.floor(Math.random() * lista.length)]; } while (f === estado.destacada);
      const caja = $('#destacada');
      caja.classList.add('cambiando');
      setTimeout(() => { pintarDestacada(f); caja.classList.remove('cambiando'); }, movimientoReducido ? 0 : 450);
    });
  }

  /* ---------- Videos ---------- */
  function analizarVideo(v, i) {
    const url = String(v.url ?? '').trim();
    const datos = {
      titulo: String(v.titulo ?? '').trim() || 'Sin título', fecha: leerFecha(v.fecha),
      plataforma: normalizar(v.plataforma) || '', url: urlValida(url) ? url : '',
      miniatura: String(v.miniatura ?? '').trim(), insertar: null, archivo: '', indice: i,
      provisional: v.provisional === true, fotos: false,
      clip: String(v.clip ?? '').trim() // vista previa corta en bucle (mp4 sin sonido)
    };
    if (datos.url) {
      const u = new URL(datos.url), host = u.hostname.replace(/^www\.|^m\./, '');
      if (/(^|\.)tiktok\.com$/.test(host)) {
        datos.plataforma = 'tiktok';
        const [, tipo, id] = u.pathname.match(/\/(video|photo)\/(\d+)/) || [];
        // Videos: reproductor oficial. Publicaciones de fotos (carrusel): inserción oficial de TikTok.
        if (tipo === 'video') datos.insertar = `https://www.tiktok.com/player/v1/${id}?autoplay=1&rel=0&description=0`;
        if (tipo === 'photo') { datos.insertar = `https://www.tiktok.com/embed/v2/${id}`; datos.fotos = true; }
      } else if (/(^|\.)(youtube\.com|youtu\.be)$/.test(host)) {
        datos.plataforma = 'youtube';
        const id = host === 'youtu.be' ? u.pathname.split('/')[1] : (u.pathname.match(/\/(?:shorts|embed|live)\/([\w-]{6,})/)?.[1] || u.searchParams.get('v'));
        if (id && /^[\w-]{6,}$/.test(id)) {
          datos.insertar = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1&modestbranding=1`;
          if (!datos.miniatura) datos.miniatura = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
        }
      }
    } else if (v.archivo) {
      datos.archivo = String(v.archivo).trim();
      datos.plataforma = datos.plataforma || 'propio';
    }
    // compatibilidad con el formato anterior: { "youtube": "ID" }
    if (!datos.url && v.youtube && /^[\w-]{6,}$/.test(v.youtube)) {
      datos.plataforma = 'youtube';
      datos.url = `https://www.youtube.com/shorts/${v.youtube}`;
      datos.insertar = `https://www.youtube-nocookie.com/embed/${v.youtube}?autoplay=1&rel=0&playsinline=1`;
      if (!datos.miniatura) datos.miniatura = `https://i.ytimg.com/vi/${v.youtube}/hqdefault.jpg`;
    }
    datos.estado = datos.insertar || datos.archivo ? 'activo' : datos.url ? 'externo' : 'pronto';
    return datos;
  }

  const NOMBRE_PLATAFORMA = { tiktok: 'TikTok', youtube: 'Shorts', propio: 'Video' };

  function clipHTML(v, i) {
    const icono = v.plataforma === 'tiktok' || v.plataforma === 'youtube' ? `<svg aria-hidden="true"><use href="#i-${v.plataforma}"/></svg>` : '';
    const contenido = `
      <span class="clip__poster" style="--tono:${(205 + v.indice * 37) % 360}"><svg class="clip__silueta" style="--giro:${(v.indice % 2 ? 1 : -1) * (6 + v.indice * 5 % 14)}deg" aria-hidden="true"><use href="#silueta"/></svg><span class="marcador clip__marcador"><svg><use href="#marcador"/></svg><b>${v.indice + 1}</b></span></span>
      ${v.miniatura ? `<img class="clip__img" src="${esc(v.miniatura)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : ''}
      ${v.clip && !movimientoReducido ? `<video class="clip__vid" data-src="${esc(v.clip)}" muted loop playsinline preload="none" disablepictureinpicture aria-hidden="true"></video>` : ''}
      <span class="clip__plataforma">${icono}${esc(NOMBRE_PLATAFORMA[v.plataforma] || 'Video')}${v.fotos ? ' · Fotos' : ''}</span>
      ${v.estado === 'pronto' ? '<span class="clip__pronto">Próximamente</span>' : '<span class="clip__play"><svg aria-hidden="true"><use href="#i-play"/></svg></span>'}
      <span class="clip__info"><h3>${esc(v.titulo)}</h3>${v.fecha ? `<time datetime="${fechaISO(v.fecha)}">${fechaLarga(v.fecha)}</time>` : ''}</span>`;
    const etiqueta = `${esc(v.titulo)}${v.estado === 'pronto' ? ' (próximamente)' : ''}`;
    let enlace;
    if (v.estado === 'activo') enlace = `<button class="clip__enlace" data-video="${v.indice}" aria-label="Reproducir: ${etiqueta}">${contenido}</button>`;
    else if (v.estado === 'externo') enlace = `<a class="clip__enlace" href="${esc(v.url)}" target="_blank" rel="noopener" aria-label="Ver en ${esc(NOMBRE_PLATAFORMA[v.plataforma] || 'su plataforma')}: ${etiqueta}">${contenido}</a>`;
    else enlace = `<div class="clip__enlace" role="img" aria-label="${etiqueta}">${contenido}</div>`;
    return `<article class="clip clip--${v.estado === 'pronto' ? 'pronto' : 'activo'}" style="--i:${i}">${enlace}</article>`;
  }

  function pintarVideos() {
    const lista = estado.videos.filter(v => estado.plataforma === 'todos' || v.plataforma === estado.plataforma);
    $('#galeria').innerHTML = lista.map(clipHTML).join('');
    $('#videosVacio').hidden = lista.length > 0;
    $$('#galeria .clip__vid').forEach(v => observadorClips.observe(v));
  }

  // Las vistas previas solo se descargan y reproducen mientras la tarjeta está a la vista
  const observadorClips = new IntersectionObserver(entradas => entradas.forEach(({ target: v, isIntersecting }) => {
    if (isIntersecting) {
      if (!v.src) v.src = v.dataset.src;
      v.play().then(() => v.classList.add('reproduciendo')).catch(() => { /* reproducción automática bloqueada: queda la portada */ });
    } else v.pause();
  }), { threshold: .4 });

  async function miniaturaTikTok(v) { // TikTok ofrece la miniatura públicamente mediante oEmbed
    try {
      const r = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(v.url)}`);
      if (!r.ok) return;
      const d = await r.json();
      if (d.thumbnail_url) { v.miniatura = d.thumbnail_url; pintarVideos(); }
    } catch { /* se queda la portada ilustrada */ }
  }

  function iniciarVideos(lista) {
    if (!Array.isArray(lista)) throw new Error('<code>datos/videos.json</code> debe empezar con <code>[</code> y terminar con <code>]</code>.');
    estado.videos = lista.filter(v => v && typeof v === 'object').map(analizarVideo)
      .map((v, i, arr) => ({ ...v, indice: arr.length - 1 - i }))
      // primero tus publicaciones reales (de la más nueva a la más antigua), al final los espacios provisionales
      .sort((a, b) => (a.provisional - b.provisional) || ((b.fecha?.getTime() ?? 0) - (a.fecha?.getTime() ?? 0)));
    pintarVideos();
    estado.videos.filter(v => v.plataforma === 'tiktok' && v.url && !v.miniatura).forEach(miniaturaTikTok);
  }

  function iniciarControlesVideo() {
    $('#chipsVideos').addEventListener('click', e => {
      const b = e.target.closest('[data-plataforma]');
      if (!b) return;
      estado.plataforma = b.dataset.plataforma;
      $$('#chipsVideos .chip').forEach(c => { const on = c === b; c.classList.toggle('activo', on); c.setAttribute('aria-pressed', on); });
      pintarVideos();
    });
    $('#galeria').addEventListener('click', e => {
      const b = e.target.closest('[data-video]');
      if (b) abrirVideo(estado.videos.find(v => v.indice === +b.dataset.video), b);
    });
    // si una miniatura falla, se muestra la portada ilustrada
    $('#galeria').addEventListener('error', e => { if (e.target.matches?.('.clip__img')) e.target.remove(); }, true);
  }

  /* ---------- Reproductor ---------- */
  let origenFoco = null;
  function abrirVideo(v, origen) {
    if (!v) return;
    origenFoco = origen;
    const modal = $('#modal'), cont = $('#modalVideo');
    if (v.archivo) {
      cont.innerHTML = `<video src="${esc(v.archivo)}" controls autoplay playsinline></video>`;
    } else {
      cont.innerHTML = `<iframe src="${esc(v.insertar)}" title="${esc(v.titulo)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
    }
    $('#modalTitulo').textContent = v.titulo;
    const enlace = $('#modalEnlace');
    enlace.hidden = !v.url;
    if (v.url) { enlace.href = v.url; enlace.firstChild.textContent = `Ver en ${v.plataforma === 'tiktok' ? 'TikTok' : 'YouTube'} `; }
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    $('.modal__cerrar').focus();
  }
  function cerrarVideo() {
    const modal = $('#modal');
    if (modal.hidden) return;
    modal.hidden = true;
    $('#modalVideo').innerHTML = ''; // detiene la reproducción
    document.body.style.overflow = '';
    origenFoco?.focus({ preventScroll: true });
  }
  $('#modal').addEventListener('click', e => { if (e.target.closest('[data-cerrar]')) cerrarVideo(); });
  document.addEventListener('keydown', e => {
    if ($('#modal').hidden) return;
    if (e.key === 'Escape') cerrarVideo();
    if (e.key === 'Tab') { // mantiene el foco dentro del reproductor
      const focos = $$('#modal button, #modal a:not([hidden]), #modal iframe, #modal video');
      const [primero, ultimo] = [focos[0], focos[focos.length - 1]];
      if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
    }
  });

  /* ---------- Redes ---------- */
  function pintarRedes() {
    const redes = estado.config.redes || {};
    $('#redesLista').innerHTML = Object.entries(REDES).map(([clave, info]) => {
      const r = redes[clave] || {}, activa = urlValida(r.url);
      const interior = `
        <div class="red__cabeza">
          <svg class="red__icono" aria-hidden="true"><use href="#i-${clave}"/></svg>
          ${activa ? '<svg class="red__flecha" aria-hidden="true"><use href="#i-flecha"/></svg>' : '<span class="red__estado">Próximamente</span>'}
        </div>
        <div><h3>${info.nombre}</h3><p>${esc(r.usuario || info.texto)}</p></div>`;
      return activa
        ? `<a class="red revelar" href="${esc(r.url)}" target="_blank" rel="noopener me">${interior}</a>`
        : `<div class="red red--pronto revelar">${interior}</div>`;
    }).join('');
    $('#perfilesVideo').innerHTML = ['tiktok', 'youtube'].map(clave => {
      const r = redes[clave] || {};
      const texto = `<svg aria-hidden="true"><use href="#i-${clave}"/></svg> Ver más en ${REDES[clave].nombre}`;
      return urlValida(r.url)
        ? `<a class="boton" href="${esc(r.url)}" target="_blank" rel="noopener">${texto}</a>`
        : `<span class="boton" aria-disabled="true">${texto} · pronto</span>`;
    }).join('');
  }

  /* ---------- Arranque ---------- */
  async function iniciar() {
    iniciarIntro();
    iniciarNavegacion();
    iniciarLinterna();
    iniciarFrases();
    iniciarControlesVideo();

    const [config, frases, videos] = await Promise.allSettled([
      cargarJSON('datos/config.json'), cargarJSON('datos/frases.json'), cargarJSON('datos/videos.json')
    ]);
    if (config.status === 'fulfilled' && config.value && typeof config.value === 'object') {
      estado.config = { ...CONFIG_BASE, ...config.value };
    } else if (config.status === 'rejected') console.warn('[config]', config.reason.message);
    aplicarConfig();
    const escena = iniciarEscena();
    if (estado.config.imagenPortada) escena.redibujar();
    pintarRedes();

    try {
      if (frases.status === 'rejected') throw frases.reason;
      estado.frases = prepararFrases(frases.value);
      pintarChips(); pintarFrases(); iniciarDestacada();
    } catch (e) { mostrarError($('#tarjetas'), e.message); pintarDestacada(null); }

    try {
      if (videos.status === 'rejected') throw videos.reason;
      iniciarVideos(videos.value);
    } catch (e) { mostrarError($('#galeria'), e.message); }

    iniciarRevelado();
    irAFraseDelEnlace();
    addEventListener('hashchange', irAFraseDelEnlace);
  }

  iniciar();
})();
