import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { ReactNode } from "react";
import { CATALOGO } from "./fichas";
import type { FichaGrafico } from "./fichas";
import { GRAFICOS, LEY_BLANDA, MOLDES_GRAFICOS, PALETA_MARCA } from "./coreografia";
import type { MoldeGrafico, Tinta } from "./coreografia";
import type { CtxPieza } from "../plan/nucleo";
import { cajaPiel, Entra, MONTADORES_BASE } from "./PistaGraficos";
import { Escena, Latido } from "./Entradas";
import { alfa, FONT, G, SOMBRA } from "./estilos";
import { Halo, Puntos, Rejilla, Resplandor, Scrim, Vineta } from "./Fondos";
import { Aberracion, Glitch } from "./Glitch";
import { Particulas } from "./Particulas";
import { Chip, Columna, Etiqueta, Kicker, Titular } from "./Texto";

/**
 * CATÁLOGO VIVO — el escaparate del lenguaje, dentro del Studio.
 *
 * Cada ficha de `fichas.ts` ocupa `PASO` frames: se navega arrastrando la
 * cabeza lectora, y cada cosa se ve ANIMÁNDOSE DE VERDAD, no en una captura.
 * Es la respuesta a "¿esto ya existe?" antes de escribir nada.
 *
 * Se eligió el Studio y no una app aparte (Next.js + @remotion/player, como el
 * repo de referencia) porque el Studio YA es el reproductor del sistema: montar
 * un segundo stack solo para navegar la biblioteca añade mantenimiento sin
 * añadir información. Para leerlo fuera del Studio está el markdown que genera
 * `manuales/motion-graphics/scripts/generar-catalogo.mjs`.
 *
 * ── DOS REGLAS DE ESTE ARCHIVO ─────────────────────────────────────────────
 *
 * 1. LAS DEMOS SE INDEXAN POR `ficha.id`, que es `eje:clave` — o sea, por la
 *    RUTA que la ficha anuncia. Una demo huérfana no es un descuido estético:
 *    significa que el catálogo enseña algo que el plan no alcanza. El test
 *    `revisar-catalogo.mjs` falla si sobra o falta una.
 * 2. LA DEMO PASA POR EL INTÉRPRETE SIEMPRE QUE PUEDE: las piezas se montan con
 *    `MONTADORES_BASE`, las entradas con `<Entra>` y las pieles con `cajaPiel`.
 *    Una demo que reimplementa lo que documenta acaba enseñando otra cosa —es
 *    exactamente la forma que tenía el fallo que este catálogo viene a cerrar.
 */

/** Frames por ficha (a 30 fps = 3 s). */
export const PASO = 90;

