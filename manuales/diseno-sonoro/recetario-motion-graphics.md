# 🎬 Recetario de sonido por tipo de motion graphic

Catálogo de consulta del skill [`SKILL.md`](SKILL.md). Para CADA motion graphic
indica el movimiento, las familias sonoras recomendadas y la **variante concreta del
sistema** (columna `variante` → mapa `SFX` de `remotion/src/motor/sound/cues.ts`).

**Cómo leerlo:** localiza el elemento → su animación → aplica la variante más específica
(§3.6/§4 del SKILL). Whoosh/riser/impact/click son el complemento, no la primera opción.
Respeta las capas por tipo de elemento (SKILL §8) y la duración→envolvente (SKILL §9).

Leyenda de intensidad: 🔈 sutil · 🔉 media · 🔊 fuerte.

---

## 1. Textos

| Animación | Movimiento | Recomendado | Variante | Nota |
|---|---|---|---|---|
| Fade in suave | opacity | soft air · gentle chime · light texture 🔈 | `light` · `wind` · `chime` | **No** uses impactos fuertes |
| Entra desde un costado | slide direccional | whoosh direccional | `whip` (rápido) · `light` (pequeño) · `heavy` (grande) · `wind` (lento) | sigue la `direction` |
| Palabra por palabra | reveal por palabra | tick · soft click · pop mínimo | `tick` · `mouse` · `pop` | sonoriza **solo** palabras clave, cambios de línea, inicio y cierre |
| Letra por letra (typing) | draw/escritura | typing · keyboard · mechanical tick | `typing` (loop, type `texture`) | se detiene EXACTO al terminar la escritura |
| Escala / overshoot / golpe | scale rápida | pop · punch · sharp impact | `pop` (pequeño) · `sharp` (titular) · `deep` (dramático) · `cartoon` (cómico) | primer contacto = target |

**Receta texto elegante:** `wind`/`light` (soft air) → `chime`. **Texto promocional:** `whip` → `sharp`.

---

## 2. Títulos y encabezados

| Caso | Cadena | Variantes |
|---|---|---|
| Título principal (hook, nombre de producto, sección, conclusión) | riser → whoosh → impact/chime | `low-rumble` → `light`/`heavy` → `deep`/`chime` |
| Subtítulo / lower third (ligero, no compite con la voz) | 1 solo efecto | `ui` · `pop` · `light` · `mouse` |

---

## 3. Logos

| Estilo de logo | Recomendado | Variante |
|---|---|---|
| Minimalista (fade, máscara, líneas) | tonal reveal · soft chime · shimmer 🔈 | `logo` · `chime` · `sparkle` |
| Tecnológico | digital sweep · UI activation · synthetic pulse · clean glitch | `digital` · `ui` · `electric` · `glitch` |
| Cinematográfico | low rumble · riser · deep impact · reverb tail | `low-rumble` → `heavy` → `deep` |
| Elegante / lujo | crystal chime · soft shimmer · airy reveal (colas limpias) | `chime` · `sparkle` · `logo` — **evita** cómico/agresivo/digital excesivo |
| Con trazos / dibujo | pencil · marker · brush · paper | `scribble` · `paper` (avanza con el trazado) |

**Receta lujo:** soft riser → `logo` → `chime`/`sparkle`. **Cinematográfico:** `low-rumble` → `heavy` → `deep`.

---

## 4. Íconos

| Caso | Recomendado | Variante |
|---|---|---|
| Aparece (scale/bounce) | pop · blip · UI click | `pop` · `ui` |
| Seleccionado | checkbox tick · button click · confirmation | `ui` · `mouse` · `chime` |
| Éxito | positive chime · success · bright sparkle | `success` · `chime` · `sparkle` |
| Error / alerta | error tone · warning beep · digital buzz (claro, no molesto) | `error` · `glitch` |

**Recetas:** éxito → `pop` → `success`. Error → `glitch`/`error` → `tick` grave.

---

## 5. Botones e interfaces

