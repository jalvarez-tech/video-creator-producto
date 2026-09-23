import { cloneElement, useMemo } from "react";
import type { ReactNode } from "react";
import { AbsoluteFill, Freeze, interpolate, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { avisaDelPlan } from "../avisos";
import { alfa } from "../formato";
import { EASE, opacidadVentana, SPRING } from "../motion";
import type { Muelle } from "../motion";
import { Barras, BarraProgreso, Contador, ItemLista } from "./Datos";
import type { EstadoItem } from "./Datos";
import { Aparece, Barrido, Latido } from "./Entradas";
import { CAJA, escalaPorAncho, G, margenSeguro } from "./estilos";
import { Halo, Puntos, Rejilla, Resplandor, Scrim, Vineta } from "./Fondos";
import { GLIFO } from "./Glifos";
import { Aberracion, Glitch } from "./Glitch";
import { Particulas } from "./Particulas";
import { Tarjeta3D } from "./Tarjeta3D";
import { Chip, Cifra, Etiqueta, Kicker, Titular } from "./Texto";
import { duracionEntrada, esGrupo, gapEntre, resuelveMomentos, revisaPlan, ventanaAbs } from "../plan/nucleo";
import type {
  Alineacion, Ambiente, Ancla, ClaveDe, CtxPieza, Entrada as EntradaLey, Envoltura, Grupo, Ley, Molde,
  Momento, Momentos, Montadores, NombreMuelle, Nodo, NodoUbicado, Piel, Plan, RegistroPiezas,
  Rol, Salida, TextoRico, Toma, Trozo,
} from "../plan/nucleo";
import type { Marca } from "../marca";
import type { LetraDialecto } from "../plan/nucleo";
import { zonaSeguraDe } from "../presets";
import { montadoresComunes } from "../piezas/montadores";
import { PALETA_MARCA } from "./coreografia";
import type { PiezasGraficos, Tinta, TramoContador } from "./coreografia";

/**
 * INTÉRPRETE del plan (`Plan` → JSX). Hermano de <CamaraVirtual> y <PistaSonido>.
 *
 *   <PistaGraficos plan={plan004} montadores={MONTADORES_BASE} />
 *   <PistaGraficos plan={compilaNoticia(tomas)} montadores={MONTADORES_NOTICIA}
 *                  fondos={FONDOS_NOTICIA} encima={…} />
 *
 * Ya no es "el intérprete de gráficos": es EL intérprete, genérico en los cuatro
 * parámetros del plan (`R` registro, `B` beats, `M` moldes, `C` tintas). Estaba
 * genérico solo en el registro y fijo en los otros tres, y eso bastaba para que
 * un segundo dialecto no pudiera montarse: `<PistaNoticia>` era un switch de
 * 215 líneas que hacía otra vez lo mismo. Lo que el dialecto aporta y aquí ya no
 * se cablea:
 *   · la tinta por defecto (`dialecto.tintaBase`) — antes `paleta["texto"]`,
 *     un nombre que no existe fuera de la capa de gráficos;
 *   · los FONDOS por nombre (`fondos[molde.fondo]`) — antes un `=== "toma"`
 *     con el degradado escrito a mano dentro del intérprete.
 *
 * No decide NADA: monta lo que dice el plan, en el molde que dice el plan, con
 * la ley que dice la pieza. Lo que sí GARANTIZA (y por eso no está en el plan):
 *   · el orden de envolturas — filter/opacity/overflow sobre un preserve-3d
 *     APLANAN a los hijos, así que la opacidad va SIEMPRE en un envoltorio
 *     exterior. Si el plan pudiera ordenarlas, podría romper la invariante.
 *   · el scrim acoplado al molde, que nace con la toma y muere con el texto.
 *   · el punch-in de formato, que es del molde y no de cada toma.
 *   · la escala tipográfica por ancho (`escalaPorAncho`), que ya existía en
 *     estilos.ts y NADIE llamaba: el mismo plan en 16:9 salía descolocado.
 *
 * TIEMPO. Todos los frames que salen de `resuelveMomentos` son LOCALES A LA
 * TOMA. Las <Sequence> anidan, así que el `from` de un hijo es relativo a la de
 * su padre: aquí se resta siempre la base del padre (`base`). Sin esa resta el
 * desfase del padre se contaría dos veces y cada nivel de anidamiento entraría
 * más tarde que lo escrito — con el plan diciendo LIMPIO. Dentro de un nodo, en
 * cambio, el frame que ven las primitivas ya es del NODO (0 = su primer frame):
 * ésa es la unidad en la que se declaran las envolturas.
 *
 * Los tiempos NO se recalculan aquí. `resuelveMomentos` es el único que los
 * sabe, y lo comparte con el validador a propósito: cuando la ventana de una
 * toma estaba escrita en dos sitios, la pieza se desincronizó sola.
 */

/* ── Contexto de render (creado una vez por toma, no por nodo) ───────────── */

interface Vista {
  ancho: number;
  alto: number;
  fps: number;
  margen: number;
  escala: number;
}

interface CtxToma<R extends RegistroPiezas, C extends string> {
  montadores: Montadores<R, C, ReactNode>;
  paleta: Record<C, string>;
  /** `dialecto.tintaBase`: el color de un nodo que no pide ninguno. */
  base: C;
  escalaRol: Record<Rol, number>;
  alfaRol: Record<Rol, number>;
  ley: Ley;
  /** `Molde<C>` y no `Molde`: de aquí sale la tinta por defecto de los nodos. */
  molde: Molde<C>;
  vista: Vista;
  momentos: Momentos<R, C>;
  len: number;
  /** `molde.fondo` → componente. El JSX del fondo es del DIALECTO, no de aquí. */
  fondos: Record<string, React.FC>;
  /** Color del degradado del scrim (el fondo de la capa: casi negro). */
  scrimColor: string;
  /** La marca de la capa, del dialecto. Baja hasta `CtxPieza` para que un
   *  montador pinte la voz del canal sin importarla a nivel de módulo. */
  marca: Marca;
  /** La letra RESUELTA de la capa: su defecto, o la que la marca pidió para
   *  ella (`marca.letraPorCapa`). Ver `motor/letra.ts`. */
  letra: LetraDialecto;
}

/** El mismo contexto visto sin sus genéricos: lo que necesitan los componentes
 *  auxiliares (React.FC no admite parámetros de tipo). Los `Record<C,string>`
 *  son asignables a `Record<string,string>`, así que el cast es de forma exacta. */
type CtxAnon = CtxToma<RegistroPiezas, string>;

/** Registro TOTAL sobre `NombreMuelle`: añadir un muelle al núcleo sin darle su
 *  config en motion.ts deja de compilar aquí, en vez de resolver a `undefined`
 *  y caer al muelle por defecto de <Aparece> sin decir nada. */
const MUELLES: Record<NombreMuelle, Muelle> = SPRING;

/**
 * Alfa sobre un color CUALQUIERA, no solo sobre un hex.
 *
 * `alfa()` (formato.ts) sabe parsear hex y nada más. El fallback que había aquí
 * antes convertía en `#FFFFFF` todo lo que no empezara por `#`, y `neutro` es la
 * única tinta de la paleta escrita como `rgba(...)`: cualquier nodo con
 * `color: "neutro"` salía BLANCO, que es lo contrario de lo que la tinta
 * significa. Y no era un caso de borde — el rol por defecto (`apoyo`) ya
 * multiplica por 0.88, así que el alfa nunca vale 1 salvo en el hero. El plan
 * decía una cosa y el render hacía otra sin un solo aviso.
 *
 * Con un `plan.paleta` de proyecto (el 002 redefine la paleta entera) bastaba un
 * `hsl()` para que esa tinta desapareciera de la pieza.
 *   · `#rgb` / `#rrggbb` → `alfa()` de siempre.
 *   · `rgb()` / `rgba()` → se MULTIPLICA el alfa que ya trae.
 *   · cualquier otra cosa → se devuelve tal cual. Perder la transparencia se
 *     nota poco; perder el color es pintar otra cosa.
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

/**
 * Una tinta semántica → color CSS. `base` es la del DIALECTO: aquí estaba
 * cableada a `"texto"`, que solo existe en la paleta de gráficos, así que el
 * dialecto editorial (tinta/suave/blanco/acento/resalte/papel) resolvía a
 * `undefined` y pintaba "hereda".
 */
const tintaDe = (paleta: Record<string, string>, c: string | undefined, base: string, a = 1): string =>
  conAlfa(paleta[c ?? base] ?? paleta[base], a);

/* ── Texto con partes (una palabra de otro color dentro de la frase) ─────── */

/**
 * EL COLOR DE UN TROZO SALE DEL CONTEXTO, NO DE LA PALETA DEL CANAL.
 *
 * Aquí estaba cableada `PALETA_MARCA` en los seis puntos de uso de `<Rico>`, y
 * eso cortocircuitaba el gancho que el sistema ya tiene: `plan.paleta` se funde
 * con la del dialecto en `RenderToma` y llega a la pieza como `c.tinta()`. Con
 * la paleta redefinida —el 002 la descarta entera— el plan pedía un color y
 * cualquier palabra con `tinta` DENTRO de una frase seguía saliendo en el teal
 * del canal. El plan decía una cosa y el render pintaba otra, sin un aviso.
 *
 * `c.tinta` resuelve contra `ctx.paleta` con `dialecto.tintaBase` de suelo, que
 * en gráficos es exactamente `"texto"` (el literal que estaba escrito aquí):
 * con la paleta por defecto no se mueve ni un píxel. La línea 362, al lado, ya
 * lo hacía bien — era esto lo único que faltaba por alinear.
 */
const estiloTrozo = (x: Trozo<Tinta>, c: CtxPieza<Tinta>): React.CSSProperties => {
  const col = x.tinta ? c.tinta(x.tinta) : undefined;
  return {
    color: col,
    fontWeight: x.enfasis ? 800 : undefined,
    textDecoration: x.tachado ? "line-through" : undefined,
    // Rotulador: banda plana detrás de la palabra, del color del trozo. Es
    // ESTÁTICA a propósito — el barrido del rotulador tendría que arrancar en
    // un frame que sabe la pieza contenedora, y hoy ninguna lo declara.
    background: x.rotulador ? conAlfa(col ?? c.tinta("marca"), 0.3) : undefined,
    padding: x.rotulador ? "0 .12em" : undefined,
    borderRadius: x.rotulador ? 4 : undefined,
  };
};

const Rico: React.FC<{ t: TextoRico<Tinta>; c: CtxPieza<Tinta> }> = ({ t, c }) => {
  if (typeof t === "string") return <>{t}</>;
  return (
    <>
      {t.map((x, i) =>
        typeof x === "string" ? (
          <span key={i}>{x}</span>
        ) : (
          <span key={i} style={estiloTrozo(x, c)}>
            {x.t}
          </span>
        )
      )}
    </>
  );
};

/* ── Contador con tramos (el 0→200→meseta→3 del 001) ────────────────────── */

const valorEnTramos = (f: number, de: number, tramos: readonly TramoContador[]): number => {
  let t0 = 0;
  let v = de;
  for (const tr of tramos) {
    if ("espera" in tr) {
      if (f < t0 + tr.espera) return v;
      t0 += tr.espera;
      continue;
    }
    if (f < t0 + tr.dur)
      return interpolate(f, [t0, t0 + tr.dur], [v, tr.a], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: EASE.outCubic,
      });
    t0 += tr.dur;
    v = tr.a;
  }
  return v;
};

