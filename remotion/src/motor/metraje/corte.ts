/**
 * EL MONTAJE COMO DATOS — la capa de las piezas SIN avatar.
 *
 *   metraje-NNN.ts  (Corte[])  →  <PistaMetraje>
 *
 * Hermana de `camara.ts`: donde la cámara reencuadra UN clip, el montaje decide
 * qué clip se ve, desde qué segundo, cuánto dura y cómo se mueve dentro de su
 * propio encuadre. Nació en el 009 (reel de b-roll), el 010 le añadió fotos,
 * velocidad, disolvencia y el velo inferior, y el 011 el negro de entrada y
 * salida, los velos opcionales y el look sin marca. Con tres copias de
 * `PistaMetraje` en `proyectos/` ya se sabía qué era del FORMATO y qué de cada
 * vídeo: lo del formato es esto. Lo que solo ha usado una pieza —el whip y el
 * flash del 009— se queda en esa pieza y entra por `EntradaPropia`: la regla de
 * la casa es que al motor sube lo que ya ha servido a más de un vídeo.
 *
 * Datos puros y cero imports en tiempo de ejecución (solo `import type`), misma
 * disciplina que `plan/nucleo.ts`: la puerta (`revisar-metraje.mjs`) carga este
 * archivo con `node` y mide con LAS MISMAS cuentas con las que pinta el
 * intérprete. Las dos puertas de antes llevaban su propia copia de `DISOLVER`
 * («debe coincidir con PistaMetraje.tsx»), que es exactamente como una puerta
 * empieza a medir un vídeo distinto del que se renderiza.
 */
import type { Marca } from "../marca";

/**
 * Corrección POR CLIP —o por tramo, si un clip largo cambia de luz—, medida con
 * `ffmpeg signalstats` y no a ojo. Va ANTES que el look: primero se igualan los
 * clips y después se les aplica a todos el mismo look. Al revés, un look
 * uniforme amplifica las diferencias en vez de taparlas (lo mismo dice
 * `motor/noticias/montadores.tsx`, y por lo mismo).
 */
export interface Grado {
  /** Multiplicador de brillo. */
  exposicion?: number;
  saturacion?: number;
  contraste?: number;
  /** Velo cálido EXTRA sobre el del look. Positivo calienta; negativo enfría. */
  calido?: number;
}

/**
 * §entra — cómo NACE un plano. El corte seco es el defecto y casi siempre lo
 * correcto: una transición en cada corte las anula todas.
 *
 *   corte     seco.
 *   disolver  funde sobre el anterior en `DISOLVER` frames: el plano entra ANTES
 *             de su `en` (`solapeDe`), así que SU clip tiene que tener ese
 *             metraje antes de `desde`. El anterior no se alarga: acaba en su
 *             `en + dur`, que es el frame en que el entrante ya es opaco.
 *   negro     nace de negro en `DESDE_NEGRO` frames. Apertura de acto.
 *
 * Una pieza puede tener entradas PROPIAS (el 009: `whip` y `flash`): las nombra
 * en su unión y las pinta con `EntradaPropia`. Y cada pieza CIERRA su unión en
 * su `metraje-NNN.ts` a lo que su encargo permite —el 010 prohíbe flashes, el
 * 009 no disuelve—.
 */
export const ENTRADAS_DEL_FORMATO = ["corte", "disolver", "negro"] as const;
export type EntradaDelFormato = (typeof ENTRADAS_DEL_FORMATO)[number];

/**
 * Lo que una entrada PROPIA le hace a su plano en el frame `f` (contado desde
 * que el plano entra). Todo opcional; lo que no se da, no se pinta.
 */
export interface EfectoDeEntrada {
  /** px de desplazamiento horizontal del plano (se antepone al punch-in). Lo mide la puerta (§encuadre). */
  x?: number;
  /** px de desenfoque del medio. 0 = sin `blur`. */
  borron?: number;
  /** Una capa de color por encima de todo, con su opacidad. */
  destello?: { color: string; opacidad: number };
}

