/**
 * Motor de diseño sonoro (guía: manuales/diseno-sonoro/SKILL.md
 * + catálogo por motion graphic: manuales/diseno-sonoro/recetario-motion-graphics.md).
 * Un SoundCue = una decisión de sonido con FUNCIÓN narrativa (reason obligatorio).
 * Los archivos viven en remotion/public/sfx/: el set base sintetizado del producto
 * (manuales/diseno-sonoro/sfx-base/, lo repone sfx.mjs) o los que cada canal ponga
 * ahí con el mismo nombre (README de public/sfx/).
 *
 * Regla maestra: usa el efecto MÁS ESPECÍFICO disponible (pop, chime, glitch,
 * scribble, liquid, metal…), no un whoosh genérico para todo. Whoosh/riser/impact/
 * click son el complemento (movimiento, anticipación, llegada, ritmo).
 *
 * MEZCLA (SKILL §10): TODOS los SFX van por DEBAJO de la voz y la música principal.
 * Los whooshes e impacts van aún más bajos (refuerzan el movimiento sin dominar).
 * Los `vol` por defecto están CALIBRADOS por pico real (dBFS) de cada archivo para
 * caer en el objetivo de su familia (ver TARGET_DBFS). Recalcúlalos con
 * `node manuales/diseno-sonoro/scripts/sfx.mjs medir` si cambias un archivo. Con narración encima, aplica ducking (DUCK_DIALOGUE_DB).
 */

/**
 * `type` = CLASE DE SINCRONIZACIÓN (cómo se ancla el sonido al targetFrame), no el
 * timbre. El timbre lo elige `variant`. Un mismo type sirve para muchas familias:
 *   whoosh  → movimiento/sweep: el pico cae ~65% dentro, en el targetFrame.
 *   riser   → anticipación: el crescendo TERMINA en el targetFrame.
 *   impact  → llegada/golpe: transiente con cola, empieza en el targetFrame.
 *   click   → ritmo/UI: transiente seco, en el frame exacto del cambio.
 *   texture → loop/ambiente/typing/data: SE EXTIENDE desde el targetFrame (usa fades).
 */
export type TipoSonido = "whoosh" | "riser" | "impact" | "click" | "texture";

export type VarianteSonido =
  // whoosh (movimiento / transición)
  | "light" | "whip" | "heavy" | "wind" | "swoosh" | "swoosh-hero"
  // riser (anticipación)
  | "low-rumble" | "cymbal"
  // impact (llegada / énfasis)
  | "deep" | "sharp" | "boom" | "metal"
  // click / UI (ritmo, interfaz)
  | "camera" | "mouse" | "pen" | "ui"
  // aparición elástica
  | "pop" | "boing"
  // notificación / mensajería / app
  | "notification" | "msg-send"
  // datos / tech / interfaz
  | "data" | "digital" | "glitch" | "electric" | "spin" | "typing"
  // ritmo / conteo
  | "tick"
  // acierto / error / dinero
  | "chime" | "success" | "error" | "money" | "coin"
  // materiales / trazo / partículas
  | "scribble" | "paper" | "liquid" | "sparkle"
  // logo / cierre-inverso / cómico / ambiente
  | "logo" | "reverse" | "cartoon" | "ambient-wind";

// ── Mezcla (SKILL §10) ─────────────────────────────────────────────────────────

/** Conversión dBFS → ganancia lineal para `<Audio volume>` (0–1). −6 dB ≈ 0.5. */
export const dbToGain = (db: number): number => Math.min(1, Math.pow(10, db / 20));

/**
 * Objetivo de PICO (dBFS) por familia de mezcla (más negativo = más bajo).
 * Todos por debajo de la voz/música; whoosh e impact aún más bajos; ambiente el mínimo.
 * (Rangos pedidos: generales −18…−24 · whoosh/impact −24…−30 · ambiente −26…−34.)
 */
export const TARGET_DBFS = { general: -21, whoosh: -27, impact: -27, ambient: -30 } as const;
export type MixBucket = keyof typeof TARGET_DBFS;

/** Reducción EXTRA de los SFX cuando hay narración encima (SKILL §10): 3–6 dB → 4.5. */
export const DUCK_DIALOGUE_DB = -4.5;

