# 🎬 Fase 3 · Proceso de edición (del bruto a la publicación)

> **Principio rector:** primero **guion**, luego **formato**, después **bloques**.
> Si la idea no está clara, ningún visual arregla el vídeo. Si te saltas una fase, pierdes control y aparecen errores difíciles de corregir.

Este documento es el **procedimiento repetible**. Cada paso dice: qué hace Claude, qué **entrega como evidencia**, y **dónde se detiene** a esperar tu decisión. Se apoya en las [reglas R01–R29](reglas.md) y en las [plantillas](plantillas/README.md). Todos los comandos se lanzan desde la raíz del repo (salvo donde se dice `cd remotion`), un comando por línea, y corren igual en macOS y en Windows.

> **Variante con avatar HeyGen:** si el vídeo lo genera tu avatar (ver [heygen.md](heygen.md)), el habla ya es limpia y el guion es texto conocido → **sáltate el Paso 2 (silencios) y el Paso 3 (transcripción)** y ve directo a **Paso 4 (formato) → 5 → 6 → 7**.

---

## 🗺️ Mapa del flujo

| # | Fase | Entrada | Salida |
|---|---|---|---|
| 1 | **Abrir carpeta** | `original.mp4` | ficha del proyecto (fps, resolución, audio, qué falta) |
| 2 | **Cortar silencios** | original | versión limpia / timeline + evidencias |
| 3 | **Transcribir** | audio | `transcripcion.json` + guion limpio en bloques de 10 s |
| 4 | **Decidir formato** | guion | 3 propuestas de formato → **eliges 1** |
| 4·bis | **Material de apoyo** (si la pieza lo pide) | guion + formato | b-roll en disco, con su crédito, y `revisar-broll.mjs` en verde |
| 5 | **Editar por bloques** | formato + guion | propuesta + prueba 720p por tramo de 10 s |
| 6 | **Frames reales** | tramos | tira de frames revisada (hook, subs, visual, ritmo) |
| 7 | **Exportar y publicar** | tramos aprobados | máster en `finales/` + verificación |

## 🚦 Puertas de control (Claude NO las cruza solo)

1. **Guion antes que visual** — no se diseña nada sin transcripción (R02).
2. **Formato antes que animar** — se proponen 3 formatos y **eliges** antes de renderizar (R03).
3. **Un tramo a la vez** — no se avanza al siguiente tramo sin tu corrección (R04).
4. **Frames antes de exportar** — se muestran frames/prueba 720p antes del final (R05, R06).
5. **El material de apoyo, medido y acreditado** — `revisar-broll.mjs` en verde antes de exportar (R16). Va aparte de la puerta 4 porque un crédito que falta **no sale en ningún frame**.

En cada 🚦, Claude entrega evidencias y **espera**. No exporta ni sigue "a ciegas".

---

## Paso 1 · Abre la carpeta con orden

> El primer mensaje no es «edita». Es «lee el proyecto y dime qué tenemos».

**Acción (Claude):** localizar el fuente e inspeccionarlo. **No exportar.**
```shell
ffprobe -v error -show_entries format=duration:stream=index,codec_type,codec_name,width,height,r_frame_rate,channels,sample_rate -of default=noprint_wrappers=1 "proyectos/NNN/original.mp4"
```
**Claude entrega:**
1. 📄 Archivo original localizado (ruta exacta).
2. ⏱️ Duración · 📐 resolución · 🎞️ **fps** · 🔊 audio (codec, canales, sample rate).
3. 📁 ¿Existe carpeta de proyecto? ¿cuál?
4. 🗂️ Qué archivos hay ya (transcripción, cortes, etc.).
5. ❓ Qué falta para poder editar.

**🚦 Gate:** no se corta ni exporta nada hasta que revises la ficha.

> **Prompt para copiar:**
> «Te paso un vídeo base en `proyectos/NNN/original.mp4`. Antes de editar: 1) localiza el original, 2) dime duración, resolución, fps y audio, 3) dime si hay carpeta de proyecto, 4) qué archivos existen, 5) qué falta para editar. No exportes todavía.»

