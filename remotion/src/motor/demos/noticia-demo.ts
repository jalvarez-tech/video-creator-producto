// Importa de `noticias/plan` y NO de `noticias`: un archivo de DATOS no debe
// arrastrar los componentes React del intérprete. Así el plan se puede validar
// desde node (revisaNoticia) sin montar Remotion.
import { toma, type TomaNoticia } from "../noticias/plan";

/**
 * PLAN DE DEMO — la noticia de referencia montada con el formato.
 * Copia este archivo como `noticia-NNN.ts` en tu proyecto y cambia el contenido.
 *
 * EL CASO ES FICTICIO A PROPÓSITO, y es el mismo que recorre el manual
 * (manuales/video-noticias/SKILL.md §3 y recetario-tomas.md): «Alcora» es una
 * cooperativa eléctrica inventada que pasó a sociedad anónima en 2019 y a la
 * que doscientos socios demandan en 2026; su mecanismo es un *reparto con tope*
 * (un inversor pone 100 $ y recibe 300 $ como máximo, aunque se repartan
 * 900 $); el «Boletín del Norte» es un medio que no existe. Sirve para ver el
 * molde y el ritmo sin afirmar nada sobre nadie. En una pieza real cada recorte
 * es de un medio real y cada cifra tiene fuente en el artefacto (SKILL §5.2).
 *
 * Recorre las nueve tomas del sistema y sirve para tres cosas:
 *   1. ver el look sin generar nada (todas las tomas de papel funcionan vacías),
 *   2. comprobar que el ritmo del formato se sostiene (~1-4 s por toma),
 *   3. tener un plan completo que copiar en vez de una plantilla vacía.
 *
 * COMP: 1080×1920 · 30 fps. Todos los frames de aquí abajo están a 30 fps.
 * Si tu voz en off dura otra cosa, re-cronometra: los números son absolutos.
 *
 * Guía: manuales/video-noticias/SKILL.md · artefacto: artefactos/01-noticia.md
 */
