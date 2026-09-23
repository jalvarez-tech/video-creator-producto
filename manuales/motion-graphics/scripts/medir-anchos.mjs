#!/usr/bin/env node
/**
 * medir-anchos.mjs — LA VERDAD DE REFERENCIA de R09.
 *
 * Uso (desde cualquier sitio):
 *   node manuales/motion-graphics/scripts/medir-anchos.mjs                 # imprime la tabla
 *   node manuales/motion-graphics/scripts/medir-anchos.mjs --json RUTA     # además, vuelca el JSON
 *
 * POR QUÉ EXISTE. Para calibrar R09 hacía falta una VERDAD, y una verdad se mide.
 * Nació contra el modelo de CUBOS de `anchoTexto` —cinco anchuras en em a ojo,
 * peso 700 y redondeo hacia arriba—, que sesgaba +8,4 % de media y hacía avisar
 * a R09 de cinco líneas que caben de sobra, cuatro de ellas publicadas (el caso
 * que lo destapó es el `n11-sin-formula` del 006). Con esa medida delante
 * `anchoTexto` pasó a sumar los avances REALES de `plan/avances.ts`.
 *
 * Y SIGUE EXISTIENDO como REGRESIÓN: vuelve a correr esto cuando se toque la
 * tipografía de un theme, el peso de una pieza o la tabla de avances. Lo que
 * imprime al final —error mínimo y cuántas líneas quedan por debajo del real—
 * es el contrato de R09 en una línea: la estimación puede sobrar, nunca faltar.
 * Si «cortas» deja de ser 0, hay un titular a punto de publicarse cortado.
 *
 * POR QUÉ UN SCRIPT Y NO UNA MEDIDA EN CALIENTE. Medir texto exige DOM y ata el
 * resultado a la fuente que tenga instalada quien valide; `revisaPlan` corre con
 * `node` pelado y dentro de un `useMemo`, y tiene que dar el MISMO número en
 * cualquier máquina. Así que se mide UNA VEZ, aquí, se versiona el resultado, y
 * se vuelve a correr esto el día que cambie la tipografía del formato. Es el
 * mismo trato que `generar-catalogo.mjs`: el markdown no se escribe a mano.
 *
 * CON QUÉ CHROME. Con el que abre `@remotion/renderer` (`openBrowser`), o sea
 * EXACTAMENTE el mismo binario que renderiza los vídeos. Medir con el Chrome del
 * escritorio o con node-canvas daría un número que no es el que se publica.
 *
 * QUÉ MIDE, y son tres cosas distintas a propósito:
 *   · `anchoCaja`  — `getBoundingClientRect().width` de un <span> con los MISMOS
 *                    estilos que monta el intérprete. Es el ancho de MAQUETA: lo
 *                    que decide si el bloque se sale de su columna. Es la
 *                    referencia para calibrar, porque es contra lo que R09 mide.
 *   · `anchoAvance`— `measureText().width` en canvas. Debe coincidir con la caja
 *                    (control de que el <span> no arrastra padding heredado).
 *   · `anchoTinta` — `actualBoundingBoxLeft + Right`: la TINTA, sin los laterales
 *                    del primer y último glifo ni el tracking de cola. Es lo que
 *                    se ve al medir columnas de píxeles sobre un render, y por
 *                    eso sale ~2 px por debajo de la caja.
 * Ninguna lleva el punch-in del molde (papel/cine escalan hasta 1,015 al final
 * de la toma): R09 tampoco lo descuenta, y mezclarlo aquí haría que la verdad
 * dependiera del frame.
 *
 * DE DÓNDE SALEN LAS LÍNEAS. De planes REALES recorridos como datos, así que el
 * corpus no se escribe a mano y no se queda viejo: los demos del producto
 * siempre, y los planes `noticia-NNN.ts` del estudio (`remotion/src/proyectos/`)
 * cuando están en disco —son piezas publicadas, la mejor verdad que hay—. La
 * tipografía de cada pieza (familia, peso, tracking, versalitas) se LEE del
 * theme de la marca del plan y del dialecto con el que se compiló, y la tabla
 * con la que R09 estima es la que ese dialecto declara (`dialecto.letra`): si
 * un canal habla en otra letra, el arnés mide y estima con ESA letra, que es lo
 * que hace el intérprete.
 *
 * CON QUÉ LETRA. Antes de medir se inyectan en la página los OTF de Inter que
 * el motor empaqueta (`remotion/public/fuentes/inter/`, ver `generar-avances`),
 * así que la verdad de la capa de gráficos es la de esos bytes en cualquier
 * máquina. La letra de sistema (San Francisco) no se puede empaquetar: esas
 * líneas siguen midiendo lo que resuelva el Chrome de esta máquina.
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { RAIZ, borrar, carpetaTemporal, esMain, log, relativa } from "../../../herramientas/comun.mjs";
import { fuentesEmpaquetadas, inyectaFuentes } from "./generar-avances.mjs";

export const root = RAIZ;
const src = path.join(root, "remotion", "src");

/* ══════════════════ 1 · CARGAR LOS PLANES COMO DATOS ═══════════════════════ */

