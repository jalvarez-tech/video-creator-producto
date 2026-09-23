// ═══════════════════════════════════════════════════════════════════════════
// LOS MONTADORES EDITORIALES: la mitad en JSX del dialecto de noticias.
//
// `dialecto.ts` dice QUÉ piezas existen y qué se considera una noticia mal
// escrita. Este archivo dice CÓMO se dibuja cada una. Están separados a
// propósito: el dialecto es datos puros (se valida con `node`, sin React) y esto
// es la única parte que necesita el DOM.
//
// El registro es un mapeado TOTAL sobre `PIEZAS_NOTICIA`, así que añadir una
// ficha allí ROMPE la compilación de este archivo hasta escribir su rama. Ésa es
// la vacuna contra el fallo de v1 (37 primitivas anunciadas, 16 servidas): el
// catálogo no puede volver a mentir por construcción, no por un test.
//
// ── LAS TRES REGLAS DE LA CASA ────────────────────────────────────────────
//
// 1. AQUÍ NO SE DIBUJA NADA NUEVO. Cada rama traduce props del plan a props de
//    un componente que YA existe en `Editorial.tsx`. Si una rama empieza a
//    dibujar, es que a la biblioteca le falta una pieza. Y si un montador
//    necesita una prop que el componente no tiene, se anota como DEUDA (abajo)
//    en vez de tocar el componente: `Editorial.tsx` es lo que renderiza el 004 y
//    el 005 ya publicados, y el paso 9 exige comparar frame a frame.
//
// 2. EL MONTADOR NUNCA PASA `at`. Los componentes de Editorial admiten un `at`
//    para desfasarse, y el intérprete actual lo usa mucho (`at={2}` del recorte,
//    `at={(titular ? 8 : 2) + i * 6}` de los chips…). En el sistema nuevo el
//    desfase es del PLAN (`en` del nodo) y el intérprete ya mete cada hoja en su
//    propia <Sequence>, así que dentro del montador el frame 0 ES el frame de
//    entrada del nodo. Pasar además un `at` sería contar el desfase dos veces.
//
// 3. EL COLOR Y EL TAMAÑO VIENEN DEL CONTEXTO, no del theme, salvo respaldo. El
//    plan pide `color: "acento"` y el intérprete lo resuelve contra la paleta;
//    el theme solo aporta el valor por defecto, que es EXACTAMENTE lo que pinta
//    hoy `PistaNoticia.tsx` (un `<span style={{...T.kicker}}>` sin override).
//
// ── DEUDAS (props que el montador querría y el componente no tiene) ────────
//
//  · `RecortePrensa` localiza el fragmento a rotular con `indexOf` sobre el
//    titular. Como aquí el fragmento SALE del propio titular (es el trozo con
//    `rotulador`), el fallo de «no aparece y no se dibuja nada» deja de poder
//    existir; queda un caso menor: si ese mismo texto aparece ANTES en la
//    frase, se marca la primera aparición y no la declarada. Se arregla el día
//    que `RecortePrensa` acepte trozos en vez de un string.
//  · `RecortePrensa` recibe `titular: string`: dentro de un recorte, un trozo
//    con `tinta` o `tachado` se pierde (solo sobrevive `rotulador`).
//  · `ChipIcono` tiene el naranja cableado (`N.naranjaChip` / gris si
//    `activo:false`): un `color` en el nodo de un chip NO hace nada.
//  · `Cronologia` también: raíl y puntos van siempre en `N.naranja`.
//  · `CifraContada` empieza a contar en su frame 0. El intérprete viejo la
//    metía dentro de un `<Entra at={3}>` y encima le pasaba `at={4}`, o sea que
//    el conteo arrancaba 4 f DESPUÉS de la entrada del bloque. Ese desfase
//    interno no es declarable: `compilaNoticia` (paso 8) tiene que sumarlo al
//    `en` del nodo o la cifra del 004 arrancará 4 f antes.
//  · Los componentes con geometría en px (recorte 840, cronología 780, medidor
//    760, tarjeta 640×820) no se reescalan con `ctx.escala`: solo el texto lo
//    hace. En 1080 de ancho `escala` vale 1 y da igual; en 16:9 el texto
//    crecería y las cajas no.
//
// ── LO QUE ESTE ARCHIVO CIERRA ────────────────────────────────────────────
//
// `resaltar` deja de ser un string suelto al lado del titular y pasa a ser un
// `Trozo` con `rotulador: true` DENTRO del texto. La relación deja de ser una
// búsqueda y pasa a ser estructural, así que la regla de `revisaNoticia` que
// avisaba de que el fragmento no aparecía en el titular se queda sin fallo que
// vigilar. NO se borra todavía: `plan.ts` sigue siendo el camino vivo del 004 y
// el 005 hasta el paso 8.
//
// Y el rotulador se DIBUJA (barrido de 14 a 26), no aparece: un resaltado que
// sale de golpe se lee como error de render; uno que se dibuja se lee como
// alguien marcando el periódico. Es el mismo gesto que ya hacía `RecortePrensa`
// dentro, ahora disponible en cualquier titular, kicker o etiqueta.
// ═══════════════════════════════════════════════════════════════════════════

