#!/usr/bin/env bash
# instalar.sh — instala video-creator en macOS o Linux SIN administrador (nunca pide sudo).
#
#   bash instalar.sh [--whisper] [--sin-chrome] [--solo-skills]
#
# Este script hace solo dos cosas y delega el resto:
#   1. Se asegura de que hay un Node 22 o superior. Si no lo hay, instala fnm (un gestor
#      de versiones de Node) en ~/.local/share/fnm y con él Node 24 LTS, todo dentro de
#      tu carpeta de usuario, y deja en el perfil de TU shell (~/.zshrc, ~/.bashrc o el
#      conf.d de fish) las líneas para que la próxima terminal ya lo encuentre.
#      Si ya tienes un fnm (Homebrew, cargo…), instala Node 24 en su almacén y no le
#      cambia la versión por defecto.
#   2. Añade ~/.local/bin a tu PATH (ahí deja setup.mjs ffmpeg, uv, auto-editor…) y
#      ejecuta «node herramientas/setup.mjs», que instala todo lo demás y termina
#      pasando el doctor (node herramientas/doctor.mjs).
#
# Se puede ejecutar tantas veces como haga falta: nada se instala dos veces.
# Compatible con el bash 3.2 de macOS. Sin sudo, sin Homebrew (si ya lo tienes, se usa
# lo que tengas instalado con él).
#
# Nota para quien lo edite: las variables van SIEMPRE con llaves (${X}) y los mensajes
# con variables llevan solo ASCII después de ellas. El bash 3.2 de macOS, según el
# locale, se traga el primer byte de un carácter multibyte («…») como parte del nombre
# de la variable y muere con «unbound variable».
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BIN_USUARIO="${HOME}/.local/bin"
FNM_INSTALL="${HOME}/.local/share/fnm"
FNM_VERSION="v1.39.0"      # https://github.com/Schniz/fnm/releases
# sha256 de los zips de ESA versión, medidos al fijarla (dos descargas, dos herramientas).
# Al cambiar FNM_VERSION hay que volver a medirlos: si no coinciden, no se instala nada.
FNM_SHA256_MACOS="f046483e85c53b3278efe49a3620c8680f22efa58a8dabfd03eafc6b59b31a25"
FNM_SHA256_LINUX="7807664f39d39fc518da1c35ba0181e4b3267603c4b1dedeb4b5fc6ae440a224"
FNM_SHA256_ARM64="4eaff58b2c5bf30d0934027572dd0b5bbb60d2a1af309230b53662d4b1d45599"
FNM_SHA256_ARM32="3d11d96a49d49cb3f11051a1aabf968fce30db665e79ee7d81851059731fa4ac"
NODE_MAYOR_MINIMO=22
NODE_INSTALAR=24           # LTS actual (Krypton)

ok()    { printf '✅ %s\n' "$*"; }
info()  { printf '· %s\n' "$*"; }
aviso() { printf '⚠️  %s\n' "$*"; }
fallo() { printf '❌ %s\n' "$*" >&2; }

# ── 0. ¿Estamos en la raíz del repo? ───────────────────────────────────────────
if [ ! -f "${RAIZ}/herramientas/setup.mjs" ]; then
  fallo "no encuentro herramientas/setup.mjs junto a este script: ejecútalo desde la carpeta del repo (bash instalar.sh)"
  exit 1
fi
case "$(uname -s)" in
  Darwin) SO="macOS" ;;
  Linux)  SO="Linux" ;;
  *)      fallo "este instalador es para macOS o Linux; en Windows usa instalar.cmd"; exit 1 ;;
esac
printf 'video-creator · instalación en %s (%s %s)\n' "${RAIZ}" "${SO}" "$(uname -m)"
if [ "$(id -u)" = "0" ]; then
  aviso "estás ejecutando como root: no hace falta, todo se instala en la carpeta del usuario"
fi

