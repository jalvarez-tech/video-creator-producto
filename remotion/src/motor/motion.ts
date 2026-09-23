/**
 * Motion tokens — el "vocabulario de movimiento" compartido por las plantillas.
 * Equivale a lo que `sound/cues.ts` es al sonido: la DECISIÓN reusable ya tomada.
 * Guía humana: manuales/motion-graphics/SKILL.md (+ referencia.md).
 *
 * Regla maestra: el DISEÑO decide qué se ve; la ANIMACIÓN, cuándo y cómo.
 * Un solo hero-motion a la vez. No pongas spring en todo. Nombra la INTENCIÓN,
 * no el efecto: por eso los muelles se llaman `contador`, `cta`, `flip`… y no
 * `damping14`. Cambia un valor aquí y las plantillas cambian coherentemente.
 *
 * Determinismo: todo se deriva de useCurrentFrame()/useVideoConfig(). Nada de
 * Date.now(), Math.random() sin sembrar, timers ni CSS animation/transition.
 */
import { Easing, interpolate } from "remotion";
import { theme } from "./theme";

/** Config de muelle (structurally `Partial<SpringConfig>` de Remotion). */
export type Muelle = {
  damping?: number;
  mass?: number;
  stiffness?: number;
  overshootClamping?: boolean;
};

/**
 * Muelles nombrados por intención. Úsalos así:
 *   const e = spring({ frame: f, fps, config: SPRING.entrada });
 * Sin rebote visible → `contador`. Rebote sutil → `entrada`/`tarjeta`.
 * Overshoot marcado (pop de una cifra, tap de botón) → `punch`/`tap`.
 */
export const SPRING = {
  entrada: { damping: 14, mass: 0.7 },                  // asentamiento estándar: slides, chips, burbujas
  contador: { damping: 16, mass: 0.7 },                 // más amortiguado: cifras que suben sin rebote
  tarjeta: { damping: 14, mass: 0.7, stiffness: 120 },  // card/burbuja con algo de cuerpo
  cta: { damping: 14, mass: 0.8, stiffness: 120 },      // botón/CTA (un pelo más de masa)
  golpe: { damping: 14 },                               // aparición seca (aspa roja, scaleX)
  flip: { damping: 12 },                                // giro 3D (flip TUYO/DE OTRO)
  pulso: { damping: 8 },                                // latido corto de énfasis
  punch: { damping: 8, stiffness: 220 },                // overshoot fuerte: pop de una cifra
  tap: { damping: 9, stiffness: 200 },                  // compresión de botón al pulsar
} satisfies Record<string, Muelle>;

/**
 * Easings compartidos. `interpolate(..., { easing: EASE.outCubic })`.
 * Entrada/count-up → outCubic (rápido→suave). Reposicionamiento → inOutCubic.
 * Movimiento mecánico continuo (barras, marquees) → Easing.linear.
 */
export const EASE = {
  outCubic: Easing.out(Easing.cubic),
  inOutCubic: Easing.inOut(Easing.cubic),
  /**
   * FRENADO LARGO en tres tramos. Para algo que RUEDA y se detiene: una palabra
   * que se releva, un contador que aterriza tras un recorrido, un carrusel.
   *
   * No es una bezier y por eso no está escrita como tal: una cúbica no puede
   * reptar al principio Y frenar en seco al final: o hace una cosa o hace la
   * otra. Los tres tramos son
   *   0-15 %   `0.02·x²` — arranca casi parado, que es lo que da la sensación
   *                        de inercia antes de soltarse
   *   15-70 %  lineal    — la parte que de verdad se lee como rodar
   *   70-100 % `1−(1−x)⁷` — frena muy fuerte al final
   * Empalmados con continuidad para que no haya un tirón en las juntas.
   *
   * Cosechada de `RollerSlotReveal` (lifeprompt-team/remotion-scenes, MIT). Es
   * lo único que se copió del lote externo: la CURVA, no el componente. Ver
   * manuales/motion-graphics/cruce-remotion-scenes.md.
   */
  frenoLargo: (x: number): number => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    const c1 = 0.15; // fin del reptar
    const c2 = 0.7; // inicio del frenado
    const y1 = 0.02 * c1 * c1;
    // y2 = 0.928 no es a ojo: es el valor que hace que la pendiente del tramo
    // lineal y la del ARRANQUE del frenado coincidan. Con cualquier otro hay un
    // tirón en la junta —el primer intento puso aquí `1−(1−x)⁷` evaluado en la x
    // GLOBAL, que ya vale 0.9998 en 0.7: el movimiento terminaba al 70 % y los
    // tres tramos eran decorativos—. Se ve en el perfil, no en el código.
    const y2 = 0.928;
    if (x < c1) return 0.02 * x * x;
    if (x < c2) return y1 + ((x - c1) / (c2 - c1)) * (y2 - y1);
    // El frenado se remapea a SU tramo (`u` de 0 a 1 dentro de [c2, 1]) y cubre
    // lo que falta hasta 1. Exponente 7: muy seco, que es el gesto.
    const u = (x - c2) / (1 - c2);
    return y2 + (1 - y2) * (1 - Math.pow(1 - u, 7));
  },
} as const;

