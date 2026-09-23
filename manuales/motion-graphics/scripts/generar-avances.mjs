#!/usr/bin/env node
/**
 * generar-avances.mjs — LA TABLA DE AVANCES de R09.
 *
 * Uso (desde cualquier sitio):
 *   node manuales/motion-graphics/scripts/generar-avances.mjs             # reescribe la tabla
 *   node manuales/motion-graphics/scripts/generar-avances.mjs --check     # ¿sigue al día? sale 1 si no
 *   node manuales/motion-graphics/scripts/generar-avances.mjs --json RUTA # además, vuelca la medida cruda
 *   node manuales/motion-graphics/scripts/generar-avances.mjs --out RUTA  # escribe fuera del repo
 *   node manuales/motion-graphics/scripts/generar-avances.mjs --dry       # no escribe, solo informa
 *
 * QUÉ GENERA: `remotion/src/motor/plan/avances.ts`, el avance de cada carácter
 * que el canal usa de verdad, en EM, para cada combinación de FAMILIA y PESO que
 * el motor dibuja. Es el sustituto de los cinco cubos de anchura que `anchoTexto`
 * traía dentro: los cubos redondeaban hacia arriba por clase de carácter, en la
 * familia editorial sobreestimaban un +9,9 % de media —cinco falsos positivos
 * vivos, cuatro de ellos ya publicados— y en la de gráficos se quedaban CORTOS en
 * ocho casos, que es justo el fallo que R09 vino a impedir. Un cubo no puede
 * acertar en dos tipografías a la vez; una tabla medida sí.
 *
 * POR QUÉ UN SCRIPT Y NO UNA MEDIDA EN CALIENTE. Medir texto exige DOM y ata el
 * resultado a la fuente que tenga instalada quien valide; `revisaPlan` corre con
 * `node` pelado, dentro de un `useMemo`, y tiene que dar el MISMO número en
 * cualquier máquina. Así que se mide UNA VEZ, aquí, se versiona el resultado, y
 * se vuelve a correr esto el día que cambie la tipografía del formato. Mismo
 * trato que `generar-catalogo.mjs` con el markdown del catálogo.
 *
 * CON QUÉ CHROME. Con el que abre `@remotion/renderer` (`openBrowser`), o sea
 * EXACTAMENTE el mismo binario que renderiza los vídeos. Medir con el Chrome del
 * escritorio o con node-canvas daría un número que no es el que se publica.
 *
 * CÓMO SE MIDE UN AVANCE, y por qué así:
 *   · En el DOM, no en canvas. El shorthand `ctx.font` no acepta las palabras
 *     clave del sistema (`-apple-system`) y al fallar el parseo se queda con la
 *     fuente ANTERIOR sin avisar: un sondeo por canvas se contesta a sí mismo que
 *     sí. El <span> es lo que de verdad maqueta el intérprete.
 *   · Con `letter-spacing: 0`. El tracking es px absolutos, no escala con el
 *     cuerpo, y lo suma quien consulta la tabla (una vez por carácter, que es lo
 *     que hace Chrome, incluido el último).
 *   · A VARIOS CUERPOS, no a uno. Ver el bloque de abajo: es el hallazgo que
 *     obliga a que la tabla tenga la forma que tiene.
 *
 * ═══ POR QUÉ HAY ANCLAS Y NO UN SOLO EM POR CARÁCTER ═══
 * Un em debería bastar: el avance escala con el cuerpo. Con Inter es así (varía
 * menos del 0,3 % entre 12 y 1000 px). Con la geométrica del sistema NO, y esto
 * se midió, no se supone: San Francisco es una fuente con EJE ÓPTICO (`opsz`), y
 * macOS interpola sola entre el corte de texto y el de display según el cuerpo.
 * El mismo carácter avanza, respecto de su em a cuerpo grande:
 *
 *      12 px  +13,4 %    24 px  +3,1 %    52 px  +1,5 %    84 px  +0,0 %
 *      17 px   +7,4 %    28 px  +3,3 %    64 px  +0,8 %    96 px  +0,0 %
 *      20 px   +5,0 %    44 px  +2,0 %    76 px  +0,2 %   220 px  +0,0 %
 *
 * O sea que una tabla medida solo a cuerpo grande se queda CORTA justo en las
 * piezas pequeñas —chip (28), kicker (28), etiqueta (44)—, que es el error que
 * R09 no puede cometer. Por eso cada carácter guarda un em POR ANCLA y el
 * consumidor interpola. Las anclas se eligen de forma que la interpolación lineal
 * caiga por ENCIMA de la curva real (es convexa entre anclas): el error de
 * interpolación va del lado seguro, +0,2 % a +0,9 % según el tramo.
 *
 * EL KERNING SÍ SE MIDE, y es lo último que se añadió. Durante una versión la
 * cabecera afirmó que no hacía falta «porque el kerning aprieta y eso va del lado
 * seguro». Es falso en la mitad de los casos: hay cientos de pares que ENSANCHAN,
 * y «rt» —cuarto, puerta, artículo, importa— vale +1,95 % del cuerpo cada vez que
 * aparece. Una línea densa en esos pares se estimaba POR DEBAJO de lo que se
 * dibuja, que es el único error prohibido, y no había margen que lo cubriera sin
 * inventar falsos positivos. Así que se miden los 37.249 pares del alfabeto a
 * cada ancla y se guardan los positivos. Ver `UMBRAL_KERNING`.
 *
 * LO QUE ESTA TABLA NO MODELA — está también en la cabecera del archivo generado,
 * porque quien lea un aviso de R09 lee eso y no esto:
 *   · El kerning que APRIETA, ligaduras y sustituciones contextuales. Los tres
 *     hacen el texto más estrecho que la suma, o sea que sobra: dirección segura.
 *   · `font-variant-numeric: tabular-nums`, que sí llevan las cifras de los dos
 *     themes: por eso los dígitos se miden en las DOS formas.
 *   · El punch-in del molde (papel/cine escalan hasta 1,015 al final de la toma).
 *     R09 tampoco lo descuenta; meterlo aquí ataría la tabla al frame.
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
import { ES_MAC, RAIZ, abortar, esMain, flags, leerTexto, log, plataforma, posix, relativa } from "../../../herramientas/comun.mjs";

export const root = RAIZ;
const DESTINO = path.join(root, "remotion", "src", "motor", "plan", "avances.ts");

/** Una ruta para ENSEÑAR: relativa a la raíz si cae dentro, absoluta con «/» si no (un `--out` fuera del repo). */
const muestra = (p) => {
  const r = relativa(p);
  return r.startsWith("..") ? posix(path.resolve(p)) : r;
};

