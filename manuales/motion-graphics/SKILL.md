---
name: motion-graphics
description: >-
  Dirección de motion graphics en Remotion, el MOTOR POR DEFECTO: convertir cada
  escena en una composición clara y con intención (no efectos al azar). Cubre
  jerarquía de movimiento (hero/supporting/ambient), principios de animación,
  timing/easing en frames, stagger y coreografía, continuidad causal, tipografía
  cinética, composición por formato, color de marca y la implementación
  determinista con tokens (`motion.ts`) + `Sequence`. Incluye la BIBLIOTECA de
  gráficos ya resueltos (`motor/graficos/`), su CATÁLOGO (comp `Catalogo` +
  catalogo-graficos.md) y el plan de gráficos COMO DATOS (un `Plan` del núcleo
  → `PistaGraficos`) con validador `revisaPlan()`. Mira el catálogo ANTES de
  escribir un gráfico nuevo. El sonido se delega a `diseno-sonoro`. Si la
  instrucción dice EXPLÍCITAMENTE «con heygen», «con hyperframes» o «en HTML»,
  NO es este skill: `heygen-motion-graphics` + `motor-hyperframes`. Úsalo
  cuando haya que diseñar, animar o revisar un gráfico, título, contador,
  transición, lower-third, logo o CTA en vídeo.
metadata:
  type: reference
---

# 🎬 Dirección de motion graphics (Remotion)

> **Principio maestro.** El **DISEÑO** decide *qué* se ve · la **ANIMACIÓN** decide *cuándo y cómo* aparece · el **SONIDO** decide *qué se siente* · la **NARRATIVA** decide *por qué* existe cada elemento.
> No añadas una animación porque hay un corte, un texto o un dato. Antes de añadir cualquier recurso responde: **¿qué función narrativa cumple? ¿cuál es el frame más importante? ¿la escena mejora de verdad con esto?** Si no hay respuesta clara, no lo pongas. **Ante la duda, simplifica.**

**Cuándo se usa (disparadores):** "motion graphics", "animación", "animar", "gráfico en pantalla", "título", "lower third", "contador", "transición", "logo reveal", "spring", "easing", "timing", "coreografía", "cinético", "subrayar", "subrayado", "rodear una palabra", "flecha", "partículas", "confeti", "3D", "voltear tarjeta", "glitch", "gráfica de barras", "catálogo de gráficos", "qué gráficos tengo". Si la instrucción no nombra otro motor, es este skill (Remotion); solo «con heygen», «con hyperframes», «en HTML» o «en el segundo motor» mandan a `heygen-motion-graphics` (el recetario) y `motor-hyperframes` (el contrato, las puertas y la marca).

Motor: `remotion/src/motor/` — tokens en `remotion/src/motor/motion.ts` · tema de las plantillas en `remotion/src/motor/theme.ts` · formatos en `remotion/src/motor/presets.ts` · ejemplos de referencia del producto: `remotion/src/motor/demos/GraficosDemo.tsx` + `remotion/src/motor/demos/graficos-demo.ts` (plan de 5 tomas · 9:16 · 25 fps · 300 f, el repertorio corto sobre un avatar), `remotion/src/motor/demos/PlanDemo.tsx` + `remotion/src/motor/demos/plan-demo.ts` (la gramática entera: cuatro moldes, tres ejes, piel, envolturas y `tras()`) y la comp `Catalogo` (cada pieza animándose con su ficha). Los tres se abren en el Studio (`npm run dev` en `remotion/`).

📚 **Biblioteca de gráficos** — `remotion/src/motor/graficos/`: primitivas ya resueltas (tipografía, fondos, datos, **trazo dibujado**, **partículas**, **3D**, **glitch**) + el plan de gráficos **como datos** (un `Plan` del núcleo → `<PistaGraficos>`). **20 piezas** alcanzables desde el plan, dentro de un catálogo de **52 entradas** — no copies estas cifras a otro sitio: las cuenta `revisar-catalogo.mjs` y las imprime al ejecutarlo.
**Míralo ANTES de escribir un gráfico:** catálogo vivo en la composición `Catalogo` del Studio · lista en [catalogo-graficos.md](catalogo-graficos.md).
El catálogo **se deriva**, no se mantiene a mano: sale del registro `PIEZAS`, de `MOLDES_GRAFICOS` y de los tipos del núcleo, y cada entrada trae la RUTA que se escribe en el plan. Dos comandos:
```bash
node manuales/motion-graphics/scripts/generar-catalogo.mjs   # regenera el markdown
node manuales/motion-graphics/scripts/revisar-catalogo.mjs   # test: toda ficha tiene ruta y toda ruta tiene ficha
```

