import { AbsoluteFill, useCurrentFrame } from "remotion";
import { alfa, G } from "./estilos";

/**
 * FONDOS Y CAPAS DE ATMÓSFERA — lo que va DEBAJO del contenido.
 * Guía: manuales/motion-graphics/SKILL.md (§jerarquía: ambient) ·
 * manuales/edicion-video/reglas.md (R08: fuera de la cara).
 *
 * Todas son capas `ambient`: se mueven poco o nada y NUNCA compiten con el
 * hero. Su función es dar profundidad y legibilidad, no llamar la atención.
 * Si una de estas capas se nota, está mal calibrada — baja la opacidad.
 *
 * Rendimiento: todo con gradientes CSS, no con SVG ni cientos de nodos. Un
 * fondo de rejilla hecho con 200 <div> cuesta más que la escena entera.
 */

/**
 * Oscurece un extremo para que el texto se lea encima del vídeo.
 * Es la capa MÁS usada del sistema y la única que se superpone al avatar
 * (Motion003 · ScrimInf). Con el avatar sin gradar y las manos gesticulando
 * justo en la banda de subtítulos, este degradado aporta todo el contraste.
 *
 * `opacidad` la controla la escena: entra en 3-4 frames (instantáneo se ve como
 * parpadeo negro) y SALE con el texto, de golpe — si se fundiera, los últimos
 * frames del sello se leerían sobre las manos.
 */
export const Scrim: React.FC<{
  opacidad?: number;
  alto?: number;
  desde?: "abajo" | "arriba";
  color?: string;
}> = ({ opacidad = 1, alto = 830, desde = "abajo", color = "#0E1015" }) => (
  <div
    style={{
      position: "absolute",
      bottom: desde === "abajo" ? 0 : undefined,
      top: desde === "arriba" ? 0 : undefined,
      left: 0,
      right: 0,
      height: alto,
      opacity: opacidad,
      background: `linear-gradient(${desde === "abajo" ? "0deg" : "180deg"}, ${alfa(color, 0.94)} 0%, ${alfa(
        color,
        0.92
      )} 58%, ${alfa(color, 0.58)} 80%, ${alfa(color, 0)} 100%)`,
      pointerEvents: "none",
    }}
  />
);

/**
 * Viñeta: oscurece los bordes y empuja el ojo al centro. Casi invisible a
 * simple vista y muy notable si la quitas — ese es el punto.
 */
export const Vineta: React.FC<{ intensidad?: number; corteInterior?: string }> = ({
  intensidad = 0.55,
  corteInterior = "55%",
}) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse at 50% 50%, transparent ${corteInterior}, rgba(0,0,0,${intensidad}) 100%)`,
      pointerEvents: "none",
    }}
  />
);

/**
 * Rejilla técnica (blueprint). Da sensación de "sistema / plano / dato" sin
 * dibujar nada. Opacidad muy baja por defecto: a 0.04 se percibe como textura;
 * a 0.15 ya es un elemento y roba atención.
 */
export const Rejilla: React.FC<{ color?: string; opacidad?: number; paso?: number; grosor?: number }> = ({
  color = G.teal,
  opacidad = 0.05,
  paso = 60,
  grosor = 1,
}) => {
  const c = alfa(color.startsWith("#") ? color : "#FFFFFF", opacidad);
  return (
    <AbsoluteFill
      style={{
        backgroundImage: `repeating-linear-gradient(0deg, ${c} 0 ${grosor}px, transparent ${grosor}px ${paso}px), repeating-linear-gradient(90deg, ${c} 0 ${grosor}px, transparent ${grosor}px ${paso}px)`,
        pointerEvents: "none",
      }}
    />
  );
};

/** Trama de puntos: la variante "suave" de la rejilla (menos técnica, más textil). */
export const Puntos: React.FC<{ color?: string; opacidad?: number; paso?: number; radio?: number }> = ({
  color = G.white,
  opacidad = 0.08,
  paso = 44,
  radio = 2,
}) => {
  const c = alfa(color.startsWith("#") ? color : "#FFFFFF", opacidad);
  return (
    <AbsoluteFill
      style={{
        backgroundImage: `radial-gradient(${c} ${radio}px, transparent ${radio}px)`,
        backgroundSize: `${paso}px ${paso}px`,
        pointerEvents: "none",
      }}
    />
  );
};

/**
 * Foco de luz de color detrás del contenido: "la sala" en la que ocurre la
 * escena. Cambiar `cx/cy` entre escenas da continuidad (misma sala, otro
 * ángulo) — es el recurso de Fondo003 generalizado.
 *
 * `pulso` respira MUY despacio (periodo por defecto ~3 s). Es la única capa a
 * la que se le permite moverse sola, porque a esa amplitud el ojo lo lee como
 * aire, no como animación.
 */
export const Resplandor: React.FC<{
  color?: string;
  cx?: number;
  cy?: number;
  radio?: number;
  intensidad?: number;
  pulso?: number;
  periodo?: number;
}> = ({ color = G.teal, cx = 50, cy = 34, radio = 58, intensidad = 0.12, pulso = 0, periodo = 90 }) => {
  const frame = useCurrentFrame();
  const i = intensidad + (pulso > 0 ? pulso * Math.sin((frame / periodo) * 2 * Math.PI) : 0);
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(${radio}% ${radio * 0.76}% at ${cx}% ${cy}%, ${alfa(
          color.startsWith("#") ? color : "#FFFFFF",
          Math.max(0, i)
        )}, transparent 62%)`,
        pointerEvents: "none",
      }}
    />
  );
};

/**
 * Halo local alrededor de un elemento (no de la pantalla). Envuelve al hijo y
 * le pone luz propia detrás; útil para logos, cifras y nodos.
 */
export const Halo: React.FC<{
  children: React.ReactNode;
  color?: string;
  radio?: number;
  intensidad?: number;
}> = ({ children, color = G.teal, radio = 220, intensidad = 0.45 }) => (
  <div style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
    <div
      style={{
        position: "absolute",
        width: radio,
        height: radio,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${alfa(color.startsWith("#") ? color : "#FFFFFF", intensidad)}, transparent 70%)`,
        filter: "blur(18px)",
        pointerEvents: "none",
      }}
    />
    <div style={{ position: "relative" }}>{children}</div>
  </div>
);
