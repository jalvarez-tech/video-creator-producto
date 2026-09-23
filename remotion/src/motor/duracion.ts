import { parseMedia } from "@remotion/media-parser";
import { staticFile } from "remotion";

/**
 * LA DURACIÓN LA MANDA EL MEDIO, no un número copiado a mano.
 *
 * Por qué existe este archivo: `durationInFrames` estaba escrito literal en
 * Root.tsx para cada composición atada a un clip (1091, 883, 1153…), cuadrando
 * con el `nb_frames` que dio `ffprobe` el día que se montó. Mientras nadie toque
 * el clip, cuadra. Pero regenerar el avatar (HeyGen + auto-editor) es el flujo
 * NORMAL aquí, y al hacerlo el número se queda viejo sin que nada falle: si el
 * clip nuevo es más corto sale cola negra, y si es más largo se corta la última
 * frase. Un fallo que solo se ve mirando el vídeo entero.
 *
 * Con `calculateMetadata` el número se lee del archivo en cada render, así que
 * el problema deja de existir en vez de haber que acordarse.
 */

/** Segundos reales de un medio de `public/`, o null si no se puede leer. */
const segundosDe = async (nombre: string): Promise<number | null> => {
  try {
    const { slowDurationInSeconds } = await parseMedia({
      src: staticFile(nombre),
      fields: { slowDurationInSeconds: true },
      acknowledgeRemotionLicense: true,
    });
    return slowDurationInSeconds > 0 ? slowDurationInSeconds : null;
  } catch {
    // El clon nuevo NO tiene los MP4 (están gitignorados: son material, no
    // código). Que el Studio abra igual es deliberado; el README dice qué falta.
    return null;
  }
};

/**
 * Frames que dura `nombre` al fps de la comp. Si el medio no está, cae al
 * `respaldo` — el número que había escrito a mano — y lo avisa por consola en
 * vez de reventar: así un clon sin material sigue abriendo el Studio.
 *
 * `Math.round` y no `ceil`: el clip ya trae un número ENTERO de frames, así que
 * `duracion × fps` cae sobre un entero salvo por el error del float. Redondear
 * da ese entero; `ceil` daría uno de más, y ese frame extra no existe en el
 * vídeo — sale congelado o negro al final. (Para el AUDIO es al revés y por eso
 * `framesDePlanYVoz` sí usa `ceil`: una locución no tiene frames, y truncar
 * hacia abajo se come hasta 1/fps de segundo de la última palabra.)
 */
export const framesDelMedio = async (
  nombre: string,
  fps: number,
  respaldo: number
): Promise<number> => {
  const s = await segundosDe(nombre);
  if (s === null) {
    console.warn(
      `[duracion] No se pudo leer public/${nombre}: uso ${respaldo} f de respaldo.\n` +
        `           Repón el medio (ver README §"Qué NO está en el repo") para que la duración sea la real.`
    );
    return respaldo;
  }
  return Math.round(s * fps);
};

/**
 * Duración de una pieza que tiene PLAN y VOZ: la mayor de las dos.
 *
 * El plan se cronometra contra la voz, así que normalmente coinciden. Pero al
 * relocutar (otra voz, otro motor) el audio cambia de largo y el plan no. Si la
 * comp se quedara con el plan, una locución más larga se cortaría en seco a
 * mitad de frase; quedándose con la mayor, se oye entera.
 *
 * ⚠️ OJO CON LA COLA: `<PistaNoticia>` monta cada toma en su <Sequence>, así que
 * pasado el último `endFrame` NO hay nada — los frames sobrantes salen NEGROS,
 * no con la última toma sostenida. Es el fallo barato de los dos (se ve, se
 * arregla), pero no es un final publicable: si esto avisa, RECRONOMETRA el plan
 * con `generar-vo.mjs` en vez de dejar la cola.
 */
export const framesDePlanYVoz = async (
  audio: string,
  fps: number,
  framesDelPlan: number
): Promise<number> => {
  const s = await segundosDe(audio);
  if (s === null) {
    console.warn(
      `[duracion] No se pudo leer public/${audio}: uso los ${framesDelPlan} f del plan.\n` +
        `           La comp renderiza, pero SIN VOZ (staticFile solo construye una URL: verás un 404).`
    );
    return framesDelPlan;
  }
  const frames = Math.ceil(s * fps);
  if (frames > framesDelPlan) {
    console.warn(
      `[duracion] La voz (${frames} f) dura más que el plan (${framesDelPlan} f): la comp se alarga\n` +
        `           ${frames - framesDelPlan} f, y esos frames salen EN NEGRO. Recronometra el plan:\n` +
        `           node manuales/video-noticias/scripts/generar-vo.mjs <guion> --fps ${fps}`
    );
  }
  return Math.max(framesDelPlan, frames);
};
