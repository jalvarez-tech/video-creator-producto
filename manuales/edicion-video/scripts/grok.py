#!/usr/bin/env python3
"""
grok.py — Generacion de b-roll e imagenes con Grok Imagine (API directa de xAI).
Sin dependencias externas (solo libreria estandar de Python 3).

Subcomandos:
  modelos             Lista los modelos de tu cuenta (sirve para verificar clave y creditos)
  imagen              Texto -> imagen, y la descarga
  video               Texto -> video, o imagen -> video, y lo descarga

Va DIRECTO a api.x.ai (no pasa por RunAPI). La clave se lee de XAI_API_KEY
(variable de entorno o .env en la raiz de video-creator). Nunca se imprime.

Por que descarga siempre: las URLs que devuelve la API son temporales. La regla
del proyecto es guardar el archivo en el mismo paso que se genera
(ver manuales/director-video/SKILL.md, contrato §3h).

Doc: manuales/edicion-video/SKILL.md
"""
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
import argparse
import json
import os
import sys
import time

from _comun import ErrorHTTP, cargar_env, descarga, escribe_atomico, pide, resuelve_salida, ruta_visible

BASE = "https://api.x.ai/v1"

ENV = cargar_env("XAI_")


def api_key():
    k = ENV.get("XAI_API_KEY", "").strip()
    if not k:
        sys.exit(
            "ERROR: falta XAI_API_KEY.\n"
            "  1) node herramientas/setup.mjs crea el .env (o copia .env.example como .env)\n"
            "  2) pega tu clave de https://console.x.ai\n"
            "  o en la terminal:  export XAI_API_KEY=...   (macOS/Linux)\n"
            '                     $env:XAI_API_KEY="..."   (PowerShell)\n'
            "  OJO: empieza por 'xai-'. No es la de Groq (gsk_) ni la de RunAPI."
        )
    return k


def pedir(method, path, body=None, timeout=120):
    """
    Llamada a la API. `_comun.pide` reintenta los fallos transitorios (5xx, 429,
    cortes de red) — importante porque esto se llama dentro de un bucle de
    sondeo de hasta 15 minutos sobre un render que YA se esta pagando.
    """
    try:
        datos, _ = pide(
            BASE + path,
            metodo=method,
            cabeceras={"Authorization": "Bearer " + api_key(), "Accept": "application/json"},
            cuerpo=body,
            timeout=timeout,
        )
        return datos
    except ErrorHTTP as e:
        cuerpo = e.cuerpo
        if e.codigo == 401:
            sys.exit("ERROR 401: la clave no es valida. Revisa XAI_API_KEY (console.x.ai).")
        if e.codigo == 403 and "credit" in cuerpo.lower():
            sys.exit(
                "ERROR 403: la clave es valida pero tu equipo de xAI NO TIENE CREDITOS.\n"
                "  Compralos en https://console.x.ai  ->  Billing.\n"
                f"  Respuesta: {cuerpo[:200]}"
            )
        if e.codigo == 429:
            sys.exit("ERROR 429 (rate limit) tras varios reintentos. Espera y vuelve a lanzarlo.")
        if e.codigo == 0:
            sys.exit(f"ERROR de red (tras reintentos): {cuerpo}")
        sys.exit(f"ERROR HTTP {e.codigo}: {cuerpo}")


def descargar(url, salida):
    """Descarga a disco AHORA (atomica y con timeout). Las URLs de la API caducan."""
    tam = descarga(url, salida)
    print(f"Guardado: {ruta_visible(salida)}  ({tam/1_000_000:.1f} MB)")


def guardar_prompt(salida, payload):
    """
    Deja el JSON de la llamada junto al material, para poder regenerar.

    Sube un nivel SOLO cuando el archivo esta en una carpeta `raw/` (la
    convencion de broll/grok/raw/). En cualquier otro caso se queda al lado: con
    un --salida relativo de un nivel, subir a ciegas creaba un `prompts/` FUERA
    del repositorio.
    """
    carpeta = os.path.dirname(os.path.abspath(salida))
    base_carpeta = os.path.basename(carpeta)
    prompts = os.path.join(os.path.dirname(carpeta) if base_carpeta == "raw" else carpeta, "prompts")
    os.makedirs(prompts, exist_ok=True)
    base = os.path.splitext(os.path.basename(salida))[0]
    ruta = os.path.join(prompts, base + ".json")
    escribe_atomico(ruta, json.dumps(payload, indent=2, ensure_ascii=False).encode("utf-8"))
    print(f"Prompt guardado: {ruta_visible(ruta)}")


