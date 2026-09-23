// ═══════════════════════════════════════════════════════════════════════════
// EL DIALECTO DE GRÁFICOS: overlays sobre un vídeo que ya existe.
// Hermano de motor/noticias/ (tomas que traen su propio mundo).
// Sigue siendo DATOS: ni un import de React ni de Remotion en tiempo de
// ejecución, para que un plan se valide con `node` sin montar el motor.
//
// El sustrato común vive en `../plan/nucleo`; aquí solo está lo PROPIO de esta capa:
// qué colores significan qué, cómo entra el movimiento, dónde se puede poner un
// bloque, qué piezas existen y qué se considera un plan mal escrito.
// ═══════════════════════════════════════════════════════════════════════════

import type {
  CtxFicha, Ficha, LetraDialecto, Ley, Molde, Nodo, PesoAvance, Plan, Regla, Rol, TextoRico, TramoTexto,
} from "../plan/nucleo";
import { anchoPalabraMasLargaTramos, anchoTexto, anchoTramos } from "../plan/nucleo";
import { alturaEstimada, capa, gapEntre, registro, solapan, textoPlano, ventanaAbs } from "../plan/nucleo";
// Las tablas de avances ya no se resuelven aquí: `letraDe` (motor/letra.ts) lo
// hace para las dos capas, porque la marca declara CLAVES y el dialecto necesita
// TABLAS. Esta capa dibuja en Inter POR DEFECTO —no por herencia de la marca—, y
// el error del modelo de cubos era distinto en cada familia: ahí se vio que un
// solo juego de cubos no podía servir a las dos.
// `theme.ts` es un objeto literal SIN imports: entra aquí sin romper la regla de
// que esta capa se pueda leer con `node` pelado. Ver `PALETA_MARCA`.
import { theme } from "../theme";
// La marca del canal. Deja de ser un import de módulo en cada componente y pasa
// a viajar EN EL DIALECTO, que es lo que permite que dos canales convivan.
import { MARCA_BASE } from "../marca";
// Alias: este archivo YA tiene un tipo `Marca` — las marcas de lista
// (check/punto/aspa/numero). Dos cosas distintas con el mismo nombre, y el
// compilador lo cazó en el sitio exacto (`MARCAS[p.marca]`).
import type { LetraMarca, Marca as MarcaCanal } from "../marca";
import { letraDe } from "../letra";
// `import type` de un .tsx: se borra al compilar, así que no entra ni React ni
// JSX en el bundle de datos. Deriva la clave del banco REAL (`Glifos.tsx`) en
// vez de repetir la lista a mano; escrita a mano ya divergía —el diseño incluía
// un "chat" que el banco nunca llegó a dibujar— y un plan con un glifo
// inexistente compilaría hoy para reventar en el intérprete.
// EL REGISTRO COMPARTIDO. Estas seis fichas ya no se definen aquí: viven en
// `motor/piezas/` y las incorporan LOS DOS dialectos, así que una toma editorial
// puede pedir un subrayado. Se referencian una a una y EN SU SITIO —en vez de
// con un spread— porque `Object.keys(PIEZAS)` es el orden del catálogo y de la
// comp `Catalogo`: reordenarlo movería todos sus frames.
import { PIEZAS_COMUNES } from "../piezas";
import type { ClaveGlifo } from "./Glifos";

export * from "../plan/nucleo";
export type { ClaveGlifo };

/* ── Paleta semántica ─────────────────────────────────────────────────────
 * El plan pide colores por lo que SIGNIFICAN. Los hex los pone el proyecto
 * (`plan.paleta`): una pieza puede descartar `MG` entera y definir los suyos,
 * porque la dirección de arte es de la pieza y los significados, del sistema. */
export type Tinta = "marca" | "dato" | "perdida" | "logro" | "neutro" | "texto" | "fondo";
export type TextoG = TextoRico<Tinta>;

/**
 * `marca` y `texto` se DERIVAN de `theme.ts`; no se vuelven a escribir.
 *
 * Estaban copiados como hex (`"#0F766E"`, `"#FFFFFF"`) al lado del mismo color
 * que ya vive en `theme.accent` y `theme.text` — dos verdades sobre el mismo
 * color, y `motion.ts` ya derivaba la suya (`MG.teal = theme.accent`). Con la
 * copia, cambiar el acento del canal en theme.ts movía `MG`/`G` y dejaba
 * `PALETA_MARCA` —la que resuelve el color de CADA nodo del plan— en el teal
 * viejo. Importar `theme` no rompe la pureza de esta capa: theme.ts es un
 * objeto literal sin un solo import, así que un plan se sigue validando con
 * `node` pelado.
 *
 * Las otras cinco no salen de theme y es correcto: son la paleta SEMÁNTICA del
 * sistema (qué significa un dato, una pérdida, un logro), no la voz del canal.
 */
