#!/usr/bin/env python3
"""
elevenlabs.py — Integracion de ElevenLabs (texto -> voz) con video-creator.
Sin dependencias externas (solo libreria estandar de Python 3).
Hermano de heygen.py (avatar) y grok.py (b-roll).

Subcomandos:
  voces               Lista tus voces (incluidas las clonadas) -> copiar voice_id
  modelos             Lista los modelos TTS disponibles en tu cuenta
  hablar              Genera un audio desde texto y lo guarda
  guion               Genera un audio por CADA LINEA de un guion `id|texto`,
                      CON request stitching (el formato que consume generar-vo.mjs)
  cuota               Cuantos caracteres te quedan este mes

QUE ES ESTE SCRIPT Y QUE NO ES.
  La documentacion publica de ElevenLabs (elevenlabs.io/docs, seccion Text to
  Speech) es la REFERENCIA de la API: modelos, ajustes de voz, formatos,
  streaming. Este script es la HERRAMIENTA DE PIPELINE del proyecto: locuta un
  guion por tomas y encaja con generar-vo.mjs, que es quien cronometra el plan
  de la noticia. Cuando dudes de un parametro, mira la documentacion; cuando
  quieras locutar un proyecto, usa esto. Stdlib a proposito, como heygen.py y grok.py: el sistema
  no arrastra dependencias de Python para tres llamadas HTTP.

POR QUE ESTE SCRIPT Y NO HEYGEN para la voz en off:
  HeyGen solo genera VIDEO de avatar; para quedarte con la voz hay que renderizar
  el avatar entero y tirar la imagen. En el formato `video-noticias` no hay avatar
  en pantalla, asi que eso es pagar por un render que no se usa. ElevenLabs
  devuelve el audio directamente y se factura por caracteres.

La API key se lee de ELEVENLABS_API_KEY (entorno o .env de la raiz). Nunca se
imprime, ni entera ni truncada.

Doc: manuales/video-noticias/SKILL.md §8 · API: https://elevenlabs.io/docs/api-reference/text-to-speech
"""
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
import argparse
import hashlib
import json
import os
import sys
import urllib.parse

from _comun import ErrorHTTP, cargar_env, descarga, escribe_atomico, pide, ruta_visible  # noqa: F401

BASE = "https://api.elevenlabs.io"

# Modelo por defecto. `eleven_multilingual_v2` es el que el skill oficial marca
# para "long-form content", que es lo que es una locucion. Alternativa:
# `eleven_v3` (mas rango emocional, y el unico que admite `language_code`).
# Usa `modelos` para ver lo que tu cuenta tiene disponible HOY en vez de fiarte
# de este valor: los nombres de modelo cambian.
MODELO_DEF = "eleven_multilingual_v2"

# MP3 128k: el unico formato disponible en TODOS los planes, incluido `starter`.
# Los sin perdida (`wav_44100`, `pcm_44100`) exigen Pro y devuelven 403 por abajo:
# no los pongas de default o la primera locucion de una cuenta nueva falla.
# Con plan Pro, `--formato wav_44100` ahorra una generacion con perdida antes de
# mezclar; a 128 kbps sobre una voz hablada la diferencia es inaudible.
FORMATO_DEF = "mp3_44100_128"

# Ajustes de voz POR CASO DE USO, tal y como los documenta el skill oficial
# (references/voice-settings.md). El preset importa mas de lo que parece: con
# los valores conversacionales (stability 0.4) una locucion informativa cambia
# de tono entre frases, y ese vaiven es justo lo que delata a un TTS.
PRESETS = {
    "noticias":      {"stability": 0.8, "similarity_boost": 0.6,  "style": 0.0},
    "narracion":     {"stability": 0.7, "similarity_boost": 0.5,  "style": 0.0},
    "conversacion":  {"stability": 0.4, "similarity_boost": 0.75, "style": 0.3},
    "personaje":     {"stability": 0.3, "similarity_boost": 0.8,  "style": 0.5},
}
PRESET_DEF = "noticias"

