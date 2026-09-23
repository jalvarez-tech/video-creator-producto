#!/usr/bin/env node
/**
 * generar-vo.mjs — construye la voz en off de un plan de noticia y devuelve el
 * cronometraje REAL, listo para pegar en noticia-NNN.ts.
 *
 * Uso:
 *   node manuales/video-noticias/scripts/generar-vo.mjs <guion.txt> [--motor say|sapi|elevenlabs|propio] [opciones]
 *
 *   --motor say          voz de sistema de macOS. Gratis, PISTA GUIA. (por defecto en macOS)
 *   --motor sapi         voz de sistema de Windows (System.Speech). Gratis, PISTA GUIA. (por defecto en Windows)
 *   --motor elevenlabs   TTS de verdad. Requiere ELEVENLABS_API_KEY y voice_id.
 *   --motor propio       ya tienes los audios grabados: los toma de --partes.
 *
 *   --voz X        say: nombre (Paulina) · sapi: nombre de la voz instalada · elevenlabs/propio: (ignorado)
 *   --ppm N        palabras por minuto (def. 178). say lo aplica tal cual; sapi lo
 *                  aproxima a su escala -10..10 (ver `rateSapi`).
 *   --pausa S      respiro entre tomas en segundos (def. 0.38)
 *   --fps N        fps de la composicion (def. 30)
 *   --partes DIR   carpeta con los audios ya locutados, ordenados por nombre.
 *                  Se usa siempre con --motor propio; con elevenlabs es la
 *                  carpeta que dejo `elevenlabs.py guion`.
 *   --voces        lista las voces de sistema de esta máquina y sale.
 *
 * Entrada: un archivo `id|texto` por linea (una linea por toma, en orden).
 *          Linea sin texto = toma en silencio (cierres, remates).
 *          Se lee IGUAL que `elevenlabs.py guion`: BOM y CR fuera, cada linea
 *          recortada, «#» tras recortar es comentario, se parte por el PRIMER
 *          «|» y se recortan las dos mitades. Asi partes y tomas nunca se
 *          desalinean por un espacio o un CRLF.
 *
 * Salida:  <dir>/vo/NNN-vo.wav — la pista completa, ya con los silencios de
 *          separacion, de forma que su duracion total ES la de la composicion.
 *          Y por stdout, la tabla de frames de cada toma.
 *
 * POR QUE ASI: en este formato la voz manda sobre el plan (SKILL §5.4). Escribir
 * los frames a ojo y luego encajar el audio produce cortes a mitad de palabra.
 * Aqui se hace al reves: se locuta, se MIDE, y el plan sale de la medicion. Por
 * eso cambiar de motor (o de locutor) no obliga a remaquetar: se vuelve a correr
 * esto y los frames se recalculan solos.
 *
 * Sustituye a generar-vo.sh. Mismos flags, mismos mensajes y los MISMOS frames
 * (el redondeo es el de Python, mitades al par, como el `round()` que usaba el
 * .sh). Lo que cambia esta declarado: el guion se parsea como elevenlabs.py,
 * `--fps 00` ya no pasa, un guion sin tomas avisa en vez de dejar a ffmpeg
 * fallar con la lista vacia, y los `._*` de AppleDouble no cuentan como audio.
 */
import fs from "node:fs";
import path from "node:path";
import {
  ES_MAC,
  ES_WINDOWS,
  binario,
  borrar,
  carpetaTemporal,
  ejecutar,
  esMain,
  leerTexto,
  log,
  posix,
} from "../../../herramientas/comun.mjs";