export const PALETA_MARCA: Record<Tinta, string> = {
  marca: theme.accent,
  dato: "#f59e0b",
  perdida: "#ef4444",
  logro: "#34d399",
  neutro: "rgba(148,163,184,0.95)",
  texto: theme.text,
  fondo: "#0E1015",
};

/* ── Leyes de movimiento ────────────────────────────────────────────────── */

/** Reproduce EXACTAMENTE lo que hace hoy `Entrada` en PistaGraficos.tsx: montar
 *  un plan sin `ley` no cambia ni un frame de lo que ya sale. */
export const LEY_BLANDA: Ley = {
  entrada: { como: "muelle", muelle: "entrada", y: -26, rampa: 8, desenfoque: 8 },
  salida: { como: "corte" },
  escalera: [0, 6, 12, 18],
  barraEnHero: false,
};

/** La ley SECA: barrido duro de 4 f, sin easing, sin fade, sin muelle. La
 *  escalera [0,2,3,7,12] ES el stagger real de sus tarjetas: escritas con esta
 *  ley, las tres no llevan ni un solo `en`. */
export const LEY_SECA: Ley = {
  entrada: { como: "barrido", dur: 4, barra: true },
  salida: { como: "corte" },
  escalera: [0, 2, 3, 7, 12],
  prohibe: ["muelle"],
  barraEnHero: true,
};

/* ── Moldes: el sitio se pide por NOMBRE ────────────────────────────────── */

export type MoldeGrafico = "sello" | "cta" | "franja" | "pantalla" | "capa";

/**
 * `tinta` es OBLIGATORIA en `Molde` desde que un fondo sin su tinta dejó texto
 * invisible en una pieza publicada. En esta capa las cinco valen lo mismo —"texto", el blanco
 * de la paleta— porque los cinco moldes se leen sobre vídeo oscuro o sobre el
 * fondo de la propia capa; declararlo no mueve un píxel (es lo que ya daba
 * `dialecto.tintaBase`) y deja escrito por qué.
 *
 * `anchoMax` = 1080 − 2×118 (`margenSeguro`, 11 %): el ancho ÚTIL de la caja del
 * molde, que es entre lo que el intérprete monta el bloque.
 */
export const MOLDES_GRAFICOS: Record<MoldeGrafico, Molde<Tinta>> = {
  sello: {
    cubre: false,
    ancla: { desde: "arriba", pct: 0.698 }, // 1340/1920 = la banda de subtítulos del avatar 9:16
    alinea: "centro",
    gap: 14,
    scrim: { alto: 830, desde: "abajo" },
    fondo: false,
    tinta: "texto",
    vineta: false,
    altoMax: 500, // 1920 − 1340 menos aire: pasarse saca el texto de cuadro
    anchoMax: 844,
    porque: "toma sobre el avatar: el bloque cuelga de la banda de subtítulos y crece hacia abajo",
  },
  cta: {
    cubre: false,
    ancla: { desde: "arriba", pct: 0.698 },
    alinea: "centro",
    gap: 14,
    // 880 y no 830: con 830 el borde inferior del campo caía fuera del degradado
    // y se veía flotando sobre la ropa del avatar.
    scrim: { alto: 880, desde: "abajo" },
    fondo: false,
    tinta: "texto",
    vineta: false,
    altoMax: 500,
    anchoMax: 844,
    porque: "igual que sello pero con más scrim: el CTA es más alto que un titular",
  },
  franja: {
    cubre: false,
    ancla: { desde: "arriba", pct: 0.061 },
    alinea: "centro",
    gap: 16,
    scrim: false,
    fondo: false,
    tinta: "texto",
    vineta: false,
    altoMax: 340, // R08: más y el bloque se come la cara
    anchoMax: 844,
    porque: "R08: por encima de la cara. Más de 340 px y el gráfico invade al avatar",
  },
  pantalla: {
    cubre: true,
    ancla: { desde: "centro", pct: 0.5 },
    alinea: "centro",
    gap: 40,
    scrim: false,
    fondo: "toma",
    tinta: "texto",
    vineta: true,
    altoMax: 1500,
    anchoMax: 844,
    porque: "toma de gráfico: el avatar se DESMONTA y el gráfico es la escena entera",
  },
  capa: {
    cubre: false,
    ancla: { desde: "centro", pct: 0.5 },
    alinea: "centro",
    gap: 0,
    scrim: false,
    fondo: false,
    tinta: "texto",
    vineta: false,
    // El ancho SÍ es el normal, y el alto no: son dos preguntas distintas. Un
    // bloque ancho no invade nada (la caja del molde es la misma para los cinco);
    // un bloque ALTO anclado al centro cae justo sobre la cara.
    anchoMax: 844,
    // Presupuesto CERO, y no `undefined`. `revisaPlan` solo mide el bulto cuando
    // el molde declara `altoMax`, así que dejarlo sin poner convertía a `capa` en
    // el único molde por el que se colaba un bloque de cualquier tamaño encima de
    // la cara sin que nadie chistara (medido: 1.051 px, cero avisos). Cero es el
    // número honesto: `capa` está anclada al CENTRO y no cubre, o sea que
    // cualquier alto cae justo sobre el avatar. Lo que va aquí es ambiente
    // (partículas, resplandor, viñeta), que no ocupa maqueta y mide 0.
    altoMax: 0,
    porque: "atmósfera a pantalla completa: es ambiente, no maqueta — un bloque con alto ya está sobre la cara",
  },
};