---

## Paso 2 · Cortar silencios (con evidencias)

El comando ya está definido. Lo importante: **devolver evidencias**, no seguir editando a ciegas.

**Acción (Claude):**
```shell
auto-editor "proyectos/NNN/original.mp4" --edit "audio:threshold=0.06" --margin 0.2s --preview
auto-editor "proyectos/NNN/original.mp4" --export resolve --margin 0sec --edit "audio:threshold=0.06" -o "proyectos/NNN/corte-auto-editor/NNN-resolve.fcpxml"
```
a) La primera línea son las evidencias sin renderizar: cuánto se cortaría y dónde. b) La segunda genera la timeline para DaVinci (no renderiza vídeo, escribe FCPXML).
**Claude entrega:**
1. 📦 **Archivo generado** — nombre y ubicación exacta (versión cortada o timeline).
2. 📉 **Diferencia de duración** — original vs. procesada.
3. ⚠️ **Cortes dudosos** — timestamps donde el corte puede sonar raro (frases cortadas, respiraciones útiles, cambios de tema).
4. ➡️ **Siguiente acción** — usar la versión cortada · revisar a mano · o ajustar `threshold`/`margin` (ver tabla de [cortes inteligentes](SKILL.md#-corte-inteligente)).

**🚦 Gate:** eliges qué hacer con los cortes dudosos antes de continuar.

> **Prompt:** «Corta los silencios de `proyectos/NNN/original.mp4` con nuestro comando. Devuélveme: 1) archivo y ruta, 2) duración original vs. cortada, 3) timestamps de cortes dudosos, 4) siguiente acción recomendada. No sigas editando.»

---

## Paso 3 · Transcribe y revisa guion

La transcripción no es solo para subtítulos: sirve para entender **qué se dice, qué sobra y dónde cambia la idea**.

**Acción (Claude):** transcribir con tiempos → `proyectos/NNN/transcripcion.json`.
```shell
node manuales/edicion-video/scripts/transcribir.mjs "proyectos/NNN/original.mp4" "proyectos/NNN/transcripcion.json" es
```
Es el wrapper de whisper.cpp del sistema (vídeo/audio → WAV 16 kHz mono → JSON con tiempos); requiere `whisper-cli` y su modelo, que instala `node herramientas/setup.mjs --whisper` (ver [Transcripción](#-transcripción) al final).
**Claude entrega (en `guion-limpio.md`):**
1. ✍️ **Guion limpio** (depurado, legible).
2. 🔁 **Frases repetidas**.
3. 😵 **Partes confusas**.
4. ✂️ **Cortes recomendados**.
5. ⏱️ **Bloques de 10 segundos** (con timestamps).
6. 💡 **Idea principal de cada bloque**.

**🚦 Gate:** validas el guion antes de decidir formato.

> **Prompt:** «Transcribe el vídeo con tiempos y entrégame: 1) guion limpio, 2) frases repetidas, 3) partes confusas, 4) cortes recomendados, 5) bloques de 10 s, 6) idea principal de cada bloque.»

---

## Paso 4 · Decide el formato visual

> Antes de animar nada. Si Claude renderiza sin justificar el formato, está improvisando la dirección visual.

**La plantilla depende del destino** (la resolución NO se elige al final):

| Destino | Resolución | Plantilla | Cuándo |
|---|---|---|---|
| Reel / Short vertical | 1080×1920 | `VerticalSocial` (9:16) | cara, pantalla arriba, subtítulos grandes, cortes rápidos |
| YouTube horizontal | 1920×1080 | `TutorialYT` (16:9) | tutoriales, demos largas, clases, tráilers, pantalla compartida |
| Feed cuadrado | 1080×1080 | `FeedCuadrado` (1:1) | repurpose para IG/LinkedIn |
| Demo de software | 1920×1080 | `TutorialYT` + PiP cámara | pantalla protagonista, cámara pequeña |