const USO = "Uso: node manuales/video-noticias/scripts/generar-vo.mjs <guion.txt> [--motor say|sapi|elevenlabs|propio] [--voz X] [--ppm N] [--pausa S] [--fps N] [--partes DIR]";
const AYUDA = `
  --motor say          voz de sistema de macOS. Gratis, PISTA GUIA. (por defecto en macOS)
  --motor sapi         voz de sistema de Windows (System.Speech). Gratis, PISTA GUIA. (por defecto en Windows)
  --motor elevenlabs   TTS de verdad: los MP3 que dejo \`elevenlabs.py guion\` en --partes.
  --motor propio       ya tienes los audios grabados: los toma de --partes.

  --voz X        say: nombre (Paulina) · sapi: nombre de la voz instalada · elevenlabs/propio: (ignorado)
  --ppm N        palabras por minuto (def. 178); sapi lo aproxima a su escala -10..10
  --pausa S      respiro entre tomas en segundos (def. 0.38)
  --fps N        fps de la composicion (def. 30)
  --partes DIR   carpeta con los audios ya locutados, ordenados por nombre
  --voces        lista las voces de sistema de esta maquina y sale

Entrada: un archivo id|texto por linea (una linea por toma, en orden); sin texto = toma en silencio (2 s).
Salida:  <dir del guion>/vo/<dir>-vo.wav y, por stdout, la tabla de frames de cada toma.`;
const MOTORES = ["say", "sapi", "elevenlabs", "propio"];
const EXTENSIONES = new Set([".mp3", ".wav", ".m4a", ".aiff"]);

/**
 * PowerShell que locuta con System.Speech (SAPI). Va embebido y se escribe en
 * el temporal en cada ejecucion para que este script sea UN archivo. Solo ASCII:
 * PowerShell 5.1 lee un .ps1 sin BOM como ANSI, y asi no hay nada que se pueda
 * leer mal. El texto llega por archivo UTF-8, nunca por la linea de comandos.
 */
const SAPI_PS1 = `param([string]$Texto = "", [string]$Salida = "", [string]$Voz = "", [int]$Rate = 0, [switch]$Voces)
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
if ($Voces) {
  foreach ($v in $s.GetInstalledVoices()) {
    $i = $v.VoiceInfo
    Write-Output ("{0}    {1}    {2}" -f $i.Name, $i.Culture.Name, $i.Gender)
  }
  $s.Dispose()
  exit 0
}
if ($Voz -ne "") {
  $s.SelectVoice($Voz)
} else {
  $todas = $s.GetInstalledVoices() | Where-Object { $_.Enabled } | ForEach-Object { $_.VoiceInfo }
  $elegida = $todas | Where-Object { $_.Culture.Name -eq "es-MX" } | Select-Object -First 1
  if (-not $elegida) { $elegida = $todas | Where-Object { $_.Culture.Name -like "es-*" } | Select-Object -First 1 }
  if ($elegida) { $s.SelectVoice($elegida.Name) }
}
$s.Rate = [Math]::Max(-10, [Math]::Min(10, $Rate))
$t = [System.IO.File]::ReadAllText($Texto, [System.Text.Encoding]::UTF8)
$s.SetOutputToWaveFile($Salida)
$s.Speak($t)
$s.SetOutputToNull()
$s.Dispose()
`;

/* ── Utilidades ─────────────────────────────────────────────────────────── */

/** `round()` de Python: las mitades exactas van al par. `Math.round` las sube. */
export function redondeoPython(x) {
  const suelo = Math.floor(x);
  const resto = x - suelo;
  if (resto > 0.5) return suelo + 1;
  if (resto < 0.5) return suelo;
  return suelo % 2 === 0 ? suelo : suelo + 1;
}

/**
 * Rate de SAPI (-10..10, escala logaritmica: -10 es un tercio, 10 el triple)
 * a partir de palabras por minuto, tomando ~160 ppm como el 0 de la voz.
 * Es una aproximacion: cada voz de Windows tiene su propio tempo base.
 */
export function rateSapi(ppm) {
  const n = Number(ppm);
  if (!Number.isFinite(n) || n <= 0) return 0;
  const r = Math.round((10 * Math.log(n / 160)) / Math.log(3));
  return Math.max(-10, Math.min(10, r));
}

