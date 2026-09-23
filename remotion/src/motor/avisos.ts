/**
 * Los validadores de plan, conectados de verdad.
 *
 * `revisaPlan()` y `revisaNoticia()` existían desde el principio y el README
 * decía que corrían «antes de renderizar», pero nadie los llamaba: solo
 * aparecían en su propia definición y en comentarios. Un plan con dos hero
 * solapados, un hueco entre tomas o un `reason` vacío se renderizaba sin una
 * palabra, que es justo lo que los validadores existían para impedir.
 *
 * Aquí se vuelcan por consola: en el Studio salen al abrir la composición, y en
 * un `remotion render` salen al principio del log. Son AVISOS, nunca un error:
 * un plan a medias tiene que poder verse mientras se trabaja en él.
 */

/**
 * Firmas ya avisadas. Los intérpretes se re-renderizan en CADA frame, así que
 * sin esto un plan de 2.205 frames imprimiría el mismo aviso 2.205 veces y el
 * log dejaría de servir para nada.
 *
 * El Set vive en el proceso, no entre procesos: `remotion render` reparte los
 * frames entre varias pestañas de Chrome, así que el aviso puede salir hasta una
 * vez por pestaña (≈ la concurrencia). Es ruido acotado y conocido, no un fallo;
 * deduplicarlo entre procesos costaría un canal de IPC para imprimir un warning.
 */
const yaAvisado = new Set<string>();

/** Solo para los tests: olvida lo avisado. */
export const olvidaAvisos = (): void => yaAvisado.clear();

/**
 * Imprime los avisos de un plan una sola vez.
 * `etiqueta` distingue la capa (gfx / noticia) en un log con varias pistas.
 */
export const avisaDelPlan = (etiqueta: string, avisos: string[]): void => {
  if (avisos.length === 0) return;
  const clave = `${etiqueta} ${avisos.join(" ")}`;
  if (yaAvisado.has(clave)) return;
  yaAvisado.add(clave);
  console.warn(
    `⚠️  [${etiqueta}] ${avisos.length} aviso(s) del plan:\n` +
      avisos.map((a) => `    · ${a}`).join("\n")
  );
};
