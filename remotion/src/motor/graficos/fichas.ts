/**
 * CATÁLOGO de la capa de gráficos — la fuente de verdad de "qué existe ya".
 *
 * Por qué existe: una biblioteca que no se ve, no se usa. Sin escaparate, dentro
 * de tres proyectos volverás a escribir un contador desde cero porque no
 * recordabas que había uno. Se consume de dos formas, y las dos salen de aquí:
 *
 *   1. La composición `Catalogo` (Catalogo.tsx) → un contact sheet VIVO en el
 *      Studio: cada cosa animándose de verdad, con su ficha y su RUTA al lado.
 *   2. `node manuales/motion-graphics/scripts/generar-catalogo.mjs` → regenera
 *      manuales/motion-graphics/catalogo-graficos.md para leerlo fuera del Studio.
 *
 * ── POR QUÉ ESTE ARCHIVO YA NO ES UNA LISTA ────────────────────────────────
 *
 * El fallo original del sistema fue exactamente éste: el catálogo se mantenía A
 * MANO, anunciaba 37 gráficos y el plan servía 16. Veintiuna fichas mentían en
 * silencio, y quien las leía escribía contra algo que no existía.
 *
 * Ahora nada de lo que se alcanza desde un plan se escribe aquí dos veces:
 *
 *   · las PIEZAS salen de `Object.keys(PIEZAS)` — el registro del dialecto;
 *   · los MOLDES, de `Object.keys(MOLDES_GRAFICOS)`;
 *   · las ENTRADAS, de `NOMBRES_ENTRADA` (que a su vez sale de `DUR_ENTRADA`);
 *   · las ENVOLTURAS, el AMBIENTE, los EJES de grupo y las PIELES, de tipos
 *     DERIVADOS del núcleo (`ClaveEnvoltura`, `ClaveAmbiente`, `EjeGrupo`,
 *     `CajaPiel`), consumidos aquí como `Record<K, Tarjeta>`, que es un mapeado
 *     TOTAL: añadir una variante al núcleo sin su tarjeta NO COMPILA, y una
 *     tarjeta de algo que no existe TAMPOCO.
 *
 * Lo único que se escribe a mano es la PROSA (qué es, cuándo usarlo) de lo que
 * no es una pieza; los nombres, no. Y el test `revisar-catalogo.mjs` comprueba
 * lo que el compilador no puede: que toda ficha tenga ruta, que toda ruta tenga
 * ficha, que el archivo exista, que haya demo y que el markdown no esté viejo.
 */

import type { CajaPiel, ClaveAmbiente, ClaveEnvoltura, EjeGrupo, Ficha } from "../plan/nucleo";
import { NOMBRES_ENTRADA } from "../plan/nucleo";
import type { MoldeGrafico } from "./coreografia";
import { MOLDES_GRAFICOS, PIEZAS } from "./coreografia";

/**
 * CÓMO se alcanza una cosa desde el plan. Es el eje por el que se agrupa el
 * contact sheet, porque es la pregunta que uno trae al catálogo: no "¿de qué
 * familia es esto?" sino "¿dónde lo escribo".
 */
export type EjeCatalogo = "molde" | "gramatica" | "pieza" | "entrada" | "envoltura" | "ambiente";

export interface FichaGrafico {
  /** `eje:clave`. Único en el catálogo, y la clave de su demo en Catalogo.tsx. */
  id: string;
  eje: EjeCatalogo;
  /** El literal que se escribe en el plan (`"titular"`, `"franja"`, `"halo"`…). */
  clave: string;
  /** La ruta, escrita como se escribe: `pieza: "titular"`, `entra: {como:"muelle"}`. */
  ruta: string;
  nombre: string;
  /** Sub-agrupación dentro del eje. En las piezas sale del registro. */
  familia: string;
  archivo: string;
  /** Qué es, en una frase. */
  que: string;
  /** Cuándo usarlo — y, cuando importa, cuándo NO. */
  cuando: string;
  /** Variante sugerida de sound/cues.ts (la decisión sonora sigue siendo del skill). */
  sonido?: string;
}

