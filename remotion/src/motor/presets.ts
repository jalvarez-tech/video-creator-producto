/**
 * Presets canónicos de las 3 plantillas iniciales.
 * Son la "decisión reusable": el componente los lee y no hay que re-preguntar nada.
 * La doc humana de cada uno está en:
 *   manuales/edicion-video/plantillas/<slug>.md
 */

export type Preset = {
  slug: string;
  nombre: string;
  formato: {
    aspecto: string;
    width: number;
    height: number;
    fps: number;
    layout: string;
    zonaSeguraPct: number;
  };
  subtitulos: {
    tipografia: string;
    tamanoPx: number;
    posicionYpct: number; // 0 = arriba, 100 = abajo
    palabrasPorLinea: number;
    barra: boolean; // caja de fondo tenue tras el texto
  };
  titulos: {
    variante: "lower-third" | "hook" | "banda";
    margenPx: number;
    duracionFrames: number;
  };
  exportacion: {
    codec: string;
    audio: { codec: string; bitrate: string; normalizar: boolean };
    nombre: string; // patrón de nombre de archivo final
    carpeta: string;
  };
};

// T1 — Tutoriales / demos horizontales para YouTube
export const tutorialYT: Preset = {
  slug: "tutorial-yt-16x9",
  nombre: "Tutorial YouTube 16:9",
  formato: {
    aspecto: "16:9",
    width: 1920,
    height: 1080,
    fps: 30,
    layout: "alterna-pantalla-camara",
    zonaSeguraPct: 5,
  },
  subtitulos: {
    tipografia: "Inter",
    tamanoPx: 40,
    posicionYpct: 86,
    palabrasPorLinea: 8,
    barra: false,
  },
  titulos: { variante: "lower-third", margenPx: 64, duracionFrames: 120 },
  exportacion: {
    codec: "h264",
    audio: { codec: "aac", bitrate: "192k", normalizar: true },
    nombre: "{proyecto}-{titulo}-16x9.mp4",
    carpeta: "finales/",
  },
};

// T2 — Clips cortos / talking-head verticales para Reels/TikTok/Shorts
export const verticalSocial: Preset = {
  slug: "vertical-social-9x16",
  nombre: "Vertical Social 9:16",
  formato: {
    aspecto: "9:16",
    width: 1080,
    height: 1920,
    fps: 30,
    layout: "talking-head",
    zonaSeguraPct: 11,
  },
  subtitulos: {
    tipografia: "Inter",
    tamanoPx: 56,
    posicionYpct: 70, // subido para no chocar con la UI de la app
    palabrasPorLinea: 4,
    barra: false,
  },
  titulos: { variante: "hook", margenPx: 56, duracionFrames: 75 },
  exportacion: {
    codec: "h264",
    audio: { codec: "aac", bitrate: "192k", normalizar: true },
    nombre: "{proyecto}-{titulo}-9x16.mp4",
    carpeta: "finales/",
  },
};

// T3 — Repurpose para feed cuadrado (Instagram / LinkedIn)
export const feedCuadrado: Preset = {
  slug: "feed-cuadrado-1x1",
  nombre: "Feed Cuadrado 1:1",
  formato: {
    aspecto: "1:1",
    width: 1080,
    height: 1080,
    fps: 30,
    layout: "centrado",
    zonaSeguraPct: 8,
  },
  subtitulos: {
    tipografia: "Inter",
    tamanoPx: 46,
    posicionYpct: 83,
    palabrasPorLinea: 6,
    barra: true, // barra tenue para el feed
  },
  titulos: { variante: "banda", margenPx: 48, duracionFrames: 90 },
  exportacion: {
    codec: "h264",
    audio: { codec: "aac", bitrate: "192k", normalizar: true },
    nombre: "{proyecto}-{titulo}-1x1.mp4",
    carpeta: "finales/",
  },
};

export const PRESETS = { tutorialYT, verticalSocial, feedCuadrado };

/**
 * LA ZONA SEGURA ES DEL FORMATO, NO DE LA MARCA — y hasta ahora no lo era.
 *
 * `margenSeguro(width, pct = 11)` (graficos/estilos.ts) se llamaba SIN `pct`
 * desde el intérprete, así que los tres presets declaraban su zona segura
 * —5 % en 16:9, 11 % en 9:16, 8 % en 1:1— y el motor usaba el 11 % en los tres.
 * El dato existía, estaba bien, y nadie lo leía: en horizontal el bloque salía
 * con 211 px de margen a cada lado en vez de 96, o sea la mitad del ancho útil
 * tirada. Es el mismo fallo que `escalaPorAncho`, que también vivía en
 * estilos.ts sin que nadie la llamara.
 *
 * Se busca por ASPECTO y no por nombre de preset porque quien pregunta es el
 * intérprete, que solo conoce el lienzo (`useVideoConfig`). El defecto es el
 * 11 % del formato dominante de la casa: un lienzo raro se comporta como hoy en
 * vez de inventarse un margen.
 */
export const zonaSeguraDe = (ancho: number, alto: number): number => {
  for (const clave of Object.keys(PRESETS)) {
    const f = PRESETS[clave as keyof typeof PRESETS].formato;
    // Por PROPORCIÓN, no por píxeles exactos: el mismo 9:16 vale a 1080×1920 y
    // a 720×1280, y una prueba a media resolución no debe cambiar la maqueta.
    if (Math.abs(f.width / f.height - ancho / alto) < 0.01) return f.zonaSeguraPct;
  }
  return 11;
};
