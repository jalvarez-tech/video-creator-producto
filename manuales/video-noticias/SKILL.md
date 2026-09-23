---
name: video-noticias
description: >-
  Convierte una NOTICIA (un enlace, un titular, un texto pegado) en un short
  vertical 9:16 de explicación periodística con el look editorial del sistema:
  papel beige + un acento de marca, sin avatar en pantalla (voz en off + motion
  graphics + metraje enmarcado), corte de 1-4 s por toma y sello de marca. Cubre
  los 7 beats (gancho · contexto · conflicto · explicación · datos · clímax ·
  cierre), el doble registro (papel = explica / negro = muestra), las 9 tomas,
  el plan COMO DATOS (`TomaNoticia` → `PistaNoticia`) con validador
  `revisaNoticia()` y el reparto con las otras capas (sonido, b-roll,
  subtítulos). Úsalo SIEMPRE que se pida montar un vídeo a partir de una
  noticia, una actualidad, un caso o una polémica, o replicar el look
  "explicador de noticias". Disparadores: "vídeo de esta noticia", "monta esta
  noticia", "short de noticias", "explicador", "vídeo editorial".
metadata:
  type: reference
---

# 📰 Formato NOTICIAS — de un titular a un short

> **Regla maestra.** Una noticia no es una lista de hechos: es **una cosa que el espectador cree y que resulta no ser así**. El vídeo existe para mover esa creencia. Todo lo demás —el color, la letra, los sliders, el metraje— sirve a eso. **Si una toma no cambia lo que el espectador cree, sobra.**

Root: **la raíz del repo** (la carpeta que contiene `AGENTS.md`). Todas las rutas de esta skill son relativas a ella y los comandos se lanzan desde ahí, uno por línea. Este skill es un **formato completo** montado sobre el motor Remotion: trae su propio look, su propia estructura narrativa y su propia capa declarativa. A diferencia del resto del sistema, **no hay avatar en pantalla**: manda la voz en off y lo que se ve son gráficos y metraje.

🔗 Entra por [director-video](../director-video/SKILL.md) si el vídeo mezcla este formato con avatar. Motor y render: [edicion-video](../edicion-video/SKILL.md). Animación: [motion-graphics](../motion-graphics/SKILL.md). Sonido: [diseno-sonoro](../diseno-sonoro/SKILL.md).

📂 **Partes:** [recetario-tomas.md](recetario-tomas.md) (las 9 tomas en detalle) · [artefactos/01-noticia.md](artefactos/01-noticia.md) (el artefacto que se rellena ANTES de tocar código).

**Otras frases que disparan este skill:** «explica esta noticia en vídeo», «vídeo estilo noticias», «formato noticias», «news short», «haz un vídeo de este titular», «convierte este artículo en vídeo», «papel y naranja».

---

## 1. El doble registro (la gramática del formato)

El formato alterna **dos mundos** y esa alternancia *es* el look. No es decoración:

| Registro | Fondo | Significa | Tipografía | Se usa en |
|---|---|---|---|---|
| **Papel** | beige `#ECE8DF` + grano | «esto **significa**» | display en titulares, texto en apoyos, tinta `#111` | gráficos, cifras, comparaciones, prensa, cronologías |
| **Cine** | negro `#000` + foco cenital | «esto **pasó**» | display blanca | metraje, retratos, reconstrucciones, el cierre |

**Nunca mezcles los dos registros dentro de una toma.** Un gráfico vectorial sobre metraje real, o una foto a sangre sobre papel, es lo que hace que una pieza de este formato se lea como "plantilla mal usada".

Dos consecuencias que se olvidan:
- El **metraje real sobre papel va SIEMPRE enmarcado** (borde de acento + sombra, `TarjetaFoto`). A sangre solo sobre negro. La razón es de lectura: enmarcado se lee como *prueba dentro del artículo*; a sangre sobre papel se lee como *otro vídeo pegado*.
- **Máximo 3 tomas `cine` seguidas.** Más y se pierde el registro editorial y la pieza pasa a parecer un montaje de archivo. `revisaNoticia()` lo avisa.

---

## 2. Los 7 beats (la estructura que retiene)

Para un short de **60-90 s**. Los tiempos son el punto de partida, no una ley:

| Beat | Tiempo | Qué hace | Si falta |
|---|---|---|---|
| **gancho** | 0-4 s | Una afirmación que **contradice** lo que el espectador cree saber | No hay vídeo: se van en el segundo 2 |
| **contexto** | 4-10 s | Qué está pasando y por qué debería importarle | El conflicto no tiene contra qué medirse |
| **conflicto** | 10-22 s | Las dos fuerzas que chocan + **cuándo** empezó | Parece una polémica sin causa |
| **explicación** | 22-40 s | **El mecanismo**: cómo funciona realmente la cosa | El vídeo es un titular largo, no un explicador |
| **datos** | 40-52 s | Las cifras que sostienen la explicación | La explicación suena a opinión |
| **clímax** | 52-68 s | Qué está en juego **ahora**, qué se rompe | La noticia no es de hoy |
| **cierre** | 68-75 s | Remate + gancho a la parte 2 (o CTA) | Se acaba sin que nadie vuelva |

**El bloque que justifica que esto sea un vídeo es `explicación`.** Un titular se lee en 3 segundos; lo que nadie tiene es el *mecanismo*. Si tu plan salta de `conflicto` a `clímax` sin explicar cómo funciona la cosa, has hecho una noticia hablada, no un explicador.

**Gancho — las tres formas que funcionan** (los ejemplos son del caso **ficticio** de la demo, ver §3):
1. **Desmentido** — «Talvia Labs no la fundó su director.»
2. **Cifra imposible** — «Perdieron 5.000 millones y subieron de valor.»
3. **Consecuencia oculta** — «Esta ley cambia lo que puedes hacer con tus fotos.»

Lo que **no** funciona: preguntar («¿Sabías que…?»), presentarse, o resumir el vídeo antes de darlo.

---

## 3. Las 9 tomas

Cada toma es un tipo de `TomaNoticia`. Detalle completo, props y sonido en [recetario-tomas.md](recetario-tomas.md).

| Toma | Registro | Para qué | Dura | Sonido de partida |
|---|---|---|---|---|
| `titular` | papel · cine | El mensaje de la escena, en display. La más frecuente | 2-3.5 s | `impact deep` en la palabra clave |
| `prensa` | papel | La **prueba**: recorte real + rotulador amarillo | 3-4 s | `paper` + `pen` al subrayar |
| `comparador` | papel | A vs B en chips de acento (esto sí / esto no) | 3-4 s | `pop` por chip (alterna variantIndex) |
| `cronologia` | papel | El viaje entre dos fechas. El orden = la dirección | 3-4 s | `whoosh light` + `tick` por hito |
| `cifra` | papel | El dato como argumento. El **recorrido** es el mensaje | 3-4 s | `data` (textura) + `chime` al llegar |
| `medidor` | papel | Lo que sube o baja mientras miras (control vs. dinero) | 3-4 s | `ui` + `data` |
| `retrato` | papel | Foto/clip **enmarcado** con Ken Burns | 2.5-3.5 s | `camera` o `whoosh light` |
| `escenario` | cine | Metraje a sangre sobre negro **+ velo** | 2.5-3.5 s | `whoosh heavy` al entrar |
| `cierre` | cine | Negro + una palabra. El gancho a la parte 2 | 2.5-3 s | `impact deep` + cola |

**Una idea por toma.** Si una toma necesita dos titulares, son dos tomas.

**El ejemplo que recorre este manual es ficticio a propósito.** «Talvia Labs» es una empresa de software inventada: nació como cooperativa de cuarenta socios, su director propuso convertirla en sociedad en 2019 y los socios fundadores lo demandan en 2026; su mecanismo es un *retorno con tope* (un inversor pone 1 $ y recupera 100 $ como máximo, aunque la empresa gane 500 $). Ni la empresa, ni el director, ni la «Gaceta del Sector» que lo cubre existen. Es el caso que monta `remotion/src/motor/demos/noticia-demo.ts` (comp `NoticiaDemo`) y el del recetario. Sirve para ver el molde y el ritmo sin afirmar nada sobre nadie; en una pieza real cada recorte es de un medio real y cada cifra tiene fuente (§5.2).

---

## 4. La ficha de estilo (tokens, no números sueltos)

Todo vive en `remotion/src/motor/noticias/theme-noticias.ts`. **No escribas colores ni tamaños a mano en una toma** — si hace falta un valor nuevo, se añade al theme.