/**
 * Transpila un entry sintético con esbuild (el que Remotion ya trae) y lo
 * importa. Los planes y los dialectos son datos puros —ni React ni Remotion—,
 * así que el bundle es trivial. Mismo patrón que `generar-catalogo.mjs`.
 */
async function carga(entrada) {
  const require = createRequire(path.join(root, "remotion", "package.json"));
  const esbuild = require("esbuild");
  const tmp = carpetaTemporal("anchos-");
  const bundle = path.join(tmp, "out.cjs");
  try {
    await esbuild.build({
      entryPoints: [entrada],
      bundle: true,
      platform: "node",
      format: "cjs",
      outfile: bundle,
      logLevel: "error",
    });
    return require(bundle);
  } finally {
    borrar(tmp);
  }
}

/**
 * Los planes del ESTUDIO que hay en disco: `remotion/src/proyectos/NNN/noticia-NNN.ts`.
 * Se descubren por nombre, no se enumeran: un clon del producto no los tiene, y
 * el estudio no debería tener que editar este archivo por cada pieza nueva.
 */
const DIR_PROYECTOS = path.join(src, "proyectos");
export function planesDelEstudio() {
  if (!fs.existsSync(DIR_PROYECTOS)) return [];
  return fs
    .readdirSync(DIR_PROYECTOS)
    .filter((d) => /^\d{3}$/.test(d))
    .sort()
    .map((d) => ({ nnn: d, ruta: path.join(DIR_PROYECTOS, d, `noticia-${d}.ts`) }))
    .filter((p) => fs.existsSync(p.ruta));
}

const ENTRY_BASE = `
export { noticiaDemo } from ${JSON.stringify(path.join(src, "motor/demos/noticia-demo"))};
export { graficosDemo } from ${JSON.stringify(path.join(src, "motor/demos/graficos-demo"))};
export { planDemo } from ${JSON.stringify(path.join(src, "motor/demos/plan-demo"))};
export { compilaNoticia, NOTICIAS } from ${JSON.stringify(path.join(src, "motor/noticias/dialecto"))};
export { GRAFICOS } from ${JSON.stringify(path.join(src, "motor/graficos/coreografia"))};
export { anchoTramos, textoPlano, esGrupo, recorre } from ${JSON.stringify(path.join(src, "motor/plan/nucleo"))};
// LOS THEMES, no una copia suya. Es lo que convierte este arnés en una prueba y
// no en un espejo: mientras la tipografía se copiaba a mano aquí, un peso que
// cambiara en \`T\` cambiaba a la vez lo que se dibuja y lo que se mide, el error
// salía 0 y \`cortas\` seguía diciendo 0 con un titular cortándose en pantalla.
// \`temaNoticiasDe(marca).T\` es lo que dibuja el montador editorial para ESA
// marca; \`TXT\`, la capa de gráficos (su familia la pone el dialecto).
export { temaNoticiasDe } from ${JSON.stringify(path.join(src, "motor/noticias/theme-noticias"))};
export { TXT } from ${JSON.stringify(path.join(src, "motor/graficos/estilos"))};
`;

async function cargaApi(estudio) {
  const tmp = carpetaTemporal("anchos-entry-");
  const entrada = path.join(tmp, "entry.ts");
  const extra = estudio.map((p) => `export * as estudio_${p.nnn} from ${JSON.stringify(p.ruta)};`).join("\n");
  fs.writeFileSync(entrada, ENTRY_BASE + extra + "\n");
  try {
    return await carga(entrada);
  } finally {
    borrar(tmp);
  }
}

/**
 * El plan de un módulo `noticia-NNN.ts`, en cualquiera de sus dos formas (las
 * mismas que reconoce `revisar-plan.mjs`): un `Plan` ya compilado, o un
 * `TomaNoticia[]`, que se compila con la marca por defecto del motor.
 */
function planDe(modulo, api, nombre) {
  const exports_ = Object.values(modulo);
  const planYa = exports_.find(
    (v) => v && typeof v === "object" && !Array.isArray(v) && v.formato && Array.isArray(v.tomas) && v.dialecto
  );
  if (planYa) return planYa;
  const tomas = exports_.find((v) => Array.isArray(v) && v.length && v[0]?.tipo && v[0]?.beat);
  if (tomas) return api.compilaNoticia(tomas.slice());
  throw new Error(`${nombre} no exporta ni un TomaNoticia[] ni un Plan`);
}

/* ══════════════════ 2 · LA TIPOGRAFÍA DE CADA PIEZA ════════════════════════ */

