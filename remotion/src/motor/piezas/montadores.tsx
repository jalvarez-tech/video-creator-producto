/**
 * LOS MONTADORES DEL REGISTRO COMPARTIDO — el JSX de las piezas que sirven a
 * cualquier capa. Las fichas viven al lado, en `index.ts`; el contrato de
 * admisión está escrito allí y estas seis lo cumplen.
 *
 * GENÉRICOS EN `C`, Y ESO ES LO QUE HACE CUMPLIR EL CONTRATO. Al no fijar la
 * unión de tintas, el compilador impide escribir `c.tinta("acento")` aquí
 * dentro: no hay ninguna literal que sea válida para las dos capas a la vez.
 * La regla no es un comentario que se pueda ignorar — es el tipo.
 *
 * Todo lo que se pinta sale de `c.color`, que el intérprete ya resolvió contra
 * `molde.tinta`: el mismo subrayado sale carbón sobre papel y blanco sobre cine
 * sin saber en cuál está.
 */
import type { ReactNode } from "react";
import { interpolate } from "remotion";
import { alfa } from "../formato";
import { Aspa, Check, Flecha, Rodea, Subrayado } from "../graficos/Trazo";
import type { Montadores } from "../plan/nucleo";
import type { PiezasComunes } from "./index";

/**
 * Alfa sobre un color cualquiera. Copia mínima de la de `PistaGraficos` para no
 * hacer que esta capa dependa del intérprete: el registro compartido tiene que
 * poder importarse desde los dos dialectos sin arrastrar quién los monta.
 */
const conAlfa = (c: string, a: number): string => {
  if (a >= 1) return c;
  if (c.indexOf("#") === 0) return alfa(c, a);
  const m = /^rgba?\(([^)]+)\)$/.exec(c.replace(/\s/g, ""));
  if (m) {
    const p = m[1].split(",");
    if (p.length >= 3) return `rgba(${p[0]}, ${p[1]}, ${p[2]}, ${(p.length > 3 ? parseFloat(p[3]) : 1) * a})`;
  }
  return c;
};

export const montadoresComunes = <C extends string>(): Montadores<PiezasComunes, C, ReactNode> => ({
  regla: (p, c) => {
    const pr = interpolate(c.f, [0, Math.max(1, p.dur ?? 6)], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return (
      <div style={{ width: c.estira ? "100%" : p.ancho ?? 430, transform: p.gira ? `rotate(${p.gira}deg)` : undefined }}>
        <div
          style={{
            width: `${pr * 100}%`,
            height: p.alto ?? 4,
            background: c.color,
            boxShadow: `0 0 16px ${conAlfa(c.color, 0.5)}`,
          }}
        />
      </div>
    );
  },
  subrayado: (p, c) => (
    <Subrayado ancho={p.ancho ?? 520} dur={p.dur} semilla={p.semilla} grosor={p.grosor} amplitud={p.amplitud} color={c.color} />
  ),
  rodea: (p, c) => (
    <Rodea
      ancho={p.ancho ?? 520}
      alto={p.alto ?? 180}
      dur={p.dur}
      semilla={p.semilla}
      vueltas={p.vueltas}
      grosor={p.grosor}
      color={c.color}
    />
  ),
  flecha: (p, c) => (
    <Flecha de={[p.de[0], p.de[1]]} a={[p.a[0], p.a[1]]} curvatura={p.curvatura} grosor={p.grosor} dur={p.dur} color={c.color} />
  ),
  check: (p, c) => <Check tam={p.px ?? 120} dur={p.dur} grosor={p.grosor} color={c.color} />,
  aspa: (p, c) => <Aspa tam={p.px ?? 120} dur={p.dur} grosor={p.grosor} retardo={p.retardo} color={c.color} />,
});
