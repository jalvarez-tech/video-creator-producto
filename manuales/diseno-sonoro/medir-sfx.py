#!/usr/bin/env python3
"""
medir-sfx.py — dónde está el GOLPE dentro de cada archivo de remotion/public/sfx/.

Uso:
  uv run manuales/diseno-sonoro/medir-sfx.py                       # todos los archivos del set
  uv run manuales/diseno-sonoro/medir-sfx.py pop.mp3 chime-02.mp3  # solo esos
  uv run manuales/diseno-sonoro/medir-sfx.py remotion/public/sfx/pop.mp3  # o por ruta
  uv run manuales/diseno-sonoro/medir-sfx.py --fps 25              # otro fps (por defecto 30)

Por qué existe. `cue()` sincroniza el «momento reconocible» del sonido con el
targetFrame SUPONIENDO dónde cae dentro del archivo: whoosh → al 65 % de la
duración del cue; impact/click → en el primer frame. Y la <Sequence> corta el
archivo a `durationInFrames`. Pero un banco de terceros no viene recortado: en
una pieza real se midió que `pop.mp3` tenía el transitorio en f17 (0,57 s),
`chime-02.mp3` en f25, `click-mouse-02/03.mp3` en f31 y `whoosh-light-02.wav`
en f34 — o sea que un cue de 8 frames sobre `pop` reproducía SILENCIO y se
cortaba antes del golpe. Nada lo avisa: el plan sale limpio y el render tiene
pista de audio.

Imprime por archivo, en frames al fps pedido: el frame del pico de RMS, la
ventana audible (a menos de 20 dB del pico) y el frame donde va la mitad de la
energía. Con eso el cue se escribe `startFrame = target − pico` y
`durationInFrames ≥ fin + cola`, que es lo que hace un `cues-NNN.ts`.

Sin dependencias: decodifica con ffmpeg a PCM y mide en Python puro.
"""
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
import argparse
import math
import os
import struct
import subprocess
import sys
import tempfile

# `realpath`: si el script llega por el enlace de .claude/skills/, la raiz
# calculada desde el enlace seria .claude/ y no el repo.
AQUI = os.path.dirname(os.path.realpath(__file__))
SFX = os.path.normpath(os.path.join(AQUI, "..", "..", "remotion", "public", "sfx"))

# Lo comun a los scripts de Python vive en edicion-video/scripts/_comun.py:
# de ahi sale donde buscar ffmpeg (la carpeta de setup.mjs y luego el PATH) y
# la consola en UTF-8, que en Windows por tuberia es cp1252 y rompe con «✖».
sys.path.insert(0, os.path.normpath(os.path.join(AQUI, "..", "edicion-video", "scripts")))
from _comun import herramienta  # noqa: E402


def envolvente(ffmpeg: str, ruta: str, fps: int):
    sr = 48000
    with tempfile.NamedTemporaryFile(suffix=".raw", delete=False) as tmp:
        raw = tmp.name
    try:
        subprocess.run(
            [ffmpeg, "-v", "error", "-y", "-i", ruta, "-ac", "1", "-ar", str(sr), "-f", "s16le", raw],
            check=True,
        )
        with open(raw, "rb") as fh:
            datos = fh.read()
    finally:
        os.unlink(raw)
    n = len(datos) // 2
    muestras = struct.unpack("<%dh" % n, datos[: n * 2])
    win = sr // fps
    env = []
    for i in range(0, n - win + 1, win):
        s = sum(t * t for t in muestras[i : i + win]) / win
        env.append(10 * math.log10(s / (32768 ** 2) + 1e-12))
    return n / sr, env


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("archivos", nargs="*")
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--umbral", type=float, default=20.0, help="dB por debajo del pico que cuentan como audible")
    a = ap.parse_args()
    ffmpeg = herramienta("ffmpeg")
    nombres = a.archivos or sorted(f for f in os.listdir(SFX) if f.lower().endswith((".mp3", ".wav")))
    print(f"{'archivo':24} {'dur':>6}  {'pico':>10}  {'audible':>11}  {'50 %':>5}   (frames @ {a.fps} fps)")
    for nombre in nombres:
        # Primero donde estás (absolutas y relativas con carpetas, que es lo que
        # da el autocompletado de la shell), después el set instalado. Es el
        # mismo orden que `sfx.mjs medir`: colgarlo todo de SFX resolvía
        # «remotion/public/sfx/pop.mp3» a remotion/public/sfx/remotion/public/sfx/pop.mp3.
        en_cwd = os.path.abspath(nombre)
        en_sfx = os.path.join(SFX, nombre)
        ruta = en_cwd if os.path.exists(en_cwd) else en_sfx
        if not os.path.exists(ruta):
            print(f"{nombre:24} ✖ no existe (ni {en_cwd} ni {en_sfx})", file=sys.stderr)
            continue
        dur, env = envolvente(ffmpeg, ruta, a.fps)
        if not env:
            print(f"{nombre:24} ✖ vacío", file=sys.stderr)
            continue
        pk = max(range(len(env)), key=lambda i: env[i])
        aud = [i for i, e in enumerate(env) if e > env[pk] - a.umbral]
        lin = [10 ** (e / 10) for e in env]
        tot = sum(lin)
        acc = 0.0
        f50 = 0
        for i, x in enumerate(lin):
            acc += x
            if acc >= tot / 2:
                f50 = i
                break
        print(f"{nombre:24} {dur:5.2f}s  f{pk:3d} {env[pk]:6.1f}dB  f{aud[0]:3d}-f{aud[-1]:<4d}  f{f50:3d}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
