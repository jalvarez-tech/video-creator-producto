import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "./theme";
import { EASE } from "./motion";
import type { Segmento } from "./segmentos";

/**
 * Subtítulos KARAOKE: resalta la palabra que se está diciendo.
 * La palabra activa se pinta en verde claro sobre una PÍLDORA NEGRA que la
 * resalta; las demás quedan en blanco. El timing por palabra = reparto uniforme
 * dentro de cada segmento {from,to} (los segmentos ya vienen cortos, 3-4
 * palabras, así que la sincronía a nivel de chunk se conserva).
 *
 * Determinista (todo desde useCurrentFrame). Mismos props que SubtitulosSync
 * + `resalte` (color de la palabra activa). Todas las palabras llevan el MISMO
 * padding para que activar la píldora no descuadre la línea (sin saltos de layout).
 */
export const SubtitulosKaraoke: React.FC<{
  segmentos: Segmento[];
  yPct?: number;
  tamanoPx?: number;
  resalte?: string;
}> = ({ segmentos, yPct = 72, tamanoPx = 56, resalte = "#86EFAC" }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;

  const activo = segmentos.find((s) => t >= s.from && t < s.to);
  if (!activo) return null;

  const palabras = activo.text.split(" ").filter(Boolean);
  const dur = Math.max(0.0001, activo.to - activo.from);
  const per = dur / palabras.length;
  const localT = t - activo.from;
  const idx = Math.max(0, Math.min(palabras.length - 1, Math.floor(localT / per)));

  const safeX = width * 0.08;
  const top = (yPct / 100) * height;
  const opacity = interpolate(localT, [0, 0.14], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div style={{ position: "absolute", left: safeX, right: safeX, top, display: "flex", justifyContent: "center", opacity }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: "10px 6px", maxWidth: "100%" }}>
        {palabras.map((w, i) => {
          const activa = i === idx;
          const wStart = i * per;
          // Pop breve al volverse activa (Apple: aterriza, no rebota).
          const pop = activa
            ? interpolate(localT - wStart, [0, 0.12], [0.86, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: EASE.outCubic,
              })
            : 1;
          return (
            <span
              key={`${activo.from}-${i}`}
              style={{
                fontFamily: theme.fontFamily,
                fontSize: tamanoPx,
                fontWeight: 700,
                lineHeight: 1.15,
                whiteSpace: "nowrap",
                padding: "3px 12px",
                borderRadius: 12,
                color: activa ? resalte : theme.text,
                background: activa ? "rgba(0,0,0,0.92)" : "transparent",
                textShadow: activa ? `0 0 20px ${resalte}66` : "0 2px 12px rgba(0,0,0,0.9)",
                transform: `scale(${pop})`,
                transformOrigin: "center bottom",
                boxShadow: activa ? "0 6px 22px rgba(0,0,0,0.55)" : "none",
              }}
            >
              {w}
            </span>
          );
        })}
      </div>
    </div>
  );
};
