#!/usr/bin/env python3
"""
limites-voz.py — dónde EMPIEZA y dónde ACABA de hablar alguien en cada toma.

Uso:
  uv run manuales/edicion-video/scripts/limites-voz.py TOMA [TOMA …]      # .mov/.mp4/.wav
  uv run manuales/edicion-video/scripts/limites-voz.py --margen 12 *.mov  # umbral = suelo + 12 dB (defecto)

Por qué existe. Para «recortar los silencios» de una pieza grabada en tomas
(una persona a cámara, una frase por toma) hay que saber en qué segundo de cada
toma empieza y acaba la frase. Las marcas por palabra de whisper.cpp NO sirven
para eso: en una pieza de nueve tomas ponían la primera palabra en 0,00 s aunque
la voz empezaba entre 0,48 y 0,87 s (medido aquí y comprobado en el
espectrograma). Cortar con ellas deja el aire de entrada entero, o se come una
palabra si se «corrige» a ojo. Esto mide la ENERGÍA, que no se equivoca de
sitio aunque no sepa qué se dice.

Cómo mide:
  · banda de voz 300-3400 Hz (el suelo de un evento está casi todo por debajo
    de 300: aire acondicionado, música, pasos), ventanas de 10 ms;
  · umbral = percentil 8 de la toma (su suelo) + `--margen` dB;
  · huecos < 120 ms rellenos (una oclusiva no parte una palabra) e islas
    < 60 ms fuera (un golpe no es voz).

Imprime por toma: inicio y fin de la voz, aire antes y después, las pausas
internas de más de 150 ms, y la sonoridad integrada de la ventana de voz
(`loudnorm`), que es lo que hace falta para igualar el nivel entre tomas.

Ojo con lo que NO ve: una fricativa final («problemaS») puede quedar ~0,1 s
fuera del umbral. Deja margen después de `fin` (esa pieza deja 2 f antes de la
disolvencia y cruza la voz 8 f más tarde) y contrasta las tomas dudosas con
`showspectrumpic`.

Sin dependencias: decodifica con ffmpeg a PCM y mide en Python puro.
"""
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
import argparse
import array
import glob
import json
import math
import os
import subprocess
import sys
import tempfile

from _comun import herramienta  # busca ffmpeg donde lo deja setup.mjs y pone la consola en UTF-8

SR = 16000
VENTANA = SR // 100  # 10 ms


def envolvente(ffmpeg: str, ruta: str):
    with tempfile.NamedTemporaryFile(suffix=".raw", delete=False) as tmp:
        raw = tmp.name
    try:
        subprocess.run(
            [ffmpeg, "-v", "error", "-y", "-i", ruta, "-map", "0:a:0", "-ac", "1", "-ar", str(SR),
             "-af", "highpass=f=300:p=2,highpass=f=300:p=2,lowpass=f=3400", "-f", "s16le", raw],
            check=True,
        )
        a = array.array("h")
        with open(raw, "rb") as fh:
            a.frombytes(fh.read())
    finally:
        os.unlink(raw)
    env = []
    for i in range(0, len(a) - VENTANA + 1, VENTANA):
        s = 0
        for v in a[i : i + VENTANA]:
            s += v * v
        r = math.sqrt(s / VENTANA) / 32768
        env.append(20 * math.log10(r) if r > 1e-9 else -120.0)
    return env


def tramos(env, margen: float):
    orden = sorted(env)
    suelo = orden[int(0.08 * (len(orden) - 1))]
    umbral = suelo + margen
    act = [x > umbral for x in env]
    segs, i = [], 0
    while i < len(act):
        if act[i]:
            j = i
            while j < len(act) and act[j]:
                j += 1
            segs.append([i, j])
            i = j
        else:
            i += 1
    unidos = []
    for s in segs:
        if unidos and s[0] - unidos[-1][1] < 12:  # huecos < 120 ms
            unidos[-1][1] = s[1]
        else:
            unidos.append(s)
    return suelo, umbral, [s for s in unidos if s[1] - s[0] >= 6]  # islas < 60 ms fuera


def lufs(ffmpeg: str, ruta: str, a: float, b: float) -> str:
    salida = subprocess.run(
        [ffmpeg, "-hide_banner", "-nostdin", "-ss", f"{a:.3f}", "-to", f"{b:.3f}", "-i", ruta,
         "-map", "0:a:0", "-af", "loudnorm=print_format=json", "-f", "null", "-"],
        capture_output=True, text=True, encoding="utf-8", errors="replace",
    ).stderr
    try:
        j = json.loads(salida[salida.rindex("{") : salida.rindex("}") + 1])
        return f"{j['input_i']} LUFS · {j['input_tp']} dBTP"
    except ValueError:
        return "¿?"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[1])
    ap.add_argument("tomas", nargs="+", help="archivos o comodines (*.mov): se expanden aqui, PowerShell no lo hace")
    ap.add_argument("--margen", type=float, default=12.0, help="dB sobre el suelo de la toma (defecto 12)")
    args = ap.parse_args()
    ffmpeg = herramienta("ffmpeg")
    # Los comodines se expanden AQUI: bash los expande antes de llamar, pero
    # PowerShell y cmd le pasan «*.mov» literal a un programa nativo.
    tomas = []
    for patron in args.tomas:
        if any(c in patron for c in "*?["):
            tomas.extend(sorted(glob.glob(patron)) or [patron])
        else:
            tomas.append(patron)
    for ruta in tomas:
        if not os.path.exists(ruta):
            print(f"❌ no existe {ruta}", file=sys.stderr)
            continue
        env = envolvente(ffmpeg, ruta)
        dur = len(env) / 100
        suelo, umbral, segs = tramos(env, args.margen)
        nombre = os.path.basename(ruta)
        if not segs:
            print(f"{nombre}: sin voz por encima de {umbral:.1f} dB")
            continue
        ini, fin = segs[0][0] / 100, segs[-1][1] / 100
        print(f"{nombre}  voz {ini:5.2f} → {fin:5.2f} s  (aire: {ini:4.2f} antes · {dur - fin:4.2f} después · de {dur:5.2f} s)")
        pausas = [(segs[k][1] / 100, segs[k + 1][0] / 100) for k in range(len(segs) - 1)]
        pausas = [(a, b) for a, b in pausas if b - a >= 0.15]
        if pausas:
            print("    pausas: " + " · ".join(f"{a:.2f}-{b:.2f} ({(b - a) * 1000:.0f} ms)" for a, b in pausas))
        print(f"    nivel de la voz [{max(0, ini - 0.1):.2f}, {fin + 0.15:.2f}]: {lufs(ffmpeg, ruta, max(0, ini - 0.1), fin + 0.15)}"
              f"   (suelo {suelo:.1f} dB, umbral {umbral:.1f} dB)")


if __name__ == "__main__":
    main()