/**
 * La implementación de una entrada propia: una función PURA del frame. Si la
 * pieza quiere que su puerta la mida, la escribe sin React (con el `interpolate`
 * de `remotion/no-react`, que es el mismo).
 */
export type EntradaPropia = (f: number) => EfectoDeEntrada;

/**
 * Un plano del montaje. `E` son las entradas que usa la pieza: las del formato
 * por defecto, más las propias que traiga (y entonces `<PistaMetraje>` exige su
 * implementación en `entradas`).
 */
export interface Corte<E extends string = EntradaDelFormato> {
  id: string;
  /** `video` reproduce; `foto` sostiene e ignora `desde` y `velocidad`. Defecto: `video`. */
  tipo?: "video" | "foto";
  /** Ruta dentro de `remotion/public/`. */
  src: string;
  /**
   * SEGUNDO de entrada en el clip FUENTE, no frame: describe el MATERIAL, y el
   * material no puede depender del fps de la comp. El 009 montaba clips de
   * 23,976 · 25 · 29,97 en una comp de 30, y 84 frames no son lo mismo en
   * 23,976 que en 30. El intérprete lo pasa a `trimBefore` con el fps de la comp.
   */
  desde?: number;
  /** Frame ABSOLUTO de la comp en el que entra. */
  en: number;
  /** Frames que dura EN LA COMP. */
  dur: number;
  /**
   * Velocidad de reproducción (`playbackRate`). Solo vídeo, defecto 1.
   * Segundos de fuente consumidos = `dur / fps × velocidad`: esa cuenta se hace
   * mal de cabeza con tres cortes seguidos, y por eso la verifica la puerta (R20).
   */
  velocidad?: number;
  /** Punch-in: escala al entrar → escala al salir. Nada se queda quieto. */
  zoom: readonly [number, number];
  /**
   * §encuadre — % del alto que se SUBE el plano. Positivo enseña la parte de abajo.
   *
   * El intérprete pinta `translateY(-pan%) scale(z)`, y en CSS eso es T·S: se
   * escala primero y se desplaza después, así que el `pan` NO lo multiplica la
   * escala. Con el sujeto a la fracción `u` del alto del plano:
   *
   *     para llevarlo a la fracción `d` de la pantalla   pan = 100·(z·(u−0,5) − (d−0,5))
   *     para que el plano SIGA CUBRIENDO el cuadro       |pan| ≤ 50·(z−1)
   *
   * La segunda es la que muerde, y con la escala MÍNIMA del corte: pedir un
   * `pan` grande obliga a un `zoom` grande, no al revés. Si no se cumple sale
   * una franja negra en un borde que puede no caer en el frame que revisas, y
   * por eso la mide la puerta. Una entrada propia que desplace el plano
   * (`EfectoDeEntrada.x`) tiene la misma cuenta en horizontal: |x| ≤ (z−1)/2 · ancho.
   */
  pan?: number;
  entra?: E;
  /** Frames de fundido a NEGRO al final del plano. Cierre de acto. */
  salidaNegro?: number;
  grado?: Grado;
  /** Por qué este plano, aquí y así. Obligatorio, como en toda capa de datos. */
  reason: string;
}

/**
 * EL LOOK — lo que hace que clips de cámaras distintas se lean como UNA pieza.
 * Todo son factores sobre el clip ya corregido por su `grado`. Colores en
 * `#RRGGBB`.
 *
 * Lo normal es que salga del canal (`lookDeMarca`): el look del metraje es de
 * marca, igual que su papel. Pero no toda pieza tiene canal —una boda no lo es—
 * y entonces se escribe entero en la composición.
 */
export interface LookMetraje {
  saturacion: number;
  contraste: number;
  /** Alfa del velo cálido (soft-light), antes de sumarle el `grado.calido` del corte. Tope 0,5. */
  calido: number;
  /** Color del velo cálido. */
  colorCalido: string;
  grano: number;
  vineta: number;
  /** % del radio en que la viñeta empieza a oscurecer. Defecto 55. */
  vinetaDesde?: number;
  /** Fondo de cada plano, tinta de los velos y del fundido a negro. Defecto `#000000`. */
  negro?: string;
}

