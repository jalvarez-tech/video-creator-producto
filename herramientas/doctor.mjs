/**
 * doctor.mjs — dice qué funciona y qué falta. NO instala nada.
 *
 *   node herramientas/doctor.mjs [--json]
 *
 * Imprime una línea por pieza (✅ bien · ❌ falta y hace falta · ⚠️ falta pero es
 * opcional, o funciona con matices) y termina con el NIVEL en el que puedes trabajar:
 *
 *   nivel 0 — sin ninguna clave: montar, renderizar, cortar silencios, motion graphics, SFX.
 *   nivel 1 — con PEXELS_API_KEY: además b-roll de archivo real (fotos y vídeo, gratis).
 *   nivel 2 — con alguna clave de pago (HeyGen, ElevenLabs, xAI): avatar, voz en off, b-roll generado.
 *
 * Las claves se comprueban SOLO por presencia en .env: no se leen para otra cosa,
 * no se imprimen ni se envían a ningún sitio. Sale con 0 si el nivel 0 funciona
 * (todas las piezas obligatorias ✅), con 1 si falta alguna. Con --json imprime un
 * objeto para que lo lean otros scripts o un agente, y nada más.
 *
 * Lo llama setup.mjs al terminar; un agente debe ejecutarlo antes de prometer nada
 * («instálalo» → setup; «¿qué me falta?» → doctor).
 */
import fs from "node:fs";
import path from "node:path";
import {
  RAIZ,
  ES_WINDOWS,
  plataforma,
  desdeRaiz,
  relativa,
  posix,
  dirBinUsuario,
  binario,
  ejecutar,
  versionDe,
  esMain,
  leerJSON,
  leerTexto,
  log,
  flags,
} from "./comun.mjs";

/** Filtros de ffmpeg que usan los scripts del repo (los mismos que exige setup.mjs). */
const FILTROS_FFMPEG = ["anoisesrc", "afade", "volume", "loudnorm", "select", "signalstats", "scale", "overlay", "afftdn", "volumedetect"];

/** Frontmatter permitido en SKILL.md (lo que leen Claude Code y Codex sin quejarse). */
const CLAVES_FRONTMATTER = new Set(["name", "description", "license", "compatibility", "metadata", "allowed-tools"]);

/**
 * Claves de .env, qué desbloquea cada una y DÓNDE se consigue. Solo se mira si están; el
 * valor no sale de aquí. El «donde» está también en .env.example, pero el agente tiene
 * vetada la lectura de .env.* (por diseño): esta tabla es lo que puede citar.
 */
const CLAVES = {
  PEXELS_API_KEY: { nivel: 1, para: "b-roll de archivo real (Pexels, gratis)", donde: "https://www.pexels.com/api/" },
  HEYGEN_API_KEY: { nivel: 2, para: "avatar generado (HeyGen, de pago)", donde: "https://app.heygen.com → Settings → API" },
  ELEVENLABS_API_KEY: { nivel: 2, para: "voz en off (ElevenLabs, de pago)", donde: "https://elevenlabs.io → API Keys" },
  XAI_API_KEY: { nivel: 2, para: "b-roll generado con IA (Grok Imagine, de pago)", donde: "https://console.x.ai" },
};

/** Versión mínima de uv: antes no existen «uv run --no-project» ni «uv python find», que usan los scripts. */
const UV_MINIMO = [0, 4, 0];

/** Los nueve cortes de Inter que registra remotion/src/motor/fuentes.ts; cada OTF pesa ~260 KB. */
const CORTES_INTER = ["Thin", "ExtraLight", "Light", "Regular", "Medium", "SemiBold", "Bold", "ExtraBold", "Black"];
const BYTES_MINIMOS_OTF = 100 * 1024;

const DIR_REMOTION = desdeRaiz("remotion");
const MODELO_WHISPER = desdeRaiz("archivos", "whisper", "ggml-small.bin");
const BYTES_MODELO = 487601967;
const LINEA_INSTALAR_WINDOWS = "powershell -NoProfile -ExecutionPolicy Bypass -File instalar.ps1";

