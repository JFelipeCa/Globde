import React, { useState } from 'react';
import { Scissors } from 'lucide-react';

const FOTOS_RESPALDO: Record<number, string> = {
  1: '/images/barberos/barbero-1.png',
  2: '/images/barberos/barbero-2.png',
};

interface BarberoFotoProps {
  idBarbero: number;
  nombre: string;
  fotoUrl?: string | null;
  className: string;
  iconClassName: string;
}

export const BarberoFoto: React.FC<BarberoFotoProps> = ({
  idBarbero,
  nombre,
  fotoUrl,
  className,
  iconClassName,
}) => {
  const [fotosFallidas, setFotosFallidas] = useState<Set<string>>(() => new Set());
  const fotoOriginal = fotoUrl?.trim() || null;
  const mostrarOriginal = Boolean(fotoOriginal && !fotosFallidas.has(fotoOriginal));
  const src = mostrarOriginal ? fotoOriginal : FOTOS_RESPALDO[idBarbero];

  if (!src || fotosFallidas.has(src)) {
    return <Scissors className={iconClassName} aria-hidden="true" />;
  }

  return (
    <img
      src={src}
      alt={mostrarOriginal ? nombre : `Imagen de referencia para ${nombre}`}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => setFotosFallidas((actuales) => new Set(actuales).add(src))}
    />
  );
};
