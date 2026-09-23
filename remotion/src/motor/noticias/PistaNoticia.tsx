import { useMemo } from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { PistaGraficos } from "../graficos/PistaGraficos";
import { compilaNoticia } from "./dialecto";
import type { TomaEditorial } from "./dialecto";
import { fondosNoticiaDe, MONTADORES_NOTICIA, SelloNoticia } from "./montadores";
import type { TomaNoticia } from "./plan";

import { MARCA_BASE } from "../marca";
import type { Marca } from "../marca";

/**
 * EL INTÉRPRETE del plan de noticia — y ya no es un intérprete, es un
 * ENVOLTORIO. Guía: manuales/video-noticias/SKILL.md
 *
 *   <PistaNoticia tomas={noticia005} />   ← la API no cambia: 004 y 005 igual
 *
 * Este archivo eran 215 líneas: un `switch` de nueve casos que maquetaba a mano
 * cada tipo de toma, con sus `<Entra at={…}>` repartidos y su propio validador.
 * Hacía, peor, lo mismo que <PistaGraficos>: montar un plan declarativo. La
 * duplicación no era teórica — el sistema tenía DOS gramáticas para "una escena
 * con tres elementos coreografiados", y la que se usaba en producción era la que
 * no podía crecer.
 *
 * Ahora hay una sola:
 *   `compilaNoticia`  (dialecto.ts)     traduce el DSL de autor al sustrato
 *   MONTADORES_NOTICIA (montadores.tsx) dice cómo se dibuja cada pieza
 *   <PistaGraficos>   (graficos/)       monta el plan, sea de la capa que sea
 *
 * Lo que se gana y no se ve aquí: el validador del núcleo (tiempos RESUELTOS,
 * altura del bloque contra el presupuesto del molde, coherencia dentro de cada
 * pieza) más las reglas del formato, que antes vivían en `revisaNoticia` y ahora
 * son `dialecto.reglas`. Lo llama <PistaGraficos>, con `plan.capa` = "noticia".
 *
 * Lo que este envoltorio SIGUE sin hacer, a propósito:
 *   · no pone sonido        → cues-NNN.ts + <PistaSonido> (diseno-sonoro)
 *   · no pone subtítulos    → subtitulos-NNN.ts + <SubtitulosSync>
 *   · no trae el b-roll     → bancos.py si el plano existe (lo normal en las tomas
 *                             `retrato` y `escenario`, cuyo trabajo es enseñar algo
 *                             REAL), grok.py si no existe (director §3h)
 * Se montan como hermanos suyos en la composición, en ese orden de z.
 */
/**
 * LA MARCA, DE PUNTA A PUNTA. `marca` es opcional y por defecto es la del canal,
 * así que ninguna comp existente cambia.
 *
 * Las CUATRO cosas que decide el canal pasan por aquí, y son cuatro porque las
 * tres últimas se descubrieron renderizando, no leyendo:
 *   · el PLAN          → `compilaNoticia(…, m)`, que elige el dialecto y su paleta
 *   · los FONDOS       → `fondosNoticiaDe(m)`: el registro era un
 *                        `Record<string, React.FC>` SIN props, así que el plan
 *                        elegía QUÉ fondo y nunca DE QUÉ COLOR
 *   · el SCRIM         → el negro del canal, no un `#000` del módulo
 *   · el SELLO         → `Sello` ya no tiene `MARCA.sello` por defecto: lo exige
 *
 * Cómo se supo que faltaban las tres últimas: la prueba de convivencia del paso
 * 5 renderizó `noticiaDemo` con otra marca y cambiaron el texto, el acento y la
 * letra… sobre el beige del canal, con su watermark. Es exactamente el fallo que
 * una sonda de píxel caza y una lectura del código no.
 */
export const PistaNoticia: React.FC<{ tomas: TomaNoticia[]; marca?: Marca }> = ({ tomas, marca }) => {
  // Una sola resolución para toda la pista: el defecto del canal vive AQUÍ y no
  // repartido en cada consumidor, que es lo que hacía que faltara en unos sitios.
  const m = marca ?? MARCA_BASE;
  const { width, height, fps, durationInFrames } = useVideoConfig();
  // La compilación es pura y el plan no cambia entre frames: sin `useMemo` se
  // reconstruiría el árbol entero en cada uno de los 2.205 frames y, peor, la
  // identidad de los nodos cambiaría en cada render — y `resuelveMomentos`
  // indexa los momentos POR IDENTIDAD de objeto.
  const plan = useMemo(
    () => compilaNoticia(tomas, { ancho: width, alto: height, fps, duracion: durationInFrames }, m),
    [tomas, width, height, fps, durationInFrames, m]
  );

  return (
    <AbsoluteFill>
      <PistaGraficos
        plan={plan}
        montadores={MONTADORES_NOTICIA}
        // Los dos registros del formato: el fondo viene con el molde y el plan
        // no puede elegirlo aparte (una toma de papel con fondo de cine es lo
        // que la gramática del formato prohíbe).
        fondos={fondosNoticiaDe(m)}
        // El scrim del `escenario` es NEGRO puro, no el casi-negro azulado de la
        // capa de gráficos: sobre `FondoCine` (#000) cualquier tinte se ve.
        scrimColor={m.color.negro}
        // El watermark va en TODOS los frames y fuera del punch-in. Que sea una
        // capa del formato y no una pieza del plan es deliberado: un plan que
        // pudiera olvidarlo es un plan que lo olvidará.
        encima={(t: TomaEditorial) => <SelloNoticia molde={t.molde} marca={m} />}
      />
    </AbsoluteFill>
  );
};
