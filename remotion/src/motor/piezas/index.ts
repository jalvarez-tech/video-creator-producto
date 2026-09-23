/**
 * EL REGISTRO COMPARTIDO — las piezas que sirven a CUALQUIER capa.
 *
 * El problema que cierra, en una frase: `<Subrayado>`, `<Rodea>`, `<Flecha>`,
 * `<Check>` y `<Aspa>` están escritos desde el primer día y el README dice que
 * «las primitivas neutras sí se reusan en ambos» — pero eso era cierto en JSX y
 * FALSO desde un plan. `capa()` (nucleo.ts) ata los constructores a UN dialecto
 * y `Montadores<R,…>` es un mapeado total sobre SU registro, así que una toma
 * editorial no podía pedir un subrayado aunque el componente existiera. El
 * dialecto editorial tiene once piezas y ninguna dibuja un trazo.
 *
 * EL CONTRATO DE ADMISIÓN, y no es una recomendación: es lo que el compilador
 * puede sostener.
 *
 *   1. PINTA SOLO CON `ctx.color`. Nada de `ctx.tinta("acento")` ni ninguna
 *      literal. Las uniones de tinta de las dos capas son DISJUNTAS —
 *      graficos: marca·dato·perdida·logro·neutro·texto·fondo
 *      noticias: tinta·suave·blanco·acento·resalte·papel
 *      intersección: VACÍA— así que un montador genérico en `C` no tiene ni un
 *      nombre que pueda escribir. `ctx.color` no es una limitación sino la
 *      respuesta correcta: ya viene resuelto contra `molde.tinta`, o sea que es
 *      el color con el que se lee sobre ESE fondo. Un trazo compartido sale
 *      carbón sobre papel y blanco sobre cine sin saber en cuál está.
 *
 *   2. SUS PROPS NO NOMBRAN TINTAS. Si una pieza necesita colorear partes por
 *      separado (`lista` pinta el estado con `logro`/`perdida`, `barras` acepta
 *      una tinta por serie), no entra: esos nombres solo existen en gráficos.
 *      Entrará el día que las dos capas acuerden un vocabulario semántico
 *      común, que es una decisión de diseño y no un refactor.
 *
 *   3. ES POLARIDAD-NEUTRA. Nada de `SOMBRA.texto` obligatoria ni de cajas
 *      traslúcidas casi negras. Un trazo es geometría; un titular no lo es, y
 *      por eso los cuatro roles tipográficos NO están aquí.
 *
 * QUÉ HAY DENTRO Y POR QUÉ SON ÉSTAS: las seis que cumplen las tres reglas
 * mirando el código, no a ojo. `regla` (línea recta mecánica) y las cinco de
 * trazo dibujado. Se comprobó una a una que su montador no toca `c.tinta`.
 *
 * DÓNDE VIVE CADA MITAD. Aquí las FICHAS (datos puros: qué props, cuánto mide,
 * qué avisa). Los MONTADORES viven en `montadores.tsx`, al lado, porque llevan
 * JSX y esta capa tiene que poder leerse con `node` pelado igual que el núcleo.
 */
import { registro } from "../plan/nucleo";
import type { Ficha } from "../plan/nucleo";

/** Un punto del lienzo, en px base 1080. Igual que en el dialecto de gráficos. */
export type Punto = readonly [number, number];

/** Azúcar local para escribir una ficha sin repetir el orden de los campos.
 *  Copia exacta de la `f()` de cada dialecto: la ficha es la misma cosa. */
const f = <P,>(
  nombre: string,
  familia: string,
  archivo: string,
  que: string,
  cuando: string,
  resto: Partial<Ficha<P>> = {}
): Ficha<P> => ({ nombre, familia, archivo, que, cuando, ...resto });

export const PIEZAS_COMUNES = registro({
  regla: f<{ ancho?: number; alto?: number; dur?: number; gira?: number }>(
    "Regla", "dato", "Datos.tsx", "Línea recta que se extiende mecánicamente.",
    "Subrayado MECÁNICO. Con `estira` toma el ancho del bloque y desaparece el número a ojo. `gira` la convierte en tachón.",
    // `estira` NO se puede consultar aquí (la ficha solo ve las props de la
    // pieza, y `estira` es del NODO). No hace falta: cuando el plan escribe
    // `estira: true` no escribe `ancho`, así que se mide el defecto de 430 —
    // que cabe en cualquier molde y por tanto no inventa un aviso. Y un nodo
    // estirado es `width: 100%` del bloque: por construcción no puede salirse.
    { alto: (p) => p.alto ?? 6, ancho: (p) => p.ancho ?? 430 }),

  subrayado: f<{ ancho?: number; dur?: number; semilla?: string; grosor?: number; amplitud?: number }>(
    "Subrayado", "trazo", "Trazo.tsx", "Línea a mano alzada bajo una palabra.",
    "`semilla` distinta = otro trazo con el mismo gesto (en v1 dos subrayados salían IDÉNTICOS).",
    // `<Subrayado>` monta un SVG de ancho FIJO: no honra `estira` (solo `regla`
    // lo hace). Por eso el ancho está siempre en las props y R09 puede leerlo.
    { sonido: "scribble", alto: (p) => (p.grosor ?? 8) + 12, ancho: (p) => p.ancho ?? 520 }),

  rodea: f<{ ancho?: number; alto?: number; dur?: number; semilla?: string; vueltas?: number; grosor?: number }>(
    "Rodea", "trazo", "Trazo.tsx", "Óvalo de rotulador con exceso al cerrar.",
    "Señalar UNA cosa. Más de una por pieza y deja de señalar.",
    { sonido: "scribble / pen", alto: (p) => p.alto ?? 180, ancho: (p) => p.ancho ?? 520 }),

  flecha: f<{ de: Punto; a: Punto; curvatura?: number; cabeza?: boolean; dur?: number; grosor?: number }>(
    "Flecha", "trazo", "Trazo.tsx", "Arco de A a B con punta orientada por la tangente.",
    "`curvatura` 0 = causa directa; curva = rodeo. Significan distinto.",
    {
      sonido: "swoosh",
      alto: (p) => Math.abs(p.a[1] - p.de[1]) + (p.grosor ?? 8),
      // Espejo exacto del alto sobre el otro eje: la flecha ocupa el rectángulo
      // que va de `de` a `a`, engordado por el grosor del trazo.
      ancho: (p) => Math.abs(p.a[0] - p.de[0]) + (p.grosor ?? 8),
    }),

  check: f<{ px?: number; dur?: number; grosor?: number }>("Check", "trazo", "Trazo.tsx",
    "Marca de confirmación en dos tiempos naturales.", "Confirmación. Verde por defecto: el color es información.",
    { sonido: "success / chime", alto: (p) => p.px ?? 120, ancho: (p) => p.px ?? 120 }),

  aspa: f<{ px?: number; dur?: number; grosor?: number; retardo?: number }>("Aspa", "trazo", "Trazo.tsx",
    "Dos trazos cruzados EN SECUENCIA.", "Descarte. El `retardo` es lo que la hace gesto y no icono.",
    { sonido: "error / impact sharp", alto: (p) => p.px ?? 120, ancho: (p) => p.px ?? 120 }),
});

export type PiezasComunes = typeof PIEZAS_COMUNES;
