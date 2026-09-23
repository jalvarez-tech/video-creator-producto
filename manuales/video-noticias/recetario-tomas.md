# 🎞️ Recetario de tomas — formato noticias

> Detalle de las **9 tomas** de [SKILL.md §3](SKILL.md). Cada ficha trae: para qué
> sirve, cuándo NO usarla, sus props en `TomaNoticia` y el sonido de partida.
> El sonido definitivo se declara en `cues-NNN.ts` ([diseno-sonoro](../diseno-sonoro/SKILL.md)).

Código: `remotion/src/motor/noticias/plan.ts` (el tipo) ·
`remotion/src/motor/noticias/dialecto.ts` (las piezas y las reglas; `compilaNoticia` convierte las tomas en plan) ·
`remotion/src/motor/noticias/montadores.tsx` (el JSX de cada pieza) ·
`remotion/src/motor/noticias/Editorial.tsx` (las primitivas).
Ejemplo completo: `remotion/src/motor/demos/noticia-demo.ts` (comp `NoticiaDemo` del Studio).

> **El caso de los ejemplos es ficticio a propósito.** «Talvia Labs» es una empresa de software inventada, su director no existe, la «Gaceta del Sector» es un medio que no existe, y las cifras están puestas para que el molde se vea: nació como cooperativa de cuarenta socios, el director propuso convertirla en sociedad en 2019, los socios fundadores lo demandan en 2026, y el mecanismo es un *retorno con tope* (un inversor pone 1 $ y recupera 100 $ como máximo aunque la empresa gane 500 $). Es el mismo caso, con las mismas cadenas, que monta `noticia-demo.ts`. En una pieza real cada recorte es de un medio real y cada cifra tiene fuente ([SKILL §5.2](SKILL.md)): un ejemplo con personas reales afirmaría cosas que este manual no puede sostener.

---

## ⚠️ Este recetario cubre UNA de las dos superficies

Lo de abajo son los **9 tipos de toma** del DSL `TomaNoticia[]` — la puerta que usa `NoticiaDemo` (`noticia-demo.ts` → `<PistaNoticia>`). Hay una segunda: escribir un **`Plan` nativo** del núcleo con `capa(dialectoEditorialDe(MARCA), "noticia")`. Ahí no se pide un *tipo de toma*, se pide una **pieza** del registro `PIEZAS_NOTICIA`, y ese registro es más grande que estas nueve fichas. La gramática del `Plan` está en `motor/plan/`; un `Plan` nativo de ejemplo (con el dialecto de gráficos, no el editorial) es `remotion/src/motor/demos/plan-demo.ts`.

**Desde 2026-08-13 el dialecto editorial tiene 17 piezas, no 11.** Las seis nuevas vienen del registro compartido (`motor/piezas/`), que sirve a las dos capas del motor:

| Pieza | Qué dibuja |
|---|---|
| `regla` | línea recta que se extiende. Con `estira` toma el ancho del bloque; con `gira`, es un tachón |
| `subrayado` | línea a mano alzada bajo una palabra (`semilla` distinta = otro trazo) |
| `rodea` | óvalo de rotulador con exceso al cerrar. Señalar UNA cosa |
| `flecha` | arco de A a B con la punta orientada por la tangente real |
| `check` | marca de confirmación en dos tiempos |
| `aspa` | dos trazos cruzados EN SECUENCIA — descarte |

Se piden como cualquier otra: `pon("subrayado", { ancho: 420, dur: 14, color: "acento" })`. Pintan con el color del nodo, así que sobre papel salen carbón y sobre cine blancos sin decir nada.

> **Por qué estas seis y no `lista` o `barras`.** El contrato del registro compartido es que una pieza pinte SOLO con `ctx.color`. Las uniones de tinta de los dos dialectos son disjuntas —el editorial no tiene `logro` ni `perdida`—, así que una pieza que colorea partes por separado no puede entrar hasta que las dos capas acuerden un vocabulario semántico común.

> **Este archivo se escribe A MANO y por eso puede mentir.** La capa de gráficos resolvió esto con un catálogo DERIVADO del registro (`graficos/fichas.ts` → `catalogo-graficos.md`, con su test); el dialecto editorial todavía no lo tiene. Es deuda conocida: ver §8 de [cruce-remotion-scenes.md](../motion-graphics/cruce-remotion-scenes.md).

---

## `titular` — el mensaje

