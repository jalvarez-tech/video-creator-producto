#!/usr/bin/env node
/**
 * revisar-hf.mjs — LO QUE `hyperframes check` NO PUEDE SABER.
 *
 * Uso (desde cualquier sitio):
 *   node manuales/motor-hyperframes/scripts/revisar-hf.mjs 001
 *   node manuales/motor-hyperframes/scripts/revisar-hf.mjs proyectos/001/hf
 *
 * DIVISIÓN DE TRABAJO, y por eso este archivo es corto. `npx hyperframes check`
 * ya corre cinco puertas de verdad —lint, runtime en Chrome, layout MEDIDO con
 * getBoundingClientRect, motion y contraste WCAG— y son mejores que cualquier
 * cosa que se pueda reescribir aquí: miden píxeles renderizados, no estimaciones.
 * Duplicarlas sería peor y además mentiría.
 *
 * Lo que `check` no sabe es que esto es video-creator: no sabe que el fps lo
 * manda el clip del avatar (R01), que una URL de terceros no es un archivo (la
 * lección del b-roll), que la marca es un parámetro y no un color escrito a
 * mano, ni que un canal con `sello.texto: null` no lleva píldora. Eso es lo que
 * mira este script.
 *
 * Sale con 1 si algo falla, para que sirva de PUERTA y no de informe. Mismo
 * trato que `revisar-broll.mjs` y `revisar-velo.mjs`.
 *
 * LÍMITE DECLARADO: esto lee el HTML con expresiones regulares, no monta un DOM.
 * Sirve para «existe este atributo», «esta ruta apunta a un archivo» y «aquí hay
 * un `Date.now()`». NO sirve para razonar sobre anidamiento — de eso se encarga
 * `hyperframes lint`, que sí parsea. Los dos, no uno.
 */
import fs from "node:fs";
import path from "node:path";
import { RAIZ, leerTexto, posix, relativa } from "../../../herramientas/comun.mjs";

const root = RAIZ;

/** Una ruta para ENSEÑAR: relativa a la raíz si cae dentro, absoluta con «/» si no.
 *  Siempre con barras normales: valen en PowerShell, cmd y bash; las invertidas
 *  copiadas a Git Bash son un escape y rompen el comando. */
const muestra = (p) => {
  const r = relativa(p);
  return r.startsWith("..") ? posix(path.resolve(p)) : r;
};

const arg = process.argv[2];
if (!arg) {
  console.error(`
✖ Falta el proyecto.

  node manuales/motor-hyperframes/scripts/revisar-hf.mjs 001
  node manuales/motor-hyperframes/scripts/revisar-hf.mjs proyectos/001/hf
`);
  process.exit(1);
}

const dir = /^\d{3}$/.test(arg)
  ? path.join(root, "proyectos", arg, "hf")
  : path.resolve(process.cwd(), arg);
const indexPath = path.join(dir, "index.html");

if (!fs.existsSync(indexPath)) {
  console.error(`\n✖ No hay index.html en ${muestra(dir)}\n`);
  process.exit(1);
}

// `leerTexto`: sin BOM y con LF, para que las expresiones de abajo vean el
// mismo texto en un clon con autocrlf que en el Mac donde se escribió.
const bruto = leerTexto(indexPath);
/* Fuera los comentarios ANTES de mirar nada. Un `<audio>` comentado no carga
 * un archivo, y contarlo como recurso que falta es un falso positivo que hace
 * que la puerta deje de creerse — que es peor que no tenerla. (Lo encontró
 * este mismo script en la plantilla, que trae el ejemplo de SFX comentado.) */
const html = bruto.replace(/<!--[\s\S]*?-->/g, "");
const rel = muestra(dir);

const fallos = [];
const avisos = [];
const bien = [];
const mal = (m) => fallos.push(m);
const ojo = (m) => avisos.push(m);
const ok = (m) => bien.push(m);

