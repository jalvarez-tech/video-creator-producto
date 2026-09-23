/**
 * setup.mjs — instala o repara TODO lo que el sistema necesita aparte de Node.
 *
 *   node herramientas/setup.mjs [--solo-skills] [--whisper | --sin-whisper] [--sin-chrome] [--sin-doctor]
 *
 * Lo llaman instalar.sh / instalar.ps1 después de garantizar Node ≥ 22, pero se
 * puede lanzar a mano tantas veces como haga falta: cada paso mira primero si ya
 * está hecho y solo actúa sobre lo que falta (idempotente). Explica cada paso en
 * una línea y termina llamando a doctor.mjs, que es quien da el veredicto.
 *
 * Qué hace, en orden:
 *   1. Enlaces de las skills: manuales/<skill> → .claude/skills/<skill> y .agents/skills/<skill>.
 *   2. .env a partir de .env.example si no existe (las claves las escribe el usuario, nunca este script).
 *   3. Dependencias de remotion/ (`npm ci`) si falta alguna o no coincide de versión.
 *   4. Herramientas del usuario en dirBinUsuario(), SIN administrador y con versiones fijas:
 *      uv (y un Python ≥ 3.10 vía `uv python install`), ffmpeg + ffprobe, auto-editor,
 *      y con --whisper también whisper-cli y el modelo ggml-small.bin.
 *      Si la herramienta ya existe en el PATH del usuario (Homebrew, winget…) se respeta.
 *   5. Chrome Headless Shell de Remotion (`remotion browser ensure`), salvo --sin-chrome.
 *   6. SFX base (manuales/diseno-sonoro/sfx-base/) → remotion/public/sfx/, SOLO los que
 *      falten y NUNCA si remotion/public/sfx/.origen.json dice que ese set viene de un banco.
 *   7. remotion/public/avatar.mp4 de relleno (un degradado de 3 s) si no existe.
 *   8. doctor.mjs.
 *
 * Todas las descargas pasan por un archivo .part, se comprueban por tamaño y sha256
 * (el publicado por el origen cuando lo hay; si no, el medido al fijar la versión) y
 * solo entonces se dan por buenas. Los paquetes van a una carpeta temporal y de ahí se
 * copia el binario a su sitio; el modelo de whisper (465 MB) se baja directamente a su
 * carpeta definitiva para no cruzar volúmenes. Nada de sudo, nada de UAC, nada global.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import {
  RAIZ,
  ES_WINDOWS,
  ES_MAC,
  plataforma,
  desdeRaiz,
  relativa,
  posix,
  dirBinUsuario,
  binario,
  ejecutar,
  npm,
  versionDe,
  esMain,
  enlazar,
  carpetaTemporal,
  borrar,
  leerJSON,
  leerTexto,
  sha256DeArchivo,
  log,
  abortar,
  flags,
} from "./comun.mjs";

// ─── Versiones fijas y sumas de comprobación ────────────────────────────────────
// Cambiar una versión = cambiar aquí su sha256. Cuando el origen publica el checksum
// (uv, ffmpeg de Riedl y de Gyan, Node, el modelo de whisper) es ese; cuando no lo
// publica (auto-editor, whisper.cpp) es el medido el día que se fijó la versión.
const VERSIONES = {
  uv: {
    // Tarball/zip de GitHub Releases + su .sha256 publicado, en las tres plataformas. No se usa
    // el script oficial (astral.sh/uv/install.sh) porque en macOS busca `sha256sum`, que no
    // existe (solo hay `shasum`), y entonces SALTA la verificación del checksum.
    version: "0.12.18",
    base: "https://github.com/astral-sh/uv/releases/download/0.12.18",
    sha256: {
      "uv-aarch64-apple-darwin.tar.gz": "cf40e0c6a202190ccd9e0406dcfdd5b2d6668a9a5c779b17948963df32aafe5b",
      "uv-x86_64-apple-darwin.tar.gz": "2e4108f5395397c8bc5d43bf83d3bdbb2d0e92b90d0efa607756be704905fa33",
      "uv-x86_64-unknown-linux-gnu.tar.gz": "89eadd7c76fc063887959510d5ba0ab1264dfd5f1143b925ddb73021a40acf16",
      "uv-aarch64-unknown-linux-gnu.tar.gz": "afb6291f3f0a6b4521fc67b947822506c41dde5b60d2189dd8f3695b2ac8c9e7",
      "uv-x86_64-pc-windows-msvc.zip": "cae6a3bc25239f83dffb467a4b180508d9da23986c04639ebfa44e43e6a84bff",
      "uv-aarch64-pc-windows-msvc.zip": "17f27b1c64eacc757ae603579f116a014881e486c5e79ae81877980d4699e943",
    },
  },
  python: "3.12",
  ffmpeg: {
    // macOS: builds firmados y notarizados de ffmpeg.martin-riedl.de (9.0.2), un zip por binario.
    mac: {
      arm64: {
        base: "https://ffmpeg.martin-riedl.de/download/macos/arm64/1789931890_9.0.2",
        ffmpeg: { bytes: 28395699, sha256: "c8ed4c4e6978a03c485edbfe4e0a5dc2380f8a30bba5150531b31b094492d924" },
        ffprobe: { bytes: 28317701, sha256: "fcbe839537485eaee7a7a8bc5cbc0f90d53617e80943e8a5b2e31cb851197ea6" },
      },
      x64: {
        base: "https://ffmpeg.martin-riedl.de/download/macos/amd64/1789931006_9.0.2",
        ffmpeg: { bytes: 33816391, sha256: "7c6b4125b191cbf773832dc51f424cf2b6bb7da43007d1e066f95909e47cacd4" },
        ffprobe: { bytes: 33719233, sha256: "2322438ed2f6319a691291b247d09c69dcaa3a982460d1f269a7e1af335cfdfd" },
      },
    },
    // Windows: build «essentials» de gyan.dev (9.0.2, estático, trae ffmpeg y ffprobe).
    windows: {
      url: "https://www.gyan.dev/ffmpeg/builds/packages/ffmpeg-9.0.2-essentials_build.zip",
      bytes: 114768076,
      sha256: "60f467265b1e312373dbcd92200c2618a74850f98d3d078e94296bb3fa2047ba",
    },
  },
  autoEditor: {
    version: "31.6.0",
    base: "https://github.com/WyattBlue/auto-editor/releases/download/31.6.0",
    binarios: {
      "mac-arm64": { archivo: "auto-editor-macos-arm64", bytes: 26257096, sha256: "4312ae06d1e764a809a011c24a630f9cbe2be0cca803c5610433ff1d4dd05711" },
      "mac-x64": { archivo: "auto-editor-macos-x86_64", bytes: 36681464, sha256: "824405f9e2d28c3bbf30ff27c08dbe631d7137b0fe7c27e1ed647cc3affadf32" },
      "windows-x64": { archivo: "auto-editor-windows-x86_64.exe", bytes: 44560896, sha256: "6e037bc629db4f8b63b6ec6ebc265def3ad82ac63d74bb49d6b22963dc07b348" },
      "linux-x64": { archivo: "auto-editor-linux-x86_64", bytes: 46145848, sha256: "ad38d62dda324bf5adf820e7c49fd982c30e4b9b89682a6f9a441b6485edd29a" },
      "linux-arm64": { archivo: "auto-editor-linux-aarch64", bytes: 29387192, sha256: "0233e4fab698c98709e14ca64782103f40f9b87248853b21dc1cb29b02f98df6" },
    },
  },
  whisper: {
    // whisper.cpp solo publica binarios de Windows en las prereleases bNNNN, no en las etiquetas vX.
    windows: {
      url: "https://github.com/ggml-org/whisper.cpp/releases/download/b5130/whisper-bin-x64.zip",
      bytes: 8573270,
      sha256: "f9ec6c52a2e949b62ab51fa21d0d497958f9e41c3010c157c4e42932d5316f3c",
    },
    modelo: {
      url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin",
      bytes: 487601967,
      sha256: "1be3a9b2063867b937e64e2ec7483364a79917e157fa98c5d94b5c1fffea987b",
    },
  },
};

/** Filtros de ffmpeg que usan los scripts del repo. Un ffmpeg sin ellos no vale (el de Remotion, p. ej.). */
const FILTROS_FFMPEG = ["anoisesrc", "afade", "volume", "loudnorm", "select", "signalstats", "scale", "overlay", "afftdn", "volumedetect"];

