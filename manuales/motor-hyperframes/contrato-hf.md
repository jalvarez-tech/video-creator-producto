# 📐 El contrato de HyperFrames

> La referencia dura. Lo que hay que escribir bien **la primera vez**, porque la mitad de estos fallos no se ven en el frame: se ven tres días después, cuando alguien vuelve a renderizar.
>
> Verificado ejecutando el CLI (**v0.7.107**, en macOS), no leyendo el fuente. `render-hf.mjs` fija hoy la **0.8.47**. Lo que no se ha comprobado va marcado como tal.

---

## 1. La forma mínima

Una composición es **un HTML**. No hay bundler, no hay React, no hay JSX. El DOM declara el tiempo con atributos `data-*` y la animación es **una timeline de GSAP pausada** que el motor **seekea** frame a frame.

```
proyectos/NNN/hf/
  index.html      la composición
  marca.css       GENERADO desde src/marcas/<canal>.ts
  vendor/         GSAP vendorizado
  assets/         MP4, WAV, PNG que use la pieza
```

Se abre con `node manuales/motor-hyperframes/scripts/nuevo-hf.mjs NNN --canal <canal>`, que deja las cuatro cosas puestas. La plantilla de la que sale está en `manuales/motor-hyperframes/plantilla/index.html` y **está renderizada y mirada**, no es pseudocódigo.

---

## 2. La raíz

| Atributo | ¿Obligatorio? | Qué es |
|---|---|---|
| `data-composition-id` | sí | ID único. **Es la clave de `window.__timelines`** — tienen que coincidir exactamente. |
| `data-start="0"` | sí | Sin él, lint: `root_composition_missing_data_start`. |
| `data-width` / `data-height` | sí | El lienzo, en px. |
| `data-duration` | en la práctica sí | **La duración del render, en SEGUNDOS.** |
| `data-fps` | no, pero aquí sí | El fps. Sin él, `render` usa **30**. |

Tres cosas que cuestan una tarde si no se saben:

**a) La raíz tiene que ser una caja con tamaño real** (`width`/`height` en px, `position: relative`). Si algún ancestro no tiene altura resuelta, un hijo con `height:100%` colapsa a ~0 y todo el contenido se apila en la esquina superior izquierda. Ni `lint` ni `check` lo cazan siempre: **mira un `snapshot`**.

**b) El fondo NUNCA va en `#root`.** Va en un hijo full-bleed (`position:absolute; inset:0`). El compositing del producer puede tirar el `background` del propio elemento raíz y **el frame sale negro** — aunque `preview` y `snapshot` lo enseñen bien. Es el fallo más caro del contrato porque solo aparece en el MP4.

**c) `data-duration` se lee ANTES de que corra ningún script.** No la puede cambiar una variable ni un `--variables`. Y no existe un flag `--duration`: la duración es ese atributo y punto.

> **Duración en frames enteros.** `data-duration × fps` tiene que dar entero. Si no, el render redondea y la última toma queda corta o larga por un frame — justo donde caen los remates de sonido. Lo comprueba `revisar-hf.mjs`.

---

## 3. Los clips

| Atributo | Qué es |
|---|---|
| `id` | Único **en toda la página ensamblada**. Dos `<video>`/`<img>` con el mismo id renderizan **en blanco**: el producer inyecta los frames con `getElementById`. |
| `data-start` | Cuándo entra, en **segundos**. |
| `data-duration` | Cuánto dura visible, en **segundos**. |
| `data-track-index` | El carril. **NO es orden de pintado.** |
| `class="clip"` | Obligatoria en los clips de DOM y de imagen. Es lo que le da al runtime el control de su ventana de visibilidad. |

Cuatro reglas:

1. **Lo que registra un clip son sus atributos, no su sitio en el árbol.** El runtime recoge `document.querySelectorAll("[data-start]")` —descendientes a cualquier profundidad— así que **un clip dentro de un wrapper funciona**: conserva su ventana temporal y además hereda el `transform` del wrapper.
   Lo que sí cambia las cosas es anidar un clip **dentro de otro elemento que también tenga `data-start`**: entonces el runtime lo enmascara con la ventana del ancestro (nunca se ve fuera de ella) y su `data-start` pasa a leerse **relativo** al host. Eso es una herramienta —timing relativo—, no un accidente; pero si no lo buscabas, es un clip que no aparece.
   > **Medido**, no leído: tres clips idénticos con `data-start="2" data-duration="2"` — uno hijo directo, uno dentro de un `<div>` con un tween de `scale`, y uno dentro de un clip de `data-start="0" data-duration="1"`. En el MP4, a t=0.4 s no se ve ninguno; a t=3 s se ven los dos primeros (**el segundo, escalado por su wrapper**) y el tercero no. Es exactamente el caso de `<CamaraVirtual>`, y funciona.
   >
   > Aun así, **la plantilla los pone a primer nivel**: no por obligación, sino porque el mapa de clips del §6 de la skill se lee de un vistazo cuando el HTML es plano.
