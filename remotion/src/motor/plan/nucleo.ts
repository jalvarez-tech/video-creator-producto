/**
 * LA TOMA COMO DATOS — el sustrato de las capas declarativas del motor.
 *
 * El sistema tenía dos capas GEMELAS y una estaba muerta:
 *   gráficos → GraficoCue[]  → <PistaGraficos>   (0 usos en proyectos/)
 *   noticia  → TomaNoticia[] → <PistaNoticia>    (004 y 005: las mejores piezas)
 *
 * El diagnóstico no fue «a GraficoCue le faltan campos», fue «el cue es más
 * pequeño que la unidad real de trabajo». En las piezas de verdad no existe
 * «un gráfico»: existe una TOMA de 3-5 elementos coreografiados entre sí. Por
 * eso `TomaNoticia` sale bien maquetada sola (trae composición dentro) y
 * `graficos-demo.ts` necesitaba `dy: 310` con dos líneas de comentario.
 *
 * Aquí la unidad es `Toma`: un MOLDE + un ÁRBOL de hijos. Reglas de la casa que
 * este archivo hace cumplir por construcción:
 *   · `reason` va ANTES que `hijos` en la firma de `gfx()`: el compilador no te
 *     deja escribir el cuerpo de una toma sin haber escrito para qué existe.
 *   · No hay `dy`, ni `zona`, ni `top`, ni `estilo`. La única coordenada del
 *     sistema es `xy` dentro de un grupo `diagrama`.
 *   · El ORDEN del array ES el z-order. No hay zIndex en ningún sitio.
 *   · Determinismo: ni Date.now, ni Math.random sin sembrar, ni timers.
 *   · ES2015 A MANO, PORQUE EL COMPILADOR NO LO COMPRUEBA. El tsconfig dice
 *     `lib: ["es2015"]`, pero `@types/node` entra solo (no hay `"types"`) y su
 *     `/// <reference lib="es2020" />` reabre es2016-es2020: hoy `includes`,
 *     `flat`, `Object.entries` y `padStart` COMPILAN aquí (`plan.ts:221` y dos
 *     `padStart` en `Prueba.tsx` ya los usan). Así que
 *     esto es disciplina, no red: `indexOf(x) >= 0`, `Object.keys`, y `Set`/`Map`
 *     que sí son es2015. Si algún día se quiere que muerda de verdad, es
 *     `"types": ["web", "react"]` en el tsconfig y arreglar esos tres usos.
 *
 * DATOS PUROS: ni un import en tiempo de ejecución (solo tipos, que desaparecen
 * al compilar), para que un plan se valide con `node` sin montar React ni
 * Remotion. Si te hace falta un color o un easing aquí, te has equivocado de
 * archivo: eso vive en el dialecto.
 *
 * FRAMES. `ventana` va en frames ABSOLUTOS (sale de la transcripción y no se
 * puede recalcular). Todo lo de dentro es LOCAL. Y hay una asimetría
 * deliberada, marcada en los nombres:
 *   `en: number` → relativo a SU PADRE (es un desfase de coreografía)
 *   `en: {tras}` → LOCAL A LA TOMA: «después de A» no depende de dónde cuelgue
 *                  quien lo pide, así que el frame del padre NO se suma
 *   `muere`     → relativo a LA TOMA  (es un beat de la voz)
 *   `conmutaEn` → relativo a LA TOMA  (idem: el giro cae sobre una palabra)
 * El validador comprueba los tres YA RESUELTOS, no los números declarados.
 */

// El ÚNICO import del archivo, y es `import type`: TypeScript lo borra al
// compilar, así que en tiempo de ejecución este módulo sigue sin depender de
// nada. La TABLA de avances (`AVANCES`) NO se importa aquí: la elige el dialecto
// —que es quien sabe con qué tipografía monta cada pieza— y la pasa a
// `anchoTexto`. Ver §11b.
// `import type`: se borra al compilar, así que esta capa sigue siendo DATOS
// PUROS y un plan se valida con `node` pelado. Ver la cabecera de marca.ts.
import type { Marca, PesoAvance } from "../marca";
export type { PesoAvance };

import type { TablaAvances } from "./avances";

/* ══════════════════════ 1 · TIEMPO ═══════════════════════════════════════ */

/** Ventana en frames ABSOLUTOS. `"fin"` = hasta el final de la composición. */
export type Ventana = readonly [number, number | "fin"];

/**
 * Momento local. La forma `{tras}` existe por un fallo concreto del 003: la
 * etiqueta «Hoy» baja de alfa .95 a .6 en el frame 910 porque es cuando entra
 * el tachón, y ese 910 estaba copiado en dos sitios. `cuando` distingue el
 * ARRANQUE del otro nodo de su aterrizaje: sin eso había que restar a mano la
 * duración de la entrada, que es justo el número que `tras` viene a borrar.
 */
export type Momento = number | { tras: string; mas?: number; cuando?: "empieza" | "acaba" };

export const tras = (id: string, mas = 0, cuando: "empieza" | "acaba" = "acaba"): Momento => ({
  tras: id,
  mas,
  cuando,
});

/* ══════════════════════ 2 · JERARQUÍA Y ROL ══════════════════════════════ */

/** Jerarquía de la TOMA frente a otras tomas. El validador: un solo hero. */
export type Jerarquia = "hero" | "apoyo" | "ambiente";

/**
 * Rol del ELEMENTO dentro de su toma. Deriva tamaño, alfa del color y barra
 * viajera. Va separado de `Jerarquia` a propósito: en el tipo viejo
 * `Contador.punch = jerarquia === "hero"` convertía una etiqueta de VALIDACIÓN
 * en una decisión estética, y no se podía tener un hero sin golpe.
 */
export type Rol = "hero" | "apoyo" | "contexto";

/* ══════════════════════ 3 · LEY DE MOVIMIENTO ════════════════════════════ */

/** Muelles de motion.ts, por NOMBRE de intención. Nunca `damping: 14`. */
export type NombreMuelle =
  | "entrada" | "contador" | "tarjeta" | "cta" | "golpe" | "flip" | "pulso" | "punch" | "tap";

/**
 * Unión DISCRIMINADA y no un enum plano: cada ley tiene sus ajustes, y
 * mezclarlos en un objeto plano fue lo que dejó `dur` significando cinco cosas
 * distintas (dibujado del trazo, count-up, ancho del barrido y paso del stagger
 * de la lista, todo en el mismo campo).
 */
export type Entrada =
  | { como: "ninguna" }
  | { como: "escalon" }
  | { como: "barrido"; dur?: number; barra?: boolean }
  | { como: "extiende"; dur?: number }
  | {
      como: "muelle";
      muelle?: NombreMuelle;
      y?: number;
      x?: number;
      escala?: number;
      desenfoque?: number;
      rampa?: number;
    };

export type NombreLey = Entrada["como"];

/** `Escena.fundido` existía y el intérprete no lo pasaba nunca: todo salía por corte. */
export type Salida = { como: "corte" } | { como: "fundido"; dur?: number };

/**
 * La ley de la PIEZA, declarada una vez. El 003 entra SIEMPRE con barrido duro
 * de 4 f y barra viajera; eso vivía repetido en once componentes y bastaba un
 * descuido para que una escena entrara con spring y la pieza perdiera firma.
 *
 * `escalera` es el stagger POR POSICIÓN: al hijo i sin `en` propio se le da
 * `escalera[i]`. Es el `at={t.kicker ? 4 : 0}` de PistaNoticia generalizado, y
 * por eso borrar una línea del plan RECOMPONE la coreografía sola.
 */
export interface Ley {
  entrada: Entrada;
  salida: Salida;
  escalera: readonly number[];
  /** Entradas vetadas por la pieza. `revisaPlan` las hace cumplir. */
  prohibe?: readonly NombreLey[];
  /** Solo el hero lleva barra viajera: es un canal de jerarquía, no un adorno. */
  barraEnHero?: boolean;
  /**
   * RESERVA DE MAQUETA. Con `true`, un hijo que entra tarde ocupa su sitio desde
   * el arranque de su padre, CONGELADO en su primer frame, en vez de no existir.
   *
   * Sin esto, un bloque centrado se recoloca cada vez que entra un elemento: el
   * titular de una toma editorial con kicker (0), titular (4) y etiqueta (10)
   * daba tres maquetas distintas en los primeros diez frames, y el salto se lee
   * como error de render, no como animación. Es la misma decisión que <Barrido>
   * ya documenta ("el bloque RESERVA su sitio"), subida al intérprete.
   *
   * Va en la LEY y no en el nodo porque es una decisión de FORMATO: el editorial
   * maqueta primero y anima después; los overlays sobre avatar entran y salen
   * uno a uno y ahí reservar sitio para algo que aún no se ve sería mentir sobre
   * la composición. Por defecto, false (lo que hacía el intérprete hasta ahora).
   *
   * OJO: un nodo con `entra: {como:"ninguna"|"escalon"}` no tiene animación que
   * lo esconda, así que bajo `reserva` se ve QUIETO desde el principio. Es
   * correcto para las piezas que se animan por dentro (RecortePrensa, ChipIcono,
   * Medidor, TarjetaFoto: todas nacen a opacidad 0) y es justo lo que NO se
   * quiere para un corte duro.
   */
  reserva?: boolean;
}

const DUR_ENTRADA: Record<NombreLey, number> = {
  ninguna: 0,
  escalon: 1,
  barrido: 4,
  extiende: 6,
  muelle: 8,
};

/**
 * Enumeración EN TIEMPO DE EJECUCIÓN de las leyes de entrada.
 *
 * Sale de `DUR_ENTRADA` y no de una lista escrita a mano: ese `Record<NombreLey,
 * number>` es TOTAL por construcción —una variante nueva de `Entrada` sin su
 * duración no compila—, así que esta lista no puede quedarse corta. La consume
 * el catálogo (`graficos/fichas.ts`), que necesita recorrer las entradas y no
 * solo tipar contra ellas: un tipo no se puede iterar.
 */
export const NOMBRES_ENTRADA = Object.keys(DUR_ENTRADA) as readonly NombreLey[];

export const duracionEntrada = (e: Entrada | undefined, ley: Ley): number => {
  const u = e ?? ley.entrada;
  if (u.como === "barrido") return Math.max(1, Math.round(u.dur ?? DUR_ENTRADA.barrido));
  if (u.como === "extiende") return Math.max(1, Math.round(u.dur ?? DUR_ENTRADA.extiende));
  if (u.como === "muelle") return Math.max(1, Math.round(u.rampa ?? DUR_ENTRADA.muelle));
  return DUR_ENTRADA[u.como];
};

/* ══════════════════════ 4 · ENVOLTURAS ═══════════════════════════════════ */

/**
 * Decoradores aplicables a CUALQUIER nodo. Ocho fichas del catálogo toman
 * `children` y no son contenido sino operadores sobre contenido; antes solo una
 * (glitch) estaba cableada y con el hijo FIJADO a <Titular>.
 *
 * `parpadeo`, `pulso` y `temblor` son tiempo cíclico o acotado, no una ventana:
 * el caret del CTA (9 f on / 9 f off) como cue serían diez cues de nueve frames.
 * `atenua` es el cambio de opacidad DISPARADO por otro nodo (la etiqueta «Hoy»).
 */
export type Envoltura<C extends string> =
  | { env: "latido"; amplitud?: number; periodo?: number }
  | { env: "halo"; tinta?: C; radio?: number; intensidad?: number }
  | { env: "glitch"; en?: number; dur?: number; intensidad?: number }
  | { env: "aberracion"; separacion?: number }
  | { env: "parpadeo"; ciclo: number; a?: number; desde?: "toma" | "nodo" }
  | { env: "pulso"; entre: readonly [number, number]; amplitud?: number }
  | { env: "temblor"; entre: readonly [number, number]; amplitud?: number }
  | { env: "atenua"; a: number; en: Momento };

/** El discriminante, DERIVADO de la unión: el catálogo no reescribe la lista. */
export type ClaveEnvoltura = Envoltura<string>["env"];

/* ══════════════════════ 5 · TEXTO CON PARTES ═════════════════════════════ */

/**
 * Un trozo con estilo propio: la palabra «calificados» del 002 en otro color y
 * el `resaltar` de noticias, que hoy se busca con `indexOf` sobre el titular y
 * falla EN SILENCIO si una tilde no coincide. Aquí la relación es estructural:
 * el fallo deja de poder existir (y con él, su regla del validador).
 */
export interface Trozo<C extends string> {
  t: string;
  tinta?: C;
  /** Rotulador/resalte. El CUÁNDO lo pone la pieza contenedora, no el texto. */
  rotulador?: boolean;
  tachado?: boolean;
  enfasis?: boolean;
}

export type TextoRico<C extends string> = string | readonly (string | Trozo<C>)[];

/** Línea de un titular. Con `en` propio: el remate del 003 entra en 964 y 968. */
export type Linea<C extends string> = TextoRico<C> | { texto: TextoRico<C>; en: number };

export const textoPlano = <C extends string>(t: TextoRico<C>): string =>
  typeof t === "string" ? t : t.map((x) => (typeof x === "string" ? x : x.t)).join("");

