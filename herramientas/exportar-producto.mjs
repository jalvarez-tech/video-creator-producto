#!/usr/bin/env node
/**
 * exportar-producto.mjs — genera el PRODUCTO (lo que se comparte) a partir del
 * ESTUDIO (este repo, con todo lo privado dentro), sin mover nada de sitio.
 *
 *   node herramientas/exportar-producto.mjs                       # → ../video-creator-producto
 *   node herramientas/exportar-producto.mjs --destino /ruta        # otra carpeta
 *   node herramientas/exportar-producto.mjs --commit "mensaje"     # además, commit en el producto
 *   node herramientas/exportar-producto.mjs --autor "Nombre <correo>"
 *
 * QUIÉN FIRMA: el commit se hace con --autor o, si no se da, con la identidad
 * efectiva del destino (la global de la máquina). En los dos casos se comprueba
 * ANTES que ni el nombre ni el correo lleven una cadena prohibida: el guard lee
 * archivos, no metadatos de git, y un correo de empresa en el primer commit se
 * queda en el historial público para siempre.
 *
 * QUÉ COPIA: todo archivo del estudio que git conoce (trackeado o nuevo y no
 * ignorado) y que NO cae en una zona de estudio (herramientas/zonas.mjs). El
 * destino queda con EXACTAMENTE ese conjunto: lo que ya no está en la lista se
 * borra del destino (salvo .git, node_modules y lo que el propio producto genera
 * al instalarse: enlaces de skills, .env, SFX copiados, out/, .remotion/).
 *
 * QUÉ COMPRUEBA después de copiar: que el destino no arrastra ni una ruta de
 * estudio ni una cadena prohibida (herramientas/revisar-producto.mjs, ejecutado
 * DENTRO del destino). Si falla, lo dice y sale con 1 — y el commit no se hace.
 *
 * POR QUÉ ASÍ y no «un repo dentro de otro» o «ignorar el estudio en el mismo
 * repo»: un checkout que deja de rastrear carpetas las borra del disco al cambiar
 * de historial, y un .gitignore compartido obliga a `git add -f` para siempre.
 * Copiar por lista blanca es aburrido y por eso es seguro: el estudio no cambia
 * de forma y el producto es un espejo filtrado que se puede regenerar siempre.
 */
import fs from "node:fs";
import path from "node:path";
import { RAIZ, ejecutar, flags, log, abortar, esMain, posix, borrar } from "./comun.mjs";
import { esEstudio, ZONAS_ESTUDIO, PERMITIDO_EN_ZONA, cadenasEn } from "./zonas.mjs";

/** Lo que vive en el destino y NO viene del estudio: no se borra al sincronizar. */
const INTOCABLE_EN_DESTINO = [
  ".git/",
  "node_modules/",
  "remotion/node_modules/",
  "remotion/out/",
  "remotion/.remotion/",
  ".remotion/",
  ".claude/skills/",
  ".agents/",
  ".env",
  "remotion/public/sfx/",
  "remotion/public/avatar.mp4",
  "proyectos/",
  "remotion/src/proyectos/",
  "remotion/src/marcas/",
  "archivos/whisper/",
  ".herramientas/",
];

/** Zonas de CONTENIDO que el producto ignora (las de agentes ya van en la sección 4 del .gitignore). */
const ZONAS_GITIGNORE = ["sonido/", "proyectos/", "remotion/src/proyectos/", "remotion/src/marcas/", "remotion/public/", "archivos/"];

/**
 * Las reglas de .gitignore del producto para las zonas del estudio, derivadas de
 * zonas.mjs: cada zona entera menos lo permitido, destapando carpeta a carpeta.
 * Lo que devuelve para remotion/public/, por ejemplo:
 *   remotion/public/*  ·  !remotion/public/fuentes/  ·  !remotion/public/demo/
 *   !remotion/public/sfx/  ·  remotion/public/sfx/*  ·  !remotion/public/sfx/README.md
 */
export function reglasZonasGitignore() {
  const lineas = [];
  const pon = (l) => { if (!lineas.includes(l)) lineas.push(l); };
  for (const zona of ZONAS_GITIGNORE) {
    if (!ZONAS_ESTUDIO.includes(zona)) throw new Error(`zona ${zona} no está en zonas.mjs`);
    pon(zona + "*");
    for (const p of PERMITIDO_EN_ZONA.filter((x) => x.startsWith(zona))) {
      const partes = p.slice(zona.length).split("/").filter(Boolean);
      let acc = zona;
      for (let i = 0; i < partes.length - 1; i++) {
        acc += partes[i] + "/";
        pon("!" + acc);
        pon(acc + "*");
      }
      pon("!" + p);
    }
  }
  pon("ESTUDIO.md");
  pon("**/ESTUDIO*.md");
  return lineas;
}

