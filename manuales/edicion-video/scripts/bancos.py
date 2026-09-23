#!/usr/bin/env python3
"""
bancos.py — B-roll de BANCOS GRATUITOS (Pexels), buscado y traido desde el guion.

Subcomandos:
  buscar     Consulta y ENSENA los candidatos con su licencia y su medida. No baja nada.
  traer      Elige uno, lo descarga y anota el credito en el manifiesto del proyecto.
  contactos  Monta una hoja numerada con los candidatos, para elegir MIRANDO.
  reponer    Rehidrata remotion/public/ desde el manifiesto (el binario no se versiona).
  gradar     Mide los clips y calcula la correccion que los iguala entre si.
  creditos   Vuelca el bloque de atribucion, listo para la descripcion del video.
  glosario   Ensena el glosario ES->EN del nicho (y por que existe).

POR QUE EXISTE, frente a `grok.py`. Grok Imagine GENERA un plano que no existe;
esto TRAE uno que si existe. Para el formato `video-noticias` la diferencia no es
de coste sino de honestidad: un plano generado que representa un hecho real es
fabricar prueba documental (lo razona la skill `video-noticias`), y en una
pieza periodistica eso no se hace. Un lugar real, un objeto real y un gesto real
se traen; lo que no tiene referente se resuelve con motion graphics.

LA REGLA QUE MANDA EN ESTE ARCHIVO: se descarga en el MISMO paso en que se
elige, y la eleccion se CONGELA en el manifiesto. Las URLs de los bancos son
temporales y sus catalogos cambian (en un ano cerraron Reshot y cambiaron de
dueno Videvo y Mazwai), asi que un proyecto que dependa de volver a consultar no
se puede re-renderizar dentro de un ano. Es el contrato §3h de director-video
llevado a su conclusion: en disco el archivo, en git el manifiesto.

EL IDIOMA DE LA CONSULTA NO ES UN DETALLE. Medido contra el indice real: el
espanol pierde entre x3 y x22 en numero de candidatos para la misma intencion, y
rompe la semantica de los terminos juridicos ("escritura publica" devuelve gente
escribiendo a mano; "grieta" se diluye con lagos helados). Los toponimos son la
excepcion y hay que explotarlos: "bogota" y "medellin" SI devuelven Colombia
real. De ahi el glosario: conceptos en ingles, lugares en espanol.

Y OJO CON LO QUE ESTE SCRIPT NO PUEDE SABER: Pexels NUNCA devuelve cero. La
consulta sin sentido `xqzptlfrbwn` devuelve 3.600 videos, la misma banda que
`vivienda`. Un `if resultados` es un test que siempre pasa, asi que aqui se
ensenan los candidatos con su descripcion y decide una persona (o, mas adelante,
la capa de puntuacion). Esto trae material; no jura que sea el correcto.

Doc: manuales/edicion-video/SKILL.md · formato: manuales/video-noticias/SKILL.md
"""
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
import argparse
import hashlib
import json
import os
import posixpath
import re
import shutil
import subprocess
import sys
import time

from _comun import (
    ErrorHTTP, binario, cargar_env, descarga, desde_raiz, escribe_atomico, pide,
    pista_instalacion, posix, raiz_proyecto, ruta_visible,
)

# LAS RUTAS DEL MANIFIESTO SON LOGICAS, NO DEL SISTEMA DE ARCHIVOS. `archivo` y
# `servido` se guardan, se imprimen para pegarlas en el plan y las comparan
# como cadenas staticFile() de Remotion y revisar-broll.mjs. Van SIEMPRE con
# «/» (posixpath); os.path solo se usa para abrir el archivo en esta maquina
# (`desde_raiz`). Con os.path.join, un manifiesto escrito en Windows llevaba
# «broll\\006\\…», que Remotion no sirve, y un `reponer` posterior en un Mac
# creaba un archivo con barras invertidas en el nombre.

BASE = "https://api.pexels.com"
LICENCIA = {"nombre": "Pexels License", "url": "https://www.pexels.com/license/"}

# El User-Agent lo pone `_comun` en TODAS las peticiones y descargas: sin el,
# Cloudflare devuelve 403 (`error code: 1010`) antes de que la peticion llegue a
# Pexels — y el mensaje te manda a rotar una clave que esta perfecta.

ENV = cargar_env("PEXELS_")

# Caducidad de la cache de busquedas. Pexels no lo exige (Pixabay si, cuando se
# anada), pero el limite por defecto son 200 peticiones/hora y una sesion de
# maquetado repite la misma consulta muchas veces.
CACHE_SEGUNDOS = 24 * 3600


def api_key():
    k = ENV.get("PEXELS_API_KEY", "").strip()
    if not k:
        sys.exit(
            "ERROR: falta PEXELS_API_KEY.\n"
            "  1) node herramientas/setup.mjs crea el .env (o copia .env.example como .env)\n"
            "  2) pega tu clave de https://www.pexels.com/api/\n"
            "  o en la terminal:  export PEXELS_API_KEY=...   (macOS/Linux)\n"
            '                     $env:PEXELS_API_KEY="..."   (PowerShell)\n'
            "  Es gratis y se saca al instante con una cuenta de Pexels."
        )
    return k


# ── El glosario ──────────────────────────────────────────────────────────────
#
# No se deja la traduccion al modelo por una razon medida: los terminos
# juridicos y locales colombianos NO estan en el indice, ni en espanol ni
# traducidos palabra a palabra. `notaria` devuelve notarias parisinas; `avaluo`
# devuelve aereas de barrios; `apartaestudio` devuelve cero en Pixabay. Lo que si
# funciona es nombrar el ACTO o el OBJETO fisico en ingles: no "escritura
# publica" sino "manos firmando una escritura".
#
# Se amplia a mano y a proposito: cada linea es una traduccion que alguien ha
# comprobado que devuelve lo que dice, no una equivalencia de diccionario.
GLOSARIO = {
    "escritura publica": "notary signing deed document",
    "escritura": "signing property deed",
    "notaria": "notary office desk stamp",
    "notario": "notary stamping document",
    "avaluo": "home appraisal inspection",
    "avaluo catastral": "surveyor measuring property",
    "apartaestudio": "studio apartment interior",
    "estrato": "residential neighborhood aerial",
    "vis": "social housing complex",
    "vivienda de interes social": "social housing complex",
    "promesa de compraventa": "signing purchase contract",
    "compraventa": "handing over house keys",
    "hipoteca": "bank building loan documents",
    "credito hipotecario": "calculator mortgage documents",
    "arriendo": "for rent sign window",
    "arrendamiento": "rental agreement signing",
    "canon": "counting money on table",
    "administracion": "apartment building lobby",
    "predial": "property tax paperwork",
    "impuesto": "tax form calculator",
    "licencia de construccion": "construction blueprint permit",
    "obra": "construction site workers",
    "obra gris": "concrete building under construction",
    "acabados": "installing floor tiles closeup",
    "grieta": "cracked concrete wall closeup",
    "fisura": "hairline crack plaster wall",
    "humedad": "damp stain wall closeup",
    "sismo": "cracked building facade",
    "terremoto": "damaged building structure",
    "valorizacion": "city skyline construction cranes",
    "constructora": "construction site crane",
    "corredor": "real estate agent showing house",
    "inmobiliaria": "real estate office keys",
    "llaves": "handing over house keys closeup",
    "planos": "architectural blueprints table",
    "mudanza": "moving boxes empty apartment",
    "desalojo": "empty apartment door",
    "portateria": "building entrance intercom",
    "ascensor": "elevator doors building",
    "parqueadero": "underground parking garage",
    "zona comun": "apartment building rooftop pool",
}

# Los toponimos NO se traducen: son lo unico que trae Colombia de verdad al
# encuadre. Medido: `bogota` devuelve Transmilenio y los Cerros Orientales;
# `medellin`, la Comuna 13 y el Metrocable.
TOPONIMOS = {
    "bogota", "medellin", "cali", "cartagena", "barranquilla", "bucaramanga",
    "pereira", "manizales", "santa marta", "cucuta", "villavicencio", "armenia",
    "colombia", "antioquia", "rionegro", "envigado", "sabaneta", "itagui",
}