/** El look de un canal: su `metraje`, con su acento como velo cálido y su negro. */
export const lookDeMarca = (marca: Marca): LookMetraje => ({
  ...marca.metraje,
  colorCalido: marca.color.acento,
  negro: marca.color.negro,
});

/**
 * Un VELO de legibilidad: degradado del negro del look desde un borde. Es lo
 * que necesita un texto encima para leerse sobre metraje que no se controla (el
 * humo blanco de unas alitas, un cielo quemado, una camiseta blanca). Alto en
 * px REALES y no en %, porque lo que tiene que cubrir es la caja de un molde o
 * de un subtítulo, y esas están en px.
 */
export interface Velo {
  /** px desde el borde hasta donde el degradado llega a transparente. */
  alto: number;
  /** Alfa del negro en el borde. */
  borde: number;
  /** Alfa en la parada intermedia. */
  medio: number;
  /** Dónde cae la parada intermedia, como fracción de `alto` (0-1). */
  parada: number;
}

/** Opcionales los dos: el 009 llevaba solo el de arriba, el 010 los dos y el 011 ninguno. */
export interface Velos {
  arriba?: Velo;
  abajo?: Velo;
}

/**
 * Frames que dura una disolvencia: 12 f = 0,4 s. En el 010 se probaron 20 y en
 * el giro de tono la casa tardaba tanto en aparecer que el corte dejaba de
 * leerse como una decisión y empezaba a leerse como un fundido de plantilla.
 */
export const DISOLVER = 12;

/** Frames en que un plano nace de negro (`entra: "negro"`): 0,6 s. */
export const DESDE_NEGRO = 18;

/**
 * Frames que un plano entra ANTES de su `en` para disolver sobre el anterior.
 *
 * Es la ÚNICA ventana de la disolvencia, y la pone el que ENTRA. Hasta el 015
 * el saliente llevaba además una «cola» de otros `DISOLVER` frames después de
 * su `en + dur`, «para que la disolvencia no cayera sobre negro». No hacía
 * falta: el entrante se monta DESPUÉS en el DOM (encima), empieza `solape`
 * frames antes de su `en` y en su `en` ya es opaco, fondo negro incluido; el
 * saliente sigue visible debajo hasta ese mismo frame sin alargar nada. La cola
 * solo pintaba 12 frames que el plano opaco de encima tapaba enteros.
 *
 * Tapados, pero no gratis: la puerta los contaba como metraje que el clip tenía
 * que tener. En el 015 (una presentadora grabada en nueve tomas, con la voz
 * recortada al segundo) eso exigía 0,4 s de clip DESPUÉS de cada corte que
 * nadie iba a ver, y seis de las ocho transiciones no los tenían. Quitarla no
 * mueve un píxel de lo publicado —comprobado renderizando los f163-172 del 011
 * (la cola de `c01` bajo `c02`) antes y después: idénticos byte a byte—.
 */
export const solapeDe = (corte: Corte<string>): number => (corte.entra === "disolver" ? DISOLVER : 0);

/**
 * El frame de la FUENTE en el que arranca el plano —lo que recibe `trimBefore`—
 * SIN recortar a 0. Si el corte disuelve, el plano empieza `solape` frames antes
 * y la fuente tiene que retroceder lo mismo, a la velocidad de este corte, o el
 * contenido daría un salto en el instante en que se vuelve opaco.
 *
 * Negativo significa que el clip no tiene tanto metraje antes de `desde`: el
 * intérprete recorta a 0 y el plano ENTERO sale desplazado en la fuente. La
 * puerta lo cuenta como fallo.
 */
export const arranqueEnFuente = (corte: Corte<string>, solape: number, fps: number): number =>
  Math.round((corte.desde ?? 0) * fps) - Math.round(solape * (corte.velocidad ?? 1));