/**
 * Cómo se dibuja cada pieza de texto de un DIALECTO, LEÍDO del theme de su marca
 * y del propio dialecto en vez de copiado.
 *
 * Esta tabla era una copia a mano de `T` y de `TXT`, y por eso no podía detectar
 * nada: si mañana `T.titular.fontWeight` pasa de 700 a 800, el dialecto sigue
 * estimando con la tabla del 700, el arnés mediría la verdad a 700 y el error
 * saldría ~0 con el vídeo dibujándose a 800 y cortándose. Un arnés que no puede
 * fallar no es un arnés. Ahora la familia, el peso, el tracking y las versalitas
 * salen del MISMO objeto que monta el intérprete, y las TABLAS con las que R09
 * estima son las que declara el dialecto (`dialecto.letra.tablas`, lo que
 * `ficha.ancho` consulta vía `c.tabla(peso)`), no una clave cableada aquí.
 *
 * Lo que sigue escrito a mano es solo lo que ningún theme dice, y cada cosa lleva
 * el archivo que la cablea:
 *   · `<Chip>` (graficos/Texto.tsx) NO usa `TXT`: escribe peso 700 y
 *     `letterSpacing: 1` a pelo.
 *   · el label de `<ChipIcono>` (noticias/Editorial.tsx) va con `T.pie` y su
 *     cuerpo es el 19 % del lado del cuadrado.
 *   · `<ItemLista>` (graficos/Datos.tsx) dibuja su etiqueta con `<Etiqueta>`, o
 *     sea `TXT.etiqueta`.
 *
 * El CUERPO ya no vive aquí: lo resuelve `cuerpoDe()` como lo resuelve el
 * intérprete, `p.px ?? escalaRol[rol]`.
 */
function tipografiaDe(api, nombre, dialecto) {
  const de = (t, familia, extra) => ({
    familia,
    peso: t.fontWeight,
    tracking: t.letterSpacing ?? 0,
    versalitas: t.textTransform === "uppercase",
    ...extra,
  });
  if (nombre === "noticias") {
    const { T } = api.temaNoticiasDe(dialecto.marca);
    return {
      tablas: dialecto.letra.tablas,
      T,
      piezas: {
        kicker: de(T.kicker, T.kicker.fontFamily),
        titular: de(T.titular, T.titular.fontFamily),
        etiqueta: de(T.etiqueta, T.etiqueta.fontFamily),
        cifra: de(T.cifra, T.cifra.fontFamily, { tabulares: true }),
        chip: de(T.pie, T.pie.fontFamily),
      },
    };
  }
  const { TXT } = api;
  // `TXT` no lleva `fontFamily`: la pone el contenedor con `ctx.letra.texto`
  // (PistaGraficos.tsx), o sea la letra del dialecto.
  const FONT = dialecto.letra.texto;
  return {
    tablas: dialecto.letra.tablas,
    piezas: {
      kicker: de(TXT.kicker, FONT),
      titular: de(TXT.titular, FONT),
      etiqueta: de(TXT.etiqueta, FONT),
      cifra: de(TXT.cifra, FONT, { tabulares: true }),
      contador: de(TXT.cifra, FONT, { tabulares: true }),
      lista: de(TXT.etiqueta, FONT),
      chip: { familia: FONT, peso: 700, tracking: 1, versalitas: false },
    },
  };
}

/**
 * El cuerpo que DIBUJA el intérprete, no el que le apetezca a nadie:
 * `escalaTexto` (PistaGraficos.tsx) y `pxTexto` (montadores.tsx) resuelven los
 * dos `p.px ?? ctx.escalaRol[nodo.rol ?? "apoyo"]`. Ésta es la línea que faltaba:
 * con el cuerpo copiado a mano, el arnés medía líneas que el vídeo no contiene
 * (los once kickers del 006 a 28 px cuando se pintan a 44).
 *
 * Dos piezas NO pasan por el rol y llevan su propia regla, con el montador al
 * lado: la cifra editorial (`p.px ?? T.cifra.fontSize`, montadores.tsx) y el
 * label de un chip editorial (el 19 % del lado, Editorial.tsx).
 */
const PIEZA_POR_ROL = {
  noticias: { kicker: true, titular: true, etiqueta: true, cifra: false, chip: false },
  graficos: { kicker: true, titular: true, etiqueta: true, cifra: true, contador: true, chip: true, lista: true },
};

/**
 * Con qué métrica llega cada pieza a R09, sacado de las fichas:
 *   `linea`   la LÍNEA entera — el intérprete le pone `nowrap` y si no cabe SE
 *             CORTA. Es el único caso que R09 vino a cazar.
 *   `entero`  el texto entero, porque la pieza no puede partirlo (una cifra, una
 *             píldora): no cabe = se sale.
 *   `palabra` la palabra más larga: el texto puede maquetarse libre, así que no
 *             caber significa bajar de línea, y eso es alto (R08), no ancho.
 */
const METRICA = {
  noticias: { kicker: "palabra", titular: "linea", etiqueta: "palabra", cifra: "entero", chip: "palabra" },
  graficos: {
    kicker: "palabra",
    titular: "linea",
    etiqueta: "palabra",
    cifra: "entero",
    contador: "entero",
    chip: "entero",
    lista: "palabra",
  },
};

/** Ancho ÚTIL de los moldes de los dos dialectos: 1080 − 2×118 de zona segura. */
const UTILES = 844;

/* ══════════════════ 3 · EL CORPUS ══════════════════════════════════════════ */

