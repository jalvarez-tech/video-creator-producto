---
name: edicion-video
description: >-
  Manual operativo para crear y editar vídeo profesional en el sistema
  "video-creator" que combina Remotion (motor de vídeo programático),
  Auto-Editor (corte de silencios), Grok Imagine por la API de xAI
  (generación de b-roll con IA) y Pexels (b-roll de archivo de bancos
  gratuitos, con manifiesto de licencias).
  Úsalo siempre que se quiera montar una intro/animación/título, abrir Remotion
  Studio, renderizar un vídeo o un frame de prueba, cortar silencios de una
  grabación, exportar una timeline a DaVinci Resolve, buscar o traer metraje de
  archivo, o estructurar un proyecto de vídeo nuevo. Triggers: "editar vídeo",
  "remotion", "auto-editor", "cortar silencios", "render", "frame de prueba",
  "abrir studio", "nuevo proyecto de vídeo", "davinci resolve", "b-roll",
  "grok imagine", "pexels", "banco de imágenes", "metraje de archivo",
  "stock", "buscar imágenes gratis".
metadata:
  type: reference
---

# 📖 Manual operativo — Edición de vídeo con IA

**Raíz:** la carpeta del repo (la que contiene `remotion/`, `manuales/` y `herramientas/`). Todas las rutas de este manual son relativas a ella y los comandos se lanzan desde ahí: `node <ruta>.mjs` y `uv run <ruta>.py` corren igual en macOS y en Windows. Un comando por línea (PowerShell 5.1 no entiende `&&`).

> 🎬 **Para montar un vídeo COMPLETO** coordinando todas las capas (cámara + motion graphics + sonido + subtítulos) con una sola instrucción, entra por el **[director-video](../director-video/SKILL.md)** (el orquestador). Este manual es el **motor y la pipeline** que el director usa por debajo.

Pipeline en una sola dirección (archivos MP4):

```
HeyGen (avatar) / Grok Imagine (b-roll IA) / grabación  →  [Auto-Editor opc.]  →  Remotion
Pexels (b-roll de archivo, lo que YA existe)               cortar silencios      ensamblar + titular + máster
```

| Motor | Etapa | Dónde |
|---|---|---|
| **HeyGen** | Avatar talking-head desde guion (fuente de "cámara") | script `scripts/heygen.py` · [heygen.md](heygen.md) |
| **Grok Imagine** (API directa de xAI) | Generación de b-roll / imágenes con IA | `scripts/grok.py` · clips en `proyectos/NNN/broll/grok/` |
| **Pexels** (banco gratuito) | B-roll de ARCHIVO: lugares, objetos y gestos reales | `scripts/bancos.py` · manifiesto en `proyectos/NNN/broll/` |
| **Auto-Editor** | Cortar silencios (opc. con avatar) | CLI `auto-editor` (la instala `herramientas/setup.mjs`) |
| **Remotion** | Ensamblaje, títulos, animación, render | `remotion/` (Remotion 4.0.496) |

> 📰 **Para montar un vídeo a partir de una NOTICIA** (formato editorial 9:16, voz en off sin avatar, papel beige + acento del canal), entra por **[video-noticias](../video-noticias/SKILL.md)**: trae su propio look, sus 7 beats y su capa declarativa (`TomaNoticia[]` → `<PistaNoticia>`) sobre este mismo motor.

📂 **Partes del manual:** [proceso-edicion.md](proceso-edicion.md) (Fase 3 · flujo bruto→publicación, 7 pasos) · [heygen.md](heygen.md) (avatar de IA) · [video-noticias](../video-noticias/SKILL.md) (formato noticias completo) · [motion-graphics](../motion-graphics/SKILL.md) (dirección de animación: jerarquía, timing, muelles/tokens) · [camara-avatar](../camara-avatar/SKILL.md) (cámara virtual dinámica del avatar: zoom/reencuadre motivados) · [diseno-sonoro](../diseno-sonoro/SKILL.md) (SFX, mezcla, ducking) · [reglas.md](reglas.md) (reglas operativas R01–R29) · [plantillas/](plantillas/README.md) (biblioteca de plantillas reutilizables).