/** `hijo` es `padre` o esta dentro de el. En Windows, sin distinguir mayusculas. */
function dentroDe(hijo, padre) {
  let a = path.resolve(hijo);
  let b = path.resolve(padre);
  if (ES_WINDOWS) {
    a = a.toLowerCase();
    b = b.toLowerCase();
  }
  const rel = path.relative(b, a);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

/**
 * Audios de --partes en ORDEN DE BYTES de su ruta (lo que hacia `LC_ALL=C sort`),
 * recorriendo subcarpetas y contando solo archivos regulares. `elevenlabs.py
 * guion` los numera 001-, 002-… justamente para que ese orden sea el del guion.
 */
export function listarAudios(dir) {
  const encontrados = [];
  const recorrer = (carpeta) => {
    for (const d of fs.readdirSync(carpeta, { withFileTypes: true })) {
      const p = path.join(carpeta, d.name);
      if (d.isDirectory()) recorrer(p);
      else if (d.isFile() && EXTENSIONES.has(path.extname(d.name)) && !d.name.startsWith("._")) encontrados.push(p);
    }
  };
  recorrer(dir);
  return encontrados
    .map((p) => ({ p, clave: Buffer.from(posix(path.relative(dir, p)), "utf8") }))
    .sort((x, y) => Buffer.compare(x.clave, y.clave))
    .map((x) => x.p);
}

/** Lee el guion como `elevenlabs.py lee_guion`: [{ id, texto }] por toma. */
export function leerGuion(ruta) {
  const tomas = [];
  for (let raw of leerTexto(ruta).split("\n")) {
    raw = raw.trim();
    if (!raw || raw.startsWith("#")) continue;
    const i = raw.indexOf("|");
    const id = (i < 0 ? raw : raw.slice(0, i)).trim();
    const texto = (i < 0 ? "" : raw.slice(i + 1)).trim();
    tomas.push({ id, texto });
  }
  return tomas;
}

/** Entrada de la lista del demuxer concat: ruta con «/» y la comilla simple escapada. */
function lineaConcat(p) {
  return `file '${posix(path.resolve(p)).replace(/'/g, "'\\''")}'`;
}

/** Duracion en segundos de un audio, o aborta con el codigo de ffprobe. */
function segundos(archivo) {
  const r = ejecutar("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", archivo]);
  if (r.status !== 0) fallo("ffprobe", r);
  return parseFloat(r.stdout.trim());
}

/** Un hijo fallo: su stderr y su codigo, como habria hecho `set -e` pero con contexto. */
function fallo(quien, r) {
  console.error(`✖ ${quien} falló (código ${r.status})`);
  const detalle = (r.stderr || r.stdout).trim();
  if (detalle) console.error(detalle.slice(-2000));
  process.exit(r.status || 1);
}

function ffmpeg(args) {
  const r = ejecutar("ffmpeg", ["-nostdin", "-v", "error", ...args]);
  if (r.status !== 0) fallo("ffmpeg", r);
}

function error(...lineas) {
  for (const l of lineas) console.error(l);
  process.exit(1);
}

/* ── Argumentos: los mismos del .sh, y ademas `--flag=valor` y --help ───── */

function parsear(argv) {
  const o = { guion: "", motor: ES_WINDOWS ? "sapi" : "say", voz: "", ppm: "178", pausa: "0.38", fps: "30", partes: "", voces: false, help: false };
  const conValor = { "--motor": "motor", "--voz": "voz", "--ppm": "ppm", "--pausa": "pausa", "--fps": "fps", "--partes": "partes" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") o.help = true;
    else if (a === "--voces") o.voces = true;
    else if (a.startsWith("--") && a.includes("=")) {
      const [k, v] = [a.slice(0, a.indexOf("=")), a.slice(a.indexOf("=") + 1)];
      if (!(k in conValor)) error(`Opcion desconocida: ${a}`);
      o[conValor[k]] = v;
    } else if (a in conValor) {
      if (argv[i + 1] === undefined) error(`${a} necesita un valor`, USO);
      o[conValor[a]] = argv[++i];
    } else if (a.startsWith("-")) error(`Opcion desconocida: ${a}`);
    else o.guion = a; // si hay varios posicionales, gana el ultimo (como el .sh)
  }
  return o;
}

/* ── Motores de voz de sistema ──────────────────────────────────────────── */

/**
 * ¿Tiene `say` esta voz? macOS NO falla con una voz que no existe: locuta con la
 * del sistema y sale con 0. Para quien no tenga Paulina descargada eso es una
 * pista guia en otro idioma sin ningun aviso, asi que se mira la lista antes.
 * Devuelve null si no se pudo consultar (entonces no se avisa de nada).
 */
