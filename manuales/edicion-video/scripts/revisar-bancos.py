#!/usr/bin/env python3
"""
revisar-bancos.py — EL TEST DE LAS PARTES DE `bancos.py` QUE NO TOCAN LA RED.

Uso (desde cualquier sitio):
  uv run manuales/edicion-video/scripts/revisar-bancos.py

POR QUE EXISTE. Lo que decide si el b-roll sale bien no es la descarga: es la
CONSULTA. Y la consulta la construye un glosario que va a crecer a mano, con
terminos que se solapan entre si — "obra" es prefijo de "obra gris", "escritura"
de "escritura publica". Un termino nuevo mal colocado no rompe nada visible:
simplemente empieza a traer otro plano, y eso no se ve hasta que el video esta
montado.

El caso que lo origino ya paso una vez: "grieta en la pared" salia como
"cracked concrete wall closeup EN LA PARED" —el glosario acertaba y dejaba el
resto del espanol dentro—, y en una busqueda lexica cada palabra que no casa
diluye el resultado.

Tambien fija el DETERMINISMO, que es de lo que depende que un proyecto se pueda
re-renderizar: misma consulta -> misma huella -> mismo plano; y el orden de los
candidatos no puede depender del orden en que los devuelva el banco.

Sale con 1 si algo falla, para que sirva de puerta y no de informe.
"""
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
import os
import sys

if any(a in ("-h", "--help") for a in sys.argv[1:]):
    print(__doc__.strip())
    sys.exit(0)

sys.path.insert(0, os.path.dirname(os.path.realpath(__file__)))

from _comun import binario, pista_instalacion, raiz_proyecto  # noqa: E402  (y pone la consola en UTF-8)
from bancos import HUECOS, filtra, huella, normaliza, slug  # noqa: E402

fallos = []


def igual(que, obtenido, esperado):
    if obtenido == esperado:
        print(f"   ✅ {que}")
    else:
        print(f"   ❌ {que}\n        esperaba: {esperado!r}\n        salio:    {obtenido!r}")
        fallos.append(que)


def cierto(que, condicion, detalle=""):
    if condicion:
        print(f"   ✅ {que}")
    else:
        print(f"   ❌ {que}   {detalle}")
        fallos.append(que)


print("\n🔎 bancos.py — consulta, orden y huella\n")

# ── El glosario ──────────────────────────────────────────────────────────────
# El espanol que sobra se DESCARTA en cuanto el glosario acierta: dejarlo dentro
# es peor que no traducir.
texto, notas = normaliza("grieta en la pared")
igual("«grieta en la pared» no arrastra el espanol", texto, "cracked concrete wall closeup")
cierto("…y dice que descarto «pared»", any("pared" in n for n in notas), notas)

# La expresion LARGA gana a la corta que la contiene. Si esto se rompe, la
# consulta pasa a ser otra sin que nadie se entere.
igual("«escritura publica» gana a «escritura»", normaliza("escritura publica")[0], "notary signing deed document")
igual("«obra gris» gana a «obra»", normaliza("obra gris")[0], "concrete building under construction")

# Los toponimos son lo unico que trae Colombia real al encuadre: ni se traducen
# ni se descartan, aunque el glosario acierte en el resto de la frase.
igual("el toponimo sobrevive a la traduccion", normaliza("obra gris en medellin")[0],
      "concrete building under construction medellin")
igual("un toponimo solo se deja igual", normaliza("bogota")[0], "bogota")

# Sin acierto del glosario no se descarta nada: hacerlo dejaria la busqueda vacia.
igual("sin acierto, la consulta va entera", normaliza("cracked wall closeup")[0], "cracked wall closeup")
igual("las tildes no impiden el acierto", normaliza("avalúo")[0], "home appraisal inspection")

# ── El filtro y el orden ─────────────────────────────────────────────────────
hueco = HUECOS["escenario"]
CANDS = [
    {"id": 3, "tipo": "foto", "ancho": 1080, "alto": 1920, "duracion": None},
    {"id": 1, "tipo": "foto", "ancho": 1080, "alto": 1920, "duracion": None},
    {"id": 2, "tipo": "foto", "ancho": 2160, "alto": 3840, "duracion": None},
    {"id": 4, "tipo": "foto", "ancho": 720, "alto": 1280, "duracion": None},
]
vivos, fuera = filtra(list(CANDS), hueco, 0)
igual("descarta lo que no cubre el hueco", [c["id"] for c in fuera], [4])
igual("ordena por area y desempata por id", [c["id"] for c in vivos], [2, 1, 3])
# El ranking del banco cambia entre llamadas: sin orden total, dos ejecuciones
# del mismo comando traerian planos distintos.
igual("el orden no depende del de entrada",
      [c["id"] for c in filtra(list(reversed(CANDS)), hueco, 0)[0]], [2, 1, 3])

VIDS = [
    {"id": 7, "tipo": "video", "ancho": 1080, "alto": 1920, "duracion": 2},
    {"id": 8, "tipo": "video", "ancho": 1080, "alto": 1920, "duracion": 9},
]
igual("descarta el clip mas corto que la toma", [c["id"] for c in filtra(VIDS, hueco, 5)[0]], [8])