# ── 1. PATH de esta sesión: lo nuestro primero ──────────────────────────────────
export PATH="${BIN_USUARIO}:${PATH}"
# Dos fnm posibles. El NUESTRO: lo dejó una ejecución anterior en FNM_INSTALL y su almacén
# es FNM_DIR=FNM_INSTALL. Uno AJENO (Homebrew, cargo…): se usa con SU almacén, así que no
# se le exporta FNM_DIR (lo mandaría a una carpeta que su perfil nunca activa) y no se le
# cambia la versión por defecto, que es del usuario.
FNM_AJENO=0
if [ -x "${FNM_INSTALL}/fnm" ]; then
  export FNM_DIR="${FNM_INSTALL}"
  export PATH="${FNM_INSTALL}:${PATH}"
  eval "$(fnm env 2>/dev/null || true)"
elif command -v fnm >/dev/null 2>&1; then
  FNM_AJENO=1
  eval "$(fnm env 2>/dev/null || true)"
fi

node_mayor() {
  # Devuelve la versión mayor del node que hay en el PATH, o 0 si no hay ninguno.
  if command -v node >/dev/null 2>&1; then
    node -p 'Number(process.versions.node.split(".")[0])' 2>/dev/null || echo 0
  else
    echo 0
  fi
}

sha256_de() {
  # macOS trae shasum (Perl) y no sha256sum; en Linux suele ser al revés.
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | cut -d' ' -f1
  elif command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | cut -d' ' -f1
  else
    echo ""
  fi
}

instalar_fnm() {
  # Descarga directa del zip VERSIONADO de GitHub y comprobación del sha256 fijado arriba
  # ANTES de descomprimir. No se usa el script de fnm.vercel.app: ejecuta lo que le llegue
  # y baja el binario sin comprobar ningún hash, y todo lo demás del producto va con suma.
  # Los cuatro zips son los mismos que elegiría ese script según uname -m.
  case "${SO}:$(uname -m)" in
    macOS:*)                     FNM_ZIP="fnm-macos.zip"; FNM_SHA256="${FNM_SHA256_MACOS}" ;;
    Linux:aarch*|Linux:armv8*)   FNM_ZIP="fnm-arm64.zip"; FNM_SHA256="${FNM_SHA256_ARM64}" ;;
    Linux:arm|Linux:armv7*)      FNM_ZIP="fnm-arm32.zip"; FNM_SHA256="${FNM_SHA256_ARM32}" ;;
    *)                           FNM_ZIP="fnm-linux.zip"; FNM_SHA256="${FNM_SHA256_LINUX}" ;;
  esac
  TMP_FNM="$(mktemp -d "${TMPDIR:-/tmp}/video-creator-fnm.XXXXXX")"
  # El trap conserva el código de salida: en bash 3.2 el estado del propio trap podría pisarlo.
  trap 'estado=$?; rm -rf "${TMP_FNM}"; exit ${estado}' EXIT
  info "descargando fnm ${FNM_VERSION} (${FNM_ZIP}, unos 5 MB)..."
  curl -fsSL "https://github.com/Schniz/fnm/releases/download/${FNM_VERSION}/${FNM_ZIP}" -o "${TMP_FNM}/${FNM_ZIP}"
  REAL="$(sha256_de "${TMP_FNM}/${FNM_ZIP}")"
  if [ "${REAL}" != "${FNM_SHA256}" ]; then
    fallo "el zip de fnm no coincide con su sha256 (${REAL} distinto de ${FNM_SHA256}): no lo instalo"
    exit 1
  fi
  mkdir -p "${FNM_INSTALL}"
  unzip -q -o "${TMP_FNM}/${FNM_ZIP}" -d "${FNM_INSTALL}"
  chmod +x "${FNM_INSTALL}/fnm"
  if [ ! -x "${FNM_INSTALL}/fnm" ]; then
    fallo "el zip de fnm no trae el binario fnm donde se esperaba"
    exit 1
  fi
  export FNM_DIR="${FNM_INSTALL}"
  export PATH="${FNM_INSTALL}:${PATH}"
  ok "fnm ${FNM_VERSION} instalado en ${FNM_INSTALL} (sha256 comprobado)"
}

