# Catálogo de gráficos

> ⚠️ **Archivo generado.** No lo edites a mano: sale de
> `remotion/src/motor/graficos/fichas.ts`. Para actualizarlo:
> `node manuales/motion-graphics/scripts/generar-catalogo.mjs`

La versión VIVA de este catálogo es la composición **`Catalogo`** del Remotion
Studio (`npm run dev` en `remotion/`): ahí cada cosa se ve animándose de verdad,
con su ficha y su ruta al lado. Este markdown es para consultarlo sin abrir el Studio.

**52 entradas**, agrupadas por CÓMO se alcanzan desde el plan.
La columna **Ruta** es lo que se escribe: cópiala tal cual. Nada de lo que hay
aquí se mantiene a mano — las piezas salen del registro `PIEZAS`, los moldes de
`MOLDES_GRAFICOS` y el resto de tipos derivados del núcleo, así que el catálogo
no puede anunciar algo que el plan no sepa escribir. El test que lo comprueba:
`node manuales/motion-graphics/scripts/revisar-catalogo.mjs`.

## Moldes

Dónde va el bloque y qué trae puesto. Se pide por NOMBRE: `molde: "franja"`.

| Ruta | Nombre | Qué es | Cuándo usarlo | Sonido | Archivo |
|---|---|---|---|---|---|
| `molde: "sello"` | **Sello** | Toma sobre el avatar: el bloque cuelga de la banda de subtítulos y crece hacia abajo. Ancla 70 % desde arriba; caja de 844×500 px (base 1080); scrim 830 px desde abajo. | Overlay sobre el avatar cuando el texto necesita fondo. El scrim va ACOPLADO al molde: nace con la toma y muere con el texto, así que nadie puede olvidarlo. | — | `coreografia.ts` |
| `molde: "cta"` | **CTA** | Igual que sello pero con más scrim: el CTA es más alto que un titular. Ancla 70 % desde arriba; caja de 844×500 px (base 1080); scrim 880 px desde abajo. | El cierre. Igual que `sello` pero con 50 px más de scrim: un CTA es más alto que un titular y con 830 el borde inferior del campo flotaba sobre la ropa del avatar. | — | `coreografia.ts` |
| `molde: "franja"` | **Franja alta** | R08: por encima de la cara. Más de 340 px y el gráfico invade al avatar. Ancla 6 % desde arriba; caja de 844×340 px (base 1080); scrim no. | El gancho, el rótulo de sección, el dato que acompaña a lo que se está diciendo. R08: por encima de la cara, y por eso su presupuesto de alto es el más estrecho. | — | `coreografia.ts` |
| `molde: "pantalla"` | **Pantalla** | Toma de gráfico: el avatar se DESMONTA y el gráfico es la escena entera. Ancla 50 % desde centro; caja de 844×1500 px (base 1080); scrim no. | Cuando el gráfico ES la escena: `cubre: true` desmonta el avatar. La única que trae fondo propio y viñeta, y la única donde cabe un `diagrama`. | — | `coreografia.ts` |
| `molde: "capa"` | **Capa de atmósfera** | Atmósfera a pantalla completa: es ambiente, no maqueta — un bloque con alto ya está sobre la cara. Ancla 50 % desde centro; caja de 844×0 px (base 1080); scrim no. | Solo ambiente: partículas, foco, viñeta. Su `altoMax: 0` es a propósito — está anclada al centro y no cubre, así que cualquier bloque con alto ya está sobre la cara. | — | `coreografia.ts` |

## Gramática

Cómo se componen los nodos entre sí: ejes de grupo y pieles.

