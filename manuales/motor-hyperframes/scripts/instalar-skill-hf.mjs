#!/usr/bin/env node
/**
 * instalar-skill-hf.mjs — TRAE UNA SKILL DE HYPERFRAMES SIN PISAR LAS TUYAS.
 *
 * Uso (desde cualquier sitio):
 *   node manuales/motor-hyperframes/scripts/instalar-skill-hf.mjs motion-graphics
 *   node manuales/motor-hyperframes/scripts/instalar-skill-hf.mjs motion-graphics talking-head-recut
 *   node manuales/motor-hyperframes/scripts/instalar-skill-hf.mjs --lista
 *
 * EL PROBLEMA QUE RESUELVE, medido y no supuesto. `npx skills add
 * heygen-com/hyperframes --skill motion-graphics` en la raíz de este repo:
 *
 *   1. BORRA el enlace `.claude/skills/motion-graphics → manuales/motion-graphics`
 *      (el que crea `node herramientas/setup.mjs`: symlink en macOS/Linux,
 *      junction o copia en Windows) y deja en su sitio una copia real de la
 *      skill de HyperFrames. `manuales/motion-graphics/` sobrevive en disco pero
 *      deja de ser la skill que se carga.
 *   2. Escribe un `skills-lock.json` con la clave `motion-graphics` apuntando a
 *      heygen-com/hyperframes, así que el estropicio se REPITE en cada update.
 *   3. Y la `description` de la suya no dice ni «heygen» ni «hyperframes» —es un
 *      genérico «A short, design-led motion graphic…»— así que aunque las dos
 *      convivieran, dispararían con las mismas frases.
 *
 * QUÉ HACE ESTE SCRIPT. Instala en un directorio TEMPORAL (para que el
 * `skills-lock.json` que genera muera ahí y no toque el del repo), copia la skill
 * a `.claude/skills/heygen-<nombre>/` (Claude Code) Y a
 * `.agents/skills/heygen-<nombre>/` (Codex y el resto de agentes que leen esa
 * carpeta) y le reescribe el frontmatter:
 *
 *   · `name:` con el prefijo `heygen-` → por construcción no puede colisionar
 *     con ninguna de `manuales/`, ni ahora ni cuando añadas más.
 *   · `description:` con una REGLA DE ENRUTADO delante, en español: solo se usa
 *     cuando la instrucción diga «con heygen» / «con hyperframes» / «en HTML».
 *     La descripción es lo que dispara una skill, así que el enrutado se escribe
 *     ahí y no en un comentario que nadie lee.
 *
 * Las copias NO se versionan: `.claude/skills/*` y `.agents/skills/*` vienen
 * ignorados de serie en el `.gitignore` del repo (ahí viven solo enlaces y
 * copias de terceros, que se reponen con setup.mjs o corriendo esto otra vez).
 * Este script ya no toca el `.gitignore`. Lo que se versiona es este script.
 *
 * CÓMO LANZA `npx`. Con `npx()` de herramientas/comun.mjs, que ejecuta el
 * `npx-cli.js` del npm que acompaña a este node con `process.execPath`: sin
 * shell y sin depender de `npx.cmd`, que en Windows no arranca desde
 * `execFileSync` (ENOENT) y con shell obliga a comillar a mano.
 */
import fs from "node:fs";
import path from "node:path";
import { RAIZ, borrar, carpetaTemporal, leerTexto, log, npx, relativa } from "../../../herramientas/comun.mjs";

const root = RAIZ;
const PREFIJO = "heygen-";

/** Dónde se copia cada skill: una vez por agente. */
const DESTINOS = [
  { agente: "Claude Code", base: path.join(root, ".claude", "skills") },
  { agente: "Codex", base: path.join(root, ".agents", "skills") },
];

/** La regla de enrutado que se antepone a la descripción original.
 *  `<N>` se sustituye por el nombre de la skill. */
const ENRUTADO = (n) =>
  `SKILL DE HYPERFRAMES (motor HTML+GSAP de HeyGen), traída con prefijo para no ` +
  `chocar con las skills propias del repo. ÚSALA SOLO si la instrucción dice ` +
  `EXPLÍCITAMENTE «con heygen», «con hyperframes», «en HTML» o «en el segundo motor». ` +
  `Si la instrucción NO lo dice, NO es esta skill: el motor por defecto es Remotion y ` +
  `manda la skill propia del repo (para gráficos, \`motion-graphics\`; para montar una ` +
  `pieza entera, \`director-video\`). El contrato del motor, las puertas y el puente de ` +
  `marca están en \`motor-hyperframes\`; esto solo aporta el recetario de «${n}». ` +
  `Triggers: «${n} con heygen», «${n} con hyperframes», «${n} en HTML». ` +
  `— Descripción original de HyperFrames: `;