/** Lienzo de pruebas: relativo y con recorte, para que las capas AbsoluteFill se queden dentro. */
const Escenario: React.FC<{ children: React.ReactNode; fondo?: string }> = ({ children, fondo = "#0B0F1A" }) => (
  <div
    style={{
      position: "relative",
      width: 980,
      height: 620,
      borderRadius: 24,
      overflow: "hidden",
      background: fondo,
      border: `1px solid ${G.linea}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    {children}
  </div>
);

/** Fondo de "vídeo" simulado, para demostrar las capas que van sobre el avatar. */
const FalsoVideo: React.FC = () => (
  <>
    <Resplandor color={G.amber} cx={38} cy={40} intensidad={0.35} />
    <Resplandor color={G.teal} cx={72} cy={66} intensidad={0.28} />
    <Puntos opacidad={0.06} />
  </>
);

const Nota: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ position: "absolute", bottom: 18, fontFamily: FONT, fontSize: 22, color: G.tenue }}>{children}</span>
);

/* ── Piezas: montadas por el MONTADOR, no a mano ──────────────────────────
 *
 * `ctxDemo` es el `CtxPieza` que el intérprete le pasa a una pieza, aquí
 * fabricado a mano con los valores del molde `pantalla` a escala 1. Todo lo que
 * se ve en las 20 fichas de piezas sale de `MONTADORES_BASE`, así que si un
 * montador cambia, el catálogo lo enseña cambiado el mismo día. */

const tintaDemo = (t: Tinta, a = 1): string => {
  const c = PALETA_MARCA[t];
  return a >= 1 || c.indexOf("#") !== 0 ? c : alfa(c, a);
};

const ctxDemo = (f: number, color: string): CtxPieza<Tinta> => ({
  f,
  // El catálogo enseña las piezas del CANAL, así que su ctx trae la marca del
  // dialecto de gráficos. El día que el escaparate tenga que mostrar más de una
  // marca, esto es lo que se parametriza (y no será combinatorio: la ficha se
  // demuestra en un perfil y la marca se prueba aparte).
  marca: GRAFICOS.marca,
  letra: GRAFICOS.letra,
  len: PASO,
  fps: 30,
  ancho: 1080,
  alto: 1920,
  tinta: tintaDemo,
  color,
  rol: "hero",
  px: 104,
  escala: 1,
  estira: false,
  ley: LEY_BLANDA,
});

const Monta: React.FC<{ color?: string; con: (c: CtxPieza<Tinta>) => ReactNode }> = ({ color = G.white, con }) => {
  const f = useCurrentFrame();
  return <>{con(ctxDemo(f, color))}</>;
};

const M = MONTADORES_BASE;

/* ── Moldes: dónde cae el bloque, dibujado a escala ──────────────────────── */

/**
 * Mini 9:16 con la geometría REAL del molde: ancla, caja útil (anchoMax ×
 * altoMax) y scrim, todo leído de `MOLDES_GRAFICOS`. La "cara" es el recordatorio
 * de R08 — es contra ella contra la que se decide un molde.
 */
const MiniMolde: React.FC<{ m: MoldeGrafico }> = ({ m }) => {
  const mo = MOLDES_GRAFICOS[m];
  const H = 540;
  const W = Math.round((H * 9) / 16);
  const k = H / 1920;
  const y = mo.ancla.desde === "arriba" ? mo.ancla.pct * H : mo.ancla.desde === "abajo" ? (1 - mo.ancla.pct) * H : H / 2;
  const cajaAlto = Math.max(6, (mo.altoMax ?? 0) * k);
  const cajaAncho = (mo.anchoMax ?? 844) * (W / 1080);
  return (
    <div style={{ position: "relative", width: W, height: H, border: `1px dashed ${G.tenue}`, borderRadius: 10, overflow: "hidden" }}>
      {/* la cara del avatar: el motivo de que R08 exista */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "40%",
          width: W * 0.42,
          height: W * 0.42,
          marginLeft: -W * 0.21,
          borderRadius: "50%",
          border: `1px solid ${G.linea}`,
          background: "rgba(255,255,255,0.05)",
        }}
      />
      {mo.cubre ? <div style={{ position: "absolute", inset: 0, background: alfa(G.tintaSolida, 0.85) }} /> : null}
      {mo.scrim === false ? null : (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            height: mo.scrim.alto * k,
            [mo.scrim.desde === "abajo" ? "bottom" : "top"]: 0,
            background: `linear-gradient(to ${mo.scrim.desde === "abajo" ? "top" : "bottom"}, ${G.tintaSolida}, transparent)`,
          }}
        />
      )}
      {/* la caja útil del molde, colgando de su ancla */}
      <div
        style={{
          position: "absolute",
          left: (W - cajaAncho) / 2,
          top: mo.ancla.desde === "centro" ? y - cajaAlto / 2 : y,
          width: cajaAncho,
          height: cajaAlto,
          border: `2px solid ${G.teal}`,
          background: alfa(G.teal, 0.16),
        }}
      />
      <div style={{ position: "absolute", left: 0, right: 0, top: y, height: 1, background: G.amber }} />
    </div>
  );
};

/* ── Envolturas que el intérprete calcula inline ─────────────────────────── */

/** Mismo cálculo que `Envuelve` (PistaGraficos.tsx): `ciclo` on / `ciclo` a `a`. */
const Parpadeo: React.FC<{ ciclo: number; a?: number; children: ReactNode }> = ({ ciclo, a = 0.9, children }) => {
  const f = useCurrentFrame();
  return <div style={{ opacity: Math.floor(f / Math.max(1, ciclo)) % 2 === 0 ? a : 0 }}>{children}</div>;
};

const Vaiven: React.FC<{ modo: "pulso" | "temblor"; entre: [number, number]; children: ReactNode }> = ({
  modo,
  entre,
  children,
}) => {
  const f = useCurrentFrame();
  const dentro = f >= entre[0] && f < entre[1];
  const a = modo === "pulso" ? 0.03 : 4;
  const v = dentro ? Math.sin(f / (modo === "pulso" ? 2 : 4)) * a : 0;
  return <div style={{ transform: modo === "pulso" ? `scale(${1 + v})` : `translateX(${v}px)` }}>{children}</div>;
};

const Atenua: React.FC<{ corte: number; a: number; children: ReactNode }> = ({ corte, a, children }) => {
  const f = useCurrentFrame();
  return <div style={{ opacity: f >= corte ? a : 1 }}>{children}</div>;
};

/* ── Demos que necesitan el frame: componentes con nombre ─────────────────
 * Las claves de `DEMOS` son rutas (`ambiente:foco`), no nombres de componente,
 * así que un hook dentro de una lambda anónima ahí rompe `rules-of-hooks`. Las
 * tres que leen el reloj viven aquí arriba con su nombre propio. */

const RanuraDemo: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <div style={{ display: "grid" }}>
      <div style={{ gridArea: "1 / 1", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {f < 45 ? (
          <Titular px={78}>Firmaste</Titular>
        ) : (
          <Titular px={78} color={G.amber}>
            No eres el dueño
          </Titular>
        )}
      </div>
    </div>
  );
};

const ScrimDemo: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <>
      <FalsoVideo />
      <Scrim alto={300} opacidad={Math.min(1, f / 4)} />
      <div style={{ position: "absolute", bottom: 70, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <Etiqueta px={52}>texto legible sobre el vídeo</Etiqueta>
      </div>
    </>
  );
};

const FocoDemo: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <>
      <Resplandor color={G.teal} cx={30 + (f / PASO) * 40} cy={45} intensidad={0.4} pulso={0.06} />
      <Kicker px={32}>la luz deriva: misma sala, otro ángulo</Kicker>
    </>
  );
};

/* ── Las demos, indexadas por `ficha.id` ─────────────────────────────────── */

const DEMOS: Record<string, React.FC> = {
  // ── Moldes ──
  "molde:sello": () => <MiniMolde m="sello" />,
  "molde:cta": () => <MiniMolde m="cta" />,
  "molde:franja": () => <MiniMolde m="franja" />,
  "molde:pantalla": () => <MiniMolde m="pantalla" />,
  "molde:capa": () => <MiniMolde m="capa" />,

  // ── Gramática ──
  "gramatica:columna": () => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
      <Kicker px={30}>antetítulo</Kicker>
      <Titular px={76}>El mensaje</Titular>
      <Etiqueta px={40}>y su frase de apoyo</Etiqueta>
    </div>
  ),
  "gramatica:fila": () => (
    <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 24 }}>
      <Monta con={(c) => M.glifo({ nombre: "balanza", px: 90 }, c)} color={G.amber} />
      <Etiqueta px={54}>lo que exige la norma</Etiqueta>
    </div>
  ),
  "gramatica:pila": () => (
    <div style={{ display: "grid" }}>
      <div style={{ gridArea: "1 / 1", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Titular px={82}>sin permiso</Titular>
      </div>
      <div style={{ gridArea: "1 / 1", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Monta color={G.red} con={(c) => M.regla({ ancho: 520, dur: 14, gira: -4, alto: 8 }, c)} />
      </div>
    </div>
  ),
  "gramatica:capas": () => (
    <>
      <div style={{ display: "grid" }}>
        <div style={{ gridArea: "1 / 1", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Monta color={G.teal} con={(c) => M.nodo({ radio: 120, grosor: 4 }, c)} />
        </div>
        <div style={{ gridArea: "1 / 1", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Monta color={G.amber} con={(c) => M.cifra({ texto: "3", px: 150 }, c)} />
        </div>
      </div>
      <Nota>hoy monta lo mismo que `pila`</Nota>
    </>
  ),
  "gramatica:ranura": RanuraDemo,
  "gramatica:diagrama": () => (
    <div style={{ position: "relative", width: 820, height: 260 }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ position: "absolute", left: 60 + i * 340, top: 130, transform: "translate(-50%, -50%)" }}>
          <Monta color={i === 2 ? G.teal : G.amber} con={(c) => M.nodo({ radio: 26, relleno: i < 2 }, c)} />
        </div>
      ))}
      {[0, 1].map((i) => (
        <div key={i} style={{ position: "absolute", left: 92 + i * 340, top: 126 }}>
          <Monta color={G.tenue} con={(c) => M.enlace({ largo: 276, recorre: i === 1 ? 0.38 : 1, dur: 16 }, c)} />
        </div>
      ))}
      <Nota>el único sitio donde existe una coordenada</Nota>
    </div>
  ),
  "gramatica:sello": () => (
    <div style={{ ...cajaPiel({ caja: "sello" }, PALETA_MARCA, "texto"), display: "flex", flexDirection: "column" }}>
      <Kicker px={26}>ahorro estimado</Kicker>
      <Etiqueta px={54}>4 h / semana</Etiqueta>
    </div>
  ),
  "gramatica:campo": () => (
    <div
      style={{
        ...cajaPiel({ caja: "campo", ancho: 620, tinta: "logro" }, PALETA_MARCA, "texto"),
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <Etiqueta px={38}>Escribe «ESCRITURA»</Etiqueta>
      <Parpadeo ciclo={9}>
        <Monta color={G.green} con={(c) => M.caret({ alto: 44 }, c)} />
      </Parpadeo>
    </div>
  ),
  "gramatica:panel": () => (
    <div
      style={{
        ...cajaPiel({ caja: "panel", ancho: 700, alto: 320 }, PALETA_MARCA, "texto"),
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 18,
      }}
    >
      <Kicker px={26}>ficha del inmueble</Kicker>
      <Monta color={G.amber} con={(c) => M.cifra({ texto: "78 m²", px: 110 }, c)} />
      <Etiqueta px={34}>estrato 4 · sin ascensor</Etiqueta>
    </div>
  ),

  // ── Piezas ──
  "pieza:kicker": () => <Monta con={(c) => M.kicker({ texto: "Antetítulo de sección", px: 44 }, c)} />,
  "pieza:titular": () => (
    <Monta con={(c) => M.titular({ lineas: ["El mensaje de la toma", ["va ", { t: "aquí", tinta: "dato" }]], px: 76 }, c)} />
  ),
  "pieza:etiqueta": () => <Monta con={(c) => M.etiqueta({ texto: "La frase que explica la cifra", px: 54 }, c)} />,
  "pieza:cifra": () => (
    <Columna gap={8}>
      <Monta color={G.cyan} con={(c) => M.cifra({ texto: "87 %", px: 200 }, c)} />
      <Monta color={G.apagado} con={(c) => M.etiqueta({ texto: "de los leads no contesta", px: 42 }, c)} />
    </Columna>
  ),
  "pieza:chip": () => (
    <Monta
      con={(c) => (
        <div style={{ display: "flex", gap: 18 }}>
          {M.chip({ texto: "incluido" }, { ...c, color: G.green })}
          {M.chip({ texto: "opcional" }, { ...c, color: G.amber })}
          {M.chip({ texto: "fuera", activo: false }, { ...c, color: G.red })}
        </div>
      )}
    />
  ),
  "pieza:glifo": () => (
    <Monta
      color={G.teal}
      con={(c) => (
        <div style={{ display: "flex", gap: 40 }}>
          {M.glifo({ nombre: "casa", px: 110 }, c)}
          {M.glifo({ nombre: "balanza", px: 110 }, c)}
          {M.glifo({ nombre: "moneda", px: 110 }, c)}
          {M.glifo({ nombre: "edificio", px: 110 }, c)}
        </div>
      )}
    />
  ),
  "pieza:caret": () => (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <Etiqueta px={54}>escribiendo</Etiqueta>
      <Parpadeo ciclo={9}>
        <Monta color={G.green} con={(c) => M.caret({ alto: 60 }, c)} />
      </Parpadeo>
    </div>
  ),
  "pieza:contador": () => (
    <Monta color={G.green} con={(c) => M.contador({ de: 0, a: 12480, dur: 50, prefijo: "€", golpe: true, px: 160 }, c)} />
  ),
  "pieza:barra": () => (
    <Columna gap={22}>
      <Etiqueta px={40}>presupuesto consumido</Etiqueta>
      <Monta color={G.amber} con={(c) => M.barra({ valor: 0.72, dur: 34, ancho: 760, alto: 22, pico: 0.5 }, c)} />
    </Columna>
  ),
  "pieza:regla": () => (
    <Columna gap={16}>
      <Titular px={78}>Subrayado limpio</Titular>
      <Monta color={G.teal} con={(c) => M.regla({ ancho: 620, dur: 10 }, c)} />
    </Columna>
  ),
  "pieza:lista": () => (
    <Monta
      con={(c) =>
        M.lista(
          {
            items: [
              { texto: "Guion en una hora", estado: "si" },
              { texto: "Avatar sin grabar", estado: "si" },
              { texto: "Grabar tres tomas", estado: "no" },
            ],
            px: 50,
          },
          c
        )
      }
    />
  ),
  "pieza:barras": () => (
    <Monta
      color={G.teal}
      con={(c) =>
        M.barras(
          {
            datos: [
              { etiqueta: "Ene", valor: 12 },
              { etiqueta: "Feb", valor: 19 },
              { etiqueta: "Mar", valor: 31, tinta: "logro" },
              { etiqueta: "Abr", valor: 24 },
            ],
            max: 34,
            alto: 340,
            ancho: 110,
          },
          c
        )
      }
    />
  ),
  "pieza:serie": () => (
    <Columna gap={26}>
      <Monta con={(c) => M.serie({ n: 3, activo: 1, ancho: 140, alto: 8 }, c)} />
      <Etiqueta px={40}>paso 2 de 3</Etiqueta>
    </Columna>
  ),
  "pieza:subrayado": () => (
    <Columna gap={4}>
      <Titular px={86}>lo importante</Titular>
      <Monta color={G.amber} con={(c) => M.subrayado({ ancho: 520, dur: 16 }, c)} />
    </Columna>
  ),
  "pieza:rodea": () => (
    <div style={{ position: "relative" }}>
      <Titular px={86}>este dato</Titular>
      <div style={{ position: "absolute", top: -50, left: -60 }}>
        <Monta color={G.red} con={(c) => M.rodea({ ancho: 560, alto: 210, dur: 28 }, c)} />
      </div>
    </div>
  ),
  "pieza:flecha": () => (
    <div style={{ position: "relative", width: 820, height: 380 }}>
      <div style={{ position: "absolute", left: 0, top: 150 }}>
        <Chip px={30}>problema</Chip>
      </div>
      <div style={{ position: "absolute", right: 0, top: 150 }}>
        <Chip px={30} color={G.green}>
          solución
        </Chip>
      </div>
      <Monta color={G.teal} con={(c) => M.flecha({ de: [180, 175], a: [640, 175], curvatura: 0.3, dur: 24 }, c)} />
    </div>
  ),
  "pieza:check": () => <Monta color={G.green} con={(c) => M.check({ px: 240, dur: 18 }, c)} />,
  "pieza:aspa": () => <Monta color={G.red} con={(c) => M.aspa({ px: 220, dur: 12, retardo: 6 }, c)} />,
  "pieza:nodo": () => (
    <div style={{ display: "flex", gap: 60, alignItems: "center" }}>
      <Monta color={G.amber} con={(c) => M.nodo({ radio: 34, relleno: true }, c)} />
      <Monta color={G.tenue} con={(c) => M.nodo({ radio: 34 }, c)} />
    </div>
  ),
  "pieza:enlace": () => (
    <Columna gap={22}>
      <Monta color={G.amber} con={(c) => M.enlace({ largo: 700, recorre: 0.38, dur: 20 }, c)} />
      <Etiqueta px={38}>0,38 = «no llegó»</Etiqueta>
    </Columna>
  ),

  // ── Entradas (montadas con <Entra>, el del intérprete) ──
  "entrada:ninguna": () => (
    <Entra ley={LEY_BLANDA} entra={{ como: "ninguna" }} color={G.white} rol="hero" estilo={{}} estira={false}>
      <Titular px={80}>Sin entrada</Titular>
    </Entra>
  ),
  "entrada:escalon": () => (
    <Escena from={20} to={PASO} nombre="escalon">
      <Entra ley={LEY_BLANDA} entra={{ como: "escalon" }} color={G.white} rol="hero" estilo={{}} estira={false}>
        <Titular px={80}>Corte duro</Titular>
      </Entra>
    </Escena>
  ),
  "entrada:barrido": () => (
    <Escena from={8} to={PASO} nombre="barrido">
      <Entra
        ley={LEY_BLANDA}
        entra={{ como: "barrido", dur: 8, barra: true }}
        color={G.cyan}
        rol="hero"
        estilo={{}}
        estira={false}
      >
        <Titular px={80}>Barrido duro</Titular>
      </Entra>
    </Escena>
  ),
  "entrada:extiende": () => (
    <Escena from={8} to={PASO} nombre="extiende">
      <Entra ley={LEY_BLANDA} entra={{ como: "extiende", dur: 16 }} color={G.teal} rol="hero" estilo={{}} estira={false}>
        <Monta color={G.teal} con={(c) => M.regla({ ancho: 620, dur: 1, alto: 10 }, c)} />
      </Entra>
    </Escena>
  ),
  "entrada:muelle": () => (
    <Escena from={8} to={PASO} nombre="muelle">
      <Entra
        ley={LEY_BLANDA}
        entra={{ como: "muelle", y: -60, rampa: 10, desenfoque: 12 }}
        color={G.white}
        rol="hero"
        estilo={{}}
        estira={false}
      >
        <Titular px={80}>Llega, no aparece</Titular>
      </Entra>
    </Escena>
  ),

  // ── Envolturas ──
  "envoltura:latido": () => (
    <Latido amplitud={0.03} periodo={30}>
      <Monta color={G.green} con={(c) => M.cifra({ texto: "200", px: 180 }, c)} />
    </Latido>
  ),
  "envoltura:halo": () => (
    <Halo color={G.amber} radio={340} intensidad={0.5}>
      <Monta color={G.amber} con={(c) => M.cifra({ texto: "€", px: 200 }, c)} />
    </Halo>
  ),
  "envoltura:glitch": () => (
    // densidad alta a propósito: en el catálogo interesa VER el efecto; en una
    // pieza real se deja en 0.4-0.5 para que sean ráfagas y no ruido continuo.
    <Glitch at={10} dur={70} intensidad={1} densidad={0.85} semilla="cat-glitch">
      <Titular px={110}>SEÑAL</Titular>
    </Glitch>
  ),
  "envoltura:aberracion": () => (
    <Aberracion separacion={5}>
      <Titular px={100}>Aberración</Titular>
    </Aberracion>
  ),
  "envoltura:parpadeo": () => (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <Etiqueta px={54}>Escribe «SÍ»</Etiqueta>
      <Parpadeo ciclo={9}>
        <Monta color={G.green} con={(c) => M.caret({ alto: 60 }, c)} />
      </Parpadeo>
    </div>
  ),
  "envoltura:pulso": () => (
    <>
      <Vaiven modo="pulso" entre={[30, 70]}>
        <Chip px={34} color={G.amber}>
          en vigor
        </Chip>
      </Vaiven>
      <Nota>acotado: solo entre los frames 30 y 70</Nota>
    </>
  ),
  "envoltura:temblor": () => (
    <>
      <Vaiven modo="temblor" entre={[30, 70]}>
        <Titular px={80} color={G.red}>
          no cumple
        </Titular>
      </Vaiven>
      <Nota>acotado: solo entre los frames 30 y 70</Nota>
    </>
  ),
  "envoltura:atenua": () => (
    <div style={{ display: "flex", gap: 30, alignItems: "center" }}>
      <Atenua corte={45} a={0.25}>
        <Chip px={32}>hoy</Chip>
      </Atenua>
      <Escena from={45} to={PASO} nombre="relevo">
        <Chip px={32} color={G.amber}>
          en 6 meses
        </Chip>
      </Escena>
    </div>
  ),

  // ── Ambiente ──
  "ambiente:scrim": ScrimDemo,
  "ambiente:vineta": () => (
    <>
      <FalsoVideo />
      <Vineta intensidad={0.75} />
    </>
  ),
  "ambiente:trama": () => (
    <>
      <Rejilla color={G.teal} opacidad={0.12} paso={54} />
      <div style={{ position: "absolute", inset: "0 0 0 50%" }}>
        <Puntos opacidad={0.18} paso={38} />
      </div>
      <Kicker px={32}>rejilla · puntos</Kicker>
    </>
  ),
  "ambiente:foco": FocoDemo,
  "ambiente:particulas": () => (
    <>
      <Particulas modo="ambiente" n={30} opacidad={0.5} semilla="cat-amb" />
      <Particulas modo="estallido" n={56} at={10} dur={70} semilla="cat-est" forma="cinta" />
      <Kicker px={32}>estallido + ambiente</Kicker>
    </>
  ),
};

/** Ficha de texto a la derecha del escenario. */
const Tarjeta: React.FC<{ f: FichaGrafico; i: number }> = ({ f, i }) => (
  <div style={{ width: 760, display: "flex", flexDirection: "column", gap: 16, fontFamily: FONT }}>
    <span style={{ fontSize: 24, letterSpacing: 5, textTransform: "uppercase", color: G.teal }}>
      {f.eje} · {f.familia} · {f.archivo}
    </span>
    <span style={{ fontSize: 78, fontWeight: 800, color: G.white, letterSpacing: -1, textShadow: SOMBRA.texto }}>
      {f.nombre}
    </span>
    {/* LA RUTA. Es lo que se copia al plan, y la razón de que el catálogo ya no
        pueda anunciar algo que el plan no sabe escribir. */}
    <span
      style={{
        alignSelf: "flex-start",
        fontSize: 28,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        color: G.amber,
        background: alfa(G.amber, 0.1),
        border: `1px solid ${alfa(G.amber, 0.3)}`,
        borderRadius: 10,
        padding: "6px 14px",
      }}
    >
      {f.ruta}
    </span>
    <span style={{ fontSize: 32, lineHeight: 1.35, color: G.white }}>{f.que}</span>
    <span style={{ fontSize: 28, lineHeight: 1.4, color: G.apagado }}>{f.cuando}</span>
    {f.sonido ? <span style={{ fontSize: 24, color: G.amber, letterSpacing: 1 }}>♪ {f.sonido}</span> : null}
    <span style={{ marginTop: "auto", fontSize: 22, color: G.tenue }}>
      {i + 1} / {CATALOGO.length} · arrastra la cabeza lectora para navegar
    </span>
  </div>
);

/**
 * Composición del catálogo. Duración = CATALOGO.length * PASO (ver Root.tsx).
 * Si una ficha no tiene demo, aparece el aviso en el escenario: es el
 * recordatorio de que el lenguaje y su escaparate van juntos. El test
 * `revisar-catalogo.mjs` convierte ese aviso en un fallo.
 */
export const Catalogo: React.FC = () => (
  <AbsoluteFill style={{ background: "#07090F", fontFamily: FONT }}>
    <Rejilla color={G.teal} opacidad={0.035} paso={80} />
    {CATALOGO.map((f, i) => {
      const Demo = DEMOS[f.id];
      return (
        <Escena key={f.id} from={i * PASO} to={(i + 1) * PASO} nombre={`ficha:${f.id}`}>
          <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", gap: 60, padding: 70 }}>
            <Escenario>
              {Demo ? <Demo /> : <Kicker px={30}>sin demo — añádela en Catalogo.tsx · DEMOS</Kicker>}
            </Escenario>
            <Tarjeta f={f} i={i} />
          </AbsoluteFill>
        </Escena>
      );
    })}
  </AbsoluteFill>
);