**Guía de encuadre:** cara completa (historia/opinión/autoridad) · pantalla+cara (herramienta/proceso/prueba) · visuales arriba (conceptos/pasos/comparaciones) · horizontal (YouTube/clase larga).

**Claude entrega — 3 formatos propuestos.** Para cada uno:
1. 🎯 Cuándo lo usarías.
2. 🧩 Qué plantilla aplicarías.
3. 🔤 Dónde irían subtítulos y títulos.
4. ⚠️ Qué riesgos visuales tiene.
5. ✅ Recomendación final y por qué.

**🚦 Gate:** **no renderiza**. Primero eliges el formato.

> **Prompt:** «Antes de editar, propón 3 formatos visuales para este vídeo. Para cada uno: 1) cuándo lo usarías, 2) qué plantilla, 3) dónde subtítulos y títulos, 4) riesgos visuales, 5) cuál recomiendas y por qué. No renderices todavía; quiero elegir el formato.»

### Identidad visual (se define aquí, se aplica en las plantillas)
- **Subtítulos:** posición · tamaño · 1 o varias líneas · caja · color · resaltados · palabras por línea.
- **Títulos:** texto inicial · duración · zona segura · tamaño · caja · color · distancia al borde.
- **Visuales:** capturas · diagramas · pantalla · iconos · zooms · transiciones · ejemplos.
- **Errores a vigilar:** texto que tapa la cara · márgenes rotos · baja calidad · cortes raros · ritmo lento.

*(Estos valores viven en `remotion/src/motor/presets.ts` y `theme.ts` — se cambian una vez y se repiten.)*

---

## Paso 4·bis · El material de apoyo (solo si la pieza lo pide)

Antes de montar, cada plano de apoyo tiene que existir en disco y saberse de dónde salió. Lo primero no es conseguirlo: es **de qué motor tiene que salir**, y eso lo decide la honestidad de la pieza, no el coste ([director §3h](../director-video/SKILL.md)).

- Un lugar, un objeto o un gesto **reales** → banco. `bancos.py contactos` monta una hoja numerada ya cribada y se elige **mirando**; `traer … --porque` lo baja y congela autor, licencia y sha256 en el manifiesto.
- Un concepto sin referente filmable (una cifra, un plazo, una norma) → **no es b-roll, es un gráfico**.
- Un plano imposible o ilustrativo que no afirma un hecho → `grok.py`.

**Acción (Claude):** deja el material traído, el manifiesto escrito y esta puerta en verde antes de tocar la composición:

```bash
node manuales/video-noticias/scripts/revisar-broll.mjs remotion/src/proyectos/NNN/noticia-NNN.ts
```

Comprueba lo que no se ve en un frame: que el archivo esté donde dice el plan, que tenga los píxeles de su hueco, que el clip no sea más corto que su toma y que su crédito esté registrado. Detalle en [R16](reglas.md).

---

## Paso 5 · Edita de 10 en 10 segundos

> La clave: no pides el vídeo entero. Pides **una propuesta + imágenes + prueba 720p por tramo**.

**Acción (Claude), para el tramo (p. ej. 0:00–0:10 → frames 0–299 a 30fps):**
```shell
cd remotion
npx remotion render <Plantilla> ../proyectos/NNN/pruebas-720p/tramo-00-10.mp4 --frames=0-299 --scale=0.5
```
Prueba ligera del tramo a media resolución: `--scale=0.5` es el único factor que da enteros pares en los tres formatos (960×540 · 540×960 · 540×540, [R06](reglas.md)).
**Claude entrega, por tramo:**
1. 📝 Resumen de qué dice.
2. 🎯 Qué dejar claro en pantalla.
3. 🖼️ **3 visuales posibles**.
4. 🧩 Plantilla elegida.
5. 🔍 Imágenes de revisión (frames).
6. 🎞️ Prueba 720p exportada.
7. ⏸️ **Espera tu corrección.**

**🚦 Gate:** no pasa al siguiente tramo sin tu OK (R04).

