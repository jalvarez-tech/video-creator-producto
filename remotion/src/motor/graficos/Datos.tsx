import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { EASE, SPRING, STAGGER } from "../motion";
import { alfa, FONT, G, SOMBRA, TXT } from "./estilos";
import { Cifra, Etiqueta } from "./Texto";

/**
 * DATOS EN PANTALLA — contador, barra, lista y gráfica de barras.
 * Guía: manuales/motion-graphics/SKILL.md · sonido: recetario-motion-graphics.md
 * (contador → `data`/`tick` · barra → `whoosh` + `chime` al llegar · check → `pop`).
 *
 * Principio: el número no "aparece", SE FORMA. Un dato que salta a su valor
 * final no comunica magnitud; uno que sube desde 0 sí — el ojo mide el recorrido,
 * no el resultado. Por eso todo aquí tiene `dur`: el tiempo ES el mensaje.
 *
 * Determinismo: sin estado ni efectos; todo sale de useCurrentFrame().
 */

/** Formatea con separador de miles (es-ES por defecto) sin depender de Intl/locale del render. */
/** Reexportada de `formato.ts`, compartida con el theme de noticias. */
import { formatea } from "../formato";
export { formatea };

/**
 * Contador que sube (o baja) de `de` a `a` en `dur` frames desde `at`.
 * outCubic: arranca rápido y frena al llegar — el perfil que se lee como
 * "acumulación", no como barrido lineal.
 *
 * `punch` da un golpe de escala al ATERRIZAR (SPRING.punch). Úsalo solo en la
 * cifra clave de la pieza: si todas las cifras hacen punch, ninguna destaca.
 */
export const Contador: React.FC<{
  de?: number;
  a: number;
  at?: number;
  dur?: number;
  decimales?: number;
  prefijo?: string;
  sufijo?: string;
  color?: string;
  px?: number;
  punch?: boolean;
}> = ({ de = 0, a, at = 0, dur = 45, decimales = 0, prefijo = "", sufijo = "", color, px, punch = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = frame - at;
  const v = interpolate(f, [0, dur], [de, a], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE.outCubic,
  });
  const golpe =
    punch && f >= dur
      ? interpolate(spring({ frame: f - dur, fps, config: SPRING.punch }), [0, 1], [1.14, 1])
      : 1;
  return (
    <span style={{ display: "inline-block", transform: `scale(${golpe})` }}>
      <Cifra color={color} px={px}>
        {prefijo}
        {formatea(v, decimales)}
        {sufijo}
      </Cifra>
    </span>
  );
};

/**
 * Barra de progreso / proporción. Crece LINEAL a propósito: una barra con
 * easing miente sobre la velocidad del proceso que representa.
 * `pico` marca un umbral (objetivo, media, límite) con una línea vertical.
 */
export const BarraProgreso: React.FC<{
  valor: number;
  at?: number;
  dur?: number;
  ancho?: number;
  alto?: number;
  color?: string;
  fondo?: string;
  pico?: number;
}> = ({ valor, at = 0, dur = 30, ancho = 720, alto = 18, color = G.teal, fondo, pico }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame - at, [0, dur], [0, Math.max(0, Math.min(1, valor))], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        width: ancho,
        height: alto,
        borderRadius: alto / 2,
        background: fondo ?? G.linea,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: ancho * p,
          height: "100%",
          borderRadius: alto / 2,
          background: color,
          boxShadow: `0 0 20px ${alfa(color.startsWith("#") ? color : "#FFFFFF", 0.55)}`,
        }}
      />
      {pico !== undefined ? (
        <div
          style={{
            position: "absolute",
            left: ancho * Math.max(0, Math.min(1, pico)),
            top: -alto * 0.4,
            width: 2,
            height: alto * 1.8,
            background: G.white,
            opacity: 0.7,
          }}
        />
      ) : null}
    </div>
  );
};

/**
 * Regla que se extiende mecánicamente (lineal, sin easing) en su color
 * simbólico. Sirve de subrayado, separador o "medida" bajo un dato.
 * Para un subrayado A MANO (trazo orgánico), usa `Trazo.tsx`.
 */
export const Regla: React.FC<{ at?: number; ancho: number; color?: string; dur?: number; alto?: number }> = ({
  at = 0,
  ancho,
  color = G.teal,
  dur = 6,
  alto = 4,
}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame - at, [0, dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        width: ancho * p,
        height: alto,
        background: color,
        boxShadow: `0 0 16px ${alfa(color.startsWith("#") ? color : "#FFFFFF", 0.5)}`,
      }}
    />
  );
};

/**
 * Estado de UN ítem, frente a la marca de la lista entera.
 *
 * Vive en la primitiva y no en cada dialecto para que "no" signifique lo mismo
 * en los dos: si cada capa se inventara su glifo y su color, la misma lista
 * saldría con ✗ roja en una pieza y con — gris en la de al lado.
 */