# Modelos que RECHAZAN el request stitching (`previous_text` / `next_text`).
#
# No es una precaucion teorica: `guion` mandaba los vecinos SIEMPRE, asi que
# `guion --modelo eleven_v3` moria en la primera linea con un 400
# ("Providing previous_text or next_text is not yet supported with the
# 'eleven_v3' model") — y el subcomando anunciaba `--idioma`, que es una opcion
# que multilingual_v2 no admite y v3 si. O sea que la ayuda describia una
# combinacion que el codigo hacia imposible.
#
# Se apaga el stitching en vez de rechazar el modelo porque v3 sigue siendo la
# eleccion correcta cuando se quiere rango emocional. Lo que NO se hace es
# apagarlo en silencio: sin vecinos, cada linea se genera a ciegas y las
# junturas pueden saltar de tono. Eso lo decide quien locuta, informado.
SIN_STITCHING = {"eleven_v3"}


def hay_stitching(modelo):
    """¿Este modelo admite `previous_text`/`next_text`?"""
    return modelo not in SIN_STITCHING


ENV = cargar_env("ELEVENLABS_")

# Contador de caracteres facturados en esta ejecucion (cabecera x-character-count).
GASTO = {"caracteres": 0}


def api_key():
    k = ENV.get("ELEVENLABS_API_KEY", "").strip()
    if not k:
        sys.exit(
            "ERROR: falta ELEVENLABS_API_KEY.\n"
            "  1) node herramientas/setup.mjs crea el .env (o copia .env.example como .env)\n"
            "  2) pega tu clave (elevenlabs.io -> perfil -> API Keys)\n"
            "  o en la terminal:  export ELEVENLABS_API_KEY=...   (macOS/Linux)\n"
            '                     $env:ELEVENLABS_API_KEY="..."   (PowerShell)'
        )
    return k


def pedir(method, path, body=None, query=None, binario=False):
    """
    Llamada a la API. Los 5xx/429/timeout los reintenta `_comun.pide` con espera
    creciente; aqui solo se traducen los fallos DEFINITIVOS a un mensaje util.
    """
    url = BASE + path
    if query:
        url += "?" + urllib.parse.urlencode(query)
    try:
        datos, cab = pide(
            url,
            metodo=method,
            cabeceras={
                "xi-api-key": api_key(),
                "Accept": "audio/mpeg" if binario else "application/json",
            },
            cuerpo=body,
            timeout=180,
            binario=binario,
        )
    except ErrorHTTP as e:
        cuerpo = e.cuerpo
        if e.codigo == 401:
            sys.exit("ERROR 401: clave invalida o sin permisos. Revisa ELEVENLABS_API_KEY en .env.")
        if e.codigo == 403 and "output_format" in cuerpo:
            sys.exit(
                f"ERROR 403: tu plan no permite ese --formato.\n"
                f"  Los formatos sin perdida (wav_*, pcm_*) exigen plan Pro o superior.\n"
                f"  Usa --formato mp3_44100_128 (todos los planes) o mp3_44100_192 (Creator+).\n"
                f"  Detalle: {cuerpo}"
            )
        if e.codigo == 403:
            sys.exit(f"ERROR 403 (permiso o plan insuficiente): {cuerpo}")
        if e.codigo == 422:
            sys.exit(f"ERROR 422 (parametros invalidos — revisa voice_id y model_id): {cuerpo}")
        if e.codigo == 429:
            sys.exit(f"ERROR 429 (rate limit o cuota agotada). Detalle: {cuerpo}")
        if e.codigo == 0:
            sys.exit(f"ERROR de red: {cuerpo}")
        sys.exit(f"ERROR HTTP {e.codigo}: {cuerpo}")
    # Coste real de la llamada, segun la propia API (no una estimacion).
    n = cab.get("x-character-count") or cab.get("X-Character-Count")
    if n:
        try:
            GASTO["caracteres"] += int(n)
        except ValueError:
            pass
    return datos


