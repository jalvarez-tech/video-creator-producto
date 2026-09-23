# Plantilla · Tutorial YouTube 16:9 — `tutorial-yt-16x9`

**Uso:** tutoriales y demos horizontales para YouTube, alternando pantalla y cámara.
**Composición Remotion:** `TutorialYT` · **Preset:** `remotion/src/motor/presets.ts → tutorialYT`
**Frame de referencia:** desde `remotion/`, `npx remotion still TutorialYT out/plantilla-16x9.png --frame=60`

## Las 5 decisiones
- **Formato:** 16:9 · 1920×1080 · fps = original (demo 30) · layout *alterna pantalla↔cámara* (+ PiP cámara en esquina) · zona segura 5%.
- **Subtítulos:** Inter 40px · abajo (y 86%) · ~8 palabras/línea · blanco + sombra, sin barra (discreto).
- **Títulos:** lower-third abajo-izquierda (nombre/rol) con barra de acento, entra deslizando · duración 120 frames.
- **Revisión:** frames clave [0, 60, final] · prueba 720p · checklist [texto cortado · zona segura · contraste · PiP tapa contenido · desync audio] · confirmar antes de exportar.
- **Exportación:** h264 · aac 192k normalizado · `{proyecto}-{titulo}-16x9.mp4` → `finales/`.

## Cómo usarla
- Previsualiza: `npm run dev` → composición **TutorialYT** en http://localhost:3000.
- Frame de prueba: `npx remotion still TutorialYT out/check.png --frame=60`.
- Cambiar textos: hoy en `remotion/src/motor/TutorialYT.tsx`. Siguiente paso del sistema: pasarlos como props por proyecto + subtítulos desde `transcripcion.json`.
- Cambiar color de marca: `remotion/src/motor/theme.ts → accent` (afecta a las 3 plantillas).