const DIR_REMOTION = desdeRaiz("remotion");
const DIR_SFX = path.join(DIR_REMOTION, "public", "sfx");
const DIR_SFX_BASE = desdeRaiz("manuales", "diseno-sonoro", "sfx-base");
const AVATAR = path.join(DIR_REMOTION, "public", "avatar.mp4");
const MODELO_WHISPER = desdeRaiz("archivos", "whisper", "ggml-small.bin");
/** Lo que se repite en los mensajes de Windows: instalar.cmd es solo para el doble clic (hace una espera al acabar que a un agente lo dejaría colgado). */
const LINEA_INSTALAR_WINDOWS = "powershell -NoProfile -ExecutionPolicy Bypass -File instalar.ps1";

const USO = `Uso: node herramientas/setup.mjs [opciones]

  --solo-skills   solo crea/repara los enlaces de las skills (y pasa el doctor)
  --whisper       instala también whisper-cli y descarga el modelo ggml-small.bin (465 MB)
  --sin-whisper   no menciona whisper (por defecto tampoco se instala; esto solo calla el aviso)
  --sin-chrome    no descarga el Chrome de Remotion ahora (lo hará el primer render)
  --sin-doctor    no ejecuta doctor.mjs al final
  --help          esta ayuda`;

// ─── Utilidades locales ─────────────────────────────────────────────────────────
const mb = (bytes) => (bytes / 1048576).toFixed(0);
const hecho = []; // qué cambió, para el resumen final
const avisos = [];

function existe(p) {
  try {
    fs.statSync(p);
    return true;
  } catch {
    return false;
  }
}

/** Ruta absoluta de un binario, o null. Añade a la búsqueda de comun.mjs la carpeta bin del usuario (ya la mira) y nada más. */
const donde = (nombre) => binario(nombre);

/** El código de red que hay detrás de un error, si lo hay (undici lo esconde en e.cause). */
const causaDe = (e) => e?.cause?.code ?? e?.code ?? e?.cause?.message ?? null;

/**
 * fetch con un error que dice algo. Sin red, undici lanza un TypeError «fetch failed» y
 * deja la causa real (ENOTFOUND, ECONNREFUSED, un certificado…) en e.cause, que nadie
 * imprime: aquí se relanza con el host, el código y una pista según el código. Además,
 * el fetch de Node ignora HTTPS_PROXY (npm sí lo lee), así que tras un «npm ci» que
 * funcionó el usuario no entiende por qué esto no: se le dice.
 */
