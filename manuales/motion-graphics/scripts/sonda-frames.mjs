#!/usr/bin/env node
/**
 * sonda-frames.mjs — CAPTURA una tanda de frames de referencia.
 *
 * Uso (desde cualquier sitio):
 *   node manuales/motion-graphics/scripts/sonda-frames.mjs antes      # → remotion/out/sonda/antes
 *   node manuales/motion-graphics/scripts/sonda-frames.mjs despues
 *   node manuales/motion-graphics/scripts/revisar-sonda.mjs antes despues
 *
 *   --muestras N   frames por composición (por defecto 8)
 *   --escala E     escala de render (por defecto 0.4)
 *   --comps A,B    solo esas composiciones (entre comillas si tu shell parte las comas)
 *   --frames a,b   frames EXACTOS, en vez del reparto automático
 *   --todas        no saltar las composiciones a las que les falta su medio (ver abajo)
 *
 * ⚠️ EL MUESTREO REPARTIDO SE SALTA LAS TOMAS CORTAS, y eso invalida pruebas sin
 * avisar. Pasó de verdad: al comprobar un cambio en los chips de una pieza
 * editorial —que viven en [1633,1767]— la sonda muestreaba 1606 y 1874 y pasaba
 * por encima; el resultado fue «no cambia nada», que era falso. Los 8 frames de
 * reparto sirven para detectar REGRESIONES en toda la pieza; para PROBAR que un
 * cambio hace lo que dice, localiza primero en qué tomas está la pieza afectada
 * y apunta ahí con `--frames`.
 *
 * POR QUÉ EXISTE. El repo ya usaba esta técnica a mano —`sonda-ANTES.png` vs
 * `sonda-DESPUES.png` está citado en el comentario de `PistaGraficos.tsx` que
 * explica por qué la tinta del molde es el defecto— y era el ÚNICO control de
 * no-regresión visual que había. A mano no escala: en cuanto un cambio toca el
 * núcleo o un theme, hay que mirar todas las composiciones, no una.
 *
 * QUÉ GARANTIZA Y QUÉ NO. Dice si un cambio movió píxeles y cuántos. NO dice si
 * el cambio es correcto: para eso está la prueba POSITIVA (mover a propósito el
 * valor que se acaba de parametrizar y comprobar que el render lo obedece). Las
 * dos hacen falta. Un refactor que no mueve nada puede haber desconectado el
 * gancho que decía arreglar, y eso solo lo caza la positiva.
 *
 * ⚠️ TIENE SUELO DE RUIDO, y por eso `revisar-sonda.mjs` usa un umbral. Dos
 * tandas con EL MISMO código mueven 2-3 frames de 136: los que llevan
 * <OffthreadVideo> (el seek del decodificador no cae siempre en el mismo sitio)
 * y los de degradados grandes. Medido: delta máx ≤ 8, repartido por miles de
 * píxeles. Un cambio de color de marca no se parece en nada — delta de 200-255
 * concentrado en menos del 1 % del cuadro.
 *
 * COMPOSICIONES SIN SU MEDIO. Las comps atadas a un clip leen su duración del
 * archivo (`calculateMetadata`); si el archivo no está —un clon sin el material
 * del estudio— caen al número de respaldo y lo avisan por consola, y luego el
 * render de cada frame falla con un 404. Por defecto la sonda las DETECTA por
 * ese aviso y las salta, diciéndolo: así una instalación limpia sondea las
 * composiciones del producto sin veintisiete fallos de material que no es
 * suyo. `--todas` las fuerza (y entonces cuentan como fallo si no renderizan).
 * Las comps con duración fija que usan un medio ausente no se detectan aquí:
 * fallan en el render y se ven en la cuenta.
 *
 * CON QUÉ CHROME. Con el de `@remotion/renderer`, el mismo binario que
 * renderiza los vídeos, igual que `medir-anchos.mjs`. Y con `gl: "swangle"`,
 * que es software puro: la GPU del host haría que la sonda midiera la máquina.
 *
 * Los PNG van a `remotion/out/`, que está en .gitignore: son evidencia de un
 * cambio concreto, no material del repo.
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { RAIZ, esMain, log, relativa } from "../../../herramientas/comun.mjs";

export const root = RAIZ;
export const dirSonda = path.join(root, "remotion", "out", "sonda");

/** `remotion/out/sonda/<nombre>`, o la ruta tal cual si es absoluta. */
export const rutaTanda = (nombre) => (path.isAbsolute(nombre) ? nombre : path.join(dirSonda, nombre));

const arg = (bandera, defecto) => {
  const i = process.argv.indexOf(bandera);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : defecto;
};

/** El aviso que emite `motor/duracion.ts` cuando un medio no está y cae al respaldo. */
const RESPALDO = /\[duracion\] No se pudo leer public\//;

