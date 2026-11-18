import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface CodigoQRReservaProps {
  codigo: string;
  tamano?: number;
}

export const CodigoQRReserva: React.FC<CodigoQRReservaProps> = ({ codigo, tamano = 112 }) => (
  <QRCodeSVG
    value={codigo}
    size={tamano}
    level="M"
    bgColor="#FFFFFF"
    fgColor="#0B0F14"
    title={`Código QR de la reserva ${codigo}`}
  />
);