/* ── Ayudas de las piezas ───────────────────────────────────────────────── */

/** Marcas de lista. En v1 el ✓ estaba FIJO: una lista de errores salía con
 *  palomitas verdes al lado de cada cosa que no hay que hacer. */
const MARCAS: Record<string, (i: number) => string> = {
  check: () => "✓",
  punto: () => "•",
  aspa: () => "✗",
  numero: (i) => `${i + 1}.`,
};

/** El estado de un ítem, traducido a la paleta SEMÁNTICA del plan. `<ItemLista>`
 *  ya trae su color por defecto, pero es el verde y el rojo de la biblioteca:
 *  aquí se pasa por `plan.paleta` para que una pieza que redefinió sus colores
 *  no acabe con dos rojos distintos en la misma toma. */
const TINTA_ESTADO: Record<EstadoItem, Tinta> = { si: "logro", no: "perdida", neutro: "neutro" };

/**
 * Tamaño final de un texto: el que pida la pieza, o el del ROL, escalado al
 * ancho del formato. El `|| …` es el suelo para un `px: 0` en el plan.
 */
const escalaTexto = (c: CtxPieza<Tinta>, px: number | undefined, rol: Rol): number =>
  Math.round((px ?? c.px) * c.escala) || (rol === "hero" ? 92 : 46);

/* ── MONTADORES del dialecto gráficos ───────────────────────────────────────
 * Mapeado TOTAL sobre `PIEZAS`: si añades una ficha al registro, este objeto
 * deja de compilar hasta que escribas su rama. Ese es el mecanismo que impide
 * que el catálogo vuelva a anunciar 37 y servir 16.
 *
 * Cada rama es un ENVOLTORIO de una primitiva que ya existe (Texto.tsx,
 * Datos.tsx, Trazo.tsx…): aquí se traduce el plan a props, no se dibuja nada
 * nuevo. Si una rama empieza a dibujar, es que le falta una pieza a la
 * biblioteca. */

