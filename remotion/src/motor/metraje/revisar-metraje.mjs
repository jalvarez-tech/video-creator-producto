#!/usr/bin/env node
/**
 * PUERTA DEL MONTAJE — mide lo que no se ve en ningún frame.
 *
 *   node remotion/src/motor/metraje/revisar-metraje.mjs <metraje-NNN.ts> [export] [--fps 30] [--ancho 1080] [--alto 1920]
 *
 * Genérica: sirve a cualquier `metraje-NNN.ts`. Nace de juntar dos puertas de
 * proyecto que ya eran casi iguales. Un proyecto la importa desde su
 * `proyectos/NNN/revisar-NNN.mjs` y le añade lo de SU encargo (subtítulos,
 * golpes de música, anclajes…). Lo de aquí es del formato, y cada comprobación
 * existe porque su fallo SOBREVIVE a una revisión por frames:
 *
 *   lineaDeTiempo      sin huecos ni solapes → un hueco pinta negro un
 *                      instante, y si cae entre dos frames de revisión no lo ves
 *   metrajeDisponible  ningún corte pide más clip del que hay, contando la
 *                      velocidad y el prerrollo de las disolvencias →
 *                      Remotion no falla: congela el último fotograma (R20), o
 *                      recorta el arranque a 0 y desplaza el plano entero
 *   tramosDisjuntos    ningún tramo de vídeo sale dos veces → la repetición se
 *                      percibe, pero es dificilísima de localizar mirando
 *   encuadre           el plano cubre el cuadro en TODOS sus frames (zoom ≥ 1, y
 *                      el `pan` y el desplazamiento de las entradas propias
 *                      dentro de lo que la escala permite) → la franja negra
 *                      dura unos frames y no cae en el que revisas
 *   todosLosArchivos   si el encargo lo pide, todo el material sale en pantalla
 *
 * NO LLEVA SUS PROPIAS CUENTAS. Carga `corte.ts` —el mismo que usa el
 * intérprete— y el plan con el esbuild que Remotion ya trae (el patrón de
 * `medir-anchos.mjs`): el TypeScript se EJECUTA en vez de leerse con expresiones
 * regulares, así que `velocidad: VEL_NINOS` vale lo que vale en el render. Una
 * puerta que no resuelve una constante mide otro vídeo (R20).
 *
 * EXCEPCIONES DECLARADAS. Lo que ya está publicado no se arregla sin volver a
 * publicar. Cada comprobación acepta `declarados: { [idCorte]: "por qué" }`: el
 * fallo sale como ⚠️ con su motivo y no tumba la puerta. Una declaración que ya
 * no hace falta SÍ la tumba; si no, la lista de excusas sobreviviría al arreglo.
 *
 * API PARA LAS PUERTAS DE PROYECTO (no se renombra: las importan desde
 * proyectos/NNN/revisar-NNN.mjs): `abrePuerta`, `cargaTs`, `duracionDe`,
 * `RAIZ`, `PUBLICO`.
 *
 * Sale con 1 si algo falla.
 */
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, isAbsolute, join, parse, resolve } from "node:path";
import { RAIZ as RAIZ_REPO, borrar, carpetaTemporal, ejecutar, esMain } from "../../../../herramientas/comun.mjs";

export const RAIZ = RAIZ_REPO;
export const PUBLICO = join(RAIZ, "remotion", "public");
/** Segundos que dos cortes del mismo clip pueden compartir sin que se lea como repetición. */
const TOLERANCIA_TRAMO = 0.15;

const absoluta = (ruta) => (isAbsolute(ruta) ? ruta : join(RAIZ, ruta));

/** Ejecuta módulos TypeScript de DATOS y devuelve sus exports, uno por clave. */
export async function cargaTs(modulos) {
  const require = createRequire(join(RAIZ, "remotion", "package.json"));
  const esbuild = require("esbuild");
  const tmp = carpetaTemporal("metraje-");
  try {
    const entrada = join(tmp, "entrada.ts");
    const salida = join(tmp, "salida.cjs");
    writeFileSync(
      entrada,
      Object.entries(modulos)
        .map(([nombre, ruta]) => `export * as ${nombre} from ${JSON.stringify(absoluta(ruta))};`)
        .join("\n")
    );
    await esbuild.build({ entryPoints: [entrada], bundle: true, platform: "node", format: "cjs", outfile: salida, logLevel: "error" });
    return require(salida);
  } finally {
    // `borrar` reintenta: en Windows el antivirus retiene un instante el .cjs recién creado.
    borrar(tmp);
  }
}

