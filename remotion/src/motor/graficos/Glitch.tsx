import { AbsoluteFill, random, useCurrentFrame } from "remotion";
import { alfa } from "./estilos";

/**
 * GLITCH — corrupción de señal como recurso PUNTUAL.
 * Guía: manuales/motion-graphics/SKILL.md · sonido: variante `glitch` (hay 3 en
 * el POOL: alterna con `variantIndex` para que dos ráfagas no suenen igual).
 *
 * CUÁNDO: en el hook (0.3-0.6 s), en el logo, o justo en la palabra que rompe
 * la expectativa. NUNCA de fondo continuo: el glitch permanente deja de
 * significar "algo falla" y pasa a ser ruido que cansa en 3 segundos.
 *
 * Cuatro capas que juntas venden el efecto (por separado, ninguna convence):
 *   1. Separación de canales RGB — la firma visual del vídeo analógico roto.
 *      Se hace con `feColorMatrix` (SVG) aislando R y B, y superponiendo las
 *      copias desplazadas en `mix-blend-mode: screen`.
 *   2. Troceado horizontal — bandas recortadas con `clip-path` y desplazadas.
 *   3. Temblor — micro-traslación y skew del conjunto.
 *   4. Líneas de barrido — trama fina que recorre la imagen.
 *
 * DETERMINISMO Y RITMO: la intensidad no es aleatoria por frame sino por BLOQUE
 * de `grano` frames (3 por defecto). Un valor nuevo cada frame a 25 fps es ruido
 * blanco ilegible; sostener cada valor 3 frames es lo que se lee como "salto de
 * señal". Todo sale de `random(semilla)` → idéntico en cada render.
 */

/**
 * Intensidad 0→1 del glitch en este frame. Sube por ráfagas: la mayoría de
 * bloques quedan por debajo del umbral (imagen limpia) y unos pocos disparan.
 * `densidad` 0.2 ≈ una ráfaga cada cinco bloques.
 */
export const pulsoGlitch = (frame: number, semilla: string, densidad: number, grano = 3): number => {
  const bloque = Math.floor(frame / grano);
  const v = random(`${semilla}-${bloque}`);
  return v < densidad ? 0.35 + random(`${semilla}-i-${bloque}`) * 0.65 : 0;
};

/**
 * Matrices de canal (SVG). Aíslan el ROJO por un lado y el CIAN (verde+azul)
 * por otro, para poder desplazarlos en direcciones opuestas y recomponerlos en
 * `screen` — R + GB vuelve a dar blanco donde coinciden, y deja franja de color
 * donde no. Es la definición literal de la aberración cromática.
 *
 * `colorInterpolationFilters="sRGB"` es obligatorio: por defecto los filtros SVG
 * operan en linearRGB y los colores salen lavados respecto a lo que ves en CSS.
 *
 * Funciona sobre CUALQUIER hijo (texto, imagen, vídeo, un grupo entero), que es
 * justo lo que no se consigue heredando `color`: un <Titular> trae su color en
 * su propio style y no lo hereda de nadie.
 */
const FiltrosCanal: React.FC<{ id: string }> = ({ id }) => (
  <svg width={0} height={0} style={{ position: "absolute" }} aria-hidden>
    <defs>
      <filter id={`${id}-r`} colorInterpolationFilters="sRGB">
        <feColorMatrix type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" />
      </filter>
      <filter id={`${id}-c`} colorInterpolationFilters="sRGB">
        <feColorMatrix type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" />
      </filter>
    </defs>
  </svg>
);

/** Una copia del contenido, aislada a un canal y desplazada en horizontal. */
const CopiaCanal: React.FC<{ id: string; canal: "r" | "c"; dx: number; children: React.ReactNode }> = ({
  id,
  canal,
  dx,
  children,
}) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      filter: `url(#${id}-${canal})`,
      mixBlendMode: "screen",
      transform: `translateX(${dx}px)`,
      pointerEvents: "none",
    }}
  >
    {children}
  </div>
);

/**
 * Envuelve cualquier contenido y lo corrompe durante la ventana [at, at+dur).
 * Fuera de esa ventana el hijo se renderiza intacto y sin coste añadido.
 *
 * `intensidad` escala TODO (desplazamientos, troceado, temblor). 1 es fuerte;
 * para un logo de marca 0.5-0.7 suele ser suficiente.
 */