/** Lo que hay que escribir a mano de lo que NO es una pieza. El nombre no: ése es la clave. */
interface Tarjeta {
  nombre: string;
  familia: string;
  archivo: string;
  que: string;
  cuando: string;
  sonido?: string;
  /** Solo cuando la ruta no se deduce del eje (las pieles). */
  ruta?: string;
}

/* ── Moldes ───────────────────────────────────────────────────────────────
 * El `que` NO se escribe: sale del `porque` del propio molde más su geometría
 * declarada. Un molde al que le muevan el ancla se describe solo. */

const MOLDES: Record<MoldeGrafico, Pick<Tarjeta, "nombre" | "cuando">> = {
  sello: {
    nombre: "Sello",
    cuando:
      "Overlay sobre el avatar cuando el texto necesita fondo. El scrim va ACOPLADO al molde: nace con la toma y muere con el texto, así que nadie puede olvidarlo.",
  },
  cta: {
    nombre: "CTA",
    cuando:
      "El cierre. Igual que `sello` pero con 50 px más de scrim: un CTA es más alto que un titular y con 830 el borde inferior del campo flotaba sobre la ropa del avatar.",
  },
  franja: {
    nombre: "Franja alta",
    cuando:
      "El gancho, el rótulo de sección, el dato que acompaña a lo que se está diciendo. R08: por encima de la cara, y por eso su presupuesto de alto es el más estrecho.",
  },
  pantalla: {
    nombre: "Pantalla",
    cuando:
      "Cuando el gráfico ES la escena: `cubre: true` desmonta el avatar. La única que trae fondo propio y viñeta, y la única donde cabe un `diagrama`.",
  },
  capa: {
    nombre: "Capa de atmósfera",
    cuando:
      "Solo ambiente: partículas, foco, viñeta. Su `altoMax: 0` es a propósito — está anclada al centro y no cubre, así que cualquier bloque con alto ya está sobre la cara.",
  },
};

/* ── Entradas ─────────────────────────────────────────────────────────── */

const ENTRADAS: Record<(typeof NOMBRES_ENTRADA)[number], Tarjeta> = {
  ninguna: {
    nombre: "Sin entrada",
    familia: "movimiento",
    archivo: "PistaGraficos.tsx",
    que: "El nodo está entero desde su primer frame.",
    cuando:
      "Lo que ya se anima POR DENTRO (contador, trazo, partículas): envolverlo en una entrada es animar dos veces y se ve como un rebote de más.",
  },
  escalon: {
    nombre: "Escalón",
    archivo: "PistaGraficos.tsx",
    familia: "movimiento",
    que: "Corte duro: no está, y en su frame está. Sin rampa ni desplazamiento.",
    cuando:
      "Estados que se turnan dentro de una `ranura`. OJO bajo `ley.reserva`: no hay animación que lo esconda, así que se ve quieto desde el arranque del padre.",
    sonido: "click ui",
  },
  barrido: {
    nombre: "Barrido",
    familia: "movimiento",
    archivo: "Entradas.tsx",
    que: "Recorte duro de izquierda a derecha, con barra de color viajando en el borde.",
    cuando:
      "Materia dura: la ley seca del dialecto (`LEY_SECA`), 4 f, sin fade ni muelle. `barra` solo en el hero — la barra es un canal de jerarquía, no un adorno.",
    sonido: "swoosh / click ui",
  },
  extiende: {
    nombre: "Extiende",
    familia: "movimiento",
    archivo: "PistaGraficos.tsx",
    que: "Crece desde su origen en vez de aparecer.",
    cuando:
      "Lo que se MIDE: la regla, el enlace, la barra. Una línea que aparece de golpe no dice que algo avanza; dice que ya estaba.",
  },
  muelle: {
    nombre: "Muelle",
    familia: "movimiento",
    archivo: "Entradas.tsx",
    que: "Muelle + rampa de opacidad + desenfoque opcional.",
    cuando:
      "El gesto por defecto del canal (`LEY_BLANDA`). El `desenfoque` solo en el hero: es lo que hace que el texto «llegue» en vez de «aparecer».",
    sonido: "whoosh light / pop",
  },
};