export type SoundCue = {
  id: string;
  type: TipoSonido;
  variant: VarianteSonido;
  variantIndex?: number; // elige una alterna del POOL[variant] para no repetir (§12)
  startFrame: number;
  targetFrame: number;
  durationInFrames: number;
  volume: number; // ganancia lineal 0–1 (ya calibrada al objetivo dBFS de la familia)
  underDialogue?: boolean; // el efecto cae sobre la voz → aplica ducking extra
  pan?: number; // metadato: Remotion <Audio> no aplica paneo estéreo nativo
  direction?: "left" | "right" | "up" | "down" | "neutral"; // metadato de dirección
  fadeInFrames?: number;
  fadeOutFrames?: number;
  loopable?: boolean; // el archivo tolera loop (texturas continuas)
  hasLongTail?: boolean; // cola larga que puede invadir la escena siguiente
  priority: "low" | "medium" | "high";
  reason: string; // OBLIGATORIO: si no puedes justificarlo, no lo agregues
};

/**
 * Variante → archivo en public/sfx/ + volumen calibrado + familia de mezcla + familia sonora.
 * `vol` = ganancia lineal para que el PICO del archivo caiga en TARGET_DBFS[bucket]
 *   (derivado del pico real medido con ffmpeg: `sfx.mjs medir` lo mide y sugiere el vol).
 * `bucket` = familia de mezcla (general | whoosh | impact | ambient).
 * `cat` = FAMILIA SONORA: qué timbre es y cómo está construido, para elegir o
 *   sintetizar otra variante del mismo carácter. No se lee en ejecución.
 * Para cambiar un sonido: pon otro archivo en public/sfx/ con el mismo nombre y
 * recalcula `vol` (node manuales/diseno-sonoro/scripts/sfx.mjs medir <archivo>).
 */
