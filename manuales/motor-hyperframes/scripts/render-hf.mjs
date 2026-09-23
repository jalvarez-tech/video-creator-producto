#!/usr/bin/env node
/**
 * render-hf.mjs — renderiza una pieza de HyperFrames pasando por las DOS puertas.
 *
 * Uso:
 *   node manuales/motor-hyperframes/scripts/render-hf.mjs 008            # prueba (draft)
 *   node manuales/motor-hyperframes/scripts/render-hf.mjs 008 --final    # final (high)
 *
 * POR QUÉ UN WRAPPER Y NO `npx hyperframes render` A PELO. Tres razones, y las
 * tres se descubren tarde si no está esto:
 *
 *   1. `render` a secas escribe en `renders/<nombre>_<timestamp>.mp4` RELATIVO AL
 *      CWD. En este repo las pruebas van a proyectos/NNN/pruebas-720p/ y los
 *      finales a proyectos/NNN/finales/ — las mismas carpetas que el otro motor.
 *      OJO con el nombre de la carpeta: aquí la prueba sale a LIENZO COMPLETO con
 *      `--quality draft` (rápida y ligera por bitrate), no reducida a la mitad
 *      como el `--scale=0.5` de Remotion en R06. Se comparte carpeta, no receta.
 *   2. Las puertas se saltan solas si no las llama nadie. Aquí son dos y no una:
 *      `revisar-hf.mjs` (los invariantes del repo) y `hyperframes check` (los
 *      píxeles). Ninguna sustituye a la otra.
 *   3. La telemetría del CLI habla con la red en cada invocación. No pinta nada
 *      en un pipeline de vídeo: se apaga aquí. Y HyperFrames va FIJADO a una
 *      versión (`hyperframes@0.8.47`): un `npx hyperframes` a pelo baja la última
 *      que haya, que puede cambiar el render de una pieza ya aprobada.
 *
 * El fps NO se pasa por flag a propósito: vive en `data-fps` de la composición,
 * que es donde `revisar-hf.mjs` lo vigila. Un `--fps` aquí sería un segundo sitio
 * donde equivocarse, y el que gana en silencio.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RAIZ, ejecutar, esMain, npx, numeroProyecto, posix, relativa } from "../../../herramientas/comun.mjs";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const REVISAR = path.join(AQUI, "revisar-hf.mjs");

/** Versión fijada del CLI. Cambiarla es una decisión, no una actualización. */
export const HYPERFRAMES = "hyperframes@0.8.47";

const USO = "Uso: node manuales/motor-hyperframes/scripts/render-hf.mjs <NNN> [--final]";

/** Entorno de los hijos: sin telemetría, sin avisos de versión, sin instalar nada solo. */
const ENTORNO = {
  HYPERFRAMES_NO_TELEMETRY: "1",
  HYPERFRAMES_NO_UPDATE_CHECK: "1",
  HYPERFRAMES_NO_AUTO_INSTALL: "1",
};

/** Si el hijo falló, el script termina con SU código (como hacía `set -e`). */
function oAbortar(r) {
  if (r.status !== 0) {
    if (r.faltaBinario) console.error(`✖ ${r.stderr.trim()}`);
    process.exit(r.status || 1);
  }
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help")) {
    console.log(`${USO}\n\nPuerta 1: revisar-hf.mjs (invariantes del repo) · Puerta 2: hyperframes check · Render.\n  sin flag   prueba: --quality draft → proyectos/NNN/pruebas-720p/NNN-hf-prueba.mp4\n  --final    final:  --quality high  → proyectos/NNN/finales/NNN-hf.mp4`);
    return;
  }
  const [nnnArg, modo, ...sobran] = argv;
  if (nnnArg === undefined || nnnArg === "") {
    console.error(USO);
    process.exit(1);
  }
  let nnn;
  try {
    nnn = numeroProyecto(nnnArg);
  } catch (e) {
    console.error(`✖ ${e.message}\n${USO}`);
    process.exit(1);
  }
  // El .sh trataba «final» o «--final=1» como PRUEBA sin avisar: un final que
  // se cree final y sale en draft. Aquí solo hay dos formas válidas de llamar.
  if ((modo !== undefined && modo !== "--final") || sobran.length) {
    console.error(`✖ Argumento no reconocido: ${[modo, ...sobran].filter((a) => a !== undefined).join(" ")}\n${USO}`);
    process.exit(1);
  }
  const final = modo === "--final";

  const proy = path.join(RAIZ, "proyectos", nnn, "hf");
  if (!fs.existsSync(path.join(proy, "index.html"))) {
    console.error(`✖ No hay proyectos/${nnn}/hf/index.html`);
    console.error(`  Créalo:  node manuales/motor-hyperframes/scripts/nuevo-hf.mjs ${nnn}`);
    process.exit(1);
  }

  const calidad = final ? "high" : "draft";
  const salida = final
    ? path.join(RAIZ, "proyectos", nnn, "finales", `${nnn}-hf.mp4`)
    : path.join(RAIZ, "proyectos", nnn, "pruebas-720p", `${nnn}-hf-prueba.mp4`);

  console.log("── Puerta 1/2: invariantes del repo ──────────────────────────────");
  // Ruta absoluta y no el NNN: revisar-hf resuelve lo que no son tres dígitos
  // contra el CWD, y así la puerta mira SIEMPRE la misma carpeta que el render.
  oAbortar(ejecutar(process.execPath, [REVISAR, proy], { heredar: true, env: ENTORNO }));

  console.log("── Puerta 2/2: lint · runtime · layout · motion · contraste ──────");
  oAbortar(npx(["--yes", HYPERFRAMES, "check", proy], { heredar: true, env: ENTORNO }));

  console.log(`── Render (${calidad}) ─────────────────────────────────────────────`);
  fs.mkdirSync(path.dirname(salida), { recursive: true });
  oAbortar(npx(["--yes", HYPERFRAMES, "render", proy, "-o", salida, "--quality", calidad], { heredar: true, env: ENTORNO }));

  console.log("");
  console.log(`🎬 ${relativa(salida)}`);
  oAbortar(
    ejecutar(
      "ffprobe",
      ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate,nb_frames", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1", salida],
      { heredar: true, env: ENTORNO }
    )
  );
  console.log("");
  if (!final) {
    console.log("Mira frames ANTES del final (R05 del otro motor vale igual aquí):");
    console.log(`  npx ${HYPERFRAMES} snapshot ${posix(relativa(proy))} --at 0,2,4,6`);
    console.log(`Cuando el usuario dé el OK:  node manuales/motor-hyperframes/scripts/render-hf.mjs ${nnn} --final`);
  }
}

if (esMain(import.meta.url)) main();
