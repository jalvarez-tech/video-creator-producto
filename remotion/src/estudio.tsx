/**
 * EL ESTUDIO SE DESCUBRE, NO SE REGISTRA.
 *
 * `Root.tsx` solo conoce las composiciones del PRODUCTO. Las de cada proyecto
 * (los vídeos concretos de quien usa el sistema) viven en
 * `src/proyectos/NNN/composiciones.tsx`, y ese archivo exporta un componente
 * `Composiciones` con sus `<Composition>`. Aquí se recogen todos los que
 * existan en disco y se montan en orden de carpeta.
 *
 * Por qué `require.context` y no una lista de imports: en un clon del producto
 * no hay ningún proyecto, y un import a un archivo que no existe tumba el
 * bundle entero (Studio, render y las sondas), también para las composiciones
 * del producto. Con el contexto, la carpeta vacía da una lista vacía y todo
 * sigue compilando. Webpack vigila la carpeta, así que un proyecto nuevo
 * aparece en el Studio sin tocar `Root.tsx`.
 *
 * ⚠️ La carpeta `src/proyectos/` TIENE que existir (por eso va versionado su
 * `.gitkeep`): con la carpeta ausente webpack no resuelve el contexto y falla
 * al compilar, probado con webpack 5.105.
 *
 * El orden solo cambia la lista del Studio, no ningún píxel: cada composición
 * se renderiza por su `id`, y un `id` repetido entre producto y estudio hace
 * fallar a Remotion al arrancar, no en silencio.
 */
const contexto = require.context("./proyectos", true, /^\.\/[^/]+\/composiciones\.tsx$/);

export const ComposicionesDelEstudio: React.FC = () => (
  <>
    {contexto
      .keys()
      .sort()
      .map((clave) => {
        const { Composiciones } = contexto<{ Composiciones: React.FC }>(clave);
        return <Composiciones key={clave} />;
      })}
  </>
);