/**
 * Los cuerpos a los que se mide el alfabeto entero.
 *
 * Cubren de sobra el rango que el motor dibuja (el más pequeño es `T.pie` a 26 y
 * el label de un chip, que puede bajar de ahí; el más grande, una cifra a 220).
 *   20  el extremo pequeño con el que se puede contar. Por debajo el eje óptico
 *       de SF se dispara (+13 % a 12 px) y ahí la tabla ya no sirve: se dice en
 *       la cabecera del archivo generado en vez de fingir que sí.
 *   28  el cuerpo real de kicker, chip y pie.
 *   44  el de la etiqueta editorial.
 *   96  donde el eje óptico ya ha saturado: de aquí en adelante el em es plano,
 *       así que sirve para el titular (70-104) y para la cifra (220).
 */
const ANCLAS = [20, 28, 44, 96];

/**
 * Cuánto puede variar un em entre anclas para considerar que esa combinación NO
 * tiene eje óptico y guardar UNA sola columna.
 *
 * El umbral es 0,5 % y el número no es redondo por gusto: Chrome maqueta en
 * unidades de 1/64 px, así que el ancho de UN glifo estrecho al ancla pequeña ya
 * trae ese redondeo dentro. El espacio de Inter a 20 px mide 4,964 px y 1/64 de px
 * son 0,31 % de eso — o sea que por debajo de medio por ciento lo que se está
 * midiendo es la rejilla del motor de maquetación, no un eje óptico. Con el umbral
 * en 0,3 % una de las tres filas de Inter salía con cuatro columnas idénticas y la
 * cabecera afirmaba un eje que no existe.
 */
const TOLERANCIA_PLANA = 0.005;

/**
 * UMBRAL DEL KERNING POSITIVO, en em. Solo se guardan los pares que aprietan al
 * revés —los que hacen el texto MÁS ANCHO que la suma de avances— y que superan
 * este valor.
 *
 * POR QUÉ EXISTE ESTA TABLA. La cabecera anterior afirmaba que el kerning «va
 * siempre en la dirección segura porque aprieta». Es falso, y se mide: en SF 700
 * a 96 px hay 43 pares con delta POSITIVO sobre el alfabeto español, y «rt»
 * —cuarto, puerta, artículo, importa— suma +1,95 % del cuerpo cada vez que
 * aparece. Una línea de «rt» repetidos se estimaba un 1,9 % POR DEBAJO de lo que
 * se dibuja, y en «íT» un 3,5 %: subestimar es el único error que R09 no puede
 * cometer, y no se arregla con margen (a partir del 2,5 % reaparece un falso
 * positivo, o sea que el margen no llega a donde haría falta).
 *
 * EL NÚMERO. 0,002 em son 0,2 % del cuerpo por par. Chrome maqueta en 1/64 de px,
 * que a la ancla pequeña (20 px) son 0,00078 em: por debajo de ~0,002 lo que se
 * mide es la rejilla, no el kerning, y guardarlo llenaría la tabla de ruido. Lo
 * que queda SIN corregir está acotado por el propio umbral: aunque TODOS los
 * pares de una línea kernearan justo por debajo, el residuo es ~2×0,002/0,5 em =
 * 0,4 % de la línea, o sea menos de la mitad del margen.
 */
const UMBRAL_KERNING = 0.002;

/* ══════════════════ 1 · QUÉ COMBINACIONES DIBUJA EL MOTOR ══════════════════ */

/** `FUENTE.display` / `FUENTE.texto` de noticias/theme-noticias.ts (las dos son la misma pila). */
const SF =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Helvetica, Arial, sans-serif";
/** `theme.fontFamily` (theme.ts), que es lo que `estilos.ts` reexporta como `FONT`. */
const INTER = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

/**
 * Las combinaciones NO se suponen: cada una lleva anotado el sitio del código que
 * la dibuja. Si aparece un peso nuevo en un theme y no está aquí, el consumidor
 * cae al respaldo de otra combinación o a la más parecida — sobreestima, o sea que
 * falla del lado seguro, pero deja de calibrar. Por eso esta lista se revisa
 * cuando se toca `T` (theme-noticias.ts) o `TXT` (graficos/estilos.ts).
 */
const COMBOS = [
  // `sistema: true` = la pila resuelve a la letra del sistema (San Francisco solo
  // en macOS): fuera de un Mac esas tablas no pueden coincidir con las versionadas.
  { clave: "sf500", familia: "SF", css: SF, peso: 500, sistema: true, usos: "T.etiqueta (44 px, tracking −0,2)" },
  { clave: "sf600", familia: "SF", css: SF, peso: 600, sistema: true, usos: "T.kicker (28, versalitas) · T.pie (26), el label de <ChipIcono>" },
  { clave: "sf700", familia: "SF", css: SF, peso: 700, sistema: true, usos: "T.titular (96) · T.cifra (220) · T.subtitulo (58)" },
  { clave: "sf800", familia: "SF", css: SF, peso: 800, sistema: true, usos: "montadores.tsx: `enfasis` dentro de un titular · Editorial.tsx" },
  { clave: "inter600", familia: "Inter", css: INTER, peso: 600, usos: "TXT.kicker (30, versalitas) · TXT.etiqueta (46) · lista" },
  { clave: "inter700", familia: "Inter", css: INTER, peso: 700, usos: "graficos/Texto.tsx: <Chip> (letterSpacing 1)" },
  { clave: "inter800", familia: "Inter", css: INTER, peso: 800, usos: "TXT.titular (92; el rol hero dibuja 104) · TXT.cifra (210) · contador" },
];

/* ══════════════════ 2 · QUÉ CARACTERES ═════════════════════════════════════ */

