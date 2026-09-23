# 🔁 Remotion → HyperFrames

> Para quien ya sabe montar en el motor de este repo. **No es una guía de migración**: es un diccionario, para escribir en el segundo motor sin volver a aprender a contar el tiempo.
>
> Tres de estas filas no tienen traducción fiel. Están marcadas con ⚠️ y son exactamente las que hay que mirar **antes** de decidir que una pieza va en HyperFrames.

---

## 0. La diferencia que lo ordena todo: **frames → segundos**

En Remotion todo se cuenta en **frames** a un fps declarado en la `<Composition>`. En HyperFrames todo se cuenta en **segundos** y el fps vive en `data-fps` de la raíz.

```
Remotion                          HyperFrames
seg(fps, 2.4)  →  60 frames       data-start="2.4"
frame 200 @ 25 fps                2.4s, y ya
```

No es cosmético: quita el redondeo de en medio y hace que GSAP encaje de nativo (sus tiempos son segundos). Pero se paga en un sitio: **`data-duration × fps` tiene que dar entero**, o el último frame baila. Lo comprueba `revisar-hf.mjs`.

Lo bueno: `motor/segmentos.ts` **ya trabaja en segundos** (`from`/`to`). Es el contrato más fácil de portar del repo.

---

## 1. Estructura

| Remotion | HyperFrames | Notas |
|---|---|---|
| `<Composition width height fps durationInFrames>` | `data-width` · `data-height` · `data-fps` · `data-duration` (**segundos**) en la raíz | `data-fps` **sí** se respeta: verificado, un render sin `--fps` salió a 25. Sin el atributo, el CLI usa 30. |
| `<AbsoluteFill>` | `<div style="position:absolute; inset:0">` | |
| `<Sequence from={60} durationInFrames={125}>` | `class="clip" data-start="2.4" data-duration="5" data-track-index="N"` | Anidar **sí** vale (un wrapper no rompe nada), pero anidar un clip DENTRO de otro clip lo enmascara con la ventana del padre y su `data-start` pasa a ser **relativo** — igual que una `Sequence` dentro de otra. Si no querías eso, aplánalo. |
| `<Series>` | Clips consecutivos en el mismo `data-track-index` | Dos clips del mismo carril **no pueden solaparse**. |
| `<Freeze frame={0}>` | ⚠️ **sin equivalente** | Ver §5. |
| `staticFile("avatar.mp4")` | `./assets/avatar.mp4` | Ruta relativa al `index.html`. |
| z-order por orden de montaje en JSX | `z-index` de CSS | `data-track-index` **no** es orden de pintado. |

---

## 2. Animación

| Remotion | HyperFrames |
|---|---|
| `useCurrentFrame()` | nada — el motor **seekea** la timeline. Los tiempos se escriben al colocar el tween. |
| `interpolate(f, [0,15], [0,1], {extrapolate:"clamp"})` | `gsap.fromTo(el, {opacity:0}, {opacity:1, duration:0.6})` |
| `extrapolateLeft/Right: "clamp"` | **el defecto**. GSAP no extrapola: antes del tween vale el `from`, después el `to`. |
| `extrapolate: "extend"` | no existe. Hay que escribir el tramo. |
| `Easing.out(Easing.cubic)` | `ease: "power2.out"` — ver el aviso de abajo |
| `EASE.outCubic` / `inOutCubic` (`motion.ts`) | `"power2.out"` / `"power2.inOut"` |
| `delay` por `from` de la Sequence | tercer argumento de posición: `tl.to(el, {...}, 1.2)` |
| stagger a mano con `map` + offset | `stagger: 0.08` nativo de GSAP |
| `spring({fps, frame, config})` | ⚠️ `ease: "back.out(1.7)"` — **aproximación**, ver §5 |

