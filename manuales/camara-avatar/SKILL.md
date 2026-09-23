---
name: camara-avatar
description: >-
  Cámara virtual dinámica para vídeos con avatar (talking-head, p. ej. de
  HeyGen) en Remotion: cuando el avatar es el elemento principal, no lo dejes
  todo el vídeo en el mismo tamaño y posición. Genera variaciones sutiles
  (acercamientos, alejamientos, reencuadres laterales, «hacer espacio»)
  MOTIVADAS por la narrativa —intención de la frase, importancia, ritmo, cambios
  de sección, entrada de motion graphics— para retener la atención sin marear.
  Cubre tipos de plano, zoom in/out, reencuadre y el acople zoom↔desplazamiento
  del cover, continuidad/match cuts, capas (avatar dentro de la cámara;
  subtítulos y gráficos fuera), reposo bajo gráficos a pantalla completa, sonido
  de cámara (whoosh/impact/riser al mínimo, bajo la voz) y la implementación
  determinista con `CameraCue` + `camara.ts` + `CamaraVirtual`. Úsalo siempre
  que el elemento principal del vídeo sea un avatar talking-head.
metadata:
  type: reference
---

# 🎥 Cámara virtual dinámica para avatar (Remotion)

> **Regla maestra.** La cámara cambia para **recuperar la atención**, **reforzar una idea** o **liberar espacio** — nunca solo "para que no parezca estático". Cada **acercamiento comunica importancia**; cada **alejamiento, contexto**; cada **desplazamiento crea espacio**; cada **pausa permite comprender**. El avatar es la BASE estable; la cámara la reencuadra con intención.
> Antes de cada movimiento responde: **¿coincide con una frase importante? ¿aporta variedad sin distraer? ¿la cara sigue bien encuadrada? ¿no hay ya otro cambio visual fuerte?** Si dudas → **cámara quieta**.

**Cuándo se usa (disparadores):** "cámara del avatar", "cámara virtual", "zoom del avatar", "acercar/alejar avatar", "reencuadre", "plano medio/primer plano", "punch in", "que no se vea estático", "mover la cámara", "cámara dinámica", "CameraCue".

Motor: `remotion/src/motor/camara.ts` (tipo `CameraCue` · tokens `SHOT`/`LIMITS` · hook `useCamara` · `clampOffset`) · wrapper `remotion/src/motor/CamaraVirtual.tsx` · plan de ejemplo: el `planCamara` de §10 (alineado a las tomas de `remotion/src/motor/demos/graficos-demo.ts`) · demo viva: comp **`DemoCamara`** del Studio (cámara virtual sobre `remotion/public/avatar.mp4`, el clip de relleno que genera `setup.mjs` si falta; no va versionado, así que sustituirlo por el tuyo con el mismo nombre es seguro y la comp se ajusta sola).
🔗 **Gráficos:** [motion-graphics](../motion-graphics/SKILL.md) ([R08](../edicion-video/reglas.md) fuera de la cara). · **Sonido:** [diseno-sonoro](../diseno-sonoro/SKILL.md) (whooshes de cámara al mínimo). · **Motor y flujo:** [edicion-video](../edicion-video/SKILL.md).

---

## ⚠️ Invariante del cover (leer primero)

El avatar es un `<OffthreadVideo … objectFit:"cover">` que a **`scale` 1.0 ya llena el frame EXACTO**. De ahí dos reglas que el motor (`camara.ts`) garantiza —y que rompen la intuición de una cámara "real":

1. **`scale` nunca baja de 1.0.** El "plano abierto" de un cover **no** es `scale < 1` (mostraría bordes negros); es la **base 1.0**. Para "abrir" de verdad, aleja *desde* un plano más cerrado hacia 1.0.
2. **Desplazamiento ACOPLADO al zoom.** Solo puedes mover el encuadre dentro del margen que crea el zoom: a escala `s` hay `(s−1)·W/2` px de margen horizontal antes del borde. `clampOffset()` lo recorta. **Un desplazamiento grande exige más zoom** — para el 14 % del ancho (151 px @1080) necesitas `scale ≳ 1.28`.

`useCamara(cues)` aplica ambas y devuelve un `transform` seguro. No animes `top/left/width/height`: solo `translate3d + scale`.

---

## 1. Tipos de plano (token `SHOT`)

