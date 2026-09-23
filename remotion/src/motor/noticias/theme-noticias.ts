/**
 * TOKENS DEL FORMATO NOTICIAS — el "look and feel" editorial como código.
 *
 * Cuarto vocabulario del motor, hermano de los tres que ya existen:
 *   theme.ts    → la MARCA del sistema (acento teal, Inter, texto blanco)
 *   motion.ts   → el MOVIMIENTO (muelles, easings, duraciones, stagger)
 *   estilos.ts  → la FORMA de la biblioteca general (sobre fondo OSCURO)
 *   ESTE        → la FORMA del formato noticias (sobre fondo CLARO, editorial)
 *
 * Por qué un theme aparte y no props sueltas: el formato noticias invierte la
 * premisa del resto del sistema. La biblioteca general asume vídeo oscuro con
 * texto blanco encima (`SOMBRA.texto` es obligatoria, `G.tinta` es traslúcida
 * casi negra). Aquí el fondo dominante es PAPEL CLARO y el texto es negro: si
 * reusas `TXT.titular` tal cual, sale blanco sobre beige y no se lee. Este
 * archivo es la contraparte clara, con los mismos cuatro roles tipográficos.
 *
 * Guía humana: manuales/video-noticias/SKILL.md
 *
 * Determinismo: aquí NO hay nada que dependa del frame (misma regla que
 * estilos.ts). Si algo se mueve, vive en motion.ts o en el componente.
 */

/**
 * DE DÓNDE SALEN AHORA LOS VALORES.
 *
 * Este archivo era la única definición de la voz del canal, y por eso el canal
 * no se podía cambiar sin editarlo: `MARCA`, `N`, `FUENTE`, `T` y `METRAJE` eran
 * `export const` que quince archivos importaban a nivel de módulo, así que dos
 * marcas no podían convivir en el repo (la ⚠️ de abajo sobre el 004 era eso).
 *
 * Ahora el archivo NO define valores: define la FORMA del tema y lo deriva de un
 * `Marca` (`motor/marca.ts`). Los `export const` de siempre siguen aquí, con los
 * mismos nombres y los mismos valores, instanciados con el perfil del canal —así
 * ningún importador cambia y ningún frame publicado se mueve— pero ya no son la
 * fuente: son UNA instancia. Un segundo canal es `temaNoticiasDe(OTRA_MARCA)`.
 *
 * Lo que se queda fuera de la marca a propósito, porque no es suya:
 *   · la GRAMÁTICA papel↔negro (qué significa cada registro) — es del dialecto;
 *   · la GEOMETRÍA del lienzo (margen, carril de subtítulos, alto del velo) — es
 *     del formato, y su sitio es `presets.ts`. Aquí solo quedan de paso.
 */
import { MARCA_BASE } from "../marca";
import type { Marca } from "../marca";
import { letraDe } from "../letra";

/**
 * Paleta editorial. Dos fondos que alternan (papel / negro) y un solo acento.
 *
 * La alternancia papel↔negro NO es decorativa: es la gramática del formato.
 * Negro = "esto pasó" (metraje, retratos, escena reconstruida).
 * Papel = "esto significa" (el gráfico que lo explica).
 * Mezclar los dos registros en una misma escena rompe la lectura.
 */
const paletaDe = (m: Marca) => ({
  /** Fondo dominante: beige cálido tipo papel reciclado premium. */
  papel: m.color.papel,
  /** Variante clara para tarjetas y recortes de prensa sobre el papel. */
  hueso: m.color.hueso,
  /** Fondo cinematográfico: negro puro, no gris. La low-key vive de esto. */
  negro: m.color.negro,

  /** Texto principal sobre papel. Carbón, nunca #000 (vibra sobre beige). */
  tinta: m.color.tinta,
  /** Texto de apoyo sobre papel: gris CÁLIDO, no azulado. */
  tintaSuave: m.color.tintaSuave,
  /** Texto sobre negro. */
  blanco: m.color.blanco,

  /** Acento primario. Bordes de tarjeta, chips, subrayados, énfasis. */
  naranja: m.color.acento,
  /** El naranja de los chips isométricos: más terroso, con cuerpo. */
  naranjaChip: m.color.acentoChip,
  /** Amarillo de rotulador para resaltar sobre recortes de prensa. */
  resalte: m.color.resalte,

  /** Líneas y separadores sobre papel. */
  linea: m.color.linea,
  /** Sombra proyectada de tarjetas y recortes (15 % — nunca más). */
  sombra: m.sombra.caja,
  /** Sombra corta de chips y píldoras. */
  sombraCorta: m.sombra.corta,
  /** Sombra de texto SOBRE NEGRO (sobre papel no se usa nunca). */
  sombraTexto: m.sombra.textoCine,
});