> ⚠️ **El `powerN` de GSAP va desfasado uno respecto al grado.** No es una errata: `power1` es la **cuadrática**, `power2` la **cúbica**, `power3` la cuártica. Medido con el GSAP vendorizado, en t=0.5: `power1.out`=0.750 (=1−(1−t)²), `power2.out`=0.875 (=1−(1−t)³), `power3.out`=0.9375 (=1−(1−t)⁴).
> Así que `Easing.cubic` de Remotion es **`power2`**, no `power3`. Traducir "cubic" a "power3" por el nombre es el error natural, y sale un movimiento visiblemente más seco.

**El contador determinista**, que es el gráfico más usado del repo:

```js
// Remotion:  const v = interpolate(f, [0,30], [0,30]);  <span>{Math.round(v)}</span>
const n = { v: 0 };
tl.to(n, {
  v: 30, duration: 1.1, ease: "power1.out",
  onUpdate: () => { document.getElementById("cifra").textContent = Math.round(n.v); },
}, 3.2);
```

Funciona porque GSAP interpola un objeto plano y el `onUpdate` corre en cada seek. **Nada de `setInterval`.**

---

## 3. Media y avatar

| Remotion | HyperFrames |
|---|---|
| `<OffthreadVideo src={staticFile("a.mp4")}>` | `<video id="…" src="./assets/a.mp4" muted playsinline data-start data-duration data-track-index>` |
| `<Video>` con audio | lo mismo + `data-has-audio="true"` |
| `<Img src={staticFile("x.png")}>` | `<img class="clip" src="./assets/x.png" data-start data-duration data-track-index>` |
| `startFrom={f}` (trim) | `data-media-start` — **ese nombre**, no `data-playback-start` (ver contrato §5) |
| `playbackRate` | `data-playback-rate` (0.1–5) |
| WebM con alpha para PiP | igual, y además `npx hyperframes@0.8.47 remove-background a.mp4 -o a.webm` lo genera **en local, sin API** |

**El avatar sigue saliendo de `heygen.py`.** HyperFrames no genera avatares: su CLI no tiene comando de avatar y ningún bloque del registry genera uno. El avatar entra como un `<video>` más. La única diferencia con Remotion: aquí, en render, el vídeo **no se reproduce** — FFmpeg pre-extrae los frames y los inyecta —, así que no hay deriva posible, pero **el `data-fps` de la composición tiene que ser el del clip** (R01 vale igual).

---

## 4. Sonido y subtítulos

| Remotion | HyperFrames |
|---|---|
| `<Audio src={...}>` | `<audio src="./assets/…" data-start data-track-index data-has-audio="true">` |
| `<Audio volume={0.35}>` | `data-volume="0.35"` |
| `<Audio volume={f => …}>` (rampa) | lane de `data-automation` sobre `volume` — *sin verificar aquí* |
| `<PistaSonido duckDb={-4.5}>` (banda ancha) | `data-fx-carve` — ducking **espectral**: hunde solo las bandas de la voz. Distinto y mejor. *Sin verificar aquí.* |
| `cues-NNN.ts` → `<PistaSonido>` | un `<audio>` por cue. El **catálogo y las reglas de elección de [diseno-sonoro](../diseno-sonoro/SKILL.md) valen igual**: lo que cambia es dónde se declara. |
| `subtitulos-NNN.ts` → `<SubtitulosSync>` | un clip por segmento + tween por palabra. `npx hyperframes@0.8.47 transcribe` da timestamps por palabra con Whisper **local**. |

---

## 5. ⚠️ Las tres que no traducen

Estas deciden si una pieza puede ir en HyperFrames. Si tu pieza necesita dos de ellas, **va en Remotion**.

**a) `spring()` — y la ley `muelle` es la entrada más usada del sistema.**
La traducción es una tabla de aproximaciones (`back.out(1.7)` y parientes). La documentación oficial de porte la llama *"the most lossy translation"* y marca dos de sus cuatro mapeos como no validados. **No hay paridad: hay deriva.** Una pieza cuya personalidad sea el rebote del muelle no se ve igual.

**b) `<Freeze frame={0}>` — la reserva de maqueta.**
`PistaGraficos` la usa para ocupar el hueco de un gráfico sin pintarlo aún. En HF, `data-hidden` oculta **también en el render**, así que no reserva nada. Hay que inventar el apaño (un clon con `visibility:hidden` fuera del clip, o reservar con CSS). **Sin resolver.**