| Caso | Recomendado | Variante |
|---|---|---|
| Hover (solo si es narrativamente importante) | soft tick · UI hover 🔈 | `ui` · `tick` |
| Click / tap | UI click en el frame de compresión | `ui` · `mouse` |
| Liberación del botón (opcional) | segundo sonido más suave | `mouse` |
| Activación de función | click → digital activation → confirmation | `ui` → `digital` → `chime` (no siempre las 3 capas) |
| Toggle | switch click · mechanical snap · digital toggle | `ui` · `metal` |
| Campo de texto | keyboard taps · typing loop · confirmation al terminar | `typing` (texture) → `chime` |
| Scroll (sutil, proporcional a la velocidad) | soft swipe · smooth digital scroll · paper | `light` · `swoosh` · `paper` |

---

## 6. Tarjetas, paneles y ventanas

| Caso | Recomendado | Variante |
|---|---|---|
| Card entrando | light whoosh · swipe · soft pop al aterrizar | `light`/`swoosh` → `pop` |
| Card con bounce | whoosh corto → elastic pop | `light` → `boing`/`pop` |
| Modal abriéndose | UI expansion · soft swell · pop | `ui` · `digital` · `pop` |
| Modal cerrándose | reverse pop · suction · reverse whoosh | `reverse` |
| Panel expandiéndose | stretch · mechanical · digital expansion | `digital` · `metal` |
| Panel contrayéndose | reverse stretch · suction | `reverse` |

**Receta card con spring:** `light` → `boing`.

---

## 7. Gráficas y visualización de datos

| Caso | Recomendado | Variante |
|---|---|---|
| Línea dibujándose | digital tracing · pencil · rising tonal (avanza con la línea) | `digital`/`scribble` (type `texture`) |
| Barra creciendo | tonal rise · mechanical growth → tick/pop/impact al valor final | `data`/`digital` (texture) → `tick`/`pop`/`chime` |
| Contador numérico | rapid ticks · digital counting · slot-machine (solo dinámico/comercial) | `data`/`tick` (texture) → `chime`/`money` final |
| Cambio positivo | ascending chime · success · bright pop | `success` · `chime` |
| Cambio negativo | descending tone · low tick · soft negative UI | `error` · `tick` |
| Gráfica completa revelada | riser suave · data sweep → impact/chime final | `low-rumble`/`digital` → `deep`/`chime` |

**Receta tech:** `digital` (data sweep) → `data` (growth loop) → `chime` (confirmation). **Contador:** `data`/`tick` → `chime`/`money`.

---

## 8. Formas geométricas

| Caso | Recomendado | Variante |
|---|---|---|
| Círculo expandiéndose | soft expansion · bubble · air pulse | `pop` · `liquid` · `wind` |
| Forma contrayéndose | suction · reverse bubble · reverse whoosh | `reverse` |
| Formas chocando | pop (ligeras) · sharp (rígidas) · thump (grandes) · metallic (metal) | `pop` · `sharp` · `deep` · `metal` |
| Formas rebotando | elastic pop · rubber · cartoon boing · thump | `boing` · `pop` · `cartoon` | *un sonido por rebote importante, no por cada uno* |
| Rotación | spin · circular whoosh · mechanical rotation | `spin` · `whip` (continua → `spin` loopable, bajo volumen) |

---

## 9. Spring / animaciones elásticas (Remotion `spring`)

`IF animationType = spring → evalúa overshoot, stiffness y nº de rebotes.`

| Caso | Variante |
|---|---|
| Spring corto y elegante | soft elastic pop → `pop`/`boing` 🔈 |
| Spring exagerado | boing / cartoon spring → `boing`/`cartoon` |
| Spring de UI | digital pop → `ui`/`pop` |
| Spring de objeto pesado | thump + subtle bounce → `deep`/`metal` + `boing` 🔈 |

El **primer impacto** coincide con la primera llegada a la posición final; los rebotes secundarios, a menor volumen.

---

## 10. Morphing y transformaciones

| Caso | Recomendado | Variante |
|---|---|---|
| Forma → forma | morph · liquid transition · energy modulation | `liquid` · `digital` |
| Transformación tecnológica | digital reconstruction · scanner · glitch · futuristic sweep | `digital` · `glitch` · `electric` |
| Transformación orgánica | liquid · stretch · bubble · fluid | `liquid` · `ambient-wind` |
| Antes / después | riser → transformation → impact/chime | `low-rumble` → `digital`/`liquid` → `deep`/`chime` |

La transformación debe sentirse **continua** (un efecto, no varios desconectados).

---

## 11. Máscaras y revelaciones