/**
 * El alfabeto. Los grupos van separados porque justifican cosas distintas y
 * porque así se ve de un vistazo qué se dejó fuera.
 *
 *   ASCII      entero (0x20–0x7E). No es exceso: cubrir el bloque completo cierra
 *              de golpe toda una clase de agujeros (un `#`, un `+`, un `@` en un
 *              titular) por el mismo coste de medida.
 *   ESPANOL    lo que exige el idioma del canal. `anchoTexto` no tenía NINGUNA
 *              minúscula acentuada en sus cubos, y por eso «sí» estimaba +20,9 %.
 *   LATIN      nombres propios y préstamos (Bogotá, São Paulo, façade).
 *   TIPOGRAFIA la puntuación de imprenta que el formato usa de verdad: comillas
 *              latinas, guiones largos, puntos suspensivos, el interpunto de los
 *              kickers.
 *   SIMBOLOS   moneda, porcentajes, ordinales, m², flechas y marcas de lista.
 *   ESPACIOS   el duro y el fino, que en una cifra se cuelan sin verse.
 */
const ASCII = " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~";
const ESPANOL = "áéíóúÁÉÍÓÚüÜñÑ¿¡";
const LATIN = "àèìòùÀÈÌÒÙâêîôûÂÊÎÔÛäëïöÄËÏÖãõÃÕçÇ";
const TIPOGRAFIA = "«»‘’“”„–—…·•‹›′″";
const SIMBOLOS = "€£¥¢§©®™°ªº¹²³±×÷≈≠≤≥→←↑↓✓✕★";
const ESPACIOS = "\u00A0\u2009\u202F\u2007"; // duro · fino · fino-duro · de cifra

const ALFABETO = (() => {
  const visto = {};
  const out = [];
  for (const c of ASCII + ESPANOL + LATIN + TIPOGRAFIA + SIMBOLOS + ESPACIOS) {
    if (visto[c]) continue;
    visto[c] = true;
    out.push(c);
  }
  return out;
})();

/** Los dígitos y lo que se mezcla con ellos: se miden también con `tabular-nums`. */
const TABULARES = "0123456789.,%$ ".split("");

/**
 * Sondas de lo que NO está en el alfabeto, para poder DECIR si el respaldo cubre
 * lo desconocido en vez de afirmarlo. Un ideograma CJK avanza 1 em clavado; un
 * emoji ocupa dos unidades UTF-16, así que quien recorra el string carácter a
 * carácter le cobrará dos respaldos (sobra, que es el lado bueno).
 */
const SONDAS = ["国", "→", "∎", "㎡", "🙂"];

/* ══════════════════ 2b · LAS FUENTES EMPAQUETADAS ══════════════════════════ */

/**
 * Los OTF de Inter que el motor empaqueta: `motor/fuentes.ts` los carga con
 * `motor/fuentes.ts` bajo la familia «Inter», así que el render pinta ESOS bytes
 * en cualquier máquina. Para que la tabla sea la de esos mismos bytes, aquí se
 * inyectan en la página antes de medir. Sin la carpeta se mide con la Inter que
 * tenga el sistema, y se dice en la cabecera del archivo generado.
 */
export const DIR_FUENTES = path.join(root, "remotion", "public", "fuentes", "inter");

/** Peso CSS de cada corte de Inter, por el sufijo del archivo (`Inter-SemiBold.otf` → 600). */
const PESOS_INTER = { Thin: 100, ExtraLight: 200, Light: 300, Regular: 400, Medium: 500, SemiBold: 600, Bold: 700, ExtraBold: 800, Black: 900 };

/**
 * Los OTF empaquetados, en base64 para poder pasarlos a la página. `[]` si la
 * carpeta no existe. Ordenados por peso para que la salida sea estable.
 * También lo usa `medir-anchos.mjs`: las dos medidas tienen que ver la misma letra.
 */
export function fuentesEmpaquetadas(dir = DIR_FUENTES) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /^Inter-[A-Za-z]+\.otf$/.test(f))
    .map((f) => ({
      familia: "Inter",
      peso: PESOS_INTER[f.slice("Inter-".length, -".otf".length)],
      archivo: f,
      base64: fs.readFileSync(path.join(dir, f)).toString("base64"),
    }))
    .filter((f) => f.peso !== undefined)
    .sort((a, b) => a.peso - b.peso);
}

/**
 * Inyecta las fuentes en la página ANTES de medir: `new FontFace` + `document.fonts.add`.
 * Una familia web «Inter» tapa a cualquier Inter local en todos sus pesos, así
 * que una máquina sin Inter, o con otra versión, mide exactamente lo mismo.
 * Una llamada a `evaluate` por fuente (~350 KB de base64 cada una): un solo
 * mensaje con los nueve OTF sería de varios MB por el protocolo de Chrome.
 * Devuelve cuántas se inyectaron.
 */
export async function inyectaFuentes(page, fuentes = fuentesEmpaquetadas()) {
  for (const f of fuentes) {
    await page.evaluate(async (arg) => {
      const bin = Uint8Array.from(atob(arg.base64), (c) => c.charCodeAt(0));
      const cara = new FontFace(arg.familia, bin.buffer, { weight: String(arg.peso), style: "normal" });
      await cara.load();
      document.fonts.add(cara);
    }, f);
  }
  if (fuentes.length) {
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
  }
  return fuentes.length;
}

/* ══════════════════ 3 · LA MEDIDA ══════════════════════════════════════════ */

