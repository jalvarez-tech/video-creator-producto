#!/usr/bin/env node
/**
 * artefactos.mjs — prepara los artefactos intermedios de un proyecto.
 *
 * Uso:
 *   node manuales/director-video/scripts/artefactos.mjs 004
 *
 * Copia las plantillas 01-plan / 02-layout / 03-timeline a
 * proyectos/NNN/artefactos/ (sin sobrescribir lo que ya exista) y deja el
 * proyecto listo para que el director escriba las decisiones ANTES del código.
 * Por qué: manuales/director-video/artefactos/README.md
 *
 * Sustituye a artefactos.sh. Dos diferencias a propósito:
 *   · El reemplazo de «NNN» es LITERAL (split/join), no un `sed`: el .sh dejaba
 *     entrar el número sin escapar y un «&» o una «/» rompían la plantilla.
 *   · El número se valida (tres dígitos) y cada plantilla se escribe SOLO si se
 *     pudo leer entera. El .sh creaba el archivo vacío al redirigir y, si sed
 *     fallaba, la siguiente ejecución decía «ya existe» sobre un archivo vacío.
 *
 * `--raiz <dir>` apunta a otra raíz donde vive `proyectos/` (sirve para probar
 * el script sin ensuciar el repo). Las plantillas salen SIEMPRE de esta skill.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RAIZ, esMain, flags, log, numeroProyecto, posix } from "../../../herramientas/comun.mjs";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
/** Las plantillas viajan con la skill, no con la raíz que se pase. */
const ORIGEN = path.resolve(AQUI, "..", "artefactos");

/** Mismo orden que el .sh: se copian y se anuncian en este orden. */
const PLANTILLAS = ["01-plan.md", "02-layout.md", "03-timeline.md"];

/** Los seis huecos que rellenaba el `sed` del .sh, en el mismo orden. */
const HUECOS = ["proyecto NNN", "graficos-NNN", "camara-NNN", "cues-NNN", "subtitulos-NNN", "proyectos/NNN"];

const USO = "Uso: node manuales/director-video/scripts/artefactos.mjs <NNN>   (p. ej. 004)";

/** Reemplazo literal y global: nada de expresiones regulares ni de `$&`. */
function rellenar(texto, nnn) {
  let r = texto;
  for (const hueco of HUECOS) r = r.split(hueco).join(hueco.replace("NNN", nnn));
  return r;
}

/**
 * Prepara `raiz/proyectos/NNN/artefactos/`. Devuelve la lista de archivos
 * creados. Lanza si falta una plantilla, ANTES de escribir nada.
 */
export function prepararArtefactos(nnn, raiz = RAIZ) {
  const numero = numeroProyecto(nnn);
  const destino = path.join(raiz, "proyectos", numero, "artefactos");
  fs.mkdirSync(destino, { recursive: true });

  // Primero se lee TODO lo que haga falta; si una plantilla no está, no se
  // escribe ninguna y el proyecto queda como estaba.
  const pendientes = [];
  for (const f of PLANTILLAS) {
    if (fs.existsSync(path.join(destino, f))) {
      pendientes.push({ f, contenido: null });
      continue;
    }
    // utf8 sin normalizar: el EOL y la última línea salen como en la plantilla.
    const contenido = fs.readFileSync(path.join(ORIGEN, f), "utf8");
    pendientes.push({ f, contenido: rellenar(contenido, numero) });
  }

  const creados = [];
  for (const { f, contenido } of pendientes) {
    if (contenido === null) {
      log.info(`${f} ya existe — no se toca`);
      continue;
    }
    fs.writeFileSync(path.join(destino, f), contenido, "utf8");
    log.ok(f);
    creados.push(f);
  }
  return { destino, creados };
}

function main() {
  const args = flags();
  if (args.help) {
    console.log(`${USO}\n\nCopia 01-plan · 02-layout · 03-timeline a proyectos/NNN/artefactos/ sin pisar lo que ya exista.\n  --raiz <dir>   otra raíz donde está proyectos/ (por defecto, la del repo)`);
    return;
  }
  const nnn = args._[0];
  if (nnn === undefined || nnn === "") {
    console.error(USO);
    process.exit(1);
  }
  let numero;
  try {
    numero = numeroProyecto(nnn);
  } catch (e) {
    console.error(`✖ ${e.message}\n${USO}`);
    process.exit(1);
  }
  const raiz = typeof args.raiz === "string" ? path.resolve(args.raiz) : RAIZ;
  try {
    prepararArtefactos(numero, raiz);
  } catch (e) {
    console.error(`❌ ${e.message}`);
    process.exit(1);
  }
  console.log("");
  console.log(`Artefactos en ${raiz === RAIZ ? "" : posix(raiz) + "/"}proyectos/${numero}/artefactos/`);
  console.log("Orden: 01-plan → 02-layout → 03-timeline → código. No te saltes ninguno.");
}

if (esMain(import.meta.url)) main();