| Caso | Recomendado | Variante |
|---|---|---|
| Wipe horizontal/vertical | directional whoosh · swipe · brush | `whip`/`light` · `scribble`/`paper` |
| Revelación circular | expansion · bubble · tonal bloom | `pop` · `liquid` · `chime` |
| Revelación por luz | shimmer · sparkle · bright sweep | `sparkle` · `chime` |
| Revelación por partículas | particle movement · sparkles · dust | `sparkle` |
| Revelación por tinta/líquido | liquid · splash · ink | `liquid` |

El efecto debe coincidir con el **material visual** usado (SKILL §3.6).

---

## 12. Partículas, brillos y destellos

| Caso | Recomendado | Variante |
|---|---|---|
| Partículas pequeñas | sparkle · tinkle · soft crystal | `sparkle` 🔈 |
| Destello importante | shimmer · bright chime · flash | `sparkle` · `chime` |
| Explosión de partículas | particle burst · pop · impact | `sparkle` + `pop`/`deep` |
| Polvo / arena / humo | dust · soft granular · wind | `ambient-wind` · `wind` — **no** brillos si es polvo/humo/ceniza |

---

## 13. Glitches y errores digitales

| Caso | Recomendado | Variante |
|---|---|---|
| Glitch de transición | digital glitch · stutter · static burst | `glitch` |
| Texto con glitch | pequeños fragmentos en los cambios visibles | `glitch` 🔉 |
| Error de señal | static · buzz · digital dropout | `glitch` · `error` |
| Glitch elegante | versiones cortas, limpias, volumen moderado | `glitch` 🔈 — **no** glitches agresivos en corporativo/elegante/emocional salvo intención |

---

## 14. Elementos mecánicos y tecnológicos

| Caso | Recomendado | Variante |
|---|---|---|
| Piezas encajando | mechanical click · snap · lock · metallic tick | `metal` · `ui` |
| Engranajes | gear movement · ratchet · metal rotation | `spin` · `metal` (loop) |
| Escaneo | scanner sweep · digital beep · radar | `digital` · `electric` |
| Carga / procesamiento | loading loop · digital pulse · processing | `digital` (type `texture`) |
| Sistema completado | completion chime · confirmation beep · success | `chime` · `success` |

---

## 15. Elementos líquidos y orgánicos

| Caso | Recomendado | Variante |
|---|---|---|
| Splash (entra/sale/golpea líquido) | splash | `liquid` |
| Gotas | sincroniza cada gota **importante**, no todas | `liquid` 🔈 |
| Burbujas | bubble pop · underwater | `liquid` · `pop` |
| Movimiento viscoso | slime · wet · sticky pull | `liquid` |
| Crecimiento orgánico (plantas/formas) | organic growth · gentle tonal rise · soft rustle | `ambient-wind` · `liquid` 🔈 |

---

## 16. Animaciones dibujadas a mano

| Caso | Recomendado | Variante |
|---|---|---|
| Línea dibujándose | pencil · pen · marker · brush | `scribble` (sigue la velocidad del trazo) |
| Círculo que resalta | sigue la velocidad del trazo | `scribble` |
| Subrayado | marker swipe · pencil stroke | `scribble` · `paper` |
| Tachado | fast marker · scratch · paper stroke | `scribble` · `paper` |
| Boceto apareciendo | scribble · paper · pencil details | `scribble` · `paper` |

**No** uses efectos digitales sobre animación manual salvo mezcla deliberada de lenguajes. **Receta:** `scribble` → `tick`.

---

## 17. Fotografías y multimedia

| Caso | Recomendado | Variante |
|---|---|---|
| Fotografía apareciendo | camera shutter · photo click · paper placement | `camera` · `pop` · `paper` |
| Galería de fotos | shutter/click en cada cambio, alternando intensidad | `camera` (varía volumen, §12) |
| Foto cayendo sobre superficie | whoosh → paper slap / soft impact | `light` → `paper`/`sharp` |
| Video dentro de una interfaz | UI activation al empezar · soft stop al terminar · digital transition al cambiar | `ui` · `digital` |

**Receta:** `light` → `camera`.

---

## 18. Mapas, rutas y ubicaciones

| Caso | Recomendado | Variante |
|---|---|---|
| Pin apareciendo | pop · location ping · UI marker | `pop` · `ui` |
| Ruta dibujándose | tracing · digital movement · travel whoosh | `digital`/`scribble` (texture) |
| Movimiento entre ubicaciones | continuous whoosh · travel sweep | `wind` · `light` |
| Llegada al destino | confirmation chime · location ping · soft impact | `chime` · `pop` |

