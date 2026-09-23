import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "./theme";
import type { Preset } from "./presets";

/**
 * Subtítulo discreto, estilo clásico abajo.
 * Posición y tamaño vienen del preset; el texto entra con un fundido suave.
 */
export const Subtitulos: React.FC<{ preset: Preset; text: string }> = ({
  preset,
  text,
}) => {
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const { tamanoPx, posicionYpct, barra } = preset.subtitulos;

  const safeX = (preset.formato.zonaSeguraPct / 100) * width;
  const top = (posicionYpct / 100) * height;
  const opacity = interpolate(frame, [0, 8], [0, 1], {
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
          fontWeight: 600,
          lineHeight: 1.25,
          textAlign: "center",
          textShadow: theme.shadow,
          padding: barra ? "10px 22px" : 0,
          background: barra ? "rgba(0,0,0,0.42)" : "transparent",
          borderRadius: barra ? 12 : 0,
          maxWidth: "100%",
        }}
      >
        {text}
      </span>
    </div>
  );
};
