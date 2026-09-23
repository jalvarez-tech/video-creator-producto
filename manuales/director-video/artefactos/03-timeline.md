# 03 · Timeline — proyecto NNN

> Paso 3 de 3. El frame exacto de cada cosa. Se escribe con la **transcripción
> real** delante (`proyectos/NNN/transcripcion.json`), no con el guion: la voz
> manda y casi nunca cae donde decía el papel.
> De aquí salen, casi copiando: `camara-NNN.ts` · `graficos-NNN.ts` ·
> `cues-NNN.ts` · `subtitulos-NNN.ts`.

**fps de la comp:** 25 → `frame = round(segundo × 25)`. Todos los números de este
archivo son frames absolutos a ese fps.

## Mapa maestro

Una fila por evento. Si una celda está vacía, esa capa **no hace nada** ahí —y eso
es una decisión, no un olvido.

| frames | s | narrativa | voz (frase real) | cámara | gráfico | sonido | subtítulo |
|---|---|---|---|---|---|---|---|
| 0–50 | 0,0–2,0 | hook | "…" | close 1.0→1.16 | `Titular` in | whoosh light | "…" |
| 50–200 | 2,0–8,0 | contexto | "…" | — | — | — | "…" |
| 200–330 | 8,0–13,2 | dato | "…" | *reposa* | `Contador` 0→87 | data + chime | — |
| 330–360 | 13,2–14,4 | — | — | medium 1.08 | `Subrayado` | scribble | — |

## Tomas de gráficos (borrador de `graficos-NNN.ts`)

Una fila por **toma**, que es la unidad del plan: `gfx(id, molde, beat, ventana,
jerarquía, reason, hijos)`. El **molde** dice dónde vive la toma (ancla, caja
útil, scrim) y los **hijos** son el árbol que se coloca dentro; **no hay `zona`,
ni `dy`, ni `top`** — la única coordenada del sistema es `xy` dentro de un grupo
`diagrama` (`motor/plan/nucleo.ts`). Si dos cosas van una debajo de otra, son dos
hijos de la misma `col()`, no dos números medidos a ojo.

Moldes de la capa de gráficos: `sello · cta · franja · pantalla · capa`.
Beats: `gancho · problema · prueba · mecanismo · giro · remate · cta`.
Jerarquía: `hero · apoyo · ambiente` — **un solo `hero` a la vez**.

| id | molde | beat | ventana | jerarquía | hijos (árbol) | reason |
|---|---|---|---|---|---|---|
| `g00-ambiente` | `capa` | gancho | 8–fin | ambiente | — (todo en `ambiente.particulas`) | Que el fondo plano no se lea como imagen congelada |
| `g01-gancho` | `franja` | gancho | 8–70 | hero | `col([kicker, titular])` | Fija la promesa mientras la voz la enuncia |
| `g02-dato` | `franja` | prueba | 200–330 | hero | `col([cifra, etiqueta, subrayado])` | La magnitud ES el argumento |
| `g03-cta` | `cta` | cta | 640–fin | hero | `col([...], { piel: { caja: "sello" } })` | Única acción que se pide |

Recuerda: **el orden del array ES el z-order** (por eso la capa de ambiente va
primera) y el `reason` va **antes** que los hijos en el builder, a propósito: si
no sale una frase honesta, esa toma no va.

Comprueba el plan antes de renderizar:

```ts
import { revisaPlan } from "../../motor/plan/nucleo";
console.log(revisaPlan(graficosNNN)); // [] = limpio — UN solo argumento: el fps sale del plan
```

Detecta dos `hero` solapados, ventanas de menos de medio segundo, `reason`
vacíos, ids repetidos, y lo que no cabe en el molde: alto (R08) y ancho (R09).
`<PistaGraficos>` lo llama solo en cada render y lo escupe por consola.

Plantilla real de la que copiar, ya en esta gramática:
`remotion/src/motor/demos/graficos-demo.ts` (y la gramática entera, en
`remotion/src/motor/demos/plan-demo.ts`).

## Cues de sonido (borrador de `cues-NNN.ts`)

| id | type | variant | targetFrame | reason |
|---|---|---|---|---|
| `sfx-hook` | whoosh | light | 8 | Acompaña la entrada del titular |
| `sfx-data` | texture | data | 200 | Sostiene el contador mientras sube |
| `sfx-chime` | impact | chime | 330 | Marca la llegada de la cifra |

Recuerda: la sincronía la calcula `cue()` según el `type` (riser termina en el
target, whoosh pica al 65 %, impact/click arrancan en el target).

## Movimientos de cámara (borrador de `camara-NNN.ts`)

| id | frames | plano | de → a | purpose | reason |
|---|---|---|---|---|---|
| `cam-hook` | 0–20 | medium→close | 1.00 → 1.16 | hook | El acercamiento refuerza la pregunta inicial |

## Puertas de control

- [ ] Frames clave revisados (R05): …
- [ ] Prueba 720p aprobada (R06)
- [ ] Final exportado
