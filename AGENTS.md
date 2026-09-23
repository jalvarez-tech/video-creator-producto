# video-creator — instrucciones para el agente

> Lo lee Codex directamente (`AGENTS.md`) y Claude Code a través de `CLAUDE.md` (`@AGENTS.md`). Está escrito para ti, el agente: qué es este repo, cómo se instala, cómo se trabaja en él y qué no debes hacer. El sistema está en español y tú también trabajas en español.

## 1. Qué es esto

**video-creator** produce vídeos cortos (9:16, 16:9, 1:1) con IA: piezas con un avatar hablando, montajes de clips y fotos, explicadores de noticias con voz en off y motion graphics. No es una app: es un **motor de vídeo programático** (Remotion: React + TypeScript) más **siete skills** que dicen cómo se decide cada capa, más **scripts portables** (Node y Python) que hacen el trabajo mecánico. El usuario te pide un vídeo; tú diriges: abres los artefactos, planificas como datos, validas, enseñas frames y renderizas.

| Carpeta | Qué hay | De quién es |
|---|---|---|
| `remotion/` | El motor (proyecto npm). `src/motor/` es lo reutilizable: plan de gráficos, cámara virtual, sonido, noticias, montaje, demos. `src/Root.tsx` registra las composiciones del producto y `src/estudio.tsx` descubre las de cada proyecto. | Del sistema: no se edita para un proyecto concreto |
| `manuales/<skill>/` | Las 7 skills (`SKILL.md` + referencias + `scripts/`): la capa de dirección, el «cómo se decide». | Del sistema |
| `herramientas/` | `setup.mjs` (instala y repara), `doctor.mjs` (diagnostica), `comun.mjs` (lo que comparten los scripts), `zonas.mjs` (qué es producto y qué es del usuario), `revisar-producto.mjs` (guard del repo). | Del sistema |
| `proyectos/NNN/` | Un proyecto por vídeo, numerado con tres dígitos: artefactos (plan, layout, timeline), guion, material (avatar, b-roll, voz), pruebas y finales. | Del usuario |
| `remotion/src/proyectos/NNN/` | El código de ese proyecto: `composiciones.tsx` y sus planes (`camara-NNN.ts`, `graficos-NNN.ts`, `cues-NNN.ts`, `subtitulos-NNN.ts`, `noticia-NNN.ts`, `metraje-NNN.ts`). | Del usuario |
| `remotion/src/marcas/<canal>.ts` | La marca es un **parámetro**: colores, letra, sello. `ejemplo.ts` es la plantilla; cada canal es un archivo nuevo. El motor no importa marcas: le llegan por props desde la composición. | Del usuario (salvo `ejemplo.ts`) |
| `remotion/public/` | Lo que Remotion sirve: `sfx/` (el set de efectos), `fuentes/inter/`, un `avatar.mp4` de relleno y los medios que cada proyecto copia ahí. | Mixto |
| `.env` | Las claves de API del usuario. **Nunca lo lees** (§6). | Del usuario |

Hay un **segundo motor**, HyperFrames (HTML + GSAP, renderiza en local y gratis), que se elige pieza a pieza y nunca por defecto: skill `motor-hyperframes`.

## 2. Instalar («instálalo»)

Cuando el usuario diga «instálalo», «prepara el sistema» o algo parecido, ejecuta el instalador de su sistema **desde la raíz del repo** y, después, el doctor:

- macOS / Linux:
  ```
  bash instalar.sh
  node herramientas/doctor.mjs
  ```
- Windows (PowerShell 5.1 o 7; también vale doble clic en `instalar.cmd`):
  ```
  powershell -NoProfile -ExecutionPolicy Bypass -File instalar.ps1
  node herramientas/doctor.mjs
  ```

El instalador no pide administrador ni `sudo`. Asegura Node ≥ 22 (si no hay, lo instala solo para el usuario), añade la carpeta de herramientas del usuario a su PATH y lanza `node herramientas/setup.mjs`, que hace el resto en orden y de forma **idempotente** (se puede repetir cuando haga falta): dependencias de `remotion/` (`npm ci`), enlaces de las skills (`.claude/skills/<s>` y `.agents/skills/<s>` → `manuales/<s>`), `.env` a partir de `.env.example` si no existe, `uv` con un Python, `ffmpeg`/`ffprobe`, `auto-editor`, el Chrome headless de Remotion, los SFX base en `remotion/public/sfx/` y un `avatar.mp4` de relleno. Todo con versiones fijas y sumas de comprobación.