# ── 2. Node ≥ 22 (fnm en la carpeta del usuario si hace falta) ─────────────────
AVISAR_FNM_USE=0   # 1 = Node quedó en un fnm ajeno sin ser su «default»: hay que decirle cómo activarlo
MAYOR="$(node_mayor)"
if [ "${MAYOR}" -ge "${NODE_MAYOR_MINIMO}" ]; then
  ok "Node $(node --version) ya está ($(command -v node))"
else
  if [ "${FNM_AJENO}" = "1" ]; then
    info "ya tienes fnm ($(command -v fnm)): instalo Node ${NODE_INSTALAR} en su almacén sin cambiar tu versión por defecto"
  elif [ "${MAYOR}" -gt 0 ]; then
    info "hay un Node $(node --version) pero se necesita ${NODE_MAYOR_MINIMO} o superior: instalo fnm y Node ${NODE_INSTALAR} en ${FNM_INSTALL}; el tuyo sigue instalado, pero en las terminales nuevas mandará el ${NODE_INSTALAR}"
  else
    info "no hay Node: instalo fnm y Node ${NODE_INSTALAR} en ${FNM_INSTALL} (sin administrador)"
  fi
  for herramienta in curl unzip; do
    if ! command -v "${herramienta}" >/dev/null 2>&1; then
      fallo "hace falta ${herramienta} para descargar Node y no está; instálalo con tu gestor de paquetes y repite"
      exit 1
    fi
  done
  if ! command -v shasum >/dev/null 2>&1 && ! command -v sha256sum >/dev/null 2>&1; then
    fallo "hace falta shasum o sha256sum para comprobar la descarga de fnm y no hay ninguno; instala uno con tu gestor de paquetes y repite"
    exit 1
  fi
  if ! command -v fnm >/dev/null 2>&1; then
    instalar_fnm
  fi
  # Un solo «fnm env» ANTES de instalar: cada «fnm env» abre una ruta multishell nueva que
  # apunta a la versión por defecto, y con un fnm ajeno eso desharía el «fnm use» de abajo.
  eval "$(fnm env)"
  info "descargando Node ${NODE_INSTALAR} (unos 50 MB)..."
  fnm install "${NODE_INSTALAR}"
  if [ "${FNM_AJENO}" = "1" ]; then
    # fnm hace «default» por su cuenta a la PRIMERA versión que instala si no había ninguna;
    # si el usuario ya tenía un default, se respeta y hay que avisarle de cómo activar el nuevo.
    if fnm list 2>/dev/null | grep -q "v${NODE_INSTALAR}\.[0-9.]* default"; then
      AVISAR_FNM_USE=0
    else
      AVISAR_FNM_USE=1
    fi
  else
    fnm default "${NODE_INSTALAR}" >/dev/null 2>&1 || true
  fi
  fnm use "${NODE_INSTALAR}" >/dev/null 2>&1 || true
  hash -r
  MAYOR="$(node_mayor)"
  if [ "${MAYOR}" -lt "${NODE_MAYOR_MINIMO}" ]; then
    fallo "instalé Node pero esta sesión no lo ve; abre una terminal nueva y repite: bash instalar.sh"
    exit 1
  fi
  ok "Node $(node --version) instalado con fnm"
fi

# ── 3. Perfil de shell: ~/.local/bin y fnm para las próximas terminales ────────
# Solo se toca el perfil de LA shell del usuario ($SHELL): escribir ~/.zshrc a quien usa
# fish o bash no sirve de nada y le deja un archivo que su shell nunca lee.
BLOQUE_INICIO="# >>> video-creator >>>"
BLOQUE='# >>> video-creator >>>
# Herramientas del usuario (ffmpeg, uv, auto-editor) y el Node de fnm, si lo instaló instalar.sh.
export PATH="$HOME/.local/bin:$PATH"
if [ -x "$HOME/.local/share/fnm/fnm" ]; then
  export FNM_DIR="$HOME/.local/share/fnm"
  export PATH="$HOME/.local/share/fnm:$PATH"
  eval "$(fnm env)"
