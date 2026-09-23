#!/usr/bin/env node
/**
 * revisar-velo.mjs — EL TEST DE QUE `veloProtege` NO MIENTE.
 *
 * Uso (desde cualquier sitio):
 *   node manuales/video-noticias/scripts/revisar-velo.mjs
 *
 * POR QUÉ EXISTE. El degradado que protege al titular sobre metraje era el
 * `scrim` del MOLDE, y un scrim de molde «nace con la toma y nadie puede
 * olvidarlo». Al convertirse en la pieza `velo` —obligado: el ambiente se pinta
 * bajo los hijos y el metraje a sangre ES un hijo— esa propiedad se pierde: una
 * pieza sí se puede olvidar. Quien la devuelve es la regla `veloProtege` del
 * dialecto, y esta es la prueba de que la regla funciona.
 *
 * Y hace falta, porque el fallo que vigila es INVISIBLE mientras no haya b-roll:
 * el marco «pendiente» es gris medio y el titular blanco se lee encima. Medido
 * sobre un clip de luma 245, sin velo el titular desaparece del todo — y el plan
 * habría dicho LIMPIO todo el camino.
 *
 * CÓMO PRUEBA. Construye planes NATIVOS mínimos (que es donde el velo se olvida
 * de verdad: un `Plan` a mano no pasa por `compilaToma`) y exige de cada uno el
 * aviso concreto. El primer caso exige lo contrario: SILENCIO. Sin ese caso,
 * una regla que avisara siempre también pasaría.
 *
 * Sale con 1 si algún caso falla, para que sirva de puerta y no de informe.
 * Mismo trato que `revisar-catalogo.mjs`: si estos casos dejan de disparar, el
 * verde es falso.
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { RAIZ, borrar, carpetaTemporal } from "../../../herramientas/comun.mjs";

const root = RAIZ;
const remotionDir = path.join(root, "remotion");
const srcDir = path.join(remotionDir, "src", "motor");

/* ── Cargar el dialecto como DATOS ───────────────────────────────────────────
 * Mismo truco que `revisar-plan.mjs`: un entry sintético transpilado con el
 * esbuild que ya trae Remotion. El dialecto y el núcleo son datos puros, así que
 * el bundle es trivial y no arrastra React. */
const require = createRequire(path.join(remotionDir, "package.json"));
const esbuild = require("esbuild");