const piezas = []; // { id, estado: "ok"|"falta"|"aviso", obligatoria, texto, arreglo? }

function existe(p) {
  try {
    fs.statSync(p);
    return true;
  } catch {
    return false;
  }
}

function anota(id, estado, texto, { obligatoria = true, arreglo } = {}) {
  piezas.push({ id, estado, obligatoria, texto, arreglo });
}
const ok = (id, texto, o) => anota(id, "ok", texto, o);
const falta = (id, texto, arreglo, o = {}) => anota(id, "falta", texto, { ...o, arreglo });
const aviso = (id, texto, arreglo, o = {}) => anota(id, "aviso", texto, { ...o, obligatoria: false, arreglo });

// ─── Comprobaciones ─────────────────────────────────────────────────────────────

function revisarSistema() {
  const { so, arch, nodo } = plataforma();
  const mayor = Number(nodo.slice(1).split(".")[0]);
  if (mayor >= 22) ok("node", `Node ${nodo} (se necesita 22 o superior)`);
  else {
    // En Windows, instalar.ps1 deja un Node portable junto a la carpeta de herramientas
    // (%LOCALAPPDATA%\video-creator\node). Si existe y aun así corre uno viejo, es que un Node
    // del PATH de MÁQUINA (el MSI oficial en Program Files) gana en cada terminal nueva: repetir
    // el instalador no lo arregla, hay que decir la ruta del bueno.
    const portable = so === "windows" ? path.join(path.dirname(dirBinUsuario()), "node", "node.exe") : null;
    if (portable && existe(portable)) {
      const v = versionDe(portable) || "";
      falta(
        "node",
        `Node ${nodo} (${posix(process.execPath)}) es demasiado viejo: se necesita 22 o superior. instalar.ps1 ya dejó un Node ${v} portable en ${posix(portable)}, pero el viejo va en el PATH de máquina y gana en cada terminal nueva`,
        `usa la ruta completa mientras actualizas o desinstalas ese Node viejo: "${portable}" herramientas/doctor.mjs (y lo mismo para los demás comandos node); el bueno se conoce como %LOCALAPPDATA%\\video-creator\\node\\node.exe`
      );
    } else {
      falta("node", `Node ${nodo} es demasiado viejo: se necesita 22 o superior`, `ejecuta bash instalar.sh (macOS/Linux) o ${LINEA_INSTALAR_WINDOWS} (Windows), que lo instala sin administrador`);
    }
  }

  if (so === "windows" && arch === "arm64") falta("arquitectura", "Windows ARM64: Remotion no tiene compositor para esta arquitectura y no renderiza", "usa un PC con Windows x64, un Mac, o Linux");
  else ok("arquitectura", `${so} ${arch}`);

  if (/[^\x20-\x7e]/.test(RAIZ) || /\s/.test(RAIZ)) aviso("ruta", `la carpeta del repo tiene espacios o tildes (${posix(RAIZ)}): funciona, pero algunas herramientas externas se lían con eso`, "si algo falla al renderizar, mueve el repo a una ruta sin espacios ni tildes");
  if (/onedrive|icloud|mobile documents/i.test(RAIZ)) aviso("sincronizacion", "el repo está dentro de OneDrive/iCloud: la sincronización pelea con node_modules y con los renders", "muévelo a una carpeta local normal (p. ej. ~/video-creator o %USERPROFILE%\\video-creator)");
}

