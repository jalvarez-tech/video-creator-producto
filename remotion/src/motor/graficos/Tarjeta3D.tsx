import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Muelle, SPRING } from "../motion";
import { alfa, FONT, G, SOMBRA } from "./estilos";

/**
 * CAPA 3D (CSS) — volteos, inclinaciones y profundidad real.
 * Guía: manuales/motion-graphics/SKILL.md · sonido: `swoosh`/`whip` en el giro,
 * `impact`/`metal` al aterrizar la cara nueva.
 *
 * Aquí no hay WebGL ni Three.js: es el motor 3D del navegador, que Chrome ya
 * resuelve en GPU durante el render. Tres piezas y ni una más:
 *
 *   1. `perspective` en el PADRE → define la distancia del ojo. Valor bajo
 *      (600 px) = gran angular, deformación fuerte; alto (2400) = teleobjetivo,
 *      casi ortogonal. Es el "objetivo" de tu cámara.
 *   2. `transformStyle: "preserve-3d"` → los hijos VIVEN en ese espacio 3D. Sin
 *      esto, cualquier rotación de un hijo se aplana contra el plano del padre.
 *   3. `backfaceVisibility: "hidden"` → la cara trasera desaparece al girar más
 *      de 90°: es lo que permite el volteo de dos caras con dos <div>.
 *
 * ⚠️ TRAMPA CLÁSICA: `filter`, `opacity < 1` y `overflow: hidden` en un elemento
 * con preserve-3d crean un contexto nuevo y APLANAN a los hijos. Si un giro
 * "deja de ser 3D" al añadir un blur o un fundido, es esto. Solución: pon el
 * filtro/opacidad en un envoltorio POR FUERA de la escena 3D.
 */

/**
 * Contenedor de escena 3D. Todo lo 3D va dentro; el `perspectiva` es la lente.
 * `origenPerspectiva` mueve el punto de fuga: centrarlo en el elemento que gira
 * evita la deformación en cuña de los objetos alejados del centro.
 */
export const Escena3D: React.FC<{
  children: React.ReactNode;
  perspectiva?: number;
  origenPerspectiva?: string;
  estilo?: React.CSSProperties;
}> = ({ children, perspectiva = 1400, origenPerspectiva = "50% 50%", estilo }) => (
  <div
    style={{
      perspective: perspectiva,
      perspectiveOrigin: origenPerspectiva,
      transformStyle: "preserve-3d",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: FONT,
      ...estilo,
    }}
  >
    {children}
  </div>
);

const caraBase: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 14,
  borderRadius: 34,
  padding: 40,
  backfaceVisibility: "hidden",
  boxShadow: SOMBRA.caja,
  border: `1px solid ${G.linea}`,
  textAlign: "center",
};

/**
 * Tarjeta de dos caras que se voltea. El uso canónico del 3D en una pieza de
 * marketing: "esto es lo que crees" → giro → "esto es lo que pasa".
 *
 * El giro usa `SPRING.flip` (motion.ts): un muelle con rebote CORTO. Un volteo
 * lineal se lee como transición de PowerPoint; con muelle, como objeto físico.
 *
 * El dorso va pre-rotado 180°: al girar el contenedor, la cara frontal se
 * esconde (backfaceVisibility) exactamente cuando el dorso queda de frente.
 */
