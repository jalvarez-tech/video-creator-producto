import { AbsoluteFill, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { EASE, Muelle, opacidadVentana, SPRING } from "../motion";
/**
 * AQUÍ YA NO SE FIJA LA FAMILIA, Y ES EL ARREGLO DE UNA CASCADA INVERTIDA.
 *
 * Estos cuatro envoltorios (`Fundido`, `Aparece`, `Barrido`, `Ranura`) ponían
 * `fontFamily: FONT` cada uno. Son los MÁS INTERNOS que ve un nodo —`<Aparece>`
 * envuelve a todos—, así que ganaban a la familia que ponen el grupo y el
 * bloque. Mientras las dos fueran la misma no se notaba; en cuanto el dialecto
 * empezó a resolver su letra (para que una marca pueda pedir la suya con
 * `marca.letraPorCapa`), el intérprete la aplicaba arriba y aquí abajo se
 * volvía a pisar con la de módulo. El override no pintaba nada.
 *
 * Se quita en vez de pasarse por prop porque era REDUNDANTE: el bloque
 * (`cajaMolde`) y el grupo (`RenderGrupo`) ya la declaran, y el texto la hereda.
 * Un solo sitio que la fije es lo que hace que se pueda cambiar.
 *
 * Se descubrió mirando un frame renderizado, no leyendo: el código resolvía
 * Georgia y la pantalla seguía en sans.
 */

/**
 * ENTRADAS Y SALIDAS — el "cuándo aparece" separado del "qué se ve".
 * Guía: manuales/motion-graphics/SKILL.md (§timing, §coreografía).
 *
 * Por qué existe este archivo: en las primeras piezas escritas a mano
 * cada escena repetía el mismo `interpolate(f, [0,7,len-8,len], [0,1,1,0])` y su
 * propio `spring` de entrada. Repetido, el timing DERIVA: dos gráficos que
 * deberían entrar igual acaban entrando distinto y la pieza pierde firma.
 *
 * FRAMES LOCALES. `Escena` monta un <Sequence>, así que TODO lo que hay dentro
 * ve `useCurrentFrame() === 0` en su primer frame. Eso permite mover una escena
 * entera cambiando un número, sin recalcular a mano los frames de sus hijos —
 * el fallo más caro de la aritmética de frames absolutos.
 */

/**
 * Ventana temporal de una escena, con frames locales para sus hijos.
 * `fundido` aplica entrada/salida de opacidad (0 = corte seco, la opción por
 * defecto: un corte es una decisión válida y más limpia que un fade automático).
 *
 *   <Escena from={200} to={352}>   // dentro, el frame 0 es el 200 de la comp
 *     <Aparece at={4}>…</Aparece>
 *   </Escena>
 */
export const Escena: React.FC<{
  from: number;
  to: number;
  children: React.ReactNode;
  fundido?: number;
  nombre?: string;
}> = ({ from, to, children, fundido = 0, nombre }) => (
  <Sequence from={from} durationInFrames={Math.max(1, to - from)} name={nombre ?? `escena:${from}-${to}`} layout="none">
    {fundido > 0 ? <Fundido len={to - from} dur={fundido}>{children}</Fundido> : children}
  </Sequence>
);

/**
 * Opacidad de entrada y salida sobre una ventana de `len` frames.
 * El recorte de las rampas (y el corte seco cuando no caben) vive en
 * `opacidadVentana`, compartido con los motion graphics escritos a mano.
 */
const Fundido: React.FC<{ len: number; dur: number; children: React.ReactNode }> = ({ len, dur, children }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity: opacidadVentana(f, len, dur, dur) }}>{children}</AbsoluteFill>
  );
};

/**
 * Entrada estándar de UN elemento: muelle + rampa de opacidad (+ desenfoque
 * opcional). Es el gesto por defecto del sistema; úsalo salvo que la pieza tenga
 * otra ley de movimiento (Motion003 entra con barrido duro, no con muelle).
 *
 * `at` es el frame LOCAL de arranque → el stagger de una lista es solo
 * `at={i * STAGGER.lista}`, sin cadenas de sumas.
 *
 * `desenfoque` (blur → 0) es el truco que hace que un texto "llegue" en vez de
 * "aparecer": cuesta 2 líneas y se nota mucho. Úsalo en el hero, no en todo.
 */