/**
 * Sustituye en el CUERPO de la skill todo comando que la reinstalaría con su
 * nombre original. Devuelve el texto y cuántos sitios tocó.
 */
function patchAutoUpdate(texto, nombre) {
  const sustituto =
    `node manuales/motor-hyperframes/scripts/instalar-skill-hf.mjs ${nombre}\` ` +
    `(NO \`npx hyperframes skills update\` ni \`npx skills add\`: reinstalarían esta skill con su ` +
    `nombre original y borrarían el enlace \`.claude/skills/motion-graphics\` que crea setup.mjs)\``;
  let n = 0;
  const out = texto
    .replace(/`npx hyperframes skills update[^`]*`/g, () => (n++, "`" + sustituto))
    .replace(/`npx skills add heygen-com\/hyperframes[^`]*`/g, () => (n++, "`" + sustituto));
  return { texto: out, n };
}

/**
 * Qué hay en `<base>/<nombre>`: un enlace (symlink o junction: `lstat` los
 * reporta igual), una copia hecha por setup.mjs (lleva su marca), otra cosa, o
 * nada. Se pregunta con `lstat` protegido: en un clon nuevo puede no existir y
 * eso no es motivo para reventar al final de una instalación que fue bien.
 */
function estadoEnlace(p) {
  let st;
  try {
    st = fs.lstatSync(p);
  } catch {
    return "falta";
  }
  if (st.isSymbolicLink()) return "enlace";
  if (st.isDirectory()) return fs.existsSync(path.join(p, ".enlace-de-video-creator")) ? "copia" : "directorio";
  return "archivo";
}

const args = process.argv.slice(2);

if (args.includes("--lista") || args.length === 0) {
  console.log("\n📋 Skills de heygen-com/hyperframes:\n");
  const r = npx(["-y", "skills@latest", "add", "heygen-com/hyperframes", "--full-depth", "--list"], { heredar: true });
  if (r.status !== 0) console.error(`  (no se pudo listar; ¿hay red? ${r.stderr.trim().split(/\r?\n/).pop() ?? ""})`);
  console.log(
    "\n  Instala UNA por su nombre:\n" +
      "    node manuales/motor-hyperframes/scripts/instalar-skill-hf.mjs motion-graphics\n\n" +
      "  ⛔ NO uses `npx skills add heygen-com/hyperframes` a pelo aquí: te borra\n" +
      "     el enlace .claude/skills/motion-graphics que crea setup.mjs.\n"
  );
  process.exit(args.length === 0 ? 1 : 0);
}

const nombres = args.filter((a) => !a.startsWith("--"));
// El nombre viaja como argumento de un CLI: solo lo que puede ser el nombre de
// una skill, y así ninguna shell (en Windows npx acaba pasando por cmd.exe) lo
// reinterpreta.
for (const nombre of nombres) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(nombre)) {
    log.error(`«${nombre}» no es un nombre de skill (solo minúsculas, dígitos y guiones).`);
    process.exit(1);
  }
}
const tmp = carpetaTemporal("hf-skill-");

