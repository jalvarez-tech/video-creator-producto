/**
 * EL CONTRATO DE LOS SUBTÍTULOS — la quinta capa declarativa, en el motor.
 *
 * Este tipo vivía dentro de `subtitulos-001.ts`, el archivo de DATOS del
 * proyecto 001, y de ahí lo importaban los componentes genéricos del motor
 * (`SubtitulosSync`, `SubtitulosKaraoke`) y los datos de los otros proyectos
 * (`subtitulos-002`, `subtitulos-003`). Es decir: el motor dependía de un vídeo
 * concreto, y los vídeos dependían entre sí. Consecuencias reales: no se podía
 * borrar el 001 sin romper el motor, y quien fuera a escribir `subtitulos-005`
 * tenía que saber que el tipo estaba escondido en el 001.
 *
 * Hermano de `camara.ts` (CameraCue), `plan/nucleo.ts` (Plan/Toma),
 * `sound/cues.ts` (SoundCue) y `noticias/plan.ts` (TomaNoticia): el motor define
 * el CONTRATO, cada proyecto aporta los DATOS.
 */

/**
 * Un segmento de subtítulo. `from`/`to` van en SEGUNDOS, no en frames: salen
 * directos de la transcripción de whisper.cpp (`transcripcion.json`) y así el
 * mismo archivo sirve a cualquier fps sin recalcular nada.
 */
export type Segmento = { from: number; to: number; text: string };
