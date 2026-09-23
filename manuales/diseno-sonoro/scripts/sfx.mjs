#!/usr/bin/env node
/**
 * sfx.mjs — el set de efectos de sonido (SFX) base del motor y el script que lo gestiona.
 *
 * Uso (desde la raíz del repo):
 *   node manuales/diseno-sonoro/scripts/sfx.mjs sintetizar  [--destino DIR] [--solo a.mp3,b.wav] [--forzar] [--fps 30] [--sin-medir]
 *   node manuales/diseno-sonoro/scripts/sfx.mjs desde-base  [--destino DIR] [--forzar]
 *   node manuales/diseno-sonoro/scripts/sfx.mjs desde-banco [MAPA.json] [--banco DIR] [--destino DIR] [--sin-medir]
 *   node manuales/diseno-sonoro/scripts/sfx.mjs medir       [ARCHIVO…] [--dir DIR] [--fps 30] [--umbral 20] [--json]
 *
 * Qué hace cada modo:
 *
 *   sintetizar   Genera los 55 archivos ORIGINALES del set (recetas de síntesis con
 *                ffmpeg lavfi, más abajo) y los deja, por defecto, en
 *                manuales/diseno-sonoro/sfx-base/, que es la copia versionada. Son
 *                deterministas (mismo ffmpeg → mismos bytes), sin metadatos, y cada
 *                uno queda normalizado al MISMO pico que implica su `vol` en cues.ts,
 *                así que el motor no cambia. Nunca sobrescribe sin --forzar y rehúsa
 *                escribir en una carpeta cuyo .origen.json diga «banco».
 *
 *   desde-base   Copia el set versionado (sfx-base/) a remotion/public/sfx/, que es
 *                de donde lee el motor. Es lo que llama el instalador: no necesita
 *                ffmpeg y los bytes son los mismos en cualquier sistema.
 *
 *   desde-banco  Para quien tenga un banco de sonidos propio: copia cada archivo
 *                del mapa JSON al destino con el nombre estándar, comprueba el
 *                sha256 (bytes idénticos, sin transcodificar) y mide el pico para
 *                sugerir el `vol` de cues.ts. Deja .origen.json con modo «banco»,
 *                que es lo que protege esa carpeta de una síntesis accidental.
 *
 *   medir        Dónde está el GOLPE de cada archivo (frame del pico de RMS, ventana
 *                audible, mitad de la energía), su pico de muestra (dBFS, como lo
 *                mide `volumedetect`) y el `vol` que le tocaría por familia. Es la
 *                medida que pide R26 antes de escribir un cue. Reimplementa la
 *                envolvente de medir-sfx.py para no depender de Python.
 *
 * Por qué un set sintetizado: el motor supone que el golpe de un impact/click cae
 * en t=0, el pico de un whoosh al 65 % del cue y el final de un riser en el último
 * frame (startFromTarget, cues.ts). Los archivos de bancos de terceros no cumplen
 * eso (llevan hasta 1-3 s de cabeza) y además no se pueden redistribuir. Estos 55
 * sí cumplen el contrato del motor y son obra original con licencia MIT.
 *
 * Solo librería estándar de Node. ffmpeg tiene que ser el COMPLETO (con filtros):
 * el que trae Remotion se compila sin ellos y no sirve para sintetizar ni medir.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {
  desdeRaiz,
  relativa,
  posix,
  binario,
  ejecutar,
  esMain,
  carpetaTemporal,
  borrar,
  escribirAtomico,
  leerJSON,
  escribirJSON,
  leerTexto,
  log,
  abortar,
  flags,
  plataforma,
} from "../../../herramientas/comun.mjs";

// ── Rutas y constantes ──────────────────────────────────────────────────────────

const CUES_TS = desdeRaiz("remotion", "src", "motor", "sound", "cues.ts");
export const SFX_BASE = desdeRaiz("manuales", "diseno-sonoro", "sfx-base");
export const PUBLIC_SFX = desdeRaiz("remotion", "public", "sfx");
const MAPA_BANCO_DEFECTO = desdeRaiz("sonido", "mapa-sfx.json");
const MANIFIESTO = ".origen.json";

/** Objetivo de PICO por familia de mezcla: es TARGET_DBFS de cues.ts, copiado aquí para no compilar TS. */
const OBJETIVO = { general: -21, whoosh: -27, impact: -27, ambient: -30 };
/**
 * Techo de pico por contenedor. El objetivo es el pico del archivo al que sustituye,
 * y varios de esos llegan a 0 dBFS: se admite porque la normalización mide el pico
 * DECODIFICADO en coma flotante (sin recorte) y el motor los reproduce a −20 dB o menos.
 */
const TECHO = { ".mp3": 0.0, ".wav": 0.0 };
/** Pasadas máximas de la normalización (el MP3 mueve el pico al codificar; se itera hasta clavarlo). */
const PASADAS_MAX = 6;
const TOLERANCIA_DB = 0.1;
const SR = 48000;

/** Filtros y codificadores que usan las recetas: se comprueban antes de empezar. */
const FILTROS = ["anoisesrc", "aevalsrc", "amultiply", "amix", "afade", "bandpass", "lowpass", "highpass", "acrusher", "tremolo", "areverse", "astats", "volumedetect", "volume"];
const ENCODERS = ["libmp3lame", "pcm_s16le"];

// ── Recetas ─────────────────────────────────────────────────────────────────────
//
// Convenciones: N = generador de ruido a 48 kHz y amplitud 1 (la semilla va en cada
// receta: anoisesrc por defecto la elige al azar y el set dejaría de ser
// determinista); E = aevalsrc a 48 kHz (por defecto usa 44,1 kHz). Toda receta
// termina en [out]. Los parámetros van como TEXTO para que el grafo sea siempre
// el mismo carácter a carácter.
//
// Cada receta declara su CLASE de sincronía, que es lo que se valida al final:
//   impact  → golpe en t=0 (audible desde f0, pico de RMS en f0 o f1)
//   whoosh  → pico en round(0,65·dref); dref = la duración de cue habitual (frames @30)
//   riser   → el crescendo acaba en el último frame
//   texture → suena desde f0 (data, tick, ambient están hechos para ir en bucle)
// `P` es el pico objetivo documentado (dBFS); el real se deriva de cues.ts al vuelo.

const N = "r=48000:a=1";
const E = "s=48000";
const num = (x) => Number(Number(x).toFixed(6)).toString();

/** Whoosh: dos bandas de ruido con envolvente pow→exp; el pico cae en P1/P2 segundos. */
const WH = (D, F1, F2, P1, P2, K1, K2, S1, S2, C1, C2, POT) =>
  `anoisesrc=d=${D}:c=${C1}:${N}:seed=${S1},bandpass=f=${F1}:width_type=q:width=0.8[n1];` +
  `aevalsrc='if(lt(t,${P1}),pow(t/${P1},${POT}),exp(-(t-${P1})*${K1}))':${E}:d=${D}[e1];[n1][e1]amultiply[a];` +
  `anoisesrc=d=${D}:c=${C2}:${N}:seed=${S2},bandpass=f=${F2}:width_type=q:width=0.8[n2];` +
  `aevalsrc='if(lt(t,${P2}),pow(t/${P2},${POT}+1),exp(-(t-${P2})*${K2}))':${E}:d=${D}[e2];[n2][e2]amultiply[b];` +
  `[a][b]amix=inputs=2:weights='1 0.6':normalize=0,afade=t=out:st=${num(D - 0.03)}:d=0.03[out]`;

/** Metal: cuatro parciales inarmónicos con caídas distintas + un chasquido de ruido agudo. */
const MT = (D, F0, R2, R3, R4, K1, K2, K3, K4, S) =>
  `aevalsrc='min(1,t/0.0005)*(sin(2*PI*${F0}*t)*exp(-${K1}*t)+0.6*sin(2*PI*${F0}*${R2}*t)*exp(-${K2}*t)+0.4*sin(2*PI*${F0}*${R3}*t)*exp(-${K3}*t)+0.25*sin(2*PI*${F0}*${R4}*t)*exp(-${K4}*t))':${E}:d=${D}[p];` +
  `anoisesrc=d=${D}:c=white:${N}:seed=${S},highpass=f=3000[n];aevalsrc='exp(-80*t)':${E}:d=${D}[e];[n][e]amultiply[k];` +
  `[p][k]amix=inputs=2:weights='1 0.5':normalize=0,afade=t=out:st=${num(D - 0.2)}:d=0.2[out]`;