export const MONTADORES_BASE: Montadores<PiezasGraficos, Tinta, ReactNode> = {
  // Las seis compartidas (`regla` y las cinco de trazo) salen del registro
  // común: el mismo JSX que monta la capa editorial. Ver `motor/piezas/`.
  ...montadoresComunes<Tinta>(),
  kicker: (p, c) => (
    <Kicker color={c.color} px={escalaTexto(c, p.px, "contexto")}>
      <Rico t={p.texto} c={c} />
    </Kicker>
  ),
  titular: (p, c) =>
    p.lineas ? (
      // `lineas` = saltos EXPLÍCITOS, un <Titular> por línea. El `nowrap` es lo
      // que hace que el salto signifique algo: si la línea pudiera partirse
      // sola, el plan estaría declarando una intención que el ancho decide.
      <span style={{ display: "flex", flexDirection: "column", alignItems: "center", whiteSpace: "nowrap" }}>
        {p.lineas.map((l, i) => (
          <Titular key={i} color={c.color} px={escalaTexto(c, p.px, "hero")}>
            <Rico t={l} c={c} />
          </Titular>
        ))}
      </span>
    ) : (
      <Titular color={c.color} px={escalaTexto(c, p.px, "hero")}>
        <Rico t={p.texto ?? ""} c={c} />
      </Titular>
    ),
  etiqueta: (p, c) => (
    <Etiqueta color={c.color} px={escalaTexto(c, p.px, "apoyo")}>
      <Rico t={p.texto} c={c} />
    </Etiqueta>
  ),
  cifra: (p, c) => (
    <Cifra color={c.color} px={escalaTexto(c, p.px, "hero")} resplandor={p.resplandor}>
      {p.texto ?? `${p.prefijo ?? ""}${p.valor ?? 0}${p.sufijo ?? ""}`}
    </Cifra>
  ),
  // `activo` estaba en la ficha desde el principio y no llegaba a ninguna parte:
  // `<Chip>` no distinguía vivo de apagado, así que una comparación de tres
  // opciones salía con las tres encendidas. `!== false` y no `?? true` por lo
  // mismo que en la capa editorial: lo que apaga es decirlo, no omitirlo.
  chip: (p, c) => (
    <Chip color={c.color} px={escalaTexto(c, p.px, "contexto")} activo={p.activo !== false}>
      <Rico t={p.texto} c={c} />
    </Chip>
  ),
  // El plan pide el glifo por NOMBRE y nunca lleva el `path`: el dibujo es del
  // banco (`Glifos.tsx`). Se clona para fijarle el tamaño porque el banco los
  // declara al 58 % de su caja —la convención de <ChipIcono>, que los mete en
  // un cuadrado de lado variable— y aquí la caja es el propio glifo.
  glifo: (p, c) => {
    const t = p.px ?? 46;
    return (
      <span style={{ display: "inline-flex", color: c.color }}>
        {cloneElement(GLIFO[p.nombre], { width: t, height: t })}
      </span>
    );
  },
  caret: (p, c) => <div style={{ width: p.ancho ?? 4, height: p.alto ?? 56, background: c.color }} />,

  contador: (p, c) =>
    p.tramos ? (
      <Cifra color={c.color} px={escalaTexto(c, p.px, "hero")}>
        {`${p.prefijo ?? ""}${Math.round(valorEnTramos(c.f, p.de ?? 0, p.tramos))}${p.sufijo ?? ""}`}
      </Cifra>
    ) : (
      <Contador
        de={p.de ?? 0}
        a={p.a ?? 0}
        dur={Math.max(1, p.dur ?? Math.min(45, c.len - 10))}
        decimales={p.decimales}
        prefijo={p.prefijo}
        sufijo={p.sufijo}
        color={c.color}
        px={escalaTexto(c, p.px, "hero")}
        punch={p.golpe}
      />
    ),
  barra: (p, c) => (
    <BarraProgreso
      valor={p.valor}
      dur={Math.max(1, p.dur ?? 30)}
      ancho={p.ancho ?? 720}
      alto={p.alto}
      color={c.color}
      pico={p.pico}
    />
  ),
  // `regla` NO usa el componente Regla porque necesita poder estirarse al ancho
  // del bloque en porcentaje: es lo que mata el `ancho: 520` medido a ojo.
  // `items[].estado` es lo que permite marcar UN ítem distinto del resto ("estos
  // dos sí, este no"), que es el caso para el que sirve una lista con marcas y
  // que hasta ahora había que escribir a mano fuera del plan.
  //
  // El color del estado sale de la PALETA de la pieza (`c.tinta`) y no del verde
  // y el rojo de la biblioteca: la dirección de arte es del proyecto —el 002 se
  // redefinió la paleta entera— y una lista que ignorara `plan.paleta` metería
  // dos rojos distintos en la misma pieza.
  //
  // La marca de la lista solo se pasa al ítem que NO declara estado: en
  // `<ItemLista>` lo explícito gana, así que pasársela siempre volvería a dejar
  // el estado sin efecto, que es el fallo que esto viene a cerrar.
  lista: (p, c) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 22 }}>
      {p.items.map((it, i) => (
        <ItemLista
          key={i}
          indice={i}
          paso={p.paso ?? 4}
          estado={it.estado}
          marca={it.estado ? undefined : MARCAS[p.marca ?? "check"](i)}
          color={it.estado ? c.tinta(TINTA_ESTADO[it.estado]) : c.color}
          px={escalaTexto(c, p.px, "apoyo")}
        >
          <Rico t={it.texto} c={c} />
        </ItemLista>
      ))}
    </div>
  ),
  barras: (p, c) => (
    <Barras
      datos={p.datos.map((d) => ({ etiqueta: d.etiqueta, valor: d.valor, color: d.tinta ? c.tinta(d.tinta) : undefined }))}
      dur={Math.max(1, p.dur ?? 24)}
      paso={p.paso}
      max={p.max}
      alto={p.alto ?? 420}
      ancho={p.ancho}
      hueco={p.hueco}
      color={c.color}
    />
  ),
  serie: (p, c) => {
    const tintas: readonly Tinta[] = p.tintas ?? ["perdida", "dato", "logro"];
    return (
      <div style={{ display: "flex", gap: p.hueco ?? 16 }}>
        {Array.from({ length: p.n }, (_, i) => {
          const col = c.tinta(tintas[Math.min(i, tintas.length - 1)], i === p.activo ? 1 : 0.3);
          return (
            <div
              key={i}
              style={{
                width: p.ancho ?? 72,
                height: p.alto ?? 6,
                background: col,
                boxShadow: i === p.activo ? `0 0 16px ${col}` : undefined,
              }}
            />
          );
        })}
      </div>
    );
  },

  nodo: (p, c) => (
    <div
      style={{
        width: p.radio * 2,
        height: p.radio * 2,
        borderRadius: "50%",
        border: `${p.grosor ?? 5}px solid ${c.color}`,
        background: p.relleno ? c.color : "transparent",
        boxShadow: `0 0 30px ${conAlfa(c.color, 0.75)}`,
      }}
    />
  ),
  enlace: (p, c) => {
    const pr = interpolate(c.f, [0, Math.max(1, p.dur ?? 13)], [0, p.recorre ?? 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const [g1, g2] = p.guion ?? [18, 16];
    return (
      <div
        style={{
          width: p.largo * pr,
          height: p.alto ?? 8,
          background: `repeating-linear-gradient(90deg, ${c.color} 0 ${g1}px, transparent ${g1}px ${g1 + g2}px)`,
        }}
      />
    );
  },
};

/* ── Envolturas: el orden lo garantiza el intérprete ─────────────────────── */

/**
 * Las envolturas cuentan en frames DEL NODO (0 = su primer frame), que es la
 * unidad en la que se declaran junto a él. Dos matices:
 *   · `parpadeo.desde: "toma"` es la salida explícita para engancharse al reloj
 *     de la toma — existe justo porque el reloj por defecto es el otro.
 *   · `atenua.en` admite `{tras: otroNodo}`, que solo se puede resolver contra
 *     los momentos de la TOMA; se traduce restando el arranque del nodo, para
 *     que las dos formas del mismo campo signifiquen lo mismo.
 */
const momentoDeEnvoltura = (
  m: Momento,
  momentos: Momentos<RegistroPiezas, string>,
  inicio: number
): number | null => {
  if (typeof m === "number") return m;
  const cuando = m.cuando ?? "acaba";
  const ref = cuando === "acaba" ? momentos.entradoPorId.get(m.tras) : momentos.porId.get(m.tras);
  // Sin referencia no se atenúa nada: mejor el nodo a plena opacidad que un
  // corte en el frame 0 que se lee como que el plan lo apagó a propósito.
  return ref === undefined ? null : ref + (m.mas ?? 0) - inicio;
};

const Envuelve: React.FC<{
  envs: readonly Envoltura<string>[] | undefined;
  ctx: CtxAnon;
  /** Frame de la TOMA en el que arranca el nodo envuelto. */
  inicio: number;
  children: ReactNode;
}> = ({ envs, ctx, inicio, children }) => {
  const f = useCurrentFrame();
  if (!envs || envs.length === 0) return <>{children}</>;
  let out = <>{children}</>;
  // Se aplican de dentro hacia fuera; `atenua` y `parpadeo` van SIEMPRE en el
  // envoltorio exterior, porque opacity sobre un preserve-3d aplana a los hijos.
  for (const e of envs) {
    if (e.env === "latido") out = <Latido amplitud={e.amplitud} periodo={e.periodo}>{out}</Latido>;
    else if (e.env === "halo")
      out = <Halo color={tintaDe(ctx.paleta, e.tinta, ctx.base)} radio={e.radio} intensidad={e.intensidad}>{out}</Halo>;
    else if (e.env === "glitch") out = <Glitch at={e.en ?? 0} dur={e.dur ?? 12} intensidad={e.intensidad}>{out}</Glitch>;
    else if (e.env === "aberracion") out = <Aberracion separacion={e.separacion}>{out}</Aberracion>;
    else if (e.env === "pulso" || e.env === "temblor") {
      const dentro = f >= e.entre[0] && f < e.entre[1];
      const a = e.amplitud ?? (e.env === "pulso" ? 0.03 : 4);
      const v = dentro ? Math.sin(f / (e.env === "pulso" ? 2 : 4)) * a : 0;
      out = <div style={{ transform: e.env === "pulso" ? `scale(${1 + v})` : `translateX(${v}px)` }}>{out}</div>;
    }
  }
  for (const e of envs) {
    if (e.env === "parpadeo") {
      const base = e.desde === "toma" ? f + inicio : f;
      const on = Math.floor(base / Math.max(1, e.ciclo)) % 2 === 0;
      out = <div style={{ opacity: on ? e.a ?? 0.9 : 0 }}>{out}</div>;
    } else if (e.env === "atenua") {
      const corte = momentoDeEnvoltura(e.en, ctx.momentos, inicio);
      out = <div style={{ opacity: corte !== null && f >= corte ? e.a : 1 }}>{out}</div>;
    }
  }
  return out;
};

/* ── Entrada declarada ──────────────────────────────────────────────────── */

/** Exportada por lo mismo que `cajaPiel`: el catálogo enseña las cinco leyes de
 *  entrada montándolas con el intérprete, no con cinco imitaciones. */
export const Entra: React.FC<{
  ley: Ley;
  entra: EntradaLey | undefined;
  color: string;
  rol: Rol;
  estilo: React.CSSProperties;
  /** El nodo pidió `estira`: su caja tiene que llegar al ancho del bloque. */
  estira: boolean;
  /**
   * LA SALIDA DEL NODO (`Comun.sale`) — el campo que llevaba desde el primer día
   * declarado en el núcleo y SIN UN SOLO LECTOR. Un plan podía escribir
   * `sale: {como:"fundido", dur: 10}` en una hoja y no pasaba absolutamente
   * nada, sin un aviso: la única salida que el sistema honraba era la de la LEY,
   * y esa se aplica a la TOMA entera en `RenderToma`.
   *
   * Aquí y no en un envoltorio nuevo, y ésa es toda la dificultad del cambio: el
   * nodo es un flex-item y su `alignSelf: stretch` / `width: 100%` / márgenes
   * los aplica ESTE componente vía `estilo`. Envolverlo por fuera para poner una
   * opacidad convierte al envoltorio en el flex-item y el contenido pierde el
   * estirado. (`display: contents` tampoco vale: `opacity` fuerza caja.) Como en
   * las tres ramas de abajo hay exactamente UN elemento que es el flex-item y
   * que ya recibe `estilo`, la opacidad se multiplica ahí y no se añade ni un
   * nodo al DOM.
   *
   * Solo actúa si el NODO la declara. No cae a `ley.salida` a propósito: ésa ya
   * la aplica la toma, y heredarla aquí daría un doble fundido.
   */
  sale?: Salida;
  /** Duración de la ventana del nodo, en frames. La necesita el fundido. */
  len?: number;
  children: ReactNode;
}> = ({ ley, entra, color, rol, estilo, estira, sale, len = 0, children }) => {
  const fSalida = useCurrentFrame();
  // `opacidadVentana(f, len, 1, dur)`: el 1 anula la rampa de ENTRADA (de eso ya
  // se encarga la entrada del nodo) y deja solo la de salida. Si la ventana es
  // más corta que el fundido devuelve 1 — degrada a corte en vez de reventar.
  const alfaSalida = sale && sale.como === "fundido" ? opacidadVentana(fSalida, len, 1, sale.dur ?? 8) : 1;
  const e = entra ?? ley.entrada;
  // `escalon` y `ninguna` comparten rama porque dentro de una <Sequence> son lo
  // mismo: el corte duro ya lo da la Sequence, y añadirle un frame en blanco
  // haría parpadear justo lo que el plan real declara con `escalon` (la serie de
  // pasos del 003, el nodo del eje, el campo del CTA). Lo que SÍ las distingue
  // es `duracionEntrada` —1 f contra 0—, que es lo que lee un `tras(id)`.
  // `opacity` DESPUÉS del spread: `estilo` solo trae caja (alignSelf, width,
  // márgenes) y nunca opacidad, así que no hay nada que multiplicar aquí.
  if (e.como === "ninguna" || e.como === "escalon")
    return <div style={{ ...estilo, opacity: alfaSalida }}>{children}</div>;
  if (e.como === "barrido" || e.como === "extiende") {
    const dur = duracionEntrada(e, ley);
    // La barra viajera es un canal de JERARQUÍA: la lleva el hero y nadie más.
    // Por eso la ley puede encenderla para todo el hero de la pieza sin que cada
    // toma tenga que acordarse.
    const barra = e.como === "barrido" && (e.barra ?? (ley.barraEnHero === true && rol === "hero"));
    // <Barrido> es `inline-block`, o sea shrink-to-fit: un hijo que pide
    // `width: 100%` —que es exactamente lo que hace `estira`— resuelve contra
    // una caja que se ajusta a su contenido y sale de ANCHO 0. La regla no se
    // dibujaba en absoluto, sin un aviso. Y no era un caso raro: LEY_SECA (la
    // del 003) declara `barrido` como entrada por defecto de la pieza entera,
    // así que bajo esa ley desaparecía cualquier `estira`.
    // Envolver en flex-columna arregla las dos mitades: como flex-item el
    // <Barrido> se blockifica (deja de ser inline-block) y `align-items:
    // stretch` le da el ancho del bloque, que es el que el hijo estira.
    return (
      <div
        style={
          estira
            ? { ...estilo, display: "flex", flexDirection: "column", opacity: alfaSalida }
            : { ...estilo, opacity: alfaSalida }
        }
      >
        <Barrido at={0} dur={dur} barra={barra ? color : undefined}>
          {children}
        </Barrido>
      </div>
    );
  }
  return (
    <Aparece
      at={0}
      y={e.y ?? 0}
      x={e.x ?? 0}
      escala={e.escala ?? 1}
      muelle={MUELLES[e.muelle ?? "entrada"]}
      rampa={e.rampa ?? 8}
      // El desenfoque de llegada solo en el hero: en todo, la pieza entera se ve
      // fuera de foco medio segundo y se lee como un fallo de render.
      desenfoque={rol === "hero" ? e.desenfoque ?? 0 : 0}
      estilo={estilo}
      alfa={alfaSalida}
    >
      {children}
    </Aparece>
  );
};

/* ── Pieles ─────────────────────────────────────────────────────────────── */

/** Exportada para el CATÁLOGO: su demo de `piel` monta esta misma función, no
 *  una copia con los mismos números. Una copia es lo que ya divergió una vez. */
export const cajaPiel = (p: Piel<string>, paleta: Record<string, string>, base: string): React.CSSProperties => {
  // "marca" es el acento del dialecto de gráficos, que es de quien son también
  // `G.tinta`/`G.linea`/`SOMBRA.caja` de aquí abajo: las pieles siguen siendo
  // mobiliario de esa capa. Un dialecto sin "marca" cae a su tinta base en vez
  // de a `undefined`, que es lo que pintaba antes.
  const col = tintaDe(paleta, p.tinta ?? "marca", base);
  const ancho = p.ancho === "seguro" ? "100%" : p.ancho;
  if (p.caja === "campo")
    return {
      width: ancho,
      height: p.alto ?? 108,
      borderRadius: 18,
      border: `2px solid ${conAlfa(col, 0.55)}`,
      background: G.tinta,
      padding: "0 28px",
      boxShadow: `0 18px 50px rgba(0,0,0,.55), 0 0 40px ${conAlfa(col, 0.16)}`,
      gap: p.gap,
    };
  if (p.caja === "panel")
    return {
      width: ancho ?? 820,
      minHeight: p.alto ?? 460,
      background: G.tinta,
      borderRadius: 34,
      padding: 40,
      border: `1px solid ${G.linea}`,
      gap: p.gap,
    };
  // `sello` no MONTA <Sello> porque quien lleva la caja es el GRUPO, que ya es el
  // flex con su alineación y su separación: meter otro flex dentro añadiría un
  // nivel que se come el `gap` por hueco del plan. Lo que sí comparte con el
  // componente son los TOKENS de CAJA (padding, radio, borde, fondo, sombra),
  // que es lo que aquí estaba copiado a mano y ya había divergido.
  //
  // LA SEPARACIÓN ENTRE HERMANOS NO ES DE LA PIEL, ES DEL GRUPO — y por eso el
  // `gap` del token NO se hereda aquí. `RenderGrupo` monta la separación como
  // `marginTop`/`marginLeft` en cada hijo (`sepExtra`, del `gap` del plan o del
  // molde), así que un `gap` CSS en el contenedor se SUMA en vez de sustituirlo:
  // `col([...], { gap: 34, piel: { caja: "sello" } })` separaba 40 px, ni 34 ni
  // 6, y el comentario que decía «el gap del plan pisa al del token» describía
  // algo que no pasaba. Medido: piel `gap:6` → `gap:0` mueve 8.073 px.
  // `p.gap` sigue siendo la salida de escape para pedir aire EXTRA a propósito.
  // (`<Sello>` sí usa `CAJA.sello.gap`: allí no hay grupo debajo que separe.)
  return {
    ...CAJA.sello,
    width: ancho,
    minHeight: p.alto,
    gap: p.gap,
  };
};

/* ── Nodo ───────────────────────────────────────────────────────────────── */

/**
 * `alinea` del plan → `align-items`. Lo comparten el eje del grupo y las CELDAS
 * de una `pila`/`capas`/`ranura`, que antes iban sin `align-items`: con el
 * `stretch` por defecto, un hijo bajo (una `regla` de 8 px) se estiraba a toda
 * la celda y su contenido quedaba pegado ARRIBA. El tachón de una `pila` cruzaba
 * por el borde superior de la palabra en vez de por su centro — y "el tachón
 * sobre SU texto" es el caso de uso con el que el núcleo justifica que `pila`
 * exista. Las ranuras de estados iguales se salvaban por casualidad: sus hijos
 * medían lo mismo.
 */
const alineaCSS = (a: Alineacion | undefined): React.CSSProperties["alignItems"] =>
  a === "base" ? "baseline" : a === "inicio" ? "flex-start" : a === "fin" ? "flex-end" : "center";

function RenderHoja<R extends RegistroPiezas, C extends string>({
  nodo,
  ctx,
  color,
  rol,
  base,
  dura,
}: {
  nodo: Extract<Nodo<R, C>, { pieza: ClaveDe<R> }>;
  ctx: CtxToma<R, C>;
  color: string;
  rol: Rol;
  /** Frame de la TOMA en que arranca esta hoja (base de sus hijos `dentro`). */
  base: number;
  dura: number;
}): React.ReactElement {
  const f = useCurrentFrame();
  const montador = ctx.montadores[nodo.pieza];
  const cp: CtxPieza<C> = {
    f,
    len: dura,
    fps: ctx.vista.fps,
    ancho: ctx.vista.ancho,
    alto: ctx.vista.alto,
    tinta: (t, a) => tintaDe(ctx.paleta, t, ctx.base, a ?? 1),
    color,
    rol,
    px: ctx.escalaRol[rol],
    escala: ctx.vista.escala,
    estira: nodo.estira === true,
    ley: ctx.ley,
    marca: ctx.marca,
    letra: ctx.letra,
  };
  const pintado = montador(nodo.props as never, cp);
  if (!nodo.dentro || nodo.dentro.length === 0) return <>{pintado}</>;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18 }}>
      {pintado}
      {nodo.dentro.map((h, i) => (
        <RenderNodo key={i} nodo={h} ctx={ctx} sepExtra={0} base={base} />
      ))}
    </div>
  );
}