def extras(args):
    """Campos adicionales que la doc de xAI no fija (p. ej. aspect_ratio).
    Se pasan tal cual para poder probarlos sin tocar el script."""
    if not args.extra:
        return {}
    try:
        d = json.loads(args.extra)
    except json.JSONDecodeError as e:
        sys.exit(f"ERROR: --extra no es JSON valido: {e}")
    if not isinstance(d, dict):
        sys.exit("ERROR: --extra tiene que ser un objeto JSON, p. ej. '{\"aspect_ratio\":\"9:16\"}'")
    return d


def cmd_modelos(args):
    data = pedir("GET", "/models").get("data", []) or []
    ids = sorted(str(m.get("id", "")) for m in data)
    imagine = [i for i in ids if "imagine" in i]
    print(f"\n=== MODELOS DE LA CUENTA ({len(ids)}) ===")
    for i in ids:
        marca = "  <- Grok Imagine" if i in imagine else ""
        print(f"  {i}{marca}")
    if not imagine:
        print("\nAviso: no aparece ningun modelo 'imagine' en esta cuenta.")


# Dentro de proyectos/NNN/, cuando se da --proyecto en vez de --salida.
SALIDA_IMAGEN = "broll/grok/raw/imagen.jpg"
SALIDA_VIDEO = "broll/grok/raw/shot-01.mp4"


def cmd_imagen(args):
    # La salida se decide ANTES de pedir nada: si ya hay un archivo ahi y no se
    # pidio --forzar, mejor pararse ahora que despues de pagar la generacion.
    args.salida = resuelve_salida(args.salida, args.proyecto, SALIDA_IMAGEN, args.forzar)
    payload = {"model": args.modelo, "prompt": args.prompt}
    payload.update(extras(args))
    print(f"Generando imagen [{args.modelo}]...")
    resp = pedir("POST", "/images/generations", body=payload)

    items = resp.get("data") or []
    if not items:
        sys.exit(f"ERROR: respuesta sin 'data': {json.dumps(resp)[:400]}")
    item = items[0]

    if item.get("url"):
        descargar(item["url"], args.salida)
    elif item.get("b64_json"):
        import base64
        escribe_atomico(args.salida, base64.b64decode(item["b64_json"]))
        print(f"Guardado: {ruta_visible(args.salida)}")
    else:
        sys.exit(f"ERROR: sin 'url' ni 'b64_json': {json.dumps(item)[:400]}")
    guardar_prompt(args.salida, payload)


def _url_del_video(estado):
    """La doc situa la URL en .video.url; toleramos variantes."""
    v = estado.get("video")
    if isinstance(v, dict) and v.get("url"):
        return v["url"]
    if isinstance(v, str) and v.startswith("http"):
        return v
    if estado.get("url"):
        return estado["url"]
    data = estado.get("data")
    if isinstance(data, list) and data and isinstance(data[0], dict) and data[0].get("url"):
        return data[0]["url"]
    return None


def cmd_video(args):
    args.salida = resuelve_salida(args.salida, args.proyecto, SALIDA_VIDEO, args.forzar)
    payload = {"model": args.modelo, "prompt": args.prompt, "duration": args.duracion}
    if args.imagen:
        # imagen -> video. La imagen fuente fija el encuadre: es la via fiable
        # para conseguir 9:16 mientras la API no documente aspect_ratio.
        payload["image"] = {"url": args.imagen}
    payload.update(extras(args))

    modo = "imagen -> video" if args.imagen else "texto -> video"
    print(f"Generando video [{args.modelo}] · {modo} · {args.duracion}s")
    print(f"Coste aprox: {args.duracion} s x tarifa por segundo de {args.modelo} (ver console.x.ai).")

    resp = pedir("POST", "/videos/generations", body=payload)
    rid = resp.get("request_id") or resp.get("id")
    if not rid:
        sys.exit(f"ERROR: sin request_id en la respuesta: {json.dumps(resp)[:400]}")
    print(f"request_id: {rid} — esperando render (polling cada {args.intervalo}s)...")
    esperar_y_descargar(rid, args, payload)


