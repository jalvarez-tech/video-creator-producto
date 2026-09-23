# 01 · Plan de noticia — proyecto NNN

> Se rellena **antes** de tocar Remotion. Copia este archivo a
> `proyectos/NNN/artefactos/01-noticia.md`.
> Guía: [SKILL.md](../SKILL.md) · tomas: [recetario-tomas.md](../recetario-tomas.md).
>
> Por qué existe: sin este paso salen piezas que **enumeran hechos** en vez de
> mover una creencia. La sección "La creencia" es la que decide si hay vídeo.

## Cabecera

| | |
|---|---|
| Noticia / fuente principal | *(titular + medio + fecha + URL)* |
| Voz en off | `noticias/NNN-vo.wav` — NN,NN s (`ffprobe`; la genera `generar-vo.mjs` en `proyectos/NNN/vo/` y se copia a `remotion/public/noticias/`) |
| Composición | 1080×1920 · **30 fps** · NNNN f *(= duración de la voz — la voz manda)* |
| Formato | 9:16 vertical · sin avatar |
| Marca (`MARCA.sello`) | *(nombre del canal, o `null`)* |
| Destino | Shorts · Reels · TikTok |
| ¿Hay parte 2? | sí / no *(si no, el cierre es CTA, no "Parte 2")* |

## La creencia (lo que decide si hay vídeo)

- **La gente cree:** …
- **En realidad:** …
- **Por qué le importa a quien lo ve:** …

> Si no puedes completar estas tres líneas, todavía no tienes un vídeo — tienes
> un artículo. Vuelve a la noticia y busca qué contradice.

## Gancho (los primeros 4 s)

- **Frase literal:** "…"
- **Tipo:** desmentido · cifra imposible · consecuencia oculta
- **Por qué contradice lo que se cree:** …

*(No vale una pregunta, ni presentarse, ni resumir el vídeo antes de darlo.)*

## Fuentes — cada cifra y cada recorte

**Sin esta tabla completa no se renderiza.** El formato vende credibilidad; un
dato sin sostener la quema entera. Si un dato no se puede verificar, **se cae del plan**.

| Dato / titular | Valor exacto | Medio | Fecha | URL | ¿Verificado? |
|---|---|---|---|---|---|
| Titular del recorte (`prensa`) | "…" *(literal)* | *(medio)* | AAAA-MM-DD | … | ☐ |
| Cifra principal (`cifra` / `medidor`) | … *(con unidad)* | *(medio)* | AAAA-MM-DD | … | ☐ |

- **Datos que se cayeron por no poder sostenerse:** … *(anótalos: evita reintroducirlos)*

## Beats → tomas

Un beat puede ocupar varias tomas. **Una idea por toma**; sin huecos ni solapes.

| # | Frames | Beat | Toma | Registro | Contenido (una frase) | Sonido | Frase de la voz |
|---|---|---|---|---|---|---|---|
| 1 | 0–78 | gancho | titular | cine | … | impact deep | "…" |
| 2 | 78–186 | contexto | comparador | papel | … | pop ×2 | "…" |
| 3 | 186–300 | conflicto | prensa | papel | … | paper + pen | "…" |
| 4 | 300–420 | conflicto | cronologia | papel | … | tick | "…" |
| 5 | … | explicacion | … | papel | … | … | "…" |
| 6 | … | datos | cifra | papel | … | data + chime | "…" |
| 7 | … | climax | medidor | papel | … | ui | "…" |
| 8 | … | cierre | cierre | cine | … | impact deep | "…" |

`beat` ∈ gancho · contexto · conflicto · explicacion · datos · climax · cierre
`toma` ∈ titular · prensa · comparador · cronologia · cifra · medidor · retrato · escenario · cierre
`registro` ∈ papel *(explica)* · cine *(muestra)* — máx. 3 `cine` seguidas

**Comprobación del bloque `explicacion`:** ¿qué **mecanismo** se explica que no
esté en el titular de la noticia? → …
*(Si la respuesta es "ninguno", la pieza es un titular estirado. Rehaz el plan.)*

## Metraje y b-roll

Se **trae o se genera**, y cuál de las dos cosas lo decide la honestidad de la
pieza, no el coste: la regla está en `manuales/director-video/SKILL.md` §3h.
Conviene tenerlo antes de escribir el plan, porque la duración real del clip
condiciona los frames — pero no bloquea: una toma puede declarar
`buscarMedia: "…"` y maquetarse sin material.

| Toma | Qué plano | Motor (banco / Grok / propio) | Hueco (`retrato` 662×853 · `escenario` 1080×1920) | Por qué ESE plano y no el de al lado |
|---|---|---|---|---|
| 5 | … | banco | retrato *(enmarcado)* | … *(= el `--porque` de `bancos.py traer`)* |

- **El autor, la licencia, la URL y el sha256 NO se copian aquí.** Viven en
  `proyectos/NNN/broll/manifiesto.json`, que es lo único del b-roll que se
  versiona, y `revisar-broll.mjs` los comprueba contra el plan. Dos fuentes de
  verdad sobre de quién es el metraje es peor que ninguna.
- **Recuerda:** sobre papel el metraje va SIEMPRE enmarcado (`retrato`); a sangre solo sobre negro (`escenario`).
- **Descartado:** … *(por qué)*

## Decisiones tomadas (y lo que NO se cuenta)

- **Lo que se deja fuera a propósito:** … *(para no meterlo luego "porque cabe")*
- **Descartado:** … *(por qué)*

## Validación

- [ ] `node manuales/video-noticias/scripts/revisar-plan.mjs <plan>` sale limpio *(pega aquí la salida)*
- [ ] `node manuales/video-noticias/scripts/revisar-broll.mjs <plan>` sale limpio *(o «esta pieza no pide b-roll»)*
- [ ] Frames clave renderizados: `[…]`
- [ ] Prueba 720p vista y aprobada
- [ ] Todas las fuentes verificadas en la tabla de arriba
- [ ] Créditos del metraje pegados en la descripción del vídeo (`uv run manuales/edicion-video/scripts/bancos.py creditos --proyecto NNN`)