const tmp = carpetaTemporal("velo-");
const entry = path.join(tmp, "entry.ts");
fs.writeFileSync(
  entry,
  `export { NOTICIAS, capa } from ${JSON.stringify(path.join(srcDir, "noticias", "dialecto.ts"))};\n` +
    `export { revisaPlan } from ${JSON.stringify(path.join(srcDir, "plan", "nucleo.ts"))};\n`
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

/* ── Los casos ───────────────────────────────────────────────────────────── */

const { pon, gfx, plan } = mod.capa(mod.NOTICIAS, "noticia");

const QUIETA = { como: "ninguna" };
/** El ancla que compila `escenario`: LAYOUT.cuelgaCine (560) sobre el alto de diseño. */
const CUELGA = { desde: "centro", pct: 0.5, cuelga: 560 / 1920 };

const MEDIA = (extra = {}) => pon("media", { src: "x.jpg", sangre: true, en: 0, entra: QUIETA, ...extra });
const VELO = (extra = {}) => pon("velo", { en: 0, entra: QUIETA, ...extra });
const TITULAR = () =>
  pon("titular", { texto: "Y la IA ya es política", px: 74, en: 4, rol: "hero", color: "blanco", entra: QUIETA });

const uno = (hijos, extra = {}) =>
  plan({ ancho: 1080, alto: 1920, fps: 30, duracion: 90 }, [
    gfx("t", "cine", "climax", [0, 90], "hero", "caso de prueba", hijos, { ancla: CUELGA, ...extra }),
  ]);

const CASOS = [
  // El caso que exige SILENCIO. Sin él, una regla rota que avisara siempre
  // también pasaría este archivo.
  { nombre: "correcto (media → velo → titular)", plan: uno([MEDIA(), VELO(), TITULAR()]), espera: null },
  { nombre: "sin velo", plan: uno([MEDIA(), TITULAR()]), espera: "sin `velo`" },
  {
    nombre: "velo por debajo del metraje",
    plan: uno([VELO(), MEDIA(), TITULAR()]),
    espera: "va ENTRE el metraje y el texto",
  },
  {
    nombre: "velo por encima del texto",
    plan: uno([MEDIA(), TITULAR(), VELO()]),
    espera: "va ENTRE el metraje y el texto",
  },
  {
    nombre: "velo demasiado corto (300 px)",
    plan: uno([MEDIA(), VELO({ alto: 300 }), TITULAR()]),
    espera: "se sale del degradado",
  },
  // Un velo que existe pero mira al otro lado: oscurece la mitad que no lleva
  // texto y, por el mero hecho de existir, apagaba el aviso de «sin velo».
  // Medido: la banda del titular queda idéntica a no tener velo ninguno.
  {
    nombre: 'velo con desde:"arriba" sobre un titular que cuelga',
    plan: uno([MEDIA(), VELO({ desde: "arriba" }), TITULAR()]),
    espera: "se sale del degradado",
  },
  {
    nombre: "velo con entrada de muelle",
    plan: uno([MEDIA(), VELO({ entra: { como: "muelle", dy: 30 } }), TITULAR()]),
    espera: "se dibuja fuera de cuadro",
  },
  // Los dos casos de entrada OMITIDA. No son un matiz: omitir el campo es lo
  // natural en un plan nativo (el resto de piezas se apoyan en la ley), la ley
  // editorial entra con muelle, y medido eso baja el velo 302 px — justo hasta
  // descubrir la banda del titular. Con la guarda que solo miraba lo escrito,
  // este plan salía LIMPIO.
  {
    nombre: "velo sin `entra` (hereda el muelle de la ley)",
    plan: uno([MEDIA(), pon("velo", { en: 0 }), TITULAR()]),
    espera: "heredada de la ley",
  },
  {
    nombre: "media a sangre sin `entra`",
    plan: uno([pon("media", { src: "x.jpg", sangre: true, en: 0 }), VELO(), TITULAR()]),
    espera: "heredada de la ley",
  },
  {
    nombre: "velo al 30 % (ficha.revisa)",
    plan: uno([MEDIA(), VELO({ opacidad: 0.3 }), TITULAR()]),
    espera: "aporta TODO el contraste",
  },
  {
    nombre: 'cuelga con ancla "abajo" (aviso del núcleo)',
    plan: uno([MEDIA(), VELO(), TITULAR()], { ancla: { desde: "abajo", pct: 0.29, cuelga: 0.29 } }),
    espera: "esa caja es de alto AUTO",
  },
];

console.log("\n🎬 velo — protección del texto sobre metraje\n");

let fallos = 0;
for (const c of CASOS) {
  // Se filtra a lo que habla del velo, del ancla o de la entrada de una pieza a
  // sangre: un plan mínimo dispara además avisos de ley y de ritmo que no son
  // asunto de este test. Ojo con estrechar más este filtro: el aviso de entrada
  // del `media` a sangre no lleva la palabra "velo", y con un filtro que solo
  // buscaba /velo|cuelga/ este archivo daba por bueno un caso que no pasaba.
  const propios = mod.revisaPlan(c.plan).filter((a) => /velo|cuelga|entra con/i.test(a));
  if (c.espera === null) {
    if (propios.length === 0) console.log(`   ✅ ${c.nombre} — silencio`);
    else {
      console.log(`   ❌ ${c.nombre} — avisó sin motivo:\n        ${propios.join("\n        ")}`);
      fallos++;
    }
  } else if (propios.some((a) => a.includes(c.espera))) {
    console.log(`   ✅ ${c.nombre} — avisa`);
  } else {
    console.log(`   ❌ ${c.nombre} — esperaba «${c.espera}» y salió:\n        ${propios.join("\n        ") || "(nada)"}`);
    fallos++;
  }
}

console.log(
  fallos === 0
    ? "\n✅ Los avisos del velo disparan cuando toca y callan cuando no.\n"
    : `\n✖ ${fallos} caso(s) mal: la regla que protege al titular sobre metraje no vale.\n`
);
process.exit(fallos === 0 ? 0 : 1);