/**
 * Los `Trozo` escondidos en las props de una pieza, vengan donde vengan
 * (`texto`, `lineas`, `items[].texto`…).
 *
 * El núcleo NO sabe qué props de qué pieza llevan texto rico: las props son
 * `never` aquí y el registro es del dialecto. Así que se busca por FORMA, y la
 * forma de un trozo es inconfundible en este sustrato: un objeto con un campo
 * `t` de tipo string. Ninguna otra estructura de props lo tiene (`SerieBarra`
 * lleva `etiqueta`/`valor`/`tinta`, `TramoContador` lleva `a`/`dur`/`espera`,
 * `Hito` lleva sus propios nombres), y el que sí lleva `tinta` sin `t` —una
 * barra de una serie— es un color de RELLENO y no de texto, que es justo lo que
 * esta búsqueda no debe tocar.
 *
 * Tope de hondura por seguridad: props → `lineas` → línea → trozo son cuatro
 * niveles, y un plan no anida texto más que eso.
 */
export function recorreTrozos(valor: unknown, fn: (t: Trozo<string>) => void, hondura = 0): void {
  if (hondura > 5 || valor === null || typeof valor !== "object") return;
  if (Array.isArray(valor)) {
    for (const x of valor) recorreTrozos(x, fn, hondura + 1);
    return;
  }
  const o = valor as Record<string, unknown>;
  if (typeof o.t === "string") {
    fn(o as unknown as Trozo<string>);
    return;
  }
  for (const k of Object.keys(o)) recorreTrozos(o[k], fn, hondura + 1);
}

/* ══════════════════════ 6 · REGISTRO DE PIEZAS ═══════════════════════════ */

/**
 * Lo que una ficha necesita del NODO, y no de las props, para estimar su bulto.
 *
 * Hoy es solo el rol, y no es un detalle: el intérprete saca el cuerpo por
 * defecto de un texto de `ctx.escalaRol[nodo.rol ?? "apoyo"]` (`escalaTexto` en
 * PistaGraficos, `pxTexto` en montadores.tsx), o sea del ROL DEL NODO. Mientras
 * la ficha escribía ese defecto a mano (`p.px ?? 28`) estimaba un cuerpo que el
 * vídeo no dibuja: los once kickers del 006 se estiman a 28 px y se pintan a 44,
 * un 57 % más — y una estimación por debajo de lo que se dibuja es el único
 * error que R09 no puede cometer. Ver `ESCALA` en cada dialecto.
 *
 * Ya RESUELTO (nunca `undefined`): el defecto `"apoyo"` lo pone el intérprete,
 * así que ponerlo también aquí es lo que hace que ficha y montador no puedan
 * discrepar.
 */
export interface CtxFicha {
  readonly rol: Rol;
  /**
   * LA TABLA DE ANCHOS MEDIDOS DEL PESO CON QUE PINTA EL MONTADOR.
   *
   * Antes cada ficha nombraba la suya a mano (`AVANCES.sf700`, `AVANCES.inter800`),
   * y eso ataba la estimación a UNA tipografía: cambiar la letra del canal dejaba
   * las quince fichas midiendo con la fuente vieja y R09 seguía diciendo LIMPIO
   * mientras el titular se salía. Ahora la pide por PESO y la resuelve el
   * dialecto, que es quien sabe con qué se dibuja.
   *
   * Sigue sin importarse `AVANCES` en esta capa (ver la nota de la cabecera): lo
   * que llega aquí son tablas YA RESUELTAS por quien montó el contexto.
   */
  readonly tabla: (peso: PesoAvance) => TablaAvances;
}

/**
 * La ficha de una pieza: metadatos del catálogo + lo que necesita el VALIDADOR.
 * Datos puros, sin React. El montador (el JSX) vive en `Montadores<R>`, que es
 * un mapeado TOTAL: una ficha sin su rama NO COMPILA. Esa es la vacuna contra
 * el fallo de v1 —37 anunciadas, 16 servidas, 21 mintiendo en silencio—.
 */
export interface Ficha<P> {
  nombre: string;
  familia: string;
  archivo: string;
  /** Qué es, en una frase (lo que se ve en el contact sheet del Studio). */
  que: string;
  /** Cuándo usarlo — y, cuando importa, cuándo NO. */
  cuando: string;
  /** Variante sugerida de sound/cues.ts. La decisión sonora sigue siendo del skill. */
  sonido?: string;
  /** true = capa de atmósfera: no compite por la maqueta ni cuenta para R08. */
  capa?: boolean;
  /** Alto APROXIMADO en px base 1080. Alarma de humo para R08, no cinta métrica. */
  alto?: (props: P, ctx: CtxFicha) => number;
  /**
   * Ancho APROXIMADO en px base 1080 de lo MÁS ANCHO QUE NO PUEDE PARTIRSE
   * (R09). Hermana de `alto`, y con la misma convención: sin `ancho` la pieza
   * mide 0 y no dispara nada.
   *
   * «Que no puede partirse» es la parte importante y es lo que la distingue de
   * `alto`. Un párrafo que no cabe a lo ancho NO se corta: baja de línea, y eso
   * es un problema de ALTO que ya vigila R08. Lo que sí se corta es lo que el
   * navegador no puede romper: una línea de un titular con `lineas` (el
   * intérprete le pone `white-space: nowrap` para que el salto declarado
   * signifique algo), una palabra más ancha que su caja, una fila de chips, una
   * caja de ancho fijo. Así que aquí se declara ESO y no el texto entero: medir
   * el párrafo completo llenaría el plan de avisos por algo que se ve bien.
   *
   * Es una ESTIMACIÓN por caracteres y no una medida —medir texto renderizado
   * exige DOM y rompería el determinismo entre renders—, así que cada dialecto
   * la calcula con la tipografía que él mismo monta. Ver `anchoTexto` en
   * `noticias/dialecto.ts` para el margen de error medido.
   */
  ancho?: (props: P, ctx: CtxFicha) => number;
  /**
   * Coherencia entre campos de la MISMA pieza — la generalización del mejor
   * hallazgo de noticias. Vive AL LADO de la pieza y no en un switch central,
   * para que añadir una primitiva no obligue a tocar el validador.
   */
  revisa?: (props: P) => string[];
  /** Aridad de un contenedor: una tarjeta con una sola cara sale con el dorso en blanco. */
  hijos?: { min?: number; max?: number; porque: string };
}

export type RegistroPiezas = Record<string, Ficha<never>>;

/** Conserva los tipos por clave (un `Record` a secas los aplanaría a `Ficha<never>`). */
export const registro = <R extends Record<string, Ficha<never>>>(r: R): R => r;

export type PropsDe<R extends RegistroPiezas, K extends keyof R> = R[K] extends Ficha<infer P> ? P : never;

/** La «unión de 37» que nadie escribe a mano: se DERIVA del objeto. */
export type ClaveDe<R extends RegistroPiezas> = Extract<keyof R, string>;

/** Contexto que recibe una pieza. No lee el plan: recibe props y contexto. */
export interface CtxPieza<C extends string> {
  /** Frame LOCAL a la pieza (0 = su primer frame). */
  f: number;
  len: number;
  fps: number;
  ancho: number;
  alto: number;
  /** Color semántico ya resuelto contra la paleta de la pieza. */
  tinta: (c: C, a?: number) => string;
  /** El color del nodo, ya resuelto y con el alfa del rol aplicado. */
  color: string;
  rol: Rol;
  /** Tamaño por defecto del rol, ya escalado al formato. */
  px: number;
  escala: number;
  /** El nodo pidió estirarse al ancho del bloque (`alignSelf: stretch`). */
  estira: boolean;
  ley: Ley;
  /**
   * La marca de la capa, ya resuelta. Es lo que permite que un montador pinte
   * el color y la letra del canal SIN importarlos a nivel de módulo — que era
   * lo que ataba el repo a una sola marca. Ver `Dialecto.marca`.
   */
  marca: Marca;
  /** La letra RESUELTA de la capa. Un montador que quiera la DISPLAY del canal
   *  la pide aquí; lo demás se hereda del contenedor. Ver `motor/letra.ts`. */
  letra: LetraDialecto;
}

export type Montador<P, C extends string, N> = (props: P, ctx: CtxPieza<C>) => N;

export type Montadores<R extends RegistroPiezas, C extends string, N> = {
  [K in ClaveDe<R>]: Montador<PropsDe<R, K>, C, N>;
};

/* ══════════════════════ 7 · EL ÁRBOL ═════════════════════════════════════ */

export type Alineacion = "centro" | "inicio" | "fin" | "base";

/** Contenedor con caja propia: el campo de WhatsApp del CTA, el sello, el panel. */
export interface Piel<C extends string> {
  caja: "sello" | "campo" | "panel";
  tinta?: C;
  ancho?: number | "seguro";
  alto?: number;
  gap?: number;
}

/** Las cajas que sabe montar una piel, derivadas del propio tipo. */
export type CajaPiel = Piel<string>["caja"];

/** Lo que TODO nodo puede declarar, sea hoja o grupo. */
export interface Comun<C extends string> {
  /** Solo hace falta si otro nodo lo referencia (`tras`, `atenua`). */
  id?: string;
  /** Desfase en frames LOCALES respecto de SU PADRE. */
  en?: Momento;
  /** Frame en el que muere, LOCAL A LA TOMA (es un beat de la voz, no un desfase). */
  muere?: Momento;
  /**
   * ASERCIÓN: el frame ABSOLUTO que dice la transcripción. No cambia el render;
   * si el `en` resuelto no cae aquí, `revisaPlan` avisa. Es la red para el error
   * más probable y hoy invisible de toda migración: un `en` anidado que se
   * calcula sobre el padre equivocado y sale dos frames tarde.
   */
  abs?: number;
  entra?: Entrada;
  sale?: Salida;
  envolturas?: readonly Envoltura<C>[];
  rol?: Rol;
  color?: C;
  /**
   * Multiplica al alfa que deriva el `rol`. El 003 usa DIEZ alfas distintas
   * (.95 .9 .85 .82 .72 .6 .5 .38 .3 .13) y tres roles no las cubren. Mismo
   * estatuto que `px`: un ajuste puntual, no una vía para inventar la paleta.
   */
  alfa?: number;
  /** Espacio EXTRA antes de este nodo (el `marginBottom: 22` de la tríada del 003). */
  sep?: number;
  /**
   * Se estira al ancho del BLOQUE que lo contiene (`alignSelf: stretch`). Mata
   * el `ancho: 520` medido a ojo. Para colgar la regla del VERBO y no del
   * bloque entero, mete verbo y regla en su propia columna: el ancho de una
   * columna auto es el de su hijo más ancho.
   */
  estira?: boolean;
  /** Ancla del gesto. `anclasDeSonido()` la emite con el frame ABSOLUTO resuelto. */
  sonido?: { variante: string; reason: string };
}

/** Claves reservadas: en `pon()` van al nodo, no a las props de la pieza. */
const CLAVES_COMUN: Record<string, true> = {
  id: true, en: true, muere: true, abs: true, entra: true, sale: true,
  envolturas: true, rol: true, color: true, alfa: true, sep: true,
  estira: true, sonido: true, dentro: true, xy: true, ancla: true, anclaY: true,
};

export const esClaveComun = (k: string): boolean => CLAVES_COMUN[k] === true;

/**
 * Una pieza del registro con SUS props tipadas. El tipo mapeado indexado genera
 * `{pieza: K, props: PropsDe<K>}` para cada clave y luego los une: escribir
 * `pieza: "contador"` obliga a pasar las props del contador y solo esas.
 */
export type Hoja<R extends RegistroPiezas, C extends string> = {
  [K in ClaveDe<R>]: Comun<C> & {
    pieza: K;
    props: PropsDe<R, K>;
    /** Contenido de un CONTENEDOR con piel (el campo del CTA, las caras 3D). */
    dentro?: readonly Nodo<R, C>[];
  };
}[ClaveDe<R>];

/**
 * Grupos. `pila` superpone en el mismo hueco (el tachón sobre SU texto);
 * `ranura` es el mismo sitio con estados que se turnan —la sustitución dura del
 * 003 (f924, f1037)— y con `conmuta: "volteo"` ES Tarjeta3D: la misma idea de
 * composición con otra ley de transición.
 */
export type Grupo<R extends RegistroPiezas, C extends string> = Comun<C> &
  (
    | {
        eje: "columna" | "fila" | "pila" | "capas";
        /** Un número, o uno por hueco: la S6 del 003 pide 160/420/250. */
        gap?: number | readonly number[];
        alinea?: Alineacion;
        /** Stagger por índice DENTRO del grupo. SUSTITUYE a la escalera, no se suma. */
        paso?: number;
        piel?: Piel<C>;
        hijos: readonly Nodo<R, C>[];
      }
    | {
        eje: "ranura";
        /** Frames LOCALES A LA TOMA (beats de la voz). N estados → N-1 valores. */
        conmutaEn: readonly Momento[];
        conmuta?: "corte" | "volteo";
        piel?: Piel<C>;
        hijos: readonly Nodo<R, C>[];
      }
    | {
        /** El ÚNICO sitio donde existe una coordenada. Solo en moldes que cubren. */
        eje: "diagrama";
        ancho: number;
        alto: number;
        hijos: readonly NodoUbicado<R, C>[];
      }
  );

export type Nodo<R extends RegistroPiezas, C extends string> = Hoja<R, C> | Grupo<R, C>;

/** Los ejes de composición que existen, derivados del propio `Grupo`. */
export type EjeGrupo = Grupo<RegistroPiezas, string>["eje"];