---

## 🧭 Reglas de oro (no negociables)

1. **Primero motor y estructura, luego vídeo.** No se edita nada real hasta que Studio abra y un render de prueba funcione.
2. **Nunca editar desde Descargas ni desde un archivo suelto.** Cada vídeo vive en `proyectos/NNN/`.
3. **Nunca sobrescribir `original.mp4`.** Todo corte crea archivos nuevos.
4. **Lo que funciona se escribe.** Cortes, plantillas y decisiones que salieron bien → `aprendizajes.md` del proyecto, y lo general → este manual.
5. **Instalar ≠ funcionar.** Si no abres Studio y no exportas nada, no sabes si el motor sirve.

---

## 🏗️ Los 7 pasos de un vídeo profesional

1. **Crear carpeta** — el proyecto vive en `proyectos/NNN/` (tres dígitos, el siguiente libre). `node manuales/director-video/scripts/artefactos.mjs NNN` la crea con sus artefactos (`01-plan` · `02-layout` · `03-timeline`); el resto —`original.mp4`, `guion-limpio.md`, `transcripcion.json`, `corte-auto-editor/`, `pruebas-720p/`, `finales/`, `aprendizajes.md`— se añade conforme avanza el [proceso](proceso-edicion.md).
2. **Motor Remotion** — instalación oficial, dejar el proyecto arrancando.
3. **Abrir Studio** — la vista previa abre antes de editar.
4. **Render de prueba** — un frame o clip corto que confirme que funciona.
5. **Guardar pasos** — lo que funciona queda escrito aquí.
6. **No editar aún** — primero motor y estructura.
7. **Editar** — recién ahí se monta el vídeo real.

---

## 🎬 Remotion (motor de vídeo)

Proyecto en `remotion/`. Composición de prueba registrada: **`Prueba`** (1920×1080 · 30fps · 90 frames = 3 s), en `remotion/src/Prueba.tsx` y `remotion/src/Root.tsx`.

### Requisitos
Los instala `node herramientas/setup.mjs` (sin administrador: en macOS/Linux en la carpeta de herramientas del usuario, en Windows en `%LOCALAPPDATA%\video-creator\bin`) y los comprueba `node herramientas/doctor.mjs`, que termina con el NIVEL del equipo (0 sin claves · 1 con Pexels · 2 con las claves de pago) y dice qué falta para subir. Si el repo acaba de llegar, la instalación completa está en el `README.md` de la raíz (o dile al agente «instálalo»).

- **Node ≥ 22.** Lo ponen `instalar.sh` / `instalar.ps1` si falta o es antiguo, sin administrador (macOS/Linux: `fnm` en la carpeta del usuario; Windows: `winget` en ámbito de usuario o, si no hay winget, un zip portable de nodejs.org en `%LOCALAPPDATA%\video-creator\node`). `setup.mjs` a secas, en cambio, ya necesita un Node ≥ 22 para arrancar: por eso la entrada es siempre el instalador.
- **ffmpeg y ffprobe** en el PATH o en la carpeta de herramientas del usuario. **FFmpeg va incluido** en Remotion v4 — pero solo para el RENDER. Los scripts usan el `ffmpeg` y el `ffprobe` que localiza `binario()` de `herramientas/comun.mjs`, y sin ellos fallan **en silencio o a medias**: `bancos.py traer --tipo video` avisa y **sigue**, dejando en `public/` un clip con su música dentro (justo el riesgo de Content ID que el script existe para evitar); `contactos` no monta la hoja y se elige a ciegas; `gradar` no mide nada y aborta.
- **uv**, que trae su propio Python. Los `.py` del sistema son de librería estándar: no hay entornos que crear, se lanzan con `uv run <ruta>.py`.
- **auto-editor** (31.6.0, la versión que fija `setup.mjs`) y, opcional, **whisper-cli** con su modelo (`node herramientas/setup.mjs --whisper`).
- **Chromium (Chrome Headless Shell):** lo descarga `setup.mjs` (`npx remotion browser ensure`); si no, el primer render lo baja solo.