async function pedir(url, opciones = {}) {
  try {
    return await fetch(url, { redirect: "follow", ...opciones });
  } catch (e) {
    const codigo = causaDe(e) ?? e.message;
    const pistas = [];
    if (/ENOTFOUND|EAI_AGAIN|EAI_FAIL/.test(codigo)) pistas.push("sin red o sin DNS: comprueba la conexión y repite");
    else if (/ECONNREFUSED|ETIMEDOUT|ECONNRESET|EHOSTUNREACH|ENETUNREACH|UND_ERR_CONNECT_TIMEOUT|UND_ERR_SOCKET/.test(codigo)) pistas.push("un cortafuegos o un proxy corta la conexión");
    else if (/CERT|SSL|TLS|self.signed/i.test(codigo)) pistas.push("el certificado no se acepta (¿un proxy que inspecciona TLS?)");
    const proxy = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy;
    if (proxy && process.env.NODE_USE_ENV_PROXY !== "1") pistas.push("hay un proxy en HTTPS_PROXY, pero el fetch de Node no lo usa salvo que NODE_USE_ENV_PROXY=1 esté en el entorno (instalar.sh e instalar.ps1 lo ponen; a mano, expórtalo antes de lanzar el setup)");
    let host = url;
    try {
      host = new URL(url).host;
    } catch {
      /* se enseña la url tal cual */
    }
    const err = new Error(`no pude conectar con ${host} (${codigo}) al pedir ${url}${pistas.length ? `\n   ${pistas.join("\n   ")}` : ""}`);
    err.cause = e;
    err.explicado = true; // la causa ya va en el mensaje: quien lo capture no la repite
    throw err;
  }
}

/**
 * Descarga `url` a `destino` pasando por `destino.part`; comprueba tamaño y sha256
 * ANTES de dar el archivo por bueno. Reintenta una vez si la red falla a medias.
 * Escribe directamente en la carpeta de `destino`: el rename final es dentro del mismo
 * volumen, que es lo único que renameSync garantiza (entre volúmenes daría EXDEV).
 */
async function descargar(url, destino, { bytes, sha256, etiqueta } = {}) {
  const nombre = etiqueta || path.basename(destino);
  log.info(`descargando ${nombre}${bytes ? ` (${mb(bytes)} MB)` : ""}…`);
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  const parcial = `${destino}.part`;
  let ultimoError;
  for (let intento = 1; intento <= 2; intento++) {
    try {
      const res = await pedir(url, { headers: { "user-agent": "video-creator-setup" } });
      if (!res.ok || !res.body) throw new Error(`el servidor contestó HTTP ${res.status} (${url})`);
      await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(parcial));
      ultimoError = null;
      break;
    } catch (e) {
      ultimoError = e;
      if (intento === 1) log.aviso(`la descarga de ${nombre} se cortó (${e.message}); reintento…`);
    }
  }
  if (ultimoError) {
    const causa = !ultimoError.explicado && causaDe(ultimoError) ? ` (${causaDe(ultimoError)})` : "";
    throw new Error(`no pude descargar ${nombre}: ${ultimoError.message}${causa}\n   Comprueba la conexión a internet y vuelve a ejecutar el setup.`);
  }
  const tam = fs.statSync(parcial).size;
  if (bytes && tam !== bytes) {
    fs.rmSync(parcial, { force: true });
    throw new Error(`${nombre} llegó con ${tam} bytes y se esperaban ${bytes}: descarga incompleta o archivo cambiado en origen`);
  }
  if (sha256) {
    const real = await sha256DeArchivo(parcial);
    if (real !== sha256) {
      fs.rmSync(parcial, { force: true });
      throw new Error(`${nombre} no coincide con la suma sha256 esperada (${real} ≠ ${sha256}): no lo instalo`);
    }
  }
  fs.renameSync(parcial, destino);
  return destino;
}

/** Lee un archivo `.sha256` publicado («hex  nombre») y devuelve el hex. */
async function sha256Publicado(url) {
  const res = await pedir(url);
  if (!res.ok) throw new Error(`no pude leer el checksum publicado en ${url} (HTTP ${res.status})`);
  const hex = (await res.text()).trim().split(/\s+/)[0].toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(hex)) throw new Error(`el checksum publicado en ${url} no tiene forma de sha256`);
  return hex;
}

/**
 * Descomprime un zip en `dir`. `tar` lee zips en macOS y en Windows (bsdtar, en
 * System32 desde Windows 10 1803); si es el tar de GNU (Linux, Git Bash) no sabe y
 * caemos a unzip / Expand-Archive.
 */
function descomprimir(zip, dir) {
  fs.mkdirSync(dir, { recursive: true });
  const tar = donde("tar");
  if (tar) {
    const r = ejecutar(tar, ["-xf", zip, "-C", dir]);
    if (r.status === 0) return;
  }
  if (ES_WINDOWS) {
    const ps = donde("powershell") || donde("pwsh");
    if (!ps) throw new Error("no encuentro tar.exe ni PowerShell para descomprimir");
    ejecutar(ps, ["-NoProfile", "-NonInteractive", "-Command", `Expand-Archive -LiteralPath '${zip.replace(/'/g, "''")}' -DestinationPath '${dir.replace(/'/g, "''")}' -Force`], { check: true });
    return;
  }
  ejecutar("unzip", ["-q", "-o", zip, "-d", dir], { check: true });
}

/** Busca un archivo por nombre dentro de un árbol (los zips traen carpetas raíz distintas según el origen). */
function buscarArchivo(dir, nombre) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isFile() && e.name.toLowerCase() === nombre.toLowerCase()) return p;
    if (e.isDirectory()) {
      const r = buscarArchivo(p, nombre);
      if (r) return r;
    }
  }
  return null;
}

