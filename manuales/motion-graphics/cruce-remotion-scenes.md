# Cruce con `lifeprompt-team/remotion-scenes`

> **Análisis histórico (2026-08-13), no documento de estado.** Describe el motor
> tal como estaba ese día, con referencias `archivo:línea` de entonces, y varias
> ya no coinciden: el export de `PistaGraficos` cambió de línea, los seis
> `paleta={PALETA_MARCA}` literales del §3 ya se retiraron y el paso 2 del §4 se
> hizo como `remotion/src/marcas/<canal>.ts` (un fichero por canal, con
> `ejemplo.ts` de plantilla), no como `marcas/<canal>/marca.ts`. Se conserva por
> lo que sigue vigente: el diagnóstico de §1-§3 (la marca es un dato, no una
> constante) y la procedencia MIT de §11, que citan `motor/motion.ts` y
> `motor/marca.ts`. El catálogo de lo que el sistema SÍ sabe hacer hoy es la
> comp `Catalogo` del Studio y [catalogo-graficos.md](catalogo-graficos.md),
> que se DERIVAN del código.
>
> **Lo que YA se cosechó de este análisis** (2026-08-13), y por tanto ya no está
> pendiente: `EASE.frenoLargo` (de `RollerSlotReveal` — la curva, no el
> componente, y es lo ÚNICO que se copió); el registro compartido de
> `motor/piezas/`, que era el hueco que el §7 llamaba «una toma editorial no
> puede pedir un subrayado»; y el cableado de `Comun.sale`, que el §7 contaba
> entre los 22 huecos reales y se llevaba 9 de los 39 votos de valor alto.
>
> Sigue **pendiente** todo lo demás del §7: la entrada `asoma`,
> `reparte:"extremos"`, y las piezas `relevo`, `teclea`, `marcaAgua` y
> `selloCaido`. Y sigue en pie el diagnóstico del §1: no se instala, se cosecha.

- **Fuente:** <https://github.com/lifeprompt-team/remotion-scenes> · sha `02c7a84` · MIT, «Copyright (c) 2026 lifeprompt-team»
- **Alcance:** 201 escenas + 3 utilidades + `blobUtils` = **205 fichas**, ninguna sin mirar.
- **Premisa:** `video-creator` es un sistema de producción que debe poder servir a **cualquier marca**. Nada se descarta por no ser del gusto de un canal concreto.

---

## 1 · El veredicto

**Lo que falta no es un dialecto más: es que la marca deje de ser una constante
de módulo.** El motor ya generalizó el eje de la **gramática** y dejó cableado
el de la **forma**. Portar escenas antes de arreglar eso es pagar dos veces:
cada escena que entre hoy añade más hexes y más tipografía cableada al mismo
problema.

---

## 2 · Compatibilidad técnica (verificado, no supuesto)

Se copiaron las 200 escenas (todas menos `Theme3DGlassThreeJS`) dentro de
`remotion/src/` y se pasaron por el `tsc` y el `eslint` de esta casa:

| Comprobación | Resultado |
|---|---|
| `tsc` con nuestro `tsconfig` (strict, `lib: ["es2015"]`, `noUnusedLocals`) | **0 errores** |
| `Math.random` sin sembrar / `Date` en las 201 escenas | **0 usos** — son deterministas |
| APIs ES2016+ (`includes`, `padStart`, `at`) | solo **5 ficheros** |
| `eslint` | **9 errores** `@remotion/no-background-image`, **13 avisos** `@remotion/non-pure-animation` |
| Dependencias que faltarían | `three` + `@react-three/*` + `@remotion/three` (**un solo fichero**) y `@remotion/google-fonts` (solo `common/fonts.ts`) |

**No entra ninguna dependencia nueva.** `@remotion/google-fonts` descarga woff2
de `fonts.gstatic.com` *durante* el render: una llamada de red en mitad de la
generación de frames es incompatible con el determinismo de la casa.

---

## 3 · El hallazgo que manda: la marca es un singleton

| Capa | Estado hoy |
|---|---|
| **Sustrato** — `plan/nucleo.ts` + `PistaGraficos.tsx` | ✅ **ya global.** `PistaGraficos` (`:1122`) es genérica en `<R, B, M, C>` y recibe por props `montadores`, `fondos`, `encima`, `scrimColor`. **Cero `if` por dialecto** en el flujo de control. |
| **Dialecto** — qué piezas, qué moldes, qué beats | ✅ **ya es un parámetro.** La prueba está construida: `PistaNoticia.tsx` son **71 líneas** (unas 40 de comentario) montando un dialecto con la premisa OPUESTA a la de gráficos. |
| **Marca** — qué colores, qué letra, qué sello | ❌ **no existe como capa.** |

No hay ni un `createContext`, ni un `ThemeProvider`, ni una prop de tema en todo
el motor: **19 ficheros importan `theme`, `MG`, `G`, `FONT`, `SOMBRA`, `TXT`,
`MARCA`, `N`, `T`, `LAYOUT` y `METRAJE` como `export const` de módulo**, y hay
**73 hex literales** derramados fuera de los themes (`Editorial.tsx` 10,
`motion.ts` 6, `coreografia.ts` 6, `Fondos.tsx` 5, `montadores.tsx` 4,
`PistaGraficos.tsx` 4, `Datos.tsx` 4…).

**Consecuencia: dos marcas no pueden convivir en el mismo repo.** El propio
`theme-noticias.ts` lo admitía (cambiar un valor cambiaba también las piezas ya
publicadas si se volvían a renderizar). Y la tipografía **ni siquiera es un campo del tipo `Dialecto`**
(`nucleo.ts:635-680`): colores, escala, ley, moldes y tintas viajan; la letra no.

### Qué pasa hoy con tres marcas hipotéticas (comprobado en el código)

| Caso | Qué pasa |
|---|---|
| **Papel beige con acento azul** | Sale mal sin avisar. `plan.paleta` funciona (`nucleo.ts:706`), pero cuatro componentes tienen el acento del primer canal como default y sus montadores no pasan color: `TarjetaFoto` (`Editorial.tsx:164` — el marco de **toda** foto), `ChipIcono` (`:435`, con un hex literal que ni deriva de `MARCA.acento`), `Cronologia` (`:578/608/609`, literal en el JSX: **no hay prop que sobrescribir**). Y el b-roll sale teñido de beige (`montadores.tsx:268`). Resultado: textos azules con marcos del acento viejo. |
| **Fondo blanco puro** | No hay ruta desde el plan: `FONDOS_*` son `Record<string, React.FC>` **sin props**. Existe una salida que nadie usa: `fondos` **es una prop** de `PistaGraficos` (`:1130`), así que un proyecto puede pasar `{papel: () => <FondoPapel color="#FFF" />}` hoy mismo. No está documentada en ningún manual. |
| **Marca oscura con acento rosa** | El mejor caso, y aun así se cortocircuita: `PistaGraficos.tsx:240,251,257,263,276,365` pasan `paleta={PALETA_MARCA}` **literal** a `<Rico>` en vez de la del contexto. Con la paleta redefinida, toda palabra con `tinta` dentro de una frase sigue saliendo en el acento cableado de la capa de gráficos. El plan dice una cosa y el render pinta otra. |

### ¿Y la polaridad claro/oscuro? Es gramática, no marca

`graficos/` asume fondo oscuro **como premisa, no como valor**: las cuatro
piezas tipográficas escriben `textShadow: SOMBRA.texto` **sin prop de override**
(`Texto.tsx:53,61,72,93,166,186`), y `estilos.ts:56` la declara «OBLIGATORIA
sobre vídeo». Cambiar `theme.accent` a rosa deja intactas las diez sombras
negras bajo las letras. Eso no se arregla con tokens — es lo que la capa **es**.

**Criterio para no confundirlos otra vez:** un **dialecto** nuevo se justifica
cuando cambia el **vocabulario**; una **marca** nueva, cuando cambian los
**valores**. Test — basta un sí para que sea dialecto: (a) ¿obliga a claves de
`piezas` que no puedan coexistir con las de un registro existente? (b) ¿cambia
`moldes`, `beats` o `reglas`? (c) ¿invierte la premisa de contraste de las
piezas? **Número honesto: dos dialectos hoy, tres como mucho.** El número de
**marcas es ilimitado y ortogonal** — esa separación es la que no existe.

---

## 4 · Cómo se agrega, en el orden correcto

El orden importa más que el contenido. **Primero la marca, después la cosecha.**

| # | Qué | Por qué va aquí |
|---|---|---|
| 1 | **Cerrar los ganchos ya cortocircuitados** — `paleta={PALETA_MARCA}` literal (6 sitios), `PALETA_MARCA.marca` duplicando `theme.accent` | Sin esto, todo lo que se parametrice después promete lo que no cumple |
| 2 | **`motor/marca.ts`**: el tipo `Marca` + `marcas/<canal>.ts` con los valores del canal existente (hecho: `remotion/src/marcas/`, un fichero por canal y `ejemplo.ts` como plantilla) | Datos puros, cero imports en runtime. Ningún frame publicado se mueve |
| 3 | **Los dos themes pasan a ser funciones de la marca**, y `LAYOUT` separa lo que es marca de lo que es formato | |
| 4 | **El tema resuelto viaja en `CtxPieza`** — los montadores dejan de importar `T` y `FONT` a nivel de módulo | El eslabón que de verdad desacopla. Cero cambios en la firma de `Montador` |
| 5 | **`Dialecto` gana `marca`**, y `NOTICIAS` pasa de constante a fábrica `dialectoEditorialDe(marca)` | Así R09 mide con la tipografía con la que se va a pintar |
| 6 | **Sello y fondos por parámetro** (`encima`, `fondos`, `scrimColor` ya son props) | Criterio de aceptación: dos canales conviven sin editar nada entre renders |
| 7 | **`CtxFicha` gana la tabla de avances** — las fichas dejan de nombrarla a mano | Sin esto, cambiar la tipografía **apaga R09 en silencio** |
| 8 | Los cuatro componentes editoriales honran el color del nodo | Deuda ya anotada en el propio código |
| 9 | **Registro compartido** de piezas polaridad-neutras (`motor/piezas/`) | Hoy `<Barras>` existe y un plan editorial no puede pedirlo |
| 10 | El margen seguro sale del preset, no del `11 %` cableado (`estilos.ts:141`) | Separar formato de marca en la geometría |
| 11 | **AHORA sí: cosechar** — sustrato primero, registro común después, dialecto concreto al final | |
| 12 | *Condicional:* el tercer dialecto, solo si pasa el test de §3 | |

### Lo que hay que hacerle a cada gesto al portarlo

1. **Quitarle el fondo.** Muchas escenas pintan su geometría *con* el color del fondo (`RollerScaleBounce`, `ThemeNeumorphism`, `DataPieChart`): despegarlas lo rompe.
2. **px absolutos → `escalaPorAncho(width)`**, y todo reparto izquierda/derecha girado a arriba/abajo en vertical.
3. **`EASE` externo → `motion.ts`** como token nombrado. Ninguna pieza escribe su `Easing.bezier(...)` inline.
4. **Recronometrar**: están a 85-100 frames; las tomas de noticias duran 1-4 s.
5. **Ficha con `ancho()` honesto** — el único fallo que el sistema comete en silencio.
6. **Nada de `transition`/`animation` de CSS**: en un render frame a frame no interpola, salta, y hace que el Studio se vea distinto del render.

---

## 5 · Los tres ejes

El error del primer pase fue meter en un solo cubo tres cosas distintas. Ahora
van separadas y **no se contaminan**:

- **SALUD** *(universal — vale para cualquier marca)*
  🟢 **SANO** · 🟡 **ARREGLABLE** (defecto concreto y nombrable, se corrige al portar; incluye px de 1280×720, fondo opaco, contenido hardcodeado) · 🔴 **ROTO** (no funciona ni funcionaría).
- **APORTE** *(qué suma al motor como capacidad)*
  🟩 **NUEVO** · 🟨 **MEJORA** · 🟦 **YA EXISTE**.
- **FAMILIA** *(etiqueta, jamás descarte)*
  A qué estética sirve. `neutro` = no impone ninguna, sirve a todas.