export const noticiaDemo: TomaNoticia[] = [
  // ── GANCHO — 0:00-0:04 ─────────────────────────────────────────────────────
  // La afirmación que contradice lo que el espectador cree. Va sobre NEGRO
  // porque aún no estamos explicando nada: estamos plantando una duda.
  toma(
    "n01-gancho",
    "titular",
    "gancho",
    [0, 78],
    {
      registro: "cine",
      kicker: "Alcora",
      titular: "Alcora no la fundó una empresa",
      etiqueta: "La fundaron sus vecinos.",
      soundCueId: "s-gancho",
    },
    "Contradice la creencia por defecto en los 3 primeros segundos: sin esto no hay retención"
  ),

  // ── CONTEXTO — 0:02.6-0:06 ─────────────────────────────────────────────────
  // Qué querían los fundadores. Pasamos a papel: empieza la explicación.
  toma(
    "n02-proposito",
    "comparador",
    "contexto",
    [78, 186],
    {
      titular: "Nació como cooperativa",
      items: [
        { label: "Cooperativa", glifo: "manos", activo: true },
        { label: "Sociedad", glifo: "caja", activo: false },
      ],
      etiqueta: "Para que la luz del valle no dependiera de un solo dueño",
      soundCueId: "s-chips",
    },
    "Fija la premisa original en una imagen: es contra esto que se mide toda la traición posterior"
  ),

  // ── CONFLICTO — 0:06-0:10 ──────────────────────────────────────────────────
  // La prueba de que hoy están enfrentados. El recorte da veracidad.
  toma(
    "n03-demanda",
    "prensa",
    "conflicto",
    [186, 300],
    {
      kicker: "Boletín del Norte",
      titular: "Doscientos socios demandan a Alcora por cambiar los estatutos sin asamblea",
      resaltar: "sin asamblea",
      soundCueId: "s-prensa",
    },
    "Ancla el conflicto en una fuente: sin recorte, la afirmación del gancho es solo una opinión"
  ),

  // ── CONFLICTO — 0:10-0:14 ──────────────────────────────────────────────────
  // El viaje al pasado. La dirección (2026 → 2019) es información.
  toma(
    "n04-cronologia",
    "cronologia",
    "conflicto",
    [300, 420],
    {
      kicker: "Todo empieza antes",
      hitos: [
        { año: "2026", texto: "La demanda" },
        { año: "2019", texto: "Alcora pasa a ser sociedad anónima" },
      ],
      soundCueId: "s-tiempo",
    },
    "Explica que el pleito de hoy nace de una decisión de 2019: sin la fecha, la historia no tiene causa"
  ),

  // ── CONFLICTO — 0:14-0:17 ──────────────────────────────────────────────────
  // Aquí el recetario pone un `retrato` (foto enmarcada); la demo no trae
  // medios y usa un `titular` en su lugar. Con material, copia el retrato.
  toma(
    "n05-asamblea",
    "titular",
    "conflicto",
    [420, 510],
    {
      titular: "La asamblea nunca se convocó",
      etiqueta: "La junta cambió los estatutos y siguió adelante",
      soundCueId: "s-portazo",
    },
    "El punto de giro de la historia en una frase: es el momento en que las dos partes se separan"
  ),

  // ── EXPLICACIÓN — 0:17-0:21 ────────────────────────────────────────────────
  // El mecanismo. Es el bloque que justifica que esto sea un vídeo y no un titular.
  toma(
    "n06-tope",
    "titular",
    "explicacion",
    [510, 630],
    {
      kicker: "El modelo que lo cambió todo",
      titular: "Reparto con tope",
      etiqueta: "Un inversor pone 100 $ y recibe 300 $ como máximo",
      soundCueId: "s-modelo",
    },
    "Nombra el mecanismo antes de mostrar sus cifras: sin el nombre, los números siguientes no significan nada"
  ),

  // ── DATOS — 0:21-0:25 ──────────────────────────────────────────────────────
  // El recorrido del contador ES el argumento: se detiene en 300 aunque haya 900.
  toma(
    "n07-cifra",
    "cifra",
    "datos",
    [630, 744],
    {
      kicker: "Aunque Alcora reparta 900 $",
      de: 0,
      valor: 300,
      prefijo: "$",
      etiqueta: "El inversor se queda en 300. El resto vuelve a la red del valle",
      soundCueId: "s-cifra",
    },
    "El tope es el corazón de la noticia: hay que ver el número frenar"
  ),

  // ── CLÍMAX — 0:25-0:29 ─────────────────────────────────────────────────────
  // Lo que recibe quien pone el dinero: nada de poder.
  toma(
    "n08-medidores",
    "medidor",
    "climax",
    [744, 864],
    {
      titular: "Lo que compra el fondo",
      medidas: [
        { label: "Votos", de: 50, a: 0, sufijo: "%", max: 100 },
        { label: "Reparto", de: 900, a: 300, prefijo: "$", max: 900 },
      ],
      soundCueId: "s-sliders",
    },
    "La queja de los socios se entiende viendo bajar ambos"
  ),

  // ── CLÍMAX — 0:29-0:32 ─────────────────────────────────────────────────────
  toma(
    "n09-presion",
    "titular",
    "climax",
    [864, 954],
    {
      titular: "Y Alcora necesita dinero",
      etiqueta: "El fondo presiona a la junta para quitar el tope",
      soundCueId: "s-presion",
    },
    "Da el motor del presente: es lo que convierte una disputa vieja en una noticia de hoy"
  ),

  // ── CLÍMAX — 0:32-0:35 ─────────────────────────────────────────────────────
  // Metraje real. Registro cine: "esto está pasando".
  toma(
    "n10-politica",
    "escenario",
    "climax",
    [954, 1050],
    {
      titular: "Y el recibo ya es política",
      // El clip de muestra del producto (4 s sintéticos, remotion/public/demo/):
      // en una pieza real aquí va el b-roll traído del banco (broll/NNN/…).
      media: "demo/t10-escenario.mp4",
      esVideo: true,
      soundCueId: "s-archivo",
    },
    "Deja de ser un pleito de socios y pasa a ser asunto público"
  ),

  // ── CIERRE — 0:35-0:38 ─────────────────────────────────────────────────────
  toma(
    "n11-cierre",
    "cierre",
    "cierre",
    [1050, 1140],
    {
      titular: "Parte 2",
      etiqueta: "Por qué los socios hablan de traición",
      soundCueId: "s-cierre",
    },
    "Gancho a la continuación: el formato vive de que la historia no cierre del todo"
  ),
];
