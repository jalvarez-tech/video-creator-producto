/**
 * INTER EMPAQUETADA — la única tipografía que el producto GARANTIZA.
 *
 * Todo lo que el motor dibuja con la pila `PILA_INTER` (`motor/marca.ts`) pide
 * la familia "Inter" y, hasta hoy, la encontraba solo si estaba INSTALADA en la
 * máquina que renderiza. Sin ella Chrome cae a la siguiente de la pila —San
 * Francisco en un Mac, Segoe UI en Windows— y las tablas `inter*` de R09 dejan
 * de corresponder con lo que se pinta: la validación estima con una fuente y el
 * render maqueta con otra. Una Inter instalada de OTRA versión (4.x) tampoco
 * vale: tiene otras métricas.
 *
 * Aquí se registra la familia "Inter" con los nueve OTF de Inter 3.019 (licencia
 * SIL OFL 1.1; los archivos y su `OFL.txt` están en `remotion/public/fuentes/inter/`,
 * y `fuentes-inter.datos.ts` es su copia en base64, generada por
 * `manuales/motion-graphics/scripts/empaquetar-fuentes.mjs`). Una familia web
 * con ese nombre TAPA por completo a cualquier Inter local, sea la versión que
 * sea, así que todas las máquinas pintan los mismos bytes. Los nueve pesos y no
 * solo los que se usan: si falta uno, CSS elige el más cercano de los cargados y
 * una pieza que pida 900 saldría en 800.
 *
 * POR QUÉ LOS BYTES VAN EN EL BUNDLE Y NO POR `staticFile()`. Con la fuente
 * servida por el servidor de archivos de Remotion, un render con varias
 * pestañas y decenas de `<OffthreadVideo>` de clips grandes deja las nueve
 * peticiones de la fuente detrás de las de vídeo, y el `delayRender` de la
 * fuente muere por timeout aunque el render fuera a salir: dos montajes de dos
 * minutos fallaban con 238 s de plazo y la fuente por red, y salen con los bytes
 * en el bundle. `FontFace` acepta un ArrayBuffer: no hay petición que esperar.
 *
 * SOLO RUNTIME. `FontFace` no existe en node. Por eso este módulo lo importa
 * ÚNICAMENTE `Root.tsx` (`import "./motor/fuentes"`) y nunca un archivo de
 * datos: `theme.ts`, `marca.ts`, `estilos.ts`, `coreografia.ts` o `dialecto.ts`
 * los empaquetan con esbuild los scripts de `node` (`medir-anchos`,
 * `revisar-marca`, `generar-catalogo`) y con esto dentro (3 MB de fuente)
 * dejarían de arrancar o pesarían de más.
 *
 * SIN `delayRender`. Remotion espera `document.fonts.ready` antes de capturar
 * cada frame (`@remotion/renderer`, seek-to-frame), y una cara añadida con
 * `document.fonts.add()` y en carga forma parte de esa espera: la fuente está
 * lista antes del primer píxel sin que haga falta retener el render. Con
 * `delayRender` la cuenta empezaba al abrir la pestaña y, en montajes largos
 * con decenas de clips, la pestaña tardaba más que el plazo del render en llegar
 * a ejecutar la continuación: el render moría «por las fuentes» cuando lo lento
 * era el vídeo (medido con dos montajes de dos minutos, 238 s de plazo).
 *
 * SI UNA CARA FALLA (bytes corruptos, un navegador sin `FontFace`), se AVISA en
 * consola y se sigue con la fuente de respaldo de la pila: un render que sale
 * con un aviso se puede repetir; uno que no sale, no.
 *
 * UNA SOLA VEZ. La promesa se guarda a nivel de módulo para que un segundo
 * import (o un hot reload del Studio) no vuelva a registrar nada.
 */
import { INTER_OTF } from "./fuentes-inter.datos";

let carga: Promise<void> | null = null;

/** base64 → bytes, sin `Buffer` (esto corre en el navegador). */
const bytesDe = (b64: string): ArrayBuffer => {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
};

const cargarPeso = async (peso: number, b64: string): Promise<void> => {
  try {
    const cara = new FontFace("Inter", bytesDe(b64), {
      weight: String(peso),
      style: "normal",
      // `block`: mientras carga no se pinta con la fuente de respaldo.
      display: "block",
    });
    // Primero en el conjunto y luego a cargar: así `document.fonts.ready`, que
    // Remotion espera antes de cada captura, incluye esta cara.
    document.fonts.add(cara);
    await cara.load();
  } catch (e) {
    console.warn(
      `[fuentes] Inter ${peso} no se pudo registrar (${String(e)}): se pinta con la siguiente fuente de la pila. ` +
        "Si esta máquina tiene Inter 3.019 instalada el resultado es el mismo; si no, la tipografía NO es la del producto."
    );
  }
};

/**
 * Registra la familia "Inter" (los nueve pesos) una sola vez y devuelve la
 * promesa de que están registradas (o de que se avisó de cuáles no).
 */
export const cargarInter = (): Promise<void> => {
  if (!carga) {
    if (typeof FontFace === "undefined" || typeof document === "undefined") {
      carga = Promise.resolve(); // node, o un entorno sin fuentes: no hay nada que registrar
    } else {
      carga = Promise.all(Object.entries(INTER_OTF).map(([peso, b64]) => cargarPeso(Number(peso), b64))).then(() => undefined);
    }
  }
  return carga;
};

/** Las fuentes del producto, ya en marcha. Se resuelve cuando Inter está lista. */
export const fuentesListas: Promise<void> = cargarInter();
