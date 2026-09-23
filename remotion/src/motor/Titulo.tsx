import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { theme } from "./theme";
import type { Preset } from "./presets";

/**
 * Título minimalista con 3 variantes según el preset:
 *  - lower-third: barra de acento + nombre/rol abajo-izquierda (horizontal)
 *  - hook: título grande arriba-centro con subrayado de acento (vertical)
 *  - banda: pastilla superior con punto de acento (cuadrado)
 */
export const Titulo: React.FC<{
  preset: Preset;
  titulo: string;
  subtitulo?: string;
}> = ({ preset, titulo, subtitulo }) => {
  const { width, height, fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const { variante, margenPx } = preset.titulos;

  const safeX = (preset.formato.zonaSeguraPct / 100) * width;
  const safeY = (preset.formato.zonaSeguraPct / 100) * height;
  const enter = spring({ frame, fps, config: { damping: 200 } });
  const opacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateRight: "clamp",
  });

  if (variante === "lower-third") {
    const x = interpolate(enter, [0, 1], [-40, 0]);
    return (
      <div
        style={{
          position: "absolute",
          left: safeX + margenPx / 2,
          bottom: height * 0.18,
          display: "flex",
          alignItems: "stretch",
          gap: 18,
          transform: `translateX(${x}px)`,
          opacity,
        }}
      >
        <div
          style={{ width: 6, borderRadius: 3, background: theme.accent }}
        />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <span
            style={{
              fontFamily: theme.fontFamily,
              color: theme.text,
              fontSize: 46,
              fontWeight: 700,
              textShadow: theme.shadow,
            }}
          >
            {titulo}
          </span>
          {subtitulo ? (
            <span
              style={{
                fontFamily: theme.fontFamily,
                color: theme.textMuted,
                fontSize: 26,
                fontWeight: 500,
                marginTop: 4,
                textShadow: theme.shadow,
              }}
            >
              {subtitulo}
            </span>
          ) : null}
        </div>
      </div>
    );
  }

  if (variante === "hook") {
    const y = interpolate(enter, [0, 1], [-24, 0]);
    return (
      <div
        style={{
          position: "absolute",
          top: safeY + margenPx,
          left: safeX,
          right: safeX,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          transform: `translateY(${y}px)`,
          opacity,
        }}
      >
        <span
          style={{
            fontFamily: theme.fontFamily,
            color: theme.text,
            fontSize: 72,
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: -1,
            textAlign: "center",
            textShadow: theme.shadow,
          }}
        >
          {titulo}
        </span>
        <div
          style={{
            width: 120 * enter,
            height: 6,
            borderRadius: 3,
            background: theme.accent,
            marginTop: 18,
          }}
        />
      </div>
    );
  }

  // variante === "banda"
  const yb = interpolate(enter, [0, 1], [-30, 0]);
  return (
    <div
      style={{
        position: "absolute",
        top: safeY + margenPx,
        left: safeX,
        right: safeX,
        display: "flex",
        justifyContent: "center",
        transform: `translateY(${yb}px)`,
        opacity,
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 14,
          padding: "14px 30px",
          borderRadius: 999,
          background: "rgba(0,0,0,0.38)",
          backdropFilter: "blur(2px)",
        }}
      >
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: 999,
            background: theme.accent,
          }}
        />
        <span
          style={{
            fontFamily: theme.fontFamily,
            color: theme.text,
            fontSize: 46,
            fontWeight: 700,
            textShadow: theme.shadow,
          }}
        >
          {titulo}
        </span>
      </div>
    </div>
  );
};