📏 **La tabla de avances tipográficos (R09)** — `remotion/src/motor/plan/avances.ts`. R09 avisa cuando una línea no cabe en su molde, y para eso necesita saber cuánto mide un texto **sin poder medirlo**: `revisaPlan()` corre con `node` pelado y tiene que dar el mismo número en cualquier máquina. La respuesta es una tabla de datos puros —cero imports— con el **avance en em de cada carácter**, medida una vez y versionada:
```bash
node manuales/motion-graphics/scripts/generar-avances.mjs          # reescribe la tabla
node manuales/motion-graphics/scripts/generar-avances.mjs --check  # ¿sigue al día? sale 1 si no
node manuales/motion-graphics/scripts/generar-avances.mjs --dry    # solo informa, no escribe
```
`--check` mide, compone el archivo y lo compara con el versionado sin tocarlo: es lo que se puede colgar de un hook o de CI para que una tabla desfasada se note antes de un PR y no en un render.
**Se vuelve a ejecutar cuando cambie la letra de una marca** (`letra` / `letraPorCapa` en `remotion/src/marcas/<canal>.ts`, que es de donde sale `m.letra`; `theme.fontFamily` es la pila de Inter de la capa de gráficos) **o aparezca un peso nuevo** en `T` o en `TXT`: la lista de combinaciones familia×peso está escrita a mano en el script, con el sitio del código que dibuja cada una. Mide con el Chrome de `@remotion/renderer`, que es el mismo binario que renderiza el vídeo, y con las fuentes que ese Chrome ve: Inter va **empaquetada** en `remotion/public/fuentes/inter/` (la registra `motor/fuentes.ts`), así que las tablas `inter*` valen en cualquier máquina.

Quién la consulta: **el dialecto, no el núcleo**. `anchoTexto(texto, px, letra, tracking, monta)` recibe la tabla ya elegida porque la familia y el peso los sabe la ficha de la pieza y nadie más: la marca nombra sus tablas por peso (`LetraMarca.tablas`, p. ej. `LETRA_INTER` → `inter600/700/800`) y `remotion/src/motor/letra.ts` las resuelve una vez por capa. Así el núcleo se queda sin ni un import en tiempo de ejecución y no hay ninguna combinación que pueda «faltar». `monta` son las dos propiedades CSS que cambian los glifos: `{ versalitas }` (el kicker monta `uppercase`) y `{ tabulares }` (`T.cifra`/`TXT.cifra` montan `tabular-nums`, **y el dígito tabular es más ancho que el proporcional** — hasta un +12,5 % en `7.4`).