/**
 * Recorre un `Plan` y saca un caso por cada TROZO DE TEXTO que se dibuja en una
 * sola línea. Dos formas, y la distinción es la de la propia R09:
 *   `linea`  — una línea de un `titular` con `lineas`: el intérprete le pone
 *              `nowrap`, así que si no cabe SE CORTA. Es el caso que R09 vigila.
 *   `texto`  — un texto que puede maquetarse libre. Se mide igual porque
 *              `anchoTexto` se aplica a strings arbitrarios y su error no sabe
 *              de dónde viene el string; lo que cambia es qué hace la ficha con
 *              el número (ahí toma la palabra más larga).
 */
function casosDePlan(plan, dialecto, fuente, api) {
  const { textoPlano, esGrupo, recorre } = api;
  const tipo = tipografiaDe(api, dialecto, plan.dialecto);
  const tabla = tipo.piezas;
  const escalaRol = plan.dialecto.escala;
  const out = [];

  /**
   * Los TRAMOS de un texto rico con el peso REAL de cada uno: un `Trozo` con
   * `enfasis` se dibuja a 800 en las dos capas (`Trocito`, `estiloTrozo`). Sin
   * esto el <span> se pintaba entero al peso base y el arnés comparaba la
   * estimación con una verdad que el vídeo no contiene — error 0 por
   * construcción justo en el caso que importa.
   */
  const tramosDe = (rico, pesoBase) =>
    typeof rico === "string"
      ? [{ texto: rico, peso: pesoBase }]
      : rico.map((x) =>
          typeof x === "string" ? { texto: x, peso: pesoBase } : { texto: x.t, peso: x.enfasis ? 800 : pesoBase }
        );

  const mete = (pieza, rico, px, toma, forma, nota) => {
    const ti = tabla[pieza];
    if (!ti) return;
    const plano = textoPlano(rico);
    if (plano.trim().length === 0) return;
    out.push({
      // QUÉ HACE LA FICHA con el número estimado, que no es lo mismo que el error
      // de la estimación: solo las de métrica `linea` y `entero` disparan R09 con
      // este string; en las de `palabra` la ficha se queda con la palabra más
      // larga y el resto de la frase no cuenta.
      metricaFicha: METRICA[dialecto][pieza],
      id: `${fuente}·${toma}·${pieza}`,
      fuente,
      dialecto,
      toma,
      pieza,
      forma,
      texto: plano,
      tramos: tramosDe(rico, ti.peso),
      // La familia es la de la TABLA con la que estima R09, no un nombre puesto
      // aquí: si el dialecto declara otra letra, cambia sola.
      familia: tipo.tablas[ti.peso].familia,
      familiaCss: ti.familia,
      peso: ti.peso,
      px,
      tracking: ti.tracking,
      versalitas: ti.versalitas,
      tabulares: ti.tabulares === true,
      nota,
      tablas: tipo.tablas,
    });
  };

  /** El cuerpo que dibuja el intérprete para este nodo. */
  const cuerpoDe = (pieza, p, nodo) =>
    PIEZA_POR_ROL[dialecto][pieza] ? p.px ?? escalaRol[nodo.rol ?? "apoyo"] : undefined;

  for (const toma of plan.tomas) {
    recorre(toma.hijos, toma.id, (v) => {
      const n = v.nodo;
      if (esGrupo(n)) return;
      const p = n.props ?? {};
      const px = cuerpoDe(n.pieza, p, n);
      if (n.pieza === "titular") {
        if (p.lineas) for (const l of p.lineas) mete("titular", l, px, toma.id, "linea");
        else if (p.texto) {
          // Un `\n` dentro de un titular sin `lineas` SÍ se honra en el formato
          // editorial (`white-space: pre-line`), así que cada trozo es una línea.
          // Se pierde el texto rico al partir, y es aceptable: ningún titular del
          // repo mezcla `\n` con trozos.
          for (const l of textoPlano(p.texto).split("\n")) mete("titular", l, px, toma.id, "texto");
        }
        return;
      }
      if (n.pieza === "kicker" || n.pieza === "etiqueta") {
        mete(n.pieza, p.texto ?? "", px, toma.id, "texto");
        return;
      }
      if (n.pieza === "cifra") {
        // El número YA FORMADO: es lo que se ve al final del conteo, y es lo que
        // mide la ficha. La cifra editorial NO pasa por el rol.
        if (dialecto === "noticias")
          mete("cifra", `${p.prefijo ?? ""}${p.valor.toFixed(p.decimales ?? 0)}${p.sufijo ?? ""}`, p.px ?? tipo.T.cifra.fontSize, toma.id, "texto");
        else mete("cifra", p.texto ?? `${p.prefijo ?? ""}${p.valor ?? 0}${p.sufijo ?? ""}`, px, toma.id, "texto");
        return;
      }
      if (n.pieza === "contador") {
        const picos = [p.de ?? 0, p.a ?? 0];
        for (const tr of p.tramos ?? []) if ("a" in tr) picos.push(tr.a);
        let max = 0;
        for (const v2 of picos) max = Math.max(max, Math.abs(v2));
        mete("contador", `${p.prefijo ?? ""}${max.toFixed(Math.min(2, p.decimales ?? 0))}${p.sufijo ?? ""}`, px, toma.id, "texto");
        return;
      }
      if (n.pieza === "chip") {
        mete("chip", p.texto, dialecto === "noticias" ? Math.round((p.tam ?? 150) * 0.19) : px, toma.id, "texto");
        return;
      }
      if (n.pieza === "lista") {
        for (const it of p.items ?? []) mete("lista", it.texto, px, toma.id, "texto");
      }
    });
  }
  return out;
}

