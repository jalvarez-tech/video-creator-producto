#!/usr/bin/env python3
"""
heygen.py — Integracion de HeyGen con el sistema video-creator.
Sin dependencias externas (solo libreria estandar de Python 3).

Subcomandos:
  avatares            Lista tus avatares y talking photos (para copiar avatar_id)
  voces               Lista voces (filtra con --idioma), para copiar voice_id
  generar             Genera un video de avatar desde texto y lo descarga

La API key se lee de la variable de entorno HEYGEN_API_KEY o del archivo .env
en la raiz de video-creator. Nunca se imprime.

Doc: manuales/edicion-video/heygen.md
"""
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
import argparse
import sys
import time
import urllib.parse

from _comun import ErrorHTTP, cargar_env, descarga, pide, resuelve_salida, ruta_visible

BASE = "https://api.heygen.com"

ENV = cargar_env("HEYGEN_")


def api_key():
    k = ENV.get("HEYGEN_API_KEY", "").strip()
    if not k:
        sys.exit(
            "ERROR: falta HEYGEN_API_KEY.\n"
            "  1) node herramientas/setup.mjs crea el .env (o copia .env.example como .env)\n"
            "  2) pega tu clave (app.heygen.com -> Settings -> API)\n"
            "  o en la terminal:  export HEYGEN_API_KEY=...   (macOS/Linux)\n"
            '                     $env:HEYGEN_API_KEY="..."   (PowerShell)'
        )
    return k


def pedir(method, path, body=None, query=None):
    """
    Llamada a la API. `_comun.pide` reintenta los transitorios respetando
    `Retry-After` — antes se leia esa cabecera solo para imprimirla y morir, en
    mitad de un sondeo de 15 minutos sobre un render que ya consume creditos.
    """
    url = BASE + path
    if query:
        url += "?" + urllib.parse.urlencode(query)
    try:
        datos, _ = pide(
            url,
            metodo=method,
            cabeceras={"X-Api-Key": api_key(), "Accept": "application/json"},
            cuerpo=body,
            timeout=60,
        )
        return datos
    except ErrorHTTP as e:
        if e.codigo == 401:
            sys.exit("ERROR 401: clave invalida. Revisa HEYGEN_API_KEY en .env (app.heygen.com -> Settings -> API).")
        if e.codigo == 429:
            sys.exit(f"ERROR 429 (rate limit) tras varios reintentos. Detalle: {e.cuerpo[:200]}")
        if e.codigo == 0:
            sys.exit(f"ERROR de red (tras reintentos): {e.cuerpo}")
        sys.exit(f"ERROR HTTP {e.codigo}: {e.cuerpo}")


def cmd_avatares(args):
    d = pedir("GET", "/v2/avatars").get("data", {}) or {}
    avatars = d.get("avatars", []) or []
    photos = d.get("talking_photos", []) or []
    print(f"\n=== AVATARES DE VIDEO ({len(avatars)}) — usa 'avatar_id' ===")
    for a in avatars:
        print(f"  {str(a.get('avatar_id','')):46}  {a.get('avatar_name','')}  [{a.get('gender','')}]")
    print(f"\n=== TALKING PHOTOS ({len(photos)}) — usa 'talking_photo_id' ===")
    for p in photos:
        print(f"  {str(p.get('talking_photo_id','')):46}  {p.get('talking_photo_name','')}")
    print("\nTip: copia TU avatar_id y pegalo en .env como  HEYGEN_AVATAR_ID=...")


def cmd_voces(args):
    voces = (pedir("GET", "/v2/voices").get("data", {}) or {}).get("voices", []) or []
    idi = (args.idioma or "").lower()
    n = 0
    print("\n=== VOCES ===")
    for v in voces:
        if idi and idi not in v.get("language", "").lower():
            continue
        print(f"  {str(v.get('voice_id','')):35}  {v.get('name',''):22}  {v.get('language','')}  [{v.get('gender','')}]")
        n += 1
    suf = f" ({args.idioma})" if idi else ""
    print(f"\n{n} voces{suf}. Copia el voice_id a .env como  HEYGEN_VOICE_ID=...")