/** Clic: ráfaga de ruido en banda + un seno corto; REL>0 añade el «soltar» a 70 ms. */
const CK = (D, B, SEN, K, S, REL) =>
  `anoisesrc=d=${D}:c=white:${N}:seed=${S},bandpass=f=${B}:width_type=q:width=1.5[n];` +
  `aevalsrc='exp(-${K}*t)+${REL}*gte(t,0.07)*exp(-${K}*(t-0.07))':${E}:d=${D}[e];[n][e]amultiply[a];` +
  `aevalsrc='0.3*sin(2*PI*${SEN}*t)*exp(-300*t)':${E}:d=${D}[b];` +
  `[a][b]amix=inputs=2:normalize=0,afade=t=out:st=${num(D - 0.02)}:d=0.02[out]`;

/** Glitch: ruido triturado a BITS troceado en pasos de PASO s + una cuadrada que cambia de nota. */
const GL = (D, PASO, F0, S, OFF, BITS) =>
  `anoisesrc=d=${D}:c=white:${N}:seed=${S},acrusher=bits=${BITS}:mode=lin:samples=8,lowpass=f=8000[n];` +
  `aevalsrc='st(0,floor(t/${PASO}));gt(mod(ld(0)*5+${OFF},7),2)*min(1,t/0.001)':${E}:d=${D}[g];[n][g]amultiply[a];` +
  `aevalsrc='st(0,floor(t/${PASO}));gt(mod(ld(0)*3+${OFF},5),1)*0.6*sgn(sin(2*PI*(${F0}+60*mod(ld(0),4))*t))*min(1,t/0.001)':${E}:d=${D}[b];` +
  `[a][b]amix=inputs=2:weights='0.6 1':normalize=0,lowpass=f=9000[gm];aevalsrc='0.35+0.65*exp(-8*t)':${E}:d=${D}[ge];` +
  `[gm][ge]amultiply,afade=t=out:st=${num(D - 0.1)}:d=0.1[out]`;