/**
 * Nodo con coordenada. `ancla` evita las seis restas a mano de la S6 del 003
 * (830-20, 1080-20, 250-26…): un círculo se ancla por su CENTRO.
 */
export type NodoUbicado<R extends RegistroPiezas, C extends string> = Nodo<R, C> & {
  xy: readonly [number, number];
  ancla?: "izq" | "centro" | "der";
  anclaY?: "arriba" | "centro" | "abajo";
  /** Caja de ancho fijo centrada en `xy` (las etiquetas de 380 px del eje). */
  ancho?: number;
};

export const esGrupo = <R extends RegistroPiezas, C extends string>(n: Nodo<R, C>): n is Grupo<R, C> =>
  !("pieza" in n);

/** Gap entre el hijo i y el i+1 (soporta el gap por hueco). */
export const gapEntre = (gap: number | readonly number[] | undefined, i: number, porDefecto: number): number => {
  if (gap === undefined) return porDefecto;
  if (typeof gap === "number") return gap;
  return gap.length === 0 ? porDefecto : gap[Math.min(i, gap.length - 1)];
};

/* ══════════════════════ 8 · MOLDES Y AMBIENTE ════════════════════════════ */

/** Fracción del alto REAL de la comp, no px: el mismo plan sirve en 9:16 y 16:9. */
export interface Ancla {
  desde: "arriba" | "abajo" | "centro";
  pct: number;
  /**
   * DÓNDE REPOSA EL BLOQUE dentro de una caja anclada al centro. Solo con
   * `desde: "centro"`; en fracción del alto, desde el borde inferior.
   *
   * La caja SIGUE cubriendo el cuadro entero —que es lo que hace que un hijo a
   * sangre (el metraje de un `escenario`, su `velo`) coincida con él— y lo único
   * que cambia es dónde se apoya el texto. `cuelga: 560/1920` es el
   * `paddingBottom: 560` con el que el intérprete viejo colgaba el titular del
   * tercio inferior.
   *
   * EXISTE PORQUE `desde: "abajo"` NO SIRVE PARA ESTO, y se probó primero: esa
   * caja no fija `top` ni `bottom`, así que es de alto AUTO, y un hijo absoluto
   * no contribuye al alto auto — la caja acaba midiendo lo que mida el titular,
   * su centro se va a y≈1317 y el metraje a sangre se desplaza ~357 px dejando
   * negro sin cubrir. Peor: el desplazamiento CAMBIA con el número de líneas.
   */
  cuelga?: number;
}

/**
 * Genérico en la tinta (`C`) SOLO por `tinta`, con `string` por defecto para que
 * quien únicamente lee un molde (el intérprete, `scrimDe`) no tenga que arrastrar
 * el parámetro.
 */
export interface Molde<C extends string = string> {
  /** ¿Tapa el vídeo? De aquí salen `tomasQueCubren()` y el desmontaje del avatar. */
  cubre: boolean;
  ancla: Ancla;
  alinea: Alineacion;
  gap: number;
  /** Scrim ACOPLADO: nace con la toma y muere con el texto. Nadie puede olvidarlo. */
  scrim: false | { alto: number; desde: "abajo" | "arriba" };
  /** Nombre de fondo del dialecto ("papel", "cine", "toma"…). El JSX vive en el intérprete. */
  fondo: string | false;
  /**
   * LA TINTA DEL MOLDE: el color de un nodo de este molde que no pide ninguno.
   *
   * OBLIGATORIA, y esa es toda la regla. El molde ya traía el FONDO y no la
   * tinta que se lee sobre él, así que en una toma de fondo negro el plan tenía
   * que escribir `color: "blanco"` en CADA pieza de texto; al olvidarlo, el nodo
   * caía a `dialecto.tintaBase` —que es la tinta del fondo dominante, carbón
   * sobre papel— y el texto salía negro sobre negro. Invisible, y sin un solo
   * aviso: el color resolvía a un hex perfectamente válido. En el 006 no llegó a
   * verse porque su autor lo escribió las once veces que hacían falta y anotó la
   * trampa en el propio fichero de datos; ésa es exactamente la clase de defecto
   * que se paga con memoria hasta el día que falla.
   *
   * Requerida y no opcional a propósito: un molde nuevo NO COMPILA hasta decir
   * sobre qué se lee. Un defecto silencioso es exactamente el fallo que esto
   * viene a cerrar, así que no puede arreglarse con otro defecto silencioso.
   */
  tinta: C;
  vineta: boolean;
  /** Presupuesto de alto en px base 1080 (R08). TODOS los moldes deben tenerlo. */
  altoMax?: number;
  /**
   * Presupuesto de ANCHO en px base 1080 (R09): el ancho ÚTIL de la caja del
   * molde, o sea el de la composición menos los dos márgenes de zona segura
   * (`margenSeguro`, 11 % → 1080 − 2×118 = 844).
   *
   * Hermano de `altoMax` y hasta ahora inexistente: `revisaPlan` medía el bulto
   * vertical contra el presupuesto del molde y NADIE miraba el horizontal, así
   * que un titular a la escala hero se salía del lienzo por los dos lados con el
   * plan diciendo LIMPIO. Es el fallo que destapó el 006 (`n01-sismo`).
   */
  anchoMax?: number;
  /** Punch-in de toma (1 → 1+punch). Es una decisión de FORMATO, no del plan. */
  punch?: number;
  /** Se lee en el aviso cuando algo no cabe. */
  porque: string;
}

export type ModoParticulas = "estallido" | "ambiente" | "lluvia";

/**
 * Ambiente de la toma. Lo pone el MOLDE por defecto; aquí solo se declara lo
 * que se aparta. Declararlo CON la toma es lo que mata la duplicación del 003,
 * donde las ventanas 198-313 / 433-495 / … estaban escritas dos veces.
 */
export interface Ambiente<C extends string> {
  /**
   * `rampa` = en cuántos frames el velo llega a su opacidad final. Por defecto
   * 3, que es lo que el intérprete lleva haciendo desde siempre: entrar de
   * golpe se ve como un parpadeo negro.
   *
   * Se pone a 0 cuando la toma pide estar PUESTA en su primer frame
   * (`entra: { como: "ninguna" }`, R23). Sin esto, esa petición sólo la obedece
   * el TEXTO: el velo sigue su rampa y el frame 0 sale con el titular sobre el
   * vídeo a pelo. Medido en el 013 — y el frame 0 es la miniatura del reel.
   * Ver R25.
   */
  scrim?: false | { alto?: number; desde?: "abajo" | "arriba"; opacidad?: number; rampa?: number };
  vineta?: boolean | { intensidad?: number };
  trama?: { tipo: "rejilla" | "puntos"; paso?: number; opacidad?: number; tinta?: C };
  foco?: {
    cx: number;
    cy: number;
    tinta: C;
    fuerza?: number;
    radio?: number;
    pulso?: number;
    /** Cambio duro de color (el ámbar→rojo del frame 258 del 003). Local a la toma. */
    cambiaEn?: { f: number; tinta: C };
  };
  particulas?: {
    modo: ModoParticulas;
    n: number;
    /** Varias tintas: el cue viejo solo daba UNA y salía confeti monocromo. */
    tintas?: readonly C[];
    origen?: readonly [number, number];
    forma?: "circulo" | "cinta";
    en?: number;
    dur?: number;
  };
}

/** Las capas de atmósfera que existen, derivadas del propio `Ambiente`. */
export type ClaveAmbiente = keyof Ambiente<string>;

/* ══════════════════════ 9 · DIALECTO, TOMA Y PLAN ════════════════════════ */

export type Regla<R extends RegistroPiezas, B extends string, M extends string, C extends string> = (
  plan: Plan<R, B, M, C>
) => string[];

/**
 * La letra de una capa: la familia con la que dibuja y la tabla medida de cada
 * peso. Vive en el DIALECTO y no en la marca porque hoy las dos capas usan
 * tipografías distintas —editorial San Francisco, gráficos Inter— y una ficha
 * que estimara con la tabla equivocada mentiría en silencio. El dialecto la
 * deriva de su marca; lo que no puede es heredarla de otra capa.
 */
export interface LetraDialecto {
  display: string;
  texto: string;
  tablas: Record<PesoAvance, TablaAvances>;
}

/** El vocabulario de una capa sobre el sustrato común. */
export interface Dialecto<R extends RegistroPiezas, B extends string, M extends string, C extends string> {
  nombre: string;
  /**
   * LA MARCA DE LA CAPA — la voz del canal, como DATO y no como import.
   *
   * El dialecto define el VOCABULARIO (qué piezas, qué moldes, qué beats) y la
   * marca los VALORES (colores, letra, sello, radio). Estaban en planos
   * distintos: el vocabulario se inyectaba —`<PistaGraficos>` es genérica en los
   * cuatro parámetros y no tiene un solo `if` por dialecto— y los valores eran
   * `export const` que quince archivos importaban a nivel de módulo. Por eso dos
   * marcas no podían convivir en el repo: cambiar el acento cambiaba TODOS los
   * proyectos, incluidos los ya publicados.
   *
   * Colgada del dialecto y no del plan a propósito: el validador recibe el plan
   * y llega al dialecto, así que R09 puede medir con la tipografía con la que se
   * va a pintar en vez de con la que la ficha nombró a mano.
   */
  marca: Marca;
  /** Con qué se dibuja y con qué se mide. Ver `LetraDialecto`. */
  letra: LetraDialecto;
  piezas: R;
  /** Eje narrativo. El vocabulario lo pone el DIALECTO: forzar los siete beats
   *  del short informativo sobre una pieza de avatar solo consigue que el autor
   *  mienta para pasar el validador. */
  beats: readonly B[];
  moldes: Record<M, Molde<C>>;
  paleta: Record<C, string>;
  /**
   * Tintas que MARCAN sobre el texto pero no lo colorean: el amarillo de
   * rotulador del formato editorial es una banda detrás de la palabra, y usado
   * como color de letra sobre papel beige da el peor contraste de la paleta.
   *
   * Estaba escrito en el comentario de la paleta («marca sobre la prueba, no
   * colorea texto») y un comentario no es una regla: en una pieza publicada la
   * advertencia de seguridad más crítica del guion acabó en amarillo sobre
   * beige, es decir la línea menos legible del cuadro siendo la más importante.
   * Declarado aquí, `revisaPlan` lo hace cumplir en `color` de nodo y en
   * `tinta` de trozo.
   *
   * POR QUÉ AQUÍ Y NO EN EL TIPO. Prohibirlo por construcción exigiría partir
   * `C` en dos parámetros (tintas de texto y tintas de marca) y arrastrarlos por
   * `Comun`, `Trozo`, `Nodo`, `Grupo`, `Toma`, `Plan`, `Dialecto`, `Molde`,
   * `CtxPieza`, `Montadores`, el intérprete y los dos dialectos: cinco genéricos
   * en cada firma del sustrato para vetar un valor en una capa. Y aun así no
   * cubriría el caso real sin duplicar el corte también en `Trozo`, que es
   * justo donde ocurrió. La regla se queda como DATO del dialecto —que es lo que
   * es: una decisión de la paleta editorial, no del sustrato— y el que la hace
   * cumplir es el validador.
   */
  tintasDeMarca?: readonly C[];
  /**
   * La tinta de un nodo que no pide color. El intérprete la necesita porque no
   * puede inventarse un nombre: tenía cableado `paleta["texto"]`, que existe en
   * el dialecto de gráficos y NO en el editorial (tinta/suave/blanco/acento/
   * resalte/papel), así que una capa nueva resolvía a `undefined` y pintaba
   * `color: undefined` — que en CSS es "hereda" y sobre negro es invisible.
   */
  tintaBase: C;
  /** La escala VIAJA en el dialecto: editorial 96/44/28, gráficos 104/46/32. */
  escala: Record<Rol, number>;
  alfaRol: Record<Rol, number>;
  ley: Ley;
  reglas: readonly Regla<R, B, M, C>[];
}

export interface Toma<R extends RegistroPiezas, B extends string, M extends string, C extends string> {
  id: string;
  molde: M;
  beat: B;
  ventana: Ventana;
  jerarquia: Jerarquia;
  /** OBLIGATORIO. Y va antes que `hijos` en el builder. */
  reason: string;
  hijos: readonly Nodo<R, C>[];
  ley?: Partial<Ley>;
  /** Pisa el ancla del molde (hay escenas reales que no están centradas). */
  ancla?: Ancla;
  gap?: number | readonly number[];
  alinea?: Alineacion;
  ambiente?: Ambiente<C>;
  /** Referencia a un SoundCue de cues-NNN.ts. La LEE `revisaMontaje`. */
  sonido?: string;
}

export interface Plan<R extends RegistroPiezas, B extends string, M extends string, C extends string> {
  /** Nombre de la capa en los avisos y en el name de la <Sequence>. */
  capa: string;
  dialecto: Dialecto<R, B, M, C>;
  formato: { ancho: number; alto: number; fps: number; duracion: number };
  /** Override de paleta del proyecto (el 002 descartó MG entera; es legítimo). */
  paleta?: Partial<Record<C, string>>;
  tomas: readonly Toma<R, B, M, C>[];
}

export const ventanaAbs = (v: Ventana, duracion: number): [number, number] => [
  v[0],
  v[1] === "fin" ? duracion : v[1],
];

/* ══════════════════════ 10 · RECORRIDO Y TIEMPOS ═════════════════════════ */