2. **El carril no es la z.** `data-track-index` sirve para que dos clips no se solapen en el tiempo; el orden de pintado es `z-index` de CSS. Dos clips en el mismo carril **no pueden solaparse temporalmente**.
3. **El `<video>` no lleva `class="clip"`.** Su visibilidad la gestiona el runtime de media.
4. **`data-hidden` oculta también en el render**, no solo en preview. No sirve como "reservar el hueco sin pintarlo" (ver `equivalencias.md` § `<Freeze>`).

---

## 4. La timeline

**Una sola**, pausada, construida **síncronamente** al cargar la página, registrada con la clave = `data-composition-id`:

```js
window.__timelines = window.__timelines || {};
const tl = gsap.timeline({ paused: true });
// …tweens…
window.__timelines["p001"] = tl;
```

- La duración del render la manda `data-duration` de la raíz, **no** el largo de la timeline.
- El estado inicial va **dentro del tween** (`gsap.fromTo`). Emparejar un `transform` inicial en CSS con un tween de GSAP sobre esa misma propiedad es error de lint: `gsap_css_transform_conflict`.
- **GSAP no extrapola.** Un `fromTo` equivale a `interpolate(..., {extrapolate:"clamp"})` de Remotion: antes del tween vale el `from`, después el `to`.
- Nada de `repeat: -1`. Un bucle infinito no tiene frame final.

**Determinismo** (el motor pide los frames en cualquier orden y con **varios workers a la vez** — medidos 6 en macOS):

- ❌ `Date.now()`, `new Date()`, `setTimeout`, `setInterval`
- ❌ `Math.random()` sin sembrar
- ❌ `fetch()` y cualquier red en render — todo carga antes del frame 0
- ✅ Contadores: se interpola un objeto y se escribe el texto en `onUpdate` (ver la plantilla)

`revisar-hf.mjs` mira los siete.

---

## 5. Media

```html
<video id="p001-avatar" src="./assets/avatar.mp4"
       data-start="0" data-duration="8" data-track-index="0"
       muted playsinline></video>
```

| Atributo | Qué es |
|---|---|
| `data-media-start` | Offset **dentro del archivo** (el trim). |
| `data-playback-rate` | 0.1 – 5. |
| `data-volume` | 0 – 1, estático. |
| `data-has-audio="true"` | Declara que ese vídeo **aporta audio** a la mezcla. |

> ⚠️ **La trampa de los dos nombres.** Existen `data-media-start` y `data-playback-start` y **no las leen los mismos lectores**. En `<video>` y `<audio>` usa **`data-media-start`**: el mezclador de audio solo lee ese, y un vídeo escrito con `data-playback-start` sale con **la imagen recortada sobre el audio sin recortar**. `data-playback-start` es el nombre de los hosts de sub-composición.

**El motor es el dueño de la reproducción.** Prohibido llamar a `play()`, `pause()` o tocar `currentTime`. En render el `<video>` ni siquiera se reproduce: FFmpeg pre-extrae los frames y los inyecta como `<img>`, así que **no hay deriva de lip-sync posible** — a cambio, el fps de la composición tiene que ser el del clip.

**Alpha sí funciona:** WebM/VP9, VP8 y ProRes se decodifican con el decodificador alpha-aware y los frames se extraen como PNG para no perder la transparencia. Y hay recorte de fondo **local, sin API ni subida**:

```bash
npx hyperframes@0.8.47 remove-background proyectos/NNN/hf/assets/avatar.mp4 -o proyectos/NNN/hf/assets/avatar.webm
```

---

## 6. Sonido

Un `<audio>` es un clip más: `data-start` es **cuándo suena**.

```html
<audio id="sfx-titular" src="./assets/whoosh.wav"
       data-start="0.3" data-track-index="10"
       data-volume="0.35" data-has-audio="true"></audio>
```

**Verificado**: con dos `<audio>` (dos WAV copiados de `remotion/public/sfx/` a `assets/`), el render sale con pista **AAC 48 kHz estéreo** y `hasAudio: true`. Los efectos se eligen con las mismas reglas de [diseno-sonoro](../diseno-sonoro/SKILL.md); lo único que cambia es dónde se declaran.

**El ducking existe y es mejor que el de aquí.** HyperFrames trae *voiceover carve*: en vez de bajar todo el lecho musical, mide las bandas que ocupa la voz y hunde **solo esas**, con envolvente dinámica. Se escribe como `data-fx-carve` + `data-fx-chain` + lanes de `data-automation`. Es otra cosa que el `duckDb: -4.5` de banda ancha de `PistaSonido`.

