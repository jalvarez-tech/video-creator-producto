---
name: director-video
description: >-
  Director/orquestador del sistema «video-creator»: la PUERTA DE ENTRADA. Con una
  instrucción simple («monta el vídeo del avatar con este guion», «monta estos
  clips») coordina TODAS las capas y motores —motor Remotion + pipeline
  (edicion-video), cámara del avatar (camara-avatar), motion graphics
  (motion-graphics), sonido (diseno-sonoro), b-roll IA (Grok, API de xAI), b-roll
  de archivo (Pexels), avatar (heygen) y el formato MONTAJE para piezas sin avatar
  hechas de clips y fotos— en una sola composición coherente. Decide el orden, el
  fps único y el z-order, y valida con frames antes de exportar. Abre SIEMPRE los
  artefactos del proyecto antes de escribir código y usa lo que ya existe en el
  motor. Úsalo SIEMPRE que se pida montar o producir un vídeo completo, empezar
  un vídeo o proyecto nuevo, o «usar todo lo del proyecto»; delega el detalle de
  cada capa en su skill. Disparadores: «monta el vídeo», «vídeo nuevo», «monta
  estos clips», «vídeo sin avatar», «retoma el proyecto NNN».
metadata:
  type: reference
---

# 🎬 Director de vídeo — orquestador del sistema

> **Regla maestra.** La **NARRATIVA** manda; cada capa (cámara · gráficos · sonido · subtítulos) sirve a la MISMA intención. El director no diseña cada capa —**delega** en su skill— sino que decide **el orden**, **el fps único**, **el z-order**, y **quién cede a quién** cuando dos capas compiten. **Un solo protagonista a la vez.** Ante la duda, **menos**.

**Raíz:** la carpeta del repo (la que contiene `remotion/`, `manuales/` y `herramientas/`). Todas las rutas de este skill son relativas a ella y todos los comandos se lanzan desde ahí; los scripts se invocan como `node <ruta>.mjs` o `uv run <ruta>.py`, que corren igual en macOS y en Windows. Este skill es la **capa de arriba**: recibe la instrucción, reparte el trabajo entre los skills especializados y ensambla la composición final en Remotion.

**Cuándo entra este skill (disparadores):** «monta el vídeo», «arma la composición», «haz el vídeo completo», «usa todos los recursos», «compón el vídeo del avatar», «ensambla la escena», «vídeo nuevo», «nuevo proyecto de vídeo», «monta estos clips», «reel con este material», «vídeo de la boda», «mini documental», «montaje con música», «vídeo sin avatar», «retoma el proyecto NNN». Si la instrucción es «monta esta noticia», entra directo por [video-noticias](../video-noticias/SKILL.md) (ver la excepción de §1).

---

## 1. Mapa de recursos (a quién delega cada decisión)

| Decisión / capa | Skill | Motor / archivos |
|---|---|---|
| Motor, estructura, formato, cortes, transcripción, render, publicación | [edicion-video](../edicion-video/SKILL.md) · [proceso](../edicion-video/proceso-edicion.md) · [reglas](../edicion-video/reglas.md) | `remotion/`, `presets.ts`, `manuales/edicion-video/plantillas/`, `auto-editor`, `manuales/edicion-video/scripts/transcribir.mjs` |
| **Cámara** del avatar (zoom / reencuadre / hacer espacio) | [camara-avatar](../camara-avatar/SKILL.md) | `camara.ts` · `CamaraVirtual.tsx` · `camara-NNN.ts` |
| **Motion graphics** (títulos, datos, transiciones, CTA) | [motion-graphics](../motion-graphics/SKILL.md) | `motion.ts` · `theme.ts` · **biblioteca `motor/graficos/`** ([catálogo](../motion-graphics/catalogo-graficos.md)) · `graficos-NNN.ts` + `PistaGraficos` |
| **Sonido** (SFX, mezcla, ducking) | [diseno-sonoro](../diseno-sonoro/SKILL.md) | `sound/cues.ts` · `PistaSonido.tsx` · `cues-NNN.ts` |
| **B-roll** generado con IA | **Grok Imagine**, API directa de xAI (ver §3h; `seedance-20` es un skill externo y de pago, ver §3h) | `manuales/edicion-video/scripts/grok.py` · clips en `proyectos/NNN/broll/grok/` |
| **B-roll de archivo** (lugares, objetos y gestos REALES) | **Pexels**, banco gratuito de uso comercial (ver §3h) | `manuales/edicion-video/scripts/bancos.py` · manifiesto en `proyectos/NNN/broll/manifiesto.json` |
| **Avatar** talking-head (fuente) | [heygen](../edicion-video/heygen.md) | `manuales/edicion-video/scripts/heygen.py` |
| **Noticias** (formato completo, sin avatar) | [video-noticias](../video-noticias/SKILL.md) · [recetario](../video-noticias/recetario-tomas.md) | `motor/noticias/` (theme + `TomaNoticia` + `PistaNoticia`) · `noticia-NNN.ts` |
| **Montaje** (pieza sin avatar hecha de clips y fotos: reel, documental, evento) | este skill, **§3i** · [reglas R19-R21](../edicion-video/reglas.md) (normalizar, puerta, HDR) | `motor/metraje/` (`Corte` + `PistaMetraje`) · `metraje-NNN.ts` · puerta `revisar-metraje.mjs` desde `proyectos/NNN/revisar-NNN.mjs` |
| Subtítulos sincronizados | edicion-video | `SubtitulosSync.tsx` · `subtitulos-NNN.ts` |
| **Segundo motor** (HTML+GSAP, render local) | [motor-hyperframes](../motor-hyperframes/SKILL.md) · [contrato](../motor-hyperframes/contrato-hf.md) · [equivalencias](../motor-hyperframes/equivalencias.md) | `manuales/motor-hyperframes/scripts/render-hf.mjs` · `proyectos/NNN/hf/` · `nuevo-hf.mjs` · `revisar-hf.mjs` |