| Plano | `scale` | Uso | Nota |
|---|---|---|---|
| **wide** | **1.00** | base / respiración visual | el cover llena exacto; no bajar de 1.0 |
| **medium** | 1.05–1.12 | encuadre principal de explicación | el "hogar" al que se vuelve |
| **close** | 1.15–1.28 | frase importante, emoción, pregunta, CTA | destaca |
| **detail** | 1.30–1.35 | solo hooks / máxima importancia | tope duro 1.35 |

`escalaDe(shot)` da el valor medio. **Nunca** cruces `LIMITS.scaleMax = 1.35`: por encima corta rostro, cabeza o manos.

---

## 2. Acercar (zoom in) y alejar (zoom out)

**Acercar** cuando el avatar: empieza una frase importante · presenta un beneficio · hace una afirmación fuerte · plantea una pregunta · introduce el CTA. El zoom debe **empezar un pelo antes** de la palabra clave, llegar al máximo **durante** la frase y **mantenerse estable** al cerrar la idea. Easing suave, sin brusquedad.

**Alejar** cuando: termina una idea · empieza una explicación amplia · aparece info adicional · hay que liberar espacio para un gráfico · bajar la intensidad tras un momento fuerte · preparar el siguiente acercamiento.

| Movimiento | `scale` | Duración (s) | @25fps | @30fps | Easing |
|---|---|---|---|---|---|
| Zoom in estándar | 1.00 → 1.15 | 0.8–1.8 | 20–45 | 24–54 | `ease-out` / `ease-in-out` |
| Zoom in hook fuerte | 1.00 → 1.22 | 0.5–1.0 | 13–25 | 15–30 | `ease-out` |
| Zoom out | 1.15 → 1.00 | 0.8–1.5 | 20–38 | 24–45 | `ease-in-out` |

Duración en frames = `Math.round(s · fps)` (helper `seg` de `remotion/src/motor/motion.ts`). **No** encadenes primeros planos fuertes sin reposo entre ellos.

---

## 3. Reencuadre lateral y "hacer espacio"

No mantengas al avatar siempre centrado cuando entra texto/gráfica. **Recuerda el acople** (§Invariante): un desplazamiento exige zoom que lo permita.

- Gráfico a la **derecha** → desplaza el avatar a la **izquierda** (`endX` negativo). Y viceversa.
- Rango: **4 %–14 %** del ancho/alto (`LIMITS.panPctMax = 0.14`); `clampOffset` no deja pasarse.
- Mantén el rostro en zona segura, la mirada hacia el contenido y equilibrio en la composición. **No** zigzaguees al avatar en cada frase.

**En 9:16 de este sistema** los motion graphics viven en la **franja superior**, sobre la cabeza ([R08](../edicion-video/reglas.md)) — o son **tomas a pantalla completa**. Así que "hacer espacio" aquí suele ser **bajar un poco el avatar + zoom suave** para abrir *headroom* bajo el overlay superior (p. ej. un CTA en la franja alta), o **subirlo un poco** cuando el bloque cuelga de la banda de subtítulos (moldes `sello`/`cta`), no un paneo lateral largo. El reencuadre lateral fuerte es sobre todo un recurso de **16:9** (avatar a un lado, gráfico al otro).

**Combinado** (siempre pequeño): `scale 1.00→1.12` **+** `translateX 0→−40` **+** `translateY 0→−10`. Nunca combines a la vez zoom fuerte + paneo largo + rotación + shake + desenfoque.

---

## 4. Cámara según la narrativa

| Momento | Movimiento | Detalle |
|---|---|---|
| **Hook (0–3 s)** | medium → close moderado | acercamiento corto en la 1.ª frase; cambia el encuadre **antes de los 3–5 s** |
| **Pregunta** | zoom in sutil + pausa | mantén breve reposo visual tras la pregunta |
| **Beneficio principal** | close | acerca y **reduce** movimientos secundarios |
| **Explicación extensa** | medium / wide | libera espacio para gráficos; cámara calmada |
| **Cambio de sección** | cambia el encuadre | medium↔wide · centro→lateral · close→zoom out |
| **CTA** | acercamiento progresivo | avatar **estable** durante la frase final |

Los cambios coinciden con el **ritmo del discurso**. Prioriza variación en: primeros 3 s · preguntas · datos · cambios de tema · frases emocionales · objeciones · beneficios · antes/después · revelaciones · CTA. **No** cambies de plano en medio de una palabra.