fi
# <<< video-creator <<<'
BLOQUE_FISH='# >>> video-creator >>>
# Herramientas del usuario (ffmpeg, uv, auto-editor) y el Node de fnm, si lo instaló instalar.sh.
fish_add_path -g $HOME/.local/bin
if test -x $HOME/.local/share/fnm/fnm
    set -gx FNM_DIR $HOME/.local/share/fnm
    fish_add_path -g $HOME/.local/share/fnm
    fnm env --shell fish | source
end
# <<< video-creator <<<'

SHELL_USUARIO="$(basename "${SHELL:-}")"
if [ -z "${SHELL_USUARIO}" ]; then
  # Sin $SHELL (cron, algún contenedor): la shell por defecto de cada sistema.
  if [ "${SO}" = "macOS" ]; then SHELL_USUARIO="zsh"; else SHELL_USUARIO="bash"; fi
fi
# Array, no cadena: un HOME con espacios («…/Ana María») partiría una cadena por palabras.
PERFILES=()
case "${SHELL_USUARIO}" in
  zsh)
    # zsh lee $ZDOTDIR/.zshrc cuando ZDOTDIR está definido, y ~/.zshrc si no.
    PERFILES=("${ZDOTDIR:-${HOME}}/.zshrc")
    ;;
  bash)
    PERFILES=("${HOME}/.bashrc")
    # En macOS, Terminal abre bash como shell de login: lee .bash_profile y no .bashrc.
    if [ "${SO}" = "macOS" ]; then PERFILES+=("${HOME}/.bash_profile"); fi
    ;;
  fish)
    # fish carga todo conf.d/*.fish al arrancar: un archivo propio, sin tocar config.fish.
    PERFILES=("${XDG_CONFIG_HOME:-${HOME}/.config}/fish/conf.d/video-creator.fish")
    ;;
  *)
    aviso "no conozco tu shell (${SHELL_USUARIO}): pon tú en su perfil ${BIN_USUARIO} en el PATH y, si instalé fnm, FNM_DIR=${FNM_INSTALL} con su fnm env"
    ;;
esac
PERFIL_TOCADO=0
# ${X[@]+"${X[@]}"}: la única forma de recorrer un array vacío con set -u en bash 3.2.
for perfil in ${PERFILES[@]+"${PERFILES[@]}"}; do
  if [ -f "${perfil}" ] && grep -q "${BLOQUE_INICIO}" "${perfil}"; then
    continue
  fi
  mkdir -p "$(dirname "${perfil}")"
  case "${perfil}" in
    *.fish) printf '%s\n' "${BLOQUE_FISH}" >"${perfil}" ;;   # archivo nuestro: se escribe entero
    *)      printf '\n%s\n' "${BLOQUE}" >>"${perfil}" ;;
  esac
  PERFIL_TOCADO=1
  ok "añadido a ${perfil}: ~/.local/bin en el PATH (y fnm si se instaló)"
done

# ── 4. Todo lo demás: setup.mjs (y al final el doctor) ─────────────────────────
mkdir -p "${BIN_USUARIO}"
cd "${RAIZ}"
# El fetch() de Node ignora HTTPS_PROXY salvo con esto (Node ≥ 24.5); un Node anterior no
# lo entiende y no pasa nada. Así el setup atraviesa el mismo proxy que npm.
export NODE_USE_ENV_PROXY=1
info "ejecutando node herramientas/setup.mjs $*"
echo ""
CODIGO=0
node "${RAIZ}/herramientas/setup.mjs" "$@" || CODIGO=$?

echo ""
if [ "${PERFIL_TOCADO}" = "1" ]; then
  info "abre una terminal NUEVA para que node, ffmpeg y uv estén disponibles también fuera de este script"
fi
if [ "${AVISAR_FNM_USE}" = "1" ]; then
  info "Node ${NODE_INSTALAR} quedó en tu fnm sin ser el de por defecto: en cada terminal nueva, «fnm use ${NODE_INSTALAR}» antes de trabajar con video-creator (o «fnm default ${NODE_INSTALAR}» si quieres que lo sea siempre)"
fi
if [ "${CODIGO}" -ne 0 ]; then
  fallo "la instalación terminó con avisos (código ${CODIGO}): mira las líneas ❌ de arriba, corrige lo que dicen y repite: bash instalar.sh"
fi
exit "${CODIGO}"