export const SFX: Record<VarianteSonido, { file: string; vol: number; bucket: MixBucket; cat: string }> = {
  // whoosh / transición (bucket whoosh → más bajo)
  light: { file: "whoosh-light.wav", vol: 0.062, bucket: "whoosh", cat: "whoosh ligero: barrido corto de ruido filtrado" },
  whip: { file: "whoosh-whip.wav", vol: 0.05, bucket: "whoosh", cat: "whoosh látigo: barrido rápido y agudo" },
  heavy: { file: "whoosh-heavy.mp3", vol: 0.045, bucket: "whoosh", cat: "whoosh pesado: barrido grave con cuerpo" },
  wind: { file: "whoosh-wind.wav", vol: 0.06, bucket: "whoosh", cat: "whoosh de viento: barrido suave y ancho" },
  swoosh: { file: "swoosh.mp3", vol: 0.06, bucket: "whoosh", cat: "swoosh: barrido agudo y brillante" },
  "swoosh-hero": { file: "whoosh-swoosh-07.wav", vol: 0.068, bucket: "whoosh", cat: "swoosh largo: barrido ancho para un movimiento protagonista" }, // whoosh largo: cue de ~48 f, el pico cae al 65 %
  // riser (bucket general)
  "low-rumble": { file: "riser-low.mp3", vol: 0.653, bucket: "general", cat: "riser grave: retumbo que crece hasta el golpe" },
  cymbal: { file: "riser-cymbal.mp3", vol: 0.155, bucket: "general", cat: "riser de platillo: crescendo agudo" },
  // impact (bucket impact → más bajo)
  deep: { file: "impact-deep.mp3", vol: 0.047, bucket: "impact", cat: "impacto grave: sub + golpe con cola" },
  sharp: { file: "impact-sharp.wav", vol: 0.054, bucket: "impact", cat: "impacto seco: transiente agudo corto" },
  boom: { file: "impact-deep.mp3", vol: 0.047, bucket: "impact", cat: "impacto grave: alias de deep" }, // alias grave (comparte archivo con deep)
  metal: { file: "metal.wav", vol: 0.045, bucket: "impact", cat: "golpe metálico: parciales inarmónicos con cola" },
  // click / UI (bucket general)
  camera: { file: "click-camera.wav", vol: 0.092, bucket: "general", cat: "clic de obturador: doble transiente" },
  mouse: { file: "click-mouse.mp3", vol: 0.155, bucket: "general", cat: "clic de ratón: transiente seco" },
  pen: { file: "click-pen.mp3", vol: 0.094, bucket: "general", cat: "clic de bolígrafo: doble clic seco" },
  ui: { file: "ui.mp3", vol: 0.2, bucket: "general", cat: "blip de interfaz: tono breve" },
  // aparición elástica
  pop: { file: "pop.mp3", vol: 0.178, bucket: "general", cat: "pop: tono con caída rápida" },
  boing: { file: "boing.mp3", vol: 0.089, bucket: "general", cat: "muelle: tono con vibrato descendente" },
  // notificación / app
  notification: { file: "notification.wav", vol: 0.331, bucket: "general", cat: "notificación: dos notas con cola" },
  "msg-send": { file: "msg-send.wav", vol: 0.09, bucket: "general", cat: "envío de mensaje: barrido ascendente corto" },
  // datos / tech
  data: { file: "data-count.mp3", vol: 0.26, bucket: "general", cat: "contador digital: pulsos en bucle" },
  digital: { file: "digital.wav", vol: 0.116, bucket: "general", cat: "barrido digital: tono modulado y triturado" },
  glitch: { file: "glitch.wav", vol: 0.955, bucket: "general", cat: "glitch: ráfagas de ruido troceado" },
  electric: { file: "electric.mp3", vol: 0.107, bucket: "general", cat: "chispazo eléctrico: zumbido con trémolo" },
  spin: { file: "spin.wav", vol: 0.335, bucket: "general", cat: "giro: textura con trémolo rápido" },
  typing: { file: "typing.mp3", vol: 0.221, bucket: "general", cat: "tecleo: ráfagas rítmicas de ruido" },
  // ritmo
  tick: { file: "tick.mp3", vol: 0.151, bucket: "general", cat: "tic-tac: pulsos cada segundo" },
  // acierto / error / dinero
  chime: { file: "chime.mp3", vol: 0.164, bucket: "general", cat: "campanilla: armónicos con cola" },
  success: { file: "success.wav", vol: 0.093, bucket: "general", cat: "acierto: arpegio ascendente" },
  error: { file: "error.mp3", vol: 0.248, bucket: "general", cat: "error: dos tonos descendentes" },
  money: { file: "money.mp3", vol: 0.145, bucket: "general", cat: "caja registradora: golpe + tintineo" },
  coin: { file: "coin.mp3", vol: 0.089, bucket: "general", cat: "moneda 8-bit: onda cuadrada" },
  // materiales / trazo / partículas
  scribble: { file: "scribble.mp3", vol: 0.123, bucket: "general", cat: "trazo de lápiz: ruido modulado" },
  paper: { file: "paper.wav", vol: 0.089, bucket: "general", cat: "papel: roce corto" },
  liquid: { file: "liquid.mp3", vol: 0.116, bucket: "general", cat: "gota: tono con glide" },
  sparkle: { file: "sparkle.mp3", vol: 0.184, bucket: "general", cat: "destellos: tonos agudos en cascada" },
  // logo / inverso / cómico / ambiente
  logo: { file: "logo.mp3", vol: 0.115, bucket: "general", cat: "logo: sub + acorde + brillo" },
  reverse: { file: "reverse.mp3", vol: 0.148, bucket: "general", cat: "succión inversa: barrido invertido" },
  cartoon: { file: "cartoon.mp3", vol: 0.38, bucket: "general", cat: "silbato cómico: tono descendente con vibrato" },
  "ambient-wind": { file: "ambient-wind.mp3", vol: 0.068, bucket: "ambient", cat: "viento ambiental: ruido grave en bucle" },
};

/**
 * Variantes ALTERNAS para NO repetir el mismo archivo en cortes consecutivos (SKILL §12).
 * Índice 0 = archivo base (= SFX[variant]). Cada entrada trae su `vol` ya calibrado.
 * Úsalo con `variantIndex` en el cue (o `rotarPorFamilia` para alternar automáticamente).
 */
