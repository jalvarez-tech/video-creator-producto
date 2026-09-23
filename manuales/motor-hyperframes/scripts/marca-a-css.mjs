#!/usr/bin/env node
/**
 * marca-a-css.mjs — LA MARCA, TAMBIÉN EN EL SEGUNDO MOTOR.
 *
 * Uso (desde cualquier sitio):
 *   node manuales/motor-hyperframes/scripts/marca-a-css.mjs ejemplo proyectos/001/hf/marca.css
 *   node manuales/motor-hyperframes/scripts/marca-a-css.mjs --lista
 *
 * POR QUÉ EXISTE. `src/marcas/<canal>.ts` es la respuesta del repo a «dos marcas
 * no pueden convivir»: los colores, la letra y el sello dejaron de ser un
 * `export const` de módulo y pasaron a ser un PARÁMETRO que la composición pasa.
 * Un segundo motor que vuelva a escribir un hex a mano en un CSS deshace esa
 * refactorización en el primer archivo — y lo hace en silencio, porque el vídeo
 * sale bien mientras solo haya un canal.
 *
 * Así que la marca no se copia: se GENERA. Este script lee el mismo fichero que
 * lee Remotion y emite las custom properties. Cambiar `<canal>.ts` y volver a
 * correrlo mueve los dos motores a la vez.
 *
 * LA ÚNICA TINTA QUE NO ES UNA COPIA, y es la que justifica que esto sea un
 * script y no un `cp`: `--acento-texto`. El acento de un canal es un color de
 * GRÁFICO (trazos, chips, bordes) y como texto sobre el papel puede quedarse
 * por debajo del 3:1 que exige `hyperframes check` para texto grande (el acento
 * por defecto del motor mide 2.62:1). Remotion nunca lo dijo porque no mide
 * contraste; HyperFrames falla la puerta. La respuesta correcta no es bajar la
 * puerta: es que el acento tenga una variante oscurecida para cuando hace de
 * letra. Se calcula aquí, contra el papel real del canal, y por eso vale para
 * cualquier marca.
 *
 * Sale con 1 si el canal no existe o si el acento de texto no alcanza el 3:1
 * ni oscureciéndolo: eso significa que esa pareja de colores no se puede leer y
 * hay que decirlo antes de montar, no en la puerta de salida.
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { RAIZ, borrar, carpetaTemporal, posix, relativa } from "../../../herramientas/comun.mjs";

const root = RAIZ;
const remotionDir = path.join(root, "remotion");
const marcasDir = path.join(remotionDir, "src", "marcas");

/** Una ruta para ENSEÑAR: relativa a la raíz si cae dentro, absoluta con «/» si no. */
const muestra = (p) => {
  const r = relativa(p);
  return r.startsWith("..") ? posix(path.resolve(p)) : r;
};

const canales = fs.existsSync(marcasDir)
  ? fs
      .readdirSync(marcasDir)
      .filter((f) => f.endsWith(".ts"))
      .map((f) => f.replace(/\.ts$/, ""))
  : [];

const args = process.argv.slice(2);
if (args.includes("--lista") || args.length === 0) {
  console.log(`\n🎨 Canales en src/marcas/: ${canales.join(" · ") || "(ninguno)"}\n`);
  console.log("   Uso: node manuales/motor-hyperframes/scripts/marca-a-css.mjs <canal> <salida.css>\n");
  process.exit(args.length === 0 ? 1 : 0);
}

const [canal, salida] = args;
if (!canales.includes(canal)) {
  console.error(`\n✖ No existe el canal «${canal}». Hay: ${canales.join(" · ") || "(ninguno)"}\n`);
  process.exit(1);
}
if (!salida) {
  console.error("\n✖ Falta la ruta de salida. Ej: proyectos/001/hf/marca.css\n");
  process.exit(1);
}

/* ── Cargar la marca como DATOS ──────────────────────────────────────────────
 * Mismo truco que `revisar-plan.mjs` y `revisar-velo.mjs`: un entry sintético
 * transpilado con el esbuild que ya trae Remotion. `marca.ts` y `marcas/*.ts`
 * son datos puros (el único import es `import type`, que desaparece al
 * compilar), así que esto no arrastra React ni Remotion. */
const require = createRequire(path.join(remotionDir, "package.json"));
const esbuild = require("esbuild");

const tmp = carpetaTemporal("marca-css-");
const entry = path.join(tmp, "entry.ts");
fs.writeFileSync(entry, `export * from ${JSON.stringify(path.join(marcasDir, `${canal}.ts`))};\n`);
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

// El fichero de un canal exporta UNA marca; no se asume cómo se llama.
const marca = Object.values(mod).find((v) => v && typeof v === "object" && "color" in v && "letra" in v);
if (!marca) {
  console.error(`\n✖ ${canal}.ts no exporta ninguna Marca (falta \`color\`/\`letra\`).\n`);
  process.exit(1);
}

/* ── Contraste ───────────────────────────────────────────────────────────────
 * WCAG 2.x relative luminance. Es la misma fórmula que aplica la puerta de
 * `hyperframes check`, así que lo que apruebe aquí aprueba allí. */
