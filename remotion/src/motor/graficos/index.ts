/**
 * BIBLIOTECA DE GRÁFICOS — punto de entrada único.
 *
 *   import { Titular, Contador, Subrayado, Particulas } from "./graficos";
 *
 * Qué hay dentro y por qué (mapa rápido; la ficha de cada pieza vive AL LADO de
 * la pieza —en el registro `PIEZAS` de `coreografia.ts`—, `fichas.ts` deriva de
 * ahí el catálogo, y se ve animado en la composición `Catalogo` del Studio):
 *
 *   estilos.ts      tokens de FORMA (color, sombra, escalas tipográficas)
 *   Entradas.tsx    el CUÁNDO aparece: Escena/Aparece/Barrido/Latido/Ranura
 *   Texto.tsx       los cuatro roles tipográficos + sello, chip y tachado
 *   Glifos.tsx      el banco de iconos SVG por NOMBRE (casa, moneda, balanza…)
 *   Fondos.tsx      capas de atmósfera y legibilidad (scrim, viñeta, rejilla…)
 *   Datos.tsx       contador, barra, lista y gráfica de barras
 *   Trazo.tsx       todo lo DIBUJADO con @remotion/paths (subrayar, rodear, señalar)
 *   Particulas.tsx  sistema determinista de partículas (estallido/ambiente/lluvia)
 *   Tarjeta3D.tsx   la capa 3D CSS (volteo, panel que llega, paralaje por capas)
 *   Glitch.tsx      corrupción de señal como recurso puntual
 *   coreografia.ts  el DIALECTO de gráficos sobre `../plan/nucleo`: paleta,
 *                   leyes, moldes, beats y el registro PIEZAS
 *   fichas.ts       el CATÁLOGO, DERIVADO: no hay lista que mantener
 *   PistaGraficos   el INTÉRPRETE: `Plan` → JSX, con `MONTADORES_BASE`
 *
 * Regla de la casa: si vas a escribir un gráfico, mira antes si ya está aquí.
 * Y si escribes uno nuevo que sirva para más de una pieza, súbelo a la
 * biblioteca y añade su ficha al catálogo — es lo único que evita que dentro de
 * tres proyectos vuelvas a escribir el mismo contador desde cero.
 */

export * from "./estilos";
export * from "./Entradas";
export * from "./Texto";
export * from "./Glifos";
export * from "./Fondos";
export * from "./Datos";
export * from "./Trazo";
export * from "./Particulas";
export * from "./Tarjeta3D";
export * from "./Glitch";
export * from "./coreografia";
export * from "./PistaGraficos";
export * from "./fichas";
export { Catalogo, PASO } from "./Catalogo";

/**
 * DOS DESAMBIGUACIONES QUE EL `export *` NO PUEDE RESOLVER SOLO.
 *
 * `coreografia.ts` reexporta el núcleo (`../plan/nucleo`), y el núcleo tiene dos
 * nombres que ya existían en la biblioteca con OTRO significado:
 *
 *   Regla           núcleo: el tipo de una regla de validación de un plan
 *                   Datos.tsx: el componente de la línea recta que se extiende
 *   ModoParticulas  núcleo: el modo declarado en `Ambiente.particulas`
 *                   Particulas.tsx: el mismo literal, declarado aparte
 *
 * Con dos `export *` en juego TypeScript no elige: da TS2308 y deja el nombre
 * FUERA del barril. Aquí se elige a mano, y se elige lo que hay hoy —los dos de
 * la biblioteca— porque este barril es la puerta de los COMPONENTES y cambiar a
 * cuál resuelve `Regla` movería píxeles en `Catalogo`. Quien quiera los del
 * núcleo los pide donde viven: `import type { Regla } from "../plan/nucleo"`.
 */
export { Regla } from "./Datos";
export type { ModoParticulas } from "./Particulas";