/**
 * Un constructor de casos para un dialecto concreto: la tipografía y las
 * tablas salen de ESE dialecto, igual que en `casosDePlan`. Sirve tanto para
 * los extremos del producto (dialectos por defecto) como para los casos del
 * estudio (el dialecto del plan publicado).
 */
const constructorDe = (api, dialecto, d) => {
  const tipo = tipografiaDe(api, dialecto, d);
  return (pieza, texto, px, extra = {}) => {
    const ti = tipo.piezas[pieza];
    return {
      fuente: "extremos",
      dialecto,
      pieza,
      forma: "linea",
      metricaFicha: METRICA[dialecto][pieza],
      texto,
      tramos: [{ texto, peso: ti.peso }],
      familia: tipo.tablas[ti.peso].familia,
      familiaCss: ti.familia,
      peso: ti.peso,
      px,
      tracking: ti.tracking,
      versalitas: ti.versalitas,
      tabulares: ti.tabulares === true,
      tablas: tipo.tablas,
      ...extra,
    };
  };
};

/**
 * Casos escritos A MANO: los extremos que los planes no cubren. Textos NEUTROS
 * a propósito (no son de ninguna pieza): lo que se mide aquí es la forma de la
 * línea —caja alta, dígitos, tildes, pares de kerning, énfasis—, no un titular.
 * Van con los dialectos por defecto del motor (`NOTICIAS`, `GRAFICOS`).
 */
function casosAMano(api) {
  const N = constructorDe(api, "noticias", api.NOTICIAS);
  const G = constructorDe(api, "graficos", api.GRAFICOS);
  const escalas = { noticias: api.NOTICIAS.escala, graficos: api.GRAFICOS.escala };
  return [
    // ── Los cuerpos POR DEFECTO, que es lo que ningún plan del repo ejerce ───
    // Los planes declaran `px` en cada titular de gráficos, así que el
    // desajuste ficha↔montador que había ahí (`?? 92` contra el rol hero, 104)
    // no lo tocaba nadie. Estos dos casos son justo eso: sin `px` y sin `rol`.
    {
      ...G("titular", "Registra o pierdes", escalas.graficos.hero),
      id: "ext·graficos-titular-hero-sin-px",
      toma: "extremo",
      nota: "titular `hero` SIN `px`: el montador dibuja el cuerpo del rol (104), no los 92 de TXT",
    },
    {
      ...G("kicker", "EDITORIAL DEL MES", escalas.graficos.apoyo),
      forma: "texto",
      id: "ext·graficos-kicker-sin-rol",
      toma: "extremo",
      nota: "kicker SIN `rol`: el defecto del intérprete es `apoyo` (46), no `contexto` (32)",
    },
    {
      ...N("kicker", "NORTE Y OCCIDENTE DE LA REGIÓN", escalas.noticias.apoyo),
      forma: "texto",
      id: "ext·noticias-kicker-sin-rol",
      toma: "extremo",
      nota: "los kickers largos de una pieza editorial son así: sin `rol`, o sea 44 px y no 28",
    },

    // ── Énfasis: el peso cambia DENTRO de la línea ──────────────────────────
    {
      ...N("titular", "La forma de la orilla", 84),
      tramos: [
        { texto: "La ", peso: 700 },
        { texto: "forma", peso: 800 },
        { texto: " de la orilla", peso: 700 },
      ],
      id: "ext·enfasis-en-titular",
      toma: "extremo",
      nota: "`enfasis` monta 800 dentro de una línea a 700: la estimación tiene que cambiar de tabla a mitad de línea",
    },
    {
      ...N("etiqueta", "El dato que cambia la decisión de compra.", 44),
      forma: "texto",
      tramos: [{ texto: "El dato que cambia la decisión de compra.", peso: 800 }],
      id: "ext·enfasis-en-etiqueta",
      toma: "extremo",
      nota: "etiqueta ENTERA con `enfasis`: se dibuja a 800 y su tabla base es la del peso 500",
    },

    // ── Kerning que ENSANCHA ────────────────────────────────────────────────
    {
      ...N("titular", "El cuarto aporta certeza en la puerta", 96),
      id: "ext·kerning-rt",
      toma: "extremo",
      nota: "«rt» kernea +1,95 % del cuerpo CADA VEZ: es el par que destapó que el kerning va en los dos sentidos",
    },
    { ...N("titular", "rtrtrtrtrtrtrtrtrtrt", 96), id: "ext·kerning-rt-denso", toma: "extremo", nota: "solo pares que ENSANCHAN: sin la tabla de kerning esto estimaba un 1,9 % por debajo" },
    { ...N("titular", "íTíTíTíTíTíT", 96), id: "ext·kerning-iT", toma: "extremo", nota: "el peor par de SF en texto: −3,5 % sin corregir" },
    // ── Extremos ────────────────────────────────────────────────────────────
    { ...N("titular", "AAAAAAAAAAAAAAAA", 70), id: "ext·solo-mayusculas", toma: "extremo", nota: "solo caja alta: el cubo EM_ALTA a pelo" },
    { ...N("titular", "1234567890", 70), id: "ext·solo-digitos", toma: "extremo", nota: "solo dígitos: el +24 % que su autor documenta" },
    { ...N("titular", "iiiiiiiiiiiiiiii", 70), id: "ext·solo-finas", toma: "extremo", nota: "solo el cubo fino" },
    { ...N("titular", "WWWWWWWW", 70), id: "ext·solo-anchas", toma: "extremo", nota: "solo el cubo ancho" },
    { ...N("titular", "ñáéíóúü ÑÁÉÍÓÚ", 70), id: "ext·tildes-y-ene", toma: "extremo", nota: "tildes y ñ: minúsculas acentuadas NO están en ningún cubo" },
    { ...N("titular", "a", 70), id: "ext·un-caracter", toma: "extremo", nota: "línea de un carácter: el tracking pesa un 4 %" },
    { ...N("titular", "sí", 70), id: "ext·dos-caracteres", toma: "extremo", nota: "línea mínima real" },
    {
      ...N("titular", "Una línea inventada de ochenta caracteres para ver cuánto se acumula el redondeo", 70),
      id: "ext·linea-larguisima",
      toma: "extremo",
      nota: "80 caracteres: donde más se acumula el redondeo por cubo",
    },
    { ...N("kicker", "Editorial semanal · Provincia", 28), id: "ext·kicker-versalitas", toma: "extremo", nota: "versalitas + tracking +4 en la misma línea" },
    { ...N("etiqueta", "Espacio fino: 1 234 567 m²", 44), id: "ext·espacios-finos", toma: "extremo", nota: "espacios finos U+2009 y símbolos fuera de todo cubo" },
    { ...N("cifra", "1.234.567", 220), id: "ext·cifra-larga", toma: "extremo", nota: "dígitos a cuerpo grande con tracking −9" },
    { ...N("titular", "«¿Y si no cabe?» —dijo—", 70), id: "ext·puntuacion", toma: "extremo", nota: "comillas, guion largo e interrogación de apertura" },
    { ...N("titular", "Ta Vo Wa Ya", 70), id: "ext·pares-de-kerning", toma: "extremo", nota: "los pares que el modelo por caracteres NO puede ver" },
  ];
}