/* ── Beats ──────────────────────────────────────────────────────────────── */

export const BEATS_GRAFICOS = ["gancho", "problema", "prueba", "mecanismo", "giro", "remate", "cta"] as const;
export type BeatGrafico = (typeof BEATS_GRAFICOS)[number];

/* ── Tipos de dato de las piezas ────────────────────────────────────────── */

export type Encaje = "libre" | "unaLinea" | "dosLineas";
export type Punto = readonly [number, number];
export type Marca = "check" | "punto" | "numero" | "aspa";
export type ItemDeLista = { texto: TextoG; estado?: "si" | "no" | "neutro" };
export type SerieBarra = { etiqueta: string; valor: number; tinta?: Tinta };
/** Un embudo que se vacía —0→200 (45 f) · meseta (55 f) · 200→3 (22 f)— son cuatro
 *  keyframes que un par `de`/`a` no expresa, y por eso vivían en un if/else. */
export type TramoContador = { a: number; dur: number } | { espera: number };

const f = <P>(
  nombre: string,
  familia: string,
  archivo: string,
  que: string,
  cuando: string,
  extra: Partial<Ficha<P>> = {}
): Ficha<P> => ({ nombre, familia, archivo, que, cuando, ...extra });

const altoTexto = (px: number, lineas = 1): number => Math.round(px * 1.15 * lineas);

/* ── Ancho de las piezas (R09) ─────────────────────────────────────────────
 *
 * Mismo reparto que en el dialecto editorial y por el mismo motivo: se mide la
 * LÍNEA ENTERA donde el intérprete pone `nowrap` (un `titular` con `lineas`,
 * que es donde un texto que no cabe se CORTA) y la PALABRA MÁS LARGA donde el
 * texto puede maquetarse libre (ahí no cabe = baja de línea, y eso es R08).
 *
 * Los trackings van COPIADOS de `TXT` (estilos.ts) y no importados: este archivo
 * es datos puros y `estilos.ts` arrastra `motion.ts`, que sí toca Remotion — un
 * plan tiene que poder validarse con `node`. Si allí cambian, aquí también. Y
 * desde la calibración de R09 esa servidumbre incluye el PESO, que es lo que
 * elige la tabla de avances: `TXT.titular` y `TXT.cifra` pesan 800 →
 * `c.tabla(800)`; `TXT.kicker` y `TXT.etiqueta`, 600 → `c.tabla(600)`;
 * `<Chip>` dibuja a 700 → `c.tabla(700)`. Las piezas de trazo, dato y
 * diagrama ya declaran su ancho como prop (`ancho`, `largo`, `radio`), así que
 * ahí no hay nada que estimar: se lee. Las que no declaran ancho ni son texto no
 * traen `ancho` y miden 0, igual que hace `alto` — mientras nadie las corte, no
 * hay regla.
 *
 * LOS CUERPOS YA NO SE COPIAN. Estaban escritos a mano (`?? 92`, `?? 46`,
 * `?? 210`) y la copia había divergido de lo que dibuja el intérprete, que es
 * `p.px ?? escalaRol[rol]` (`escalaTexto` en PistaGraficos.tsx): un titular
 * `hero` sin `px` se estimaba a 92 y se pinta a 104 —un 11,5 % por debajo, o sea
 * un titular cortado con el plan diciendo LIMPIO— y un contador `hero` sin `px`
 * se estimaba a 210 y se pinta a 104, el doble. Ahora los dos leen `ESCALA`.
 */

/**
 * LA ESCALA DE LA CAPA, en un solo sitio: la consultan el intérprete (vía
 * `GRAFICOS.escala` → `ctx.escalaRol`) y las fichas de aquí abajo. Base 1080 de
 * ancho; el intérprete la escala con `escalaPorAncho()`, y la ficha estima
 * SIEMPRE en base 1080 porque es lo que compara R09.
 */
const ESCALA: Record<Rol, number> = { hero: 104, apoyo: 46, contexto: 32 };

/**
 * Los TRAMOS de un texto rico, cada uno con la tabla de su peso: un `Trozo` con
 * `enfasis` se monta a `fontWeight: 800` (`estiloTrozo` en PistaGraficos.tsx).
 * Aquí el salto suele ser pequeño —la base de titular y cifra ya es `inter800`—
 * pero en kicker, etiqueta y lista va de 600 a 800, y una subestimación no deja
 * de serlo por ser pequeña.
 */