# El punto de vista es la defensa mas barata contra el stock corporativo, y los
# bancos lo indexan de verdad: `apartment building facade low angle` devuelve
# literalmente planos contrapicados.
POV = ("aerial", "drone", "close-up", "macro", "low angle", "top-down", "handheld", "timelapse", "slow motion")

# Consultas que devuelven el mismo stock que usa todo el mundo. Si aparecen, se
# avisa: no es un error, es que el plano va a parecerse a otros mil videos.
CLICHES = (
    "business meeting", "handshake", "team brainstorming", "person typing laptop",
    "businessman suit", "city timelapse", "abstract technology background",
    "financial chart screen", "happy family sofa", "thumbs up",
)

# ── Las medidas del hueco ────────────────────────────────────────────────────
#
# Salen del MOTOR, no de una preferencia, y son LAS MISMAS que mide
# `manuales/video-noticias/scripts/revisar-broll.mjs`: si cambian aqui, cambian
# alli. Dos fuentes de verdad sobre la misma medida es como se consigue que un
# asset lo acepte un script y lo rechace el otro.
#
#   escenario -> `sangre: true`: el cuadro entero (dialecto.ts, case "escenario").
#   retrato   -> TarjetaFoto de 640x820 menos 8 px de borde por lado
#                (LAYOUT.borde) = 624x804, con un Ken Burns de 1 -> 1.06
#                (Editorial.tsx): en el frame mas ampliado hace falta ese 6 %
#                extra para seguir teniendo un pixel de fuente por pixel dibujado.
#
# Es el minimo para NO reescalar hacia arriba, no un ideal. Con `objectFit:
# cover` sobre una caja de 624 px de ancho, un vertical de 1080 usa sus 1080 px
# para pintar 624 y va sobrado; exigir mas rechazaria material 1080x1920, que es
# el estandar del 9:16.
HUECOS = {
    "escenario": {"ancho": 1080, "alto": 1920, "orientacion": "portrait", "que": "a sangre, el cuadro entero"},
    "retrato": {"ancho": 662, "alto": 853, "orientacion": "portrait", "que": "enmarcado 624x804 + Ken Burns 1.06"},
}


# Palabras que no aportan nada a una busqueda lexica y solo gastan longitud.
VACIAS = frozenset(
    "de del la el los las un una unos unas en al por para con y o que su sus "
    "este esta ese esa lo a sobre entre desde hasta como".split()
)


def normaliza(consulta):
    """
    Consulta -> consulta que el banco entiende. Devuelve `(texto, notas)`.

    LA PARTE QUE NO ES OBVIA: traducir el termino y dejar el resto en espanol es
    PEOR que no traducir. "grieta en la pared" daba "cracked concrete wall
    closeup en la pared" — siete palabras, tres de ellas ruido en un indice
    ingles, y la busqueda es lexica: cada palabra que no casa diluye el
    resultado. Asi que en cuanto el glosario acierta, lo que sobra se DESCARTA y
    se dice cual (para anadirlo al glosario, que es donde se arregla de verdad).

    Si el glosario no acierta en nada, se deja la consulta entera: descartar
    palabras ahi dejaria la busqueda vacia. Se avisa de que van literales.

    Los toponimos nunca se traducen ni se descartan: son lo unico que trae
    Colombia real al encuadre.
    """
    notas = []
    texto = " ".join(consulta.lower().split())
    sin_tildes = texto.translate(str.maketrans("áéíóúñü", "aeiouny"))

    # Las expresiones largas primero, para que "escritura publica" no la pise
    # "escritura". Lo ya traducido viaja en tupla para no volver a tocarlo.
    piezas = [sin_tildes]
    for termino in sorted(GLOSARIO, key=len, reverse=True):
        nuevas = []
        for p in piezas:
            if isinstance(p, tuple) or termino not in p:
                nuevas.append(p)
                continue
            for i, trozo in enumerate(p.split(termino)):
                if i:
                    nuevas.append((GLOSARIO[termino],))
                if trozo.strip():
                    nuevas.append(trozo)
            notas.append(f'"{termino}" -> "{GLOSARIO[termino]}"')
        piezas = nuevas

    hubo_traduccion = any(isinstance(p, tuple) for p in piezas)
    salida, sueltas = [], []
    for p in piezas:
        if isinstance(p, tuple):
            salida.append(p[0])
            continue
        for palabra in p.split():
            if palabra in VACIAS:
                continue
            if palabra in TOPONIMOS:
                salida.append(palabra)
                notas.append(f'toponimo "{palabra}" conservado')
            elif hubo_traduccion:
                sueltas.append(palabra)
            else:
                salida.append(palabra)
                sueltas.append(palabra)

    if sueltas:
        que = "descartadas" if hubo_traduccion else "van literales"
        notas.append(f"sin traducir ({que}): {', '.join(sueltas)} — si son espanolas, al glosario")
    return " ".join(" ".join(salida).split()), notas


def avisos_de_consulta(consulta):
    """Lo que no impide buscar pero conviene saber ANTES de gastar la peticion."""
    av = []
    bajo = consulta.lower()
    for c in CLICHES:
        if c in bajo:
            av.append(f'"{c}" es stock generico: miles de videos usan ese mismo plano')
    if not any(p in bajo for p in POV):
        av.append(f"sin punto de vista ({', '.join(POV[:4])}…): los bancos lo indexan y afina mucho")
    if len(bajo.split()) > 5:
        av.append("mas de 5 palabras: la busqueda es lexica, no semantica — se diluye")
    if re.search(r"\d", bajo):
        av.append("lleva cifras: ninguna foto de archivo ensena tu dato, eso es un grafico")
    return av


# ── La API ───────────────────────────────────────────────────────────────────


def ruta_cache(proyecto, firma):
    return os.path.join(raiz_proyecto(), "proyectos", proyecto, "broll", "cache", firma + ".json")


def consulta_api(ruta, params, proyecto, usar_cache=True):
    """
    Una llamada a Pexels, con cache en disco. Devuelve el JSON.

    La cache no es solo por cortesia: el limite por defecto son 200 peticiones a
    la hora, y maquetar una pieza repite la misma busqueda muchas veces.
    """
    query = "&".join(f"{k}={_quote(str(v))}" for k, v in params.items() if v is not None)
    url = f"{BASE}{ruta}?{query}"
    firma = hashlib.sha256(url.encode()).hexdigest()[:16]
    cache = ruta_cache(proyecto, firma)
    if usar_cache and os.path.isfile(cache) and time.time() - os.path.getmtime(cache) < CACHE_SEGUNDOS:
        with open(cache, encoding="utf-8") as f:
            return json.load(f)
    try:
        datos, cabeceras = pide(
            url, cabeceras={"Authorization": api_key(), "Accept": "application/json"}, timeout=60
        )
    except ErrorHTTP as e:
        if e.codigo == 401:
            sys.exit("ERROR 401: la PEXELS_API_KEY no vale. Sacala en https://www.pexels.com/api/")
        if e.codigo == 403:
            # 1010 es Cloudflare, no Pexels: bloqueo por firma del cliente. La
            # clave no tiene nada que ver, y decirlo evita rotar una que va bien.
            pista = (
                "  Es Cloudflare bloqueando al cliente (no tu clave): comprueba que las\n"
                "  peticiones llevan User-Agent.\n"
                if "1010" in e.cuerpo
                else "  Puede ser una clave sin permisos o una cuenta suspendida.\n"
            )
            sys.exit(f"ERROR 403: {e.cuerpo[:120]}\n{pista}")
        if e.codigo == 429:
            sys.exit(
                "ERROR 429: se agoto el limite (200 peticiones/hora, 20.000/mes).\n"
                "  Espera a que reponga, o pide limite ampliado en https://www.pexels.com/api/\n"
                "  (lo dan gratis si acreditas a Pexels de forma visible)."
            )
        raise
    restantes = cabeceras.get("X-Ratelimit-Remaining")
    if restantes is not None and int(restantes) < 20:
        print(f"   ⚠ quedan {restantes} peticiones de la hora")
    escribe_atomico(cache, json.dumps(datos, ensure_ascii=False).encode("utf-8"))
    return datos