/**
 * Casos del ESTUDIO: los tres tests de aceptación con verdad conocida ANTES de
 * medir (tinta contada en columnas de píxeles sobre el render publicado del
 * 006). Sus textos y sus cuerpos son los de esa pieza, y se miden con el
 * dialecto con el que se compiló: solo entran si el plan está en disco. En un
 * clon del producto no están, y no hace falta que estén: la calibración que
 * validan es la de la letra de sistema del estudio.
 */
function casosDelEstudio(api, planes) {
  const p006 = planes.find(([fuente]) => fuente === "006");
  if (!p006) return [];
  const N = constructorDe(api, "noticias", p006[2].dialecto);
  return [
    {
      ...N("titular", "si una estructura es segura.", 70),
      id: "acepta·006-n11-l3-px70",
      toma: "n11-sin-formula",
      fuente: "006",
      esperado: { cabe: true, utiles: 844 },
      nota: "CABE: medido a 807 px de tinta sobre el render (x 137..943, 19 px de holgura por lado). R09 NO debe avisar.",
    },
    {
      ...N("titular", "si una estructura es segura.", 76),
      id: "acepta·006-n11-l3-px76",
      toma: "n11-sin-formula",
      fuente: "006",
      esperado: { cabe: false, utiles: 844 },
      nota: "ROZA: la tinta empieza en x=117 y el margen seguro está en 118. R09 SÍ debe avisar.",
    },
    {
      ...N("titular", "muchas casas amanecieron", 96),
      id: "acepta·006-n01-hero96",
      toma: "n01-sismo",
      fuente: "006",
      esperado: { cabe: false, utiles: 844 },
      nota: "El titular ORIGINAL a la escala hero: se salía del LIENZO por los dos lados. R09 debe avisar con holgura.",
    },
  ];
}

/* ══════════════════ 4 · LA MEDIDA ══════════════════════════════════════════ */

/**
 * Abre el Chrome de `@remotion/renderer` y mide los casos de una tacada. Una
 * sola llamada a `evaluate`: abrir el navegador cuesta ~1 s y medir 150 líneas,
 * nada. Antes, inyecta los OTF empaquetados (`inyectaFuentes`): así la Inter
 * que se mide es la que pinta el render, esté o no instalada en la máquina.
 */
