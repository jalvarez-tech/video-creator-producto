# 01 · Plan narrativo — proyecto NNN

> Paso 1 de 3. Se escribe **antes** de tocar Remotion.
> Siguiente: [02-layout.md](02-layout.md).

## Cabecera (los supuestos declarados)

| | |
|---|---|
| Clip fuente | `proyectos/NNN/original.mp4` (o `proyectos/NNN/avatar/heygen.mp4`) — 1080×1920 · 25 fps · NNNN f (NN,NN s) |
| Composición | 1080×1920 · **25 fps** · NNNN f *(el fps del clip manda — R01)* |
| Formato | 9:16 vertical (`verticalSocial`) |
| Estilo | educativo / redes / lujo / corporativo / cinematográfico / cómico — **uno solo** |
| Destino | Reels · Shorts · TikTok · YouTube |
| Objetivo del vídeo | *(una frase: qué tiene que pasar en la cabeza de quien lo ve)* |

## Promesa y CTA

- **Promesa (primeros 3 s):** …
- **Acción que se pide al final:** …
- **Lo que NO se cuenta** *(para no meterlo luego "porque cabe")*: …

## Escenas

Un bloque ≈ 8-12 s. La columna **hero** dice quién manda: solo uno por fila.

| # | Tramo (s) | Narrativa | Idea (una frase) | Hero | Frase clave de la voz |
|---|---|---|---|---|---|
| 1 | 0–4 | hook | … | avatar | "…" |
| 2 | 4–14 | contexto | … | avatar | "…" |
| 3 | 14–24 | dato | … | gráfico | "…" |
| 4 | 24–34 | comparación | … | gráfico | "…" |
| 5 | 34–42 | cta | … | gráfico | "…" |

`narrativa` ∈ hook · contexto · explicación · demostración · comparación ·
revelación · conclusión · cta.
`hero` ∈ avatar · gráfico · **b-roll** — uno solo por fila.

## B-roll (solo las escenas que lo pidan)

Se resuelve en el **paso 3·bis**, antes que cámara y gráficos, porque el resto del
plan depende de su duración real. **Dos motores**, y cuál toca lo decide la
honestidad de la pieza, no el coste (`manuales/director-video/SKILL.md` §3h):
lo real se **trae** de un banco (`manuales/edicion-video/scripts/bancos.py`), lo
que no existe se **genera** (`manuales/edicion-video/scripts/grok.py`), y lo que
no tiene referente filmable no es b-roll sino un gráfico.

| Escena | Qué plano (una intención) | Motor | Dur. pedida | Archivo + procedencia | Dur. + resolución reales |
|---|---|---|---|---|---|
| 3 | … | Grok | 6 s | `broll/grok/raw/shot-03.mp4` | … *(medir con `ffprobe`)* |
| 7 | … | banco | 4 s | `broll/pexels/raw/…` · hoja `contactos/07.png` índice **2** · autor · licencia · sha256 · `--porque` | … *(garantizada por el filtro del hueco)* |

- **Lo de Grok:** la **resolución de salida hay que MEDIRLA** (xAI no la documenta),
  las **URLs caducan** y el **fps de la comp manda**. Mientras no se confirme,
  entra como fondo detrás del avatar · scrim oscurecido · plano escalado
  *(nunca full-frame nítido)*.
- **Lo de banco:** la medida está garantizada por construcción —se filtra por el
  hueco al traerlo—, así que **sí puede ir nítido a pantalla completa**. Lo que
  hay que vigilar es lo que no se ve en un frame: el crédito. Va en el manifiesto
  y se cobra al publicar con `bancos.py creditos`.
- **¿Alguna escena pedía plano nítido a pantalla completa y era de algo real?** → banco. ¿Era imposible o ilustrativa? → gráficos / replanteada: …
- **Descartado:** … *(por qué)*

## Simbología de color (si la pieza la necesita)

El color es información, no decoración. Declárala aquí y respétala en todas las capas:

| Color | Significa | Se usa en |
|---|---|---|
| verde `#34d399` | lo que funciona / el lead que se salva | cifras, checks |
| rojo `#ef4444` | lo que se pierde / se descarta | aspas, tachados |
| ámbar `#f59e0b` | el dato neutro | contadores |
| gris | contexto, lo que no pide atención | etiquetas |

## Decisiones tomadas (y las descartadas)

- …
- **Descartado:** … *(por qué)*
