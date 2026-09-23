import { AbsoluteFill } from "remotion";
import { Fondo } from "./Fondo";
import { Titulo } from "./Titulo";
import { Subtitulos } from "./Subtitulos";
import { verticalSocial } from "./presets";

/** T2 — Vertical Social 9:16. Textos de ejemplo (se sustituyen por proyecto). */
export const VerticalSocial: React.FC = () => {
  return (
    <AbsoluteFill>
      <Fondo preset={verticalSocial} />
      <Titulo preset={verticalSocial} titulo="3 errores al editar" />
      <Subtitulos
        preset={verticalSocial}
        text="El segundo te cuesta suscriptores"
      />
    </AbsoluteFill>
  );
};