function revisarMotor() {
  const pkgPath = path.join(DIR_REMOTION, "package.json");
  if (!existe(pkgPath)) {
    falta("motor", "no existe remotion/package.json: el repo está incompleto", "vuelve a clonar o descomprimir el repo entero");
    return;
  }
  const pkg = leerJSON(pkgPath);
  const declaradas = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  const faltan = [];
  for (const [nombre, rango] of Object.entries(declaradas)) {
    const pj = path.join(DIR_REMOTION, "node_modules", nombre, "package.json");
    if (!existe(pj)) faltan.push(nombre);
    else if (/^\d/.test(rango) && leerJSON(pj).version !== rango) faltan.push(`${nombre}@${leerJSON(pj).version}≠${rango}`);
  }
  if (faltan.length === 0) ok("motor", `Remotion ${declaradas.remotion || "?"} y sus dependencias instaladas en remotion/node_modules`);
  else falta("motor", `faltan ${faltan.length} dependencia(s) en remotion/node_modules: ${faltan.slice(0, 4).join(", ")}${faltan.length > 4 ? "…" : ""}`, "node herramientas/setup.mjs (hace npm ci)");

  const chrome = path.join(DIR_REMOTION, "node_modules", ".remotion", "chrome-headless-shell");
  let hayChrome = false;
  try {
    hayChrome = fs.readdirSync(chrome).some((e) => e !== "VERSION");
  } catch {
    /* no está */
  }
  if (hayChrome) ok("chrome", "Chrome Headless Shell de Remotion descargado", { obligatoria: false });
  else aviso("chrome", "el Chrome Headless Shell de Remotion aún no está descargado (lo bajará el primer render, ~150 MB)", "node herramientas/setup.mjs, o cd remotion && npx remotion browser ensure");
}

