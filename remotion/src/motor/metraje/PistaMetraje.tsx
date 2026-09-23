/**
 * EL INTÉRPRETE DEL MONTAJE — `Corte[]` → JSX.
 *
 * Hermano de `<CamaraVirtual>` para piezas SIN avatar: no hay un sujeto al que
 * seguir, así que el movimiento ES el montaje. Qué sabe hacer un corte está en
 * `corte.ts`; aquí solo cómo se pinta.
 *
 * LAS CAPAS DE CADA CORTE, en orden de pintado:
 *   1. el medio (vídeo mudo o foto), con su punch-in y su corrección de clip
 *   2. el LOOK (velo cálido + grano + viñeta), igual para todos los cortes
 *   3. los VELOS, si la pieza pone texto encima: arriba y/o abajo
 *   4. el destello de una entrada propia y el fundido a negro, si los hay
 * …y la opacidad del plano entero mientras disuelve.
 *
 * LOS VELOS SON LA CAPA QUE SE OLVIDA, y la que más depende de la pieza. Sin
 * ellos un titular blanco no se lee sobre el humo blanco de unas alitas (009) y
 * el subtítulo inglés —el más pequeño, el más fino— desaparece en los planos
 * claros (010), y el fallo no sale hasta que se renderiza ese plano concreto.
 * Donde no hay texto sobran: solo apagarían el cielo y el vestido (011). Por eso
 * no hay velos por defecto: los pide la composición, que es quien sabe dónde va
 * su texto.
 *
 * EL VÍDEO VA SIEMPRE MUDO. El audio de cámara no entra por aquí: se quita en la
 * normalización (R19). Si una pieza necesita el sonido de un clip, va en su
 * propia capa de audio y con su volumen.
 */
import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  OffthreadVideo,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { Marca } from "../marca";
import {
  arranqueEnFuente,
  DESDE_NEGRO,
  lookDeMarca,
  solapeDe,
  type Corte,
  type EfectoDeEntrada,
  type EntradaDelFormato,
  type EntradaPropia,
  type LookMetraje,
  type Velo,
  type Velos,
} from "./corte";

const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const SIN_VELOS: Velos = {};
const SIN_EFECTO: EfectoDeEntrada = {};

/** `#RRGGBB` + alfa → `rgba(...)`, con el alfa recortado a [0, 1]. */
const alfa = (hex: string, a: number): string => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, a))})`;
};

/** Un velo como degradado desde su borde: `180deg` baja desde arriba, `0deg` sube desde abajo. */
const degradado = (velo: Velo, sentido: "180deg" | "0deg", negro: string, altoCuadro: number): string =>
  `linear-gradient(${sentido}, ${alfa(negro, velo.borde)} 0%, ${alfa(negro, velo.medio)} ${
    ((velo.alto * velo.parada) / altoCuadro) * 100
  }%, transparent ${((velo.alto / altoCuadro) * 100).toFixed(1)}%)`;

const Plano: React.FC<{
  corte: Corte<string>;
  look: LookMetraje;
  velos: Velos;
  /** Frames de transparencia al entrar (0 = no disuelve). */
  solape: number;
  /** La implementación de la entrada, si no es del formato. */
  propia: EntradaPropia | undefined;
}> = ({ corte, look, velos, solape, propia }) => {
  const f = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const g = corte.grado;
  const negro = look.negro ?? "#000000";
  const efecto = propia ? propia(f) : SIN_EFECTO;

  // Punch-in sobre la ventana COMPLETA (solape incluido): si el zoom empezara
  // al acabar la disolvencia, el plano daría un tirón justo al hacerse opaco.
  const escala = interpolate(f, [0, corte.dur + solape], [corte.zoom[0], corte.zoom[1]], CLAMP);
  const opacidad = solape > 0 ? interpolate(f, [0, solape], [0, 1], CLAMP) : 1;

  // Negro de entrada (abre un acto) y de salida (lo cierra). La salida se mide
  // desde `solape`, que es donde empieza el plano de verdad.
  const negroEntra = corte.entra === "negro" ? interpolate(f, [0, DESDE_NEGRO], [1, 0], CLAMP) : 0;
  const negroSale = corte.salidaNegro
    ? interpolate(f, [solape + corte.dur - corte.salidaNegro, solape + corte.dur], [0, 1], CLAMP)
    : 0;
  const fundido = Math.max(negroEntra, negroSale);

  // El ORDEN es el del oficio: primero se corrige el CLIP (`grado`) y solo
  // después se aplica el LOOK, igual para todos los cortes.
  const filtro = [
    `brightness(${((g?.exposicion ?? 1) * 100).toFixed(1)}%)`,
    `contrast(${((g?.contraste ?? 1) * look.contraste * 100).toFixed(1)}%)`,
    `saturate(${((g?.saturacion ?? 1) * look.saturacion * 100).toFixed(1)}%)`,
    efecto.borron ? `blur(${efecto.borron.toFixed(2)}px)` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const medio: React.CSSProperties = { width: "100%", height: "100%", objectFit: "cover", filter: filtro };
  const desplazamiento = efecto.x !== undefined ? `translateX(${efecto.x.toFixed(2)}px) ` : "";

  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: negro, opacity: opacidad }}>
      <AbsoluteFill
        style={{ transform: `${desplazamiento}translateY(${-(corte.pan ?? 0)}%) scale(${escala.toFixed(4)})` }}
      >
        {corte.tipo === "foto" ? (
          <Img src={staticFile(corte.src)} style={medio} />
        ) : (
          <OffthreadVideo
            src={staticFile(corte.src)}
            // `desde` va en SEGUNDOS de la fuente y `trimBefore` en frames de la
            // comp; `arranqueEnFuente` hace la cuenta, disolvencia incluida.
            trimBefore={Math.max(0, arranqueEnFuente(corte, solape, fps))}
            playbackRate={corte.velocidad ?? 1}
            muted
            style={medio}
          />
        )}
      </AbsoluteFill>

      {/* Velo cálido: el igualado más barato que existe. */}
      <AbsoluteFill
        style={{
          background: alfa(look.colorCalido, Math.max(0, Math.min(0.5, look.calido + (g?.calido ?? 0)))),
          mixBlendMode: "soft-light",
          pointerEvents: "none",
        }}
      />
      {/* Grano compartido: lo que hace que cámaras distintas se lean como una sola pieza. */}
      <AbsoluteFill
        style={{
          backgroundImage: `repeating-conic-gradient(${alfa("#8A8172", look.grano)} 0% 25%, transparent 0% 50%)`,
          backgroundSize: "6px 6px",
          pointerEvents: "none",
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 50%, transparent ${look.vinetaDesde ?? 55}%, ${alfa(
            "#000000",
            look.vineta
          )} 100%)`,
          pointerEvents: "none",
        }}
      />
      {velos.arriba ? (
        <AbsoluteFill style={{ background: degradado(velos.arriba, "180deg", negro, height), pointerEvents: "none" }} />
      ) : null}
      {velos.abajo ? (
        <AbsoluteFill style={{ background: degradado(velos.abajo, "0deg", negro, height), pointerEvents: "none" }} />
      ) : null}
      {efecto.destello ? (
        <AbsoluteFill
          style={{ backgroundColor: efecto.destello.color, opacity: efecto.destello.opacidad, pointerEvents: "none" }}
        />
      ) : null}
      {fundido > 0 ? (
        <AbsoluteFill style={{ backgroundColor: negro, opacity: fundido, pointerEvents: "none" }} />
      ) : null}
    </AbsoluteFill>
  );
};

