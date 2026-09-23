#!/usr/bin/env python3
"""
_comun.py — lo que comparten los scripts de Python del sistema.

heygen.py, grok.py, elevenlabs.py y bancos.py son clientes HTTP de una API, con
la misma forma: leer la clave del .env, llamar, sondear un render y bajarse un
archivo. Antes cada uno tenia su propia copia de `cargar_env` (tres veces la
misma funcion, y las tres con el mismo fallo de parseo) y su propia descarga sin
timeout ni atomicidad. Los que miden con ffmpeg (bancos.py, limites-voz.py,
medir-sfx.py, medir-velo.py) toman de aqui DONDE buscar el binario.

Sigue sin dependencias externas: solo libreria estandar, como todos ellos.

Que resuelve, en concreto:
  · .env  — `export CLAVE=v`, comillas y comentarios en linea ya no corrompen el
            valor. Antes `CLAVE=abc # mia` devolvia "abc # mia", la API daba 401
            y el mensaje te mandaba a rotar una clave que estaba bien.
  · red   — distingue el error FATAL (401/403/422: reintentar no arregla nada)
            del TRANSITORIO (5xx, 429, timeout), y solo reintenta el segundo, con
            espera creciente y respetando `Retry-After`. Antes cualquier corte de
            red durante un sondeo de 15 minutos mataba un render YA PAGADO.
  · disco — descarga y escritura ATOMICAS (archivo temporal + rename). Antes un
            corte dejaba un .mp4 truncado en la ruta final: ffprobe lo lee y
            Remotion lo compone, asi que el fallo aparecia mucho mas tarde.
  · sitio — lo que cambia de una maquina a otra: la consola en UTF-8 (en
            Windows, por tuberia, es cp1252 y el primer «⚠» mata el proceso),
            el .env con o sin BOM, y `binario()` para encontrar ffmpeg aunque
            no este en el PATH (setup.mjs lo deja en la carpeta de herramientas
            del usuario). Son las mismas reglas que herramientas/comun.mjs.
"""
import json
import os
import random
import re
import shutil
import sys
import time
import urllib.error
import urllib.request

# LA CONSOLA, EN UTF-8, ANTES DE IMPRIMIR NADA. Windows codifica stdout con la
# pagina del sistema (cp1252) cuando la salida va por una tuberia — que es
# exactamente como ejecutan estos scripts Claude Code y Codex — y el primer
# «⚠» o «✅» lanza UnicodeEncodeError; en `traer` pasaba DESPUES de descargar y
# ANTES de escribir el manifiesto. Se hace al importar, para que cubra tambien
# la ayuda de argparse. En macOS y Linux ya era UTF-8: no cambia nada.
for _flujo in (sys.stdout, sys.stderr):
    try:
        _flujo.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):  # sin consola (pythonw) o flujo cerrado
        pass

# Reintentar aqui SI tiene sentido: son fallos de transporte o de carga, no de
# la peticion. El resto (401 clave mala, 422 parametros, 403 sin creditos) es
# determinista: reintentarlo solo gasta tiempo y repite el mismo error.
CODIGOS_TRANSITORIOS = frozenset({408, 425, 429, 500, 502, 503, 504})

# IDENTIFICARSE NO ES CORTESIA, ES REQUISITO — y se descubre tarde. Con el
# User-Agent por defecto de urllib (`Python-urllib/3.x`) Cloudflare responde 403
# con `error code: 1010` (bloqueo por firma del cliente) ANTES de que la peticion
# llegue al servicio, asi que la clave puede estar perfecta y el mensaje te manda
# a rotarla. Paso con la API de Pexels y otra vez con su CDN de imagenes.
#
# Va aqui y no en cada script porque el problema es del transporte, no del
# servicio: cualquier CDN detras de Cloudflare hace lo mismo. Que heygen, grok y
# elevenlabs funcionen hoy sin esto es suerte, no diseno.
AGENTE = "video-creator/1.0 (scripts de manuales/edicion-video)"


class ErrorHTTP(Exception):
    """Error definitivo de la API. Cada script lo traduce a SU mensaje util."""

    def __init__(self, codigo, cuerpo, cabeceras=None):
        super().__init__(f"HTTP {codigo}: {cuerpo[:400]}")
        self.codigo = codigo
        self.cuerpo = cuerpo
        self.cabeceras = cabeceras or {}


