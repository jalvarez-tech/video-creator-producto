#!/usr/bin/env node
/**
 * revisar-broll.mjs — LA PUERTA ENTRE EL PLAN Y EL DISCO.
 *
 * Uso (desde cualquier sitio):
 *   node manuales/video-noticias/scripts/revisar-broll.mjs remotion/src/proyectos/006/noticia-006.ts
 *   node manuales/video-noticias/scripts/revisar-broll.mjs <plan> --proyecto 006
 *
 * POR QUÉ EXISTE, y por qué NO es una regla más de `revisaPlan`. Todo lo que
 * vigila este archivo pasa fuera del plan: si el fichero está en disco, cuántos
 * píxeles tiene de verdad, cuánto dura el clip y de quién es. `revisaPlan` corre
 * con `node` pelado y dentro de un `useMemo` del intérprete — no tiene `fs`, no
 * puede llamar a `ffprobe`, y no debe: la capa de datos valida DATOS. La frontera
 * es limpia y hay que mantenerla: `revisar-plan.mjs` mide el plan, este mide el
 * material.
 *
 * Los cuatro fallos que caza, y los cuatro son invisibles hasta el render final:
 *
 *   1. `media` que apunta a un archivo que no está. Remotion monta el marco y
 *      sigue; el hueco solo se ve mirando el frame.
 *   2. Material MÁS PEQUEÑO QUE SU HUECO. Con `objectFit: cover` no hay banda
 *      negra que delate nada: el motor lo estira y se ve blando. Y el hueco no
 *      es el que parece — la toma `retrato` mide 624×804 pero lleva un Ken Burns
 *      de 1 → 1.06 encima, así que al final del plano se está viendo el 94 % del
 *      área. Pedir justo la medida del marco es pedir un plano reescalado.
 *   3. Clip MÁS CORTO QUE SU TOMA. `<OffthreadVideo>` congela el último frame:
 *      el plano se queda quieto sin que nada falle.
 *   4. Material SIN CRÉDITO en el manifiesto. No es burocracia: es lo que se
 *      pega en la descripción del vídeo y lo único que queda si alguien reclama.
 *      Y es el que más fácil se cuela, porque es el único que no se ve en pantalla.
 *
 * Y cuando falta el material pero el plan SÍ dice qué quiere (`buscarMedia`),
 * esto no se limita a protestar: imprime el comando exacto que hay que correr.
 *
 * SALE CON 1 SI HAY AVISOS, para que sirva de puerta y no de informe.
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { RAIZ, borrar, carpetaTemporal, ejecutar, leerTexto, plataforma, relativa } from "../../../herramientas/comun.mjs";

const root = RAIZ;
const remotionDir = path.join(root, "remotion");
const publicDir = path.join(remotionDir, "public");

const args = process.argv.slice(2);
const rel = args.find((a) => !a.startsWith("--")) ?? "src/motor/demos/noticia-demo.ts";
const iProy = args.indexOf("--proyecto");
let proyecto = iProy >= 0 ? args[iProy + 1] : null;

const candidatas = path.isAbsolute(rel)
  ? [rel]
  : [...new Set([path.resolve(process.cwd(), rel), path.join(remotionDir, rel), path.join(root, rel)])];
const planTs = candidatas.find((c) => fs.existsSync(c));
if (!planTs) {
  console.error(`✖ No existe el plan: ${rel}`);
  process.exit(1);
}
// El número de proyecto sale de la propia ruta (…/proyectos/006/…) salvo que se
// diga otra cosa: es lo que permite correr esto sin pensar.
if (!proyecto) proyecto = planTs.match(/proyectos[/\\](\d{3})[/\\]/)?.[1] ?? null;

/* ── Cargar el plan como DATOS (mismo truco que revisar-plan.mjs) ─────────── */

const require = createRequire(path.join(remotionDir, "package.json"));
const esbuild = require("esbuild");
const srcDir = path.join(remotionDir, "src", "motor");
const tmp = carpetaTemporal("broll-");
const entry = path.join(tmp, "entry.ts");
fs.writeFileSync(
  entry,
  `export * as plan from ${JSON.stringify(planTs)};\n` +
    `export { compilaNoticia } from ${JSON.stringify(path.join(srcDir, "noticias", "dialecto.ts"))};\n` +
    `export { duracionPlan } from ${JSON.stringify(path.join(srcDir, "noticias", "plan.ts"))};\n` +
    `export { ventanaAbs, recorre, esGrupo } from ${JSON.stringify(path.join(srcDir, "plan", "nucleo.ts"))};\n`
);
const bundle = path.join(tmp, "out.cjs");
let mod;
try {
  await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    platform: "node",
    format: "cjs",
    outfile: bundle,
    logLevel: "error",
  });
  mod = require(bundle);
} finally {
  borrar(tmp);
}