**No repitas** aquí lo que ya dice cada skill: cuando toca diseñar una capa, **abre su SKILL.md** y sigue sus tablas.

> **Excepción — el formato NOTICIAS no es una capa, es una pieza entera.**
> [video-noticias](../video-noticias/SKILL.md) trae su propio look (papel beige +
> acento del canal, geométrica de sistema), su propia estructura narrativa (7 beats) y su propia capa
> declarativa (`TomaNoticia[]` → `<PistaNoticia>`), y **no lleva avatar**. Si la
> instrucción es "monta esta noticia", entra directo por ahí y el director solo
> interviene si además hay avatar, en cuyo caso este formato aporta el look de
> las tomas de gráfico y el avatar sigue las reglas de §3.

> **Excepción — el MOTOR es una decisión previa, no una capa.**
> Este skill dirige sobre **Remotion**, que es el motor **por defecto**. Existe un
> segundo motor, [motor-hyperframes](../motor-hyperframes/SKILL.md): HTML+GSAP,
> render local y gratis, con puertas que **miden** layout y contraste en vez de
> estimarlos. **Se elige, no se hereda**: si no puedes decir en una frase por qué
> esa pieza va en HTML, va en Remotion.
> Lo que decide, resumido — **se quedan en Remotion**: el plan de gráficos como
> dato (§2·5), las entradas de muelle y la reserva de maqueta con `<Freeze>`,
> porque las tres no tienen traducción fiel; y los `camara-NNN.ts` ya escritos,
> no porque la cámara no traduzca —sí traduce— sino porque `camara.ts` mezcla el
> dato con hooks de Remotion. **Ganan en HyperFrames**: el layout y el contraste
> que hay que medir, el recorte de fondo del avatar (`remove-background`, local y
> sin API) y las piezas cortas y gráficas.
> Si la pieza va por ahí, **todo este skill sigue valiendo menos §3a, §3b y §3g**:
> la narrativa (§2·0), el estilo único (§4), la marca (§5b), el b-roll y su regla
> de honestidad (§3h) y las puertas de control (§6.4) son los mismos. Lo que cambia
> son las tres cosas que el otro motor define distinto —la **unidad de tiempo**
> (§3a: allí frames absolutos, aquí SEGUNDOS), el **z-order** (§3b: allí orden de
> montaje, aquí `z-index` de CSS) y la forma del **determinismo** (§3g: allí
> `useCurrentFrame()`, aquí una timeline pausada que se seekea)—, y todas viven en
> [equivalencias.md](../motor-hyperframes/equivalencias.md).

---

## 2. Flujo de una instrucción (orden de decisiones)

Sigue [proceso-edicion.md](../edicion-video/proceso-edicion.md) (Fase 3, 7 pasos, con **puertas de control**: el agente entrega evidencias y ESPERA; no exporta a ciegas). Orden creativo del director:

> **Antes del paso 0 — abre los artefactos.**
> `node manuales/director-video/scripts/artefactos.mjs NNN` crea
> `proyectos/NNN/artefactos/` con `01-plan.md` · `02-layout.md` · `03-timeline.md`
> (y es también la forma de empezar un proyecto nuevo: `artefactos.mjs 001` deja la
> carpeta lista). Los pasos 0-3 se escriben ahí (plan), los 4-6 salen de ahí
> (timeline). No es burocracia: es lo que evita releer cientos de líneas de JSX
> para mover una escena 8 frames, y lo que deja registro de POR QUÉ cada elemento
> entra donde entra ([por qué](artefactos/README.md)).

