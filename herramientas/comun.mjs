/**
 * comun.mjs — lo que comparten todos los scripts de Node del sistema.
 *
 * Existe para que cada script NO tenga que resolver por su cuenta las tres cosas
 * que se rompen en cuanto el repo sale de la máquina donde nació:
 *
 *   · DÓNDE ESTÁ LA RAÍZ del repo (sin rutas absolutas de nadie).
 *   · DÓNDE ESTÁN LOS BINARIOS externos (ffmpeg, uv, whisper-cli, auto-editor):
 *     primero los que instala `herramientas/setup.mjs` en la carpeta de
 *     herramientas del usuario, después el PATH. Así el sistema funciona aunque
 *     el usuario no tenga permisos de administrador ni haya tocado su PATH.
 *   · CÓMO SE LANZA UN PROCESO igual en macOS y en Windows: sin shell (salvo los
 *     .cmd de Windows, que no arrancan sin ella), con UTF-8 y con un error que
 *     dice qué se ejecutó y qué contestó.
 *
 * Solo librería estándar de Node. Se importa con una ruta relativa desde
 * cualquier script del repo, por ejemplo desde manuales/x/scripts/y.mjs:
 *
 *   import { RAIZ, ejecutar, binario, esMain } from "../../../herramientas/comun.mjs";
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/** Raíz del repo: la carpeta que contiene `herramientas/`. */
export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const ES_WINDOWS = process.platform === "win32";
export const ES_MAC = process.platform === "darwin";

/** `mac` · `windows` · `linux`, más la arquitectura tal como la ve Node. */
export function plataforma() {
  const so = ES_MAC ? "mac" : ES_WINDOWS ? "windows" : "linux";
  return { so, arch: process.arch, nodo: process.version };
}

/** Ruta absoluta bajo la raíz del repo. */
export const desdeRaiz = (...segmentos) => path.join(RAIZ, ...segmentos);

/** Ruta relativa a la raíz, SIEMPRE con «/», que es lo que se enseña y se guarda. */
export function relativa(p) {
  return path.relative(RAIZ, path.resolve(p)).split(path.sep).join("/");
}

/** Convierte cualquier ruta a barras «/». Windows las acepta en todos sus shells. */
export const posix = (p) => String(p).split(path.sep).join("/").replace(/\\/g, "/");

/**
 * Carpeta donde `setup.mjs` deja los binarios del usuario (sin administrador).
 * macOS/Linux: ~/.local/bin (la misma que usa uv). Windows: %LOCALAPPDATA%\video-creator\bin.
 */
export function dirBinUsuario() {
  if (ES_WINDOWS) {
    const base = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
    return path.join(base, "video-creator", "bin");
  }
  return path.join(os.homedir(), ".local", "bin");
}

/** Extensiones ejecutables de Windows, en el orden en que las prueba cmd.exe. */
const EXTS_WIN = [".exe", ".cmd", ".bat", ".com"];

function existeEjecutable(p) {
  try {
    const st = fs.statSync(p);
    return st.isFile();
  } catch {
    return false;
  }
}

/**
 * Localiza un binario externo por nombre. Devuelve la ruta absoluta o null.
 *
 * Orden: la carpeta de herramientas del usuario (la que llena setup.mjs), y
 * después cada carpeta del PATH. En Windows prueba las extensiones ejecutables.
 * No lanza nada: es una consulta.
 */
export function binario(nombre) {
  if (path.isAbsolute(nombre)) return existeEjecutable(nombre) ? nombre : null;
  const candidatosNombre = ES_WINDOWS
    ? (path.extname(nombre) ? [nombre] : EXTS_WIN.map((e) => nombre + e))
    : [nombre];
  const carpetas = [dirBinUsuario(), ...(process.env.PATH || "").split(path.delimiter).filter(Boolean)];
  for (const carpeta of carpetas) {
    for (const n of candidatosNombre) {
      const p = path.join(carpeta, n);
      if (existeEjecutable(p)) return p;
    }
  }
  return null;
}

