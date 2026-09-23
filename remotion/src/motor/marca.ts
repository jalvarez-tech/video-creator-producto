/**
 * LA MARCA COMO DATO — la capa que faltaba.
 *
 * El motor tenía dos ejes y solo había generalizado uno:
 *
 *   SUSTRATO   plan/nucleo.ts + PistaGraficos.tsx   ya genérico en <R,B,M,C>
 *   DIALECTO   qué piezas, qué moldes, qué beats    ya es un parámetro
 *   MARCA      qué colores, qué letra, qué sello    ← esto, que no existía
 *
 * La GRAMÁTICA ya se inyecta: `<PistaGraficos>` no tiene un solo `if` por
 * dialecto y `PistaNoticia` son 71 líneas montando una capa con la premisa
 * OPUESTA a la de gráficos. La FORMA, en cambio, estaba escrita como
 * `export const` de módulo que diecinueve archivos importaban —`theme`, `MG`,
 * `G`, `FONT`, `SOMBRA`, `TXT`, `MARCA`, `N`, `T`, `LAYOUT`, `METRAJE`— más 73
 * hex sueltos dentro de los componentes. Consecuencia práctica: DOS MARCAS NO
 * PODÍAN CONVIVIR EN EL REPO. El propio theme-noticias.ts lo tenía anotado:
 * «⚠️ esto cambia también el 004 si se vuelve a renderizar».
 *
 * Este archivo es el TIPO y el SUELO del motor (`MARCA_BASE`). Nada más: los
 * PERFILES de canal viven fuera, en `src/marcas/` (la plantilla es `ejemplo.ts`), y llegan
 * por parámetro. Datos puros, cero imports en tiempo de ejecución (solo
 * `import type`, que desaparece al compilar), misma disciplina que
 * `plan/nucleo.ts` y `plan/avances.ts`: el validador tiene que poder leer una
 * marca con `node` pelado, sin montar React.
 *
 * QUÉ ES MARCA Y QUÉ NO. La regla que evita que esto se convierta en un cajón:
 *   · MARCA   = los VALORES. Colores, tipografía, sello, radio, look del metraje.
 *               Cambian de un canal a otro sin cambiar lo que el plan sabe decir.
 *   · DIALECTO = el VOCABULARIO. Qué piezas existen, qué moldes, qué beats, y la
 *               POLARIDAD (gráficos asume vídeo oscuro y por eso `SOMBRA.texto`
 *               es obligatoria en sus cuatro piezas de texto; editorial asume
 *               papel claro). Eso no se arregla con tokens: es lo que la capa ES.
 *   · FORMATO  = la GEOMETRÍA del lienzo. Margen seguro, carril de subtítulos,
 *               alto del velo. Sale de `presets.ts`, no de aquí.
 *
 * Guía humana: manuales/motion-graphics/cruce-remotion-scenes.md §3.
 */

// `import type` de la tabla de avances: se borra al compilar, así que no entra
// un solo byte de los 1.280 renglones de datos medidos en el bundle de tipos.
import type { AVANCES } from "./plan/avances";

/** Las tablas de anchos medidos que existen. Declarar una fuente sin tabla es
 *  lo que apaga R09 EN SILENCIO, así que la clave va DENTRO del tipo. */
export type ClaveAvances = keyof typeof AVANCES;

/**
 * El watermark persistente. `texto: null` = el canal no lleva sello y la
 * plantilla simplemente no lo monta, sin huecos ni ajustes de layout.
 */
export interface SelloMarca {
  texto: string | null;
}

/**
 * Los colores de la marca, por lo que SIGNIFICAN.
 *
 * No están aquí las tintas SEMÁNTICAS del sistema (dato, pérdida, logro,
 * neutro): esas dicen qué es un número que sube o que baja, y eso no cambia
 * porque cambie el canal. Viven en la paleta del dialecto.
 */
export interface ColorMarca {
  /** El único color vivo de la pieza. Bordes, chips, subrayados, énfasis. */
  acento: string;
  /** Variante con cuerpo del acento (los chips isométricos del editorial). */
  acentoChip: string;
  /** Amarillo de rotulador para marcar sobre un recorte. */
  resalte: string;

  /** Fondo dominante del registro CLARO. */
  papel: string;
  /** Variante clara del papel para tarjetas y recortes. */
  hueso: string;
  /** Fondo del registro de cine. Negro puro, no gris: la low-key vive de eso. */
  negro: string;
  /** Fondo del registro OSCURO de gráficos (sobre el que va texto blanco). */
  fondoOscuro: string;

  /** Texto principal sobre claro. Carbón, nunca #000 (vibra sobre beige). */
  tinta: string;
  /** Texto de apoyo sobre claro. */
  tintaSuave: string;
  /** Texto sobre oscuro. */
  blanco: string;
  /** Líneas y separadores sobre claro. */
  linea: string;