/** Las 55 recetas, en el orden del mapa SFX/POOL de cues.ts. */
export const RECETAS = [
  // ── whoosh (bucket whoosh): el pico al 65 % del cue habitual ──
  { archivo: "whoosh-light.wav", clase: "whoosh", dref: 12, P: -2.8, grafo: WH("0.44", "900", "3000", "0.27", "0.29", "30", "35", "201", "202", "pink", "white", "3") },
  { archivo: "whoosh-light-02.wav", clase: "whoosh", dref: 14, P: -2.0, grafo: WH("0.49", "700", "2400", "0.30", "0.32", "28", "32", "203", "204", "pink", "white", "3") },
  { archivo: "whoosh-light-03.wav", clase: "whoosh", dref: 10, P: -0.7, grafo: WH("0.38", "1200", "3600", "0.24", "0.26", "32", "38", "205", "206", "pink", "white", "3") },
  { archivo: "whoosh-whip.wav", clase: "whoosh", dref: 10, P: -1.0, grafo: WH("0.36", "2000", "4000", "0.24", "0.25", "45", "55", "211", "212", "white", "white", "5") },
  { archivo: "whoosh-wind.wav", clase: "whoosh", dref: 17, P: -2.6, grafo: WH("0.59", "500", "1500", "0.37", "0.39", "12", "15", "231", "232", "pink", "pink", "2") },
  { archivo: "swoosh.mp3", clase: "whoosh", dref: 13, P: -2.6, grafo: WH("0.44", "2800", "5500", "0.27", "0.29", "30", "36", "241", "242", "white", "white", "3") },
  { archivo: "swoosh-02.wav", clase: "whoosh", dref: 12, P: -4.6, grafo: WH("0.44", "3500", "6500", "0.28", "0.30", "30", "36", "243", "244", "white", "white", "3") },
  { archivo: "swoosh-03.wav", clase: "whoosh", dref: 14, P: -5.6, grafo: WH("0.49", "2200", "4500", "0.31", "0.33", "28", "34", "245", "246", "white", "white", "3") },
  { archivo: "whoosh-swoosh-07.wav", clase: "whoosh", dref: 48, P: -3.7, grafo: WH("1.62", "800", "3000", "1.03", "1.06", "8", "10", "251", "252", "pink", "white", "2.5") },
  {
    archivo: "whoosh-heavy.mp3", clase: "whoosh", dref: 18, P: -0.1,
    grafo: `anoisesrc=d=0.64:c=brown:${N}:seed=221,lowpass=f=900[n1];aevalsrc='if(lt(t,0.41),pow(t/0.41,3),exp(-(t-0.41)*18))':${E}:d=0.64[e1];[n1][e1]amultiply[a];aevalsrc='sin(2*PI*65*t)*if(lt(t,0.42),pow(t/0.42,3),exp(-(t-0.42)*14))':${E}:d=0.64[b];anoisesrc=d=0.64:c=pink:${N}:seed=222,bandpass=f=400:width_type=q:width=0.7[n3];aevalsrc='if(lt(t,0.42),pow(t/0.42,4),exp(-(t-0.42)*22))':${E}:d=0.64[e3];[n3][e3]amultiply[c];[a][b][c]amix=inputs=3:weights='1 0.5 0.6':normalize=0,afade=t=out:st=0.61:d=0.03[out]`,
  },
  // ── riser (bucket general): el crescendo TERMINA al final del archivo ──
  {
    archivo: "riser-low.mp3", clase: "riser", P: -17.3,
    grafo: `anoisesrc=d=1.6:c=brown:${N}:seed=301,lowpass=f=220,highpass=f=30[n];aevalsrc='pow(t/1.6,2.5)':${E}:d=1.6[en];[n][en]amultiply[r1];aevalsrc='sin(2*PI*(50*t+18.75*t*t))*pow(t/1.6,2)':${E}:d=1.6[r2];[r1][r2]amix=inputs=2:weights='1 0.5':normalize=0,afade=t=out:st=1.585:d=0.015[out]`,
  },
  {
    archivo: "riser-cymbal.mp3", clase: "riser", P: -4.8,
    grafo: `anoisesrc=d=1.67:c=white:${N}:seed=311,highpass=f=4000[n];aevalsrc='exp(-2.5*t)*min(1,t/0.002)':${E}:d=1.67[e];[n][e]amultiply,areverse,afade=t=out:st=1.655:d=0.015[out]`,
  },
  {
    archivo: "reverse.mp3", clase: "riser", P: -4.4,
    grafo: `anoisesrc=d=0.45:c=pink:${N}:seed=321,bandpass=f=1500:width_type=q:width=0.9[n];aevalsrc='exp(-9*t)*min(1,t/0.001)':${E}:d=0.45[e];[n][e]amultiply[a];aevalsrc='sin(2*PI*400*t)*exp(-12*t)*min(1,t/0.001)':${E}:d=0.45[b];[a][b]amix=inputs=2:weights='1 0.5':normalize=0,areverse,afade=t=out:st=0.445:d=0.005[out]`,
  },
  // ── impact (bucket impact): golpe en t=0 ──
  {
    archivo: "impact-deep.mp3", clase: "impact", P: -0.4,
    grafo: `aevalsrc='sin(2*PI*(45*t+8.125*(1-exp(-8*t))))*exp(-3.2*t)*min(1,t/0.002)':${E}:d=1.6[sub];anoisesrc=d=1.6:c=brown:${N}:seed=101,lowpass=f=300[bn];aevalsrc='exp(-9*t)*min(1,t/0.001)':${E}:d=1.6[be];[bn][be]amultiply[th];anoisesrc=d=1.6:c=white:${N}:seed=102,highpass=f=2500[wn];aevalsrc='exp(-120*t)':${E}:d=1.6[we];[wn][we]amultiply[ck];[sub][th][ck]amix=inputs=3:weights='1 0.7 0.25':normalize=0,afade=t=out:st=1.2:d=0.4:curve=exp[out]`,
  },
  {
    archivo: "impact-sharp.wav", clase: "impact", P: -1.6,
    grafo: `anoisesrc=d=0.5:c=white:${N}:seed=121,highpass=f=1200,bandpass=f=3500:width_type=q:width=0.8[n];aevalsrc='exp(-35*t)*min(1,t/0.0005)':${E}:d=0.5[e];[n][e]amultiply[a];aevalsrc='min(1,t/0.0005)*(0.6*sin(2*PI*1800*t)*exp(-25*t)+0.8*sin(2*PI*90*t)*exp(-30*t))':${E}:d=0.5[b];[a][b]amix=inputs=2:normalize=0,afade=t=out:st=0.45:d=0.05[out]`,
  },
  { archivo: "metal.wav", clase: "impact", P: -0.1, grafo: MT("1.2", "620", "2.756", "5.404", "8.933", "4", "6", "9", "13", "131") },
  { archivo: "metal-02.wav", clase: "impact", P: -0.3, grafo: MT("1.2", "740", "2.32", "4.25", "6.63", "3.5", "5", "8", "12", "132") },
  { archivo: "metal-03.wav", clase: "impact", P: 0.0, grafo: MT("0.9", "470", "2.756", "5.404", "8.933", "6", "9", "12", "16", "133") },
  // ── click / UI (bucket general): transiente en t=0 ──
  {
    archivo: "click-camera.wav", clase: "impact", P: -0.3,
    grafo: `anoisesrc=d=0.3:c=white:${N}:seed=141,highpass=f=2000,bandpass=f=3500:width_type=q:width=1[n];aevalsrc='exp(-250*t)+0.7*gte(t,0.075)*exp(-250*(t-0.075))':${E}:d=0.3[e];[n][e]amultiply[a];aevalsrc='sin(2*PI*400*t)*(exp(-60*t)+0.6*gte(t,0.075)*exp(-60*(t-0.075)))':${E}:d=0.3[b];[a][b]amix=inputs=2:weights='1 0.4':normalize=0,afade=t=out:st=0.25:d=0.05[out]`,
  },
  { archivo: "click-mouse.mp3", clase: "impact", P: -4.8, grafo: CK("0.12", "4000", "2200", "400", "142", "0") },
  { archivo: "click-mouse-02.mp3", clase: "impact", P: -2.2, grafo: CK("0.14", "3000", "1800", "400", "143", "0.5") },
  { archivo: "click-mouse-03.mp3", clase: "impact", P: -3.7, grafo: CK("0.10", "5200", "2900", "550", "144", "0") },
  {
    archivo: "click-pen.mp3", clase: "impact", P: -0.5,
    grafo: `anoisesrc=d=0.2:c=white:${N}:seed=151,bandpass=f=2500:width_type=q:width=2[n];aevalsrc='exp(-350*t)+0.8*gte(t,0.035)*exp(-350*(t-0.035))':${E}:d=0.2[e];[n][e]amultiply[a];aevalsrc='0.5*sin(2*PI*1200*t)*(exp(-120*t)+0.8*gte(t,0.035)*exp(-120*(t-0.035)))':${E}:d=0.2[b];[a][b]amix=inputs=2:normalize=0,afade=t=out:st=0.17:d=0.03[out]`,
  },
  {
    archivo: "ui.mp3", clase: "impact", P: -7.0,
    grafo: `aevalsrc='min(1,t/0.001)*(sin(2*PI*1320*t)*exp(-45*t)+0.25*sin(2*PI*2640*t)*exp(-70*t))':${E}:d=0.12,afade=t=out:st=0.1:d=0.02[out]`,
  },
  {
    archivo: "tick.mp3", clase: "texture", P: -4.6,
    grafo: `aevalsrc='st(0,mod(t,1));st(1,if(lt(mod(t,2),1),2500,2000));min(1,ld(0)/0.0005)*exp(-150*ld(0))*(sin(2*PI*ld(1)*ld(0))+0.4*sin(2*PI*2.7*ld(1)*ld(0)))':${E}:d=4[out]`,
  },
  // ── pop / elástico: golpe en t=0 ──
  { archivo: "pop.mp3", clase: "impact", P: -6.0, grafo: `aevalsrc='sin(2*PI*(250*t+14.444*(1-exp(-45*t))))*exp(-38*t)*min(1,t/0.0008)':${E}:d=0.18,afade=t=out:st=0.14:d=0.04[out]` },
  { archivo: "pop-02.mp3", clase: "impact", P: -13.4, grafo: `aevalsrc='sin(2*PI*(200*t+12.5*(1-exp(-40*t))))*exp(-32*t)*min(1,t/0.0008)':${E}:d=0.20,afade=t=out:st=0.16:d=0.04[out]` },
  { archivo: "pop-03.mp3", clase: "impact", P: -12.2, grafo: `aevalsrc='sin(2*PI*(350*t+15.4545*(1-exp(-55*t))))*exp(-50*t)*min(1,t/0.0008)':${E}:d=0.14,afade=t=out:st=0.11:d=0.03[out]` },
  { archivo: "boing.mp3", clase: "impact", P: 0.0, grafo: `aevalsrc='(sin(2*PI*(200*t+30*t*t)+4*sin(2*PI*14*t)*exp(-3*t))+0.3*sin(4*PI*(200*t+30*t*t)))*exp(-3.5*t)*min(1,t/0.001)':${E}:d=0.9,afade=t=out:st=0.75:d=0.15[out]` },
  // ── notificación / app ──
  {
    archivo: "notification.wav", clase: "impact", P: -11.4,
    grafo: `aevalsrc='min(1,t/0.001)*(sin(2*PI*880*t)+0.3*sin(2*PI*1760*t))*exp(-6*t)+0.6*gte(t,0.12)*min(1,(t-0.12)/0.001)*(sin(2*PI*1318.5*t)+0.3*sin(2*PI*2637*t))*exp(-5*(t-0.12))':${E}:d=1.0,afade=t=out:st=0.8:d=0.2[out]`,
  },
  {
    archivo: "msg-send.wav", clase: "impact", P: -0.1,
    grafo: `aevalsrc='sin(2*PI*(600*t+if(lt(t,0.12),3750*t*t,54+900*(t-0.12))))*min(1,t/0.003)*exp(-9*t)':${E}:d=0.35[a];anoisesrc=d=0.35:c=white:${N}:seed=161,highpass=f=3000[n];aevalsrc='0.2*exp(-20*t)':${E}:d=0.35[e];[n][e]amultiply[b];[a][b]amix=inputs=2:normalize=0,afade=t=out:st=0.3:d=0.05[out]`,
  },
  // ── datos / tech ──
  {
    archivo: "data-count.mp3", clase: "texture", P: -9.3,
    grafo: `aevalsrc='st(0,floor(t/0.05));st(1,t-ld(0)*0.05);min(1,ld(1)/0.0005)*exp(-220*ld(1))*sin(2*PI*(1000+150*mod(ld(0)*7,5))*ld(1))':${E}:d=3[out]`,
  },
  {
    archivo: "digital.wav", clase: "texture", P: -2.3,
    grafo: `aevalsrc='sin(2*PI*(600*t+400*t*t)+5*sin(2*PI*45*t))*min(1,t/0.003)*(1-0.3*t)':${E}:d=1.5,acrusher=bits=6:mode=lin:samples=6:mix=0.6,afade=t=out:st=1.3:d=0.2[out]`,
  },
  { archivo: "glitch.wav", clase: "impact", P: -20.6, grafo: GL("0.60", "0.030", "180", "171", "3", "5") },
  { archivo: "glitch-02.wav", clase: "impact", P: -2.4, grafo: GL("0.55", "0.025", "240", "172", "4", "6") },
  { archivo: "glitch-03.wav", clase: "impact", P: -6.3, grafo: GL("0.70", "0.040", "140", "173", "3", "4") },
  {
    archivo: "electric.mp3", clase: "impact", P: -1.6,
    grafo: `aevalsrc='2*(t*100-floor(t*100+0.5))*exp(-5*t)*min(1,t/0.001)':${E}:d=0.8,lowpass=f=3000[a];anoisesrc=d=0.8:c=velvet:${N}:seed=181,highpass=f=2500[n];aevalsrc='exp(-6*t)':${E}:d=0.8[e];[n][e]amultiply[b];[a][b]amix=inputs=2:weights='1 0.8':normalize=0,tremolo=f=30:d=0.6,afade=t=out:st=0.65:d=0.15[out]`,
  },
  {
    archivo: "spin.wav", clase: "texture", P: -11.5,
    grafo: `anoisesrc=d=2:c=pink:${N}:seed=191,bandpass=f=900:width_type=q:width=2[n];aevalsrc='0.5*sin(2*PI*180*t)':${E}:d=2[s];[n][s]amix=inputs=2:normalize=0,tremolo=f=14:d=0.8,afade=t=in:d=0.05,afade=t=out:st=1.7:d=0.3[out]`,
  },
  {
    archivo: "typing.mp3", clase: "texture", P: -7.9,
    grafo: `anoisesrc=d=3:c=white:${N}:seed=195,bandpass=f=2500:width_type=q:width=0.8,lowpass=f=6000[n];aevalsrc='exp(-300*mod(t,0.14))+0.8*gte(t,0.16)*exp(-300*mod(t-0.16,0.23))':${E}:d=3[e];[n][e]amultiply,afade=t=out:st=2.9:d=0.1[out]`,
  },
  // ── acierto / error / dinero ──
  {
    archivo: "chime.mp3", clase: "impact", P: -5.3,
    grafo: `aevalsrc='min(1,t/0.001)*(sin(2*PI*1046.5*t)*exp(-3*t)+0.5*sin(2*PI*2093*t)*exp(-5*t)+0.35*sin(2*PI*3139.5*t)*exp(-7*t)+0.2*sin(2*PI*4395*t)*exp(-10*t)+0.12*sin(2*PI*5651*t)*exp(-14*t))':${E}:d=1.5,afade=t=out:st=1.2:d=0.3[out]`,
  },
  {
    archivo: "chime-02.mp3", clase: "impact", P: -7.4,
    grafo: `aevalsrc='min(1,t/0.001)*(sin(2*PI*1318.5*t)*exp(-5*t)+0.4*sin(2*PI*1318.5*2.76*t)*exp(-8*t)+0.2*sin(2*PI*1318.5*5.4*t)*exp(-12*t))':${E}:d=1.0,afade=t=out:st=0.8:d=0.2[out]`,
  },
  {
    archivo: "chime-03.mp3", clase: "impact", P: 0.0,
    grafo: `aevalsrc='min(1,t/0.001)*(sin(2*PI*1046.5*t)+0.3*sin(2*PI*2093*t))*exp(-4*t)+0.6*gte(t,0.1)*min(1,(t-0.1)/0.001)*(sin(2*PI*1568*t)+0.3*sin(2*PI*3136*t))*exp(-4*(t-0.1))+0.45*gte(t,0.2)*min(1,(t-0.2)/0.001)*(sin(2*PI*2093*t)+0.3*sin(2*PI*4186*t))*exp(-3*(t-0.2))':${E}:d=2.0,afade=t=out:st=1.6:d=0.4[out]`,
  },
  {
    archivo: "success.wav", clase: "impact", P: -0.4,
    grafo: `aevalsrc='exp(-12*t)*(sin(2*PI*523.25*t)+0.3*sin(2*PI*1046.5*t))*min(1,t/0.001)+0.85*gte(t,0.07)*exp(-12*(t-0.07))*(sin(2*PI*659.25*t)+0.3*sin(2*PI*1318.5*t))*min(1,(t-0.07)/0.001)+0.75*gte(t,0.14)*exp(-12*(t-0.14))*(sin(2*PI*783.99*t)+0.3*sin(2*PI*1567.98*t))*min(1,(t-0.14)/0.001)+0.7*gte(t,0.21)*exp(-5*(t-0.21))*(sin(2*PI*1046.5*t)+0.3*sin(2*PI*2093*t))*min(1,(t-0.21)/0.001)':${E}:d=0.9,afade=t=out:st=0.75:d=0.15[out]`,
  },
  {
    archivo: "error.mp3", clase: "impact", P: -8.9,
    grafo: `aevalsrc='lt(t,0.15)*exp(-3*t)*min(1,t/0.003)*min(1,(0.15-t)/0.01)*(sin(2*PI*311*t)+0.33*sin(2*PI*933*t))+0.8*gte(t,0.17)*lt(t,0.40)*min(1,(t-0.17)/0.003)*min(1,(0.40-t)/0.01)*(sin(2*PI*233*t)+0.33*sin(2*PI*699*t))':${E}:d=0.45,lowpass=f=2500[out]`,
  },
  {
    archivo: "money.mp3", clase: "impact", P: -4.2,
    grafo: `anoisesrc=d=0.9:c=white:${N}:seed=201,bandpass=f=4500:width_type=q:width=1[n];aevalsrc='exp(-120*t)*min(1,t/0.0005)':${E}:d=0.9[e];[n][e]amultiply[a];aevalsrc='gte(t,0.015)*min(1,(t-0.015)/0.001)*(sin(2*PI*2637*t)*exp(-6*(t-0.015))+0.6*sin(2*PI*3951*t)*exp(-8*(t-0.015))+0.3*sin(2*PI*5274*t)*exp(-10*(t-0.015)))':${E}:d=0.9[b];[a][b]amix=inputs=2:weights='0.8 1':normalize=0,afade=t=out:st=0.75:d=0.15[out]`,
  },
  {
    archivo: "coin.mp3", clase: "impact", P: 0.0,
    grafo: `aevalsrc='(lt(t,0.06)*sgn(sin(2*PI*1046.5*t))+0.8*gte(t,0.06)*sgn(sin(2*PI*1568*t))*exp(-6*(t-0.06)))*min(1,t/0.001)*0.5':${E}:d=0.45,lowpass=f=7000,afade=t=out:st=0.4:d=0.05[out]`,
  },
  // ── materiales / trazo / partículas ──
  {
    archivo: "scribble.mp3", clase: "texture", P: -2.8,
    grafo: `anoisesrc=d=1.5:c=pink:${N}:seed=331,bandpass=f=3000:width_type=q:width=0.7[n];aevalsrc='abs(sin(2*PI*4.3*t+0.6))*(0.6+0.4*sin(2*PI*1.7*t))*min(1,t/0.01)':${E}:d=1.5[e];[n][e]amultiply,afade=t=out:st=1.4:d=0.1[out]`,
  },
  {
    archivo: "paper.wav", clase: "impact", P: 0.0,
    grafo: `anoisesrc=d=0.7:c=white:${N}:seed=341,highpass=f=700,lowpass=f=7000[n];aevalsrc='min(1,t/0.008)*exp(-6*t)':${E}:d=0.7[e];[n][e]amultiply[a];anoisesrc=d=0.7:c=velvet:${N}:seed=342,highpass=f=2000[v];aevalsrc='exp(-8*t)':${E}:d=0.7[ev];[v][ev]amultiply[b];[a][b]amix=inputs=2:weights='1 0.7':normalize=0,afade=t=out:st=0.6:d=0.1[out]`,
  },
  {
    archivo: "liquid.mp3", clase: "impact", P: -2.3,
    grafo: `aevalsrc='st(0,if(lt(t,0.13),t,t-0.13));st(1,if(lt(t,0.13),1,0.7));ld(1)*sin(2*PI*(300*ld(0)+700*(ld(0)-(1-exp(-60*ld(0)))/60)))*exp(-25*ld(0))*min(1,ld(0)/0.001)':${E}:d=0.5,afade=t=out:st=0.45:d=0.05[out]`,
  },
  {
    archivo: "sparkle.mp3", clase: "impact", P: -6.3,
    grafo: `aevalsrc='gte(t,0)*exp(-40*t)*sin(2*PI*4200*t)+0.9*gte(t,0.09)*exp(-40*(t-0.09))*sin(2*PI*5600*(t-0.09))+0.8*gte(t,0.21)*exp(-40*(t-0.21))*sin(2*PI*3800*(t-0.21))+0.7*gte(t,0.30)*exp(-40*(t-0.30))*sin(2*PI*6300*(t-0.30))+0.6*gte(t,0.45)*exp(-40*(t-0.45))*sin(2*PI*4700*(t-0.45))+0.5*gte(t,0.58)*exp(-40*(t-0.58))*sin(2*PI*7100*(t-0.58))+0.4*gte(t,0.74)*exp(-40*(t-0.74))*sin(2*PI*5200*(t-0.74))':${E}:d=1.2,afade=t=out:st=1.0:d=0.2[out]`,
  },
  {
    archivo: "sparkle-02.mp3", clase: "impact", P: -3.8,
    grafo: `aevalsrc='st(0,floor(t/0.15));st(1,t-ld(0)*0.15);lt(ld(0),10)*exp(-30*ld(1))*sin(2*PI*(3000+400*ld(0))*ld(1))*(1-0.06*ld(0))*min(1,ld(1)/0.0005)':${E}:d=2.0[out]`,
  },
  {
    archivo: "sparkle-03.wav", clase: "impact", P: -6.0,
    grafo: `aevalsrc='exp(-45*t)*sin(2*PI*6000*t)+0.8*gte(t,0.05)*exp(-45*(t-0.05))*sin(2*PI*7400*(t-0.05))+0.7*gte(t,0.11)*exp(-45*(t-0.11))*sin(2*PI*5200*(t-0.11))+0.6*gte(t,0.18)*exp(-45*(t-0.18))*sin(2*PI*8100*(t-0.18))':${E}:d=0.6,afade=t=out:st=0.5:d=0.1[out]`,
  },
  // ── logo / cómico / ambiente ──
  {
    archivo: "logo.mp3", clase: "impact", P: -2.2,
    grafo: `aevalsrc='min(1,t/0.002)*(0.8*sin(2*PI*55*t)*exp(-4*t)+0.35*(sin(2*PI*523.25*t)+sin(2*PI*659.25*t)+sin(2*PI*783.99*t)+0.6*sin(2*PI*1046.5*t))*exp(-1.5*t)+0.15*sin(2*PI*3139.5*t)*exp(-3*t))':${E}:d=2.5,afade=t=out:st=2.0:d=0.5[out]`,
  },
  {
    archivo: "cartoon.mp3", clase: "impact", P: -12.6,
    grafo: `aevalsrc='lt(t,0.62)*exp(-1.5*t)*sin(2*PI*(1400*t-833.33*t*t)+2*sin(2*PI*9*t))*min(1,t/0.004)*min(1,(0.62-t)/0.05)':${E}:d=0.7[out]`,
  },
  {
    archivo: "ambient-wind.mp3", clase: "texture", P: -6.6,
    grafo: `anoisesrc=d=8:c=pink:${N}:seed=901,lowpass=f=700,highpass=f=80[n];aevalsrc='0.55+0.45*sin(2*PI*0.25*t)*sin(2*PI*0.125*t+1)':${E}:d=8[e];[n][e]amultiply[out]`,
  },
];