/* ── Envolturas ───────────────────────────────────────────────────────── */

const ENVOLTURAS: Record<ClaveEnvoltura, Tarjeta> = {
  latido: {
    nombre: "Latido",
    familia: "decorador",
    archivo: "Entradas.tsx",
    que: "Oscilación de escala mientras el nodo se sostiene en pantalla.",
    cuando: "Para que un dato sostenido no se congele. ±2 %: amplitudes mayores marean.",
  },
  halo: {
    nombre: "Halo",
    familia: "decorador",
    archivo: "Fondos.tsx",
    que: "Luz propia detrás de UN nodo (no de la pantalla).",
    cuando: "Cifras, logos y nodos que deben emitir luz en vez de estar pegados encima del vídeo.",
  },
  glitch: {
    nombre: "Glitch",
    familia: "decorador",
    archivo: "Glitch.tsx",
    que: "Corrupción de señal por ráfagas: canales RGB, troceado, temblor y scanlines.",
    cuando: "El hook, el logo o la palabra que rompe la expectativa. 0,3-0,6 s: continuo cansa en tres segundos.",
    sonido: "glitch (alterna variantIndex entre ráfagas)",
  },
  aberracion: {
    nombre: "Aberración",
    familia: "decorador",
    archivo: "Glitch.tsx",
    que: "Separación cromática constante y suave, sin troceado.",
    cuando: "El «glitch de reposo» de un título. Si se nota conscientemente, es demasiado.",
  },
  parpadeo: {
    nombre: "Parpadeo",
    familia: "decorador",
    archivo: "PistaGraficos.tsx",
    que: "Encendido/apagado cíclico: `ciclo` frames visible, `ciclo` frames a `a`.",
    cuando:
      "El caret del CTA. Es tiempo CÍCLICO, no una ventana: como ventanas serían diez nodos de nueve frames. `desde: \"toma\"` lo engancha al reloj de la toma en vez de al del nodo.",
  },
  pulso: {
    nombre: "Pulso",
    familia: "decorador",
    archivo: "PistaGraficos.tsx",
    que: "Escala senoidal ACOTADA entre dos frames.",
    cuando: "«Esto está vivo justo aquí»: un latido con principio y fin, atado a un momento de la voz.",
  },
  temblor: {
    nombre: "Temblor",
    familia: "decorador",
    archivo: "PistaGraficos.tsx",
    que: "Desplazamiento horizontal senoidal acotado entre dos frames.",
    cuando: "Tensión o error. La amplitud va en px: 4 ya se ve, 12 es una broma.",
    sonido: "impact sharp",
  },
  atenua: {
    nombre: "Atenúa",
    familia: "decorador",
    archivo: "PistaGraficos.tsx",
    que: "Baja la opacidad a `a` en un momento que puede DISPARAR otro nodo.",
    cuando:
      "Lo que se apaga cuando entra su relevo (la etiqueta «Hoy» de una línea de tiempo cuando llega la siguiente). Con `en: {tras: \"otroNodo\"}` deja de ser un número y pasa a ser una relación: mueve el otro y esto se mueve solo.",
  },
};

/* ── Ambiente ─────────────────────────────────────────────────────────── */