0. **Narrativa** — clasifica el vídeo y sus escenas (`hook · contexto · explicación · demostración · comparación · revelación · conclusión · cta`) y elige **UN estilo** (§4). No animes/mueves todo con la misma intensidad.
1. **Formato + comp** ([R03](../edicion-video/reglas.md)) — elige plantilla/preset y **fija `width`/`height`/`fps`** en la `<Composition>` ANTES de animar. Con avatar real: `ffprobe` da fps/resolución/duración ([R01](../edicion-video/reglas.md)).
2. **Guion + subtítulos** ([R02](../edicion-video/reglas.md)) — transcribe si hace falta (`node manuales/edicion-video/scripts/transcribir.mjs <entrada> <salida.json> [idioma]`) → `subtitulos-NNN.ts`. *(Avatar HeyGen: habla limpia → se salta cortes y, si el guion es conocido, transcripción — ver proceso §variante.)*
3. **Escenas / tramos** ([R04](../edicion-video/reglas.md)) — divide en bloques ~10 s; marca en el guion dónde va cada refuerzo visual y cada cambio.
3·bis. **B-roll** (solo si alguna escena lo pide) → resuélvelo **ya**, no al final: el resto del plan depende de su duración real. Primero decide el motor con la regla de **§3h** —lo real se trae, lo que no existe se genera, y lo que no tiene referente filmable no es b-roll sino gráfico—. Del banco: `bancos.py contactos` → **mirar la hoja** → `traer … --porque` (ese paso no se salta: el banco nunca devuelve cero). De Grok: `grok.py`, que descarga el MP4 **en la misma llamada** porque las URLs caducan. En los dos casos, mide con `ffprobe` antes de contar frames; en el de banco lo hace ya `revisar-broll.mjs`, que además falla si el clip es más corto que su toma.
4. **Plan de CÁMARA** (si hay avatar) → `camara-NNN.ts` con [camara-avatar](../camara-avatar/SKILL.md). Movimientos motivados, en frames absolutos al fps de la comp.
5. **Plan de MOTION GRAPHICS** → `graficos-NNN.ts` (un **`Plan`** del núcleo: `motor/plan/nucleo.ts`, dialecto en `motor/graficos/coreografia.ts`) con la biblioteca de [motion-graphics](../motion-graphics/SKILL.md); lo único de la pieza, a mano. Franja superior ([R08](../edicion-video/reglas.md)) o toma a pantalla completa. **1 hero a la vez** — `revisaPlan(plan)` lo comprueba (un solo argumento). Plantillas reales de las que copiar: `remotion/src/motor/demos/graficos-demo.ts` (overlay corto sobre avatar) y `remotion/src/motor/demos/plan-demo.ts` (la gramática entera); se ven montadas en las composiciones `GraficosDemo` y `PlanDemo` del Studio.
6. **Plan de SONIDO** → `cues-NNN.ts` con [diseno-sonoro](../diseno-sonoro/SKILL.md). La voz manda; SFX debajo + ducking.
7. **Ensamblar** la comp (z-order §3) y **validar**: frames reales ([R05](../edicion-video/reglas.md)) → prueba 720p ([R06](../edicion-video/reglas.md)) → final en BT.709 ([R22](../edicion-video/reglas.md)).

> **Si la pieza es de MONTAJE (sin avatar: clips y fotos), cambian cuatro pasos.**
> **1** · la comp va a 30 fps y su duración sale del plan, de la voz o de la música, no de un clip;
> **2** · guion y subtítulos solo si hay voz: si no, la retícula la ponen la música o el propio montaje;
> **3·bis** · el material se mide y se **normaliza** antes de contar un solo frame ([R19](../edicion-video/reglas.md), [R21](../edicion-video/reglas.md));
> **4** · en vez de `camara-NNN.ts`, el plan de montaje `metraje-NNN.ts` y su puerta `revisar-NNN.mjs`, que sale con 0 antes del primer render. Todo en **§3i**.

---

## 3. Contrato compartido (cómo encajan las capas sin pelearse)

Esto es lo que **solo el director** posee — la coordinación transversal que ninguna capa ve por sí sola:

**a) Un fps único por comp.** Avatar 9:16 = **25 fps** · plantillas 16:9/9:16/1:1 y avatar 16:9 = **30 fps** · montaje sin avatar = **30 fps**, aunque los clips lleguen a otro (su `desde` va en segundos, §3i). **Todo** (cámara, MG, sonido) se calcula en **frames absolutos** a ESE fps con `seg(fps, s)`. Nunca mezcles fps entre capas.

**b) Z-order (capas, de atrás a delante).** El orden NO es negociable. *(Esto es el ensamblado del motor **Remotion**. En el segundo motor el equivalente vive en [contrato-hf.md §3](../motor-hyperframes/contrato-hf.md) — allí el orden de pintado es `z-index` de CSS y `data-track-index` NO es la z.)*
```tsx
import { MONTADORES_BASE, PistaGraficos } from "../../motor/graficos/PistaGraficos";

<AbsoluteFill>                              {/* fondo (negro / B-roll) */}
  {/* velo: lo que oscurece el metraje para que el texto se lea (§3h).
      En la ruta de noticias es la pieza `velo`, colocada ENTRE el media y el
      texto — no el scrim del molde, que se pinta debajo de los hijos y por
      tanto debajo del vídeo. Ver recetario-tomas.md § escenario. */}
  <CamaraVirtual cues={camaraNNN}>          {/* SOLO el avatar se reencuadra */}
    <OffthreadVideo src={staticFile("avatar-NNN.mp4")}   {/* el clip del proyecto, copiado a remotion/public/ */}
      style={{ width:"100%", height:"100%", objectFit:"cover" }} />
  </CamaraVirtual>
  <PistaGraficos plan={graficosNNN} montadores={MONTADORES_BASE} />
                                             {/* overlay FIJO — el plan de gráficos.
                                                 `montadores` es OBLIGATORIO y sin defecto:
                                                 el plan dice QUÉ pieza, el mapa con qué
                                                 componente se dibuja. Con piezas propias,
                                                 pasa tu mapa en vez de MONTADORES_BASE. */}
  <MotionPropioNNN />                        {/* + lo ÚNICO de esta pieza, a mano */}
  <SubtitulosSync segmentos={subtitulosNNN} yPct={70} />   {/* overlay FIJO */}
  <PistaSonido cues={cuesNNN} duckDb={-4.5} />             {/* voz manda + ducking */}
</AbsoluteFill>
```
Regla: **solo el avatar va dentro de `<CamaraVirtual>`**; MG y subtítulos son overlays fijos ([R09](../edicion-video/reglas.md)).

