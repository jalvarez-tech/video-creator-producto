#!/usr/bin/env node
/**
 * generar-catalogo.mjs — regenera `manuales/motion-graphics/catalogo-graficos.md`
 * a partir del catálogo de la capa de gráficos.
 *
 * Uso (desde cualquier sitio):
 *   node manuales/motion-graphics/scripts/generar-catalogo.mjs           # escribe
 *   node manuales/motion-graphics/scripts/generar-catalogo.mjs --check   # solo comprueba
 *
 * Por qué un generador y no un markdown a mano: un catálogo escrito a mano se
 * desincroniza en la tercera animación que añades, y entonces deja de servir
 * para lo único que sirve un catálogo — saber qué existe ya sin abrir el código.
 * La fuente es `remotion/src/motor/graficos/fichas.ts`, que a su vez ya no
 * escribe la lista: la DERIVA del registro `PIEZAS`, de `MOLDES_GRAFICOS` y de
 * los tipos del núcleo. Aquí solo se le da formato.
 *
 * Cómo lee TypeScript sin dependencias nuevas: transpila con el esbuild que
 * Remotion ya trae instalado y lo importa. `fichas.ts` y lo que arrastra
 * (`coreografia.ts`, `plan/nucleo.ts`) son datos puros —ni React ni Remotion—,
 * así que el bundle es trivial.
 *
 * Exporta `cargaCatalogo()` y `construyeMd()` para que `revisar-catalogo.mjs`
 * pueda comprobar que el markdown publicado no se ha quedado viejo sin tener
 * que duplicar ni el bundle ni el formato.
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { RAIZ, borrar, carpetaTemporal, esMain, leerTexto, relativa } from "../../../herramientas/comun.mjs";

export const root = RAIZ;
export const fichasTs = path.join(root, "remotion", "src", "motor", "graficos", "fichas.ts");
export const salidaMd = path.join(root, "manuales", "motion-graphics", "catalogo-graficos.md");

/**
 * Transpila un .ts (o un entry sintético que reexporte varios) y devuelve sus
 * exports. Lo usa también `revisar-catalogo.mjs`, que necesita cargar además el
 * dialecto y el núcleo para comprobar el catálogo contra sus fuentes.
 */
export async function transpilaYCarga(entrada) {
  // esbuild vive en remotion/node_modules → resolvemos desde allí, no desde aquí.
  const require = createRequire(path.join(root, "remotion", "package.json"));
  const esbuild = require("esbuild");

  const tmp = carpetaTemporal("catalogo-");
  const bundle = path.join(tmp, "out.cjs");

  try {
    await esbuild.build({
      entryPoints: [entrada],
      bundle: true,
      platform: "node",
      format: "cjs",
      outfile: bundle,
      logLevel: "error",
    });
    return require(bundle);
  } finally {
    // `borrar` reintenta: en Windows el antivirus retiene un instante el .cjs recién creado.
    borrar(tmp);
  }
}

/** Los exports de `fichas.ts`: CATALOGO, EJES, SIN_RUTA. */
export const cargaCatalogo = () => transpilaYCarga(fichasTs);

const escapa = (s) => String(s).replace(/\|/g, "\\|");

