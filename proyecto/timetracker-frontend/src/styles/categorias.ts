export type Categoria = 'ordinarias' | 'extraDiurna' | 'extraNocturna' | 'recargo' | 'dominical' | 'permiso' | 'viaje';

// isDark = true → paleta oscura (Parte 2.2), false → clara (Parte 1 tabla)
export function colorCategoria(categoria: Categoria, isDark: boolean) {
  const map = {
    ordinarias: isDark ? { bg: '#16302A', border: '#6FCB9A', text: '#A8E9C4' } : { bg: '#D9F0E1', border: '#8FCDA8', text: '#1F6B41' },
    extraDiurna: isDark ? { bg: '#3A211D', border: '#E8998A', text: '#F3B7A6' } : { bg: '#FBDFD7', border: '#E8A392', text: '#8A3B27' },
    extraNocturna: isDark ? { bg: '#142A38', border: '#5FA8D8', text: '#9BCBEF' } : { bg: '#D8EAF8', border: '#85BEE0', text: '#1D5A80' },
    recargo: isDark ? { bg: '#241B3A', border: '#9B7FE0', text: '#C9B8F5' } : { bg: '#E7E0F9', border: '#B7A0E8', text: '#503991' },
    dominical: isDark ? { bg: '#332C16', border: '#D6B85E', text: '#EAD08C' } : { bg: '#F7ECC9', border: '#DCC17E', text: '#7A6420' },
    permiso: isDark ? { bg: '#212126', border: '#6E6E78', text: '#C4C4CC' } : { bg: '#E9E9EC', border: '#B9B9C2', text: '#4B4B54' },
    viaje: isDark ? { bg: '#2A1F3A', border: '#8B7CF6', text: '#C9B8F5' } : { bg: '#EDE9FE', border: '#DDD6FE', text: '#4C3A9A' },
  } as const;
  return map[categoria];
}

export function categoriaPorIndice(i: number): Categoria {
  const order: Categoria[] = ['ordinarias','extraDiurna','extraNocturna','recargo','dominical','permiso','viaje'];
  return order[i % order.length];
}