Las **cinco capas declarativas** del sistema son hermanas y se leen igual: `camara-NNN.ts` → `<CamaraVirtual>` · `graficos-NNN.ts` (un `Plan`) → `<PistaGraficos>` · `cues-NNN.ts` → `<PistaSonido>` · `noticia-NNN.ts` → `<PistaNoticia>` (formato noticias, sin avatar; una noticia puede también escribirse ya como `Plan` con `dialectoEditorialDe(CANAL)` y montar `<PistaGraficos>` directamente) · `metraje-NNN.ts` (un `Corte[]`) → `<PistaMetraje>` (piezas sin avatar, donde el movimiento ES el montaje: el look sale de la marca o se pasa entero, los velos los pide la composición y las entradas que no son del formato las trae la pieza en `entradas`). Lo repetitivo (títulos, cifras, listas, remates, CTA) va en el plan de datos; el JSX a mano queda para la idea visual propia de la pieza (un fondo, un objeto, una metáfora que no vuelve a usarse en otro vídeo).

**c) Reparto del espacio (9:16).** Cara al centro · MG en franja superior `y < 340px` ([R08](../edicion-video/reglas.md)) · subtítulos `y ≈ 70%` · la cámara **abre headroom** (baja el avatar) cuando un overlay superior lo necesita. Nada tapa la cara ni el subtítulo.

**d) Prioridad de atención (quién cede).** **1 hero a la vez.** Si hay **gráfico a pantalla completa** o un cambio visual fuerte → la **cámara REPOSA** ([camara-avatar §7](../camara-avatar/SKILL.md)) y el gráfico manda. Si el avatar hace el punto → **MG al mínimo**. Nunca dos protagonistas compitiendo.

**e) Sincronía con el discurso.** Movimientos de cámara y entradas de MG caen **sobre frases importantes**, nunca en medio de una palabra. El sonido sincroniza su **momento reconocible** al `targetFrame` (whoosh ~65% dentro, riser termina en target, impact al inicio).

**f) Mezcla.** La **VOZ manda** siempre. SFX por debajo; **whooshes de cámara e impacts aún más bajos** + ducking (`DUCK_DIALOGUE_DB`). Un whoosh de cámara nunca cubre la voz.

**g) Determinismo.** Todo desde `useCurrentFrame()`/`useVideoConfig()`. Prohibido `Math.random()` sin sembrar, timers, `Date.now()`, CSS `animation`/`transition` para el movimiento (rompen la coherencia entre renders).

**h) B-roll — dos motores y sus límites.** El b-roll es un **asset externo** que entra en la capa de **fondo** (z-order, §3·b), no una capa declarativa: no tiene plan `broll-NNN.ts`; se genera o se trae, se descarga y se referencia (como `<OffthreadVideo>`, o como el campo `media` de una toma en el formato de noticias).

**La regla que decide el motor, y no es de coste: es de honestidad.** Lo que existe se **trae** (`bancos.py`); lo que no existe se **genera** (`grok.py`).

- **Un lugar, un objeto o un gesto reales → banco.** Una fachada en una ciudad concreta, unas manos firmando, una grieta en un muro. Generarlos con IA cuando la pieza afirma que algo *pasó* es fabricar prueba documental, y en el formato de noticias eso está prohibido por precedente propio: una noticia sobre un sismo renunció al metraje del sismo y dibujó un esquema, porque el plano «real» generado habría afirmado un hecho que nadie filmó.
- **Un concepto sin referente filmable → ni banco ni IA: gráfico.** Una cifra, un plazo, un porcentaje, una norma. Es el error más caro de este paso, y también el más fácil de cometer, porque el banco *siempre* devuelve algo plausible. La biblioteca de `motor/graficos/` es la respuesta correcta.
- **Un plano imposible o ilustrativo que no afirma un hecho → IA.**

**Motor de archivo: Pexels.** Clave gratuita `PEXELS_API_KEY` en el `.env`. Licencia de uso comercial sin atribución obligatoria, y aun así el script anota siempre autor, licencia y URL: es gratis de poner y es la única defensa si alguien reclama.

```shell
uv run manuales/edicion-video/scripts/bancos.py contactos --proyecto NNN --toma n08b --consulta "grieta en la pared" --para escenario
uv run manuales/edicion-video/scripts/bancos.py traer --proyecto NNN --toma n08b --consulta "grieta en la pared" --para escenario --indice 3 --porque "…"
```

El paso de `contactos` **no se salta**: monta una hoja numerada con los candidatos ya cribados (sin repetidos, sin planos que ya usa otra toma) y la elección se hace **mirando**. Es lo único que contesta si el plano ilustra la frase o solo el tema — y es precisamente lo que el banco no puede decir, porque nunca devuelve cero.

Cuatro cosas que el director vigila aquí, porque ninguna se ve en el frame:

1. **El banco NUNCA dice que no.** Una consulta sin sentido devuelve miles de resultados igual que una buena: `results.length > 0` no significa nada. Se miran las descripciones antes de elegir.
2. **La consulta va en inglés; los topónimos, en español.** Medido: el español pierde entre ×3 y ×22 de candidatos y rompe la semántica de los términos jurídicos. Pero un topónimo escrito como lo escribe la gente del sitio (`bogota`, `medellin`) sí trae el lugar real. De eso se encarga el glosario de `bancos.py` (`bancos.py glosario`).
3. **Personas identificables solo en contexto neutro.** La licencia prohíbe presentarlas «bajo mala luz», y un rostro de archivo junto a un titular sobre estafas o desalojos es exactamente ese caso. El sujeto de una noticia se ilustra con objeto, lugar o documento — nunca con una cara de stock. Tampoco marcas ni logos visibles.
4. **El clip llega sin audio**, y el script lo fuerza. El riesgo documentado de Content ID en estos bancos no es el vídeo: es la música que llevan dentro, que sus autores sí registran.

En git queda el **manifiesto** (qué se eligió, de quién, con qué licencia y con el sha256 del archivo); el binario no. Un clon nuevo lo repone entero con `bancos.py reponer --proyecto NNN`.

**Motor generativo: Grok Imagine por la API DIRECTA de xAI** (`api.x.ai`), con el script `manuales/edicion-video/scripts/grok.py` (stdlib, hermano de `heygen.py`). Clave **`XAI_API_KEY`** en el `.env` de la raíz. **No se usa RunAPI**: era un revendedor con cuenta y factura aparte; yendo directo se paga solo a xAI.

> **`seedance-20` es un skill externo y de pago que NO viene con el producto.** Es un pack de *prompt-directing*, **no** el modelo: sin una suscripción de Seedance no genera nada. **No lo propongas como alternativa ni planifiques contando con él** salvo que el usuario confirme que tiene esa suscripción; entonces entra como motor de respaldo para el caso del punto 1.

Llamada base (`--help` para el resto):

```shell
uv run manuales/edicion-video/scripts/grok.py video "plano del hall al atardecer, cámara que retrocede" --duracion 6 --salida proyectos/NNN/broll/grok/raw/shot-01.mp4
```

El script sondea hasta que termina, **descarga el MP4 él mismo** y guarda el JSON de la llamada en `broll/grok/prompts/` para poder regenerar.

Cuatro límites que **solo el director** vigila, porque cruzan capas:

1. **La resolución del b-roll está POR CONFIRMAR — mídela en el primer clip.** La doc pública de xAI no fija la resolución de salida, así que **no la des por supuesta**: en cuanto salga el primer MP4, `ffprobe` y anótalo en el plan. Hasta entonces trabaja asumiendo lo peor (≤720p frente a comps de 1080×1920 / 1920×1080): colócalo **detrás del avatar** (fondo), **desenfocado/oscurecido** como scrim, o en un **plano escalado o enmarcado** que no llegue al borde. Si una escena pide un plano **nítido a pantalla completa** y la medición confirma que no llega, el b-roll IA no es la herramienta — y ahora sí hay a dónde ir: si ese plano es de algo **real**, el motor es el banco, que garantiza la medida por construcción (`--para escenario` filtra a 1080×1920 y `revisar-broll.mjs` rechaza lo que no llegue). Solo cuando el plano es imposible o puramente ilustrativo se queda sin alternativa, y entonces se resuelve con la biblioteca de gráficos ([motion-graphics](../motion-graphics/SKILL.md)) o replanteando la escena. Nunca subas un 720p a 1080 esperando que no se note.
2. **Las URLs caducan.** Las que devuelve la API son temporales: nunca guardes la URL en el código ni en un artefacto. `grok.py` ya descarga el MP4 en la misma llamada — no lo puentees. Copia a `remotion/public/` lo que use la comp. Un proyecto tiene que poder re-renderizar dentro de un año.
3. **El fps de la comp manda (§3a).** El clip llega con el fps que le dé la gana al modelo. **Nunca** cambies el fps de la comp para encajar un b-roll: mide con `ffprobe` ([R01](../edicion-video/reglas.md)) y re-tiempa en Remotion.
4. **El texto va en Remotion, nunca en el prompt.** Lo que cualquier modelo generativo escribe en pantalla es poco fiable. Los títulos son motion graphics (§1).

**Cómo conseguir 9:16.** La doc de xAI **no documenta** un parámetro de aspect ratio para vídeo. Dos vías, en este orden: (1) **imagen → vídeo** — genera primero un still vertical (`grok.py imagen`), súbelo a una URL pública y pásalo con `--imagen`; el encuadre de partida manda, y es la vía que no depende de campos sin documentar. (2) Probar `--extra '{"aspect_ratio":"9:16"}'`, que inyecta el campo tal cual por si la API lo acepta aunque no esté escrito. Si ninguna funciona, genera en el ratio que dé y **recorta en Remotion** — asumiendo que recortar cuesta resolución, que es justo lo que vigila el punto 1.

**i) Montaje — cuando no hay avatar, el movimiento ES el montaje.** Reels de b-roll, mini documentales con voz, eventos con música. No hay clip protagonista que fije el fps ni cara a la que seguir: el vídeo es una lista de planos, y esa lista es la capa declarativa `metraje-NNN.ts` (`Corte[]`) → `<PistaMetraje>` del formato `remotion/src/motor/metraje/` (`index.ts` es la puerta de entrada; `corte.ts` tiene el formato COMO DATOS: `Corte`, `Grado`, `Entrada`, el look, los velos y las cuentas de la ventana de cada plano). No se escribe de cero: se parte de esos tipos, de sus cuentas y de la puerta genérica `revisar-metraje.mjs`; si en el estudio hay una pieza de montaje parecida, se copia su plan. El producto todavía no trae una demo de metraje, así que el primer `metraje-NNN.ts` se escribe siguiendo el punto 3 de abajo y se valida con el punto 5 antes de renderizar nada.