def raiz_proyecto():
    """
    scripts/ -> edicion-video/ -> manuales/ -> raiz del repo.

    Con `realpath`, no `abspath`: las skills se enlazan en .claude/skills/ y
    .agents/skills/ (symlink o junction), y si el script llega por ese camino
    la raiz calculada a partir del enlace seria .claude/, que no es el repo.
    """
    here = os.path.dirname(os.path.realpath(__file__))
    return os.path.abspath(os.path.join(here, "..", "..", ".."))


def _valor(bruto):
    """
    El valor de una linea de .env, sin comillas y sin comentario final.

    El comentario solo cuenta si va DESPUES de un espacio: una '#' pegada al
    valor puede ser parte de la propia clave o de un color hex (#FAFAFA).
    """
    v = bruto.strip()
    if v[:1] in ('"', "'"):
        cita = v[0]
        fin = v.find(cita, 1)
        return v[1:fin] if fin > 0 else v[1:]
    for i, c in enumerate(v):
        if c == "#" and i > 0 and v[i - 1] in " \t":
            return v[:i].rstrip()
    return v


def cargar_env(prefijo):
    """
    Variables del .env de la raiz que empiezan por `prefijo`, con las del
    entorno pisando a las del archivo (para poder hacer `CLAVE=... comando`).
    """
    valores = {}
    env_path = os.path.join(raiz_proyecto(), ".env")
    if os.path.isfile(env_path):
        # `utf-8-sig`: un .env guardado como «UTF-8 con BOM» (Bloc de notas)
        # convertia la primera clave en U+FEFF+NOMBRE y daba un «falta X» falso.
        with open(env_path, encoding="utf-8-sig") as f:
            for linea in f:
                linea = linea.strip()
                if not linea or linea.startswith("#") or "=" not in linea:
                    continue
                if linea.startswith("export "):
                    linea = linea[len("export "):].lstrip()
                k, _, v = linea.partition("=")
                valores[k.strip()] = _valor(v)
    for k, v in os.environ.items():
        if k.startswith(prefijo):
            valores[k] = v
    return valores


def _espera(intento, cabeceras):
    """Espera antes del siguiente intento: `Retry-After` si lo hay, si no 2^n."""
    ra = cabeceras.get("Retry-After") if cabeceras is not None else None
    if ra:
        try:
            return min(60.0, float(ra))
        except (TypeError, ValueError):
            pass
    # Jitter para no sincronizar reintentos; aqui no hay determinismo que romper
    # (esto no es el render: es una llamada de red).
    return min(30.0, (2 ** intento) + random.uniform(0, 1))


# Metodos SEGUROS de reintentar: repetirlos no crea nada ni cobra nada.
METODOS_IDEMPOTENTES = frozenset({"GET", "HEAD", "OPTIONS"})