DIMS = {
    "16:9": (1920, 1080),
    "9:16": (1080, 1920),
    "1:1": (1080, 1080),
    "4:5": (1080, 1350),
    "720p": (1280, 720),
}


SALIDA_DEFECTO = "avatar/heygen.mp4"  # dentro de proyectos/NNN/, cuando se da --proyecto


def cmd_generar(args):
    # La salida se decide ANTES de pedir el render: si ya hay un archivo ahi y
    # no se pidio --forzar, mejor pararse ahora que despues de gastar creditos.
    args.salida = resuelve_salida(args.salida, args.proyecto, SALIDA_DEFECTO, args.forzar)
    texto = args.texto
    if args.texto_archivo:
        # `utf-8-sig`: en Windows, sin encoding, el guion UTF-8 se leia como
        # cp1252 («cancion» con la tilde rota) y ESE texto iba a un render de
        # pago; y tolera el BOM que deja el Bloc de notas.
        with open(args.texto_archivo, encoding="utf-8-sig") as f:
            texto = f.read().strip()
    if not texto:
        sys.exit('ERROR: da el guion con --texto "..." o --texto-archivo <ruta>')
    if len(texto) > 5000:
        sys.exit(f"ERROR: el texto tiene {len(texto)} caracteres (max 5000). Trocea el guion.")

    avatar = args.avatar or ENV.get("HEYGEN_AVATAR_ID")
    voz = args.voz or ENV.get("HEYGEN_VOICE_ID")
    if not avatar:
        sys.exit(
            "ERROR: falta avatar_id (--avatar o HEYGEN_AVATAR_ID en .env).\n"
            "  Listalo con: uv run manuales/edicion-video/scripts/heygen.py avatares"
        )
    if not voz:
        sys.exit(
            "ERROR: falta voice_id (--voz o HEYGEN_VOICE_ID en .env).\n"
            "  Listalo con: uv run manuales/edicion-video/scripts/heygen.py voces"
        )

    w, h = DIMS.get(args.formato, DIMS["16:9"])
    payload = {
        "test": not args.final,
        "title": args.titulo,
        "caption": False,
        "dimension": {"width": w, "height": h},
        "video_inputs": [
            {
                "character": {"type": "avatar", "avatar_id": avatar, "avatar_style": "normal"},
                "voice": {"type": "text", "input_text": texto, "voice_id": voz, "speed": args.velocidad},
                "background": {"type": "color", "value": args.fondo},
            }
        ],
    }
    modo = "FINAL (consume creditos, SIN marca de agua)" if args.final else "TEST (gratis, CON marca de agua)"
    print(f"Generando [{modo}] · {args.formato} {w}x{h} · avatar {avatar[:14]}... · voz {voz[:14]}...")

    resp = pedir("POST", "/v2/video/generate", body=payload)
    vid = (resp.get("data") or {}).get("video_id")
    if not vid:
        sys.exit(f"ERROR: sin video_id en la respuesta: {resp}")
    print(f"video_id: {vid} — esperando render (polling cada {args.intervalo}s)...")
    esperar_y_descargar(vid, args)