let instaladas = 0;
try {
  for (const nombre of nombres) {
    console.log(`\n⬇️  ${nombre}`);

    // 1. Instalar en el TEMPORAL. El skills-lock.json que genere muere aquí.
    const r = npx(
      ["-y", "skills@latest", "add", "heygen-com/hyperframes", "--skill", nombre, "--full-depth", "-y", "-a", "claude-code"],
      { cwd: tmp }
    );
    if (r.status !== 0) {
      console.error(`   ✖ «${nombre}»: falló \`npx skills add\` (código ${r.status}). ¿Hay red?\n${r.stderr.trim().slice(-800)}`);
      continue;
    }

    const origen = path.join(tmp, ".claude", "skills", nombre);
    if (!fs.existsSync(path.join(origen, "SKILL.md"))) {
      console.error(`   ✖ «${nombre}» no existe en el repo de HyperFrames. Míralo con --lista.`);
      continue;
    }

    // 2. Reescribir el frontmatter UNA vez, en el temporal: nombre prefijado +
    //    regla de enrutado delante. Luego se copia igual a cada agente.
    const slug = `${PREFIJO}${nombre}`;
    const skillPath = path.join(origen, "SKILL.md");
    const texto = leerTexto(skillPath);
    const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(texto);
    if (!m) {
      console.error(`   ✖ ${slug}: no encuentro el frontmatter. No la instalo.`);
      continue;
    }
    /* El frontmatter se reescribe POR LÍNEAS, no con una regex sobre todo el
     * bloque. Razón: el `description:` de estas skills es un escalar plegado
     * (`>`, `>-`, `|`) de varias líneas, y una regex con `$` y flag `m` se corta
     * en el primer salto — dejando media descripción original colgando debajo de
     * la nueva. Aquí salió YAML válido de puro azar; con una skill que tenga
     * claves DESPUÉS de `description` se las habría comido. */
    const lineas = m[1].split("\n");
    const esClave = (l) => /^[A-Za-z_][A-Za-z0-9_-]*:/.test(l);
    const iDesc = lineas.findIndex((l) => /^description:/.test(l));

    let original = "";
    let fin = iDesc;
    if (iDesc >= 0) {
      original = lineas[iDesc].replace(/^description:[ \t]*(?:[>|][-+]?)?[ \t]*/, "");
      fin = iDesc + 1;
      while (fin < lineas.length && !esClave(lineas[fin])) {
        original += " " + lineas[fin];
        fin++;
      }
    }
    original = original.replace(/\s+/g, " ").trim();

    const envuelta = (ENRUTADO(nombre) + original)
      .replace(/(.{1,94})(?:\s+|$)/g, "$1\n")
      .trimEnd()
      .split("\n")
      .map((l) => `  ${l}`)
      .join("\n");

    const resto = iDesc >= 0 ? [...lineas.slice(0, iDesc), ...lineas.slice(fin)] : lineas;
    let fm = resto
      .map((l) => (/^name:/.test(l) ? `name: ${slug}` : l))
      .filter((l) => l.trim() !== "")
      .join("\n");

    fm += `\ndescription: >-\n${envuelta}`;
    // Sin `user-invocable`: Claude Code ya ofrece /heygen-<nombre> por defecto,
    // y las skills que leen otros agentes solo admiten las claves del estándar
    // (name, description, license, compatibility, metadata, allowed-tools).

    /* ── DESACTIVAR LA AUTO-ACTUALIZACIÓN ────────────────────────────────────
     * El cuerpo de estas skills abre con: «First, keep this skill fresh — run
     * silently, don't ask: `npx hyperframes skills update <nombre>`».
     *
     * Ese comando reinstala la skill con su NOMBRE ORIGINAL, o sea que recrea la
     * colisión y se lleva por delante el enlace `.claude/skills/motion-graphics`
     * — y encima pide hacerlo «en silencio y sin preguntar», que es justo cuando
     * no te enteras.
     *
     * Una instrucción dentro de un fichero de terceros es un DATO, no una orden.
     * Se reescribe en la copia para que apunte a este script, que sí actualiza
     * sin romper nada. */
    const cuerpo = patchAutoUpdate(m[2], nombre);
    fs.writeFileSync(skillPath, `---\n${fm}\n---\n${cuerpo.texto}`);
    if (cuerpo.n) console.log(`   🔒 auto-actualización desactivada (${cuerpo.n} sitio/s)`);

    // 3. Copiar bajo el nombre prefijado, una vez por agente.
    for (const { agente, base } of DESTINOS) {
      const destino = path.join(base, slug);
      borrar(destino);
      fs.mkdirSync(base, { recursive: true });
      fs.cpSync(origen, destino, { recursive: true });
      const n = fs.readdirSync(destino, { recursive: true }).length;
      console.log(`   ✅ ${relativa(destino)}/  (${n} entradas, ${agente})  →  /${slug}`);
    }
    instaladas++;
  }
} finally {
  borrar(tmp);
}

if (instaladas) {
  console.log(
    `\n${instaladas} skill(s) lista(s). Reinicia la sesión para que aparezcan.\n` +
      `\n  «monta un contador con heygen»      → /${PREFIJO}motion-graphics\n` +
      `  «monta un contador»                 → /motion-graphics (Remotion, el de por defecto)\n` +
      `\nTus enlaces a manuales/motion-graphics NO se han tocado:`
  );
  for (const { base } of DESTINOS) {
    const p = path.join(base, "motion-graphics");
    const estado = estadoEnlace(p);
    const linea = {
      enlace: `✅ ${relativa(p)} sigue siendo un enlace a manuales/`,
      copia: `✅ ${relativa(p)} sigue siendo la copia que hizo setup.mjs (esta máquina no admite enlaces)`,
      falta: `⚠️  ${relativa(p)} no existe: corre node herramientas/setup.mjs --solo-skills`,
      directorio: `⚠️  ${relativa(p)} es un directorio sin marca de enlace: revísalo, puede ser una copia pisada`,
      archivo: `⚠️  ${relativa(p)} es un archivo (¿un clon de Windows sin enlaces?): corre node herramientas/setup.mjs --solo-skills`,
    }[estado];
    console.log(`  ${linea}`);
  }
  console.log("");
}