/** segundos → frames al fps de la composición (determinista). */
export const seg = (fps: number, s: number): number => Math.round(s * fps);

/**
 * Duración de animación SEGURA, en frames (≥ 1).
 *
 * Por qué hace falta: los intérpretes derivan la duración de la animación de la
 * VENTANA del cue (`Math.min(45, len - 10)`), y en una ventana corta eso sale 0
 * o negativo. Con eso `interpolate` recibe un inputRange no estrictamente
 * creciente y **lanza** ("inputRange must be strictly monotonically
 * increasing"): un cue mal cronometrado no degradaba el gráfico, tumbaba el
 * render entero. Aquí el peor caso es una animación de 1 frame — un corte.
 *
 *   dur={durSegura(cue.dur, Math.min(45, len - 10))}
 */
export const durSegura = (pedida: number | undefined, porDefecto: number, min = 1): number =>
  Math.max(min, Math.round(pedida ?? porDefecto));

/**
 * Opacidad 0→1→0 sobre una ventana de `len` frames, con rampa de entrada y de
 * salida — el `interpolate(f, [0, 7, len - 8, len], [0, 1, 1, 0])` que estaba
 * copiado en cinco archivos, aquí una sola vez y a prueba de ventanas cortas.
 *
 * El inputRange exige `0 < entra < len-sale < len`. Con rampas fijas, una escena
 * más corta que las dos rampas juntas daba un rango no creciente e `interpolate`
 * LANZABA (tumbando el render, no solo esa escena). Aquí las rampas se recortan
 * a lo que quepa y, si no cabe ninguna, la escena se monta a opacidad plena: un
 * corte seco. En las escenas reales (de 65 a 146 frames) devuelve exactamente lo
 * mismo que la versión copiada — comprobado frame a frame.
 *
 * Las rampas también se suben a ≥1: un `entra` o `sale` de 0 (o negativo) daba
 * `[0, 0, …]`, que es justo el rango no creciente que esto viene a impedir.
 */
export const opacidadVentana = (f: number, len: number, entra = 7, sale = 8): number => {
  const e = Math.min(Math.max(1, Math.round(entra)), Math.max(1, Math.ceil(len / 2) - 1));
  const s = Math.min(Math.max(1, Math.round(sale)), Math.max(1, len - e - 1));
  if (len <= e + s) return 1;
  return interpolate(f, [0, e, len - s, len], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
};

/**
 * Duraciones de referencia EN SEGUNDOS (conviértelas con seg(fps, …)).
 * Puntos de partida; ajústalas al ritmo de la voz y la música (skill §Timing).
 */
export const DUR = {
  micro: 0.15,         // microacción (compresión, tick)
  pop: 0.27,           // pop pequeño
  entradaRapida: 0.35, // entrada rápida (redes)
  entrada: 0.5,        // entrada estándar
  tarjeta: 0.6,        // tarjeta / bloque
  hero: 0.8,           // hero motion
  revelacion: 1.4,     // revelación dramática
  ambiente: 2.5,       // movimiento ambiental (loop)
} as const;

/** Desfase (stagger) entre elementos, en frames a ~25–30fps. */
export const STAGGER = { grupo: 3, lista: 4, independiente: 6 } as const;

/** Opacidad de entrada 0→1 (clamp) en `dur` frames desde el inicio local `f`. */
export const rampaEntrada = (f: number, dur = 12): number =>
  interpolate(f, [0, dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

/** Opacidad de salida 1→0 (clamp) en los últimos `dur` frames de una ventana de largo `len`. */
export const rampaSalida = (f: number, len: number, dur = 14): number =>
  interpolate(f, [len - dur, len], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

/** Escala de overshoot: arranca en `desde` (>1) y asienta en 1, guiada por el valor de un muelle 0→1. */
export const overshoot = (valorMuelle: number, desde: number): number =>
  interpolate(valorMuelle, [0, 1], [desde, 1]);

/**
 * Paleta de motion graphics (marca). Una sola fuente de verdad:
 * `teal` = theme.accent y `white` = theme.text (cámbialos en theme.ts).
 * `ink` (fondo de tarjeta/escena) es local a cada plantilla porque difiere.
 */
export const MG = {
  teal: theme.accent, // #0F766E
  green: "#34d399",
  cyan: "#22d3ee",
  amber: "#f59e0b",
  red: "#ef4444",
  white: theme.text, // #FFFFFF
} as const;