const MARCA_INI = "# >>> SOLO ESTUDIO >>>";
const MARCA_FIN = "# <<< SOLO ESTUDIO <<<";

/** El .gitignore del producto: el del estudio con el bloque SOLO ESTUDIO sustituido por las zonas. */
export function gitignoreProducto(textoEstudio) {
  const a = textoEstudio.indexOf(MARCA_INI);
  const b = textoEstudio.indexOf(MARCA_FIN);
  if (a < 0 || b < 0 || b < a) throw new Error(`.gitignore sin las marcas ${MARCA_INI} / ${MARCA_FIN}`);
  const bloque = [
    "# >>> ZONAS DEL ESTUDIO (generado por herramientas/exportar-producto.mjs desde zonas.mjs) >>>",
    "# Aquí viven TUS proyectos, marcas, banco de sonido y medios. El producto no los",
    "# versiona: son tuyos. Si quieres versionarlos, hazlo en un repo aparte o quita",
    "# estas reglas en tu copia (y no las mandes al producto).",
    ...reglasZonasGitignore(),
    "# <<< ZONAS DEL ESTUDIO <<<",
  ].join("\n");
  return textoEstudio.slice(0, a) + bloque + textoEstudio.slice(b + MARCA_FIN.length);
}

function archivosDelEstudio() {
  const r = ejecutar("git", ["-C", RAIZ, "ls-files", "-z", "--cached", "--others", "--exclude-standard"], { check: true });
  const todos = r.stdout.split("\0").filter(Boolean).map(posix);
  const unicos = [...new Set(todos)].sort();
  return unicos.filter((f) => fs.existsSync(path.join(RAIZ, f)) && !esEstudio(f));
}

function intocable(rel) {
  return INTOCABLE_EN_DESTINO.some((p) => (p.endsWith("/") ? rel.startsWith(p) : rel === p));
}

function listaDestino(destino) {
  const out = [];
  const anda = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, e.name);
      const rel = posix(path.relative(destino, abs));
      if (intocable(rel) || intocable(rel + "/")) continue;
      if (e.isDirectory()) anda(abs);
      else out.push(rel);
    }
  };
  if (fs.existsSync(destino)) anda(destino);
  return out;
}

