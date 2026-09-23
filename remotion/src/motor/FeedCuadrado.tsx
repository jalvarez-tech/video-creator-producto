import { AbsoluteFill } from "remotion";
import { Fondo } from "./Fondo";
import { Titulo } from "./Titulo";
import { Subtitulos } from "./Subtitulos";
import { feedCuadrado } from "./presets";

/** T3 — Feed Cuadrado 1:1. Textos de ejemplo (se sustituyen por proyecto). */
export const FeedCuadrado: React.FC = () => {
  return (
    <AbsoluteFill>
      <Fondo preset={feedCuadrado} />
      <Titulo preset={feedCuadrado} titulo="Tip rápido" />
      <Subtitulos
        preset={feedCuadrado}
        text="Edita por tramos de 10 segundos"
      />
    </AbsoluteFill>
  );
};