Seis cosas que hay que saber antes de tocarla, y las seis están medidas, no supuestas:
- **San Francisco tiene eje óptico**: el avance NO es proporcional al cuerpo (+3,3 % a 28 px respecto de 96, +13 % a 12 px). Por eso cada carácter guarda un em por **ancla** (20, 28, 44, 96 px) y el consumidor interpola. Inter no lo tiene y guarda un solo valor.
- **El kerning va en los dos sentidos, y los pares que ENSANCHAN están medidos.** «El kerning aprieta, así que no hace falta modelarlo» era falso y costó una subestimación: `rt` —cuarto, puerta, artículo— suma **+1,95 % del cuerpo cada vez que aparece**, y una línea densa en esos pares se estimaba un 1,9 % *por debajo* de lo que se dibuja (−3,5 % con `íT`). La tabla trae ahora un bloque `kerning` por combinación con los ~300-570 pares positivos. Lo que sigue sin modelar —el kerning que aprieta, las ligaduras, el punch-in del molde— juega a favor: el texto real sale más estrecho.
- **El cuerpo lo pone el ROL, no la ficha.** El intérprete dibuja `p.px ?? escalaRol[nodo.rol ?? "apoyo"]`, así que la ficha lee `ESCALA[c.rol]` del mismo objeto (`NOTICIAS.escala` / `GRAFICOS.escala`). Mientras cada ficha escribía su propio `?? 28` la copia divergía en silencio: un kicker sin `px` se estimaba a 28 px y se dibujaba a 44, y un titular `hero` de gráficos sin `px` se estimaba a 92 y se dibuja a 104 — un 11,5 % corto, veinte veces el margen.
- **El `enfasis` de un trozo pesa 800 y se mide a 800.** `anchoTramos` acepta una línea partida en tramos con su propia tabla cada uno; el kerning se suma dentro de cada tramo y no entre ellos, porque Chrome moldea cada `<span>` por separado.
- **El margen es del 1 %** (`MARGEN_ANCHO`, en `nucleo.ts`) y se aplica solo al **texto**, nunca al bloque: los anchos declarados (los 840 px fijos de `RecortePrensa`) no tienen error de medida, e inflarlos inventaría un aviso. Con el kerning dentro, el modelo ya no se queda corto ni con margen 0 — el 1 % es holgura, no corrección, y el primer falso positivo aparece al 2 %.
- **Una tabla es de una FUENTE concreta, no de un nombre de familia.** Las `inter*` se midieron sobre la Inter empaquetada y por eso son portables. Las `sf*` se midieron sobre la San Francisco del sistema **en macOS**: `-apple-system` solo resuelve a SF ahí (en Windows o Linux la pila cae a Helvetica/Arial y la tabla miente sin avisar). Por eso una marca nueva declara `letra: LETRA_INTER` (ver `remotion/src/marcas/ejemplo.ts`) y `LETRA_SF_SISTEMA` queda para marcas que nacieron en un Mac y se renderizan ahí. Si empaquetas otra fuente, mídela con `generar-avances.mjs` ANTES de nombrar sus tablas: la salida nunca es retocar números.

La verdad contra la que se calibra la genera [`medir-anchos.mjs`](scripts/medir-anchos.mjs), que recorre como datos los planes de `motor/demos/` (`graficos-demo`, `plan-demo`, `noticia-demo`) y, si existen, los `noticia-NNN.ts` de tus proyectos, y mide sus líneas en el mismo Chrome. **Es la regresión de R09**: vuelve a correrlo si tocas una marca, un peso o la tabla, y mira la línea `cortas` de su salida — tiene que seguir siendo **0**. Una estimación por debajo del ancho real es la única forma en que esta regla publica un titular cortado.

Y para que `cortas: 0` signifique algo, el arnés **lee** `T` y `TXT` en vez de copiarlos, y resuelve el cuerpo como lo resuelve el intérprete. Antes copiaba a mano familia, peso, tracking y cuerpo: si mañana `T.titular.fontWeight` pasaba de 700 a 800, el arnés medía la verdad a 700, el error salía ~0 y `cortas` seguía diciendo 0 con el vídeo cortándose. Un arnés que no puede fallar no es un arnés.

🔗 **Sonido:** [`diseno-sonoro/SKILL.md`](../diseno-sonoro/SKILL.md) + [recetario por motion graphic](../diseno-sonoro/recetario-motion-graphics.md). · **Reglas operativas:** [reglas.md](../edicion-video/reglas.md) (R03 formato, R05 frames, **R08 fuera de la cara**). · **Teoría completa:** [referencia.md](referencia.md).

---

## 1. Proceso obligatorio (4 fases, en orden)

1. **Comprender la narrativa** — qué debe *entender* y *sentir* el espectador; qué es principal y qué secundario; clasifica la escena: `hook · contexto · explicación · demostración · comparación · revelación · conclusión · cta`. No animes todas las escenas con la misma intensidad.
2. **Una sola idea** — 1 mensaje, 1 elemento protagonista, **máx. 2 secundarios**. Si hay más información, divídela en varias escenas (secuencia temporal, no simultaneidad).
3. **Validar el frame estático** — imagina/renderiza el frame principal ([R05](../edicion-video/reglas.md): `npx remotion still <id> out/check.png --frame=N`). Debe entenderse **sin movimiento**: punto focal, jerarquía, legibilidad, contraste, alineación, marca. **No uses animación para tapar un mal diseño.**
4. **Jerarquía de movimiento** — asigna cada movimiento a una capa (§2) y anímalo.