export interface Visita<R extends RegistroPiezas, C extends string> {
  nodo: Nodo<R, C>;
  padre?: Nodo<R, C>;
  indice: number;
  ruta: string;
  hondura: number;
}

/** Recorre el árbol en orden de declaración (= orden de z). */
export function recorre<R extends RegistroPiezas, C extends string>(
  nodos: readonly Nodo<R, C>[],
  ruta: string,
  fn: (v: Visita<R, C>) => void,
  padre?: Nodo<R, C>,
  hondura = 0
): void {
  nodos.forEach((nodo, indice) => {
    const r = `${ruta}/${indice}`;
    fn({ nodo, padre, indice, ruta: r, hondura });
    if (esGrupo(nodo)) recorre(nodo.hijos, r, fn, nodo, hondura + 1);
    else if (nodo.dentro) recorre(nodo.dentro, r, fn, nodo, hondura + 1);
  });
}

export interface Momentos<R extends RegistroPiezas, C extends string> {
  /** Frame LOCAL A LA TOMA en que entra cada nodo. */
  porNodo: Map<Nodo<R, C>, number>;
  /** Frame LOCAL A LA TOMA en que muere (o el fin de la toma). */
  finPorNodo: Map<Nodo<R, C>, number>;
  porId: Map<string, number>;
  entradoPorId: Map<string, number>;
  sinResolver: string[];
  avisos: string[];
}

/**
 * Convierte el árbol en frames locales. Tres reglas y ninguna más:
 *   `en: number`   → desfase sobre el frame de su contenedor
 *   `en: {tras}`   → cuando el otro entra («empieza») o aterriza («acaba»)
 *   sin `en`       → `paso` del grupo si lo hay; si no, `escalera[posición]`
 *
 * OJO: `paso` SUSTITUYE a la escalera, no se suma. Sumándolos, los dos chips
 * del 005 salían en +8/+18 donde `PistaNoticia` los pone en +8/+14, y nadie lo
 * vería hasta comparar renders.
 *
 * Iterativo con tope de pasadas: un ciclo de `{tras}` da un AVISO, no cuelga el
 * render. La comparten validador e intérprete A PROPÓSITO: cuando la ventana de
 * una toma estaba escrita en dos sitios, la pieza se desincronizó sola.
 */
export function resuelveMomentos<R extends RegistroPiezas, B extends string, M extends string, C extends string>(
  toma: Toma<R, B, M, C>,
  ley: Ley,
  len: number
): Momentos<R, C> {
  const escalera = ley.escalera.length > 0 ? ley.escalera : [0];
  const visitas: Visita<R, C>[] = [];
  recorre(toma.hijos, toma.id, (v) => visitas.push(v));

  const porNodo = new Map<Nodo<R, C>, number>();
  const finPorNodo = new Map<Nodo<R, C>, number>();
  const porId = new Map<string, number>();
  const entradoPorId = new Map<string, number>();
  const avisos: string[] = [];

  const resuelve = (m: Momento, base: number): number | null => {
    if (typeof m === "number") return base + m;
    const cuando = m.cuando ?? "acaba";
    const ref = cuando === "acaba" ? entradoPorId.get(m.tras) : porId.get(m.tras);
    if (ref === undefined) return null;
    return ref + (m.mas ?? 0);
  };

  const paso = (v: Visita<R, C>): boolean => {
    if (porNodo.has(v.nodo)) return false;
    const base = v.padre ? porNodo.get(v.padre) : 0;
    if (base === undefined) return false;

    const padreRanura = v.padre && esGrupo(v.padre) && v.padre.eje === "ranura" ? v.padre : undefined;
    let en: number;
    if (padreRanura && v.indice > 0) {
      const m = padreRanura.conmutaEn[v.indice - 1];
      if (m === undefined) return false;
      // conmutaEn es LOCAL A LA TOMA (base 0): el giro cae sobre una palabra de
      // la voz, no sobre el arranque del grupo. En el diseño anterior se sumaba
      // al `en` del grupo y el giro del 003 salía 64 frames tarde.
      const r = resuelve(m, 0);
      if (r === null) return false;
      en = r;
    } else if (v.nodo.en !== undefined) {
      const r = resuelve(v.nodo.en, base);
      if (r === null) return false;
      en = r;
    } else if (v.padre && esGrupo(v.padre) && v.padre.eje !== "ranura" && v.padre.eje !== "diagrama" && v.padre.paso !== undefined) {
      en = base + v.indice * v.padre.paso;
    } else {
      en = base + escalera[Math.min(v.indice, escalera.length - 1)];
    }

    porNodo.set(v.nodo, en);
    const dur = duracionEntrada(v.nodo.entra, ley);
    if (v.nodo.id) {
      if (porId.has(v.nodo.id)) avisos.push(`id de nodo repetido: "${v.nodo.id}"`);
      porId.set(v.nodo.id, en);
      entradoPorId.set(v.nodo.id, en + dur);
    }
    return true;
  };

  for (let vuelta = 0; vuelta <= visitas.length; vuelta++) {
    let progreso = false;
    for (const v of visitas) if (paso(v)) progreso = true;
    if (!progreso) break;
  }

  // `porNodo` tiene clave por IDENTIDAD de objeto: un `const sep = pon(...)`
  // reutilizado en dos huecos del árbol resuelve UNA vez y el segundo hereda el
  // frame del primero (con `paso: 30`, el segundo entra 60 f antes de lo escrito
  // y nada lo delata). Se comprueba una sola vez, fuera del punto fijo.
  const rutaPorNodo = new Map<Nodo<R, C>, string>();
  for (const v of visitas) {
    const previa = rutaPorNodo.get(v.nodo);
    if (previa === undefined) rutaPorNodo.set(v.nodo, v.ruta);
    else avisos.push(`${v.ruta} es el MISMO objeto que ${previa}: clónalo o se coreografían como uno solo`);
  }

  for (const v of visitas) {
    const en = porNodo.get(v.nodo);
    if (en === undefined) continue;
    // `muere` es LOCAL A LA TOMA. Sin `muere`, el nodo vive hasta el final.
    const m = v.nodo.muere !== undefined ? resuelve(v.nodo.muere, 0) : null;
    // La MISMA errata en `en` grita ("tras no resuelve") y aquí callaba: un
    // `muere: tras("titutlo")` degradaba a `len` y el elemento se quedaba en
    // pantalla hasta el final de la toma con el validador diciendo LIMPIO.
    if (v.nodo.muere !== undefined && m === null)
      avisos.push(`el "muere" de ${v.ruta} no resuelve: id inexistente o ciclo`);
    finPorNodo.set(v.nodo, m === null ? len : m);
  }

  const sinResolver = visitas.filter((v) => !porNodo.has(v.nodo)).map((v) => v.ruta);
  return { porNodo, finPorNodo, porId, entradoPorId, sinResolver, avisos };
}

/* ══════════════════════ 11 · ALTURA (R08) ════════════════════════════════ */

/**
 * Alto que IMPONE una piel, pase lo que pase con su contenido. Son los mismos
 * números que dibuja `cajaPiel` en el intérprete, y por eso están anotados: si
 * allí cambian, aquí también.
 *
 * Sin esto, un grupo con `piel: {caja:"campo"}` medía lo que midiera su interior
 * —una etiqueta, 53 px— cuando la caja que se dibuja son 108 px fijos. R08 daba
 * un número tranquilizador para un bloque que no cabía, que es peor que no
 * medirlo: el CTA con campo (lo que cierra el 002 y el 003) se salía del cuadro
 * con el plan LIMPIO.
 */
const altoDePiel = <C extends string>(p: Piel<C>, interior: number, hijos: number): number => {
  // `piel.gap` es aire EXTRA sobre la separación que ya monta el grupo, y es lo
  // ÚNICO que la piel añade entre hermanos: `cajaPiel` no emite el `gap` del
  // token (ver su comentario — sumarlo al margen de cada hijo separaba de más).
  // Como es un `gap` CSS de un flex en columna, ocupa (hijos − 1) veces.
  const aire = p.gap ? p.gap * Math.max(0, hijos - 1) : 0;
  if (p.caja === "campo") return Math.max(interior + aire, p.alto ?? 108); // height fija
  if (p.caja === "panel") return Math.max(interior + aire, p.alto ?? 460) + 80; // minHeight + padding 40×2
  return interior + aire + 48; // sello: padding "24px 40px"
};

/** Caja FIJA de <Tarjeta3D>, que es lo que monta el intérprete para una ranura
 *  con `conmuta:"volteo"`. La ranura se estimaba como `max(hijos)` —una línea de
 *  texto, 58 px— y el bloque real son 460. */
const ALTO_VOLTEO = 460;

/**
 * Alto aproximado en px base 1080. Es DELIBERADAMENTE tosco: no mide texto
 * renderizado (eso solo se sabe con DOM). Sirve para una cosa: avisar de que un
 * bloque no cabe en su molde ANTES de invadir la cara, no después de exportar.
 *
 * Tosco no es lo mismo que ciego: lo que el INTÉRPRETE impone (la caja de una
 * piel, la tarjeta de un volteo) no es "texto renderizado" y sí se sabe aquí.
 */
export function alturaEstimada<R extends RegistroPiezas, C extends string>(
  n: Nodo<R, C>,
  piezas: R,
  gapPorDefecto: number,
  /** Las tablas del DIALECTO. Sin ellas la ficha no puede medir con la letra
   *  que se va a pintar, que es justo lo que este parámetro viene a impedir. */
  letra: LetraDialecto
): number {
  if (esGrupo(n)) {
    if (n.eje === "diagrama") return n.alto;
    const conPiel = (x: number): number =>
      "piel" in n && n.piel ? altoDePiel(n.piel, x, n.hijos.length) : x;
    if (n.eje === "ranura" || n.eje === "pila" || n.eje === "capas" || n.eje === "fila") {
      const mayor = n.hijos.reduce((m, h) => Math.max(m, alturaEstimada(h, piezas, gapPorDefecto, letra)), 0);
      return conPiel(n.eje === "ranura" && n.conmuta === "volteo" ? Math.max(mayor, ALTO_VOLTEO) : mayor);
    }
    let total = 0;
    n.hijos.forEach((h, i) => {
      total += alturaEstimada(h, piezas, gapPorDefecto, letra) + (h.sep ?? 0);
      if (i < n.hijos.length - 1) total += gapEntre(n.gap, i, gapPorDefecto);
    });
    return conPiel(total);
  }
  const ficha = piezas[n.pieza] as Ficha<never> | undefined;
  if (!ficha || ficha.capa) return 0;
  const propio = ficha.alto ? ficha.alto(n.props as never, { rol: n.rol ?? "apoyo", tabla: (w) => letra.tablas[w] }) : 0;
  // Una HOJA con `dentro` es un contenedor (el campo del CTA, las caras 3D) y
  // antes medía solo su propia ficha: envolver siete chips en un `campo` sin
  // `alto` los hacía medir 0 px y apagaba R08 en silencio — justo la alarma que
  // protege la cara del avatar. Los grupos no sufrían esto; el agujero era de
  // `Hoja.dentro`.
  const dentro = n.dentro;
  if (!dentro || dentro.length === 0) return propio;
  let interior = 0;
  dentro.forEach((h, i) => {
    interior += alturaEstimada(h, piezas, gapPorDefecto, letra) + (h.sep ?? 0);
    if (i < dentro.length - 1) interior += gapPorDefecto;
  });
  return Math.max(propio, interior);
}

/* ══════════════════════ 11b · ANCHURA (R09) ══════════════════════════════ */

