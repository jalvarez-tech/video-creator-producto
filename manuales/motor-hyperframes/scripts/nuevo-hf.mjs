#!/usr/bin/env node
/**
 * nuevo-hf.mjs — ABRE UNA PIEZA EN EL SEGUNDO MOTOR.
 *
 * Uso (desde cualquier sitio):
 *   node manuales/motor-hyperframes/scripts/nuevo-hf.mjs 001
 *   node manuales/motor-hyperframes/scripts/nuevo-hf.mjs 001 --canal ejemplo --formato 9:16 --fps 25 --duracion 12
 *   node manuales/motor-hyperframes/scripts/nuevo-hf.mjs 001 --destino otra/carpeta   # fuera de proyectos/NNN/hf
 *
 * QUÉ DEJA MONTADO en `proyectos/NNN/hf/` (o en `--destino`):
 *   index.html   la plantilla ya validada, con dimensiones/fps/duración puestos
 *   marca.css    GENERADO desde src/marcas/<canal>.ts (no es una copia)
 *   vendor/      GSAP vendorizado — sin CDN, la pieza se re-renderiza en 2030
 *   assets/      donde van los MP4, WAV y PNG que use la composición
 *
 * POR QUÉ UN SCAFFOLD Y NO UN `hyperframes init`. `init` scaffolda un proyecto
 * genérico: 16:9, 30 fps, GSAP desde jsdelivr y sin marca. Las tres cosas están
 * mal para este repo —el talking-head va a 25 porque manda el fps del clip de
 * avatar (R01), el b-roll enseñó que una URL de terceros no es un archivo, y la
 * marca es un parámetro desde que dejó de ser un `export const`—. Esto pone las
 * tres bien de salida, que es más barato que arreglarlas en la puerta.
 *
 * El canal por defecto es `ejemplo`, la marca del producto
 * (remotion/src/marcas/ejemplo.ts): un canal propio se pasa con `--canal`.
 */
import fs from "node:fs";
import path from "node:path";
import { RAIZ, borrar, ejecutar, leerTexto, posix, relativa } from "../../../herramientas/comun.mjs";

const skillDir = path.resolve(RAIZ, "manuales", "motor-hyperframes");
const root = RAIZ;

/** Una ruta para ENSEÑAR: relativa a la raíz si cae dentro, absoluta con «/» si no. */
const muestra = (p) => {
  const r = relativa(p);
  return r.startsWith("..") ? posix(path.resolve(p)) : r;
};

/** Los formatos del repo. Mismos lienzos que `presets.ts`. */
const FORMATOS = {
  "9:16": [1080, 1920],
  "16:9": [1920, 1080],
  "1:1": [1080, 1080],
  "4:5": [1080, 1350],
};

const args = process.argv.slice(2);
/** Acepta las dos formas: `--fps 25` y `--fps=25`. Sin la segunda, un
 *  `--fps=25` se colaba como posicional y el valor se perdía EN SILENCIO —
 *  que en este script significa renderizar a 25 creyendo que pediste otra cosa. */
const flag = (n, def) => {
  const conIgual = args.find((a) => a.startsWith(`--${n}=`));
  if (conIgual) return conIgual.slice(n.length + 3);
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : def;
};

/** El posicional: el primer argumento que ni es un flag ni es el VALOR de uno.
 *  Se recorre con índice (no con `indexOf`, que devuelve la primera aparición y
 *  se equivoca en cuanto un valor se repite). */