La excepción es `grado`, y lo es porque no es estilo: es la **corrección medida de ESE clip** (`uv run manuales/edicion-video/scripts/bancos.py gradar`), la distancia entre él y la mediana de los demás. Va en la toma porque es de la toma. El look del metraje —saturación, velo cálido, grano, viñeta— sí es del formato, vive en `METRAJE` y lo aplica el motor a todo. El orden importa: primero se igualan los clips entre sí, después el look; al revés, el mismo filtro empuja el color de cada uno hacia otro lado y **amplifica** las diferencias en vez de taparlas.

| Rol | Token | Valor (el de `MARCA_BASE`; tu marca lo sobrescribe) |
|---|---|---|
| Fondo papel | `N.papel` | `#ECE8DF` (+ grano 0.025) |
| Fondo tarjeta | `N.hueso` | `#F7F5EF` |
| Fondo cine | `N.negro` | `#000000` |
| Texto principal | `N.tinta` | `#111111` (nunca `#000` sobre beige: vibra) |
| Texto de apoyo | `N.tintaSuave` | `#57524A` (gris **cálido**, no azulado) |
| **Acento** | `N.naranja` | `#FF5500` — el único color vivo (`color.acento` de la marca) |
| Chips isométricos | `N.naranjaChip` | `#E8863A` (`color.acentoChip`) |
| Rotulador | `N.resalte` | `#FFE24A` |

**Tipografía — la voz del canal:** la declara la marca en `letra`, en dos roles: `display` para lo que **afirma** (titulares, cifras, años, cierre) y `texto` para lo que **acompaña** (kickers, etiquetas, labels, chips, subtítulos). La marca de ejemplo (`remotion/src/marcas/ejemplo.ts`) usa **`LETRA_INTER`**: Inter empaquetada en `remotion/public/fuentes/inter/` y cargada por `motor/fuentes.ts`, así que el render es el mismo en macOS y en Windows. Lo que separa este look de un TikTok genérico no es la familia sino el **tracking negativo** de los titulares (−2,6 a 96 px) y de las cifras (−9 a 220 px): elegante por contención.

> El formato nació con un serif pesado y pasó a una geométrica. Si un canal quiere volver al serif, se toca **solo** `letra` en su marca y el tracking de `T.titular`/`T.cifra` en `theme-noticias.ts` (caso del estudio: ver ESTUDIO.md).
>
> ⚠️ `MARCA_BASE` conserva `LETRA_SF_SISTEMA` (San Francisco vía `-apple-system`), que **solo existe en macOS**: en Windows y Linux cae a otra letra, y las tablas de avances con las que R09 mide si un titular cabe (`sf500`…`sf800`) están medidas contra una fuente que no se está pintando. Una marca nueva declara `letra: LETRA_INTER` y no hereda ese problema. Si das de alta otra familia, mide sus avances antes con `node manuales/motion-graphics/scripts/generar-avances.mjs`.

**Marca: NO está en este archivo.** Vive en `remotion/src/marcas/<canal>.ts` y llega **por parámetro** — `theme-noticias.ts` solo define la FORMA del tema y la deriva de la marca que reciba. Un canal nuevo es un fichero nuevo (copia `ejemplo.ts`); el motor no se toca.

```tsx
<PistaNoticia tomas={noticiaDemo} marca={EJEMPLO} />     // DSL de tomas — así monta NoticiaDemo
capa(dialectoEditorialDe(EJEMPLO), "noticia")            // plan nativo del núcleo (un `Plan` a mano)
```

Son **cuatro** los sitios que la necesitan y se olvida uno de cada vez: el plan, los fondos (`fondosNoticiaDe`), el scrim y el sello. Si el render sale **sin la píldora de marca**, es que falta el parámetro: el suelo del motor (`MARCA_BASE`) tiene `sello.texto: null` justamente para que ese olvido se vea en el primer frame en vez de publicarse.

Y una pieza del sistema que este formato ya puede usar y antes no: las seis del **registro compartido** (`regla`, `subrayado`, `rodea`, `flecha`, `check`, `aspa`). Se piden como cualquier otra desde un plan nativo — ver el aviso al principio de [recetario-tomas.md](recetario-tomas.md).

**Sombras:** proyectadas al **15 %** (`N.sombra`). Más y la pieza pasa de editorial a "plantilla de Canva".

---

## 5. Flujo: de la noticia al vídeo

