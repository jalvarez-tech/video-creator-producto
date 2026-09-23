# 🎬 video-creator — vídeos con IA, dirigidos por skills

Un sistema para que un agente de IA (**Claude Code** o **Codex**) monte vídeos de verdad en tu máquina: piezas con avatar, shorts de noticias, gráficos animados, montajes de clips y fotos. No es una app: es un **motor de vídeo programático** (Remotion), un **segundo motor en HTML** (HyperFrames) y siete **skills** que le dicen al agente cómo se dirige una pieza —con validadores que miran el plan antes de renderizar y reglas que se aprendieron montando vídeos reales—.

Tú hablas con el agente en español («monta el vídeo con este guion», «convierte esta noticia en un short») y él abre la skill que toca, escribe los artefactos, valida y renderiza. Tú apruebas mirando frames. Todo corre **en local**; las únicas llamadas a internet son las de los servicios que tú decidas activar con una clave.

| Motor | Para qué | Dónde vive |
|---|---|---|
| **Remotion** | Vídeo programático (intros, títulos, gráficos, cámara virtual, noticias, montaje). **El motor por defecto** | `remotion/` |
| **HyperFrames** | Segundo motor: vídeo desde HTML+GSAP, render local y gratis. Se **elige** por pieza, no se hereda | `manuales/motor-hyperframes/` |
| **Auto-Editor** | Cortar silencios de un vídeo grabado | binario en tu carpeta de usuario (lo instala `setup.mjs`) |
| **whisper.cpp** | Transcribir con tiempos, para subtítulos (opcional) | ídem, con `--whisper` |
| **HeyGen** | Avatar talking-head a partir de un guion | `manuales/edicion-video/scripts/heygen.py` |
| **ElevenLabs** | Voz en off (texto → audio) cuando la pieza **no** lleva avatar | `manuales/edicion-video/scripts/elevenlabs.py` |
| **Grok Imagine** (xAI) | Generar b-roll de lo que **no existe** (texto/imagen → vídeo) | `manuales/edicion-video/scripts/grok.py` |
| **Pexels** | Traer b-roll de **archivo**: lugares, objetos y gestos reales, con manifiesto de licencias | `manuales/edicion-video/scripts/bancos.py` |

> **Regla de oro:** primero el plan y la estructura, luego el vídeo. Cada pieza tiene su carpeta (`proyectos/NNN/`), sus artefactos escritos antes que el código y sus validadores en verde antes del render.

---

## 🚀 Instalar

Funciona en **macOS** y en **Windows**, sin permisos de administrador. Hay cuatro caminos; los cuatro acaban en el mismo sitio.

### Camino 0 — desde el chat, sin descargar nada a mano (plugin)

El repo es también un *marketplace* de plugins, con una sola skill: la que instala el estudio. Se añade desde el propio chat y el agente hace el resto (descargar, instalar, pasar el doctor):

| Agente | Comandos |
|---|---|
| Claude Code | `/plugin marketplace add jalvarez-tech/video-creator-producto` · luego `/plugin install video-creator@video-creator` · luego escribe **«instala video-creator»** |
| Codex | `codex plugin marketplace add jalvarez-tech/video-creator-producto` · luego `codex plugin add video-creator@video-creator` · luego, en el chat, **«instala video-creator»** |

La skill (`plugin/skills/instalar/SKILL.md`) pregunta dónde, trae el código, lanza el instalador y te deja en el primer vídeo. Sirve también para **actualizar**.

### Camino 1 — desde el agente, con la carpeta ya descargada

Abre la carpeta del repo en Claude Code o en Codex y escribe **«instálalo»**. El agente lee [AGENTS.md](AGENTS.md), lanza el instalador de tu sistema y termina con el diagnóstico. En Codex el sandbox necesita **red** para instalar: si te lo pide, apruébalo. Y en Codex sobre macOS, cada render (el Chrome de Remotion no arranca dentro del sandbox) te pedirá aprobar **ejecutar fuera del sandbox**: es normal, acéptalo.

### Camino 2 — una línea de terminal

Desde la raíz del repo (la carpeta donde está este archivo):