const nnn = args.find(
  (a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--") && !args[i - 1].includes("="))
);
if (!nnn || !/^\d{3}$/.test(nnn)) {
  console.error(`
✖ Falta el número de proyecto (tres dígitos).

  node manuales/motor-hyperframes/scripts/nuevo-hf.mjs 001 [--canal ejemplo] [--formato 9:16] [--fps 25] [--duracion 8] [--destino carpeta]

  formatos: ${Object.keys(FORMATOS).join(" · ")}
`);
  process.exit(1);
}

const canal = flag("canal", "ejemplo");
const formato = flag("formato", "9:16");
const fps = Number(flag("fps", "25"));
const duracion = Number(flag("duracion", "8"));
const destinoPedido = flag("destino", undefined);

if (!FORMATOS[formato]) {
  console.error(`\n✖ Formato «${formato}» desconocido. Hay: ${Object.keys(FORMATOS).join(" · ")}\n`);
  process.exit(1);
}
/* El fps tiene que ser ENTERO. El motor honra entero o racional `num/den`, pero
 * un decimal lo IGNORA en silencio y renderiza a 30 — y 29.97 es justo lo que
 * devuelve `ffprobe` de un clip NTSC, o sea el error que se va a cometer. */
const fpsCrudo = flag("fps", "25");
if (!/^\d+$/.test(String(fpsCrudo)) || !Number.isFinite(fps) || fps < 1 || fps > 240) {
  console.error(
    `\n✖ fps inválido: ${fpsCrudo}. Tiene que ser un ENTERO entre 1 y 240.` +
      (/^\d+\.\d+$/.test(String(fpsCrudo))
        ? `\n  El motor ignora los decimales y renderiza a 30. Si viene de \`ffprobe\`, edita\n` +
          `  \`data-fps\` a mano con la fracción: 29.97 → "30000/1001", 23.976 → "24000/1001".\n`
        : "\n")
  );
  process.exit(1);
}
if (!Number.isFinite(duracion) || duracion <= 0) {
  console.error(`\n✖ duración inválida: ${duracion}\n`);
  process.exit(1);
}

const [ancho, alto] = FORMATOS[formato];
const destino = destinoPedido ? path.resolve(process.cwd(), destinoPedido) : path.join(root, "proyectos", nnn, "hf");

if (fs.existsSync(path.join(destino, "index.html"))) {
  console.error(`\n✖ Ya existe ${muestra(path.join(destino, "index.html"))}. No lo piso.\n`);
  process.exit(1);
}

// El canal se comprueba ANTES de crear nada. Si no, un `--canal noexiste` deja
// medio proyecto en disco y el mensaje limpio de marca-a-css.mjs queda sepultado.
const marcasDir = path.join(root, "remotion", "src", "marcas");
const canales = fs.existsSync(marcasDir)
  ? fs.readdirSync(marcasDir).filter((f) => f.endsWith(".ts")).map((f) => f.replace(/\.ts$/, ""))
  : [];
if (!canales.includes(canal)) {
  console.error(`\n✖ No existe el canal «${canal}». Hay: ${canales.join(" · ") || "(ninguno)"}\n`);
  process.exit(1);
}

// Si la carpeta ya existía (un --destino del usuario), al fallar se limpia solo
// lo que este script creó, no la carpeta entera.
const existia = fs.existsSync(destino);
const limpia = () => {
  if (!existia) return borrar(destino);
  for (const p of ["vendor", "assets", "marca.css"]) borrar(path.join(destino, p));
};

fs.mkdirSync(path.join(destino, "vendor"), { recursive: true });
fs.mkdirSync(path.join(destino, "assets"), { recursive: true });
fs.writeFileSync(path.join(destino, "assets", ".gitkeep"), "");

// 1. marca.css — generado, nunca copiado. Sin `check`: marca-a-css.mjs ya
//    imprime el porqué (p. ej. un acento que no llega a 3:1 sobre su papel) y
//    aquí solo se limpia, porque un proyecto a medias es peor que ninguno.
const r = ejecutar(process.execPath, [path.join(skillDir, "scripts", "marca-a-css.mjs"), canal, path.join(destino, "marca.css")], {
  heredar: true,
});
if (r.status !== 0) {
  limpia();
  console.error("✖ No se pudo generar la marca. No dejo el proyecto a medias.\n");
  process.exit(1);
}

// El sello sale de la marca ya generada: si el canal no lleva, la plantilla no
// debe pintar píldora. Se lee del CSS para no volver a montar esbuild.
const marcaCss = leerTexto(path.join(destino, "marca.css"));
const sello = /^\s*--sello:\s*"([^"]*)"/m.exec(marcaCss)?.[1] ?? null;

// 2. GSAP vendorizado.
fs.copyFileSync(
  path.join(skillDir, "plantilla", "vendor", "gsap-3.14.2.min.js"),
  path.join(destino, "vendor", "gsap-3.14.2.min.js")
);

// 3. index.html con los tokens sustituidos. La plantilla se lee con `leerTexto`
//    (sin BOM, con LF): en un clon con autocrlf llegaría con CRLF y la expresión
//    que quita la píldora no casaría, dejando una cápsula vacía en pantalla.
let html = leerTexto(path.join(skillDir, "plantilla", "index.html"));
const id = `p${nnn}`;
html = html
  .replaceAll("__ANCHO__", String(ancho))
  .replaceAll("__ALTO__", String(alto))
  .replaceAll("__FPS__", String(fps))
  .replaceAll("__DURACION__", String(duracion))
  .replaceAll("__ID__", id)
  .replaceAll("__TITULO__", `Proyecto ${nnn} — ${formato}`)
  .replaceAll("__SELLO__", sello ?? "");

// Un canal sin sello no lleva píldora: se quita el bloque entero, no se deja
// vacío. Un `<div class="sello"></div>` sin texto sigue pintando una cápsula.
if (!sello) {
  html = html.replace(/\r?\n *<div class="sello">[^<]*<\/div>\r?\n/, "\n");
  html = html.replace(/<p id="kicker" class="kicker">[^<]*<\/p>/, '<p id="kicker" class="kicker">KICKER</p>');
}

fs.writeFileSync(path.join(destino, "index.html"), html);

const rel = muestra(destino);
console.log(`📁 ${rel}/`);
console.log(`   ${formato} · ${ancho}×${alto} · ${fps} fps · ${duracion}s · id "${id}"`);
console.log(`
   Siguiente:
     node manuales/motor-hyperframes/scripts/revisar-hf.mjs ${destinoPedido ? rel : nnn}
     npx hyperframes check ${rel}
     npx hyperframes preview ${rel}
`);