function RenderNodo<R extends RegistroPiezas, C extends string>({
  nodo,
  ctx,
  sepExtra,
  base,
  hasta,
  eje = "columna",
}: {
  nodo: Nodo<R, C>;
  ctx: CtxToma<R, C>;
  sepExtra: number;
  /** Frame de la TOMA en que arranca la <Sequence> que nos contiene. */
  base: number;
  /** Tope impuesto por el padre (una ranura mata el estado anterior). */
  hasta?: number;
  /** Eje del contenedor: decide si la separación es vertical u horizontal. */
  eje?: "fila" | "columna";
}): React.ReactElement | null {
  const en = ctx.momentos.porNodo.get(nodo);
  const fin = ctx.momentos.finPorNodo.get(nodo);
  // Un nodo sin momento es un `tras` que no resuelve. `revisaPlan` ya lo grita
  // por consola; aquí simplemente no se monta, en vez de aparecer en el frame 0.
  if (en === undefined) return null;
  // Suelo en 0. `resuelveMomentos` no acota por abajo: un `{tras:"x", mas:-20}`
  // sobre un nodo que aterriza en el frame 8 resuelve a −12, y Remotion acepta
  // un `from` negativo sin quejarse — el nodo aparece con su reloj interno ya
  // adelantado (la entrada a medias, el contador ya subido) y nadie avisa.
  const desde = Math.max(0, Math.round(en));
  const tope = Math.min(fin ?? ctx.len, hasta ?? ctx.len);
  const dura = Math.max(1, Math.round(tope) - desde);
  const rol: Rol = nodo.rol ?? "apoyo";
  // LA TINTA DEL MOLDE ES EL DEFECTO, y `dialecto.tintaBase` solo el suelo.
  //
  // Antes se iba directo a la tinta base, que es la del fondo DOMINANTE de la
  // capa; en un molde con otro fondo (`cine`: negro) eso significaba texto
  // carbón sobre negro, invisible, y sin un aviso —el color resolvía a un hex
  // perfectamente válido—. El plan tenía que acordarse de poner `color:
  // "blanco"` en CADA pieza de texto de la toma: el 006 lo escribe ONCE veces y
  // dejó anotada la trampa en su propio fichero. `Molde.tinta` es obligatoria,
  // así que aquí ya no hay nada que pueda faltar. La prueba está en
  // `sonda-ANTES.png` vs `sonda-DESPUES.png`: la toma `cine` del 006 escrita a
  // propósito SIN `color`, con y sin esta línea.
  const color = tintaDe(ctx.paleta, nodo.color ?? ctx.molde.tinta, ctx.base, (nodo.alfa ?? 1) * ctx.alfaRol[rol]);
  // La separación va por MARGEN y no por el `gap` del flex porque el plan puede
  // pedir un hueco distinto por par (la S6 del 003 pide 160/420/250). Y va en el
  // eje del contenedor: en una fila, un `marginTop` no separa nada — deja el
  // glifo pegado a su etiqueta y encima lo descuelga hacia abajo.
  const sep = (nodo.sep ?? 0) + sepExtra || undefined;
  const estilo: React.CSSProperties = {
    alignSelf: nodo.estira ? "stretch" : undefined,
    width: nodo.estira ? "100%" : undefined,
    marginTop: eje === "columna" ? sep : undefined,
    marginLeft: eje === "fila" ? sep : undefined,
  };

  // El `from` se acota: `desde` es local a la TOMA y `base` el arranque del
  // contenedor, así que un hijo cuyo `tras` apunta a un nodo que entró antes que
  // su propio grupo daría `desde − base < 0`.
  const retardo = Math.max(0, desde - base);
  const cuerpo = (
    <Envuelve envs={nodo.envolturas} ctx={ctx as unknown as CtxAnon} inicio={desde}>
      <Entra
        ley={ctx.ley}
        entra={nodo.entra}
        color={color}
        rol={rol}
        estilo={estilo}
        estira={nodo.estira === true}
        sale={nodo.sale}
        len={dura}
      >
        {esGrupo(nodo) ? (
          <RenderGrupo grupo={nodo} ctx={ctx} base={desde} />
        ) : (
          <RenderHoja nodo={nodo} ctx={ctx} color={color} rol={rol} base={desde} dura={dura} />
        )}
      </Entra>
    </Envuelve>
  );
  const vivo = (
    <Sequence from={retardo} durationInFrames={dura} layout="none" name={nodo.id}>
      {cuerpo}
    </Sequence>
  );
  if (retardo === 0 || ctx.ley.reserva !== true) return vivo;
  return (
    <>
      {/*
       * RESERVA DE MAQUETA (`ley.reserva`). El mismo árbol, CONGELADO en su
       * frame 0, ocupando su hueco desde que arranca el padre y hasta que entra
       * de verdad. Sin esto un bloque centrado se recoloca en cada entrada: la
       * toma editorial con kicker (0), titular (4) y etiqueta (10) daba tres
       * maquetas en diez frames y el titular se movía solo.
       *
       * <Freeze frame={0}> y no una copia a opacidad 0: las piezas que se animan
       * por dentro (RecortePrensa, ChipIcono, Medidor, TarjetaFoto) ya nacen a
       * opacidad 0 en su primer frame, y las que no (CifraContada muestra su
       * valor de partida) es que DEBEN verse. Es exactamente lo que hacía el
       * intérprete viejo con su `at`: antes del desfase, el componente se pinta
       * en su estado inicial, no desaparece.
       *
       * Nunca hay dos: cada <Sequence> es null fuera de su ventana, así que el
       * contenedor flex ve un solo hijo en todo momento.
       */}
      <Sequence durationInFrames={retardo} layout="none" name={nodo.id ? `${nodo.id}·sitio` : undefined}>
        <Freeze frame={0}>{cuerpo}</Freeze>
      </Sequence>
      {vivo}
    </>
  );
}

