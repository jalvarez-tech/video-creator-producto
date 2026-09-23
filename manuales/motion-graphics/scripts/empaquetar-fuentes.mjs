#!/usr/bin/env node
/**
 * empaquetar-fuentes.mjs — convierte los OTF de remotion/public/fuentes/inter/ en
 * un módulo de datos (base64) para que el motor registre Inter SIN pedirla por
 * red.
 *
 *   node manuales/motion-graphics/scripts/empaquetar-fuentes.mjs           # escribe el módulo
 *   node manuales/motion-graphics/scripts/empaquetar-fuentes.mjs --check   # sale 1 si está desfasado
 *
 * POR QUÉ DATOS Y NO `staticFile()`. Con la fuente servida por el servidor de
 * archivos de Remotion, un render con muchas pestañas y muchos `<OffthreadVideo>`
 * de clips grandes deja las nueve peticiones de la fuente detrás de cientos de
 * peticiones de vídeo, y el `delayRender` de la fuente muere por timeout aunque
 * el render fuera a salir (medido: dos montajes de dos minutos con la fuente por
 * red fallaban; los mismos con la fuente en el bundle, no). Con los bytes dentro
 * del bundle no hay petición que esperar: `FontFace` recibe el ArrayBuffer.
 *
 * Los OTF siguen en remotion/public/fuentes/inter/ (los usan generar-avances.mjs
 * y medir-anchos.mjs para medir, y ahí va la licencia OFL). Este módulo se
 * versiona: es grande (~3,2 MB) pero determinista, y así un clon no necesita
 * ejecutar nada para tener la tipografía.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { RAIZ, esMain, flags, log, relativa } from "../../../herramientas/comun.mjs";

const ORIGEN = path.join(RAIZ, "remotion", "public", "fuentes", "inter");
const DESTINO = path.join(RAIZ, "remotion", "src", "motor", "fuentes-inter.datos.ts");

/** Los nueve cortes de Inter 3.019 y el peso CSS que declara cada OTF. */
const CORTES = [
  ["Thin", 100],
  ["ExtraLight", 200],
  ["Light", 300],
  ["Regular", 400],
  ["Medium", 500],
  ["SemiBold", 600],
  ["Bold", 700],
  ["ExtraBold", 800],
  ["Black", 900],
];

export function generar() {
  const lineas = [
    "// GENERADO por manuales/motion-graphics/scripts/empaquetar-fuentes.mjs: NO EDITAR A MANO.",
    "// Los nueve OTF de Inter 3.019 (remotion/public/fuentes/inter/, licencia SIL OFL 1.1,",
    "// ver OFL.txt ahí) en base64, para que motor/fuentes.ts registre la familia sin",
    "// pedir nada por red. Regenerar: node manuales/motion-graphics/scripts/empaquetar-fuentes.mjs",
    "",
    "/** Peso CSS → OTF en base64 (sha256 del archivo original en el comentario). */",
    "export const INTER_OTF: Record<number, string> = {",
  ];
  for (const [nombre, peso] of CORTES) {
    const archivo = path.join(ORIGEN, `Inter-${nombre}.otf`);
    const bytes = fs.readFileSync(archivo);
    const sha = crypto.createHash("sha256").update(bytes).digest("hex");
    lineas.push(`  // Inter-${nombre}.otf · ${bytes.length} bytes · sha256 ${sha}`);
    lineas.push(`  ${peso}: "${bytes.toString("base64")}",`);
  }
  lineas.push("};", "");
  return lineas.join("\n");
}

if (esMain(import.meta.url)) {
  const f = flags();
  const nuevo = generar();
  const actual = fs.existsSync(DESTINO) ? fs.readFileSync(DESTINO, "utf8") : null;
  if (f.check) {
    if (actual === nuevo) {
      log.ok(`${relativa(DESTINO)} AL DÍA con los OTF de ${relativa(ORIGEN)}`);
      process.exit(0);
    }
    log.error(`${relativa(DESTINO)} DESFASADO: regenera con node manuales/motion-graphics/scripts/empaquetar-fuentes.mjs`);
    process.exit(1);
  }
  if (actual === nuevo) log.info(`${relativa(DESTINO)} ya estaba al día`);
  else {
    fs.writeFileSync(DESTINO, nuevo);
    log.ok(`${relativa(DESTINO)} escrito (${(nuevo.length / 1024 / 1024).toFixed(2)} MB)`);
  }
}