import type { ReactNode } from "react";
import { AbsoluteFill, Img, OffthreadVideo, interpolate, staticFile } from "remotion";
import { formatea } from "../formato";
import { EASE, durSegura } from "../motion";
import { Scrim } from "../graficos/Fondos";
import { GLIFO } from "../graficos/Glifos";
import { textoPlano } from "../plan/nucleo";
import type { ClaveDe, CtxPieza, Montadores, Trozo } from "../plan/nucleo";
import {
  ChipIcono,
  CifraContada,
  Cronologia,
  DiagramaGrieta,
  FondoCine,
  FondoPapel,
  Medidor,
  RecortePrensa,
  Sello,
  TarjetaFoto,
} from "./Editorial";
import type { MoldeNoticia, PiezasNoticia, TextoN, TintaNoticia } from "./dialecto";
import type { GradoMedia } from "./plan";
import { LAYOUT, METRAJE, N, alfaN, temaNoticiasDe } from "./theme-noticias";
import { MARCA_BASE } from "../marca";
import type { Marca } from "../marca";
import { montadoresComunes } from "../piezas/montadores";

/** Las claves del registro, DERIVADAS: nadie escribe esta unión a mano. */
export type PiezaNoticia = ClaveDe<PiezasNoticia>;

type CtxN = CtxPieza<TintaNoticia>;

/* ── Color y tamaño ───────────────────────────────────────────────────────── */

/**
 * El color del nodo, con respaldo del theme.
 *
 * `ctx.color` está TIPADO como `string`, pero llega vacío en un caso real: el
 * intérprete resuelve el color por defecto contra `paleta.texto`, y esa tinta no
 * existe en el dialecto editorial (las seis son tinta/suave/blanco/acento/
 * resalte/papel). Un nodo sin `color` acabaría pintando `color: undefined`, que
 * en CSS es "hereda" y en un titular sobre negro significa texto invisible.
 *
 * El respaldo NO es un parche: es exactamente lo que pinta hoy `PistaNoticia`
 * (`<span style={{...T.kicker}}>`, sin override), así que un plan que no declare
 * color renderiza igual que la pieza publicada. El arreglo de verdad —que el
 * intérprete común use la tinta por defecto del dialecto— es del paso 8.
 */
const colorDe = (c: CtxN, respaldo: string): string =>
  typeof c.color === "string" && c.color.length > 0 ? c.color : respaldo;

/**
 * Tamaño final de un texto: el que pida la pieza, o el del ROL del nodo, ya
 * escalado al ancho del formato.
 *
 * Que el rol decida no es casualidad: la escala del dialecto (96/44/28) son
 * literalmente `T.titular`/`T.etiqueta`/`T.kicker`. Coinciden mientras el titular
 * vaya en un nodo `hero`, la etiqueta en `apoyo` y el kicker en `contexto` —que
 * es lo que tiene que compilar el paso 8—. Si no, este montador y el
 * `ficha.alto` del dialecto estarían estimando cosas distintas y R08 mentiría.
 *
 * El `|| respaldo` es el suelo para un `px: 0` en el plan.
 */
const pxTexto = (c: CtxN, propio: number | undefined, respaldo: number): number =>
  Math.round((propio ?? c.px) * c.escala) || respaldo;

