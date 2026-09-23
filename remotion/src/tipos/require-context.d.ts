/**
 * `require.context` — la única API de webpack que usa el código fuente.
 *
 * `src/estudio.tsx` descubre los proyectos del estudio con ella, y TypeScript
 * no la conoce: `require` lo tipa @types/node y `NodeJS.Require` no trae
 * `context` (TS2339). Esta ampliación declara justo lo que webpack 5 devuelve:
 * las claves, la función que carga un módulo por clave, `resolve` e `id`.
 *
 * No hace falta `webpack/module`: ese paquete llega de forma transitiva y un
 * `/// <reference>` a él se rompería en cuanto cambie el árbol de dependencias.
 */
declare namespace NodeJS {
  interface Require {
    context(
      directorio: string,
      subcarpetas?: boolean,
      filtro?: RegExp
    ): {
      keys(): string[];
      <T = unknown>(clave: string): T;
      resolve(clave: string): string;
      id: string;
    };
  }
}
