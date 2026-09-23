/**
 * RESOLVER LA LETRA DE UNA CAPA — el único sitio donde se decide con qué
 * tipografía dibuja y MIDE un dialecto.
 *
 * Hay tres fuentes posibles y este archivo fija su orden de precedencia:
 *
 *   1. `marca.letraPorCapa[capa]`  → lo que el canal pide EXPRESAMENTE para
 *                                    esta capa. Gana siempre.
 *   2. el defecto del DIALECTO     → lo que esa capa dibuja si nadie dice nada
 *                                    (gráficos: Inter, por lo de abajo).
 *   3. `marca.letra`               → la voz del canal, para las capas que no
 *                                    tienen defecto propio (editorial).
 *
 * POR QUÉ EL DIALECTO PUEDE TENER UN DEFECTO Y NO SE LE FUERZA LA VOZ DE LA
 * MARCA. Porque una capa no es solo un estilo: la de gráficos se dibuja ENCIMA
 * de vídeo y su tipografía tiene que aguantar sobre una imagen que no controla
 * —de ahí Inter, con más altura de x y menos contraste de asta que una display
 * de marca—. Imponerle la letra del canal por defecto habría sido tomar por el
 * canal una decisión que es de legibilidad. Pedirla explícitamente, en cambio,
 * es una decisión informada, y para eso está `letraPorCapa`.
 *
 * POR QUÉ VIVE AQUÍ Y NO EN `marca.ts` NI EN `nucleo.ts`. Porque es el único
 * paso que necesita `AVANCES` en tiempo de ejecución: la marca declara CLAVES
 * de tabla (datos puros, validables con `node` pelado) y el dialecto necesita
 * las TABLAS. `nucleo.ts` no importa `AVANCES` a propósito —lo dice su
 * cabecera: «la elige el dialecto»— y `marca.ts` es solo tipos y valores.
 * Aquí se hace la traducción, una vez, para las dos capas.
 */
import { AVANCES } from "./plan/avances";
import type { LetraMarca, Marca } from "./marca";
import type { LetraDialecto } from "./plan/nucleo";

/**
 * `LetraMarca` (claves) → `LetraDialecto` (tablas). La conversión es total
 * sobre `PesoAvance`: si mañana se añade un peso al tipo, esto deja de
 * compilar en vez de resolver a `undefined` y apagar R09 en silencio.
 */
const conTablas = (l: LetraMarca): LetraDialecto => ({
  display: l.display,
  texto: l.texto,
  tablas: {
    500: AVANCES[l.tablas[500]],
    600: AVANCES[l.tablas[600]],
    700: AVANCES[l.tablas[700]],
    800: AVANCES[l.tablas[800]],
  },
});

/**
 * La letra con la que dibuja y mide la capa `capa` de la marca `m`.
 *
 *   letraDe(marca, "noticias")                  // la voz del canal
 *   letraDe(marca, "graficos", LETRA_INTER)     // Inter salvo que el canal pida otra
 *
 * @param porDefecto la letra propia del dialecto. Si se omite, la de la marca.
 */
export const letraDe = (m: Marca, capa: string, porDefecto?: LetraMarca): LetraDialecto =>
  conTablas((m.letraPorCapa && m.letraPorCapa[capa]) ?? porDefecto ?? m.letra);