function RenderGrupo<R extends RegistroPiezas, C extends string>({
  grupo,
  ctx,
  base,
}: {
  grupo: Grupo<R, C>;
  ctx: CtxToma<R, C>;
  base: number;
}): React.ReactElement {
  const piel = "piel" in grupo && grupo.piel ? cajaPiel(grupo.piel, ctx.paleta, ctx.base) : {};

  if (grupo.eje === "diagrama") {
    return (
      <div style={{ position: "relative", width: grupo.ancho, height: grupo.alto }}>
        {grupo.hijos.map((h, i) => {
          const u = h as NodoUbicado<R, C>;
          const anclaX = u.ancla ?? "izq";
          const anclaY = u.anclaY ?? "arriba";
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: u.xy[0],
                top: u.xy[1],
                width: u.ancho,
                display: "flex",
                justifyContent: "center",
                // El ancla evita las restas a mano (830-20, 250-190…): un círculo
                // se ancla por su centro y una etiqueta por su caja.
                transform: `translate(${anclaX === "centro" ? "-50%" : anclaX === "der" ? "-100%" : "0"}, ${
                  anclaY === "centro" ? "-50%" : anclaY === "abajo" ? "-100%" : "0"
                })`,
              }}
            >
              <RenderNodo nodo={h} ctx={ctx} sepExtra={0} base={base} />
            </div>
          );
        })}
      </div>
    );
  }

  if (grupo.eje === "ranura") {
    if (grupo.conmuta === "volteo" && grupo.hijos.length === 2) {
      // El frame del giro NO se relee de `conmutaEn`: se lee ya resuelto del
      // estado 2, que es quien lo lleva. Así un `conmutaEn: [tras("titular")]`
      // funciona igual que un número, y no hay dos sitios que puedan discrepar.
      const giro = ctx.momentos.porNodo.get(grupo.hijos[1]);
      return (
        <div style={{ perspective: 1400 }}>
          <Tarjeta3D
            at={giro === undefined ? 0 : Math.round(giro) - base}
            frente={<RenderNodo nodo={grupo.hijos[0]} ctx={ctx} sepExtra={0} base={base} />}
            dorso={<RenderNodo nodo={grupo.hijos[1]} ctx={ctx} sepExtra={0} base={base} />}
          />
        </div>
      );
    }
    return (
      <div style={{ position: "relative", display: "grid", ...piel }}>
        {grupo.hijos.map((h, i) => {
          // Una ranura son estados que SE TURNAN: cada uno muere cuando entra el
          // siguiente. Sin este tope se apilan en el mismo hueco de la rejilla y
          // el último se lee encima del anterior el resto de la toma.
          const siguiente = grupo.hijos[i + 1];
          const releva = siguiente ? ctx.momentos.porNodo.get(siguiente) : undefined;
          return (
            <div key={i} style={{ gridArea: "1 / 1", display: "flex", justifyContent: "center", alignItems: "center" }}>
              <RenderNodo nodo={h} ctx={ctx} sepExtra={0} base={base} hasta={releva} />
            </div>
          );
        })}
      </div>
    );
  }

  const esFila = grupo.eje === "fila";
  const superpone = grupo.eje === "pila" || grupo.eje === "capas";
  const caja: React.CSSProperties = superpone
    ? { position: "relative", display: "grid", ...piel }
    : {
        display: "flex",
        flexDirection: esFila ? "row" : "column",
        alignItems: alineaCSS(grupo.alinea),
        justifyContent: "center",
        textAlign: "center",
        // La familia se hereda desde aquí: las piezas de esta capa no la
        // declaran (las editoriales sí, con `T.*`). Sale del DIALECTO, así que
        // un canal puede pedir la suya con `marca.letraPorCapa.graficos`.
        fontFamily: ctx.letra.texto,
        ...piel,
      };

  return (
    <div style={caja}>
      {grupo.hijos.map((h, i) =>
        superpone ? (
          <div
            key={i}
            style={{ gridArea: "1 / 1", display: "flex", justifyContent: "center", alignItems: alineaCSS(grupo.alinea) }}
          >
            <RenderNodo nodo={h} ctx={ctx} sepExtra={0} base={base} />
          </div>
        ) : (
          <RenderNodo
            key={i}
            nodo={h}
            ctx={ctx}
            base={base}
            eje={esFila ? "fila" : "columna"}
            sepExtra={i === 0 ? 0 : gapEntre(grupo.gap, i - 1, ctx.molde.gap)}
          />
        )
      )}
    </div>
  );
}