/** Deja `origen` como dirBinUsuario()/<nombre>, ejecutable, reemplazando de forma atómica lo que hubiera. */
function instalarEnBin(origen, nombre) {
  const bin = dirBinUsuario();
  fs.mkdirSync(bin, { recursive: true });
  const destino = path.join(bin, nombre);
  const tmp = `${destino}.${process.pid}.tmp`;
  fs.copyFileSync(origen, tmp);
  if (!ES_WINDOWS) fs.chmodSync(tmp, 0o755);
  fs.renameSync(tmp, destino);
  return destino;
}

/** Clave de plataforma para las tablas de binarios: mac-arm64, windows-x64, linux-x64… */
function claveBinario() {
  const { so, arch } = plataforma();
  return `${so}-${arch}`;
}

function ffmpegTieneFiltros(exe) {
  const r = ejecutar(exe, ["-hide_banner", "-filters"]);
  if (r.status !== 0) return { ok: false, faltan: FILTROS_FFMPEG };
  const presentes = new Set();
  for (const linea of r.stdout.split(/\r?\n/)) {
    const m = linea.match(/^\s*[A-Z.]{2,3}\s+(\S+)\s/);
    if (m) presentes.add(m[1]);
  }
  const faltan = FILTROS_FFMPEG.filter((f) => !presentes.has(f));
  return { ok: faltan.length === 0, faltan };
}

// ─── Pasos ──────────────────────────────────────────────────────────────────────

function pasoSkills() {
  log.titulo("Skills (enlaces para Claude Code y Codex)");
  const manuales = desdeRaiz("manuales");
  const skills = fs
    .readdirSync(manuales, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existe(path.join(manuales, e.name, "SKILL.md")))
    .map((e) => e.name)
    .sort();
  if (skills.length === 0) abortar("no hay ninguna carpeta manuales/<skill>/ con SKILL.md: ¿estás en la raíz del repo?");
  let nuevos = 0;
  for (const s of skills) {
    for (const destino of [".claude/skills", ".agents/skills"]) {
      const enlace = `${destino}/${s}`;
      try {
        const como = enlazar(`manuales/${s}`, enlace);
        if (como !== "ya") {
          nuevos++;
          log.ok(`${enlace} → manuales/${s} (${como})`);
        }
      } catch (e) {
        avisos.push(`no pude enlazar ${enlace}: ${e.message}`);
        log.aviso(`${enlace}: ${e.message}`);
      }
    }
  }
  if (nuevos === 0) log.ok(`las ${skills.length} skills ya estaban enlazadas en .claude/skills/ y .agents/skills/`);
  else hecho.push(`${nuevos} enlace(s) de skills creados`);
}

function pasoEnv() {
  log.titulo("Claves (.env)");
  const env = desdeRaiz(".env");
  const ejemplo = desdeRaiz(".env.example");
  if (existe(env)) {
    log.ok(".env ya existe (no lo toco; las claves las escribes tú ahí)");
    return;
  }
  if (!existe(ejemplo)) {
    log.aviso("no hay .env ni .env.example: sin claves se trabaja en nivel 0 igualmente");
    return;
  }
  fs.copyFileSync(ejemplo, env);
  hecho.push(".env creado a partir de .env.example");
  log.ok(".env creado a partir de .env.example: abre ese archivo y pega tus claves cuando las tengas (nivel 0 no necesita ninguna)");
}

/** Dependencias declaradas en remotion/package.json que no están (o no coinciden) en node_modules. */
function dependenciasQueFaltan() {
  const pkg = leerJSON(path.join(DIR_REMOTION, "package.json"));
  const declaradas = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  const faltan = [];
  for (const [nombre, rango] of Object.entries(declaradas)) {
    const pj = path.join(DIR_REMOTION, "node_modules", nombre, "package.json");
    if (!existe(pj)) {
      faltan.push(nombre);
      continue;
    }
    // Las versiones del repo van fijadas (sin ^ ni ~): si la instalada es otra, hay que reinstalar.
    if (/^\d/.test(rango) && leerJSON(pj).version !== rango) faltan.push(`${nombre} (hay ${leerJSON(pj).version}, se pide ${rango})`);
  }
  return faltan;
}

function pasoNpm() {
  log.titulo("Motor (remotion/node_modules)");
  if (!existe(path.join(DIR_REMOTION, "package-lock.json"))) abortar("falta remotion/package-lock.json: el repo está incompleto");
  const faltan = dependenciasQueFaltan();
  if (faltan.length === 0) {
    log.ok("las dependencias de remotion/ ya están instaladas y en la versión fijada");
    return;
  }
  log.info(`faltan o no coinciden ${faltan.length} paquete(s) (${faltan.slice(0, 3).join(", ")}${faltan.length > 3 ? "…" : ""}): ejecuto npm ci (tarda unos minutos y necesita internet)`);
  const r = npm(["ci", "--no-audit", "--no-fund", "--loglevel=error"], { cwd: DIR_REMOTION, heredar: true });
  if (r.status !== 0) abortar(`npm ci falló (código ${r.status}). Suele ser red o disco lleno; vuelve a lanzar «node herramientas/setup.mjs» cuando lo resuelvas.`);
  const siguenFaltando = dependenciasQueFaltan();
  if (siguenFaltando.length) abortar(`después de npm ci siguen faltando: ${siguenFaltando.join(", ")}`);
  hecho.push("dependencias de remotion/ instaladas (npm ci)");
  log.ok("dependencias de remotion/ instaladas");
}

/** Versión mínima de uv: antes no existen «uv run --no-project» ni «uv python find», que usan los scripts (la misma que mira doctor.mjs). */
const UV_MINIMO = [0, 4, 0];

