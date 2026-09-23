# Plantilla · Vertical Social 9:16 — `vertical-social-9x16`

**Uso:** clips cortos y talking-head verticales para Reels / TikTok / Shorts.
**Composición Remotion:** `VerticalSocial` · **Preset:** `remotion/src/motor/presets.ts → verticalSocial`
**Frame de referencia:** desde `remotion/`, `npx remotion still VerticalSocial out/plantilla-9x16.png --frame=60`

## Las 5 decisiones
- **Formato:** 9:16 · 1080×1920 · fps = original (demo 30) · layout talking-head · zona segura 11%.
- **Subtítulos:** Inter 56px · **subido a y 70%** (evita la UI de la app) · ~4 palabras/línea · blanco + sombra fuerte, sin barra.
- **Títulos:** hook arriba-centro con subrayado de acento, entra con pop · duración 75 frames (aparece en los primeros 2–3 s).
- **Revisión:** frames [0, 45, 90] · prueba 720p (720×1280) · checklist [subtítulo dentro de zona segura · legible en móvil · hook en <2 s · el crop no corta la cara] · confirmar antes de exportar.
- **Exportación:** h264 · aac 192k normalizado · `{proyecto}-{titulo}-9x16.mp4` → `finales/`.

## Cómo usarla
- Previsualiza: `npm run dev` → composición **VerticalSocial**.
- Frame de prueba: `npx remotion still VerticalSocial out/check.png --frame=60`.
- Cambiar textos: hoy en `remotion/src/motor/VerticalSocial.tsx`.
- Cambiar color de marca: `remotion/src/motor/theme.ts → accent`.
