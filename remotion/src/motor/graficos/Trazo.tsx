import { evolvePath, getLength, getPointAtLength, getTangentAtLength } from "@remotion/paths";
import { interpolate, random, useCurrentFrame } from "remotion";
import { EASE } from "../motion";
import { alfa, G } from "./estilos";

/**
 * TRAZO DIBUJADO — subrayar, rodear, señalar, confirmar.
 * Guía: manuales/motion-graphics/SKILL.md · sonido: `scribble` (trazo) o
 * `pen`/`swoosh` (flecha), en recetario-motion-graphics.md.
 *
 * Es el gesto que más "mano humana" añade a una pieza y el que menos código
 * cuesta: una línea que SE DIBUJA se lee como alguien señalando; la misma línea
 * apareciendo de golpe se lee como un elemento de interfaz.
 *
 * Cómo funciona (la técnica que conviene entender, no solo usar):
 *   1. Un path SVG tiene longitud. `getLength(d)` la calcula sin DOM.
 *   2. `strokeDasharray` = "longitud longitud" y `strokeDashoffset` = longitud
 *      → el trazo está entero pero desplazado fuera: no se ve nada.
 *   3. Bajando el offset a 0 el trazo "entra" desde el principio.
 *   `evolvePath(p, d)` devuelve ese par ya calculado para un progreso 0→1.
 *
 * Todo es determinista: la irregularidad "a mano alzada" sale de `random(semilla)`
 * de Remotion (misma semilla → mismo trazo en cada render), nunca de Math.random.
 *
 * REGLA DE USO: un trazo por escena. Subrayar dos cosas a la vez es no subrayar.
 */

type BaseTrazo = {
  at?: number;
  dur?: number;
  color?: string;
  grosor?: number;
  resplandor?: number;
  /** Progreso forzado 0→1. Si lo pasas, manda sobre at/dur (para la coreografía por datos). */
  progreso?: number;
};

/** Progreso de dibujado en el frame actual (outCubic: entra rápido y frena, como una mano). */
const useProgreso = (at: number, dur: number, forzado?: number): number => {
  const frame = useCurrentFrame();
  if (forzado !== undefined) return Math.max(0, Math.min(1, forzado));
  return interpolate(frame, [at, at + dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE.outCubic,
  });
};

/**
 * Dibuja cualquier path SVG. Es la primitiva; los demás componentes de este
 * archivo solo generan la `d` y la pasan aquí.
 *
 * `cabeza` dibuja una punta de flecha EN LA PUNTA ACTUAL del trazo, orientada
 * con la tangente de la curva (`getTangentAtLength`). Por eso la punta gira
 * sola al seguir una curva: no hay ángulo escrito a mano en ningún sitio.
 */
export const Trazo: React.FC<
  BaseTrazo & {
    d: string;
    ancho: number;
    alto: number;
    cabeza?: boolean;
    tamCabeza?: number;
    estilo?: React.CSSProperties;
  }
