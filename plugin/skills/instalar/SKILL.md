---
name: instalar
description: >-
  Instala o actualiza un ESTUDIO de video-creator (motor Remotion + 7 skills de
  dirección de vídeo) en la máquina del usuario, en macOS o Windows, sin permisos
  de administrador: descarga el repo, ejecuta el instalador, pasa el doctor y deja
  a la persona lista para su primer vídeo. Úsala cuando alguien diga «instala
  video-creator», «quiero montar vídeos con IA», «pon el estudio de vídeo»,
  «actualiza video-creator» o «¿qué me falta para renderizar?».
license: MIT
compatibility: Necesita internet para descargar (~1,5 GB con el Chrome de Remotion) y Node 22+, que el instalador trae si falta. Windows ARM64 no renderiza.
metadata:
  autor: John Stevans Alvarez
  repo: https://github.com/jalvarez-tech/video-creator-producto
---

# Instalar un estudio de video-creator

Eres quien instala. La persona puede no saber lo que es una terminal: tú ejecutas
los comandos, lees los errores y le cuentas en una frase qué pasó y qué toca.
Nunca le pidas una clave por el chat ni leas su `.env`.

## 1. Dónde

Propón una carpeta y confirma con la persona:

- macOS/Linux: `~/video-creator`
- Windows: `$HOME\video-creator` (PowerShell; `$env:USERPROFILE` es lo mismo). Nunca con la sintaxis de porcentajes de cmd.exe (`%…%`): PowerShell y Git Bash la tratan como texto y crearían una carpeta llamada literalmente así.

Resuelve la ruta antes de proponerla (`echo $HOME` vale en las dos shells) y dile a la persona la ruta real, p. ej. `C:\Users\Ana\video-creator`.

Evita OneDrive, iCloud, Escritorio sincronizado y rutas con espacios o tildes:
Remotion y ffmpeg se llevan mal con eso. Si la carpeta ya existe y tiene `.git`,
es una actualización (ve al paso 5).

**Si eres Codex:** los pasos 2, 3 y 5 necesitan red, y `<carpeta>` queda fuera de tu workspace salvo que la sesión esté abierta en su carpeta padre. Ejecuta esos comandos pidiendo la aprobación de permisos elevados (red y escritura fuera del workspace) y avisa a la persona de que verá esa petición: no es un fallo.

## 2. Traer el código

Repo: `https://github.com/jalvarez-tech/video-creator-producto`.

- Con `git` disponible (macOS lo trae tras aceptar el diálogo de las Command Line
  Tools; en Windows solo si lo instalaron): `git clone https://github.com/jalvarez-tech/video-creator-producto.git <carpeta>`
- Sin git, el ZIP de la rama principal:
  - macOS/Linux: `curl -fsSL -o video-creator.zip https://github.com/jalvarez-tech/video-creator-producto/archive/refs/heads/main.zip` y luego `unzip -q video-creator.zip`; la carpeta se llama `video-creator-producto-main`: renómbrala a `<carpeta>`.
  - Windows (PowerShell): `Invoke-WebRequest -Uri https://github.com/jalvarez-tech/video-creator-producto/archive/refs/heads/main.zip -OutFile video-creator.zip` y `Expand-Archive video-creator.zip -DestinationPath .`; renombra `video-creator-producto-main` a `<carpeta>`.

Un comando por línea. En PowerShell 5.1 no existe `&&`.

## 3. Instalar

Antes de lanzarlo, dile a la persona qué va a pasar: se descargan Node (si falta),
ffmpeg, uv, auto-editor, las dependencias de Remotion y su Chrome de render
(~1,5 GB en total, unos 10 minutos), todo dentro de su carpeta de usuario y sin
pedir contraseña de administrador.

- macOS/Linux, desde `<carpeta>`: `bash instalar.sh`
- Windows, desde `<carpeta>`: `powershell -NoProfile -ExecutionPolicy Bypass -File instalar.ps1`

Si la persona quiere **subtítulos automáticos** (transcripción local con whisper, unos 500 MB más), añade `--whisper` (macOS/Linux) o `-Whisper` (Windows) al comando, pero solo cuando puede funcionar: en macOS hace falta Homebrew (`brew` en el PATH: whisper.cpp se instala con `brew install whisper.cpp`); en Windows, solo x64; en Linux el instalador no lo descarga (va con el gestor de paquetes). Si no se dan esas condiciones no lo ofrezcas: el instalador avisaría y seguiría sin él.

Se puede repetir las veces que haga falta: nada se instala dos veces. Si termina
con líneas ❌, cada una dice qué hacer; hazlo o explícaselo.

Si eres Codex en macOS: el Chrome con el que Remotion renderiza no arranca dentro
del sandbox; la prueba de humo del paso 4 y cualquier render se ejecutan pidiendo
la aprobación para correr fuera del sandbox. Avísaselo a la persona para que no
se asuste con la petición.

## 4. Comprobar

`node herramientas/doctor.mjs` (o `--json` si prefieres leerlo tú). Dice el
NIVEL:

| Nivel | Qué hay | Qué puede hacer la persona |
|---|---|---|
| 0 | nada más que el instalador | montar sus clips y fotos, cortar silencios, gráficos, efectos de sonido; subtítulos automáticos solo si se instaló con `--whisper` / `-Whisper` (paso 3) |
| 1 | `PEXELS_API_KEY` en `.env` | además, b-roll de archivo (fotos y vídeo reales, gratis) |
| 2 | claves de pago en `.env` | además, voz de ElevenLabs, avatar de HeyGen, b-roll con IA |

Las claves las escribe la persona en `<carpeta>/.env` (ábreselo en su editor:
`open -e .env` en macOS, `notepad .env` en Windows). Tú no las ves ni las pides.

Prueba de humo del motor, desde `<carpeta>/remotion`:
`npx remotion still src/index.ts Prueba out/prueba.png`
Si sale la imagen, el nivel 0 funciona. En Windows (PowerShell), si sale «npx.ps1 cannot be loaded because running scripts is disabled», usa `npx.cmd remotion still src/index.ts Prueba out/prueba.png` (y `npm.cmd` en lugar de `npm`); no cambies la política de ejecución de la persona.

## 5. Actualizar

Desde `<carpeta>`: `git pull` (o vuelve a bajar el ZIP y sustituye TODO menos
`proyectos/`, `remotion/src/proyectos/`, `remotion/src/marcas/`, `remotion/public/`,
`sonido/` y `.env`, que son suyos) y después `node herramientas/setup.mjs`.

## 6. Después

Dile a la persona que abra `<carpeta>` en la app (Claude Code o Codex) y escriba
lo que quiere: «monta un vídeo con estos clips», «haz un short de esta noticia».
La puerta de entrada dentro del estudio es la skill `director-video`; ahí está
`AGENTS.md` con el mapa completo.
