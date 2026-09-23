# Avisos de terceros

video-creator se publica bajo la licencia MIT (`LICENSE`). Este archivo dice lo que **no** es nuestro: qué va dentro del repositorio tal cual, qué descarga el instalador en la máquina de cada usuario y bajo qué licencia va cada cosa. Si redistribuyes el producto, estos avisos viajan con él.

## 1. Incluido en el repositorio

| Componente | Versión | Licencia | Dónde | Notas |
|---|---|---|---|---|
| **GSAP** (GreenSock Animation Platform) | 3.14.2 | GreenSock Standard License | `manuales/motor-hyperframes/plantilla/vendor/gsap-3.14.2.min.js` | Copia vendorizada a propósito, con su cabecera de licencia intacta, para que una pieza del segundo motor siga renderizando dentro de un año. Copyright 2025 GreenSock. Términos completos: <https://gsap.com/standard-license>. |
| **Inter** (familia tipográfica) | 3.019 | SIL Open Font License 1.1 | `remotion/public/fuentes/inter/` (nueve `.otf` + `OFL.txt`) | Copyright (c) 2016 The Inter Project Authors (<https://github.com/rsms/inter>). Se carga con `@remotion/fonts`. La OFL permite empaquetar y redistribuir la fuente con el software; no permite venderla sola. |

## 2. Dependencias de npm (`remotion/package.json`, instaladas por `npm ci`)

| Componente | Versión | Licencia | Notas |
|---|---|---|---|
| **Remotion** (`remotion`, `@remotion/cli`, `@remotion/bundler`, `@remotion/renderer`, `@remotion/media-parser`, `@remotion/paths`, `@remotion/shapes`, `@remotion/eslint-config-flat`) | 4.0.496 | **Remotion License** (no es una licencia libre) | Es la única pieza con condiciones de uso propias: gratis para personas físicas, proyectos sin ánimo de lucro y empresas de **hasta 3 personas**; una empresa mayor necesita una *Company License*. Léela antes de usar el sistema en una empresa: <https://remotion.dev/license> · <https://github.com/remotion-dev/remotion/blob/main/LICENSE.md>. |
| React, react-dom | 19.2.3 | MIT | |
| TypeScript | 5.9.3 | Apache-2.0 | |
| ESLint, Prettier, esbuild, `@types/*` | las de `package-lock.json` | MIT | Solo en desarrollo. |

El árbol completo con su licencia sale con `npm ls --all` dentro de `remotion/`.

## 3. Lo que descarga el instalador en la carpeta del usuario

No están en el repositorio: `herramientas/setup.mjs` (y `instalar.sh` / `instalar.ps1` para Node) los bajan de su origen oficial con **versión fija y suma sha256**, sin administrador, a la carpeta de herramientas del usuario. Cada uno conserva su licencia y no se redistribuye con el producto.

| Componente | Versión | Licencia | Origen | Para qué |
|---|---|---|---|---|
| **uv** | 0.12.18 | Apache-2.0 OR MIT | <https://github.com/astral-sh/uv> | Ejecuta los scripts `.py` y trae su propio Python. |
| **Python** (vía `uv python install`) | ≥ 3.10 | PSF License | <https://www.python.org> | Los scripts son de librería estándar. |
| **FFmpeg / FFprobe** | 9.0.2 | LGPL 2.1+ / GPL 2+ (los builds descargados están compilados como **GPL**) | macOS: builds de Martin Riedl (<https://ffmpeg.martin-riedl.de>) · Windows: builds de Gyan Doshi (<https://www.gyan.dev/ffmpeg/builds/>) · fuente: <https://ffmpeg.org> | Medir, normalizar, sintetizar SFX, cortar, tone-map. Se invoca como proceso externo; el sistema no lo enlaza ni lo empaqueta. |
| **auto-editor** | 31.6.0 | Unlicense (dominio público) | <https://github.com/WyattBlue/auto-editor> | Corte de silencios. |
| **whisper.cpp** (opcional, `--whisper`) | b5130 | MIT | <https://github.com/ggml-org/whisper.cpp> | Transcripción local. El modelo `ggml-small.bin` deriva de los pesos de Whisper de OpenAI (MIT) y se sirve desde Hugging Face (`ggerganov/whisper.cpp`). |
| **Chrome Headless Shell** (Chrome for Testing) | la que fija Remotion 4.0.496 | Chromium: BSD-3-Clause; los binarios de Chrome for Testing, bajo los términos de Google | lo descarga `npx remotion browser ensure` | El navegador con el que Remotion renderiza. |
| **Node.js** (solo si falta) | ≥ 22 LTS | MIT (licencia de Node.js, con los avisos de sus dependencias) | <https://nodejs.org> · en macOS/Linux a través de **fnm** (GPL-3.0, <https://github.com/Schniz/fnm>); en Windows con winget o el zip portable de nodejs.org | El runtime de todo el sistema. |
| **HyperFrames** | 0.8.47 | Apache-2.0 | <https://github.com/heygen-com/hyperframes> (npm: `hyperframes`) | El segundo motor. Se ejecuta bajo demanda con `npx hyperframes@0.8.47` desde `render-hf.mjs`; no se vendoriza. |

## 4. Servicios externos (nivel 1 y 2)

Pexels, HeyGen, ElevenLabs y xAI (Grok Imagine) se usan a través de sus API con una clave que el usuario escribe en `.env`. Sus condiciones de uso, precios y licencias del material generado o descargado son las de cada servicio y aplican a quien tiene la clave. El b-roll de archivo lleva su crédito y su licencia en `proyectos/NNN/broll/manifiesto.json` porque así lo exige el sistema, no este aviso.

## 5. Lo que es nuestro aunque no lo parezca

- Los efectos de sonido de `manuales/diseno-sonoro/sfx-base/` están **sintetizados con FFmpeg** para este proyecto (`node manuales/diseno-sonoro/scripts/sfx.mjs sintetizar`): son obra propia y van bajo MIT como el resto.
- Las skills de terceros que cada usuario instale en `.agents/skills/` o `.claude/skills/` (por ejemplo las de ElevenLabs con `npx skills add`, o las de HyperFrames con `instalar-skill-hf.mjs`) conservan su propia licencia y no se versionan en este repositorio.
- Las claves, las marcas, los proyectos, los medios y el banco de sonido de cada usuario son del usuario y no salen de su máquina.
