/**
 * Cámara virtual para avatar — tokens + tipo + hook determinista.
 * Equivale a motion.ts (movimiento de gráficos) y sound/cues.ts (sonido): la
 * DECISIÓN reusable ya tomada. Guía humana: manuales/camara-avatar/SKILL.md.
 *
 * Idea: el avatar es una BASE visual estable; una cámara virtual la reencuadra
 * (zoom + desplazamiento) para recuperar atención, reforzar una idea o liberar
 * espacio. Nunca se mueve solo "para que no parezca estático".
 *
 * ⚠️ El avatar es un <OffthreadVideo> con objectFit:"cover": a scale 1.0 YA llena
 * el frame EXACTO. De ahí dos invariantes que este motor garantiza:
 *   1) scale NUNCA baja de 1.0 → por debajo se verían bordes negros.
 *      (El "plano abierto" de un cover NO es scale<1; es la base 1.0.)
 *   2) El desplazamiento (x,y) está ACOPLADO al zoom: solo puedes reencuadrar
 *      dentro del margen que crea el zoom. clampOffset() lo recorta por ti.
 *
 * Determinismo: todo se deriva de useCurrentFrame()/useVideoConfig(). Nada de
 * Date.now(), Math.random(), timers ni CSS animation/transition. Anima SOLO
 * transform (translate3d + scale): rendimiento y misma salida entre renders.
 */
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export type Shot = "wide" | "medium" | "close" | "detail";
export type CameraEasing = "linear" | "ease-in" | "ease-out" | "ease-in-out" | "spring";
export type CameraPurpose =
  | "hook"
  | "emphasis"
  | "question"
  | "explanation"
  | "make-space"
  | "transition"
  | "reveal"
  | "cta";

/**
 * Rango de escala por tipo de plano. `min`/`max` son puntos de partida; el valor
 * exacto lo elige la intención de la frase. NOTA: `wide` es 1.0 (la base del
 * cover), no <1 — ver invariante 1 arriba. `detail` solo para hooks/máxima
 * importancia; por encima corta cara, cabeza o manos.
 */
export const SHOT: Record<Shot, { min: number; max: number }> = {
  wide: { min: 1.0, max: 1.0 },
  medium: { min: 1.05, max: 1.12 },
  close: { min: 1.15, max: 1.28 },
  detail: { min: 1.3, max: 1.35 },
};

/** Límites duros de seguridad (no cruzarlos, aunque un cue lo pida). */
export const LIMITS = {
  scaleMax: 1.35, // más allá corta cara/manos
  panPctMax: 0.14, // desplazamiento máx como fracción del ancho/alto (spec §4: 4–14%)
} as const;

/** Escala media recomendada de un plano (punto de partida rápido). */
export const escalaDe = (shot: Shot): number => (SHOT[shot].min + SHOT[shot].max) / 2;

/**
 * Un movimiento de cámara con FUNCIÓN narrativa. `reason` es OBLIGATORIO: si no
 * puedes justificar el movimiento, no lo agregues (la cámara quieta es válida).
 * startFrame/endFrame y x/y van en frames y px a la resolución/fps de la comp
 * (avatar 9:16 = 25 fps · 1080×1920 · avatar 16:9 = 30 fps · 1920×1080).
 */
export type CameraCue = {
  id: string;
  startFrame: number;
  /**
   * ⚠️ Con `easing: "spring"` este valor NO se usa: la duración del movimiento
   * la dicta el muelle, no la ventana (ver `progresoCamara`). Sigue marcando el
   * final lógico del cue para leer el plan, pero si quieres controlar cuánto
   * dura el movimiento, usa un easing de interpolación.
   */
  endFrame: number;
  shot: Shot;
  startScale: number;
  endScale: number;
  startX: number;
  endX: number;
  startY: number;
  endY: number;
  easing: CameraEasing;
  purpose: CameraPurpose;
  soundCueId?: string; // enlaza con un SoundCue (whoosh/impact/riser) de cues.ts
  reason: string;
};

const EASING_FN: Record<Exclude<CameraEasing, "spring">, (t: number) => number> = {
  linear: Easing.linear,
  "ease-in": Easing.in(Easing.cubic),
  "ease-out": Easing.out(Easing.cubic),
  "ease-in-out": Easing.inOut(Easing.cubic),
};