> **Antes de escribir código, decide con qué lo montas:**
> **(a)** ¿Existe ya en la biblioteca? → [catálogo](catalogo-graficos.md). Si existe parecido, añade una prop; no dupliques el componente.
> **(b)** ¿Es un gráfico repetitivo (título, cifra, lista, subrayado, remate)? → declara un **`Plan`** en `graficos-NNN.ts` —`plan(formato, [...])` con tomas `gfx(id, molde, ventana, reason, hijos)`, ver `remotion/src/motor/plan/nucleo.ts` y el dialecto `remotion/src/motor/graficos/coreografia.ts`— y móntalo con `<PistaGraficos plan={…} montadores={MONTADORES_BASE} />` (`montadores` es obligatorio y no tiene defecto); valida con `revisaPlan(plan)`, **un solo argumento** — el fps sale del propio plan, y el intérprete ya lo llama solo al montar. Plantilla de la que copiar: `remotion/src/motor/demos/graficos-demo.ts`, 5 tomas sin un solo píxel medido a ojo.
> **(c)** ¿Es la idea visual PROPIA de esta pieza? → JSX a mano, con las primitivas de la biblioteca como material.
> Si escribes algo reutilizable, súbelo a `motor/graficos/`. Una PIEZA nueva se declara en el registro `PIEZAS` (`coreografia.ts`) con su ficha —nombre, qué es, cuándo usarla—, su montador en `PistaGraficos.tsx` y su demo en `Catalogo.tsx`: sin montador no compila, y sin demo falla `revisar-catalogo.mjs`. `fichas.ts` ya no se toca: deriva el catálogo solo.

---

## 2. Jerarquía de movimiento (regla del protagonista)

| Capa | Intensidad | Qué es | Ejemplos |
|---|---|---|---|
| **Hero** | 100 % | El movimiento principal. **Solo uno a la vez.** | Entrada del titular · crecimiento del dato · revelación del resultado · reveal de logo |
| **Supporting** | 40–60 % | Ayuda a comprender el hero. | Flecha que acompaña una cifra · ✓ de confirmación · etiqueta que explica |
| **Ambient** | 10–25 % | Da vida sin pedir atención. | Gradiente lento · parallax mínimo · brillo suave |

Si varios elementos compiten, **reduce el movimiento de todos menos del protagonista**. En este sistema el hero es literalmente **1 gráfico a la vez** en la franja superior ([R08](../edicion-video/reglas.md)). En un plan lo imponen la `ventana` de cada toma y `revisaPlan()`, que avisa si dos tomas `hero` se solapan; en JSX a mano, `<Escena>` de `remotion/src/motor/graficos/Entradas.tsx` da a cada escena su ventana con frames locales.

---

## 3. Principios de animación (aplícalos, no todos a la vez)

| Principio | Qué hacer | Cuándo NO |
|---|---|---|
| **Anticipación** | Preparación breve antes de una acción importante (comprimir un botón antes de activarlo; riser antes de un impacto). `ANTICIPACIÓN → ACCIÓN → RESULTADO`. | En cada microacción. |
| **Staging** | Durante el hero: fondo estable, reduce lo secundario, reserva el mayor contraste para el protagonista. | — |
| **Follow-through** | No detengas todo a la vez: desfasa colas **2–5 frames** (la tarjeta aterriza → el texto se asienta → la sombra recupera). | — |
| **Acción secundaria** | Refuerza el hero (la cifra sube → una flecha sube). | Contador + confeti + zoom + partículas + rotación juntos. |
| **Squash & stretch** | `scaleX 1.08 / scaleY 0.92` → vuelve a `1/1`. Íconos, botones, pops, burbujas. | Logos elegantes, corporativo serio, gráficas, lujo. |
| **Exageración** | Adáptala al estilo: corporativo/lujo **baja** · educativo **media** · redes **media-alta** · cómico **alta** · cinemático **alta en escala/profundidad**. | — |

---

## 4. Timing (segundos → frames al fps de la composición)

`seg(fps, s) = Math.round(s * fps)` (helper en `motion.ts`). **Este sistema:** avatar 9:16 = **25 fps**; plantillas `TutorialYT`/`VerticalSocial`/`FeedCuadrado` = **30 fps**.