const tramos = (t: TextoG, c: CtxFicha, peso: PesoAvance): readonly TramoTexto[] => {
  const base = c.tabla(peso);
  return typeof t === "string"
    ? [{ texto: t, letra: base }]
    : t.map((x) =>
        typeof x === "string"
          ? { texto: x, letra: base }
          : { texto: x.t, letra: x.enfasis ? c.tabla(800) : base }
      );
};

const anchoLineas = (lineas: readonly TextoG[], px: number, tracking: number, c: CtxFicha): number =>
  lineas.reduce((m, l) => Math.max(m, anchoTramos(tramos(l, c, 800), px, tracking)), 0);


/**
 * EL REGISTRO. La unión de claves se DERIVA (`ClaveDe<typeof PIEZAS>`): nadie
 * escribe `type TipoGrafico = "kicker" | …`. Y `Montadores<R>` es un mapeado
 * TOTAL, así que añadir una entrada aquí ROMPE la compilación del intérprete
 * hasta que se escriba su rama: el catálogo no puede volver a mentir.
 *
 * Las 37 fichas del catálogo de v1 NO eran 37 tipos de cue — ése fue su error:
 *   son PIEZAS (esto) · ENVOLTURAS (`Envoltura`) · leyes de entrada (`Entrada`)
 *   · AMBIENTE (`Ambiente`) · y gramática (los ejes de grupo y las pieles), que
 *   ya no se declara como cue porque la garantiza el tipo. `Trazo` con `d` libre
 *   se queda fuera A PROPÓSITO (un path a mano es dibujo, no dato: entra por una
 *   pieza propia del proyecto).
 *
 * `fichas.ts` ya no repite nada de esto: DERIVA su catálogo de este registro y
 * de esas cuatro tablas del núcleo. Lo que se escribe aquí —`nombre`, `que`,
 * `cuando`, `sonido`— es lo que sale publicado en el contact sheet y en el
 * markdown, así que se escribe para leerse, no para el compilador.
 */