/* ── Ambiente y molde ───────────────────────────────────────────────────── */

interface ScrimPintado {
  alto: number;
  desde: "abajo" | "arriba";
  opacidad?: number;
  /** En cuántos frames sube el velo. 3 por defecto; 0 = puesto desde el f0. */
  rampa: number;
}

/**
 * El scrim lo pone el MOLDE y la toma solo se aparta. Acoplarlo al molde es lo
 * que impide olvidarlo: en la capa vieja el degradado se pedía cue a cue y
 * bastaba una toma sin él para que el texto cayera sobre las manos del avatar.
 */
const scrimDe = (amb: Ambiente<string> | undefined, molde: Molde): ScrimPintado | null => {
  const propio = amb ? amb.scrim : undefined;
  if (propio === false) return null;
  if (molde.scrim === false && propio === undefined) return null;
  const porDefecto = molde.scrim === false ? { alto: 830, desde: "abajo" as const } : molde.scrim;
  return {
    alto: propio && propio.alto !== undefined ? propio.alto : porDefecto.alto,
    desde: propio && propio.desde !== undefined ? propio.desde : porDefecto.desde,
    opacidad: propio ? propio.opacidad : undefined,
    // 3 f es lo que el intérprete hacía a fuego antes de que esto fuera un dato
    // del plan: el defecto no mueve un píxel de ninguna pieza publicada.
    rampa: propio && propio.rampa !== undefined ? propio.rampa : 3,
  };
};