> = ({
  d,
  ancho,
  alto,
  at = 0,
  dur = 18,
  color = G.teal,
  grosor = 8,
  resplandor = 0.55,
  progreso,
  cabeza = false,
  tamCabeza = 26,
  estilo,
}) => {
  const p = useProgreso(at, dur, progreso);
  const { strokeDasharray, strokeDashoffset } = evolvePath(p, d);
  const largo = getLength(d);
  const punta = cabeza && p > 0.02 ? getPointAtLength(d, largo * p) : null;
  const tg = cabeza && p > 0.02 ? getTangentAtLength(d, largo * p) : null;
  const ang = tg ? (Math.atan2(tg.y, tg.x) * 180) / Math.PI : 0;
  const hex = color.startsWith("#") ? color : "#FFFFFF";
  return (
    <svg
      width={ancho}
      height={alto}
      viewBox={`0 0 ${ancho} ${alto}`}
      style={{ overflow: "visible", filter: resplandor > 0 ? `drop-shadow(0 0 10px ${alfa(hex, resplandor)})` : undefined, ...estilo }}
    >
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={grosor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={strokeDasharray}
        strokeDashoffset={strokeDashoffset}
      />
      {punta ? (
        <polygon
          points={`0,0 ${-tamCabeza},${tamCabeza * 0.42} ${-tamCabeza},${-tamCabeza * 0.42}`}
          fill={color}
          transform={`translate(${punta.x} ${punta.y}) rotate(${ang})`}
        />
      ) : null}
    </svg>
  );
};

/**
 * Subrayado a mano alzada: una línea con dos ondulaciones muy leves.
 * Perfectamente recta se lee como borde de caja; ondulada 3-4 px, como mano.
 */
export const Subrayado: React.FC<BaseTrazo & { ancho: number; semilla?: string; amplitud?: number }> = ({
  ancho,
  semilla = "subrayado",
  amplitud = 5,
  grosor = 8,
  ...resto
}) => {
  const alto = amplitud * 2 + grosor * 2;
  const y = alto / 2;
  const j = (k: string) => (random(`${semilla}-${k}`) - 0.5) * 2 * amplitud;
  const d = `M 0 ${y + j("a")} Q ${ancho * 0.3} ${y + j("b")}, ${ancho * 0.55} ${y + j("c")} T ${ancho} ${y + j("d")}`;
  return <Trazo d={d} ancho={ancho} alto={alto} grosor={grosor} {...resto} />;
};

/**
 * Rodea un elemento con un óvalo de rotulador, con el clásico exceso al cerrar
 * (el trazo se pasa ~15° del punto de partida: nadie cierra un círculo exacto).
 * Pensado para envolver una palabra: dale el ancho/alto de la palabra + margen.
 */
export const Rodea: React.FC<BaseTrazo & { ancho: number; alto: number; semilla?: string; vueltas?: number }> = ({
  ancho,
  alto,
  semilla = "rodea",
  vueltas = 1.04,
  grosor = 8,
  dur = 26,
  ...resto
}) => {
  const cx = ancho / 2;
  const cy = alto / 2;
  const rx = ancho / 2 - grosor;
  const ry = alto / 2 - grosor;
  const pasos = 48;
  const total = Math.PI * 2 * vueltas;
  const inicio = -Math.PI * 0.55; // empieza arriba-izquierda, como una mano diestra
  let d = "";
  for (let i = 0; i <= pasos; i++) {
    const t = inicio + (i / pasos) * total;
    const w = (random(`${semilla}-${i}`) - 0.5) * grosor * 0.9; // irregularidad del pulso
    const x = cx + (rx + w) * Math.cos(t);
    const y = cy + (ry + w) * Math.sin(t) * 1.02;
    d += `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)} `;
  }
  return <Trazo d={d.trim()} ancho={ancho} alto={alto} grosor={grosor} dur={dur} {...resto} />;
};

/**
 * Flecha curva de A a B con la punta siguiendo el trazo.
 * `curvatura` positiva arquea hacia arriba, negativa hacia abajo; 0 es recta.
 * Una flecha CURVA se lee como "esto lleva a esto"; una recta, como "de aquí a
 * aquí". Elige según lo que cuentes, no por gusto.
 */
export const Flecha: React.FC<
  BaseTrazo & { de: [number, number]; a: [number, number]; curvatura?: number; tamCabeza?: number }
> = ({ de, a, curvatura = 0.22, grosor = 8, tamCabeza = 26, ...resto }) => {
  const [x1, y1] = de;
  const [x2, y2] = a;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  // punto de control perpendicular al segmento → arco simétrico
  const cxp = mx - dy * curvatura;
  const cyp = my + dx * curvatura;
  const d = `M ${x1} ${y1} Q ${cxp} ${cyp}, ${x2} ${y2}`;
  const ancho = Math.max(x1, x2, cxp) + tamCabeza;
  const alto = Math.max(y1, y2, cyp) + tamCabeza;
  return <Trazo d={d} ancho={ancho} alto={alto} grosor={grosor} cabeza tamCabeza={tamCabeza} {...resto} />;
};

/**
 * Check de confirmación. Dibujado en dos tiempos naturales (el palo corto
 * primero) porque el path es uno solo: la longitud del primer tramo es menor,
 * así que se dibuja más rápido sin programar nada.
 * Sonido: `success`/`chime` justo en el frame en que cierra (at + dur).
 */
export const Check: React.FC<BaseTrazo & { tam?: number }> = ({ tam = 120, grosor = 12, color = G.green, dur = 14, ...resto }) => {
  const d = `M ${tam * 0.16} ${tam * 0.54} L ${tam * 0.42} ${tam * 0.78} L ${tam * 0.86} ${tam * 0.24}`;
  return <Trazo d={d} ancho={tam} alto={tam} grosor={grosor} color={color} dur={dur} {...resto} />;
};

/**
 * Aspa de descarte. Dos trazos que se cruzan; el segundo entra a mitad del
 * primero (`retardo`) — cruzarlos a la vez se lee como icono, en secuencia se
 * lee como gesto de tachar.
 */
export const Aspa: React.FC<BaseTrazo & { tam?: number; retardo?: number }> = ({
  tam = 120,
  grosor = 12,
  color = G.red,
  at = 0,
  dur = 10,
  retardo = 5,
  ...resto
}) => (
  <div style={{ position: "relative", width: tam, height: tam }}>
    <div style={{ position: "absolute", inset: 0 }}>
      <Trazo
        d={`M ${tam * 0.18} ${tam * 0.18} L ${tam * 0.82} ${tam * 0.82}`}
        ancho={tam}
        alto={tam}
        grosor={grosor}
        color={color}
        at={at}
        dur={dur}
        {...resto}
      />
    </div>
    <div style={{ position: "absolute", inset: 0 }}>
      <Trazo
        d={`M ${tam * 0.82} ${tam * 0.18} L ${tam * 0.18} ${tam * 0.82}`}
        ancho={tam}
        alto={tam}
        grosor={grosor}
        color={color}
        at={at + retardo}
        dur={dur}
        {...resto}
      />
    </div>
  </div>
);