/** ¿Este uv sirve? Devuelve { ok, version } o { ok: false, motivo }. */
function uvValido(exe) {
  const v = versionDe(exe);
  if (!v) return { ok: false, motivo: "no arranca" };
  const m = v.match(/(\d+)\.(\d+)\.(\d+)/);
  if (!m) return { ok: false, motivo: `versión irreconocible («${v}»)` };
  const p = [Number(m[1]), Number(m[2]), Number(m[3])];
  const viejo = p[0] < UV_MINIMO[0] || (p[0] === UV_MINIMO[0] && (p[1] < UV_MINIMO[1] || (p[1] === UV_MINIMO[1] && p[2] < UV_MINIMO[2])));
  if (viejo) return { ok: false, motivo: `${v} es anterior a ${UV_MINIMO.join(".")}` };
  return { ok: true, version: v };
}

async function pasoUv(tmp) {
  const ya = donde("uv");
  if (ya) {
    // Un uv ajeno (pip de 2024, un binario roto) solo se respeta si arranca y es reciente: si no,
    // se instala el fijado en la carpeta de herramientas del usuario, que binario() mira primero.
    const estado = uvValido(ya);
    if (estado.ok) {
      log.ok(`uv ya está: ${estado.version}`);
      return ya;
    }
    log.aviso(`el uv de ${posix(ya)} ${estado.motivo}: instalo el ${VERSIONES.uv.version} en ${posix(dirBinUsuario())}, que tiene prioridad para los scripts`);
  }
  const bin = dirBinUsuario();
  const { so, arch } = plataforma();
  const cpu = arch === "arm64" ? "aarch64" : "x86_64";
  const objetivo = so === "windows" ? `${cpu}-pc-windows-msvc` : so === "mac" ? `${cpu}-apple-darwin` : `${cpu}-unknown-linux-gnu`;
  const archivo = `uv-${objetivo}.${so === "windows" ? "zip" : "tar.gz"}`;
  const fijado = VERSIONES.uv.sha256[archivo];
  if (!fijado) throw new Error(`no tengo uv fijado para ${so} ${arch} (${archivo}); instálalo tú desde https://docs.astral.sh/uv/ y repite el setup`);
  const url = `${VERSIONES.uv.base}/${archivo}`;
  const publicado = await sha256Publicado(`${url}.sha256`);
  if (publicado !== fijado) throw new Error(`el sha256 publicado de ${archivo} (${publicado}) no es el fijado en setup.mjs (${fijado}): alguien cambió el archivo en origen; no lo instalo`);
  const paquete = await descargar(url, path.join(tmp, archivo), { sha256: fijado, etiqueta: `uv ${VERSIONES.uv.version}` });
  const dir = path.join(tmp, "uv");
  if (archivo.endsWith(".zip")) descomprimir(paquete, dir);
  else {
    fs.mkdirSync(dir, { recursive: true });
    ejecutar("tar", ["-xzf", paquete, "-C", dir], { check: true });
  }
  for (const nombre of ["uv", "uvx"]) {
    const exe = ES_WINDOWS ? `${nombre}.exe` : nombre;
    const origen = buscarArchivo(dir, exe);
    if (!origen) throw new Error(`el paquete de uv no trae ${exe}`);
    instalarEnBin(origen, exe);
  }
  const uv = donde("uv");
  if (!uv) throw new Error(`uv no aparece en ${posix(bin)} después de instalarlo`);
  const nuevo = uvValido(uv);
  if (!nuevo.ok) throw new Error(`el uv recién instalado en ${posix(uv)} ${nuevo.motivo}; avisa de esto en el repo`);
  hecho.push(`uv ${VERSIONES.uv.version} en ${posix(bin)}`);
  log.ok(`uv instalado: ${nuevo.version}`);
  return uv;
}

function pasoPython(uv) {
  const busca = ejecutar(uv, ["python", "find", ">=3.10"]);
  if (busca.status === 0 && busca.stdout.trim()) {
    log.ok(`Python: ${posix(busca.stdout.trim())}`);
    return;
  }
  log.info(`no hay Python ≥ 3.10: uv descarga uno (${VERSIONES.python}) para sus propios scripts`);
  const r = ejecutar(uv, ["python", "install", VERSIONES.python], { heredar: true });
  if (r.status !== 0) {
    avisos.push("uv no pudo descargar Python; los scripts .py fallarán hasta que haya uno (uv python install 3.12)");
    log.aviso("uv no pudo descargar Python (¿sin red?): los .py fallarán hasta que lo haya");
    return;
  }
  hecho.push(`Python ${VERSIONES.python} (gestionado por uv)`);
  log.ok(`Python ${VERSIONES.python} instalado por uv`);
}