export const PIEZAS = registro({
  // ── Texto ────────────────────────────────────────────────────────────────
  kicker: f<{ texto: TextoG; px?: number }>("Kicker", "texto", "Texto.tsx",
    "Antetítulo en versalitas.", "Contexto o sección. NUNCA lleva el mensaje.",
    {
      alto: (p, c) => altoTexto(p.px ?? ESCALA[c.rol]),
      // Versalitas y tracking +6: la mayúscula ocupa un 25 % más que su
      // minúscula, así que medir el texto tal cual está escrito subestimaría.
      ancho: (p, c) =>
        anchoPalabraMasLargaTramos(tramos(p.texto, c, 600), p.px ?? ESCALA[c.rol], 6, {
          versalitas: true,
        }),
    }),
  titular: f<{ texto?: TextoG; lineas?: readonly TextoG[]; px?: number; encaje?: Encaje }>(
    "Titular", "texto", "Texto.tsx",
    "El mensaje de la toma. `lineas` = saltos EXPLÍCITOS.",
    "Uno por toma. Un trozo con `tinta` colorea una palabra dentro de la frase.",
    {
      sonido: "impact deep (en la palabra clave)",
      alto: (p, c) => altoTexto(p.px ?? ESCALA[c.rol], p.lineas ? p.lineas.length : 1),
      ancho: (p, c) =>
        p.lineas
          ? anchoLineas(p.lineas, p.px ?? ESCALA[c.rol], -1, c)
          : anchoPalabraMasLargaTramos(tramos(p.texto ?? "", c, 800), p.px ?? ESCALA[c.rol], -1),
      // Un `\n` dentro de `texto` no se honra (T.titular no lleva pre-line) y la
      // intención se pierde en silencio. Aquí el salto es estructura.
      revisa: (p) => {
        const av: string[] = [];
        if (!p.texto && !p.lineas) av.push("titular sin `texto` ni `lineas`");
        if (p.texto && textoPlano(p.texto).indexOf("\n") >= 0)
          av.push('titular con "\\n" literal: el intérprete no lo honra, usa `lineas: [...]`');
        return av;
      },
    }),
  etiqueta: f<{ texto: TextoG; px?: number }>("Etiqueta", "texto", "Texto.tsx",
    "La frase de apoyo que explica el titular o la cifra.",
    "Debajo del hero. Con rol 'apoyo' hereda el color del hero rebajado, no gris.",
    {
      alto: (p, c) => altoTexto(p.px ?? ESCALA[c.rol]),
      ancho: (p, c) => anchoPalabraMasLargaTramos(tramos(p.texto, c, 600), p.px ?? ESCALA[c.rol], 0.2),
    }),
  cifra: f<{ texto?: string; valor?: number; px?: number; prefijo?: string; sufijo?: string; decimales?: number; resplandor?: number }>(
    "Cifra", "texto", "Texto.tsx", "El dato como protagonista, con tabular-nums.",
    "Cuando la magnitud ES el argumento y no hace falta verla subir.",
    {
      sonido: "data / money",
      alto: (p, c) => altoTexto(p.px ?? ESCALA[c.rol]),
      // Lo que monta el intérprete: `texto` si lo hay, y si no el número con su
      // prefijo y su sufijo. A 210 px de cuerpo, cinco dígitos ya no caben.
      //
      // El cuerpo por defecto es el del ROL y no los 210 de `TXT.cifra`: el
      // montador pasa por `escalaTexto`, así que `TXT.cifra.fontSize` no llega a
      // aplicarse nunca salvo que el plan pida `px`. Estimar 210 donde se pintan
      // 104 es un aviso por algo que cabe con el doble de sitio.
      ancho: (p, c) =>
        anchoTexto(
          p.texto ?? `${p.prefijo ?? ""}${p.valor ?? 0}${p.sufijo ?? ""}`,
          p.px ?? ESCALA[c.rol],
          c.tabla(800),
          -3,
          // `TXT.cifra` monta `tabular-nums` (es lo que impide que el número
          // tiemble al contar) y el dígito tabular de Inter es más ancho que el
          // proporcional: sin la bandera, la cifra se estimaba por debajo.
          { tabulares: true }
        ),
      revisa: (p) => (p.texto === undefined && p.valor === undefined ? ["cifra sin `texto` ni `valor`: no dibuja nada"] : []),
    }),
  chip: f<{ texto: TextoG; px?: number; activo?: boolean }>("Chip", "texto", "Texto.tsx",
    "Píldora de estado: fondo y borde derivados del color.",
    "Etiquetar (activo/inactivo, antes/después). Inalcanzable en v1. `activo: false` lo apaga a gris, que es como se descarta una opción de una comparación.",
    {
      alto: (p, c) => altoTexto(p.px ?? ESCALA[c.rol]) + 24,
      // El chip es una píldora que se ajusta a su texto: mide el texto ENTERO
      // (no cabe = se sale, no baja de línea) más el padding lateral de <Chip>.
      // Los tres números salen de `<Chip>` (Texto.tsx) y de nadie más: peso 700
      // —no el de `TXT`, por eso la tabla es `inter700`—, `letterSpacing: 1` —no
      // el 0,2 que se estimaba aquí, que era un desajuste vivo— y el padding
      // "8px 22px". El cuerpo lo pone el rol, como en el resto de la capa.
      ancho: (p, c) => anchoTramos(tramos(p.texto, c, 700), p.px ?? ESCALA[c.rol], 1) + 44,
    }),
  // El glifo es CUADRADO: `cloneElement(GLIFO[…], { width: t, height: t })`.
  glifo: f<{ nombre: ClaveGlifo; px?: number }>("Glifo", "texto", "Glifos.tsx",
    "SVG inline del banco, por NOMBRE.", "Dentro de una fila con una etiqueta. El plan nunca lleva el `path`.",
    { alto: (p) => p.px ?? 46, ancho: (p) => p.px ?? 46 }),
  caret: f<{ ancho?: number; alto?: number }>("Caret", "texto", "Texto.tsx",
    "Barra de cursor de un campo de texto.",
    "Con la envoltura `parpadeo`: es tiempo cíclico, no una ventana. Antes se escribía a mano en cada pieza.",
    { alto: (p) => p.alto ?? 56, ancho: (p) => p.ancho ?? 4 }),

  // ── Dato ─────────────────────────────────────────────────────────────────
  contador: f<{ de?: number; a?: number; tramos?: readonly TramoContador[]; dur?: number; decimales?: number; prefijo?: string; sufijo?: string; px?: number; golpe?: boolean }>(
    "Contador", "dato", "Datos.tsx", "Número que SE FORMA, con golpe opcional al aterrizar.",
    "Cuando ver crecer el número es el argumento. `tramos` para fugas (0→200→meseta→3).",
    {
      sonido: "data (textura) + tick / chime al aterrizar",
      alto: (p, c) => altoTexto(p.px ?? ESCALA[c.rol]),
      // Se mide el número MÁS ANCHO que llega a pintarse, no el de destino: un
      // contador que baja (0→200→3, con `tramos`) enseña «200» a mitad
      // de camino, y si «200» no cabe da igual que el final sea «3». Con
      // `tramos` el máximo sale de recorrerlos; sin ellos, de `de` y `a`.
      ancho: (p, c) => {
        const picos = [p.de ?? 0, p.a ?? 0];
        for (const tr of p.tramos ?? []) if ("a" in tr) picos.push(tr.a);
        let max = 0;
        for (const v of picos) max = Math.max(max, Math.abs(v));
        const cuerpo = max.toFixed(Math.min(2, p.decimales ?? 0));
        // Mismo motivo que en `cifra`: el montador pasa por `escalaTexto`, así
        // que sin `px` en el plan se dibuja el cuerpo del rol, no los 210.
        return anchoTexto(`${p.prefijo ?? ""}${cuerpo}${p.sufijo ?? ""}`, p.px ?? ESCALA[c.rol], c.tabla(800), -3, {
          tabulares: true,
        });
      },
      revisa: (p) => {
        const av: string[] = [];
        if (p.a === undefined && !p.tramos) av.push("contador sin `a` ni `tramos`");
        if ((p.decimales ?? 0) > 2) av.push("más de 2 decimales en pantalla no se leen");
        return av;
      },
    }),
  barra: f<{ valor: number; dur?: number; ancho?: number; alto?: number; pico?: number }>(
    "BarraProgreso", "dato", "Datos.tsx", "Proporción que crece LINEAL, con umbral opcional.",
    "Lineal a propósito: con easing mentiría sobre la velocidad del proceso.",
    { sonido: "whoosh light + chime al llegar", alto: (p) => (p.alto ?? 18) + 40, ancho: (p) => p.ancho ?? 720 }),
  regla: PIEZAS_COMUNES.regla,
  lista: f<{ items: readonly ItemDeLista[]; marca?: Marca; paso?: number; px?: number }>(
    "ItemLista", "dato", "Datos.tsx", "Lista con marca y stagger por índice.",
    "Tres puntos como mucho. `marca` es de la LISTA (ya no está fija a ✓: una lista de errores va con ✗) y `items[].estado` es de UN ítem, que es como se dice «estos dos sí y este no» sin salirse del plan.",
    {
      sonido: "pop por ítem (alterna variantIndex)",
      alto: (p, c) => altoTexto(p.px ?? ESCALA[c.rol], p.items.length) + Math.max(0, p.items.length - 1) * 22,
      // Cada ítem es una FILA: marca (un carácter a px×0.9) + gap 20 + etiqueta.
      // Se mide la palabra más larga y no la frase entera porque la etiqueta sí
      // puede bajar de línea; lo que no puede partirse es la palabra.
      ancho: (p, c) => {
        const px = p.px ?? ESCALA[c.rol];
        let max = 0;
        for (const it of p.items)
          max = Math.max(max, anchoPalabraMasLargaTramos(tramos(it.texto, c, 600), px, 0.2));
        return p.items.length === 0 ? 0 : px * 0.9 + 20 + max;
      },
      revisa: (p) => (p.items.length === 0 ? ["lista sin items: ocupa tiempo y no dibuja nada"] : []),
    }),
  barras: f<{ datos: readonly SerieBarra[]; max?: number; dur?: number; paso?: number; alto?: number; ancho?: number; hueco?: number }>(
    "Barras", "dato", "Datos.tsx", "Barras que crecen desde la base con stagger.",
    "Comparar 3-6 valores. `max` COMPARTIDO entre tomas o la comparación miente.",
    {
      sonido: "data por barra",
      alto: (p) => (p.alto ?? 420) + 90,
      // `<Barras>` es una fila: N columnas de `ancho` con `hueco` entre ellas.
      // Los defectos son los del componente (120 y 36), no los del montador:
      // el montador pasa `p.ancho` y `p.hueco` tal cual, sin sustituirlos.
      ancho: (p) =>
        p.datos.length === 0
          ? 0
          : p.datos.length * (p.ancho ?? 120) + (p.datos.length - 1) * (p.hueco ?? 36),
      revisa: (p) => (p.datos.length === 0 ? ["barras sin datos: montará el marco vacío"] : []),
    }),
  serie: f<{ n: number; activo: number; ancho?: number; alto?: number; hueco?: number; tintas?: readonly Tinta[] }>(
    "SerieBarras", "dato", "Datos.tsx", "Indicador de N pasos con el activo saturado y los demás rebajados.",
    "Cuando la pieza promete N cosas: planta la tríada antes y repítela en cada paso, para que el espectador sepa en cuál va.",
    {
      alto: (p) => p.alto ?? 6,
      // Fila de N segmentos: el montador los dibuja con `gap: p.hueco ?? 16` y
      // `width: p.ancho ?? 72`. Con n = 12 ya no cabe en los 844 de un molde.
      ancho: (p) => (p.n <= 0 ? 0 : p.n * (p.ancho ?? 72) + (p.n - 1) * (p.hueco ?? 16)),
      revisa: (p) => (p.activo >= p.n ? ["`activo` cae fuera de la serie: no se marcará ninguno"] : []),
    }),

  // ── Trazo ────────────────────────────────────────────────────────────────
  subrayado: PIEZAS_COMUNES.subrayado,
  rodea: PIEZAS_COMUNES.rodea,
  flecha: PIEZAS_COMUNES.flecha,
  check: PIEZAS_COMUNES.check,
  aspa: PIEZAS_COMUNES.aspa,
  nodo: f<{ radio: number; relleno?: boolean; grosor?: number }>("Nodo", "dato", "Datos.tsx",
    "Punto de un eje: hueco = «aquí no pasó nada», relleno = «aquí sí».",
    "En una línea de tiempo, dentro de un `diagrama`. Con `ancla: 'centro'` se coloca por su centro.",
    { alto: (p) => p.radio * 2, ancho: (p) => p.radio * 2 }),
  enlace: f<{ largo: number; recorre?: number; guion?: readonly [number, number]; dur?: number; alto?: number }>(
    "Enlace", "dato", "Datos.tsx", "Línea punteada que recorre solo una fracción del camino.",
    "0.38 = «no llegó». El recorrido parcial ES el argumento.",
    // `largo` es el camino COMPLETO; `recorre` solo dice hasta dónde llega la
    // animación. Se mide el completo: es el sitio que el enlace reserva.
    { alto: (p) => p.alto ?? 8, ancho: (p) => p.largo }),
});