def cmd_voces(args):
    voces = pedir("GET", "/v1/voices").get("voices", []) or []
    filtro = (args.buscar or "").lower()
    print("\n=== VOCES ===")
    n = 0
    for v in voces:
        nombre = v.get("name", "")
        if filtro and filtro not in nombre.lower():
            continue
        cat = v.get("category", "")
        labels = v.get("labels", {}) or {}
        extra = " ".join(f"{k}={x}" for k, x in labels.items() if k in ("accent", "gender", "age", "use_case"))
        marca = "  <- TUYA" if cat in ("cloned", "professional") else ""
        print(f"  {str(v.get('voice_id','')):24}  {nombre:28}  [{cat}]  {extra}{marca}")
        n += 1
    print(f"\n{n} voces. Copia el voice_id a .env como  ELEVENLABS_VOICE_ID=...")
    print("Las 'cloned'/'professional' son TUYAS; el resto es catalogo de stock.")


def cmd_modelos(args):
    modelos = pedir("GET", "/v1/models")
    print("\n=== MODELOS ===")
    for m in modelos:
        idm = m.get("model_id", "")
        idiomas = sorted({(l.get("language_id") or "") for l in (m.get("languages") or [])})
        es = " ✅es" if "es" in idiomas else ""
        print(f"  {idm:34}  {m.get('name','')}{es}")
        if args.verboso and idiomas:
            print(f"      idiomas ({len(idiomas)}): {','.join(idiomas)}")
    print(f"\nPor defecto este script usa: {MODELO_DEF} (cambialo con --modelo)")
    print("Tip: `eleven_v3` da mas rango emocional y admite --idioma; multilingual_v2 no.")


def cmd_cuota(args):
    u = pedir("GET", "/v1/user/subscription")
    usado = u.get("character_count", 0)
    tope = u.get("character_limit", 0)
    print(f"\nCaracteres: {usado:,} usados de {tope:,}  ->  quedan {max(0, tope - usado):,}")
    print(f"Plan: {u.get('tier','?')}")


def ajustes(args):
    """Preset del caso de uso + overrides explicitos del usuario."""
    v = dict(PRESETS[args.preset])
    if args.estabilidad is not None:
        v["stability"] = args.estabilidad
    if args.similitud is not None:
        v["similarity_boost"] = args.similitud
    if args.estilo is not None:
        v["style"] = args.estilo
    if args.velocidad is not None:
        v["speed"] = args.velocidad
    v["use_speaker_boost"] = True
    return v


def sintetiza(texto, voz, args, previo=None, siguiente=None):
    """
    Devuelve los bytes del audio. Un solo lugar donde se arma el payload.

    `previo`/`siguiente` son REQUEST STITCHING (skill oficial §Request Stitching):
    le dicen al modelo que hay texto antes y despues de este fragmento. Sin esto,
    generar un guion frase a frase produce saltos de tono y pausas raras en cada
    juntura — que es exactamente lo que se oye al concatenar los clips despues.

    Los modelos de `SIN_STITCHING` los rechazan con un 400, asi que ahi se omiten:
    el precio esta documentado arriba y lo avisa `cmd_guion` antes de facturar.
    """
    body = {"text": texto, "model_id": args.modelo, "voice_settings": ajustes(args)}
    if hay_stitching(args.modelo):
        if previo:
            body["previous_text"] = previo
        if siguiente:
            body["next_text"] = siguiente
    # `language_code` guia pronunciacion y normalizacion, pero NO lo admite
    # multilingual_v2 (lo ignora o da 422). Solo se manda si el usuario lo pide.
    if args.idioma:
        body["language_code"] = args.idioma
    if args.normalizar != "auto":
        body["apply_text_normalization"] = args.normalizar
    return pedir(
        "POST",
        f"/v1/text-to-speech/{voz}",
        body=body,
        query={"output_format": args.formato},
        binario=True,
    )


