# 🧩 Sistema de plantillas — `edicion-video`

> Una plantilla **no es un diseño bonito**: es una **decisión reusable** que Claude aplica sin volver a preguntarlo todo.
> No se copian plantillas ajenas — se construye **tu biblioteca**, la que convierte *tu* forma de grabar en algo repetible.

## Cómo funciona
- **Datos canónicos (para no re-preguntar):** `remotion/src/motor/presets.ts` — presets tipados que el componente lee.
- **Doc humana de cada plantilla:** `plantillas/<slug>.md` (la decisión explicada + frame de referencia).
- **Componente reutilizable:** `remotion/src/motor/<Nombre>.tsx` (lee su preset).
- **Tema compartido:** `remotion/src/motor/theme.ts` (color de marca en un solo sitio).
- Un proyecto no reescribe el diseño: **lo llama** (usa la composición + su preset).

## Biblioteca actual (3 plantillas)
| Plantilla | Composición | Formato | Doc |
|---|---|---|---|
| Tutorial YouTube | `TutorialYT` | 16:9 · 1920×1080 | [tutorial-yt-16x9.md](tutorial-yt-16x9.md) |
| Vertical Social | `VerticalSocial` | 9:16 · 1080×1920 | [vertical-social-9x16.md](vertical-social-9x16.md) |
| Feed Cuadrado | `FeedCuadrado` | 1:1 · 1080×1080 | [feed-cuadrado-1x1.md](feed-cuadrado-1x1.md) |

## Qué guarda una plantilla — las 5 dimensiones

Una plantilla completa = 5 decisiones agrupadas para un tipo de vídeo:

### 1. Formato
`aspecto` (16:9 · 9:16 · 1:1) · `resolucion` · `fps` · `layout` (pantalla-completa · split pantalla+cara · demo · talking-head · tráiler) · `zonaSegura` (márgenes %).

### 2. Subtítulos
`tipografia` · `tamaño` (px @1080) · `posicion` (y%, alineación) · `palabrasPorLinea` · `palabrasVisibles` · `contraste` (color texto, borde/sombra, caja de fondo) · `resaltado` (karaoke palabra-a-palabra · color activa · ninguno).

### 3. Títulos
`hookVisual` (tipo de entrada/animación) · `caja` (color, forma, opacidad) · `colorTexto` · `margen` · `duracionFrames` · `zonaSegura` · `posicion`.

### 4. Revisión
`framesAMostrar` (lista de frames clave) · `prueba720` (sí/no) · `checklistErrores` (texto cortado · fuera de zona segura · contraste bajo · subtítulo tapando cara · desync audio) · `confirmarAntesDe` (p. ej. "exportar final").

### 5. Exportación
`resolucion` · `fps` (**= al original**, ver [regla R01](../reglas.md)) · `codec` · `audio` (codec, bitrate, normalizar) · `nombre` (patrón, p. ej. `NNN-titulo-9x16.mp4`) · `carpeta` (`finales/`).

## Esquema `preset.json` (plantilla)

```jsonc
{
  "nombre": "ejemplo",
  "formato":    { "aspecto": "9:16", "resolucion": [1080, 1920], "fps": 30, "layout": "talking-head", "zonaSeguraPct": 8 },
  "subtitulos": { "tipografia": "Inter", "tamañoPx": 72, "posicionYpct": 78, "palabrasPorLinea": 4, "resaltado": "karaoke",
                  "contraste": { "colorTexto": "#FFFFFF", "borde": "#000000", "cajaFondo": null } },
  "titulos":    { "hookVisual": "slide-up", "caja": { "color": "#0f766e", "opacidad": 0.9, "radio": 16 },
                  "colorTexto": "#FFFFFF", "margenPx": 80, "duracionFrames": 60, "posicion": "superior" },
  "revision":   { "framesAMostrar": [0, 45, 90], "prueba720": true,
                  "checklistErrores": ["texto-cortado", "zona-segura", "contraste", "subtitulo-tapa-cara", "desync-audio"],
                  "confirmarAntesDe": "exportar-final" },
  "exportacion":{ "resolucion": [1080, 1920], "fps": "original", "codec": "h264",
                  "audio": { "codec": "aac", "bitrate": "192k", "normalizar": true },
                  "nombre": "{proyecto}-{titulo}-9x16.mp4", "carpeta": "finales/" }
}
```

## Estado
✅ **3 plantillas iniciales listas** (estilo minimalista, para tutoriales 16:9 · vertical 9:16 · feed 1:1). El frame de referencia de cada una se renderiza desde `remotion/` con `npx remotion still <Composición> out/plantilla-<aspecto>.png --frame=60` (el comando exacto está en la doc de cada plantilla).
La marca de un canal vive en `remotion/src/marcas/<canal>.ts` (director-video §5b; el producto trae `ejemplo.ts` como plantilla). `theme.ts` solo fija el acento de estas tres plantillas: cámbialo si quieres que hagan juego con tu marca.
