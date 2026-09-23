import { AbsoluteFill, useVideoConfig } from "remotion";
import { theme } from "./theme";
import type { Preset } from "./presets";

/**
 * Fondo PLACEHOLDER: representa dónde irá tu vídeo real (pantalla/cámara).
 * En un proyecto real, aquí va <OffthreadVideo src={staticFile('clips/...')} />.
 * Sirve para juzgar layout, zonas seguras y legibilidad de los overlays.
 */
export const Fondo: React.FC<{ preset: Preset }> = ({ preset }) => {
  const { width, height } = useVideoConfig();
  const esTutorial = preset.slug === "tutorial-yt-16x9";
  const marca = Math.min(width, height);

  return (
    <AbsoluteFill
      style={{
        background:
          "linear-gradient(160deg,#111827 0%,#1f2937 60%,#0b1220 100%)",
      }}
    >
      <AbsoluteFill
        style={{ justifyContent: "center", alignItems: "center" }}
      >
        <div
          style={{
            color: "rgba(255,255,255,0.13)",
            fontFamily: theme.fontFamily,
            fontSize: Math.round(marca * 0.08),
            fontWeight: 800,
            letterSpacing: 2,
          }}
        >
          ▶ TU VÍDEO
        </div>
      </AbsoluteFill>

      {/* Cámara PiP: ilustra el layout "alterna pantalla + cámara" del tutorial 16:9 */}
      {esTutorial ? (
        <div
          style={{
            position: "absolute",
            right: width * 0.05,
            bottom: height * 0.09,
            width: width * 0.16,
            height: (width * 0.16 * 9) / 16,
            borderRadius: 14,
            background: "rgba(255,255,255,0.06)",
            border: "2px solid rgba(255,255,255,0.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(255,255,255,0.4)",
            fontFamily: theme.fontFamily,
            fontSize: 22,
            fontWeight: 600,
          }}
        >
          cámara
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