// ── ffmpeg ──────────────────────────────────────────────────────────────────────

let FFMPEG = null;

/**
 * Localiza ffmpeg y comprueba que trae los filtros y codificadores de las recetas.
 * Devuelve la primera línea de `-version` (va al manifiesto). Si falta algo, aborta
 * con la pista de instalación: el ffmpeg de Remotion se compila con --disable-filters
 * y es el fallo típico en una máquina recién instalada.
 */
export function comprobarFfmpeg({ soloDecodificar = false } = {}) {
  FFMPEG = binario("ffmpeg");
  if (!FFMPEG) abortar(`no encuentro ffmpeg.\n${PISTA_FFMPEG}`);
  const version = (ejecutar(FFMPEG, ["-version"]).stdout.split(/\r?\n/)[0] || "").trim();
  const filtros = ejecutar(FFMPEG, ["-hide_banner", "-filters"]).stdout;
  const necesarios = soloDecodificar ? ["astats", "volumedetect"] : FILTROS;
  const faltan = necesarios.filter((f) => !new RegExp(`^\\s*\\S+\\s+${f}\\s`, "m").test(filtros));
  if (!soloDecodificar) {
    const enc = ejecutar(FFMPEG, ["-hide_banner", "-encoders"]).stdout;
    for (const e of ENCODERS) if (!new RegExp(`^\\s*\\S+\\s+${e}\\s`, "m").test(enc)) faltan.push(`codificador ${e}`);
  }
  if (faltan.length) {
    abortar(`el ffmpeg de ${posix(FFMPEG)} no trae: ${faltan.join(", ")}.\n` +
      `   Hace falta un ffmpeg COMPLETO (el que trae Remotion se compila sin filtros y no vale).\n${PISTA_FFMPEG}`);
  }
  return version;
}