const duraciones = new Map();
/** Duración del stream de VÍDEO de un archivo de `public/` (la del contenedor si no hay vídeo, p. ej. un WAV). */
export function duracionDe(src) {
  if (!duraciones.has(src)) {
    // `ejecutar` localiza ffprobe también en la carpeta de herramientas del
    // usuario (donde lo deja setup.mjs) y, si no está, lo dice con nombre en vez
    // de un ENOENT. Su stderr se captura y no se enseña: hay MP4 de mensajería
    // con NAL units rotas que hacen a ffprobe escupir cien líneas por lectura;
    // se decodifican enteros igual, y aquí solo se quiere el número.
    const r = ejecutar(
      "ffprobe",
      ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=duration:format=duration", "-of", "json", join(PUBLICO, src)],
      { check: true, silencioso: true }
    );
    const { streams = [], format = {} } = JSON.parse(r.stdout);
    duraciones.set(src, Number(streams[0]?.duration ?? format.duration));
  }
  return duraciones.get(src);
}

const pareceCorte = (x) =>
  x !== null && typeof x === "object" && typeof x.id === "string" && typeof x.src === "string" && Number.isFinite(x.en);

function eligeCortes(modulo, nombre, ruta) {
  if (nombre) {
    if (!Array.isArray(modulo[nombre])) throw new Error(`${ruta} no exporta un Corte[] llamado «${nombre}»`);
    return modulo[nombre];
  }
  const candidatos = Object.entries(modulo).filter(([, v]) => Array.isArray(v) && v.length > 0 && v.every(pareceCorte));
  if (candidatos.length !== 1) {
    throw new Error(`${ruta}: ${candidatos.length} exports parecen un Corte[] (${candidatos.map(([k]) => k).join(", ") || "ninguno"}); di cuál`);
  }
  return candidatos[0][1];
}

/**
 * Abre la puerta de un proyecto: carga el plan y devuelve las comprobaciones
 * del formato ya atadas a sus cortes, más `ok`/`mal`/`seccion` para las propias.
 *
 *   proyecto          el nombre que se imprime («010»)
 *   plan              el `metraje-NNN.ts`, relativo a la raíz del repo
 *   cortes            el nombre del export con el `Corte[]` (se adivina si solo hay uno)
 *   fps, ancho, alto  los de la composición
 *   receta            cómo se repone el material si falta (se cita en el fallo)
 *   extras            otros módulos de datos que la puerta del proyecto necesite
 */