/**
 * ANCHO DE UN TEXTO, SUMANDO AVANCES MEDIDOS. La pieza que le faltaba al
 * validador: sin esto no había forma de saber que un titular se sale del cuadro.
 *
 * SIGUE SIN MEDIR NADA EN CALIENTE, y ése es el punto. Medir texto renderizado
 * exige DOM (`getBoundingClientRect`), y el validador corre también con `node`
 * pelado, dentro de un `useMemo` en cada re-render y sobre un plan que tiene que
 * dar el MISMO resultado en cualquier máquina. Lo que cambió no es eso: es de
 * dónde salen los anchos. Antes eran CINCO CUBOS a ojo («las finas 0,32 em, las
 * anchas 0,9»); ahora son los avances REALES de cada carácter, medidos una vez
 * en el Chrome que renderiza y versionados en `avances.ts` (que tampoco tiene
 * imports en tiempo de ejecución). La tabla se regenera con
 * `manuales/motion-graphics/scripts/generar-avances.mjs` el día que cambie la
 * tipografía del formato.
 *
 * POR QUÉ SE CAMBIÓ, con el número delante. Los cubos redondeaban hacia arriba
 * dentro de cada clase y, contra las 170 líneas reales del corpus, sesgaban un
 * +8,4 % de media (p50 +8,5 %, máx +37,6 % en «iiii…»). Eso son CINCO FALSOS
 * POSITIVOS vivos —cuatro de ellos en piezas PUBLICADAS: 004·n07, 004·n08,
 * 005·n16 y el 006·n11 del que salió esta regla—, y un validador que grita
 * cuando no debe se acaba apagando, que es justo lo que R09 vino a impedir. Y el
 * sesgo tampoco protegía: los cubos se quedaban CORTOS en 8 líneas (hasta
 * −7,3 % en «WWWW…», y en Inter en texto corriente), o sea que la promesa de
 * «nunca por debajo» ya estaba rota antes de tocar nada.
 *
 * CON LA TABLA, las 174 líneas del corpus del arnés: media +1,6 %, p50 +1,5 %,
 * mínimo +1,02 % y NINGUNA por debajo del ancho real. Cero falsos positivos y
 * cero falsos negativos sobre los casos que R09 llega a juzgar (métrica `linea` o
 * `entero`). El máximo, +8,9 %, es la única línea del corpus escrita a propósito
 * solo con pares que kernean HACIA DENTRO («Ta Vo Wa Ya»); el siguiente es
 * +3,8 %. Comprobado además sobre las 715 cadenas que las fichas miden de verdad
 * al recorrer los seis planes (instrumentando esta función y midiendo cada
 * llamada): ni una por debajo del real.
 *
 * QUIÉN ELIGE LA TIPOGRAFÍA. El DIALECTO, no el núcleo: `letra` es la tabla de
 * su familia y su peso (`AVANCES.sf700` para un titular editorial,
 * `AVANCES.inter800` para uno de gráficos), y llega desde la ficha de la pieza
 * porque es la ficha la única que sabe con qué `T`/`TXT` se monta. Por eso aquí
 * se recibe la tabla ya elegida y no una clave: sin lookup no hay combinación
 * que pueda faltar, y el núcleo se queda sin ni un import en tiempo de ejecución.
 *
 * EL CUERPO NO LO ELIGE LA FICHA A OJO: sale de `ESCALA[rol]` en cada dialecto,
 * que es EL MISMO objeto del que el intérprete saca `ctx.escalaRol`. Mientras
 * cada ficha escribía su propio `p.px ?? 28`, la copia divergía sin que nada
 * avisara: los once kickers del 006 se estimaban a 28 px y se dibujan a 44, y un
 * titular `hero` de gráficos sin `px` se estimaba a 92 y se dibuja a 104 —un
 * 11,5 % por debajo, que se come veinte veces este margen y publica un titular
 * cortado con el plan diciendo LIMPIO—. Ver `CtxFicha`.
 *
 * LO QUE SE CONSERVA DEL MODELO ANTERIOR, porque estaba bien:
 *   · el TRACKING se suma por carácter y no se multiplica por el cuerpo: en CSS
 *     `letterSpacing` es px ABSOLUTOS y el montador solo pisa `fontSize`, así que
 *     un titular a 70 px conserva el −2,6 de los 96. Chrome lo suma también
 *     DESPUÉS del último carácter: por longitud, no por longitud − 1.
 *   · las VERSALITAS se miden en mayúscula (el kicker monta `uppercase`).
 *   · y la regla de QUÉ se mide, que vive en las fichas: la línea entera donde el
 *     intérprete pone `nowrap`, la palabra más larga donde el texto puede
 *     maquetarse libre (`anchoPalabraMasLarga`).
 *
 * EL KERNING VA EN LOS DOS SENTIDOS, y esto costó un error de bulto: durante una
 * versión aquí ponía que no hacía falta modelarlo «porque aprieta, y eso va del
 * lado seguro». La mitad es verdad. Medido sobre el alfabeto entero, SF 700 tiene
 * 523 pares que ENSANCHAN —«rt» (cuarto, puerta, artículo, importa) vale +1,95 %
 * del cuerpo cada vez que aparece, «íT» un 5,6 %—, y con ellos una línea se
 * estimaba por DEBAJO de lo que se dibuja: −1,9 % en «rtrtrt…», −3,5 % en
 * «íTíT…». Eso ya no se arregla con margen (al 2 % aparece el primer falso
 * positivo, y haría falta un 4,7 %), así que los pares positivos están MEDIDOS y
 * viven en `avances.ts`. Se suman dentro de cada tramo — ver `sumaTramos`.
 *
 * LO QUE SIGUE SIN MODELAR: el kerning que APRIETA, las ligaduras y el punch-in
 * del molde. Los dos primeros juegan A FAVOR —el texto real sale más estrecho que
 * la suma—; el tercero R09 no lo descuenta a propósito (ver la regla).
 */

/**
 * MARGEN DE SEGURIDAD sobre el ancho estimado de un TEXTO. Va aquí dentro y no
 * en la comparación de R09 a propósito: el ancho de un bloque también lleva
 * anchos DECLARADOS (los 840 px fijos de `RecortePrensa`, el `ancho` de un
 * diagrama) y padding de piel, y esos no tienen error de medida — inflarlos
 * resucitaría justo el falso positivo que la regla ya documenta haber probado y
 * descartado. El margen cubre el residuo de la tabla, nada más.
 *
 * EL NÚMERO, ELEGIDO CON EL BARRIDO DELANTE (174 líneas medidas, útiles 844):
 *   margen   error mín   líneas por DEBAJO del real   falsos +   holgura del
 *                                                                caso más justo
 *    0,00 %   +0,06 %             0 / 174                 0          16 px
 *    0,50 %   +0,56 %             0 / 174                 0          12 px
 *    1,00 %   +1,02 %             0 / 174                 0           8 px   ←
 *    1,50 %   +1,56 %             0 / 174                 0           3 px
 *    2,00 %   +2,04 %             0 / 174                 1          — px
 * (Falsos negativos: 0 en toda la columna. La calibración no acerca ninguna
 * línea que se sale al umbral. El primer falso positivo es 004·n07 —«No se frenó
 * el deseo», 826 px reales— que a partir del 2 % cruza los 844.)
 *
 * POR QUÉ 1 %, Y QUÉ ES LO QUE CUBRE. Ojo con el razonamiento que había aquí
 * antes, porque era falso: decía que el margen tapaba «un residuo de subpíxel,
 * no un error proporcional, porque lo único que la tabla no modela va en la otra
 * dirección (el kerning aprieta)». El kerning va en LOS DOS sentidos, y los pares
 * que ensanchan producían un error PROPORCIONAL de hasta −3,5 %. Ese agujero se
 * cerró donde tenía que cerrarse —midiendo los pares, `avances.ts`—, no aquí: un
 * margen que lo cubriera necesitaría un 4,7 % y a partir del 2 % ya inventa
 * avisos.
 *
 * Con el kerning dentro, el modelo NO se queda corto ni sin margen: sobre las 174
 * líneas del corpus y sobre las 715 cadenas que las fichas miden de verdad, el
 * error mínimo a margen 0 es +0,06 % y no hay ninguna por debajo del real. O sea
 * que este 1 % ya no corrige nada: es HOLGURA, y cubre lo que queda fuera del
 * modelo por construcción —el kerning por debajo del umbral de `avances.ts`
 * (acotado en ~0,4 % de una línea), la rejilla de 1/64 px de Chrome y lo que
 * cambie una versión del navegador—. Por arriba deja un punto entero antes del
 * primer falso positivo. Subirlo a 2-3 % no compra nada y se paga en la única
 * moneda que R09 no puede gastar: credibilidad.
 */
export const MARGEN_ANCHO = 1.01;

/**
 * Avance de un carácter, en em, al cuerpo pedido.
 *
 * INTERPOLA entre anclas porque San Francisco tiene EJE ÓPTICO: el mismo glifo
 * ocupa un +5,0 % a 20 px y un +0,8 % a 64 respecto del cuerpo grande, así que
 * un solo em se quedaría corto justo en chip, kicker y etiqueta. La curva real
 * es convexa y la recta cae por ENCIMA: el error de interpolar (+0,2 % a +1,0 %)
 * va del lado seguro. Inter no tiene eje óptico y su tabla trae un solo valor.
 *
 * Un carácter que no está en la tabla vale `respaldo` —el glifo más ancho que se
 * ha medido en esa combinación— y NUNCA 0: un carácter que no suma deja pasar
 * una línea que se sale, y ése es el único error que R09 no puede cometer.
 */
const avanceEm = (letra: TablaAvances, c: string, px: number, tabulares: boolean): number => {
  const propio = tabulares && letra.tabulares[c] !== undefined ? letra.tabulares[c] : letra.glifos[c];
  if (propio === undefined) return letra.respaldo;
  if (typeof propio === "number") return propio;
  const anclas = letra.anclas;
  const n = Math.min(propio.length, anclas.length);
  if (n === 0) return letra.respaldo;
  if (n === 1 || px <= anclas[0]) return propio[0];
  if (px >= anclas[n - 1]) return propio[n - 1];
  for (let i = 1; i < n; i++)
    if (px <= anclas[i]) {
      const t = (px - anclas[i - 1]) / (anclas[i] - anclas[i - 1]);
      return propio[i - 1] + t * (propio[i] - propio[i - 1]);
    }
  return propio[n - 1];
};

/**
 * Lo que el MONTADOR le hace al texto y cambia los glifos que se dibujan. No son
 * opciones de estilo: son las dos propiedades CSS que hacen que el ancho de un
 * mismo string sea otro, y por eso viajan hasta aquí.
 */
export interface MontaTexto {
  /** `text-transform: uppercase` (el kicker): se mide la MAYÚSCULA. */
  readonly versalitas?: boolean;
  /** `font-variant-numeric: tabular-nums` (T.cifra y TXT.cifra): dígitos de ancho fijo. */
  readonly tabulares?: boolean;
}

/**
 * UN TROZO DE LÍNEA CON SU PROPIA TIPOGRAFÍA. Existe porque una línea NO se
 * dibuja siempre con una sola tabla: un `Trozo` con `enfasis` se monta a
 * `fontWeight: 800` (montadores.tsx y PistaGraficos.tsx, las dos capas), y
 * medirla entera con el peso base la deja por DEBAJO de lo que se pinta — el
 * error prohibido. SF 700→800 son ~+3,2 %, o sea el triple del margen.
 *
 * Se suma tramo a tramo y se redondea UNA VEZ al final, que es lo que hace
 * Chrome: redondear por tramo acumularía el error de cada uno.
 */
export interface TramoTexto {
  readonly texto: string;
  readonly letra: TablaAvances;
}

/**
 * El ancho crudo en px, sin margen ni redondeo: el que se compone.
 *
 * EL KERNING SE SUMA DENTRO DEL TRAMO Y NO ENTRE TRAMOS, y eso no es una
 * simplificación: es lo que hace Chrome. Cada tramo se dibuja en su propio
 * `<span>` (`Rico`/`Trocito` montan uno por trozo, incluidos los trozos de texto
 * llano de un array), y el moldeado no cruza la frontera de un elemento inline,
 * así que entre el último carácter de un tramo y el primero del siguiente no hay
 * par que corregir.
 */
const sumaTramos = (tramos: readonly TramoTexto[], px: number, tracking: number, monta: MontaTexto): number => {
  const tabulares = monta.tabulares === true;
  let w = 0;
  for (const tr of tramos) {
    const t = monta.versalitas ? tr.texto.toUpperCase() : tr.texto;
    for (let i = 0; i < t.length; i++) {
      w += avanceEm(tr.letra, t.charAt(i), px, tabulares) * px + tracking;
      if (i > 0) {
        const k = tr.letra.kerning[t.charAt(i - 1) + t.charAt(i)];
        if (k !== undefined) w += k * px;
      }
    }
  }
  return w;
};

/**
 * El REMATE de toda estimación de ancho: margen y redondeo, en ese orden.
 *
 * `ceil` y no `round` a propósito. El contrato de R09 es «la estimación puede
 * sobrar, nunca faltar», y `round` lo rompía en las cadenas cortas: «art.» a
 * 44 px compone 62,7 px reales y devolvía 62. No causaba ningún falso negativo
 * —son palabras de tres letras que nunca deciden el máximo—, pero dejaba el
 * invariante escrito en presente y siendo falso, y medio píxel es gratis.
 */
const remata = (crudo: number): number => Math.max(0, Math.ceil(crudo * MARGEN_ANCHO));

/** Ancho de una línea COMPUESTA de tramos con tipografías distintas. */
export const anchoTramos = (
  tramos: readonly TramoTexto[],
  px: number,
  /** `letterSpacing` en px ABSOLUTOS, tal cual lo declara el theme. */
  tracking = 0,
  monta: MontaTexto = {}
): number => remata(sumaTramos(tramos, px, tracking, monta));

export const anchoTexto = (
  texto: string,
  px: number,
  /** La combinación de familia y peso con la que el dialecto monta esta pieza. */
  letra: TablaAvances,
  /** `letterSpacing` en px ABSOLUTOS, tal cual lo declara el theme. */
  tracking = 0,
  monta: MontaTexto = {}
): number => anchoTramos([{ texto, letra }], px, tracking, monta);

/**
 * La PALABRA más ancha de una línea de tramos que sí puede partirse por sus
 * espacios. Es lo que de verdad no cabe cuando el navegador puede maquetar
 * libre: una frase larga baja de línea (problema de ALTO, R08), pero una palabra
 * más ancha que la caja se sale sí o sí, porque `overflow-wrap` por defecto no
 * la rompe.
 *
 * Una palabra puede ATRAVESAR tramos —`["súbita", {t:"mente", enfasis:true}]` es
 * una sola palabra a dos pesos—, así que el corte va por espacios DENTRO de cada
 * tramo y dos tramos contiguos sin espacio entre ellos siguen la misma palabra.
 * Medir cada tramo por separado partiría la palabra y devolvería menos.
 */
