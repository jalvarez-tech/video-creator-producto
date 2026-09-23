#!/usr/bin/env node
/**
 * transcribir.mjs — transcribe un vídeo/audio a JSON con tiempos usando whisper.cpp.
 *
 * Uso:
 *   node manuales/edicion-video/scripts/transcribir.mjs <entrada> [salida.json] [idioma] [modelo.bin]
 * Ejemplo:
 *   node manuales/edicion-video/scripts/transcribir.mjs proyectos/001/original.mp4 proyectos/001/transcripcion.json es
 *
 * Requisitos: `whisper-cli` (lo instala `node herramientas/setup.mjs --whisper`)
 * y el modelo en archivos/whisper/ggml-small.bin (mismo instalador).
 *
 * Sustituye a transcribir.sh con dos arreglos que el .sh no tenía:
 *   · Crea la carpeta de salida antes de llamar a whisper-cli. Si no existía,
 *     whisper-cli no escribía nada PERO salía con 0, y el .sh daba por hecha
 *     la transcripción.
 *   · Comprueba que el JSON existe antes de darla por lista y, si un hijo falla,
 *     enseña su stderr en vez de morir en silencio con su código.
 *
 * El idioma se pasa a `-l` de whisper («auto» también vale). No se toca LANG:
 * es la variable de locale de la shell y pisarla afecta a todo lo que herede el
 * entorno.
 */
import fs from "node:fs";
import path from "node:path";
import {
  ES_WINDOWS,
  RAIZ,
  binario,
  borrar,
  carpetaTemporal,
  dirBinUsuario,
  ejecutar,
  esMain,
  flags,
  posix,
} from "../../../herramientas/comun.mjs";

const USO = "Uso: node manuales/edicion-video/scripts/transcribir.mjs <entrada> [salida.json] [idioma] [modelo.bin]";

/** Dónde conseguir whisper-cli en esta plataforma. */
function pistaWhisper() {
  const carpeta = posix(dirBinUsuario());
  const origen = ES_WINDOWS
    ? "el zip de releases de whisper.cpp (whisper-cli.exe)"
    : "el paquete whisper-cpp de tu gestor de paquetes";
  return `Instálalo con: node herramientas/setup.mjs --whisper\n   (o deja ${origen} en ${carpeta})`;
}

/** ¿Archivo regular? Un directorio o una ruta rota no valen como entrada. */
function esArchivo(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function main() {
  const args = flags();
  if (args.help) {
    console.log(`${USO}\n\n  salida.json  por defecto transcripcion.json (relativo a donde estés)\n  idioma       por defecto es («auto» deja que whisper lo detecte)\n  modelo.bin   por defecto archivos/whisper/ggml-small.bin`);
    return;
  }
  const [entrada, salida = "transcripcion.json", idioma = "es", modeloArg] = args._;
  if (!entrada) {
    console.error(USO);
    process.exit(1);
  }
  const modelo = modeloArg ? path.resolve(modeloArg) : path.join(RAIZ, "archivos", "whisper", "ggml-small.bin");

  // Mismo orden de comprobaciones que el .sh, y a stdout como él.
  const whisper = binario("whisper-cli");
  if (!whisper) {
    console.log(`❌ whisper-cli no está. ${pistaWhisper()}`);
    process.exit(1);
  }
  if (!binario("ffmpeg")) {
    console.log("❌ ffmpeg no está. Instálalo con: node herramientas/setup.mjs");
    process.exit(1);
  }
  if (!esArchivo(entrada)) {
    console.log(`❌ No existe la entrada: ${posix(entrada)}`);
    process.exit(1);
  }
  if (!esArchivo(modelo)) {
    console.log(`❌ No existe el modelo: ${posix(modelo)}\n   Descárgalo con: node herramientas/setup.mjs --whisper`);
    process.exit(1);
  }

  // whisper-cli añade «.json» él mismo: se le pasa la ruta SIN ese sufijo.
  // Solo se quita el sufijo exacto en minúsculas, como hacía `${OUT%.json}`.
  const sinSufijo = salida.endsWith(".json") ? salida.slice(0, -".json".length) : salida;
  const base = path.resolve(sinSufijo);
  const json = `${base}.json`;

  const tmp = carpetaTemporal("transcribir-");
  const wav = path.join(tmp, "audio.wav");
  try {
    console.log("🎧 Preparando audio 16 kHz mono…");
    const a = ejecutar("ffmpeg", ["-nostdin", "-v", "error", "-y", "-i", entrada, "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", wav]);
    if (a.status !== 0) {
      console.error(`❌ ffmpeg no pudo extraer el audio de ${posix(entrada)} (código ${a.status})\n${a.stderr.trim()}`);
      process.exit(a.status || 1);
    }

    // La carpeta de salida se crea AQUÍ: whisper-cli no la crea y no avisa.
    fs.mkdirSync(path.dirname(base), { recursive: true });

    console.log(`📝 Transcribiendo (${idioma}) con ${path.basename(modelo)}…`);
    // -oj = JSON con segmentos y tiempos. (usa -ojf para tiempos por palabra / karaoke)
    const w = ejecutar(whisper, ["-m", modelo, "-f", wav, "-l", idioma, "-oj", "-of", base]);
    if (w.status !== 0) {
      console.error(`❌ whisper-cli falló (código ${w.status})\n${(w.stderr || w.stdout).trim().slice(-2000)}`);
      process.exit(w.status || 1);
    }
    if (!esArchivo(json)) {
      console.error(`❌ whisper-cli terminó sin escribir ${posix(json)}\n${(w.stderr || w.stdout).trim().slice(-2000)}`);
      process.exit(1);
    }
  } finally {
    borrar(tmp);
  }

  console.log(`✅ Transcripción lista: ${posix(sinSufijo)}.json`);
}

if (esMain(import.meta.url)) main();