/**
 * EL TEMA SALE DEL CONTEXTO, NO DEL MÓDULO.
 *
 * Este archivo hacía `import { T } from "./theme-noticias"` y lo consumía como
 * objeto estático. Mientras eso fuera así la marca no podía ser un parámetro:
 * cambiarla cambiaba TODOS los proyectos publicados a la vez. Ahora la marca
 * viaja en el dialecto y llega al montador como `c.marca`, así que el tema se
 * resuelve por nodo y dos canales pueden convivir en el mismo repo.
 *
 * `temaNoticiasDe` está memoizado por identidad de marca, o sea que esto es una
 * búsqueda en un `Map`, no reconstruir el tema en cada frame.
 */
const temaDe = (c: CtxN) => temaNoticiasDe(c.marca);

/**
 * EL ACENTO DE LO DECORATIVO — y por qué NO es el color del nodo.
 *
 * El primer intento fue `c.colorPropio ?? c.tinta("acento")`: que mandara el
 * plan si decía algo. Lo tumbó la sonda en un frame, y el motivo es una lección
 * sobre este dialecto: `compilaToma` YA escribe `color: "tinta"` en el nodo de
 * la cronología (dialecto.ts), y ese color significa EL TEXTO —el año y su
 * descripción—. El raíl y los puntos son otra cosa. Al hacer que el plan mandara
 * sobre el acento, el raíl salió carbón sobre papel: una pieza que dejaba de
 * leerse como línea de tiempo.
 *
 * O sea que en esta capa el nodo tiene UN color y estas piezas tienen DOS
 * cosas que colorear. Mientras el plan no tenga vocabulario para pedir el
 * segundo —un `acento?: TintaNoticia` en la ficha, si algún día hace falta—, el
 * acento sale de la marca y punto. Que es exactamente lo que hacía el naranja
 * cableado; la diferencia es que ahora sale de `c.tinta`, así que lo alcanzan
 * tanto el canal como un `plan.paleta` de proyecto.
 */
const acentoDe = (c: CtxN): string => c.tinta("acento");

/**
 * El acento CON CUERPO de los chips. Es otro color, no el mismo con otro alfa:
 * `acentoChip` es más terroso (#E8863A frente a #FF5500) porque un chip es una
 * superficie y el naranja puro a ese tamaño vibra. Lo cazó la sonda: sustituirlo
 * por el acento a secas movía todos los chips de la pieza.
 *
 * No pasa por `c.tinta` porque `TintaNoticia` no tiene esa clave —la paleta del
 * dialecto son seis tintas semánticas y ésta es un tono de MARCA—, así que sale
 * de `c.marca`.
 */
const acentoChipDe = (c: CtxN): string => c.marca.color.acentoChip;

/* ── Texto rico: la palabra de otro color, el tachado y el rotulador ──────── */

/**
 * Ventana del barrido del rotulador, en frames DEL NODO. Son los mismos 14→26
 * que usa `RecortePrensa` por dentro: primero se lee la frase, luego se marca.
 * Al revés no se entiende qué se está subrayando.
 *
 * No es declarable desde el plan porque `ficha.titular` no tiene campo para
 * ello. Se deja fijo a propósito: el gesto es del FORMATO (alguien marcando el
 * periódico), no una decisión de cada toma.
 */
const ROTULA: readonly [number, number] = [14, 26];

const Trocito: React.FC<{ x: Trozo<TintaNoticia>; c: CtxN }> = ({ x, c }) => {
  const estilo: React.CSSProperties = {
    color: x.tinta ? c.tinta(x.tinta) : undefined,
    fontWeight: x.enfasis ? 800 : undefined,
    textDecoration: x.tachado ? "line-through" : undefined,
  };
  if (!x.rotulador) return <span style={estilo}>{x.t}</span>;
  const marca = interpolate(c.f, [ROTULA[0], ROTULA[1]], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE.outCubic,
  });
  return (
    // Misma construcción que dentro de `RecortePrensa`: banda amarilla DETRÁS de
    // la palabra (no un `background` del span, que se pintaría entero desde el
    // frame 0) y `transformOrigin: left` para que el trazo vaya de izquierda a
    // derecha, como una mano.
    <span style={{ ...estilo, position: "relative", display: "inline" }}>
      <span
        style={{
          position: "absolute",
          left: -4,
          right: -4,
          bottom: 2,
          top: "18%",
          background: alfaN(N.resalte, 0.85),
          transform: `scaleX(${marca})`,
          transformOrigin: "left center",
          zIndex: 0,
        }}
      />
      <span style={{ position: "relative", zIndex: 1 }}>{x.t}</span>
    </span>
  );
};