export const Glitch: React.FC<{
  children: React.ReactNode;
  at?: number;
  dur?: number;
  intensidad?: number;
  densidad?: number;
  grano?: number;
  semilla?: string;
  cortes?: number;
  scanlines?: boolean;
}> = ({
  children,
  at = 0,
  dur = 20,
  intensidad = 1,
  densidad = 0.45,
  grano = 3,
  semilla = "glitch",
  cortes = 4,
  scanlines = true,
}) => {
  const frame = useCurrentFrame();
  const dentro = frame >= at && frame < at + dur;
  const g = dentro ? pulsoGlitch(frame - at, semilla, densidad, grano) * intensidad : 0;

  if (g <= 0) return <>{children}</>;

  const bloque = Math.floor((frame - at) / grano);
  const r = (k: string) => random(`${semilla}-${k}-${bloque}`);
  const dx = (r("dx") - 0.5) * 40 * g;
  const dy = (r("dy") - 0.5) * 10 * g;
  const sesgo = (r("sk") - 0.5) * 2.2 * g;
  // Separación mínima garantizada: con un desplazamiento de ±2 px la franja de
  // color no se ve y la ráfaga parece solo un temblor.
  const sep = (4 + r("sep") * 18) * g;
  const id = `glitch-${semilla}`;

  return (
    <div style={{ position: "relative", transform: `translate(${dx}px, ${dy}px) skewX(${sesgo}deg)` }}>
      <FiltrosCanal id={id} />

      {/* Base */}
      <div>{children}</div>

      {/* Canal rojo a un lado y cian al otro: donde coinciden vuelve a ser blanco. */}
      <CopiaCanal id={id} canal="r" dx={-sep}>
        {children}
      </CopiaCanal>
      <CopiaCanal id={id} canal="c" dx={sep}>
        {children}
      </CopiaCanal>

      {/* Troceado: bandas recortadas y desplazadas en horizontal. */}
      {Array.from({ length: cortes }, (_, i) => {
        const y = r(`y${i}`) * 100;
        const h = 4 + r(`h${i}`) * 12;
        const off = (r(`o${i}`) - 0.5) * 90 * g;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              inset: 0,
              clipPath: `inset(${y}% 0 ${Math.max(0, 100 - y - h)}% 0)`,
              transform: `translateX(${off}px)`,
              pointerEvents: "none",
            }}
          >
            {children}
          </div>
        );
      })}

      {scanlines ? <Scanlines opacidad={0.18 * g} /> : null}
    </div>
  );
};

/**
 * Trama de líneas de barrido, con desplazamiento vertical continuo.
 * También vale suelta, sin glitch, como textura de "pantalla" sobre una UI.
 * Muy baja opacidad: a 0.2 ya es un efecto, a 0.5 tapa el contenido.
 */
export const Scanlines: React.FC<{ opacidad?: number; paso?: number; velocidad?: number; color?: string }> = ({
  opacidad = 0.14,
  paso = 4,
  velocidad = 0.6,
  color = "#000000",
}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        backgroundImage: `repeating-linear-gradient(0deg, ${alfa(color, 0.9)} 0 1px, transparent 1px ${paso}px)`,
        backgroundPositionY: (frame * velocidad) % paso,
        opacity: opacidad,
        pointerEvents: "none",
      }}
    />
  );
};

/**
 * Aberración cromática constante y suave (sin troceado ni temblor).
 * Es el "glitch de reposo": da textura analógica a un título sin gritar.
 * `separacion` en px; 2-4 basta. Si se nota conscientemente, es demasiado.
 */
export const Aberracion: React.FC<{ children: React.ReactNode; separacion?: number; id?: string }> = ({
  children,
  separacion = 3,
  id = "aberracion",
}) => (
  <div style={{ position: "relative" }}>
    <FiltrosCanal id={id} />
    <div style={{ position: "relative" }}>{children}</div>
    <CopiaCanal id={id} canal="r" dx={-separacion}>
      {children}
    </CopiaCanal>
    <CopiaCanal id={id} canal="c" dx={separacion}>
      {children}
    </CopiaCanal>
  </div>
);