```tsx
import { PistaMetraje, type Velos } from "../../motor/metraje";

<AbsoluteFill style={{ backgroundColor: "#000" }}>
  <PistaMetraje cortes={metrajeNNN} marca={CANAL} velos={VELOS_NNN} />  {/* 1 · los planos y el velo del texto */}
  <PistaGraficos plan={graficosNNN} montadores={MONTADORES_BASE} />       {/* 2 · overlay FIJO */}
  <SubtitulosSync segmentos={subtitulosNNN} yPct={70} />                   {/* 3 · solo si hay voz */}
  <PistaSonido cues={cuesNNN} duckDb={0} />                                {/* 4 · 0 solo si no hay voz contra la que duckear */}
</AbsoluteFill>
```

Lo que decide el director en una pieza así:

1. **Quién marca el tiempo.** La voz, si la hay (los beats salen de la transcripción por palabra). Si la voz viene DENTRO de las tomas —una persona a cámara grabada frase a frase—, cada corte va de su primera a su última palabra, medidas por energía y no con whisper, con un hueco fijo entre frases, el fundido dentro de ese hueco y la voz en su propia capa ([R29](../edicion-video/reglas.md)). Si no, los golpes MEDIDOS de la música (`proyectos/NNN/musica/golpes-NNN.json`, cada corte a ≤2 f de un golpe). Si tampoco, los propios cortes (cada cartel entra y muere con su plano). Con varias canciones, la frontera de la imagen y la de la música son dos decisiones distintas, y el cambio de canción entre actos pide por defecto un fundido AUDIBLE de 2-3 s con el rótulo del acto en el golpe: un corte limpio en un respiro se lee como un salto, no como un cambio de acto.
2. **El material se mide y se normaliza antes de montar.** `ffprobe` con rotación ([R19](../edicion-video/reglas.md)) y con transferencia ([R21](../edicion-video/reglas.md): el iPhone graba en HDR), y una receta `proyectos/NNN/normalizar.mjs` (Node, con `ejecutar()` de `herramientas/comun.mjs` para que corra igual en macOS y en Windows) que quema la rotación, deja un solo fps, quita el audio y escala a 1296 px (1080 × 1,2: el techo del punch-in). El metraje del cliente no va a git: va la receta, y el manifiesto con los sha256 si lo hay. Mide también la nitidez: en una pieza real las fotos eran más nítidas que los vídeos, y por eso sostenían los momentos quietos.
3. **El plan son datos.** `desde` en SEGUNDOS de la fuente (describe el material, no el fps de la comp), `en`/`dur` en frames, `zoom` y `pan`, `grado` medido con `signalstats` (primero se iguala el clip, después el look), `entra`, `velocidad`, `salidaNegro` y `reason` obligatorio. Cada pieza cierra `Corte<E>` a las entradas que su encargo permite: en un documental sobrio, un flash no compila.
4. **Look, velos y entradas van en la composición.** El look sale de `marca`, o se pasa entero con `look` si la pieza no es de un canal (un evento privado: sin sello, y es una decisión, no un olvido). Los velos solo existen si hay texto encima y se miden en px de la caja de ese texto (un reel con carteles arriba: velo arriba; un documental con subtítulos y rótulos: arriba y abajo; un evento sin texto: ninguno). Las entradas que solo usa una pieza (un whip, un flash) viven en su proyecto y llegan por `entradas`: al motor sube lo que ya ha servido a más de un vídeo.
5. **La puerta, antes que el render.** `proyectos/NNN/revisar-NNN.mjs` se construye sobre `abrePuerta()` de `remotion/src/motor/metraje/revisar-metraje.mjs` —línea de tiempo, metraje, tramos, encuadre y archivos— y añade lo del encargo (subtítulos contra la voz, golpes, anclajes). Tiene que salir con 0. Para arrancar una pieza nueva basta `node remotion/src/motor/metraje/revisar-metraje.mjs <metraje-NNN.ts>`. Las excepciones declaradas son solo para lo ya publicado, y una que sobra tumba la puerta.

Tres fallos que la revisión por frames NO ve. Los dos primeros llegaron a publicarse en piezas reales; el tercero lo paró la puerta:

- **La franja negra del encuadre.** El plano cubre el cuadro mientras `|pan| ≤ 50·(zoom mínimo − 1)`, y un desplazamiento lateral pide `zoom ≥ 1 + 2·desplazamiento/ancho`. Un reel salió con dos franjas de unos frames en dos planos.
- **La disolvencia sin metraje previo.** Un plano que disuelve pide `DISOLVER × velocidad` frames de clip ANTES de su `desde`; si el clip no los tiene, el plano entero sale desplazado. Un documental repite unos 9 frames al cortar entre dos planos contiguos.
- **La velocidad a oído.** Se despeja (material útil ÷ hueco que cubrir) y es UNA por beat ([R20](../edicion-video/reglas.md)): cuando falta clip, Remotion no falla, congela el último fotograma.