const Rico: React.FC<{ t: TextoN; c: CtxN }> = ({ t, c }) => {
  if (typeof t === "string") return <>{t}</>;
  return (
    <>
      {t.map((x, i) => (typeof x === "string" ? <span key={i}>{x}</span> : <Trocito key={i} x={x} c={c} />))}
    </>
  );
};

/** El primer trozo marcado con rotulador, para las piezas que solo aceptan string. */
const trozoRotulado = (t: TextoN): string | undefined => {
  if (typeof t === "string") return undefined;
  for (const x of t) if (typeof x !== "string" && x.rotulador) return x.t;
  return undefined;
};

/* ── Media ────────────────────────────────────────────────────────────────── */

/**
 * El contenido de una pieza `media`: vídeo, imagen, o el marco vacío mientras el
 * b-roll no existe. Copiado del `Media` privado de `PistaNoticia.tsx`, que
 * desaparece con él en el paso 8.
 *
 * El marco "pendiente" es deliberado y no un placeholder olvidado: permite
 * maquetar la pieza entera antes de generar un solo clip. Que llegue al render
 * final es un fallo, y por eso `ficha.media` avisa de un `media` sin `src`.
 */
/**
 * `fuente` es la familia del marco vacío ("pendiente"), y llega por prop en vez
 * de salir de un `import { T }`: este componente lo monta un montador, que sí
 * tiene la marca en el contexto. Es la misma razón por la que `Sello` dejará de
 * tener `MARCA.sello` como valor por defecto.
 */