def esperar_y_descargar(rid, args, payload=None):
    """
    Sondea hasta que el render este y lo baja. Separado de `cmd_video` para que
    `recuperar` pueda retomar un request_id ya generado: el video esta pagado
    desde que se lanza, asi que perder el proceso no debe costar otro render.
    """
    t0 = time.time()
    while True:
        est = pedir("GET", f"/videos/{rid}")
        status = str(est.get("status", "")).lower()
        if status == "done":
            url = _url_del_video(est)
            if not url:
                sys.exit(f"ERROR: status=done pero no encuentro la URL: {json.dumps(est)[:400]}")
            print("OK, listo. Descargando (la URL caduca, por eso se baja ya)...")
            descargar(url, args.salida)
            if payload is not None:
                guardar_prompt(args.salida, payload)
            print("Siguiente: mide con ffprobe y colocalo segun el contrato (director-video §3h).")
            return
        if status in ("failed", "expired"):
            sys.exit(f"ERROR: la generacion termino en '{status}': {json.dumps(est)[:400]}")
        if time.time() - t0 > args.timeout:
            sys.exit(
                f"ERROR: timeout (>{args.timeout}s). Ultimo status: {status}.\n"
                f"  El render sigue en curso y YA esta pagado. Retomalo con:\n"
                f'    uv run manuales/edicion-video/scripts/grok.py recuperar {rid} --salida "{ruta_visible(args.salida)}"'
            )
        print(f"   ... {status or 'en curso'}")
        time.sleep(args.intervalo)


def cmd_recuperar(args):
    """Retoma un request_id que ya existe (timeout, Ctrl-C, corte de red)."""
    args.salida = resuelve_salida(args.salida, args.proyecto, SALIDA_VIDEO, args.forzar)
    print(f"Retomando request_id {args.request_id} (polling cada {args.intervalo}s)...")
    esperar_y_descargar(args.request_id, args)


def main():
    p = argparse.ArgumentParser(description="Grok Imagine (API directa de xAI) para video-creator")
    sub = p.add_subparsers(dest="cmd", required=True)

    def salida(sp, defecto):
        # Sin valor por defecto a proposito: antes todo caia en proyectos/001/
        # y cada generacion pisaba a la anterior. O --salida, o --proyecto NNN.
        sp.add_argument("--salida", help=f"Ruta de salida (o --proyecto NNN, que guarda en proyectos/NNN/{defecto})")
        sp.add_argument("--proyecto", help="NNN del proyecto, si no das --salida")
        sp.add_argument("--forzar", action="store_true", help="Sobrescribe la salida si ya existe")

    sub.add_parser("modelos", help="Lista los modelos de la cuenta (verifica clave y creditos)")

    i = sub.add_parser("imagen", help="Texto -> imagen")
    i.add_argument("prompt", help="Descripcion de la imagen")
    i.add_argument("--modelo", default="grok-imagine-image", help="def. grok-imagine-image (calidad: grok-imagine-image-quality)")
    salida(i, SALIDA_IMAGEN)
    i.add_argument("--extra", help='JSON con campos extra, p. ej. \'{"aspect_ratio":"9:16"}\'')

    v = sub.add_parser("video", help="Texto -> video, o imagen -> video")
    v.add_argument("prompt", help="Descripcion del plano (una intencion, no adjetivos apilados)")
    v.add_argument("--imagen", help="URL publica de la imagen de partida (imagen -> video)")
    v.add_argument("--modelo", default="grok-imagine-video-1.5", help="def. grok-imagine-video-1.5")
    v.add_argument("--duracion", type=int, default=6, help="Segundos, hasta 15 (def. 6)")
    salida(v, SALIDA_VIDEO)
    v.add_argument("--intervalo", type=int, default=5, help="Segundos entre sondeos (def. 5)")
    v.add_argument("--timeout", type=int, default=900, help="Segundos maximos de espera (def. 900)")
    v.add_argument("--extra", help='JSON con campos extra, p. ej. \'{"aspect_ratio":"9:16"}\'')

    r = sub.add_parser("recuperar", help="Retoma un request_id ya lanzado (no vuelve a generar ni a pagar)")
    r.add_argument("request_id", help="El request_id que imprimio `video`")
    salida(r, SALIDA_VIDEO)
    r.add_argument("--intervalo", type=int, default=5, help="Segundos entre sondeos (def. 5)")
    r.add_argument("--timeout", type=int, default=900, help="Segundos maximos de espera (def. 900)")

    args = p.parse_args()
    {"modelos": cmd_modelos, "imagen": cmd_imagen, "video": cmd_video, "recuperar": cmd_recuperar}[args.cmd](args)


if __name__ == "__main__":
    main()