/**
 * Progreso 0→1 del cue en `frame`, con su easing. El spring usa damping alto:
 * una cámara ATERRIZA suave, no rebota (un rebote se lee como golpe, no como
 * cámara). Para el resto, interpolación con clamp entre start/endFrame.
 */
export function progresoCamara(frame: number, cue: CameraCue, fps: number): number {
  if (cue.easing === "spring") {
    return spring({
      frame: frame - cue.startFrame,
      fps,
      config: { damping: 200, mass: 1, stiffness: 100 }, // aterrizaje sin rebote
    });
  }
  return interpolate(frame, [cue.startFrame, cue.endFrame], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASING_FN[cue.easing],
  });
}

/**
 * Recorta (x,y) al margen que el zoom deja disponible en un vídeo cover W×H.
 * A escala s hay (s-1)·W/2 px de margen horizontal antes de mostrar borde negro;
 * además nunca supera LIMITS.panPctMax. Por eso un desplazamiento GRANDE exige
 * MÁS zoom: para llegar al 14% del ancho necesitas scale ≳ 1.28.
 */
export function clampOffset(
  x: number,
  y: number,
  scale: number,
  width: number,
  height: number
): { x: number; y: number } {
  const margenX = Math.max(0, ((scale - 1) * width) / 2);
  const margenY = Math.max(0, ((scale - 1) * height) / 2);
  const topeX = Math.min(margenX, LIMITS.panPctMax * width);
  const topeY = Math.min(margenY, LIMITS.panPctMax * height);
  return {
    x: Math.max(-topeX, Math.min(topeX, x)),
    y: Math.max(-topeY, Math.min(topeY, y)),
  };
}

export type CamaraEstado = { scale: number; x: number; y: number; transform: string };

/**
 * Estado de cámara en el frame actual dado un PLAN de cues.
 * Continuidad (match cut, sin saltos): entre cues la cámara SE QUEDA donde
 * aterrizó el último cue (su pose final); antes del primer cue, en identidad
 * (scale 1, sin desplazamiento). El cue "ganador" es el último cuyo startFrame
 * ya pasó; su progreso se satura a 1 tras endFrame → mantiene la pose.
 */
export function useCamara(cues: CameraCue[]): CamaraEstado {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  let scale = 1;
  let x = 0;
  let y = 0;

  const ordenados = [...cues].sort((a, b) => a.startFrame - b.startFrame);
  for (const cue of ordenados) {
    if (frame < cue.startFrame) break;
    const p = progresoCamara(frame, cue, fps);
    scale = interpolate(p, [0, 1], [cue.startScale, cue.endScale]);
    x = interpolate(p, [0, 1], [cue.startX, cue.endX]);
    y = interpolate(p, [0, 1], [cue.startY, cue.endY]);
  }

  const s = Math.max(1, Math.min(scale, LIMITS.scaleMax));
  const off = clampOffset(x, y, s, width, height);
  return {
    scale: s,
    x: off.x,
    y: off.y,
    transform: `translate3d(${off.x}px, ${off.y}px, 0) scale(${s})`,
  };
}

/**
 * Builder breve de un CameraCue (como cue() para el sonido). Rellena start/end
 * de escala y offset; el shot solo etiqueta la intención del plano.
 *   cam("cam-hook", 0, 20, "medium", { s: 1.0 }, { s: 1.16, y: -6 }, "ease-out",
 *       "hook", "El acercamiento refuerza la pregunta inicial");
 */
export function cam(
  id: string,
  startFrame: number,
  endFrame: number,
  shot: Shot,
  from: { s?: number; x?: number; y?: number },
  to: { s?: number; x?: number; y?: number },
  easing: CameraEasing,
  purpose: CameraPurpose,
  reason: string,
  opts: Partial<Pick<CameraCue, "soundCueId">> = {}
): CameraCue {
  return {
    id,
    startFrame,
    endFrame,
    shot,
    startScale: from.s ?? 1,
    endScale: to.s ?? from.s ?? 1,
    startX: from.x ?? 0,
    endX: to.x ?? from.x ?? 0,
    startY: from.y ?? 0,
    endY: to.y ?? from.y ?? 0,
    easing,
    purpose,
    reason,
    ...opts,
  };
}
