import { AbsoluteFill } from "remotion";
import { CameraCue, useCamara } from "./camara";

/**
 * Cámara virtual: reencuadra a su hijo (el AVATAR) según un PLAN de CameraCue.
 * Guía: manuales/camara-avatar/SKILL.md · tokens/motor: camara.ts.
 *
 * Reglas de uso:
 *  · Envuelve SOLO el avatar (el vídeo). Los subtítulos y los motion graphics van
 *    FUERA, como overlays fijos — no deben moverse con la cámara (cuando el avatar
 *    se desplaza para "hacer espacio", el gráfico se queda quieto).
 *  · El contenedor recorta (overflow:hidden) para que el zoom nunca muestre borde.
 *  · Anima solo transform (translate3d + scale); transformOrigin al centro.
 *
 *   <AbsoluteFill>
 *     <CamaraVirtual cues={planCamara}>
 *       <OffthreadVideo src={staticFile("avatar.mp4")}
 *         style={{ width: "100%", height: "100%", objectFit: "cover" }} />
 *     </CamaraVirtual>
 *     <PistaGraficos plan={…} />    // overlays FUERA de la cámara
 *     <SubtitulosSync ... />
 *   </AbsoluteFill>
 */
export const CamaraVirtual: React.FC<{
  cues: CameraCue[];
  children: React.ReactNode;
}> = ({ cues, children }) => {
  const { transform } = useCamara(cues);
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          transform,
          transformOrigin: "center center",
          willChange: "transform",
        }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