async function pasoFfmpeg(tmp) {
  const ffmpeg = donde("ffmpeg");
  const ffprobe = donde("ffprobe");
  if (ffmpeg && ffprobe) {
    const { ok, faltan } = ffmpegTieneFiltros(ffmpeg);
    if (ok) {
      log.ok(`ffmpeg ya está: ${versionDe(ffmpeg, ["-version"]) || ffmpeg}`);
      return;
    }
    log.aviso(`el ffmpeg de ${posix(ffmpeg)} no trae los filtros ${faltan.join(", ")}: instalo uno completo en ${posix(dirBinUsuario())}, que tiene prioridad para los scripts`);
  }
  const { so, arch } = plataforma();
  if (so === "mac") {
    const def = VERSIONES.ffmpeg.mac[arch === "arm64" ? "arm64" : "x64"];
    for (const nombre of ["ffmpeg", "ffprobe"]) {
      const url = `${def.base}/${nombre}.zip`;
      const publicado = await sha256Publicado(`${url}.sha256`);
      if (publicado !== def[nombre].sha256) throw new Error(`el sha256 publicado de ${nombre}.zip (${publicado}) no es el fijado en setup.mjs: no lo instalo`);
      const zip = await descargar(url, path.join(tmp, `${nombre}.zip`), { ...def[nombre], etiqueta: `${nombre} 9.0.2 (macOS ${arch})` });
      const dir = path.join(tmp, nombre);
      descomprimir(zip, dir);
      const origen = buscarArchivo(dir, nombre);
      if (!origen) throw new Error(`el zip de ${nombre} no trae el binario`);
      instalarEnBin(origen, nombre);
    }
  } else if (so === "windows") {
    const def = VERSIONES.ffmpeg.windows;
    const publicado = await sha256Publicado(`${def.url}.sha256`);
    if (publicado !== def.sha256) throw new Error(`el sha256 publicado del ffmpeg de gyan.dev (${publicado}) no es el fijado en setup.mjs: no lo instalo`);
    const zip = await descargar(def.url, path.join(tmp, "ffmpeg.zip"), { bytes: def.bytes, sha256: def.sha256, etiqueta: "ffmpeg 9.0.2 essentials (Windows)" });
    const dir = path.join(tmp, "ffmpeg");
    descomprimir(zip, dir);
    for (const exe of ["ffmpeg.exe", "ffprobe.exe"]) {
      const origen = buscarArchivo(dir, exe);
      if (!origen) throw new Error(`el zip de ffmpeg no trae ${exe}`);
      instalarEnBin(origen, exe);
    }
  } else {
    avisos.push("ffmpeg: en Linux instálalo con tu gestor de paquetes (p. ej. «sudo apt install ffmpeg») y vuelve a ejecutar el setup");
    log.aviso("ffmpeg no está y en Linux no lo descargo: instálalo con tu gestor de paquetes (apt, dnf, pacman…)");
    return;
  }
  const nuevo = donde("ffmpeg");
  const { ok, faltan } = ffmpegTieneFiltros(nuevo);
  if (!ok) throw new Error(`el ffmpeg recién instalado no trae ${faltan.join(", ")}; avisa de esto en el repo`);
  hecho.push(`ffmpeg y ffprobe 9.0.2 en ${posix(dirBinUsuario())}`);
  log.ok(`ffmpeg instalado: ${versionDe(nuevo, ["-version"])}`);
}

async function pasoAutoEditor(tmp) {
  const ya = donde("auto-editor");
  if (ya) {
    const v = versionDe(ya) || "";
    log.ok(`auto-editor ya está: ${v || ya}`);
    if (!v.includes(VERSIONES.autoEditor.version.split(".")[0] + ".")) {
      avisos.push(`auto-editor ${v} no es la ${VERSIONES.autoEditor.version} con la que está probado el sistema; si quieres la fijada, quita ${posix(ya)} y repite el setup`);
    }
    return;
  }
  const def = VERSIONES.autoEditor.binarios[claveBinario()];
  if (!def) {
    avisos.push(`auto-editor no tiene binario para ${claveBinario()}: descárgalo de https://auto-editor.com/installing y déjalo en ${posix(dirBinUsuario())}`);
    log.aviso(`auto-editor: no hay binario para ${claveBinario()}`);
    return;
  }
  const archivo = await descargar(`${VERSIONES.autoEditor.base}/${def.archivo}`, path.join(tmp, def.archivo), { ...def, etiqueta: `auto-editor ${VERSIONES.autoEditor.version}` });
  instalarEnBin(archivo, ES_WINDOWS ? "auto-editor.exe" : "auto-editor");
  const nuevo = donde("auto-editor");
  hecho.push(`auto-editor ${VERSIONES.autoEditor.version} en ${posix(dirBinUsuario())}`);
  log.ok(`auto-editor instalado: ${versionDe(nuevo) || nuevo}`);
}