export const POOL: Partial<Record<VarianteSonido, { file: string; vol: number }[]>> = {
  pop: [
    { file: "pop.mp3", vol: 0.178 },
    { file: "pop-02.mp3", vol: 0.417 },
    { file: "pop-03.mp3", vol: 0.363 },
  ],
  glitch: [
    { file: "glitch.wav", vol: 0.955 },
    { file: "glitch-02.wav", vol: 0.117 },
    { file: "glitch-03.wav", vol: 0.184 },
  ],
  light: [
    { file: "whoosh-light.wav", vol: 0.062 },
    { file: "whoosh-light-02.wav", vol: 0.056 },
    { file: "whoosh-light-03.wav", vol: 0.048 },
  ],
  swoosh: [
    { file: "swoosh.mp3", vol: 0.06 },
    { file: "swoosh-02.wav", vol: 0.076 },
    { file: "swoosh-03.wav", vol: 0.085 },
  ],
  metal: [
    { file: "metal.wav", vol: 0.045 },
    { file: "metal-02.wav", vol: 0.046 },
    { file: "metal-03.wav", vol: 0.045 },
  ],
  mouse: [
    { file: "click-mouse.mp3", vol: 0.155 },
    { file: "click-mouse-02.mp3", vol: 0.115 },
    { file: "click-mouse-03.mp3", vol: 0.136 },
  ],
  sparkle: [
    { file: "sparkle.mp3", vol: 0.184 },
    { file: "sparkle-02.mp3", vol: 0.138 },
    { file: "sparkle-03.wav", vol: 0.178 },
  ],
  chime: [
    { file: "chime.mp3", vol: 0.164 },
    { file: "chime-02.mp3", vol: 0.209 },
    { file: "chime-03.mp3", vol: 0.089 },
  ],
};

/** Resuelve {file, vol} de una variante, eligiendo del POOL si hay `variantIndex`. */
export function resolveSound(variant: VarianteSonido, variantIndex?: number): { file: string; vol: number } {
  const pool = POOL[variant];
  if (pool && pool.length > 0) {
    const n = pool.length;
    const i = (((variantIndex ?? 0) % n) + n) % n;
    return pool[i];
  }
  const s = SFX[variant];
  return { file: s.file, vol: s.vol };
}

/**
 * Sincroniza el MOMENTO RECONOCIBLE del sonido con el targetFrame (guía §3.1):
 * riser → fin del crescendo = target; whoosh → pico (~65% dentro);
 * impact/click → transiente al inicio; texture → arranca en el target y se extiende
 * (loops, ambientes, typing, data: dale duración larga + fades).
 */
export function startFromTarget(type: TipoSonido, targetFrame: number, durationInFrames: number): number {
  switch (type) {
    case "riser":
      return targetFrame - durationInFrames;
    case "whoosh":
      return targetFrame - Math.round(0.65 * durationInFrames);
    case "impact":
    case "click":
    case "texture":
    default:
      return targetFrame;
  }
}

/** Crea un SoundCue sincronizado al targetFrame (startFrame y volume por defecto). */
export function cue(
  id: string,
  type: TipoSonido,
  variant: VarianteSonido,
  targetFrame: number,
  durationInFrames: number,
  reason: string,
  // `Omit` de lo que ya es posicional: antes era `Partial<SoundCue>` a secas y
  // el `...opts` iba AL FINAL, así que `opts.id`/`opts.type`/`opts.targetFrame`
  // pisaban en silencio al argumento con nombre. Y un `{volume: undefined}`
  // explícito dejaba `volume` en undefined → `<Audio volume={NaN}>`.
  opts: Partial<Omit<SoundCue, "id" | "type" | "variant" | "targetFrame" | "durationInFrames" | "reason">> = {}
): SoundCue {
  return {
    // El spread PRIMERO: los campos de abajo (los del builder) siempre ganan.
    ...opts,
    id,
    type,
    variant,
    targetFrame,
    durationInFrames,
    startFrame: opts.startFrame ?? startFromTarget(type, targetFrame, durationInFrames),
    // volumen ya calibrado al objetivo dBFS de la familia (del POOL si hay variantIndex)
    volume: opts.volume ?? resolveSound(variant, opts.variantIndex).vol,
    priority: opts.priority ?? "medium",
    reason,
  };
}