def pide(url, metodo="GET", cabeceras=None, cuerpo=None, timeout=120,
         binario=False, intentos=4, aviso=None, reintentable=None):
    """
    Una peticion HTTP con reintentos SOLO en los fallos transitorios.

    ⚠️ POR DEFECTO NO SE REINTENTAN LAS ESCRITURAS. Un POST a esta clase de APIs
    LANZA UN RENDER QUE SE COBRA (grok /videos/generations, heygen /video/generate,
    elevenlabs /text-to-speech factura por caracteres). Un 503 no dice si el
    servidor llegó a procesarlo, así que reintentar puede pagar dos, tres o cuatro
    veces lo mismo. Fallar y que lo relance una persona es mucho más barato.
    `reintentable=True` fuerza el reintento para un POST que SÍ sepas idempotente.

    Devuelve `(datos, cabeceras)`: bytes si `binario`, si no el JSON parseado.
    Las cabeceras se devuelven como el objeto de urllib, NO como dict: su `.get()`
    es insensible a mayusculas, y los servidores mandan `Retry-After`,
    `retry-after` o `X-Character-Count` indistintamente.

    Lanza `ErrorHTTP` en los fallos definitivos, para que cada script escriba su
    propio mensaje segun el codigo.
    """
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
    seguro = reintentable if reintentable is not None else (metodo.upper() in METODOS_IDEMPOTENTES)
    maximo = intentos if seguro else 1
    ultimo, cab = None, None
    for intento in range(maximo):
        req = urllib.request.Request(url, data=datos, method=metodo)
        req.add_header("User-Agent", AGENTE)
        for k, v in (cabeceras or {}).items():
            req.add_header(k, v)
        if datos is not None:
            req.add_header("Content-Type", "application/json")
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                bruto = r.read()
                return (bruto if binario else json.loads(bruto.decode())), r.headers
        except urllib.error.HTTPError as e:
            # Leer el cuerpo del error puede fallar (conexion cortada). Si pasa,
            # el codigo HTTP sigue siendo la informacion util: no la perdamos
            # detras de un traceback de socket que no dice nada.
            try:
                cuerpo_err = e.read().decode(errors="replace")
            except OSError as lectura:
                cuerpo_err = f"(no se pudo leer el cuerpo del error: {lectura})"
            if e.code not in CODIGOS_TRANSITORIOS or intento == maximo - 1:
                raise ErrorHTTP(e.code, cuerpo_err, e.headers) from None
            ultimo, cab = f"HTTP {e.code}", e.headers
        except (urllib.error.URLError, TimeoutError, OSError) as e:
            if intento == maximo - 1:
                raise ErrorHTTP(0, f"error de red: {e}") from None
            ultimo, cab = f"red ({e})", None
        s = _espera(intento, cab)
        (aviso or (lambda m: print(m, file=sys.stderr)))(
            f"   ⚠ {ultimo} — reintento {intento + 1}/{maximo - 1} en {s:.0f}s"
        )
        time.sleep(s)
    raise ErrorHTTP(0, "agotados los reintentos")  # pragma: no cover


def escribe_atomico(destino, datos):
    """
    Escribe bytes con temporal + rename: o esta entero o no esta.
    Sin esto, un Ctrl-C a mitad deja un archivo corto que parece valido.
    """
    destino = os.path.abspath(destino)
    os.makedirs(os.path.dirname(destino) or ".", exist_ok=True)
    tmp = destino + ".parcial"
    with open(tmp, "wb") as f:
        f.write(datos)
    os.replace(tmp, destino)
    return len(datos)


def descarga(url, destino, timeout=300, cabeceras=None):
    """
    Descarga a disco de forma atomica y con timeout (a diferencia de
    `urlretrieve`, que no acepta ninguno). Si el servidor declara Content-Length
    y lo recibido no cuadra, falla en vez de dejar un archivo a medias.

    Manda `User-Agent` (ver `AGENTE`): los CDN detras de Cloudflare rechazan con
    403 al cliente que no se identifica, y aqui eso salia como «no se pudo bajar»
    en bucle sobre veinte archivos seguidos.
    """
    destino = os.path.abspath(destino)
    os.makedirs(os.path.dirname(destino) or ".", exist_ok=True)
    tmp = destino + ".parcial"
    req = urllib.request.Request(url, headers={"User-Agent": AGENTE, **(cabeceras or {})})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            declarado = r.headers.get("Content-Length")
            escrito = 0
            with open(tmp, "wb") as f:
                while True:
                    trozo = r.read(1 << 16)
                    if not trozo:
                        break
                    f.write(trozo)
                    escrito += len(trozo)
        if declarado and int(declarado) != escrito:
            raise IOError(f"descarga incompleta: {escrito} de {declarado} bytes")
        os.replace(tmp, destino)
        return escrito
    except BaseException:
        if os.path.exists(tmp):
            os.remove(tmp)
        raise


# ── La maquina: binarios, rutas y la salida de lo que se genera ──────────────
#
# Espejo de `herramientas/comun.mjs`: mismas carpetas, mismas reglas, para que
# lo que instala setup.mjs lo encuentren igual los scripts de Node y los de
# Python sin que el usuario toque su PATH ni tenga administrador.

ES_WINDOWS = sys.platform == "win32"
ES_MAC = sys.platform == "darwin"


def posix(ruta):
    """Una ruta con barras «/»: es como se guarda y se enseña, y vale en PowerShell, cmd y bash."""
    return str(ruta).replace("\\", "/")