def esperar_y_descargar(vid, args):
    """
    Sondea hasta que el render este y lo baja. Separado de `cmd_generar` para que
    `descargar` pueda retomar un video_id ya generado: con `--final` esos
    creditos ya se gastaron, y perder el proceso no debe costar otro render.
    """
    t0 = time.time()
    while True:
        st = (pedir("GET", "/v1/video_status.get", query={"video_id": vid}).get("data", {})) or {}
        estado = st.get("status")
        if estado == "completed":
            url = st.get("video_url")
            if not url:
                sys.exit(f"ERROR: estado=completed pero la respuesta no trae video_url: {st}")
            dur = st.get("duration")
            print(f"OK, listo ({dur}s). Descargando...")
            tam = descarga(url, args.salida)
            print(f"Guardado: {ruta_visible(args.salida)}  ({tam/1_000_000:.1f} MB)")
            print("Siguiente: usalo como talking-head en Remotion (ver manuales/edicion-video/heygen.md).")
            return
        if estado == "failed":
            sys.exit(f"ERROR: la generacion fallo: {st.get('error')}")
        if time.time() - t0 > args.timeout:
            sys.exit(
                f"ERROR: timeout (>{args.timeout}s). Ultimo estado: {estado}.\n"
                f"  El render sigue en curso y los creditos ya se gastaron. Retomalo con:\n"
                f'    uv run manuales/edicion-video/scripts/heygen.py descargar {vid} --salida "{ruta_visible(args.salida)}"'
            )
        print(f"   ... {estado}")
        time.sleep(args.intervalo)


def cmd_descargar(args):
    """Retoma un video_id que ya existe (timeout, Ctrl-C, corte de red)."""
    args.salida = resuelve_salida(args.salida, args.proyecto, SALIDA_DEFECTO, args.forzar)
    print(f"Retomando video_id {args.video_id} (polling cada {args.intervalo}s)...")
    esperar_y_descargar(args.video_id, args)


def main():
    p = argparse.ArgumentParser(description="Integracion HeyGen para video-creator")
    sub = p.add_subparsers(dest="cmd", required=True)

    def salida(sp):
        # Sin valor por defecto a proposito: antes todo caia en proyectos/001/
        # y cada render pisaba al anterior. O --salida, o --proyecto NNN.
        sp.add_argument("--salida", help=f"Ruta de salida MP4 (o --proyecto NNN, que guarda en proyectos/NNN/{SALIDA_DEFECTO})")
        sp.add_argument("--proyecto", help="NNN del proyecto, si no das --salida")
        sp.add_argument("--forzar", action="store_true", help="Sobrescribe la salida si ya existe")

    sub.add_parser("avatares", help="Lista avatares y talking photos")

    pv = sub.add_parser("voces", help="Lista voces")
    pv.add_argument("--idioma", help="Filtra por idioma (p. ej. Spanish)")

    g = sub.add_parser("generar", help="Genera un video de avatar desde texto")
    g.add_argument("--texto", help="Guion (texto directo)")
    g.add_argument("--texto-archivo", help="Ruta a un .md/.txt con el guion")
    g.add_argument("--avatar", help="avatar_id (o HEYGEN_AVATAR_ID en .env)")
    g.add_argument("--voz", help="voice_id (o HEYGEN_VOICE_ID en .env)")
    g.add_argument("--formato", default="16:9", choices=list(DIMS), help="Aspect ratio (def. 16:9)")
    g.add_argument("--titulo", default="video-creator")
    g.add_argument("--fondo", default="#FAFAFA", help="Color de fondo hex (def. #FAFAFA)")
    g.add_argument("--velocidad", type=float, default=1.0, help="Velocidad de voz 0.5-1.5")
    g.add_argument("--final", action="store_true", help="Salida FINAL (consume creditos, sin marca de agua)")
    salida(g)
    g.add_argument("--intervalo", type=int, default=8, help="Segundos entre sondeos (def. 8)")
    g.add_argument("--timeout", type=int, default=900, help="Segundos maximos de espera (def. 900)")

    d = sub.add_parser("descargar", help="Retoma un video_id ya generado (no vuelve a generar ni a gastar creditos)")
    d.add_argument("video_id", help="El video_id que imprimio `generar`")
    salida(d)
    d.add_argument("--intervalo", type=int, default=8, help="Segundos entre sondeos (def. 8)")
    d.add_argument("--timeout", type=int, default=900, help="Segundos maximos de espera (def. 900)")

    args = p.parse_args()
    {"avatares": cmd_avatares, "voces": cmd_voces, "generar": cmd_generar, "descargar": cmd_descargar}[args.cmd](args)


if __name__ == "__main__":
    main()
