/**
 * Conversiones neutras compartidas por TODOS los themes: color y número.
 *
 * Estaban triplicadas (`alfa` en graficos/estilos.ts, `alfaN` en
 * noticias/theme-noticias.ts, `alfa` en mundo-003.ts) y duplicadas
 * (`formatea` en graficos/Datos.tsx, `formateaN` en noticias/Editorial.tsx).
 * Esto NO acopla las dos direcciones de arte —los colores y las tipografías
 * siguen viviendo en su theme— porque aquí no hay ninguna decisión de diseño:
 * es aritmética de hex y de separadores de millar.
 *
 * Y una de las copias estaba mal: la de mundo-003 no expandía el atajo de tres
 * dígitos, así que `alfa("#FFF", .5)` devolvía azul en vez de blanco. Solo no
 * había explotado porque sus 19 llamadas usan siempre hex de 6 dígitos.
 */

/** `#RGB` o `#RRGGBB` → `rgba(r, g, b, a)`. Acepta el atajo de 3 dígitos. */
export const alfa = (hex: string, a: number): string => {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

/**
 * Número con separador de millar y coma decimal (formato es-ES).
 * `formatea(1234567)` → "1.234.567" · `formatea(11.6, 1)` → "11,6"
 */
export const formatea = (n: number, decimales = 0, separador = "."): string => {
  const fijo = Math.abs(n).toFixed(decimales);
  const [entero, dec] = fijo.split(".");
  const conSep = entero.replace(/\B(?=(\d{3})+(?!\d))/g, separador);
  return `${n < 0 ? "-" : ""}${conSep}${dec ? "," + dec : ""}`;
};