async function pasoWhisper(tmp) {
  // Binario
  const ya = donde("whisper-cli");
  if (ya) log.ok(`whisper-cli ya está: ${posix(ya)}`);
  else if (ES_MAC) {
    const brew = donde("brew");
    if (!brew) {
      avisos.push("whisper-cli: en macOS se instala con Homebrew («brew install whisper.cpp») y no tienes brew; la transcripción con tiempos queda fuera hasta entonces");
      log.aviso("whisper-cli: sin Homebrew no lo puedo instalar en macOS (brew install whisper.cpp)");
    } else {
      log.info("instalando whisper.cpp con Homebrew (puede tardar)…");
      const r = ejecutar(brew, ["install", "whisper.cpp"], { heredar: true });
      if (r.status !== 0) {
        avisos.push("«brew install whisper.cpp» falló; repítelo a mano y vuelve al setup");
        log.aviso("brew install whisper.cpp falló");
      } else {
        hecho.push("whisper.cpp (Homebrew)");
        log.ok("whisper-cli instalado con Homebrew");
      }
    }
  } else if (ES_WINDOWS) {
    if (process.arch !== "x64") {
      avisos.push("whisper-cli: solo tengo el zip para Windows x64");
      log.aviso("whisper-cli: solo hay zip fijado para Windows x64");
    } else {
      const def = VERSIONES.whisper.windows;
      const zip = await descargar(def.url, path.join(tmp, "whisper-bin-x64.zip"), { bytes: def.bytes, sha256: def.sha256, etiqueta: "whisper.cpp b5130 (Windows x64)" });
      const dir = path.join(tmp, "whisper");
      descomprimir(zip, dir);
      const cli = buscarArchivo(dir, "whisper-cli.exe");
      if (!cli) throw new Error("el zip de whisper.cpp no trae whisper-cli.exe");
      // whisper-cli.exe carga sus DLL desde su propia carpeta: van juntas a bin/.
      for (const e of fs.readdirSync(path.dirname(cli))) {
        if (e.toLowerCase() === "whisper-cli.exe" || /\.dll$/i.test(e)) instalarEnBin(path.join(path.dirname(cli), e), e);
      }
      hecho.push(`whisper-cli (whisper.cpp b5130) en ${posix(dirBinUsuario())}`);
      log.ok("whisper-cli instalado");
    }
  } else {
    avisos.push("whisper-cli: en Linux instálalo con tu gestor de paquetes o compílalo (github.com/ggml-org/whisper.cpp)");
    log.aviso("whisper-cli: en Linux no lo descargo");
  }
  // Modelo
  const def = VERSIONES.whisper.modelo;
  if (existe(MODELO_WHISPER) && fs.statSync(MODELO_WHISPER).size === def.bytes) {
    log.ok(`modelo ggml-small.bin ya está en ${relativa(MODELO_WHISPER)}`);
    return;
  }
  // Directo a su carpeta definitiva (descargar() pasa por .part y renombra dentro de ella): con
  // el repo en otro volumen que el temporal (D:\, un disco externo) el rename desde tmp daba
  // EXDEV después de bajar 465 MB, y en cada intento.
  await descargar(def.url, MODELO_WHISPER, { bytes: def.bytes, sha256: def.sha256, etiqueta: "modelo ggml-small.bin" });
  hecho.push(`modelo ${relativa(MODELO_WHISPER)}`);
  log.ok(`modelo descargado y verificado: ${relativa(MODELO_WHISPER)}`);
}

function pasoChrome() {
  log.titulo("Chrome Headless Shell (lo usa Remotion para renderizar)");
  const cli = path.join(DIR_REMOTION, "node_modules", "@remotion", "cli", "remotion-cli.js");
  if (!existe(cli)) {
    log.aviso("no está @remotion/cli en node_modules: me salto Chrome (ejecuta el setup otra vez cuando npm ci haya terminado)");
    return;
  }
  // Remotion lo guarda en node_modules/.remotion/chrome-headless-shell/<plataforma>/. Si ya está,
  // `ensure` termina al instante; si no, son ~150 MB y el usuario debe ver el progreso (heredar).
  const carpetaChrome = path.join(DIR_REMOTION, "node_modules", ".remotion", "chrome-headless-shell");
  const habia = existe(carpetaChrome) && fs.readdirSync(carpetaChrome).some((e) => e !== "VERSION");
  if (!habia) log.info("descargando el Chrome Headless Shell de Remotion (~150 MB)…");
  const r = ejecutar(process.execPath, [cli, "browser", "ensure"], { cwd: DIR_REMOTION, heredar: true });
  if (r.status !== 0) {
    avisos.push("Remotion no pudo descargar Chrome Headless Shell; lo intentará en el primer render (necesita internet)");
    log.aviso("remotion browser ensure falló (¿sin red?): el primer render lo volverá a intentar");
    return;
  }
  if (habia) log.ok("Chrome Headless Shell ya estaba descargado");
  else {
    hecho.push("Chrome Headless Shell de Remotion");
    log.ok("Chrome Headless Shell listo");
  }
}

function pasoSfx() {
  log.titulo("Efectos de sonido (remotion/public/sfx)");
  const origen = path.join(DIR_SFX, ".origen.json");
  if (existe(origen)) {
    let modo = null;
    try {
      modo = leerJSON(origen).modo;
    } catch {
      /* un .origen.json roto no da permiso para pisar nada */
    }
    if (modo === "banco" || modo === null) {
      log.ok(`remotion/public/sfx/ viene de un banco propio (${relativa(origen)}): no toco ni un archivo`);
      return;
    }
  }
  if (!existe(DIR_SFX_BASE)) {
    avisos.push("no existe manuales/diseno-sonoro/sfx-base/: los SFX no se copiaron (genera el set con «node manuales/diseno-sonoro/scripts/sfx.mjs sintetizar» o trae el repo completo)");
    log.aviso("no existe manuales/diseno-sonoro/sfx-base/: sin SFX el motor renderiza igual, pero sin sonido en los cues");
    return;
  }
  fs.mkdirSync(DIR_SFX, { recursive: true });
  let copiados = 0;
  let estaban = 0;
  for (const nombre of fs.readdirSync(DIR_SFX_BASE).sort()) {
    if (!/\.(mp3|wav)$/i.test(nombre)) continue;
    const destino = path.join(DIR_SFX, nombre);
    if (existe(destino)) {
      estaban++;
      continue;
    }
    fs.copyFileSync(path.join(DIR_SFX_BASE, nombre), destino);
    copiados++;
  }
  if (copiados) hecho.push(`${copiados} SFX base copiados a remotion/public/sfx/`);
  log.ok(`SFX: ${copiados} copiados, ${estaban} ya estaban (nunca se sobrescribe uno existente)`);
}