---

## 5. Frecuencia (no estática, pero no en movimiento constante)

| Estilo | Cambio visual cada | Intensidad de cámara |
|---|---|---|
| **Redes sociales** | 2–5 s | zooms rápidos pero controlados; alterna avatar/texto/B-roll |
| **Educativo** | 4–8 s | reencuadres para liberar espacio; zoom in en conceptos |
| **Corporativo** | 5–10 s | zooms suaves, desplazamientos pequeños, sin shakes |
| **Cinematográfico / lujo** | 6–12 s | movimientos lentos, muy sutiles, aterrizajes suaves, sin rebote |
| **Cómico** | según gag | punch in/out repentino, pausa visual |

Un "cambio visual" también es: entrada de texto, gráfica, B-roll, cambio de fondo o transición. **Si ya hay uno fuerte (o un gráfico a pantalla completa), la cámara REPOSA** — no sumes movimiento (§7 y el `planCamara` de §10).

---

## 6. Continuidad y match cuts

Entre cues la cámara **se queda donde aterrizó** el último (lo hace `useCamara`); antes del primero, en identidad. Al cambiar de encuadre conserva: posición/dirección de la mirada, iluminación, fondo, escala lógica, movimiento continuo y **sincronización labial**. Evita saltos donde la cabeza cambie de golpe. Para un cambio rápido: motion blur sutil, whip muy corto, corte sobre movimiento o transición de escala — **nunca** algo que rompa el lip-sync.

---

## 7. Capas: qué se mueve y qué no

**Solo el avatar va dentro de `<CamaraVirtual>`.** Subtítulos y motion graphics son **overlays fijos, FUERA** de la cámara: cuando el avatar se desplaza para hacer espacio, el gráfico se queda anclado.

```tsx
<AbsoluteFill>
  <CamaraVirtual cues={planCamara}>
    {/* SOLO el avatar va dentro: tu clip, en remotion/public/ */}
    <OffthreadVideo src={staticFile("avatar.mp4")}
      style={{ width: "100%", height: "100%", objectFit: "cover" }} />
  </CamaraVirtual>
  {/* overlays FUERA de la cámara: no se mueven con ella */}
  <PistaGraficos plan={planGraficos} montadores={MONTADORES_BASE} />
  <SubtitulosSync segmentos={subtitulos} yPct={70} />
</AbsoluteFill>
```

`PistaGraficos` y `MONTADORES_BASE` vienen de `motor/graficos/PistaGraficos`; `SubtitulosSync`, de `motor/SubtitulosSync` (recibe los segmentos `{from, to, text}` en segundos de la transcripción).

**B-roll / gráficos a pantalla completa:** el avatar no ocupa toda la pantalla todo el vídeo. Alterna: avatar full · avatar desplazado con texto · avatar pequeño sobre B-roll · avatar en tarjeta/split · gráfico full · regreso al avatar **con acercamiento suave**. Mientras un gráfico full está en pantalla, **la cámara del avatar reposa** (no se ve). En un plan de gráficos, las tomas de molde `pantalla` (`cubre: true`) desmontan al avatar: **no pongas `CameraCue` en esas ventanas**. `graficos-demo.ts` no tiene ninguna (el avatar se ve los 300 frames) y por eso el `planCamara` de §10 puede moverse en toda la pieza; `plan-demo.ts` sí cubre en `d02-dato` (78–168), y un plan de cámara para él reposaría ahí.

---

## 8. Sonido de cámara (delegado a `diseno-sonoro`)

Los movimientos se acompañan de SFX **sutiles, más sentidos que escuchados**, y **siempre por debajo de la voz**. Enlaza cada `CameraCue.soundCueId` con un `SoundCue` de `remotion/src/motor/sound/cues.ts` (lo reproduce `PistaSonido`).

| Movimiento de cámara | `type` / `variant` | Bucket (mezcla) |
|---|---|---|
| Zoom in rápido | `whoosh` / `light` (o `whip`) | `whoosh` (−27 dBFS) |
| Zoom out | `whoosh` / `reverse` (o `light`) | `whoosh` |
| Reencuadre lateral | `whoosh` / `swoosh` + `direction` | `whoosh` |
| Cambio de plano importante | `impact` / `deep` (suave) | `impact` (−27 dBFS) |
| Cambio cinematográfico | `riser`/`low-rumble` + `whoosh` + `impact` discreto | mixto |