function copiar(rel, destino) {
  const src = path.join(RAIZ, rel);
  const dst = path.join(destino, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  const st = fs.lstatSync(src);
  if (st.isSymbolicLink()) {
    // Un symlink del estudio se copia como lo que apunta (el producto no lleva enlaces).
    fs.cpSync(fs.realpathSync(src), dst, { recursive: true, force: true });
    return;
  }
  if (fs.existsSync(dst)) {
    const a = fs.readFileSync(src);
    const b = fs.readFileSync(dst);
    if (a.equals(b)) return false;
  }
  fs.copyFileSync(src, dst);
  fs.chmodSync(dst, st.mode & 0o777);
  return true;
}

/**
 * Con qué nombre y correo se va a firmar el commit del producto, ya comprobados.
 * Por qué se mira: revisar-producto.mjs lee el CONTENIDO de los archivos, no los
 * metadatos de git, y sin --autor el primer commit hereda el user.email global
 * de la máquina (un correo de empresa, por ejemplo), que en un repo público se
 * queda en el historial para siempre. Aborta si alguno lleva una cadena
 * prohibida de zonas.mjs.
 */
function identidadDelCommit(dst, autor) {
  let nombre;
  let correo;
  if (autor) {
    const m = /^(.+?)\s*<([^>]+)>$/.exec(autor);
    if (!m) abortar('--autor debe ser "Nombre <correo>"');
    [, nombre, correo] = m;
  } else {
    // La EFECTIVA en el destino: su .git/config primero y, si no, la global.
    // `--get` sale con 1 si no hay valor: entonces es git quien se queja al commitear.
    nombre = ejecutar("git", ["-C", dst, "config", "--get", "user.name"]).stdout.trim();
    correo = ejecutar("git", ["-C", dst, "config", "--get", "user.email"]).stdout.trim();
  }
  // Solo el CORREO pasa por la lista: el nombre del autor es atribución pública
  // (la misma que lleva LICENSE), y lo que no debe salir es el correo de una
  // empresa o el usuario de una máquina.
  const malas = cadenasEn(correo);
  if (malas.length) {
    abortar(
      `el correo del commit lleva una cadena prohibida (user.email = «${correo}»: ${malas.join(", ")}). ` +
        `Pásale --autor "Nombre <correo>" con un correo público (p. ej. el noreply de GitHub).`
    );
  }
  return { nombre, correo };
}

export function exportar({ destino, commit, autor, silencioso = false }) {
  const dst = path.resolve(RAIZ, destino);
  if (dst === RAIZ || RAIZ.startsWith(dst + path.sep)) abortar("el destino no puede ser el propio repo ni contenerlo");
  fs.mkdirSync(dst, { recursive: true });

  const lista = archivosDelEstudio();
  const enDestino = new Set(listaDestino(dst));
  let copiados = 0, iguales = 0, borrados = 0;
  for (const rel of lista) {
    if (copiar(rel, dst) === false) iguales++;
    else copiados++;
    enDestino.delete(rel);
  }
  for (const sobra of enDestino) {
    borrar(path.join(dst, sobra));
    borrados++;
  }
  // Carpetas vacías que quedaron sin archivos.
  for (const rel of enDestino) {
    let dir = path.dirname(path.join(dst, rel));
    while (dir !== dst && fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
      fs.rmdirSync(dir);
      dir = path.dirname(dir);
    }
  }
  // El .gitignore del producto no es el del estudio: sus zonas se ignoran de verdad.
  const gi = gitignoreProducto(fs.readFileSync(path.join(RAIZ, ".gitignore"), "utf8"));
  const giDst = path.join(dst, ".gitignore");
  if (!fs.existsSync(giDst) || fs.readFileSync(giDst, "utf8") !== gi) { fs.writeFileSync(giDst, gi); copiados++; }
  if (!silencioso) log.info(`${lista.length} archivos del producto · ${copiados} copiados · ${iguales} iguales · ${borrados} borrados en el destino`);

  // Repo del producto: existe o nace aquí, con identidad propia si se pide.
  if (!fs.existsSync(path.join(dst, ".git"))) {
    ejecutar("git", ["-C", dst, "init", "-q", "-b", "main"], { check: true });
    if (!silencioso) log.info("repo del producto creado (git init)");
  }
  // La identidad se valida antes de escribirla y antes de commitear: sin --commit
  // y sin --autor no se firma nada y no hay nada que mirar.
  const identidad = autor || commit ? identidadDelCommit(dst, autor) : null;
  if (autor) {
    ejecutar("git", ["-C", dst, "config", "user.name", identidad.nombre], { check: true });
    ejecutar("git", ["-C", dst, "config", "user.email", identidad.correo], { check: true });
  }
  ejecutar("git", ["-C", dst, "add", "-A"], { check: true });

  // La puerta: dentro del destino, con SU git.
  const guard = ejecutar(process.execPath, [path.join(dst, "herramientas", "revisar-producto.mjs")], { cwd: dst });
  if (guard.status !== 0) {
    console.log((guard.stdout + guard.stderr).trim());
    abortar("el producto arrastra estudio o cadenas prohibidas: no se hace commit");
  }
  if (!silencioso) log.ok("revisar-producto.mjs en verde dentro del destino");

  if (commit) {
    const cambios = ejecutar("git", ["-C", dst, "status", "--porcelain"], { check: true }).stdout.trim();
    if (!cambios) {
      if (!silencioso) log.info("nada que commitear en el producto");
    } else {
      const origen = ejecutar("git", ["-C", RAIZ, "rev-parse", "--short", "HEAD"]).stdout.trim();
      const mensaje = commit === true ? `producto: exportado desde el estudio (${origen})` : String(commit);
      ejecutar("git", ["-C", dst, "commit", "-q", "-m", mensaje], { check: true });
      if (!silencioso) log.ok(`commit en el producto: ${mensaje}`);
    }
  }
  return { destino: dst, archivos: lista.length, copiados, iguales, borrados };
}

if (esMain(import.meta.url)) {
  const f = flags();
  if (f.help || f.h) {
    console.log("uso: node herramientas/exportar-producto.mjs [--destino ../video-creator-producto] [--commit [mensaje]] [--autor \"Nombre <correo>\"]");
    process.exit(0);
  }
  const destino = f.destino || path.join(RAIZ, "..", "video-creator-producto");
  const r = exportar({ destino, commit: f.commit, autor: f.autor });
  log.ok(`producto en ${r.destino}`);
}