> **Antes del paso 1 — abre el artefacto.** Copia [artefactos/01-noticia.md](artefactos/01-noticia.md) a `proyectos/NNN/artefactos/01-noticia.md` y **rellénalo**. Es donde se decide qué se cuenta y qué NO; escribir tomas sin esto produce piezas que enumeran hechos en vez de mover una creencia.

1. **Leer la noticia y extraer la CREENCIA a mover.** Una frase: «la gente cree X, y en realidad Y». Si no sale, aún no tienes vídeo — tienes un artículo.
2. **Verificar los hechos y anotar las FUENTES.** Cada cifra y cada titular de la toma `prensa` necesita medio y fecha en el artefacto. El formato *vende* credibilidad; una cifra inventada la quema entera. Si un dato no se puede sostener, se cae del plan.
3. **Guion de voz en off** (~140-160 palabras/minuto). Escribe primero el gancho, y que quepa en 4 s.
4. **Generar la voz** y **medir su duración real** con `ffprobe` ([R01](../edicion-video/reglas.md)). **La voz manda sobre el plan**, nunca al revés: la comp dura lo que dura la voz.
5. **Repartir los 7 beats** sobre esa duración → tabla de tomas con frames absolutos **a 30 fps**.
6. **B-roll y metraje** (solo si alguna toma lo pide). Lo primero no es conseguirlo: es **de dónde tiene que salir**, y eso lo decide la honestidad de la pieza ([director §3h](../director-video/SKILL.md)):
   - un lugar, un objeto o un gesto **reales** → banco: `uv run manuales/edicion-video/scripts/bancos.py contactos …` (hoja numerada) → `… traer … --porque`;
   - un concepto sin referente filmable (una cifra, un plazo, una norma) → **no es b-roll: es un gráfico**;
   - un plano imposible o ilustrativo que no afirma un hecho → `uv run manuales/edicion-video/scripts/grok.py`.

   Se trae **antes** de escribir el plan cuando puedas, porque la duración real del clip condiciona los frames. Pero no bloquea: una toma puede declarar `buscarMedia: "grieta en la pared"` y maquetarse sin material, que es un estado legítimo del plan y no un TODO. Y el material tiene que dar la **medida del hueco** — `escenario` pide 1080×1920 y `retrato` **662×853** (624×804 más el Ken Burns), así que aquí «enmarcado» no significa que perdone resolución baja: `revisar-broll.mjs` lo rechaza. Con todos los clips ya traídos, `bancos.py gradar` mide y escribe la corrección que los iguala.
7. **Escribir `noticia-NNN.ts`** (`TomaNoticia[]`) copiando `remotion/src/motor/demos/noticia-demo.ts`. Y validar con las dos puertas, que miran cosas distintas y salen con 1 si hay avisos:
   ```bash
   node manuales/video-noticias/scripts/revisar-plan.mjs remotion/src/proyectos/NNN/noticia-NNN.ts
   node manuales/video-noticias/scripts/revisar-broll.mjs remotion/src/proyectos/NNN/noticia-NNN.ts
   ```
   La primera mide el **plan** (huecos, solapes, duraciones, R08/R09, reglas de cada pieza); sin argumento valida la demo. La segunda es la única que mira el **disco**: que el archivo esté donde dice el plan, que tenga los píxeles de su hueco, que el clip no sea más corto que su toma y que su crédito esté en el manifiesto. Cuando falta material, imprime el comando de `bancos.py` que hay que correr.
8. **Subtítulos** (`subtitulos-NNN.ts` + `<SubtitulosSync yPct={78}>`) y **sonido** (`cues-NNN.ts` + `<PistaSonido>`, ver §7).
9. **Validar**: los dos validadores en verde → frames reales ([R05](../edicion-video/reglas.md)) → prueba 720p ([R06](../edicion-video/reglas.md)) → **esperar OK** → final. Y antes de publicar, `uv run manuales/edicion-video/scripts/bancos.py creditos --proyecto NNN` para la descripción del vídeo.

---

## 6. Ritmo (lo que hace que se vea entero)