export const Aparece: React.FC<{
  children: React.ReactNode;
  at?: number;
  y?: number;
  x?: number;
  escala?: number;
  muelle?: Muelle;
  rampa?: number;
  desenfoque?: number;
  estilo?: React.CSSProperties;
  /**
   * Multiplicador de opacidad, para la SALIDA del nodo (`Comun.sale`).
   *
   * Se multiplica en vez de pasarse por `estilo` porque `estilo` se esparce
   * DESPUÉS de `opacity` y la pisaría: un nodo con salida perdería su entrada.
   * Aquí las dos conviven, que es lo que son — el mismo nodo apareciendo y
   * yéndose.
   */
  alfa?: number;
}> = ({ children, at = 0, y = 0, x = 0, escala = 1, muelle = SPRING.entrada, rampa = 8, desenfoque = 0, estilo, alfa = 1 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = frame - at;
  const e = spring({ frame: f, fps, config: muelle });
  const op = interpolate(f, [0, rampa], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const blur = desenfoque > 0 ? interpolate(f, [0, rampa + 2], [desenfoque, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
  return (
    <div
      style={{
        opacity: op * alfa,
        transform: `translate(${interpolate(e, [0, 1], [x, 0])}px, ${interpolate(e, [0, 1], [y, 0])}px) scale(${interpolate(e, [0, 1], [escala, 1])})`,
        filter: blur > 0.05 ? `blur(${blur}px)` : undefined,
        ...estilo,
      }}
    >
      {children}
    </div>
  );
};

/**
 * Barrido duro de izquierda a derecha (la ley de movimiento del proyecto 003,
 * generalizada). NO es un fade: la opacidad salta a 1 en el primer frame y lo
 * que progresa es el recorte. Opcionalmente una `barra` de color viaja en el
 * borde del barrido.
 *
 * Antes de `at` el hijo se sigue montando recortado al 100 % (no devuelve null):
 * así el bloque RESERVA su sitio y lo ya visible no se recoloca cuando entra el
 * siguiente — un salto de maqueta se lee como error, no como animación.
 */
export const Barrido: React.FC<{
  at: number;
  children: React.ReactNode;
  barra?: string;
  dur?: number;
}> = ({ at, children, barra, dur = 4 }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <div style={{ clipPath: `inset(0 ${(1 - p) * 100}% 0 0)` }}>{children}</div>
      {barra && frame >= at && p < 1 ? (
        <div
          style={{
            position: "absolute",
            top: "-4%",
            left: `${p * 100}%`,
            width: 4,
            height: "108%",
            background: barra,
            boxShadow: `0 0 18px ${barra}`,
          }}
        />
      ) : null}
    </div>
  );
};

/**
 * Latido de énfasis: escala que oscila muy poco (±2 %) mientras un dato se
 * mantiene en pantalla. Sirve para que un elemento "sostenido" no se congele.
 * Amplitudes mayores marean; si necesitas más, lo que quieres es otro gráfico.
 */
export const Latido: React.FC<{ children: React.ReactNode; amplitud?: number; periodo?: number }> = ({
  children,
  amplitud = 0.02,
  periodo = 36,
}) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ transform: `scale(${1 + amplitud * Math.sin((frame / periodo) * 2 * Math.PI)})` }}>{children}</div>
  );
};

/**
 * Posiciona un bloque en una banda horizontal de la pantalla, centrado.
 * `top` en px absolutos de la composición (R08: fuera de la cara — en 9:16, por
 * encima de ~420 o por debajo de ~1300).
 */
export const Ranura: React.FC<{
  top?: number;
  bottom?: number;
  children: React.ReactNode;
  estilo?: React.CSSProperties;
}> = ({ top, bottom, children, estilo }) => (
  <div
    style={{
      position: "absolute",
      top,
      bottom,
      left: 0,
      right: 0,
      display: "flex",
      justifyContent: "center",
      ...estilo,
    }}
  >
    {children}
  </div>
);

/**
 * Reposicionamiento suave de un valor entre dos frames (inOutCubic).
 * Para MOVER algo que ya está en pantalla — no para hacerlo entrar (eso es
 * `Aparece`). Devuelve el número, no un componente: se usa dentro del estilo.
 */
export const mueve = (frame: number, de: number, a: number, desde: number, hasta: number): number =>
  interpolate(frame, [de, a], [desde, hasta], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE.inOutCubic,
  });