Reparar o completar algo suelto: `node herramientas/setup.mjs` admite `--solo-skills`, `--whisper` (transcripción local, unos 500 MB), `--sin-whisper`, `--sin-chrome` y `--sin-doctor`.

Requisitos: macOS 13+ (Apple Silicon o Intel) o Windows 10/11 x64. En Windows ARM64 Remotion no renderiza (el doctor lo avisa). Una carpeta sin espacios ni tildes y fuera de OneDrive/iCloud evita problemas (el doctor también lo avisa).

**Si eres Codex:** tu sandbox no tiene red por defecto. Instalar, `npm ci`, descargar Chrome o hablar con una API necesitan red: pide al usuario que ejecute el instalador él mismo o que apruebe el acceso a red para ese comando. No intentes rodearlo.

**Si eres Codex en macOS, además:** el Chrome con el que Remotion (y HyperFrames) renderiza **no arranca dentro del sandbox** (macOS le niega el puerto Mach: `MachPortRendezvousServer … Permission denied`). Cualquier `npx remotion still|render`, `npm run dev`, la sonda o `render-hf.mjs` hay que ejecutarlo **pidiendo la aprobación para correr fuera del sandbox** (la petición de permisos elevados que el usuario acepta en el chat). No es un fallo de la instalación: el doctor sale en verde y el mismo comando funciona en cuanto se aprueba. No intentes «arreglar» Chrome con flags: lo probamos y no hay flag que lo salve.

**Nada global:** no instales con `brew`, `winget`, `pipx` ni `npm -g`, y no cambies las versiones fijadas en `setup.mjs`. Si falta una herramienta, el camino es siempre `node herramientas/setup.mjs`.

## 3. El doctor

`node herramientas/doctor.mjs` comprueba cada pieza (✅ bien · ❌ falta y hace falta · ⚠️ opcional o con matices) y termina con el **nivel** en el que se puede trabajar:

- **nivel 0**, sin ninguna clave: montar, renderizar, cortar silencios, motion graphics, SFX, demos, HyperFrames.
- **nivel 1**, con `PEXELS_API_KEY`: además b-roll de archivo real (fotos y vídeo, gratis).
- **nivel 2**, con alguna clave de pago (`HEYGEN_API_KEY`, `ELEVENLABS_API_KEY`, `XAI_API_KEY`): avatar generado, voz en off, b-roll generado.

Sale con 0 si el nivel 0 funciona. **Pásalo antes de prometer nada** («¿puedo hacer un avatar?» → doctor → «no hay clave de HeyGen: estás en nivel 1»). Con `--json` devuelve un objeto para ti: `nivel`, `nivel0`, `claves.presentes` y `claves.faltan` (solo los nombres), `paraSubir` y `piezas[]`, cada una con `id`, `estado`, `texto` y `arreglo` (el comando que la arregla).

## 4. Las skills: la puerta es `director-video`

Cada skill vive en `manuales/<skill>/SKILL.md` y se carga desde `.claude/skills/<skill>` (Claude Code) o `.agents/skills/<skill>` (Codex): son enlaces que crea el instalador. Si no aparecen, `node herramientas/setup.mjs --solo-skills` y una sesión nueva.