**Receta:** `light` (map sweep) → `pop` (location).

---

## 19. Transiciones espaciales y 3D

| Caso | Recomendado | Variante |
|---|---|---|
| Cámara atraviesa un objeto | heavy whoosh · tunnel sweep · low-freq pass-by | `heavy` · `low-rumble` |
| Objeto girando en 3D | circular whoosh · mechanical spin · air rotation | `spin` · `whip` |
| Profundidad / parallax | subtle spatial whoosh · layered air · ambient | `wind` · `ambient-wind` 🔈 |
| Objeto acercándose | sube volumen + graves progresivamente | `heavy`/`deep` (crescendo) |
| Objeto alejándose | baja volumen + presencia + graves | `wind` (decrescendo) |

---

## 20. Animaciones cómicas

Solo cuando el tono del vídeo permite humor (nunca en escenas serias/emocionales/lujo).

| Caso | Variante |
|---|---|
| Aparición exagerada | cartoon pop → `cartoon`/`pop` |
| Caída inesperada | plop → `cartoon` |
| Movimiento elástico | boing → `boing` |
| Interrupción repentina | record scratch → `cartoon` |
| Error intencional | comedic buzz → `cartoon`/`error` |

---

## 21. Ambientes y foley

Los motion graphics conviven con material grabado; el ambiente/foley mejora la sensación de realidad.

**Ambientes** (ciudad, oficina, naturaleza, interior, tecnología, público, viento, vehículo). Reglas: continuidad entre planos · fades suaves · **por debajo de la voz** · no reiniciar abruptamente en cada escena. Implementa como `type: "texture"` + `ambient-wind` con `fadeIn/fadeOut` y `loopable`, o añade a `public/sfx/` un ambiente propio con nombre estándar (SKILL §11).

**Foley** (pasos, puertas, ropa, papel, teclado, objetos sobre mesa, golpes, cristal, metal, agua) — variantes del mapa: `paper`, `metal`, `liquid`, `camera`, `mouse`/`typing` (teclado), `chime` (cristal).

```
IF acción física claramente visible AND hay foley compatible
THEN prioriza el foley sobre el efecto abstracto.
```

Ejemplo — una taza cae sobre una mesa: **correcto** = cerámica/metal sobre madera (`metal`/`paper`) · secundario = `sharp` · **incorrecto** = whoosh sin sonido de contacto.

---

## 22. Recetas rápidas

| Situación | Cadena | Variantes |
|---|---|---|
| Texto entrada elegante | soft air whoosh → gentle chime | `wind`/`light` → `chime` |
| Texto promocional con energía | whip whoosh → punch | `whip` → `sharp` |
| Tarjeta con spring | light whoosh → elastic pop | `light` → `boing` |
| Botón activado | UI click → digital confirmation | `ui` → `chime`/`digital` |
| Contador de estadísticas | rapid ticks → final chime | `data`/`tick` → `chime` |
| Gráfica tecnológica | digital sweep → data growth → confirmation tick | `digital` → `data` → `tick` |
| Logo de lujo | soft riser → airy reveal → crystal chime | `low-rumble` → `logo` → `chime`/`sparkle` |
| Logo cinematográfico | low rumble → heavy whoosh → deep impact | `low-rumble` → `heavy` → `deep` |
| Elemento dibujado | pencil/marker stroke → soft tick | `scribble` → `tick` |
| Transformación líquida | liquid movement → soft splash/bubble pop | `liquid` → `pop` |
| Glitch controlado | digital stutter → static hit → clean UI tone | `glitch` → `metal`/`error` → `ui` |
| Fotografía entrando | light whoosh → camera shutter | `light` → `camera` |
| Pin de ubicación | map sweep → location pop | `light` → `pop` |
| Ícono de éxito | soft pop → ascending chime | `pop` → `success` |
| Ícono de error | digital buzz → short low tick | `glitch`/`error` → `tick` |

---

> **Recuerda (SKILL §14):** prioriza siempre el efecto específico sobre el genérico, respeta
> la coherencia material, elige UNA intención principal, cuida las capas por tipo de elemento
> y no repitas el mismo archivo en eventos consecutivos (§12). Si el efecto no mejora la
> escena, no lo pongas.