export const anchoPalabraMasLargaTramos = (
  tramos: readonly TramoTexto[],
  px: number,
  tracking = 0,
  monta: MontaTexto = {}
): number => {
  let max = 0;
  let actual: TramoTexto[] = [];
  const cierra = (): void => {
    if (actual.length > 0) max = Math.max(max, anchoTramos(actual, px, tracking, monta));
    actual = [];
  };
  for (const tr of tramos) {
    const partes = tr.texto.split(/\s+/);
    for (let i = 0; i < partes.length; i++) {
      if (i > 0) cierra();
      if (partes[i].length > 0) actual.push({ texto: partes[i], letra: tr.letra });
    }
  }
  cierra();
  return max;
};

export const anchoPalabraMasLarga = (
  texto: string,
  px: number,
  letra: TablaAvances,
  tracking = 0,
  monta: MontaTexto = {}
): number => anchoPalabraMasLargaTramos([{ texto, letra }], px, tracking, monta);

/**
 * Ancho que IMPONE una piel. Mismos números que `cajaPiel` en el intérprete que
 * `altoDePiel`, y por el mismo motivo anotados: si allí cambian, aquí también.
 * `campo` y `sello` son cajas que se ajustan al contenido más su padding
 * horizontal (28×2 y 40×2); `panel` tiene ancho FIJO de 820 si no se declara.
 *
 * `huecos` es (hijos − 1) SOLO cuando la piel viste una fila —en una columna el
 * `gap` no ocupa ancho—, y multiplica al `piel.gap` por lo mismo que en
 * `altoDePiel`: es el único aire que la piel añade entre hermanos.
 */
const anchoDePiel = <C extends string>(p: Piel<C>, interior: number, huecos: number): number => {
  // `"seguro"` es `width: 100%`: se estira al bloque y por definición cabe.
  const pedido = typeof p.ancho === "number" ? p.ancho : 0;
  const aire = p.gap ? p.gap * huecos : 0;
  if (p.caja === "campo") return Math.max(pedido, interior + aire + 56);
  if (p.caja === "panel") return Math.max(pedido || 820, interior + aire + 80);
  return Math.max(pedido, interior + aire + 80); // sello: padding "24px 40px"
};

/**
 * Ancho aproximado en px base 1080 de lo que NO PUEDE PARTIRSE dentro del nodo.
 * Hermana de `alturaEstimada` y con su misma naturaleza: tosca a propósito, y no
 * ciega — lo que impone el INTÉRPRETE (una fila y sus gaps, la caja de una piel,
 * un diagrama) se sabe exactamente aquí.
 *
 * La diferencia con el alto está en cómo se combinan los hijos, y es al revés:
 *   · una FILA suma (sus hijos van uno al lado del otro, con sus gaps y `sep`)
 *   · todo lo demás toma el MÁXIMO (columnas, pilas, capas, ranuras)
 * En un `alto` la fila toma el máximo y la columna suma; por eso no se puede
 * reutilizar la misma función con un parámetro y son dos.
 *
 * Lo que mide cada hoja lo decide su ficha (`Ficha.ancho`), porque el ancho de un
 * texto depende de la tipografía que monta el DIALECTO. Sin `ancho`, mide 0:
 * misma convención que `alto`, para que una pieza nueva no rompa nada mientras
 * no se le calcule.
 */
export function anchuraEstimada<R extends RegistroPiezas, C extends string>(
  n: Nodo<R, C>,
  piezas: R,
  gapPorDefecto: number,
  /** Las tablas del DIALECTO. Sin ellas la ficha no puede medir con la letra
   *  que se va a pintar, que es justo lo que este parámetro viene a impedir. */
  letra: LetraDialecto
): number {
  if (esGrupo(n)) {
    if (n.eje === "diagrama") return n.ancho;
    // En una FILA el `gap` de la piel abre (hijos − 1) huecos horizontales; en
    // cualquier otro eje los hijos se superponen o se apilan y no ocupa ancho.
    const conPiel = (x: number): number =>
      "piel" in n && n.piel
        ? anchoDePiel(n.piel, x, n.eje === "fila" ? Math.max(0, n.hijos.length - 1) : 0)
        : x;
    if (n.eje === "fila") {
      let total = 0;
      n.hijos.forEach((h, i) => {
        // En una fila el `sep` del plan se monta como `marginLeft`, así que
        // ocupa ancho. En una columna es `marginTop` y no ocupa nada.
        total += anchuraEstimada(h, piezas, gapPorDefecto, letra) + (i === 0 ? 0 : h.sep ?? 0);
        if (i < n.hijos.length - 1) total += gapEntre(n.gap, i, gapPorDefecto);
      });
      return conPiel(total);
    }
    return conPiel(n.hijos.reduce((m, h) => Math.max(m, anchuraEstimada(h, piezas, gapPorDefecto, letra)), 0));
  }
  const ficha = piezas[n.pieza] as Ficha<never> | undefined;
  if (!ficha || ficha.capa) return 0;
  // `n.rol ?? "apoyo"` es LITERALMENTE lo que hace `RenderNodo` antes de montar
  // (`const rol: Rol = nodo.rol ?? "apoyo"`): de ahí sale el cuerpo por defecto
  // de todo texto, así que la ficha tiene que resolverlo igual o estima otra
  // pieza. Es el mismo defecto en los dos sitios a propósito.
  const propio = ficha.ancho ? ficha.ancho(n.props as never, { rol: n.rol ?? "apoyo", tabla: (w) => letra.tablas[w] }) : 0;
  const dentro = n.dentro;
  if (!dentro || dentro.length === 0) return propio;
  // `RenderHoja` monta la pieza y su `dentro` en una FILA con gap 18: el
  // contenedor mide la suma, no el máximo (que es lo que sí hace el alto).
  let total = propio;
  for (const h of dentro) total += anchuraEstimada(h, piezas, gapPorDefecto, letra) + 18;
  return total;
}

/* ══════════════════════ 12 · VALIDADOR ═══════════════════════════════════ */

export const solapan = (a1: number, a2: number, b1: number, b2: number): boolean => a1 < b2 && b1 < a2;

/**
 * Revisa un plan. Todo son AVISOS, nunca errores: un plan a medias tiene que
 * poder verse mientras se trabaja en él.
 *
 * Cada regla de aquí es un fallo que YA pasó en una pieza real. Si añades una,
 * escribe cuál en el comentario.
 */
