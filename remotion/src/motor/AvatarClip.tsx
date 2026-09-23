import { AbsoluteFill, OffthreadVideo, staticFile } from "remotion";
import { Titulo } from "./Titulo";
import { Subtitulos } from "./Subtitulos";
import { tutorialYT } from "./presets";

/**
 * Composita un CLIP DE VÍDEO REAL (tu avatar de HeyGen) con los overlays de
 * plantilla (título + subtítulo). Sustituye el Fondo placeholder por el vídeo.
 *
 * Uso manual:
 *  1) Genera tu avatar en HeyGen (16:9) y descarga el MP4.
 *  2) Reemplaza  remotion/public/avatar.mp4  por tu clip (mismo nombre).
 *  3) Ajusta título/subtítulo abajo (o los conectamos al guion).
 *  4) La duración de la composición debe coincidir con la del clip (ver Root.tsx).
 */
export const AvatarClip: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <OffthreadVideo
        src={staticFile("avatar.mp4")}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
      <Titulo
        preset={tutorialYT}
        titulo="Tu Nombre"
        subtitulo="Fundador · Video Creator"
      />
      <Subtitulos
        preset={tutorialYT}
        text="Así automatizas tu edición y ahorras horas cada semana"
      />
    </AbsoluteFill>
  );
};