async function mide(combos = COMBOS, fuentes = fuentesEmpaquetadas()) {
  const require = createRequire(path.join(root, "remotion", "package.json"));
  const { openBrowser } = require("@remotion/renderer");
  const browser = await openBrowser("chrome", { logLevel: "error" });
  try {
    const page = await browser.newPage({
      context: null,
      logLevel: "error",
      indent: false,
      pageIndex: 0,
      onBrowserLog: null,
      onLog: () => {},
    });
    await page.goto({ url: "about:blank", timeout: 30000, options: {} });
    const empaquetadas = await inyectaFuentes(page, fuentes);
    const medida = await page.evaluate(
      (arg) => {
        const { combos, alfabeto, tabulares, sondas, anclas, umbralKerning } = arg;

        // Un solo <span> reutilizado: 7 combinaciones × 4 anclas × ~190 caracteres
        // son más de 5000 maquetaciones, y crear y destruir un nodo cada vez
        // cuesta más que la propia medida.
        const span = document.createElement("span");
        span.style.position = "absolute";
        span.style.left = "0";
        span.style.top = "0";
        span.style.whiteSpace = "pre";
        span.style.letterSpacing = "0px";
        document.body.appendChild(span);

        const ancho = (texto) => {
          span.textContent = texto;
          return span.getBoundingClientRect().width;
        };

        // ¿Resuelve de verdad cada familia, o hemos medido el genérico? Se compara
        // contra `monospace`, el genérico más distinto de una geométrica.
        span.style.font = "400 100px monospace";
        const generico = ancho("Handgloves 123");
        const sonda = (fam) => {
          span.style.font = `400 100px ${fam}, monospace`;
          const w = ancho("Handgloves 123");
          return { ancho: Math.round(w * 100) / 100, resuelve: Math.abs(w - generico) > 0.01 };
        };
        const fuentes = {
          monospace: Math.round(generico * 100) / 100,
          Inter: sonda("Inter"),
          "SF Pro Display": sonda("'SF Pro Display'"),
          BlinkMacSystemFont: sonda("BlinkMacSystemFont"),
          "-apple-system": sonda("-apple-system"),
          "Helvetica Neue": sonda("'Helvetica Neue'"),
        };
        span.style.font = "";

        const salida = [];
        for (const combo of combos) {
          span.style.fontFamily = combo.css;
          span.style.fontWeight = String(combo.peso);

          // em[carácter] = un valor por ancla, en el orden de `anclas`.
          const em = {};
          const tab = {};
          for (const c of alfabeto) em[c] = [];
          for (const c of tabulares) tab[c] = [];
          const fueraDeTabla = {};
          for (const s of sondas) fueraDeTabla[s] = [];

          // kern[par] = el MÁXIMO delta positivo visto en cualquier ancla.
          //
          // Máximo y no el valor de cada ancla: la corrección tiene que ser una
          // COTA SUPERIOR del kerning real a cualquier cuerpo, porque quedarse
          // por debajo devuelve el error prohibido. Sobrar es barato — el peor
          // par de SF sobra 0,04 em a las anclas grandes, o sea un 4 % de UN
          // carácter, que en una línea de treinta son 0,14 %.
          const kern = {};

          for (const px of anclas) {
            span.style.fontSize = `${px}px`;
            span.style.fontVariantNumeric = "normal";
            for (const c of alfabeto) em[c].push(ancho(c) / px);
            for (const s of sondas) fueraDeTabla[s].push(ancho(s) / px);
            span.style.fontVariantNumeric = "tabular-nums";
            for (const c of tabulares) tab[c].push(ancho(c) / px);

            // Los PARES. Se mide el ancho de «ab» contra la suma de «a» y «b»:
            // lo que sobra es el kerning, con su signo. Solo se guarda el
            // positivo, que es el que hace que la estimación se quede corta; el
            // negativo (el que aprieta) ya va del lado seguro sin modelarlo.
            span.style.fontVariantNumeric = "normal";
            const uno = {};
            for (const c of alfabeto) uno[c] = ancho(c);
            for (const a of alfabeto)
              for (const b of alfabeto) {
                const d = (ancho(a + b) - uno[a] - uno[b]) / px;
                if (d < umbralKerning) continue;
                const k = a + b;
                if (kern[k] === undefined || d > kern[k]) kern[k] = d;
              }
          }
          span.style.fontVariantNumeric = "normal";

          salida.push({ clave: combo.clave, em, tabulares: tab, fueraDeTabla, kerning: kern });
        }

        document.body.removeChild(span);
        return { fuentes, combos: salida, ua: navigator.userAgent };
      },
      {
        combos,
        alfabeto: ALFABETO,
        tabulares: TABULARES,
        sondas: SONDAS,
        anclas: ANCLAS,
        umbralKerning: UMBRAL_KERNING,
      }
    );
    return { ...medida, empaquetadas };
  } finally {
    await browser.close({ silent: true });
  }
}

/* ══════════════════ 4 · EL ARCHIVO ═════════════════════════════════════════ */

/** 4 decimales en em = 0,4 px a un cuerpo de 96. Por debajo del subpíxel. */
const redondea = (x) => Math.round(x * 10000) / 10000;
const num = (x) => redondea(x).toFixed(4);
/** Un porcentaje para prosa en español: coma decimal, no punto. */
const pc = (x) => (x * 100).toFixed(2).replace(".", ",");

/**
 * Un carácter como clave de objeto TS. Los espacios que NO son el 0x20 se escriben
 * como escape porque un espacio duro o uno fino LITERAL en el fuente es
 * indistinguible del normal, y un diff que no se puede ver no se puede revisar.
 */
const INVISIBLES = [0x00a0, 0x2007, 0x2009, 0x202f];
const clave = (c) => {
  const cp = c.charCodeAt(0);
  if (cp === 0x20) return '" "';
  if (INVISIBLES.indexOf(cp) >= 0) return `"\\u${cp.toString(16).toUpperCase().padStart(4, "0")}"`;
  return JSON.stringify(c);
};

/** ¿Varía el em de este carácter entre anclas más de lo que toleramos? */
const varia = (serie) => {
  let min = Infinity;
  let max = -Infinity;
  for (const v of serie) {
    min = Math.min(min, v);
    max = Math.max(max, v);
  }
  return min <= 0 ? max > 0 : max / min - 1;
};

/**
 * Un carácter para citarlo DENTRO DE UN COMENTARIO. Pasa por `clave` y no por
 * `JSON.stringify` porque este último NO escapa los espacios exóticos: un U+2009
 * literal en un comentario dispara `no-irregular-whitespace` y tumba el lint.
 */
const cita = (c) => clave(c);

/**
 * Un PAR como clave de objeto TS. Mismo trato que `clave` con los invisibles: un
 * espacio fino literal dentro de una clave de dos caracteres sería indistinguible
 * del normal, y un diff que no se puede ver no se puede revisar.
 */
const clavePar = (par) => {
  let hayInvisible = false;
  let escapado = "";
  for (const c of par) {
    const cp = c.charCodeAt(0);
    if (cp === 0x20 || INVISIBLES.indexOf(cp) >= 0) {
      hayInvisible = hayInvisible || cp !== 0x20;
      escapado += cp === 0x20 ? " " : `\\u${cp.toString(16).toUpperCase().padStart(4, "0")}`;
    } else escapado += JSON.stringify(c).slice(1, -1);
  }
  return hayInvisible || escapado !== par ? `"${escapado}"` : JSON.stringify(par);
};

