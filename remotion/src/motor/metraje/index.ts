/**
 * FORMATO MONTAJE — punto de entrada único para piezas SIN avatar.
 *
 *   import { PistaMetraje, type Corte } from "../../motor/metraje";
 *
 * Qué hay dentro:
 *   corte.ts             el formato COMO DATOS: `Corte`, `Grado`, `Entrada`, el
 *                        look, los velos, los tiempos de las entradas y las
 *                        cuentas de la ventana de cada plano. Sin React: lo
 *                        carga también la puerta.
 *   PistaMetraje.tsx     el INTÉRPRETE: `Corte[]` → un <Sequence> por plano.
 *   revisar-metraje.mjs  la PUERTA genérica (tiempo · metraje · tramos ·
 *                        encuadre · archivos). Cada proyecto la llama desde su
 *                        `proyectos/NNN/revisar-NNN.mjs` y le añade lo de su
 *                        encargo; para una pieza nueva basta con
 *                        `node remotion/src/motor/metraje/revisar-metraje.mjs <metraje-NNN.ts>`.
 *
 * Un `metraje-NNN.ts` importa de aquí solo TIPOS (`import type`): así la puerta
 * lo ejecuta sin arrastrar React ni Remotion.
 */
export * from "./corte";
export * from "./PistaMetraje";
