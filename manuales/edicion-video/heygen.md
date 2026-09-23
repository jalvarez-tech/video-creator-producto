# 🧑‍💼 Integración de HeyGen (avatar de IA)

> Tu avatar de HeyGen es una **fuente de clips de "cámara"**: le das el guion y genera el talking-head hablando. Ese MP4 entra en el pipeline que ya tienes (→ Remotion con tus plantillas/subtítulos → export).
> Verificado contra `docs.heygen.com` (jul 2026). Endpoints **v1/v2** vigentes hasta **2026-10-31**; después HeyGen empuja a v3 (`/v3/videos`).

## Qué cambia en el flujo (importante)
Con avatar, el habla es **limpia y el guion ya es texto conocido**, así que:
- ❌ **Auto-Editor (cortar silencios) deja de ser obligatorio** — no hay muletillas ni silencios muertos; cortar podría desincronizar los labios.
- ❌ **Transcribir (Paso 3) sobra** — el guion que envías **ES** el texto de los subtítulos, con timing.
- ✅ El trabajo se concentra en **formato + Remotion** (títulos, subtítulos desde el propio guion, branding, b-roll).

---

## Dos formas de traer tu avatar

### A) Manual — sin API, funciona HOY (plan web free/Creator)
1. Genera el vídeo en `https://app.heygen.com` con tu avatar + guion.
2. Descarga el MP4.
3. Colócalo en el proyecto:
   - como **talking-head principal** → `proyectos/NNN/original.mp4`, **o**
   - como **clip de avatar** → `proyectos/NNN/avatar/heygen.mp4`.
4. Sigue el [proceso](proceso-edicion.md) **saltando los pasos 2 y 3** (silencios y transcripción): vas directo a **Paso 4 (formato) → 5 (Remotion) → 7 (export)**.
5. Genera en el **aspect ratio de tu plantilla** (16:9 / 9:16 / 1:1) para no recortar.

> Esta vía no cuesta API y usa tu plan actual (los vídeos free llevan marca de agua HeyGen).

### B) Automatizada — por API (script `heygen.py`)
Requiere **API key de pago** (ver Requisitos). Una vez configurada, generas desde la terminal.

**Setup (una vez):** el instalador (`node herramientas/setup.mjs`) crea `.env` en la raíz del repo a partir de la plantilla; abre `.env` en tu editor y pega dentro tu `HEYGEN_API_KEY` — **tú, no el asistente**: el agente nunca pide ni lee claves.

**1. Encuentra los IDs de tu avatar y voz:**
```shell
uv run manuales/edicion-video/scripts/heygen.py avatares
uv run manuales/edicion-video/scripts/heygen.py voces --idioma Spanish
```
Copia tu `avatar_id` y un `voice_id` al `.env`:
```
HEYGEN_AVATAR_ID=xxxxxxxx
HEYGEN_VOICE_ID=yyyyyyyy
```
> Tu avatar custom recién creado sale en el array `avatars` (o en `talking_photos` si es Photo Avatar). El ID copiado de la web no siempre vale para la API — usa el que lista el script.

**2. Genera un vídeo (por defecto en modo TEST: gratis, con marca de agua):**
```shell
uv run manuales/edicion-video/scripts/heygen.py generar --texto "Hola, hoy te enseño a automatizar tu edición de vídeo." --formato 16:9 --salida proyectos/NNN/avatar/heygen.mp4
uv run manuales/edicion-video/scripts/heygen.py generar --texto-archivo proyectos/NNN/guion-limpio.md --formato 9:16
```
La primera línea genera desde texto directo; la segunda, desde tu guion limpio.
El script: crea el vídeo → hace *polling* del estado → descarga el MP4. Cuando el payload te convenza, añade `--final` para la versión **sin marca de agua** (esa **sí consume créditos**).

Opciones: `--formato {16:9,9:16,1:1,4:5,720p}` · `--velocidad 0.5-1.5` · `--fondo "#RRGGBB"` · `--titulo` · `--avatar`/`--voz` (si no usas los del `.env`) · `--intervalo`/`--timeout` (sondeo).

**3. Si pierdes el proceso (timeout, Ctrl-C, corte de red), NO vuelvas a generar:** con `--final` esos créditos ya se gastaron. El render sigue en el servidor; retómalo con el `video_id` que imprimió `generar`:

```shell
uv run manuales/edicion-video/scripts/heygen.py descargar <video_id> --salida proyectos/NNN/avatar/heygen.mp4
```

---

## Requisitos y coste (API)
- **API key:** `app.heygen.com` → **Settings → API**. Va en `.env` (`HEYGEN_API_KEY`). Nunca en el chat: el agente no la pide ni la lee, y `.env` está fuera de su alcance.
- **La API es de pago aparte** del plan web. Desde feb-2026 **no hay créditos de API gratis**.
  - **Pay-As-You-Go:** mínimo **$5**, créditos caducan a 12 meses. Ideal para probar.
  - **Coste:** Avatar V ≈ **$0.05/seg (~$3/min)**; se cobra por segundo generado.
- **Modo test** (`test:true`, por defecto en el script): gratis, con marca de agua → itera sin gastar.
- **Rate limit:** HTTP 429 con `Retry-After`; no lances muchas generaciones en paralelo.

---

## Cómo encaja en el pipeline (3 modos)

**(a) Talking-head = `original.mp4`** — el avatar es tu presencia a cámara. Genera MP4 16:9 (o el ratio del proyecto), y el resto (intros, lower-thirds, subtítulos, branding) se aplica en Remotion con tus plantillas.

**(b) PiP con fondo transparente sobre pantalla** — para demos: capa inferior = grabación de pantalla; capa superior = el avatar recortado en una esquina/burbuja. Requiere salida **WebM con alpha** (no `background`; solo avatares de estudio con *matting*, plan de pago; en Remotion `<OffthreadVideo>` + `borderRadius`). Es justo el layout de la plantilla `TutorialYT`.

**(c) Avatar + b-roll** — HeyGen pone la voz y la cara; los planos de apoyo que se intercalan salen de **dos motores, y elegir mal no es un problema de coste sino de honestidad**: lo que existe (un lugar, un objeto, un gesto reales) se **trae** de un banco con `scripts/bancos.py`, y lo que no existe se **genera** con `scripts/grok.py`. Un plano generado que representa un hecho real es prueba documental fabricada. La regla completa, en [director-video §3h](../director-video/SKILL.md).

Se ensamblan como capas/escenas en Remotion. Del material de banco la medida está garantizada por construcción (se filtra por el hueco al traerlo); del generado **no**: mide con `ffprobe` antes de colocarlo y, si no llega al formato, va detrás del avatar o en plano escalado, nunca nítido a pantalla completa.

**Subtítulos y títulos → siempre en Remotion** (no los "quemes" en HeyGen). Como el guion ya es texto, los subtítulos salen de ahí con timing exacto, sin STT.

---

## Referencia rápida de la API
| Acción | Endpoint |
|---|---|
| Generar vídeo | `POST /v2/video/generate` (auth `X-Api-Key`) |
| Estado / URL de descarga | `GET /v1/video_status.get?video_id=...` → `data.video_url` (caduca 7 días) |
| Listar avatares | `GET /v2/avatars` (`avatars[]` + `talking_photos[]`) |
| Listar voces | `GET /v2/voices` |

Notas: salida MP4 (fondo opaco) o WebM (alpha); resoluciones 720p/1080p/4K; **la API no fija fps** (típico ~24–25) → ajusta el `fps` de la composición Remotion al del clip. Existe también una **Avatar Realtime API** (streaming en vivo), fuera de este pipeline de archivos.
