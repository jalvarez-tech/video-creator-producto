/**
 * BANCO DE GLIFOS — el vocabulario icónico, dibujado a mano en SVG.
 *
 * Vivía en `noticias/Editorial.tsx`, junto al `ChipIcono` que fue su primer
 * consumidor. Ahí estaba mal: un icono de casa, de avión o de moneda no es
 * vocabulario del formato noticias, es vocabulario general — cualquier pieza
 * que necesite señalar "vivienda" o "dinero" tendría que haber importado de
 * `noticias/`, y la dependencia correcta va al revés (noticias → gráficos).
 * Aquí puede usarlo también el intérprete del plan sin invertir la flecha.
 *
 * Por qué SVG inline y no un icon set (lucide, heroicons…):
 *   1. Un paquete de iconos son megabytes que entran en el bundle de render.
 *   2. Los sets traen su propio grid y su propio grosor; mezclarlos con los
 *      trazos de `Trazo.tsx` (1.8-1.9 px sobre viewBox 24) se nota.
 *   3. Estos son doce. Escribirlos cuesta menos que gestionar la dependencia.
 *
 * Las dos convenciones que hay que respetar al añadir uno:
 *   · `viewBox="0 0 24 24"` y grosor 1.8-1.9 — si no, el nuevo glifo pesa
 *     visualmente distinto que sus vecinos en una comparación lado a lado.
 *   · `stroke`/`fill` = `currentColor` — el glifo NO decide su color, lo hereda
 *     del contenedor (el chip naranja, la fila del plan). Un glifo con color
 *     propio se sale del tema en cuanto cambia el registro.
 *
 * El tamaño va en `%` (58 %) porque el consumidor histórico es un cuadrado de
 * lado variable (`ChipIcono.tam`): en px habría que recalcularlo en cada uso.
 */
export const GLIFO = {
  /** Manos abiertas que sostienen algo: dar sin quedarse. El "non profit". */
  manos: (
    <svg width="58%" height="58%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="6.4" r="2.6" fill="currentColor" stroke="none" />
      <path d="M11.4 13.5 7.2 11.2a1.7 1.7 0 0 0-2.4.8L2.6 17.4l6 3.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12.6 13.5l4.2-2.3a1.7 1.7 0 0 1 2.4.8l2.2 5.4-6 3.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  caja: (
    <svg width="58%" height="58%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M3 8l9-4 9 4v8l-9 4-9-4V8z" strokeLinejoin="round" />
      <path d="M3 8l9 4 9-4M12 12v8" />
    </svg>
  ),
  balanza: (
    <svg width="58%" height="58%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M12 3v18M5 21h14M4 8h16M4 8l-2 6h4l-2-6zM20 8l-2 6h4l-2-6z" strokeLinejoin="round" />
    </svg>
  ),
  rayo: (
    <svg width="58%" height="58%" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
    </svg>
  ),
  /** Vivienda unifamiliar / casa / finca. */
  casa: (
    <svg width="58%" height="58%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M3 10.4 12 3.5l9 6.9V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-9.6z" strokeLinejoin="round" />
      <path d="M9.5 21v-6h5v6" strokeLinejoin="round" />
    </svg>
  ),
  /** Multifamiliar / desarrollo en altura / ciudad. */
  edificio: (
    <svg width="58%" height="58%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M4 21V6.5L12 3v18M12 21V9l8 3v9M4 21h16" strokeLinejoin="round" />
      <path d="M7 10h2M7 14h2M15.5 14h1.5M15.5 17.5h1.5" strokeLinecap="round" />
    </svg>
  ),
  /** Aeropuerto / conectividad aérea. */
  avion: (
    <svg width="58%" height="58%" viewBox="0 0 24 24" fill="currentColor">
      <path d="M21 15.5 13.6 11V4.8a1.6 1.6 0 1 0-3.2 0V11L3 15.5v2.1l7.4-2.3v4.2l-2.2 1.5v1.4l3.8-1 3.8 1v-1.4l-2.2-1.5v-4.2l7.4 2.3v-2.1z" />
    </svg>
  ),
  /** Naturaleza / aire limpio / calidad de vida. */
  hoja: (
    <svg width="58%" height="58%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M20 4c0 9-5.5 14-11.5 14A5.5 5.5 0 0 1 3 12.5C3 7 9 4 20 4z" strokeLinejoin="round" />
      <path d="M4.5 21C7 15 12 11 18 8.5" strokeLinecap="round" />
    </svg>
  ),
  /** Dinero / crédito / capacidad de pago. */
  moneda: (
    <svg width="58%" height="58%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 6.6v10.8M14.9 9.2c-.7-.8-1.8-1.1-2.9-1.1-1.6 0-2.9.8-2.9 2.1 0 3 5.8 1.6 5.8 4.5 0 1.4-1.3 2.2-2.9 2.2-1.2 0-2.3-.4-3-1.2" strokeLinecap="round" />
    </svg>
  ),

  /*
   * REDES SOCIALES — las tres del cierre «síguenos» (entraron con el 015).
   * Son la silueta de cada logotipo pasada a la convención del banco (trazo
   * 1.9, un color, `currentColor`), no el logotipo: sin el degradado de
   * Instagram ni el desfase cian/rojo de TikTok. Es lo que se hace al citar una
   * red en un cierre —señalar dónde está el canal— y es lo que deja que el
   * icono tome la tinta del texto que tiene al lado.
   */
  /** Instagram: la cámara redondeada con su objetivo y el punto del flash. */
  instagram: (
    <svg width="58%" height="58%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
      <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5.2" />
      <circle cx="12" cy="12" r="4.1" />
      <circle cx="17.3" cy="6.7" r="1.15" fill="currentColor" stroke="none" />
    </svg>
  ),
  /** TikTok: la nota musical, cabeza abierta hacia el mástil y banderola. */
  tiktok: (
    <svg width="58%" height="58%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M14 2.6v13.2a4.2 4.2 0 1 1-4.2-4.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 2.6c.5 3 2.6 5 5.5 5.3" strokeLinecap="round" />
    </svg>
  ),
  /** Facebook: la «f» cuyo mástil corta el círculo por abajo. */
  facebook: (
    <svg width="58%" height="58%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
      <circle cx="12" cy="12" r="9" />
      <path d="M13.4 21V10.8c0-1.5.9-2.5 2.4-2.5h1.3M10.4 13.4h5.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
} as const;

/** Las claves del banco, derivadas del propio banco: no hay lista que mantener aparte. */
export type ClaveGlifo = keyof typeof GLIFO;