/** Lee el frontmatter de un SKILL.md: claves de primer nivel y el texto de description. */
function frontmatterDe(texto) {
  const m = texto.match(/^---\n([\s\S]*?)\n---(\n|$)/);
  if (!m) return null;
  const claves = [];
  const campos = {};
  let actual = null;
  for (const linea of m[1].split("\n")) {
    const k = linea.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (k) {
      actual = k[1];
      claves.push(actual);
      campos[actual] = k[2];
    } else if (actual !== null && /^\s+\S/.test(linea)) campos[actual] += "\n" + linea;
  }
  let description = campos.description ?? "";
  if (/^[>|]/.test(description)) description = description.split("\n").slice(1).map((l) => l.trim()).join(" ");
  else description = description.replace(/^["']|["']$/g, "");
  return { claves, campos, description: description.trim() };
}

function revisarSkills() {
  const manuales = desdeRaiz("manuales");
  let skills = [];
  try {
    skills = fs
      .readdirSync(manuales, { withFileTypes: true })
      .filter((e) => e.isDirectory() && existe(path.join(manuales, e.name, "SKILL.md")))
      .map((e) => e.name)
      .sort();
  } catch {
    /* sin manuales/ */
  }
  if (skills.length === 0) {
    falta("skills", "no hay ninguna skill en manuales/<skill>/SKILL.md", "vuelve a clonar o descomprimir el repo entero");
    return;
  }
  const sinEnlace = [];
  const conProblema = [];
  for (const s of skills) {
    const real = fs.realpathSync.native(path.join(manuales, s));
    for (const base of [".claude/skills", ".agents/skills"]) {
      const enlace = desdeRaiz(...base.split("/"), s);
      let bien = false;
      try {
        const st = fs.lstatSync(enlace);
        if (st.isSymbolicLink()) bien = fs.realpathSync.native(enlace) === real;
        else if (st.isDirectory()) bien = existe(path.join(enlace, ".enlace-de-video-creator")) && existe(path.join(enlace, "SKILL.md"));
      } catch {
        /* no existe */
      }
      if (!bien) sinEnlace.push(`${base}/${s}`);
    }
    // Frontmatter: lo que hace que Claude Code y Codex carguen la skill con su nombre.
    const texto = leerTexto(path.join(manuales, s, "SKILL.md"));
    const fm = frontmatterDe(texto);
    if (!fm) conProblema.push({ s, grave: true, que: "sin frontmatter (--- name/description ---)" });
    else {
      const name = (fm.campos.name || "").trim();
      if (name !== s) conProblema.push({ s, grave: true, que: `name «${name}» no es el nombre de la carpeta` });
      else if (!/^[a-z0-9-]{1,64}$/.test(name)) conProblema.push({ s, grave: true, que: `name «${name}» solo puede llevar a-z, 0-9 y guiones (máx. 64)` });
      if (!fm.description) conProblema.push({ s, grave: true, que: "sin description" });
      else if (fm.description.length > 1024) conProblema.push({ s, grave: false, que: `description de ${fm.description.length} caracteres (máx. 1024)` });
      const extra = fm.claves.filter((k) => !CLAVES_FRONTMATTER.has(k));
      if (extra.length) conProblema.push({ s, grave: false, que: `claves no admitidas en el frontmatter: ${extra.join(", ")}` });
      const lineas = texto.split("\n").length;
      if (lineas >= 500) conProblema.push({ s, grave: false, que: `SKILL.md tiene ${lineas} líneas (máx. 499)` });
    }
  }
  if (sinEnlace.length === 0) ok("skills-enlaces", `${skills.length} skills enlazadas en .claude/skills/ y .agents/skills/ (${skills.join(", ")})`);
  else falta("skills-enlaces", `faltan ${sinEnlace.length} enlace(s) de skills: ${sinEnlace.slice(0, 4).join(", ")}${sinEnlace.length > 4 ? "…" : ""}`, "node herramientas/setup.mjs --solo-skills");

  const graves = conProblema.filter((p) => p.grave);
  const leves = conProblema.filter((p) => !p.grave);
  const lista = (ps) => ps.map((p) => `${p.s}: ${p.que}`).join(" · ");
  if (graves.length) falta("skills-frontmatter", `frontmatter roto en ${graves.length} skill(s): ${lista(graves)}`, "corrige el bloque --- del SKILL.md (name = carpeta, description presente)");
  else if (leves.length) aviso("skills-frontmatter", `frontmatter mejorable en ${leves.length} skill(s): ${lista(leves)}`, "acorta la description a 1024 caracteres y deja solo name, description, license, compatibility, metadata, allowed-tools");
  else ok("skills-frontmatter", "frontmatter de las skills válido (name = carpeta, description ≤ 1024, claves permitidas)");
}

function revisarEnv() {
  if (existe(desdeRaiz(".env"))) ok("env", ".env presente (las claves se rellenan ahí; el nivel 0 no necesita ninguna)", { obligatoria: false });
  else aviso("env", "no hay .env (sin él estás en nivel 0, que funciona igual)", "node herramientas/setup.mjs lo crea a partir de .env.example");
}

function revisarFfmpeg() {
  const ffmpeg = binario("ffmpeg");
  const ffprobe = binario("ffprobe");
  if (!ffmpeg) falta("ffmpeg", "ffmpeg no está (ni en la carpeta de herramientas del usuario ni en el PATH)", "node herramientas/setup.mjs lo descarga sin administrador");
  else {
    const r = ejecutar(ffmpeg, ["-hide_banner", "-filters"]);
    const presentes = new Set();
    for (const linea of r.stdout.split(/\r?\n/)) {
      const m = linea.match(/^\s*[A-Z.]{2,3}\s+(\S+)\s/);
      if (m) presentes.add(m[1]);
    }
    const faltan = FILTROS_FFMPEG.filter((f) => !presentes.has(f));
    const version = (versionDe(ffmpeg, ["-version"]) || "").replace(/ Copyright.*$/, "");
    if (r.status !== 0) falta("ffmpeg", `ffmpeg está en ${posix(ffmpeg)} pero no arranca`, "node herramientas/setup.mjs instala uno que funciona");
    else if (faltan.length) falta("ffmpeg", `${version} (${posix(ffmpeg)}) no trae los filtros ${faltan.join(", ")} que usan los scripts`, "node herramientas/setup.mjs instala un ffmpeg completo en la carpeta de herramientas del usuario, que tiene prioridad");
    else ok("ffmpeg", `${version} con los ${FILTROS_FFMPEG.length} filtros que usan los scripts (${posix(ffmpeg)})`);
  }
  if (!ffprobe) falta("ffprobe", "ffprobe no está", "node herramientas/setup.mjs (viene con ffmpeg)");
  else ok("ffprobe", `ffprobe en ${posix(ffprobe)}`);
}

function revisarPython() {
  const uv = binario("uv");
  if (!uv) {
    falta("uv", "uv no está (es quien ejecuta los scripts de Python del sistema)", "node herramientas/setup.mjs lo instala sin administrador");
    return;
  }
  // Un uv ajeno (pip de 2024, un binario roto) se acepta solo si arranca y es ≥ UV_MINIMO:
  // si no, todos los .py fallarían con un ✅ en esta línea.
  const v = versionDe(uv);
  if (!v) {
    falta("uv", `uv está en ${posix(uv)} pero no arranca`, "node herramientas/setup.mjs (instala el fijado en la carpeta de herramientas del usuario, que tiene prioridad)");
    return;
  }
  const m = v.match(/(\d+)\.(\d+)\.(\d+)/);
  const partes = m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
  const viejo = !partes || partes[0] < UV_MINIMO[0] || (partes[0] === UV_MINIMO[0] && (partes[1] < UV_MINIMO[1] || (partes[1] === UV_MINIMO[1] && partes[2] < UV_MINIMO[2])));
  if (viejo) {
    falta("uv", `${v} (${posix(uv)}) es anterior a ${UV_MINIMO.join(".")}: no tiene «uv run --no-project» ni «uv python find», que usan los scripts`, "node herramientas/setup.mjs (instala el fijado en la carpeta de herramientas del usuario, que tiene prioridad)");
    return;
  }
  ok("uv", `${v} (${posix(uv)})`);
  const py = ejecutar(uv, ["python", "find", ">=3.10"]);
  if (py.status === 0 && py.stdout.trim()) ok("python", `Python: ${posix(py.stdout.trim())}`, { obligatoria: false });
  else aviso("python", "uv no encuentra ningún Python ≥ 3.10 (lo descargará al primer «uv run», si hay red)", "uv python install 3.12");
}

function revisarAutoEditor() {
  const ae = binario("auto-editor");
  if (!ae) {
    falta("auto-editor", "auto-editor no está (corta los silencios de las grabaciones)", "node herramientas/setup.mjs descarga la 31.6.0");
    return;
  }
  const v = versionDe(ae) || "";
  if (v.includes("31.")) ok("auto-editor", `auto-editor ${v} (${posix(ae)})`);
  else ok("auto-editor", `auto-editor ${v || "?"} (${posix(ae)}); el sistema está probado con la 31.6.0`);
}

function revisarWhisper() {
  const w = binario("whisper-cli");
  const modeloBien = existe(MODELO_WHISPER) && fs.statSync(MODELO_WHISPER).size === BYTES_MODELO;
  if (w && modeloBien) ok("whisper", `whisper-cli (${posix(w)}) y modelo ${relativa(MODELO_WHISPER)}: transcripción con tiempos disponible`, { obligatoria: false });
  else {
    const partes = [];
    if (!w) partes.push("whisper-cli no está");
    if (!modeloBien) partes.push(existe(MODELO_WHISPER) ? `el modelo ${relativa(MODELO_WHISPER)} está incompleto` : `falta el modelo ${relativa(MODELO_WHISPER)}`);
    aviso("whisper", `${partes.join(" y ")}: sin transcripción con tiempos (subtítulos automáticos); todo lo demás funciona`, "node herramientas/setup.mjs --whisper (descarga 465 MB)");
  }
}

/** Los archivos que el motor de cues espera en remotion/public/sfx/, leídos de cues.ts para no duplicar la lista. */
function sfxEsperados() {
  const cues = path.join(DIR_REMOTION, "src", "motor", "sound", "cues.ts");
  if (!existe(cues)) return null;
  const nombres = new Set();
  for (const m of leerTexto(cues).matchAll(/file:\s*"([^"]+)"/g)) nombres.add(m[1]);
  return [...nombres].sort();
}

function revisarSfx() {
  const esperados = sfxEsperados();
  if (!esperados) {
    falta("sfx", "no encuentro remotion/src/motor/sound/cues.ts: el motor está incompleto", "vuelve a clonar o descomprimir el repo entero");
    return;
  }
  const dir = path.join(DIR_REMOTION, "public", "sfx");
  const faltan = esperados.filter((n) => !existe(path.join(dir, n)));
  let origen = "";
  try {
    const o = leerJSON(path.join(dir, ".origen.json"));
    if (o.modo) origen = ` (origen: ${o.modo})`;
  } catch {
    /* sin .origen.json: set copiado o sintetizado */
  }
  if (faltan.length === 0) ok("sfx", `los ${esperados.length} efectos de sonido del motor están en remotion/public/sfx/${origen}`);
  else falta("sfx", `faltan ${faltan.length} de ${esperados.length} efectos de sonido en remotion/public/sfx/: ${faltan.slice(0, 5).join(", ")}${faltan.length > 5 ? "…" : ""}`, "node herramientas/setup.mjs (copia los que falten desde manuales/diseno-sonoro/sfx-base/)");
}

function revisarAvatar() {
  const avatar = path.join(DIR_REMOTION, "public", "avatar.mp4");
  if (existe(avatar)) ok("avatar", "remotion/public/avatar.mp4 presente (las demos con avatar lo usan)");
  else falta("avatar", "falta remotion/public/avatar.mp4 (las demos con avatar no renderizan sin él)", "node herramientas/setup.mjs genera uno de relleno con ffmpeg");
}

/**
 * Los nueve OTF de Inter son punto único de fallo de TODAS las composiciones: el motor los
 * registra al arrancar (remotion/src/motor/fuentes.ts) y sin ellos cada render pinta con otra
 * fuente (o no sale). No los descarga nadie: vienen con el repo, así que si faltan es un
 * clon o un zip incompleto. Se mira también el tamaño: un OTF de 0 bytes (LFS a medias,
 * copia cortada) existe pero no carga.
 */
function revisarFuentes() {
  const dir = path.join(DIR_REMOTION, "public", "fuentes", "inter");
  const mal = [];
  for (const corte of CORTES_INTER) {
    const nombre = `Inter-${corte}.otf`;
    let tam = -1;
    try {
      tam = fs.statSync(path.join(dir, nombre)).size;
    } catch {
      /* no existe */
    }
    if (tam < 0) mal.push(`${nombre} (falta)`);
    else if (tam <= BYTES_MINIMOS_OTF) mal.push(`${nombre} (${tam} bytes, truncado)`);
  }
  if (mal.length === 0) ok("fuentes", `las ${CORTES_INTER.length} variantes de Inter están en remotion/public/fuentes/inter/ (el motor las registra al arrancar)`);
  else falta("fuentes", `${mal.length} de ${CORTES_INTER.length} fuentes Inter mal en remotion/public/fuentes/inter/: ${mal.slice(0, 4).join(", ")}${mal.length > 4 ? "…" : ""}; sin ellas ninguna composición pinta la tipografía del producto`, "vuelve a clonar o descomprimir el repo entero");
}

function revisarGit() {
  const git = binario("git");
  if (git) ok("git", `${versionDe(git) || "git"} (opcional: solo para actualizar el repo)`, { obligatoria: false });
  else aviso("git", "git no está (opcional: sin él actualizas el sistema volviendo a descargar el ZIP)", "https://git-scm.com/downloads");
}

/** Qué claves hay en .env (solo nombres; los valores no salen de esta función). */
function clavesPresentes() {
  const env = desdeRaiz(".env");
  const presentes = new Set();
  if (!existe(env)) return presentes;
  for (const linea of leerTexto(env).split("\n")) {
    const m = linea.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    const valor = m[2].trim().replace(/^(["'])(.*)\1$/, "$2").trim();
    if (valor && !valor.startsWith("#")) presentes.add(m[1]);
  }
  return presentes;
}

// ─── Principal ──────────────────────────────────────────────────────────────────
function principal() {
  const f = flags();
  if (f.help) {
    console.log("Uso: node herramientas/doctor.mjs [--json]\n\nComprueba cada pieza del sistema y dice en qué nivel puedes trabajar. No instala nada.");
    return 0;
  }
  const json = Boolean(f.json);

  revisarSistema();
  revisarMotor();
  revisarSkills();
  revisarEnv();
  revisarFfmpeg();
  revisarPython();
  revisarAutoEditor();
  revisarWhisper();
  revisarSfx();
  revisarAvatar();
  revisarFuentes();
  revisarGit();

  const presentes = clavesPresentes();
  const tienePexels = presentes.has("PEXELS_API_KEY");
  const pago = Object.entries(CLAVES).filter(([, c]) => c.nivel === 2);
  const pagoPresentes = pago.filter(([k]) => presentes.has(k)).map(([k]) => k);
  const nivel = pagoPresentes.length ? 2 : tienePexels ? 1 : 0;
  const paraSubir = [];
  if (!tienePexels) paraSubir.push(`PEXELS_API_KEY → nivel 1: ${CLAVES.PEXELS_API_KEY.para} · se saca en ${CLAVES.PEXELS_API_KEY.donde}`);
  for (const [k, c] of pago) if (!presentes.has(k)) paraSubir.push(`${k} → nivel 2: ${c.para} · se saca en ${c.donde}`);
  // Dónde se consigue cada clave, también en el JSON: es lo que un agente cita cuando le preguntan
  // «¿dónde saco la clave?», porque .env.example le está vetado.
  const dondeClaves = Object.fromEntries(Object.entries(CLAVES).map(([k, c]) => [k, c.donde]));

  const obligatoriasMal = piezas.filter((p) => p.obligatoria && p.estado !== "ok");
  const nivel0 = obligatoriasMal.length === 0;

  if (json) {
    console.log(
      JSON.stringify(
        {
          plataforma: plataforma(),
          raiz: posix(RAIZ),
          binUsuario: posix(dirBinUsuario()),
          nivel0,
          nivel: nivel0 ? nivel : null,
          nivelClaves: nivel,
          claves: { presentes: [...presentes].filter((k) => k in CLAVES).sort(), faltan: Object.keys(CLAVES).filter((k) => !presentes.has(k)), donde: dondeClaves },
          paraSubir,
          piezas,
        },
        null,
        2
      )
    );
    return nivel0 ? 0 : 1;
  }

  const { so, arch, nodo } = plataforma();
  log.titulo(`Doctor de video-creator · ${so} ${arch} · Node ${nodo} · ${posix(RAIZ)}`);
  for (const p of piezas) {
    const linea = p.estado === "ok" ? log.ok : p.estado === "falta" ? log.error : log.aviso;
    linea(p.texto);
    if (p.estado !== "ok" && p.arreglo) console.log(`   → ${p.arreglo}`);
  }

  console.log("");
  const nombreNivel = ["nivel 0 (sin claves)", "nivel 1 (Pexels)", "nivel 2 (con claves de pago)"][nivel];
  if (nivel0) {
    log.ok(`NIVEL ${nivel}: ${nombreNivel}. El nivel 0 funciona: puedes montar y renderizar vídeos ya.`);
  } else {
    log.error(`El nivel 0 NO funciona todavía: faltan ${obligatoriasMal.length} pieza(s) obligatoria(s) (${obligatoriasMal.map((p) => p.id).join(", ")}). Arréglalas con lo que dice cada línea → y vuelve a pasar el doctor.`);
  }
  if (pagoPresentes.length) log.info(`claves de pago presentes: ${pagoPresentes.join(", ")}`);
  if (paraSubir.length) {
    log.info(nivel < 2 ? "para subir de nivel, añade en .env:" : "claves de pago que aún no tienes (opcionales):");
    for (const s of paraSubir) console.log(`   · ${s}`);
  }
  if (ES_WINDOWS) console.log(`   (las herramientas del usuario viven en ${posix(dirBinUsuario())})`);
  return nivel0 ? 0 : 1;
}

if (esMain(import.meta.url)) process.exit(principal());
