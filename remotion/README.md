# `remotion/` — el motor

Proyecto npm de [Remotion](https://www.remotion.dev): aquí viven las composiciones (`src/Root.tsx`), el motor reutilizable (`src/motor/`), las marcas (`src/marcas/`) y los medios (`public/`). Las instrucciones de uso están en el [README de la raíz](../README.md); este archivo solo recuerda los comandos del motor.

Todos se lanzan **desde esta carpeta** (`remotion/`), uno por línea. Las dependencias las instala `node ../herramientas/setup.mjs` (hace `npm ci`); no hace falta `npm install` a mano.

| Qué | Comando |
|---|---|
| Abrir el Studio en http://localhost:3000 (cerrar: `Ctrl + C`) | `npm run dev` |
| Listar las composiciones | `npx remotion compositions src/index.ts` |
| Un fotograma, sin abrir el Studio | `npx remotion still src/index.ts Prueba out/prueba.png --frame=45` |
| Renderizar una composición | `npx remotion render src/index.ts Prueba out/prueba.mp4` |
| Lint + tipos (obligatorio antes de dar por bueno un cambio) | `npm run lint` |
| Diagnóstico de la instalación (el mismo `doctor` de la raíz) | `npm run doctor` |

Las composiciones del producto son `Prueba`, `TutorialYT`, `VerticalSocial`, `FeedCuadrado`, `Avatar16x9`, `DemoCamara`, `Catalogo`, `GraficosDemo`, `PlanDemo` y `NoticiaDemo`. Tus proyectos (`src/proyectos/NNN/composiciones.tsx`) se registran solos detrás de ellas: los recoge `src/estudio.tsx`.

`public/` es la carpeta de medios: `sfx/` (los efectos de sonido, ver su [README](public/sfx/README.md)), `fuentes/` (Inter, empaquetada) y `avatar.mp4` (un clip de relleno que crea el instalador si falta). Lo que pongas ahí para tus proyectos queda fuera de git.

## Licencia de Remotion

El código de este repo es MIT, pero **Remotion no**: tiene [su propia licencia](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md). Es gratis para particulares y para empresas de hasta 3 personas; una empresa mayor necesita una licencia de empresa de Remotion. El detalle de cada dependencia de terceros está en [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).

Documentación de Remotion: [The fundamentals](https://www.remotion.dev/docs/the-fundamentals). Ayuda de Remotion: [Discord](https://discord.gg/6VzzNDwUwV).