| Ruta | Nombre | Qué es | Cuándo usarlo | Sonido | Archivo |
|---|---|---|---|---|---|
| `eje: "columna"` | **Columna** | Apila los hijos en vertical con el gap del molde (o el que pida el grupo). | El eje por defecto y el 90 % de las tomas: kicker, titular, etiqueta. `gap` admite un valor POR HUECO. | — | `PistaGraficos.tsx` |
| `eje: "fila"` | **Fila** | Pone los hijos en horizontal. | Glifo + etiqueta, chips de una comparación, una cifra con su unidad. Ojo al ancho: una fila SUMA (R09). | — | `PistaGraficos.tsx` |
| `eje: "pila"` | **Pila** | Superpone a los hijos en el mismo hueco de una rejilla de una celda. | El tachón SOBRE su texto, una marca encima de una foto. `alinea` decide por dónde se cruzan. | — | `PistaGraficos.tsx` |
| `eje: "capas"` | **Capas** | Superposición, exactamente igual que `pila`. | Hoy el intérprete las monta IDÉNTICAS (`superpone` en RenderGrupo): `capas` existe como intención declarada —profundidad— y no como render distinto. Mientras eso siga así, escribe `pila`. | — | `PistaGraficos.tsx` |
| `eje: "ranura"` | **Ranura** | Estados que SE TURNAN en el mismo hueco, conmutando en frames de la voz. | La sustitución dura, en los frames en que la voz cambia de estado: cada estado muere cuando entra el siguiente. Con `conmuta: "volteo"` y DOS hijos es la tarjeta 3D. | whip en el volteo | `PistaGraficos.tsx` |
| `eje: "diagrama"` | **Diagrama** | El ÚNICO sitio donde existe una coordenada: caja de ancho y alto fijos con hijos en `xy`. | Ejes de tiempo y esquemas. Solo en moldes que cubren. `ancla`/`anclaY` evitan las seis restas a mano (830−20, 1080−20…) y R08 no baja aquí dentro. | — | `PistaGraficos.tsx` |
| `piel: { caja: "sello" }` | **Piel de sello** | Tarjeta traslúcida bajo el grupo, con los tokens de `CAJA.sello`. | Sobre el avatar, cuando el texto necesita fondo. Traslúcida a propósito: una caja opaca se lee como parche. La lleva el GRUPO, no un componente dentro. | — | `estilos.ts` |
| `piel: { caja: "campo" }` | **Piel de campo** | Caja tipo input: alto fijo, borde del color pedido y sombra. | El campo de WhatsApp del CTA. Con un `caret` dentro y la envoltura `parpadeo`, es un cursor escribiendo. | typing | `PistaGraficos.tsx` |
| `piel: { caja: "panel" }` | **Piel de panel** | Panel sólido (820×460 por defecto) con borde tenue y esquinas grandes. | Agrupar varios datos en UNA superficie: una tabla, un antes/después, una ficha de inmueble. | — | `PistaGraficos.tsx` |

## Piezas

Lo que dibuja. Son las claves del registro `PIEZAS` del dialecto.

