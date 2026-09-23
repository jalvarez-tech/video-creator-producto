#!/usr/bin/env node
/**
 * revisar-producto.mjs — la PUERTA que impide que el producto arrastre estudio.
 *
 *   node herramientas/revisar-producto.mjs             # producto: rutas de estudio + cadenas prohibidas
 *   node herramientas/revisar-producto.mjs --estudio   # estudio: solo cadenas (ahí las rutas de estudio SÍ están)
 *   node herramientas/revisar-producto.mjs --json      # el mismo veredicto, para máquinas
 *
 * Sale con 0 si está limpio y con 1 si encuentra algo, y lo dice archivo por
 * archivo y con la línea, para que quien lo lea vaya directo a corregirlo.
 *
 * QUÉ MIRA. La lista de archivos que git conoce en la raíz de ESTE checkout
 * (`git ls-files`: los trackeados más los nuevos que no están ignorados, que es
 * la misma lista que copia exportar-producto.mjs), y sobre ella dos cosas:
 *
 *   1. RUTAS DE ESTUDIO (solo sin --estudio): que ninguna caiga en una zona de
 *      estudio de herramientas/zonas.mjs (sonido/, proyectos/*, remotion/src/proyectos/*,
 *      remotion/src/marcas/* salvo ejemplo.ts, remotion/public/* salvo lo permitido,
 *      .claude/skills/*, .agents/*, los ESTUDIO*.md…). En el producto, que una de
 *      esas rutas esté en git significa que el material de alguien se ha colado.
 *   2. CADENAS PROHIBIDAS (siempre): que ningún archivo COMPARTIDO de texto lleve
 *      un nombre propio del estudio original (CADENAS_PROHIBIDAS de zonas.mjs,
 *      sensibles a mayúsculas) ni una ruta absoluta de macOS («/Users/»). Los
 *      archivos de estudio no se miran: ahí esos nombres son legítimos.
 *
 * POR QUÉ --estudio: en el estudio esas rutas están trackeadas a propósito, así
 * que la comprobación 1 fallaría siempre y no diría nada nuevo; la 2 sigue
 * valiendo, porque un archivo compartido se escribe para el producto también
 * cuando se edita desde el estudio.
 *
 * Solo Node y herramientas/{comun,zonas}.mjs. Sin shell, sin rutas absolutas:
 * corre igual en macOS, Linux y Windows, y exportar-producto.mjs lo ejecuta
 * dentro del destino con su propio git.
 */
import fs from "node:fs";
import path from "node:path";
import { RAIZ, ejecutar, flags, log, esMain, posix } from "./comun.mjs";
import { ZONAS_ESTUDIO, NOMBRES_ESTUDIO, EXCEPCIONES_CADENAS, EXTENSIONES_TEXTO, esEstudio, cadenasEn } from "./zonas.mjs";

/**
 * Extensiones de texto que zonas.mjs no lista pero que también pueden llevar un
 * nombre propio: subtítulos, tablas, SVG con texto, configuración. Se suman a
 * EXTENSIONES_TEXTO; no la sustituyen.
 */
const EXTENSIONES_EXTRA = new Set([".svg", ".srt", ".vtt", ".csv", ".tsv", ".xml", ".ini", ".cfg", ".jsx", ".mts", ".cts", ".mdx", ".log", ".sql", ".sample"]);

/** Cuántas rutas o hallazgos se listan antes de resumir con «… y N más». */
const MAX_LISTA = 40;

const USO = `Uso: node herramientas/revisar-producto.mjs [--estudio] [--json]

Falla (código 1) si en «git ls-files» hay una ruta de estudio (sonido/, proyectos/*,
remotion/src/proyectos/*, marcas salvo ejemplo.ts, remotion/public/* salvo lo permitido,
.claude/skills/*, .agents/*, ESTUDIO*.md) o si un archivo compartido de texto contiene
una cadena prohibida (herramientas/zonas.mjs) o «/Users/».

  --estudio   no mira las rutas (en el estudio están trackeadas a propósito), solo las cadenas
  --json      imprime el veredicto como JSON y nada más`;

/** Los archivos que git conoce: trackeados + nuevos no ignorados, sin duplicados, con «/». */
function listaGit() {
  const r = ejecutar("git", ["-C", RAIZ, "ls-files", "-z", "--cached", "--others", "--exclude-standard"], { check: true });
  return [...new Set(r.stdout.split("\0").filter(Boolean).map(posix))].sort();
}

function extensionDe(ruta) {
  const base = ruta.split("/").pop();
  const punto = base.lastIndexOf(".");
  return punto >= 0 ? base.slice(punto) : "";
}

/** ¿Es un archivo del producto en el que hay que buscar cadenas? (no estudio, no excepción, de texto) */
function esTextoCompartido(ruta) {
  if (esEstudio(ruta)) return false;
  if (EXCEPCIONES_CADENAS.includes(ruta)) return false;
  const ext = extensionDe(ruta);
  return EXTENSIONES_TEXTO.has(ext) || EXTENSIONES_EXTRA.has(ext);
}

