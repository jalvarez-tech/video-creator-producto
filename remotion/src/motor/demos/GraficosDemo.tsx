import { AbsoluteFill } from "remotion";
import { graficosDemo } from "./graficos-demo";
import { Puntos, Resplandor, Vineta } from "../graficos";
import { MONTADORES_BASE, PistaGraficos } from "../graficos/PistaGraficos";
import { MG } from "../motion";

/**
 * DEMO de la coreografía por datos: el plan `graficos-demo.ts` montado por el
 * intérprete, sin una sola línea de JSX por gráfico.
 *
 * `montadores` es lo que se pasa además del plan: el plan dice QUÉ pieza y el
 * mapa dice con qué componente se dibuja. `MONTADORES_BASE` son los de la
 * biblioteca; un proyecto con piezas propias pasa el suyo, y como el mapeado es
 * TOTAL sobre el registro, una pieza sin montador no compila.
 *
 * En un proyecto real esta composición sería el `Avatar004.tsx`, con el mismo
 * z-order que el 003 y el avatar en su sitio:
 *
 *   <AbsoluteFill>
 *     <CamaraVirtual cues={camara004}><OffthreadVideo … /></CamaraVirtual>
 *     <PistaGraficos plan={graficos004} montadores={MONTADORES_004} />   ← esta capa
 *     <Audio src={…} />
 *     <PistaSonido cues={cues004} duckDb={-5} />
 *   </AbsoluteFill>
 *
 * Aquí el avatar se sustituye por un fondo de sala (mismo recurso que Fondo003)
 * para poder revisar la coreografía sin depender de un clip concreto.
 */
export const GraficosDemo: React.FC = () => (
  <AbsoluteFill style={{ background: "#0B0F1A" }}>
    <Resplandor color={MG.teal} cx={50} cy={34} intensidad={0.3} pulso={0.04} />
    <Resplandor color={MG.amber} cx={28} cy={72} intensidad={0.16} />
    <Puntos opacidad={0.05} />
    <PistaGraficos plan={graficosDemo} montadores={MONTADORES_BASE} />
    <Vineta intensidad={0.5} />
  </AbsoluteFill>
);
