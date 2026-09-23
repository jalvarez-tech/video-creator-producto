#!/usr/bin/env node
/**
 * revisar-sonda.mjs — COMPARA dos tandas y dice qué se movió.
 *
 * Uso (desde cualquier sitio):
 *   node manuales/motion-graphics/scripts/revisar-sonda.mjs antes despues
 *   node manuales/motion-graphics/scripts/revisar-sonda.mjs antes despues --umbral 20
 *
 * Sale 0 si no hay regresiones, 2 si las hay. Pensado para encadenarlo:
 *   npm run lint && node …/revisar-catalogo.mjs && node …/revisar-sonda.mjs antes despues
 *
 * DOS PASADAS, PORQUE «CAMBIÓ» Y «CAMBIÓ DE FORMA VISIBLE» NO SON LO MISMO.
 * Primero el hash: idéntico es idéntico, sin ambigüedad y sin decodificar nada.
 * Solo para los que difieren se abre el PNG y se mide cuántos píxeles cambiaron
 * y cuánto, porque las dos cosas que mueven píxeles tienen firmas OPUESTAS:
 *
 *   ruido de la sonda   miles de píxeles (5-20 % del cuadro) con delta 1-8
 *   cambio de color     pocos píxeles (< 1 %) con delta de 200-255
 *
 * El umbral por defecto (12) está MEDIDO, no elegido: dos tandas del mismo
 * código dan como mucho delta 8. Ver la cabecera de `sonda-frames.mjs`.
 *
 * ⚠️ El umbral protege del ruido y por eso también puede tapar un cambio real
 * PEQUEÑO —mover una sombra un 3 % de alfa, por ejemplo—. Cuando el cambio que
 * se está probando es de ese orden, pásale `--umbral 1` y lee la lista entera.
 *
 * TRES COMPOSICIONES DEL PRODUCTO QUEDAN FUERA DEL «CERO DIFERENCIAS». `Catalogo`,
 * `PlanDemo` y `NoticiaDemo` son del PRODUCTO, no piezas publicadas: su texto se
 * neutralizó a propósito (las fichas del catálogo, las demos con la marca de
 * ejemplo), así que una tanda anterior a esa neutralización difiere de una
 * posterior en ellas y eso NO es una regresión. El criterio «ni un píxel ni un
 * sonido» es para las composiciones publicadas del estudio; en esas tres, una
 * diferencia que sea solo de texto es la esperada.
 *
 * POR QUÉ UN DECODIFICADOR PNG A MANO Y NO UNA DEPENDENCIA. Son cuarenta líneas
 * y evitan meter un paquete en un repo que hoy tiene siete. Cubre lo que
 * `renderStill` emite y nada más: 8 bits, RGB o RGBA, sin entrelazar. Si algún
 * día emite otra cosa, lo dice en vez de comparar mal.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { createHash } from "node:crypto";
import { relativa } from "../../../herramientas/comun.mjs";
import { rutaTanda } from "./sonda-frames.mjs";

const arg = (bandera, defecto) => {
  const i = process.argv.indexOf(bandera);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : defecto;
};

const [, , nombreA, nombreB] = process.argv;
if (!nombreA || !nombreB) {
  console.error("uso: node manuales/motion-graphics/scripts/revisar-sonda.mjs <antes> <despues> [--umbral N]");
  process.exit(1);
}
const UMBRAL = Number(arg("--umbral", 12));
const antes = rutaTanda(nombreA);
const despues = rutaTanda(nombreB);
for (const d of [antes, despues]) {
  if (!fs.existsSync(d)) {
    console.error(`no existe la tanda: ${relativa(d)}`);
    process.exit(1);
  }
}

const hash = (f) => createHash("sha256").update(fs.readFileSync(f)).digest("hex");

/** Decodificador PNG mínimo: lo justo para comparar lo que emite `renderStill`. */
function leePng(file) {
  const buf = fs.readFileSync(file);
  let pos = 8;
  let ancho = 0;
  let alto = 0;
  let bits = 0;
  let tipo = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const tag = buf.toString("ascii", pos + 4, pos + 8);
    const datos = buf.subarray(pos + 8, pos + 8 + len);
    if (tag === "IHDR") {
      ancho = datos.readUInt32BE(0);
      alto = datos.readUInt32BE(4);
      bits = datos[8];
      tipo = datos[9];
      if (datos[12] !== 0) throw new Error("PNG entrelazado");
    } else if (tag === "IDAT") idat.push(datos);
    else if (tag === "IEND") break;
    pos += 12 + len;
  }
  if (bits !== 8 || (tipo !== 6 && tipo !== 2)) throw new Error(`PNG bits=${bits} tipo=${tipo}`);
  const canales = tipo === 6 ? 4 : 3;
  const bruto = zlib.inflateSync(Buffer.concat(idat));
  const linea = ancho * canales;
  const out = Buffer.alloc(alto * linea);
  let o = 0;
  let p = 0;
  for (let y = 0; y < alto; y++) {
    const filtro = bruto[p++];
    for (let x = 0; x < linea; x++) {
      const cru = bruto[p + x];
      const a = x >= canales ? out[o + x - canales] : 0;
      const b = y > 0 ? out[o - linea + x] : 0;
      const c = x >= canales && y > 0 ? out[o - linea + x - canales] : 0;
      let v;
      if (filtro === 0) v = cru;
      else if (filtro === 1) v = cru + a;
      else if (filtro === 2) v = cru + b;
      else if (filtro === 3) v = cru + ((a + b) >> 1);
      else {
        const pp = a + b - c;
        const pa = Math.abs(pp - a);
        const pb = Math.abs(pp - b);
        const pc = Math.abs(pp - c);
        v = cru + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
      }
      out[o + x] = v & 0xff;
    }
    p += linea;
    o += linea;
  }
  return { ancho, alto, canales, datos: out };
}