/**
 * Tipografías — la VOZ del canal.
 *
 * Antes el formato firmaba con un SERIF pesado (Georgia): voz de periódico. El
 * canal que estrenó el formato (2026-08-09) la cambió a la geométrica del
 * sistema —San Francisco— buscando el registro de apple.com: elegante por
 * contención, no por adorno. Coherente con una marca de gama alta, y sigue
 * leyéndose a velocidad de habla.
 *
 * ✅ AQUEL «ALGÚN DÍA» YA LLEGÓ. Esta nota decía: «si algún día el 004 tiene que
 * conservar el serif, la salida es mover estas dos constantes a MARCA y que cada
 * proyecto elija». Hecho — la familia sale de la marca y una composición pasa la
 * que quiera (`<PistaNoticia marca={…}>`). Cambiar la voz del canal ya no
 * arrastra a las piezas publicadas: basta con darles su propio perfil.
 *
 * POR QUÉ `-apple-system` Y NO "SF Pro Display": la SF Pro descargable de Apple
 * PUEDE estar instalada (en `/Library/Fonts`; en el Mac donde nació el formato lo
 * está), pero NO es la que pinta. `BlinkMacSystemFont` va antes en la pila y
 * resuelve a la SF del SISTEMA (`/System/Library/Fonts/SFNS.ttf`, con eje óptico);
 * `-apple-system` ni siquiera resuelve en el Chrome headless de Remotion. Lo
 * confirma la medida de `plan/avances.ts`: el avance crece +13,4 % a 12 px y es
 * plano desde 84 px, que es el eje óptico de SFNS, no las OTF estáticas de SF Pro.
 * Nombrar la familia a pelo caería al genérico sin avisar.
 *
 * ⚠️ DETERMINISMO ENTRE MÁQUINAS: esa SF es la de CADA macOS —cambia con la
 * versión del sistema— y fuera de macOS las palabras clave caen a Segoe UI o a
 * Helvetica/Arial, con lo que las tablas `sf*` de R09 dejan de corresponder con
 * lo que se pinta. Por eso `LETRA_SF_SISTEMA` (`motor/marca.ts`) es solo para las
 * marcas con piezas ya publicadas desde un Mac, y una marca nueva declara
 * `LETRA_INTER`: Inter viene empaquetada en `remotion/public/fuentes/inter/` y la
 * carga `motor/fuentes.ts`, así que pinta los mismos glifos en cualquier máquina.
 * SF no se puede empaquetar: es una fuente de Apple con licencia de sistema.
 *
 * Los dos roles siguen la propia división de Apple (Display para lo grande,
 * Text para lo pequeño), que no es cosmética: cambia el tracking óptico.
 */
const fuenteDe = (m: Marca) => {
  // LA MISMA RESOLUCIÓN CON LA QUE EL DIALECTO MIDE: `letraEditorialDe` en
  // `dialecto.ts` es `letraDe(m, "noticias")`. Si una marca pide otra letra solo
  // para esta capa (`letraPorCapa.noticias`), R09 estima y el montador pinta con
  // la misma familia; antes esto leía `m.letra` a secas y las dos podían
  // divergir. Sin `letraPorCapa` cae en `m.letra`: los mismos strings de siempre.
  const letra = letraDe(m, "noticias");
  return {
    /** Titulares, cifras, palabra de cierre. Lo que se lee de un vistazo. */
    display: letra.display,
    /** Subtítulos, kickers, labels, chips. Lo que acompaña. */
    texto: letra.texto,
  };
};