const AMBIENTE: Record<ClaveAmbiente, Tarjeta> = {
  scrim: {
    nombre: "Scrim",
    familia: "atmósfera",
    archivo: "Fondos.tsx",
    que: "Degradado que oscurece un extremo para que el texto se lea sobre el vídeo.",
    cuando:
      "Obligatorio con texto sobre el avatar — y por eso lo pone el MOLDE. Aquí solo se declara lo que se APARTA de él: otro alto, u `false` para quitarlo.",
  },
  vineta: {
    nombre: "Viñeta",
    familia: "atmósfera",
    archivo: "Fondos.tsx",
    que: "Oscurecimiento de bordes que empuja el ojo al centro.",
    cuando: "Casi siempre en tomas que cubren. Se nota al quitarla, no al ponerla.",
  },
  trama: {
    nombre: "Trama",
    familia: "atmósfera",
    archivo: "Fondos.tsx",
    que: "Textura de fondo: `rejilla` (blueprint técnico) o `puntos` (su variante suave).",
    cuando: "Sensación de sistema, plano o dato. A 0,04 es textura; a 0,15 ya roba atención al titular.",
  },
  foco: {
    nombre: "Foco",
    familia: "atmósfera",
    archivo: "Fondos.tsx",
    que: "Resplandor de color colocado en la escena: «la sala» donde ocurre la toma.",
    cuando:
      "Continuidad entre tomas: misma sala, otro ángulo (mueve `cx`/`cy`). `cambiaEn` es el cambio DURO de color: ámbar→rojo en el frame en que la voz da la mala noticia.",
  },
  particulas: {
    nombre: "Partículas",
    familia: "atmósfera",
    archivo: "Particulas.tsx",
    que: "Sistema determinista con tres modos: estallido, ambiente y lluvia.",
    cuando:
      "Estallido en el CTA o el dato clave; ambiente como atmósfera continua; lluvia para «cae». 40-80 bastan: 500 tumban el render. Varias `tintas` o sale confeti monocromo.",
    sonido: "sparkle (+ pop en el estallido)",
  },
};

/* ── Gramática: los ejes de grupo y las pieles ────────────────────────── */

const EJES_GRUPO: Record<EjeGrupo, Tarjeta> = {
  columna: {
    nombre: "Columna",
    familia: "composición",
    archivo: "PistaGraficos.tsx",
    que: "Apila los hijos en vertical con el gap del molde (o el que pida el grupo).",
    cuando: "El eje por defecto y el 90 % de las tomas: kicker, titular, etiqueta. `gap` admite un valor POR HUECO.",
  },
  fila: {
    nombre: "Fila",
    familia: "composición",
    archivo: "PistaGraficos.tsx",
    que: "Pone los hijos en horizontal.",
    cuando: "Glifo + etiqueta, chips de una comparación, una cifra con su unidad. Ojo al ancho: una fila SUMA (R09).",
  },
  pila: {
    nombre: "Pila",
    familia: "composición",
    archivo: "PistaGraficos.tsx",
    que: "Superpone a los hijos en el mismo hueco de una rejilla de una celda.",
    cuando: "El tachón SOBRE su texto, una marca encima de una foto. `alinea` decide por dónde se cruzan.",
  },
  capas: {
    nombre: "Capas",
    familia: "composición",
    archivo: "PistaGraficos.tsx",
    que: "Superposición, exactamente igual que `pila`.",
    cuando:
      "Hoy el intérprete las monta IDÉNTICAS (`superpone` en RenderGrupo): `capas` existe como intención declarada —profundidad— y no como render distinto. Mientras eso siga así, escribe `pila`.",
  },
  ranura: {
    nombre: "Ranura",
    familia: "composición",
    archivo: "PistaGraficos.tsx",
    que: "Estados que SE TURNAN en el mismo hueco, conmutando en frames de la voz.",
    cuando:
      "La sustitución dura, en los frames en que la voz cambia de estado: cada estado muere cuando entra el siguiente. Con `conmuta: \"volteo\"` y DOS hijos es la tarjeta 3D.",
    sonido: "whip en el volteo",
  },
  diagrama: {
    nombre: "Diagrama",
    familia: "composición",
    archivo: "PistaGraficos.tsx",
    que: "El ÚNICO sitio donde existe una coordenada: caja de ancho y alto fijos con hijos en `xy`.",
    cuando:
      "Ejes de tiempo y esquemas. Solo en moldes que cubren. `ancla`/`anclaY` evitan las seis restas a mano (830−20, 1080−20…) y R08 no baja aquí dentro.",
  },
};