export async function abrePuerta({ proyecto, plan, cortes: nombre, fps = 30, ancho = 1080, alto = 1920, receta, extras = {} }) {
  const modulos = await cargaTs({ formato: join(RAIZ, "remotion/src/motor/metraje/corte.ts"), plan, ...extras });
  const F = modulos.formato;
  const cortes = eligeCortes(modulos.plan, nombre, plan);

  const fallos = [];
  const avisos = [];
  const declaraciones = [];
  const ok = (m) => console.log(`  ✅ ${m}`);
  const mal = (m) => {
    fallos.push(m);
    console.log(`  ❌ ${m}`);
  };
  const seccion = (titulo) => console.log(titulo);
  const declara = (comprobacion, declarados) => {
    for (const [id, motivo] of Object.entries(declarados)) declaraciones.push({ comprobacion, id, motivo, usada: false });
  };
  /** Un fallo de unos cortes concretos: si alguno está declarado en esta comprobación, es un aviso con su motivo. */
  const falla = (comprobacion, ids, mensaje) => {
    const d = declaraciones.find((x) => x.comprobacion === comprobacion && ids.includes(x.id));
    if (!d) return mal(mensaje);
    d.usada = true;
    avisos.push(mensaje);
    console.log(`  ⚠️  ${mensaje} — declarado: ${d.motivo}`);
  };
  /** El ✅ de una sección, si no ha fallado nada desde `n`; con nota si hubo avisos desde `a`. */
  const cierraSeccion = (n, a, mensaje) => {
    if (fallos.length === n) ok(`${mensaje}${avisos.length > a ? " · salvo lo declarado" : ""}`);
  };

  console.log(`\n${proyecto} · ${cortes.length} cortes\n`);

  /** Huecos, solapes, ids repetidos y, si se da, la duración de la comp. Devuelve el frame final. */
  function lineaDeTiempo({ duracion } = {}) {
    const n = fallos.length;
    const ids = new Set();
    let cursor = 0;
    for (const c of cortes) {
      if (ids.has(c.id)) mal(`${c.id}: id repetido (es la key de su <Sequence>)`);
      ids.add(c.id);
      if (!Number.isInteger(c.en) || !Number.isInteger(c.dur) || c.dur <= 0) {
        mal(`${c.id}: en=${c.en} dur=${c.dur}; tienen que ser frames enteros y dur > 0`);
      }
      if (c.en !== cursor) mal(`${c.id}: entra en ${c.en} pero el anterior acaba en ${cursor}`);
      cursor = c.en + c.dur;
    }
    if (duracion !== undefined && cursor !== duracion) mal(`el plan acaba en ${cursor} f y la comp dura ${duracion}`);
    if (fallos.length === n) ok(`sin huecos ni solapes · ${cursor} f (${(cursor / fps).toFixed(2)} s)`);
    return cursor;
  }

  /** Que cada archivo exista y que cada vídeo tenga el metraje que el plano consume de verdad. */
  function metrajeDisponible({ declarados = {} } = {}) {
    const [n, a] = [fallos.length, avisos.length];
    declara("metraje", declarados);
    cortes.forEach((c) => {
      if (!existsSync(join(PUBLICO, c.src))) {
        return mal(`${c.id}: no existe remotion/public/${c.src}${receta ? ` (${receta})` : ""}`);
      }
      if (c.tipo === "foto") return;
      const velocidad = c.velocidad ?? 1;
      const solape = F.solapeDe(c);
      const arranque = F.arranqueEnFuente(c, solape, fps);
      if (arranque < 0) {
        falla(
          "metraje",
          [c.id],
          `${c.id}: la disolvencia pide empezar ${-arranque} f antes del principio de ${c.src}; el intérprete recorta a 0 y el plano entero sale ${(-arranque / fps).toFixed(2)} s más tarde en la fuente`
        );
      }
      // Tiempo de fuente del frame `f` del plano, como lo calcula Remotion
      // (`getExpectedMediaFrameUncorrected`): (trimBefore + f · velocidad) / fps.
      // Sin cola: el plano acaba en `en + dur` aunque el siguiente disuelva (ver `solapeDe`).
      const ultimo = (Math.max(0, arranque) + (solape + c.dur - 1) * velocidad) / fps;
      const dura = duracionDe(c.src);
      if (!(ultimo < dura)) {
        falla(
          "metraje",
          [c.id],
          `${c.id}: su último frame pide el ${ultimo.toFixed(2)} s de ${c.src}, que dura ${dura.toFixed(2)} s; Remotion congela el último fotograma`
        );
      }
    });
    cierraSeccion(n, a, "ningún corte pide más metraje del que hay (velocidad y prerrollo incluidos)");
  }

  /** Que ningún tramo OPACO de un clip salga en dos cortes (fotos aparte: volver a una foto es una decisión). */
  function tramosDisjuntos({ declarados = {} } = {}) {
    const [n, a] = [fallos.length, avisos.length];
    declara("tramos", declarados);
    const porArchivo = new Map();
    cortes.forEach((c) => {
      if (c.tipo === "foto") return;
      const velocidad = c.velocidad ?? 1;
      const solape = F.solapeDe(c);
      // El plano es opaco en sus frames [solape, solape + dur): lo de antes y
      // después es disolvencia. Arranque recortado incluido, como en el render.
      const inicio = Math.max(0, F.arranqueEnFuente(c, solape, fps)) + solape * velocidad;
      if (!porArchivo.has(c.src)) porArchivo.set(c.src, []);
      porArchivo.get(c.src).push({ id: c.id, a: inicio / fps, b: (inicio + c.dur * velocidad) / fps });
    });
    for (const [src, tramos] of porArchivo) {
      tramos.sort((x, y) => x.a - y.a);
      for (let i = 0; i < tramos.length; i++) {
        for (let j = i + 1; j < tramos.length && tramos[j].a < tramos[i].b; j++) {
          const comparten = Math.min(tramos[i].b, tramos[j].b) - tramos[j].a;
          if (comparten > TOLERANCIA_TRAMO) {
            falla("tramos", [tramos[i].id, tramos[j].id], `${src}: ${tramos[i].id} y ${tramos[j].id} comparten ${comparten.toFixed(2)} s`);
          }
        }
      }
    }
    cierraSeccion(n, a, "ningún tramo de vídeo se usa dos veces");
  }

  /**
   * Que el plano cubra el cuadro en todos sus frames: zoom, `pan` (vertical) y
   * el desplazamiento de las entradas propias (horizontal). `entradas` son las
   * mismas que recibe `<PistaMetraje>`, cargadas con `extras`.
   */
  function encuadre({ techoZoom, entradas = {}, declarados = {} } = {}) {
    const [n, a] = [fallos.length, avisos.length];
    declara("encuadre", declarados);
    const conocidas = new Set([...F.ENTRADAS_DEL_FORMATO, ...Object.keys(entradas)]);
    cortes.forEach((c) => {
      if (c.entra && !conocidas.has(c.entra)) {
        mal(`${c.id}: la entrada «${c.entra}» no es del formato y esta puerta no tiene su implementación (\`entradas\`): no puede medir su encuadre`);
      }
      const [z0, z1] = c.zoom;
      const solape = F.solapeDe(c);
      const escala = (f) => z0 + (z1 - z0) * Math.min(1, f / (c.dur + solape));
      /** Frames del plano en que la franja negra `px(f)` pasa de medio píxel, como frames de la comp. */
      const destapa = (hasta, px) => {
        const malos = [];
        for (let f = 0; f < hasta; f++) if (px(f) > 0.5) malos.push(f);
        if (!malos.length) return null;
        const peor = Math.max(...malos.map(px));
        return { frames: malos.length, primero: c.en - solape + malos[0], ultimo: c.en - solape + malos.at(-1), peor };
      };
      if (!(Math.min(z0, z1) >= 1)) falla("encuadre", [c.id], `${c.id}: zoom ${z0}→${z1}; por debajo de 1 el plano no cubre el cuadro`);
      if (techoZoom !== undefined && Math.max(z0, z1) > techoZoom) {
        falla("encuadre", [c.id], `${c.id}: zoom ${z0}→${z1} pasa del techo de ${techoZoom}`);
      }
      // §encuadre de corte.ts: con T·S el plano cubre en vertical mientras |pan| ≤ 50·(z−1).
      const pan = Math.abs(c.pan ?? 0);
      const vertical = pan
        ? destapa(solape + c.dur, (f) => ((pan - 50 * (escala(f) - 1)) / 100) * alto)
        : null;
      if (vertical) {
        falla(
          "encuadre",
          [c.id],
          `${c.id}: pan ${c.pan} con zoom ${z0}→${z1} enseña negro por ${c.pan > 0 ? "abajo" : "arriba"} en ${vertical.frames} f (f${vertical.primero}–f${vertical.ultimo}, hasta ${vertical.peor.toFixed(0)} px); cubre con zoom ≥ ${(1 + pan / 50).toFixed(3)}`
        );
      }
      // Lo mismo en horizontal para una entrada PROPIA que desplace el plano
      // (`EfectoDeEntrada.x`): se ejecuta la misma función que pinta.
      const propia = c.entra ? entradas[c.entra] : undefined;
      const x = (f) => propia(f).x ?? 0;
      const horizontal = propia
        ? destapa(solape + c.dur, (f) => Math.abs(x(f)) - ((escala(f) - 1) / 2) * ancho)
        : null;
      if (horizontal) {
        const maximo = Math.max(...Array.from({ length: solape + c.dur }, (_, f) => Math.abs(x(f))));
        falla(
          "encuadre",
          [c.id],
          `${c.id}: la entrada «${c.entra}» enseña negro por ${x(horizontal.primero - c.en + solape) > 0 ? "la izquierda" : "la derecha"} en ${horizontal.frames} f (f${horizontal.primero}–f${horizontal.ultimo}, hasta ${horizontal.peor.toFixed(0)} px); cubre con zoom ≥ ${(1 + (2 * maximo) / ancho).toFixed(3)}`
        );
      }
    });
    cierraSeccion(n, a, `todos los planos cubren el cuadro${techoZoom !== undefined ? ` · zoom dentro de [1, ${techoZoom}]` : ""}`);
  }

  /** Que todo el material del encargo salga en pantalla. Contra la carpeta original si está; si no, contra `public/`. */
  function todosLosArchivos({ carpeta, origen, extensiones = /\.(mov|mp4|heic|jpe?g)$/i }) {
    const n = fallos.length;
    const usados = new Set(cortes.map((c) => parse(c.src).name));
    const hayOrigen = Boolean(origen) && existsSync(origen);
    const materiales = readdirSync(hayOrigen ? origen : join(PUBLICO, carpeta)).filter((f) => extensiones.test(f));
    for (const f of materiales) if (!usados.has(parse(f).name)) mal(`${f} no sale en el vídeo`);
    if (fallos.length === n) {
      ok(`${materiales.length}/${materiales.length} archivos en pantalla${hayOrigen ? "" : " (sin la carpeta original: contra public/)"}`);
    }
  }

  /** Imprime el veredicto y sale: 1 si algo falló o si sobra alguna excepción. */
  function cierra(exito = `el plan del ${proyecto} pasa la puerta`) {
    const sobran = declaraciones.filter((d) => !d.usada);
    if (sobran.length) seccion("excepciones");
    for (const d of sobran) mal(`sobra la excepción de ${d.id} en «${d.comprobacion}»: ya no falla, quítala («${d.motivo}»)`);
    const usadas = declaraciones.length - sobran.length;
    const nota = usadas ? ` (${usadas} ${usadas === 1 ? "excepción declarada" : "excepciones declaradas"})` : "";
    console.log(fallos.length ? `\n❌ ${fallos.length} fallo(s)\n` : `\n✅ ${exito}${nota}\n`);
    process.exit(fallos.length ? 1 : 0);
  }

  return {
    cortes,
    plan: modulos.plan,
    modulos,
    fps,
    /** Los fallos hasta ahora: para el ✅ de las secciones propias («si no ha fallado nada desde…»). */
    fallos,
    ok,
    mal,
    seccion,
    duracionDe,
    lineaDeTiempo,
    metrajeDisponible,
    tramosDisjuntos,
    encuadre,
    todosLosArchivos,
    cierra,
  };
}

