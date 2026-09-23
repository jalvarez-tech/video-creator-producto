import { Audio, interpolate, Sequence, staticFile } from "remotion";
import { DUCK_DIALOGUE_DB, dbToGain, resolveSound, SoundCue } from "./cues";

/** Ducking total (dB) de un cue: extra si cae sobre la voz + ducking global de narración. */
const duckOffsetDb = (cue: SoundCue, globalDuckDb: number): number =>
  (cue.underDialogue ? DUCK_DIALOGUE_DB : 0) + globalDuckDb;

const CueAudio: React.FC<{ cue: SoundCue; globalDuckDb: number }> = ({ cue, globalDuckDb }) => {
  const { file } = resolveSound(cue.variant, cue.variantIndex);
  const dur = cue.durationInFrames;
  const fi = cue.fadeInFrames ?? 0;
  const fo = cue.fadeOutFrames ?? 0;
  const duck = dbToGain(duckOffsetDb(cue, globalDuckDb)); // ≤ 1 (dB ≤ 0)
  const base = cue.volume * duck;
  return (
    <Sequence from={cue.startFrame} durationInFrames={dur} name={`sfx:${cue.variant}`}>
      <Audio
        src={staticFile(`sfx/${file}`)}
        volume={(f) => {
          const inV = fi > 0 ? interpolate(f, [0, fi], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
          const outV = fo > 0 ? interpolate(f, [dur - fo, dur], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
          return Math.max(0, base * Math.min(inV, outV));
        }}
      />
    </Sequence>
  );
};

/**
 * Reproduce una lista de SoundCue sincronizados por frame (con fades, volumen y ducking).
 * Colócalo dentro de la composición, por ENCIMA del vídeo/voz:
 *   <PistaSonido cues={cues} />                    // sin narración continua
 *   <PistaSonido cues={cues} duckDb={-4.5} />      // clip con narración: baja TODOS los SFX
 * La voz del avatar (OffthreadVideo) sigue mandando. `duckDb` (negativo) reduce todos los
 * SFX mientras hay narración; además cada cue con `underDialogue` recibe una reducción extra.
 */
export const PistaSonido: React.FC<{ cues: SoundCue[]; duckDb?: number }> = ({ cues, duckDb = 0 }) => (
  <>
    {cues.map((c) => (
      <CueAudio key={c.id} cue={c} globalDuckDb={duckDb} />
    ))}
  </>
);