export const Tarjeta3D: React.FC<{
  frente: React.ReactNode;
  dorso: React.ReactNode;
  at?: number;
  eje?: "y" | "x";
  ancho?: number;
  alto?: number;
  colorFrente?: string;
  colorDorso?: string;
  muelle?: Muelle;
}> = ({
  frente,
  dorso,
  at = 0,
  eje = "y",
  ancho = 760,
  alto = 460,
  colorFrente = G.tinta,
  colorDorso = G.tinta,
  muelle = SPRING.flip,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = spring({ frame: frame - at, fps, config: muelle });
  const grados = interpolate(e, [0, 1], [0, 180]);
  const r = eje === "y" ? `rotateY(${grados}deg)` : `rotateX(${grados}deg)`;
  // Se acerca un poco al ojo a mitad de giro: sin esto el volteo parece plano.
  const z = interpolate(e, [0, 0.5, 1], [0, 90, 0]);
  return (
    <div
      style={{
        width: ancho,
        height: alto,
        position: "relative",
        transformStyle: "preserve-3d",
        transform: `translateZ(${z}px) ${r}`,
      }}
    >
      <div style={{ ...caraBase, background: colorFrente }}>{frente}</div>
      <div
        style={{
          ...caraBase,
          background: colorDorso,
          transform: eje === "y" ? "rotateY(180deg)" : "rotateX(180deg)",
        }}
      >
        {dorso}
      </div>
    </div>
  );
};

/**
 * Panel que ENTRA desde el fondo con inclinación y se endereza.
 * Es el gesto de "aquí llega el dato": llega desde lejos (translateZ negativo)
 * girado, y aterriza recto y de frente. Mucho más presente que un fade.
 *
 * `reposo` deja una inclinación residual (2-4°) al terminar: un panel
 * perfectamente frontal parece una captura de pantalla; con 3° de sobra parece
 * un objeto en una sala.
 */
export const Panel3D: React.FC<{
  children: React.ReactNode;
  at?: number;
  desdeZ?: number;
  desdeRotY?: number;
  desdeRotX?: number;
  reposo?: number;
  ancho?: number;
  alto?: number;
  fondo?: string;
  muelle?: Muelle;
  brillo?: string;
}> = ({
  children,
  at = 0,
  desdeZ = -700,
  desdeRotY = 38,
  desdeRotX = 10,
  reposo = 3,
  ancho = 820,
  alto = 480,
  fondo = G.tinta,
  muelle = SPRING.tarjeta,
  brillo = G.teal,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = frame - at;
  const e = spring({ frame: f, fps, config: muelle });
  const op = interpolate(f, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const z = interpolate(e, [0, 1], [desdeZ, 0]);
  const ry = interpolate(e, [0, 1], [desdeRotY, reposo]);
  const rx = interpolate(e, [0, 1], [desdeRotX, 0]);
  return (
    // La opacidad va en un envoltorio EXTERIOR: si se pusiera en el panel, su
    // contexto 3D se aplanaría (ver trampa clásica arriba).
    <div style={{ opacity: op }}>
      <div
        style={{
          width: ancho,
          height: alto,
          borderRadius: 34,
          background: fondo,
          border: `1px solid ${G.linea}`,
          boxShadow: `${SOMBRA.caja}, 0 0 60px ${alfa(brillo.startsWith("#") ? brillo : "#FFFFFF", 0.18)}`,
          transformStyle: "preserve-3d",
          transform: `translateZ(${z}px) rotateY(${ry}deg) rotateX(${rx}deg)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 18,
          padding: 48,
          textAlign: "center",
          fontFamily: FONT,
        }}
      >
        {children}
      </div>
    </div>
  );
};

/**
 * Pila de capas separadas en profundidad (paralaje real, no simulado).
 * Cada hijo se coloca a su propio `translateZ`: al girar el conjunto, las capas
 * se desplazan entre sí solas — el efecto "diagrama que tiene grosor".
 *
 * `giro` es la amplitud del vaivén en grados; `periodo`, los frames del ciclo.
 * Con 4-6° ya se percibe volumen; más, y se convierte en un carrusel.
 */
export const Capas3D: React.FC<{
  children: React.ReactNode[];
  separacion?: number;
  giro?: number;
  periodo?: number;
  ancho?: number;
  alto?: number;
}> = ({ children, separacion = 90, giro = 6, periodo = 140, ancho = 700, alto = 700 }) => {
  const frame = useCurrentFrame();
  const ry = giro * Math.sin((frame / periodo) * 2 * Math.PI);
  const rx = giro * 0.4 * Math.cos((frame / periodo) * 2 * Math.PI);
  const n = children.length;
  return (
    <div
      style={{
        width: ancho,
        height: alto,
        position: "relative",
        transformStyle: "preserve-3d",
        transform: `rotateY(${ry}deg) rotateX(${rx}deg)`,
      }}
    >
      {children.map((hijo, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transformStyle: "preserve-3d",
            // capa 0 al fondo, la última al frente
            transform: `translateZ(${(i - (n - 1) / 2) * separacion}px)`,
          }}
        >
          {hijo}
        </div>
      ))}
    </div>
  );
};