def desde_raiz(*segmentos):
    """Ruta absoluta LOCAL bajo la raiz del repo. Los segmentos pueden traer «/» dentro."""
    partes = [p for s in segmentos for p in str(s).split("/") if p]
    return os.path.join(raiz_proyecto(), *partes)


def ruta_visible(ruta):
    """Como se enseña una ruta: relativa a la raiz y con «/» si esta dentro del repo; si no, absoluta."""
    ruta = os.path.abspath(ruta)
    try:
        rel = os.path.relpath(ruta, raiz_proyecto())
    except ValueError:  # Windows: otra unidad
        return posix(ruta)
    if rel == ".." or rel.startswith(".." + os.sep):
        return posix(ruta)
    return posix(rel)


def dir_bin_usuario():
    """
    Carpeta donde `herramientas/setup.mjs` deja los binarios del usuario, sin
    administrador. La misma que `dirBinUsuario()` de comun.mjs: en macOS/Linux
    ~/.local/bin (la de uv); en Windows %LOCALAPPDATA%\\video-creator\\bin.
    """
    if ES_WINDOWS:
        base = os.environ.get("LOCALAPPDATA") or os.path.join(os.path.expanduser("~"), "AppData", "Local")
        return os.path.join(base, "video-creator", "bin")
    return os.path.join(os.path.expanduser("~"), ".local", "bin")


def binario(nombre):
    """
    Ruta absoluta del ejecutable `nombre`, o None si no esta. Es una consulta:
    no lanza nada.

    Primero la carpeta de herramientas del usuario (la que llena setup.mjs) y
    despues el PATH. En Windows, `shutil.which` ya prueba las extensiones de
    PATHEXT (.exe, .cmd, .bat…), asi que se pide por el nombre a secas.
    """
    return shutil.which(nombre, path=dir_bin_usuario()) or shutil.which(nombre)


def pista_instalacion(nombre):
    """Como conseguir `nombre` en ESTA plataforma, para el mensaje de error."""
    if nombre in ("ffmpeg", "ffprobe"):
        a_mano = (
            "brew install ffmpeg" if ES_MAC
            else "winget install -e --id Gyan.FFmpeg" if ES_WINDOWS
            else "apt install ffmpeg (o el gestor de tu distribucion)"
        )
        return f"node herramientas/setup.mjs lo instala sin administrador (o a mano: {a_mano})"
    return "node herramientas/setup.mjs"


def herramienta(nombre):
    """`binario(nombre)`, o salir con un mensaje que dice como instalarlo."""
    ruta = binario(nombre)
    if not ruta:
        sys.exit(
            f"ERROR: no encuentro «{nombre}» ni en {posix(dir_bin_usuario())} ni en el PATH.\n"
            f"  {pista_instalacion(nombre)}"
        )
    return ruta


def numero_proyecto(nnn):
    """NNN de proyecto: exactamente tres digitos, como `numeroProyecto` de comun.mjs."""
    if not re.fullmatch(r"\d{3}", str(nnn or "")):
        sys.exit(f"ERROR: el numero de proyecto debe tener tres digitos (p. ej. 004), no «{nnn}»")
    return str(nnn)


def resuelve_salida(salida, proyecto, dentro_del_proyecto, forzar=False):
    """
    Donde se guarda lo que se genera. `--salida` manda; si no, se deriva de
    `--proyecto NNN` (proyectos/NNN/<dentro_del_proyecto>); sin ninguna de las
    dos, se para. Y NO se pisa un archivo que ya existe sin `--forzar`.

    Antes la salida por defecto era proyectos/001/…: todos los proyectos iban a
    parar al mismo archivo, y un render de pago sobrescribia al anterior sin
    avisar. Esto se comprueba ANTES de pedir el render, no despues de pagarlo.
    """
    if salida:
        ruta = os.path.abspath(salida)
    elif proyecto:
        ruta = desde_raiz("proyectos", numero_proyecto(proyecto), dentro_del_proyecto)
    else:
        sys.exit(
            "ERROR: di donde guardar: --salida <ruta> o --proyecto NNN"
            f" (guarda en proyectos/NNN/{dentro_del_proyecto})"
        )
    if os.path.exists(ruta) and not forzar:
        sys.exit(f"ERROR: ya existe {ruta_visible(ruta)}. Elige otra --salida o pasa --forzar para sobrescribirlo.")
    return ruta