  /**
   * DEUDA DECLARADA, no olvido: el acento del registro OSCURO.
   *
   * Hoy el repo tiene dos acentos —`theme.accent` teal #0F766E en gráficos y
   * `MARCA.acento` naranja #FF5500 en editorial— y son dos marcas conviviendo
   * sin saberlo: el teal es el acento de plantilla que venía de fábrica y el
   * naranja es el del canal. Unificarlos es lo correcto y MUEVE PÍXELES de las
   * piezas de avatar ya publicadas, así que es una decisión de dirección que se
   * toma mirando un render, no un efecto colateral de esta refactorización.
   * Mientras tanto el campo existe para que la duplicación se VEA.
   */
  acentoOscuro: string;
}

/** Los pesos en que este sistema dibuja texto. Cerrado a propósito: cada uno
 *  tiene que tener su tabla MEDIDA, y una fuente sin medir apaga R09. */
export type PesoAvance = 500 | 600 | 700 | 800;

/**
 * La VOZ del canal.
 *
 * `tablas` es POR PESO y no «una para display y otra para texto», que es como
 * estaba escrito en el primer intento de este tipo y era un error con
 * consecuencias: las fichas editoriales estiman con CUATRO pesos (titular y
 * cifra a 700, kicker y pie a 600, etiqueta a 500, énfasis a 800). Mapear el
 * kicker a la tabla de «texto» (500) lo habría estimado con una fuente más
 * ESTRECHA de la que pinta — o sea una estimación POR DEBAJO de lo real, que es
 * el único error que R09 no puede cometer y el único que comete en silencio.
 *
 * La regla, para cuando se dé de alta una marca: si un peso no tiene tabla
 * medida, se apunta a la del peso INMEDIATAMENTE SUPERIOR, nunca al inferior.
 * Sobreestimar produce un aviso de más; subestimar publica un titular cortado.
 */
export interface LetraMarca {
  /** Titulares, cifras, palabra de cierre. Lo que se lee de un vistazo. */
  display: string;
  /** Subtítulos, kickers, labels, chips. Lo que acompaña. */
  texto: string;
  /** Tabla de anchos medidos de cada peso. Total: no se puede olvidar uno. */
  tablas: Record<PesoAvance, ClaveAvances>;
}

/** Radio y grosor: lo que hace que una tarjeta se reconozca del canal. */
export interface FormaMarca {
  radio: number;
  borde: number;
}

/** Sombras. Sobre claro y sobre oscuro no son la misma decisión. */
export interface SombraMarca {
  caja: string;
  corta: string;
  /** Sombra de texto sobre fondo OSCURO. Sin ella el blanco desaparece. */
  texto: string;
  /** Sombra de texto sobre metraje dentro del registro de cine. */
  textoCine: string;
}

/**
 * EL LOOK DEL METRAJE — lo que hace que tres clips de tres autores parezcan una
 * sola pieza. Es de marca y no de plan porque todo el metraje del canal se ve
 * igual, como todo su papel es el mismo beige.
 */
export interface MetrajeMarca {
  saturacion: number;
  contraste: number;
  /** Velo cálido del color del papel: el igualado más barato que existe. */
  calido: number;
  grano: number;
  vineta: number;
}

export interface Marca {
  nombre: string;
  sello: SelloMarca;
  color: ColorMarca;
  /** La voz del canal. La que usa cualquier capa que no pida otra cosa. */
  letra: LetraMarca;
  /**
   * VOCES POR CAPA — opcional, y por eso resuelve la última limitación que
   * quedaba viva.
   *
   * Las dos capas de este repo dibujan con tipografías distintas: la editorial
   * en San Francisco y la de overlays sobre vídeo en Inter. Eso estaba CABLEADO
   * en el dialecto de gráficos, así que una marca no tenía forma de opinar: se
   * llevaba su letra al papel y se le imponía Inter encima del vídeo.
   *
   * Ahora cada dialecto trae una letra POR DEFECTO —gráficos, Inter; editorial,
   * la de la marca— y esto la sobrescribe si el canal lo pide. La clave es el
   * `nombre` del dialecto (`"graficos"`, `"noticias"`), no un campo por capa:
   * un dialecto nuevo no obliga a tocar este tipo.
   *
   *   letraPorCapa: { graficos: { display: MiSans, texto: MiSans, tablas: {…} } }
   *
   * ⚠️ Las `tablas` son las que MIDE R09. El tipo impide nombrar una tabla que
   * no existe, pero no puede comprobar que la tabla corresponda a la familia
   * que declaras: si pones Georgia con tablas de Inter, R09 estimará mal y no
   * se quejará. Mide con `generar-avances.mjs` antes de dar de alta una fuente.
   */
  letraPorCapa?: Record<string, LetraMarca>;
  forma: FormaMarca;
  sombra: SombraMarca;
  metraje: MetrajeMarca;
}