/** De dónde sale el look: del canal o, en una pieza sin canal, escrito entero. */
type FuenteDelLook =
  | {
      /** El look sale del canal (`lookDeMarca`): su `metraje`, su acento y su negro. */
      marca: Marca;
      look?: undefined;
    }
  | {
      /** Pieza sin canal (una boda): el look se escribe en la composición. */
      look: LookMetraje;
      marca?: undefined;
    };

const resuelveLook = (fuente: FuenteDelLook): LookMetraje =>
  fuente.look !== undefined ? fuente.look : lookDeMarca(fuente.marca);

/**
 * Las entradas que los cortes usan y el formato no trae. Si hay alguna, su
 * implementación es OBLIGATORIA: un whip sin pintar no daría error, saldría
 * como un corte seco, que es justo el fallo que no se ve.
 */
type EntradasPropias<E extends string> = [Exclude<E, EntradaDelFormato>] extends [never]
  ? { entradas?: undefined }
  : { entradas: Readonly<Record<Exclude<E, EntradaDelFormato>, EntradaPropia>> };

export type PropsPistaMetraje<E extends string = EntradaDelFormato> = FuenteDelLook &
  EntradasPropias<E> & {
    cortes: readonly Corte<E>[];
    /** Degradados de legibilidad para el texto que vaya encima. Sin texto, ninguno. */
    velos?: Velos;
  };

export const PistaMetraje = <E extends string = EntradaDelFormato>(props: PropsPistaMetraje<E>) => {
  const look = resuelveLook(props);
  const { cortes, velos = SIN_VELOS } = props;
  // El tipo ya garantiza que están todas; aquí basta con buscarlas por nombre.
  const entradas: Readonly<Record<string, EntradaPropia | undefined>> =
    (props as { entradas?: Readonly<Record<string, EntradaPropia>> }).entradas ?? {};
  return (
    <>
      {cortes.map((c) => {
        // El plano vive de `en − solape` a `en + dur`: nada después. Si el
        // siguiente disuelve, lo hace ENCIMA de estos frames (ver `solapeDe`).
        const solape = solapeDe(c);
        return (
          <Sequence key={c.id} from={c.en - solape} durationInFrames={c.dur + solape} name={c.id}>
            <Plano corte={c} look={look} velos={velos} solape={solape} propia={c.entra ? entradas[c.entra] : undefined} />
          </Sequence>
        );
      })}
    </>
  );
};