/** Los pares de kerning, ordenados por clave para que el diff sea legible. */
const bloqueKerning = (kern, sangria) => {
  const pares = Object.keys(kern).sort();
  const lineas = [];
  let linea = "";
  for (const p of pares) {
    const trozo = `${clavePar(p)}: ${num(kern[p])}, `;
    if (linea.length > 0 && linea.length + trozo.length > 108) {
      lineas.push(sangria + linea.trimEnd());
      linea = "";
    }
    linea += trozo;
  }
  if (linea) lineas.push(sangria + linea.trimEnd());
  return lineas.join("\n");
};

const bloque = (mapa, orden, plana, sangria) => {
  const lineas = [];
  let linea = "";
  for (const c of orden) {
    const serie = mapa[c];
    const valor = plana ? num(serie[serie.length - 1]) : `[${serie.map(num).join(", ")}]`;
    const trozo = `${clave(c)}: ${valor}, `;
    if (linea.length > 0 && linea.length + trozo.length > 108) {
      lineas.push(sangria + linea.trimEnd());
      linea = "";
    }
    linea += trozo;
  }
  if (linea) lineas.push(sangria + linea.trimEnd());
  return lineas.join("\n");
};

function componeArchivo(medida, fecha, combos = COMBOS) {
  const porClave = {};
  for (const c of medida.combos) porClave[c.clave] = c;

  const resumen = [];
  const cuerpos = combos.map((combo) => {
    const m = porClave[combo.clave];

    // ¿Tiene eje óptico esta combinación? Se decide MIDIENDO, no por familia: si
    // algún día SF deja de interpolar (o Inter empieza), el archivo cambia solo.
    let derivaMax = 0;
    let derivaChar = "";
    const derivas = [];
    for (const c of ALFABETO) {
      const d = varia(m.em[c]);
      derivas.push(d);
      if (d > derivaMax) {
        derivaMax = d;
        derivaChar = c;
      }
    }
    derivas.sort((a, b) => a - b);
    const derivaMediana = derivas[Math.floor(derivas.length / 2)];
    const plana = derivaMax < TOLERANCIA_PLANA;

    // El respaldo se toma sobre TODAS las anclas: el glifo más ancho que se ha
    // visto a cualquier cuerpo.
    let max = 0;
    let maxChar = "";
    for (const c of ALFABETO)
      for (const v of m.em[c])
        if (v > max) {
          max = v;
          maxChar = c;
        }
    let maxSonda = 0;
    let sondaChar = "";
    for (const s of SONDAS)
      for (const v of m.fueraDeTabla[s])
        if (v > maxSonda) {
          maxSonda = v;
          sondaChar = s;
        }
    const respaldo = redondea(Math.max(max, maxSonda));

    // Solo se guardan los tabulares que DIFIEREN del proporcional: si la fuente ya
    // es tabular por defecto (o el glifo no cambia), una copia idéntica solo
    // engorda el diff y hace dudar de si es un dato o un descuido.
    const distintos = TABULARES.filter((c) => {
      for (let i = 0; i < ANCLAS.length; i++) if (Math.abs(m.tabulares[c][i] - m.em[c][i]) > 0.0001) return true;
      return false;
    });

    // El kerning positivo, para el comentario y el resumen.
    const clavesKern = Object.keys(m.kerning);
    const paresKern = clavesKern.length;
    let peorKern = 0;
    let peorPar = "  ";
    for (const k of clavesKern)
      if (m.kerning[k] > peorKern) {
        peorKern = m.kerning[k];
        peorPar = k;
      }

    resumen.push(
      `  ${combo.clave.padEnd(9)} ${plana ? "PLANA (1 ancla)" : `${ANCLAS.length} anclas, deriva mediana ${pc(derivaMediana)} %, máx ${pc(derivaMax)} % (${cita(derivaChar)})`} · respaldo ${num(respaldo)} · kerning + ${paresKern} pares (peor ${num(peorKern)} em)`
    );

    return [
      `  /** ${combo.familia} ${combo.peso} — ${combo.usos}. */`,
      `  ${combo.clave}: {`,
      `    familia: "${combo.familia}",`,
      `    peso: ${combo.peso},`,
      plana
        ? [
            `    /**`,
            `     * SIN EJE ÓPTICO: medido a ${ANCLAS.join(", ")} px, el em de cada carácter varía como mucho`,
            `     * un ${pc(derivaMax)} % (${cita(derivaChar)}), por debajo del subpíxel. Una sola ancla basta y se guarda`,
            `     * el valor a ${ANCLAS[ANCLAS.length - 1]} px. Si un día esta familia empieza a interpolar, el script`,
            `     * lo detecta solo y aquí aparecerán ${ANCLAS.length} columnas.`,
            `     */`,
            `    anclas: [${ANCLAS[ANCLAS.length - 1]}],`,
          ].join("\n")
        : [
            `    /**`,
            `     * CON EJE ÓPTICO: el em NO es constante. Entre ${ANCLAS[0]} y ${ANCLAS[ANCLAS.length - 1]} px, el carácter`,
            `     * mediano se mueve un ${pc(derivaMediana)} % y el que más —${cita(derivaChar)}— un ${pc(derivaMax)} %: el extremo son`,
            `     * los glifos de puntuación, que en el corte de texto llevan mucho más aire.`,
            `     * Por eso cada carácter guarda un em POR ANCLA, en el orden de \`anclas\`.`,
            `     */`,
            `    anclas: [${ANCLAS.join(", ")}],`,
          ].join("\n"),
      `    /**`,
      `     * RESPALDO: el glifo más ancho medido (${cita(maxChar)} = ${num(max)} em), elevado si hiciera`,
      `     * falta al de las sondas de fuera de tabla (${cita(sondaChar)} = ${num(maxSonda)} em). Un carácter`,
      `     * desconocido NO puede valer 0: eso deja pasar una línea que se sale, y ése es`,
      `     * el único error que R09 no puede cometer. Vale lo más ancho que se ha visto.`,
      `     */`,
      `    respaldo: ${num(respaldo)},`,
      `    glifos: {`,
      bloque(m.em, ALFABETO, plana, "      "),
      `    },`,
      distintos.length === 0
        ? [
            `    /** Con \`tabular-nums\` esta combinación no cambia ningún avance: ya es tabular. */`,
            `    tabulares: {},`,
          ].join("\n")
        : [
            `    /** \`font-variant-numeric: tabular-nums\` (lo montan T.cifra y TXT.cifra): solo lo que CAMBIA. */`,
            `    tabulares: {`,
            bloque(m.tabulares, distintos, plana, "      "),
            `    },`,
          ].join("\n"),
      [
        `    /**`,
        `     * KERNING POSITIVO: los ${paresKern} pares que salen MÁS ANCHOS que la suma de sus`,
        `     * avances, en em. El peor es ${cita(peorPar[0])}+${cita(peorPar[1])} con ${num(peorKern)} em (${pc(peorKern)} % del cuerpo`,
        `     * POR APARICIÓN). Se suma una vez por par contiguo DENTRO de un mismo tramo.`,
        `     * Los pares que APRIETAN no están: ésos ya fallan del lado seguro.`,
        `     */`,
        `    kerning: {`,
        bloqueKerning(m.kerning, "      "),
        `    },`,
      ].join("\n"),
      `  },`,
    ].join("\n");
  });

  const disponibles = Object.keys(medida.fuentes)
    .map((k) => {
      const v = medida.fuentes[k];
      return typeof v === "number"
        ? ` *   ${k}: ${v} (el genérico contra el que se compara)`
        : ` *   ${k}: ${v.resuelve ? "resuelve" : "NO RESUELVE — cae al genérico"} · ${v.ancho}`;
    })
    .join("\n");

  const texto = `/**
 * AVANCES TIPOGRÁFICOS MEDIDOS — la tabla con la que R09 sabe si una línea cabe.
 * NO SE EDITA A MANO.
 *
 *   Generado por  manuales/motion-graphics/scripts/generar-avances.mjs
 *   Fecha         ${fecha}
 *   Navegador     ${medida.ua}
 *   Fuentes       ${
   medida.empaquetadas
     ? `${medida.empaquetadas} OTF de Inter inyectados desde remotion/public/fuentes/inter (los que empaqueta el motor)`
     : "las del sistema (sin OTF empaquetados en remotion/public/fuentes/inter)"
 }
 *   Alfabeto      ${ALFABETO.length} caracteres × ${combos.length} combinaciones de familia y peso
 *
 * POR QUÉ ES UN ARCHIVO DE DATOS Y NO UNA MEDIDA. Medir texto exige DOM, y
 * \`revisaPlan\` corre con \`node\` pelado dentro de un \`useMemo\`: tiene que dar el
 * MISMO número en cualquier máquina y sin montar React. Por eso este archivo, igual
 * que \`nucleo.ts\`, no tiene NI UN import en tiempo de ejecución. Se mide una vez,
 * se versiona, y se regenera el día que cambie la tipografía del formato.
 *
 * ═══ CÓMO SE LEE ═══
 *   ancho = Σ avance(carácter, cuerpo) × cuerpo
 *         + Σ kerning(par contiguo)    × cuerpo
 *         + tracking × nº de caracteres
 *
 * El tracking es px ABSOLUTOS (no escala con el cuerpo) y Chrome lo suma también
 * DESPUÉS del último carácter: se multiplica por la longitud, no por longitud − 1.
 *
 * El kerning se suma SOLO entre caracteres del mismo tramo de estilo: Chrome
 * moldea cada \`<span>\` por separado, así que entre una palabra en énfasis y la
 * siguiente no hay par que corregir. Ver \`sumaTramos\` en \`nucleo.ts\`.
 *
 * DOS RESPALDOS, y son distintos:
 *   · Un CARÁCTER que no está en \`glifos\` vale \`respaldo\` (el glifo más ancho que
 *     se ha medido en esa combinación). Nunca 0: un carácter que no suma deja pasar
 *     una línea que se sale, y ése es el único error que R09 no puede cometer. Un
 *     emoji, que ocupa dos unidades UTF-16, se cobra dos veces — sobra, y bien.
 *   · Una COMBINACIÓN de familia y peso que no esté en \`AVANCES\` no tiene respaldo
 *     aquí: quien consulte debe caer en la misma familia al peso medido más
 *     PESADO (que es el más ancho), y si no hay familia, en la más ancha de las que
 *     haya. Nunca saltarse la medida. Y luego añadir la combinación al script y
 *     volver a medir, porque un respaldo permanente vuelve a ser un cubo.
 *
 * \`avance(c, px)\` sale de \`glifos[c]\`, que es:
 *   · un número, si la combinación no tiene eje óptico (\`anclas\` de un solo valor);
 *   · una serie de números —uno por ancla, en el orden de \`anclas\`— si lo tiene.
 *     Se interpola LINEAL entre las dos anclas que rodean al cuerpo, y se usa el
 *     extremo tal cual por fuera del rango.
 *
 * ═══ POR QUÉ HAY ANCLAS Y NO UN SOLO EM ═══
 * San Francisco —la voz del canal— tiene EJE ÓPTICO (\`opsz\`): macOS interpola sola
 * entre el corte de texto y el de display según el cuerpo, así que el avance NO es
 * proporcional al tamaño. Medido en este mismo Chrome, respecto del em a cuerpo
 * grande: +13,4 % a 12 px, +5,0 % a 20, +3,3 % a 28, +2,0 % a 44, +0,8 % a 64,
 * y ya plano de 84 px en adelante. Una tabla de un solo em se quedaría CORTA justo
 * en las piezas pequeñas —chip, kicker, etiqueta—, y quedarse corto es el único
 * error que R09 no puede cometer. Inter, en cambio, no tiene eje óptico y por eso
 * sus filas traen una sola ancla: no es un descuido, es el resultado de medirlo.
 *
 * La interpolación lineal entre anclas cae por ENCIMA de la curva real (que es
 * convexa), o sea que su error —de +0,2 % a +1,0 % según el tramo— va del lado
 * seguro. Por DEBAJO de ${ANCLAS[0]} px la curva se dispara y la tabla se queda corta: R09
 * NO es de fiar para cuerpos menores que ${ANCLAS[0]} px, y eso no se arregla leyendo esta
 * tabla con más cuidado, se arregla añadiendo un ancla y volviendo a medir.
 *
 * ═══ LO QUE ESTA TABLA NO MODELA ═══
 *   · KERNING QUE APRIETA. «Ta», «Vo» o «AV» salen más estrechos que la suma de
 *     avances y eso NO se modela: el texto real es más corto que la estimación,
 *     que es la dirección permitida. El sobrante llega al +7,7 % en una línea
 *     escrita a propósito solo con esos pares; un titular real no se parece a eso.
 *     Cuidado con el recíproco, que es el error de bulto que esta cabecera afirmó
 *     durante una versión: el kerning va en LOS DOS SENTIDOS. Los pares que
 *     ENSANCHAN («rt» en cuarto, puerta, artículo: +1,95 % del cuerpo cada vez)
 *     sí están medidos, en \`kerning\`, porque ésos sí dejaban la estimación por
 *     debajo de lo que se dibuja.
 *   · KERNING POR DEBAJO DEL UMBRAL (${(UMBRAL_KERNING * 100).toFixed(1).replace(".", ",")} % del cuerpo por par). Por ahí se cuela un
 *     residuo acotado en ~0,4 % de la línea aunque TODOS sus pares kernearan justo
 *     por debajo, o sea menos de la mitad del margen de \`MARGEN_ANCHO\`.
 *   · LIGADURAS y sustituciones contextuales (\`fi\`, \`ffl\`): mismo caso.
 *   · SHAPING de escrituras complejas (árabe, devanagari). Aquí no se dan, y la
 *     tabla tampoco sabría medirlas.
 *   · El PUNCH-IN del molde (papel/cine escalan hasta 1,015 al final de la toma).
 *     R09 tampoco lo descuenta; meterlo aquí ataría la tabla al frame.
 *   · Los SÍMBOLOS que la familia no tiene (✓, ★, ㎡) los dibuja la fuente de
 *     respaldo del sistema. Están medidos como los dibuja este Chrome, que es lo
 *     mismo que hará el render — pero no son glifos de SF ni de Inter.
 *
 * ═══ LIMITACIÓN DE ENTORNO — LÉELA ANTES DE CONFIAR EN UN AVISO ═══
 * Las tablas \`inter*\` son las de los OTF que el motor EMPAQUETA (ver la línea
 * «Fuentes» de arriba): se inyectan antes de medir, así que valen igual en
 * cualquier máquina. Las tablas \`sf*\` NO: son las de la fuente TAL COMO LA
 * RESUELVE ESTE Chrome EN ESTA MÁQUINA (macOS, render local). La pila de sistema
 * pide \`-apple-system\` primero, y ese nombre NO resuelve en este Chrome: quien
 * salva la pila es \`BlinkMacSystemFont\` → San Francisco, que solo existe en
 * macOS. Sondeo del día de la medida (ancho de "Handgloves 123" a 100 px):
${disponibles}
 * Si una pieza se renderiza en otro entorno —Windows, CI en Linux— la fuente de
 * sistema resuelta será OTRA y las tablas \`sf*\` MENTIRÁN: los avisos de R09
 * dejarán de corresponderse con lo que se ve. Por eso una marca nueva declara la
 * letra empaquetada (\`LETRA_INTER\`), y por eso este script no reescribe la tabla
 * fuera de macOS salvo que se le fuerce.
 */

/** Una combinación de familia y peso. Las claves son las de \`AVANCES\`. */
export interface TablaAvances {
  readonly familia: string;
  readonly peso: number;
  /** Cuerpos, en px, a los que está medida cada serie de \`glifos\`. Ascendente. */
  readonly anclas: readonly number[];
  /** Em del glifo más ancho conocido. Lo que vale un carácter que no está en \`glifos\`. */
  readonly respaldo: number;
  /**
   * Avance por carácter, en em: un número si \`anclas\` tiene un solo valor, o una
   * serie paralela a \`anclas\` si la familia tiene eje óptico.
   *
   * El índice devuelve \`undefined\` A PROPÓSITO: así el compilador obliga a resolver
   * el respaldo en el sitio de la consulta y nadie puede sumar un \`0\` silencioso
   * por un carácter que no se midió.
   */
  readonly glifos: { readonly [caracter: string]: number | readonly number[] | undefined };
  /** Solo los avances que CAMBIAN con \`font-variant-numeric: tabular-nums\`. */
  readonly tabulares: { readonly [caracter: string]: number | readonly number[] | undefined };
  /**
   * CORRECCIÓN DE KERNING, en em, solo para los pares que salen MÁS ANCHOS que la
   * suma de sus avances. Se suma una vez por cada par de caracteres contiguos.
   *
   * Un solo número por par y no una serie por ancla: es el MÁXIMO visto en
   * cualquiera de ellas, porque lo que hace falta es una cota SUPERIOR del
   * kerning real —quedarse por debajo devuelve la subestimación que esto viene a
   * cerrar—. Sobra a los cuerpos donde el par kernea menos, y sobra poco: el peor
   * caso de SF son 0,04 em, un 4 % de UN carácter.
   *
   * Solo lo POSITIVO. El kerning que aprieta («Ta», «Vo», «AV») no está aquí a
   * propósito: no modelarlo hace que la estimación sobre, que es la dirección
   * permitida.
   */
  readonly kerning: { readonly [par: string]: number | undefined };
}

export const AVANCES = {
${cuerpos.join("\n")}
} as const satisfies { readonly [clave: string]: TablaAvances };
`;
  return { texto, resumen };
}

