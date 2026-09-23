/**
 * MI CANAL — la marca de EJEMPLO del producto.
 *
 * Es la que usan las demos (`NoticiaDemo`) y la PLANTILLA de «crea mi marca»:
 * para dar de alta un canal se copia este archivo con otro nombre en esta misma
 * carpeta, se cambian el nombre, el sello y los tres acentos, y se pasa la
 * marca a la composición. El motor no la importa: no conoce ningún canal, y por
 * eso un canal nuevo es un fichero hermano de éste, nunca un cambio en `motor/`.
 *
 *   <PistaNoticia tomas={noticiaNNN} marca={EJEMPLO} />
 *   capa(dialectoEditorialDe(EJEMPLO), "noticia")     // planes nativos
 *   fondos={fondosNoticiaDe(EJEMPLO)}                 // <PistaGraficos> a pelo
 *
 * DE DÓNDE SALEN LOS VALORES. De `MARCA_BASE`, el suelo del motor, que aporta
 * el papel, las tintas, la forma y el look del metraje: lo que no identifica a
 * un canal. Lo que sí lo identifica se declara aquí:
 *
 *   · `nombre` y `sello`: el watermark de la píldora inferior, en todos los
 *     frames. `texto: null` = canal sin sello.
 *   · los tres ACENTOS (`acento`, `acentoChip`, `acentoOscuro`): el único
 *     color vivo del formato editorial, su versión para chips y la que usa la
 *     capa de gráficos sobre vídeo. Un verde azulado, para que se vea que la
 *     paleta del suelo NO es la de esta marca.
 *   · `letra: LETRA_INTER`: Inter empaquetada con el motor (`motor/fuentes.ts`),
 *     así que pinta los mismos glifos en macOS y en Windows. Una marca nueva
 *     declara SIEMPRE esta letra; la de sistema (`LETRA_SF_SISTEMA`) solo
 *     resuelve a San Francisco en macOS.
 */
import { LETRA_INTER, MARCA_BASE } from "../motor/marca";
import type { Marca } from "../motor/marca";

export const EJEMPLO: Marca = {
  ...MARCA_BASE,
  nombre: "Mi Canal",
  sello: { texto: "MI CANAL" },
  color: { ...MARCA_BASE.color, acento: "#0E7C86", acentoChip: "#3A9AA3", acentoOscuro: "#0B5E66" },
  letra: LETRA_INTER,
};