/**
 * EL FONDO DE UN MOLDE, por nombre. El intérprete no sabe dibujar fondos: el
 * degradado de `toma` es el ÚNICO que era suyo, y estaba escrito a mano dentro
 * de un `molde.fondo === "toma"`. Ahora es una entrada más de este mapa, y el
 * dialecto editorial pasa el suyo (`{papel: FondoPapel, cine: FondoCine}`).
 */
const FondoToma: React.FC = () => (
  <AbsoluteFill
    style={{
      background: `linear-gradient(168deg, #212734 0%, #181C25 32%, #12151B 64%, ${PALETA_MARCA.fondo} 100%)`,
    }}
  />
);

export const FONDOS_BASE: Record<string, React.FC> = { toma: FondoToma };

const CapasAmbiente: React.FC<{
  amb: Ambiente<string> | undefined;
  molde: Molde;
  paleta: Record<string, string>;
  base: string;
  fondos: Record<string, React.FC>;
  scrimColor: string;
  /** Id de la toma: siembra las partículas para que dos tomas no salgan clonadas. */
  semilla: string;
}> = ({ amb, molde, paleta, base, fondos, scrimColor, semilla }) => {
  const f = useCurrentFrame();
  const scrim = scrimDe(amb, molde);
  const Fondo = molde.fondo ? fondos[molde.fondo] : undefined;
  const vineta = amb && amb.vineta !== undefined ? amb.vineta : molde.vineta;
  const foco = amb ? amb.foco : undefined;
  const tintaFoco = foco && foco.cambiaEn && f >= foco.cambiaEn.f ? foco.cambiaEn.tinta : foco ? foco.tinta : undefined;
  const trama = amb ? amb.trama : undefined;
  const particulas = amb ? amb.particulas : undefined;
  return (
    <>
      {Fondo ? <Fondo /> : null}
      {foco ? (
        <Resplandor
          color={tintaDe(paleta, tintaFoco, base)}
          cx={foco.cx}
          cy={foco.cy}
          radio={foco.radio}
          intensidad={foco.fuerza ?? 0.17}
          pulso={foco.pulso}
        />
      ) : null}
      {trama ? (
        trama.tipo === "rejilla" ? (
          <Rejilla color={tintaDe(paleta, trama.tinta, base)} opacidad={trama.opacidad} paso={trama.paso} />
        ) : (
          <Puntos color={tintaDe(paleta, trama.tinta, base)} opacidad={trama.opacidad} paso={trama.paso} />
        )
      ) : null}
      {vineta ? <Vineta intensidad={typeof vineta === "object" ? vineta.intensidad : undefined} /> : null}
      {scrim ? (
        // Entra en `rampa` frames (3 por defecto) y MUERE con la toma (nunca se
        // funde): si se fundiera, los últimos frames del texto se leerían sobre
        // las manos del avatar.
        //
        // LA RAMPA ES UN DATO DEL PLAN, y tuvo que serlo (R25). Estaba escrita
        // a fuego aquí, y eso convertía el `entra: { como: "ninguna" }` de R23
        // en una promesa a medias: el TEXTO salía puesto en el frame 0 y el
        // velo que lo hace legible no. Medido en el 013 sobre el render: en el
        // f0 el fondo de la banda estaba en luma 141 y el acento del canal daba
        // **1,04:1**; en el f4, ya con el velo arriba, 5,37:1. Y el frame 0 es
        // la MINIATURA del reel. Con `rampa: 0` el velo está puesto desde el
        // primer frame, igual que el texto.
        //
        // La rampa se hace a mano sobre un <AbsoluteFill> y NO con <Aparece>,
        // que es lo que había: <Aparece> aplica siempre un `transform`, y un
        // transform convierte su div en bloque contenedor de los descendientes
        // absolutos. Ese div es además un flex-item vacío —el <Scrim> es
        // `position:absolute` y no cuenta— así que medía 0 px en y=0 y un scrim
        // con `bottom:0` se dibujaba en y ∈ [−alto, 0]: entero fuera de cuadro.
        // Los dos únicos moldes que declaran scrim (sello y cta) lo hacen
        // `desde:"abajo"`, o sea que el degradado que protege el titular no
        // salía en NINGUNA toma, con el validador diciendo LIMPIO. Es el mismo
        // patrón que ya usa <PistaNoticia>, donde sí se ve.
        <AbsoluteFill
          style={{
            // `interpolate` con un rango degenerado ([0,0]) lanza, así que la
            // rampa cero se contesta antes de llamarlo.
            opacity:
              scrim.rampa <= 0
                ? 1
                : interpolate(f, [0, scrim.rampa], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }),
          }}
        >
          <Scrim alto={scrim.alto} desde={scrim.desde} opacidad={scrim.opacidad} color={scrimColor} />
        </AbsoluteFill>
      ) : null}
      {particulas ? (
        <Particulas
          n={particulas.n}
          modo={particulas.modo}
          at={particulas.en ?? 0}
          dur={particulas.dur ?? 60}
          semilla={semilla}
          origen={particulas.origen ? [particulas.origen[0], particulas.origen[1]] : undefined}
          forma={particulas.forma}
          colores={particulas.tintas ? particulas.tintas.map((t) => tintaDe(paleta, t, base)) : undefined}
        />
      ) : null}
    </>
  );
};