function tieneVozSay(voz) {
  const r = ejecutar("say", ["-v", "?"]);
  if (r.status !== 0) return null;
  const nombres = r.stdout
    .split(/\r?\n/)
    .map((l) => /^(.*?)\s+[a-z]{2,3}_[A-Za-z0-9]{2,}\s+#/.exec(l)?.[1]?.trim())
    .filter(Boolean);
  if (nombres.length === 0) return null;
  return nombres.some((n) => n.toLowerCase() === voz.toLowerCase());
}

/** `say` de macOS. El texto va por archivo (-f): uno que empiece por «-» no es una opcion. */
function locutarSay(tmp, texto, voz, ppm) {
  const txt = path.join(tmp, "texto.txt");
  const out = path.join(tmp, "raw.aiff");
  fs.writeFileSync(txt, texto + "\n", "utf8");
  const r = ejecutar("say", ["-v", voz, "-r", ppm, "-o", out, "-f", txt]);
  if (r.status !== 0) {
    console.error("   Voces disponibles: node manuales/video-noticias/scripts/generar-vo.mjs --voces");
    fallo("say", r);
  }
  return out;
}

function powershell() {
  return binario("powershell") || binario("pwsh");
}

/** SAPI de Windows via PowerShell. Devuelve el WAV crudo. */
function locutarSapi(tmp, texto, voz, ppm) {
  const ps = powershell();
  if (!ps) error("✖ No encuentro powershell ni pwsh: el motor sapi los necesita.");
  const ps1 = path.join(tmp, "sapi.ps1");
  const txt = path.join(tmp, "texto.txt");
  const out = path.join(tmp, "raw.wav");
  fs.writeFileSync(ps1, SAPI_PS1, "ascii");
  fs.writeFileSync(txt, texto, "utf8");
  const args = ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", ps1, "-Texto", txt, "-Salida", out, "-Rate", String(rateSapi(ppm))];
  if (voz) args.push("-Voz", voz);
  const r = ejecutar(ps, args);
  if (r.status !== 0 || !fs.existsSync(out)) {
    console.error("   Voces disponibles: node manuales/video-noticias/scripts/generar-vo.mjs --voces");
    fallo("sapi (PowerShell System.Speech)", { ...r, status: r.status || 1 });
  }
  return out;
}

/** `--voces`: las voces de sistema de esta maquina. */
function listarVoces() {
  if (ES_MAC) {
    const r = ejecutar("say", ["-v", "?"], { heredar: true });
    process.exit(r.status);
  }
  if (ES_WINDOWS) {
    const ps = powershell();
    if (!ps) error("✖ No encuentro powershell ni pwsh.");
    const tmp = carpetaTemporal("generar-vo-");
    const ps1 = path.join(tmp, "sapi.ps1");
    fs.writeFileSync(ps1, SAPI_PS1, "ascii");
    const r = ejecutar(ps, ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", ps1, "-Voces"], { heredar: true });
    borrar(tmp);
    process.exit(r.status);
  }
  error("✖ En Linux no hay voz de sistema: usa --motor elevenlabs o --motor propio.");
}

/** Las voces SAPI de esta maquina como {nombre, cultura, genero}, o [] si no se pueden leer. */
function vocesSapi() {
  const ps = powershell();
  if (!ps) return [];
  const tmp = carpetaTemporal("generar-vo-");
  const ps1 = path.join(tmp, "sapi.ps1");
  fs.writeFileSync(ps1, SAPI_PS1, "ascii");
  const r = ejecutar(ps, ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", ps1, "-Voces"]);
  borrar(tmp);
  return r.stdout
    .split(/\r?\n/)
    .map((l) => l.trim().split(/\s{2,}/))
    .filter((partes) => partes.length >= 2)
    .map(([nombre, cultura, genero]) => ({ nombre, cultura, genero }));
}

/* ── Principal ──────────────────────────────────────────────────────────── */

function main() {
  const o = parsear(process.argv.slice(2));
  if (o.help) {
    console.log(USO + AYUDA);
    return;
  }
  if (o.voces) listarVoces();

  if (!o.guion) error("Falta el guion: proyectos/NNN/guion-vo.txt");

  // Motor y voz por defecto.
  switch (o.motor) {
    case "say":
      if (!ES_MAC) error("✖ El motor «say» es la voz de sistema de macOS.", ES_WINDOWS ? "  En Windows usa --motor sapi (voz de sistema) o --motor elevenlabs / propio." : "  Usa --motor elevenlabs o --motor propio.");
      if (!o.voz) o.voz = "Paulina"; // es_MX: mas natural para audiencia latinoamericana
      break;
    case "sapi":
      if (!ES_WINDOWS) error("✖ El motor «sapi» es la voz de sistema de Windows.", ES_MAC ? "  En macOS usa --motor say." : "  Usa --motor elevenlabs o --motor propio.");
      break;
    case "elevenlabs":
      if (!o.partes) error("Con --motor elevenlabs pasa --partes <dir con los MP3 de elevenlabs.py guion>");
      break;
    case "propio":
      if (!o.partes) error("Con --motor propio pasa --partes <dir con tus audios>");
      break;
    default:
      error(`Motor desconocido: ${o.motor} (${MOTORES.join(" | ")})`);
  }

  // El guion y los numeros se validan ANTES de tocar el disco: mas abajo hay un
  // borrado del temporal, y no se borra nada por una llamada mal escrita.
  if (!fs.existsSync(o.guion) || !fs.statSync(o.guion).isFile()) error(`✖ No existe el guion: ${posix(o.guion)}`);
  if (!/^\d+$/.test(o.fps)) error(`✖ --fps inválido: «${o.fps}». Tiene que ser un entero > 0 (p. ej. 30).`);
  const fps = Number(o.fps);
  if (fps === 0) error("✖ --fps no puede ser 0.");
  if (!/^\d+(\.\d+)?$/.test(o.pausa)) error(`✖ --pausa inválida: «${o.pausa}». Segundos, p. ej. 0.38.`);

  const dir = path.dirname(path.resolve(o.guion));
  const out = path.join(dir, "vo");
  const tmp = path.join(out, ".partes");

  // $tmp se borra entero al empezar. Si --partes apunta ahi (o dentro, o lo
  // CONTIENE), estariamos borrando el audio que vamos a consumir — y con
  // elevenlabs eso es audio YA PAGADO. Se compara con las rutas resueltas.
  let partes = "";
  if (o.partes) {
    if (!fs.existsSync(o.partes) || !fs.statSync(o.partes).isDirectory()) error(`✖ No existe la carpeta de --partes: ${posix(o.partes)}`);
    partes = path.resolve(o.partes);
    if (dentroDe(partes, tmp)) {
      error(`✖ --partes no puede ser «${posix(tmp)}»: es el temporal de este script y se borra al empezar.`, `  Usa otra carpeta (el SKILL documenta ${posix(out)}/partes).`);
    }
    if (dentroDe(tmp, partes)) {
      error(`✖ --partes «${posix(partes)}» contiene el temporal «${posix(tmp)}», que este script borra al empezar.`, `  Pasa la carpeta de los audios en si (p. ej. ${posix(out)}/partes), no la que la contiene.`);
    }
  }

  const tomas = leerGuion(o.guion);
  if (tomas.length === 0) error(`✖ El guion no tiene ninguna toma: ${posix(o.guion)}`, "  Una linea por toma: id|texto (una linea id| sin texto es una toma en silencio).");

  borrar(tmp);
  fs.mkdirSync(tmp, { recursive: true });

  const base = path.basename(dir);
  const final = path.join(out, `${base}-vo.wav`);
  const sistema = o.motor === "say" || o.motor === "sapi";

  if (sistema) {
    console.log(`🎙  motor=${o.motor} voz=${o.voz || "(la de es-MX, o la del sistema)"} · ${o.ppm} ppm · pausa ${o.pausa}s · ${o.fps} fps`);
    console.log("    (PISTA GUIA: voz de sistema. Para publicar usa --motor elevenlabs o propio)");
    // Un Windows sin voz en espanol locuta igual, en ingles y sin quejarse: se
    // avisa antes (visto en un Windows real, que solo traia David y Zira en-US).
    if (o.motor === "sapi" && !o.voz && !vocesSapi().some((v) => /^es-/i.test(v.cultura || ""))) {
      log.aviso("no hay ninguna voz en espanol (es-*) instalada: Windows locutara con su voz por defecto, en otro idioma.");
      console.log("    Anade una en Configuracion → Hora e idioma → Voz → Agregar voces (p. ej. Microsoft Sabina, es-MX), o elige otra con --voz (lista: --voces).");
    }
    if (o.motor === "say" && tieneVozSay(o.voz) === false) {
      log.aviso(`la voz «${o.voz}» no esta entre las de say: macOS locutara con la voz por defecto del sistema.`);
      console.log("    Descargala en Ajustes del Sistema → Accesibilidad → Contenido hablado, o elige otra con --voz (lista: --voces).");
    }
  } else {
    console.log(`🎙  motor=${o.motor} · partes=${posix(partes)} · pausa ${o.pausa}s · ${o.fps} fps`);
  }
  console.log("");

  let ya = [];
  if (partes) {
    ya = listarAudios(partes);
    if (ya.length === 0) error(`✖ No hay audios (.mp3/.wav/.m4a/.aiff) en ${posix(partes)}`);
  }

  const lista = [];
  let frame = 0;
  let n = 0;
  let usados = 0;
  console.log(`${"toma".padEnd(22)} ${"inicio".padStart(8)} ${"fin".padStart(8)}   (frames)`);
  console.log("-".repeat(62));

  for (const { id, texto } of tomas) {
    n += 1;
    const parte = path.join(tmp, `${String(n).padStart(3, "0")}.wav`);

    if (texto === "") {
      // Toma sin voz: 2 s de silencio (los cierres respiran, no se atropellan).
      ffmpeg(["-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono", "-t", "2.0", "-c:a", "pcm_s16le", parte, "-y"]);
    } else {
      let src;
      if (o.motor === "say") src = locutarSay(tmp, texto, o.voz, o.ppm);
      else if (o.motor === "sapi") src = locutarSapi(tmp, texto, o.voz, o.ppm);
      else {
        src = ya[usados];
        if (!src) error(`✖ Falta el audio de la toma ${n} (${id}) en ${posix(partes)}`);
        usados += 1;
      }
      const voz = path.join(tmp, "voz.wav");
      // Mono 44.1k: lo que espera Remotion, y evita sorpresas de canal al mezclar.
      ffmpeg(["-i", src, "-ac", "1", "-ar", "44100", "-c:a", "pcm_s16le", voz, "-y"]);
      // Cola de silencio = el respiro. La toma dura voz + pausa.
      ffmpeg(["-i", voz, "-af", `apad=pad_dur=${o.pausa}`, "-c:a", "pcm_s16le", parte, "-y"]);
      if (sistema) borrar(src);
      borrar(voz);
    }

    const frames = Math.max(1, redondeoPython(segundos(parte) * fps));
    const ini = frame;
    frame += frames;
    console.log(`${id.padEnd(22)} ${String(ini).padStart(8)} ${String(frame).padStart(8)}   [${ini}, ${frame}]`);
    lista.push(lineaConcat(parte));
  }

  // Un audio de mas en --partes significa que el guion y la carpeta no cuentan la
  // misma historia: casi siempre, una toma que se locuto y aqui no se monto.
  if (partes && !sistema && usados !== ya.length) {
    console.error("");
    console.error(`⚠  ${usados} audios usados de ${ya.length} que hay en ${posix(partes)}.`);
    console.error(`   Sobran ${ya.length - usados}: revisa que el guion y la carpeta tengan las mismas tomas.`);
  }

  const listaTxt = path.join(tmp, "lista.txt");
  fs.writeFileSync(listaTxt, lista.join("\n") + "\n", "utf8");
  ffmpeg(["-f", "concat", "-safe", "0", "-i", listaTxt, "-c:a", "pcm_s16le", final, "-y"]);
  const total = segundos(final);

  console.log("");
  console.log(`✅ ${posix(final)}`);
  console.log(`   ${total.toFixed(2)} s · ${redondeoPython(total * fps)} f @ ${o.fps} fps · ${n} tomas`);
  console.log("");
  console.log("   Copia la tabla de arriba a noticia-NNN.ts y pon");
  console.log(`   durationInFrames = ${frame} en la Composition.`);
  console.log("");
  console.log(`   Revisa que ninguna toma pase de ${fps * 6} f (6 s): es el techo del formato.`);
  console.log("   Valida con: node manuales/video-noticias/scripts/revisar-plan.mjs <plan.ts>");
}

if (esMain(import.meta.url)) main();