> **Sin verificar:** el carve no se ha ejecutado en este repo. Lo que está probado es que `<audio>` con `data-volume` estático entra en la mezcla. Antes de prometer ducking en una pieza, pruébalo — la skill `/hyperframes-audio` tiene el detalle.

---

## 7. Las puertas

**Dos, y ninguna sustituye a la otra:**

```bash
node manuales/motor-hyperframes/scripts/revisar-hf.mjs 001
npx hyperframes@0.8.47 check proyectos/001/hf
```

La primera son los invariantes del repo; la segunda, los píxeles.

`check` corre cinco pasadas: **lint** (estructura), **runtime** (Chrome headless, errores JS y assets), **layout** (medido con `getBoundingClientRect`), **motion** y **contraste WCAG**. Es más de lo que hace `revisaPlan` en el otro motor, porque mide en vez de estimar.

> ⚠️ **Un lint en rojo apaga las pasadas profundas, y parece verde.** Medido: con un error de lint el resultado fue `Layout 0 issues across 0 sample(s)` y `Contrast 0/0 text checks pass`. Cero muestras **no es cero problemas**. Si ves un 0 donde antes había 9, mira el lint antes de celebrar.

> ⚠️ **`lint` no ignora los comentarios HTML.** Un `<audio>`/`<video>`/`<img>` **comentado** que apunte a un archivo inexistente falla igual con `audio_src_not_found`. No dejes ejemplos comentados con rutas falsas — ni el nombre del archivo en un comentario.

---

## 8. Tipografía — lo que no se puede pedir

**El render no usa San Francisco: pinta con Inter.** HyperFrames tiene un mapa de alias (`helvetica`, `helvetica neue`, `arial` → **Inter**), emite `@font-face` deterministas para las cinco familias del stack apuntando todas al mismo payload de Inter, y antepone `Inter` al `font-family` de la composición. La descarga que se ve en el log (`Fetched 5 font face(s) for "Helvetica Neue"…`) es el mecanismo de caché, no la fuente que acaba pintando.

Dos consecuencias, una buena y una mala:

- ✅ **Los renders son reproducibles entre máquinas.** En Remotion, SF solo existe en macOS.
- ❌ **La letra NO es la misma que en Remotion.** Y por tanto **las tablas de avances medidas de `plan/avances.ts` (`sf500`…`sf800`) no valen aquí**: están medidas contra SF. Usar esos anchos para decidir si un titular cabe en HyperFrames es validar contra el motor equivocado. Aquí quien mide es la pasada de **layout** de `check`, que lo hace sobre el DOM real.

Si algún día se quiere paridad tipográfica entre los dos motores, la vía es la contraria a la intuitiva: no forzar SF aquí, sino **poner Inter también en Remotion** y medir sus avances con `generar-avances.mjs`. Inter existe en las dos máquinas; SF, no.

---

## 9. Coste y red

**El render local es gratis, no pide API key y no habla con servidores de HeyGen.** Verificado: `render` funcionó sin `auth login`.

Lo que sí toca la red:

| Qué | Cuándo | Cómo se apaga |
|---|---|---|
| Telemetría anónima | cada invocación | `HYPERFRAMES_NO_TELEMETRY=1` (ya lo pone `render-hf.mjs`, junto con `HYPERFRAMES_NO_UPDATE_CHECK=1` y `HYPERFRAMES_NO_AUTO_INSTALL=1`) |
| Descarga de fuentes | primer render con una familia nueva | se cachea sola en la caché de usuario de HyperFrames (en macOS/Linux, `.cache/hyperframes/fonts/` dentro de tu carpeta personal; la ruta de Windows no está verificada) |
| GSAP desde jsdelivr | si no lo vendorizas | **vendorizado**: `vendor/gsap-3.14.2.min.js` |

Lo que **sí** cuesta dinero y esta skill no usa: `hyperframes cloud render` (se paga por crédito), `publish`, y las voces/música hospedadas de HeyGen.

---

## 10. Lo que este contrato no cubre

- **Sub-composiciones** (`data-composition-src` + `<template>`). Existen y sirven para trocear una pieza larga. Traen sus propias trampas —el runtime solo clona el contenido del `<template>`, así que `<style>` y `<script>` van **dentro**; y el `data-composition-id` del host tiene que ser **idéntico** al del template, sin sufijos—. No se han usado aquí todavía. Si hacen falta: skill `/hyperframes-core` → `references/sub-compositions.md`.
- **Variables** (`data-composition-variables` + `--variables`/`--batch`). Es la vía para renderizar N versiones de la misma pieza cambiando textos. Sin probar.
- **Los otros runtimes** (Lottie, Three.js, Anime.js, WAAPI). GSAP es el adaptador principal y el único que se ha usado.
