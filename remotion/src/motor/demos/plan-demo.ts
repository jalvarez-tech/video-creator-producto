/**
 * EL PLAN COMO DATOS, versión núcleo — la referencia del camino nuevo.
 *
 * Hermano de `graficos-demo.ts` —que es el repertorio corto de overlay sobre
 * avatar— y su versión larga: recorre la gramática entera con `Plan` de
 * `motor/plan/nucleo` y el dialecto de `graficos/coreografia`. Se monta con:
 *
 *   <PistaGraficos plan={planDemo} montadores={MONTADORES_BASE} />
 *
 * Es la plantilla a copiar para el `graficos-00N.ts` de un proyecto: cuatro
 * tomas que recorren los cuatro moldes, los tres ejes de grupo, una piel, dos
 * envolturas y `tras()`. Y es también la prueba RENDERIZADA de que la gramática
 * completa dibuja algo: un intérprete sin consumidor compila y sale en negro.
 *
 * El CONTENIDO es de ejemplo (una pieza sobre copias de seguridad): ningún
 * canal, ninguna cifra real. Lo que importa es la forma de cada toma, no lo que
 * dice; al copiarlo a un proyecto se cambia el texto y se conserva el molde.
 *
 * DATOS PUROS: importa del dialecto, nunca de un componente. Por eso se puede
 * validar con `node` sin montar React.
 */
import { capa, GRAFICOS } from "../graficos/coreografia";

const { pon, col, fila, gfx, plan, tras } = capa(GRAFICOS, "gfx");

export const planDemo = plan({ ancho: 1080, alto: 1920, fps: 25, duracion: 300 }, [
  gfx(
    "d01-gancho",
    "franja",
    "gancho",
    [0, 78],
    "apoyo",
    "Abre con la promesa por encima de la cara: el molde franja es el único sitio donde un bloque no invade al avatar.",
    [
      col(
        [
          pon("kicker", { texto: "COPIAS DE SEGURIDAD" }),
          pon("titular", {
            id: "titular",
            rol: "hero",
            px: 60,
            lineas: ["Guardaste el archivo.", ["Todavía ", { t: "no", tinta: "perdida", enfasis: true }, " tienes copia."]],
          }),
          // `estira` toma el ancho del bloque: sin él habría que medir a ojo el
          // ancho del titular y volver a medirlo al cambiar una palabra.
          pon("regla", { estira: true, dur: 10, color: "marca", en: tras("titular", 2) }),
        ],
        { gap: 18 }
      ),
    ]
  ),

  gfx(
    "d02-dato",
    "pantalla",
    "prueba",
    [78, 168],
    "hero",
    "El dato es el argumento entero, así que se lleva la pantalla: el avatar se desmonta y no compite con la cifra.",
    [
      col(
        [
          pon("kicker", { texto: "EN LOS EQUIPOS" }),
          pon("contador", {
            id: "cifra",
            rol: "hero",
            color: "dato",
            de: 0,
            a: 87,
            sufijo: " %",
            dur: 40,
            golpe: true,
            envolturas: [{ env: "halo", tinta: "dato", radio: 560, intensidad: 0.3 }],
          }),
          // `tras(id)` = cuando el otro ATERRIZA. El número exacto (entrada +
          // rampa) deja de estar copiado en el plan y se recalcula solo si la
          // cifra cambia de ley.
          pon("etiqueta", { texto: "de los equipos cree que ya tiene copia", en: tras("cifra", 6) }),
          pon("barras", {
            en: tras("cifra", 14),
            max: 100,
            alto: 300,
            datos: [
              { etiqueta: "2023", valor: 62, tinta: "neutro" },
              { etiqueta: "2024", valor: 74, tinta: "neutro" },
              { etiqueta: "2025", valor: 87, tinta: "dato" },
            ],
          }),
        ],
        { gap: [10, 26, 44] }
      ),
    ],
    {
      ambiente: {
        foco: { cx: 50, cy: 34, tinta: "dato", fuerza: 0.18, pulso: 0.03 },
        trama: { tipo: "rejilla", tinta: "neutro", opacidad: 0.05, paso: 90 },
      },
    }
  ),

  gfx(
    "d03-mecanismo",
    "sello",
    "mecanismo",
    [168, 246],
    "apoyo",
    "Los tres pasos del método cuelgan de la banda de subtítulos: es apoyo de lo que dice la voz, no el mensaje.",
    [
      col(
        [
          fila([pon("glifo", { nombre: "caja", px: 54, color: "marca" }), pon("etiqueta", { texto: "Lo que pide el método" })], {
            gap: 20,
          }),
          pon("lista", {
            marca: "numero",
            paso: 6,
            items: [{ texto: "Una copia local" }, { texto: "Otra fuera del sitio" }, { texto: "Restaurar y comprobar" }],
          }),
          pon("serie", { n: 3, activo: 2, color: "marca" }),
        ],
        { gap: 26 }
      ),
    ]
  ),

  gfx(
    "d04-cta",
    "cta",
    "cta",
    [246, 300],
    "apoyo",
    "Cierra con la acción concreta: el campo con caret se lee como algo que se escribe, no como un cartel.",
    [
      col(
        [
          pon("titular", { rol: "hero", px: 56, texto: "Escríbenos" }),
          fila(
            [
              pon("etiqueta", { texto: "Mensaje directo", color: "logro" }),
              // El caret es tiempo CÍCLICO (9 f encendido, 9 apagado): como cues
              // serían diez cues de nueve frames. Por eso es una envoltura.
              pon("caret", { color: "logro", envolturas: [{ env: "parpadeo", ciclo: 9, a: 0.9 }] }),
            ],
            { gap: 16, piel: { caja: "campo", tinta: "logro", ancho: 620 } }
          ),
        ],
        { gap: 24 }
      ),
    ]
  ),
]);