function pasoAvatar() {
  log.titulo("Vídeo de relleno del avatar (remotion/public/avatar.mp4)");
  if (existe(AVATAR)) {
    log.ok("avatar.mp4 ya existe: no lo regenero");
    return;
  }
  const ffmpeg = donde("ffmpeg");
  if (!ffmpeg) {
    avisos.push("sin ffmpeg no pude generar remotion/public/avatar.mp4 (las demos con avatar no renderizan)");
    log.aviso("sin ffmpeg no puedo generar avatar.mp4");
    return;
  }
  fs.mkdirSync(path.dirname(AVATAR), { recursive: true });
  const tmp = `${AVATAR}.${process.pid}.tmp.mp4`;
  const base = ["-y", "-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", "gradients=size=1920x1080:rate=30:c0=0x1B2A41:c1=0xC8553D:nb_colors=2:speed=0.02", "-t", "3", "-an"];
  // libx264 es lo que decodifica Chrome sin sorpresas; si el ffmpeg no lo trae, mpeg4 como último recurso.
  let r = ejecutar(ffmpeg, [...base, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", tmp]);
  if (r.status !== 0) r = ejecutar(ffmpeg, [...base, "-c:v", "mpeg4", "-q:v", "3", "-pix_fmt", "yuv420p", tmp]);
  if (r.status !== 0) {
    fs.rmSync(tmp, { force: true });
    avisos.push(`ffmpeg no pudo generar avatar.mp4: ${r.stderr.trim().split(/\r?\n/).pop()}`);
    log.aviso("ffmpeg no pudo generar avatar.mp4");
    return;
  }
  fs.renameSync(tmp, AVATAR);
  hecho.push("remotion/public/avatar.mp4 de relleno (degradado 1920×1080, 30 fps, 3 s)");
  log.ok("avatar.mp4 generado (degradado de 3 s; sustitúyelo por tu propio clip cuando quieras)");
}

function pasoPathUsuario() {
  const bin = dirBinUsuario();
  const enPath = (process.env.PATH || "").split(path.delimiter).some((c) => c && path.resolve(c) === bin);
  if (enPath) return;
  if (ES_WINDOWS) {
    log.aviso(`${posix(bin)} no está en tu PATH: los scripts del sistema lo encuentran igual, pero para usar ffmpeg/uv desde tu terminal ejecuta «${LINEA_INSTALAR_WINDOWS}» (lo añade) o abre una terminal nueva si ya lo hiciste`);
  } else {
    log.aviso(`${posix(bin)} no está en tu PATH: los scripts del sistema lo encuentran igual; instalar.sh lo añade a tu perfil de shell (abre una terminal nueva)`);
  }
}

// ─── Principal ──────────────────────────────────────────────────────────────────
async function principal() {
  const f = flags();
  const conocidos = new Set(["solo-skills", "whisper", "sin-whisper", "sin-chrome", "sin-doctor", "help", "_"]);
  const raros = Object.keys(f).filter((k) => !conocidos.has(k));
  if (f.help) {
    console.log(USO);
    return 0;
  }
  if (raros.length || f._.length) abortar(`opción desconocida: ${[...raros.map((k) => `--${k}`), ...f._].join(" ")}\n\n${USO}`);
  if (f.whisper && f["sin-whisper"]) abortar("--whisper y --sin-whisper se contradicen");

  const { so, arch, nodo } = plataforma();
  const mayor = Number(nodo.slice(1).split(".")[0]);
  console.log(`video-creator · setup en ${posix(RAIZ)} (${so} ${arch}, Node ${nodo})`);
  if (mayor < 22) abortar(`este sistema necesita Node 22 o superior y tienes ${nodo}. Ejecuta «bash instalar.sh» (macOS/Linux) o «${LINEA_INSTALAR_WINDOWS}» (Windows): ellos lo instalan sin administrador.`);
  if (ES_WINDOWS && arch === "arm64") log.aviso("Windows ARM64: Remotion no tiene compositor para esta arquitectura y los renders fallarán. El resto se instala igual.");
  if (/onedrive|icloud|mobile documents/i.test(RAIZ)) log.aviso("el repo está dentro de OneDrive/iCloud: la sincronización pelea con node_modules y con los renders. Mejor en una carpeta local normal.");

  pasoSkills();
  if (!f["solo-skills"]) {
    pasoEnv();
    pasoNpm();

    log.titulo(`Herramientas del usuario (${posix(dirBinUsuario())}, sin administrador)`);
    const tmp = carpetaTemporal("video-creator-setup-");
    try {
      const uv = await pasoUv(tmp);
      pasoPython(uv);
      await pasoFfmpeg(tmp);
      await pasoAutoEditor(tmp);
      if (f.whisper) await pasoWhisper(tmp);
      else if (!f["sin-whisper"]) log.info("whisper (transcripción con tiempos) es opcional: «node herramientas/setup.mjs --whisper» lo instala con su modelo de 465 MB");
    } finally {
      borrar(tmp);
    }
    pasoPathUsuario();

    if (!f["sin-chrome"]) pasoChrome();
    pasoSfx();
    pasoAvatar();
  }

  log.titulo("Resumen");
  if (hecho.length === 0) log.ok("no había nada que hacer: todo estaba ya instalado");
  else for (const h of hecho) log.ok(h);
  for (const a of avisos) log.aviso(a);

  if (f["sin-doctor"]) return 0;
  console.log("");
  const r = ejecutar(process.execPath, [desdeRaiz("herramientas", "doctor.mjs")], { heredar: true });
  return r.status;
}

if (esMain(import.meta.url)) {
  principal()
    .then((codigo) => process.exit(codigo))
    .catch((e) => {
      // abortar() solo imprime el mensaje; la causa real de un fallo de red o de disco va en
      // e.cause (o en e.code) y sin ella «fetch failed» no le dice nada a nadie.
      const causa = !e.explicado && causaDe(e) ? ` (causa: ${causaDe(e)})` : "";
      abortar(`${e.message}${causa}\n   Puedes volver a ejecutar «node herramientas/setup.mjs»: retoma donde se quedó.`);
    });
}