| Sistema | Comando |
|---|---|
| macOS / Linux | `bash instalar.sh` |
| Windows (PowerShell 5.1 o 7) | `powershell -NoProfile -ExecutionPolicy Bypass -File instalar.ps1` |
| Windows (doble clic) | `instalar.cmd` |

### Camino 3 — sin git

Descarga el ZIP del repo (en GitHub: *Code → Download ZIP*), descomprímelo en una carpeta **sin espacios ni tildes** y **fuera de OneDrive/iCloud**, y sigue el camino 1 o el 2 dentro de ella (o evita todo esto con el camino 0). Para actualizar después, vuelve a descargar: tus proyectos y tus marcas no están dentro de las carpetas que se sobrescriben (ver [qué es tuyo](#-qué-es-tuyo-y-qué-es-del-producto)).

### Qué hace el instalador

1. Se asegura de que hay **Node ≥ 22**. Si no lo hay, lo pone sin administrador (macOS: `fnm` en tu carpeta personal; Windows: `winget --scope user`, o un Node portable si no hay winget) y añade la carpeta de herramientas del usuario al PATH.
2. Ejecuta `node herramientas/setup.mjs`, que instala o repara todo lo demás y es **idempotente** (puedes lanzarlo tantas veces como quieras):
   - las dependencias de `remotion/` (`npm ci`);
   - las skills, enlazadas en `.claude/skills/` (Claude Code) y `.agents/skills/` (Codex) → `manuales/<skill>/`;
   - tu `.env` a partir de [`.env.example`](.env.example), si no existe;
   - **uv**, **ffmpeg/ffprobe**, **auto-editor** y, si lo pides con `--whisper`, **whisper** con su modelo — en tu carpeta de usuario, sin tocar el sistema;
   - un Python para los scripts (`uv python install`) y el Chrome que Remotion usa para renderizar;
   - los **SFX base** en `remotion/public/sfx/` si faltan, y un `remotion/public/avatar.mp4` de relleno para las demos con avatar.
3. Termina con `node herramientas/doctor.mjs`, que te dice qué **nivel** tienes (abajo).

Flags de `setup.mjs`: `--solo-skills` (solo vuelve a enlazar las skills) · `--whisper` / `--sin-whisper` · `--sin-chrome` · `--sin-doctor`.

---

## 🔑 Niveles: qué desbloquea cada clave

Sin ninguna clave el sistema ya monta vídeos. Las claves van en **`.env`** (plantilla: [`.env.example`](.env.example), con el enlace de dónde sacar cada una); **el agente nunca las lee ni te las pide por chat**. El agente tampoco puede leer `.env.example` (su veto sobre `.env.*` la cubre a propósito): las URL de cada clave las saca de `node herramientas/doctor.mjs --json` (campo `donde` de `paraSubir`) o de la tabla de [AGENTS.md §6](AGENTS.md).

| Nivel | Necesita | Qué puedes hacer |
|---|---|---|
| **0** | nada | Studio, plantillas, demos, gráficos animados, montaje de clips y fotos (`PistaMetraje`), SFX, cámara virtual sobre tu propio clip, HyperFrames, subtítulos (con whisper instalado), voz guía de sistema para cronometrar una noticia |
| **1** | `PEXELS_API_KEY` (gratis, instantánea) | b-roll de **archivo** con licencia y manifiesto (`bancos.py buscar · contactos · traer · reponer · gradar · creditos`) |
| **2** | `HEYGEN_API_KEY` · `ELEVENLABS_API_KEY` · `XAI_API_KEY` (de pago) | avatar talking-head · voz en off publicable · b-roll **generado** |

`node herramientas/doctor.mjs` comprueba cada pieza (✅/❌/⚠️), termina con tu nivel y dice qué falta para subir. Con `--json` para máquinas. Sale 0 si el nivel 0 funciona.

---

## ⏱️ Primer vídeo en 5 minutos

1. **Diagnóstico** (desde la raíz): `node herramientas/doctor.mjs` → nivel 0 en verde.
2. **Abre el Studio:** `cd remotion` y luego `npm run dev` → http://localhost:3000 (cerrar: `Ctrl + C`). Ahí están las composiciones del producto: `Prueba`, `TutorialYT`, `VerticalSocial`, `FeedCuadrado`, `Avatar16x9`, `DemoCamara`, `Catalogo`, `GraficosDemo`, `PlanDemo` y `NoticiaDemo`.
3. **Un fotograma sin abrir nada** (desde `remotion/`): `npx remotion still src/index.ts NoticiaDemo out/noticia.png --frame=100`. Si sale la imagen, el motor renderiza.
4. **Tu primer proyecto** (desde la raíz): `node manuales/director-video/scripts/artefactos.mjs 001` crea `proyectos/001/artefactos/` con `01-plan.md → 02-layout.md → 03-timeline.md`, que se escriben **antes** del código.
5. **Tu material:** copia tus clips, fotos o el original a `proyectos/001/` (la carpeta que acaba de crear el paso 4); nunca se edita desde Descargas. El agente pone en `remotion/public/` lo que Remotion tenga que ver, con el número del proyecto en el nombre, y mide cada archivo con `ffprobe` antes de contar un frame. Si aún no sabes a qué proyecto irá algo, `entrada/` es una bandeja opcional para material sin clasificar: de ahí el agente lo mueve al proyecto cuando lo use.
6. **Díselo al agente:** *«monta el vídeo del proyecto 001 con este guion: …»*. La puerta de entrada es la skill `director-video`: decide qué capas hacen falta y delega en las demás. Para una noticia, *«monta esta noticia: …»* entra por `video-noticias`; para un montaje de clips y fotos sin avatar, *«monta estos clips»*.

Si tienes un clip de avatar (HeyGen o grabado), déjalo también en `proyectos/001/`: el agente lo copia a `remotion/public/` con el número del proyecto en el nombre y la skill `camara-avatar` le pone la cámara. `DemoCamara` enseña cómo se ve sobre el `avatar.mp4` de relleno, que genera el instalador si falta (no va en git: puedes sustituirlo por un clip tuyo con ese nombre sin ensuciar nada).

---

## 🗺️ Mapa de skills

Cada skill es una carpeta `manuales/<skill>/` con su `SKILL.md`; el instalador las enlaza para los dos agentes. Se activan solas por lo que pides, o por nombre.

| Skill | Es | Entra cuando dices… |
|---|---|---|
| [director-video](manuales/director-video/SKILL.md) | 🚪 **La puerta de entrada.** Orquesta todas las capas, decide el fps y el z-order, valida con frames | «monta el vídeo», «vídeo nuevo», «monta estos clips», «usa todos los recursos» |
| [edicion-video](manuales/edicion-video/SKILL.md) | El motor, el pipeline, las reglas R01-R29, HeyGen, b-roll (Pexels/Grok), transcripción, render | «render», «frame de prueba», «cortar silencios», «b-roll», «abrir studio» |
| [camara-avatar](manuales/camara-avatar/SKILL.md) | Cámara virtual sobre un talking-head, motivada por la narrativa | cualquier pieza cuyo elemento principal sea un avatar |
| [motion-graphics](manuales/motion-graphics/SKILL.md) | Dirección de gráficos animados + la biblioteca y el catálogo (`Catalogo`) + el plan como datos | «anima este título», «un contador», «lower-third», «CTA» |
| [diseno-sonoro](manuales/diseno-sonoro/SKILL.md) | SFX, mezcla, ducking bajo la voz, recetario por gráfico | siempre que haya un gráfico o un corte que sonorizar |
| [video-noticias](manuales/video-noticias/SKILL.md) | 📰 Formato completo: noticia → short 9:16 editorial sin avatar, voz en off + 9 tomas | «monta esta noticia», «explicador», «vídeo editorial» |
| [motor-hyperframes](manuales/motor-hyperframes/SKILL.md) | 🧱 El segundo motor (HTML+GSAP), sus puertas y el puente de marca | «con hyperframes», «en HTML», «segundo motor» |

Las reglas de trabajo para el agente (artefactos antes que código, validadores antes de renderizar, dónde van las claves) están en [AGENTS.md](AGENTS.md); [CLAUDE.md](CLAUDE.md) lo importa para Claude Code.

---

## 💻 Requisitos

- **macOS 13+** (Apple Silicon o Intel) o **Windows 10/11 x64**. Linux funciona con el mismo `instalar.sh`, aunque no es la plataforma que se prueba. **Windows ARM64 no**: Remotion no tiene compositor para esa arquitectura (el doctor avisa).
- **Node ≥ 22.** Si no lo tienes, el instalador lo pone. Todo lo demás (uv, ffmpeg, auto-editor, whisper, Chrome de Remotion) lo instala `setup.mjs` en tu carpeta de usuario.
- **Disco:** ~1 GB entre `node_modules` y el Chrome de Remotion; +0,5 GB si instalas whisper con su modelo.
- **Un agente:** Claude Code o Codex. Sin agente también funciona: son comandos de terminal y un Studio en el navegador.
- La carpeta del repo **sin espacios ni tildes** y **fuera de OneDrive/iCloud**: los renders y los symlinks se llevan mal con ambas cosas (el doctor avisa).
- Comandos **uno por línea**: PowerShell 5.1 no entiende `&&`.

---

## 📜 Licencias

- **El código de este repo es MIT** ([LICENSE](LICENSE)).
- **Remotion no es MIT:** tiene [su propia licencia](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md). Es gratis para particulares y para empresas de hasta 3 personas; una empresa mayor necesita una licencia de empresa de Remotion. Es tu responsabilidad comprobarlo.
- El resto de terceros y su licencia, en [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md): HyperFrames (Apache-2.0), GSAP vendorizado (`manuales/motor-hyperframes/plantilla/vendor/`, GreenSock Standard License), Inter (SIL OFL 1.1, en `remotion/public/fuentes/inter/`), whisper.cpp (MIT), auto-editor (Unlicense), ffmpeg (LGPL/GPL, binario que se instala en tu máquina).
- **Los SFX que trae el producto** (`manuales/diseno-sonoro/sfx-base/`, 55 archivos) están **sintetizados con ffmpeg** por `node manuales/diseno-sonoro/scripts/sfx.mjs sintetizar`: no son de ningún banco y puedes usarlos en lo que publiques. Si tienes tu propio banco, `sfx.mjs desde-banco` lo pone en su sitio con el mismo nombre de archivo (ver [remotion/public/sfx/README.md](remotion/public/sfx/README.md)).
- Lo que generes con HeyGen, ElevenLabs, xAI o traigas de Pexels se rige por las condiciones de cada servicio; `bancos.py creditos` te da el bloque de atribución de Pexels listo para la descripción del vídeo.

---

## 📁 Estructura

```
video-creator/
├── instalar.sh · instalar.ps1 · instalar.cmd   # los instaladores (Node + herramientas + setup)
├── herramientas/
│   ├── comun.mjs             # lo que comparten los scripts: raíz, binarios, procesos (Mac/Windows)
│   ├── setup.mjs             # instala/repara todo lo que no sea Node. Idempotente
│   ├── doctor.mjs            # ✅/❌/⚠️ de cada pieza + tu NIVEL (--json)
│   └── revisar-producto.mjs  # guard: nada del estudio ni cadenas privadas en lo compartido
├── AGENTS.md · CLAUDE.md     # el marco para los agentes (Codex lee el primero; Claude importa el primero desde el segundo)
├── manuales/                 # LAS SKILLS — el "cómo se decide"
│   ├── director-video/       #   🚪 orquestador · artefactos/ (01-plan · 02-layout · 03-timeline) · scripts/artefactos.mjs
│   ├── edicion-video/        #   motor, pipeline, reglas.md (R01+), proceso, heygen.md, plantillas/
│   │   └── scripts/          #   heygen.py · elevenlabs.py · grok.py · bancos.py · revisar-bancos.py · transcribir.mjs · exportar-srt.mjs
│   ├── camara-avatar/        #   cámara virtual del avatar
│   ├── motion-graphics/      #   dirección de gráficos + catalogo-graficos.md (generado)
│   │   └── scripts/          #   generar/revisar-catalogo · revisar-marca · generar-avances · sonda-frames + revisar-sonda
│   ├── diseno-sonoro/        #   SFX, mezcla, ducking · sfx-base/ (los 55 sintetizados) · scripts/sfx.mjs
│   ├── video-noticias/       #   📰 formato noticias + recetario-tomas.md + artefactos/01-noticia.md
│   │   └── scripts/          #   generar-vo.mjs (cronometra la voz) · revisar-plan · revisar-broll · revisar-velo
│   └── motor-hyperframes/    #   🧱 segundo motor · plantilla/ (HTML + GSAP vendorizado) · contrato-hf.md · equivalencias.md
│       └── scripts/          #   nuevo-hf · marca-a-css · revisar-hf · render-hf.mjs · instalar-skill-hf
├── remotion/                 # EL MOTOR (proyecto npm; ver remotion/README.md)
│   ├── public/               #   medios: sfx/ · fuentes/inter/ · avatar.mp4 (relleno, lo genera setup.mjs) · lo tuyo, fuera de git
│   └── src/
│       ├── Root.tsx          #   las composiciones del producto + <ComposicionesDelEstudio /> (las tuyas)
│       ├── estudio.tsx       #   recoge src/proyectos/*/composiciones.tsx sin tocar Root.tsx
│       ├── marcas/           #   UN FICHERO POR CANAL — ejemplo.ts versionado; los tuyos, fuera de git
│       ├── motor/            #   LO REUTILIZABLE: plan/ (el núcleo) · graficos/ · noticias/ · metraje/ · sound/ · piezas/
│       │   ├── marca.ts      #     el tipo `Marca` + `MARCA_BASE` (el suelo, sin canal) + LETRA_INTER
│       │   ├── fuentes.ts    #     registra la Inter empaquetada (render idéntico en Mac y Windows)
│       │   └── demos/        #     plan-demo · graficos-demo · noticia-demo: los planes que se copian para empezar
│       └── proyectos/NNN/    #   TUS VÍDEOS: sus planes como datos + su composiciones.tsx (fuera de git)
├── proyectos/NNN/            # UN PROYECTO POR CARPETA (fuera de git): artefactos/ · broll/manifiesto.json · guion-vo.txt · hf/ …
├── .env                      # ⛔ tus claves (plantilla: .env.example). El agente no lo lee
└── .github/workflows/verificar.yml   # CI en macOS + Windows: instala, doctor, lint, un still, validadores, guard
```

---

## 🎨 Crear tu marca

La marca **no es una constante del motor**: es un dato que llega por parámetro a cada composición (colores, tipografía, sello, look del metraje). El producto trae una marca de ejemplo, y dar de alta la tuya es **copiar ese fichero y cambiar valores**. El motor no se toca.

```
remotion/src/marcas/ejemplo.ts   ← copia este fichero como remotion/src/marcas/<tu-canal>.ts
remotion/src/motor/marca.ts      ← el tipo `Marca` y `MARCA_BASE`. El motor NO conoce ningún canal
```

`ejemplo.ts` es así de corto:

```ts
import { LETRA_INTER, MARCA_BASE } from "../motor/marca";
import type { Marca } from "../motor/marca";

export const EJEMPLO: Marca = {
  ...MARCA_BASE,
  nombre: "Mi Canal",
  sello: { texto: "MI CANAL" },                       // la píldora que firma cada frame
  color: { ...MARCA_BASE.color, acento: "#0E7C86", acentoChip: "#3A9AA3", acentoOscuro: "#0B5E66" },
  letra: LETRA_INTER,                                 // Inter empaquetada: igual en Mac y en Windows
};
```

Cambia `nombre`, `sello.texto` y los tres acentos, y pásala en tu composición:

```tsx
<PistaNoticia tomas={noticiaDemo} marca={EJEMPLO} />   // formato noticias
capa(dialectoEditorialDe(EJEMPLO), "noticia")          // plan nativo
fondos={fondosNoticiaDe(EJEMPLO)}                      // <PistaGraficos> a pelo
```

Tres cosas que conviene saber:

- `MARCA_BASE` **no es un canal**: su `sello.texto` es `null`, así que una composición que olvide pasar su marca sale **sin sello** — un fallo que se ve en el primer frame, no uno que se publica.
- **Declara `letra: LETRA_INTER`** (o mide tu propia familia con `node manuales/motion-graphics/scripts/generar-avances.mjs` antes de darla de alta). `MARCA_BASE` conserva la letra de sistema de macOS por compatibilidad, y esa **no existe en Windows**.
- Un acento vivo sobre papel claro puede no llegar al **3:1** de contraste como texto: HyperFrames lo mide (`marca-a-css.mjs --acento-texto`), Remotion no. Compruébalo antes de publicar.

Los `<Composition>` de tus proyectos van en `remotion/src/proyectos/NNN/composiciones.tsx` (`export const Composiciones`), que `estudio.tsx` recoge solo. `Root.tsx` no se edita.

---

## 🧰 Qué es tuyo y qué es del producto

El producto se actualiza con `git pull` (o bajando el ZIP otra vez) y **no toca lo tuyo**, porque lo tuyo está en `.gitignore`:

| Tuyo (ignorado por git) | Del producto (versionado) |
|---|---|
| `proyectos/*` · `remotion/src/proyectos/*` (tus vídeos) | `manuales/`, `herramientas/`, `remotion/src/motor/`, los demos |
| `remotion/src/marcas/*` menos `ejemplo.ts` | `remotion/src/marcas/ejemplo.ts` |
| `remotion/public/*` menos `sfx/README.md` y `fuentes/` (el `avatar.mp4` de relleno lo genera el instalador si falta) | `sfx/README.md` y las fuentes |
| `remotion/public/sfx/*.mp3 · *.wav` (los pone el instalador o tu banco) | `manuales/diseno-sonoro/sfx-base/` |
| `.env`, `sonido/` (tu banco, si tienes), `ESTUDIO.md`, `CLAUDE.local.md` | `.env.example`, `AGENTS.md`, `CLAUDE.md` |

Si sustituyes un SFX del set por uno tuyo, hazlo **con el mismo nombre de archivo** y recalibra su `vol` en `cues.ts` (`node manuales/diseno-sonoro/scripts/sfx.mjs medir <archivo>`): el motor los reproduce por nombre.

---

## ✅ Verificar y mantener

Lo que corre la CI ([verificar.yml](.github/workflows/verificar.yml)) en macOS y Windows, y lo que conviene correr tras tocar el motor. Desde la raíz, uno por línea:

```bash
node herramientas/doctor.mjs
node manuales/motion-graphics/scripts/revisar-catalogo.mjs
node manuales/motion-graphics/scripts/revisar-marca.mjs
node manuales/video-noticias/scripts/revisar-plan.mjs
node manuales/video-noticias/scripts/revisar-velo.mjs
uv run manuales/edicion-video/scripts/revisar-bancos.py
node herramientas/revisar-producto.mjs
```

Y desde `remotion/`: `npm run lint` (eslint + tsc) y `npx remotion still src/index.ts Prueba out/prueba.png`.

- `revisar-catalogo.mjs`: toda ficha del catálogo de gráficos tiene ruta y toda ruta tiene ficha (el catálogo se **deriva** del código con `generar-catalogo.mjs`, no se edita a mano).
- `revisar-marca.mjs`: los invariantes de identidad que el compilador no ve (que dos marcas coexisten, que el registro compartido es una sola verdad, que el orden de `PIEZAS` no se movió).
- `revisar-plan.mjs` sin argumento valida la demo de noticias; con un plan, ese plan. `revisar-velo.mjs` prueba que la regla `veloProtege` avisa cuando falta el velo sobre metraje.
- `revisar-bancos.py`: el pipeline de b-roll, sin red.
- `revisar-producto.mjs`: que ningún archivo compartido cite rutas del estudio ni cadenas privadas.

**Antes y después de tocar el motor**, la sonda de frames es el único control visual de no-regresión: captura una tanda de fotogramas con `node manuales/motion-graphics/scripts/sonda-frames.mjs antes`, aplica el cambio, captura `despues` y compara con `node manuales/motion-graphics/scripts/revisar-sonda.mjs antes despues`. Para una comp concreta, `--comps NoticiaDemo --frames 100,700`. Tiene suelo de ruido medido (las comps con vídeo mueven 2-3 frames con delta ≤ 8 por el *seek* del decodificador), y por eso compara con umbral 12; un cambio de color no se le parece.

---

📖 **Antes de montar un vídeo real, lee** [manuales/edicion-video/SKILL.md](manuales/edicion-video/SKILL.md) — o entra directamente por el [director](manuales/director-video/SKILL.md). Si la pieza sale de una noticia, por [video-noticias](manuales/video-noticias/SKILL.md). Si va en el segundo motor, por [motor-hyperframes](manuales/motor-hyperframes/SKILL.md).
