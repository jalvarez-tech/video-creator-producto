/**
 * FORMATO NOTICIAS — punto de entrada único.
 *
 *   import { PistaNoticia, toma, revisaNoticia, MARCA } from "./noticias";
 *
 * Qué hay dentro:
 *   theme-noticias.ts  los TOKENS del look editorial claro (paleta, tipografías,
 *                      layout, marca). Es la contraparte clara de `estilos.ts`.
 *   Editorial.tsx      las primitivas que la biblioteca general no tenía:
 *                      FondoPapel, FondoCine, Sello, TarjetaFoto, RecortePrensa,
 *                      ChipIcono, CifraContada, Cronologia, Medidor.
 *   plan.ts            el plan COMO DATOS (TomaNoticia) + builder + validador.
 *   dialecto.ts        el VOCABULARIO editorial sobre `../plan/nucleo`: tintas,
 *                      moldes (papel/cine), beats, el registro PIEZAS_NOTICIA,
 *                      las reglas del formato y `compilaNoticia`, que traduce
 *                      `TomaNoticia[]` al sustrato común.
 *   montadores.tsx     la otra mitad del dialecto: cómo se DIBUJA cada pieza,
 *                      envolviendo los componentes de Editorial.tsx. Mapeado
 *                      total: una ficha sin su rama no compila.
 *   PistaNoticia.tsx   el ENVOLTORIO: `compilaNoticia` + los montadores dentro
 *                      de <PistaGraficos>. El formato ya no tiene intérprete
 *                      propio, y por eso las dos capas declarativas del motor
 *                      dejaron de ser gemelas.
 *
 * La biblioteca general (`../graficos/`) SIGUE valiendo aquí: Subrayado, Rodea,
 * Aspa, Check, Flecha, Particulas y Glitch se usan tal cual sobre las tomas.
 * Lo único que NO se reusa son los tokens de color, porque aquél asume fondo
 * oscuro y este formato es claro.
 *
 * Guía humana: manuales/video-noticias/SKILL.md
 */

export * from "./theme-noticias";
export * from "./Editorial";
export * from "./plan";
export * from "./PistaNoticia";
// `dialecto.ts` NO reexporta `../plan/nucleo` a propósito: `plan.ts` ya saca por
// este barril nombres que el núcleo también tiene (`duracionPlan`, `Toma`), y
// dos `export *` con el mismo nombre dan TS2308 y lo dejan FUERA del barril.
export * from "./dialecto";
export * from "./montadores";