/* ── 1. La raíz ──────────────────────────────────────────────────────────── */
const raiz = /<div[^>]*\bid=["']root["'][^>]*>/i.exec(html)?.[0] ?? "";

/**
 * Lectura CRUDA de un atributo: `null` si no está, string si está.
 *
 * La distinción entre «no está» y «está vacío» y «está mal» no es quisquillosa:
 * la primera versión de este archivo hacía `Number(attr("data-fps"))` y
 * `Number(null)` es **0**, que es finito. Resultado: una composición SIN
 * `data-fps` imprimía «✅ fps declarado en la composición: 0», salía con 0, y el
 * CLI la renderizaba a 30 — exactamente el fallo silencioso que este script
 * existe para cerrar. Medido: 240 frames a 30 fps donde tenían que salir 200 a 25.
 */
const attr = (n, s = raiz) => new RegExp(`\\b${n}=["']([^"']*)["']`, "i").exec(s)?.[1] ?? null;
const crudo = (n) => {
  const v = attr(n);
  return v === null || v.trim() === "" ? null : v.trim();
};

const ancho = Number(crudo("data-width"));
const alto = Number(crudo("data-height"));
const compId = crudo("data-composition-id");

if (!raiz) mal('No encuentro el elemento raíz `<div id="root" …>`.');
if (!compId) mal("La raíz no tiene `data-composition-id`.");
if (attr("data-start") !== "0") mal('La raíz necesita `data-start="0"` (lint: root_composition_missing_data_start).');
if (!Number.isFinite(ancho) || !Number.isFinite(alto) || ancho < 1 || alto < 1)
  mal("La raíz necesita `data-width` y `data-height` con píxeles reales.");

/* ── 2. fps: la regla que el otro motor sí tiene escrita ─────────────────── */
/**
 * El CLI acepta **entero** o **racional `num/den`** (`render --help`: «24, 25,
 * 30, 50, 60, 120, 240 … o 30000/1001 para NTSC»). Lo que NO acepta es un
 * decimal: medido, `data-fps="29.97"` se IGNORA y renderiza a 30/1. Y 29.97 es
 * justo lo que devuelve `ffprobe` de muchos clips, así que es el error que se
 * va a cometer. La forma correcta de NTSC es `30000/1001`.
 */
const fpsCrudo = crudo("data-fps");
let fps = NaN;
if (fpsCrudo === null) {
  mal(
    "La raíz no declara `data-fps`. Sin él el CLI renderiza a **30** y nadie avisa: " +
      "si la pieza lleva un avatar a 25, el lip-sync se va y solo se ve mirándolo."
  );
} else if (/^\d+\/\d+$/.test(fpsCrudo)) {
  const [n, d] = fpsCrudo.split("/").map(Number);
  fps = d > 0 ? n / d : NaN;
  if (Number.isFinite(fps) && fps >= 1) ok(`fps racional: ${fpsCrudo} (= ${fps.toFixed(3)})`);
  else mal(`\`data-fps="${fpsCrudo}"\` no es un racional válido.`);
} else if (/^\d+$/.test(fpsCrudo) && Number(fpsCrudo) >= 1 && Number(fpsCrudo) <= 240) {
  fps = Number(fpsCrudo);
  ok(`fps declarado en la composición: ${fps}`);
} else {
  mal(
    `\`data-fps="${fpsCrudo}"\` no vale: el motor solo honra ENTERO o racional \`num/den\`, ` +
      `y un decimal lo ignora en silencio renderizando a 30.` +
      (/^\d+\.\d+$/.test(fpsCrudo)
        ? `\n     Si venía de \`ffprobe\`, la forma correcta es la fracción: 29.97 → \`30000/1001\`, 23.976 → \`24000/1001\`.`
        : "")
  );
}

/* ── 3. Duración, en frames enteros ──────────────────────────────────────── */
/* Un `data-duration` que no cae en frame entero redondea en el render y la
 * última toma queda corta o larga por un frame — justo donde caen los remates
 * de sonido. Y si falta, no hay nada que comprobar: es un fallo, no un cero. */
const durCrudo = crudo("data-duration");
const duracion = durCrudo === null ? NaN : Number(durCrudo);
if (durCrudo === null) {
  mal("La raíz no declara `data-duration`. Es la duración del render, en segundos.");
} else if (!Number.isFinite(duracion) || duracion <= 0) {
  mal(`\`data-duration="${durCrudo}"\` no es una duración válida en segundos.`);
} else if (Number.isFinite(fps)) {
  const frames = duracion * fps;
  if (Math.abs(frames - Math.round(frames)) > 1e-6) {
    ojo(
      `data-duration=${duracion}s × ${Number.isInteger(fps) ? fps : fps.toFixed(3)} fps = ${frames.toFixed(3)} frames, que no es entero. ` +
        `Usa ${(Math.round(frames) / fps).toFixed(6)}s (${Math.round(frames)} frames).`
    );
  } else {
    ok(`duración: ${duracion}s = ${Math.round(frames)} frames`);
  }
}

/* ── 4. Nada de red en tiempo de render ──────────────────────────────────── */
/* `(?:https?:)?\/\/` y no solo `https?:\/\/`: una URL **protocol-relative**
 * (`//cdn.jsdelivr.net/…`) es igual de remota y se colaba como «archivo local». */
const remotos = [...html.matchAll(/\b(?:src|href)=["']((?:https?:)?\/\/[^"']+)["']/gi)].map((m) => m[1]);
if (remotos.length) {
  mal(
    `Hay ${remotos.length} recurso(s) por URL: el proyecto deja de ser re-renderizable ` +
      `el día que ese host cambie.\n     ${remotos.slice(0, 4).join("\n     ")}` +
      (remotos.length > 4 ? `\n     …y ${remotos.length - 4} más` : "")
  );
} else {
  ok("cero recursos remotos: todo es archivo local");
}

const gsapLocal = /<script[^>]*src=["']\.?\/?vendor\/gsap-[^"']+\.js["']/i.test(html);
if (gsapLocal) ok("GSAP vendorizado");
else mal("GSAP no está vendorizado en `vendor/`. Sin eso la pieza depende de un CDN para renderizar.");

/* ── 5. Los assets existen ───────────────────────────────────────────────── */
/* TODA ruta sin esquema, no solo las que empiezan por `./`. Un
 * `src="assets/x.mp4"` es igual de válido para el motor y se contaba como
 * inexistente… es decir, no se contaba: pasaba sin mirarse. */
const locales = [...html.matchAll(/\b(?:src|href)=["']([^"'#][^"']*)["']/gi)]
  .map((m) => m[1])
  .filter((r) => !/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(r));
const faltan = locales.filter((r) => !fs.existsSync(path.join(dir, r)));
if (faltan.length) {
  mal(`Rutas que no existen en disco:\n     ${faltan.join("\n     ")}`);
} else if (locales.length) {
  ok(`${locales.length} recurso(s) local(es), todos presentes`);
}

/* ── 6. Determinismo ─────────────────────────────────────────────────────── */
// Solo el <script> de la composición: buscar en todo el fichero daría positivos
// dentro del GSAP minificado si algún día se pega en línea.
const guiones = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]).join("\n");
const PROHIBIDO = [
  [/\bDate\.now\s*\(/, "`Date.now()` — el render pide frames en cualquier orden y con varios workers"],
  [/\bnew\s+Date\s*\(\s*\)/, "`new Date()` sin argumentos — misma razón que Date.now()"],
  [/\bMath\.random\s*\(/, "`Math.random()` sin sembrar — cada worker sacaría otro valor"],
  [/\bsetInterval\s*\(/, "`setInterval` — el tiempo lo lleva la timeline, no un reloj"],
  [/\bsetTimeout\s*\(/, "`setTimeout` — igual que setInterval"],
  [/\bfetch\s*\(/, "`fetch()` — prohibido pedir red en render; todo carga antes del frame 0"],
  [/\brepeat\s*:\s*-1/, "`repeat: -1` — un bucle infinito no tiene frame final; usa una cuenta finita"],
];
const rotas = PROHIBIDO.filter(([re]) => re.test(guiones));
if (rotas.length) rotas.forEach(([, m]) => mal(`Determinismo: ${m}.`));
else ok("determinismo: sin relojes, azar sin sembrar ni red");

/* ── 7. La marca es un parámetro, no un color escrito a mano ─────────────── */
const marcaPath = path.join(dir, "marca.css");
if (!fs.existsSync(marcaPath)) {
  mal(
    "Falta `marca.css`. Genéralo, no lo escribas:\n" +
      `     node manuales/motor-hyperframes/scripts/marca-a-css.mjs <canal> ${rel}/marca.css`
  );
} else {
  const marcaCss = leerTexto(marcaPath);
  if (!/GENERADO por/.test(marcaCss)) {
    ojo("`marca.css` no lleva la cabecera de generado: ¿se editó a mano? Se pierde al regenerar.");
  }

  // Hex a pelo. Es EL fallo de esta capa: el vídeo sale perfecto y la pieza
  // deja de ser multimarca sin que se note.
  //
  // Se miran los TRES sitios donde cabe un color, no solo el <style>: un
  // `style="color:#FF5500"` en línea y un `backgroundColor: "#FF5500"` dentro
  // de un tween de GSAP pintan exactamente igual y se colaban enteros.
  const estilos = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join("\n");
  const enLinea = [...html.matchAll(/\bstyle=["']([^"']*)["']/gi)].map((m) => m[1]).join("\n");
  const enScript = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]).join("\n");
  const donde = [
    ["<style>", estilos],
    ['style="…"', enLinea],
    ["<script>", enScript],
  ];
  const hex = donde
    .flatMap(([sitio, txt]) => [...txt.matchAll(/#[0-9a-f]{3,8}\b/gi)].map((m) => `${m[0]} (en ${sitio})`))
    // `#111` dentro de un selector CSS de id no es un color; el patrón exige
    // dígitos hex y 3+ caracteres, así que un `#root` no entra, pero un
    // `#fade` sí. Es un falso positivo que se prefiere a un color colado.
    .filter((h) => !/^#(?:root|main)\b/i.test(h));
  if (hex.length) {
    mal(
      `Hay ${hex.length} color(es) escrito(s) a mano: ${[...new Set(hex)].slice(0, 6).join(" · ")}.\n` +
        "     Usa las variables de marca.css (var(--tinta), var(--acento)…). Un hex aquí\n" +
        "     ata la pieza a un canal y deshace lo que costó sacar la marca del motor."
    );
  } else {
    ok("cero hex a mano: los colores salen de la marca");
  }

  // El sello. El aviso que el director ya tiene escrito para Remotion, aquí.
  const selloMarca = /^\s*--sello:\s*"([^"]*)"/m.exec(marcaCss)?.[1] ?? null;
  const pintaSello = /class=["'][^"']*\bsello\b[^"']*["']/.test(html);
  if (selloMarca && !pintaSello) {
    mal(`El canal lleva sello «${selloMarca}» y la composición no lo pinta: saldría sin watermark.`);
  } else if (!selloMarca && pintaSello) {
    mal("La composición pinta una píldora de sello y el canal no lleva sello (`sello.texto: null`).");
  } else if (selloMarca) {
    ok(`sello «${selloMarca}» presente`);
  }
}

/* ── 8. Coherencia con el clip de avatar, si lo hay ──────────────────────── */
// Si la pieza mete un vídeo de avatar, el fps de la composición tiene que ser
// el del clip: es R01, y aquí es aún más fácil de romper porque el fps vive en
// un sitio distinto (la raíz del HTML, no la <Composition>).
const videos = [...html.matchAll(/<video[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)].map((m) => m[1]);
if (videos.length) {
  ojo(
    `Hay ${videos.length} <video>. Mide su fps con \`ffprobe\` y comprueba que la composición\n` +
      `     declara ESE fps (ahora declara ${Number.isFinite(fps) ? fps : "ninguno"}):\n` +
      `     ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of csv=p=0 ${rel}/${posix(videos[0])}`
  );
}

/* ── Salida ──────────────────────────────────────────────────────────────── */
console.log(`\n🎬 ${rel} — invariantes de video-creator`);
if (ancho && alto) console.log(`   ${ancho}×${alto}${Number.isFinite(fps) ? ` · ${fps} fps` : ""}\n`);
else console.log("");

bien.forEach((m) => console.log(`   ✅ ${m}`));
avisos.forEach((m) => console.log(`   ⚠️  ${m}`));
fallos.forEach((m) => console.log(`   ❌ ${m}`));

if (fallos.length === 0) {
  console.log(
    `\n✅ Los invariantes del repo se cumplen.` +
      `\n   Falta la otra mitad, que mide píxeles:  npx hyperframes check ${rel}\n`
  );
} else {
  console.log(`\n✖ ${fallos.length} fallo(s). Esto no se renderiza hasta arreglarlo.\n`);
}
process.exit(fallos.length === 0 ? 0 : 1);