Whooshes e impacts de cámara van **aún más bajos** que el resto de SFX y con **ducking** bajo narración (`DUCK_DIALOGUE_DB`). **Nunca** un whoosh fuerte en cada cambio. Mezcla y variantes: [diseno-sonoro §10](../diseno-sonoro/SKILL.md).

---

## 9. Intensidad por estilo

**Corporativo** zooms suaves, desplazamientos pequeños, sin shake. · **Educativo** reencuadres para liberar espacio, zoom in en conceptos, zoom out para diagramas. · **Redes** cambios más frecuentes, zooms rápidos controlados. · **Lujo** movimientos lentos, zooms muy sutiles, pocos cambios, aterrizajes suaves, sin rebote/whip agresivo. · **Cinematográfico** zooms largos, parallax sutil, profundidad, movimiento ambiental lento. · **Cómico** punch in/out repentino, pausa visual, record scratch opcional.

---

## 10. `CameraCue` e implementación (determinista)

Tipo real en `remotion/src/motor/camara.ts` (`reason` **obligatorio**; si no lo justificas, no lo pongas):

```ts
type CameraCue = {
  id: string; startFrame: number; endFrame: number;
  shot: "wide" | "medium" | "close" | "detail";
  startScale: number; endScale: number;
  startX: number; endX: number; startY: number; endY: number;   // px @ resolución comp
  easing: "linear" | "ease-in" | "ease-out" | "ease-in-out" | "spring";
  purpose: "hook" | "emphasis" | "question" | "explanation" | "make-space" | "transition" | "reveal" | "cta";
  soundCueId?: string; reason: string;
};
```

Escribe el plan con el builder `cam()` (como `cue()` para el sonido). Este es el **plan de ejemplo** del skill: 9:16 · 25 fps · 300 f, alineado a las cinco tomas de `remotion/src/motor/demos/graficos-demo.ts` (gancho 8–70 · dato 78–150 · lista 155–235 · CTA 240–300), que es la pieza que montan las demos del producto. Cópialo a `remotion/src/proyectos/NNN/camara-NNN.ts` y cambia los frames por los de TU transcripción:

```ts
import { cam, CameraCue } from "../../motor/camara";

export const planCamara: CameraCue[] = [
  // Gancho (toma g01, 8–70): acercamiento corto durante la primera frase.
  cam("cam-hook", 0, 18, "close", { s: 1.0 }, { s: 1.16, y: -6 }, "ease-out", "hook",
    "El acercamiento refuerza la primera frase y crea un cambio visual en los primeros segundos.",
    { soundCueId: "cam-whoosh-hook" }),
  // Vuelve a plano medio para explicar: descansa la vista antes del dato.
  cam("cam-settle", 55, 80, "medium", { s: 1.16, y: -6 }, { s: 1.06, y: 0 }, "ease-in-out", "explanation",
    "Alejar tras el gancho da contexto y prepara el siguiente acercamiento."),
  // Dato (g02, 78–150): el contador manda; la cámara espera a que aterrice (≈f118 = 78 + 40 f de cuenta) y entonces subraya.
  cam("cam-dato", 118, 136, "close", { s: 1.06 }, { s: 1.14 }, "ease-out", "emphasis",
    "Un acercamiento leve cuando la cifra aterriza pone la cara y el dato en la misma frase."),
  // Lista (g03, 155–235): el sello cuelga de la banda de subtítulos → abre aire subiendo un poco.
  cam("cam-lista", 150, 172, "medium", { s: 1.14 }, { s: 1.04, y: -8 }, "ease-in-out", "make-space",
    "Alejar y subir un poco deja la cara clara del bloque que cuelga de la banda de subtítulos."),
  // CTA (g04, 240–300): acercamiento progresivo y avatar estable en la frase final.
  cam("cam-cta", 240, 268, "close", { s: 1.04, y: -8 }, { s: 1.18, y: -10 }, "ease-out", "cta",
    "El acercamiento final concentra la atención en la única acción que se pide.",
    { soundCueId: "cam-whoosh-cta" }),
];
```

Cinco cues en doce segundos es el tope para un ritmo de redes (§5); entre cues la cámara se queda donde aterrizó (§6). Los `soundCueId` enlazan con los `SoundCue` de la pieza (§8). La comp **`DemoCamara`** monta el mismo gesto sobre `remotion/public/avatar.mp4`, con los frames al fps y la duración de ese clip.