Y dos que sí se ven, pero tarde. **El frame 0 es la miniatura**: el primer plano no nace de negro y el título ya está puesto. **El ritmo se juzga con una hoja de contactos del render** (`ffmpeg -i final.mp4 -vf "fps=1/2.5,scale=196:-1,tile=6x5" hoja.png`), no con stills sueltos: es lo que dice cuál es el plano más flojo de treinta. Sin voz, además, no hay ducking, y los niveles del motor dejan la pieza muda: se levantan con un factor declarado ([diseno-sonoro](../diseno-sonoro/SKILL.md)).

> Los casos concretos de los que salió cada punto de §3i (qué pieza, qué plano, qué frames) están en `ESTUDIO.md` de esta carpeta, que solo existe en el estudio del autor y no viene con el producto.

---

## 4. Un estilo, tres capas (coherencia)

Elige **UN** estilo y propágalo coherente a cámara + MG + sonido:

| Estilo | Cámara (frecuencia / intensidad) | Motion graphics | Sonido |
|---|---|---|---|
| **Corporativo** | suave, cada 5–10 s | controlado, alineaciones rígidas | discreto, pocos SFX |
| **Educativo** | reencuadres para liberar espacio, cada 4–8 s | secuencias claras, highlights, pausas de lectura | marca conceptos, sin saturar |
| **Redes** | zooms rápidos controlados, cada 2–5 s | entradas cortas, whip, stagger cerrado | más presencia, variado |
| **Lujo** | lento y muy sutil, pocos cambios | distancias cortas, sin rebote | mínimo, aterrizajes suaves |
| **Cinematográfico** | zooms largos, parallax | escala, profundidad, risers+impactos | diseño sonoro con cuerpo (bajo la voz) |
| **Cómico** | punch in/out repentino | exageración, boings, cortes | cartoon/record-scratch puntual |

Puente motion↔sonido (vocabulario casi común) en [motion-graphics §11](../motion-graphics/SKILL.md). No mezcles estilos entre capas (glitch cómico sobre cámara de lujo, etc.).

---

## 5. Entrada mínima (qué necesita el director)

Con **una instrucción simple**, el director **infiere** del proyecto y **declara** sus supuestos; solo pregunta lo que bloquea:

- **Necesita:** el clip del avatar (o el guion) y el destino. Si falta el guion, lo pide.
- **Infiere:** fps/resolución/duración (`ffprobe`), formato por defecto del perfil (16:9 tutoriales · 9:16 talking-head · 1:1 repurpose), estilo por defecto (limpio/educativo) y duración de la comp = `frames del clip`.
- **Confirma en 1 línea** antes de producir: `formato · comp · fps · duración · estilo`. Si el usuario no corrige, procede.
- **Pieza de montaje (sin avatar):** necesita la carpeta del material y lo que marca el tiempo (la voz, la música o nada), más lo que el encargo pida con palabras («todos los archivos», «dos minutos», «la música cambia en el minuto y medio»). Esas frases van a la puerta como comprobaciones, porque son lo primero que se rompe sin avisar al tocar el plan (§3i).
- **Pieza de avatar:** pregunta ANTES del plan si lleva subtítulos o no, porque eso decide el molde de todas las tomas ([R14](../edicion-video/reglas.md)).

---

## 5b. La MARCA del vídeo (una decisión que se declara, no se hereda)

`video-creator` sirve a **cualquier canal**. La marca —colores, tipografía, sello, look del metraje— es un DATO que vive en `remotion/src/marcas/<canal>.ts` y que la **composición** pasa por parámetro:

```tsx
import { EJEMPLO as CANAL } from "../../marcas/ejemplo";   // la marca del proyecto; el producto trae `ejemplo.ts`

<PistaNoticia tomas={noticiaNNN} marca={CANAL} />       // DSL de tomas (plantilla: motor/demos/noticia-demo.ts)
capa(dialectoEditorialDe(CANAL), "noticia")             // plan nativo: una noticia escrita ya como `Plan`
fondos={fondosNoticiaDe(CANAL)}                         // <PistaGraficos> a pelo
<PistaMetraje cortes={metrajeNNN} marca={CANAL} />      // montaje con canal: el look del metraje
<PistaMetraje cortes={metrajeNNN} look={LOOK_NNN} />    // montaje SIN canal: un evento privado (una boda)
```

**Qué tiene que hacer el director:**

1. **Preguntar para qué canal es** si el proyecto no lo dice. Las marcas disponibles son los ficheros de `remotion/src/marcas/` (el producto trae `ejemplo.ts`: la marca «Mi Canal», que es además la plantilla para escribir la tuya). No des por hecho que todo vídeo es del mismo canal.
2. **Pasar la marca en TODAS las capas de la composición.** Son cuatro sitios y se olvidan de uno en uno: el plan, los fondos, el scrim y el sello. En una pieza de montaje hay un quinto, `<PistaMetraje marca>`: el tipo obliga a pasar `marca` o `look`, pero no a que sea la del canal correcto, y con la de otro el render se ve igual de bien. Una pieza que no es de ningún canal pasa `look` en su lugar y no lleva sello, y eso se declara en la cabecera de la composición.
3. Si el canal es nuevo, **escribir su fichero** en `remotion/src/marcas/` copiando `ejemplo.ts`. El motor no se toca. Lo único que exige cuidado es la tipografía: una fuente sin tabla medida en `plan/avances.ts` apaga R09 en silencio (`manuales/motion-graphics/scripts/generar-avances.mjs` la mide).

⚠️ **Cómo se ve que te lo has dejado:** `MARCA_BASE` —el suelo del motor— no es un canal y su `sello.texto` es `null`. Una composición sin marca sale **sin watermark**. Si ves un render sin la píldora de marca, falta el parámetro.

