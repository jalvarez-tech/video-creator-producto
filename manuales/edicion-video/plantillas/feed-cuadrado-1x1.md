# Plantilla · Feed Cuadrado 1:1 — `feed-cuadrado-1x1`

**Uso:** repurpose de un clip/talking-head para feed de Instagram / LinkedIn.
**Composición Remotion:** `FeedCuadrado` · **Preset:** `remotion/src/motor/presets.ts → feedCuadrado`
**Frame de referencia:** desde `remotion/`, `npx remotion still FeedCuadrado out/plantilla-1x1.png --frame=60`

## Las 5 decisiones
- **Formato:** 1:1 · 1080×1080 · fps = original (demo 30) · layout centrado · zona segura 8%.
- **Subtítulos:** Inter 46px · abajo-centro (y 83%) · ~6 palabras/línea · blanco + **barra tenue** (feed silencioso).
- **Títulos:** banda superior (pastilla con punto de acento), entra bajando · duración 90 frames.
- **Revisión:** frames [0, 60] · prueba 720p (720×720) · checklist [texto dentro del cuadro · contraste · la banda no tapa la cara] · confirmar antes de exportar.
- **Exportación:** h264 · aac 192k normalizado · `{proyecto}-{titulo}-1x1.mp4` → `finales/`.

## Cómo usarla
- Previsualiza: `npm run dev` → composición **FeedCuadrado**.
- Frame de prueba: `npx remotion still FeedCuadrado out/check.png --frame=60`.
- Cambiar textos: hoy en `remotion/src/motor/FeedCuadrado.tsx`.
- Cambiar color de marca: `remotion/src/motor/theme.ts → accent`.