| Ruta | Nombre | Qué es | Cuándo usarlo | Sonido | Archivo |
|---|---|---|---|---|---|
| `pieza: "kicker"` | **Kicker** | Antetítulo en versalitas. | Contexto o sección. NUNCA lleva el mensaje. | — | `Texto.tsx` |
| `pieza: "titular"` | **Titular** | El mensaje de la toma. `lineas` = saltos EXPLÍCITOS. | Uno por toma. Un trozo con `tinta` colorea una palabra dentro de la frase. | impact deep (en la palabra clave) | `Texto.tsx` |
| `pieza: "etiqueta"` | **Etiqueta** | La frase de apoyo que explica el titular o la cifra. | Debajo del hero. Con rol 'apoyo' hereda el color del hero rebajado, no gris. | — | `Texto.tsx` |
| `pieza: "cifra"` | **Cifra** | El dato como protagonista, con tabular-nums. | Cuando la magnitud ES el argumento y no hace falta verla subir. | data / money | `Texto.tsx` |
| `pieza: "chip"` | **Chip** | Píldora de estado: fondo y borde derivados del color. | Etiquetar (activo/inactivo, antes/después). Inalcanzable en v1. `activo: false` lo apaga a gris, que es como se descarta una opción de una comparación. | — | `Texto.tsx` |
| `pieza: "glifo"` | **Glifo** | SVG inline del banco, por NOMBRE. | Dentro de una fila con una etiqueta. El plan nunca lleva el `path`. | — | `Glifos.tsx` |
| `pieza: "caret"` | **Caret** | Barra de cursor de un campo de texto. | Con la envoltura `parpadeo`: es tiempo cíclico, no una ventana. Antes se escribía a mano en cada pieza. | — | `Texto.tsx` |
| `pieza: "contador"` | **Contador** | Número que SE FORMA, con golpe opcional al aterrizar. | Cuando ver crecer el número es el argumento. `tramos` para fugas (0→200→meseta→3). | data (textura) + tick / chime al aterrizar | `Datos.tsx` |
| `pieza: "barra"` | **BarraProgreso** | Proporción que crece LINEAL, con umbral opcional. | Lineal a propósito: con easing mentiría sobre la velocidad del proceso. | whoosh light + chime al llegar | `Datos.tsx` |
| `pieza: "regla"` | **Regla** | Línea recta que se extiende mecánicamente. | Subrayado MECÁNICO. Con `estira` toma el ancho del bloque y desaparece el número a ojo. `gira` la convierte en tachón. | — | `Datos.tsx` |
| `pieza: "lista"` | **ItemLista** | Lista con marca y stagger por índice. | Tres puntos como mucho. `marca` es de la LISTA (ya no está fija a ✓: una lista de errores va con ✗) y `items[].estado` es de UN ítem, que es como se dice «estos dos sí y este no» sin salirse del plan. | pop por ítem (alterna variantIndex) | `Datos.tsx` |
| `pieza: "barras"` | **Barras** | Barras que crecen desde la base con stagger. | Comparar 3-6 valores. `max` COMPARTIDO entre tomas o la comparación miente. | data por barra | `Datos.tsx` |
| `pieza: "serie"` | **SerieBarras** | Indicador de N pasos con el activo saturado y los demás rebajados. | Cuando la pieza promete N cosas: planta la tríada antes y repítela en cada paso, para que el espectador sepa en cuál va. | — | `Datos.tsx` |
| `pieza: "subrayado"` | **Subrayado** | Línea a mano alzada bajo una palabra. | `semilla` distinta = otro trazo con el mismo gesto (en v1 dos subrayados salían IDÉNTICOS). | scribble | `Trazo.tsx` |
| `pieza: "rodea"` | **Rodea** | Óvalo de rotulador con exceso al cerrar. | Señalar UNA cosa. Más de una por pieza y deja de señalar. | scribble / pen | `Trazo.tsx` |
| `pieza: "flecha"` | **Flecha** | Arco de A a B con punta orientada por la tangente. | `curvatura` 0 = causa directa; curva = rodeo. Significan distinto. | swoosh | `Trazo.tsx` |
| `pieza: "check"` | **Check** | Marca de confirmación en dos tiempos naturales. | Confirmación. Verde por defecto: el color es información. | success / chime | `Trazo.tsx` |
| `pieza: "aspa"` | **Aspa** | Dos trazos cruzados EN SECUENCIA. | Descarte. El `retardo` es lo que la hace gesto y no icono. | error / impact sharp | `Trazo.tsx` |
| `pieza: "nodo"` | **Nodo** | Punto de un eje: hueco = «aquí no pasó nada», relleno = «aquí sí». | En una línea de tiempo, dentro de un `diagrama`. Con `ancla: 'centro'` se coloca por su centro. | — | `Datos.tsx` |
| `pieza: "enlace"` | **Enlace** | Línea punteada que recorre solo una fracción del camino. | 0.38 = «no llegó». El recorrido parcial ES el argumento. | — | `Datos.tsx` |

## Entradas

Cómo aparece un nodo. La pone la LEY de la pieza; el nodo solo se aparta.

| Ruta | Nombre | Qué es | Cuándo usarlo | Sonido | Archivo |
|---|---|---|---|---|---|
| `entra: { como: "ninguna" }` | **Sin entrada** | El nodo está entero desde su primer frame. | Lo que ya se anima POR DENTRO (contador, trazo, partículas): envolverlo en una entrada es animar dos veces y se ve como un rebote de más. | — | `PistaGraficos.tsx` |
| `entra: { como: "escalon" }` | **Escalón** | Corte duro: no está, y en su frame está. Sin rampa ni desplazamiento. | Estados que se turnan dentro de una `ranura`. OJO bajo `ley.reserva`: no hay animación que lo esconda, así que se ve quieto desde el arranque del padre. | click ui | `PistaGraficos.tsx` |
| `entra: { como: "barrido" }` | **Barrido** | Recorte duro de izquierda a derecha, con barra de color viajando en el borde. | Materia dura: la ley seca del dialecto (`LEY_SECA`), 4 f, sin fade ni muelle. `barra` solo en el hero — la barra es un canal de jerarquía, no un adorno. | swoosh / click ui | `Entradas.tsx` |
| `entra: { como: "extiende" }` | **Extiende** | Crece desde su origen en vez de aparecer. | Lo que se MIDE: la regla, el enlace, la barra. Una línea que aparece de golpe no dice que algo avanza; dice que ya estaba. | — | `PistaGraficos.tsx` |
| `entra: { como: "muelle" }` | **Muelle** | Muelle + rampa de opacidad + desenfoque opcional. | El gesto por defecto del canal (`LEY_BLANDA`). El `desenfoque` solo en el hero: es lo que hace que el texto «llegue» en vez de «aparecer». | whoosh light / pop | `Entradas.tsx` |