# ── La huella ────────────────────────────────────────────────────────────────
h = huella("cracked wall", "foto", "escenario", 0)
igual("misma entrada, misma huella", huella("cracked wall", "foto", "escenario", 0), h)
cierto("otra consulta, otra huella", huella("cracked floor", "foto", "escenario", 0) != h)
cierto("otro indice, otra huella", huella("cracked wall", "foto", "escenario", 1) != h)
cierto("otro hueco, otra huella", huella("cracked wall", "foto", "retrato", 0) != h)

# ── El nombre de archivo ─────────────────────────────────────────────────────
igual("slug sin tildes ni simbolos", slug("Grieta en la PARED — fachada"), "grieta-en-la-pared-fachada")
cierto("slug nunca vacio", slug("¿¡!?") == "toma")

# ── Las dos fuentes de verdad sobre la misma medida ──────────────────────────
# `bancos.py` decide QUE se baja y `revisar-broll.mjs` juzga lo que hay en disco.
# Si sus minimos se separan, un asset lo acepta uno y lo rechaza el otro — y el
# aviso saldria despues de haber gastado la peticion y el disco. Ya paso una vez:
# el retrato pedia 1280x1650 aqui y 702x904 alli, y con eso se rechazaba material
# 1080x1920, que es el estandar del 9:16.
RAIZ = raiz_proyecto()
MJS = os.path.join(RAIZ, "manuales", "video-noticias", "scripts", "revisar-broll.mjs")
if os.path.isfile(MJS):
    import re

    fuente = open(MJS, encoding="utf-8").read()
    m = re.search(r"marco:\s*\{\s*ancho:\s*Math\.ceil\((\d+)\s*\*\s*([\d.]+)\)\s*,\s*alto:\s*Math\.ceil\((\d+)\s*\*\s*([\d.]+)\)", fuente)
    cierto("revisar-broll.mjs declara el hueco del marco de forma legible", m is not None)
    if m:
        import math

        igual("el minimo del marco coincide en los dos scripts",
              (math.ceil(int(m.group(1)) * float(m.group(2))), math.ceil(int(m.group(3)) * float(m.group(4)))),
              (HUECOS["retrato"]["ancho"], HUECOS["retrato"]["alto"]))
else:
    print("   ⚠️  no encuentro revisar-broll.mjs: no se ha comprobado que los huecos coincidan")

# ── La huella perceptual ─────────────────────────────────────────────────────
# Necesita ffmpeg (que ya es dependencia del sistema) y material de prueba, asi
# que se genera al vuelo. Si no hay ffmpeg, se dice y se sigue: mejor un test
# incompleto declarado que uno que finge.
import shutil as _sh  # noqa: E402
import subprocess as _sp  # noqa: E402
import tempfile as _tf  # noqa: E402

from bancos import IGUALES, dhash, distancia, sin_estructura  # noqa: E402

FFMPEG = binario("ffmpeg")
if not FFMPEG:
    print(f"   ⚠️  sin ffmpeg: no se ha probado la huella perceptual ({pista_instalacion('ffmpeg')})")
else:
    tmp = _tf.mkdtemp(prefix="huella-")

    def _gen(nombre, filtro, extra=None):
        ruta = os.path.join(tmp, nombre)
        _sp.run([FFMPEG, "-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", filtro]
                + (extra or []) + ["-frames:v", "1", "-q:v", "3", ruta], check=True)
        return ruta

    a = _gen("a.jpg", "testsrc2=s=600x800")
    b = _gen("b.jpg", "mandelbrot=s=600x800")
    # FRANJAS HORIZONTALES: el caso que destapo el fallo. Un dHash de un solo eje
    # mide gradientes horizontales, y aqui no hay ninguno — devolvia un hash de
    # todo ceros, o sea IDENTICO al de un gris liso, y el dedupe se llevaba por
    # delante material perfectamente bueno sin decir nada.
    franjas = _gen("franjas.jpg", "rgbtestsrc=s=600x800")
    liso = _gen("liso.jpg", "color=c=0x9aa0a6:s=600x800")
    casi_a = os.path.join(tmp, "casi-a.jpg")
    _sp.run([FFMPEG, "-hide_banner", "-loglevel", "error", "-y", "-i", a,
             "-vf", "eq=brightness=-0.03", "-q:v", "12", casi_a], check=True)

    ha, hb, hf, hl, hc = (dhash(x) for x in (a, b, franjas, liso, casi_a))
    igual("la huella son 128 bits (dos ejes)", len(ha), 32)
    cierto("el mismo plano recomprimido se reconoce", distancia(ha, hc) <= IGUALES, f"d={distancia(ha, hc)}")
    cierto("dos planos distintos no colisionan", distancia(ha, hb) > IGUALES, f"d={distancia(ha, hb)}")
    cierto("unas franjas horizontales NO son un gris liso",
           distancia(hf, hl) > IGUALES, f"d={distancia(hf, hl)} — el dHash de un eje daba 0")
    cierto("un gris liso se declara sin estructura", sin_estructura(hl))
    cierto("…y un plano con dibujo, no", not sin_estructura(hb))
    _sh.rmtree(tmp, ignore_errors=True)

print("\n✅ Consulta, orden, huella y medidas se portan.\n" if not fallos else f"\n✖ {len(fallos)} fallo(s).\n")
sys.exit(1 if fallos else 0)
