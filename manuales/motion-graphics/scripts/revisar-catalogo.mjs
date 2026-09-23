#!/usr/bin/env node
/**
 * revisar-catalogo.mjs — el test de que el catálogo NO PUEDE MENTIR.
 *
 * Uso (desde cualquier sitio):
 *   node manuales/motion-graphics/scripts/revisar-catalogo.mjs
 *
 * Sale 0 si todo cuadra, 1 con la lista de fallos si no. No hay runner de tests
 * en el repo, así que es un script `node` al estilo de
 * `manuales/video-noticias/scripts/revisar-plan.mjs`.
 *
 * ── QUÉ COMPRUEBA Y POR QUÉ ────────────────────────────────────────────────
 *
 * El fallo original del sistema fue un catálogo mantenido a mano que anunciaba
 * 37 gráficos mientras el plan servía 16. Hoy `fichas.ts` DERIVA su catálogo, y
 * los mapeados totales (`Record<ClaveEnvoltura, Tarjeta>`…) hacen que buena
 * parte de eso ya no compile. Este script cubre lo que el compilador no ve:
 *
 *   1. TODA RUTA TIENE FICHA: las claves de cada eje, comparadas contra su
 *      fuente REAL —`PIEZAS`, `MOLDES_GRAFICOS`, `NOMBRES_ENTRADA` en tiempo de
 *      ejecución; y las uniones del núcleo leídas del propio `nucleo.ts` para
 *      envolturas, ambiente, ejes de grupo y pieles—. Se leen del archivo a
 *      propósito: si se leyeran de la tabla del catálogo, la comprobación sería
 *      el catálogo comparándose consigo mismo.
 *   2. TODA FICHA TIENE RUTA: nada sobra, nada tiene campos vacíos y el archivo
 *      que cita existe en el disco.
 *   3. TODA FICHA TIENE DEMO en `Catalogo.tsx`, y ninguna demo está huérfana:
 *      una demo sin ficha es un escaparate enseñando algo que el plan no sabe
 *      escribir, que es exactamente la forma del fallo original.
 *   4. `SIN_RUTA` no solapa con el catálogo: el día que uno de esos componentes
 *      gane ruta, tiene que caerse de esa lista.
 *   5. El markdown publicado no está viejo.
 */
import fs from "node:fs";
import path from "node:path";
import { borrar, carpetaTemporal, leerTexto, relativa } from "../../../herramientas/comun.mjs";
import { construyeMd, root, salidaMd, transpilaYCarga } from "./generar-catalogo.mjs";

const graficos = path.join(root, "remotion", "src", "motor", "graficos");
const nucleoTs = path.join(root, "remotion", "src", "motor", "plan", "nucleo.ts");
const catalogoTsx = path.join(graficos, "Catalogo.tsx");

/* ── Carga: catálogo + dialecto + núcleo, en un entry sintético ─────────── */

const tmp = carpetaTemporal("revisa-catalogo-");
const entry = path.join(tmp, "entry.ts");
fs.writeFileSync(
  entry,
  `export * as fichas from ${JSON.stringify(path.join(graficos, "fichas.ts"))};\n` +
    `export * as dialecto from ${JSON.stringify(path.join(graficos, "coreografia.ts"))};\n` +
    `export * as nucleo from ${JSON.stringify(nucleoTs)};\n`
);
let mod;
try {
  mod = await transpilaYCarga(entry);
} finally {
  borrar(tmp);
}

const { CATALOGO, EJES, SIN_RUTA } = mod.fichas;
const { PIEZAS, MOLDES_GRAFICOS } = mod.dialecto;
const { NOMBRES_ENTRADA } = mod.nucleo;

/* ── Lo que el núcleo declara, leído del núcleo ──────────────────────────
 * Los tipos no existen en tiempo de ejecución: la única fuente independiente de
 * "qué envolturas hay" es el archivo donde se declaran. Si estos recortes dejan
 * de encontrar nada, el script FALLA (no pasa en silencio): un cero aquí sería
 * un verde falso, que es peor que un rojo molesto.
 *
 * Los archivos se leen con `leerTexto` (sin BOM, con LF): los recortes buscan
 * `\n` literales y en un clon con autocrlf el fuente llega con CRLF. */

const fuenteNucleo = leerTexto(nucleoTs);

const trozo = (desde, hasta) => {
  const a = fuenteNucleo.indexOf(desde);
  const b = fuenteNucleo.indexOf(hasta, a + 1);
  if (a < 0 || b < 0) return null;
  return fuenteNucleo.slice(a, b);
};

const todas = (texto, re) => {
  const out = [];
  let m;
  while ((m = re.exec(texto)) !== null) out.push(m[1]);
  return out;
};

const bloqueEnvoltura = trozo("export type Envoltura<", "export type ClaveEnvoltura");
const bloqueAmbiente = trozo("export interface Ambiente<", "export type ClaveAmbiente");
const bloqueGrupo = trozo("export type Grupo<", "export type Nodo<");
const bloquePiel = trozo("export interface Piel<", "export type CajaPiel");

const literales = (s) => todas(s, /"(\w+)"/g);