/**
 * Escalas tipográficas EN PX A 1080 DE ANCHO (9:16 — el formato del canal).
 * Mismos cuatro roles que `estilos.ts`, en versión clara y con la familia ya
 * decidida por rol. Si necesitas un quinto rol, casi siempre significa que la
 * escena tiene dos protagonistas.
 *
 *   kicker   → antetítulo / sección / fuente de la noticia. Nunca el mensaje.
 *   titular  → el mensaje de la escena. Uno por escena. DISPLAY, tracking negativo.
 *   cifra    → el dato como protagonista. DISPLAY, tabular-nums, muy apretada.
 *   etiqueta → la frase de apoyo que explica el titular o la cifra.
 *   pie      → label pequeño bajo un icono o una foto.
 */
const escalaDe = (N: Paleta, FUENTE: Fuente) => ({
  kicker: {
    fontFamily: FUENTE.texto,
    fontSize: 28,
    fontWeight: 600,
    letterSpacing: 4,
    textTransform: "uppercase" as const,
    color: N.tintaSuave,
  },
  titular: {
    fontFamily: FUENTE.display,
    fontSize: 96,
    fontWeight: 700,
    letterSpacing: -2.6,
    lineHeight: 1.07,
    color: N.tinta,
    /**
     * El `\n` de un titular ES una decisión de maqueta: dónde parte la frase
     * decide qué palabra queda al final de la línea. Sin esto, HTML lo colapsa
     * a un espacio y la decisión se pierde EN SILENCIO — el 005 se renderizó
     * así: `noticia-005.ts` n16-cierre pide dos líneas y salió una corrida.
     * `pre-line` (no `pre`) porque sigue colapsando la sangría del archivo:
     * solo respeta los saltos escritos a propósito.
     */
    whiteSpace: "pre-line" as const,
  },
  cifra: {
    fontFamily: FUENTE.display,
    fontSize: 220,
    fontWeight: 700,
    letterSpacing: -9,
    lineHeight: 1,
    color: N.tinta,
    fontVariantNumeric: "tabular-nums" as const,
  },
  etiqueta: {
    fontFamily: FUENTE.texto,
    fontSize: 44,
    fontWeight: 500,
    letterSpacing: -0.2,
    lineHeight: 1.25,
    color: N.tintaSuave,
  },
  pie: {
    fontFamily: FUENTE.texto,
    fontSize: 26,
    fontWeight: 600,
    letterSpacing: 0.2,
    color: N.tinta,
  },
  /** Subtítulo sincronizado: sans pesada, la línea que sigue a la voz. */
  subtitulo: {
    fontFamily: FUENTE.texto,
    fontSize: 58,
    fontWeight: 700,
    letterSpacing: -1,
    lineHeight: 1.15,
  },
});

/**
 * Geometría del formato en 1080×1920. Son las posiciones que hacen que la pieza
 * se lea igual escena tras escena; cambiarlas por capricho es lo que produce el
 * "salta todo" entre cortes.
 */
const layoutDe = (m: Marca) => ({
  /** Margen lateral seguro (11 % — coincide con verticalSocial de presets.ts). */
  margen: 118,
  /** Y del bloque de subtítulos, en px. Encima del watermark. */
  subtituloY: 1500,
  /** Y del watermark (píldora de marca), desde abajo. */
  selloBottom: 250,
  /** Radio de esquina de tarjetas y recortes. DE LA MARCA. */
  radio: m.forma.radio,
  /** Grosor del borde naranja de las tarjetas de foto. DE LA MARCA. */
  borde: m.forma.borde,
  /**
   * Alto del `velo`: el 62 % de 1920 en el que el degradado llega a transparente.
   * Es el mismo número que declara `MOLDES_NOTICIA.cine.scrim`, sacado aquí para
   * que molde, compilador, montador y validador no lo escriban cuatro veces.
   */
  veloAlto: 1190,
  /**
   * Lo que cuelga el titular de un `escenario` desde el borde inferior (el
   * `paddingBottom: 560` del intérprete viejo). Con un titular de una línea el
   * texto se apoya en y=1360: 140 px por encima del carril de subtítulos.
   */
  cuelgaCine: 560,
});