export function revisaPlan<R extends RegistroPiezas, B extends string, M extends string, C extends string>(
  plan: Plan<R, B, M, C>
): string[] {
  const avisos: string[] = [];
  const { dialecto, formato, tomas } = plan;
  const fps = formato.fps;
  const vistos: Record<string, boolean> = {};
  let conPropia = 0;

  // Tintas que marcan y no colorean (`Dialecto.tintasDeMarca`), en forma de
  // consulta. `indexOf` sobre un array de seis daría igual; el mapa es para que
  // la regla no se note en un plan de 40 tomas × 200 nodos.
  const soloMarca: Record<string, true> = {};
  for (const c of dialecto.tintasDeMarca ?? []) soloMarca[c] = true;
  // Un molde no puede DECLARAR como tinta por defecto la que no colorea texto:
  // sería pintar la toma entera con el peor contraste de la paleta.
  for (const k of Object.keys(dialecto.moldes))
    if (soloMarca[(dialecto.moldes as Record<string, Molde<C>>)[k].tinta])
      avisos.push(`[molde ${k}] su tinta por defecto es una tinta de marca: marca sobre el texto, no lo colorea`);

  for (const t of tomas) {
    const [ini, fin] = ventanaAbs(t.ventana, formato.duracion);
    const len = fin - ini;
    const ley: Ley = { ...dialecto.ley, ...t.ley };
    const molde = dialecto.moldes[t.molde];

    if (vistos[t.id]) avisos.push(`[${t.id}] id de toma repetido`);
    vistos[t.id] = true;
    if (!t.reason || t.reason.trim().length < 8)
      avisos.push(`[${t.id}] sin reason: si no puedes justificar la toma, no la pongas`);
    if (len <= 0) avisos.push(`[${t.id}] la ventana termina antes de empezar`);
    else if (len < Math.round(fps * 0.5)) avisos.push(`[${t.id}] dura ${len} f (< 0.5 s): no da tiempo a leerlo`);
    if (fin > formato.duracion)
      avisos.push(`[${t.id}] termina en ${fin} y la comp dura ${formato.duracion}: la toma se corta`);
    if (dialecto.beats.indexOf(t.beat) < 0)
      avisos.push(`[${t.id}] beat "${t.beat}" no existe en el dialecto ${dialecto.nombre}`);
    if (!molde) {
      avisos.push(`[${t.id}] molde "${t.molde}" no existe en el dialecto ${dialecto.nombre}`);
      continue;
    }
    // Sin hijos Y sin ambiente. Una toma de atmósfera (molde "capa": partículas,
    // resplandor, viñeta) no lleva maqueta a propósito y sí dibuja: avisarla
    // obligaba a elegir entre un falso positivo aquí o meterle un hijo que no
    // necesita, que es peor.
    if (t.hijos.length === 0 && !t.ambiente)
      avisos.push(`[${t.id}] toma sin hijos ni ambiente: ocupa tiempo y no dibuja nada`);

    const m = resuelveMomentos(t, ley, len);
    for (const a of m.avisos) avisos.push(`[${t.id}] ${a}`);
    for (const ruta of m.sinResolver)
      avisos.push(`[${ruta}] "tras" no resuelve: id inexistente, referencia adelantada o ciclo`);

    let usaPropia = false;
    recorre(t.hijos, t.id, (v) => {
      const n = v.nodo;
      const en = m.porNodo.get(n);
      const muere = m.finPorNodo.get(n);

      // El validador comprueba lo RESUELTO, no lo declarado. El fallo concreto:
      // una ranura con `conmutaEn: [150]` dentro de un grupo en `en: 64` daba un
      // estado B en el frame local 214 de una toma de 176 y pasaba como limpio.
      if (en !== undefined && en >= len)
        avisos.push(`[${v.ruta}] entra en el frame local ${Math.round(en)} y la toma dura ${len}: no se ve nunca`);
      // `mas` negativo es idiomático ("dos frames antes de que aterrice el
      // titular") y pasarse es fácil: un `from` negativo lo recorta Remotion
      // contra el padre, así que la entrada ya ha terminado cuando la toma se ve
      // y el nodo aparece de golpe, sin animación.
      if (en !== undefined && en < 0)
        avisos.push(`[${v.ruta}] entra en el frame local ${Math.round(en)}: antes del arranque de su toma`);
      if (en !== undefined && muere !== undefined && muere <= en)
        avisos.push(`[${v.ruta}] muere (${muere}) antes de entrar (${Math.round(en)})`);
      // UN FUNDIDO DE SALIDA QUE NO CABE SE RECORTA EN SILENCIO.
      //
      // `opacidadVentana` acota la rampa a la ventana del nodo para no reventar
      // con un `inputRange` no creciente — bien— pero eso significa que un
      // `sale: {dur: 20}` sobre un nodo que vive 10 frames se dibuja como un
      // fundido de 8, y el plan dice una cosa y el render hace otra. Es el mismo
      // patrón que este archivo persigue en todas partes; ahora que `sale` tiene
      // lector de verdad, también hay que vigilarlo.
      if (n.sale && n.sale.como === "fundido" && en !== undefined && muere !== undefined) {
        const vive = Math.max(1, Math.round(muere) - Math.max(0, Math.round(en)));
        const pedido = n.sale.dur ?? 8;
        // `−2`: `opacidadVentana` reserva 1 frame de entrada y 1 de margen.
        if (pedido > vive - 2)
          avisos.push(
            `[${v.ruta}] sale con un fundido de ${pedido} f y el nodo solo vive ${vive}: se recortará a ${Math.max(1, vive - 2)} f`
          );
      }
      // `ventana` va en ABSOLUTOS y `muere` en LOCALES: pegar aquí el frame del
      // guion es el error más previsible del sistema. `en` tiene `abs` como red
      // y `muere` no tenía ninguna. `muere === len` no dispara: es la forma
      // legítima de decir «vive hasta el final».
      if (n.muere !== undefined && muere !== undefined && muere > len)
        avisos.push(
          `[${v.ruta}] muere en el frame local ${Math.round(muere)} y la toma dura ${len}: ¿has pegado un frame absoluto?`
        );
      if (en !== undefined && n.abs !== undefined && Math.abs(ini + en - n.abs) > 0.5)
        avisos.push(
          `[${v.ruta}] declara abs:${n.abs} y el plan lo resuelve en ${Math.round(ini + en)}: revisa el \`en\` de su padre`
        );
      if (n.entra && ley.prohibe && ley.prohibe.indexOf(n.entra.como) >= 0)
        avisos.push(`[${v.ruta}] entrada "${n.entra.como}" prohibida por la ley de la pieza: rompe la firma de movimiento`);
      if (n.estira && v.hondura === 0)
        avisos.push(`[${v.ruta}] estira:true en la raíz de la toma: no hay bloque del que colgar`);
      // El amarillo de rotulador como color de letra. Ver `tintasDeMarca`.
      if (n.color !== undefined && soloMarca[n.color])
        avisos.push(
          `[${v.ruta}] color "${n.color}" marca sobre el texto, no lo colorea: usa \`rotulador: true\` en el trozo, o la tinta de máximo contraste`
        );

      // `xy` fuera de un diagrama: el píxel a ojo entrando por la puerta grande.
      const conXY = n as { xy?: readonly [number, number] };
      const padreDiagrama = v.padre && esGrupo(v.padre) && v.padre.eje === "diagrama";
      if (conXY.xy !== undefined && !padreDiagrama)
        avisos.push(`[${v.ruta}] lleva xy y su padre no es un "diagrama": aquí no se posiciona en píxeles`);

      if (esGrupo(n)) {
        if (n.hijos.length === 0) avisos.push(`[${v.ruta}] grupo vacío`);
        if (n.eje === "diagrama" && !molde.cubre)
          avisos.push(`[${v.ruta}] un diagrama con coordenadas propias solo cabe en un molde que cubra (aquí: "${t.molde}")`);
        if (n.eje === "ranura") {
          if (n.conmutaEn.length !== n.hijos.length - 1)
            avisos.push(
              `[${v.ruta}] ranura con ${n.hijos.length} estados necesita ${n.hijos.length - 1} conmutaciones (hay ${n.conmutaEn.length})`
            );
          if (n.conmuta === "volteo" && n.hijos.length !== 2)
            avisos.push(`[${v.ruta}] un volteo tiene frente y dorso: con otro número de estados no significa nada`);
          // Se validaba la CANTIDAD de conmutaciones pero no su DIRECCIÓN: un
          // `conmutaEn: [150, 100]` hace que el estado 2 entre 50 f antes que el
          // 1, así que la ranura retrocede y el último estado pisa al anterior
          // toda la toma. Con `Momento` en forma `{tras}` el orden ni se lee a
          // ojo: hay que comprobarlo sobre lo RESUELTO.
          let previo = -1;
          let iEstado = 0;
          for (const h of n.hijos) {
            const e = m.porNodo.get(h);
            if (e !== undefined) {
              if (iEstado > 0 && e < previo)
                avisos.push(`[${v.ruta}] el estado ${iEstado} entra en ${e} y el anterior en ${previo}: la ranura retrocede`);
              previo = e;
            }
            iEstado++;
          }
        }
        return;
      }

      const ficha = dialecto.piezas[n.pieza] as Ficha<never> | undefined;
      if (!ficha) {
        avisos.push(`[${v.ruta}] pieza "${String(n.pieza)}" no está en el registro`);
        return;
      }
      if (ficha.familia === "propia") usaPropia = true;
      if (ficha.revisa) for (const a of ficha.revisa(n.props as never)) avisos.push(`[${v.ruta}] ${a}`);
      // La misma regla de la tinta de marca, un nivel más adentro: el 006 no la
      // puso en `color` del nodo sino en `tinta` de un TROZO, que es donde de
      // verdad se escribe «esta frase en amarillo».
      if (dialecto.tintasDeMarca)
        recorreTrozos(n.props, (x) => {
          if (x.tinta !== undefined && soloMarca[x.tinta])
            avisos.push(
              `[${v.ruta}] el trozo "${x.t}" pide tinta "${x.tinta}", que marca sobre el texto y no lo colorea: usa \`rotulador: true\``
            );
        });
      const nHijos = n.dentro ? n.dentro.length : 0;
      if (ficha.hijos) {
        if (nHijos < (ficha.hijos.min ?? 0))
          avisos.push(`[${v.ruta}] "${String(n.pieza)}" necesita ${ficha.hijos.min} nodo(s) dentro y tiene ${nHijos}: ${ficha.hijos.porque}`);
        if (ficha.hijos.max !== undefined && nHijos > ficha.hijos.max)
          avisos.push(`[${v.ruta}] "${String(n.pieza)}" admite ${ficha.hijos.max} nodo(s) dentro y tiene ${nHijos}`);
      } else if (nHijos > 0) {
        avisos.push(`[${v.ruta}] "${String(n.pieza)}" no es un contenedor: lo de "dentro" no se montará`);
      }
    });
    if (usaPropia) conPropia++;

    // `cuelga` solo empuja en la caja anclada al CENTRO, que es la única que fija
    // `top` y `bottom` y por tanto la única con alto real dentro del cual apoyar
    // el bloque. En una caja de alto AUTO el `paddingBottom` no mueve nada y el
    // campo sería un no-op silencioso — la clase de fallo que este validador
    // existe para no tener.
    const anclaToma = t.ancla ?? molde.ancla;
    if (anclaToma.cuelga !== undefined && anclaToma.desde !== "centro")
      avisos.push(
        `[${t.id}] \`cuelga\` con ancla "${anclaToma.desde}": esa caja es de alto AUTO y \`cuelga\` no hace nada — ancla en "centro" o quita el campo`
      );

    // R08 por BULTO. Todos los moldes llevan `altoMax`: en el diseño anterior
    // solo lo tenía "franja", que no la usa ni una escena del repo, así que la
    // validación insignia era código muerto.
    if (molde.altoMax !== undefined) {
      let bulto = 0;
      t.hijos.forEach((h, i) => {
        bulto += alturaEstimada(h, dialecto.piezas, molde.gap, dialecto.letra) + (h.sep ?? 0);
        if (i < t.hijos.length - 1) bulto += gapEntre(t.gap, i, molde.gap);
      });
      if (bulto > molde.altoMax)
        avisos.push(
          `[${t.id}] el bloque mide ~${Math.round(bulto)} px y el molde "${t.molde}" presupuesta ${molde.altoMax} (${molde.porque})`
        );
    }

    // R09 por ANCHO. La hermana que faltaba: R08 medía el bulto vertical y nada
    // miraba el horizontal, así que un titular a la escala hero se comía el
    // margen de zona segura por los dos lados —y en un 9:16 el recorte de la
    // plataforma es impredecible— mientras el plan salía limpio (006,
    // `n01-sismo`).
    //
    // QUÉ MIDE Y QUÉ NO. `anchuraEstimada` suma AVANCES MEDIDOS (`avances.ts`),
    // con su corrección de kerning y con el cuerpo que DIBUJA el intérprete,
    // más un 1 % de holgura (`MARGEN_ANCHO`), no cubos a ojo: contra las 174
    // líneas del corpus el error queda en +1,5 % de mediana, ninguna por debajo
    // del ancho real, y sin un solo falso positivo ni negativo en los casos que
    // esta regla llega a juzgar. Antes de esto sesgaba +8,4 % de media y
    // avisaba de CINCO líneas que caben —cuatro de ellas ya publicadas—, entre
    // ellas la que originó la regla
    // (006 · `n11-sin-formula`). Aun así el aviso sigue diciendo «estimados» y
    // hablando de MARGEN SEGURO y no de recorte: lo que se compara es el margen
    // de zona segura, no el borde del lienzo, y prometer «texto cortado» para
    // que el autor lo abra en Chrome y vea que no se corta es cómo se aprende a
    // descontar un validador.
    //
    // EL PUNCH DEL MOLDE NO SE DESCUENTA, y se probó al revés primero. El
    // intérprete escala el contenido hasta 1+punch al final de la toma, así que
    // la tentación es medir contra `anchoMax / (1 + punch)`. Con eso, los 840 px
    // de `RecortePrensa` —que caben de sobra en los 844 y están PUBLICADOS en el
    // 005— avisaban por 8 px, y con ellos cuatro tomas más. Un 1,5 % muerde el
    // margen de zona segura, no el cuadro: 852 px siguen a 114 px del borde
    // real. Avisar de eso es avisar del margen, y un validador que avisa de lo
    // que está bien es un validador que se apaga.
    //
    // Lo que eso significa para el contrato, dicho sin adornos: la verdad contra
    // la que se ha calibrado es la caja SIN punch, así que lo que esta regla
    // promete es «no se corta en el lienzo», no «no toca el margen seguro». Una
    // línea puede llegar a dibujarse a 844 × 1,015 ≈ 857 px —trece px fuera del
    // margen, a 111 del borde real— con el plan limpio. Con el modelo de cubos
    // ese 1,5 % lo tapaba por accidente el +8 % de sesgo; ahora no lo tapa nada,
    // y es una decisión, no un descuido. Si algún día se quiere la promesa
    // fuerte, el número que hay que tocar NO es `MARGEN_ANCHO` (al 2 % ya
    // aparece un falso positivo) sino comparar contra `anchoMax / (1 + punch)`
    // SOLO para las hojas de texto, dejando fuera los anchos declarados.
    if (molde.anchoMax !== undefined) {
      const util = molde.anchoMax;
      // Se culpa al nodo MÁS PEQUEÑO que no cabe: si el aviso lo diera cada
      // ancestro, un titular largo sacaría un aviso por su columna, otro por la
      // toma y otro por sí mismo, y tres mensajes del mismo fallo enseñan a
      // ignorar los tres. Se recorre a mano (y no con `recorre`) porque hay que
      // mirar a los hijos ANTES de decidir si el padre habla.
      const culpa = (n: Nodo<R, C>, ruta: string): void => {
        const w = anchuraEstimada(n, dialecto.piezas, molde.gap, dialecto.letra);
        if (w <= util) return;
        // Un `diagrama` declara su propio ancho y coloca a sus hijos por `xy`:
        // el culpable es él, y bajar dentro señalaría a un hijo que está donde
        // el plan quiere. Mismo trato que le da R08, que tampoco lo recorre.
        const esDiagrama = esGrupo(n) && n.eje === "diagrama";
        const hijos: readonly Nodo<R, C>[] = esDiagrama ? [] : esGrupo(n) ? n.hijos : n.dentro ?? [];
        let algunHijoCulpable = false;
        hijos.forEach((h, i) => {
          if (anchuraEstimada(h, dialecto.piezas, molde.gap, dialecto.letra) > util) {
            algunHijoCulpable = true;
            culpa(h, `${ruta}/${i}`);
          }
        });
        if (!algunHijoCulpable)
          avisos.push(
            `[${ruta}] mide ~${Math.round(w)} px ESTIMADOS de ancho (avances medidos + ${Math.round((MARGEN_ANCHO - 1) * 100)} % de margen) y el molde "${t.molde}" da ${util} útiles: se sale del margen seguro por los dos lados (${molde.porque})`
          );
      };
      t.hijos.forEach((h, i) => culpa(h, `${t.id}/${i}`));
    }

    for (const p of t.ambiente && t.ambiente.particulas ? [t.ambiente.particulas] : [])
      if (t.jerarquia !== "ambiente" && (p.dur ?? len) > fps * 3)
        avisos.push(`[${t.id}] partículas más de 3 s en una toma que no es ambiente: continuo cansa, úsalas en ráfaga`);
  }

  // Un solo hero a la vez: la regla maestra del sistema.
  const heroes = tomas.filter((t) => t.jerarquia === "hero");
  for (let i = 0; i < heroes.length; i++)
    for (let j = i + 1; j < heroes.length; j++) {
      const a = ventanaAbs(heroes[i].ventana, formato.duracion);
      const b = ventanaAbs(heroes[j].ventana, formato.duracion);
      if (solapan(a[0], a[1], b[0], b[1]))
        avisos.push(`[${heroes[i].id} × ${heroes[j].id}] dos hero solapados: un solo protagonista a la vez`);
    }

  // Dos tomas que cubren a la vez = dos fondos opacos y el avatar desmontado dos
  // veces. El corte AL FRAME (433/433, 819/819) es legal y no avisa.
  const cubren = tomas.filter((t) => {
    const mo = dialecto.moldes[t.molde];
    return mo ? mo.cubre : false;
  });
  for (let i = 0; i < cubren.length; i++)
    for (let j = i + 1; j < cubren.length; j++) {
      const a = ventanaAbs(cubren[i].ventana, formato.duracion);
      const b = ventanaAbs(cubren[j].ventana, formato.duracion);
      if (solapan(a[0], a[1], b[0], b[1]))
        avisos.push(`[${cubren[i].id} × ${cubren[j].id}] dos tomas a pantalla completa solapadas`);
    }

  // Dos moldes con SCRIM solapados: el degradado se suma y el tercio inferior se
  // va a negro. Solo aparece cuando el scrim deja el plan y pasa al molde.
  const conScrim = tomas.filter((t) => {
    const mo = dialecto.moldes[t.molde];
    return mo ? mo.scrim !== false && t.ambiente?.scrim !== false : false;
  });
  for (let i = 0; i < conScrim.length; i++)
    for (let j = i + 1; j < conScrim.length; j++) {
      const a = ventanaAbs(conScrim[i].ventana, formato.duracion);
      const b = ventanaAbs(conScrim[j].ventana, formato.duracion);
      if (solapan(a[0], a[1], b[0], b[1]))
        avisos.push(`[${conScrim[i].id} × ${conScrim[j].id}] dos moldes con scrim solapados: el tercio inferior se va a negro`);
    }

  if (tomas.length > 0 && conPropia > tomas.length * 0.5)
    avisos.push(
      `${conPropia} de ${tomas.length} tomas usan piezas propias: sube a la biblioteca las que sirvan para más de una pieza`
    );

  for (const regla of dialecto.reglas) for (const a of regla(plan)) avisos.push(a);
  return avisos;
}

/* ══════════════════════ 13 · DERIVADOS Y VALIDADOR CRUZADO ═══════════════ */

/** La proyección mínima en la que las CUATRO capas se pueden comparar. */
export interface CuePlano {
  capa: string;
  id: string;
  ventana: readonly [number, number];
  jerarquia: Jerarquia;
  beat: string;
  molde: string;
  cubre: boolean;
  sonido?: string;
}