## Envolturas

Decoradores aplicables a CUALQUIER nodo, en `envolturas: [...]`.

| Ruta | Nombre | Qué es | Cuándo usarlo | Sonido | Archivo |
|---|---|---|---|---|---|
| `envolturas: [{ env: "latido" }]` | **Latido** | Oscilación de escala mientras el nodo se sostiene en pantalla. | Para que un dato sostenido no se congele. ±2 %: amplitudes mayores marean. | — | `Entradas.tsx` |
| `envolturas: [{ env: "halo" }]` | **Halo** | Luz propia detrás de UN nodo (no de la pantalla). | Cifras, logos y nodos que deben emitir luz en vez de estar pegados encima del vídeo. | — | `Fondos.tsx` |
| `envolturas: [{ env: "glitch" }]` | **Glitch** | Corrupción de señal por ráfagas: canales RGB, troceado, temblor y scanlines. | El hook, el logo o la palabra que rompe la expectativa. 0,3-0,6 s: continuo cansa en tres segundos. | glitch (alterna variantIndex entre ráfagas) | `Glitch.tsx` |
| `envolturas: [{ env: "aberracion" }]` | **Aberración** | Separación cromática constante y suave, sin troceado. | El «glitch de reposo» de un título. Si se nota conscientemente, es demasiado. | — | `Glitch.tsx` |
| `envolturas: [{ env: "parpadeo" }]` | **Parpadeo** | Encendido/apagado cíclico: `ciclo` frames visible, `ciclo` frames a `a`. | El caret del CTA. Es tiempo CÍCLICO, no una ventana: como ventanas serían diez nodos de nueve frames. `desde: "toma"` lo engancha al reloj de la toma en vez de al del nodo. | — | `PistaGraficos.tsx` |
| `envolturas: [{ env: "pulso" }]` | **Pulso** | Escala senoidal ACOTADA entre dos frames. | «Esto está vivo justo aquí»: un latido con principio y fin, atado a un momento de la voz. | — | `PistaGraficos.tsx` |
| `envolturas: [{ env: "temblor" }]` | **Temblor** | Desplazamiento horizontal senoidal acotado entre dos frames. | Tensión o error. La amplitud va en px: 4 ya se ve, 12 es una broma. | impact sharp | `PistaGraficos.tsx` |
| `envolturas: [{ env: "atenua" }]` | **Atenúa** | Baja la opacidad a `a` en un momento que puede DISPARAR otro nodo. | Lo que se apaga cuando entra su relevo (la etiqueta «Hoy» de una línea de tiempo cuando llega la siguiente). Con `en: {tras: "otroNodo"}` deja de ser un número y pasa a ser una relación: mueve el otro y esto se mueve solo. | — | `PistaGraficos.tsx` |

## Ambiente

La atmósfera de la toma. La pone el molde; la toma declara lo que cambia.