### 1) Abrir Remotion Studio (la vista previa)
Desde la raíz del repo:
```shell
cd remotion
npm run dev
```
Abre en **http://localhost:3000**. Equivalente: `npx remotion studio`. Otro puerto: `npx remotion studio --port=3001`. Cerrar: `Ctrl + C`.

### 2) Renderizar un vídeo
Sintaxis: `npx remotion render <composition-id> <salida>` (el entry point `src/index.ts` se autodetecta). Desde `remotion/`:
```shell
cd remotion
npx remotion render Prueba out/video.mp4
```
- Solo un clip corto (frames 0 a 59 = primeros 2 s a 30fps): `npx remotion render Prueba out/clip.mp4 --frames=0-59`
- Prueba ligera (la «prueba 720p» del proceso, a media resolución): `npx remotion render Prueba out/prueba-720p.mp4 --scale=0.5` → 960×540; en 9:16 da 540×960 y en 1:1, 540×540. Es el único factor que da enteros pares en los tres formatos ([R06](reglas.md)).

Flags clave: `--codec=h264|h265|prores|vp9|gif…` · `--crf=18` (calidad, menor = mejor) · `--scale=N` (multiplica resolución; el alto resultante tiene que ser entero, ver [R06](reglas.md)) · `--concurrency=8`.

### 3) Renderizar un frame (still / imagen)
```shell
cd remotion
npx remotion still Prueba out/frame.png --frame=45
```
Flags: `--frame=<n>` · `--image-format=png|jpeg` · `--jpeg-quality=0-100` · `--scale=N`.

### 4) Estructura del proyecto Remotion
- `src/index.ts` → `registerRoot(RemotionRoot)` (una sola vez).
- `src/Root.tsx` → devuelve una o varias `<Composition>` (las del producto: `Prueba`, las tres plantillas, las demos de cámara, catálogo, gráficos, plan y noticia); las de cada proyecto viven en `src/proyectos/NNN/composiciones.tsx` y `src/estudio.tsx` las recoge solas.
- `src/Prueba.tsx` → el componente React que se dibuja.
- `remotion.config.ts` → defaults (jpeg, overwrite). Los flags de CLI **sobrescriben** el config. El reset de CSS vive en `src/index.css` (no hay Tailwind).

Props obligatorias de `<Composition>`: `id`, `component`, `durationInFrames`, `fps`, `width`, `height`. Duración en segundos = `durationInFrames / fps`.

### 5) Reabrir el proyecto MAÑANA
```shell
cd remotion
npm ci
npm run dev
```
`npm ci` solo si faltan `node_modules` (equipo nuevo / tras borrar); es lo que hace `node herramientas/setup.mjs`. `npm run dev` abre Studio en http://localhost:3000.

---

## ✂️ Auto-Editor (cortes de silencios)

CLI `auto-editor`, instalado por `node herramientas/setup.mjs` en la carpeta de herramientas del usuario (sin administrador). Comprobar: `auto-editor --version`.
Auto-Editor marca cada tramo como **"loud"** (se conserva) o **"silent"** (se corta). No toca el original: crea un archivo nuevo o exporta una timeline.

### Comando base (el de este sistema)
Guarda la salida dentro de `proyectos/NNN/corte-auto-editor`. Desde la raíz del repo, en una sola línea:
```shell
auto-editor "proyectos/NNN/original.mp4" --export resolve --margin 0sec --edit "audio:threshold=0.06" --output "proyectos/NNN/corte-auto-editor/NNN-resolve.fcpxml"
```

| Parte | Alias | Qué hace | Default |
|---|---|---|---|
| `--export resolve` | `-ex` | **No renderiza vídeo:** genera FCPXML para **DaVinci Resolve** (editable, referencia el clip original). | render MP4 |
| `--margin 0sec` | `-m` | Colchón alrededor de cada tramo conservado. `0sec` = cortes pegados. | `0.2s` |
| `--edit audio:threshold=0.06` | `-e` | Corta todo tramo cuyo pico esté < 6 % del máximo. | `audio:threshold=0.04` |
| `--output` | `-o` | Nombre/ruta de salida (la extensión define el destino). | `<nombre>_ALTERED.<ext>` |

