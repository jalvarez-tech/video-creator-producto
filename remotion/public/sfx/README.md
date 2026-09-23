# public/sfx/ — los efectos de sonido (SFX) del motor

De aquí lee el motor de cues (`src/motor/sound/cues.ts` → `PistaSonido`): cada variante
del mapa `SFX`/`POOL` apunta a un archivo de esta carpeta **por su nombre**. Los archivos
de audio no se versionan (solo este README): los repone el instalador desde el set base.
La guía de uso está en `manuales/diseno-sonoro/SKILL.md` y el catálogo por tipo de motion
graphic en `manuales/diseno-sonoro/recetario-motion-graphics.md`.

## El set base: 55 sonidos originales, sintetizados, MIT

El set que trae el producto está **sintetizado**: 55 archivos generados con ffmpeg (lavfi)
a partir de las recetas de `manuales/diseno-sonoro/scripts/sfx.mjs` (ruido filtrado,
osciladores, envolventes). Son obra original del proyecto, con la misma licencia MIT que el
resto: se usan y redistribuyen con tus vídeos sin condiciones. La copia canónica, versionada,
vive en `manuales/diseno-sonoro/sfx-base/`.

Están hechos para el **contrato del motor** (`startFromTarget` en `cues.ts`), que supone
dónde cae el momento reconocible de cada clase de cue:

| Clase (`type` del cue) | Dónde cae el momento reconocible | Archivos |
|---|---|---|
| `impact` · `click` | golpe en **t = 0**: audible desde el primer frame | impact-*, metal*, click-*, ui, pop*, boing, notification, msg-send, glitch*, electric, chime*, success, error, money, coin, paper, liquid, sparkle*, logo, cartoon |
| `whoosh` | pico al **65 %** de la duración de cue habitual; usa `dur` ≈ duración del archivo en frames | whoosh-*, swoosh* |
| `riser` | el crescendo **acaba en el último frame**; con `dur` = frames del archivo (48 · 50 · 13 @30) termina justo en el target | riser-low, riser-cymbal, reverse |
| `texture` | suena desde t = 0; `data-count` (3 s), `tick` (4 s) y `ambient-wind` (8 s) están hechos para ir en bucle | data-count, digital, spin, typing, scribble, tick, ambient-wind |

Formato: 48 kHz mono; `.wav` = PCM 16 bits, `.mp3` = 192 kbit/s sin etiquetas. La extensión es
el contenedor real. Cada archivo está normalizado al pico de muestra que implica su `vol` en
`cues.ts` (`TARGET_DBFS[bucket] − 20·log10(vol)`, sin pasar de 0 dBFS): los `vol` del mapa
colocan cada familia en su objetivo de mezcla (SKILL §10: generales −21, whoosh/impact −27,
ambiente −30 dBFS) sin tocar nada.

### Núcleo: 4 funciones (movimiento · anticipación · llegada · ritmo)

| Archivo | Variante | Qué es |
|---|---|---|
| whoosh-light.wav | `light` | barrido corto y ligero de ruido filtrado (0,44 s) |
| whoosh-whip.wav | `whip` | barrido rápido y agudo, tipo látigo (0,36 s) |
| whoosh-heavy.mp3 | `heavy` | barrido grave con cuerpo y sub (0,64 s) |
| whoosh-wind.wav | `wind` | barrido suave y ancho, de viento (0,59 s) |
| swoosh.mp3 | `swoosh` | barrido agudo y brillante (0,44 s) |
| whoosh-swoosh-07.wav | `swoosh-hero` | barrido largo para un movimiento protagonista (1,62 s; cue de ~48 f) |
| riser-low.mp3 | `low-rumble` | retumbo grave que crece hasta el golpe (1,6 s = 48 f) |
| riser-cymbal.mp3 | `cymbal` | crescendo agudo de platillo (1,67 s = 50 f) |
| impact-deep.mp3 | `deep` · `boom` | impacto grave: sub + golpe con cola (1,6 s) |
| impact-sharp.wav | `sharp` | impacto seco: transiente agudo corto (0,5 s) |
| metal.wav | `metal` | golpe metálico: parciales inarmónicos con cola (1,2 s) |
| click-camera.wav | `camera` | obturador: doble transiente a 0 y 75 ms |
| click-mouse.mp3 | `mouse` | clic de ratón seco (0,12 s) |
| click-pen.mp3 | `pen` | doble clic de bolígrafo a 0 y 35 ms |
| ui.mp3 | `ui` | blip de interfaz: tono breve (0,12 s) |