export type PiezasGraficos = typeof PIEZAS;

/* ── Reglas propias de la capa ──────────────────────────────────────────── */

type ReglaG<R extends PiezasGraficos> = Regla<R, BeatGrafico, MoldeGrafico, Tinta>;

/**
 * Varias gráficas de barras sin `max` común: cada una se autoescala a su máximo
 * y la comparación entre tomas MIENTE. No es una regla de diseño, es de
 * honestidad del dato — y en un canal que cita cifras de norma, no es opcional.
 */
const escalaHonesta: ReglaG<PiezasGraficos> = (plan) => {
  const conBarras: { id: string; max: boolean }[] = [];
  for (const t of plan.tomas) {
    let hay = false;
    let conMax = false;
    const anda = (ns: readonly Nodo<PiezasGraficos, Tinta>[]): void => {
      for (const n of ns) {
        if ("pieza" in n) {
          if (n.pieza === "barras") {
            hay = true;
            if ((n.props as { max?: number }).max !== undefined) conMax = true;
          }
          if (n.dentro) anda(n.dentro);
        } else anda(n.hijos);
      }
    };
    anda(t.hijos);
    if (hay) conBarras.push({ id: t.id, max: conMax });
  }
  if (conBarras.length < 2) return [];
  const sinMax = conBarras.filter((x) => !x.max).map((x) => x.id);
  return sinMax.length > 0
    ? [`[${sinMax.join(", ")}] varias gráficas de barras sin \`max\`: cada una se autoescala y la comparación entre tomas miente`]
    : [];
};