export function aplana<R extends RegistroPiezas, B extends string, M extends string, C extends string>(
  plan: Plan<R, B, M, C>
): CuePlano[] {
  return plan.tomas.map((t) => {
    const mo = plan.dialecto.moldes[t.molde];
    return {
      capa: plan.capa,
      id: t.id,
      ventana: ventanaAbs(t.ventana, plan.formato.duracion),
      jerarquia: t.jerarquia,
      beat: t.beat,
      molde: t.molde,
      cubre: mo ? mo.cubre : false,
      sonido: t.sonido,
    };
  });
}

/**
 * Tramos en que la pantalla está cubierta, con los contiguos FUNDIDOS. Lo
 * consume el ensamblaje para desmontar el avatar. En el 002 esta lista estaba
 * escrita a mano APARTE del plan y su propio comentario documenta que la
 * duplicación dejó al avatar bajo un hueco negro.
 */
export function tomasQueCubren(cues: readonly CuePlano[]): [number, number][] {
  const vs = cues
    .filter((c) => c.cubre)
    .map((c) => [c.ventana[0], c.ventana[1]] as [number, number])
    .sort((a, b) => a[0] - b[0]);
  const out: [number, number][] = [];
  for (const v of vs) {
    const u = out[out.length - 1];
    if (u && v[0] <= u[1]) u[1] = Math.max(u[1], v[1]);
    else out.push([v[0], v[1]]);
  }
  return out;
}

export interface AnclaSonora {
  id: string;
  variante: string;
  frame: number;
  reason: string;
}

/**
 * Anclas de sonido EMITIDAS por el plan gráfico, con el frame ABSOLUTO ya
 * resuelto. `soundCueId` era un campo muerto (el 005 lo rellena en 14 de 16
 * tomas y nadie lo leía). Aquí la dirección se invierte: el frame exacto del
 * gesto lo sabe ESTE plan, y `cues-NNN.ts` lo consume con `cue()`.
 */
export function anclasDeSonido<R extends RegistroPiezas, B extends string, M extends string, C extends string>(
  plan: Plan<R, B, M, C>
): AnclaSonora[] {
  const out: AnclaSonora[] = [];
  for (const t of plan.tomas) {
    const [ini, fin] = ventanaAbs(t.ventana, plan.formato.duracion);
    const ley: Ley = { ...plan.dialecto.ley, ...t.ley };
    const m = resuelveMomentos(t, ley, fin - ini);
    recorre(t.hijos, t.id, ({ nodo, ruta }) => {
      if (!nodo.sonido) return;
      const local = m.porNodo.get(nodo);
      if (local === undefined) return;
      out.push({
        id: nodo.id ?? ruta,
        variante: nodo.sonido.variante,
        frame: Math.round(ini + local),
        reason: nodo.sonido.reason,
      });
    });
  }
  return out.sort((a, b) => a.frame - b.frame);
}

/**
 * Espejo de `CameraPurpose` de motor/camara.ts. NO se importa: el núcleo es
 * datos puros. Si allí se añade un propósito, aquí falla la compilación de
 * `COMPATIBLES` (que es un registro TOTAL) y del adaptador, y hay que decidir si
 * compite o no. Antes era `string` y esa decisión se tomaba sola y en silencio:
 * así fue como `explanation` acabó fuera de la lista blanca disparando en falso.
 */
export type Proposito =
  | "hook"
  | "emphasis"
  | "question"
  | "explanation"
  | "make-space"
  | "transition"
  | "reveal"
  | "cta";

export interface MovimientoPlano {
  id: string;
  startFrame: number;
  endFrame: number;
  purpose: Proposito;
  /** El whoosh del empuje. La cámara era la única capa cuyo enlace de sonido
   *  nadie cruzaba, así que renombrar un cue la dejaba muda en silencio. */
  sonido?: string;
  /** `easing: "spring"` (camara.ts §CameraCue): el muelle IGNORA `endFrame`. */
  muelle?: boolean;
}

/**
 * EL VALIDADOR CRUZADO DEL DIRECTOR — lo que no existía y por eso las capas se
 * contradecían en silencio. Funciona sobre `CuePlano`, así que sirve para
 * gráficos, noticia, y para cualquier capa que se proyecte aquí.
 */
export function revisaMontaje(
  capas: readonly (readonly CuePlano[])[],
  sonidos: readonly { id: string; targetFrame: number }[],
  camara: readonly MovimientoPlano[]
): string[] {
  const avisos: string[] = [];
  const todos: CuePlano[] = [];
  for (const c of capas) for (const x of c) todos.push(x);
  const enFrame = new Map<string, number>();
  for (const s of sonidos) enFrame.set(s.id, s.targetFrame);

  for (const c of todos) {
    if (!c.sonido) continue;
    const f = enFrame.get(c.sonido);
    if (f === undefined) {
      avisos.push(`[${c.capa}:${c.id}] sonido "${c.sonido}" no existe en el plan de sonido`);
      continue;
    }
    // El id correcto con el frame FUERA de la toma es el fallo del
    // recronometrado: cues-NNN.ts documenta que sus targetFrame se mueven a mano
    // con la voz. La regla del id inexistente lleva 38 referencias reales sin
    // disparar una vez; ésta es la que sí puede fallar.
    if (f < c.ventana[0] || f >= c.ventana[1])
      avisos.push(`[${c.capa}:${c.id}] "${c.sonido}" dispara en ${f}, fuera de [${c.ventana[0]},${c.ventana[1]})`);
  }

  for (const mv of camara)
    if (mv.sonido && enFrame.get(mv.sonido) === undefined)
      avisos.push(`[cam:${mv.id}] sonido "${mv.sonido}" no existe en el plan de sonido`);

  const heroes = todos.filter((c) => c.jerarquia === "hero");
  for (let i = 0; i < heroes.length; i++)
    for (let j = i + 1; j < heroes.length; j++) {
      const a = heroes[i];
      const b = heroes[j];
      if (a.capa !== b.capa && solapan(a.ventana[0], a.ventana[1], b.ventana[0], b.ventana[1]))
        avisos.push(`[${a.capa}:${a.id} × ${b.capa}:${b.id}] dos hero de capas distintas a la vez`);
    }

  // Propósitos que NO compiten con un gráfico hero: o hacen sitio, o aterrizan
  // SOBRE él a propósito. Registro TOTAL sobre `Proposito` para que añadir un
  // propósito en camara.ts obligue a pronunciarse aquí. `explanation` y `hook`
  // estaban fuera y disparaban 2 de 2 en falso sobre los dos empujes largos del
  // 003, que camara-003.ts documenta como escritos PARA caer con el sello.
  const COMPATIBLES: Record<Proposito, boolean> = {
    "make-space": true,
    cta: true,
    emphasis: true,
    reveal: true,
    explanation: true,
    hook: true,
    question: false,
    // `@remotion/non-pure-animation` lee cualquier clave llamada `transition`
    // como la propiedad CSS y avisa de parpadeo. Aquí es un propósito de cámara
    // dentro de un objeto de datos: no hay estilo ni animación que valga.
    // eslint-disable-next-line @remotion/non-pure-animation
    transition: false,
  };
  for (const mv of camara) {
    // El muelle ignora endFrame (camara.ts §CameraCue): una ventana nominal de
    // 1 f puede renderizarse durante 30. No se adivina, se dice.
    if (mv.muelle)
      avisos.push(`[cam:${mv.id}] easing "spring": endFrame no marca el final real, este cue no se puede cruzar del todo`);
    if (mv.endFrame <= mv.startFrame) continue;
    for (const c of todos) {
      if (!solapan(c.ventana[0], c.ventana[1], mv.startFrame, mv.endFrame)) continue;
      if (c.cubre)
        avisos.push(`[cam:${mv.id} × ${c.capa}:${c.id}] la cámara se mueve bajo una toma que cubre: no se verá`);
      else if (c.jerarquia === "hero" && !COMPATIBLES[mv.purpose])
        avisos.push(`[cam:${mv.id} × ${c.capa}:${c.id}] movimiento "${mv.purpose}" durante un gráfico hero: compite`);
    }
  }
  return avisos;
}

export const duracionPlan = <R extends RegistroPiezas, B extends string, M extends string, C extends string>(
  plan: Plan<R, B, M, C>
): number => plan.formato.duracion;

/** Tomas activas en un frame (para depurar sin abrir el Studio). */
export const tomasEn = <R extends RegistroPiezas, B extends string, M extends string, C extends string>(
  plan: Plan<R, B, M, C>,
  frame: number
): Toma<R, B, M, C>[] =>
  plan.tomas.filter((t) => {
    const [a, b] = ventanaAbs(t.ventana, plan.formato.duracion);
    return frame >= a && frame < b;
  });

/* ══════════════════════ 14 · BUILDER ═════════════════════════════════════ */

/** Sin parámetro `R`: un grupo no lleva `dentro`, así que no hay nada que colgar
 *  del registro. Declararlo por simetría lo dejaba sin usar y `eslint` lo marca
 *  como ERROR (`noUnusedLocals` NO cubre parámetros de tipo, así que `tsc` decía
 *  verde y `npm run lint` —`eslint src && tsc`— abortaba antes de llegar a él). */
export type OpsGrupo<C extends string> = Comun<C> & {
  gap?: number | readonly number[];
  alinea?: Alineacion;
  paso?: number;
  piel?: Piel<C>;
};

/**
 * Abre una capa: devuelve los builders ya atados a un dialecto. Los cuatro
 * genéricos se pagan UNA vez aquí; el archivo de plan no vuelve a ver ninguno.
 *
 *   const { gfx, pon, col, fila, ranura, plan } = capa(DIALECTO_003, "gfx");
 */
export function capa<R extends RegistroPiezas, B extends string, M extends string, C extends string>(
  dialecto: Dialecto<R, B, M, C>,
  nombre = "gfx"
) {
  /**
   * UNA SOLA BOLSA: props de la pieza y campos comunes juntos. `en` es el número
   * que más se toca al afinar una escena y no puede vivir en un segundo
   * argumento. Precio declarado: los nombres de `CLAVES_COMUN` quedan
   * reservados y una pieza no puede llamar `color` a una prop suya.
   */
  const pon = <K extends ClaveDe<R>>(
    pieza: K,
    todo: PropsDe<R, K> & Comun<C> & { dentro?: readonly Nodo<R, C>[] }
  ): Nodo<R, C> => {
    const props: Record<string, unknown> = {};
    const comun: Record<string, unknown> = {};
    const bolsa = todo as unknown as Record<string, unknown>;
    for (const k of Object.keys(bolsa)) {
      if (esClaveComun(k)) comun[k] = bolsa[k];
      else props[k] = bolsa[k];
    }
    // El ÚNICO cast de la biblioteca: la forma es exacta, pero TS no sabe probar
    // la pertenencia de K a la unión mapeada sin resolverla. Nunca en el plan.
    return { ...comun, pieza, props } as unknown as Nodo<R, C>;
  };

  const col = (hijos: readonly Nodo<R, C>[], o: OpsGrupo<C> = {}): Nodo<R, C> => ({ ...o, eje: "columna", hijos });
  const fila = (hijos: readonly Nodo<R, C>[], o: OpsGrupo<C> = {}): Nodo<R, C> => ({ ...o, eje: "fila", hijos });
  const pila = (hijos: readonly Nodo<R, C>[], o: OpsGrupo<C> = {}): Nodo<R, C> => ({ ...o, eje: "pila", hijos });
  const capas = (hijos: readonly Nodo<R, C>[], o: OpsGrupo<C> = {}): Nodo<R, C> => ({ ...o, eje: "capas", hijos });

  const ranura = (
    conmutaEn: readonly Momento[],
    hijos: readonly Nodo<R, C>[],
    o: Comun<C> & { conmuta?: "corte" | "volteo"; piel?: Piel<C> } = {}
  ): Nodo<R, C> => ({ ...o, eje: "ranura", conmutaEn, hijos });

  const diagrama = (
    medidas: { ancho: number; alto: number },
    hijos: readonly NodoUbicado<R, C>[],
    o: Comun<C> = {}
  ): Nodo<R, C> => ({ ...o, eje: "diagrama", ancho: medidas.ancho, alto: medidas.alto, hijos });

  const ubica = (
    nodo: Nodo<R, C>,
    xy: readonly [number, number],
    o: { ancla?: "izq" | "centro" | "der"; anclaY?: "arriba" | "centro" | "abajo"; ancho?: number } = {}
  ): NodoUbicado<R, C> => ({ ...nodo, xy, ...o });

  /**
   * Una toma. `reason` va ANTES que `hijos`: literalmente no se puede escribir
   * el cuerpo de la escena sin haber escrito para qué existe. Era una nota en un
   * comentario y se saltaba sola; ahora lo fuerza el compilador.
   */
  const gfx = (
    id: string,
    molde: M,
    beat: B,
    ventana: Ventana,
    jerarquia: Jerarquia,
    reason: string,
    hijos: readonly Nodo<R, C>[],
    extra: Omit<Toma<R, B, M, C>, "id" | "molde" | "beat" | "ventana" | "jerarquia" | "reason" | "hijos"> = {}
  ): Toma<R, B, M, C> => ({ id, molde, beat, ventana, jerarquia, reason, hijos, ...extra });

  const plan = (
    formato: { ancho: number; alto: number; fps: number; duracion: number },
    tomas: readonly Toma<R, B, M, C>[],
    paleta?: Partial<Record<C, string>>
  ): Plan<R, B, M, C> => ({ capa: nombre, dialecto, formato, tomas, paleta });

  return { pon, col, fila, pila, capas, ranura, diagrama, ubica, gfx, plan, tras };
}