**c) Las tablas de avances tipográficos (`plan/avances.ts`).**
Están medidas contra San Francisco, y HyperFrames pinta con **Inter** (contrato §8). Usar esos anchos aquí es validar contra el motor equivocado. Aquí quien mide es la pasada de **layout** de `check`, sobre el DOM real.

### La que SÍ traduce, y estuvo mal escrita aquí: `<CamaraVirtual>`

Esta sección decía que la cámara virtual «choca de frente con el modelo de clips» porque en HF los `.clip` tenían que ser hijos directos de la raíz. **Es falso, y se comprobó midiendo**: un `<div>` que envuelve clips y anima `scale` con GSAP conserva las ventanas temporales de sus hijos **y** les aplica la transformación — que es exactamente lo que hace `<CamaraVirtual>`.

```html
<div id="camara" style="position:absolute; inset:0">   <!-- sin data-start -->
  <video id="avatar" src="./assets/avatar.mp4" muted playsinline
         data-start="0" data-duration="8" data-track-index="0"></video>
</div>
```
```js
tl.fromTo("#camara", { scale: 1, y: 0 }, { scale: 1.16, y: -40, duration: 1.2, ease: "power2.out" }, 2.0);
```

Lo que sigue siendo cierto de la regla de capas: **solo el avatar va dentro de la cámara**; gráficos y subtítulos, fuera ([R09](../edicion-video/reglas.md) vale igual).

Lo que sí cuesta trabajo no es el motor, es el **plan**: `camara-NNN.ts` arrastra hooks de Remotion (`camara.ts` mezcla el dato con el componente), así que los cues existentes no se leen desde aquí sin desacoplarlo antes — la deuda anotada en [SKILL.md §9](SKILL.md). Una cámara **nueva**, escrita a mano en la timeline, no tiene ese problema.

---

## 6. Lo que se salva entero

No todo es pérdida. Lo que cruza sin tocarse:

- **El plan como dato.** `Plan<R,B,M,C>`, `Toma`, `Nodo`, el dialecto, `revisaPlan`, `resuelveMomentos`. Es dato puro y `node` pelado ya lo lee (`revisar-plan.mjs` valida un plan entero sin montar React). No se usa todavía desde este motor, pero **el tipo lo permite**: `Montadores<R, C, N>` es genérico en el nodo de salida, y `ReactNode` es solo una instancia.
- **La marca.** No se copia: se **genera** con `marca-a-css.mjs`. Cambiar `remotion/src/marcas/<canal>.ts` mueve los dos motores.
- **El set de SFX** (`remotion/public/sfx/`) y las reglas de elección de `diseno-sonoro`.
- **El b-roll** y la regla de honestidad de `director-video §3h` — lo real se trae, lo que no existe se genera. Eso no depende del motor.
- **`segmentos.ts`**, que ya está en segundos.

---

## 7. Qué gana HyperFrames que Remotion aquí no tiene

Para que la elección no sea solo una lista de pérdidas:

- **`check` mide, no estima.** Layout con `getBoundingClientRect` sobre 9 muestras y **contraste WCAG sobre los píxeles**. La primera vez que se corrió encontró que el acento de una marca como texto sobre su papel quedaba **por debajo del 3:1**, y eso llevaba en el repo desde siempre sin que nadie lo dijera (caso del estudio: ver ESTUDIO.md; de ahí `--acento-texto` en `marca-a-css.mjs`).
- **`remove-background` local**, sin API ni subida, con salida WebM alpha o ProRes.
- **`transcribe`** con Whisper local a timestamps por palabra.
- **Más de 150 bloques y 220 componentes** instalables de su registry (`npx hyperframes@0.8.47 catalog`; el número crece, míralo tú).
- **Renders reproducibles entre máquinas**: las fuentes van embebidas, no dependen del sistema.
- **Es HTML/CSS.** Cualquiera que sepa CSS puede tocar una pieza sin saber React ni Remotion.
