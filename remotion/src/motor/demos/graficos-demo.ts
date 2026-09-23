// Importa SOLO el dialecto (`graficos/coreografia`), nunca un componente: un
// plan es una lista de decisiones y no debe arrastrar ni una línea de JSX. Así
// se puede validar con Node sin montar React (ver `revisaPlan` más abajo).
import { capa, GRAFICOS } from "../graficos/coreografia";

/**
 * PLAN DE GRÁFICOS de ejemplo — la plantilla a copiar para un proyecto real
 * (en el 004 se llamaría `graficos-004.ts`, junto a `camara-004.ts` y `cues-004.ts`).
 *
 * Formato de referencia: 9:16 · 25 fps · 300 f (12 s).
 * Se monta con: <PistaGraficos plan={graficosDemo} montadores={MONTADORES_BASE} />
 *
 * QUÉ CAMBIÓ AL MIGRARLO (y por qué importa). Esto eran SIETE cues sueltos
 * (`GraficoCue[]`) y ahora son CINCO tomas. La diferencia no es de sintaxis:
 *   · el `dy: 310` DESAPARECE. Era el número que colgaba el subrayado por
 *     debajo del bloque «cifra + etiqueta» porque los dos cues compartían la
 *     banda `zona: "superior"` y nada los relacionaba. Aquí el subrayado es el
 *     tercer hijo de la MISMA columna: cae debajo porque está debajo, y si la
 *     etiqueta cambia de largo no hay ningún píxel que reajustar.
 *   · las partículas de ambiente y el confeti del cierre dejan de ser cues: son
 *     `ambiente` de una toma. Uno acompaña a toda la pieza (toma de molde
 *     `capa`), el otro nace y muere con el CTA — que es justo lo que significan.
 *   · el CTA deja de ser un `tipo: "sello"` y pasa a ser lo que siempre fue: una
 *     columna con PIEL de sello. La caja es un contenedor, no un gráfico.
 *
 * CÓMO SE ESCRIBE UN PLAN (el orden importa):
 *   1. Marca los frames desde la TRANSCRIPCIÓN real del clip, no desde el guion
 *      (proyectos/00X/transcripcion.json). El gráfico entra cuando la voz llega
 *      a la idea, ni antes ni después.
 *   2. Escribe el `reason` ANTES que el resto de la toma. El builder lo pide en
 *      esa posición a propósito: si no sale una frase honesta, esa toma no va.
 *   3. Marca la jerarquía. Solo UN `hero` a la vez — `revisaPlan()` lo comprueba.
 *   4. El ORDEN del array ES el z-order. Por eso la capa de atmósfera va PRIMERA:
 *      todo lo demás se dibuja encima de ella.
 *
 * Comprueba el plan antes de renderizar (lo hace también <PistaGraficos> en cada
 * render, por consola):
 *   console.log(revisaPlan(graficosDemo))   // [] = limpio
 */
const { pon, col, gfx, plan, tras } = capa(GRAFICOS, "gfx");

export const graficosDemo = plan({ ancho: 1080, alto: 1920, fps: 25, duracion: 300 }, [
  gfx(
    "g00-ambiente",
    "capa",
    "gancho",
    [8, 300],
    "ambiente",
    "Capa de atmósfera continua para que el fondo plano no se lea como imagen congelada",
    // Sin hijos A PROPÓSITO: una toma de molde `capa` es ambiente, no maqueta.
    // Todo lo que dibuja está en `ambiente`, que es lo que no ocupa sitio ni
    // compite con la cara. Va la PRIMERA del array porque el orden es el z-order.
    [],
    {
      ambiente: {
        // `dur` cubre la ventana entera: las motas flotan en bucle. Las 3 s de
        // tope que vigila `revisaPlan` son para las ráfagas de una toma que NO
        // es ambiente; ésta lo es, y por eso puede durar los 292 frames.
        particulas: { modo: "ambiente", n: 26, tintas: ["marca", "texto"], dur: 292 },
      },
    }
  ),

  gfx(
    "g01-gancho",
    "franja",
    "gancho",
    [8, 70],
    "hero",
    "Fija la promesa en pantalla mientras la voz la enuncia: el espectador la lee y la oye a la vez",
    [
      col([
        // El ROL es lo que reparte la atención dentro de la toma, y por eso se
        // declara: `contexto` rebaja el alfa del antetítulo y `hero` deja el
        // mensaje a plena tinta. Sin decirlo, los dos caen a `apoyo` y el
        // antetítulo pesa lo mismo que la frase que sí importa.
        pon("kicker", { rol: "contexto", texto: "el problema" }),
        pon("titular", { rol: "hero", px: 96, texto: "Tu embudo no vende" }),
      ]),
    ]
  ),

  gfx(
    "g02-dato",
    "franja",
    "prueba",
    [78, 150],
    "hero",
    "La magnitud ES el argumento: verla subir de 0 comunica el tamaño del problema mejor que decirlo",
    [
      col([
        pon("contador", {
          id: "cifra",
          rol: "hero",
          color: "dato",
          de: 0,
          a: 87,
          sufijo: "%",
          px: 150,
          dur: 40,
          golpe: true,
        }),
        // `tras(id)` = cuando la cifra ATERRIZA (acaba su entrada). El desfase
        // deja de estar copiado del frame absoluto del guion.
        pon("etiqueta", { texto: "de leads sin respuesta", en: tras("cifra", 4) }),
        // El remate cae cuando el número se ha parado, no antes: subrayar algo
        // que todavía está cambiando lo contradice. El `+40` es la cuenta de la
        // cifra, y sí, está escrito dos veces (aquí y en su `dur`): `tras()` sabe
        // cuándo termina la ENTRADA de un nodo, no cuándo termina la animación
        // interna de la pieza. Es el único número duplicado del plan.
        pon("subrayado", { color: "dato", ancho: 460, dur: 16, en: tras("cifra", 40) }),
      ]),
    ]
  ),

  gfx(
    "g03-solucion",
    "sello",
    "mecanismo",
    [155, 235],
    "hero",
    "Los tres puntos de la solución, escalonados al ritmo en que la voz los enumera",
    [
      col([
        pon("lista", {
          color: "logro",
          paso: 6,
          items: [
            { texto: "Contestas en 5 min" },
            { texto: "Sin turnos ni excusas" },
            { texto: "Cero leads perdidos" },
          ],
        }),
      ]),
    ]
  ),

  gfx(
    "g04-cta",
    "cta",
    "cta",
    [240, 300],
    "hero",
    "CTA en la banda de subtítulos, con scrim, en los últimos segundos: es la única acción que se pide",
    [
      // La caja del sello es una PIEL del grupo, no un gráfico: quien lleva el
      // borde es la columna que ya tiene la alineación y el gap.
      col(
        [
          pon("kicker", { rol: "contexto", texto: "siguiente paso" }),
          // `hero` por el ALFA, no por el tamaño (que lo fija `px`): es la única
          // acción que se pide en toda la pieza y tiene que leerse a plena tinta.
          pon("etiqueta", { rol: "hero", texto: "Escríbeme «EMBUDO»", px: 52 }),
        ],
        { piel: { caja: "sello", tinta: "logro" } }
      ),
    ],
    {
      ambiente: {
        // El confeti ya no es un cue con su propia ventana: nace y muere CON el
        // CTA, que es lo que significa «refuerza el cierre». 60 f de ráfaga —
        // continuo cansa, y `revisaPlan` avisa por encima de 3 s.
        particulas: { modo: "estallido", n: 50, tintas: ["logro", "dato", "texto"], dur: 60 },
      },
    }
  ),
]);