**Para qué:** decir la cosa. Es la toma más frecuente del formato y la que sostiene los beats `gancho`, `conflicto` y `clímax`.
**Cuándo NO:** cuando el subtítulo ya dice exactamente eso. Texto duplicado en pantalla se lee como error.

```ts
toma("t01", "titular", "gancho", [0, 78], {
  registro: "cine",              // opcional: por defecto "papel"
  kicker: "Talvia Labs",         // antetítulo. NUNCA lleva el mensaje
  titular: "Talvia Labs no la fundó su director",
  etiqueta: "Fue una cooperativa de cuarenta socios.",   // el remate, más pequeño
}, "Contradice la creencia por defecto en los 3 primeros segundos")
```

- El `kicker` entra primero, el `titular` 4 f después, la `etiqueta` a los 10 f. Ese stagger es lo que hace que se lea en orden en vez de aparecer como bloque.
- Máximo **7-8 palabras** en el titular. Si no cabe, son dos tomas.
- **Sonido:** `impact` / `deep` sobre la palabra clave, no al inicio de la toma.

---

## `prensa` — la prueba

**Para qué:** sostener una afirmación con un recorte real. Es el gesto de credibilidad del formato.
**Cuándo NO:** si no tienes el titular textual y el medio. **Un recorte inventado quema la pieza entera.** (El de abajo lo está porque el caso entero es ficticio; en una pieza real, el `kicker` es un medio que existe y el titular es literal.)

```ts
toma("t03", "prensa", "conflicto", [186, 300], {
  kicker: "Gaceta del Sector",                // el medio: sostiene todo el bloque
  titular: "Los socios fundadores de Talvia Labs demandan a su director por incumplimiento del pacto",
  resaltar: "incumplimiento del pacto",       // se busca literal dentro del titular
}, "Ancla el conflicto en una fuente")
```

- El rotulador entra **14 f después** que el recorte, a propósito: primero se ve la prueba, luego se marca. Al revés no se entiende qué se subraya.
- `resaltar` busca el fragmento **literal** (case-insensitive). Si no lo encuentra, no resalta nada — comprueba la cadena.
- La tarjeta va rotada -1.2° por defecto: es lo que la hace leerse como recorte y no como caja.
- **Sonido:** `paper` al entrar + `pen` en el frame en que arranca el rotulador.

---

## `comparador` — A vs B

**Para qué:** dos o tres opciones enfrentadas en chips glossy del color de acento. El «esto sí / esto no».
**Cuándo NO:** con un solo ítem. Un chip solo no compara nada — lo que querías era una etiqueta.

```ts
toma("t02", "comparador", "contexto", [78, 186], {
  titular: "Nació como cooperativa",
  items: [
    { label: "Cooperativa", glifo: "manos", activo: true },
    { label: "Sociedad", glifo: "caja", activo: false },   // false = se apaga a gris
  ],
  etiqueta: "Para que el software no acabara en manos de un solo dueño",
}, "Fija la premisa original en una imagen")
```

- Glifos disponibles: `manos` (dar / cooperativa) · `caja` (guardar / sociedad) · `balanza` (ley, juicio) · `rayo` (velocidad, disrupción).
- `activo: false` apaga el chip a gris: marca la opción descartada **sin** añadir un aspa encima. Si además pones un aspa, hay dos gestos diciendo lo mismo.
- Entran con stagger de 6 f: se comparan en el orden del array. **El orden es una decisión narrativa.**
- **Sonido:** un `pop` por chip, alternando `variantIndex` para que no suenen idénticos.

---

## `cronologia` — el viaje entre fechas

**Para qué:** explicar que lo de hoy nace de una decisión de antes. Sin fecha, un conflicto no tiene causa.
**Cuándo NO:** con más de 4 hitos. A partir de ahí no es una cronología, es una tabla — y una tabla no se lee en 3 segundos.

```ts
toma("t04", "cronologia", "conflicto", [300, 420], {
  kicker: "Todo empieza antes",
  hitos: [
    { año: "2026", texto: "La demanda" },
    { año: "2019", texto: "El director propone convertir la cooperativa en sociedad" },
  ],
  dur: 40,   // frames que tarda el raíl en recorrerse
}, "Explica que el pleito de hoy nace de una decisión de 2019")
```

- **El orden del array es la dirección del viaje.** Primero de dónde sales. Ir hacia atrás (2026 → 2019) es información, no un descuido.
- El raíl se dibuja **lineal**, sin easing: con easing mentiría sobre la velocidad del recorrido temporal.
- **Sonido:** `whoosh light` al arrancar el raíl + un `tick` en cada hito que se alcanza.