/**
 * Hueco de 1 a 4 frames entre dos tomas que cubren: siempre es un off-by-one y
 * se ve como un parpadeo del avatar en negro. Los huecos GRANDES son guion (50
 * frames entre dos tomas que cubren son una ventana en la que manda el avatar).
 */
const huecosSospechosos: ReglaG<PiezasGraficos> = (plan) => {
  const av: string[] = [];
  const cubren = plan.tomas
    .filter((t) => plan.dialecto.moldes[t.molde] && plan.dialecto.moldes[t.molde].cubre)
    .map((t) => ({ id: t.id, v: ventanaAbs(t.ventana, plan.formato.duracion) }))
    .sort((a, b) => a.v[0] - b.v[0]);
  for (let i = 1; i < cubren.length; i++) {
    const h = cubren[i].v[0] - cubren[i - 1].v[1];
    if (h > 0 && h <= 4)
      av.push(`[${cubren[i - 1].id} → ${cubren[i].id}] hueco de ${h} f entre dos tomas a pantalla completa: parpadeo del avatar`);
  }
  return av;
};

/** La atmósfera acompaña, no cuenta: un hero en molde `capa` casi siempre son
 *  partículas ascendidas a protagonista. */
const ambienteNoEsHero: ReglaG<PiezasGraficos> = (plan) =>
  plan.tomas
    .filter((t) => t.molde === "capa" && t.jerarquia === "hero")
    .map((t) => `[${t.id}] una capa de atmósfera no puede ser "hero"`);

/** Un hero largo en un molde que NO cubre y sin scrim es texto sobre la cara. */
const r08Encuadre: ReglaG<PiezasGraficos> = (plan) => {
  const av: string[] = [];
  for (const t of plan.tomas) {
    const mo = plan.dialecto.moldes[t.molde];
    if (!mo || mo.cubre || mo.scrim !== false || t.jerarquia !== "hero") continue;
    const [a, b] = ventanaAbs(t.ventana, plan.formato.duracion);
    if (b - a >= Math.round(plan.formato.fps * 1.5) && t.molde !== "franja")
      av.push(`[${t.id}] hero ${b - a} f sin scrim ni cobertura: o va a "sello"/"franja", o es una toma "pantalla" (R08)`);
  }
  return av;
};

/* ── El dialecto ────────────────────────────────────────────────────────── */