export type EstadoItem = "si" | "no" | "neutro";

const ESTADO: Record<EstadoItem, { marca: string; color: string }> = {
  si: { marca: "✓", color: G.green },
  no: { marca: "✗", color: G.red },
  // Gris y punto: "esto está, pero no puntúa". Con ✓ apagada seguiría leyéndose
  // como un sí flojo, que es otra cosa.
  neutro: { marca: "•", color: G.gris },
};

/**
 * Ítem de lista con marca. El stagger va DENTRO (`indice`), no en quien lo usa:
 * así una lista entera se escribe sin sumar frames a mano y el ritmo entre
 * ítems queda fijado por STAGGER.lista (motion.ts), igual en toda la pieza.
 *
 * `estado` es del ÍTEM; `marca` y `color`, de la LISTA. Antes solo existían los
 * segundos, así que una lista era homogénea por construcción: no había forma de
 * decir «estos dos sí y este no» sin escribir la lista a mano fuera del plan —
 * que es justo el caso para el que sirve una lista con marcas.
 *
 * PRECEDENCIA: lo explícito gana. `marca`/`color` pisan al `estado` porque quien
 * los pasa está decidiendo a mano; el `estado` es el DEFECTO de ese ítem. El
 * montador aprovecha esto para no pasar la marca de la lista a un ítem que ya
 * declara estado.
 */
export const ItemLista: React.FC<{
  children: React.ReactNode;
  indice?: number;
  at?: number;
  paso?: number;
  marca?: string;
  color?: string;
  px?: number;
  estado?: EstadoItem;
}> = ({ children, indice = 0, at = 0, paso = STAGGER.lista, marca, color, px, estado }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = frame - at - indice * paso;
  const e = spring({ frame: f, fps, config: SPRING.entrada });
  const op = interpolate(f, [0, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // Sin `estado` los defectos son los de siempre (✓ verde): un ítem que no dice
  // nada se ve exactamente igual que antes de que el estado existiera.
  const est = estado ? ESTADO[estado] : undefined;
  const m = marca ?? (est ? est.marca : "✓");
  const col = color ?? (est ? est.color : G.green);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 20,
        fontFamily: FONT,
        opacity: op,
        transform: `translateX(${interpolate(e, [0, 1], [-28, 0])}px)`,
      }}
    >
      <span style={{ fontSize: (px ?? TXT.etiqueta.fontSize) * 0.9, color: col, textShadow: SOMBRA.texto }}>{m}</span>
      <Etiqueta px={px}>{children}</Etiqueta>
    </div>
  );
};

export type Barra = { etiqueta: string; valor: number; color?: string };

/**
 * Gráfica de barras mínima. Las barras crecen DESDE LA BASE con stagger: el ojo
 * compara alturas, y el orden de entrada dirige en qué orden las compara — por
 * eso el orden del array es una decisión narrativa, no de datos.
 *
 * `max` fija la escala (déjalo sin poner para que sea el mayor valor). Fijarlo
 * a mano es lo correcto cuando comparas varias gráficas entre escenas.
 */
export const Barras: React.FC<{
  datos: Barra[];
  at?: number;
  dur?: number;
  paso?: number;
  alto?: number;
  ancho?: number;
  hueco?: number;
  max?: number;
  color?: string;
}> = ({ datos, at = 0, dur = 24, paso = STAGGER.grupo, alto = 420, ancho = 120, hueco = 36, max, color = G.teal }) => {
  const frame = useCurrentFrame();
  const tope = max ?? Math.max(...datos.map((d) => d.valor), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: hueco, fontFamily: FONT }}>
      {datos.map((d, i) => {
        const p = interpolate(frame - at - i * paso, [0, dur], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: EASE.outCubic,
        });
        const c = d.color ?? color;
        const h = (d.valor / tope) * alto * p;
        return (
          <div key={d.etiqueta} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: 38, fontWeight: 800, color: c, textShadow: SOMBRA.texto, opacity: p }}>
              {formatea(d.valor * p)}
            </span>
            <div
              style={{
                width: ancho,
                height: h,
                borderRadius: 10,
                background: `linear-gradient(180deg, ${c}, ${alfa(c.startsWith("#") ? c : "#FFFFFF", 0.45)})`,
                boxShadow: `0 0 26px ${alfa(c.startsWith("#") ? c : "#FFFFFF", 0.35)}`,
              }}
            />
            <span style={{ fontSize: 30, fontWeight: 600, color: G.apagado, textShadow: SOMBRA.texto }}>
              {d.etiqueta}
            </span>
          </div>
        );
      })}
    </div>
  );
};