const canal8 = (h) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(h.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const lum = (rgb) => {
  const f = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
};
const ratio = (a, b) => {
  const [la, lb] = [lum(a), lum(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};
const hex = (rgb) => "#" + rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

/**
 * Oscurece el acento lo justo para llegar al mínimo sobre el papel del canal.
 * Multiplicativo (no resta plana) para que conserve el tono: un naranja que se
 * oscurece restando se va a marrón, y el acento dejaría de ser reconocible.
 * Devuelve el PRIMERO que pasa, no el más oscuro que quepa: la variante tiene
 * que seguir pareciéndose al acento.
 */
const MINIMO = 3.0; // WCAG AA para texto grande — el umbral que usa `check`
const oscurecePara = (acento, fondo) => {
  const a = canal8(acento);
  const f = canal8(fondo);
  if (!a || !f) return null;
  if (ratio(a, f) >= MINIMO) return { hex: acento, ratio: ratio(a, f), tocado: false };
  for (let k = 0.99; k >= 0.2; k -= 0.01) {
    const cand = a.map((v) => v * k);
    if (ratio(cand, f) >= MINIMO) return { hex: hex(cand), ratio: ratio(cand, f), tocado: true };
  }
  return null;
};

const c = marca.color;
const texto = oscurecePara(c.acento, c.papel);
if (!texto) {
  console.error(
    `\n✖ El acento ${c.acento} no llega a ${MINIMO}:1 sobre el papel ${c.papel} ni oscureciéndolo al 20 %.` +
      `\n  Esa pareja no se puede leer: cambia el acento o el papel en src/marcas/${canal}.ts.\n`
  );
  process.exit(1);
}

const esc = (s) => String(s).replace(/\*\//g, "*\\/");

/* El sello viaja DENTRO del CSS, no solo por la consola. Es lo que permite que
 * `nuevo-hf.mjs` y `revisar-hf.mjs` sepan si este canal lleva watermark sin
 * volver a montar esbuild — y sin esa línea el scaffold montaba la pieza SIN
 * píldora en silencio, que es el fallo que director-video §5b tiene escrito:
 * «Si ves un render sin la píldora de marca, falta el parámetro». */
const selloTexto = marca.sello?.texto ?? null;
const selloCss = selloTexto
  ? `  /* El watermark persistente. Va en TODOS los frames: no es un clip. */\n  --sello: "${esc(selloTexto).replace(/"/g, '\\"')}";\n`
  : `  /* Este canal NO lleva sello (sello.texto: null): la composición no debe pintar píldora. */\n`;

const css = `/* GENERADO por manuales/motor-hyperframes/scripts/marca-a-css.mjs — NO editar a mano.
 * Canal: ${esc(marca.nombre)}  ·  fuente: remotion/src/marcas/${canal}.ts
 * Para cambiar un color, cámbialo allí y vuelve a correr el script: así los dos
 * motores (Remotion y HyperFrames) se mueven a la vez. */
:root {
${selloCss}
  /* Color */
  --acento: ${c.acento};
  /* El acento cuando hace de TEXTO sobre papel. ${
    texto.tocado
      ? `El acento a secas mide ${ratio(canal8(c.acento), canal8(c.papel)).toFixed(2)}:1 y no pasa la puerta de contraste.`
      : `Coincide con el acento: ya pasa la puerta sin tocarlo.`
  } */
  --acento-texto: ${texto.hex};
  --acento-chip: ${c.acentoChip};
  --resalte: ${c.resalte};
  --papel: ${c.papel};
  --hueso: ${c.hueso};
  --negro: ${c.negro};
  --fondo-oscuro: ${c.fondoOscuro};
  --tinta: ${c.tinta};
  --tinta-suave: ${c.tintaSuave};
  --blanco: ${c.blanco};
  --linea: ${c.linea};
  --acento-oscuro: ${c.acentoOscuro};

  /* Letra */
  --letra-display: ${esc(marca.letra.display)};
  --letra-texto: ${esc(marca.letra.texto)};

  /* Forma */
  --radio: ${marca.forma.radio}px;
  --borde: ${marca.forma.borde}px;

  /* Sombra */
  --sombra-caja: ${esc(marca.sombra.caja)};
  --sombra-corta: ${esc(marca.sombra.corta)};
  --sombra-texto: ${esc(marca.sombra.texto)};
  --sombra-texto-cine: ${esc(marca.sombra.textoCine)};

  /* Metraje — el igualado del b-roll, como filtro CSS ya montado.
   * Grano y viñeta NO están aquí: son capas, no filtros. */
  --metraje: saturate(${marca.metraje.saturacion}) contrast(${marca.metraje.contraste});
  --metraje-calido: ${marca.metraje.calido};
  --metraje-grano: ${marca.metraje.grano};
  --metraje-vineta: ${marca.metraje.vineta};
}
`;

const destino = path.resolve(process.cwd(), salida);
fs.mkdirSync(path.dirname(destino), { recursive: true });
fs.writeFileSync(destino, css);

const sello = marca.sello?.texto;
console.log(`\n🎨 ${marca.nombre} → ${muestra(destino)}`);
console.log(`   acento        ${c.acento}`);
console.log(
  texto.tocado
    ? `   acento-texto  ${texto.hex}  (oscurecido: el acento medía ${ratio(canal8(c.acento), canal8(c.papel)).toFixed(2)}:1 sobre el papel, hace falta ${MINIMO}:1)`
    : `   acento-texto  ${texto.hex}  (sin tocar: ya mide ${texto.ratio.toFixed(2)}:1)`
);
console.log(`   papel         ${c.papel}`);
console.log(
  sello
    ? `   sello         «${sello}» — móntalo tú: es cromo persistente, no un clip.\n`
    : `   sello         (este canal no lleva) — la composición NO debe pintar píldora.\n`
);
