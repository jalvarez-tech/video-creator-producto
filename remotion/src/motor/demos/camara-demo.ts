/**
 * PLAN DE CÁMARA de la demo del producto (`DemoCamara`: 1920×1080 · 30 fps ·
 * 90 frames sobre `remotion/public/avatar.mp4`). Es el ejemplo trabajado del
 * skill camara-avatar (manuales/camara-avatar/SKILL.md): tres movimientos con
 * función narrativa, uno de cada clase, y reposo entre ellos.
 *
 * En un proyecto real cada cue cae sobre una frase del guion —el acercamiento
 * en la promesa, el reencuadre cuando entra un gráfico, la vuelta antes del
 * cierre— y NO sobre la retícula redonda de aquí, que existe solo porque el
 * clip de relleno no dice nada. Acople zoom↔desplazamiento (camara.ts): a
 * escala s hay (s−1)·ancho/2 px de margen, así que el reencuadre de 90 px pide
 * al menos 1.10 de escala en un 1920 de ancho; se queda en 1.12 con margen.
 */
import { cam, CameraCue } from "../camara";

export const camaraDemo: CameraCue[] = [
  // Acercamiento de apertura: el cambio visual de los primeros segundos.
  cam("cam-acercamiento", 0, 24, "close", { s: 1.0 }, { s: 1.2, y: -10 }, "ease-out", "hook",
    "El acercamiento en la apertura refuerza la primera frase y da un cambio visual antes de que entre ningún gráfico."),

  // Reencuadre lateral: libera el lado derecho para un rótulo que va FUERA de
  // la cámara y por eso no se mueve con ella.
  cam("cam-reencuadre", 36, 56, "medium", { s: 1.2, y: -10 }, { s: 1.12, x: -90, y: 0 }, "ease-in-out", "make-space",
    "Desplazar al avatar a la izquierda abre sitio a un gráfico a la derecha sin taparle la cara."),

  // Vuelta a la base: la pose de reposo es escala 1 sin desplazamiento, y desde
  // ahí un corte al siguiente plano sale limpio.
  cam("cam-vuelta", 66, 86, "wide", { s: 1.12, x: -90 }, { s: 1.0, x: 0 }, "ease-in-out", "transition",
    "Volver a la base antes del cierre calma la imagen y deja el corte final sin salto."),
];