const PIELES: Record<CajaPiel, Tarjeta> = {
  sello: {
    nombre: "Piel de sello",
    familia: "composición",
    archivo: "estilos.ts",
    que: "Tarjeta traslúcida bajo el grupo, con los tokens de `CAJA.sello`.",
    cuando:
      "Sobre el avatar, cuando el texto necesita fondo. Traslúcida a propósito: una caja opaca se lee como parche. La lleva el GRUPO, no un componente dentro.",
  },
  campo: {
    nombre: "Piel de campo",
    familia: "composición",
    archivo: "PistaGraficos.tsx",
    que: "Caja tipo input: alto fijo, borde del color pedido y sombra.",
    cuando: "El campo de WhatsApp del CTA. Con un `caret` dentro y la envoltura `parpadeo`, es un cursor escribiendo.",
    sonido: "typing",
  },
  panel: {
    nombre: "Piel de panel",
    familia: "composición",
    archivo: "PistaGraficos.tsx",
    que: "Panel sólido (820×460 por defecto) con borde tenue y esquinas grandes.",
    cuando: "Agrupar varios datos en UNA superficie: una tabla, un antes/después, una ficha de inmueble.",
  },
};

/* ── Derivación ───────────────────────────────────────────────────────── */

const rutaPorDefecto = (eje: EjeCatalogo, clave: string): string => {
  if (eje === "pieza") return `pieza: "${clave}"`;
  if (eje === "molde") return `molde: "${clave}"`;
  if (eje === "entrada") return `entra: { como: "${clave}" }`;
  if (eje === "envoltura") return `envolturas: [{ env: "${clave}" }]`;
  if (eje === "ambiente") return `ambiente: { ${clave}: … }`;
  return `eje: "${clave}"`;
};

const desdeTabla = (eje: EjeCatalogo, tabla: Record<string, Tarjeta>): FichaGrafico[] =>
  Object.keys(tabla).map((clave) => {
    const t = tabla[clave];
    return {
      id: `${eje}:${clave}`,
      eje,
      clave,
      ruta: t.ruta ?? rutaPorDefecto(eje, clave),
      nombre: t.nombre,
      familia: t.familia,
      archivo: t.archivo,
      que: t.que,
      cuando: t.cuando,
      sonido: t.sonido,
    };
  });

/** Un molde se describe SOLO: su prosa es su `porque` y su geometría declarada. */
const fichasDeMoldes = (): FichaGrafico[] =>
  Object.keys(MOLDES_GRAFICOS).map((clave) => {
    const m = MOLDES_GRAFICOS[clave as MoldeGrafico];
    const t = MOLDES[clave as MoldeGrafico];
    const pct = Math.round(m.ancla.pct * 100);
    return {
      id: `molde:${clave}`,
      eje: "molde" as const,
      clave,
      ruta: rutaPorDefecto("molde", clave),
      nombre: t.nombre,
      familia: m.cubre ? "cubre el vídeo" : "sobre el vídeo",
      archivo: "coreografia.ts",
      que: `${m.porque.charAt(0).toUpperCase()}${m.porque.slice(1)}. Ancla ${pct} % desde ${m.ancla.desde}; caja de ${m.anchoMax ?? "?"}×${
        m.altoMax ?? "?"
      } px (base 1080); scrim ${m.scrim === false ? "no" : `${m.scrim.alto} px desde ${m.scrim.desde}`}.`,
      cuando: t.cuando,
    };
  });

/** Las piezas salen ENTERAS del registro: aquí no se escribe ni su nombre. */
const fichasDePiezas = (): FichaGrafico[] =>
  Object.keys(PIEZAS).map((clave) => {
    const fi = (PIEZAS as Record<string, Ficha<never>>)[clave];
    return {
      id: `pieza:${clave}`,
      eje: "pieza" as const,
      clave,
      ruta: rutaPorDefecto("pieza", clave),
      nombre: fi.nombre,
      familia: fi.familia,
      archivo: fi.archivo,
      que: fi.que,
      cuando: fi.cuando,
      sonido: fi.sonido,
    };
  });

