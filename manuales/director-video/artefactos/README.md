# Artefactos intermedios de un proyecto

> Plantillas a copiar en `proyectos/NNN/artefactos/` al empezar un vídeo.
> Atajo: `node manuales/director-video/scripts/artefactos.mjs NNN` (desde la raíz del repo; NNN son los tres dígitos del proyecto, y es también la forma de empezar uno nuevo).

## Por qué existen

El director ya toma todas estas decisiones — narrativa, reparto del espacio,
frames exactos — pero hasta ahora vivían **en la conversación** y acababan
incrustadas en el `.tsx` final. Consecuencias que ya hemos pagado:

- Para ajustar el ritmo hay que releer cientos de líneas de JSX (el motion propio
  de una pieza real pasaba de 700) en vez de una tabla de 20 filas.
- Al volver al proyecto tres semanas después no queda registro de **por qué** un
  gráfico entra en el frame 780 y no en el 760.
- Cada proyecto nuevo vuelve a empezar de cero: no hay nada que copiar y editar.

Un artefacto es la decisión **antes** del código, escrita donde se pueda releer,
discutir y versionar. El código deja de ser la única fuente de verdad y pasa a
ser la **ejecución** de un plan que sí se puede leer.

## Los tres artefactos (en orden, y no se saltan)

| # | Archivo | Responde a | Se convierte en |
|---|---|---|---|
| 1 | `01-plan.md` | ¿Qué se cuenta, en qué orden y con qué intención? | las escenas y el estilo |
| 2 | `02-layout.md` | ¿Dónde vive cada cosa en pantalla? | zonas, encuadre, z-order |
| 3 | `03-timeline.md` | ¿En qué frame exacto entra y sale cada cosa? | `camara-NNN.ts` · `graficos-NNN.ts` · `cues-NNN.ts` · `subtitulos-NNN.ts` |

Cada uno se escribe **completo antes** de empezar el siguiente. El error caro es
saltar del guion al código: se acaba maquetando y cronometrando a la vez, y
entonces el timing lo decide el layout en vez de la voz.

## Regla de oro

Si al escribir una fila de `03-timeline.md` no sabes poner el `reason`, ese
elemento **no va**. Es la misma regla que ya imponen `CameraCue`, `SoundCue` y
`Toma` en el código — y en el plan de gráficos es aún más fuerte que un campo
obligatorio: el builder `gfx()` pide el `reason` **antes** que los `hijos`
(`motor/plan/nucleo.ts`), así que el compilador no te deja escribir el cuerpo de
una toma sin haber dicho para qué existe. Aquí se aplica antes todavía, cuando
corregir cuesta una línea de markdown y no un render.

## Después

Cuando el vídeo esté cerrado, `proyectos/NNN/aprendizajes.md` recoge lo que
funcionó y lo que no. Si algo se repite en dos proyectos, sube a regla
(`manuales/edicion-video/reglas.md`, con la siguiente R libre) o a la biblioteca
(`remotion/src/motor/graficos/`).