const PISTA_FFMPEG =
  "   · node herramientas/setup.mjs  → lo instala en tu carpeta de herramientas, sin administrador\n" +
  "   · o instálalo con tu gestor de paquetes: macOS → Homebrew (paquete ffmpeg) · Windows → winget (paquete Gyan.FFmpeg) · Linux → el paquete ffmpeg de tu distribución";

/** Pico de muestra con astats (centésimas de dB): es el que usa la normalización. */
function picoAstats(ruta) {
  const r = ejecutar(FFMPEG, ["-nostdin", "-hide_banner", "-nostats", "-i", ruta, "-af", "astats=measure_perchannel=none:measure_overall=Peak_level", "-f", "null", "-"], { check: true });
  const m = (r.stderr + r.stdout).match(/Peak level dB:\s*(-?[\d.]+|-inf)/);
  if (!m) throw new Error(`astats no devolvió el pico de ${posix(ruta)}`);
  return m[1] === "-inf" ? -Infinity : Number(m[1]);
}

/**
 * Pico de muestra con volumedetect (décimas de dB). Es el que calibró los `vol` de
 * cues.ts, así que es el que se enseña y del que se deriva el vol sugerido: con
 * astats saldrían números distintos en la tercera cifra y el usuario dudaría.
 */
function picoVolumedetect(ruta) {
  const r = ejecutar(FFMPEG, ["-nostdin", "-hide_banner", "-nostats", "-i", ruta, "-af", "volumedetect", "-f", "null", "-"]);
  const m = (r.stderr + r.stdout).match(/max_volume:\s*(-?[\d.]+)\s*dB/);
  return m ? Number(m[1]) : null;
}

// ── Helpers ─────────────────────────────────────────────────────────────────────

const sha256 = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const round1 = (x) => Math.round(x * 10) / 10;
const dB = (x) => (x === -Infinity ? "  -inf" : (Math.abs(x) < 0.05 ? 0 : x).toFixed(1).padStart(6));

/** Familia de mezcla por nombre de archivo: la misma regla con la que se calibraron los `vol`. */
export function bucketPorNombre(nombre) {
  if (/^(whoosh-|swoosh)/.test(nombre)) return "whoosh";
  if (/^(impact-|metal)/.test(nombre)) return "impact";
  if (/^ambient-/.test(nombre)) return "ambient";
  return "general";
}

/** `vol` lineal para que un pico `pico` dBFS caiga en el objetivo de su familia (tope 0,03…1). */
export function volSugerido(nombre, pico) {
  const v = Math.pow(10, (OBJETIVO[bucketPorNombre(nombre)] - pico) / 20);
  return Number(Math.min(1, Math.max(0.03, v)).toFixed(3));
}

/**
 * Los archivos que espera el motor, con su `vol`, leídos de cues.ts con una regex:
 * el mapa SFX y el POOL son datos literales y así el script no compila TypeScript.
 * Devuelve Map<nombre, {vol, bucket}>. Un nombre repetido (impact-deep en deep y
 * boom; el índice 0 de cada pool) tiene que traer el mismo vol.
 */
export function esperadosPorCues() {
  const txt = leerTexto(CUES_TS);
  const re = /file:\s*"([^"]+)",\s*vol:\s*([0-9.]+)(?:,\s*bucket:\s*"(\w+)")?/g;
  const mapa = new Map();
  for (const m of txt.matchAll(re)) {
    const [, file, volTxt, bucket] = m;
    const vol = Number(volTxt);
    const previo = mapa.get(file);
    if (previo && previo.vol !== vol) throw new Error(`cues.ts da dos vol distintos a ${file}: ${previo.vol} y ${vol}`);
    const b = bucket || previo?.bucket || bucketPorNombre(file);
    if (b !== bucketPorNombre(file)) throw new Error(`cues.ts pone ${file} en el bucket «${b}» y la regla por nombre dice «${bucketPorNombre(file)}»: revisa una de las dos`);
    mapa.set(file, { vol, bucket: b });
  }
  if (mapa.size === 0) throw new Error(`no encuentro ningún «file: … vol: …» en ${relativa(CUES_TS)}`);
  return mapa;
}

/**
 * Pico objetivo de un archivo: el que implica su `vol` en cues.ts
 * (P = TARGET_DBFS[bucket] − 20·log10(vol), redondeado a la décima con la que se
 * calibró), con el techo del contenedor. Así cues.ts sigue siendo la única verdad.
 */
export function picoObjetivo(nombre, vol) {
  const bruto = round1(OBJETIVO[bucketPorNombre(nombre)] - 20 * Math.log10(vol));
  return Math.min(TECHO[path.extname(nombre).toLowerCase()] ?? -1.0, bruto);
}

/** Ruta para mensajes: relativa a la raíz si cae dentro del repo, absoluta (con «/») si no. */
function mostrar(p) {
  const rel = relativa(p);
  return rel === "" ? "." : rel.startsWith("..") ? posix(p) : rel;
}

function leerManifiesto(dir) {
  try {
    return leerJSON(path.join(dir, MANIFIESTO));
  } catch {
    return null;
  }
}

function resolverDir(valor, defecto) {
  if (!valor || valor === true) return defecto;
  return path.isAbsolute(valor) ? valor : path.resolve(process.cwd(), valor);
}

const ahora = () => new Date().toISOString();

// ── medir ───────────────────────────────────────────────────────────────────────

/**
 * Envolvente por frame (la misma de medir-sfx.py: decodifica a mono s16 48 kHz,
 * ventanas de sr/fps muestras, RMS en dBFS) más el pico de muestra y el «golpe»:
 * el primer instante en que la señal supera −20 dB de su pico (y el 25 % del
 * pico, que es el criterio de ataque de cues-009). Todo en una decodificación.
 */