| `DUR` (motion.ts) | Segundos | @25 fps | @30 fps | Uso |
|---|---|---|---|---|
| `micro` | 0.15 | 4 | 5 | microacción, tick |
| `pop` | 0.27 | 7 | 8 | pop pequeño |
| `entradaRapida` | 0.35 | 9 | 11 | entrada rápida (redes) |
| `entrada` | 0.50 | 13 | 15 | entrada estándar |
| `tarjeta` | 0.60 | 15 | 18 | tarjeta / bloque |
| `hero` | 0.80 | 20 | 24 | hero motion |
| `revelacion` | 1.40 | 35 | 42 | revelación dramática |

Son **puntos de partida**: ajústalos al ritmo de la voz y la música. La animación siguiente puede empezar cuando la anterior lleva **60–80 %** (no esperes a que termine del todo).

---

## 5. Easing y spring (tokens en `motion.ts`)

**Easing** (`EASE`): entrada / count-up → `outCubic` (rápido→suave) · reposicionamiento (p. ej. 3→0) → `inOutCubic` · movimiento mecánico continuo (barras, marquees, escáner) → `Easing.linear`. Salida → `ease-in` (empieza lento, acelera).

**Spring** (`SPRING`) — elige por **intención**, no pongas spring en todo:

| Token | Config | Para | Rebote |
|---|---|---|---|
| `contador` | damping 16, mass 0.7 | cifras que suben | sin rebote |
| `entrada` | damping 14, mass 0.7 | slides, chips, burbujas | sutil |
| `tarjeta` | damping 14, mass 0.7, stiff 120 | cards con cuerpo | sutil |
| `cta` | damping 14, mass 0.8, stiff 120 | botón / CTA | sutil |
| `golpe` | damping 14 | aparición seca (aspa, scaleX) | mínimo |
| `flip` | damping 12 | giro 3D de una tarjeta (`ranura` con `conmuta: "volteo"`) | medio |
| `pulso` | damping 8 | latido de énfasis | medio |
| `punch` | damping 8, stiff 220 | pop de una cifra | fuerte (overshoot) |
| `tap` | damping 9, stiff 200 | compresión de botón | fuerte |

Guía de rebote: texto informativo → sin/mínimo · card UI → sutil · ícono social → medio · cómico → alto · **logo de lujo → sin rebote visible**.

---

## 6. Stagger y coreografía

`STAGGER` (motion.ts): mismo grupo **3** · lista **4** · independientes **6** frames. No hagas aparecer todo a la vez.

Coreografía informativa: `contenedor → título → dato principal → apoyos → énfasis → CTA`. · Revelación de producto: `anticipación → cambio de fondo/luz → producto → nombre → beneficio → detalle → CTA`. · Estadística: `contexto → cifra → unidad → explicación → indicador ↑/↓`.

**Continuidad causal** — todo movimiento parece *causado* por algo, y las direcciones conservan significado: `izquierda = anterior · derecha = siguiente · arriba = crecimiento · abajo = caída/cierre · adelante = importancia · atrás = contexto`. Evita que un elemento salga a la izquierda y el siguiente entre desde arriba sin motivo.

---

## 7. Tipografía cinética

Unidad de animación según el contenido: emocional → **frase** · educativo → **palabra/concepto** · titular comercial → **bloques de 2–4 palabras** · dato → **número y unidad por separado** · técnico → **líneas/grupos**.

Reglas: máx. **2 familias** y **3 pesos** · destaca **una sola** palabra por bloque · **no** animes letra a letra un texto largo · **no** muevas párrafos mientras se leen · números con `fontVariantNumeric: "tabular-nums"` (evita saltos de ancho — ya se usa en los contadores). Si el texto no cabe: reduce contenido → mejora saltos de línea → agranda contenedor → baja tamaño. **Nunca cortes texto ni permitas overflow.**

---

## 8. Composición por formato (valores reales de `presets.ts`)

| Formato | Comp / fps | Zona segura | Subtítulo Y | Motion graphics |
|---|---|---|---|---|
| Tutorial 16:9 | `TutorialYT` · 30 | 5 % | 86 % | lower-third; libertad en el tercio superior |
| Vertical 9:16 | `VerticalSocial` / avatar · 30 / 25 | 11 % | 70 % | **franja superior** (`y < 340 px` en 1080×1920), fuera de cara y subtítulo ([R08](../edicion-video/reglas.md)) |
| Feed 1:1 | `FeedCuadrado` · 30 | 8 % | 83 % | banda; centrado |