// Solo corre si se invoca directamente: las puertas de los proyectos importan
// `abrePuerta`. `esMain` compara rutas reales (symlink o junction incluidos).
if (esMain(import.meta.url)) {
  const args = process.argv.slice(2);
  const opcion = (bandera, defecto) => {
    const i = args.indexOf(bandera);
    return i >= 0 ? Number(args.splice(i, 2)[1]) : defecto;
  };
  const fps = opcion("--fps", 30);
  const ancho = opcion("--ancho", 1080);
  const alto = opcion("--alto", 1920);
  const [plan, nombre] = args;
  if (!plan || plan === "--help" || plan === "-h") {
    console.error("uso: node remotion/src/motor/metraje/revisar-metraje.mjs <metraje-NNN.ts> [export] [--fps 30] [--ancho 1080] [--alto 1920]");
    process.exit(plan ? 0 : 1);
  }
  const puerta = await abrePuerta({ proyecto: basename(plan, ".ts"), plan: resolve(plan), cortes: nombre, fps, ancho, alto });
  puerta.seccion("1. línea de tiempo");
  puerta.lineaDeTiempo();
  puerta.seccion("2. metraje disponible");
  puerta.metrajeDisponible();
  puerta.seccion("3. tramos disjuntos");
  puerta.tramosDisjuntos();
  puerta.seccion("4. encuadre");
  puerta.encuadre();
  puerta.cierra();
}
