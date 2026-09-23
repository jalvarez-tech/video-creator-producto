/**
 * Tokens de ESTILO de la biblioteca de gráficos — el "cómo se ve".
 * Trío de vocabularios del motor, cada uno con su archivo:
 *   theme.ts   → la MARCA (tipografía, acento, texto)
 *   motion.ts  → el MOVIMIENTO (muelles, easings, duraciones, stagger)
 *   estilos.ts → la FORMA (color derivado, sombra, escalas tipográficas)
 *
 * Regla: aquí NO hay nada que dependa del frame. Si algo se mueve, vive en
 * motion.ts o en el componente. Así un gráfico se puede rediseñar sin tocar su
 * coreografía, y re-cronometrar sin tocar su diseño.
 *
 * Guía humana: manuales/motion-graphics/SKILL.md.
 */
import { MG } from "../motion";
import { theme } from "../theme";

/** Tipografía de marca (atajo: casi todos los gráficos la necesitan). */
export const FONT = theme.fontFamily;

/**
 * `#rrggbb` → `rgba(r,g,b,a)`. Acepta también `#rgb`.
 * Los colores de marca son hex; las capas (sombras, scrims, glows) necesitan
 * alfa. Sin este helper acabas escribiendo el rgba a mano y el color deja de
 * salir de theme.ts — que es justo lo que rompe la coherencia.
 */
/** Reexportada de `formato.ts`, que es donde vive la única copia. */
export { alfa } from "../formato";

/**
 * Paleta de gráficos = la de marca (`MG`) + los neutros de capa.
 * `tinta` es el fondo de tarjeta/sello: casi negro y TRASLÚCIDO, para que el
 * avatar o el fondo sigan leyéndose por debajo (una caja opaca sobre vídeo se
 * lee como parche pegado, no como capa).
 */
export const G = {
  ...MG,
  tinta: "rgba(11,17,32,0.66)",
  tintaSolida: "#0B1120",
  linea: "rgba(255,255,255,0.10)",
  tenue: "rgba(255,255,255,0.32)",
  apagado: "rgba(255,255,255,0.60)",
  gris: "rgba(148,163,184,0.95)",
  /**
   * El mismo tono que `gris` (slate-400: 148,163,184 = #94A3B8) pero SÓLIDO,
   * igual que `tintaSolida` lo es de `tinta`. Existen los dos porque `alfa()`
   * solo sabe derivar de hex: un chip apagado necesita sacar su relleno y su
   * borde del gris, y con el rgba de `gris` caería al blanco de respaldo.
   */
  grisSolido: "#94A3B8",
} as const;

/**
 * Sombras. `texto` es OBLIGATORIA sobre vídeo: sin ella el blanco desaparece
 * en cuanto el avatar lleva camisa clara o el fondo se aclara un frame.
 */
export const SOMBRA = {
  texto: "0 2px 12px rgba(0,0,0,0.70)",
  caja: "0 12px 44px rgba(0,0,0,0.40)",
} as const;

/**
 * CAJAS: los tokens de las cajas con fondo propio, y de momento solo el SELLO.
 *
 * Está aquí porque estaba escrito DOS VECES —el componente `<Sello>`
 * (Texto.tsx) y la piel `sello` del intérprete (`cajaPiel`, PistaGraficos.tsx)—
 * y las dos copias YA habían divergido. Una sola copia no puede volver a
 * divergir; dos, ya se demostró que sí.
 *
 * `campo` y `panel` NO están aquí y no es un olvido: su borde sale de la tinta
 * que pide el plan y su ancho de la caja del molde, o sea que son cálculo, no
 * token. Lo que se comparte es lo que es CONSTANTE.
 *
 * QUÉ COMPARTEN EXACTAMENTE, que no es todo: fondo, borde, radio, padding y
 * sombra. El `gap` solo lo consume `<Sello>`, y a propósito. `<Sello>` es un
 * flex cuyos hijos no llevan margen, así que sin `gap` sale con las líneas
 * pegadas. La piel, en cambio, se aplica sobre un GRUPO del plan, y ahí la
 * separación entre hermanos ya la monta `RenderGrupo` como margen en cada hijo
 * (`sepExtra`): un `gap` CSS encima se SUMARÍA en vez de sustituirlo, y
 * `col([...], { gap: 34, piel: { caja: "sello" } })` acababa separando 40 px.
 * Por eso `cajaPiel` emite `gap` solo si el plan lo pide (`piel.gap`), como aire
 * EXTRA. Compartir el token no es lo mismo que dar el mismo resultado cuando lo
 * que hay debajo es distinto — y decirlo aquí es lo que impide volver a
 * «arreglarlo» copiando el gap otra vez.
 */
export const CAJA = {
  sello: {
    background: G.tinta,
    border: `1px solid ${G.linea}`,
    borderRadius: 30,
    padding: "24px 40px",
    boxShadow: SOMBRA.caja,
    gap: 6,
  },
} as const;

/**
 * Escalas tipográficas EN PX A 1080 DE ANCHO (9:16 vertical, el formato base
 * del sistema). En 16:9 los mismos px se ven más pequeños en proporción: usa
 * `escalaPorAncho(width)` para reescalarlos, no números sueltos.
 *
 * Cuatro roles y nada más. Si necesitas un quinto, casi siempre es que la
 * escena tiene dos protagonistas (SKILL §jerarquía: uno solo).
 *   kicker   → antetítulo, contexto, sección. Nunca es el mensaje.
 *   etiqueta → la frase de apoyo, lo que explica la cifra.
 *   titular  → el mensaje. Uno por escena.
 *   cifra    → el dato como protagonista (tabular-nums: los dígitos no bailan
 *              al contar; sin esto un contador "tiembla" en cada frame).
 */
export const TXT = {
  kicker: {
    fontSize: 30,
    fontWeight: 600,
    letterSpacing: 6,
    textTransform: "uppercase",
    color: G.apagado,
  },
  etiqueta: { fontSize: 46, fontWeight: 600, letterSpacing: 0.2, color: theme.text },
  titular: { fontSize: 92, fontWeight: 800, letterSpacing: -1, lineHeight: 1.05, color: theme.text },
  cifra: {
    fontSize: 210,
    fontWeight: 800,
    letterSpacing: -3,
    lineHeight: 1,
    color: theme.text,
    fontVariantNumeric: "tabular-nums",
  },
} as const;

/**
 * Factor de escala tipográfica para un ancho de composición dado (base 1080).
 * En 1920×1080 devuelve 1.78 — pero ojo: en horizontal el texto suele querer
 * ser MÁS PEQUEÑO en proporción (hay más ancho útil), así que la fórmula
 * satura en 1.35. Es un punto de partida, no una ley.
 */
export const escalaPorAncho = (width: number): number => Math.min(1.35, width / 1080);

/**
 * Márgenes de zona segura, en px, para un ancho de composición.
 * Coincide con `zonaSeguraPct` de presets.ts (9:16 = 11 % ≈ 118 px).
 */
export const margenSeguro = (width: number, pct = 11): number => Math.round((width * pct) / 100);