/* ── EL SUELO DEL MOTOR ────────────────────────────────────────────────────
 *
 * EL MOTOR NO CONOCE NINGÚN CANAL. Los perfiles viven en `src/marcas/`, fuera de
 * aquí, y llegan POR PARÁMETRO: `<PistaNoticia marca={…}>`, `compilaNoticia(…,
 * marca)`, `dialectoEditorialDe(marca)`, `fondosNoticiaDe(marca)`.
 *
 * Esto es lo que queda: el suelo con el que se instancian los `export const` de
 * `theme-noticias.ts` (`N`, `T`, `LAYOUT`, `METRAJE`) y los valores por defecto
 * de los componentes de `Editorial.tsx`. NO es una marca y se nota en las dos
 * cosas que lo delatan: no tiene nombre de canal y `sello.texto` es `null`, así
 * que una composición que se olvide de pasar su marca sale SIN WATERMARK — un
 * fallo que se ve en el primer frame, no uno que se publica.
 *
 * LO QUE SÍ ARRASTRA, dicho sin adornos: los COLORES son los que el motor lleva
 * pintando desde el principio, que son los del canal actual. No son neutros y no
 * lo pretenden. Neutralizarlos hoy movería píxeles de 004-007, porque
 * `Editorial.tsx` todavía usa `N.naranja` como valor por defecto en cuatro
 * componentes (`TarjetaFoto`, `ChipIcono`, `Cronologia`, `Medidor`). Ese es el
 * paso 8; cuando caiga, esto se puede vaciar de verdad. */

/** Tipografía de SISTEMA (San Francisco). Ver la nota larga de `theme-noticias.ts`
 *  sobre por qué `-apple-system` y no "SF Pro Display": Chrome solo llega a la SF
 *  del sistema por ese alias. ⚠️ Solo resuelve a SF en macOS: en Windows cae a
 *  Helvetica/Arial y las tablas `sf*` de R09 dejan de corresponder con lo que se
 *  pinta. Por eso es la letra de las marcas que nacieron en un Mac y se
 *  renderizan ahí, no la de una marca nueva. */
const SF =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Helvetica, Arial, sans-serif";

/** La pila de Inter, la MISMA cadena que `theme.ts` usa en la capa de gráficos.
 *  `motor/fuentes.ts` registra la Inter empaquetada bajo la familia "Inter",
 *  así que esta pila pinta los mismos glifos en cualquier máquina. */
export const PILA_INTER =
  "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

/** Letra DETERMINISTA: Inter empaquetada. Es la que debe declarar toda marca nueva.
 *  No hay tabla `inter500` medida: el peso 500 se estima con la de 600, que
 *  sobreestima (del lado seguro para R09). */
export const LETRA_INTER: LetraMarca = {
  display: PILA_INTER,
  texto: PILA_INTER,
  tablas: { 500: "inter600", 600: "inter600", 700: "inter700", 800: "inter800" },
};

/** Letra de SISTEMA (SF en macOS). Es la que heredan, y ahora declaran, las
 *  marcas que ya tienen piezas publicadas con ella: no se toca sin pasar la sonda. */
export const LETRA_SF_SISTEMA: LetraMarca = {
  display: SF,
  texto: SF,
  // Los cuatro pesos que dibujan las fichas editoriales, cada uno con su
  // tabla medida: titular y cifra 700, kicker y pie 600, etiqueta 500,
  // énfasis 800. Ver `LetraMarca.tablas`.
  tablas: { 500: "sf500", 600: "sf600", 700: "sf700", 800: "sf800" },
};

export const MARCA_BASE: Marca = {
  nombre: "base",
  sello: { texto: null },
  color: {
    acento: "#FF5500",
    acentoChip: "#E8863A",
    resalte: "#FFE24A",
    papel: "#ECE8DF",
    hueso: "#F7F5EF",
    negro: "#000000",
    fondoOscuro: "#0E1015",
    tinta: "#111111",
    tintaSuave: "#57524A",
    blanco: "#FFFFFF",
    linea: "rgba(17,17,17,0.14)",
    acentoOscuro: "#0F766E",
  },
  // Los MISMOS valores de siempre (la sonda de píxeles lo exige): la letra de
  // sistema. Una marca nueva declara `letra: LETRA_INTER`; ver `marcas/ejemplo.ts`.
  letra: LETRA_SF_SISTEMA,
  forma: { radio: 22, borde: 8 },
  sombra: {
    caja: "0 18px 44px rgba(17,17,17,0.15)",
    corta: "0 6px 16px rgba(17,17,17,0.18)",
    texto: "0 2px 12px rgba(0,0,0,0.70)",
    textoCine: "0 2px 14px rgba(0,0,0,0.75)",
  },
  metraje: { saturacion: 0.86, contraste: 1.05, calido: 0.07, grano: 0.055, vineta: 0.22 },
};


