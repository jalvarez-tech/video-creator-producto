# 02 · Layout — proyecto NNN

> Paso 2 de 3. Dónde vive cada cosa en pantalla. Se escribe con el
> [01-plan.md](01-plan.md) delante y **sin pensar todavía en frames**.
> Siguiente: [03-timeline.md](03-timeline.md).

## Reparto del espacio (9:16 · 1080×1920)

| Banda | y (px) | Quién la ocupa | Regla |
|---|---|---|---|
| Superior | 0–340 | motion graphics (`zona: "superior"`) | R08: nunca sobre la cara |
| Cara | 340–1300 | avatar | libre salvo toma de gráfico a pantalla completa |
| Subtítulos | ~1340 | subtítulos y sellos (`zona: "inferior"`) | con scrim si hay texto |
| Márgenes | 118 px | zona segura (11 % — `presets.ts`) | nada de contenido fuera |

*(16:9: banda superior 0–190, subtítulos ~930, margen 96.)*

## Dos tipos de toma (no se mezclan)

- **Sobre el avatar** — el gráfico va en una banda, el avatar sigue siendo el hero.
- **Toma de gráfico** — pantalla completa; el avatar no se ve y la **cámara reposa**.

Lista aquí las tomas de gráfico, que son las que cambian el montaje:

| # escena | Toma | Fondo / luz | Por qué a pantalla completa |
|---|---|---|---|
| 3 | gráfico | degradado + foco ámbar arriba-izq. | el dato necesita todo el ancho |

## Z-order de la composición

```tsx
import { MONTADORES_BASE, PistaGraficos } from "../../motor/graficos/PistaGraficos";

<AbsoluteFill>                        {/* fondo */}
  <CamaraVirtual cues={camaraNNN}>    {/* SOLO el avatar */}
    <OffthreadVideo … />
  </CamaraVirtual>
  <PistaGraficos plan={graficosNNN} montadores={MONTADORES_BASE} />
                                                {/* overlay fijo — `montadores` es
                                                    OBLIGATORIO y no tiene defecto */}
  <SubtitulosSync segmentos={subtitulosNNN} />  {/* overlay fijo */}
  <Audio src={…} />                             {/* la voz, siempre montada */}
  <PistaSonido cues={cuesNNN} duckDb={-5} />
</AbsoluteFill>
```

## Gráficos por escena

Antes de inventar uno, mira el catálogo:
`manuales/motion-graphics/catalogo-graficos.md` o la
composición `Catalogo` del Studio.

| # escena | Qué se ve | Gráfico de la biblioteca | Zona | ¿Nuevo componente? |
|---|---|---|---|---|
| 1 | promesa en texto | `Titular` | superior | no |
| 3 | 87 % de leads sin respuesta | `Contador` + `Subrayado` | superior | no |
| 4 | antes / después | `Tarjeta3D` | centro | no |
| 5 | CTA | `Sello` + `Particulas` (estallido) | inferior | no |

> Si una fila dice **"nuevo componente: sí"**, decide ya si es específico de esta
> pieza (vive en el proyecto) o reutilizable (sube a `motor/graficos/`, con su
> ficha en el registro `PIEZAS` de `coreografia.ts`, su montador en
> `PistaGraficos.tsx` y su demo en `Catalogo.tsx`).

## Encuadre de cámara por escena

| # escena | Plano | Motivo del reencuadre |
|---|---|---|
| 1 | close 1.16 | el hook pide cercanía |
| 3 | *reposo* | manda el gráfico a pantalla completa |