### Familias específicas (usa la MÁS específica, no un whoosh genérico)

| Archivo | Variante | Para qué motion graphic | Qué es |
|---|---|---|---|
| pop.mp3 | `pop` | aparición de elemento (número, chip, botón, subtítulo) | tono con caída rápida (0,18 s) |
| boing.mp3 | `boing` | spring / rebote elástico exagerado | tono con vibrato descendente (0,9 s) |
| notification.wav | `notification` | notificación / confirmación de app | dos notas (0 y 120 ms) con cola |
| msg-send.wav | `msg-send` | enviar mensaje | barrido ascendente corto (0,35 s) |
| data-count.mp3 | `data` | contador / cifras subiendo | 60 pulsos de 50 ms, en bucle (3 s) |
| digital.wav | `digital` | data-sweep / transformación tech | tono modulado y triturado (1,5 s) |
| glitch.wav | `glitch` | glitch / corte digital / error de señal | ráfagas de ruido troceado (0,6 s) |
| electric.mp3 | `electric` | energía / chispazo tech | zumbido con trémolo (0,8 s) |
| spin.wav | `spin` | rotación / giro 3D | textura con trémolo rápido (2 s) |
| typing.mp3 | `typing` | escritura letra por letra (loop) | ráfagas rítmicas de ruido (3 s) |
| tick.mp3 | `tick` | ritmo, palabra por palabra, reloj | tic-tac cada segundo, en bucle (4 s) |
| chime.mp3 | `chime` | ding de acierto / llegada limpia | campanilla con armónicos (1,5 s) |
| success.wav | `success` | éxito / cambio positivo | arpegio ascendente de 4 notas (0,9 s) |
| error.mp3 | `error` | error / negativo / tachar | dos tonos descendentes (0,45 s) |
| money.mp3 | `money` | dinero / ventas | golpe + tintineo (0,9 s) |
| coin.mp3 | `coin` | moneda / gamificación (8-bit) | onda cuadrada en dos notas (0,45 s) |
| scribble.mp3 | `scribble` | trazo a mano / lápiz / escritura | ruido modulado (1,5 s) |
| paper.wav | `paper` | papel / documento / foto sobre mesa | roce corto (0,7 s) |
| liquid.mp3 | `liquid` | líquido / splash / morph orgánico | dos gotas con glide (0,5 s) |
| sparkle.mp3 | `sparkle` | partículas / brillo / destello | 7 destellos agudos (1,2 s) |
| logo.mp3 | `logo` | reveal de logo / marca | sub + acorde + brillo (2,5 s) |
| reverse.mp3 | `reverse` | cierre inverso / succión (modal, contraer) | barrido invertido que acaba al final (0,45 s = 13 f) |
| cartoon.mp3 | `cartoon` | remate cómico | silbato descendente con vibrato (0,7 s) |
| ambient-wind.mp3 | `ambient-wind` | textura / ambiente continuo (`texture`) | ruido grave modulado, periódico a 8 s (bucle) |

### Pools de variantes alternas (anti-repetición, SKILL §12)

Para no repetir el mismo archivo en cortes consecutivos, estas familias traen 2 alternas
(índice 0 = base). Se eligen con `variantIndex` en el cue → `POOL` en `cues.ts`.

