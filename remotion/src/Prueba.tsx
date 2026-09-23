import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

/**
 * Composición de PRUEBA del motor.
 * Objetivo: confirmar visualmente que Remotion renderiza, anima e interpola.
 * No es un vídeo real: es el "test de arranque" del sistema.
 */
export const Prueba: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Entrada del título con spring (rebote suave)
  const entrada = spring({ frame, fps, config: { damping: 200 } });
  const titleY = interpolate(entrada, [0, 1], [60, 0]);
  const titleOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Subtítulo entra un poco después
  const subOpacity = interpolate(frame, [16, 34], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Badge "MOTOR OK" con pulso
  const badgeScale = spring({
    frame: frame - 4,
    fps,
    config: { damping: 12, stiffness: 120 },
  });

  // Barra de progreso ligada al frame actual
  const progress = interpolate(frame, [0, durationInFrames - 1], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background:
          "linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #0f766e 100%)",
        justifyContent: "center",
        alignItems: "center",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
      }}
    >
      {/* Badge de estado */}
      <div
        style={{
          transform: `scale(${badgeScale})`,
          background: "rgba(16, 185, 129, 0.15)",
          border: "2px solid #10b981",
          color: "#6ee7b7",
          padding: "10px 28px",
          borderRadius: 999,
          fontSize: 30,
          fontWeight: 700,
          letterSpacing: 4,
          marginBottom: 40,
        }}
      >
        ● MOTOR OK
      </div>

      {/* Título */}
      <h1
        style={{
          transform: `translateY(${titleY}px)`,
          opacity: titleOpacity,
          color: "white",
          fontSize: 130,
          fontWeight: 800,
          margin: 0,
          letterSpacing: -2,
          textShadow: "0 12px 40px rgba(0,0,0,0.45)",
        }}
      >
        Video Creator
      </h1>

      {/* Subtítulo */}
      <p
        style={{
          opacity: subOpacity,
          color: "#cbd5e1",
          fontSize: 44,
          fontWeight: 500,
          marginTop: 24,
        }}
      >
        Remotion · Auto-Editor · Seedance 2.0
      </p>

      {/* Barra de progreso */}
      <div
        style={{
          marginTop: 70,
          width: 900,
          height: 14,
          borderRadius: 999,
          background: "rgba(255,255,255,0.12)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${progress * 100}%`,
            height: "100%",
            background: "linear-gradient(90deg, #34d399, #22d3ee)",
          }}
        />
      </div>

      {/* Contador de frame (prueba de animación) */}
      <div
        style={{
          position: "absolute",
          bottom: 48,
          right: 64,
          color: "rgba(255,255,255,0.55)",
          fontSize: 30,
          fontVariantNumeric: "tabular-nums",
          fontWeight: 600,
        }}
      >
        frame {String(frame).padStart(3, "0")} / {durationInFrames}
      </div>
    </AbsoluteFill>
  );
};