| Skill | Una línea |
|---|---|
| **`director-video`** | **La puerta de entrada.** «Monta el vídeo», «vídeo nuevo», «monta estos clips», «retoma el proyecto NNN»: coordina todas las capas, fija fps y z-order, abre los artefactos y delega el detalle. Empieza SIEMPRE por aquí cuando la petición es un vídeo. |
| `edicion-video` | El motor y el pipeline: formato, estructura de un proyecto, reglas R01-R29, transcripción, corte de silencios, render de prueba y final, HeyGen, Pexels, Grok. |
| `camara-avatar` | Cámara virtual sobre un avatar hablando: planos, zooms y reencuadres motivados por el guion, como datos (`camara-NNN.ts`). |
| `motion-graphics` | Gráficos con intención: jerarquía, timing en frames, la biblioteca `motor/graficos/`, su catálogo y el plan como datos (`graficos-NNN.ts`) con validador `revisaPlan()`. |
| `diseno-sonoro` | SFX sincronizados al frame y con función narrativa: el set de `remotion/public/sfx/`, cues como datos (`cues-NNN.ts`), mezcla y ducking bajo la voz. |
| `video-noticias` | Formato completo: de una noticia a un short 9:16 con voz en off, papel + acento de marca y 7 beats; el plan `noticia-NNN.ts` y sus validadores. |
| `motor-hyperframes` | El segundo motor (HTML + GSAP): cuándo elegirlo, su contrato, el puente de marca (`marca-a-css.mjs`) y sus puertas (`revisar-hf.mjs` + `hyperframes check`). |

Cómo se invocan: en Claude Code, `/director-video`; en Codex, `$director-video`; o de forma implícita por la petición. Cuando una capa toca, **abre su SKILL.md y sigue sus tablas** en vez de improvisar.

Para ver lo que ya existe antes de inventar: los planes de `remotion/src/motor/demos/` (`plan-demo.ts`, `graficos-demo.ts`, `noticia-demo.ts`, `camara-demo.ts`) y las composiciones del producto en `remotion/src/Root.tsx` (`Prueba`, `TutorialYT`, `VerticalSocial`, `FeedCuadrado`, `Avatar16x9`, `DemoCamara`, `Catalogo`, `GraficosDemo`, `PlanDemo`, `NoticiaDemo`). Copiar de una demo es mejor que empezar de cero.

## 5. Reglas de trabajo

1. **Artefactos antes que código.** Un proyecto empieza con `node manuales/director-video/scripts/artefactos.mjs NNN`, que crea `proyectos/NNN/artefactos/` (`01-plan.md` → `02-layout.md` → `03-timeline.md`). Se escriben y se acuerdan con el usuario **antes** de escribir un `.ts`; los planes salen del timeline, no al revés. Para retomar un proyecto, léelos primero.
2. **Validadores antes de renderizar.** Cada plan tiene su puerta y se pasa antes de abrir el Studio o lanzar un render:
   - gráficos: `revisaPlan(plan)` lo ejecuta la propia composición; `npm run lint` en `remotion/` comprueba tipos y reglas del resto;
   - noticias: `node manuales/video-noticias/scripts/revisar-plan.mjs <noticia-NNN.ts>` y `node manuales/video-noticias/scripts/revisar-broll.mjs <noticia-NNN.ts>`;
   - montaje: `node remotion/src/motor/metraje/revisar-metraje.mjs <metraje-NNN.ts>`;
   - HyperFrames: `node manuales/motor-hyperframes/scripts/revisar-hf.mjs NNN`;
   - motor y marca: `node manuales/motion-graphics/scripts/revisar-marca.mjs` y `node manuales/motion-graphics/scripts/revisar-catalogo.mjs`.
   Después **un fotograma** (`npx remotion still …`), luego una prueba a 720p y solo al final el render final. Enseña frames y espera la respuesta del usuario: no exportes a ciegas.
3. **Nunca se edita desde Descargas** ni desde un archivo suelto. Lo que el usuario entrega se copia a `proyectos/NNN/` (original, avatar, b-roll, voz), y lo que Remotion tiene que ver, a `remotion/public/` con un nombre que lleve el número del proyecto. Antes de contar un solo frame, `ffprobe`: resolución, fps, rotación y audio reales.
4. **El motor es compartido.** Lo propio de una pieza va en `remotion/src/proyectos/NNN/`. `remotion/src/motor/` se toca solo para arreglar algo que afecte a todos, y sin cambiar la salida de composiciones ya publicadas. Un canal nuevo es un archivo nuevo en `remotion/src/marcas/` copiado de `ejemplo.ts`, nunca un cambio en `MARCA_BASE`.
5. **Determinismo.** Un fps por composición, todo en frames absolutos, `useCurrentFrame()`, nada de tiempo real ni de aleatorio sin semilla. Los planes son datos (objetos en `.ts`), no JSX suelto.
6. **Lo que cuesta dinero se confirma.** HeyGen, ElevenLabs y xAI facturan por uso: antes de un `--final`, de una locución larga o de una generación, di cuánto y espera el sí.
7. **B-roll honesto.** Lo que existe se **trae** de un banco (Pexels, con manifiesto y crédito); lo que no existe se **genera**. Un lugar o un hecho reales generados con IA son prueba fabricada.
8. Escribe en **español**: artefactos, comentarios y mensajes de commit. Comenta el **por qué**, no el qué.