def _quote(s):
    from urllib.parse import quote

    return quote(s, safe="")


def candidatos(consulta, tipo, hueco, proyecto, n=80, usar_cache=True):
    """
    Los candidatos ya NORMALIZADOS a una forma comun, vengan de fotos o de video.

    `per_page` va al maximo (80) a proposito: el filtro por medida se come la
    mayor parte de los resultados en 9:16, y el pool grande es la unica defensa
    real contra quedarse con el primer plano generico que aparezca.
    """
    ruta = "/v1/videos/search" if tipo == "video" else "/v1/search"
    datos = consulta_api(
        ruta,
        {"query": consulta, "orientation": hueco["orientacion"], "per_page": min(n, 80), "page": 1},
        proyecto,
        usar_cache,
    )
    salida = []
    if tipo == "video":
        for v in datos.get("videos", []):
            # El fichero mas pequeno que CUMPLE el minimo: bajarse el 4K de un
            # plano que se monta a 1080 son 80 MB para tirar el 75 % de los
            # pixeles, y Remotion decodifica cada frame en el render.
            files = sorted(
                (f for f in v.get("video_files", []) if f.get("width") and f.get("height")),
                key=lambda f: f["width"] * f["height"],
            )
            sirve = [f for f in files if f["width"] >= hueco["ancho"] and f["height"] >= hueco["alto"]]
            elegido = sirve[0] if sirve else (files[-1] if files else None)
            if not elegido:
                continue
            # Las renditions MAYORES que la elegida, de menor a mayor. Son el
            # plan B de `traer` cuando el archivo servido no mide lo que dice
            # el banco (ver `medida_real`).
            mayores = [f for f in sirve if f is not elegido]
            salida.append({
                "id": v["id"],
                "tipo": "video",
                "ancho": elegido["width"],
                "alto": elegido["height"],
                "duracion": v.get("duration"),
                "fps": elegido.get("fps"),
                "autor": (v.get("user") or {}).get("name", ""),
                "autor_url": (v.get("user") or {}).get("url", ""),
                "origen_url": v.get("url", ""),
                "descarga_url": elegido["link"],
                "alternativas": [{"link": f["link"], "ancho": f["width"], "alto": f["height"]} for f in mayores],
                # El fotograma de portada. Es lo que se juzga en la hoja de
                # contactos: bajar 15 clips para mirarlos son cientos de MB.
                "mini": v.get("image", ""),
                "descripcion": "",
                "extension": ".mp4",
            })
    else:
        for p in datos.get("photos", []):
            salida.append({
                "id": p["id"],
                "tipo": "foto",
                "ancho": p["width"],
                "alto": p["height"],
                "duracion": None,
                "fps": None,
                "autor": p.get("photographer", ""),
                "autor_url": p.get("photographer_url", ""),
                "origen_url": p.get("url", ""),
                "descarga_url": (p.get("src") or {}).get("original", ""),
                "mini": (p.get("src") or {}).get("medium", "") or (p.get("src") or {}).get("small", ""),
                "descripcion": p.get("alt", "") or "",
                "extension": ".jpg",
            })
    return salida


def filtra(cands, hueco, dur_min):
    """
    Descarta por MEDIDA y por DURACION antes de bajar un solo byte, y devuelve
    tambien los descartes con su motivo: cuando una toma sale mal, saber si fallo
    el filtro o la consulta es la mitad del diagnostico.
    """
    vivos, fuera = [], []
    for c in cands:
        if c["ancho"] < hueco["ancho"] or c["alto"] < hueco["alto"]:
            fuera.append({**c, "motivo": f"{c['ancho']}x{c['alto']} < {hueco['ancho']}x{hueco['alto']}"})
            continue
        if c["tipo"] == "video" and dur_min and (c["duracion"] or 0) < dur_min:
            fuera.append({**c, "motivo": f"dura {c['duracion']}s < {dur_min}s"})
            continue
        vivos.append(c)
    # Orden TOTAL y estable: el ranking del banco cambia entre llamadas, asi que
    # sin el desempate por id dos ejecuciones del mismo comando podrian traer
    # cosas distintas. Lo que decide es el area (mas pixeles, mas margen para el
    # recorte a 9:16) y, a igualdad, el id.
    vivos.sort(key=lambda c: (-(c["ancho"] * c["alto"]), c["id"]))
    return vivos, fuera


# ── El manifiesto ────────────────────────────────────────────────────────────
#
# Es la pieza que se versiona, y es lo que hace re-renderizable el proyecto
# dentro de un ano: guarda QUE se eligio, DE DONDE salio, QUIEN lo hizo y BAJO
# QUE licencia, mas el sha256 de lo que hay en disco. El binario no entra en git
# (`reponer` lo vuelve a bajar).


def ruta_manifiesto(proyecto):
    return os.path.join(raiz_proyecto(), "proyectos", proyecto, "broll", "manifiesto.json")


def lee_manifiesto(proyecto):
    ruta = ruta_manifiesto(proyecto)
    if not os.path.isfile(ruta):
        return {"proyecto": proyecto, "banco": "pexels", "assets": {}}
    with open(ruta, encoding="utf-8-sig") as f:
        m = json.load(f)
    # Un manifiesto escrito en Windows por una version anterior traia las rutas
    # logicas con «\»: se normalizan al leer. En un manifiesto correcto (todos
    # los del estudio) esto no cambia ni un byte.
    for a in m.get("assets", {}).values():
        for clave in ("archivo", "servido"):
            if isinstance(a.get(clave), str):
                a[clave] = posix(a[clave])
    return m


