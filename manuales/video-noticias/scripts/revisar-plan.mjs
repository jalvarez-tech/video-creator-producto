#!/usr/bin/env node
/**
 * revisar-plan.mjs — pasa los DOS validadores sobre un plan y muestra los
 * avisos, sin abrir el Studio ni renderizar nada.
 *
 * Uso (desde cualquier sitio):
 *   node manuales/video-noticias/scripts/revisar-plan.mjs                       # el plan de demo
 *   node manuales/video-noticias/scripts/revisar-plan.mjs remotion/src/proyectos/004/noticia-004.ts
 *   node manuales/video-noticias/scripts/revisar-plan.mjs remotion/src/proyectos/006/noticia-006.ts
 *   node manuales/video-noticias/scripts/revisar-plan.mjs remotion/src/proyectos/004/noticia-004.ts 25   # otro fps
 *
 * Por qué existe: el validador vive en el motor, pero se necesita en el momento
 * de ESCRIBIR el plan — antes de que exista una composición que renderizar.
 * Esperar al Studio para descubrir que dos tomas se solapan cuesta un ciclo
 * entero de render.
 *
 * POR QUÉ DOS VALIDADORES, y no uno. Este script corría solo `revisaNoticia()`,
 * y eso era un FALSO VERDE con nombre y apellidos: sobre `noticia-004.ts` —una
 * pieza PUBLICADA— imprimía «✅ Plan limpio» y salía 0, mientras el motor, al
 * renderizar, emitía dos avisos reales (`[n05-transicion/1/0]` chip de tres
 * palabras y `[n09-suelo/1/0]` cifra 6.7 con `decimales: 0`, que en pantalla
 * sale «7» y deja de ser la cifra de la fuente). Y sobre `noticia-006.ts`, la
 * pieza escrita ya en la gramática nueva, ni siquiera la leía: «no exporta
 * ningún TomaNoticia[]». O sea que el aviso de ancho (R09) que existe para
 * cazar el texto que se sale de la zona segura NUNCA llegaba al autor por el
 * camino que el manual le indica, y el camino que sí le indica le devolvía un
 * verde que contradecía al motor. Un verde falso es peor que no tener
 * herramienta: enseña a no mirar.
 *
 * Los dos miran cosas distintas y ninguno cubre al otro:
 *   · `revisaNoticia(tomas, fps)` — reglas del FORMATO editorial sobre la lista
 *     de tomas: huecos, solapes, tomas < 0.8 s o > 6 s, `reason` vacío, primera
 *     toma sin beat «gancho», 4 tomas `cine` seguidas. Solo aplica si el
 *     fichero exporta `TomaNoticia[]`.
 *   · `revisaPlan(plan)` — reglas del SUSTRATO sobre el plan compilado: R08
 *     (alto que no cabe en el molde), R09 (ancho), tintas de marca usadas como
 *     color de texto, y las reglas `ficha.revisa` de cada pieza. Aplica siempre:
 *     si el fichero exporta `TomaNoticia[]` se compila antes con
 *     `compilaNoticia()`, que es exactamente lo que hace `<PistaNoticia>`.
 *
 * SALE CON 1 SI HAY AVISOS, para que sirva de puerta y no de informe.
 *
 * Cómo lee TypeScript sin dependencias nuevas: transpila con el esbuild que
 * Remotion ya trae (mismo truco que generar-catalogo.mjs). Tanto el plan como
 * `dialecto.ts` y `nucleo.ts` son datos puros —ni un import de React ni de
 * Remotion en tiempo de ejecución—, así que el bundle no arrastra React.
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { RAIZ, borrar, carpetaTemporal } from "../../../herramientas/comun.mjs";

const root = RAIZ;
const remotionDir = path.join(root, "remotion");

const rel = process.argv[2] ?? "src/motor/demos/noticia-demo.ts";

// Un fps no numérico daba FALSO VERDE: `Number("veinticinco")` es NaN, toda
// comparación con NaN es false, y las dos comprobaciones de duración (< 0.8 s y
// > 6 s) se saltaban en silencio mientras la cabecera imprimía "NaN s @ NaN fps".
const fps = Number(process.argv[3] ?? 30);
if (!Number.isFinite(fps) || fps <= 0) {
  console.error(`✖ fps inválido: "${process.argv[3]}". Tiene que ser un número > 0 (p. ej. 30).`);
  process.exit(1);
}

// El README dice que TODAS sus rutas son relativas a la raíz del repo, pero este
// script las resolvía contra remotion/. Ahora acepta las dos formas, en el orden
// que menos sorprende: absoluta → tal cual como la escribió el usuario → bajo
// remotion/ (la forma histórica, que se sigue documentando en los SKILL).
const candidatas = path.isAbsolute(rel)
  ? [rel]
  : [...new Set([path.resolve(process.cwd(), rel), path.join(remotionDir, rel), path.join(root, rel)])];
const planTs = candidatas.find((c) => fs.existsSync(c));

if (!planTs) {
  console.error(`✖ No existe el plan: ${rel}`);
  console.error("   Probé:");
  for (const c of candidatas) console.error(`     · ${c}`);
  process.exit(1);
}

const require = createRequire(path.join(remotionDir, "package.json"));
const esbuild = require("esbuild");

// Punto de entrada sintético: reexporta el plan Y los dos validadores, para que
// el bundle resuelva todo sin que el archivo del plan tenga que importar nada más.
const tmp = carpetaTemporal("noticia-");
const entry = path.join(tmp, "entry.ts");
const planUrl = JSON.stringify(planTs);
const srcDir = path.join(remotionDir, "src", "motor");
const noticiaUrl = JSON.stringify(path.join(srcDir, "noticias", "plan.ts"));
const dialectoUrl = JSON.stringify(path.join(srcDir, "noticias", "dialecto.ts"));
const nucleoUrl = JSON.stringify(path.join(srcDir, "plan", "nucleo.ts"));
fs.writeFileSync(
  entry,
  `export * as plan from ${planUrl};\n` +
    `export { revisaNoticia, duracionPlan } from ${noticiaUrl};\n` +
    `export { compilaNoticia } from ${dialectoUrl};\n` +
    `export { revisaPlan } from ${nucleoUrl};\n`
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
  // `borrar` reintenta: en Windows el antivirus retiene un instante el .cjs recién creado.
  borrar(tmp);
}

// El plan puede exportarse con cualquier nombre (noticiaDemo, noticia004…) y en
// una de DOS formas, porque la migración a la gramática única dejó las dos
// vivas y las dos legítimas:
//   · `TomaNoticia[]`  — 004 y 005, datos congelados de piezas publicadas.
//   · `Plan`           — 006, escrita ya contra el sustrato.
// Reconocer solo la primera era la razón de que el 006 no se pudiera validar.
const exports = Object.values(mod.plan);
const tomas = exports.find((v) => Array.isArray(v) && v.length && v[0]?.tipo && v[0]?.beat);
// Un `Plan` se reconoce por su forma, no por un campo `tipo`: `formato` +
// `tomas` + `dialecto` es lo que devuelve `plan()` en nucleo.ts.
const planYa = exports.find(
  (v) => v && typeof v === "object" && !Array.isArray(v) && v.formato && Array.isArray(v.tomas) && v.dialecto
);

if (!tomas && !planYa) {
  console.error(`✖ ${rel} no exporta ni un TomaNoticia[] ni un Plan`);
  process.exit(1);
}

// `compilaNoticia` es la MISMA función que llama `<PistaNoticia>`: lo que se
// valida aquí es literalmente lo que se va a montar, no una aproximación.
// El `formato` va explícito y no por defecto: el defecto de `compilaNoticia`
// fija 30 fps, así que con el argumento de CLI a 25 la cabecera habría dicho
// 25 y el validador habría medido contra 30 — dos números para una sola pieza.
const planFinal =
  planYa ??
  mod.compilaNoticia(tomas, { ancho: 1080, alto: 1920, fps, duracion: mod.duracionPlan(tomas) });

const avisosFormato = tomas ? mod.revisaNoticia(tomas, fps) : [];
const avisosSustrato = mod.revisaPlan(planFinal);

// El fps de un `Plan` lo trae el propio plan; el argumento de la CLI solo tiene
// sentido para `TomaNoticia[]`, que no lo lleva dentro. Imprimir el del plan
// evita la cabecera mentirosa de «@ 30 fps» sobre una pieza a 25.
const fpsReal = planYa ? planFinal.formato.fps : fps;
const dur = planFinal.formato.duracion;
const nTomas = planFinal.tomas.length;

console.log(`\n📰 ${rel}`);
console.log(
  `   ${nTomas} tomas · ${dur} f · ${(dur / fpsReal).toFixed(2)} s @ ${fpsReal} fps` +
    `   (${tomas ? "TomaNoticia[] → compilaNoticia()" : "Plan nativo"})\n`
);

const total = avisosFormato.length + avisosSustrato.length;

if (total === 0) {
  console.log("✅ Plan limpio: formato (huecos, solapes, duraciones, reason) y sustrato (R08, R09, tintas).\n");
  process.exit(0);
}

if (avisosFormato.length) {
  console.log(`⚠️  formato editorial — ${avisosFormato.length} aviso(s):\n`);
  for (const a of avisosFormato) console.log(`   · ${a}`);
  console.log("");
}
if (avisosSustrato.length) {
  console.log(`⚠️  sustrato (revisaPlan) — ${avisosSustrato.length} aviso(s):\n`);
  for (const a of avisosSustrato) console.log(`   · ${a}`);
  console.log("");
}
process.exit(1);