const exports_ = Object.values(mod.plan);
const tomas = exports_.find((v) => Array.isArray(v) && v.length && v[0]?.tipo && v[0]?.beat);
const planYa = exports_.find(
  (v) => v && typeof v === "object" && !Array.isArray(v) && v.formato && Array.isArray(v.tomas) && v.dialecto
);
if (!tomas && !planYa) {
  console.error(`✖ ${rel} no exporta ni un TomaNoticia[] ni un Plan`);
  process.exit(1);
}
const compilado =
  planYa ?? mod.compilaNoticia(tomas, { ancho: 1080, alto: 1920, fps: 30, duracion: mod.duracionPlan(tomas) });
const { ancho: ANCHO, alto: ALTO, fps: FPS, duracion: DUR } = compilado.formato;

/* ── Qué pide cada toma ──────────────────────────────────────────────────────
 *
 * Se lee del plan COMPILADO y no de las `TomaNoticia`, para que valga igual con
 * las dos gramáticas — y porque lo que se monta es el compilado. La distinción
 * que importa es `sangre`: decide contra qué medida se compara. */

// LAS MISMAS MEDIDAS QUE `bancos.py` (HUECOS), y tienen que seguir siéndolo: si
// discrepan, un asset lo acepta un script y lo rechaza el otro. El mínimo es el
// que hace falta para no reescalar hacia arriba, no un ideal.
const HUECOS = {
  // A sangre: el cuadro entero.
  sangre: { ancho: ANCHO, alto: ALTO, que: "a sangre" },
  // Enmarcado: TarjetaFoto de 640×820 menos 8 px de borde por lado
  // (LAYOUT.borde) = 624×804, y encima el Ken Burns de 1 → 1.06 de Editorial.tsx.
  // En el frame más ampliado hace falta ese 6 % extra para seguir teniendo un
  // píxel de fuente por píxel dibujado.
  marco: { ancho: Math.ceil(624 * 1.06), alto: Math.ceil(804 * 1.06), que: "enmarcado + Ken Burns" },
};

const pedidos = [];
for (const t of compilado.tomas) {
  const [a, b] = mod.ventanaAbs(t.ventana, DUR);
  mod.recorre(t.hijos, t.id, (v) => {
    if (mod.esGrupo(v.nodo) || v.nodo.pieza !== "media") return;
    pedidos.push({
      toma: t.id,
      src: v.nodo.props?.src,
      esVideo: !!v.nodo.props?.esVideo,
      hueco: v.nodo.props?.sangre ? HUECOS.sangre : HUECOS.marco,
      frames: b - a,
    });
  });
}

// La intención declarada vive en las `TomaNoticia` (el compilado ya no la lleva:
// no es asunto del intérprete). Sin ellas —plan nativo— simplemente no hay
// comando que sugerir, y se dice.
const intenciones = new Map();
for (const t of tomas ?? []) {
  const bm = t.buscarMedia;
  if (bm) intenciones.set(t.id, typeof bm === "string" ? { consulta: bm } : bm);
}

/* ── El manifiesto ───────────────────────────────────────────────────────── */

const rutaManifiesto = proyecto ? path.join(root, "proyectos", proyecto, "broll", "manifiesto.json") : null;
let manifiesto = null;
if (rutaManifiesto && fs.existsSync(rutaManifiesto)) {
  try {
    // `leerTexto`: un manifiesto guardado con BOM (Bloc de notas) no es JSON válido para `JSON.parse`.
    manifiesto = JSON.parse(leerTexto(rutaManifiesto));
  } catch (e) {
    console.error(`✖ manifiesto ilegible: ${e.message}`);
    process.exit(1);
  }
}

/* ── Medir de verdad ─────────────────────────────────────────────────────── */

// `ejecutar` busca ffprobe también en la carpeta de herramientas del usuario (la
// que llena `node herramientas/setup.mjs`), no solo en el PATH.
let hayFfprobe = true;
function mide(archivo) {
  const r = ejecutar("ffprobe", [
    "-v", "error", "-select_streams", "v:0", "-show_entries",
    "stream=width,height:format=duration", "-of", "json", archivo,
  ]);
  if (r.faltaBinario) {
    hayFfprobe = false;
    return null;
  }
  if (r.status !== 0) return null;
  try {
    const j = JSON.parse(r.stdout);
    const s = (j.streams || [])[0] || {};
    return { ancho: s.width, alto: s.height, dur: Number(j.format?.duration) || null };
  } catch {
    return null;
  }
}

/** Cómo conseguir ffmpeg/ffprobe en esta máquina. Lo primero es siempre el instalador del repo. */
function pistaFfmpeg() {
  const { so } = plataforma();
  const base = "node herramientas/setup.mjs (deja ffmpeg y ffprobe en la carpeta de herramientas del usuario)";
  if (so === "windows") return `${base}, o winget install Gyan.FFmpeg`;
  if (so === "mac") return `${base}, o el ffmpeg de Homebrew`;
  return `${base}, o el paquete ffmpeg de tu distribución`;
}