export function medirArchivo(ruta, { fps = 30, umbral = 20, tmpDir } = {}) {
  const propio = !tmpDir;
  if (propio) tmpDir = carpetaTemporal("sfx-medir-");
  const raw = path.join(tmpDir, `${path.basename(ruta)}.${process.pid}.raw`);
  try {
    ejecutar(FFMPEG, ["-nostdin", "-v", "error", "-y", "-i", ruta, "-ac", "1", "-ar", String(SR), "-f", "s16le", raw], { check: true });
    const buf = fs.readFileSync(raw);
    const n = Math.floor(buf.length / 2);
    // Copia alineada: un Buffer pequeño puede vivir dentro del pool compartido de Node
    // con un offset impar, y un Int16Array sobre él lanzaría.
    const x = new Int16Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + n * 2));
    let pk = 0;
    for (let i = 0; i < n; i++) {
      const a = Math.abs(x[i]);
      if (a > pk) pk = a;
    }
    let golpe = -1;
    let golpe25 = -1;
    for (let i = 0; i < n && (golpe < 0 || golpe25 < 0); i++) {
      const a = Math.abs(x[i]);
      if (golpe < 0 && a >= 0.1 * pk) golpe = i;
      if (golpe25 < 0 && a >= 0.25 * pk) golpe25 = i;
    }
    const win = Math.floor(SR / fps);
    const env = [];
    for (let i = 0; i + win <= n; i += win) {
      let s = 0;
      for (let j = i; j < i + win; j++) s += x[j] * x[j];
      env.push(10 * Math.log10(s / win / (32768 * 32768) + 1e-12));
    }
    let picoFrame = 0;
    for (let i = 1; i < env.length; i++) if (env[i] > env[picoFrame]) picoFrame = i;
    const audibles = env.map((e, i) => [e, i]).filter(([e]) => e > env[picoFrame] - umbral).map(([, i]) => i);
    const lin = env.map((e) => Math.pow(10, e / 10));
    const total = lin.reduce((a, b) => a + b, 0);
    let acc = 0;
    let f50 = 0;
    for (let i = 0; i < lin.length; i++) {
      acc += lin[i];
      if (acc >= total / 2) {
        f50 = i;
        break;
      }
    }
    return {
      archivo: path.basename(ruta),
      ruta: posix(ruta),
      fps,
      duracionS: Number((n / SR).toFixed(3)),
      frames: env.length,
      picoMuestraDbfs: pk ? Number((20 * Math.log10(pk / 32768)).toFixed(2)) : -Infinity,
      golpeMs: golpe < 0 ? null : Number(((golpe / SR) * 1000).toFixed(1)),
      golpe25Ms: golpe25 < 0 ? null : Number(((golpe25 / SR) * 1000).toFixed(1)),
      picoFrame,
      picoRmsDb: env.length ? Number(env[picoFrame].toFixed(1)) : null,
      audible: audibles.length ? [audibles[0], audibles[audibles.length - 1]] : null,
      f50,
    };
  } finally {
    fs.rmSync(raw, { force: true });
    if (propio) borrar(tmpDir);
  }
}

/** medir + pico volumedetect + vol sugerido: lo que se imprime en la tabla. */
export function medir(rutas, opts = {}) {
  const tmpDir = carpetaTemporal("sfx-medir-");
  try {
    return rutas.map((ruta) => {
      const m = medirArchivo(ruta, { ...opts, tmpDir });
      const pico = picoVolumedetect(ruta);
      return { ...m, picoDbfs: pico, bucket: bucketPorNombre(m.archivo), volSugerido: pico === null ? null : volSugerido(m.archivo, pico) };
    });
  } finally {
    borrar(tmpDir);
  }
}

function imprimirMedidas(medidas, fps) {
  console.log(`${"archivo".padEnd(22)} ${"dur".padStart(6)}  ${"pico".padStart(6)}  ${"golpe".padStart(8)}  ${"picoRMS".padEnd(13)} ${"audible".padEnd(10)} ${"50 %".padStart(5)}  ${"bucket".padEnd(8)} ${"vol".padStart(5)}   (frames @ ${fps} fps)`);
  for (const m of medidas) {
    const aud = m.audible ? `f${m.audible[0]}-f${m.audible[1]}` : "—";
    const golpe = m.golpeMs === null ? "—" : `${m.golpeMs.toFixed(0)} ms`;
    const picoRms = m.picoRmsDb === null ? "—" : `f${String(m.picoFrame).padStart(3)} ${m.picoRmsDb.toFixed(1).padStart(6)}dB`;
    console.log(`${m.archivo.padEnd(22)} ${m.duracionS.toFixed(2).padStart(5)}s  ${dB(m.picoDbfs ?? -Infinity)}  ${golpe.padStart(8)}  ${picoRms.padEnd(13)} ${aud.padEnd(10)} ${("f" + m.f50).padStart(5)}  ${m.bucket.padEnd(8)} ${m.volSugerido === null ? "    —" : m.volSugerido.toFixed(3)}`);
  }
}

// ── sintetizar ──────────────────────────────────────────────────────────────────

/**
 * Sintetiza UNA receta: render a float, medida del pico, codificación con la
 * ganancia justa y, en MP3, hasta PASADAS_MAX correcciones (el codificador mueve
 * el pico y no es lineal: se guarda la pasada que más cerca quedó). Devuelve
 * {pico, pasadas}. La escritura es atómica: nunca queda un archivo a medias.
 */
function sintetizarUno(receta, destino, P, tmpDir) {
  const nombre = receta.archivo;
  const mp3 = nombre.toLowerCase().endsWith(".mp3");
  const flotante = path.join(tmpDir, `${nombre}.f32.wav`);
  const comunes = ["-fflags", "+bitexact", "-flags:a", "+bitexact", "-map_metadata", "-1"];
  ejecutar(FFMPEG, ["-nostdin", "-v", "error", "-y", "-filter_complex", receta.grafo, "-map", "[out]", "-ac", "1", "-ar", String(SR), "-c:a", "pcm_f32le", ...comunes, flotante], { check: true });
  const pk = picoAstats(flotante);
  if (pk === -Infinity) throw new Error(`la receta de ${nombre} produce silencio`);
  // Sin ID3 ni etiqueta LAME: la cabecera Info del MP3 sí se conserva porque lleva
  // el recorte del retardo del codificador, y sin ella el golpe se iría ~25 ms.
  const enc = mp3 ? ["-c:a", "libmp3lame", "-b:a", "192k", "-id3v2_version", "0", "-write_id3v1", "0"] : ["-c:a", "pcm_s16le"];
  let g = P - pk;
  let mejor = null;
  for (let i = 1; i <= PASADAS_MAX; i++) {
    const salida = path.join(tmpDir, `${nombre}.${i}${path.extname(nombre)}`);
    ejecutar(FFMPEG, ["-nostdin", "-v", "error", "-y", "-i", flotante, "-af", `volume=${g.toFixed(4)}dB`, "-ac", "1", "-ar", String(SR), ...enc, ...comunes, salida], { check: true });
    const fin = picoAstats(salida);
    const err = P - fin;
    if (!mejor || Math.abs(err) < Math.abs(mejor.err)) mejor = { salida, pico: fin, err, pasadas: i };
    if (Math.abs(err) < TOLERANCIA_DB) break;
    g += err;
  }
  escribirAtomico(destino, fs.readFileSync(mejor.salida));
  return { pico: mejor.pico, pasadas: mejor.pasadas };
}

/** ¿Cae el golpe donde la clase de la receta promete? Devuelve null si sí, o el motivo. */
function validarGolpe(receta, m) {
  const ini = m.audible ? m.audible[0] : null;
  switch (receta.clase) {
    case "impact":
      if (ini !== 0 || m.picoFrame > 1) return `impact: audible desde f${ini}, pico en f${m.picoFrame} (se esperaba f0)`;
      return null;
    case "texture":
      if (ini !== 0) return `texture: audible desde f${ini} (se esperaba f0)`;
      return null;
    case "whoosh": {
      const esperado = Math.round(0.65 * (receta.dref * m.fps) / 30);
      if (Math.abs(m.picoFrame - esperado) > 1) return `whoosh: pico en f${m.picoFrame}, se esperaba f${esperado} (65 % de ${receta.dref} f)`;
      return null;
    }
    case "riser":
      if (m.picoFrame < m.frames - 3) return `riser: pico en f${m.picoFrame} de ${m.frames} (tiene que acabar al final)`;
      return null;
    default:
      return `clase desconocida «${receta.clase}»`;
  }
}

