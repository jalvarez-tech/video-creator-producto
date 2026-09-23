import { AbsoluteFill } from "remotion";
import { Fondo } from "./Fondo";
import { Titulo } from "./Titulo";
import { Subtitulos } from "./Subtitulos";
import { tutorialYT } from "./presets";

/** T1 — Tutorial YouTube 16:9. Textos de ejemplo (se sustituyen por proyecto). */
export const TutorialYT: React.FC = () => {
  return (
    <AbsoluteFill>
      <Fondo preset={tutorialYT} />
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
