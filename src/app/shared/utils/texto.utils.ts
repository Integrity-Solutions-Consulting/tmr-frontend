// Normaliza texto para busquedas: minusculas, sin tildes y espacios repetidos colapsados.
// Misma logica que StringNormalizationExtensions.NormalizarBusqueda() del backend: deben
// producir el mismo resultado para que la busqueda se comporte igual en todas las ventanas
// (Seguimiento, Lideres, Colaboradores, Usuarios).
// \p{Mark} con normalize('NFD') elimina los signos diacriticos (tildes, dieresis, etc.)
// que quedan separados de su letra base.
const MARCAS_DIACRITICAS = /\p{Mark}/gu;

export function normalizarTexto(texto: string | null | undefined): string {
    return (texto ?? '')
        .normalize('NFD').replace(MARCAS_DIACRITICAS, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}

// Coincide por palabras sueltas, no por substring contiguo: buscar "Jorge Lino" debe encontrar a
// "Jorge Augusto Lino Bermeo" aunque "Augusto" quede en medio. Cada palabra de la busqueda debe
// aparecer en el texto, en cualquier orden y posicion. Misma logica que Coincide() del backend
// (Shared/Extensions/StringNormalizationExtensions.cs).
export function coincideBusqueda(candidato: string | null | undefined, busqueda: string | null | undefined): boolean {
    const termino = normalizarTexto(busqueda);
    if (!termino) return true;

    const texto = normalizarTexto(candidato);
    return termino.split(' ').every(palabra => texto.includes(palabra));
}