export function sintetizar({ destino = SFX_BASE, solo = null, forzar = false, fps = 30, medirAlFinal = true } = {}) {
  const version = comprobarFfmpeg();
  const esperados = esperadosPorCues();
  // El set y cues.ts tienen que ser la misma lista: si falta una receta, el motor
  // pediría un archivo que no existe (404 en mitad de un render); si sobra, es
  // audio muerto en el producto.
  const nombresRecetas = new Set(RECETAS.map((r) => r.archivo));
  const sinReceta = [...esperados.keys()].filter((n) => !nombresRecetas.has(n));
  const sinCue = [...nombresRecetas].filter((n) => !esperados.has(n));
  if (sinReceta.length || sinCue.length) {
    abortar(`cues.ts y las recetas no coinciden.\n   sin receta: ${sinReceta.join(", ") || "—"}\n   sin cue:    ${sinCue.join(", ") || "—"}`);
  }
  const manifiesto = leerManifiesto(destino);
  if (manifiesto?.modo === "banco") {
    abortar(`${mostrar(destino)} contiene un set copiado de un banco (${MANIFIESTO} dice modo «banco»).\n` +
      `   No lo piso: si de verdad quieres el set sintetizado ahí, borra ${posix(path.join(mostrar(destino), MANIFIESTO))} o usa otro --destino.`);
  }
  // Los MP3 no se reproducen byte a byte entre versiones de ffmpeg: libmp3lame
  // cambia de build y los bytes cambian aunque el sonido sea el mismo (los WAV
  // sí salen idénticos). Quien regenera un set nacido con otro ffmpeg tiene que
  // saberlo ANTES de escribir: sobre sfx-base/ son ~40 binarios versionados.
  if (manifiesto?.modo === "sintetico" && manifiesto.ffmpeg && manifiesto.ffmpeg !== version) {
    log.aviso(`el set de ${mostrar(destino)} se generó con «${manifiesto.ffmpeg}» y este ffmpeg es «${version}»: ` +
      `los .wav saldrán iguales, pero los .mp3 no serán byte a byte los mismos (otro libmp3lame)`);
  }
  const seleccion = solo ? RECETAS.filter((r) => solo.includes(r.archivo)) : RECETAS;
  if (solo) {
    const desconocidos = solo.filter((n) => !nombresRecetas.has(n));
    if (desconocidos.length) abortar(`no hay receta para: ${desconocidos.join(", ")}`);
  }
  fs.mkdirSync(destino, { recursive: true });
  if (forzar && !manifiesto) {
    // Sin manifiesto no se sabe qué hay ahí: puede ser un set propio del canal.
    const existentes = seleccion.filter((r) => fs.existsSync(path.join(destino, r.archivo))).length;
    if (existentes) log.aviso(`--forzar va a sobrescribir ${existentes} archivo(s) de procedencia desconocida en ${mostrar(destino)} (no hay ${MANIFIESTO})`);
  }
  log.titulo(`Sintetizando ${seleccion.length} SFX en ${mostrar(destino)} (${version})`);
  const tmpDir = carpetaTemporal("sfx-sint-");
  const hechos = [];
  const saltados = [];
  const t0 = Date.now();
  try {
    for (const receta of seleccion) {
      const ruta = path.join(destino, receta.archivo);
      if (fs.existsSync(ruta) && !forzar) {
        saltados.push(receta.archivo);
        continue;
      }
      // El pico objetivo es el de la receta (el que calibró el `vol`) mientras cues.ts
      // lo confirme dentro del redondeo: un `vol` de 3 decimales invertido puede caer
      // en la frontera de la décima. Si cues.ts se aleja más, es que alguien cambió el
      // vol a propósito y entonces manda cues.ts.
      const Pcues = picoObjetivo(receta.archivo, esperados.get(receta.archivo).vol);
      let P = receta.P;
      if (Math.abs(Pcues - receta.P) > 0.15) {
        log.aviso(`${receta.archivo}: cues.ts implica un pico de ${Pcues} dBFS y la receta documenta ${receta.P}; mando cues.ts`);
        P = Pcues;
      }
      const r = sintetizarUno(receta, ruta, P, tmpDir);
      hechos.push({ receta, ruta, P, ...r });
      console.log(`  ✓ ${receta.archivo.padEnd(22)} objetivo ${dB(P)}  pico ${r.pico.toFixed(2).padStart(7)}  (${r.pasadas} pasada${r.pasadas > 1 ? "s" : ""})`);
    }
  } finally {
    borrar(tmpDir);
  }
  if (saltados.length) log.info(`${saltados.length} ya existían y no se han tocado (usa --forzar para regenerarlos): ${saltados.join(", ")}`);
  log.info(`${hechos.length} generados en ${((Date.now() - t0) / 1000).toFixed(1)} s`);

  // Validación del golpe y manifiesto: sobre TODO lo que hay en el destino, no solo
  // lo recién hecho, para que el manifiesto describa la carpeta entera.
  const presentes = RECETAS.filter((r) => fs.existsSync(path.join(destino, r.archivo)));
  const archivos = {};
  let avisos = 0;
  if (medirAlFinal && presentes.length) {
    log.titulo(`Golpe y pico de ${presentes.length} archivos (frames @ ${fps} fps)`);
    const medidas = medir(presentes.map((r) => path.join(destino, r.archivo)), { fps });
    imprimirMedidas(medidas, fps);
    for (const m of medidas) {
      const receta = presentes.find((r) => r.archivo === m.archivo);
      const problema = validarGolpe(receta, m);
      if (problema) {
        avisos++;
        log.aviso(`${m.archivo}: ${problema}`);
      }
      const ruta = path.join(destino, m.archivo);
      archivos[m.archivo] = { sha256: sha256(ruta), bytes: fs.statSync(ruta).size, picoDbfs: m.picoDbfs, golpeMs: m.golpeMs, picoFrame: m.picoFrame, clase: receta.clase };
    }
  } else {
    for (const r of presentes) {
      const ruta = path.join(destino, r.archivo);
      archivos[r.archivo] = { sha256: sha256(ruta), bytes: fs.statSync(ruta).size, clase: r.clase };
    }
  }
  escribirJSON(path.join(destino, MANIFIESTO), { modo: "sintetico", fecha: ahora(), ffmpeg: version, plataforma: plataforma(), fps, archivos });
  const faltan = RECETAS.length - presentes.length;
  if (faltan) log.aviso(`el set está incompleto: faltan ${faltan} de ${RECETAS.length}`);
  if (avisos) log.aviso(`${avisos} archivo(s) no cumplen el golpe de su clase: revisa la receta`);
  else log.ok(`${presentes.length} archivos con el golpe donde promete su clase · manifiesto en ${posix(path.join(mostrar(destino), MANIFIESTO))}`);
  return { hechos, saltados, avisos, presentes: presentes.length };
}

// ── desde-base ──────────────────────────────────────────────────────────────────

/**
 * Copia el set versionado (sfx-base/) al destino. Es lo que hace el instalador:
 * no depende de ffmpeg y los bytes son los mismos en macOS, Windows y Linux.
 * Solo copia los que faltan (--forzar los repone todos) y nunca pisa un set
 * copiado de un banco.
 */
export function desdeBase({ destino = PUBLIC_SFX, forzar = false } = {}) {
  if (!fs.existsSync(SFX_BASE)) abortar(`no existe ${relativa(SFX_BASE)}: regenéralo con «node manuales/diseno-sonoro/scripts/sfx.mjs sintetizar»`);
  const manifiesto = leerManifiesto(destino);
  if (manifiesto?.modo === "banco") {
    abortar(`${mostrar(destino)} contiene un set copiado de un banco (${MANIFIESTO} dice modo «banco»): no lo piso.`);
  }
  const base = leerManifiesto(SFX_BASE);
  fs.mkdirSync(destino, { recursive: true });
  log.titulo(`Copiando el set base a ${mostrar(destino)}`);
  let copiados = 0;
  let saltados = 0;
  const faltan = [];
  const archivos = {};
  for (const r of RECETAS) {
    const origen = path.join(SFX_BASE, r.archivo);
    const dst = path.join(destino, r.archivo);
    if (!fs.existsSync(origen)) {
      faltan.push(r.archivo);
      continue;
    }
    const saltado = fs.existsSync(dst) && !forzar;
    if (saltado) saltados++;
    else {
      fs.copyFileSync(origen, dst);
      copiados++;
    }
    const h = sha256(dst);
    const esperado = base?.archivos?.[r.archivo]?.sha256;
    if (esperado && h !== esperado) {
      // Un archivo que ya estaba y difiere es, casi seguro, uno propio del canal: se
      // conserva y se dice. Uno recién copiado que difiere es un sfx-base corrupto.
      if (saltado) log.info(`${r.archivo}: ya existía y no es el del set base (se conserva)`);
      else log.aviso(`${r.archivo}: el sha256 no coincide con el manifiesto de sfx-base`);
    }
    archivos[r.archivo] = h;
  }
  if (faltan.length) abortar(`faltan en ${relativa(SFX_BASE)}: ${faltan.join(", ")}. Regenéralo con «node manuales/diseno-sonoro/scripts/sfx.mjs sintetizar --forzar».`);
  escribirJSON(path.join(destino, MANIFIESTO), { modo: "base", fecha: ahora(), origen: relativa(SFX_BASE), archivos });
  log.ok(`${copiados} copiados · ${saltados} ya estaban · manifiesto en ${posix(path.join(mostrar(destino), MANIFIESTO))}`);
  return { copiados, saltados };
}

// ── desde-banco ─────────────────────────────────────────────────────────────────