/* ── El informe ──────────────────────────────────────────────────────────── */

const avisos = [];
const comandos = [];
let medidos = 0;

console.log(`\n🎞  ${relativa(planTs)}`);
console.log(
  `   ${compilado.tomas.length} tomas · ${pedidos.length} hueco(s) de media · proyecto ${proyecto ?? "(sin detectar)"}\n`
);

for (const p of pedidos) {
  if (!p.src) {
    const q = intenciones.get(p.toma);
    if (q && proyecto) {
      avisos.push(`[${p.toma}] declara \`buscarMedia\` pero no tiene media: falta traerla`);
      // En UNA línea y con `uv run`: PowerShell no entiende la continuación `\`
      // de bash, y `python3` en Windows suele ser el alias de la tienda.
      comandos.push(
        `uv run manuales/edicion-video/scripts/bancos.py traer --proyecto ${proyecto} --toma ${p.toma}` +
          ` --consulta "${q.consulta}" --para ${p.hueco === HUECOS.sangre ? "escenario" : "retrato"}` +
          `${q.tipo === "video" ? " --tipo video" : ""}${q.indice ? ` --indice ${q.indice}` : ""}` +
          `${p.esVideo || q.tipo === "video" ? ` --duracion-min ${Math.ceil(p.frames / FPS)}` : ""}`
      );
    } else {
      avisos.push(`[${p.toma}] sin media y sin \`buscarMedia\`: el plan no dice qué debería ir ahí`);
    }
    continue;
  }

  const archivo = path.join(publicDir, p.src);
  if (!fs.existsSync(archivo)) {
    avisos.push(`[${p.toma}] media "${p.src}" NO está en remotion/public/`);
    if (manifiesto?.assets?.[p.toma]) {
      comandos.push(`uv run manuales/edicion-video/scripts/bancos.py reponer --proyecto ${proyecto}`);
    }
    continue;
  }

  const m = mide(archivo);
  if (!m) {
    avisos.push(`[${p.toma}] no se pudo medir "${p.src}"${hayFfprobe ? "" : " (falta ffprobe)"}`);
    continue;
  }
  medidos++;

  if (m.ancho < p.hueco.ancho || m.alto < p.hueco.alto)
    avisos.push(
      `[${p.toma}] "${p.src}" mide ${m.ancho}×${m.alto} y su hueco (${p.hueco.que}) pide ${p.hueco.ancho}×${p.hueco.alto}: se verá reescalado`
    );

  if (p.esVideo) {
    const necesita = p.frames / FPS;
    if (m.dur !== null && m.dur + 0.05 < necesita)
      avisos.push(
        `[${p.toma}] el clip dura ${m.dur.toFixed(1)} s y la toma ${necesita.toFixed(1)} s: el último frame se congela`
      );
  } else if (m.dur !== null && m.dur > 0 && /\.(mp4|mov|webm|m4v)$/i.test(p.src)) {
    avisos.push(`[${p.toma}] "${p.src}" es un clip montado como imagen: falta \`esVideo: true\``);
  }

  // El crédito. Se busca por id de toma y, si el plan es nativo (donde el id de
  // la toma no tiene por qué coincidir con la clave del manifiesto), por ruta.
  const a =
    manifiesto?.assets?.[p.toma] ??
    Object.values(manifiesto?.assets ?? {}).find((x) => x.servido === p.src);
  if (!manifiesto) {
    if (proyecto) avisos.push(`[${p.toma}] no hay manifiesto en proyectos/${proyecto}/broll/: nadie sabe de dónde salió`);
  } else if (!a) {
    avisos.push(`[${p.toma}] "${p.src}" no está en el manifiesto: sin autor, sin licencia y sin origen`);
  } else {
    if (!a.autor) avisos.push(`[${p.toma}] en el manifiesto sin autor`);
    if (!a.licencia) avisos.push(`[${p.toma}] en el manifiesto sin licencia`);
    if (a.servido && a.servido !== p.src)
      avisos.push(`[${p.toma}] el plan monta "${p.src}" y el manifiesto registró "${a.servido}"`);
  }
}

if (!hayFfprobe) console.log(`⚠️  sin ffprobe: no se ha medido ni un archivo. Instálalo con ${pistaFfmpeg()}\n`);

if (avisos.length === 0) {
  console.log(
    pedidos.length === 0
      ? "✅ Este plan no pide b-roll (todas sus tomas son gráficas).\n"
      : `✅ B-roll en su sitio: ${medidos} archivo(s) medidos, con crédito y con la medida de su hueco.\n`
  );
  process.exit(0);
}

console.log(`⚠️  b-roll — ${avisos.length} aviso(s):\n`);
for (const a of avisos) console.log(`   · ${a}`);
if (comandos.length) {
  console.log("\n   Lo que falta por correr (un comando por línea, vale en cualquier shell):\n");
  for (const c of [...new Set(comandos)]) console.log(`     ${c}`);
}
console.log();
process.exit(1);