def resuelve_voz(args):
    voz = args.voz or ENV.get("ELEVENLABS_VOICE_ID")
    if not voz:
        sys.exit(
            "ERROR: falta voice_id (--voz o ELEVENLABS_VOICE_ID en .env).\n"
            "  Listalo con: uv run manuales/edicion-video/scripts/elevenlabs.py voces"
        )
    return voz


def ext_de(formato):
    return "wav" if formato.startswith("wav") else "mp3" if formato.startswith("mp3") else "bin"


def cmd_hablar(args):
    texto = args.texto
    if args.texto_archivo:
        # `utf-8-sig` tolera el BOM del Bloc de notas; el CR lo quita el strip.
        with open(args.texto_archivo, encoding="utf-8-sig") as f:
            texto = f.read().strip()
    if not texto:
        sys.exit('ERROR: da el texto con --texto "..." o --texto-archivo <ruta>')

    voz = resuelve_voz(args)
    print(f"Sintetizando {len(texto)} caracteres · voz {voz[:8]}… · {args.modelo} · preset {args.preset}")
    audio = sintetiza(texto, voz, args)
    escribe_atomico(args.salida, audio)
    print(f"Guardado: {args.salida}  ({len(audio):,} bytes)")
    if GASTO["caracteres"]:
        print(f"Facturado: {GASTO['caracteres']:,} caracteres")


def huella(texto, voz, args, previo, siguiente):
    """
    Firma de TODO lo que determina el audio de una toma. Si no cambia, el archivo
    que ya esta en disco sirve y no hay que volver a pedirlo (ni a pagarlo).

    Los vecinos entran en la firma a proposito: son `previous_text`/`next_text`
    (request stitching), asi que tocar una linea cambia de verdad el audio de sus
    dos vecinas. Regenerar tres tomas es lo correcto; dar por buenas las vecinas
    dejaria una juntura con la entonacion vieja.

    Y por eso SALEN de la firma cuando el modelo no admite stitching: si los
    vecinos no viajan en la peticion, no influyen en el audio, y meterlos en el
    hash haria repagar dos tomas intactas cada vez que se toca una linea.
    """
    firma = {
        "texto": texto,
        "voz": voz,
        "modelo": args.modelo,
        "ajustes": ajustes(args),
        "formato": args.formato,
        "idioma": args.idioma,
        "normalizar": args.normalizar,
        "previo": previo if hay_stitching(args.modelo) else None,
        "siguiente": siguiente if hay_stitching(args.modelo) else None,
    }
    bruto = json.dumps(firma, sort_keys=True, ensure_ascii=False).encode("utf-8")
    return hashlib.sha256(bruto).hexdigest()


def limpia_otras_extensiones(destino):
    """
    Borra la MISMA toma con otra extension. Al cambiar `--formato` (mp3 -> wav)
    la version anterior se quedaba en la carpeta, y `generar-vo.mjs` monta TODO lo
    que encuentra ordenado por nombre: la pista salia con cada toma duplicada y
    el cronometraje entero mal, sin un solo aviso.
    """
    carpeta = os.path.dirname(destino)
    base = os.path.splitext(os.path.basename(destino))[0]
    for otro in os.listdir(carpeta):
        raiz, ext = os.path.splitext(otro)
        if raiz == base and ext.lower() in (".mp3", ".wav", ".m4a", ".aiff") and otro != os.path.basename(destino):
            os.remove(os.path.join(carpeta, otro))
            print(f"       (borrado {otro}: misma toma en otro formato)")


def ya_locutada(destino, h):
    """¿El audio de disco corresponde EXACTAMENTE a esta firma?"""
    sidecar = destino + ".json"
    if not (os.path.isfile(destino) and os.path.getsize(destino) > 0 and os.path.isfile(sidecar)):
        return False
    try:
        with open(sidecar, encoding="utf-8") as f:
            return json.load(f).get("huella") == h
    except (json.JSONDecodeError, OSError):
        return False