def guarda_manifiesto(proyecto, m):
    m["assets"] = dict(sorted(m["assets"].items()))
    escribe_atomico(ruta_manifiesto(proyecto), (json.dumps(m, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))


def huella(consulta, tipo, hueco, indice):
    """
    Firma de lo que determina la ELECCION. Si no cambia, lo que ya esta en disco
    sirve y no se vuelve a consultar: es lo que hace que re-correr el comando no
    traiga otro plano y mueva el video por debajo.
    """
    firma = {"consulta": consulta, "tipo": tipo, "hueco": hueco, "indice": indice}
    return hashlib.sha256(json.dumps(firma, sort_keys=True).encode()).hexdigest()


def sha256_de(ruta):
    h = hashlib.sha256()
    with open(ruta, "rb") as f:
        for trozo in iter(lambda: f.read(1 << 20), b""):
            h.update(trozo)
    return h.hexdigest()


def slug(texto):
    t = texto.lower().translate(str.maketrans("áéíóúñü", "aeiouny"))
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", t)).strip("-")[:40] or "toma"


def medida_real(ruta):
    """
    `(ancho, alto)` del vídeo TAL COMO ESTÁ EN DISCO, o `None` si no se puede medir.

    POR QUÉ EXISTE: el banco puede mentir en la medida, y no en los metadatos de
    la API sino en el propio archivo. Medido en una pieza real (dos veces seguidas, dos
    autores distintos): la URL `…-hd_1080_2048_25fps.mp4` que la API declara de
    1080x2048 sirve un archivo de 720x1366. El filtro de `filtra()` se fía de la
    API, así que un plano que no llega al hueco pasaba entero y salía estirado
    ×1,5 a sangre, sin ningún error. Solo lo cazaba `revisar-broll.mjs`, y solo
    en el formato de noticias.
    """
    ffprobe = binario("ffprobe")
    if not ffprobe:
        return None
    r = subprocess.run(
        [ffprobe, "-v", "error", "-select_streams", "v:0",
         "-show_entries", "stream=width,height", "-of", "csv=p=0", ruta],
        capture_output=True, text=True,
    )
    try:
        ancho, alto = (int(x) for x in r.stdout.strip().split(",")[:2])
    except ValueError:
        return None
    return ancho, alto


def sin_audio(ruta):
    """
    Quita la pista de audio de un clip, copiando el video sin recodificar.

    No es limpieza: es el unico riesgo de Content ID documentado en estos bancos.
    El catalogo de VIDEO no esta registrado, pero la musica que llevan dentro
    muchos clips SI la registran sus autores, y una reclamacion sobre una pieza
    ya publicada se pelea con el reclamante como juez. El b-roll de este formato
    va bajo voz en off: su audio no se usa para nada.
    """
    ffmpeg = binario("ffmpeg")
    if not ffmpeg:
        print(f"   ⚠ sin ffmpeg: el clip conserva su audio (riesgo de Content ID). {pista_instalacion('ffmpeg')}")
        return
    tmp = ruta + ".mudo.mp4"
    r = subprocess.run(
        [ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", ruta, "-c", "copy", "-an", tmp],
        capture_output=True,
    )
    if r.returncode == 0 and os.path.getsize(tmp) > 0:
        os.replace(tmp, ruta)
        print("   · audio quitado (Content ID)")
    else:
        if os.path.exists(tmp):
            os.remove(tmp)
        print(f"   ⚠ no se pudo quitar el audio: {r.stderr.decode(errors='replace')[:160]}")


# ── La criba: pixeles, no modelos ────────────────────────────────────────────
#
# QUE HACE ESTA CAPA Y QUE NO. El filtro de medida deja 10-20 candidatos, y de
# esos hay que elegir UNO. La pregunta «¿esta imagen ilustra esta frase?» no la
# contesta ninguna estadistica de pixeles: la contesta alguien mirando. Asi que
# aqui NO se decide — aqui se quitan de en medio los que no merecen ni mirarse
# (el plano repetido, el lavado) y se monta una HOJA DE CONTACTOS para que el
# juicio lo haga quien puede hacerlo.
#
# POR QUE NO HAY UN MODELO AQUI. Se evaluo meter CLIP para reordenar por
# afinidad texto-imagen. Se descarto por tres razones, en este orden: (1) son
# ~2,5 GB de torch mas 800 MB de pesos en un sistema cuyos scripts son stdlib a
# proposito; (2) su trabajo real es bajar 60 candidatos a 12, y en 9:16 el filtro
# de medida ya deja esa cantidad; (3) el coseno de CLIP no tiene umbral absoluto
# transferible, asi que habria que calibrarlo con material propio para que
# dijera algo — y mientras tanto daria una cifra que parece objetiva y no lo es.
# Mirar nueve miniaturas cuesta segundos y no se equivoca en lo que importa.


def _gris(archivo, ancho, alto):
    """Los pixeles en gris de una miniatura, via ffmpeg. `None` si no se puede."""
    ffmpeg = binario("ffmpeg")
    if not ffmpeg:
        return None
    r = subprocess.run(
        [ffmpeg, "-hide_banner", "-loglevel", "error", "-i", archivo,
         "-vf", f"scale={ancho}:{alto},format=gray", "-frames:v", "1", "-f", "rawvideo", "-"],
        capture_output=True,
    )
    return r.stdout if len(r.stdout) == ancho * alto else None


def dhash(archivo):
    """
    Huella perceptual de 128 bits: gradiente HORIZONTAL (9x8) mas VERTICAL (8x9).

    Existe para NO REPETIR PLANO, y comparar ids no vale: el mismo encuadre esta
    subido a los bancos muchas veces con ids distintos, y dos tomas de la misma
    pieza con la misma foto se leen como un error de montaje, no como un estilo.

    LOS DOS EJES, y no solo el horizontal como es habitual, porque un dHash de un
    solo eje es CIEGO a las imagenes cuya estructura va en el otro: tres franjas
    horizontales dan cero diferencia horizontal, o sea un hash de todo ceros — y
    entonces dos planos que no se parecen en nada colisionan y el dedupe se lleva
    por delante material bueno EN SILENCIO, que es el peor modo de fallo posible
    para esta capa. Medido con material de prueba: `rgbtestsrc` (contraste 37,
    imagen perfectamente estructurada) y un gris liso daban distancia 0.
    """
    h = _gris(archivo, 9, 8)
    v = _gris(archivo, 8, 9)
    if h is None or v is None:
        return None
    # UNA IMAGEN PLANA ES PLANA AUNQUE EL DESCODIFICADOR NO LO SEA. Un gris liso
    # sale de una build de ffmpeg con filas a 166 y filas a 165 (ruido de +-1 del
    # JPEG), y el gradiente estricto de abajo lo leia como tres franjas: 24 bits,
    # o sea "estructura", y el dedupe dejaba de protegerlo. Medido en un Windows
    # real con ffmpeg 9.0.2 (en este Mac el mismo gris sale exacto). Si toda la
    # miniatura cabe en dos niveles de gris, es el hash canonico de ceros: los
    # hashes de las fotos de verdad no cambian (una foto nunca cabe en dos niveles).
    todo = bytes(h) + bytes(v)
    if max(todo) - min(todo) <= 2:
        return "0" * 32
    bits = 0
    for fila in range(8):
        base = fila * 9
        for col in range(8):
            bits = (bits << 1) | (1 if h[base + col] > h[base + col + 1] else 0)
    for fila in range(8):
        for col in range(8):
            bits = (bits << 1) | (1 if v[fila * 8 + col] > v[(fila + 1) * 8 + col] else 0)
    return f"{bits:032x}"


def distancia(a, b):
    """Hamming entre dos dhash. Sobre 128 bits, ~64 es el azar."""
    return bin(int(a, 16) ^ int(b, 16)).count("1")


def sin_estructura(h):
    """
    Un hash degenerado (todo ceros o todo unos) no distingue nada: la imagen es
    plana en los dos ejes. Compararlo solo produce falsos duplicados, asi que en
    ese caso se prefiere NO deduplicar — repetir un plano se ve y se arregla;
    perder un candidato bueno no se ve.
    """
    n = bin(int(h, 16)).count("1") if h else 0
    return h is None or n <= 4 or n >= 124


# Umbral de casi-duplicado sobre 128 bits. Conservador a proposito: caza el mismo
# plano recomprimido o recortado y no se lleva por delante dos fotos distintas de
# la misma escena, que a veces SI se quieren (dos angulos del mismo portal).
IGUALES = 12

# Por debajo de esta desviacion tipica de luma, la imagen es plana: niebla,
# cielo liso, pared blanca. En un short que dura 1-4 s por toma, un plano sin
# estructura no se lee — y ademas es donde el titular blanco corre mas peligro.
CONTRASTE_MINIMO = 22


def stats(archivo):
    """Luma medio y contraste (desviacion tipica) de una miniatura 32x32."""
    px = _gris(archivo, 32, 32)
    if px is None:
        return None
    n = len(px)
    media = sum(px) / n
    return {"luma": media, "contraste": (sum((v - media) ** 2 for v in px) / n) ** 0.5}


# Digitos de siete segmentos, dibujados a mano sobre una rejilla de 5x9.
#
# POR QUE NO `drawtext`. Porque no se puede contar con el: el filtro solo existe
# si ffmpeg se compilo con libfreetype, y el de esta maquina no lo tiene (`No
# such filter: 'drawtext'`). Sin numero, la hoja obliga a contar casillas — y
# elegir «la cuarta» contando es exactamente como se acaba bajando el plano de
# al lado. Dibujarlos aqui son treinta lineas de stdlib y funciona en cualquier
# ffmpeg, que es lo que hace que el numero de la hoja SIEMPRE signifique algo.
SIETE_SEG = {
    "0": "abcdef", "1": "bc", "2": "abged", "3": "abgcd", "4": "fgbc",
    "5": "afgcd", "6": "afgedc", "7": "abc", "8": "abcdefg", "9": "abcdfg",
}
# Cada segmento, en la rejilla 5 (ancho) x 9 (alto) de un digito.
_TRAZOS = {
    "a": [(x, 0) for x in (1, 2, 3)],
    "b": [(4, y) for y in (1, 2, 3)],
    "c": [(4, y) for y in (5, 6, 7)],
    "d": [(x, 8) for x in (1, 2, 3)],
    "e": [(0, y) for y in (5, 6, 7)],
    "f": [(0, y) for y in (1, 2, 3)],
    "g": [(x, 4) for x in (1, 2, 3)],
}


def _chapa(numero, ruta, escala=6, margen=8):
    """Un PPM con el numero en blanco sobre una chapa negra."""
    digitos = str(numero)
    ancho = margen * 2 + (5 * len(digitos) + (len(digitos) - 1) * 2) * escala
    alto = margen * 2 + 9 * escala
    px = bytearray(b"\x14\x14\x14" * (ancho * alto))  # casi negro, no negro puro
    for d, digito in enumerate(digitos):
        ox = margen + d * 7 * escala
        for seg in SIETE_SEG.get(digito, ""):
            for gx, gy in _TRAZOS[seg]:
                for dy in range(escala):
                    for dx in range(escala):
                        x, y = ox + gx * escala + dx, margen + gy * escala + dy
                        i = (y * ancho + x) * 3
                        px[i:i + 3] = b"\xff\xff\xff"
    escribe_atomico(ruta, b"P6\n%d %d\n255\n" % (ancho, alto) + bytes(px))
    return ruta


def hoja_contactos(minis, salida, columnas=3):
    """
    Monta las miniaturas en una rejilla con su numero quemado encima.

    El numero NO es decorativo: es lo que hace que «la 4» signifique lo mismo
    para quien mira la hoja y para el comando que la trae. Sin el, elegir de una
    rejilla es contar cuadros y equivocarse.

    Celdas de 336 px: por debajo de 200 px un modelo de vision empieza a
    inventarse lo que ve, y a ojo tampoco se distingue un plano de otro.
    """
    ffmpeg = binario("ffmpeg")
    if not ffmpeg:
        return None
    tmp = os.path.join(os.path.dirname(salida), ".celdas")
    shutil.rmtree(tmp, ignore_errors=True)
    os.makedirs(tmp, exist_ok=True)
    for i, m in enumerate(minis):
        celda = os.path.join(tmp, f"celda-{i:02d}.png")
        chapa = _chapa(i, os.path.join(tmp, f"n-{i:02d}.ppm"))
        # `format=rgb24` NO sobra: sin el, el overlay deja unas celdas en rgba y
        # otras en rgb24 segun la entrada, y `tile` —que fija el formato con la
        # primera— compone una hoja practicamente vacia sin dar ningun error.
        subprocess.run(
            [ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", m, "-i", chapa,
             "-filter_complex",
             "[0:v]scale=336:336:force_original_aspect_ratio=increase,crop=336:336[c];"
             "[c][1:v]overlay=10:10,format=rgb24",
             "-frames:v", "1", celda],
            capture_output=True,
        )
    filas = max(1, (len(minis) + columnas - 1) // columnas)
    # LA REJILLA SE RELLENA HASTA COMPLETARSE, y no es cosmetica: `tile` emite un
    # frame cada filas*columnas entradas y, si la ultima rejilla queda a medias,
    # suelta ADEMAS un segundo frame con el remanente. El muxer escribe los dos
    # en el mismo archivo y gana el ultimo, asi que la hoja se quedaba con las
    # dos ultimas miniaturas y numeradas 3 y 4 — con el JSON diciendo que habia
    # cinco. Con la rejilla llena hay un solo frame y no hay ambiguedad.
    for i in range(len(minis), filas * columnas):
        subprocess.run(
            [ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi",
             "-i", "color=c=0x111111:s=336x336", "-vf", "format=rgb24", "-frames:v", "1",
             os.path.join(tmp, f"celda-{i:02d}.png")],
            capture_output=True,
        )
    r = subprocess.run(
        [ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-f", "image2",
         "-i", os.path.join(tmp, "celda-%02d.png"),
         "-vf", f"tile={columnas}x{filas}:margin=10:padding=10:color=0x111111",
         "-frames:v", "1", "-update", "1", salida],
        capture_output=True,
    )
    shutil.rmtree(tmp, ignore_errors=True)
    return salida if r.returncode == 0 and os.path.isfile(salida) else None


def dhashes_usados(m, salvo=None):
    """Las huellas de lo YA elegido en este proyecto, para no repetir plano."""
    return {t: a["dhash"] for t, a in m["assets"].items() if a.get("dhash") and t != salvo}


# ── Los subcomandos ──────────────────────────────────────────────────────────


def cmd_glosario(args):
    print("\nGlosario ES -> EN del nicho. Existe porque los terminos juridicos y")
    print("locales colombianos NO estan en el indice de los bancos, ni traducidos.\n")
    for k in sorted(GLOSARIO):
        print(f"  {k:28s} -> {GLOSARIO[k]}")
    print(f"\nToponimos que NO se traducen (son lo que trae Colombia real al plano):")
    print("  " + ", ".join(sorted(TOPONIMOS)))
    print(f"\nPuntos de vista que los bancos indexan: {', '.join(POV)}\n")


def cmd_buscar(args):
    hueco = HUECOS[args.para]
    consulta, notas = (args.consulta, []) if args.tal_cual else normaliza(args.consulta)
    print(f'\nConsulta: "{consulta}"   ({args.tipo} · {args.para}: {hueco["que"]})')
    for n in notas:
        print(f"   glosario: {n}")
    for a in avisos_de_consulta(consulta):
        print(f"   ⚠ {a}")
    cands = candidatos(consulta, args.tipo, hueco, args.proyecto, usar_cache=not args.sin_cache)
    vivos, fuera = filtra(cands, hueco, args.duracion_min)
    print(f"\n{len(cands)} candidato(s) · {len(vivos)} pasan el filtro de medida\n")
    for i, c in enumerate(vivos[: args.n]):
        dur = f" · {c['duracion']}s" if c["duracion"] else ""
        desc = f"  «{c['descripcion'][:60]}»" if c["descripcion"] else ""
        print(f"  [{i}] {c['ancho']}x{c['alto']}{dur} · {c['autor']}{desc}")
        print(f"      {c['origen_url']}")
    if fuera:
        print(f"\n  ({len(fuera)} descartados; el primero: {fuera[0]['motivo']})")
    if not vivos:
        print("  Ningun candidato cumple la medida. Prueba otra consulta o baja a --para retrato.")
        return
    # Una sola linea: PowerShell no entiende la continuacion con «\».
    print(
        f"\nSiguiente: uv run manuales/edicion-video/scripts/bancos.py traer"
        f' --proyecto {args.proyecto} --toma <id-de-la-toma> --consulta "{args.consulta}"'
        f" --para {args.para} --tipo {args.tipo} --indice 0"
    )
    print("\nOJO: Pexels NUNCA devuelve cero — una consulta sin sentido tambien trae")
    print("resultados. Mira las descripciones antes de elegir.\n")


def ruta_contactos(proyecto, toma):
    return os.path.join(raiz_proyecto(), "proyectos", proyecto, "broll", "contactos", f"{toma}.png")


def orden_de_contactos(proyecto, toma, consulta, tipo, para):
    """
    El orden que se vio en la hoja, si la hoja es de ESTA busqueda.

    Se compara la consulta entera y no solo la toma: cambiar la consulta y
    reutilizar la numeracion de la hoja anterior es como se baja un plano que
    nadie ha mirado.
    """
    ruta = os.path.splitext(ruta_contactos(proyecto, toma))[0] + ".json"
    if not os.path.isfile(ruta):
        return None
    try:
        with open(ruta, encoding="utf-8") as f:
            d = json.load(f)
    except (OSError, json.JSONDecodeError):
        return None
    if d.get("consulta") == consulta and d.get("tipo") == tipo and d.get("para") == para:
        return d.get("orden")
    return None


def cmd_contactos(args):
    """
    Monta la hoja de contactos de una toma: la criba barata y luego a mirar.

    Es el paso que falta entre «el banco devuelve algo» y «esto ilustra la
    frase». Pexels nunca dice que no, asi que sin este paso lo que se elige es
    lo que el banco puso primero, que es lo mismo que eligen los otros mil
    canales que buscaron lo mismo.
    """
    hueco = HUECOS[args.para]
    consulta, notas = (args.consulta, []) if args.tal_cual else normaliza(args.consulta)
    print(f'\n[{args.toma}] "{consulta}"   ({args.tipo} · {args.para})')
    for n in notas:
        print(f"   glosario: {n}")
    for a in avisos_de_consulta(consulta):
        print(f"   ⚠ {a}")

    cands = candidatos(consulta, args.tipo, hueco, args.proyecto, usar_cache=not args.sin_cache)
    vivos, fuera = filtra(cands, hueco, args.duracion_min)
    if not vivos:
        sys.exit(f"ERROR: ninguno de los {len(cands)} candidatos cumple {hueco['ancho']}x{hueco['alto']}.")

    m = lee_manifiesto(args.proyecto)
    usados = dhashes_usados(m, salvo=args.toma)
    destino = ruta_contactos(args.proyecto, args.toma)
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    dirmini = os.path.join(os.path.dirname(destino), ".mini")
    os.makedirs(dirmini, exist_ok=True)

    elegidos, huellas, minis = [], [], []
    for c in vivos:
        if len(elegidos) >= args.n:
            break
        if not c.get("mini"):
            continue
        archivo = os.path.join(dirmini, f"{args.toma}-{c['id']}.jpg")
        try:
            if not os.path.isfile(archivo):
                descarga(c["mini"], archivo, timeout=60)
        except Exception as e:  # una miniatura caida no puede tumbar la hoja
            print(f"   ⚠ no se pudo bajar la miniatura de {c['id']}: {e}")
            continue
        hu = dhash(archivo)
        # Sin estructura no hay huella fiable, y un falso duplicado cuesta mas
        # que un duplicado: se salta el dedupe y ya lo marcara el contraste.
        if hu and not sin_estructura(hu):
            # Repetir plano dentro de la misma pieza se lee como un error de montaje.
            repe = next((t for t, o in usados.items() if not sin_estructura(o) and distancia(hu, o) <= IGUALES), None)
            if repe:
                print(f"   · descartado {c['id']}: mismo plano que la toma [{repe}]")
                continue
            if any(distancia(hu, o) <= IGUALES for o in huellas if not sin_estructura(o)):
                print(f"   · descartado {c['id']}: repetido dentro de esta misma busqueda")
                continue
        st = stats(archivo) or {"luma": 0, "contraste": 999}
        c = {**c, "dhash": hu, **st, "mini_local": archivo}
        elegidos.append(c)
        huellas.append(hu)
        minis.append(archivo)

    if not elegidos:
        sys.exit("ERROR: no quedo ni una miniatura utilizable.")

    hoja = hoja_contactos(minis, destino)
    json_ruta = os.path.splitext(destino)[0] + ".json"
    escribe_atomico(
        json_ruta,
        (json.dumps({
            "toma": args.toma,
            "consulta": consulta,
            "consulta_original": args.consulta,
            "tipo": args.tipo,
            "para": args.para,
            # EL ORDEN ES EL CONTRATO: el indice de la hoja tiene que ser el
            # indice de `traer`, o se elige una cosa y se baja otra.
            "orden": [c["id"] for c in elegidos],
        }, ensure_ascii=False, indent=2) + "\n").encode("utf-8"),
    )

    print(f"\n   {len(vivos)} pasaron la medida · {len(elegidos)} en la hoja\n")
    for i, c in enumerate(elegidos):
        marca = "  ⚠ plano" if c["contraste"] < CONTRASTE_MINIMO else ""
        dur = f" · {c['duracion']}s" if c["duracion"] else ""
        print(f"  [{i}] {c['ancho']}x{c['alto']}{dur} · luma {c['luma']:.0f} · contraste {c['contraste']:.0f}{marca}")
        if c["descripcion"]:
            print(f"      «{c['descripcion'][:70]}»")
        print(f"      {c['autor']} · {c['origen_url']}")
    if fuera:
        print(f"\n  ({len(fuera)} descartados por medida; el primero: {fuera[0]['motivo']})")

    if hoja:
        print(f"\n   Hoja: {ruta_visible(hoja)}")
        print("\n   MÍRALA y elige por el número. Lo que hay que juzgar, en este orden:")
        print("     1. ¿ilustra literalmente lo que dice la toma, o solo el tema?")
        print("     2. ¿aguanta el recorte a 9:16 con el sujeto dentro?")
        print("     3. ¿lleva texto quemado, logos o marcas? → descártala")
        print("     4. ¿hay una persona identificable? → solo si el contexto es neutro:")
        print("        la licencia prohíbe mostrarla «bajo mala luz», y un rostro de")
        print("        archivo junto a un titular de estafa o desalojo es exactamente eso")
        print("     5. ¿parece el stock que usa todo el mundo? → busca el plano de detalle")
    else:
        print("\n   ⚠ no se pudo montar la hoja (¿ffmpeg?): decide por la tabla y las URLs")
        if not binario("ffmpeg"):
            print(f"     {pista_instalacion('ffmpeg')}")

    print(
        f"\n   Siguiente: uv run manuales/edicion-video/scripts/bancos.py traer"
        f' --proyecto {args.proyecto} --toma {args.toma} --consulta "{args.consulta}"'
        f' --para {args.para} --tipo {args.tipo} --indice <n> --porque "qué prueba aporta"\n'
    )


def cmd_traer(args):
    hueco = HUECOS[args.para]
    consulta, notas = (args.consulta, []) if args.tal_cual else normaliza(args.consulta)
    m = lee_manifiesto(args.proyecto)
    h = huella(consulta, args.tipo, args.para, args.indice)

    ya = m["assets"].get(args.toma)
    if ya and ya.get("huella") == h and not args.forzar:
        archivo = desde_raiz(ya["archivo"])
        if os.path.isfile(archivo):
            print(f"[{args.toma}] ya traido y sin cambios (huella {h[:8]}). --forzar para re-elegir.")
            print(f"   media: \"{ya['servido']}\"")
            return
        print(f"[{args.toma}] en el manifiesto pero no en disco: lo repongo.")
        return reponer_uno(args.proyecto, args.toma, ya)

    print(f'\n[{args.toma}] "{consulta}"   ({args.tipo} · {args.para})')
    for n in notas:
        print(f"   glosario: {n}")
    for a in avisos_de_consulta(consulta):
        print(f"   ⚠ {a}")

    cands = candidatos(consulta, args.tipo, hueco, args.proyecto, usar_cache=not args.sin_cache)
    vivos, fuera = filtra(cands, hueco, args.duracion_min)
    if not vivos:
        sys.exit(
            f"ERROR: ninguno de los {len(cands)} candidatos cumple {hueco['ancho']}x{hueco['alto']}.\n"
            f"  Prueba otra consulta, --para retrato, o --tipo foto."
        )
    # SI HAY HOJA DE CONTACTOS, MANDA SU ORDEN. El numero que se eligio mirando
    # la hoja tiene que traer lo que se veia en esa casilla — y `contactos`
    # descarta duplicados que aqui no se descartan, asi que sin esto la
    # numeracion se desplaza y se baja el plano de al lado sin que falle nada.
    orden = orden_de_contactos(args.proyecto, args.toma, consulta, args.tipo, args.para)
    if orden:
        por_id = {x["id"]: x for x in vivos}
        reordenados = [por_id[i] for i in orden if i in por_id]
        if reordenados:
            print(f"   (orden de la hoja de contactos: {len(reordenados)} candidato(s))")
            vivos = reordenados

    if args.indice >= len(vivos):
        sys.exit(f"ERROR: --indice {args.indice} y solo hay {len(vivos)} candidatos (0..{len(vivos) - 1}).")
    c = vivos[args.indice]

    nombre = f"{args.proyecto}-{args.toma}-{slug(args.consulta)}{c['extension']}"
    # Rutas LOGICAS (se guardan y se pegan en el plan): siempre con «/».
    rel_bruto = posixpath.join("proyectos", args.proyecto, "broll", "pexels", "raw", nombre)
    rel_servido = posixpath.join("broll", args.proyecto, f"{args.toma}-{slug(args.consulta)}{c['extension']}")
    # Rutas LOCALES (se abren en esta maquina).
    bruto = desde_raiz(rel_bruto)
    servido = desde_raiz("remotion", "public", rel_servido)

    print(f"   elegido [{args.indice}]: {c['ancho']}x{c['alto']} · {c['autor']}")
    if c["descripcion"]:
        print(f"   «{c['descripcion'][:70]}»")
    if args.simular:
        print(f"   (simulacion) bajaria {c['descarga_url'][:80]}… a {rel_bruto}")
        return

    bytes_ = descarga(c["descarga_url"], bruto)
    print(f"   bajado: {rel_bruto}  ({bytes_ / 1_000_000:.1f} MB)")
    if c["tipo"] == "video":
        # SE MIDE EL ARCHIVO, no la ficha (ver `medida_real`). Si no llega al
        # hueco, se prueba la rendition siguiente del MISMO vídeo —el plano que se
        # eligió mirando la hoja no cambia— y en el manifiesto queda la URL que
        # de verdad sirve y la medida de verdad, para que `reponer` baje lo mismo.
        real = medida_real(bruto)
        pendientes = list(c.get("alternativas", []))
        while real and (real[0] < hueco["ancho"] or real[1] < hueco["alto"]):
            print(f"   ⚠ el banco declaró {c['ancho']}x{c['alto']} y el archivo mide {real[0]}x{real[1]}")
            if not pendientes:
                os.remove(bruto)
                sys.exit(
                    f"ERROR: ninguna rendition de este vídeo llega a {hueco['ancho']}x{hueco['alto']}.\n"
                    "  Elige otro candidato de la hoja."
                )
            alt = pendientes.pop(0)
            print(f"   · pruebo la rendition siguiente ({alt['ancho']}x{alt['alto']})…")
            bytes_ = descarga(alt["link"], bruto)
            print(f"   bajado: {rel_bruto}  ({bytes_ / 1_000_000:.1f} MB)")
            c = {**c, "descarga_url": alt["link"]}
            real = medida_real(bruto)
        if real:
            c = {**c, "ancho": real[0], "alto": real[1]}
            print(f"   medida real: {real[0]}x{real[1]}")
        sin_audio(bruto)
    os.makedirs(os.path.dirname(servido), exist_ok=True)
    shutil.copy2(bruto, servido)

    m["assets"][args.toma] = {
        "huella": h,
        "banco": "pexels",
        "id": c["id"],
        "tipo": c["tipo"],
        "consulta": consulta,
        "consulta_original": args.consulta,
        "para": args.para,
        "indice": args.indice,
        "autor": c["autor"],
        "autor_url": c["autor_url"],
        "licencia": LICENCIA["nombre"],
        "licencia_url": LICENCIA["url"],
        "origen_url": c["origen_url"],
        "descarga_url": c["descarga_url"],
        "descripcion": c["descripcion"],
        "ancho": c["ancho"],
        "alto": c["alto"],
        "duracion": c["duracion"],
        "sha256": sha256_de(bruto),
        # Huella perceptual: es lo que impide que la toma de al lado traiga el
        # mismo plano con otro id.
        "dhash": dhash(bruto),
        # POR QUE ESTE Y NO OTRO. Lo escribe quien miro la hoja de contactos, y
        # es lo unico de este manifiesto que una maquina no puede rellenar. Sin
        # el, dentro de tres meses nadie sabe si el plano se eligio o se acepto.
        "porque": args.porque or "",
        "archivo": rel_bruto,
        "servido": rel_servido,
        # Los descartados se guardan con su motivo a proposito: el dia que una
        # toma salga mal, esto dice si fallo el filtro, la consulta o la eleccion.
        "descartados": [{"id": d["id"], "motivo": d["motivo"]} for d in fuera[:10]],
    }
    guarda_manifiesto(args.proyecto, m)
    print(f"   manifiesto: proyectos/{args.proyecto}/broll/manifiesto.json")
    print(f"\n   Pega esto en la toma del plan:")
    print(f'     media: "{rel_servido}"{", esVideo: true" if c["tipo"] == "video" else ""}')
    print(f"\nSiguiente: node manuales/video-noticias/scripts/revisar-plan.mjs <tu plan>\n")


def reponer_uno(proyecto, toma, a):
    """Vuelve a bajar UN asset del manifiesto y comprueba que es el mismo."""
    bruto = desde_raiz(a["archivo"])
    servido = desde_raiz("remotion", "public", a["servido"])
    if not os.path.isfile(bruto):
        print(f"   [{toma}] bajando de nuevo…")
        descarga(a["descarga_url"], bruto)
        if a["tipo"] == "video":
            sin_audio(bruto)
    sha = sha256_de(bruto)
    if sha != a["sha256"]:
        # No es fatal: los bancos re-comprimen y las URLs caducan. Pero hay que
        # decirlo, porque significa que el frame que se va a renderizar puede no
        # ser el que se aprobo.
        print(f"   ⚠ [{toma}] el archivo NO es el que se eligio (sha distinto).")
        print(f"      manifiesto {a['sha256'][:12]}… · disco {sha[:12]}…")
    os.makedirs(os.path.dirname(servido), exist_ok=True)
    shutil.copy2(bruto, servido)
    print(f"   [{toma}] {a['servido']}")


def cmd_reponer(args):
    m = lee_manifiesto(args.proyecto)
    if not m["assets"]:
        sys.exit(f"ERROR: proyectos/{args.proyecto}/broll/manifiesto.json no tiene assets.")
    print(f"\nReponiendo {len(m['assets'])} asset(s) del proyecto {args.proyecto}:")
    for toma, a in m["assets"].items():
        reponer_uno(args.proyecto, toma, a)
    print()


# ── El grading: medir, no opinar ─────────────────────────────────────────────
#
# EL PROBLEMA QUE RESUELVE. Tres clips de tres autores vienen ya graduados por
# ellos: uno frio, otro subexpuesto, otro saturado. Ponerles el mismo look encima
# NO los une — lo amplifica, porque el mismo filtro empuja el color de cada uno
# hacia un sitio distinto. El oficio dice: primero IGUALAR, despues el look.
#
# Igualar a ojo son horas; igualar midiendo es una pasada de `signalstats`. Lo
# que sale de aqui es la distancia de cada clip a la MEDIANA de los del proyecto
# —no a un ideal—, porque asi ningun clip se fuerza mas de lo necesario.
#
# El look (saturacion, grano, viñeta, velo calido de marca) NO se toca aqui: es
# del formato y vive en `METRAJE` (theme-noticias.ts).

# Topes de la correccion. Mas alla de esto no se esta igualando, se esta tapando
# que el clip no vale: un plano dos diafragmas por debajo, subido, es ruido.
TOPES = {"exposicion": (0.80, 1.25), "saturacion": (0.85, 1.20), "calido": (-0.12, 0.12)}
# Por debajo de esto la correccion no se ve y solo ensucia el plan con numeros.
MINIMO_VISIBLE = 0.02


def mide_color(archivo, muestras=6):
    """
    Luma, dominantes de color y saturacion medias, con `signalstats`.

    Muestrea uno de cada quince frames (hasta `muestras`) y promedia: medir solo
    el primer frame de un clip es medir su fundido de entrada.

    Se muestrea con `select` y NO con `fps=1`, que era lo natural: sobre una
    imagen fija —que dura un frame— el remuestreo a 1 fps se queda sin ninguno y
    ffprobe devuelve una lista vacia, sin error. Con `select` pasan las dos.

    EL ARCHIVO ENTRA POR `-i`, NO POR `movie=` DENTRO DEL GRAFO. Ahi la ruta
    hay que escaparla a DOS niveles (el del grafo y el de las opciones del
    filtro), y con un solo nivel bastaba un «:» —la unidad C: de Windows,
    siempre— o una «,» en la ruta para que `gradar` dijera «no se pudo medir»
    en TODOS los clips. Por `-i` no hay nada que escapar; las medidas salen por
    `metadata=print` a stdout y son las MISMAS cifras que daba ffprobe
    (comprobado clip a clip, tambien sobre una imagen fija). `-frames:v` corta
    la decodificacion en cuanto hay muestras suficientes.
    """
    ffmpeg = binario("ffmpeg")
    if not ffmpeg:
        return None
    r = subprocess.run(
        [ffmpeg, "-nostdin", "-v", "error", "-i", archivo,
         "-vf", "select=not(mod(n\\,15)),signalstats,metadata=print:file=-",
         "-frames:v", str(muestras), "-f", "null", "-"],
        capture_output=True, text=True, encoding="utf-8", errors="replace",
    )
    if r.returncode != 0:
        return None
    # Formato de `metadata=print`: una linea «frame:N pts:… pts_time:…» y
    # despues una «lavfi.signalstats.CLAVE=valor» por cada estadistica.
    frames, actual = [], None
    for linea in r.stdout.splitlines():
        if linea.startswith("frame:"):
            actual = {}
            frames.append(actual)
        elif linea.startswith("lavfi.signalstats.") and actual is not None:
            clave, _, valor = linea.partition("=")
            actual[clave.rsplit(".", 1)[-1]] = valor.strip()
    frames = frames[:muestras]
    if not frames:
        return None
    def media(clave):
        vals = [float(f[clave]) for f in frames if f.get(clave)]
        return sum(vals) / len(vals) if vals else None
    y, u, v, sat = media("YAVG"), media("UAVG"), media("VAVG"), media("SATAVG")
    if y is None:
        return None
    return {"y": y, "u": u or 128.0, "v": v or 128.0, "sat": sat or 0.0, "frames": len(frames)}


def mediana(xs):
    ys = sorted(xs)
    n = len(ys)
    return ys[n // 2] if n % 2 else (ys[n // 2 - 1] + ys[n // 2]) / 2


def _acota(valor, clave):
    lo, hi = TOPES[clave]
    return max(lo, min(hi, valor))


def cmd_gradar(args):
    m = lee_manifiesto(args.proyecto)
    if not m["assets"]:
        sys.exit(f"ERROR: proyectos/{args.proyecto}/broll/manifiesto.json no tiene assets.")
    if not binario("ffmpeg"):
        sys.exit(f"ERROR: gradar mide con ffmpeg y no lo encuentro. {pista_instalacion('ffmpeg')}")

    medidas = {}
    for toma, a in m["assets"].items():
        archivo = desde_raiz(a["archivo"])
        if not os.path.isfile(archivo):
            print(f"   ⚠ [{toma}] no esta en disco: corre `reponer` antes de gradar")
            continue
        c = mide_color(archivo)
        if not c:
            print(f"   ⚠ [{toma}] no se pudo medir")
            continue
        medidas[toma] = c
        a["color"] = {k: round(v, 2) for k, v in c.items() if k != "frames"}

    if len(medidas) < 2:
        sys.exit(
            "ERROR: hacen falta al menos DOS clips medidos para igualarlos.\n"
            "  Con uno solo no hay nada que igualar: el look del formato ya lo aplica el motor."
        )

    objetivo = {
        "y": mediana([c["y"] for c in medidas.values()]),
        "u": mediana([c["u"] for c in medidas.values()]),
        "v": mediana([c["v"] for c in medidas.values()]),
        "sat": mediana([c["sat"] for c in medidas.values()]),
    }
    print(f"\nObjetivo (mediana de {len(medidas)} clips): luma {objetivo['y']:.0f} · saturacion {objetivo['sat']:.0f}\n")

    for toma, c in medidas.items():
        grado = {}
        exp = _acota(objetivo["y"] / c["y"], "exposicion") if c["y"] > 4 else 1.0
        if abs(exp - 1) >= MINIMO_VISIBLE:
            grado["exposicion"] = round(exp, 3)
        if c["sat"] > 2:
            sat = _acota(objetivo["sat"] / c["sat"], "saturacion")
            if abs(sat - 1) >= MINIMO_VISIBLE:
                grado["saturacion"] = round(sat, 3)
        # En YUV, U es el eje azul-amarillo y V el rojo-verde: un clip frio tiene
        # U alto y V bajo. La correccion es la distancia a la mediana, no a un
        # neutro teorico — igualar es que se parezcan entre si.
        temp = ((objetivo["v"] - c["v"]) - (objetivo["u"] - c["u"])) / 255.0
        temp = _acota(temp, "calido")
        if abs(temp) >= MINIMO_VISIBLE:
            grado["calido"] = round(temp, 3)

        m["assets"][toma]["grado"] = grado
        etiqueta = "sin corregir (ya esta en la mediana)" if not grado else json.dumps(grado, ensure_ascii=False)
        print(f"  [{toma}] luma {c['y']:6.1f} · sat {c['sat']:5.1f} · U {c['u']:5.1f} V {c['v']:5.1f}")
        print(f"        grado: {etiqueta}")

    guarda_manifiesto(args.proyecto, m)
    print(f"\n   Guardado en proyectos/{args.proyecto}/broll/manifiesto.json")
    print("\n   Pega en cada toma del plan (el look del formato lo pone el motor, no lo copies):")
    for toma, a in m["assets"].items():
        if a.get("grado"):
            print(f"     [{toma}]  grado: {json.dumps(a['grado'], ensure_ascii=False)},")
    print()


def cmd_creditos(args):
    m = lee_manifiesto(args.proyecto)
    if not m["assets"]:
        sys.exit(f"ERROR: proyectos/{args.proyecto}/broll/manifiesto.json no tiene assets.")
    print(f"\nMetraje de archivo ({LICENCIA['nombre']} · {LICENCIA['url']}):")
    vistos = set()
    for a in m["assets"].values():
        clave = (a["autor"], a["origen_url"])
        if clave in vistos:
            continue
        vistos.add(clave)
        print(f"  · {a['autor']} — {a['origen_url']}")
    print("\nPexels no exige atribucion, pero esto es lo que se pega en la descripcion")
    print("del video: es gratis de poner y es la unica defensa si alguien reclama.\n")


def main():
    p = argparse.ArgumentParser(description="B-roll de bancos gratuitos (Pexels) para video-creator")
    sub = p.add_subparsers(dest="cmd", required=True)

    def comunes(s, con_toma=False):
        s.add_argument("--proyecto", required=True, help="NNN (p. ej. 006)")
        if con_toma:
            s.add_argument("--toma", required=True, help="id de la toma del plan (p. ej. n08b)")
        s.add_argument("--consulta", required=True, help="En espanol: se normaliza con el glosario")
        s.add_argument("--para", choices=sorted(HUECOS), default="escenario", help="def. escenario")
        s.add_argument("--tipo", choices=("foto", "video"), default="foto", help="def. foto")
        s.add_argument("--duracion-min", type=int, default=0, help="Segundos minimos del clip (solo video)")
        s.add_argument("--tal-cual", action="store_true", help="No pasar la consulta por el glosario")
        s.add_argument("--sin-cache", action="store_true", help="Ignora la cache de 24 h y vuelve a consultar")

    b = sub.add_parser("buscar", help="Ensena candidatos (no baja nada)")
    comunes(b)
    b.add_argument("-n", type=int, default=12, help="Cuantos ensenar (def. 12)")

    h = sub.add_parser("contactos", help="Monta la hoja de contactos: la criba y luego a MIRAR")
    comunes(h, con_toma=True)
    h.add_argument("-n", type=int, default=9, help="Miniaturas en la hoja (def. 9, rejilla 3x3)")

    t = sub.add_parser("traer", help="Elige, descarga y anota el credito")
    comunes(t, con_toma=True)
    t.add_argument("--indice", type=int, default=0, help="Cual de los candidatos (def. 0)")
    t.add_argument("--porque", help="Por que ESTE plano y no otro (va al manifiesto)")
    t.add_argument("--forzar", action="store_true", help="Re-elegir aunque la huella no haya cambiado")
    t.add_argument("--simular", action="store_true", help="Ensena que haria, sin bajar nada")

    r = sub.add_parser("reponer", help="Rehidrata remotion/public/ desde el manifiesto")
    r.add_argument("--proyecto", required=True, help="NNN")

    g = sub.add_parser("gradar", help="Mide los clips y calcula la correccion que los iguala")
    g.add_argument("--proyecto", required=True, help="NNN")

    c = sub.add_parser("creditos", help="Bloque de atribucion para la descripcion del video")
    c.add_argument("--proyecto", required=True, help="NNN")

    sub.add_parser("glosario", help="Ensena el glosario ES->EN del nicho")

    args = p.parse_args()
    {
        "buscar": cmd_buscar,
        "contactos": cmd_contactos,
        "traer": cmd_traer,
        "reponer": cmd_reponer,
        "gradar": cmd_gradar,
        "creditos": cmd_creditos,
        "glosario": cmd_glosario,
    }[args.cmd](args)


if __name__ == "__main__":
    main()
