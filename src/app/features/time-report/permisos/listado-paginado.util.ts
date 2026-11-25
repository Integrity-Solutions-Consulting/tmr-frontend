import { DestroyRef, WritableSignal, effect, inject, untracked } from '@angular/core';

/**
 * Recarga un listado paginado en servidor cuando cambian sus filtros o la página.
 * Al cambiar un filtro vuelve a la página 1 y espera 300 ms (para no consultar en cada tecla);
 * al cambiar de página consulta de inmediato. Debe llamarse en un contexto de inyección.
 */
export function observarListadoPaginado(
  leerFiltros: () => unknown,
  pagina: WritableSignal<number>,
  cargar: () => void,
): void {
  let filtrosAnteriores: string | null = null;
  let esperarTrasReinicio = false;
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  inject(DestroyRef).onDestroy(() => clearTimeout(temporizador));

  effect(() => {
    const filtros = JSON.stringify(leerFiltros());
    const paginaActual = pagina();
    untracked(() => {
      const cambiaronFiltros = filtrosAnteriores !== null && filtros !== filtrosAnteriores;
      filtrosAnteriores = filtros;
      if (cambiaronFiltros && paginaActual !== 1) {
        esperarTrasReinicio = true;
        pagina.set(1);
        return;
      }
      clearTimeout(temporizador);
      if (cambiaronFiltros || esperarTrasReinicio) {
        esperarTrasReinicio = false;
        temporizador = setTimeout(cargar, 300);
      } else {
        cargar();
      }
    });
  });
}