export function construyeMd({ CATALOGO, EJES, SIN_RUTA }) {
  let md = `# Catálogo de gráficos

> ⚠️ **Archivo generado.** No lo edites a mano: sale de
> \`remotion/src/motor/graficos/fichas.ts\`. Para actualizarlo:
> \`node manuales/motion-graphics/scripts/generar-catalogo.mjs\`

La versión VIVA de este catálogo es la composición **\`Catalogo\`** del Remotion
Studio (\`npm run dev\` en \`remotion/\`): ahí cada cosa se ve animándose de verdad,
con su ficha y su ruta al lado. Este markdown es para consultarlo sin abrir el Studio.

**${CATALOGO.length} entradas**, agrupadas por CÓMO se alcanzan desde el plan.
La columna **Ruta** es lo que se escribe: cópiala tal cual. Nada de lo que hay
aquí se mantiene a mano — las piezas salen del registro \`PIEZAS\`, los moldes de
\`MOLDES_GRAFICOS\` y el resto de tipos derivados del núcleo, así que el catálogo
no puede anunciar algo que el plan no sepa escribir. El test que lo comprueba:
\`node manuales/motion-graphics/scripts/revisar-catalogo.mjs\`.

`;

  for (const eje of EJES) {
    const fichas = CATALOGO.filter((c) => c.eje === eje.id);
    if (fichas.length === 0) continue;
    md += `## ${eje.nombre}\n\n${eje.que}\n\n`;
    md += `| Ruta | Nombre | Qué es | Cuándo usarlo | Sonido | Archivo |\n`;
    md += `|---|---|---|---|---|---|\n`;
    for (const f of fichas) {
      md += `| \`${escapa(f.ruta)}\` | **${escapa(f.nombre)}** | ${escapa(f.que)} | ${escapa(f.cuando)} | ${
        f.sonido ? escapa(f.sonido) : "—"
      } | \`${f.archivo}\` |\n`;
    }
    md += `\n`;
  }

  md += `## Componentes sin ruta

Están en la biblioteca y se pueden montar a mano en el JSX de una pieza, pero
NINGÚN plan los alcanza. Se listan aparte a propósito: meterlos arriba sería
volver al fallo que el catálogo derivado cierra — anunciar como parte del
lenguaje algo que el lenguaje no sabe decir.

No están aquí \`<Sello>\`, \`<Columna>\`, \`<Fila>\`, \`<Escena>\` ni \`<Ranura>\`
(Texto.tsx, Entradas.tsx): son la versión JSX a mano de gestos que el plan SÍ
alcanza —la piel de sello, los ejes de grupo, la ventana de la toma y el ancla
del molde—, así que su ficha es la de arriba. En un plan los monta el intérprete.

| Componente | Archivo | Por qué no tiene ruta |
|---|---|---|
`;
  for (const c of SIN_RUTA) {
    md += `| **${escapa(c.nombre)}** | \`${c.archivo}\` | ${escapa(c.porque)} |\n`;
  }

  md += `
---

## Cómo se usa la biblioteca

1. **Mira aquí antes de escribir un gráfico.** Si ya existe, úsalo; si existe
   parecido, añádele una prop en vez de duplicar el componente.
2. **Escribe el plan, no el JSX.** Una toma es \`molde\` + un árbol de nodos, y se
   monta con \`<PistaGraficos plan={…} montadores={MONTADORES_BASE} />\`. La
   plantilla a copiar es \`motor/demos/graficos-demo.ts\`.
3. **Valida antes de renderizar:** \`revisaPlan(plan)\` avisa de solapes, huecos,
   bloques que no caben (R08/R09) y props incoherentes.
4. **Lo único de la pieza se sigue escribiendo a mano.** La biblioteca cubre el
   80 % repetido para dejar tiempo al 20 % que hace que la pieza sea suya.
5. **Si escribes algo reutilizable, súbelo** a \`motor/graficos/\`: una pieza
   nueva se añade al registro \`PIEZAS\` (\`coreografia.ts\`) con su ficha, su
   montador en \`PistaGraficos.tsx\` y su demo en \`Catalogo.tsx\`. El catálogo se
   entera solo; el markdown se regenera con este script.

El sonido de cada gráfico se declara aparte, en el \`cues-NNN.ts\` de tu proyecto
(ver \`manuales/diseno-sonoro/recetario-motion-graphics.md\`): la columna «Sonido»
de estas tablas es solo la sugerencia de partida.
`;
  return md;
}

/* ── main ─────────────────────────────────────────────────────────────────
 * Solo escribe cuando se ejecuta directamente: importado (por
 * revisar-catalogo.mjs) no toca el disco. `esMain` compara rutas REALES: si el
 * script llega por el enlace .claude/skills/… (symlink o junction), una
 * comparación literal de import.meta.url diría «importado» y no haría nada. */
if (esMain(import.meta.url)) {
  const mod = await cargaCatalogo();
  const md = construyeMd(mod);
  const soloComprobar = process.argv.indexOf("--check") >= 0;

  if (soloComprobar) {
    // `leerTexto` quita BOM y CRLF: en un clon de Windows con autocrlf el markdown
    // llega con CRLF y una comparación literal diría VIEJO siempre, aunque el
    // contenido sea el mismo.
    const actual = fs.existsSync(salidaMd) ? leerTexto(salidaMd) : "";
    if (actual === md) {
      console.log(`✅ ${relativa(salidaMd)} está al día (${mod.CATALOGO.length} entradas).`);
      process.exit(0);
    }
    console.error(`✖ ${relativa(salidaMd)} está VIEJO. Regenéralo:`);
    console.error(`    node manuales/motion-graphics/scripts/generar-catalogo.mjs`);
    process.exit(1);
  }

  fs.writeFileSync(salidaMd, md, "utf8");
  console.log(
    `✅ ${relativa(salidaMd)} — ${mod.CATALOGO.length} entradas en ${mod.EJES.length} ejes` +
      ` (+${mod.SIN_RUTA.length} componentes sin ruta)`
  );
}