/**
 * Copia los SFX desde un banco propio según el mapa JSON:
 *   { "version": 1, "banco": "sonido", "destino": "remotion/public/sfx",
 *     "entradas": [ { "destino": "pop.mp3", "origen": "carpeta/archivo.mp3", "sha256": "…" }, … ] }
 * Los bytes se copian TAL CUAL (sin transcodificar ni corregir extensiones: dos
 * archivos del set original son WAV con extensión .mp3 y el motor los lee bien) y
 * el sha256, si viene, se comprueba: si el banco cambió, se sabe aquí y no en el
 * render de una pieza publicada. Al final mide el pico y sugiere el `vol` de cada
 * archivo, que es lo que hay que copiar a cues.ts si se cambia alguno.
 */
export function desdeBanco({ mapa = MAPA_BANCO_DEFECTO, banco = null, destino = null, medirAlFinal = true } = {}) {
  if (!fs.existsSync(mapa)) abortar(`no existe el mapa ${mostrar(mapa)}`);
  const m = leerJSON(mapa);
  if (m.version !== 1 || !Array.isArray(m.entradas)) abortar(`${mostrar(mapa)}: se esperaba {version: 1, entradas: [...]}`);
  const dirBanco = banco ?? desdeRaiz(...(m.banco || "sonido").split("/"));
  const dirDestino = destino ?? desdeRaiz(...(m.destino || "remotion/public/sfx").split("/"));
  if (!fs.existsSync(dirBanco)) abortar(`no existe el banco ${mostrar(dirBanco)}`);
  fs.mkdirSync(dirDestino, { recursive: true });
  log.titulo(`Copiando ${m.entradas.length} SFX del banco ${mostrar(dirBanco)} a ${mostrar(dirDestino)}`);
  let ok = 0;
  const faltantes = [];
  const distintos = [];
  const archivos = {};
  for (const e of m.entradas) {
    const origen = path.join(dirBanco, ...e.origen.split("/"));
    const dst = path.join(dirDestino, e.destino);
    if (!fs.existsSync(origen)) {
      console.log(`  ✗ falta: ${posix(path.join(mostrar(dirBanco), e.origen))}`);
      faltantes.push(e.destino);
      continue;
    }
    fs.copyFileSync(origen, dst);
    const h = sha256(dst);
    if (e.sha256 && h !== e.sha256) {
      console.log(`  ✗ ${e.destino}: sha256 ${h.slice(0, 12)}… ≠ ${e.sha256.slice(0, 12)}… (el banco ha cambiado)`);
      distintos.push(e.destino);
      continue;
    }
    console.log(`  ✓ ${e.destino}`);
    archivos[e.destino] = h;
    ok++;
  }
  console.log(`Copiados: ${ok}  ·  Faltantes: ${faltantes.length}  ·  Distintos: ${distintos.length}`);
  if (faltantes.length || distintos.length) {
    // Igual que el script original: un set incompleto no se da por bueno, porque
    // el fallo aparecería mucho después como un <Audio> con 404 en mitad de un render.
    abortar(`el set de ${mostrar(dirDestino)} está incompleto o no coincide con el mapa. Repón el banco o corrige el mapa antes de usarlo.`);
  }
  escribirJSON(path.join(dirDestino, MANIFIESTO), { modo: "banco", fecha: ahora(), mapa: mostrar(mapa), banco: mostrar(dirBanco), archivos });
  if (medirAlFinal) {
    comprobarFfmpeg({ soloDecodificar: true });
    log.titulo("Niveles medidos y vol sugerido (cópialos al mapa SFX/POOL de cues.ts si cambiaste algo)");
    console.log(`  ${"archivo".padEnd(24)} ${"bucket".padEnd(8)} ${"pico".padStart(7)} ${"vol".padStart(6)}`);
    const nombres = fs.readdirSync(dirDestino).filter((n) => /\.(mp3|wav)$/i.test(n));
    // Primero los .mp3 y luego los .wav, cada grupo en orden alfabético: el orden del glob original.
    const orden = [...nombres.filter((n) => /\.mp3$/i.test(n)).sort(), ...nombres.filter((n) => /\.wav$/i.test(n)).sort()];
    for (const n of orden) {
      const pico = picoVolumedetect(path.join(dirDestino, n));
      if (pico === null) {
        console.log(`  ${n.padEnd(24)} ${"?".padEnd(8)} ${"?".padStart(7)} ${"?".padStart(6)}`);
        continue;
      }
      console.log(`  ${n.padEnd(24)} ${bucketPorNombre(n).padEnd(8)} ${pico.toFixed(1).padStart(7)} ${volSugerido(n, pico).toFixed(3).padStart(6)}`);
    }
  }
  log.ok(`set del banco en ${mostrar(dirDestino)} · manifiesto ${MANIFIESTO} con modo «banco»`);
  return { ok };
}

// ── CLI ─────────────────────────────────────────────────────────────────────────

const USO = `uso:
  node manuales/diseno-sonoro/scripts/sfx.mjs sintetizar  [--destino DIR] [--solo a.mp3,b.wav] [--forzar] [--fps 30] [--sin-medir]
  node manuales/diseno-sonoro/scripts/sfx.mjs desde-base  [--destino DIR] [--forzar]
  node manuales/diseno-sonoro/scripts/sfx.mjs desde-banco [MAPA.json] [--banco DIR] [--destino DIR] [--sin-medir]
  node manuales/diseno-sonoro/scripts/sfx.mjs medir       [ARCHIVO…] [--dir DIR] [--fps 30] [--umbral 20] [--json]

  sintetizar   genera los 55 SFX originales (ffmpeg lavfi) en manuales/diseno-sonoro/sfx-base/
  desde-base   copia ese set a remotion/public/sfx/ (lo que llama el instalador; sin ffmpeg)
  desde-banco  copia desde un banco propio según un mapa JSON (por defecto sonido/mapa-sfx.json)
  medir        golpe, pico y vol sugerido de cada archivo (por defecto, todo remotion/public/sfx/)
`;

function main() {
  const f = flags();
  const modo = f._[0];
  if (!modo || f.help || f.h) {
    console.log(USO);
    process.exit(f.help || f.h ? 0 : 1);
  }
  const fps = Number(f.fps || 30);
  if (!(fps > 0)) abortar(`--fps tiene que ser un número positivo, no «${f.fps}»`);
  try {
    if (modo === "sintetizar") {
      const solo = typeof f.solo === "string" ? f.solo.split(",").map((s) => s.trim()).filter(Boolean) : null;
      const r = sintetizar({ destino: resolverDir(f.destino, SFX_BASE), solo, forzar: !!f.forzar, fps, medirAlFinal: !f["sin-medir"] });
      process.exit(r.avisos ? 2 : 0);
    }
    if (modo === "desde-base") {
      desdeBase({ destino: resolverDir(f.destino, PUBLIC_SFX), forzar: !!f.forzar });
      return;
    }
    if (modo === "desde-banco") {
      const mapa = resolverDir(f._[1], MAPA_BANCO_DEFECTO);
      desdeBanco({ mapa, banco: f.banco ? resolverDir(f.banco) : null, destino: f.destino ? resolverDir(f.destino) : null, medirAlFinal: !f["sin-medir"] });
      return;
    }
    if (modo === "medir") {
      comprobarFfmpeg({ soloDecodificar: true });
      const dir = resolverDir(f.dir, PUBLIC_SFX);
      let rutas;
      if (f._.length > 1) {
        // Un nombre a secas se busca primero donde estás y después en --dir, y se
        // enseña la ruta resuelta: medir-sfx.py resolvía en silencio contra el set
        // instalado y más de una vez se midió el archivo equivocado.
        rutas = f._.slice(1).map((n) => {
          const enCwd = path.resolve(process.cwd(), n);
          if (fs.existsSync(enCwd)) return enCwd;
          const enDir = path.join(dir, n);
          if (fs.existsSync(enDir)) return enDir;
          abortar(`no existe ${n} (ni en ${posix(process.cwd())} ni en ${mostrar(dir)})`);
        });
      } else {
        if (!fs.existsSync(dir)) abortar(`no existe ${mostrar(dir)}`);
        rutas = fs.readdirSync(dir).filter((n) => /\.(mp3|wav)$/i.test(n)).sort().map((n) => path.join(dir, n));
        if (!rutas.length) abortar(`no hay .mp3 ni .wav en ${mostrar(dir)}`);
      }
      const medidas = medir(rutas, { fps, umbral: Number(f.umbral || 20) });
      if (f.json) console.log(JSON.stringify(medidas, null, 2));
      else imprimirMedidas(medidas, fps);
      return;
    }
    console.log(USO);
    abortar(`modo desconocido «${modo}»`);
  } catch (e) {
    abortar(e.message || String(e));
  }
}

if (esMain(import.meta.url)) main();