Antes de exportar, dos redes que no cuestan nada:

```shell
node manuales/motion-graphics/scripts/revisar-marca.mjs
node manuales/motion-graphics/scripts/revisar-sonda.mjs antes despues
```

La primera comprueba los invariantes de marca (letra medida, paleta, sello) sobre las marcas de `remotion/src/marcas/`; la segunda, la regresión de píxel entre dos tandas de stills.

⚠️ La regresión de píxel tiene ruido propio: dos tandas del MISMO código ya difieren en los frames con fotos o con blur (medido en un refactor real del motor: 4 frames de 138). Para afirmar que un refactor no mueve nada, compara cada frame contra VARIAS tandas del código anterior, no contra una.

---


## 6. Formato de respuesta a "monta el vídeo" (obligatorio)

1. **Cabecera:** `formato · comp · fps · duración · estilo` (supuestos declarados).
2. **Mapa de escenas** (una fila por tramo):

| frames | narrativa | cámara | motion graphic | sonido | subtítulo |
|---|---|---|---|---|---|
| 0–50 | hook | close 1.0→1.16 | — | soft-whoosh | "…" |
| 200–330 | dato | *reposa* | stat full-screen | impact + count | — |

3. **Genera los artefactos:** `proyectos/NNN/artefactos/01-plan.md` · `02-layout.md` · `03-timeline.md` → y de ahí `camara-NNN.ts` · `graficos-NNN.ts` · `cues-NNN.ts` · el JSX propio de la pieza · `subtitulos-NNN.ts` · la comp ensamblada (z-order §3). En una pieza de montaje, `camara-NNN.ts` se cambia por `metraje-NNN.ts`, y se añaden `proyectos/NNN/normalizar.mjs` y `proyectos/NNN/revisar-NNN.mjs` (§3i). En el mapa de escenas, la columna de cámara pasa a ser el plano: clip, segundo de entrada y cómo entra.
4. **Puertas de control:** en montaje, primero la puerta `revisar-NNN.mjs` con salida 0 → muestra **frames** clave ([R05](../edicion-video/reglas.md)) → **prueba 720p** ([R06](../edicion-video/reglas.md)) → espera OK → **final**.
5. **Guarda lo que funcionó** en `proyectos/NNN/aprendizajes.md` y las reglas nuevas con la siguiente R libre de [reglas.md](../edicion-video/reglas.md) ([R07](../edicion-video/reglas.md)).

---

## 7. Checklist del director (antes de exportar)

1. ¿Hay **una sola idea** por escena y **un solo hero** a la vez?
2. ¿La **cámara reposa** cuando hay gráfico full o cambio visual fuerte?
3. ¿Los MG están **fuera de la cara y el subtítulo** (R08) y solo el avatar se reencuadra (R09)?
4. ¿Todos los tiempos están en **frames al fps de la comp**?
5. ¿La **voz** queda por encima de todo SFX (whooshes/impacts aún más bajos + ducking)?
6. ¿Cada movimiento/gráfico/sonido cae sobre una **frase importante** con `reason`?
7. ¿El código es **determinista** y validaste con **frames reales**?
7b. ¿Los tres **artefactos** están escritos y coinciden con lo que se renderizó? ¿Miraste el **catálogo** antes de escribir un gráfico nuevo?
7c. Si hay **b-roll**: ¿está **descargado** en `proyectos/NNN/broll/` (ninguna URL de la API en el código), **medido con `ffprobe`** y colocado de forma que su resolución real aguante el formato (§3h)? ¿Y cada plano de banco tiene **autor y licencia en el manifiesto**, con sus créditos listos para la descripción del vídeo (`bancos.py creditos --proyecto NNN`)? Eso último es lo único de esta lista que no se ve en ningún frame. En la ruta de noticias las cuatro comprobaciones las hace una puerta automática que sale con 1: `node manuales/video-noticias/scripts/revisar-broll.mjs <plan>`.
7d. Si es **montaje**: ¿`revisar-NNN.mjs` sale con 0 (tiempo, metraje con velocidad y disolvencias, tramos, encuadre y lo que el encargo pidió con palabras)? ¿El material está normalizado (rotación, HDR, un solo fps, sin audio)? ¿Miraste la **hoja de contactos del render** y no solo stills sueltos? ¿Los velos existen solo donde hay texto encima? Todo esto se detalla en §3i.
8. **¿La escena mejora con todas las capas, o sería más clara quitando alguna?** Si dudas → **quita**.

---

## 8. Qué NO hace el director

- **No** re-explica ni duplica cada skill: delega y enlaza.
- **No** añade una capa porque "toca" (un corte, un dato, un silencio) sin función narrativa.
- **No** deja dos protagonistas compitiendo, ni mueve la cámara bajo un gráfico full.
- **No** exporta el final sin pasar por frames + prueba 720p.
- **No** inventa recursos: usa los motores/plantillas existentes; si falta algo, lo dice.
- **No** pide ni lee claves: viven en `.env` y las pone el usuario.

> **En una frase:** el director convierte *"monta el vídeo"* en un plan coordinado de cámara + gráficos + sonido + subtítulos sobre el motor Remotion —o, si no hay avatar, en un montaje con su puerta—, con la narrativa al mando y una sola cosa importante a la vez.