async function main() {
  const nombre = process.argv[2];
  if (!nombre || nombre.indexOf("--") === 0) {
    console.error("uso: sonda-frames.mjs <nombre-tanda> [--muestras N] [--escala E] [--comps A,B] [--frames a,b] [--todas]");
    process.exit(1);
  }
  const muestras = Number(arg("--muestras", 8));
  const escala = Number(arg("--escala", 0.4));
  const filtro = arg("--comps", "");
  const soloEstas = filtro ? filtro.split(",").map((s) => s.trim()) : null;
  const pedidos = arg("--frames", "");
  const framesFijos = pedidos ? pedidos.split(",").map((s) => Number(s.trim())) : null;
  const todas = process.argv.indexOf("--todas") >= 0;

  const require = createRequire(path.join(root, "remotion", "package.json"));
  const { bundle } = require("@remotion/bundler");
  const { getCompositions, renderStill, selectComposition } = require("@remotion/renderer");

  const salida = rutaTanda(nombre);
  fs.mkdirSync(salida, { recursive: true });

  console.log(
    `\n🎞  sonda «${nombre}» · ${framesFijos ? `frames ${framesFijos.join(",")}` : `${muestras} frames/comp`} · escala ${escala}`
  );
  const servido = await bundle({ entryPoint: path.join(root, "remotion", "src", "index.ts") });

  // Los avisos de respaldo salen aquí, al resolver TODAS las comps de golpe;
  // no dicen de qué comp vienen, solo QUE hay medios ausentes.
  let hayRespaldo = false;
  let comps = await getCompositions(servido, {
    onBrowserLog: (l) => {
      if (RESPALDO.test(l.text)) hayRespaldo = true;
    },
  });
  if (soloEstas) comps = comps.filter((c) => soloEstas.indexOf(c.id) >= 0);

  // Solo si hubo avisos (en el estudio, con todo el material, no los hay y esto
  // no cuesta nada): se resuelve cada comp POR SEPARADO para saber cuáles
  // cayeron al respaldo. Cuesta un arranque de página por comp; es el precio de
  // no adivinar por el nombre del archivo.
  const saltadas = [];
  if (hayRespaldo && !todas) {
    const conMaterial = [];
    for (const c of comps) {
      let cae = false;
      await selectComposition({
        serveUrl: servido,
        id: c.id,
        logLevel: "error",
        onBrowserLog: (l) => {
          if (RESPALDO.test(l.text)) cae = true;
        },
      });
      (cae ? saltadas : conMaterial).push(cae ? c.id : c);
    }
    comps = conMaterial;
    if (saltadas.length) {
      log.aviso(
        `${saltadas.length} composición(es) sin su medio (calculateMetadata cayó al respaldo) se saltan: ${saltadas.join(", ")}\n` +
          `   Repón el material o pásame --todas para forzarlas.`
      );
    }
  }

  let fallos = 0;
  let hechos = 0;
  for (const c of comps) {
    // Repartidos por la duración, sin el frame 0 (donde media la maqueta aún no
    // ha entrado) ni el último. Deterministas: la misma comp da los mismos
    // frames en las dos tandas, que es lo que hace comparables los nombres.
    // Con `--frames`, los que se pidan: ver la ⚠️ de la cabecera.
    const paso = c.durationInFrames / (muestras + 1);
    const lista =
      framesFijos ??
      Array.from({ length: muestras }, (_, i) => Math.round(paso * (i + 1)));
    let ok = 0;
    for (const bruto of lista) {
      const frame = Math.max(0, Math.min(c.durationInFrames - 1, bruto));
      try {
        await renderStill({
          composition: c,
          serveUrl: servido,
          output: path.join(salida, `${c.id}__f${String(frame).padStart(5, "0")}.png`),
          frame,
          scale: escala,
          imageFormat: "png",
          chromiumOptions: { gl: "swangle" },
        });
        ok++;
        hechos++;
      } catch (e) {
        fallos++;
        console.error(`   ✗ ${c.id} f${frame}: ${String(e).slice(0, 140)}`);
      }
    }
    console.log(`   ${ok === lista.length ? "✓" : "⚠"} ${c.id.padEnd(16)} ${ok}/${lista.length}`);
  }

  console.log(
    `\n${hechos} frames en ${relativa(salida)}${fallos ? ` · ${fallos} fallos` : ""}${saltadas.length ? ` · ${saltadas.length} comps saltadas` : ""}\n`
  );
  process.exit(fallos > 0 ? 1 : 0);
}

// Solo corre si se invoca directamente: `revisar-sonda.mjs` importa `rutaTanda`.
// `esMain` compara rutas reales: llegar por el enlace .claude/skills/… también cuenta.
if (esMain(import.meta.url)) {
  await main();
}
