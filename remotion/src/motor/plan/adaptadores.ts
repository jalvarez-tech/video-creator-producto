/**
 * PROYECCIONES A `CuePlano` — el único sitio donde las capas viejas se traducen
 * al sustrato común de `nucleo.ts`.
 *
 * Vive APARTE del núcleo a propósito: aquí sí hay imports (de tipos), y el
 * núcleo no puede tener ninguno o deja de poder validarse con `node` a secas.
 * Son `import type` en ambos casos, así que este archivo tampoco arrastra React
 * ni Remotion a tiempo de ejecución.
 *
 * Sin esto `revisaMontaje` no tiene ni un llamador posible: nada más en el repo
 * sabe convertir `TomaNoticia[]` ni `CameraCue[]` a `CuePlano`, y un validador
 * al que no se le puede pasar el dato real es un validador que siempre devuelve
 * la lista vacía.
 */
import type { CameraCue } from "../camara";
import { REGISTRO_POR_TIPO, type TomaNoticia } from "../noticias/plan";
import type { CuePlano, MovimientoPlano } from "./nucleo";

/**
 * `TomaNoticia[]` → `CuePlano[]`.
 *
 * Las dos decisiones que deciden si las reglas de cámara disparan van ESCRITAS,
 * no supuestas:
 *   · `cubre: true`     — el formato noticia es pantalla completa y sin avatar:
 *                         los dos registros (`papel` y `cine`) traen su fondo.
 *   · `jerarquia:"hero"`— la noticia es SUCESIÓN, no capas: la toma en pantalla
 *                         es siempre la protagonista porque no hay otra.
 * Si algún día una noticia lleva una capa encima, las dos dejan de ser ciertas y
 * hay que derivarlas del tipo de toma. Dejarlas constantes en `false` apagaría
 * la regla de reposo entera SIN decir que se ha quedado muda.
 *
 * `molde` es el REGISTRO, no el tipo: son los dos moldes del dialecto de
 * noticias, y es lo que decide de qué color es el mundo de la toma.
 */
export const desdeNoticia = (tomas: readonly TomaNoticia[], capa = "noticia"): CuePlano[] =>
  tomas.map((t) => ({
    capa,
    id: t.id,
    ventana: [t.startFrame, t.endFrame] as readonly [number, number],
    jerarquia: "hero" as const,
    beat: t.beat,
    molde: t.registro ?? REGISTRO_POR_TIPO[t.tipo],
    cubre: true,
    sonido: t.soundCueId,
  }));

/**
 * `CameraCue[]` → `MovimientoPlano[]`.
 *
 * `purpose` se copia tal cual y eso es deliberado: `MovimientoPlano.purpose` es
 * la unión cerrada `Proposito`, espejo de `CameraPurpose`. Si alguien añade un
 * propósito en camara.ts, ESTA línea deja de compilar y obliga a decidir en el
 * núcleo si compite con un gráfico hero — antes entraba callado en el grupo de
 * los que compiten.
 */
export const desdeCamara = (cues: readonly CameraCue[]): MovimientoPlano[] =>
  cues.map((c) => ({
    id: c.id,
    startFrame: c.startFrame,
    endFrame: c.endFrame,
    purpose: c.purpose,
    sonido: c.soundCueId,
    // El muelle ignora endFrame (camara.ts §CameraCue). Se marca aquí para que
    // el validador pueda decir que no sabe, en vez de cruzar una ventana falsa.
    muelle: c.easing === "spring",
  }));