def lee_guion(ruta):
    lineas = []
    # `utf-8-sig`: sin el, un guion con BOM (Bloc de notas) convierte la primera
    # toma en «\ufeffn01» y su archivo sale con ese nombre. El CR de un guion con
    # CRLF lo quita el strip de cada linea, igual que hace generar-vo.mjs.
    with open(ruta, encoding="utf-8-sig") as f:
        for raw in f:
            raw = raw.strip()
            if not raw or raw.startswith("#"):
                continue
            idl, _, texto = raw.partition("|")
            lineas.append((idl.strip(), texto.strip()))
    return lineas


def cmd_guion(args):
    """
    Locuta un guion `id|texto` (una linea por toma) a archivos sueltos.

    Por que una linea = un archivo, y no el guion entero de una vez: el formato
    `video-noticias` cronometra CADA TOMA con la duracion real de SU linea. Con
    un unico audio habria que segmentarlo despues a oido, que es justo el paso
    manual que este sistema evita.

    Y por que eso no suena a trozos pegados: cada llamada lleva el texto anterior
    y el siguiente (request stitching), asi que el modelo mantiene la entonacion
    a traves de los cortes aunque genere cada frase por separado.

    REANUDABLE: junto a cada audio se deja un sidecar `.json` con la firma de lo
    que lo genero. Al reejecutar, las tomas cuya firma no ha cambiado se saltan.
    Antes, un 429 en la toma 15 obligaba a repagar las 14 anteriores; ahora
    reejecutar el mismo comando sigue por donde iba. `--forzar` lo ignora todo y
    regenera (y vuelve a facturar) el guion entero.
    """
    voz = resuelve_voz(args)
    os.makedirs(args.salida, exist_ok=True)
    lineas = lee_guion(args.guion)
    con_voz = [(i, idl, t) for i, (idl, t) in enumerate(lineas) if t]

    total_chars = sum(len(t) for _, _, t in con_voz)
    print(f"\n{len(lineas)} lineas ({len(con_voz)} con voz) · {total_chars:,} caracteres")
    stitching = hay_stitching(args.modelo)
    print(
        f"voz {voz[:8]}… · {args.modelo} · preset {args.preset} · {args.formato}"
        f" · stitching {'ON' if stitching else 'OFF'}"
    )
    if not stitching:
        print(
            f"⚠  {args.modelo} no admite request stitching: cada linea se genera SIN saber\n"
            "   que va antes ni despues, asi que las junturas pueden saltar de tono.\n"
            "   Escucha la pista montada antes de dar la locucion por buena."
        )
    if args.simular:
        print("(--simular: no se llama a la API, no se gasta cuota)")
    if args.forzar:
        print("(--forzar: se regenera TODO, tambien lo que ya estaba en disco)")
    print("")

    ext = ext_de(args.formato)
    nuevas = reutilizadas = 0
    for pos, (i, idl, texto) in enumerate(con_voz, 1):
        destino = os.path.join(args.salida, f"{i + 1:03d}-{idl}.{ext}")
        # Vecinos REALES del guion: dan continuidad de entonacion entre tomas.
        previo = con_voz[pos - 2][2] if pos >= 2 else None
        siguiente = con_voz[pos][2] if pos < len(con_voz) else None
        h = huella(texto, voz, args, previo, siguiente)
        etiqueta = f"  {i+1:3}. {idl:22} {len(texto):4} car."

        if not args.forzar and ya_locutada(destino, h):
            reutilizadas += 1
            print(f"{etiqueta}  = {os.path.basename(destino)} (ya estaba)")
            continue
        if args.simular:
            nuevas += 1
            print(f"{etiqueta}  -> {os.path.basename(destino)}")
            continue

        audio = sintetiza(texto, voz, args, previo=previo, siguiente=siguiente)
        # Primero el audio (atomico), luego su firma: si algo se corta en medio,
        # el sidecar no llega a escribirse y la toma se regenera en la siguiente
        # pasada. Al reves, un audio truncado se daria por bueno para siempre.
        escribe_atomico(destino, audio)
        with open(destino + ".json", "w", encoding="utf-8") as fh:
            json.dump({"huella": h, "id": idl, "caracteres": len(texto)}, fh, ensure_ascii=False, indent=2)
        limpia_otras_extensiones(destino)
        nuevas += 1
        print(f"{etiqueta}  -> {os.path.basename(destino)}")

    for i, (idl, texto) in enumerate(lineas):
        if not texto:
            print(f"  {i+1:3}. {idl:22} (silencio — lo genera generar-vo.mjs)")

    if not args.simular:
        print(f"\nOK: {args.salida}  ({nuevas} generadas, {reutilizadas} reutilizadas)")
        if GASTO["caracteres"]:
            print(f"Facturado: {GASTO['caracteres']:,} caracteres")
        print("\nSiguiente — montar la pista y cronometrar el plan:")
        print(f'  node manuales/video-noticias/scripts/generar-vo.mjs <guion> --motor elevenlabs --partes "{ruta_visible(args.salida)}"')