### Targets de `--export`
`resolve` → FCPXML (DaVinci) · `premiere` → XML · `final-cut-pro` → FCPXML · `shotcut` → `.mlt` · `kdenlive` · `clip-sequence` (clips sueltos) · `v1`/`v3` (JSON propio) · **sin flag = renderiza un MP4 ya cortado**.

### 🧠 Cortes inteligentes (2 palancas: `--margin` = respiro, `threshold` = qué se corta)
> *threshold decide **qué** se corta; margin decide **cuánto respiro** queda alrededor. Margen ↑ = menos cortes, más natural. threshold ↑ = más agresivo. threshold ↓ = conserva sonido bajo (respiraciones, colas de palabra).*

| Problema | Objetivo | Flags recomendados |
|---|---|---|
| **Frase cortada** (salto raro) | Colchón —sobre todo por detrás— y umbral más bajo. **Nunca `--margin 0`.** | `--margin 0.2s,0.4s --edit audio:threshold=0.03` |
| **Respiración útil** (no todo silencio sobra) | Subir margen para "puentear" pausas cortas entre frases. | `--margin 0.5s` · o asimétrico `--margin 0.3s,0.6s` |
| **Cambio de tema** (pide transición visual) | El margen no crea transiciones: exportar a Resolve y poner disolvencias a mano. | `--export resolve -o corte.fcpxml` |
| **Ritmo artificial** (traqueteo de micro-cortes) | Más margen para absorber silencios cortos y encadenar tramos. | `--margin 0.4s --edit audio:threshold=0.04` (o `0.5s,0.7s`) |

### Previsualizar e inspeccionar ANTES de cortar
```shell
auto-editor "proyectos/NNN/original.mp4" --edit audio:threshold=0.06 --margin 0.3s --preview
auto-editor levels "proyectos/NNN/original.mp4" --edit audio
auto-editor info "proyectos/NNN/original.mp4"
```
La primera dice cuánto se cortaría, sin renderizar (se detiene). La segunda vuelca la "loudness" por frame, para elegir bien el threshold. La tercera enseña los metadatos de streams y fps.

### Round-trip a DaVinci Resolve
1. Genera el FCPXML (comando base).
2. En Resolve: **File ▸ Import ▸ Timeline** (`Shift+Cmd+I` en macOS · `Ctrl+Shift+I` en Windows) y elige el `.fcpxml`.
3. Resolve reconstruye la timeline referenciando el clip original → ajustas cortes, transiciones y color sin pérdida.

### Reporte estándar tras cada corte (anotar en `aprendizajes.md`)
1. Duración original · 2. Duración cortada · 3. Archivo generado · 4. ¿XML/timeline para DaVinci? · 5. Qué cortes revisar a mano (frase cortada / respiración / cambio de tema / ritmo).

---

## 🌱 Grok Imagine — generación de b-roll (API directa de xAI)

Motor generativo de vídeo e imagen de xAI. Se opera con **`scripts/grok.py`** (Python stdlib, hermano de `heygen.py`), que va **directo a `api.x.ai`**. Subcomandos: `modelos`, `imagen` (texto → imagen), `video` (texto → vídeo e imagen → vídeo).