## 6. Las claves (`.env`)

Las claves de API viven en `.env`, en la raíz, y **las escribe el usuario a mano**. Tú no las pides por chat, no las lees, no las imprimes, no las copias a otro archivo ni las pasas por argumento. `.claude/settings.json` te veta leer `.env` y `.env.*` a propósito. Cada script las lee él mismo en el momento de usarlas.

Si una función necesita una clave que no está: di **qué variable** hace falta y **dónde se consigue** (la tabla de abajo lo dice, y también `node herramientas/doctor.mjs --json`, campo `donde` de `paraSubir`; `.env.example` lo explica línea a línea **para el usuario**: tú no puedes leerlo, el veto de `.env.*` lo cubre a propósito), pide al usuario que la escriba en `.env` y vuelve a pasar el doctor. Nunca la sustituyas por un valor inventado ni preguntes «pégame la clave».

| Variable | Nivel | Qué desbloquea | Dónde se consigue |
|---|---|---|---|
| `PEXELS_API_KEY` | 1 | b-roll de archivo (fotos y vídeo reales, gratis) | https://www.pexels.com/api/ |
| `HEYGEN_API_KEY` (+ `HEYGEN_AVATAR_ID`, `HEYGEN_VOICE_ID`) | 2 | avatar talking-head a partir de un guion | https://app.heygen.com → Settings → API |
| `ELEVENLABS_API_KEY` (+ `ELEVENLABS_VOICE_ID`) | 2 | voz en off | https://elevenlabs.io → API Keys |
| `XAI_API_KEY` | 2 | b-roll e imágenes generadas (Grok Imagine) | https://console.x.ai |

## 7. Comandos portables (macOS, Windows, Claude Code y Codex)

Los scripts corren igual en los dos sistemas si se invocan así, **desde la raíz del repo**:

- Node: `node manuales/<skill>/scripts/<x>.mjs …` · Python: `uv run manuales/<skill>/scripts/<x>.py …` (`uv` trae su propio Python; no hay entornos que crear ni activar).
- Rutas **relativas a la raíz y con `/`**, también en Windows. Nunca rutas absolutas de nadie ni atajos a la carpeta personal.
- **Un comando por línea.** Sin `&&`, `||`, `;`, `VAR=x cmd`, `$(…)`, heredocs, `/dev/null` ni `2>&1`: PowerShell 5.1 no los entiende y Codex en Windows trabaja en PowerShell.
- Remotion se maneja desde `remotion/`: primero `cd remotion` en una línea, luego el comando. Desde la raíz también vale `npm --prefix remotion run lint`.

| Tarea | Comando |
|---|---|
| Lint + tipos del motor | `cd remotion` · `npm run lint` |
| Un fotograma de prueba | `cd remotion` · `npx remotion still src/index.ts Prueba out/prueba.png` |
| Abrir el Studio (puerto 3000) | `cd remotion` · `npm run dev` |
| Listar composiciones | `cd remotion` · `npx remotion compositions src/index.ts` |
| Render de prueba a 720p | `cd remotion` · `npx remotion render src/index.ts <Comp> out/<comp>-720p.mp4 --scale=0.5` |
| Artefactos de un proyecto | `node manuales/director-video/scripts/artefactos.mjs NNN` |
| Transcribir | `node manuales/edicion-video/scripts/transcribir.mjs <entrada> [salida.json] [idioma]` |
| Medir el golpe de un SFX | `node manuales/diseno-sonoro/scripts/sfx.mjs medir <archivo>` |
| B-roll de archivo | `uv run manuales/edicion-video/scripts/bancos.py glosario` (y de ahí `contactos` → `traer`) |
| Voz en off | `node manuales/video-noticias/scripts/generar-vo.mjs proyectos/NNN/guion-vo.txt` |
| Pieza en HyperFrames | `node manuales/motor-hyperframes/scripts/nuevo-hf.mjs NNN --canal ejemplo` · `revisar-hf.mjs NNN` · `render-hf.mjs NNN` |

