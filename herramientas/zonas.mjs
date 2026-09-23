/**
 * zonas.mjs — QUÉ ES ESTUDIO Y QUÉ ES PRODUCTO, en un solo sitio.
 *
 * El repo sirve a dos cosas a la vez: el ESTUDIO de quien lo usa (sus proyectos,
 * sus marcas, su banco de sonido, sus medios) y el PRODUCTO que se comparte con
 * cualquiera (motor, skills, scripts, instaladores, una marca de ejemplo). Los
 * dos conviven en las MISMAS rutas: el estudio nunca se mueve de sitio.
 *
 * Lo que decide de qué lado cae cada archivo está aquí, y lo consumen:
 *   · herramientas/exportar-producto.mjs  — copia al producto solo lo que no es estudio
 *   · herramientas/revisar-producto.mjs   — falla si el producto arrastra estudio
 *   · .gitignore                          — se escribe a mano, pero con estas mismas zonas
 *
 * Las rutas son relativas a la raíz, con «/». Un patrón termina en «/» si es
 * carpeta entera. Las excepciones van en `PERMITIDO_EN_ZONA`: lo poco que dentro
 * de una zona de estudio SÍ es producto (el .gitkeep que sujeta la carpeta, la
 * marca de ejemplo, las fuentes empaquetadas, el README del set de SFX).
 */

/** Carpetas y archivos que son SOLO del estudio. */
export const ZONAS_ESTUDIO = [
  "sonido/",
  "proyectos/",
  "remotion/src/proyectos/",
  "remotion/src/marcas/",
  "remotion/public/",
  // El brand kit, la música y las capturas de quien usa el sistema (theme.ts
  // manda el kit a archivos/marca/): binarios que el guard no puede leer, así
  // que la única defensa es no copiarlos. Las carpetas viajan por su .gitkeep.
  "archivos/",
  ".claude/skills/",
  ".claude/worktrees/",
  ".claude/settings.local.json",
  ".agents/skills/",
  ".env",
  "CLAUDE.local.md",
  "AGENTS.override.md",
  // El lock de `npx skills` describe las skills de terceros de ESTA máquina
  // (las de .agents/skills/, que no se versionan): en el producto declararía
  // instalado lo que no existe y `npx skills` intentaría rehidratarlo.
  "skills-lock.json",
];

/** Dentro de las zonas de arriba, esto SÍ va al producto. Prefijos o rutas exactas. */
export const PERMITIDO_EN_ZONA = [
  "proyectos/.gitkeep",
  "remotion/src/proyectos/.gitkeep",
  "archivos/capturas/.gitkeep",
  "archivos/ejemplos/.gitkeep",
  "archivos/marca/.gitkeep",
  "archivos/musica/.gitkeep",
  "remotion/src/marcas/ejemplo.ts",
  "remotion/public/sfx/README.md",
  // remotion/public/avatar.mp4 NO está aquí a propósito: es el relleno que
  // setup.mjs genera en cada instalación y el nombre con el que el usuario pone
  // SU clip. Versionado, `git status` quedaría sucio para siempre y un
  // `git pull` chocaría con él.
  "remotion/public/fuentes/",
  "remotion/public/demo/",
];

/** Archivos de estudio que pueden aparecer en cualquier carpeta. */
export const NOMBRES_ESTUDIO = [/^ESTUDIO(-[^/]*)?\.md$/i];

/**
 * Cadenas que NO pueden aparecer en un archivo del producto: datos del dueño,
 * de sus clientes o de sus piezas. Se comprueban tal cual (sensibles a
 * mayúsculas) sobre el texto de cada archivo compartido.
 */
export const CADENAS_PROHIBIDAS = [
  "nicecode",
  "stevanswd",
  "weknowinc",
  "Luxur",
  "LUXUR",
  "luxur",
  "propiedadesluxur",
  "Chocó",
  "Choco",
  "Papita",
  "streetcats",
  "Street Cats",
  "Isabella",
  "Cadavid",
  "Stevans",
  "APEX",
  "Boda011",
  "María & Daniel",
  "El Colombiano",
  "/Users/",
];

/** Archivos del producto donde una cadena prohibida NO cuenta (aparece por razones legítimas). */
export const EXCEPCIONES_CADENAS = [
  "LICENSE", // lleva el nombre del titular del copyright
  "THIRD_PARTY_NOTICES.md",
  "herramientas/zonas.mjs", // esta misma lista
  "herramientas/revisar-producto.mjs",
  // La autoría del plugin (nombre del autor en los manifiestos y en la skill):
  // es atribución pública deliberada, no una fuga.
  ".claude-plugin/marketplace.json",
  "plugin/.claude-plugin/plugin.json",
  "plugin/skills/instalar/SKILL.md",
];

/** Extensiones que se leen como texto para buscar cadenas. */
export const EXTENSIONES_TEXTO = new Set([
  ".md", ".txt", ".ts", ".tsx", ".mjs", ".js", ".cjs", ".json", ".py", ".sh", ".ps1", ".cmd",
  ".css", ".html", ".yml", ".yaml", ".toml", ".example", ".gitignore", ".gitattributes", "",
]);

const normaliza = (ruta) => String(ruta).replace(/\\/g, "/").replace(/^\.\//, "");

/** ¿La ruta cae dentro de una zona de estudio (y no está en la lista de permitidos)? */
export function esEstudio(ruta) {
  const r = normaliza(ruta);
  const base = r.split("/").pop();
  if (NOMBRES_ESTUDIO.some((re) => re.test(base))) return true;
  const permitido = PERMITIDO_EN_ZONA.some((p) => (p.endsWith("/") ? r.startsWith(p) : r === p));
  if (permitido) return false;
  return ZONAS_ESTUDIO.some((z) => (z.endsWith("/") ? r.startsWith(z) : r === z));
}

/** ¿Es un archivo del producto en el que hay que buscar cadenas prohibidas? */
export function seRevisaTexto(ruta) {
  const r = normaliza(ruta);
  if (esEstudio(r)) return false;
  if (EXCEPCIONES_CADENAS.includes(r)) return false;
  const base = r.split("/").pop();
  const punto = base.lastIndexOf(".");
  const ext = punto >= 0 ? base.slice(punto) : "";
  return EXTENSIONES_TEXTO.has(ext);
}

/** Las cadenas prohibidas que contiene un texto. */
export function cadenasEn(texto) {
  return CADENAS_PROHIBIDAS.filter((c) => texto.includes(c));
}