| Ruta | Nombre | Qué es | Cuándo usarlo | Sonido | Archivo |
|---|---|---|---|---|---|
| `ambiente: { scrim: … }` | **Scrim** | Degradado que oscurece un extremo para que el texto se lea sobre el vídeo. | Obligatorio con texto sobre el avatar — y por eso lo pone el MOLDE. Aquí solo se declara lo que se APARTA de él: otro alto, u `false` para quitarlo. | — | `Fondos.tsx` |
| `ambiente: { vineta: … }` | **Viñeta** | Oscurecimiento de bordes que empuja el ojo al centro. | Casi siempre en tomas que cubren. Se nota al quitarla, no al ponerla. | — | `Fondos.tsx` |
| `ambiente: { trama: … }` | **Trama** | Textura de fondo: `rejilla` (blueprint técnico) o `puntos` (su variante suave). | Sensación de sistema, plano o dato. A 0,04 es textura; a 0,15 ya roba atención al titular. | — | `Fondos.tsx` |
| `ambiente: { foco: … }` | **Foco** | Resplandor de color colocado en la escena: «la sala» donde ocurre la toma. | Continuidad entre tomas: misma sala, otro ángulo (mueve `cx`/`cy`). `cambiaEn` es el cambio DURO de color: ámbar→rojo en el frame en que la voz da la mala noticia. | — | `Fondos.tsx` |
| `ambiente: { particulas: … }` | **Partículas** | Sistema determinista con tres modos: estallido, ambiente y lluvia. | Estallido en el CTA o el dato clave; ambiente como atmósfera continua; lluvia para «cae». 40-80 bastan: 500 tumban el render. Varias `tintas` o sale confeti monocromo. | sparkle (+ pop en el estallido) | `Particulas.tsx` |

## Componentes sin ruta

Están en la biblioteca y se pueden montar a mano en el JSX de una pieza, pero
NINGÚN plan los alcanza. Se listan aparte a propósito: meterlos arriba sería
volver al fallo que el catálogo derivado cierra — anunciar como parte del
lenguaje algo que el lenguaje no sabe decir.

No están aquí `<Sello>`, `<Columna>`, `<Fila>`, `<Escena>` ni `<Ranura>`
(Texto.tsx, Entradas.tsx): son la versión JSX a mano de gestos que el plan SÍ
alcanza —la piel de sello, los ejes de grupo, la ventana de la toma y el ancla
del molde—, así que su ficha es la de arriba. En un plan los monta el intérprete.

| Componente | Archivo | Por qué no tiene ruta |
|---|---|---|
| **Trazo** | `Trazo.tsx` | Dibuja un path SVG libre. Fuera A PROPÓSITO: un path a mano es dibujo, no dato — entra como pieza propia del proyecto, no como vocabulario del canal. |
| **Tachado** | `Texto.tsx` | Se compone: una `pila` con el texto y una `regla` con `gira` encima hace el mismo gesto sin pieza nueva. |
| **Scanlines** | `Glitch.tsx` | Ninguna envoltura la monta. Vive dentro de `Glitch`, que sí tiene ruta. |
| **Escena3D · Panel3D · Capas3D** | `Tarjeta3D.tsx` | De la capa 3D solo tiene ruta `Tarjeta3D`, y por composición: `eje: "ranura"` con `conmuta: "volteo"` y dos hijos. |

---

## Cómo se usa la biblioteca

1. **Mira aquí antes de escribir un gráfico.** Si ya existe, úsalo; si existe
   parecido, añádele una prop en vez de duplicar el componente.
2. **Escribe el plan, no el JSX.** Una toma es `molde` + un árbol de nodos, y se
   monta con `<PistaGraficos plan={…} montadores={MONTADORES_BASE} />`. La
   plantilla a copiar es `motor/demos/graficos-demo.ts`.
3. **Valida antes de renderizar:** `revisaPlan(plan)` avisa de solapes, huecos,
   bloques que no caben (R08/R09) y props incoherentes.
4. **Lo único de la pieza se sigue escribiendo a mano.** La biblioteca cubre el
   80 % repetido para dejar tiempo al 20 % que hace que la pieza sea suya.
5. **Si escribes algo reutilizable, súbelo** a `motor/graficos/`: una pieza
   nueva se añade al registro `PIEZAS` (`coreografia.ts`) con su ficha, su
   montador en `PistaGraficos.tsx` y su demo en `Catalogo.tsx`. El catálogo se
   entera solo; el markdown se regenera con este script.

El sonido de cada gráfico se declara aparte, en el `cues-NNN.ts` de tu proyecto
(ver `manuales/diseno-sonoro/recetario-motion-graphics.md`): la columna «Sonido»
de estas tablas es solo la sugerencia de partida.