| Categoría | 🟢 Sano | 🟡 Arreglable | 🔴 Roto | 🟩 Nuevo | 🟨 Mejora | 🟦 Ya existe | No portar | Total |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| **Texto** | 4 | 8 | 0 | 2 | 7 | 3 | 3 | 12 |
| **Rollers / relevos** | 6 | 16 | 0 | 7 | 12 | 3 | 5 | 22 |
| **Transiciones** | 3 | 7 | 0 | 6 | 3 | 1 | 2 | 10 |
| **Efectos de imagen** | 5 | 5 | 0 | 2 | 6 | 2 | 5 | 10 |
| **Datos** | 2 | 5 | 1 | 4 | 1 | 3 | 4 | 8 |
| **Listas** | 6 | 6 | 0 | 3 | 1 | 8 | 8 | 12 |
| **Maquetación** | 7 | 5 | 0 | 6 | 2 | 4 | 4 | 12 |
| **Fondos** | 4 | 6 | 0 | 4 | 6 | 0 | 1 | 10 |
| **Partículas** | 0 | 10 | 0 | 2 | 3 | 5 | 5 | 10 |
| **Líquidos / tinta** | 7 | 4 | 0 | 9 | 2 | 0 | 1 | 11 |
| **Formas** | 4 | 6 | 0 | 6 | 2 | 2 | 2 | 10 |
| **Logo** | 3 | 6 | 1 | 3 | 2 | 5 | 4 | 10 |
| **Cinemático** | 2 | 8 | 0 | 3 | 6 | 1 | 2 | 10 |
| **Temas estéticos** | 11 | 21 | 1 | 20 | 9 | 4 | 7 | 33 |
| **UI** | 0 | 10 | 0 | 2 | 1 | 7 | 7 | 10 |
| **Demo de producto** | 0 | 12 | 0 | 3 | 6 | 3 | 5 | 12 |
| **Demo · utilidades** | 2 | 1 | 0 | 3 | 0 | 0 | 0 | 3 |
| **TOTAL** | **66** | **136** | **3** | **85** | **69** | **51** | **65** | **205** |

> **Cómo leer estos números — y la trampa.** Solo **3 escenas están rotas de
> verdad** (`Theme3DGlassThreeJS`, `DataGauge`, `LogoStroke`). Pero eso **no
> significa que se rescaten 72 de las 75 que el pase anterior descartó**: el
> descarte práctico real es la columna **«No portar»**, y ahí caen tanto lo roto
> como lo que *el motor ya hace mejor* (`DataProgressBars`,
> `ListNumberedVertical`, `ListMinimalLeft` son 🟢 SANO y aun así no se portan).
> **El rescate neto y accionable del antiguo cubo es de 12-20 escenas, no de 72.**

<sub>ᶜ = el pase marcó ROTO y una verificación posterior lo bajó a ARREGLABLE porque el arreglo es nombrable: `TransitionShutter` (dos fórmulas derivadas del lienzo), `EffectFilmGrain` (la semilla es un carácter; lo caro es la densidad, que es otro defecto), `EffectKaleidoscope` (el sector se corrige con `tan(π/n)`), `DemoZoomFocus` (dos números).</sub>

---

## 6 · Cobertura por familia estilística

La pregunta que responde: *si mañana este sistema produce vídeo para una marca X,
¿qué tengo, qué me da el catálogo externo y qué me falta?*

| Familia | Cobertura | Escenas del lote | Qué marca la pide | Qué falta |
|---|---|---:|---|---|
| **neutro** | 🟨 parcial | 102 | TODAS. No es una estética, es la capa que no tiene ninguna: mecanismos que solo dicen «esto entra», «esto se releva», «esto sale», «esto es un dato»,  | 1) SALIDA de nodo con movimiento y desenfoque, y transiciones entre tomas: `Salida` es {corte}\|{fundido} y `Comun.sale` no lo lee NINGÚN intérprete (PistaGraficos solo aplica `ctx.ley.salida` a nivel de toma), o sea que hoy un nodo siempre sale por corte d… |
| **editorial-sobrio** | 🟨 parcial *(corregido)* | 43 | Prensa y explicadores factuales, despachos jurídicos y notarías, consultoría, inmobiliaria, think tanks y fundaciones, universidades  | Que sea un FORMATO y no un CANAL. |
| **corporativo-limpio** | 🟨 parcial | 94 | SaaS B2B, consultoras tecnológicas, fintech y seguros, salud privada, industria y logística, agencias, formación corporativa, informes de resultados.  | El REGISTRO, no las piezas. |
| **lujo** | 🟥 descubierta | 33 | Joyería y relojería, moda y alta perfumería, hotelería y resorts, inmobiliaria de alto standing, automoción premium, wealth management, fine dining, s | Todo el vocabulario de material y de aire. |
| **tech-oscuro** | 🟨 parcial | 103 | SaaS de infraestructura, ciberseguridad, IA y datos, cripto y trading, hardware y semiconductores, devtools, telco, canales de divulgación técnica y d | Puerta para `Scanlines` como ESTADO DE REPOSO: hoy está declarada sin ruta en el propio catálogo («ninguna envoltura la monta») y `Glitch` se documenta como ráfaga acotada, «NUNCA de fondo continuo», así que una capa de degradación de señal sostenida no se … |
| **neon-gaming** | 🟨 parcial | 50 | Esports y clubes, streamers, bebidas energéticas, discotecas y festivales, apps de fitness gamificado, cripto retail, moda urbana, canales de reacción | El glow no se puede pedir: el resplandor de TEXTO existe SOLO como prop `resplandor` de la pieza `cifra` (graficos/Datos.tsx), así que no hay forma de darle luz a un `titular` en ninguno de los dos dialectos, y `Halo` es un radial detrás del hijo, no una em… |
| **retro-vintage** | 🟥 descubierta | 40 | Sellos musicales y vinilo, barbería y tatuaje, cerveza artesanal y destilerías, moda vintage y thrift, cine de repertorio, hostelería de barrio, colec | `Ambiente.grano` — abrir la puerta y colgarle la técnica que ya existe, más la versión VIVA (reseeded por bloque) que trae CinematicVintage. |
| **organico-artesanal** | 🟥 descubierta | 28 | Cosmética natural, alimentación ecológica y de origen, yoga y bienestar, cerámica y oficios, floristería, cafés de especialidad, ONG ambientales, tera | Forma CERRADA y suavizada (es justo lo que aporta generateBlobPath). |
| **brutalista-pop** | 🟥 descubierta | 56 | Moda streetwear, festivales y música urbana, agencias creativas, apps de nicho joven, medios contraculturales, bebidas y snacks de impulso, campañas d | Piezas de forma (círculo, cuadrado, triángulo, zigzag). |
| **infantil-festivo** | 🟥 descubierta | 47 | Educación infantil y juguetería, parques y ocio familiar, heladerías y pastelería, apps de aprendizaje, animación de eventos y cumpleaños, pediatría y | Primitivas de forma y color plano (mismo bloqueo que brutalista-pop: no se puede pedir un fondo de color). |
| **cinematico-dramatico** | 🟨 parcial | 59 | Tráilers y estrenos, true crime y documental de investigación, deporte de alto rendimiento, automoción, inmobiliaria de lujo en su registro nocturno,  | El FLASH: grep de flash/destello sobre motor/ da CERO, y ni las ocho envolturas ni las cinco capas de ambiente pueden blanquear el cuadro. |

**El motor nació con dos registros** —oscuro con texto blanco, y papel claro
editorial— **y eso deja cinco familias enteras sin cubrir**. Ninguna familia
puede estar más cubierta que `neutro`, que es el sustrato sobre el que se
apoyan todas: si el sustrato no sabe salir de una toma, ninguna sabe.

---

## 7 · Los huecos reales: 22, no 39

39 escenas puntúan `valor_sistema: alto` (19 % del catálogo), pero el valor no
está en la escena sino en el **hueco** que abre. Deduplicadas:

| Hueco | Lo reclaman | Puerta |
|---|---:|---|
| **`Salida` con movimiento / cortinilla entre tomas** | **9** | sustrato |
| Entrada `asoma` (máscara vertical, sin fundido) | 2 | sustrato |
| `reparte: "extremos"` en el eje `fila` | 2 | gramática |
| Relevo deslizante en `ranura` | 2 | pieza común |
| Tecleo progresivo | 2 | pieza común |
| Grano vivo | 2 | ambiente |
| `backdrop-filter` / material vidrio | 2 | envoltura |
| Marco + escuadras | 2 | pieza común |
| Marca de agua tipográfica | 2 | rol |
| `mix-blend-mode: difference` | 2 | envoltura |
| Señalador / bocadillo | 2 | pieza común |
| Otros 11 huecos | 1 cada uno | varias |

**Una sola puerta —`Salida`— se lleva 9 de los 39 votos**, y hoy está
literalmente muerta: `Comun.sale` está declarado en `nucleo.ts:406` y **no
tiene un solo lector** en todo el motor. Cablearla vale por sí sola más que las
nueve escenas que la piden juntas.

Otras dos promesas incumplidas que este cruce destapó: `Encaje`
(`coreografia.ts:171`) tampoco tiene lector, y `eje:"capas"` se monta idéntico a
`pila` (`nucleo.ts:873`).

---

## 8 · Detalle por categoría


### Texto — `TextAnimations`

> 12 escenas · 🟢 4 sano · 🟡 8 arreglable · 🔴 0 roto