/** Comilla un argumento para cmd.exe (solo se usa al lanzar un .cmd/.bat). */
function comillaCmd(a) {
  const s = String(a);
  if (s === "") return '""';
  if (!/[\s"&|<>^()%!]/.test(s)) return s;
  return '"' + s.replace(/(["%!^])/g, "^$1") + '"';
}

/**
 * Lanza un proceso y espera. Devuelve { status, stdout, stderr, comando }.
 *
 *   ejecutar("ffmpeg", ["-version"])                 // resuelve con binario()
 *   ejecutar(process.execPath, [script, ...])        // ruta absoluta: tal cual
 *   ejecutar("ffmpeg", args, { check: true })        // lanza si status ≠ 0
 *   ejecutar("ffmpeg", args, { heredar: true })      // salida directa a la consola
 *
 * En Windows, un .cmd/.bat solo arranca a través de cmd.exe; aquí se detecta y
 * se comilla cada argumento. Todo lo demás va SIN shell, que es lo seguro.
 */
export function ejecutar(cmd, args = [], opts = {}) {
  const { check = false, heredar = false, cwd, env, entrada, timeout, silencioso = false } = opts;
  let exe = path.isAbsolute(cmd) ? cmd : binario(cmd);
  if (!exe) {
    const e = new Error(`no encuentro «${cmd}» ni en ${relativa(dirBinUsuario())} ni en el PATH`);
    e.faltaBinario = cmd;
    if (check) throw e;
    return { status: 127, stdout: "", stderr: e.message, comando: cmd, faltaBinario: cmd };
  }
  let argumentos = args.map(String);
  let usaShell = false;
  if (ES_WINDOWS && /\.(cmd|bat)$/i.test(exe)) {
    // cmd.exe reinterpreta la línea entera: se comilla a mano y se pasa por shell.
    argumentos = argumentos.map(comillaCmd);
    exe = `"${exe}"`;
    usaShell = true;
  }
  const r = spawnSync(exe, argumentos, {
    cwd,
    env: env ? { ...process.env, ...env } : process.env,
    input: entrada,
    timeout,
    shell: usaShell,
    encoding: "utf8",
    stdio: heredar ? "inherit" : ["pipe", "pipe", "pipe"],
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
  });
  const res = {
    status: r.status ?? (r.signal ? 128 : 1),
    stdout: r.stdout || "",
    stderr: r.stderr || "",
    comando: [cmd, ...args].join(" "),
  };
  if (r.error) res.stderr = (res.stderr ? res.stderr + "\n" : "") + String(r.error.message || r.error);
  if (check && res.status !== 0) {
    const e = new Error(
      `falló «${res.comando}» (código ${res.status})${silencioso ? "" : "\n" + (res.stderr || res.stdout).trim().slice(-2000)}`
    );
    e.resultado = res;
    throw e;
  }
  return res;
}

/**
 * Lanza un paquete de npm como hace `npx`, pero sin depender de npx.cmd ni de una
 * shell: localiza el `npx-cli.js` del npm que acompaña a ESTE node y lo ejecuta
 * con process.execPath. Si no aparece, cae a `npx` del PATH.
 *
 *   npx(["--yes", "hyperframes@0.8.47", "check", "index.html"])
 */
export function npx(args, opts = {}) {
  const dirNode = path.dirname(process.execPath);
  const candidatos = [
    path.join(dirNode, "node_modules", "npm", "bin", "npx-cli.js"), // Windows
    path.join(dirNode, "..", "lib", "node_modules", "npm", "bin", "npx-cli.js"), // macOS/Linux
  ];
  const cli = candidatos.find((p) => fs.existsSync(p));
  if (cli) return ejecutar(process.execPath, [cli, ...args], opts);
  return ejecutar(ES_WINDOWS ? "npx.cmd" : "npx", args, opts);
}

/**
 * Ejecuta un script de Python del repo. Prefiere `uv run` (que trae su propio
 * Python si hace falta) y cae a python3/python del sistema.
 * Los scripts del repo son de librería estándar: no hay entornos que crear.
 */
export function python(script, args = [], opts = {}) {
  const uv = binario("uv");
  if (uv) return ejecutar(uv, ["run", "--no-project", "--python", ">=3.10", script, ...args], opts);
  const py = binario("python3") || binario("python") || (ES_WINDOWS ? binario("py") : null);
  if (!py) return ejecutar("uv", ["run", script], opts); // deja el error de «no encuentro uv»
  return ejecutar(py, [script, ...args], opts);
}

/** Cómo se llama a Python en la shell de esta plataforma (para mensajes al usuario). */
export function comandoPython() {
  return binario("uv") ? "uv run" : ES_WINDOWS ? "python" : "python3";
}

/** `--version` de un binario, o null si no está. Sirve para el doctor. */
export function versionDe(cmd, args = ["--version"]) {
  const r = ejecutar(cmd, args);
  if (r.status !== 0 && !r.stdout) return null;
  return (r.stdout || r.stderr).trim().split(/\r?\n/)[0];
}

/**
 * ¿Este módulo se está ejecutando directamente (`node x.mjs`) o lo han importado?
 * Compara rutas REALES: si el script llega por un symlink o una junction
 * (.claude/skills/... → manuales/...), process.argv[1] y import.meta.url difieren
 * en texto y una comparación literal diría «importado» y no haría nada.
 */
export function esMain(importMetaUrl) {
  if (!process.argv[1]) return false;
  const real = (p) => {
    try {
      return fs.realpathSync.native(p);
    } catch {
      return path.resolve(p);
    }
  };
  let a = real(process.argv[1]);
  let b = real(fileURLToPath(importMetaUrl));
  if (ES_WINDOWS) {
    a = a.toLowerCase();
    b = b.toLowerCase();
  }
  return a === b;
}

/**
 * Enlaza `enlace` → `destino` (los dos, rutas absolutas o relativas a la raíz).
 * macOS/Linux: symlink relativo. Windows: junction (no pide administrador; solo
 * vale para carpetas). Si no se puede enlazar, copia y lo dice.
 * Devuelve "symlink" | "junction" | "copia" | "ya".
 */
export function enlazar(destino, enlace) {
  const dst = path.resolve(RAIZ, destino);
  const lnk = path.resolve(RAIZ, enlace);
  if (!fs.existsSync(dst)) throw new Error(`no existe el destino del enlace: ${relativa(dst)}`);
  try {
    const st = fs.lstatSync(lnk);
    if (st.isSymbolicLink()) {
      const actual = path.resolve(path.dirname(lnk), fs.readlinkSync(lnk));
      if (fs.realpathSync.native(actual) === fs.realpathSync.native(dst)) return "ya";
      fs.unlinkSync(lnk);
    } else if (st.isDirectory()) {
      // Una copia anterior, o un directorio del usuario: no se pisa en silencio.
      const marca = path.join(lnk, ".enlace-de-video-creator");
      if (!fs.existsSync(marca)) throw new Error(`${relativa(lnk)} existe y no es un enlace: quítalo a mano si quieres que lo enlace`);
      fs.rmSync(lnk, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    } else {
      // El clon en Windows deja los symlinks del repo como archivos de texto.
      fs.unlinkSync(lnk);
    }
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  fs.mkdirSync(path.dirname(lnk), { recursive: true });
  if (ES_WINDOWS) {
    try {
      fs.symlinkSync(dst, lnk, "junction");
      return "junction";
    } catch {
      // Sin junction (exFAT, una carpeta de red) queda la copia, y la copia lleva
      // SOLO la documentación. Los scripts importan comun.mjs por ruta relativa
      // (../../../herramientas/) y copiados bajo .claude/skills/ resolverían a
      // .claude/herramientas/, que no existe: mejor que falten (ENOENT en el
      // acto) a que arranquen y fallen a medias. El LEEME dice desde dónde van.
      const esScript = (p) => ["scripts", "__pycache__"].includes(path.basename(p)) || /\.(mjs|py)$/i.test(p);
      fs.cpSync(dst, lnk, { recursive: true, filter: (p) => !esScript(p) });
      fs.writeFileSync(path.join(lnk, ".enlace-de-video-creator"), relativa(dst) + "\n");
      fs.writeFileSync(
        path.join(lnk, "LEEME.md"),
        `Esta carpeta es una COPIA de ${relativa(dst)}/ (aquí no se pudo crear un enlace).\n` +
          `Lleva solo la documentación de la skill: sus scripts NO están aquí. Se lanzan\n` +
          `desde la raíz del repo, con la ruta original:\n\n` +
          `    node ${relativa(dst)}/scripts/<script>.mjs\n` +
          `    uv run ${relativa(dst)}/scripts/<script>.py\n`
      );
      return "copia";
    }
  }
  fs.symlinkSync(path.relative(path.dirname(lnk), dst), lnk);
  return "symlink";
}

/** Carpeta temporal propia, y su borrado tolerante (el antivirus de Windows retiene archivos un instante). */
export function carpetaTemporal(prefijo = "video-creator-") {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefijo));
}
export function borrar(p) {
  fs.rmSync(p, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

/** Escritura atómica: archivo temporal al lado + rename. */
export function escribirAtomico(destino, contenido) {
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  const tmp = `${destino}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, contenido);
  fs.renameSync(tmp, destino);
}

export const leerJSON = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
export const escribirJSON = (p, v) => escribirAtomico(p, JSON.stringify(v, null, 2) + "\n");

/** Lee texto normalizando CRLF → LF y quitando el BOM (Bloc de notas, autocrlf). */
export function leerTexto(p) {
  return fs.readFileSync(p, "utf8").replace(/^﻿/, "").replace(/\r\n/g, "\n");
}

/** Mensajes con el mismo tono en todos los scripts. */
export const log = {
  ok: (m) => console.log(`✅ ${m}`),
  info: (m) => console.log(`· ${m}`),
  aviso: (m) => console.log(`⚠️  ${m}`),
  error: (m) => console.error(`❌ ${m}`),
  titulo: (m) => console.log(`\n${m}\n${"─".repeat(Math.min(72, m.length))}`),
};

/** Termina con un mensaje de error y código 1 (o el que se pase). */
export function abortar(mensaje, codigo = 1) {
  // Acepta un Error: su `cause` (p. ej. el código de red de un fetch) es lo que
  // distingue «sin red» de «URL rota», y sin esto se perdía.
  const causa = mensaje && typeof mensaje === "object" && mensaje.cause ? ` (causa: ${mensaje.cause.code || mensaje.cause.message || mensaje.cause})` : "";
  log.error(((mensaje && mensaje.message) || String(mensaje)) + causa);
  process.exit(codigo);
}

/** Parseo mínimo de flags: `--a 1 --b --c=x` → { a: "1", b: true, c: "x" }, más `_` con los posicionales. */
export function flags(argv = process.argv.slice(2)) {
  const r = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const [k, v] = a.slice(2).split(/=(.*)/s);
      if (v !== undefined) r[k] = v;
      else if (argv[i + 1] !== undefined && !argv[i + 1].startsWith("--")) r[k] = argv[++i];
      else r[k] = true;
    } else r._.push(a);
  }
  return r;
}

/** NNN de proyecto: exactamente tres dígitos. Lanza con un mensaje claro si no. */
export function numeroProyecto(nnn) {
  if (!/^\d{3}$/.test(String(nnn ?? ""))) throw new Error(`el número de proyecto debe tener tres dígitos (p. ej. 004), no «${nnn}»`);
  return String(nnn);
}

/**
 * Lanza `npm` como hace npx(): con el npm-cli.js que acompaña a ESTE node y
 * process.execPath, sin depender de npm.cmd ni de una shell (en PowerShell con la
 * política Restricted, `npm` a secas resuelve a npm.ps1 y falla). Si no aparece
 * junto al node actual, cae a `npm` del PATH.
 *
 *   npm(["ci", "--no-audit", "--no-fund"], { cwd: desdeRaiz("remotion"), heredar: true })
 */
export function npm(args, opts = {}) {
  const dirNode = path.dirname(process.execPath);
  const candidatos = [
    path.join(dirNode, "node_modules", "npm", "bin", "npm-cli.js"), // Windows (msi y zip portable)
    path.join(dirNode, "..", "lib", "node_modules", "npm", "bin", "npm-cli.js"), // macOS/Linux (pkg, fnm, nvm)
  ];
  const cli = candidatos.find((p) => fs.existsSync(p));
  if (cli) return ejecutar(process.execPath, [cli, ...args], opts);
  return ejecutar(ES_WINDOWS ? "npm.cmd" : "npm", args, opts);
}

/**
 * sha256 (hex, minúsculas) de un archivo, leído en streaming para no cargar en
 * memoria descargas grandes (el modelo de whisper pesa 465 MB). Devuelve una promesa.
 */
export async function sha256DeArchivo(p) {
  const { createHash } = await import("node:crypto"); // import aquí para no tocar la cabecera del módulo
  return new Promise((resolver, rechazar) => {
    const hash = createHash("sha256");
    fs.createReadStream(p)
      .on("error", rechazar)
      .on("data", (trozo) => hash.update(trozo))
      .on("end", () => resolver(hash.digest("hex")));
  });
}
