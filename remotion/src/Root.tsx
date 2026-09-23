import "./index.css";
// Inter empaquetada (motor/fuentes.ts): se carga UNA vez, aquí, en tiempo de
// ejecución. Nunca desde un módulo de datos, que los scripts de node importan.
import "./motor/fuentes";
import { Composition } from "remotion";
import { Prueba } from "./Prueba";
import { TutorialYT } from "./motor/TutorialYT";
import { VerticalSocial } from "./motor/VerticalSocial";
import { FeedCuadrado } from "./motor/FeedCuadrado";
import { AvatarClip } from "./motor/AvatarClip";
import { DemoCamara } from "./motor/demos/DemoCamara";
import { GraficosDemo } from "./motor/demos/GraficosDemo";
import { PlanDemo } from "./motor/demos/PlanDemo";
import { NoticiaDemo } from "./motor/demos/NoticiaDemo";
import { noticiaDemo } from "./motor/demos/noticia-demo";
import { EJEMPLO } from "./marcas/ejemplo";
import { duracionPlan } from "./motor/noticias";
import { framesDelMedio } from "./motor/duracion";
import { Catalogo, CATALOGO, PASO } from "./motor/graficos";
import { tutorialYT, verticalSocial, feedCuadrado } from "./motor/presets";
import { ComposicionesDelEstudio } from "./estudio";

/**
 * EL REGISTRO DE COMPOSICIONES — y el único sitio donde motor, marcas y
 * proyectos se tocan.
 *
 *   src/motor/          lo reutilizable: contratos, intérpretes, biblioteca de
 *                       gráficos, formato noticias, sonido, plantillas y demos.
 *   src/marcas/         los perfiles de canal, como DATOS. `ejemplo.ts` es la
 *                       marca del producto y la plantilla de «crea mi marca».
 *   src/proyectos/00N/  un vídeo concreto: sus planes como datos y su JSX propio.
 *
 * Aquí se registran SOLO las composiciones del producto: las que salen de un
 * clon limpio sin material ni claves. Los proyectos NO se importan desde aquí:
 * cada uno declara los suyos en `src/proyectos/00N/composiciones.tsx` y
 * `estudio.tsx` los descubre en disco (`<ComposicionesDelEstudio />`, al
 * final). Así un clon sin proyectos compila igual, y un proyecto nuevo aparece
 * en el Studio con solo crear su archivo.
 *
 * La dependencia va en UNA dirección (proyecto → motor) y lo vigila el linter
 * (eslint.config.mjs), no la buena voluntad. Para arrancar el 005 se crea
 * `src/proyectos/005/` con su `composiciones.tsx`; no hay que tocar el motor
 * ni este archivo.
 */
