import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface CodigoQRReservaProps {
  codigo: string;
  tamano?: number;
}

export const CodigoQRReserva: React.FC<CodigoQRReservaProps> = ({ codigo, tamano = 112 }) => {
  const mensaje = `Hola, quiero consultar mi cita en Globde. Código de reserva: ${codigo}`;
  const enlaceWhatsapp = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;

  return (
    <QRCodeSVG
      value={enlaceWhatsapp}
      size={tamano}
      level="M"
      bgColor="#FFFFFF"
      fgColor="#0B0F14"
      title={`Abrir WhatsApp con el código de reserva ${codigo}`}
    />
  );
};