const DECLARADAS = {
  envoltura: bloqueEnvoltura ? todas(bloqueEnvoltura, /\{\s*env:\s*"(\w+)"/g) : [],
  // Claves de PRIMER nivel del interface (dos espacios de sangría): lo anidado
  // (`cambiaEn`, `modo`, `n`…) va a cuatro o más y no es una capa de ambiente.
  ambiente: bloqueAmbiente ? todas(bloqueAmbiente, /^ {2}(\w+)\??:/gm) : [],
  eje: bloqueGrupo ? todas(bloqueGrupo, /eje: ((?:"\w+"(?:\s*\|\s*)?)+)/g).reduce((a, s) => a.concat(literales(s)), []) : [],
  piel: bloquePiel ? literales((/caja: ([^;]+);/.exec(bloquePiel) ?? ["", ""])[1]) : [],
};

/* ── Comprobaciones ─────────────────────────────────────────────────────── */

const fallos = [];
const falla = (m) => fallos.push(m);

const clavesDe = (eje) => CATALOGO.filter((f) => f.eje === eje).map((f) => f.clave);

/** Las dos direcciones a la vez: nada anunciado de más, nada servido de menos. */
const compara = (que, anunciadas, reales) => {
  if (reales.length === 0) {
    falla(`${que}: no encontré NINGUNA fuente real que comparar — el recorte del archivo dejó de valer, arréglalo antes de fiarte del verde`);
    return;
  }
  for (const c of anunciadas) if (reales.indexOf(c) < 0) falla(`${que}: el catálogo anuncia "${c}" y no existe (ficha sin ruta)`);
  for (const c of reales) if (anunciadas.indexOf(c) < 0) falla(`${que}: "${c}" existe y no tiene ficha (ruta sin ficha)`);
};

compara("piezas", clavesDe("pieza"), Object.keys(PIEZAS));
compara("moldes", clavesDe("molde"), Object.keys(MOLDES_GRAFICOS));
compara("entradas", clavesDe("entrada"), NOMBRES_ENTRADA.slice());
compara("envolturas", clavesDe("envoltura"), DECLARADAS.envoltura);
compara("ambiente", clavesDe("ambiente"), DECLARADAS.ambiente);
compara("gramática", clavesDe("gramatica"), DECLARADAS.eje.concat(DECLARADAS.piel));

// 2 · fichas bien formadas
const vistos = Object.create(null);
const ejesValidos = EJES.map((e) => e.id);
for (const f of CATALOGO) {
  if (vistos[f.id]) falla(`id duplicado: "${f.id}"`);
  vistos[f.id] = true;
  if (f.id !== `${f.eje}:${f.clave}`) falla(`${f.id}: el id no es "eje:clave"`);
  if (ejesValidos.indexOf(f.eje) < 0) falla(`${f.id}: eje "${f.eje}" no está en EJES`);
  for (const campo of ["nombre", "ruta", "que", "cuando", "archivo"])
    if (!f[campo] || String(f[campo]).trim() === "") falla(`${f.id}: "${campo}" vacío`);
  if (f.ruta && f.ruta.indexOf(f.clave) < 0) falla(`${f.id}: la ruta "${f.ruta}" no menciona la clave "${f.clave}"`);
  if (f.archivo && !fs.existsSync(path.join(graficos, f.archivo)))
    falla(`${f.id}: cita el archivo "${f.archivo}", que no existe en motor/graficos/`);
}

// 3 · demos del contact sheet
const fuenteCatalogo = leerTexto(catalogoTsx);
const iniDemos = fuenteCatalogo.indexOf("const DEMOS: Record<string, React.FC> = {");
const finDemos = fuenteCatalogo.indexOf("\n};", iniDemos);
if (iniDemos < 0 || finDemos < 0) {
  falla("Catalogo.tsx: no encuentro el objeto DEMOS (¿cambió su declaración?)");
} else {
  const demos = todas(fuenteCatalogo.slice(iniDemos, finDemos), /^ {2}"([^"]+)":/gm);
  const ids = CATALOGO.map((f) => f.id);
  for (const id of ids) if (demos.indexOf(id) < 0) falla(`Catalogo.tsx: falta la demo de "${id}"`);
  for (const d of demos) if (ids.indexOf(d) < 0) falla(`Catalogo.tsx: la demo "${d}" no corresponde a ninguna ficha`);
}

// 4 · SIN_RUTA no puede solapar con el catálogo
for (const c of SIN_RUTA)
  for (const nombre of c.nombre.split("·").map((s) => s.trim()))
    for (const f of CATALOGO)
      if (f.nombre === nombre)
        falla(`SIN_RUTA lista "${nombre}", que YA tiene ficha (${f.id}): o gana ruta y sale de SIN_RUTA, o al revés`);

// 5 · el markdown publicado. Se lee normalizado (sin BOM, con LF): con autocrlf
// el archivo llega con CRLF y una comparación literal diría «viejo» siempre.
const esperado = construyeMd({ CATALOGO, EJES, SIN_RUTA });
const publicado = fs.existsSync(salidaMd) ? leerTexto(salidaMd) : "";
if (publicado !== esperado)
  falla(
    `${relativa(salidaMd)} está viejo — regenéralo:\n` +
      `     node manuales/motion-graphics/scripts/generar-catalogo.mjs`
  );

/* ── Salida ─────────────────────────────────────────────────────────────── */

const porEje = EJES.map((e) => `${CATALOGO.filter((f) => f.eje === e.id).length} ${e.id}`).join(" · ");
console.log(`\n📚 catálogo de gráficos — ${CATALOGO.length} entradas (${porEje}) + ${SIN_RUTA.length} sin ruta\n`);

if (fallos.length === 0) {
  console.log("✅ Toda ficha tiene ruta, toda ruta tiene ficha, toda ficha tiene demo y el markdown está al día.\n");
  process.exit(0);
}

console.log(`⚠️  ${fallos.length} fallo(s):\n`);
for (const f of fallos) console.log(`   · ${f}`);
console.log("");
process.exit(1);