- **1-4 s por toma.** Por debajo de 0.8 s nadie lee el titular; por encima de 6 s en un short se pierde al 30 %. `revisaNoticia()` avisa de ambos.
- **Sin huecos ni solapes.** El formato es una **sucesión**, no capas apiladas: la toma N+1 empieza exactamente donde acaba la N. El validador lo comprueba.
- **Punch-in permanente.** Cada toma escala un 1.5 % durante su ventana (lo hace `PistaNoticia` sola). Es lo que impide que una toma de gráfico se lea como diapositiva congelada. Por encima del 4 % se percibe como zoom y compite con el contenido.
- **Corta sobre la frase, nunca en medio de una palabra.** El cambio de toma cae donde la voz cierra una idea.
- **Match cut de forma** cuando la haya (el círculo del logo pasa a ser la moneda, la moneda a ser el punto de la cronología). Es gratis y es lo que hace que la pieza parezca dirigida.

---

## 7. Sonido (delegado, con tres reglas propias)

El detalle está en [diseno-sonoro](../diseno-sonoro/SKILL.md) y el [recetario por gráfico](../diseno-sonoro/recetario-motion-graphics.md); el `soundCueId` de cada toma enlaza con su `SoundCue` en `cues-NNN.ts`. Lo específico de este formato:

1. **La voz manda siempre.** Todos los SFX por debajo, con `duckDb={-4.5}`. Un whoosh que tapa una cifra ha arruinado el dato.
2. **Un SFX por toma, no tres.** El formato ya corta cada 2-3 segundos: si cada corte trae whoosh + impact + pop, en 20 segundos es ruido. Elige **el momento reconocible** de la toma (el chip que aterriza, el rotulador que marca, la cifra que frena) y sonoriza **ese**.
3. **El efecto MÁS específico, no un whoosh genérico:** papel → `paper` · rotulador → `pen` · chips → `pop` · cifras → `data` + `chime` · sliders → `ui` · cronología → `tick`.

Música de fondo: opcional y **muy** baja. Si la pieza necesita música para no aburrir, el problema está en el guion.

---

## 8. Voz y subtítulos

**Motor de voz: ElevenLabs** (`manuales/edicion-video/scripts/elevenlabs.py`, clave `ELEVENLABS_API_KEY` en `.env`). Devuelve **audio directo** y se factura por caracteres.