/**
 * LA LETRA POR DEFECTO DE ESTA CAPA: Inter.
 *
 * No es la voz de ningún canal, es una decisión de LEGIBILIDAD: esta capa se
 * dibuja encima de vídeo que no controla, y una display de marca sobre una
 * imagen movida se cae. Por eso el dialecto trae la suya en vez de heredar la
 * de la marca — y por eso un canal la puede sobrescribir a sabiendas con
 * `marca.letraPorCapa.graficos`, que es una decisión informada y no un
 * arrastre.
 *
 * El peso 500 apunta a `inter600` porque no hay tabla medida de Inter 500: es
 * el lado seguro de la regla de `LetraMarca.tablas` (ante un peso sin medir, el
 * SUPERIOR). Sobreestimar da un aviso de más; subestimar publica un titular
 * cortado.
 */
export const LETRA_GRAFICOS: LetraMarca = {
  display: theme.fontFamily,
  texto: theme.fontFamily,
  tablas: { 500: "inter600", 600: "inter600", 700: "inter700", 800: "inter800" },
};

/** La letra de esta capa para una marca: la suya si la pide, Inter si no. */
export const letraGraficosDe = (m: MarcaCanal): LetraDialecto => letraDe(m, "graficos", LETRA_GRAFICOS);

export const GRAFICOS = {
  nombre: "graficos",
  marca: MARCA_BASE,
  letra: letraGraficosDe(MARCA_BASE),
  piezas: PIEZAS,
  beats: BEATS_GRAFICOS,
  moldes: MOLDES_GRAFICOS,
  paleta: PALETA_MARCA,
  // Sobre vídeo oscuro el texto nace BLANCO: es lo que ya hacía el intérprete
  // con su `paleta["texto"]` cableado. Ahora lo dice el dialecto, que es quien
  // puede saberlo (el editorial contesta "tinta", y no tiene ningún "texto").
  tintaBase: "texto" as Tinta,
  // Base 1080 de ancho. El intérprete la escala con `escalaPorAncho()`. Es EL
  // MISMO objeto que consultan las fichas (`ESCALA`, arriba): de aquí sale
  // `ctx.escalaRol` y de ahí el cuerpo que se dibuja, así que compartirlo es lo
  // que impide que estimación y dibujo vuelvan a divergir.
  escala: ESCALA,
  // Lo que antes se repetía a mano en cada escena: apoyo = el MISMO color
  // del hero rebajado (no gris), contexto = neutro.
  alfaRol: { hero: 1, apoyo: 0.88, contexto: 0.82 } as Record<Rol, number>,
  ley: LEY_BLANDA,
  reglas: [escalaHonesta, huecosSospechosos, ambienteNoEsHero, r08Encuadre] as readonly ReglaG<PiezasGraficos>[],
};

export type DialectoGraficos = typeof GRAFICOS;

/**
 * Un proyecto arranca del dialecto del canal y cambia lo suyo: su ley, su
 * paleta y sus piezas propias. Eso es todo lo que separa a una pieza de barrido
 * duro, malla y eje de tiempo de otra de muelle y mockups de UI.
 */
export function dialectoDe<R extends PiezasGraficos>(cambios: {
  piezas: R;
  /** El canal para el que se monta. Sin él, el del sistema. */
  marca?: MarcaCanal;
  ley?: Ley;
  paleta?: Record<Tinta, string>;
  escala?: Record<Rol, number>;
  reglas?: readonly Regla<R, BeatGrafico, MoldeGrafico, Tinta>[];
}) {
  const base = GRAFICOS.reglas as unknown as readonly Regla<R, BeatGrafico, MoldeGrafico, Tinta>[];
  return {
    nombre: GRAFICOS.nombre,
    marca: cambios.marca ?? GRAFICOS.marca,
    letra: letraGraficosDe(cambios.marca ?? GRAFICOS.marca),
    piezas: cambios.piezas,
    beats: BEATS_GRAFICOS,
    moldes: MOLDES_GRAFICOS,
    paleta: cambios.paleta ?? PALETA_MARCA,
    tintaBase: GRAFICOS.tintaBase,
    escala: cambios.escala ?? GRAFICOS.escala,
    alfaRol: GRAFICOS.alfaRol,
    ley: cambios.ley ?? GRAFICOS.ley,
    // Las reglas del canal siguen valiendo: un proyecto AÑADE, no quita.
    reglas: base.concat(cambios.reglas ?? []),
  };
}

/** Alto estimado del bloque de una toma (¿me cabe en la franja alta?). */
export const altoDeToma = <R extends PiezasGraficos>(
  plan: Plan<R, BeatGrafico, MoldeGrafico, Tinta>,
  id: string
): number => {
  const t = plan.tomas.filter((x) => x.id === id)[0];
  if (!t) return 0;
  const mo = plan.dialecto.moldes[t.molde];
  let total = 0;
  t.hijos.forEach((h, i) => {
    total += alturaEstimada(h, plan.dialecto.piezas, mo.gap, plan.dialecto.letra) + (h.sep ?? 0);
    if (i < t.hijos.length - 1) total += gapEntre(t.gap, i, mo.gap);
  });
  return total;
};

/** Reexport explícito para que el barril no tenga que adivinar. */
export { capa, solapan };
