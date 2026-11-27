import { useEffect, useState } from 'react';

export const useTheme = () => {
  const [modoOscuro, setModoOscuro] = useState(
    () => localStorage.getItem('globde_tema') === 'oscuro',
  );

  useEffect(() => {
    document.documentElement.classList.toggle('tema-oscuro', modoOscuro);
    document.documentElement.classList.toggle('tema-claro', !modoOscuro);
    localStorage.setItem('globde_tema', modoOscuro ? 'oscuro' : 'claro');
  }, [modoOscuro]);

  return {
    modoOscuro,
    alternarModo: () => setModoOscuro((actual) => !actual),
  };
};