Elige **una** alineación dominante (izq/centro/der). Profundidad = tamaño · contraste · blur · sombra · superposición · parallax (los cercanos se mueven algo más rápido que los lejanos).

---

## 9. Color (roles → la MARCA, no un theme global)

El plan pide colores por lo que SIGNIFICAN (`color: "acento"`), nunca en hex. Los hex los pone la marca del canal y llegan al montador como `ctx.color` / `ctx.tinta(...)`, ya resueltos contra el fondo del molde.

**La marca es un dato, no una constante del motor.** Vive en `src/marcas/<canal>.ts` y la pasa la composición:

```tsx
import { EJEMPLO } from "../marcas/ejemplo"; // la marca del producto; copia el fichero para dar de alta la tuya

<PistaNoticia tomas={…} marca={EJEMPLO} />
capa(dialectoEditorialDe(EJEMPLO), "noticia")
```

Dar de alta un canal es escribir un fichero (`remotion/src/marcas/ejemplo.ts` es la plantilla: nombre, sello, colores, `letra`); el motor no se toca. Qué decide cada capa:

| | Decide | Dónde |
|---|---|---|
| **Marca** | colores, tipografía, sello, radio, look del metraje | `src/marcas/` |
| **Dialecto** | qué piezas, qué moldes, qué beats, y la POLARIDAD | `motor/graficos/` · `motor/noticias/` |
| **Formato** | margen seguro, carril de subtítulos | `presets.ts` |

⚠️ **Nunca escribas un hex en un montador.** Si necesitas un color que la paleta no nombra, el arreglo es añadirlo a la marca o a la paleta del dialecto. Cablearlo ata el componente a un canal, que es justo lo que se acaba de deshacer.

⚠️ La tipografía es **por capa**: gráficos dibuja en Inter (decisión de legibilidad — va encima de metraje que no controla) y editorial en la voz de la marca. Un canal puede pedir la suya para gráficos con `letraPorCapa`, pero **midiendo la fuente antes** con `generar-avances.mjs`: sin tabla medida, R09 estima mal y no se queja.

---

## 9b. El registro compartido (`motor/piezas/`)

Seis piezas sirven a los DOS dialectos y son el mismo objeto en ambos: `regla`, `subrayado`, `rodea`, `flecha`, `check`, `aspa`. Una toma editorial puede subrayar una palabra igual que una de overlay.

**Contrato para entrar ahí, y lo hace cumplir el tipo:** una pieza compartida pinta **solo con `ctx.color`**. Las uniones de tinta de las dos capas son disjuntas, así que un montador genérico en `C` no tiene ni un nombre de color que pueda escribir. Por eso `lista` y `barras` NO están: colorean partes con `logro`/`perdida`, que solo existen en gráficos.

---

## 10. Implementación determinista (Remotion)

`useCurrentFrame()` · `useVideoConfig()` · `interpolate()` · `spring()` · `<Sequence>` · `<Audio>`. Anima **`transform` + `opacity`** (evita `top/left/width/height`). **Prohibido** para el movimiento principal: CSS `animation`/`transition`, timers, estado asíncrono o `Math.random()` sin sembrar (rompe el determinismo entre renders).

```tsx
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { SPRING, EASE, seg, MG } from "./motion";
import { PistaSonido } from "./sound/PistaSonido";
import { cue } from "./sound/cues";

const Dato: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = spring({ frame, fps, config: SPRING.contador });          // muelle por intención
  const y = interpolate(e, [0, 1], [40, 0]);
  const op = interpolate(frame, [0, seg(fps, 0.5)], [0, 1], { extrapolateRight: "clamp" });
  const n = Math.round(interpolate(frame, [seg(fps, 0.5), seg(fps, 1.5)], [0, 200],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE.outCubic }));
  return <div style={{ opacity: op, transform: `translateY(${y}px)`, color: MG.green }}>{n}</div>;
};

// El sonido va POR ENCIMA del vídeo; la voz manda. Variante y mezcla → diseno-sonoro (recetario).
// 30 = fps de ESTA comp; usa el fps REAL de tu composición (avatar 9:16 = 25, plantillas = 30).
const cues = [cue("dato", "impact", "chime", seg(30, 1.5), 18, "La cifra llega al valor final", { priority: "high" })];
// <PistaSonido cues={cues} />
```