**Windows sin Git Bash:** Claude Code trabaja en PowerShell (pwsh 7 si existe; si no, 5.1). `node` y `uv` son ejecutables nativos y van igual. Si `npm` o `npx` fallan por la política de ejecución («npm.ps1 cannot be loaded»), usa `npm.cmd` y `npx.cmd`. Las herramientas del usuario están en `%LOCALAPPDATA%\video-creator\bin` (en macOS, en `.local/bin` de su carpeta personal) y los scripts las encuentran solos aunque el PATH de esa sesión no las tenga. Si `node --version` da una versión anterior a la 22 pero existe `$env:LOCALAPPDATA\video-creator\node\node.exe` (el Node portable que dejó `instalar.ps1`), un Node viejo del sistema le está ganando en el PATH: usa esa ruta completa en los comandos (`& "$env:LOCALAPPDATA\video-creator\node\node.exe" herramientas/doctor.mjs`) hasta que el usuario actualice o quite el viejo; el doctor lo avisa.

## 8. Si algo falla

1. `node herramientas/doctor.mjs --json` y lee `piezas[].arreglo`: cada ❌ trae el comando que lo arregla. Ejecútalo y vuelve a pasar el doctor.
2. Errores que se repiten:

| Síntoma | Causa | Qué hacer |
|---|---|---|
| «no encuentro ffmpeg / uv / auto-editor» | no se instaló o no está en la carpeta de herramientas | `node herramientas/setup.mjs` |
| las skills no aparecen en la sesión | faltan los enlaces `.claude/skills/` o `.agents/skills/` | `node herramientas/setup.mjs --solo-skills` y abrir una sesión nueva |
| Remotion no renderiza: falta el navegador | Chrome headless sin descargar | `node herramientas/setup.mjs` (sin `--sin-chrome`) |
| Remotion o HyperFrames mueren al arrancar Chrome con `MachPortRendezvousServer … Permission denied (1100)` | estás en Codex, dentro de su sandbox de macOS | repite el comando pidiendo ejecutarlo fuera del sandbox (aprobación del usuario); la instalación está bien |
| `npm run lint` falla | error de tipos en un plan o una composición | lee el mensaje: casi siempre es un plan que no cumple su molde, y el validador dice cuál |
| un script de Python «no arranca» | se lanzó con `python3` o `python` | `uv run …` desde la raíz |
| 401 o 403 de una API | clave ausente, inválida o cuenta sin créditos | el usuario revisa `.env` (tú no); con xAI, `uv run manuales/edicion-video/scripts/grok.py modelos` distingue clave mala de cuenta sin créditos |
| acentos rotos en la consola de Windows | consola sin UTF-8 | los scripts fuerzan UTF-8 al escribir; si es la consola, `chcp 65001` |
| audio o vídeo «no cuadran» | fps o rotación distintos de lo que dice el contenedor | `ffprobe` y normalizar antes de contar frames (reglas R01, R19 y R21 de `edicion-video`) |

3. No arregles a ciegas: si un render falla, un `still` del frame que falla dice más que diez renders.
4. Antes de tocar `herramientas/` o `remotion/src/motor/` para «arreglar» algo, comprueba que no sea una pieza que el doctor ya marca.

## 9. Lo que NO existe en el producto

`ESTUDIO.md`, `manuales/<skill>/ESTUDIO.md`, `CLAUDE.local.md` y `AGENTS.override.md` son notas locales de una instalación concreta: no vienen con el producto, están en `.gitignore` y no debes buscarlos, citarlos ni crearlos salvo que el usuario te lo pida. Tampoco hay proyectos de ejemplo hechos: el primer proyecto se crea con `artefactos.mjs 001`. Los datos de quien haga sus vídeos con esto (marcas, proyectos, medios, banco de sonido propio) viven en las zonas que lista `herramientas/zonas.mjs` y no salen de su máquina.