/* ══════════════════ 5 · MAIN ═══════════════════════════════════════════════ */

/**
 * Los BLOQUES de `AVANCES`, uno por clave, tal como los escribe `componeArchivo`
 * (la línea de comentario «familia peso — usos» y `clave: { … },` hasta su
 * cierre a dos espacios). `--check` compara ESTO y no el archivo entero: la cabecera lleva
 * la fecha, la línea `Navegador` y el sondeo de fuentes, que cambian con la
 * máquina y no con la tipografía; compararla haría que el check solo pudiera dar
 * AL DÍA en la máquina que generó la tabla.
 */
export const bloquesDe = (texto) => {
  const out = {};
  const re = /^  \/\*\* [^\n]*\n  (\w+): \{\n[\s\S]*?\n  \},$/gm;
  let m;
  while ((m = re.exec(texto)) !== null) out[m[1]] = m[0];
  return out;
};

if (esMain(import.meta.url)) {
  const f = flags();
  const comprueba = f.check === true;
  const seco = f.dry === true;
  const forzar = f["forzar-plataforma"] === true;
  // `--solo inter` (o `sf`): mide y compara solo las combinaciones que empiezan
  // así. Sirve para preguntar «¿los OTF empaquetados dan las mismas tablas que
  // la Inter instalada?» sin arrastrar las sf*, que en otra máquina no pueden
  // coincidir. Solo con --check: la tabla se escribe entera o no se escribe.
  if (f.solo === true) abortar("--solo necesita un prefijo de combinación: --solo inter (o --solo sf)");
  const solo = typeof f.solo === "string" ? f.solo.toLowerCase() : null;
  if (solo && !comprueba) abortar("--solo solo tiene sentido con --check: la tabla se escribe entera o no se escribe");
  let combos = solo ? COMBOS.filter((c) => c.clave.startsWith(solo)) : COMBOS;
  if (combos.length === 0) abortar(`--solo ${solo}: ninguna combinación empieza así (hay ${COMBOS.map((c) => c.clave).join(", ")})`);
  // Fuera de macOS la pila de sistema no resuelve a San Francisco (cae a Segoe,
  // Arial…), así que las combinaciones de sistema NUNCA podrían coincidir con
  // la tabla versionada y --check no podría dar AL DÍA. Sin --solo se omiten y
  // se dice; con --solo manda lo que pidió quien llama.
  const omitidas = comprueba && !ES_MAC && !solo ? combos.filter((c) => c.sistema).map((c) => c.clave) : [];
  if (omitidas.length) {
    combos = combos.filter((c) => !c.sistema);
    log.aviso(`en ${plataforma().so} la letra de sistema no es San Francisco: ${omitidas.join(", ")} solo se comprueban en macOS y las omito`);
  }

  const destino = typeof f.out === "string" ? path.resolve(f.out) : DESTINO;

  // La tabla versionada solo se reescribe en macOS: las combinaciones sf* miden
  // la San Francisco del sistema, que fuera de un Mac es OTRA fuente (Segoe,
  // Arial…), y una tabla medida ahí cambiaría los avisos de R09 en todas las
  // máquinas. Mirar (--dry, --out) y comprobar (--check) valen en cualquier sitio.
  if (!comprueba && !seco && destino === DESTINO && !ES_MAC && !forzar) {
    log.aviso(
      `en ${plataforma().so} la pila de sistema no resuelve a San Francisco: las tablas sf* saldrían de otra fuente ` +
        `y R09 avisaría de otra cosa en todas las máquinas.`
    );
    log.info(`No escribo ${relativa(DESTINO)}. Mira la medida con --dry o --out RUTA, o fuerza con --forzar-plataforma si sabes lo que haces.`);
    process.exit(1);
  }

  const fuentes = fuentesEmpaquetadas();
  const medida = await mide(combos, fuentes);
  const fecha = new Date().toISOString().slice(0, 10);

  if (typeof f.json === "string") {
    fs.mkdirSync(path.dirname(path.resolve(f.json)), { recursive: true });
    fs.writeFileSync(path.resolve(f.json), JSON.stringify({ generado: fecha, anclas: ANCLAS, ...medida }, null, 2));
  }

  const { texto, resumen } = componeArchivo(medida, fecha, combos);
  const notaFuentes = fuentes.length
    ? `  fuentes: ${fuentes.length} OTF inyectados desde ${relativa(DIR_FUENTES)}`
    : `  fuentes: las del sistema (no existe ${relativa(DIR_FUENTES)})`;

  // `--check` es lo que se puede correr sin ensuciar el árbol: pregunta si la
  // tabla versionada sigue al día en vez de pisarla y dejar que alguien se
  // acuerde de mirar el `git diff`. Sale con código 1 si algo se mueve, así que
  // vale tal cual para un hook o para CI. Compara bloque a bloque (ver
  // `bloquesDe`): ni la fecha ni la cabecera cuentan como cambio. El archivo se
  // lee con `leerTexto` para que un clon con CRLF no dé DESFASADA por nada.
  if (comprueba) {
    const actual = fs.existsSync(destino) ? leerTexto(destino) : "";
    const viejo = bloquesDe(actual);
    const nuevo = bloquesDe(texto);
    const claves = combos.map((c) => c.clave);
    const distintas = claves.filter((k) => viejo[k] !== nuevo[k]).map((k) => `${k} ${viejo[k] === undefined ? "falta" : "difiere"}`);
    // Sin --solo, una combinación de más en el archivo también es desfase
    // (salvo las omitidas por plataforma: están en el archivo a propósito).
    const sobran = solo ? [] : Object.keys(viejo).filter((k) => !claves.includes(k) && !omitidas.includes(k)).map((k) => `${k} sobra`);
    const igual = distintas.length === 0 && sobran.length === 0;
    process.stdout.write(
      [
        ...resumen,
        notaFuentes,
        igual
          ? `AL DÍA · ${muestra(destino)} coincide con lo medido ahora${solo ? ` (solo ${claves.join(", ")})` : ""}` +
            (omitidas.length ? ` (sin ${omitidas.join(", ")}: la letra de sistema solo se comprueba en macOS)` : "")
          : `DESFASADA · ${muestra(destino)} NO coincide con lo medido ahora: ${[...distintas, ...sobran].join(", ")}.\n` +
            (ES_MAC
              ? `  Regenera con: node ${relativa(fileURLToPath(import.meta.url))}\n`
              : `  La tabla solo se regenera en macOS (mide la letra de sistema): allí, node ${relativa(fileURLToPath(import.meta.url))}\n`) +
            `  y revisa el diff: lo que cambie aquí cambia lo que R09 avisa.`,
        "",
      ].join("\n")
    );
    process.exit(igual ? 0 : 1);
  }

  if (!seco) fs.writeFileSync(destino, texto);

  process.stdout.write(
    [
      `${combos.length} combinaciones × ${ALFABETO.length} caracteres × ${ANCLAS.length} anclas (${ANCLAS.join(", ")} px)`,
      ...resumen,
      notaFuentes,
      seco ? "(--dry: no se ha escrito nada)" : `escrito → ${muestra(destino)}`,
      "",
    ].join("\n")
  );
}