export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/*
        Composición de PRUEBA del motor.
        NO borrar: es el test de arranque.
      */}
      <Composition
        id="Prueba"
        component={Prueba}
        durationInFrames={90}
        fps={30}
        width={1920}
        height={1080}
      />

      {/* ── PLANTILLAS del motor (src/motor/) ── las de verdad: no traen datos
          de ningún vídeo. Dimensiones y fps salen del preset de cada una.
          La duración real la fija cada proyecto; 150 = 5 s de demo. */}
      <Composition
        id="TutorialYT"
        component={TutorialYT}
        durationInFrames={150}
        fps={tutorialYT.formato.fps}
        width={tutorialYT.formato.width}
        height={tutorialYT.formato.height}
      />
      <Composition
        id="VerticalSocial"
        component={VerticalSocial}
        durationInFrames={150}
        fps={verticalSocial.formato.fps}
        width={verticalSocial.formato.width}
        height={verticalSocial.formato.height}
      />
      <Composition
        id="FeedCuadrado"
        component={FeedCuadrado}
        durationInFrames={150}
        fps={feedCuadrado.formato.fps}
        width={feedCuadrado.formato.width}
        height={feedCuadrado.formato.height}
      />

      {/* ── Avatar sobre plantilla ──
          Composita remotion/public/avatar.mp4 (tu clip) + título + subtítulo.
          La duración la LEE del propio clip (calculateMetadata + framesDelMedio):
          cambia el MP4 y la comp se ajusta sola. El número escrito es solo el
          respaldo para un clon sin material. */}
      <Composition
        id="Avatar16x9"
        component={AvatarClip}
        durationInFrames={90}
        fps={30}
        width={1920}
        height={1080}
        calculateMetadata={async () => ({
          durationInFrames: await framesDelMedio("avatar.mp4", 30, 90),
        })}
      />
      {/* DemoCamara — el mismo avatar.mp4 dentro de <CamaraVirtual> con el plan
          camara-demo.ts: acercamiento, reencuadre y vuelta, con un rótulo FUERA
          de la cámara que no se mueve con ella. Es la demo del skill
          camara-avatar (manuales/camara-avatar/SKILL.md). Duración fija: el
          plan está escrito para los 90 f del clip de relleno. */}
      <Composition
        id="DemoCamara"
        component={DemoCamara}
        durationInFrames={90}
        fps={30}
        width={1920}
        height={1080}
      />

      {/* ── Biblioteca de gráficos (motor/graficos/) ──
          Catalogo — el escaparate VIVO: una ficha cada PASO frames, animándose de
          verdad y con la RUTA que se escribe en el plan. Se navega arrastrando la
          cabeza lectora. Antes de escribir un gráfico nuevo, míralo aquí.
          El catálogo se DERIVA (registro PIEZAS + moldes + tipos del núcleo), así
          que su duración cambia sola al añadir una pieza.
          Doc equivalente fuera del Studio: manuales/motion-graphics/catalogo-graficos.md
          (`node manuales/motion-graphics/scripts/generar-catalogo.mjs`, y
           `revisar-catalogo.mjs` como test de que no miente). */}
      <Composition
        id="Catalogo"
        component={Catalogo}
        durationInFrames={CATALOGO.length * PASO}
        fps={30}
        width={1920}
        height={1080}
      />
      {/* GraficosDemo — la coreografía COMO DATOS: el plan graficos-demo.ts
          montado por <PistaGraficos>, sin JSX por gráfico. Plantilla a copiar
          para el plan `graficos-004.ts` de un proyecto real.
          Enseña el repertorio corto de overlay sobre avatar: gancho en la
          franja alta, cifra con remate, lista y CTA con piel de sello. */}
      <Composition
        id="GraficosDemo"
        component={GraficosDemo}
        durationInFrames={300}
        fps={25}
        width={1080}
        height={1920}
      />
      {/* PlanDemo — el MISMO intérprete y el mismo dialecto que GraficosDemo,
          con el plan de referencia largo: recorre los cuatro moldes, los tres
          ejes de grupo, una piel, dos envolturas y `tras()`. GraficosDemo es el
          repertorio corto; éste es el que se abre para ver qué sabe hacer la
          gramática entera antes de escribir un `graficos-00N.ts`. */}
      <Composition
        id="PlanDemo"
        component={PlanDemo}
        durationInFrames={300}
        fps={25}
        width={1080}
        height={1920}
      />

      {/* ── Formato NOTICIAS (motor/noticias/) ──
          El look editorial claro: papel beige + un acento de marca, serif en
          titulares y sans en subtítulos, sin avatar (voz en off + gráficos).
          El plan es DATOS (noticia-demo.ts → TomaNoticia[]) y lo monta
          <PistaNoticia>, igual que graficos-NNN.ts → <PistaGraficos>.
          La duración sale del propio plan: en un proyecto real la fija la voz.
          La MARCA se elige aquí, no dentro del motor: la demo se monta con la
          de ejemplo (marcas/ejemplo.ts); un proyecto pasa la suya.
          Manual: manuales/video-noticias/SKILL.md */}
      <Composition
        id="NoticiaDemo"
        component={NoticiaDemo}
        defaultProps={{ marca: EJEMPLO }}
        durationInFrames={duracionPlan(noticiaDemo)}
        fps={30}
        width={1080}
        height={1920}
      />

      {/* ── EL ESTUDIO ── todo lo que haya en src/proyectos/NNN/composiciones.tsx,
          descubierto en disco por estudio.tsx. En un clon limpio no hay nada y
          la lista termina aquí. */}
      <ComposicionesDelEstudio />
    </>
  );
};