Rendimiento: SVG para formas, `transform`/`opacity`, assets optimizados, memoiza datos estáticos. Evita cientos de partículas DOM y blurs enormes sobre toda la composición.

---

## 11. Presets visuales (guía de estilo)

`clean` (opacity+translate, sin rebote) · `corporate` (controlado, alineaciones rígidas) · `technological` (grids, sweeps, glitch limpio, pulsos) · `cinematic` (escala, profundidad, cámara, risers+impactos) · `lujo` (lento, distancias cortas, máscaras, sin rebote) · `educational` (secuencias claras, stagger ordenado, highlights, pausas de lectura) · `energetic` (duraciones cortas, whip, stagger cerrado) · `organic` (papel/tinta/líquido) · `playful` (spring, squash, pops) · `comedic` (exageración, boings, cortes abruptos). Detalle y presets sonoros en [referencia.md](referencia.md).

**Puente a sonido** — el `style` de [`diseno-sonoro`](../diseno-sonoro/SKILL.md) §7 usa casi el mismo vocabulario; equivalencias no obvias para el salto motion→sonido: `clean` → corporate · `energetic` → social · `playful` → social/cómico. (diseno-sonoro no tiene clean/energetic/playful; motion no tiene "social".)

---

## 12. Reglas prohibidas (las más caras)

1. Animar todo al mismo tiempo.
2. Más de **un hero** simultáneo.
3. Spring en todos los elementos.
4. Cambiar de dirección sin motivo.
5. Mover texto largo mientras se lee.
6. 3+ estilos de animación en un mismo elemento.
7. Glitch/sonido cómico en contenido de lujo o serio.
8. Zoom de cámara cuando basta una escala local.
9. Repetir el mismo preset todo el rato.
10. **Tapar un mal diseño con efectos.**
11. Sacrificar legibilidad por dinamismo.
12. Mantener una animación solo porque "se ve llamativa".

---

## 13. Calidad — puntúa cada escena /100

Claridad 15 · Composición/jerarquía 15 · Tipografía/legibilidad 10 · Calidad del movimiento 20 · Timing/easing 10 · Coreografía/continuidad 10 · Marca 8 · Sonido 7 · Rendimiento 3 · Accesibilidad 2.

| Penalización | Motivo |
|---|---|
| −10 | dos protagonistas compiten |
| −10 | texto ilegible o cortado |
| −8 | movimiento sin propósito |
| −8 | direcciones incoherentes |
| −7 | rebote excesivo |
| −6 | entrada demasiado rápida |
| −6 | sin tiempo de lectura |
| −5 | preset repetido |
| −5 | sonido desproporcionado |

**Bandas:** `90–100` excelente · `80–89` bueno (ajustes menores) · `70–79` funcional pero genérico · `60–69` sobrecargado/poco claro · `<60` rediseñar. **No apruebes una escena con <80 sin explicar sus límites.** *(Mismas bandas en [referencia.md §21](referencia.md).)*

---

## 14. Formato de respuesta por escena (obligatorio)

Antes de escribir código, entrega para cada escena: `PROPÓSITO · MENSAJE · PROTAGONISTA · SECUNDARIOS · COMPOSICIÓN · ESTILO · ENTRADA · PRINCIPAL · SALIDA · TIMING · EASING · STAGGER · SONIDOS (frame + intención de sync; variante y mezcla → diseno-sonoro) · RAZÓN DE DISEÑO · RIESGOS · PUNTUACIÓN`. Luego: plan de escenas → tokens de movimiento → cues de sonido → estructura de componentes → código Remotion → validación.

---

## 15. Checklist antes de aprobar una escena

1. ¿Se entiende **sin audio** y **sin movimiento** (frame estático)?
2. ¿Hay **un** protagonista claro (un solo hero)?
3. ¿Cada movimiento tiene una **causa** y las direcciones son coherentes?
4. ¿Hay **tiempo de lectura** suficiente y el texto no se corta?
5. ¿El movimiento y el sonido **corresponden a la marca**?
6. ¿El código es **determinista** (frame-based, sin CSS/timers/random)?
7. **¿La escena funciona mejor con todos estos efectos o sería más clara quitando alguno?**

**Si dudas en la 7 → quita.**