export const MediaNoticia: React.FC<{ src?: string; esVideo?: boolean; grado?: GradoMedia; fuente: string }> = ({
  src,
  esVideo,
  grado,
  fuente,
}) => {
  if (!src) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#DBD5C9",
          fontFamily: fuente,
          fontSize: 26,
          letterSpacing: 3,
          color: N.tintaSuave,
          textTransform: "uppercase",
        }}
      >
        pendiente
      </div>
    );
  }
  // EL ORDEN ES EL DEL OFICIO Y NO ES INTERCAMBIABLE: primero se CORRIGE cada
  // clip (`grado`, que se mide con `bancos.py gradar`) para que todos partan del
  // mismo sitio, y solo después se aplica el LOOK del formato (`METRAJE`), igual
  // para todos. Al revés —look uniforme sobre clips sin igualar— el look
  // amplifica las diferencias en vez de taparlas: cada clip viene ya graduado
  // por su autor y el mismo filtro empuja el color de cada uno hacia otro lado.
  const estilo: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    filter: [
      `brightness(${((grado?.exposicion ?? 1) * 100).toFixed(1)}%)`,
      `contrast(${(((grado?.contraste ?? 1) * METRAJE.contraste) * 100).toFixed(1)}%)`,
      `saturate(${(((grado?.saturacion ?? 1) * METRAJE.saturacion) * 100).toFixed(1)}%)`,
    ].join(" "),
  };
  return (
    <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}>
      {esVideo ? (
        <OffthreadVideo src={staticFile(src)} style={estilo} />
      ) : (
        <Img src={staticFile(src)} style={estilo} />
      )}
      {/* El velo cálido del formato, más lo que pida el clip para corregir su
       *  propia dominante. `calido` negativo enfría (velo azulado). */}
      <AbsoluteFill
        style={{
          background:
            (grado?.calido ?? 0) < 0
              ? alfaN("#4A6C8A", Math.min(0.5, METRAJE.calido + Math.abs(grado?.calido ?? 0)))
              : alfaN(N.papel, Math.min(0.5, METRAJE.calido + (grado?.calido ?? 0))),
          mixBlendMode: "soft-light",
          pointerEvents: "none",
        }}
      />
      {/* Grano: el mismo de `FondoPapel`, y a propósito. Un grano compartido es
       *  lo que hace que dos clips de dos cámaras se lean como una sola pieza. */}
      <AbsoluteFill
        style={{
          backgroundImage: `repeating-conic-gradient(${alfaN("#8A8172", METRAJE.grano)} 0% 25%, transparent 0% 50%)`,
          backgroundSize: "6px 6px",
          pointerEvents: "none",
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 50%, transparent 55%, ${alfaN("#000000", METRAJE.vineta)} 100%)`,
          pointerEvents: "none",
        }}
      />
    </div>
  );
};

/* ── EL REGISTRO ──────────────────────────────────────────────────────────── */

export const MONTADORES_NOTICIA: Montadores<PiezasNoticia, TintaNoticia, ReactNode> = {
  // El MISMO JSX que monta la capa de gráficos para las seis compartidas: no hay
  // una copia editorial del subrayado. Pintan con `c.color`, que aquí resuelve a
  // la tinta del molde — carbón sobre papel, blanco sobre cine.
  ...montadoresComunes<TintaNoticia>(),
  // ── Texto ────────────────────────────────────────────────────────────────
  kicker: (p, c) => {
    const { T } = temaDe(c);
    return (
      <span style={{ ...T.kicker, fontSize: pxTexto(c, p.px, T.kicker.fontSize), color: colorDe(c, T.kicker.color) }}>
        <Rico t={p.texto} c={c} />
      </span>
    );
  },

  titular: (p, c) => {
    const { T } = temaDe(c);
    const estilo: React.CSSProperties = {
      ...T.titular,
      fontSize: pxTexto(c, p.px, T.titular.fontSize),
      color: colorDe(c, T.titular.color),
    };
    if (!p.lineas) {
      return (
        <span style={estilo}>
          <Rico t={p.texto ?? ""} c={c} />
        </span>
      );
    }
    // `lineas` = saltos EXPLÍCITOS. El `nowrap` por línea es lo que hace que el
    // salto SIGNIFIQUE algo: si la línea pudiera partirse sola, el plan estaría
    // declarando una intención que decide el ancho — que es exactamente el bug
    // del n16 del 005, donde la maqueta del autor se perdía en silencio. Con
    // `nowrap` una línea demasiado larga se sale del margen y SE VE; el fallo
    // deja de ser invisible, que es todo lo que se le pide.
    return (
      <span style={estilo}>
        {p.lineas.map((l, i) => (
          <span key={i} style={{ display: "block", whiteSpace: "nowrap" }}>
            <Rico t={l} c={c} />
          </span>
        ))}
      </span>
    );
  },

  etiqueta: (p, c) => {
    const { T } = temaDe(c);
    return (
      <span
        style={{ ...T.etiqueta, fontSize: pxTexto(c, p.px, T.etiqueta.fontSize), color: colorDe(c, T.etiqueta.color) }}
      >
        <Rico t={p.texto} c={c} />
      </span>
    );
  },

  // ── Prueba periodística ──────────────────────────────────────────────────
  // El titular baja a texto plano (el componente no sabe de trozos) y el
  // fragmento a rotular SALE de ese mismo texto: por eso ya no puede no
  // encontrarse. Ver la deuda del encabezado para el caso que queda vivo.
  //
  // LA FAMILIA VA POR PROP en esta pieza y en las cuatro de abajo (chip, cifra,
  // medidor, cronología): `Editorial.tsx` la tomaba del `T` de módulo, que es el
  // de `MARCA_BASE`, y una marca con otra letra no llegaba a estas cinco. Con
  // las marcas que comparten la letra del suelo es el mismo string: 0 píxeles.
  // Aquí se llama `letra` porque `fuente` ya es el MEDIO del recorte.
  recorte: (p, c) => (
    <RecortePrensa
      titular={textoPlano(p.titular)}
      fuente={p.fuente}
      resaltar={trozoRotulado(p.titular)}
      ancho={p.ancho}
      rotacion={p.rotacion}
      letra={temaDe(c).FUENTE}
    />
  ),

  // ── Comparación ──────────────────────────────────────────────────────────
  // Sin `ctx` para el color: el chip no honra el color del nodo (deuda del
  // encabezado). El stagger entre chips tampoco vive aquí — son nodos hermanos
  // de una `fila` y el desfase lo pone el `paso` del grupo.
  chip: (p, c) => (
    <ChipIcono
      acento={acentoChipDe(c)}
      glifo={GLIFO[p.glifo]}
      label={p.texto}
      activo={p.activo !== false}
      tam={p.tam}
      fuente={temaDe(c).FUENTE}
    />
  ),

  // ── Dato ─────────────────────────────────────────────────────────────────
  cifra: (p, c) => (
    <CifraContada
      de={p.de ?? 0}
      a={p.valor}
      // El default sale del intérprete viejo: 34 f, recortados si la toma es
      // corta. Contar más rápido que la toma deja el número subiendo cuando ya
      // se ha cortado a la siguiente.
      dur={durSegura(p.dur, Math.min(34, c.len - 12))}
      decimales={p.decimales}
      prefijo={p.prefijo}
      sufijo={p.sufijo}
      color={colorDe(c, N.naranja)}
      // La cifra NO usa el px del rol: el hero del dialecto son 96 px y esto es
      // un dato de 220. El 220 lo dice `T.cifra` y lo repite `ficha.cifra.alto`,
      // que es lo que hace que R08 estime lo mismo que se pinta.
      px={Math.round((p.px ?? temaDe(c).T.cifra.fontSize) * c.escala)}
      punch={p.golpe}
      fuente={temaDe(c).FUENTE}
    />
  ),

  medidor: (p, c) => (
    <Medidor
      label={p.label}
      de={p.de}
      a={p.a}
      max={p.max}
      dur={durSegura(p.dur, 34)}
      color={colorDe(c, N.naranja)}
      // El formateo es del PLAN (prefijo/sufijo/decimales) y no del componente:
      // así el mismo medidor sirve para "60 %" y para "$500" sin tocar JSX.
      formato={(v) => `${p.prefijo ?? ""}${formatea(v, p.decimales ?? 0)}${p.sufijo ?? ""}`}
      fuente={temaDe(c).FUENTE}
    />
  ),

  cronologia: (p, c) => (
    <Cronologia
      // `slice()` porque el plan es `readonly` (los datos no se mutan) y el
      // componente pide un array normal.
      acento={acentoDe(c)}
      hitos={p.hitos.slice()}
      dur={durSegura(p.dur, Math.min(40, c.len - 10))}
      alto={p.alto}
      fuente={temaDe(c).FUENTE}
    />
  ),

  // ── Diagrama ─────────────────────────────────────────────────────────────
  // `colorDe` y no `N.tinta` a secas: es la regla 3 de la casa. Sobre papel el
  // trazo cae en tinta por defecto, y una toma de riesgo alto pide `acento` para
  // que el dibujo escale igual que su kicker.
  grieta: (p, c) => (
    <DiagramaGrieta
      tipo={p.tipo}
      ancho={p.ancho}
      alto={p.alto}
      grosor={p.grosor}
      // El dibujado no puede durar más que la toma: si `dur` se pasa, la grieta
      // se queda a medio trazar y el frame final del plano enseña media grieta.
      // Mismo criterio que `Cronologia` con su raíl.
      dur={durSegura(p.dur, Math.min(26, c.len - 10))}
      color={colorDe(c, N.tinta)}
    />
  ),

  // ── Atmósfera ────────────────────────────────────────────────────────────
  velo: (p, c) => (
    // EL ENVOLTORIO A SANGRE ES OBLIGATORIO, y es la misma construcción que la
    // rama `media` de aquí abajo: `Scrim` se dibuja con `left: 0; right: 0`, así
    // que sin envoltorio resolvería contra la caja del molde y saldría metido
    // 118 px por cada lado — un degradado con dos franjas de vídeo sin tapar.
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: c.ancho,
        height: c.alto,
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        // Rampa de 3 f, la misma que usan las capas de ambiente: un velo que
        // aparece de golpe sobre el corte se lee como parpadeo. `opacity` crea
        // contexto de apilado pero NO bloque contenedor, así que no descuadra al
        // hijo absoluto (que es justo lo que sí haría un transform de entrada).
        // El `Math.max(1, …)` es el patrón de la casa y no una precaución
        // ociosa: `interpolate` exige un rango estrictamente creciente, así que
        // un `rampa: 0` —lo que escribe quien quiere el velo a corte duro sobre
        // el corte de plano— lanzaba y tumbaba el render entero, no un frame.
        // Con el clamp, `rampa: 0` es un fundido de 1 f, que es ese corte duro.
        opacity: interpolate(c.f, [0, Math.max(1, p.rampa ?? 3)], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
      }}
    >
      <Scrim
        alto={p.alto ?? LAYOUT.veloAlto}
        desde={p.desde ?? "abajo"}
        opacidad={p.opacidad}
        // NADA de `colorDe(c, …)` aquí, y es la trampa de esta pieza: en una toma
        // `cine` el color del nodo ya viene resuelto a BLANCO por `molde.tinta`,
        // así que un velo que respetara el color del nodo saldría blanco y
        // lavaría el plano en vez de protegerlo.
        color={p.tinta ? c.tinta(p.tinta) : N.negro}
      />
    </div>
  ),

  // ── Media ────────────────────────────────────────────────────────────────
  media: (p, c) =>
    p.sangre ? (
      // A SANGRE. La caja se sale del bloque del molde a propósito: mide el
      // formato entero (`ctx.ancho`/`ctx.alto`) y se centra sobre el centro de
      // su contenedor, que en los dos moldes editoriales ES el centro del
      // cuadro (ancla `centro`). Y al ir en `position: absolute` no ocupa
      // maqueta, que es justo lo que ya declara `ficha.media.alto` devolviendo 0
      // para el caso a sangre: el titular de la toma no se descuelga por tener
      // un fondo detrás.
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: c.ancho,
          height: c.alto,
          transform: "translate(-50%, -50%)",
          overflow: "hidden",
        }}
      >
        <MediaNoticia src={p.src} esVideo={p.esVideo} grado={p.grado} fuente={c.marca.letra.texto} />
      </div>
    ) : (
      // ENMARCADA: la regla del formato. Sobre papel el metraje va SIEMPRE con
      // marco naranja (es una prueba dentro del artículo); a sangre solo en
      // registro cine. Los 640×820 son los del intérprete viejo, no los del
      // componente (620×800): el que manda para comparar frames es el primero.
      <TarjetaFoto borde={acentoDe(c)} ancho={p.ancho ?? 640} alto={p.alto ?? 820} deriva={p.deriva} duracion={c.len}>
        <MediaNoticia src={p.src} esVideo={p.esVideo} grado={p.grado} fuente={c.marca.letra.texto} />
      </TarjetaFoto>
    ),
};

/* ── Lo que el molde monta, y no es una pieza ─────────────────────────────── */

/**
 * Los fondos, por el NOMBRE que declara `Molde.fondo`.
 *
 * No son piezas del registro y no deben serlo: una pieza es un elemento que el
 * plan COLOCA, y el fondo no se coloca — viene con el molde, siempre, y no hay
 * ninguna toma editorial que quiera elegirlo aparte del registro. Meterlo en el
 * plan sería devolverle al autor la posibilidad de escribir una toma de papel
 * con fondo de cine, que es precisamente lo que la gramática del formato
 * prohíbe.
 */
/**
 * LOS FONDOS, PARA UNA MARCA.
 *
 * `Molde.fondo` es un NOMBRE (`"papel"`, `"cine"`) y el intérprete lo resuelve
 * contra este registro; el registro era `Record<string, React.FC>` SIN props, así
 * que el plan podía elegir QUÉ fondo pero nunca DE QUÉ COLOR. Se vio en la prueba
 * de convivencia del paso 5: la demo con otra marca cambió texto, acento y letra
 * y siguió pintando el beige del canal debajo.
 *
 * Memoizada por identidad de marca por la misma razón que el dialecto: el
 * registro entra como prop de `<PistaGraficos>` y devolver componentes nuevos en
 * cada render remontaría el fondo entero en cada frame.
 */
const cacheFondos = new Map<Marca, Record<string, React.FC>>();

export const fondosNoticiaDe = (m: Marca): Record<string, React.FC> => {
  const guardado = cacheFondos.get(m);
  if (guardado) return guardado;
  const r: Record<string, React.FC> = {
    papel: () => <FondoPapel color={m.color.papel} />,
    cine: () => <FondoCine color={m.color.negro} />,
  };
  cacheFondos.set(m, r);
  return r;
};

/** Los fondos del canal. Es UNA instancia; la fuente es `fondosNoticiaDe`. */
export const FONDOS_NOTICIA: Record<string, React.FC> = fondosNoticiaDe(MARCA_BASE);

/**
 * El watermark persistente. Tampoco es una pieza: va en TODOS los frames de la
 * pieza y se invierte según el registro (sobre negro, blanco; sobre papel,
 * tinta). Un plan que pudiera olvidarlo es un plan que lo olvidará.
 */
export const SelloNoticia: React.FC<{ molde: MoldeNoticia; marca?: Marca }> = ({ molde, marca = MARCA_BASE }) => (
  <Sello
    texto={marca.sello.texto}
    sobre={molde}
    claro={marca.color.blanco}
    oscuro={marca.color.tinta}
    fuente={marca.letra.texto}
  />
);

/**
 * Piezas que YA traen su propia entrada dentro del componente (muelle + rampa
 * de opacidad). Sobre ellas el intérprete NO debe aplicar además la ley del
 * dialecto: dos entradas encadenadas dan un doble salto que en el 004 y el 005
 * no existe, y el paso 9 compara frames.
 *
 * Vive aquí y no en `dialecto.ts` porque es un hecho sobre el MONTADOR, no
 * sobre la pieza: el día que `RecortePrensa` deje de animarse solo, lo que
 * cambia es este archivo.
 *
 * `compilaNoticia` NO lo consulta: escribe `entra: {como:"ninguna"}` toma a toma
 * porque la decisión resultó ser de la COMPOSICIÓN y no de la pieza — la
 * `cronologia` dice `false` aquí (dibuja su raíl pero no entra) y aun así el
 * intérprete viejo la monta sin `<Entra>` alrededor, así que compilarla con la
 * ley del dialecto habría movido frames. Esta tabla se queda como lo que de
 * verdad es: la ficha de qué componentes traen su propia entrada, que es lo que
 * hay que mirar al escribir una composición nueva.
 *
 * Total sobre TODAS las claves del registro: una pieza nueva sin decidir esto no
 * compila. Es lo que obligó a decidirlo para `velo`, que trae su propia rampa.
 */
export const ENTRA_SOLA: Record<PiezaNoticia, boolean> = {
  kicker: false,
  titular: false,
  etiqueta: false,
  recorte: true, // spring `tarjeta` + rampa de 7 f, dentro de RecortePrensa
  chip: true, // spring `entrada` + rampa de 7 f, dentro de ChipIcono
  cifra: false, // el conteo es su gesto, pero la ENTRADA la ponía `<Entra>`
  medidor: true, // rampa de 8 f dentro de Medidor
  cronologia: false, // dibuja el raíl, pero no entra: el bloque sí necesita ley

  // ── Las seis del registro compartido ─────────────────────────────────────
  // TODAS `false`, y por la misma razón que `cronologia`: un trazo SE DIBUJA
  // —`evolvePath` va descubriendo el path— pero eso es su contenido, no su
  // entrada. Sin la ley del dialecto aparecerían de golpe en su frame y luego se
  // dibujarían, que es medio gesto. Con ella entran como cualquier otro nodo y
  // el trazo corre dentro.
  regla: false,
  subrayado: false,
  rodea: false,
  flecha: false,
  check: false,
  aspa: false,
  // El panel del muro trae su propio muelle `tarjeta` + rampa de 8 f, igual que
  // TarjetaFoto. Encadenarle la entrada de la ley daría un doble salto — y el
  // trazo, que arranca en el frame 6 del nodo, empezaría a dibujarse mientras el
  // panel todavía está subiendo.
  grieta: true,
  // Enmarcada, la entrada la pone TarjetaFoto (spring `tarjeta` + Ken Burns);
  // a sangre no hay entrada NINGUNA, y es lo correcto: un fondo que se desliza
  // al entrar delata el corte en vez de taparlo.
  media: true,
  // El velo trae su propia rampa de opacidad (3 f) dentro del montador. Y no
  // puede ser de otra manera: la ley monta `<Aparece>`, que aplica un transform,
  // y un transform se convierte en el bloque contenedor de su hijo absoluto — el
  // degradado se dibujaría contra una caja que no es el cuadro.
  velo: true,
};