/**
 * EL LOOK DEL METRAJE — lo que hace que tres clips de tres autores parezcan una
 * sola pieza.
 *
 * Va en el TEMA y no en el plan porque es del FORMATO: todo el metraje de este
 * canal se ve así, igual que todo el papel es el mismo beige. Lo que sí es por
 * clip es la CORRECCIÓN que lo iguala (`grado` en la pieza `media`), y eso se
 * mide, no se decide.
 *
 * Y el orden importa, que es la parte que se hace mal: primero se corrige cada
 * clip para que todos partan del mismo sitio, y solo después se aplica esto
 * encima. Un look uniforme sobre clips sin igualar no los une — amplifica sus
 * diferencias, porque cada uno viene ya graduado por su autor.
 */
const metrajeDe = (m: Marca) => ({ ...m.metraje });

/* ── El tema, instanciado ─────────────────────────────────────────────────
 *
 * `escalaDe` recibe la paleta y la fuente YA RESUELTAS en vez de la marca: los
 * cuerpos y los trackings (96 px, −2.6) son del FORMATO editorial, no del canal,
 * y mezclarlos con la marca invitaría a que un perfil cambiara el tamaño del
 * titular — que es exactamente lo que hace que dos piezas del mismo formato
 * dejen de parecerse. Lo que el canal decide es la FAMILIA y el COLOR; el
 * tamaño lo decide el formato. */

type Paleta = ReturnType<typeof paletaDe>;
type Fuente = ReturnType<typeof fuenteDe>;

/**
 * MEMOIZADO POR IDENTIDAD DE MARCA, y no es una micro-optimización.
 *
 * Un montador lo llama por NODO y por FRAME (`temaNoticiasDe(c.marca).T`), así
 * que sin caché una pieza de 80 s a 30 fps reconstruiría el tema entero unas
 * cien mil veces. Con `Map` sobre la referencia del objeto es una búsqueda.
 *
 * Y hay una razón que no es de rendimiento: los estilos que salen de aquí se
 * esparcen en `style={{...T.titular}}`, y devolver un objeto NUEVO cada vez
 * haría que React viera props distintas en cada render. El determinismo no se
 * rompe —el frame se pinta igual— pero el trabajo se dispara sin motivo.
 *
 * `Map` y no `WeakMap` a propósito: los perfiles de marca son constantes de
 * módulo que viven toda la sesión, así que no hay nada que recolectar, y `Map`
 * es es2015 (la disciplina de esta casa; `WeakMap` también, pero no aporta).
 */
/** La forma del tema, derivada de sus constructores: no hay lista que mantener. */
export interface TemaNoticias {
  MARCA: { sello: string | null; acento: string };
  N: Paleta;
  FUENTE: Fuente;
  T: ReturnType<typeof escalaDe>;
  LAYOUT: ReturnType<typeof layoutDe>;
  METRAJE: ReturnType<typeof metrajeDe>;
}

const cacheTema = new Map<Marca, TemaNoticias>();

/** El tema editorial completo, derivado de una marca. Un segundo canal es esto
 *  con otro perfil: `temaNoticiasDe(OTRA)`. */
export const temaNoticiasDe = (m: Marca): TemaNoticias => {
  const guardado = cacheTema.get(m);
  if (guardado) return guardado;
  const N = paletaDe(m);
  const FUENTE = fuenteDe(m);
  const tema = {
    MARCA: { sello: m.sello.texto as string | null, acento: m.color.acento },
    N,
    FUENTE,
    T: escalaDe(N, FUENTE),
    LAYOUT: layoutDe(m),
    METRAJE: metrajeDe(m),
  };
  cacheTema.set(m, tema);
  return tema;
};

/**
 * LA INSTANCIA DEL CANAL. Mismos nombres y mismos valores que antes, para que
 * los quince importadores no se enteren y ningún frame publicado se mueva.
 * Deja de ser la fuente de verdad: la fuente es `MARCA_BASE` en `motor/marca.ts`.
 */
export const TEMA_NOTICIAS = temaNoticiasDe(MARCA_BASE);
export const { MARCA, N, FUENTE, T, LAYOUT, METRAJE } = TEMA_NOTICIAS;

/** `#rrggbb` → `rgba(...)`. Igual que `alfa()` de estilos.ts, sin acoplar los dos themes. */
/** Reexportada de `formato.ts` (era una copia literal de `alfa`). */
export { alfa as alfaN } from "../formato";
