#!/usr/bin/env node
/**
 * exportar-srt.mjs — convierte un `subtitulos-NNN.ts` (un `Segmento[]`) en un
 * archivo `.srt` para subirlo como pista de captions a la plataforma.
 *
 * Uso (desde cualquier sitio):
 *   node manuales/edicion-video/scripts/exportar-srt.mjs remotion/src/proyectos/NNN/subtitulos-NNN.ts proyectos/NNN/finales/NNN.srt
 *
 * Por qué existe: R14 dice que, al quitar la pista de subtítulos de una pieza,
 * el fichero NO se borra —se deja desconectado y se exporta a `.srt`, que es
 * donde sigue sirviendo—. El 012 lo hizo a mano; esto lo deja repetible.
 *
 * Cómo lee TypeScript sin dependencias nuevas: transpila con el esbuild que
 * Remotion ya trae (mismo truco que revisar-plan.mjs). `subtitulos-NNN.ts` es
 * datos puros (solo `import type`), así que el bundle no arrastra React.
 *
 * Sale con 1 si el fichero no exporta ningún `Segmento[]` o si algún segmento
 * está mal formado (fin ≤ inicio, texto vacío, solape con el anterior): un
 * `.srt` con un cue roto se sube igual y la plataforma lo pinta mal.
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { RAIZ, borrar, carpetaTemporal, posix, relativa } from "../../../herramientas/comun.mjs";

const root = RAIZ;
const remotionDir = path.join(root, "remotion");

/** Una ruta para ENSEÑAR: relativa a la raíz si cae dentro, absoluta con «/» si no. */
const muestra = (p) => {
  const r = relativa(p);
  return r.startsWith("..") ? posix(path.resolve(p)) : r;
};

const [, , entradaRel, salidaRel] = process.argv;
if (!entradaRel || !salidaRel) {
  console.error("uso: node manuales/edicion-video/scripts/exportar-srt.mjs <subtitulos-NNN.ts> <salida.srt>");
  process.exit(1);
}
const candidatas = path.isAbsolute(entradaRel)
  ? [entradaRel]
  : [path.resolve(process.cwd(), entradaRel), path.join(root, entradaRel), path.join(remotionDir, entradaRel)];
const entrada = candidatas.find((c) => fs.existsSync(c));
if (!entrada) {
  console.error(`✖ No existe: ${entradaRel}`);
  process.exit(1);
}
const salida = path.isAbsolute(salidaRel) ? salidaRel : path.resolve(process.cwd(), salidaRel);

const require = createRequire(path.join(remotionDir, "package.json"));
const esbuild = require("esbuild");
const tmp = carpetaTemporal("srt-");
const bundle = path.join(tmp, "out.cjs");
let mod;
try {
  await esbuild.build({ entryPoints: [entrada], bundle: true, platform: "node", format: "cjs", outfile: bundle, logLevel: "error" });
  mod = require(bundle);
} finally {
  // `borrar` reintenta: en Windows el antivirus retiene un instante el .cjs recién creado.
  borrar(tmp);
}

const segmentos = Object.values(mod).find(
  (v) => Array.isArray(v) && v.length && typeof v[0].from === "number" && typeof v[0].to === "number" && typeof v[0].text === "string"
);
if (!segmentos) {
  console.error(`✖ ${entradaRel} no exporta ningún Segmento[] ({from, to, text})`);
  process.exit(1);
}

const errores = [];
segmentos.forEach((s, i) => {
  if (!(s.to > s.from)) errores.push(`#${i + 1} termina (${s.to}) antes de empezar (${s.from})`);
  if (!s.text.trim()) errores.push(`#${i + 1} sin texto`);
  if (i > 0 && s.from < segmentos[i - 1].to - 1e-6) errores.push(`#${i + 1} (${s.from}) solapa con el anterior (acaba en ${segmentos[i - 1].to})`);
});
if (errores.length) {
  console.error("✖ Segmentos mal formados:");
  for (const e of errores) console.error(`   · ${e}`);
  process.exit(1);
}

const marca = (seg) => {
  const ms = Math.round(seg * 1000);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const r = ms % 1000;
  const dd = (n, w = 2) => String(n).padStart(w, "0");
  return `${dd(h)}:${dd(m)}:${dd(s)},${dd(r, 3)}`;
};
const srt = segmentos.map((s, i) => `${i + 1}\n${marca(s.from)} --> ${marca(s.to)}\n${s.text.trim()}\n`).join("\n");
fs.mkdirSync(path.dirname(salida), { recursive: true });
fs.writeFileSync(salida, srt, "utf8");
console.log(`✅ ${muestra(salida)} · ${segmentos.length} cues · ${marca(segmentos[0].from)} → ${marca(segmentos[segmentos.length - 1].to)}`);
