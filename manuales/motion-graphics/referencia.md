# 📚 Referencia — Dirección de motion graphics y diseño sonoro en Remotion

> Teoría completa detrás del skill operativo [`SKILL.md`](SKILL.md). Aquí está el "por qué" extendido; en el SKILL, el "qué hacer" resumido. El **sonido** se resume aquí y vive completo en [`diseno-sonoro/SKILL.md`](../diseno-sonoro/SKILL.md) + [recetario por motion graphic](../diseno-sonoro/recetario-motion-graphics.md).

**Identidad.** Actúa como director senior de motion graphics + diseñador visual + animador + editor + diseñador sonoro. Tu trabajo **no** es "añadir animaciones y efectos": es convertir cada escena en una composición **clara, coherente y profesional**, donde el diseño define qué se ve, la animación cuándo y cómo, el sonido qué se siente, y la narrativa por qué existe cada elemento.

---

## Índice

1. [Principio maestro](#1-principio-maestro) · 2. [Entradas y salidas](#2-entradas-y-salidas) · 3. [El plan de escena](#3-el-plan-de-escena-motionsceneplan) · 4. [Proceso (4 fases)](#4-proceso-obligatorio) · 5. [Jerarquía de movimiento](#5-jerarquía-de-movimiento) · 6. [Los principios de animación](#6-principios-de-animación) · 7. [Timing](#7-timing) · 8. [Easing y spring](#8-easing-y-spring) · 9. [Stagger y coreografía](#9-stagger-y-coreografía) · 10. [Continuidad y causalidad](#10-continuidad-y-causalidad) · 11. [Tipografía cinética](#11-tipografía-cinética) · 12. [Composición](#12-composición) · 13. [Color](#13-color) · 14. [Presets visuales](#14-presets-visuales) · 15. [Reglas por motion graphic](#15-reglas-por-motion-graphic) · 16. [Diseño sonoro (puente)](#16-diseño-sonoro-puente) · 17. [Implementación en Remotion](#17-implementación-en-remotion) · 18. [Rendimiento](#18-rendimiento) · 19. [Accesibilidad](#19-accesibilidad) · 20. [Reglas prohibidas](#20-reglas-prohibidas) · 21. [Calidad](#21-evaluación-de-calidad) · 22. [Formato de respuesta](#22-formato-de-respuesta) · 23. [Validación final](#23-validación-final)

---

## 1. Principio maestro

```text
DISEÑO     → determina qué debe llamar la atención.
ANIMACIÓN  → determina el orden y la forma de aparición.
SONIDO     → refuerza movimiento, impacto, tensión y materialidad.
NARRATIVA  → determina qué recursos deben utilizarse.
```

No agregues una animación o un sonido porque exista un corte, un texto o un gráfico. Antes de agregar **cualquier** recurso responde: ¿qué función narrativa cumple? · ¿qué ayuda a comprender? · ¿qué emoción produce? · ¿cuál es el frame más importante? · ¿la escena mejora realmente? Sin respuesta clara → no lo agregues. El resultado debe sentirse **diseñado por un profesional**, no generado por efectos aleatorios.

**Objetivo por vídeo:** identificar el mensaje central → dividir en escenas → diseñar composición sólida → jerarquía clara → animaciones con intención → movimientos físicamente creíbles → sonidos coherentes → sincronizar por frames → consistencia → no sobrecargar → legibilidad/rendimiento/accesibilidad → explicar las decisiones.

---

## 2. Entradas y salidas

**Puedes recibir:** guion, narración, subtítulos, imágenes, vídeos, logos, íconos, datos, gráficas, colores/tipografías de marca, banco de SFX, música, instrucciones de estilo, formato (horizontal/vertical/cuadrado), duración, FPS y componentes de Remotion existentes. **Analiza los recursos disponibles antes de construir.** No inventes elementos de marca que contradigan lo suministrado (en este repo: el perfil `remotion/src/marcas/<canal>.ts` —`remotion/src/marcas/ejemplo.ts` es la plantilla—; los logos y fuentes propios del canal, en la carpeta del proyecto).

**Debes producir:** plan de escenas → tokens de movimiento (`motion.ts`) → cues de sonido (`sound/cues.ts`) → estructura de componentes → código Remotion → validación.

---

## 3. El plan de escena (`MotionScenePlan`)

Ayuda de **planificación** (no es un tipo del repo; el tipo que sí existe y se implementa es `SoundCue` en `sound/cues.ts`). Cada escena:

```ts
type MotionScenePlan = {
  id: string;
  purpose: 'hook' | 'introduce' | 'explain' | 'compare' | 'demonstrate'
         | 'reveal' | 'transition' | 'conclude' | 'cta';
  message: string;
  startFrame: number;
  durationInFrames: number;
  primaryElement: string;
  supportingElements: string[];               // máx. 2 relevantes
  visualStyle: 'clean' | 'corporate' | 'technological' | 'cinematic' | 'lujo'
             | 'educational' | 'energetic' | 'organic' | 'playful' | 'comedic';
  composition: {
    alignment: 'left' | 'center' | 'right';
    focalPoint: { x: number; y: number };
    safeAreaPercentage: number;               // ← de presets.ts: 5 / 11 / 8
    depthLayers: number;
  };
  animation: {
    primaryMotion: string; secondaryMotion?: string; ambientMotion?: string;
    entranceFrames: number; holdFrames: number; exitFrames: number;
    easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'spring';
    staggerFrames?: number;
    overshoot: 'none' | 'subtle' | 'medium' | 'strong';
  };
  typography: { maxLines: number; highlightWords: string[];
    animationUnit: 'phrase' | 'line' | 'word' | 'character'; };
  audio: { cues: SoundCue[] };                // SoundCue REAL de sound/cues.ts
  reason: string;                             // OBLIGATORIO
};
```

`reason` es obligatorio: explica por qué la composición, el movimiento y el sonido son apropiados para el mensaje.

---

## 4. Proceso obligatorio

**Fase 1 · Narrativa.** Qué debe entender/sentir el espectador; qué es principal/secundario; qué acción se espera después; momentos clave. Clasifica cada escena (`HOOK · CONTEXTO · EXPLICACIÓN · DEMOSTRACIÓN · COMPARACIÓN · REVELACIÓN · CONCLUSIÓN · CTA`). **No** diseñes todas con la misma intensidad.

**Fase 2 · Una idea.** 1 mensaje, 1 protagonista, máx. 2 secundarios. Si hay demasiada info, divídela en escenas: no presentes a la vez titular + gráfica + varios íconos + foto + contador + CTA + logo. Conviértelo en **secuencia temporal**.

**Fase 3 · Validar el diseño estático.** Imagina/renderiza el frame principal. Debe funcionar **sin movimiento**: mensaje claro, punto focal, texto legible, jerarquía, alineación, contraste, sin exceso, marca respetada. Si el frame estático no funciona, corrige la composición primero. **No uses animaciones para ocultar un mal diseño.** ([R05](../edicion-video/reglas.md): captura frames de entrada/mitad/salida antes de exportar.)

**Fase 4 · Jerarquía de movimiento.** Clasifica cada movimiento en hero/supporting/ambient (§5) y anímalo.

---

## 5. Jerarquía de movimiento

- **Hero motion** (100 %) — el principal: presentación del producto, aparición del titular, transformación, revelación del resultado, entrada del logo, crecimiento del dato central. **Solo uno a la vez.**
- **Supporting** (40–60 %) — ayuda a comprender el hero: flecha que acompaña un dato, ✓ de confirmación, línea que señala, etiqueta que explica una cifra.
- **Ambient** (10–25 %) — vida sin pedir atención: partículas lentas, gradiente en movimiento, reflejo suave, parallax mínimo, textura orgánica.

Si varios elementos compiten, **reduce el movimiento de todos menos del protagonista**. En este sistema, la [R08](../edicion-video/reglas.md) lo hace literal en vertical: **1 gráfico a la vez** en la franja superior (`y < 340 px` en 1080×1920), con entradas/salidas limpias. En un plan lo imponen la `ventana` de cada toma y `revisaPlan()`, que avisa si dos tomas `hero` se solapan; en JSX a mano, `<Escena>` (`remotion/src/motor/graficos/Entradas.tsx`) da a cada escena su ventana con frames locales, que es lo que encapsula ese hero único.

---

## 6. Principios de animación

**6.1 Anticipación** — preparación breve antes de una acción importante: un botón se comprime antes de activarse; una tarjeta retrocede antes de salir; un elemento reduce escala antes de expandirse; un riser precede al impacto. `ANTICIPACIÓN → ACCIÓN → RESULTADO`. **No** en cada microacción.

**6.2 Staging** — durante el movimiento principal: reduce movimientos secundarios, mantén el fondo estable, reserva el mayor contraste para el protagonista, no animes otros elementos llamativos, no muevas textos largos que deben leerse.

**6.3 Follow-through** — no detengas todo a la vez. La tarjeta aterriza → el ícono termina → el texto se estabiliza → la sombra recupera su posición. Desfases pequeños de **2–5 frames**.

**6.4 Acción secundaria** — refuerza la principal (la cifra aumenta → una flecha sube → un brillo breve). **No** apiles contador + confeti + zoom + partículas + rotación + cambio de color a la vez.

**6.5 Squash & stretch** — para íconos, botones, pops, burbujas, formas elásticas, comedia: `scaleX 1.08 / scaleY 0.92` → vuelve a `1/1`. **No** deformes logos elegantes, contenido corporativo serio, gráficas, textos largos ni productos de lujo.

**6.6 Exageración** — corporativo **baja** · educativo **media** · redes **media-alta** · cómico **alta** · lujo **baja y refinada** · cinemático **alta en escala/profundidad/sonido**.

---

## 7. Timing

`const secondsToFrames = (s, fps) => Math.round(s * fps);` → en el repo es `seg(fps, s)` (`motion.ts`), y las duraciones nombradas están en `DUR`.

| Concepto | Segundos | @25 fps (avatar) | @30 fps (plantillas) |
|---|---|---|---|
| Microacción | 0.10–0.20 | 3–5 | 3–6 |
| Pop pequeño | 0.20–0.33 | 5–8 | 6–10 |
| Entrada rápida | 0.25–0.40 | 6–10 | 8–12 |
| Entrada estándar | 0.35–0.55 | 9–14 | 10–16 |
| Tarjeta / bloque | 0.45–0.75 | 11–19 | 14–22 |
| Hero motion | 0.60–1.00 | 15–25 | 18–30 |
| Revelación dramática | 1.00–2.00 | 25–50 | 30–60 |
| Movimiento ambiental | 2.00+ | 50+ | 60+ |

**Puntos de partida.** Ajústalos al ritmo de la narración y la música. La animación siguiente puede empezar cuando la anterior lleva **60–80 %** completado.

---

## 8. Easing y spring

**Entrada** → `ease-out` (entra rápido, aterriza suave). **Salida** → `ease-in` (empieza lento, acelera). **Reposicionamiento** → `ease-in-out`. **Constante/mecánico** → `linear` solo para barras de progreso, rotaciones mecánicas, marquees, cintas, escáneres, loops de fondo.

En el repo: `EASE.outCubic` = `Easing.out(Easing.cubic)` y `EASE.inOutCubic` = `Easing.inOut(Easing.cubic)`.

**`spring()`** para tarjetas, botones, pops, íconos, escala, aterrizajes, elementos elásticos. **No** en todos los elementos:

```text
Texto informativo → sin rebote o mínimo    Ícono social → overshoot medio
Tarjeta de UI     → overshoot sutil         Elemento cómico → overshoot alto
Logo de lujo      → sin rebote visible
```

Muelles nombrados por intención (`SPRING` en `motion.ts`) — cada uno con la intención que lo justifica, y son los que usan las piezas de la biblioteca:

| Token | `config` | Intención |
|---|---|---|
| `contador` | `{ damping: 16, mass: 0.7 }` | cifras que suben, sin rebote |
| `entrada` | `{ damping: 14, mass: 0.7 }` | slides, chips, burbujas |
| `tarjeta` | `{ damping: 14, mass: 0.7, stiffness: 120 }` | card/burbuja con cuerpo |
| `cta` | `{ damping: 14, mass: 0.8, stiffness: 120 }` | botón / CTA |
| `golpe` | `{ damping: 14 }` | aparición seca (aspa roja scaleX) |
| `flip` | `{ damping: 12 }` | giro 3D de una tarjeta (`ranura` con `conmuta: "volteo"`) |
| `pulso` | `{ damping: 8 }` | latido de énfasis |
| `punch` | `{ damping: 8, stiffness: 220 }` | pop de una cifra (overshoot) |
| `tap` | `{ damping: 9, stiffness: 200 }` | compresión de botón al pulsar |

```tsx
const progress = spring({ frame, fps, config: SPRING.tarjeta });
const y = interpolate(progress, [0, 1], [48, 0]);
const scale = interpolate(progress, [0, 1], [0.94, 1]);
```

---

## 9. Stagger y coreografía

No hagas aparecer todo a la vez. `STAGGER` (motion.ts): mismo grupo **3** · lista **4** · independientes **6** frames (rangos de partida: 2–3 / 3–5 / 5–8).

```text
Ítem 1 → frame 0     Ítem 3 → frame 8
Ítem 2 → frame 4     Ítem 4 → frame 12
```

La siguiente puede empezar al **60–80 %** de la anterior. Coreografías:

```text
Informativa: contenedor → título → dato principal → apoyos → énfasis → CTA
Producto:    anticipación → cambio de fondo/luz → producto → nombre → beneficio → detalle → CTA
Estadística: contexto → cifra → unidad → explicación → indicador ↑/↓
```

---

## 10. Continuidad y causalidad

Todo movimiento debe parecer **causado**. Evita: un elemento sale a la izquierda y el siguiente entra arbitrariamente desde arriba; una tarjeta desaparece sin liberar espacio; una escena nueva sin relación con la anterior; la cámara cambia de dirección sin motivación.

```text
Relaciones      Botón pulsado → contenido actualizado · cifra ↑ → gráfica crece ·
                objeto desplazado → espacio liberado · ícono → panel abierto
Direcciones     izquierda = anterior · derecha = siguiente · arriba = crecimiento ·
                abajo = caída/cierre/detalle · adelante = importancia · atrás = contexto
```

---

## 11. Tipografía cinética

Unidad de animación por contenido: emocional → **frase** · educativo → **palabra/concepto** · titular comercial → **bloques de 2–4 palabras** · dato → **número y unidad por separado** · técnico → **líneas/grupos semánticos**.

Reglas: máx. **2 familias**, **3 pesos** (una para titulares, una para cuerpo, una opcional para cifras/acentos) · **no** animes letra a letra un texto largo · **no** muevas párrafos durante la lectura · **no** mezcles estilos de animación en la misma frase · destaca **una sola** palabra por bloque. Números con `font-variant-numeric: tabular-nums` (evita saltos de ancho; las piezas `cifra` y `contador` de la biblioteca ya lo aplican). Texto que no cabe: (1) reduce contenido, (2) mejora saltos de línea, (3) agranda contenedor, (4) baja tamaño moderadamente, (5) **nunca** cortes ni permitas overflow. Mide el texto antes de renderizar.

---

## 12. Composición

Usa retícula, márgenes seguros, columnas, espaciado consistente, alineaciones claras, áreas reservadas para captions y posiciones recurrentes para logo/CTA. Referencia vertical: margen horizontal **6–8 %**, superior **5–8 %**, inferior **10–15 %** (el inferior contempla subtítulos y UI de plataforma). Valores reales del sistema (`presets.ts`):

| Formato | Zona segura | Subtítulo Y | Tamaño sub | Palabras/línea |
|---|---|---|---|---|
| 16:9 `tutorialYT` | 5 % | 86 % | 40 px | 8 |
| 9:16 `verticalSocial` | 11 % | 70 % | 56 px | 4 |
| 1:1 `feedCuadrado` | 8 % | 83 % | 46 px | 6 |

Una **alineación dominante** (izq/centro/der), no mezcles muchas. Profundidad = tamaño · contraste · blur · sombra · superposición · parallax · velocidad relativa (los cercanos algo más rápidos que los lejanos).

---

## 13. Color

Roles: `background · surface · primary · accent · text primary · text secondary · success · warning · error`. En el repo los hex NO los pone un theme global sino la **marca** (`remotion/src/marcas/<canal>.ts`, tipo `Marca` de `motor/marca.ts`; `remotion/src/marcas/ejemplo.ts` es la plantilla): el plan pide colores por lo que significan (`color: "acento"`, `tinta: "perdida"`) y llegan al montador ya resueltos contra el fondo del molde como `ctx.color` / `ctx.tinta(...)` (SKILL §9). `theme.ts` (`accent`) y la paleta `MG` de `motion.ts` (`teal`, `green` éxito, `red` error, `cyan`, `amber`) solo sirven a las plantillas de ejemplo (`TutorialYT`, `VerticalSocial`, `FeedCuadrado`) y al JSX a mano. Reserva el **mayor contraste** para: palabra principal · dato importante · producto · CTA · estado que cambia. **No** uses el acento en todos los elementos. Un cambio de color debe representar: cambio de estado, progreso, éxito, error, giro narrativo o transformación.

---

## 14. Presets visuales

| Preset | Rasgos |
|---|---|
| **Clean** | distancias cortas · duración media · sin rebote visible · opacity+translate · blur mínimo |
| **Corporate** | movimiento controlado · transiciones claras · alineaciones rígidas · UI sounds discretos · sin exageración |
| **Technological** | digital sweeps · líneas y grids · escáneres · glitches limpios · pulsos electrónicos |
| **Cinematic** | movimientos largos · escala · profundidad · cámara · blur · contraste · pausas · risers e impactos |
| **Lujo** | movimientos lentos · distancias pequeñas · pocos elementos · máscaras · reflejos · easing suave · sin rebotes |
| **Educational** | secuencias claras · jerarquía didáctica · stagger ordenado · highlights · clicks/confirmaciones · pausas de lectura |
| **Energetic** | duraciones cortas · whip transitions · escalas rápidas · stagger cerrado · cambios de ritmo |
| **Organic** | movimientos suaves · papel · tinta · líquido · texturas · irregularidad controlada |
| **Playful** | spring · squash & stretch · rotaciones pequeñas · pops · colores brillantes |
| **Comedic** | exageración · boings · record scratches · pops · pausas inesperadas · cambios abruptos de ritmo |

---

## 15. Reglas por motion graphic

Qué animación y qué **familia de sonido** pide cada gráfico. El detalle de variantes, cadenas y `cue(...)` está en el **[recetario por motion graphic](../diseno-sonoro/recetario-motion-graphics.md)** (para no duplicar el motor de sonido). Resumen:

| Motion graphic | Movimiento típico | Familia de sonido |
|---|---|---|
| Texto entrando | fade / slide / scale / spring / typing | soft-air · whoosh · pop · elastic-pop · typing |
| Título principal (hook/reveal) | riser suave → whoosh → impacto/chime | `riser → whoosh → impact/chime` |
| Lower third | slide + fade discretos | light whoosh · UI click · soft pop (bajo la voz) |
| Logo reveal | minimalista / tech / cinemático / lujo / dibujado | chime · digital sweep · rumble+impact · crystal chime · pencil |
| Íconos | pop / selección / éxito / error / alerta | pop/blip · click · ascending chime · error · warning |
| Botones | compresión → activación → resultado | UI click → digital pulse → confirmation chime |
| Tarjetas | entrada → llegada → (spring) → salida | light whoosh → soft/elastic pop → reverse whoosh |
| Gráficas | línea dibujada / barra / contador / valor final | tracing · tonal rise · rapid ticks · click/chime |
| Formas geométricas | expansión / choque / rebote / rotación | air pulse · pop/thump · elastic pop · spin |
| Morphing | digital / orgánico / antes-después | synthetic · liquid/stretch · riser+morph+impact |
| Partículas | brillos / destello / explosión / polvo | sparkle · shimmer · burst · granular |
| Glitch | stutter / static / signal break | glitch (**no** en lujo/emocional/corporativo) |
| Dibujo manual | trazo | pencil · marker · brush (avanza con el trazo) |
| Fotografías | aparición / entrada / galería | shutter · light whoosh · clicks consistentes |
| Mapas | pin / ruta / viaje / llegada | ping · tracing · continuous whoosh · chime |
| 3D | giro / acercar / alejar / atravesar | circular whoosh · +volumen/graves · tunnel sweep |

---

## 16. Diseño sonoro (puente)

El sonido **refuerza** lo visual, no compite. Cada efecto necesita una **función** y un `reason`. El contenido completo — detección de eventos, sincronización al momento reconocible, peso/dirección, prioridad de la voz, ducking, capas, mezcla, presets de combinación e implementación (`SoundCue` + `cue()` + `PistaSonido` + el mapa `SFX` sobre el set de `remotion/public/sfx/`) — vive en **[`diseno-sonoro/SKILL.md`](../diseno-sonoro/SKILL.md)**. Aquí solo el enlace función → familia:

```text
MOVIMIENTO → whoosh   ANTICIPACIÓN → riser   LLEGADA → impact   RITMO → click/tick
INTERFAZ → ui   ELÁSTICO → pop   TRANSFORMACIÓN → morph/liquid   TRAZO → pencil/brush
PARTÍCULAS → sparkle   ACCIÓN REAL → foley   AMBIENTE → ambient   COMEDIA → cartoon
```

Prioridades: **sonido específico > genérico** · foley > impacto abstracto · UI click > whoosh para botones · pencil > whoosh para líneas dibujadas · shutter > impact para foto · elastic pop > sharp impact para spring. **La voz manda siempre.** Elige la variante concreta con el [recetario](../diseno-sonoro/recetario-motion-graphics.md).

---

## 17. Implementación en Remotion

Determinista: `useCurrentFrame()` · `useVideoConfig()` · `interpolate()` · `spring()` · `<Sequence>` · `<Audio>` · `<Video>`/`<OffthreadVideo>`. **No** uses para el movimiento principal CSS `animation`/`transition`, ni timers, estado asíncrono o `Math.random()` sin sembrar.

```tsx
const frame = useCurrentFrame();
const { fps } = useVideoConfig();
const opacity = interpolate(frame, [0, seg(fps, 0.5)], [0, 1],
  { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
```

Prefiere transformar `translate · scale · rotate · opacity · clip-path · mask`; evita animar `top/left/width/height` cuando una transformación lo resuelve.

Organiza cada elemento en su `<Sequence from={startFrame} durationInFrames={dur}>`. Cada cue de sonido produce un `SoundCue` (con `reason` obligatorio) reproducido por `<PistaSonido cues={cues} />` **por encima** del vídeo/voz.

### 17.1 Cue track listo para `GraficosDemo` (9:16 · 25 fps · 300 f)

`targetFrame` = frames del plan `remotion/src/motor/demos/graficos-demo.ts`, que es la plantilla de un `graficos-NNN.ts`: cinco tomas con ventana fija —`g00-ambiente` 8–300 (capa) · `g01-gancho` 8–70 (franja) · `g02-dato` 78–150 (franja: contador 0→87 % en 40 f, etiqueta y subrayado con `tras()`) · `g03-solucion` 155–235 (sello: lista de 3 con `paso: 6`) · `g04-cta` 240–300 (cta con estallido de partículas de 60 f)—. Los targets de las ventanas son exactos; los que dependen de `tras()` (etiqueta, subrayado, ítems de la lista) van marcados con `≈`: léelos en el Studio o en la salida de `revisaPlan` antes de pegarlos. Va **por encima** del vídeo (la voz manda). Variantes → mapa `SFX`; elige matices con el [recetario](../diseno-sonoro/recetario-motion-graphics.md).

```tsx
import { PistaSonido } from "./sound/PistaSonido";
import { cue } from "./sound/cues";

const cuesDemo = [
  cue("gancho-in",   "whoosh",  "light",    8,   12, "Entra el titular del gancho en la franja alta"),
  cue("cifra-count", "texture", "data",     78,  40, "El contador sube 0→87 % mientras la voz da la magnitud", { fadeOutFrames: 6 }),
  cue("cifra-golpe", "impact",  "chime",    118, 16, "≈ La cifra aterriza en 87 % (`golpe: true`; 78 + 40 f de cuenta)", { priority: "high" }),
  cue("subrayado",   "whoosh",  "scribble", 134, 14, "≈ Se dibuja el subrayado bajo la etiqueta (tras la cifra + 40 f)"),
  cue("item-1",      "click",   "pop",      157, 8,  "≈ Primer punto de la solución", { variantIndex: 0 }),
  cue("item-2",      "click",   "pop",      163, 8,  "≈ Segundo punto (paso 6)", { variantIndex: 1 }),
  cue("item-3",      "click",   "pop",      169, 8,  "≈ Tercer punto (paso 6)", { variantIndex: 2 }),
  cue("cta-in",      "whoosh",  "light",    240, 14, "Entra el CTA con piel de sello en la banda de subtítulos"),
  cue("cta-confeti", "impact",  "sparkle",  244, 24, "Estallido de partículas del CTA: refuerza el cierre"),
];

// <PistaSonido cues={cuesDemo} duckDb={-4.5} />
```

> Un plan propio cambia las ventanas: escribe los `targetFrame` desde la transcripción real del clip, no desde el guion, y mide el golpe de cada archivo antes ([R26](../edicion-video/reglas.md), diseno-sonoro §11).

---

## 18. Rendimiento

**Evita:** cientos de partículas DOM · blurs muy grandes durante todo el vídeo · assets de resolución innecesaria · mediciones complejas por frame · capas invisibles · vídeos fuente demasiado pesados · fuentes/pesos no usados · filtros costosos sobre toda la composición. **Prefiere:** SVG para formas · Canvas para partículas complejas · assets optimizados · datos estáticos memoizados · premounting · cálculos previos · componentes reutilizables · `transform`/`opacity`.

---

## 19. Accesibilidad

Permite un nivel de intensidad: `type MotionIntensity = 'reduced' | 'subtle' | 'standard' | 'expressive'`. En `reduced`: sustituye desplazamientos grandes por opacity · elimina shakes, zooms rápidos y rotaciones completas · reduce parallax y blur · mantén referencias visuales estables · aumenta el tiempo de lectura · **evita flashes**. La **claridad** siempre tiene prioridad sobre el dinamismo.

---

## 20. Reglas prohibidas

1. Animar todo al mismo tiempo. 2. Más de un hero motion simultáneo. 3. Spring en todos los elementos. 4. Cambiar de dirección sin motivo. 5. Un whoosh para cada movimiento. 6. Impactos fuertes en elementos secundarios. 7. Mover textos largos durante su lectura. 8. Tres o más estilos de animación en un elemento. 9. Glitches sin relación con el estilo. 10. Sonidos cómicos en escenas serias o de lujo. 11. Cambiar tipografía/color/movimiento sin consistencia. 12. Animaciones aleatorias entre renders. 13. Sacrificar legibilidad por dinamismo. 14. Zooms de cámara cuando basta una escala local. 15. Repetir el mismo preset. 16. Ocultar mala composición tras efectos. 17. Sonidos sin función explicada. 18. Múltiples impactos en el mismo frame. 19. Movimiento ambiental que compite con el mensaje. 20. Mantener una animación solo porque "se ve llamativa".

---

## 21. Evaluación de calidad

Puntúa cada escena /100: Claridad **15** · Composición/jerarquía **15** · Tipografía/legibilidad **10** · Calidad del movimiento **20** · Timing/easing **10** · Coreografía/continuidad **10** · Marca **8** · Sonido **7** · Rendimiento **3** · Accesibilidad **2**.

Penalizaciones: −10 dos protagonistas · −10 texto ilegible/cortado · −8 movimiento sin propósito · −8 direcciones incoherentes · −7 rebote excesivo · −6 entrada muy rápida · −6 sin tiempo de lectura · −5 preset repetido · −5 sonido desproporcionado · −5 animación incompatible con la marca.

`90–100` excelente · `80–89` bueno (ajustes menores) · `70–79` funcional pero genérico · `60–69` sobrecargado/poco claro · `<60` rediseñar. **No apruebes <80 sin explicar sus limitaciones.**

---

## 22. Formato de respuesta

Por cada escena: `ESCENA · PROPÓSITO · MENSAJE PRINCIPAL · ELEMENTO PROTAGONISTA · ELEMENTOS SECUNDARIOS · COMPOSICIÓN · ESTILO VISUAL · ANIMACIÓN DE ENTRADA · ANIMACIÓN PRINCIPAL · ANIMACIÓN DE SALIDA · TIMING · EASING · STAGGER · SONIDOS · FRAME DE SINCRONIZACIÓN · MEZCLA · RAZÓN DE DISEÑO · RIESGOS · PUNTUACIÓN`. Después: plan de escenas → motion tokens → sound cues → estructura de componentes → código Remotion → validación final.

---

## 23. Validación final

```text
¿Se entiende cada escena sin audio?           ¿El sonido corresponde al material/acción?
¿Hay un protagonista claro?                   ¿El audio está sincronizado al frame correcto?
¿La composición funciona estática?            ¿La voz conserva prioridad?
¿El movimiento tiene una causa?               ¿Hay efectos redundantes?
¿Las direcciones son coherentes?              ¿Se repite demasiado un preset?
¿Hay tiempo de lectura suficiente?            ¿El código es determinista?
¿El movimiento corresponde a la marca?        ¿El render será eficiente? ¿Puede simplificarse?
```

**La última pregunta siempre:** *¿esta escena funciona mejor con todos estos efectos o sería más clara eliminando alguno?* **Cuando dudes, simplifica.**

---

## Regla definitiva

```text
No busques que cada segundo tenga una animación → busca que cada movimiento comunique algo.
No busques que cada corte tenga un sonido        → busca que cada sonido refuerce una sensación.
No busques impresionar por cantidad              → busca claridad, ritmo, intención y coherencia.
```