const nombres = fs.readdirSync(antes).filter((f) => f.endsWith(".png")).sort();
const nuevos = fs.readdirSync(despues).filter((f) => f.endsWith(".png") && nombres.indexOf(f) < 0);
const faltan = [];
const movidos = [];
let iguales = 0;

for (const n of nombres) {
  const a = path.join(antes, n);
  const b = path.join(despues, n);
  if (!fs.existsSync(b)) {
    faltan.push(n);
    continue;
  }
  if (hash(a) === hash(b)) {
    iguales++;
    continue;
  }
  try {
    const A = leePng(a);
    const B = leePng(b);
    if (A.ancho !== B.ancho || A.alto !== B.alto) {
      movidos.push({ n, nota: `tamaño ${A.ancho}×${A.alto} → ${B.ancho}×${B.alto}` });
      continue;
    }
    let cambiados = 0;
    let maxDelta = 0;
    let suma = 0;
    for (let i = 0; i < A.datos.length; i += A.canales) {
      let d = 0;
      for (let k = 0; k < 3; k++) d = Math.max(d, Math.abs(A.datos[i + k] - B.datos[i + k]));
      if (d > 0) {
        cambiados++;
        suma += d;
        if (d > maxDelta) maxDelta = d;
      }
    }
    movidos.push({
      n,
      pct: ((cambiados / (A.ancho * A.alto)) * 100).toFixed(2),
      maxDelta,
      medio: cambiados ? (suma / cambiados).toFixed(1) : "0",
    });
  } catch (e) {
    movidos.push({ n, nota: `no comparable: ${String(e).slice(0, 80)}` });
  }
}

console.log(`\n🎞  ${nombreA} → ${nombreB} · ${iguales}/${nombres.length} frames IDÉNTICOS`);
if (faltan.length) console.log(`⚠️  ${faltan.length} sin pareja: ${faltan.slice(0, 6).join(", ")}`);
if (nuevos.length) console.log(`ℹ️  ${nuevos.length} solo en la nueva: ${nuevos.slice(0, 6).join(", ")}`);

if (movidos.length === 0) {
  console.log("\n✅ ni un píxel movido\n");
  process.exit(0);
}

const reales = movidos.filter((m) => m.nota !== undefined || Number(m.maxDelta) >= UMBRAL);
const ruido = movidos.filter((m) => reales.indexOf(m) < 0);

const pinta = (lista, titulo) => {
  const porComp = {};
  for (const m of lista) {
    const c = m.n.split("__")[0];
    (porComp[c] || (porComp[c] = [])).push(m);
  }
  console.log(`\n${titulo}\n`);
  for (const c of Object.keys(porComp)) {
    const ms = porComp[c];
    const pico = Math.max.apply(null, ms.map((m) => Number(m.maxDelta || 999)));
    console.log(`  ${c}  (${ms.length} frames · delta máx ${pico})`);
    for (const m of ms.slice(0, 5)) {
      console.log(`     ${m.n.split("__")[1]}  ${m.nota || `${m.pct}% píxeles · delta máx ${m.maxDelta} · medio ${m.medio}`}`);
    }
    if (ms.length > 5) console.log(`     … y ${ms.length - 5} más`);
  }
};

if (ruido.length) pinta(ruido, `· ${ruido.length} bajo el umbral (delta < ${UMBRAL}) — suelo de ruido de la sonda`);
if (reales.length) {
  pinta(reales, `⚠️  ${reales.length} REGRESIONES (delta ≥ ${UMBRAL})`);
  console.log();
  process.exit(2);
}
console.log(`\n✅ sin regresiones: todo lo movido está bajo el suelo de ruido (delta < ${UMBRAL})\n`);
process.exit(0);
