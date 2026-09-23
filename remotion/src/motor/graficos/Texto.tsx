import { CAJA, FONT, G, SOMBRA, TXT, alfa } from "./estilos";

/**
 * TIPOGRAFÍA de los gráficos — los cuatro roles de `estilos.ts` hechos componente.
 * Guía: manuales/motion-graphics/SKILL.md (§tipografía cinética).
 *
 * Son componentes TONTOS: no saben nada del frame. Quien los anima es
 * `Entradas.tsx` (`Aparece`, `Barrido`) o la escena. Esa separación es lo que
 * permite recronometrar una pieza sin volver a maquetarla.
 *
 * Regla de uso: por escena, UN titular o UNA cifra. El kicker y la etiqueta son
 * apoyos — si compiten en tamaño con el hero, la escena ya tiene dos
 * protagonistas y el ojo no sabe dónde mirar.
 */

/** Columna centrada: el layout por defecto de una escena de gráfico. */
export const Columna: React.FC<{ children: React.ReactNode; gap?: number; estilo?: React.CSSProperties }> = ({
  children,
  gap = 30,
  estilo,
}) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
      fontFamily: FONT,
      gap,
      ...estilo,
    }}
  >
    {children}
  </div>
);

/** Fila centrada (cifra + flecha, icono + etiqueta…). */
export const Fila: React.FC<{ children: React.ReactNode; gap?: number; estilo?: React.CSSProperties }> = ({
  children,
  gap = 16,
  estilo,
}) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT, gap, ...estilo }}>
    {children}
  </div>
);

/** Antetítulo / sección. Nunca lleva el mensaje: da contexto y se sale de en medio. */
export const Kicker: React.FC<{ children: React.ReactNode; color?: string; px?: number }> = ({
  children,
  color = G.apagado,
  px,
}) => <span style={{ ...TXT.kicker, color, fontSize: px ?? TXT.kicker.fontSize, textShadow: SOMBRA.texto }}>{children}</span>;

/** Frase de apoyo: lo que explica la cifra o remata el titular. */
export const Etiqueta: React.FC<{ children: React.ReactNode; color?: string; px?: number }> = ({
  children,
  color = TXT.etiqueta.color,
  px,
}) => (
  <span style={{ ...TXT.etiqueta, color, fontSize: px ?? TXT.etiqueta.fontSize, textShadow: SOMBRA.texto }}>
    {children}
  </span>
);

/** El mensaje de la escena. Uno por escena. */
export const Titular: React.FC<{ children: React.ReactNode; color?: string; px?: number }> = ({
  children,
  color = TXT.titular.color,
  px,
}) => (
  <span style={{ ...TXT.titular, color, fontSize: px ?? TXT.titular.fontSize, textShadow: SOMBRA.texto }}>
    {children}
  </span>
);

/**
 * El dato como protagonista. `resplandor` añade un halo del propio color:
 * es lo que separa una cifra "puesta encima" de una cifra que EMITE luz sobre
 * el fondo. Con fondo claro, bájalo a 0.
 */
export const Cifra: React.FC<{ children: React.ReactNode; color?: string; px?: number; resplandor?: number }> = ({
  children,
  color = TXT.cifra.color,
  px,
  resplandor = 0.33,
}) => (
  <span
    style={{
      ...TXT.cifra,
      color,
      fontSize: px ?? TXT.cifra.fontSize,
      textShadow: resplandor > 0 ? `0 0 70px ${alfa(color.startsWith("#") ? color : "#FFFFFF", resplandor)}` : SOMBRA.texto,
    }}
  >
    {children}
  </span>
);

/**
 * Tarjeta traslúcida para agrupar contenido sobre vídeo.
 * Traslúcida a propósito (ver `G.tinta`): una caja opaca sobre el avatar se lee
 * como parche pegado; una traslúcida se lee como capa de la misma imagen.
 *
 * Los tokens de la caja salen de `CAJA.sello` (estilos.ts) y no de aquí: el
 * intérprete monta esta misma caja como PIEL de un grupo (`cajaPiel`) y las dos
 * copias ya habían divergido en el `gap`. Lo que sí es de este componente es su
 * maqueta —columna centrada—, porque ahí es donde se diferencia de la piel: en
 * la piel el flex lo pone el grupo.
 */
export const Sello: React.FC<{ children: React.ReactNode; estilo?: React.CSSProperties; gap?: number }> = ({
  children,
  estilo,
  gap = CAJA.sello.gap,
}) => (
  <div
    style={{
      ...CAJA.sello,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      fontFamily: FONT,
      gap,
      ...estilo,
    }}
  >
    {children}
  </div>
);

/**
 * Píldora de estado / categoría. El color es INFORMACIÓN (verde = va bien,
 * rojo = se pierde, ámbar = dato neutro): no elijas el color por estética.
 *
 * `activo: false` APAGA el chip a gris, que es como se dice «esta opción está
 * descartada» en una comparación de dos o tres. Sin esto, el plan podía declarar
 * `chip.activo` (la ficha lo lleva desde el principio) y el montador no tenía
 * cómo expresarlo: los tres chips de una comparación salían igual de vivos y la
 * comparación no comparaba nada. Se apaga cambiando el COLOR y nada más —relleno
 * y borde se derivan de él, como en el chip vivo—, que es exactamente lo que
 * hace `<ChipIcono>` en la capa editorial: un chip apagado sigue siendo el mismo
 * objeto, no un objeto medio transparente.
 */
export const Chip: React.FC<{ children: React.ReactNode; color?: string; px?: number; activo?: boolean }> = ({
  children,
  color = G.teal,
  px = 30,
  activo = true,
}) => {
  const c = activo ? color : G.grisSolido;
  // `alfa` solo sabe de hex; una tinta en rgba (la `neutro` de la paleta) cae al
  // blanco, que es el respaldo que ya había aquí.
  const base = c.startsWith("#") ? c : "#FFFFFF";
  return (
    <span
      style={{
        fontFamily: FONT,
        fontSize: px,
        fontWeight: 700,
        letterSpacing: 1,
        color: c,
        background: alfa(base, 0.12),
        border: `1px solid ${alfa(base, 0.45)}`,
        borderRadius: 999,
        padding: "8px 22px",
        textShadow: SOMBRA.texto,
      }}
    >
      {children}
    </span>
  );
};

/**
 * Texto tachado: el "esto no" de una comparación. `progreso` 0→1 dibuja la
 * línea (anímalo desde la escena) — el tachado que aparece de golpe se lee como
 * error de render, el que se dibuja se lee como decisión.
 */
export const Tachado: React.FC<{
  children: React.ReactNode;
  progreso: number;
  color?: string;
  px?: number;
}> = ({ children, progreso, color = G.red, px }) => (
  <span style={{ position: "relative", display: "inline-block" }}>
    <span style={{ ...TXT.etiqueta, fontSize: px ?? TXT.etiqueta.fontSize, opacity: 1 - 0.45 * progreso, textShadow: SOMBRA.texto }}>
      {children}
    </span>
    <span
      style={{
        position: "absolute",
        left: 0,
        top: "52%",
        height: 4,
        width: `${Math.max(0, Math.min(1, progreso)) * 100}%`,
        background: color,
        boxShadow: `0 0 16px ${color}`,
      }}
    />
  </span>
);