`useCamara` deriva todo de `useCurrentFrame()`/`useVideoConfig()` (fps y W/H reales de la comp — avatar 9:16 = **25 fps**, 16:9 = **30 fps**), interpola `scale`/`x`/`y`, aplica `clampOffset` y devuelve el `transform`. **Prohibido** para el movimiento: CSS `animation`/`transition`, timers, estado async, `Math.random()` sin sembrar (rompen el determinismo entre renders).

---

## 11. Límites (lo que NO se hace)

Mover la cámara continuamente · cambiar de plano en cada oración · zooms agresivos sin motivo · acercarse tanto que corte ojos/boca/cabeza/manos · desplazamientos que saquen la cara de la zona segura · combinar zoom + rotación + shake a la vez · whoosh fuerte en cada cambio · cualquier movimiento que afecte el lip-sync · cambios aleatorios entre renders · **mover la cámara mientras el espectador lee un texto largo** · moverla cuando ya hay un gráfico full o un cambio visual fuerte.

---

## 12. Validación y puntuación (/100)

Antes de aprobar cada movimiento: ¿coincide con una frase importante? ¿aporta variedad sin distraer? ¿la cara queda bien encuadrada (render un frame, [R05](../edicion-video/reglas.md))? ¿hay espacio para los gráficos? ¿es coherente con el movimiento anterior (continuidad)? ¿se mantiene el lip-sync? ¿el sonido de transición es bajo? ¿ya hay otro cambio visual ahí? **¿la escena sería mejor con la cámara quieta?**

Motivación 25 · Encuadre/seguridad de la cara 20 · Continuidad/match cut 15 · Timing/easing 15 · Coordinación con gráficos y reposo 10 · Sonido bajo la voz 8 · Determinismo 5 · Sutileza (sin marear) 2.

| Penalización | Motivo |
|---|---|
| −15 | corta cara/cabeza/manos, o bordes negros (scale<1 / pan sin zoom) |
| −12 | movimiento sin motivo narrativo |
| −10 | cámara en movimiento sobre texto largo o gráfico full |
| −8 | salto de continuidad / lip-sync afectado |
| −6 | zoom demasiado brusco (sin easing) |
| −5 | whoosh de cámara por encima de la voz |

**Bandas:** `90–100` excelente · `80–89` bueno · `70–79` funcional/genérico · `<70` rediseñar. No apruebes < 80 sin explicar sus límites.

---

## 13. Formato de respuesta por escena (obligatorio)

Antes de escribir código, entrega por escena: `MOMENTO NARRATIVO · MOVIMIENTO (shot→shot, scale, x, y) · DURACIÓN (s→frames al fps de la comp) · EASING · PROPÓSITO · SONIDO (soundCueId + intención; mezcla → diseno-sonoro) · CAPAS (qué queda fuera de la cámara) · CONTINUIDAD con el cue anterior · REASON · RIESGOS (encuadre/lip-sync) · PUNTUACIÓN`. Luego: plan de cues (`CameraCue[]`) → wrap del avatar en `<CamaraVirtual>` → validación con frames reales.

---

## ✅ Cómo verificar un plan de cámara

Un comando por línea, desde `remotion/`:

```bash
npm run lint
npx remotion still src/index.ts DemoCamara out/cam-hook.png --frame=12
npx remotion still src/index.ts DemoCamara out/cam-medio.png --frame=60
npx remotion still src/index.ts DemoCamara out/cam-cta.png --frame=80
```

- `npm run lint` (eslint + `tsc`) tiene que estar en verde: un `CameraCue` sin `reason` o con un `purpose` inventado no compila.
- Los tres stills son los de [R05](../edicion-video/reglas.md): la entrada, la mitad y la salida de un movimiento. Cambia `DemoCamara` por tu comp y los `--frame` por los de tus cues. Mira en cada uno: la cara entera y dentro de la zona segura, cero borde negro (si lo hay, el cue pedía `scale < 1` o un desplazamiento mayor que el margen del zoom: `useCamara` lo recorta, pero el plan estaba mal escrito), y los subtítulos/gráficos quietos mientras el avatar se mueve.
- La cámara es una capa opcional y por proyecto: una comp sin `<CamaraVirtual>` no cambia ni un píxel.