async function mide(casos, fuentes = fuentesEmpaquetadas()) {
  const require = createRequire(path.join(root, "remotion", "package.json"));
  const { openBrowser } = require("@remotion/renderer");
  const browser = await openBrowser("chrome", { logLevel: "error" });
  try {
    const page = await browser.newPage({
      context: null,
      logLevel: "error",
      indent: false,
      pageIndex: 0,
      onBrowserLog: null,
      onLog: () => {},
    });
    await page.goto({ url: "about:blank", timeout: 30000, options: {} });
    const empaquetadas = await inyectaFuentes(page, fuentes);
    // Las tablas no viajan a la página: son cuatro objetos grandes por línea y
    // el navegador no las necesita para medir.
    const sinTablas = casos.map(({ tablas, ...c }) => c);
    const medida = await page.evaluate((lista) => {
      const cv = document.createElement("canvas").getContext("2d");

      // ¿Está instalada de verdad cada familia de la pila? Se mide en el DOM y
      // no en canvas: el shorthand `ctx.font` NO acepta las palabras clave del
      // sistema (`-apple-system`), y al fallar el parseo se queda con la fuente
      // ANTERIOR, así que un sondeo por canvas se contesta a sí mismo que sí.
      // Contra `monospace` porque es el genérico más distinto de una geométrica.
      const anchoCon = (fam) => {
        const s = document.createElement("span");
        s.style.cssText = `position:absolute;left:0;top:0;white-space:pre;font:400 100px ${fam}`;
        s.textContent = "Handgloves 123";
        document.body.appendChild(s);
        const w = s.getBoundingClientRect().width;
        document.body.removeChild(s);
        return w;
      };
      const generico = anchoCon("monospace");
      const marca = (fam) => {
        const w = anchoCon(`${fam}, monospace`);
        return { ancho: Math.round(w * 100) / 100, resuelve: Math.abs(w - generico) > 0.01 };
      };
      const disponible = {
        monospace: Math.round(generico * 100) / 100,
        Inter: marca("Inter"),
        "SF Pro Display": marca("'SF Pro Display'"),
        "-apple-system": marca("-apple-system"),
        "Helvetica Neue": marca("'Helvetica Neue'"),
      };

      const medidos = lista.map((c) => {
        const span = document.createElement("span");
        span.style.cssText = [
          "position:absolute",
          "left:0",
          "top:0",
          "white-space:pre",
          `font-family:${c.familiaCss}`,
          `font-weight:${c.peso}`,
          `font-size:${c.px}px`,
          `letter-spacing:${c.tracking}px`,
          c.versalitas ? "text-transform:uppercase" : "",
          c.tabulares ? "font-variant-numeric:tabular-nums" : "",
        ].join(";");
        // UN <span> POR TRAMO, igual que `Rico`/`Trocito`: el peso puede cambiar
        // dentro de la línea (`enfasis` → 800) y, además, el moldeado NO cruza la
        // frontera de un elemento inline, así que montarlo en un solo nodo de
        // texto daría un kerning entre tramos que el vídeo no tiene.
        for (const tr of c.tramos) {
          const hijo = document.createElement("span");
          hijo.style.fontWeight = String(tr.peso);
          hijo.textContent = tr.texto;
          span.appendChild(hijo);
        }
        document.body.appendChild(span);
        const caja = span.getBoundingClientRect().width;
        document.body.removeChild(span);

        // El canvas no aplica `text-transform`: se transforma a mano, igual que
        // hace `anchoTexto` con su bandera `versalitas`. Y no sabe de tramos: el
        // control se mide al peso BASE, así que en una línea con énfasis diverge
        // de la caja a propósito.
        const t = c.versalitas ? c.texto.toUpperCase() : c.texto;
        cv.letterSpacing = `${c.tracking}px`;
        cv.fontVariantCaps = "normal";
        cv.font = `${c.peso} ${c.px}px ${c.familiaCss}`;
        // `fontVariantNumeric` no existe en el contexto 2D: la variante tabular
        // se pide por `font-feature-settings` ("tnum"), que sí acepta.
        cv.fontFeatureSettings = c.tabulares ? '"tnum"' : "normal";
        const m = cv.measureText(t);
        return {
          anchoCaja: Math.round(caja * 100) / 100,
          anchoAvance: Math.round(m.width * 100) / 100,
          anchoTinta: Math.round((m.actualBoundingBoxLeft + m.actualBoundingBoxRight) * 100) / 100,
        };
      });
      return { disponible, medidos, ua: navigator.userAgent };
    }, sinTablas);
    return { ...medida, empaquetadas };
  } finally {
    await browser.close({ silent: true });
  }
}

/* ══════════════════ 5 · MAIN ═══════════════════════════════════════════════ */

/**
 * Una línea repetida se mide una vez. Pero un duplicado NO se tira sin más: los
 * casos escritos a mano coinciden a propósito con líneas que ya están en un plan
 * (los tres tests de aceptación salen del 006), y lo que traen encima —`esperado`
 * y `nota`— es justo lo que no se puede perder. Se fusiona sobre el que ya está.
 */