/**
 * Lee un archivo como texto, o null si no toca: no es un archivo normal (un
 * enlace de skill, una carpeta, algo borrado del disco pero aún en el índice) o
 * parece binario (un NUL en los primeros 8 KB). Quita el BOM para que una cadena
 * en la primera línea no se escape.
 */
function leerSiTexto(abs) {
  let st;
  try {
    st = fs.lstatSync(abs);
  } catch {
    return null;
  }
  if (!st.isFile()) return null;
  const buf = fs.readFileSync(abs);
  if (buf.subarray(0, 8192).includes(0)) return null;
  return buf.toString("utf8").replace(/^﻿/, "");
}

/** Número de línea (desde 1) del índice `indice` dentro de `texto`. */
function lineaDe(texto, indice) {
  let n = 1;
  for (let i = 0; i < indice; i++) if (texto.charCodeAt(i) === 10) n++;
  return n;
}

/** A qué zona de estudio pertenece una ruta (para el resumen agrupado). */
function zonaDe(ruta) {
  const base = ruta.split("/").pop();
  if (NOMBRES_ESTUDIO.some((re) => re.test(base))) return "ESTUDIO*.md";
  return ZONAS_ESTUDIO.find((z) => (z.endsWith("/") ? ruta.startsWith(z) : ruta === z)) || "(otra)";
}

/**
 * Revisa el checkout y devuelve el veredicto sin imprimir nada:
 * { modo, archivos, textos, rutasEstudio[], cadenas[{archivo, cadena, linea}], ok }.
 */
export function revisar({ estudio = false } = {}) {
  const archivos = listaGit();
  const rutasEstudio = estudio ? [] : archivos.filter((r) => esEstudio(r));
  const cadenas = [];
  let textos = 0;
  for (const r of archivos) {
    if (!esTextoCompartido(r)) continue;
    const texto = leerSiTexto(path.join(RAIZ, r));
    if (texto === null) continue;
    textos++;
    for (const c of cadenasEn(texto)) cadenas.push({ archivo: r, cadena: c, linea: lineaDe(texto, texto.indexOf(c)) });
  }
  return {
    modo: estudio ? "estudio" : "producto",
    archivos: archivos.length,
    textos,
    rutasEstudio,
    cadenas,
    ok: rutasEstudio.length === 0 && cadenas.length === 0,
  };
}

function imprimirRutas(rutas) {
  log.error(`${rutas.length} ruta(s) de estudio en «git ls-files»: no pueden ir en el producto`);
  // Agrupadas por zona: cuando son cientos (un banco de sonido entero) el
  // recuento por zona dice más que una lista, y tres ejemplos bastan para
  // reconocerla.
  const porZona = new Map();
  for (const r of rutas) {
    const z = zonaDe(r);
    if (!porZona.has(z)) porZona.set(z, []);
    porZona.get(z).push(r);
  }
  for (const [zona, lista] of [...porZona.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`   ${zona}  (${lista.length})`);
    for (const r of lista.slice(0, 3)) console.log(`      · ${r}`);
    if (lista.length > 3) console.log(`      … y ${lista.length - 3} más`);
  }
  console.log("   → en el producto no deben existir; en el estudio, pasa el guard con --estudio o destráckalas (git rm --cached).");
}

function imprimirCadenas(cadenas) {
  log.error(`${cadenas.length} cadena(s) prohibida(s) en archivos compartidos: neutralízalas o mueve el texto a un ESTUDIO.md`);
  const porArchivo = new Map();
  for (const h of cadenas) {
    if (!porArchivo.has(h.archivo)) porArchivo.set(h.archivo, []);
    porArchivo.get(h.archivo).push(h);
  }
  let mostradas = 0;
  for (const [archivo, lista] of porArchivo) {
    if (mostradas >= MAX_LISTA) break;
    console.log(`   ${archivo}`);
    for (const h of lista) console.log(`      línea ${h.linea}: «${h.cadena}»`);
    mostradas++;
  }
  if (porArchivo.size > mostradas) console.log(`   … y ${porArchivo.size - mostradas} archivo(s) más (con --json salen todos)`);
}

if (esMain(import.meta.url)) {
  const f = flags();
  if (f.help || f.h) {
    console.log(USO);
    process.exit(0);
  }
  let r;
  try {
    r = revisar({ estudio: Boolean(f.estudio) });
  } catch (e) {
    log.error(`no pude listar los archivos con git: ${e.message}`);
    process.exit(2);
  }
  if (f.json) {
    console.log(JSON.stringify(r, null, 2));
    process.exit(r.ok ? 0 : 1);
  }
  log.titulo(`revisar-producto · modo ${r.modo} · ${r.archivos} archivos en git · ${r.textos} de texto compartido leídos`);
  if (r.rutasEstudio.length) imprimirRutas(r.rutasEstudio);
  if (r.cadenas.length) imprimirCadenas(r.cadenas);
  if (r.ok) log.ok(r.modo === "producto" ? "limpio: ni rutas de estudio ni cadenas prohibidas" : "limpio: ninguna cadena prohibida en archivos compartidos");
  process.exit(r.ok ? 0 : 1);
}
