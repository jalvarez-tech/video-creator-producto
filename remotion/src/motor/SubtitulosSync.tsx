import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "./theme";
import type { Segmento } from "./segmentos";

/**
 * Subtítulos SINCRONIZADOS: muestra el segmento activo según el tiempo actual.
 * Reusable — se le pasan los segmentos {from,to,text} (en segundos).
 */
export const SubtitulosSync: React.FC<{
  segmentos: Segmento[];
  yPct?: number;
  tamanoPx?: number;
}> = ({ segmentos, yPct = 72, tamanoPx = 52 }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;

  const activo = segmentos.find((s) => t >= s.from && t < s.to);
  if (!activo) return null;

  const safeX = width * 0.08;
  const top = (yPct / 100) * height;
  const opacity = interpolate(t - activo.from, [0, 0.15], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        left: safeX,
        right: safeX,
        top,
        display: "flex",
        justifyContent: "center",
        opacity,
      }}
    >
      <span
        style={{
          fontFamily: theme.fontFamily,
          color: theme.text,
          fontSize: tamanoPx,
          fontWeight: 700,
          lineHeight: 1.25,
          textAlign: "center",
          textShadow: "0 2px 12px rgba(0,0,0,0.85)",
          maxWidth: "100%",
        }}
      >
        {activo.text}
      </span>
    </div>
  );
};