const dedup = (casos) => {
  const porClave = {};
  const out = [];
  for (const c of casos) {
    const pesos = c.tramos.map((t) => t.peso).join("/");
    const k = `${c.familia}|${pesos}|${c.px}|${c.tracking}|${c.versalitas}|${c.tabulares}|${c.texto}`;
    const previo = porClave[k];
    if (!previo) {
      porClave[k] = c;
      out.push(c);
      continue;
    }
    if (c.esperado) previo.esperado = c.esperado;
    if (c.nota) previo.nota = previo.nota ? `${previo.nota} · ${c.nota}` : c.nota;
    if (c.id && c.id.indexOf("acepta") === 0) previo.id = c.id;
  }
  return out;
};

export async function construyeVerdad() {
  const estudio = planesDelEstudio();
  const api = await cargaApi(estudio);
  const { compilaNoticia, anchoTramos } = api;

  // El corpus: los demos del producto y, detrás, los planes del estudio que
  // haya en disco (cada uno con el dialecto con el que se compiló).
  const planes = [
    ["noticia-demo", "noticias", compilaNoticia(api.noticiaDemo.slice())],
    ["graficos-demo", "graficos", api.graficosDemo],
    ["plan-demo", "graficos", api.planDemo],
    ...estudio.map((p) => [p.nnn, "noticias", planDe(api[`estudio_${p.nnn}`], api, relativa(p.ruta))]),
  ];
  if (estudio.length === 0) log.aviso("sin planes noticia-NNN.ts en remotion/src/proyectos/: el corpus son solo los demos del producto");

  let casos = [];
  for (const [fuente, dialecto, plan] of planes) casos = casos.concat(casosDePlan(plan, dialecto, fuente, api));
  casos = casos.concat(casosAMano(api), casosDelEstudio(api, planes));
  casos = dedup(casos);

  const { disponible, medidos, ua, empaquetadas } = await mide(casos);

  const filas = casos.map((c, i) => {
    const m = medidos[i];
    // Se estima con LOS MISMOS tramos que se han dibujado y con LAS TABLAS DEL
    // DIALECTO del plan: un trozo en énfasis pesa 800 en el <span> y consulta
    // `tablas[800]` aquí. Antes se estimaba la línea entera al peso base y el
    // error del énfasis era invisible.
    const est = anchoTramos(
      c.tramos.map((t) => ({ texto: t.texto, letra: c.tablas[t.peso] })),
      c.px,
      c.tracking,
      { versalitas: c.versalitas, tabulares: c.tabulares }
    );
    const real = m.anchoCaja;
    // Las tablas no salen en el resultado (ni en el --json): cuatro tablas
    // enteras por línea, y ya están en `avances.ts`.
    const { tablas, ...caso } = c;
    return {
      ...caso,
      ...m,
      anchoEstimado: est,
      errorPx: Math.round((est - real) * 100) / 100,
      errorPct: Math.round(((est - real) / real) * 10000) / 100,
      utiles: UTILES,
      // El veredicto de la VERDAD frente al de HOY. Solo se pueden comparar
      // cuando la ficha mide este mismo string (`linea` o `entero`): en las de
      // métrica `palabra` R09 nunca ve la frase completa.
      cabeReal: real <= UTILES,
      avisaHoy: c.metricaFicha !== "palabra" && est > UTILES,
      falsoPositivo: c.metricaFicha !== "palabra" && est > UTILES && real <= UTILES,
      falsoNegativo: c.metricaFicha !== "palabra" && est <= UTILES && real > UTILES,
    };
  });

  return {
    generado: new Date().toISOString().slice(0, 10),
    ua,
    corpus: planes.map(([fuente]) => fuente),
    fuentesEmpaquetadas: empaquetadas,
    fuentesDisponibles: disponible,
    casos: filas,
  };
}

if (esMain(import.meta.url)) {
  const verdad = await construyeVerdad();
  const i = process.argv.indexOf("--json");
  if (i >= 0 && process.argv[i + 1]) {
    const salida = path.resolve(process.argv[i + 1]);
    fs.mkdirSync(path.dirname(salida), { recursive: true });
    fs.writeFileSync(salida, JSON.stringify(verdad, null, 2));
  }
  const err = verdad.casos.map((c) => c.errorPct).sort((a, b) => a - b);
  const p = (q) => err[Math.min(err.length - 1, Math.floor(q * (err.length - 1)))];
  process.stdout.write(
    [
      `${verdad.casos.length} líneas medidas · corpus: ${verdad.corpus.join(", ")}`,
      `fuentes: ${verdad.fuentesEmpaquetadas ? `${verdad.fuentesEmpaquetadas} OTF empaquetados inyectados` : "las del sistema (sin OTF empaquetados)"} · sondeo ${JSON.stringify(verdad.fuentesDisponibles)}`,
      `error de anchoTexto (estimado − real): min ${p(0)} % · p50 ${p(0.5)} % · p90 ${p(0.9)} % · max ${p(1)} %`,
      `cortas (estimación por debajo del real): ${err.filter((e) => e < 0).length}  ← tiene que ser 0`,
      `falsos positivos: ${verdad.casos.filter((c) => c.falsoPositivo).length} · falsos negativos: ${verdad.casos.filter((c) => c.falsoNegativo).length}`,
      "",
    ].join("\n")
  );
}