---

## `cifra` — el dato como argumento

**Para qué:** cuando la **magnitud** es el mensaje. El ojo mide el recorrido, no el resultado.
**Cuándo NO:** para un número que solo acompaña. Si el dato no es el argumento de la toma, va como `etiqueta` de un `titular`.

```ts
toma("t07", "cifra", "datos", [630, 744], {
  kicker: "Aunque Talvia gane 500 $",
  de: 0, valor: 100, prefijo: "$",
  etiqueta: "El inversor se queda en 100. El resto vuelve al fondo común de los socios",
  // color: opcional; por defecto el acento de la marca (N.naranja). Nada de hex a mano.
}, "El tope es el corazón de la noticia: hay que ver el número frenar")
```

- `de` importa tanto como `valor`: el recorrido es el argumento. Contar de 0 a 100 y contar de 500 a 100 cuentan historias opuestas.
- Lleva **punch** al aterrizar (SPRING.punch). Solo la cifra clave de la pieza debería llevarlo; si todas hacen punch, ninguna destaca.
- Usa `CifraContada`, **no** el `Contador` de la biblioteca general: aquél nace blanco con halo (fondo oscuro) y sobre papel se ve como una mancha.
- **Sonido:** `data` como textura durante el conteo + `chime` en el frame en que llega.

---

## `medidor` — lo que sube o baja

**Para qué:** dos magnitudes que se mueven a la vez y cuentan una injusticia (mucho dinero, cero control).
**Cuándo NO:** con más de 2 medidores. Tres sliders bajando a la vez no se leen.

```ts
toma("t08", "medidor", "climax", [744, 864], {
  titular: "Lo que compran los inversores",
  medidas: [
    { label: "Control", de: 60,  a: 0,   sufijo: " %", max: 100 },
    { label: "Retorno", de: 500, a: 100, prefijo: "$",  max: 500 },
  ],
}, "La frustración de los inversores se entiende viendo bajar ambos")
```

- `max` fija la escala de la barra. Sin él se toma `max(de, a)` — que suele ser lo que quieres, pero explícito se lee mejor.
- El primer medidor va en el acento (el que importa), el segundo en tinta. Es jerarquía, no variedad.
- **Sonido:** `ui` al aparecer el control + `data` mientras los números se mueven.

---

## `retrato` — metraje enmarcado

**Para qué:** meter una foto o un clip real **dentro** del artículo, sobre papel.
**Cuándo NO:** para un plano que necesita impacto a pantalla completa → usa `escenario`.

```ts
toma("t05", "retrato", "conflicto", [420, 510], {
  media: "broll/NNN/t05-sede-cooperativa.jpg",   // ruta dentro de remotion/public/: la que deja `bancos.py traer`
  esVideo: false,                                // true → OffthreadVideo
  titular: "La sede que dejó de ser de todos",
}, "Pone lugar al momento de ruptura")
```

**Antes de tener el archivo**, declara la INTENCIÓN y sigue maquetando — es un estado legítimo del plan, no un TODO:

```ts
toma("t05", "retrato", "conflicto", [420, 510], {
  buscarMedia: "grieta en la pared",    // en español; el glosario lo traduce
  titular: "La grieta que nadie miró",
}, "Ensena la prueba física de lo que el texto afirma")
```

Y luego el validador te dice el comando exacto que falta por correr:

```bash
node manuales/video-noticias/scripts/revisar-broll.mjs remotion/src/proyectos/NNN/noticia-NNN.ts
```

- Borde de acento + sombra al 15 % + esquinas redondeadas. **Nunca a sangre sobre papel.**
- Ken Burns automático (escala 1 → 1.06 durante la ventana): una foto fija sin deriva se congela.
- **Sin `media` monta el marco vacío con "pendiente"** — sirve para maquetar antes de traer el b-roll. Aparece en los avisos de `revisaNoticia()`.
- Enmarcado **no significa que perdone resolución baja**. El hueco mide 624×804 y encima lleva el Ken Burns, así que la fuente tiene que dar **662×853** o se ve reescalada — `revisar-broll.mjs` la rechaza por debajo. Y su motor natural es el **banco**, no Grok: esta ficha empieza diciendo «una foto o un clip **real**», y para lo real la regla de [director §3h](../director-video/SKILL.md) manda traer, no generar.
- **Sonido:** `camera` (si es foto) o `whoosh light` (si es clip).