Requiere **`XAI_API_KEY`** en el `.env` de la raíz — se saca en [console.x.ai](https://console.x.ai) y empieza por `xai-`. **No** es la de Groq (`gsk_`, Whisper) ni la de RunAPI: tres servicios de nombre parecido y cuentas distintas. Comprueba con:

```shell
uv run manuales/edicion-video/scripts/grok.py modelos
```

> **Se descartó RunAPI** (revendedor que también sirve Grok Imagine): obliga a una segunda cuenta y una segunda factura. Yendo directo se paga solo a xAI. Si tienes instalados el skill `grok-imagine` o el CLI `runapi`, **no los uses aquí**: este flujo va directo a xAI.

**Cómo encaja:** Grok genera el b-roll (MP4) → `grok.py` lo descarga → Remotion lo compone y **titula** (el texto en pantalla se hace en Remotion, NO en el prompt, porque el texto que genera el modelo es poco fiable). El b-roll no lleva voz, así que **no** pasa por Auto-Editor.

```shell
uv run manuales/edicion-video/scripts/grok.py video "plano del hall al atardecer, cámara que retrocede" --duracion 6 --salida proyectos/NNN/broll/grok/raw/shot-01.mp4
```

Si se corta la espera (timeout, Ctrl-C, red), **el render ya está pagado**: no lo relances, retómalo con el `request_id` que imprimió el comando.

```shell
uv run manuales/edicion-video/scripts/grok.py recuperar <request_id> --salida proyectos/NNN/broll/grok/raw/shot-01.mp4
```

Estructura de un proyecto con b-roll:
```
proyectos/NNN/
└── broll/grok/
    ├── raw/         # MP4 tal cual salen de la API — grok.py los baja YA (la URL caduca)
    ├── prompts/     # el JSON de cada llamada — lo escribe grok.py solo, para regenerar
    └── refs/        # stills de partida para imagen → vídeo
```
En Remotion se importan con `<OffthreadVideo src={staticFile('clips/shot-01.mp4')} />` dentro de `<Sequence>`.

**Los cuatro límites que gobiernan su uso** (resolución por confirmar, URLs que caducan, fps de la comp, texto en Remotion) y **cómo conseguir 9:16** están en el contrato del director: **[director-video §3h](../director-video/SKILL.md)**. No los dupliques aquí. El crítico: la resolución de salida **no está documentada** por xAI → mídela con `ffprobe` en el primer clip y, hasta saberlo, no pongas b-roll nítido a pantalla completa en una comp 1080p.

> **`seedance-20` es un skill externo y de pago que no viene con el producto.** Es un pack de *prompt-directing*, **no** el modelo, y sin una suscripción de Seedance no genera nada. No lo propongas como alternativa salvo que el usuario confirme que tiene esa suscripción; entonces entra como respaldo para el caso del techo de 720p.

---

## 🏛️ Pexels — b-roll de ARCHIVO (bancos gratuitos)

Hermano de `grok.py`, no su sustituto. **Grok genera un plano que no existe; esto trae uno que sí existe**, y en una pieza periodística esa diferencia no es de coste: generar un lugar o un hecho real es fabricar prueba documental. La regla de qué motor toca está en **[director-video §3h](../director-video/SKILL.md)**.

Se opera con **`scripts/bancos.py`** (Python stdlib, sobre `_comun.py`). Clave gratuita `PEXELS_API_KEY` en el `.env` — se saca al instante en [pexels.com/api](https://www.pexels.com/api/).

> **Para quien escriba el próximo script:** `_comun.pide()` y `_comun.descarga()` mandan siempre un `User-Agent` propio, y `descarga()` acepta `cabeceras=`. No es cortesía: con el User-Agent por defecto de urllib, Cloudflare responde **403 con `error code: 1010`** —bloqueo por firma del cliente— antes de que la petición llegue al servicio. El mensaje se lee como «clave sin permisos» y te manda a rotar una clave que está perfecta. Pasó dos veces seguidas: en la API de Pexels y en su CDN de imágenes.

```shell
uv run manuales/edicion-video/scripts/bancos.py glosario
uv run manuales/edicion-video/scripts/bancos.py buscar --proyecto NNN --consulta "grieta en la pared" --para escenario
uv run manuales/edicion-video/scripts/bancos.py contactos --proyecto NNN --toma n08b --consulta "grieta en la pared" --para escenario
uv run manuales/edicion-video/scripts/bancos.py traer --proyecto NNN --toma n08b --consulta "grieta en la pared" --para escenario --indice 3 --porque "la fisura vertical del muro, que es de lo que habla la toma"
uv run manuales/edicion-video/scripts/bancos.py gradar --proyecto NNN
uv run manuales/edicion-video/scripts/bancos.py reponer --proyecto NNN
uv run manuales/edicion-video/scripts/bancos.py creditos --proyecto NNN
```
Entre `contactos` y `traer` se mira la hoja y se elige por el número. `gradar` necesita ≥ 2 clips (con uno no hay nada que igualar); `reponer` repone el binario tras un clon nuevo; `creditos` imprime el bloque para la descripción del vídeo.

**`--tipo` es `foto` por defecto**, así que para traer un CLIP hay que pedirlo — y con la duración mínima de su toma, o llegará más corto y congelará el último fotograma:

```shell
uv run manuales/edicion-video/scripts/bancos.py contactos --proyecto NNN --toma n11 --consulta "obra gris en medellin" --para escenario --tipo video --duracion-min 4
uv run manuales/edicion-video/scripts/bancos.py traer --proyecto NNN --toma n11 --consulta "obra gris en medellin" --para escenario --tipo video --duracion-min 4 --indice 0 --porque "…"
```

En el plan, un clip lleva además `esVideo: true`.

**`contactos` es el paso que hace que esto no sea una lotería.** Baja las miniaturas, quita el plano repetido (huella perceptual de 128 bits, dos ejes) y el que ya usa otra toma, marca los planos sin contraste, y monta una **hoja numerada** en `proyectos/NNN/broll/contactos/`. Después se elige **mirando**, que es lo único que contesta la pregunta que importa —¿esto ilustra la frase, o solo el tema?—, y el número de la hoja es el `--indice` que baja ese plano y no el de al lado. `--porque` guarda en el manifiesto por qué ese y no otro: es lo único de ahí que no puede rellenar una máquina.

Al mirar la hoja: ¿ilustra lo que dice la toma o solo el tema? · ¿aguanta el recorte a 9:16? · ¿lleva texto quemado o marcas? · ¿hay una persona identificable? (solo en contexto neutro — la licencia prohíbe mostrarla «bajo mala luz») · ¿es el stock que usa todo el mundo?

**`gradar` es el último paso, y va cuando ya están todos los clips.** Tres clips de tres autores vienen ya graduados por ellos: uno frío, otro subexpuesto, otro saturado. Ponerles el mismo look encima **no los une, amplifica sus diferencias** — el mismo filtro empuja el color de cada uno hacia otro lado. El oficio dice: primero igualar, después el look. `gradar` mide con `signalstats` la distancia de cada clip a la **mediana del proyecto** (no a un ideal, para que ninguno se fuerce de más) y escribe la corrección lista para pegar:

```ts
toma("n08b", "escenario", "climax", [954, 1050], {
  media: "broll/NNN/n08b-grieta-en-la-pared.jpg",   // ← la ruta que imprime `traer`
  grado: { exposicion: 1.083, calido: 0.031 },      // ← lo escribe `gradar`, no tú
  titular: "La grieta que nadie miró",
}, "…")
```

El nombre del archivo sale del **id de la toma + la consulta entera**, y el id tiene que ser el mismo en el plan y en `--toma`: el crédito se busca primero por id de toma, así que dos ids distintos dejan a `revisar-broll.mjs` comprobando por ruta, que es la vía frágil.

El **look** (saturación 0.86, velo cálido de papel, grano y viñeta) no se copia en el plan: es del FORMATO, vive en `METRAJE` (theme-noticias.ts) y lo aplica el motor a todo el metraje del canal. En el plan solo va lo que se **midió**. El grano compartido, además, es la herramienta de igualado más barata que hay: disimula que cada clip viene de una cámara distinta.

> **No hay ningún modelo puntuando aquí, y es deliberado.** Se evaluó meter CLIP para reordenar por afinidad texto-imagen: son ~2,5 GB de `torch` más 800 MB de pesos en un sistema cuyos scripts son stdlib a propósito, su trabajo real (bajar 60 candidatos a 12) ya lo hace el filtro de medida en 9:16, y su coseno no tiene umbral absoluto transferible — daría una cifra que parece objetiva sin serlo. Mirar nueve miniaturas cuesta segundos.

`--para` no es un preset de calidad: son **las medidas reales del hueco** que monta el motor. `escenario` va a sangre (1080×1920); `retrato` va enmarcado en 624×804 con un Ken Burns de 1 → 1.06, así que pide 662×853 — el 6 % extra es lo que hace falta para que en el frame más ampliado siga habiendo un píxel de fuente por píxel dibujado. Los mismos números los mide `revisar-broll.mjs`, y `revisar-bancos.py` comprueba que los dos scripts no se separen.

Estructura de un proyecto con b-roll de archivo:
```
proyectos/NNN/
└── broll/
    ├── manifiesto.json      # LO ÚNICO QUE SE VERSIONA: qué, de quién, licencia, sha256
    ├── pexels/raw/          # el binario — ignorado por git, se repone con `reponer`
    ├── contactos/           # las hojas numeradas y su JSON de orden
    └── cache/               # respuestas de la API (24 h), para no quemar el límite

remotion/public/broll/NNN/   # la COPIA que sirve el motor: es lo que apunta `media`
```
Esa última carpeta es la razón de que exista `reponer`: `staticFile()` solo mira ahí, y ahí no hay nada en un clon nuevo.

Tres cosas que conviene tener presentes, y las tres están medidas:

- **Pexels nunca devuelve cero.** Una consulta sin sentido trae miles de resultados. `buscar` enseña la descripción de cada candidato justamente por eso: el filtro de medida es automático, el de pertinencia no.
- **La consulta va en inglés y los topónimos en español.** Lo hace el glosario del script. `notaría` devuelve notarías parisinas; `bogota` devuelve Transmilenio.
- **El clip llega sin pista de audio**, porque el riesgo de Content ID documentado en estos bancos es la música incrustada, no el vídeo.

Se prueba sin gastar cuota ni clave:
```shell
uv run manuales/edicion-video/scripts/revisar-bancos.py
```

Y el paso siguiente a `traer` es **la puerta que mira el disco** (sale con 1 si algo no cuadra):
```shell
node manuales/video-noticias/scripts/revisar-broll.mjs remotion/src/proyectos/NNN/noticia-NNN.ts
```
`revisar-plan.mjs` no vale para esto: valida el plan como datos y no abre un solo archivo.

---

## 🚫 Qué evitar

- **Editar desde Descargas / archivo suelto** → cada vídeo a `proyectos/NNN/`.
- **Instalar sin probar** → abrir Studio + exportar un frame/clip antes de dar por bueno el motor.
- **No guardar decisiones** → cortes/plantillas/revisiones que funcionan se escriben en `aprendizajes.md` y aquí.
- **Meter texto/subtítulos en el prompt del generador** → titular en Remotion.
- **Guardar la URL que devuelve la API** en vez del MP4 → caduca, y el proyecto deja de re-renderizar.
- **`--margin 0` en material hablado** → se come inicios/finales de palabra.

---

## ✅ Verifica tu instalación

«Instalar ≠ funcionar»: antes de dar el motor por bueno, cuatro comprobaciones que no gastan ninguna clave. Desde la raíz del repo, un comando por línea:

```shell
node herramientas/doctor.mjs
```
Termina con el NIVEL (0/1/2) y qué falta; si algo sale en rojo, `node herramientas/setup.mjs` lo repara.

```shell
cd remotion
npx remotion still Prueba out/prueba-frame.png --frame=45
npx remotion render Prueba out/prueba-720p.mp4 --scale=0.5
```
Un still de 1920×1080 y un MP4 de 960×540 y 3 s: el motor renderiza. Las tres plantillas (`TutorialYT` / `VerticalSocial` / `FeedCuadrado`) se comprueban igual, cambiando el id.

```shell
auto-editor --version
```

Transcripción (opcional, solo si instalaste whisper con `--whisper`): `node manuales/edicion-video/scripts/transcribir.mjs <un-clip-corto.mp4> out/transcripcion.json es` tiene que dejar un JSON con segmentos y tiempos.

Studio abre en http://localhost:3000 con `npm run dev` desde `remotion/`.