| Escena | Salud (universal) | Aporte | Puerta | Familias | Formato | Valor | Nota técnica |
|---|---|---|---|---|---|---|---|
| `TextTypewriter` | 🟢 SANO | 🟨 MEJORA | entrada | neutro, tech-oscuro, retro-vintage | agnostico | alto | Tres líneas deterministas y sin coste: lerp sobre el número de caracteres, `slice`, y módulo para el parpadeo. |
| `TextMaskReveal` | 🟢 SANO | 🟨 MEJORA | entrada | neutro | agnostico | medio | Lo más limpio del lote junto con RollerMaskSlide: un `clipPath: inset(0 X% 0 0)` por carácter, cada uno en su propio contenedor overflow:hidden, movido por un solo lerp con easing. |
| `TextNeon` | 🟢 SANO | 🟨 MEJORA | envoltura | neon-gaming, retro-vintage, tech-oscuro, cinematico-dramatico | agnostico | medio | El parpadeo está cuantizado por bloques —`random("neon-"+Math.floor(frame/3))`—, que es la forma correcta y determinista de hacerlo. |
| `TextScramble` | 🟢 SANO | 🟩 NUEVO | entrada | tech-oscuro, neon-gaming, cinematico-dramatico, brutalista-pop | agnostico | medio | Usa `random("scramble-"+frame+"-"+i)` de Remotion, que es exactamente el contrato de determinismo de la casa; |
| `Text3DFlip` | 🟡 ARREGLABLE | 🟨 MEJORA | entrada | neutro, corporativo-limpio, tech-oscuro | agnostico | medio | Desincronización visible: la "sombra" es una copia de la PALABRA ENTERA pintada desde el frame 0 (sin escalonado, sin opacidad animada), mientras las letras entran escalonadas cada 5 f — durante el escalonado hay sombra de letras que todavía no existen. |
| `TextExplode` | 🟡 ARREGLABLE | 🟨 MEJORA | salida | brutalista-pop, infantil-festivo, cinematico-dramatico, neon-gaming | agnostico | medio | La fase de "reunión" no dibuja la palabra: los spans son `position:absolute; |
| `TextGradient` | 🟡 ARREGLABLE | 🟩 NUEVO | envoltura | lujo, neon-gaming, tech-oscuro, retro-vintage, brutalista-pop | agnostico | medio | Anima la propiedad equivocada: mueve el ÁNGULO del degradado (`${90 + (frame-startDelay)*2}deg`) en vez de `background-position`, así que el relleno bascula sobre sí mismo en lugar de recorrer la silueta, y `backgroundSize: "300% 100%"` queda como código muerto porque nada desplaza la posición. |
| `TextKinetic` | 🟡 ARREGLABLE | 🟨 MEJORA | entrada | neutro, infantil-festivo | agnostico | medio | Determinista y barato (8 spans, un spring por carácter). |
| `TextCounter` | 🟡 ARREGLABLE | 🟦 YA-EXISTE | pieza | neutro | agnostico | bajo | Dos defectos nombrables. |
| `TextGlitch` | 🟡 ARREGLABLE | 🟦 YA-EXISTE | envoltura | tech-oscuro, neon-gaming, brutalista-pop, cinematico-dramatico | agnostico | bajo | Determinista (random sembrado por frame), pero el estado se sortea INDEPENDIENTEMENTE en cada frame: `random("glitch-"+frame) < 0.15` no tiene persistencia, así que cada fallo dura exactamente 1 frame y a 30 fps eso es ruido blanco, no una ráfaga. |
| `TextSplit` | 🟡 ARREGLABLE | 🟦 YA-EXISTE | entrada | neutro, editorial-sobrio, corporativo-limpio | requiere-rehacer-geometria | bajo | Colisión de maqueta medible en el lienzo de diseño. |
| `TextWave` | 🟡 ARREGLABLE | 🟨 MEJORA | envoltura | infantil-festivo, organico-artesanal, retro-vintage, brutalista-pop | requiere-rehacer-geometria | bajo | Dos defectos concretos. |

### Rollers / relevos — `RollerAnimations`

> 22 escenas · 🟢 6 sano · 🟡 16 arreglable · 🔴 0 roto

| Escena | Salud (universal) | Aporte | Puerta | Familias | Formato | Valor | Nota técnica |
|---|---|---|---|---|---|---|---|
| `RollerSlotReveal` | 🟢 SANO | 🟨 MEJORA | token-motion | neutro | agnostico | alto | La matemática está bien cosida: el easing a mano en tres tramos (0.02·x² reptando, lineal, 1−(1−x)⁷ frenando) se mezcla con el muelle de aterrizaje mediante `scrollY + (target-scrollY)*spring`, y como el spring vale 0 en su primer frame el empalme es continuo, sin salto. |
| `RollerBlur` | 🟢 SANO | 🟨 MEJORA | salida | neutro, editorial-sobrio, corporativo-limpio, lujo | agnostico | medio | 69 líneas, el fichero más limpio de las dos categorías: dos lerps cruzados sobre `filter: blur()` y opacidad, sin springs, sin random, sin SVG, sin 3D. |
| `RollerFadeSlide` | 🟢 SANO | 🟨 MEJORA | salida | neutro, editorial-sobrio, corporativo-limpio | agnostico | medio | El relevo es continuo y correcto: al final del ciclo la palabra está en -40 px con opacidad 0 y el ciclo siguiente arranca en +40 con opacidad 0, así que sale por arriba y la siguiente entra por abajo sin salto. |
| `RollerFlip` | 🟢 SANO | 🟨 MEJORA | gramatica | neutro, corporativo-limpio, editorial-sobrio | agnostico | medio | El truco del intercambio a 90° está bien resuelto: `showNext = rotation > 90` y `rotateX(showNext ? 180-rotation : -rotation)` da una curva continua sin salto, con backfaceVisibility como red. |
| `RollerGlitch` | 🟢 SANO | 🟦 YA-EXISTE | envoltura | tech-oscuro, neon-gaming, brutalista-pop | agnostico | bajo | 100 % reproducible: la intensidad sale de `Math.sin(cycleT*2)*5` acotada a los 8 primeros frames del ciclo, sin random. |
| `RollerScaleBounce` | 🟢 SANO | 🟦 YA-EXISTE | entrada | brutalista-pop, corporativo-limpio, infantil-festivo | agnostico | bajo | `scale = enterProgress * exitProgress` con spring de damping 10 (sobrepasa a ~1.2) y lerp de salida: monótono, determinista y de dos nodos. |
| `RollerDramaticStop` | 🟡 ARREGLABLE | 🟩 NUEVO | token-motion | neutro, cinematico-dramatico, neon-gaming, infantil-festivo | agnostico | alto | La dramaturgia de cuatro actos está bien calculada y el empalme con el muelle de aterrizaje solo desvía 1,7 px, que es despreciable. |
| `RollerMaskSlide` | 🟡 ARREGLABLE | 🟨 MEJORA | gramatica | neutro | agnostico | alto | La técnica es la mejor del lote (par complementario `inset(0 X% 0 0)` contra `inset(0 0 0 (100-X)%)`, cuatro líneas, sin springs, sin random, sin dependencia del color de fondo), pero tiene tres defectos concretos. |
| `RollerSlotMachine` | 🟡 ARREGLABLE | 🟨 MEJORA | gramatica | neutro | agnostico | alto | Los dos carriles están invertidos y por eso el rodillo va hacia atrás. |
| `RollerLiquid` | 🟡 ARREGLABLE | 🟩 NUEVO | envoltura | organico-artesanal, lujo, cinematico-dramatico, brutalista-pop | agnostico | medio | Tres defectos concretos. |
| `RollerOutlineHighlight` | 🟡 ARREGLABLE | 🟩 NUEVO | pieza | neutro, editorial-sobrio, brutalista-pop, tech-oscuro, lujo | vertical-ok | medio | Dos defectos nombrables. |
| `RollerPerspectiveStripes` | 🟡 ARREGLABLE | 🟩 NUEVO | ambiente | brutalista-pop, neon-gaming, tech-oscuro, retro-vintage, infantil-festivo | requiere-rehacer-geometria | medio | Dos saltos concretos. |
| `RollerSplitFlap` | 🟡 ARREGLABLE | 🟩 NUEVO | pieza | retro-vintage, brutalista-pop, cinematico-dramatico, infantil-festivo | vertical-ok | medio | El escalonado por celda está RESTADO al progreso en vez de desfasado en el tiempo: `charFlap = Math.max(0, flapProgress - charIdx*0.1)` y `rotateX((1-charFlap)*90)`. |
| `RollerTypewriter` | 🟡 ARREGLABLE | 🟨 MEJORA | gramatica | neutro, tech-oscuro, retro-vintage | vertical-ok | medio | Mecanismo barato y determinista (slice sobre índices con Math.floor y módulo, sin springs ni random ni filtros), pero con dos defectos nombrables. |
| `RollerVerticalList` | 🟡 ARREGLABLE | 🟨 MEJORA | gramatica | neutro | agnostico | medio | El desplazamiento es correcto y continuo (scrollY = índice*70 + spring*70, translateY negativo), de hecho es la implementación del rodillo que SÍ va en la dirección buena — al revés que RollerSlotMachine. |
| `Roller3DCarousel` | 🟡 ARREGLABLE | 🟨 MEJORA | gramatica | tech-oscuro, corporativo-limpio, neutro | requiere-rehacer-geometria | bajo | Geometría mal dimensionada: seis caras de 600 px de ancho sobre un radio de 250 px. |
| `RollerCountdown` | 🟡 ARREGLABLE | 🟦 YA-EXISTE | ninguna | cinematico-dramatico, neon-gaming, infantil-festivo | agnostico | bajo | El rodillo de la cuenta atrás está mal planteado por un módulo. |
| `RollerDrum` | 🟡 ARREGLABLE | 🟨 MEJORA | gramatica | retro-vintage, neutro, corporativo-limpio | agnostico | bajo | Geometría mal dimensionada, en dos números y una propiedad que faltan. |
| `RollerGradientWave` | 🟡 ARREGLABLE | 🟩 NUEVO | envoltura | neon-gaming, infantil-festivo, retro-vintage, lujo | agnostico | bajo | Tres defectos nombrables. |
| `RollerMultiSlot` | 🟡 ARREGLABLE | 🟨 MEJORA | gramatica | neon-gaming, infantil-festivo, retro-vintage, brutalista-pop | vertical-ok | bajo | Dos discontinuidades medibles. |
| `RollerShuffle` | 🟡 ARREGLABLE | 🟩 NUEVO | entrada | tech-oscuro, neon-gaming, cinematico-dramatico | requiere-rehacer-geometria | bajo | Reimplementa a mano un hash estilo GLSL —`fract(sin(seed*12.9898)*43758.5453)`— donde el contrato del proyecto exige `random(semilla)` de Remotion: da lo mismo pero sin garantía entre motores, porque depende de los últimos bits de Math.sin sobre argumentos grandes. |
| `RollerWave` | 🟡 ARREGLABLE | 🟨 MEJORA | salida | neutro, corporativo-limpio, tech-oscuro | agnostico | bajo | Dos defectos concretos. |

### Transiciones — `TransitionAnimations`

> 10 escenas · 🟢 3 sano · 🟡 7 arreglable · 🔴 0 roto

| Escena | Salud (universal) | Aporte | Puerta | Familias | Formato | Valor | Nota técnica |
|---|---|---|---|---|---|---|---|
| `TransitionZoomBlur` | 🟢 SANO | 🟨 MEJORA | salida | neutro, cinematico-dramatico | agnostico | alto | Lo mas limpio del lote. |
| `TransitionBoxReveal` | 🟢 SANO | 🟩 NUEVO | entrada | neutro, corporativo-limpio, brutalista-pop | agnostico | medio | Tecnica correcta y determinista: spring de Remotion (con frame negativo devuelve el valor inicial, no revienta), 36 celdas en % con solape de +0.5% para tapar costuras, y escalera por distancia euclidea al centro. |
| `TransitionGlitch` | 🟢 SANO | 🟦 YA-EXISTE | envoltura | tech-oscuro, neon-gaming, cinematico-dramatico, brutalista-pop | agnostico | bajo | Determinista (`random()` sembrado con frame+indice, cero Math.random) y barato: 15 bandas mas dos velos. |
| `TransitionCircleWipe` | 🟡 ARREGLABLE | 🟩 NUEVO | salida | neutro, cinematico-dramatico | agnostico | alto | El nucleo (`clipPath: circle(p% at x% y%)` con p de 0 a 150) es exacto y libre de unidades: a 150% cubre incluso con el origen en una esquina. |
| `TransitionLiquidMorph` | 🟡 ARREGLABLE | 🟩 NUEVO | entrada | organico-artesanal, infantil-festivo, neon-gaming | agnostico | medio | Tres defectos concretos. |
| `TransitionBlinds` | 🟡 ARREGLABLE | 🟨 MEJORA | entrada | corporativo-limpio, retro-vintage, tech-oscuro | agnostico | bajo | Dos defectos concretos. |
| `TransitionDiagonalSlice` | 🟡 ARREGLABLE | 🟩 NUEVO | salida | brutalista-pop, corporativo-limpio, tech-oscuro | requiere-rehacer-geometria | bajo | El poligono es una BANDA de ancho fijo, no un semiplano: arriba va de p-30 a p+20 (50% de ancho) y abajo de p-60 a p-10 (otro 50%). |
| `TransitionFlash` | 🟡 ARREGLABLE | 🟩 NUEVO | ambiente | neutro | agnostico | bajo | Hueco de montaje de 10 frames: `phase1 = frame < s+15` y `phase2 = frame >= s+25`, asi que entre s+15 y s+24 no hay NINGUNA escena montada y el destello sube y baja sobre negro puro. |
| `TransitionLineSweep` | 🟡 ARREGLABLE | 🟨 MEJORA | ambiente | tech-oscuro, neon-gaming, brutalista-pop, corporativo-limpio | vertical-ok | bajo | Trampa en una prop publica: `thickness = 80 - i*12`, asi que con `lineCount` >= 7 la septima barra sale de ancho -4 px y no se dibuja (y la octava peor). |
| `TransitionShutter` | 🟡 ARREGLABLE ᶜ | 🟩 NUEVO | salida | cinematico-dramatico, retro-vintage | requiere-rehacer-geometria | bajo | La geometria no cierra y no es cosa de una constante. |

### Efectos de imagen — `EffectAnimations`

> 10 escenas · 🟢 5 sano · 🟡 5 arreglable · 🔴 0 roto

| Escena | Salud (universal) | Aporte | Puerta | Familias | Formato | Valor | Nota técnica |
|---|---|---|---|---|---|---|---|
| `EffectDepthOfField` | 🟢 SANO | 🟩 NUEVO | envoltura | neutro, cinematico-dramatico, lujo | agnostico | medio | La mecanica es correcta y libre de unidades: un `focusPoint` recorre 0→2 y cada capa desenfoca `Math.abs(focusPoint - profundidad) * 8`. |
| `EffectLightLeak` | 🟢 SANO | 🟨 MEJORA | ambiente | cinematico-dramatico, retro-vintage, lujo, tech-oscuro | vertical-ok | medio | Funciona y es barato: dos manchas radiales muy desenfocadas (blur 40 y 60 px) que cruzan el cuadro en direcciones opuestas en mixBlendMode screen, que sobre negro es suma pura y se pega encima de un video tal cual. |
| `EffectMatrix` | 🟢 SANO | 🟨 MEJORA | ambiente | tech-oscuro, neon-gaming, cinematico-dramatico | agnostico | medio | La mejor construida del grupo en portabilidad: es la unica de las 20 que lee `useVideoConfig().height` y ajusta el bucle a la altura REAL del lienzo (`y = ((f-s)*speed + offset) % (height+500) - 250`). |
| `EffectVHS` | 🟢 SANO | 🟨 MEJORA | formato-de-medio | retro-vintage, neon-gaming, tech-oscuro, brutalista-pop, cinematico-dramatico | agnostico | medio | Determinista y barato, sin fallos de geometria ni de logica: `random('vhs-'+frame) > 0.95` dispara el temblor en ~5% de los frames, el tracking es un seno acotado a ±5 px, y la scanline y la barra de ruido son CSS correcto. |
| `EffectGlow` | 🟢 SANO | 🟦 YA-EXISTE | envoltura | neon-gaming, tech-oscuro, lujo, cinematico-dramatico | vertical-ok | bajo | Determinista y barato: spring de entrada, una pildora desenfocada, textShadow y 20 puntos colocados por trigonometria (22 nodos en total). |
| `EffectChromaticAberration` | 🟡 ARREGLABLE | 🟦 YA-EXISTE | envoltura | tech-oscuro, neon-gaming, retro-vintage, cinematico-dramatico | agnostico | bajo | Defecto de color medible: son tres copias del texto en rgba(255,0,0,.7) / (0,255,0,.7) / (0,0,255,.7) con mixBlendMode screen sobre negro, asi que donde las tres se solapan (el nucleo sin aberrar, que es casi todo el glifo) el resultado es ~(178,178,178): gris, no blanco ni el color de origen. |
| `EffectDuotone` | 🟡 ARREGLABLE | 🟨 MEJORA | molde | brutalista-pop, neon-gaming, infantil-festivo, corporativo-limpio | agnostico | bajo | Dos defectos. |
| `EffectFilmGrain` | 🟡 ARREGLABLE ᶜ | 🟨 MEJORA | formato-de-medio | cinematico-dramatico, retro-vintage, editorial-sobrio, organico-artesanal | agnostico | bajo | La capa de grano no hace su trabajo y no se puede hacer que lo haga con esta tecnica. |
| `EffectKaleidoscope` | 🟡 ARREGLABLE ᶜ | 🟩 NUEVO | ambiente | infantil-festivo, retro-vintage, organico-artesanal, neon-gaming | requiere-rehacer-geometria | bajo | El sector no tesela, y el numero sale de la propia formula. |
| `EffectNoise` | 🟡 ARREGLABLE | 🟨 MEJORA | formato-de-medio | tech-oscuro, retro-vintage, neon-gaming, brutalista-pop, cinematico-dramatico | agnostico | bajo | Defecto visible y de una linea: las 50 rayas arrancan TODAS en `left: 0` y solo varia el ancho, asi que en vez de estatica uniforme se lee un peine anclado al borde izquierdo. |

### Datos — `DataAnimations`

> 8 escenas · 🟢 2 sano · 🟡 5 arreglable · 🔴 1 roto

| Escena | Salud (universal) | Aporte | Puerta | Familias | Formato | Valor | Nota técnica |
|---|---|---|---|---|---|---|---|
| `DataRanking` | 🟢 SANO | 🟨 MEJORA | gramatica | neutro, corporativo-limpio, tech-oscuro | agnostico | alto | Filas de flexbox puras, sin una sola coordenada absoluta: el `flex:1` del nombre (linea 97) es lo que empuja el valor al borde derecho, asi que el ancho es fluido. |
| `DataProgressBars` | 🟢 SANO | 🟦 YA-EXISTE | ninguna | neutro, corporativo-limpio, tech-oscuro | agnostico | bajo | La mejor construida del grupo. |
| `DataLineChart` | 🟡 ARREGLABLE | 🟩 NUEVO | pieza | neutro, corporativo-limpio, tech-oscuro | vertical-ok | alto | Cinco defectos concretos, todos nombrables pero encadenados. |
| `DataBarChart` | 🟡 ARREGLABLE | 🟩 NUEVO | pieza | neutro, corporativo-limpio, tech-oscuro | vertical-ok | medio | Muelle infraamortiguado que MIENTE sobre el dato: spring({damping:15, stiffness:100}) tiene amortiguamiento critico en 2*sqrt(100)=20, asi que progress rebasa 1. |
| `DataPieChart` | 🟡 ARREGLABLE | 🟩 NUEVO | pieza | neutro, corporativo-limpio, tech-oscuro | vertical-ok | medio | La matematica del arco es correcta: entryProgress usa spring({damping:20, stiffness:80}) y el critico esta en 2*sqrt(80)=17.9, asi que 20 es SOBREamortiguado — no hay rebase y los porcentajes cuentan hasta su valor exacto; |
| `DataStatsCards` | 🟡 ARREGLABLE | 🟦 YA-EXISTE | ninguna | neutro, corporativo-limpio, editorial-sobrio | requiere-rehacer-geometria | bajo | Contiene la UNICA fuente de no-determinismo de las 20 escenas del grupo: Math.floor(89420*countProgress).toLocaleString() (linea 28) formatea segun el locale por defecto del entorno de render — la misma composicion imprime 89,420 o 89.420 (y en algunos locales con espacio fino inseparable) segun … |
| `DataTimeline` | 🟡 ARREGLABLE | 🟦 YA-EXISTE | ninguna | neutro, corporativo-limpio, editorial-sobrio | vertical-ok | bajo | El rail no llega a donde tiene que llegar. |
| `DataGauge` | 🔴 ROTO | 🟩 NUEVO | pieza | tech-oscuro, neon-gaming, corporativo-limpio | requiere-rehacer-geometria | medio | Tres elementos, tres convenciones angulares distintas, ninguna cuadra con otra. |

### Listas — `ListAnimations`

> 12 escenas · 🟢 6 sano · 🟡 6 arreglable · 🔴 0 roto

| Escena | Salud (universal) | Aporte | Puerta | Familias | Formato | Valor | Nota técnica |
|---|---|---|---|---|---|---|---|
| `ListTwoColumnCompare` | 🟢 SANO | 🟨 MEJORA | gramatica | neutro | agnostico | alto | La mas limpia de las veinte junto con DataProgressBars. |
| `ListHorizontalPeek` | 🟢 SANO | 🟩 NUEVO | gramatica | neutro, corporativo-limpio, tech-oscuro | horizontal-solo | medio | El desbordamiento es deliberado y esta bien construido: el AbsoluteFill lleva overflow:"hidden" (linea 24) asi que el corte de la cuarta tarjeta es limpio, flexShrink:0 impide que la tira se comprima, el desplazamiento lateral es un lerp con EASE.smooth y los muelles solo mueven translateY. |
| `ListMinimalLeft` | 🟢 SANO | 🟦 YA-EXISTE | ninguna | editorial-sobrio, corporativo-limpio, neutro | vertical-ok | bajo | Sin defecto tecnico: filas de flexbox con gap, muelles por item, cero coordenadas absolutas dentro de la lista, cero acoplamiento al color de fondo dentro de las piezas, determinista y barato. |
| `ListNumberedVertical` | 🟢 SANO | 🟦 YA-EXISTE | ninguna | neutro, editorial-sobrio, corporativo-limpio, tech-oscuro | vertical-ok | bajo | Tecnica correcta: alignItems:"baseline" (linea 78) entre un numeral de 80 px y un texto de 28 px es la forma buena de casar dos tamanos, el width:120 del numeral hace de columna de tabulacion, el escalonado es una columna con gap y los muelles son deterministas. |
| `ListStatsFocused` | 🟢 SANO | 🟦 YA-EXISTE | ninguna | neutro, corporativo-limpio, tech-oscuro, editorial-sobrio | requiere-rehacer-geometria | bajo | Sin defecto tecnico: alignItems:"baseline" para casar la cifra con su unidad (lineas 32 y 99), columna con gap para las dos cifras menores, muelles deterministas, sin ids SVG ni acoplamientos al fondo. |
| `ListUnevenGrid` | 🟢 SANO | 🟦 YA-EXISTE | ninguna | neutro, corporativo-limpio, tech-oscuro | agnostico | bajo | La unica con CSS Grid y la unica totalmente fluida: inset de 60 por los cuatro lados, gridTemplateColumns 2fr/1fr, filas 1fr/1fr y gap 20, sin un solo px absoluto dentro de las tarjetas. |
| `ListSimpleText` | 🟡 ARREGLABLE | 🟩 NUEVO | entrada | neutro | agnostico | alto | La tecnica de mascara es la correcta (contenedor con overflow:hidden cuya altura la fija la caja de linea, hijo en translateY((1-p)*100%), lineas 44-52) pero el muelle esta mal elegido: spring({damping:18, stiffness:120}) tiene el critico en 2*sqrt(120)=21.9, o sea infraamortiguado, asi que progr… |
| `ListStaggered` | 🟡 ARREGLABLE | 🟩 NUEVO | gramatica | neutro, corporativo-limpio, tech-oscuro, editorial-sobrio | requiere-rehacer-geometria | medio | Defecto de paso: los `top` van a mano en los datos (100/220/340, linea 15-17), o sea un paso de 120 px, pero el bloque real mide ~133 px (14 del numero + 10 + 58 del titulo + 10 + 19 de la descripcion + 20 de margen del subrayado + 2). |
| `ListAsymmetric3` | 🟡 ARREGLABLE | 🟦 YA-EXISTE | ninguna | neutro, corporativo-limpio, editorial-sobrio, tech-oscuro | requiere-rehacer-geometria | bajo | Sin bug logico ni no-determinismo; |
| `ListFullscreenSequence` | 🟡 ARREGLABLE | 🟦 YA-EXISTE | ninguna | neutro, tech-oscuro, corporativo-limpio, brutalista-pop | vertical-ok | bajo | Dos defectos concretos. |
| `ListHeroWithList` | 🟡 ARREGLABLE | 🟦 YA-EXISTE | ninguna | neutro, tech-oscuro, corporativo-limpio, brutalista-pop | vertical-ok | bajo | Sin bug ni no-determinismo. |
| `ListTimeline` | 🟡 ARREGLABLE | 🟦 YA-EXISTE | ninguna | neutro, corporativo-limpio, editorial-sobrio, tech-oscuro | vertical-ok | bajo | El rail mide contra la nada: height:`${lineProgress}%` con maxHeight:350 (lineas 72-73) cuelga de un padre absoluto SIN altura declarada (left:150, top:200, sin height ni bottom), asi que el porcentaje resuelve contra una caja de ajuste al contenido cuya altura es la que salga de la copia (~471 p… |

### Maquetación — `LayoutAnimations`

> 12 escenas · 🟢 7 sano · 🟡 5 arreglable · 🔴 0 roto

| Escena | Salud (universal) | Aporte | Puerta | Familias | Formato | Valor | Nota técnica |
|---|---|---|---|---|---|---|---|
| `LayoutFrameInFrame` | 🟢 SANO | 🟩 NUEVO | pieza | neutro, cinematico-dramatico, editorial-sobrio, lujo | agnostico | alto | Los dos marcos son insets en los cuatro lados (40 y 120) y las escuadras van a -1 px de cada esquina, asi que la figura se adapta sola a cualquier relacion de aspecto sin recalcular nada; |
| `LayoutGridBreak` | 🟢 SANO | 🟩 NUEVO | envoltura | neutro, brutalista-pop, tech-oscuro | agnostico | alto | Bloques con posicion Y tamano en %, rejilla de fondo con backgroundSize en % (10 % x 10 %) y entradas por muelle escalonadas. |
| `LayoutSplitContrast` | 🟢 SANO | 🟩 NUEVO | molde | neutro, editorial-sobrio, brutalista-pop, corporativo-limpio | agnostico | alto | Dos mitades al 50 % que se abren con clipPath inset en sentidos opuestos y desfase de 10 frames, con la juntura en opacidad Math.min de los dos progresos. |
| `LayoutDiagonal` | 🟢 SANO | 🟩 NUEVO | molde | brutalista-pop, cinematico-dramatico, corporativo-limpio | vertical-ok | medio | Corrijo el veredicto anterior con el calculo: la losa esta declarada en porcentajes (-20 %/-20 %, 80 % x 140 %) y rotada -15deg, y su arista SI cruza el encuadre tambien en 9:16 (a 1080x1920 va de (385,-79) a (882,1776)). |
| `LayoutMultiColumn` | 🟢 SANO | 🟦 YA-EXISTE | gramatica | editorial-sobrio, corporativo-limpio, neutro | horizontal-solo | bajo | Columnas con flex:1 entre anclas left/right 60 y bottom 100, filete superior por borderTop y entrada escalonada con muelle (i*8): el reparto no depende del lienzo, solo los cuerpos tipograficos son fijos. |
| `LayoutOffGrid` | 🟢 SANO | 🟦 YA-EXISTE | gramatica | brutalista-pop, editorial-sobrio, neutro | agnostico | bajo | Posiciones en % y entrada escalonada por muelle (delays 0/8/16/24); |
| `LayoutWhitespace` | 🟢 SANO | 🟦 YA-EXISTE | molde | editorial-sobrio, lujo, corporativo-limpio | agnostico | bajo | Cuatro anclas a las esquinas con margenes en px y entradas por lerp: nada depende del centro ni del ancho, asi que se adapta a cualquier formato. |
| `LayoutFullscreenType` | 🟡 ARREGLABLE | 🟩 NUEVO | entrada | neutro | requiere-rehacer-geometria | alto | La tecnica es correcta y barata: envoltorio con overflow:hidden y el texto subiendo desde translateY(100%) en % DEL PROPIO BLOQUE, sin fundido y escalonado 8 frames por linea. |
| `LayoutGiantNumber` | 🟡 ARREGLABLE | 🟨 MEJORA | molde | editorial-sobrio, corporativo-limpio, brutalista-pop | vertical-ok | alto | La geometria es sana (la cifra sale del cuadro a proposito con right:-80 y el resto esta anclado), pero la cifra fantasma es C.gray[100] (#f4f4f5) sobre C.white (#fafafa): un delta de luminancia del 2 % que el cuantizador de h264 se come. |
| `LayoutAsymmetric` | 🟡 ARREGLABLE | 🟨 MEJORA | molde | editorial-sobrio, brutalista-pop, corporativo-limpio | requiere-rehacer-geometria | medio | Los springs son correctos, pero la maqueta esta cocida a 1280x720: dos lineas a fontSize 280 ("IDEA" mide unos 760 px mas marginLeft 60) contra una columna fija de 200 px anclada a right:60, y una vertical decorativa en right:280 que crece hasta 600 px de alto. |
| `LayoutVerticalMix` | 🟡 ARREGLABLE | 🟩 NUEVO | pieza | editorial-sobrio, lujo, retro-vintage, cinematico-dramatico | vertical-ok | medio | El riesgo real es de determinismo por FUENTE: los glifos CJK se piden con Inter, que no los tiene, asi que caen a la fuente de sistema del host y el mismo proyecto renderiza distinto en dos maquinas. |
| `LayoutLayered` | 🟡 ARREGLABLE | 🟦 YA-EXISTE | gramatica | corporativo-limpio, tech-oscuro | requiere-rehacer-geometria | bajo | Tres rectangulos en px absolutos (800x400 en 100,100; |

### Fondos — `BackgroundAnimations`

> 10 escenas · 🟢 4 sano · 🟡 6 arreglable · 🔴 0 roto

| Escena | Salud (universal) | Aporte | Puerta | Familias | Formato | Valor | Nota técnica |
|---|---|---|---|---|---|---|---|
| `BackgroundMeshGradient` | 🟢 SANO | 🟨 MEJORA | ambiente | neutro, corporativo-limpio, tech-oscuro, lujo, cinematico-dramatico | agnostico | alto | Tres divs. |
| `BackgroundFlowingGradient` | 🟢 SANO | 🟩 NUEVO | ambiente | neon-gaming, infantil-festivo, brutalista-pop, retro-vintage | agnostico | medio | Un solo div. |
| `BackgroundAurora` | 🟢 SANO | 🟨 MEJORA | ambiente | cinematico-dramatico, tech-oscuro, lujo, neon-gaming | agnostico | bajo | Tres elipses de radial-gradient con left/top en % siguiendo sin/cos del frame y rotate() lineal; |
| `BackgroundGeometric` | 🟢 SANO | 🟨 MEJORA | ambiente | neutro, corporativo-limpio, tech-oscuro, brutalista-pop | agnostico | bajo | 20 divs. |
| `BackgroundNoiseTexture` | 🟡 ARREGLABLE | 🟨 MEJORA | envoltura | neutro, cinematico-dramatico, editorial-sobrio, retro-vintage, organico-artesanal | agnostico | alto | La matematica es correcta y determinista: `noiseSeed = Math.floor(frame/2)` es funcion pura del frame, asi que el ruido se resiembra igual en cada render. |
| `BackgroundBokeh` | 🟡 ARREGLABLE | 🟨 MEJORA | ambiente | lujo, cinematico-dramatico, corporativo-limpio, organico-artesanal, neutro | agnostico | medio | Bug citable de bucle: `const x = (bokeh.x + (frame-startDelay)*bokeh.speedX) % 120 - 10` con speedX = (random()-0.5)*0.3, o sea en [-0.15, 0.15]. |
| `BackgroundGrid` | 🟡 ARREGLABLE | 🟨 MEJORA | ambiente | tech-oscuro, corporativo-limpio, neon-gaming, neutro | requiere-rehacer-geometria | medio | 390 divs por frame (rows 15 x cols 26) con paso 50 px CONSTANTE: la malla mide 1300x750, medida para 1280x720. |
| `BackgroundPerspectiveGrid` | 🟡 ARREGLABLE | 🟩 NUEVO | ambiente | retro-vintage, neon-gaming, tech-oscuro, cinematico-dramatico | requiere-rehacer-geometria | medio | Bug de logica en el scroll. |
| `BackgroundRadial` | 🟡 ARREGLABLE | 🟩 NUEVO | ambiente | infantil-festivo, neon-gaming, brutalista-pop, cinematico-dramatico, retro-vintage | requiere-rehacer-geometria | medio | Dos numeros que no cierran. |
| `BackgroundWaves` | 🟡 ARREGLABLE | 🟩 NUEVO | ambiente | neutro, corporativo-limpio, organico-artesanal, infantil-festivo | requiere-rehacer-geometria | bajo | El SVG es 100%x100% sin viewBox, o sea que sus unidades son px del lienzo, y el path esta escrito a mano contra 720: arranca en `M 0 360` y cierra en `L ${width} 720 L 0 720 Z`. |

### Partículas — `ParticleAnimations`

> 10 escenas · 🟢 0 sano · 🟡 10 arreglable · 🔴 0 roto

| Escena | Salud (universal) | Aporte | Puerta | Familias | Formato | Valor | Nota técnica |
|---|---|---|---|---|---|---|---|
| `ParticleLightning` | 🟡 ARREGLABLE | 🟨 MEJORA | envoltura | cinematico-dramatico, tech-oscuro, neon-gaming, brutalista-pop, neutro | requiere-rehacer-geometria | medio | Dos defectos independientes y nombrables. |
| `ParticleMagneticField` | 🟡 ARREGLABLE | 🟩 NUEVO | pieza | tech-oscuro, corporativo-limpio, neutro, editorial-sobrio | requiere-rehacer-geometria | medio | Toda la geometria esta escrita para 1280x720 y produce una desincronizacion real entre dos capas: el bucle recorre `x = 0..1280` y el eje de simetria del campo esta cableado en 640 (`distFromCenter = Math.abs(x-640)/640`) con la base en y=360, mientras el iman se coloca con left:50%. |
| `ParticleSmoke` | 🟡 ARREGLABLE | 🟨 MEJORA | ambiente | cinematico-dramatico, tech-oscuro, organico-artesanal, neutro | requiere-rehacer-geometria | medio | El origen esta escrito a mano para 1280x720: `x = 640 + offsetX + ...` y `y = 600 - particleFrame*speed*3`. |
| `ParticleBubbles` | 🟡 ARREGLABLE | 🟦 YA-EXISTE | ambiente | infantil-festivo, organico-artesanal, corporativo-limpio, neutro | requiere-rehacer-geometria | bajo | `const y = 750 - riseProgress` cablea el lienzo de 720 como linea de nacimiento: en 1080x1920 las burbujas aparecen a y=750, el 39% del alto, materializandose a media pantalla en vez de subir desde abajo. |
| `ParticleConfetti` | 🟡 ARREGLABLE | 🟦 YA-EXISTE | ambiente | infantil-festivo, brutalista-pop, neon-gaming, corporativo-limpio | requiere-rehacer-geometria | bajo | Determinista y con descarte correcto contra useVideoConfig().height. |
| `ParticleFireworks` | 🟡 ARREGLABLE | 🟦 YA-EXISTE | ambiente | infantil-festivo, neon-gaming, brutalista-pop, cinematico-dramatico | requiere-rehacer-geometria | bajo | Bug de geometria citable: el radio se calcula en px (`distance = 150*p*(1-0.3p)`), se divide entre 10 y se aplica como PORCENTAJE a los dos ejes (`x = fw.x + cos*d/10` sobre el ancho, `y = fw.y + sin*d/10` sobre el alto). |
| `ParticleSakura` | 🟡 ARREGLABLE | 🟦 YA-EXISTE | ambiente | organico-artesanal, infantil-festivo, lujo, retro-vintage | requiere-rehacer-geometria | bajo | Mismo defecto de velocidad absoluta que Confetti y Snow: `speed = random*1.5+1` da 1-2.5 px/frame, o sea 768-1920 frames para cruzar un lienzo de 1920. |
| `ParticleShootingStars` | 🟡 ARREGLABLE | 🟩 NUEVO | ambiente | cinematico-dramatico, tech-oscuro, infantil-festivo, lujo | requiere-rehacer-geometria | bajo | Error de unidades con consecuencia total: la posicion se escribe como `left: ${x}%` / `top: ${y}%` pero avanza `speed * starFrame` con speed = random*15+10, o sea 10-25 PUNTOS PORCENTUALES por frame. |
| `ParticleSnow` | 🟡 ARREGLABLE | 🟦 YA-EXISTE | ambiente | infantil-festivo, cinematico-dramatico, retro-vintage, neutro | requiere-rehacer-geometria | bajo | Mismo defecto de unidades que Confetti y mas grave: `speed = random*1+0.5` da 0.5-1.5 px/frame. |
| `ParticleSparks` | 🟡 ARREGLABLE | 🟨 MEJORA | ambiente | cinematico-dramatico, neon-gaming, brutalista-pop, tech-oscuro | agnostico | bajo | La ley radial esta bien: `distance = speed*t*(1 - t/(2L))` es monotona y frena exactamente a cero al final de la vida. |

### Líquidos / tinta — `LiquidAnimations`

> 11 escenas · 🟢 7 sano · 🟡 4 arreglable · 🔴 0 roto

| Escena | Salud (universal) | Aporte | Puerta | Familias | Formato | Valor | Nota técnica |
|---|---|---|---|---|---|---|---|
| `LiquidFluidWave` | 🟢 SANO | 🟩 NUEVO | salida | neutro, corporativo-limpio, organico-artesanal, infantil-festivo, tech-oscuro | agnostico | alto | La unica de las 30 escrita de verdad sobre useVideoConfig: `x = (i/steps)*width`, yBase en FRACCION del alto (0.4-0.7), el path cierra con `M 0 ${height} ... |
| `LiquidPaintDrip` | 🟢 SANO | 🟩 NUEVO | salida | brutalista-pop, infantil-festivo, organico-artesanal, neon-gaming, retro-vintage | agnostico | alto | Toda la geometria sale de width/height (`x = (i/14)*width`, `dripLength = progress*height*1.2`, acotado con Math.min(..., height+100)), random() sembrado dentro de useMemo([width]), spring() de Remotion, y solo divs y CSS (border-radius, gradientes, boxShadow). |
| `shared/blobUtils.ts -> generateBlobPath` | 🟢 SANO | 🟨 MEJORA | pieza | neutro | agnostico | alto | ~20 lineas de TypeScript puro cuya unica dependencia es random() de Remotion: determinista por semilla, sin frame, sin Date, sin estado, sin coste por frame mas alla de un array de N puntos. |
| `LiquidBlob` | 🟢 SANO | 🟩 NUEVO | pieza | tech-oscuro, neon-gaming, corporativo-limpio, lujo | agnostico | medio | El path se regenera cada frame pero solo con sin/cos del frame: puro, sin random por frame. |
| `LiquidInkSplash` | 🟢 SANO | 🟩 NUEVO | pieza | organico-artesanal, editorial-sobrio, brutalista-pop, infantil-festivo, retro-vintage | agnostico | medio | La mancha es un path SEMBRADO Y ESTATICO (generateBlobPath(`splash-${i}`) no depende del frame): solo escala y rota con spring(). |
| `LiquidSwirl` | 🟢 SANO | 🟩 NUEVO | envoltura | neon-gaming, tech-oscuro, brutalista-pop, cinematico-dramatico, infantil-festivo | agnostico | medio | Polilinea de 60 puntos con `radius = 20 + t*150 + ruido(+-25)`: maximo 195, mas la mitad del trazo mas grueso (50) da 245, dentro del viewBox -300..300 — no se recorta. |
| `LiquidWaterDrop` | 🟢 SANO | 🟩 NUEVO | envoltura | neutro, corporativo-limpio, tech-oscuro, infantil-festivo, cinematico-dramatico | agnostico | medio | Todo el conjunto esta anclado a left:50% / top:55% con desplazamientos en px, es determinista y las maquinas de estado cierran: las columnas colapsan con `(1 - t/60)` y se descartan por debajo de 10 px, y las gotas siguen una parabola limpia (`arcY = -arcHeight*sin(PI*p)`). |
| `LiquidSplatter` | 🟡 ARREGLABLE | 🟩 NUEVO | pieza | brutalista-pop, infantil-festivo, neon-gaming, organico-artesanal, cinematico-dramatico | agnostico | alto | Dos defectos nombrables. |
| `LiquidCalligraphyInk` | 🟡 ARREGLABLE | 🟨 MEJORA | pieza | organico-artesanal, editorial-sobrio, brutalista-pop, lujo, retro-vintage | agnostico | medio | Tres defectos nombrables. |
| `LiquidOilSpill` | 🟡 ARREGLABLE | 🟩 NUEVO | envoltura | neon-gaming, tech-oscuro, cinematico-dramatico, lujo, retro-vintage | agnostico | medio | Colision de id citable: los degradados se declaran `id={`oil-grad-${startDelay}-${idx}`}` y los ids de SVG son globales al DOCUMENTO, asi que dos instancias con el mismo startDelay —el 0 por defecto, o sea el caso normal— colisionan y las cinco capas de ambas resuelven al <defs> que monto primero. |
| `LiquidMorphBlob` | 🟡 ARREGLABLE | 🟩 NUEVO | pieza | tech-oscuro, neon-gaming, lujo, corporativo-limpio | agnostico | bajo | Recorte citable en los blobs flotantes: generateMorphingBlob(seed, t, 60, 8) alcanza 60+40+30+20 = 150 en el pico de ruido y se dibuja en un viewBox -100..100 sin overflow:visible, asi que los 20 blobs pequenos salen cuadriculados cada vez que se hinchan (las 6 capas principales si cierran: 100+9… |

### Formas — `ShapeAnimations`

> 10 escenas · 🟢 4 sano · 🟡 6 arreglable · 🔴 0 roto

| Escena | Salud (universal) | Aporte | Puerta | Familias | Formato | Valor | Nota técnica |
|---|---|---|---|---|---|---|---|
| `Shape3DCube` | 🟢 SANO | 🟩 NUEVO | pieza | tech-oscuro, corporativo-limpio, infantil-festivo, brutalista-pop | agnostico | medio | Seis caras con rotateY/rotateX mas translateZ(size/2) sobre un contenedor con preserve-3d y perspective en el padre: la geometria del solido es correcta, esta centrada al 50 % y es determinista. |
| `ShapeMandala` | 🟢 SANO | 🟩 NUEVO | pieza | organico-artesanal, infantil-festivo, retro-vintage, lujo | agnostico | medio | Cuatro anillos declarados como DATOS ({cantidad, radio, tamano, color}), posiciones por cos/sin, orientacion de cada elemento con angle·57 (radianes a grados, correcto), contra-rotacion por indice de capa y entrada por muelle. |
| `ShapeSpinningRings` | 🟢 SANO | 🟩 NUEVO | pieza | neutro, tech-oscuro, corporativo-limpio | agnostico | medio | Tres aros con border-radius 50 % y un lado transparente, girando a velocidades y sentidos distintos derivados del frame, con entrada por muelle; |
| `ShapeExplosion` | 🟢 SANO | 🟦 YA-EXISTE | ambiente | neutro, infantil-festivo, brutalista-pop | agnostico | bajo | Reparto angular regular con perturbacion sembrada y memoizada, spring de expansion, fogonazo acotado a 8 frames por lerp y fundido final por lerp. |
| `ShapeCircularProgress` | 🟡 ARREGLABLE | 🟩 NUEVO | pieza | neutro, corporativo-limpio, tech-oscuro | agnostico | alto | La tecnica del anillo es correcta: circumference = 2·pi·r, strokeDashoffset derivado del porcentaje, rotate(-90deg) y strokeLinecap round. |
| `ShapeMorphing` | 🟡 ARREGLABLE | 🟩 NUEVO | ambiente | tech-oscuro, corporativo-limpio, infantil-festivo | agnostico | medio | La interpolacion de borderRadius es correcta, pero el bucle NO es exacto como aparenta: el morph cicla cada 120 frames, la rotacion avanza 0.5deg/frame (60deg por ciclo, nunca vuelve al mismo angulo) y la respiracion es Math.sin(f*0.05), de periodo 125.6 frames. |
| `ShapeRipples` | 🟡 ARREGLABLE | 🟩 NUEVO | pieza | neutro, organico-artesanal, tech-oscuro | agnostico | medio | Cinco aros desfasados 20 frames con modulo de 100: determinista y de coste minimo. |
| `ShapeHelix` | 🟡 ARREGLABLE | 🟨 MEJORA | pieza | tech-oscuro, neon-gaming, corporativo-limpio | agnostico | bajo | Hay un error de SIGNO citable: los puntos van a z=+80·sin(angle) y z=-80·sin(angle), pero el travesano es una barra en X rotada con rotateY(angle·57deg), y rotateY(t) manda (x,0,0) a (x·cos t, 0, -x·sin t): la z de la barra queda invertida respecto de los puntos, asi que solo coincide con ellos c… |
| `ShapeHexGrid` | 🟡 ARREGLABLE | 🟨 MEJORA | ambiente | tech-oscuro, corporativo-limpio, neon-gaming | requiere-rehacer-geometria | bajo | El panal esta cuadrado para 1280 de ancho: el ultimo hexagono empieza en x≈1097.5 y mide 70, asi que a 1080 se sale por la derecha; |
| `ShapeParticleField` | 🟡 ARREGLABLE | 🟦 YA-EXISTE | ambiente | neutro, tech-oscuro, cinematico-dramatico | agnostico | bajo | Lee width/height de useVideoConfig y memoiza las semillas, o sea se adapta al formato. |

### Logo — `LogoAnimations`

> 10 escenas · 🟢 3 sano · 🟡 6 arreglable · 🔴 1 roto

| Escena | Salud (universal) | Aporte | Puerta | Familias | Formato | Valor | Nota técnica |
|---|---|---|---|---|---|---|---|
| `LogoSplitScreen` | 🟢 SANO | 🟩 NUEVO | salida | neutro, brutalista-pop, corporativo-limpio | agnostico | alto | Dos mitades al 50 % con translateY en PORCENTAJE y la juntura con opacidad derivada del mismo progreso: cero px de lienzo, cero aleatoriedad, cero CSS transition. |
| `LogoLightTrail` | 🟢 SANO | 🟨 MEJORA | ambiente | neon-gaming, tech-oscuro, cinematico-dramatico | agnostico | medio | Cinco estelas con left en % y opacidades por lerp escalonado (i*5): determinista y sin geometria de lienzo salvo el resplandor de 400x150 px. |
| `Logo3DRotate` | 🟢 SANO | 🟦 YA-EXISTE | envoltura | tech-oscuro, lujo, corporativo-limpio | agnostico | bajo | perspective en el contenedor, preserve-3d en el hijo y giro/escala derivados de un spring; |
| `LogoNeonSign` | 🟡 ARREGLABLE | 🟩 NUEVO | envoltura | neon-gaming, retro-vintage, cinematico-dramatico, tech-oscuro | agnostico | alto | El parpadeo esta MEJOR pensado que el de LogoGlitch: `Math.floor(frame/4)` sostiene el valor durante 4 frames en vez de sortear uno nuevo por frame. |
| `LogoParticles` | 🟡 ARREGLABLE | 🟨 MEJORA | ambiente | neutro, tech-oscuro, cinematico-dramatico | requiere-rehacer-geometria | alto | La convergencia esta bien hecha: un spring por particula con desfase propio y semillas memoizadas. |
| `LogoStamp` | 🟡 ARREGLABLE | 🟩 NUEVO | entrada | retro-vintage, organico-artesanal, brutalista-pop, editorial-sobrio | agnostico | alto | El muelle esta bien construido (damping 8 / stiffness 300 / mass 0.5, escala 3 -> 0.9 -> 1 con pasada de frenada y enderezado de -15deg) y la salpicadura usa random() de Remotion. |
| `LogoGlitch` | 🟡 ARREGLABLE | 🟦 YA-EXISTE | envoltura | tech-oscuro, neon-gaming, brutalista-pop, cinematico-dramatico | agnostico | bajo | Es determinista (usa random() de Remotion, no Math.random), pero sortea un valor NUEVO en cada frame (`random('glitch-'+frame) < 0.2`), asi que el efecto son frames sueltos dispersos sin sostener, que es ruido ilegible en movimiento; |
| `LogoMaskReveal` | 🟡 ARREGLABLE | 🟦 YA-EXISTE | entrada | neutro | agnostico | bajo | El recorte es correcto (clipPath inset en % sobre el propio elemento), pero la barra luminosa no viaja con el borde: se posiciona en `calc(50% - 200px + progreso*4px)`, o sea recorre 400 px fijos mientras el texto a fontSize 120 peso 900 mide unos 450, asi que la luz se desacopla del corte y se p… |
| `LogoMorph` | 🟡 ARREGLABLE | 🟦 YA-EXISTE | gramatica | brutalista-pop, tech-oscuro | agnostico | bajo | No hay interpolacion de formas: es un cambio de glifo en letterProgress 0.5 camuflado con un giro de 360deg (en el instante del cambio la letra esta a 180deg, boca abajo) y una escala en V que si es continua en el punto de corte. |
| `LogoStroke` | 🔴 ROTO | 🟦 YA-EXISTE | pieza | neutro | agnostico | bajo | `strokeDasharray="500"` sobre un `<text>`: el patron de guiones se aplica a CADA GLIFO por separado, y el contorno de una letra a 72 px queda muy por debajo de 500 unidades, asi que las cuatro letras se completan a la vez, desde puntos arbitrarios y antes de tiempo. |

### Cinemático — `CinematicAnimations`

> 10 escenas · 🟢 2 sano · 🟡 8 arreglable · 🔴 0 roto

| Escena | Salud (universal) | Aporte | Puerta | Familias | Formato | Valor | Nota técnica |
|---|---|---|---|---|---|---|---|
| `CinematicDocumentary` | 🟢 SANO | 🟨 MEJORA | pieza | editorial-sobrio, corporativo-limpio, neutro | agnostico | medio | Es de las poquisimas escenas del repo enteramente en PORCENTAJES: left:10%, top:50%, right:10%, bottom:15% y width:`${lineProgress*0.8}%`. |
| `CinematicEpic` | 🟢 SANO | 🟨 MEJORA | formato-de-medio | cinematico-dramatico, neutro, lujo | requiere-rehacer-geometria | medio | Cincuenta estrellas con random(clave) sembrado por indice, centelleo con Math.sin((frame-startDelay)*0.1 + i) —frame local—, vineta radial por CSS y dos barras de letterbox ancladas a los bordes. |
| `CinematicAction` | 🟡 ARREGLABLE | 🟨 MEJORA | envoltura | neutro, cinematico-dramatico, neon-gaming, brutalista-pop | requiere-rehacer-geometria | alto | La sacudida se resiembra CADA frame (random(`action-shake-${frame}`)): temblor de ruido blanco en vez de oscilacion acotada. |
| `CinematicVintage` | 🟡 ARREGLABLE | 🟨 MEJORA | ambiente | neutro, retro-vintage, cinematico-dramatico, editorial-sobrio | agnostico | alto | El grano SI esta vivo y bien hecho: seed='${flickerSeed}' con flickerSeed = Math.floor(frame / 2) recalcula la textura cada dos frames y es funcion pura del frame. |
| `CinematicAnime` | 🟡 ARREGLABLE | 🟩 NUEVO | ambiente | neon-gaming, brutalista-pop, cinematico-dramatico, infantil-festivo | agnostico | medio | Las 30 lineas de velocidad se CONGELAN al terminar su lerp (extrapolateRight clamp) y no hacen bucle: a partir del frame ~35 todas estan paradas en left:-20% y la pantalla se queda quieta. |
| `CinematicNoir` | 🟡 ARREGLABLE | 🟩 NUEVO | ambiente | cinematico-dramatico, retro-vintage, lujo | requiere-rehacer-geometria | medio | Las ocho persianas van a top = i*90 + 40, o sea de 40 a 760 px: el alto exacto de un lienzo de 720. |
| `CinematicRomance` | 🟡 ARREGLABLE | 🟨 MEJORA | ambiente | cinematico-dramatico, lujo, organico-artesanal, infantil-festivo | agnostico | medio | El corazon es el EMOJI del sistema: lo pinta la fuente de emoji del renderer, no es un path propio, asi que el mismo frame puede dar un glifo distinto en otra maquina — el mismo riesgo de determinismo entre maquinas que theme-noticias.ts ya documenta para San Francisco. |
| `CinematicSciFi` | 🟡 ARREGLABLE | 🟨 MEJORA | ambiente | tech-oscuro, neon-gaming, cinematico-dramatico | requiere-rehacer-geometria | medio | `const scanlineY = ((frame - startDelay) * 5) % 720` lleva el ALTO DEL LIENZO escrito a mano: en 1080x1920 la linea de escaneo recorre solo el tercio superior y desaparece. |
| `CinematicHorror` | 🟡 ARREGLABLE | 🟩 NUEVO | pieza | cinematico-dramatico | agnostico | bajo | El glitch se RESIEMBRA cada frame (random(`horror-g-${frame}`)): es ruido blanco, no un glitch sostenido. |
| `CinematicMinimalEnd` | 🟡 ARREGLABLE | 🟦 YA-EXISTE | ninguna | cinematico-dramatico, editorial-sobrio, lujo, neutro | agnostico | bajo | Bug concreto de solape: "Jane Doe" usa fadeInOut(30, 50), o sea visible del frame 30 al 80; |

### Temas estéticos — `ThemeAnimations`

> 33 escenas · 🟢 11 sano · 🟡 21 arreglable · 🔴 1 roto

| Escena | Salud (universal) | Aporte | Puerta | Familias | Formato | Valor | Nota técnica |
|---|---|---|---|---|---|---|---|
| `Theme3DGlass` | 🟢 SANO | 🟩 NUEVO | pieza | lujo, tech-oscuro, corporativo-limpio, cinematico-dramatico | agnostico | alto | Es el mejor construido del lote entero. |
| `ThemeDuotone` | 🟢 SANO | 🟩 NUEVO | envoltura | neutro, brutalista-pop, tech-oscuro, editorial-sobrio | agnostico | alto | La tecnica es de las mejores del lote. |
| `ThemeGlassmorphism` | 🟢 SANO | 🟩 NUEVO | envoltura | corporativo-limpio, tech-oscuro, lujo, neutro | agnostico | alto | spring con frame-startDelay-10 (negativo antes de tiempo, que Remotion clampa a 0 correctamente), tarjeta centrada por porcentaje, sin ciclos ni semillas. |
| `Theme` de lujo (nombre en inglés en el lote) | 🟢 SANO | 🟩 NUEVO | ambiente | lujo, cinematico-dramatico, editorial-sobrio, corporativo-limpio, neutro | agnostico | alto | Marco por inset (left/top/right/bottom: 80) mas dos escuadras de 40px en esquinas opuestas y un filete con degradado a transparente; |
| `ThemeSwiss` | 🟢 SANO | 🟨 MEJORA | gramatica | editorial-sobrio, corporativo-limpio, neutro | vertical-ok | alto | Cuatro lerp con clamp, todos sobre frame-startDelay. |
| `ThemeBauhaus` | 🟢 SANO | 🟩 NUEVO | pieza | brutalista-pop, infantil-festivo, corporativo-limpio, neutro | vertical-ok | medio | Tres springs desfasados con frame-startDelay-{0,10,20} y un lerp de filete. |
| `ThemeJapanese` | 🟢 SANO | 🟨 MEJORA | pieza | editorial-sobrio, lujo, organico-artesanal | agnostico | medio | Dos lerp con clamp sobre frame-startDelay y nada mas. |
| `ThemeMinimalist` | 🟢 SANO | 🟨 MEJORA | pieza | editorial-sobrio, corporativo-limpio, lujo, neutro | agnostico | medio | Dos lerp con clamp, ambos leidos como frame-startDelay; |
| `ThemeNeumorphism` | 🟢 SANO | 🟩 NUEVO | envoltura | corporativo-limpio, organico-artesanal | agnostico | medio | Cuatro box-shadow (dos exteriores opuestos, dos inset) y un spring con frame local. |
| `ThemeOrganic` | 🟢 SANO | 🟩 NUEVO | ambiente | organico-artesanal, corporativo-limpio, infantil-festivo, neutro | agnostico | medio | El morphing de border-radius de ocho valores se calcula con senos y cosenos de frecuencias distintas (0.02 * frame local, con multiplicadores 0.7 a 1.5) sobre frame-startDelay: funcion pura del frame y ciclica por construccion, no hace falta modulo. |
| `ThemeBoho` | 🟢 SANO | 🟩 NUEVO | ambiente | organico-artesanal, editorial-sobrio, infantil-festivo | vertical-ok | bajo | Todo entra por lerp con clamp sobre frame-startDelay y nada se mueve despues del frame ~35: es una lamina que se revela. |
| `ThemeMonochrome` | 🟡 ARREGLABLE | 🟨 MEJORA | salida | neutro, editorial-sobrio, brutalista-pop, corporativo-limpio | vertical-ok | alto | El barrido del bloque va en PORCENTAJE (width: blockProgress*60%), que es lo correcto y escala solo. |
| `ThemePaperCut` | 🟡 ARREGLABLE | 🟨 MEJORA | gramatica | neutro, editorial-sobrio, infantil-festivo, organico-artesanal | requiere-rehacer-geometria | alto | El escalonado va AL REVES de la profundidad. |
| `ThemeBrutalistWeb` | 🟡 ARREGLABLE | 🟨 MEJORA | pieza | brutalista-pop, tech-oscuro, neutro | vertical-ok | medio | La marquesina NO hace bucle: translateX(-(frame - startDelay) * 3) sin modulo, con diez copias del mismo texto; |
| `ThemeCyberpunk` | 🟡 ARREGLABLE | 🟨 MEJORA | ambiente | neon-gaming, tech-oscuro, cinematico-dramatico | agnostico | medio | Hace `void _startDelay`: IGNORA su unica prop, y las dos animaciones (Math.sin(frame*0.5) y Math.sin(frame*0.2)) van con frame ABSOLUTO. |
| `ThemeDarkMode` | 🟡 ARREGLABLE | 🟩 NUEVO | pieza | tech-oscuro, corporativo-limpio | vertical-ok | medio | `Math.sin(frame * 0.1)` con frame ABSOLUTO en el latido del glow: es la unica animacion ciclica y arranca en fase arbitraria dentro de una Sequence anidada. |
| `ThemeIndustrial` | 🟡 ARREGLABLE | 🟩 NUEVO | ambiente | brutalista-pop, tech-oscuro, retro-vintage | requiere-rehacer-geometria | medio | Los cuatro tornillos estan en coordenadas absolutas (40,40) (1200,40) (40,640) (1200,640): son las esquinas de un lienzo de 1280x720 escritas a mano. |
| `ThemeIsometric` | 🟡 ARREGLABLE | 🟩 NUEVO | envoltura | tech-oscuro, corporativo-limpio, infantil-festivo | requiere-rehacer-geometria | medio | El contenedor centrado con translate(-50%,-50%) no tiene tamano: todos sus hijos son position:absolute, asi que el -50% se calcula sobre 0x0 y la rejilla 3x3 no queda centrada, crece hacia abajo-derecha desde el centro. |
| `ThemeMemphis` | 🟡 ARREGLABLE | 🟩 NUEVO | pieza | brutalista-pop, infantil-festivo, retro-vintage | requiere-rehacer-geometria | medio | CORRIJO el veredicto previo: la rotacion SI usa frame local, `rotate((frame - startDelay) * ±1)`. |
| `ThemeNeobrutalism` | 🟡 ARREGLABLE | 🟩 NUEVO | envoltura | brutalista-pop, infantil-festivo | vertical-ok | medio | El cuadrado decorativo gira con `rotate(${frame * 2}deg)`: frame ABSOLUTO, no frame-startDelay. |
| `ThemeNeon` | 🟡 ARREGLABLE | 🟨 MEJORA | pieza | neon-gaming, tech-oscuro, retro-vintage | agnostico | medio | El parpadeo es un UMBRAL DURO: `Math.sin((frame-startDelay)*0.5) > 0.95 ? 0.7 : 1`. |
| `ThemeTech` | 🟡 ARREGLABLE | 🟩 NUEVO | pieza | corporativo-limpio, tech-oscuro | horizontal-solo | medio | Dos <button type="button"> con cursor:pointer, restos de web inertes en render. |
| `ThemeWatercolor` | 🟡 ARREGLABLE | 🟩 NUEVO | ambiente | organico-artesanal, infantil-festivo, editorial-sobrio | requiere-rehacer-geometria | medio | Mismo data:image/svg+xml con feTurbulence SIN atributo `seed`: una sola imagen estatica para todo el metraje. |
| `ThemeY2K` | 🟡 ARREGLABLE | 🟩 NUEVO | pieza | infantil-festivo, neon-gaming, retro-vintage | agnostico | medio | Los siete <linearGradient id="y2kStarGrad-${i}"> son ids GLOBALES del documento: dos instancias de la escena en el mismo frame se pisan y las estrellas de una toman el degradado de la otra. |
| `ThemeArtDeco` | 🟡 ARREGLABLE | 🟩 NUEVO | ambiente | lujo, retro-vintage, cinematico-dramatico | requiere-rehacer-geometria | bajo | El abanico recorre [0,15,...,165]: 180 grados de 360, y como la cuna M300 300 L300 50 L350 100 Z ya es asimetrica, el resultado queda visiblemente descentrado. |
| `ThemeCosmic` | 🟡 ARREGLABLE | 🟦 YA-EXISTE | ninguna | cinematico-dramatico, tech-oscuro, infantil-festivo | vertical-ok | bajo | Dos defectos nombrables. |
| `ThemeGeometricAbstract` | 🟡 ARREGLABLE | 🟦 YA-EXISTE | ninguna | corporativo-limpio, brutalista-pop, editorial-sobrio | requiere-rehacer-geometria | bajo | Seis formas con coordenadas absolutas x:100..900 / y:100..450, calculadas para 1280x720: en 1080x1920 todo se agolpa en el tercio superior y la de x=900 con w=250 se sale. |
| `ThemeGradient` | 🟡 ARREGLABLE | 🟩 NUEVO | molde | corporativo-limpio, tech-oscuro, infantil-festivo | agnostico | bajo | `gradientAngle = 135 + frame * 0.5` con frame ABSOLUTO: ignora startDelay. |
| `ThemeHolographic` | 🟡 ARREGLABLE | 🟨 MEJORA | envoltura | neon-gaming, tech-oscuro, infantil-festivo | agnostico | bajo | El shimmer si es local, pero se usa como `backgroundPosition: ${shimmer}% 0` sobre un backgroundSize de 200% SIN modulo: a los 5 s va por el 450% y el desplazamiento ya no significa nada. |
| `ThemeNatural` | 🟡 ARREGLABLE | 🟩 NUEVO | ambiente | organico-artesanal, editorial-sobrio | agnostico | bajo | `Math.sin(frame * 0.05)` con frame ABSOLUTO, usado en tres sitios (dos blobs y la hoja). |
| `ThemePop` | 🟡 ARREGLABLE | 🟦 YA-EXISTE | ninguna | infantil-festivo, brutalista-pop | requiere-rehacer-geometria | bajo | `left: 80 + i*220` con i hasta 4: el ultimo bloque ocupa 960..1140 px. |
| `ThemeRetro` | 🟡 ARREGLABLE | 🟦 YA-EXISTE | ninguna | retro-vintage, editorial-sobrio, organico-artesanal | agnostico | bajo | El grano es un url(data:image/svg+xml...feTurbulence) SIN atributo `seed`: seed 0 por defecto, o sea la MISMA imagen en todos los frames — textura congelada que no anima. |
| `Theme3DGlassThreeJS` | 🔴 ROTO | 🟩 NUEVO | ninguna | lujo, tech-oscuro, corporativo-limpio | agnostico | bajo | Tres motivos y cualquiera basta. |

### UI — `UIAnimations`

> 10 escenas · 🟢 0 sano · 🟡 10 arreglable · 🔴 0 roto

| Escena | Salud (universal) | Aporte | Puerta | Familias | Formato | Valor | Nota técnica |
|---|---|---|---|---|---|---|---|
| `UIForm` | 🟡 ARREGLABLE | 🟩 NUEVO | entrada | neutro | agnostico | alto | El tecleo es correcto y determinista: lerp sobre el frame + Math.floor sobre la longitud de la cadena, sin estado. |
| `UIModal` | 🟡 ARREGLABLE | 🟨 MEJORA | salida | corporativo-limpio, tech-oscuro, neutro | vertical-ok | medio | En el frame 0 la escena ya ensena su final. |
| `UIToast` | 🟡 ARREGLABLE | 🟩 NUEVO | gramatica | neutro, corporativo-limpio, tech-oscuro | agnostico | medio | `if (!isVisible && frame >= hideFrame) return null` desmonta el aviso dentro de un flex-column con gap 15: cuando muere el primero (frame 60) los dos vivos SALTAN hacia arriba la altura del desmontado, sin transicion. |
| `UIButton` | 🟡 ARREGLABLE | 🟦 YA-EXISTE | envoltura | tech-oscuro, corporativo-limpio | requiere-rehacer-geometria | bajo | `transition: box-shadow 0.3s` no interpola en render frame a frame (Remotion pinta cada frame aislado) y el fondo cambia por el booleano isHovered: los dos son cortes secos de un frame. |
| `UICard` | 🟡 ARREGLABLE | 🟦 YA-EXISTE | molde | corporativo-limpio, tech-oscuro, editorial-sobrio | vertical-ok | bajo | `transition: border-color 0.3s` con isHovered booleano: el borde de acento y el hoverScale 1.02 saltan en un frame. |
| `UIDropdown` | 🟡 ARREGLABLE | 🟦 YA-EXISTE | gramatica | corporativo-limpio, tech-oscuro | vertical-ok | bajo | La flecha gira con `transition: transform 0.3s`, inerte en render: salta de 0 a 180 en un frame. |
| `UILoading` | 🟡 ARREGLABLE | 🟦 YA-EXISTE | pieza | corporativo-limpio, tech-oscuro | agnostico | bajo | La barra usa `width: ${(frame - startDelay) % 100}%`. |
| `UINavigation` | 🟡 ARREGLABLE | 🟦 YA-EXISTE | pieza | corporativo-limpio, tech-oscuro | horizontal-solo | bajo | El spring recibe (frame - startDelay - i*25) SOLO cuando el item esta activo, y activeIndex es floor((frame-startDelay)/25) % 4. |
| `UITabs` | 🟡 ARREGLABLE | 🟦 YA-EXISTE | gramatica | corporativo-limpio, tech-oscuro | horizontal-solo | bajo | Mismo spring condicionado que UINavigation con periodo 30: a partir del frame startDelay+120 el indicador de la pestana activa nace ya completo porque el argumento arrastra el ciclo anterior. |
| `UIToggle` | 🟡 ARREGLABLE | 🟦 YA-EXISTE | gramatica | corporativo-limpio, tech-oscuro | agnostico | bajo | Dos defectos citables. |

### Demo de producto — `DemoAnimations`

> 12 escenas · 🟢 0 sano · 🟡 12 arreglable · 🔴 0 roto

| Escena | Salud (universal) | Aporte | Puerta | Familias | Formato | Valor | Nota técnica |
|---|---|---|---|---|---|---|---|
| `DemoTooltip` | 🟡 ARREGLABLE | 🟩 NUEVO | pieza | neutro | agnostico | alto | El bocadillo esta bien resuelto y NO depende del lienzo: left:50% / bottom:100% sobre el elemento senalado, transformOrigin bottom center y pico con un cuadrado rotado 45deg; |
| `DemoDragDrop` | 🟡 ARREGLABLE | 🟨 MEJORA | gramatica | neutro, corporativo-limpio, tech-oscuro | requiere-rehacer-geometria | medio | `transition: border-color 0.2s, background 0.2s` en la zona destino, inerte en render. |
| `DemoPageTransition` | 🟡 ARREGLABLE | 🟨 MEJORA | salida | corporativo-limpio, tech-oscuro, neutro | vertical-ok | medio | El bloque Highlight+Cursor se desmonta con `frame < transitionStart` estando el Highlight a progress 1: los dos se cortan en seco a la vez. |
| `DemoScroll` | 🟡 ARREGLABLE | 🟩 NUEVO | pieza | tech-oscuro, corporativo-limpio, neutro | vertical-ok | medio | La tecnica es correcta: contenedor con overflow:hidden y contenido con translateY por lerp con easing, y el marco esta hecho con insets (100/60) que se adaptan solos al lienzo. |
| `DemoSearchFilter` | 🟡 ARREGLABLE | 🟩 NUEVO | gramatica | neutro, corporativo-limpio, tech-oscuro | vertical-ok | medio | Es la unica del lote cuyo contenido se DERIVA de la entrada: Array.filter sobre lo tecleado y el contador leyendo filteredItems.length. |
| `DemoAddressBar` | 🟡 ARREGLABLE | 🟨 MEJORA | pieza | tech-oscuro, corporativo-limpio | vertical-ok | bajo | El cronometraje no cabe en su propio hueco: teclea 25 caracteres hasta el frame 80, pulsa Enter en el 90, carga hasta el 120 y el contenido acaba de aparecer en el 140, con un escaparate de 90 frames. |
| `DemoCursorClick` | 🟡 ARREGLABLE | 🟨 MEJORA | gramatica | corporativo-limpio, tech-oscuro, neutro | requiere-rehacer-geometria | bajo | Determinista, pero toda la coreografia esta cableada al lienzo 1280x720: la ruta 200,400 -> 640,300 y el aro del click fijado a mano en (640,300) para cuadrar con el final de esa ruta. |
| `DemoMenuExpand` | 🟡 ARREGLABLE | 🟨 MEJORA | entrada | corporativo-limpio, tech-oscuro | requiere-rehacer-geometria | bajo | Dos `transition` inertes: `transform 0.2s` en la flecha y `filter 0.3s, opacity 0.3s` en el fondo, asi que el giro y el desenfoque del fondo son saltos de un frame. |
| `DemoModal` | 🟡 ARREGLABLE | 🟦 YA-EXISTE | ambiente | corporativo-limpio, tech-oscuro | vertical-ok | bajo | Mismo fallo de logica que UIModal y mas largo: la condicion `(isModalOpen \|\| frame < modalCloseFrame + 15)` es cierta desde el frame 0 y modalProgress toma la rama `modalCloseFrame - frame + 5` = 105, spring()=1, asi que el dialogo de borrado se ve ENTERO durante los primeros 35 frames; |
| `DemoTextInput` | 🟡 ARREGLABLE | 🟨 MEJORA | entrada | neutro, corporativo-limpio, tech-oscuro | vertical-ok | bajo | El tecleo (lerp + Math.floor) es correcto, pero el parpadeo usa `Math.floor(frame / 15)` sobre el frame crudo, sin startDelay. |
| `DemoWizard` | 🟡 ARREGLABLE | 🟦 YA-EXISTE | pieza | corporativo-limpio, neutro | horizontal-solo | bajo | El relleno del conector es `width: completed ? "100%" : "0%"` con `transition: width 0.3s`: en render pasa de 0 a 100 en un frame. |
| `DemoZoomFocus` | 🟡 ARREGLABLE ᶜ | 🟦 YA-EXISTE | formato-de-medio | neutro | requiere-rehacer-geometria | bajo | La geometria no cierra. |

### Demo · utilidades — `DemoAnimations/shared`

> 3 escenas · 🟢 2 sano · 🟡 1 arreglable · 🔴 0 roto

| Escena | Salud (universal) | Aporte | Puerta | Familias | Formato | Valor | Nota técnica |
|---|---|---|---|---|---|---|---|
| `Highlight (shared)` | 🟢 SANO | 🟩 NUEVO | pieza | neutro | agnostico | alto | Puro, con `progress` externo, sin fondo y sin hooks. |
| `ClickRipple (shared)` | 🟢 SANO | 🟩 NUEVO | pieza | neutro | agnostico | medio | Componente puro: sin hooks, sin fondo propio, sin aleatoriedad y sin dependencia del lienzo. |
| `Cursor (shared)` | 🟡 ARREGLABLE | 🟩 NUEVO | pieza | neutro | agnostico | medio | Declara `animation: "ripple 0.4s ease-out"` y el keyframe `ripple` NO existe en ningun archivo del repo (grep de @keyframes: cero coincidencias), asi que el aro nunca se anima; |

---

## 9 · Riesgos del giro a herramienta global

1. **El catálogo se vuelve combinatorio.** Hoy `Catalogo` dura `55 fichas × 90 f` ≈ **165 s**. Con `M` dialectos × `N` marcas serían `55·M·N·90` frames — con 3 dialectos y 4 marcas, **33 minutos**. La respuesta razonable es que **no** sea combinatorio: la ficha se demuestra en el perfil neutro y la marca se prueba aparte con una comp `Marca`. Hay que decidirlo **antes** del paso 9.
2. **La superficie de prueba se multiplica.** `medir-anchos.mjs` valida R09 leyendo *los planes de `motor/demos/` y los de los proyectos presentes*: con N marcas, «verde» pasa a significar «verde para las marcas que tienen plan escrito». Hace falta un plan sintético canónico que se renderice en todos los perfiles.
3. **La sonda de frames no escala** y es el único control de no-regresión que hay. Sin automatizarla, el paso 4 no es auditable.
4. **`plan/avances.ts` son 1.280 líneas para dos familias.** Con 6 marcas serían ~7.000 líneas versionadas sin política de retirada. La tabla debe generarse **por marca**, en `marcas/<slug>/avances.ts`, y borrarse con el perfil.
5. **Una pieza compartida se rompe en un dialecto y nadie lo ve.** `Montadores` es un mapeado total para el *tipo* y no hay nada para el *aspecto*. El registro compartido crea este riesgo.
6. **Cobertura de glifos.** `generar-avances.mjs` mide anchos, no comprueba que la fuente tenga los glifos del guion. Hay que añadirlo al alta de una marca.
7. **El eje GÉNERO es independiente del de marca** y no está en el plan: las reglas factuales (honestidad del b-roll, fuentes verificadas) bloquearían a una marca de ficción. Es barato y falta.

---

## 10 · Advertencias sobre este documento

- **~10 de los 🟦 YA EXISTE son ciertos en `graficos/` y falsos en editorial.** No hay pasarela entre dialectos: `capa()` (`nucleo.ts:1832`) ata los constructores a uno solo. `regla`, `lista`, `serie` y `barras` no existen donde vive la producción real.
- **`Trazo`, `Escena3D`, `Panel3D` y `Capas3D` están en `SIN_RUTA`** (`fichas.ts:457-479`): existen en JSX pero ningún plan los alcanza, por decisión explícita.
- **El grano vivo no se arregla desplazando `backgroundPosition`.** `METRAJE.grano` es un `repeating-conic-gradient` de 4 sectores: un patrón periódico, no ruido. Desplazarlo produce moiré estroboscópico. Hay que cambiar el tile.
- **`cajaPiel` cablea `G.tinta` navy** en las tres cajas (`PistaGraficos.tsx:582-631`), así que `piel:{caja:"panel"}` no sirve sobre papel — hay cero usos de `piel` en `motor/noticias/`. La deuda ya está declarada en el comentario del propio código.
- **`esfuerzo: "no-portar"` mezcla dos veredictos opuestos**: «no sirve» y «ya lo hacemos mejor». Al leer la tabla, cruza siempre con la columna de salud.
- **Seis escenas del lote van sobre fondo claro**, no una: `ListMinimalLeft`, `LayoutDiagonal`, `LayoutGiantNumber`, `LayoutMultiColumn`, `LayoutWhitespace`, `CinematicDocumentary`. Son las implementaciones de referencia para un registro claro-corporativo.

---

## 11 · Licencia

MIT, «Copyright (c) 2026 lifeprompt-team». Exige que el aviso de copyright y el
de permiso acompañen a «all copies or substantial portions of the Software».
Lo que se **copie literalmente** lleva el texto MIT íntegro al lado; lo que se
**reescriba** conservando solo la técnica no es legalmente una copia, pero se
documenta igual. La procedencia va **fuera de `remotion/src/`**, que es un
directorio bajo `eslint src && tsc`.