---

## `escenario` — metraje a sangre

**Para qué:** el registro «esto está pasando». Sube la apuesta de la pieza.
**Cuándo NO:** más de 3 seguidas (se pierde el registro editorial) ni con material de baja resolución sin scrim.

```ts
toma("t10", "escenario", "climax", [954, 1050], {
  media: "broll/NNN/t10-juzgado.mp4",   // metraje real de banco, a sangre
  esVideo: true,
  titular: "Y el caso ya está en los juzgados",
}, "Deja de ser una discusión interna y pasa a ser pública")
```

- Lleva **velo automático**: `compilaToma` mete una pieza `velo` entre el metraje y el titular, y ahí es donde tiene que ir. No es el scrim del molde y no puede serlo: el ambiente se pinta siempre por debajo de los hijos, y el metraje a sangre ES un hijo — un scrim de molde se dibujaría debajo del vídeo. Sin velo, el titular blanco desaparece en cuanto el metraje se aclara: medido, un clip de luma 245 lo deja invisible.
- **Si escribes un plan NATIVO** (un `Plan` del núcleo a mano, no compilado desde tomas) el velo lo pones tú: `pon("velo", { en: 0, entra: QUIETA })` entre el `media` a sangre y el texto. La regla `veloProtege` avisa si falta, si está en el sitio equivocado del z-order o si se queda corto para donde cae el bloque de texto.
- El titular cuelga del tercio inferior por `ancla.cuelga` (`LAYOUT.cuelgaCine` = 560, el `paddingBottom` del intérprete viejo), por encima de la zona de subtítulos. Va en la TOMA y no en el molde: el `cierre` comparte molde `cine` y está diseñado centrado.
- Material de archivo en **blanco y negro** funciona especialmente bien aquí: contrasta con el acento del resto y refuerza el «esto es documento».
- **Sonido:** `whoosh heavy` en el corte de entrada.

---

## `cierre` — el remate

**Para qué:** negro, una palabra en display, y el gancho a la parte 2. El formato vive de que la historia no cierre del todo.
**Cuándo NO:** si no hay parte 2 ni CTA real. Un «Parte 2» que nunca llega quema la confianza del canal.

```ts
toma("t11", "cierre", "cierre", [1050, 1140], {
  titular: "Parte 2",
  etiqueta: "Por qué los socios hablan de traición",
}, "Gancho a la continuación")
```

- Una o dos palabras. Un cierre de 6 palabras no es un cierre.
- **Sonido:** `impact` / `deep` con cola larga que se apaga con el vídeo.

---

## Tabla rápida de props

| Prop | Tipo | Usan |
|---|---|---|
| `kicker` | string | titular · prensa (el medio) · cronologia · cifra |
| `titular` | string | todas menos `cronologia` |
| `etiqueta` | string | titular · prensa · comparador · cifra · cierre |
| `resaltar` | string | prensa |
| `de` `valor` `prefijo` `sufijo` | number/string | cifra |
| `items` | `ItemComparador[]` | comparador |
| `hitos` | `Hito[]` | cronologia |
| `medidas` | `Medida[]` | medidor |
| `media` `esVideo` | string/bool | retrato · escenario |
| `buscarMedia` | string o `{consulta, tipo, indice}` | retrato · escenario — la INTENCIÓN, en español, mientras el archivo no exista |
| `grado` | `{exposicion, contraste, saturacion, calido}` | retrato · escenario — la corrección MEDIDA por `bancos.py gradar`. El look del formato no va aquí |
| `alto` `desde` `opacidad` `tinta` `rampa` | number/string | velo (solo en planes nativos: en `escenario` lo pone el compilador) |
| `tipo` `ancho` `alto` `grosor` `dur` | `"fisura"\|"vertical"\|"horizontal"\|"diagonal"` + number | grieta — el muro esquemático con la grieta dibujándose. Ojo: una `fisura` con `grosor > 4` avisa, porque dibujarla gruesa contradice al «riesgo bajo» de su propia toma |
| `registro` | `"papel"\|"cine"` | override del registro por defecto |
| `color` | string | cifra · medidor |
| `dur` | number | cronologia · cifra · medidor |
| `soundCueId` | string | todas (enlaza con `cues-NNN.ts`) |
| `reason` | string | **todas — obligatorio** |