def main():
    p = argparse.ArgumentParser(description="ElevenLabs (texto a voz) para video-creator")
    sub = p.add_subparsers(dest="cmd", required=True)

    pv = sub.add_parser("voces", help="Lista tus voces (clonadas y de catalogo)")
    pv.add_argument("--buscar", help="Filtra por nombre")

    pm = sub.add_parser("modelos", help="Lista los modelos TTS disponibles")
    pm.add_argument("--verboso", action="store_true", help="Muestra los idiomas de cada modelo")

    sub.add_parser("cuota", help="Caracteres restantes del plan")

    def comunes(sp):
        sp.add_argument("--voz", help="voice_id (o ELEVENLABS_VOICE_ID en .env)")
        sp.add_argument("--modelo", default=MODELO_DEF, help=f"model_id (def. {MODELO_DEF})")
        sp.add_argument("--preset", choices=sorted(PRESETS), default=PRESET_DEF,
                        help=f"ajustes por caso de uso (def. {PRESET_DEF})")
        sp.add_argument("--formato", default=FORMATO_DEF, help=f"output_format (def. {FORMATO_DEF})")
        sp.add_argument("--idioma", help="language_code ISO-639-1, p.ej. 'es'. NO lo admite multilingual_v2")
        sp.add_argument("--normalizar", choices=["auto", "on", "off"], default="auto",
                        help="apply_text_normalization: como lee numeros y fechas (def. auto)")
        # Overrides sueltos: por defecto None para que mande el preset.
        sp.add_argument("--estabilidad", type=float, help="0-1; baja=expresiva, alta=plana")
        sp.add_argument("--similitud", type=float, help="0-1; parecido a la voz original")
        sp.add_argument("--estilo", type=float, help="0-1; exageracion de estilo")
        sp.add_argument("--velocidad", type=float, help="0.25-4.0; ritmo")

    ph = sub.add_parser("hablar", help="Genera un audio desde texto")
    comunes(ph)
    ph.add_argument("--texto", help="El texto a locutar")
    ph.add_argument("--texto-archivo", help="Archivo con el texto")
    ph.add_argument("--salida", default="out/voz.wav", help="Ruta del audio")

    pg = sub.add_parser("guion", help="Genera un audio por linea de un guion id|texto (con stitching)")
    comunes(pg)
    pg.add_argument("guion", help="Archivo `id|texto`, una linea por toma")
    pg.add_argument("--salida", required=True, help="Carpeta donde dejar los audios")
    pg.add_argument("--simular", action="store_true", help="Muestra que haria SIN llamar a la API")
    pg.add_argument("--forzar", action="store_true",
                    help="Regenera (y refactura) tambien las tomas que ya estan en disco")

    args = p.parse_args()
    {"voces": cmd_voces, "modelos": cmd_modelos, "cuota": cmd_cuota, "hablar": cmd_hablar, "guion": cmd_guion}[
        args.cmd
    ](args)


if __name__ == "__main__":
    main()