/** El ancla va en FRACCIÓN del alto real, no en px: el mismo plan sirve en 9:16
 *  y en 16:9 sin recolocar nada a mano. */
const cajaMolde = (ancla: Ancla, v: Vista, alinea: string, fuente: string): React.CSSProperties => {
  const comun: React.CSSProperties = {
    position: "absolute",
    left: v.margen,
    right: v.margen,
    display: "flex",
    flexDirection: "column",
    alignItems: alinea === "inicio" ? "flex-start" : alinea === "fin" ? "flex-end" : "center",
    textAlign: "center",
    // La familia HEREDADA del bloque, del dialecto. Ver la nota de `RenderGrupo`.
    fontFamily: fuente,
  };
  if (ancla.desde === "arriba") return { ...comun, top: Math.round(v.alto * ancla.pct) };
  if (ancla.desde === "abajo") return { ...comun, bottom: Math.round(v.alto * ancla.pct) };
  if (ancla.cuelga === undefined) return { ...comun, top: 0, bottom: 0, justifyContent: "center" };
  // EL BLOQUE CUELGA Y LA CAJA NO SE MUEVE. El `paddingBottom` NO encoge la caja
  // de padding, que es el bloque contenedor de los hijos absolutos: el metraje a
  // sangre y su `velo` siguen resolviendo su `top: 50%` contra los 1920 del
  // cuadro y siguen cayendo en su centro. Por eso el titular de un `escenario`
  // puede colgar del tercio inferior sin descuadrar el plano — que es justo lo
  // que no permitía anclar `desde: "abajo"` (ver `Ancla.cuelga` en nucleo.ts).
  return {
    ...comun,
    top: 0,
    bottom: 0,
    justifyContent: "flex-end",
    paddingBottom: Math.round(v.alto * ancla.cuelga),
  };
};

/* ── La toma ────────────────────────────────────────────────────────────── */

function RenderToma<R extends RegistroPiezas, B extends string, M extends string, C extends string>({
  toma,
  ctx,
  len,
  encima,
}: {
  toma: Toma<R, B, M, C>;
  ctx: CtxToma<R, C>;
  len: number;
  encima?: (toma: Toma<R, B, M, C>) => ReactNode;
}): React.ReactElement {
  const f = useCurrentFrame();
  const molde = ctx.molde;
  // Punch-in de FORMATO: es del molde, no de cada toma. En una pieza con avatar
  // la cámara ya decide el movimiento, así que aquí por defecto es 0.
  const escala = molde.punch ? interpolate(f, [0, len], [1, 1 + molde.punch], { easing: EASE.inOutCubic }) : 1;
  const salida = ctx.ley.salida;
  const op = salida.como === "fundido" ? opacidadVentana(f, len, 1, salida.dur ?? 8) : 1;
  return (
    <AbsoluteFill style={{ opacity: op }}>
      <CapasAmbiente
        amb={toma.ambiente}
        molde={molde}
        paleta={ctx.paleta}
        base={ctx.base}
        fondos={ctx.fondos}
        scrimColor={ctx.scrimColor}
        semilla={toma.id}
      />
      {/*
       * El punch escala el CONTENIDO y no el fondo, y va en un <AbsoluteFill>
       * propio para que el origen de la escala sea el centro del CUADRO y no el
       * de la caja del molde (que en un ancla "arriba"/"abajo" está en otro
       * sitio). Escalar también el fondo movería el grano del papel y el foco
       * cenital, que son textura fija: se leería como un temblor de cámara.
       */}
      <AbsoluteFill style={{ transform: escala === 1 ? undefined : `scale(${escala})` }}>
        <div style={cajaMolde(toma.ancla ?? molde.ancla, ctx.vista, toma.alinea ?? molde.alinea, ctx.letra.texto)}>
          {toma.hijos.map((h, i) => (
            <RenderNodo
              key={i}
              nodo={h}
              ctx={ctx}
              base={0}
              sepExtra={i === 0 ? 0 : gapEntre(toma.gap, i - 1, molde.gap)}
            />
          ))}
        </div>
      </AbsoluteFill>
      {/* Lo que el FORMATO pone encima de todas sus tomas y el plan no debe poder
       *  olvidar: el watermark del canal en noticias. Fuera del punch, porque un
       *  sello que respira delata que hay un zoom. */}
      {encima ? encima(toma) : null}
    </AbsoluteFill>
  );
}

/**
 * Monta el plan completo. El orden del array ES el z-order (lo último, encima),
 * igual que en el resto del sistema: si un gráfico debe ir por debajo de otro,
 * muévelo en el plan, no le pongas zIndex.
 */
export function PistaGraficos<
  R extends RegistroPiezas,
  B extends string,
  M extends string,
  C extends string
>({
  plan,
  montadores,
  fondos = FONDOS_BASE,
  encima,
  scrimColor = PALETA_MARCA.fondo,
}: {
  plan: Plan<R, B, M, C>;
  montadores: Montadores<R, C, ReactNode>;
  /** `molde.fondo` → componente. Por defecto, los de la capa de gráficos. */
  fondos?: Record<string, React.FC>;
  /** Capa persistente del FORMATO sobre cada toma (el sello del canal). */
  encima?: (toma: Toma<R, B, M, C>) => ReactNode;
  /** Color del degradado del scrim. Por defecto el fondo de la capa de gráficos. */
  scrimColor?: string;
}): React.ReactElement {
  const { width, height, fps } = useVideoConfig();
  // El validador que el README prometía y nadie llamaba. En useMemo porque esto
  // se re-renderiza en cada frame y las comprobaciones cruzadas son cuadráticas.
  const avisos = useMemo(() => revisaPlan(plan), [plan]);
  avisaDelPlan(plan.capa, avisos);

  const paleta = useMemo(
    () => ({ ...plan.dialecto.paleta, ...(plan.paleta ?? {}) }) as Record<C, string>,
    [plan]
  );
  const vista: Vista = { ancho: width, alto: height, fps, margen: margenSeguro(width, zonaSeguraDe(width, height)), escala: escalaPorAncho(width) };

  return (
    <>
      {plan.tomas.map((t) => {
        const [ini, fin] = ventanaAbs(t.ventana, plan.formato.duracion);
        const len = Math.max(1, fin - ini);
        const ley: Ley = { ...plan.dialecto.ley, ...t.ley };
        const ctx: CtxToma<R, C> = {
          montadores,
          paleta,
          base: plan.dialecto.tintaBase,
          marca: plan.dialecto.marca,
          letra: plan.dialecto.letra,
          escalaRol: plan.dialecto.escala,
          alfaRol: plan.dialecto.alfaRol,
          ley,
          molde: plan.dialecto.moldes[t.molde],
          vista,
          momentos: resuelveMomentos(t, ley, len),
          len,
          fondos,
          scrimColor,
        };
        return (
          // El `name` lleva el beat: la timeline del Studio se lee como escaleta.
          <Sequence key={t.id} from={ini} durationInFrames={len} layout="none" name={`${plan.capa}:${t.beat}:${t.id}`}>
            <RenderToma toma={t} ctx={ctx} len={len} encima={encima} />
          </Sequence>
        );
      })}
    </>
  );
}
