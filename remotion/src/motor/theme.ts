/**
 * Tema visual compartido por todas las plantillas.
 * Minimalista / limpio. Cambia `accent` por tu color de marca
 * (guarda tu brand kit en video-creator/archivos/marca/).
 */
export const theme = {
  fontFamily:
    "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  accent: "#0F766E", // ← color de marca (cámbialo aquí y afecta a las 3 plantillas)
  text: "#FFFFFF",
  textMuted: "rgba(255,255,255,0.72)",
  shadow: "0 2px 10px rgba(0,0,0,0.55)",
} as const;