/**
 * EL CATÁLOGO. En orden de cómo se escribe una toma: eliges el molde, compones
 * el bloque, pones las piezas, decides cómo entran, las decoras y montas el
 * ambiente. Ese orden es la razón de que el eje sea el eje y no la familia.
 */
export const CATALOGO: FichaGrafico[] = ([] as FichaGrafico[])
  .concat(fichasDeMoldes())
  .concat(desdeTabla("gramatica", EJES_GRUPO))
  .concat(
    // Las pieles se piden con `piel: {caja}`, no con `eje`: su ruta no se deduce.
    desdeTabla(
      "gramatica",
      Object.keys(PIELES).reduce((acc: Record<string, Tarjeta>, k) => {
        acc[k] = { ...PIELES[k as CajaPiel], ruta: `piel: { caja: "${k}" }` };
        return acc;
      }, {})
    )
  )
  .concat(fichasDePiezas())
  .concat(desdeTabla("entrada", ENTRADAS))
  .concat(desdeTabla("envoltura", ENVOLTURAS))
  .concat(desdeTabla("ambiente", AMBIENTE));

/** Ejes en el orden en que se muestran en el catálogo y en la doc. */
export const EJES: { id: EjeCatalogo; nombre: string; que: string }[] = [
  { id: "molde", nombre: "Moldes", que: "Dónde va el bloque y qué trae puesto. Se pide por NOMBRE: `molde: \"franja\"`." },
  { id: "gramatica", nombre: "Gramática", que: "Cómo se componen los nodos entre sí: ejes de grupo y pieles." },
  { id: "pieza", nombre: "Piezas", que: "Lo que dibuja. Son las claves del registro `PIEZAS` del dialecto." },
  { id: "entrada", nombre: "Entradas", que: "Cómo aparece un nodo. La pone la LEY de la pieza; el nodo solo se aparta." },
  { id: "envoltura", nombre: "Envolturas", que: "Decoradores aplicables a CUALQUIER nodo, en `envolturas: [...]`." },
  { id: "ambiente", nombre: "Ambiente", que: "La atmósfera de la toma. La pone el molde; la toma declara lo que cambia." },
];

export const porEje = (e: EjeCatalogo): FichaGrafico[] => CATALOGO.filter((c) => c.eje === e);

/**
 * COMPONENTES SIN RUTA. Están en la biblioteca y se pueden montar a mano en el
 * JSX de una pieza, pero NINGÚN plan los alcanza. Se listan aparte a propósito:
 * meterlos en el catálogo sería volver al fallo que este archivo cierra —
 * anunciar como parte del lenguaje algo que el lenguaje no sabe decir.
 *
 * El test comprueba que ninguno de estos nombres tenga también ficha: el día que
 * uno gane ruta, se cae de aquí.
 */
export const SIN_RUTA: { nombre: string; archivo: string; porque: string }[] = [
  {
    nombre: "Trazo",
    archivo: "Trazo.tsx",
    porque:
      "Dibuja un path SVG libre. Fuera A PROPÓSITO: un path a mano es dibujo, no dato — entra como pieza propia del proyecto, no como vocabulario del canal.",
  },
  {
    nombre: "Tachado",
    archivo: "Texto.tsx",
    porque: "Se compone: una `pila` con el texto y una `regla` con `gira` encima hace el mismo gesto sin pieza nueva.",
  },
  {
    nombre: "Scanlines",
    archivo: "Glitch.tsx",
    porque: "Ninguna envoltura la monta. Vive dentro de `Glitch`, que sí tiene ruta.",
  },
  {
    nombre: "Escena3D · Panel3D · Capas3D",
    archivo: "Tarjeta3D.tsx",
    porque:
      "De la capa 3D solo tiene ruta `Tarjeta3D`, y por composición: `eje: \"ranura\"` con `conmuta: \"volteo\"` y dos hijos.",
  },
];
