#!/usr/bin/env node
/**
 * sonda-audio.mjs — la hermana de sonda-frames.mjs para el SONIDO.
 *
 * Renderiza SOLO el audio de cada composición (WAV PCM, sin vídeo) y guarda el
 * sha256 de las muestras del chunk `data`, sin cabeceras. Dos tandas del mismo
 * código dan el mismo hash; un cue que se mueve un frame, un `vol` que cambia o
 * un SFX sustituido dan otro, y `--comparar` dice cuántas muestras y cuánto.
 *
 *   node manuales/motion-graphics/scripts/sonda-audio.mjs antes
 *   node manuales/motion-graphics/scripts/sonda-audio.mjs despues --comps NoticiaDemo,PlanDemo
 *   node manuales/motion-graphics/scripts/sonda-audio.mjs --comparar antes despues
 *
 *   --comps A,B        solo esas composiciones
 *   --timeout MS       para piezas con mucho vídeo (montajes largos de clips): 240000
 *
 * Las tandas van a remotion/out/sonda-audio/<tanda>/ (ignorado por git).
 *
 * POR QUÉ EXISTE. La sonda de fotogramas no escucha: un cambio en el motor de
 * sonido pasaba las 27 composiciones «sin regresiones» aunque un SFX dejara de
 * sonar. El requisito «ni un píxel ni un sonido» necesita las dos.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { RAIZ, flags, log, esMain, relativa } from "../../../herramientas/comun.mjs";

const BASE = path.join(RAIZ, "remotion", "out", "sonda-audio");
export const rutaTanda = (nombre) => path.join(BASE, nombre);

/** Muestras PCM y formato de un WAV (chunk `data` + `fmt `). */
export function pcm(archivo) {
  const b = fs.readFileSync(archivo);
  let o = 12;
  let fmt = null;
  while (o + 8 <= b.length) {
    const id = b.toString("ascii", o, o + 4);
    const n = b.readUInt32LE(o + 4);
    if (id === "fmt ") fmt = { canales: b.readUInt16LE(o + 10), sr: b.readUInt32LE(o + 12), bits: b.readUInt16LE(o + 22) };
    if (id === "data") return { datos: b.subarray(o + 8, o + 8 + n), fmt };
    o += 8 + n + (n % 2);
  }
  throw new Error("sin chunk data: " + archivo);
}

async function capturar(tanda, f) {
  const require = createRequire(path.join(RAIZ, "remotion", "package.json"));
  const { bundle } = require("@remotion/bundler");
  const { getCompositions, renderMedia } = require("@remotion/renderer");
  const solo = f.comps ? String(f.comps).split(",").map((s) => s.trim()) : null;
  const dir = rutaTanda(tanda);
  fs.mkdirSync(dir, { recursive: true });
  log.titulo(`sonda-audio «${tanda}»`);
  const servido = await bundle({ entryPoint: path.join(RAIZ, "remotion", "src", "index.ts") });
  let comps = await getCompositions(servido);
  if (solo) comps = comps.filter((c) => solo.includes(c.id));
  const res = fs.existsSync(path.join(dir, "resumen.json")) ? JSON.parse(fs.readFileSync(path.join(dir, "resumen.json"), "utf8")) : {};
  let fallos = 0;
  for (const c of comps) {
    const out = path.join(dir, `${c.id}.wav`);
    try {
      await renderMedia({
        composition: c,
        serveUrl: servido,
        codec: "wav",
        outputLocation: out,
        chromiumOptions: { gl: "swangle" },
        timeoutInMilliseconds: Number(f.timeout || 60000),
      });
      const { datos, fmt } = pcm(out);
      res[c.id] = { sha256: crypto.createHash("sha256").update(datos).digest("hex"), bytes: datos.length, frames: c.durationInFrames, fps: c.fps, fmt };
      console.log(`   ✓ ${c.id.padEnd(16)} ${res[c.id].sha256.slice(0, 12)} ${datos.length} B`);
    } catch (e) {
      fallos++;
      res[c.id] = { error: String(e).slice(0, 300) };
      console.error(`   ✗ ${c.id}: ${String(e).slice(0, 200)}`);
    }
  }
  fs.writeFileSync(path.join(dir, "resumen.json"), JSON.stringify(res, null, 2));
  console.log(`\n${comps.length} composiciones · ${fallos} fallos → ${relativa(dir)}`);
  return fallos;
}

function comparar(a, b) {
  const leer = (t) => JSON.parse(fs.readFileSync(path.join(rutaTanda(t), "resumen.json"), "utf8"));
  const A = leer(a), B = leer(b);
  let distintos = 0;
  for (const id of [...new Set([...Object.keys(A), ...Object.keys(B)])].sort()) {
    const x = A[id], y = B[id];
    if (!x || !y) { console.log(`   ? ${id}: solo en ${x ? a : b}`); continue; }
    if (x.error || y.error) { console.log(`   ✗ ${id}: error en ${x.error ? a : b}`); distintos++; continue; }
    if (x.sha256 === y.sha256) { console.log(`   = ${id}`); continue; }
    distintos++;
    const pa = pcm(path.join(rutaTanda(a), `${id}.wav`)).datos;
    const pb = pcm(path.join(rutaTanda(b), `${id}.wav`)).datos;
    const n = Math.min(pa.length, pb.length) >> 1;
    let max = 0, dif = 0, primero = -1;
    for (let i = 0; i < n; i++) {
      const d = Math.abs(pa.readInt16LE(i * 2) - pb.readInt16LE(i * 2));
      if (d) { dif++; if (primero < 0) primero = i; if (d > max) max = d; }
    }
    const seg = x.fmt && primero >= 0 ? (primero / x.fmt.canales / x.fmt.sr).toFixed(2) + " s" : "?";
    console.log(`   ≠ ${id}: ${pa.length} vs ${pb.length} B · ${dif} muestras distintas · Δmáx ${max} · primera en ${seg}`);
  }
  console.log(distintos ? `\n⚠️  ${distintos} composiciones con audio distinto` : "\n✅ audio idéntico en todas");
  return distintos;
}

if (esMain(import.meta.url)) {
  const f = flags();
  if (f.comparar) {
    // `flags()` toma como valor de --comparar el primer nombre: `--comparar A B` → comparar="A", _=["B"].
    const [a, b] = typeof f.comparar === "string" ? [f.comparar, f._[0]] : f._;
    if (!a || !b) { console.error("uso: sonda-audio.mjs --comparar <tandaA> <tandaB>"); process.exit(1); }
    process.exit(comparar(a, b) ? 2 : 0);
  }
  const tanda = f._[0];
  if (!tanda) { console.error("uso: sonda-audio.mjs <tanda> [--comps A,B] [--timeout MS] | --comparar A B"); process.exit(1); }
  const fallos = await capturar(tanda, f);
  process.exit(fallos ? 1 : 0);
}