> **Dos piezas, no una.** La skill `text-to-speech` de [elevenlabs/skills](https://github.com/elevenlabs/skills) —opcional, no viene con el producto: se instala aparte en tu propia carpeta de skills— es la **documentación de la API**: modelos, ajustes de voz, formatos, stitching, streaming. `elevenlabs.py` es la **herramienta de pipeline** de este sistema: locuta un guion por tomas y encaja con `generar-vo.mjs`, que cronometra el plan. Cuando dudes de un parámetro, mira la skill oficial; cuando quieras locutar un proyecto, usa el script.

> **No uses HeyGen para la voz de este formato.** HeyGen solo genera **vídeo de avatar**: para quedarte con la pista hay que renderizar el avatar entero y tirar la imagen. Aquí no hay avatar en pantalla, así que es pagar un render que no se usa. HeyGen sigue siendo el motor correcto cuando la pieza **sí** lleva avatar ([heygen.md](../edicion-video/heygen.md)).

Flujo, y el orden importa — **primero se locuta, luego se cronometra**. Un comando por línea, desde la raíz:

```bash
# 1. Ver qué voces tienes (las 'cloned'/'professional' son tuyas)
uv run manuales/edicion-video/scripts/elevenlabs.py voces

# 2. Ensayo en seco: cuántos caracteres cuesta el guion, sin gastar cuota
uv run manuales/edicion-video/scripts/elevenlabs.py guion proyectos/NNN/guion-vo.txt --voz <voice_id> --salida proyectos/NNN/vo/partes --simular

# 3. Locutar de verdad (un MP3 por toma)
uv run manuales/edicion-video/scripts/elevenlabs.py guion proyectos/NNN/guion-vo.txt --voz <voice_id> --salida proyectos/NNN/vo/partes

# 4. Montar la pista y OBTENER LA TABLA DE FRAMES del plan
node manuales/video-noticias/scripts/generar-vo.mjs proyectos/NNN/guion-vo.txt --motor elevenlabs --partes proyectos/NNN/vo/partes
```

El paso 4 deja `proyectos/NNN/vo/NNN-vo.wav` (la pista completa, con los respiros entre tomas) e imprime la tabla `[inicio, fin]` de cada toma y el `durationInFrames` de la composición, que es lo que se pega en `noticia-NNN.ts`. La composición lee la voz desde `remotion/public/noticias/NNN-vo.wav`: copia ahí ese WAV (el script no lo copia; `remotion/public/` es tuyo y está fuera de git).

**Es REANUDABLE: si algo falla a mitad, vuelve a lanzar el MISMO comando.** Junto a cada audio queda un sidecar `.json` con la firma de lo que lo generó (texto, voz, modelo, preset, formato y los vecinos del stitching). Las tomas cuya firma no ha cambiado se saltan y **no se vuelven a facturar**; un 429 en la toma 15 ya no obliga a repagar las 14 anteriores. Al editar una línea del guion se regeneran esa toma **y sus dos vecinas**, porque el stitching hace que su audio dependa de ellas. Para regenerarlo todo a propósito (y volver a pagarlo): `--forzar`.

⚠️ **`--partes` no puede ser `proyectos/NNN/vo/.partes`** (con punto) ni la carpeta que la contiene: ese es el temporal que `generar-vo.mjs` borra al empezar. El script lo rechaza antes de tocar el disco, pero úsalo sin punto como en los ejemplos.

**Un audio por toma, no uno por vídeo:** cada ventana del plan sale de la duración real de *su* línea. Con un único archivo habría que segmentarlo a oído después, que es el paso manual que este sistema existe para evitar.

**Y por qué eso no suena a trozos pegados — tres ajustes que no son opcionales:**

| Ajuste | Valor | Por qué |
|---|---|---|
| **Request stitching** | automático | Cada llamada lleva el texto anterior y el siguiente (`previous_text`/`next_text`). Sin esto, generar frase a frase produce **saltos de tono y pausas raras en cada juntura** — que es justo lo que se oye al concatenar después. |
| **Preset `noticias`** | `stability 0.8 · similarity 0.6 · style 0` | Es el preset "News/Professional" de la skill oficial. Con los valores conversacionales (0.4) la voz **cambia de tono entre frases**, y ese vaivén es lo que delata a un TTS. |
| **Formato `mp3_44100_128`** | por defecto | Es el único disponible en **todos** los planes. Los sin pérdida (`wav_44100`, `pcm_44100`) exigen **Pro** y devuelven `403` por debajo — no los pongas de default o la primera locución de una cuenta nueva falla. Con plan Pro, `--formato wav_44100` ahorra una generación con pérdida; sobre voz hablada a 128 kbps la diferencia es inaudible. |

Modelo por defecto `eleven_multilingual_v2` (el que la skill marca para *long-form*). `--modelo eleven_v3` da más rango emocional y es el único que admite `--idioma es`.

**Los cuatro motores de `generar-vo.mjs`** (`--motor`; sin flag usa la voz de sistema —`say` en macOS, `sapi` en Windows—, que es la pista guía; `--voces` lista las voces de sistema de tu máquina):

| Motor | Qué es | Para qué |
|---|---|---|
| `elevenlabs` | los MP3 de `elevenlabs.py guion`, pasados en `--partes` | **la voz publicable** |
| `propio` | te grabaste tú: pásale en `--partes` la carpeta con un audio por toma, ordenados por nombre | la voz publicable, sin API |
| `say` | voz de sistema — **solo macOS** | **pista guía** para fijar el ritmo y revisar la pieza; nunca para publicar |
| `sapi` | voz de sistema vía PowerShell (`System.Speech`) — **solo Windows** | la misma pista guía, en Windows |

**Escribir para que lo lea una máquina** — dos reglas que ahorran un ciclo entero:
1. **Números en letra** ("tres mil novecientas ochenta y cinco"). Los TTS los pronuncian mejor, pero además **se leen mucho más lento** de lo que sugiere contarlos como palabras: una línea cargada de cifras rompe cualquier estimación de duración.
2. **Siglas fuera.** "POT" se lee bien en pantalla y no se entiende dicho en voz alta si no eres del sector: en la voz va "ordenamiento territorial", en el gráfico va "POT".

- **Voz en off**, no avatar. Tono narrativo, ágil, con modulación — el formato se sostiene en la voz.
- **Subtítulos sincronizados** en **sans pesada** (`T.subtitulo`), `yPct ≈ 78` (por encima del watermark), 3-5 palabras por línea, con la palabra clave en el acento.
- Los subtítulos son **overlay fijo**: no entran en el punch-in de la toma ni se reencuadran. Si un titular de toma y el subtítulo dicen lo mismo a la vez, **quita el titular** — no repitas texto en pantalla.

---

## 9. Checklist antes de exportar

1. ¿El **gancho contradice** algo en los primeros 4 s, sin pregunta y sin presentación?
2. ¿Hay un bloque de **explicación** real (el mecanismo), o el vídeo es un titular estirado?
3. ¿**Cada cifra y cada titular de prensa** tiene fuente anotada en el artefacto?
4. ¿**Una sola idea por toma** y ningún registro mezclado (gráfico sobre metraje, foto a sangre sobre papel)?
5. ¿El metraje sobre papel va **enmarcado**? ¿No hay más de 3 tomas `cine` seguidas?
6. ¿`revisaNoticia(tomas, 30)` sale **limpio** (sin huecos, solapes, tomas cortas ni `reason` vacíos)?
7. ¿Los colores y tamaños salen de **`theme-noticias.ts`** y no hay hex sueltos en las tomas?
8. ¿La **voz** queda por encima de todo SFX, y hay **un** efecto por toma?
9. ¿El subtítulo **no repite** el titular que ya está en pantalla?
10. ¿Validaste con **frames reales** y prueba 720p antes del final?

---

## 10. Qué NO hace este formato

- **No** pone avatar en pantalla. Si el vídeo lo lleva, el que orquesta es [director-video](../director-video/SKILL.md) y este skill aporta solo el look de las tomas de gráfico.
- **No** inventa cifras, fechas, citas ni titulares de prensa. Un recorte de `prensa` es de un medio real o no existe. **Si te falta el dato, dilo — no lo rellenes.** (La demo es la única excepción, y está rotulada como ficticia.)
- **No** mete texto en el prompt del generador de b-roll: los títulos son motion graphics ([director §3h](../director-video/SKILL.md)).
- **No** ilustra un hecho con una imagen generada. Una imagen de lo que la pieza afirma que pasó se lee como registro del suceso, y es la misma línea que la del recorte de prensa: o es real, o no existe. Precedente: en una pieza real sobre un sismo se renunció al metraje y se dibujaron esquemas (caso del estudio: ver ESTUDIO.md). Lo real se trae de un banco; lo que no tiene referente se resuelve con gráficos.
- **No** pone caras de archivo junto a una acusación. Personas identificables solo en contexto neutro: la licencia de los bancos prohíbe mostrarlas «bajo mala luz», y un rostro de stock al lado de un titular sobre estafas o desalojos es exactamente ese caso. El sujeto de una noticia se ilustra con objeto, lugar o documento.
- **No** usa los tokens de `graficos/estilos.ts` para color: aquél asume fondo oscuro y aquí el fondo es claro. Las **primitivas** de la biblioteca general (Subrayado, Rodea, Aspa, Check, Flecha, Particulas) sí se reusan tal cual.
- **No** añade una toma porque "hay hueco". Ante la duda, **quita**.

---

## 11. Formato de respuesta a "monta esta noticia" (obligatorio)

1. **Cabecera:** `creencia a mover · duración de la voz · comp 1080×1920 · 30 fps · nº de tomas`.
2. **La creencia en una frase:** «la gente cree X; en realidad Y».
3. **Mapa de beats** (una fila por toma; el ejemplo es el caso ficticio de la demo):

| frames | beat | toma | registro | contenido | sonido |
|---|---|---|---|---|---|
| 0-78 | gancho | titular | cine | "Talvia Labs no la fundó su director" | impact deep |
| 78-186 | contexto | comparador | papel | Cooperativa / Sociedad | pop ×2 |

4. **Fuentes** de cada cifra y cada recorte (medio + fecha). Sin esto no se renderiza.
5. **Genera:** `artefactos/01-noticia.md` → `noticia-NNN.ts` → `subtitulos-NNN.ts` → `cues-NNN.ts` → la comp.
6. **Puertas de control:** frames clave → prueba 720p → **espera OK** → final.
7. **Guarda lo que funcionó** en `proyectos/NNN/aprendizajes.md`.

> **En una frase:** el formato noticias convierte *"monta esta noticia"* en una sucesión de tomas cortas que alternan papel (explica) y negro (muestra), con la voz al mando, una idea por toma y cada cifra sostenida por una fuente.