| Variante | Pool (índices 0 · 1 · 2) | Cómo se diferencian |
|---|---|---|
| `pop` | pop.mp3 · pop-02.mp3 · pop-03.mp3 | tono medio · más grave y largo · más agudo y corto |
| `glitch` | glitch.wav · glitch-02.wav · glitch-03.wav | paso 30 ms · 25 ms · 40 ms, distinta nota y resolución |
| `light` | whoosh-light.wav · whoosh-light-02.wav · whoosh-light-03.wav | 0,44 · 0,49 · 0,38 s (cues de 12 · 14 · 10 f) |
| `swoosh` | swoosh.mp3 · swoosh-02.wav · swoosh-03.wav | banda media · más aguda · más grave (13 · 12 · 14 f) |
| `metal` | metal.wav · metal-02.wav · metal-03.wav | 620 · 740 · 470 Hz de fundamental |
| `mouse` | click-mouse.mp3 · click-mouse-02.mp3 · click-mouse-03.mp3 | seco · pulsar + soltar (70 ms) · más agudo |
| `sparkle` | sparkle.mp3 · sparkle-02.mp3 · sparkle-03.wav | 7 destellos · 10 ascendentes · 4 cortos |
| `chime` | chime.mp3 · chime-02.mp3 · chime-03.mp3 | una nota · nota aguda · tres campanas |

## Regenerar o reponer el set

- **Reponer esta carpeta** desde el set base (no necesita ffmpeg; mismos bytes en cualquier
  sistema): `node manuales/diseno-sonoro/scripts/sfx.mjs desde-base` (`--forzar` sobrescribe
  los que ya estén). El instalador (`node herramientas/setup.mjs`) lo hace si faltan.
- **Regenerar el set base** desde las recetas (hace falta un ffmpeg completo, con filtros; el
  que trae Remotion no vale): `node manuales/diseno-sonoro/scripts/sfx.mjs sintetizar --forzar`.
  Es determinista: el mismo ffmpeg produce los mismos bytes. Entre versiones de ffmpeg puede
  cambiar algún byte del MP3, pero no el golpe ni el pico, que es lo que el script valida al
  final (cada archivo se comprueba contra la clase que promete).
- **Medir**: `node manuales/diseno-sonoro/scripts/sfx.mjs medir [archivo…]` da, por archivo,
  el frame del pico de RMS, la ventana audible, el instante del golpe, el pico de muestra y el
  `vol` que le toca por familia. Es la medida que pide R26 antes de escribir un cue.

## Poner tus propios SFX

Un canal puede sustituir cualquier archivo por el suyo **con el mismo nombre y extensión**
(la extensión es el contenedor real; el motor lo carga por nombre y no mira nada más):

1. Copia tu archivo aquí con el nombre estándar (`pop.mp3`, `whoosh-light.wav`…). Para
   ampliar un pool, añade `pop-04.mp3` y una entrada más en `POOL` de `cues.ts`.
2. `node manuales/diseno-sonoro/scripts/sfx.mjs medir pop.mp3`: mira dónde cae el golpe y
   copia el `vol` sugerido al mapa `SFX`/`POOL` de `cues.ts`. Si tu archivo lleva silencio
   de cabeza, el cue tiene que adelantarse (`startFrame = target − pico`) y alargarse
   (`durationInFrames ≥ fin audible + cola`): R26 en `manuales/edicion-video/reglas.md`.
3. Con un banco propio de muchos archivos, escribe un mapa JSON
   (`{ "version": 1, "banco": "…", "destino": "remotion/public/sfx", "entradas": [ { "destino": "pop.mp3", "origen": "carpeta/archivo.mp3", "sha256": "…" } ] }`)
   y repón el set con `node manuales/diseno-sonoro/scripts/sfx.mjs desde-banco <mapa.json>`:
   copia los bytes tal cual, comprueba el sha256, sugiere los `vol` y deja el manifiesto con
   modo «banco», que impide que `sintetizar` o `desde-base` pisen tu set sin querer.
4. Anota la procedencia y la licencia de lo que no sea tuyo **fuera de esta carpeta**: ni el
   README ni el manifiesto lo hacen por ti, y esta carpeta no se versiona.

`.origen.json` es el manifiesto de lo que hay aquí: de dónde salió (`sintetico` · `base` ·
`banco`) y el sha256 de cada archivo. Lo escriben los modos de `sfx.mjs`; no lo edites a mano.