> **Prompt:** «Vamos tramo por tramo. Para 0:00–0:10: 1) resume qué dice, 2) qué quiero dejar claro en pantalla, 3) propón 3 visuales, 4) elige plantilla, 5) genera imágenes de revisión, 6) exporta prueba 720p, 7) espera mi corrección. No sigas al siguiente tramo.»

---

## Paso 6 · Frames reales (revisión antes del final)

Pides una **tira de frames** para ver si el hook, los subtítulos, los visuales y los cortes funcionan **antes** de exportar el final.
```bash
cd remotion
npx remotion still <Plantilla> out/rev-00.png --frame=0     # hook / entrada
npx remotion still <Plantilla> out/rev-05.png --frame=150   # mitad del tramo
npx remotion still <Plantilla> out/rev-10.png --frame=299   # salida
```
**Checklist de revisión (los "errores a comprobar"):**
- [ ] ¿El **texto se lee** (tamaño, contraste)?
- [ ] ¿Algo **tapa la cara** o rompe márgenes / zona segura?
- [ ] ¿El **visual explica** la frase?
- [ ] ¿El **ritmo se entiende** sin esfuerzo (no lento, no cortes raros)?
- [ ] ¿Calidad correcta (nada pixelado)?

**🚦 Gate:** solo con todo ✅ se pasa a exportar.

---

## Paso 7 · Exporta y publica

**Acción (Claude):** render final en alta calidad (fps = original, nombre y carpeta del preset).
```shell
cd remotion
npx remotion render <Plantilla> ../proyectos/NNN/finales/NNN-<titulo>-<aspecto>.mp4 --codec=h264 --crf=18 --color-space=bt709 --image-format=png
ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate -of default=noprint_wrappers=1 ../proyectos/NNN/finales/NNN-<titulo>-<aspecto>.mp4
```
La primera línea es el render en BT.709 ([R22](reglas.md)); la segunda, la verificación de resolución y fps.
**Claude entrega:** archivo final en `finales/`, resolución/fps verificados, checklist de calidad OK y, si la pieza lleva metraje de archivo, **el bloque de créditos para la descripción**:

```shell
uv run manuales/edicion-video/scripts/bancos.py creditos --proyecto NNN
```

Es el único momento del proceso en que el manifiesto se cobra. Si no se pide aquí, se rellena y no se usa nunca.

**🚦 Publicación:** la subida a la plataforma la confirmas/haces **tú** (Claude no publica por su cuenta). Tras publicar, cualquier corrección útil entra como **regla nueva** (R07) o en `aprendizajes.md`.

---

## 🔧 Transcripción

El **Paso 3** usa **whisper.cpp** (nativo; en Apple Silicon va muy rápido) mediante el wrapper `manuales/edicion-video/scripts/transcribir.mjs`, que corre igual en macOS y en Windows.
- Binario: `whisper-cli` (en Windows, `whisper-cli.exe`), que `node herramientas/setup.mjs --whisper` deja en la carpeta de herramientas del usuario sin administrador, y el modelo por defecto, que el mismo instalador descarga a `archivos/whisper/ggml-small.bin` (465 MB); `node herramientas/doctor.mjs` dice si están.
- Uso: `node manuales/edicion-video/scripts/transcribir.mjs <entrada> <salida.json> [idioma] [modelo.bin]` (idioma por defecto `es`).
- **Más precisión:** descarga `ggml-medium.bin` o `ggml-large-v3.bin` (los publica el proyecto whisper.cpp) en `archivos/whisper/` y pásalo como 4.º argumento.
- **Subtítulos karaoke** (tiempos por palabra): cambia `-oj` por `-ojf` en `transcribir.mjs` (la línea está comentada en el propio script).
- Sin whisper, el Paso 3 se hace con cualquier otra transcripción con tiempos convertida al mismo JSON de segmentos, o se salta si el guion ya es texto conocido (variante avatar).

> El proceso completo (pasos 1–7) se ejecuta de principio a fin con el nivel 0 del `doctor` (sin ninguna clave); el b-roll de banco pide el nivel 1 y el avatar o el b-roll IA, el nivel 2.
