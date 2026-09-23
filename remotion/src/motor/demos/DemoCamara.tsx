import { AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame } from "remotion";
import { CamaraVirtual } from "../CamaraVirtual";
import { PILA_INTER } from "../marca";
import { camaraDemo } from "./camara-demo";

/**
 * DEMO de la cámara virtual del producto: `avatar.mp4` (el clip de relleno de
 * `Avatar16x9`) dentro de <CamaraVirtual> con el plan `camara-demo.ts`.
 * Manual: manuales/camara-avatar/SKILL.md.
 *
 * Enseña las dos reglas de la cámara en un frame:
 *   · La cámara envuelve SOLO el vídeo. Anima transform (translate3d + scale) y
 *     recorta, así que el zoom nunca enseña borde.
 *   · Los overlays van FUERA: el rótulo de abajo no se mueve con ella. Cuando el
 *     reencuadre desplaza al avatar, el rótulo se queda donde estaba (R08).
 *
 * El rótulo dice qué cue está vivo, para leer el plan mientras se ve. En un
 * proyecto real ahí van los subtítulos y los gráficos, con el mismo z-order:
 *
 *   <AbsoluteFill>
 *     <CamaraVirtual cues={camaraNNN}><OffthreadVideo … /></CamaraVirtual>
 *     <PistaGraficos plan={graficosNNN} montadores={…} />
 *     <SubtitulosSync segmentos={subtitulosNNN} />
 *   </AbsoluteFill>
 */
export const DemoCamara: React.FC = () => {
  const frame = useCurrentFrame();
  // El cue vivo es el último cuyo startFrame ya pasó (la regla de useCamara);
  // pasado su endFrame la cámara reposa en la pose donde aterrizó.
  const vivo = camaraDemo.filter((c) => frame >= c.startFrame).pop();
  const rotulo = vivo && frame <= vivo.endFrame ? `${vivo.id} · ${vivo.shot}` : "reposo";
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <CamaraVirtual cues={camaraDemo}>
        <OffthreadVideo src={staticFile("avatar.mp4")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </CamaraVirtual>
      {/* Overlay FUERA de la cámara: fijo, no se reencuadra con el avatar. */}
      <div
        style={{
          position: "absolute",
          right: 72,
          bottom: 64,
          padding: "14px 24px",
          borderRadius: 14,
          background: "rgba(0,0,0,0.55)",
          color: "#FFFFFF",
          fontFamily: PILA_INTER,
          fontSize: 30,
          fontWeight: 600,
          letterSpacing: 0.4,
        }}
      >
        {`cámara · ${rotulo}`}
      </div>
    </AbsoluteFill>
  );
};
