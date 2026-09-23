#!/usr/bin/env python3
"""
medir-velo.py — mide el FONDO de la banda de texto en un still y el contraste
que resulta para cada tinta (R13, R25).

Uso:
  uv run manuales/motion-graphics/scripts/medir-velo.py <still.png> [--filas "1340,1450,1560,1680,1750"] [--x 118:962] [--colores "#FFFFFF,#34D399"]
  (las listas con comas, entre comillas: PowerShell las partiria)

Por qué existe. R25 manda verificar el velo MIDIENDO el fondo de la banda en el
frame exacto (el 0, el primero de cada relevo y el primero de cada toma que
nace), con la MEDIANA por fila del ancho útil —mediana y no media, porque el
texto blanco ocupa menos de la mitad del ancho y la media lo contamina—. Se hizo
a mano en una pieza; esto lo deja repetible y sin dependencias: decodifica el PNG con
ffmpeg a gris de 8 bits y calcula la mediana en Python puro.

Imprime, por fila, la luma mediana del fondo (0-255) y el contraste WCAG contra
cada color pedido. Para texto grande (≥ 24 px, o ≥ 19 px en negrita) el umbral
AA es 3:1; para texto normal, 4,5:1.
"""
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
import argparse
import os
import subprocess
import sys

# Lo comun a los scripts de Python vive en edicion-video/scripts/_comun.py:
# de ahi sale donde buscar ffmpeg/ffprobe (la carpeta de setup.mjs y luego el
# PATH) y la consola en UTF-8, que en Windows por tuberia es cp1252 y rompe
# con «✖». `realpath` por si el script llega por el enlace de .claude/skills/.
sys.path.insert(0, os.path.normpath(os.path.join(os.path.dirname(os.path.realpath(__file__)), "..", "..", "edicion-video", "scripts")))
from _comun import herramienta  # noqa: E402


def luminancia_relativa_gris(y8: int) -> float:
    c = y8 / 255.0
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4


def luminancia_relativa_hex(h: str) -> float:
    h = h.lstrip("#")
    r, g, b = (int(h[i : i + 2], 16) / 255.0 for i in (0, 2, 4))
    lin = lambda c: c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)


def contraste(l1: float, l2: float) -> float:
    a, b = max(l1, l2), min(l1, l2)
    return (a + 0.05) / (b + 0.05)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("still")
    ap.add_argument("--filas", default="1340,1450,1560,1680,1750")
    ap.add_argument("--x", default="118:962", help="rango horizontal útil, ini:fin")
    ap.add_argument("--colores", default="#FFFFFF,#34D399")
    a = ap.parse_args()
    ffprobe, ffmpeg = herramienta("ffprobe"), herramienta("ffmpeg")

    probe = subprocess.run(
        [ffprobe, "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height",
         "-of", "csv=p=0", a.still], capture_output=True, text=True, check=True)
    ancho, alto = (int(v) for v in probe.stdout.strip().split(","))
    raw = subprocess.run(
        [ffmpeg, "-v", "error", "-i", a.still, "-vf", "scale=flags=accurate_rnd+full_chroma_int+bitexact",
         "-pix_fmt", "gray", "-f", "rawvideo", "-"], capture_output=True, check=True).stdout
    if len(raw) != ancho * alto:
        print(f"✖ esperaba {ancho*alto} bytes y llegaron {len(raw)}", file=sys.stderr)
        return 1

    x0, x1 = (int(v) for v in a.x.split(":"))
    colores = [c.strip() for c in a.colores.split(",") if c.strip()]
    filas = [int(f) for f in a.filas.split(",")]
    print(f"{a.still}  ({ancho}×{alto})  ancho útil x={x0}-{x1}")
    cab = "fila   luma  " + "  ".join(f"{c:>9}" for c in colores)
    print(cab)
    peor = {c: 99.0 for c in colores}
    for f in filas:
        if f < 0 or f >= alto:
            print(f"{f:>5}  (fuera del cuadro)")
            continue
        fila = sorted(raw[f * ancho + x0 : f * ancho + x1])
        med = fila[len(fila) // 2]
        lf = luminancia_relativa_gris(med)
        celdas = []
        for c in colores:
            r = contraste(luminancia_relativa_hex(c), lf)
            peor[c] = min(peor[c], r)
            celdas.append(f"{r:>7.2f}:1")
        print(f"{f:>5}  {med:>4}  " + "  ".join(celdas))
    print("peor  " + "  ".join(f"{c} {peor[c]:.2f}:1" for c in colores))
    return 0


if __name__ == "__main__":
    sys.exit(main())
