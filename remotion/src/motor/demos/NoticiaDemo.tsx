import { AbsoluteFill } from "remotion";
import { PistaNoticia } from "../noticias";
import { noticiaDemo } from "./noticia-demo";
import type { Marca } from "../marca";

/**
 * DEMO del formato noticias — el plan `noticia-demo.ts` montado por su intérprete.
 * Manual: manuales/video-noticias/SKILL.md
 *
 * Es la plantilla a copiar para un proyecto real. La composición completa lleva
 * cuatro capas hermanas, en este orden de z (director-video §3b):
 *
 *   <PistaNoticia tomas={noticiaNNN} />                    ← las tomas y su fondo
 *   <SubtitulosSync segmentos={subtitulosNNN} yPct={78} /> ← la voz, palabra a palabra
 *   <Audio src={staticFile("noticias/NNN-vo.mp3")} />      ← la voz en off
 *   <PistaSonido cues={cuesNNN} duckDb={-4.5} />           ← SFX bajo la voz
 *
 * Aquí solo va la primera: la demo no tiene voz ni subtítulos porque su función
 * es validar el LOOK, no la narración. En un proyecto real las cuatro van juntas
 * y la duración de la comp la fija la voz, no el plan.
 */
/**
 * La marca llega por PROP y no se importa aquí: `motor/` no conoce ningún canal
 * y esta demo vive dentro de motor. Quien la elige es `Root.tsx`, que está fuera
 * y es el sitio donde una composición dice para quién se monta.
 */
export const NoticiaDemo: React.FC<{ marca: Marca }> = ({ marca }) => (
  <AbsoluteFill>
    <PistaNoticia tomas={noticiaDemo} marca={marca} />
  </AbsoluteFill>
);
