import React from 'react';
import {
  X, CalendarDays, Clock, Scissors, Check, Share2, Download,
  MapPin, QrCode, Timer, UserRound, Ban,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatoCOP, fechaLarga, rangoHorario, duracionLegible } from '../../utils/helpers';

export const TicketModal: React.FC = () => {
  const { citaTicket, esConfirmacionNueva, cerrarTicket, cancelarCita, usuario } = useApp();
  const [modoPase, setModoPase] = React.useState(false);

  React.useEffect(() => { setModoPase(false); }, [citaTicket]);

  if (!citaTicket) return null;
  const c = citaTicket;

  const urlCalendario = () => {
    const t = encodeURIComponent(`Cita en Globde: ${c.servicio_nombre}`);
    const d = encodeURIComponent(`Barbero: ${c.barbero_nombre}\nCódigo: ${c.codigo_reserva}\nTotal: ${formatoCOP(c.precio_total)}`);
    const loc = encodeURIComponent('Globde Barber Studio, Calle 85 #14-20, Bogotá');
    const dia = c.fecha.replace(/-/g, '');
    const ini = dia + 'T' + c.hora_inicio.replace(':', '') + '00';
    const fin = dia + 'T' + c.hora_fin.replace(':', '') + '00';
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${t}&dates=${ini}/${fin}&details=${d}&location=${loc}`;
  };

  const compartir = () => {
    const txt = encodeURIComponent(
      `💈 Mi cita en Globde\n\n📅 ${fechaLarga(c.fecha)}\n⏰ ${rangoHorario(c.hora_inicio, c.hora_fin)}\n✂️ ${c.servicio_nombre}\n👤 ${c.barbero_nombre}\n🎟️ ${c.codigo_reserva}`
    );
    window.open(`https://wa.me/?text=${txt}`, '_blank');
  };

  /* ---------- Vista 1: CONFIRMACIÓN GRANDE ---------- */
  if (esConfirmacionNueva && !modoPase) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
        <div className="anim-zoom card w-full max-w-2xl overflow-hidden">
          <div className="relative overflow-hidden malla-suave px-6 py-10 text-center sm:px-12 sm:py-12">
            <button onClick={cerrarTicket} className="absolute right-4 top-4 rounded-full border border-white/10 bg-[#141A21] p-2 text-[#93A1B1] transition hover:text-[#EAF0F6]">
              <X className="h-4 w-4" />
            </button>

            <div className="anim-sello mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-neutral-900 to-neutral-700 shadow-[0_18px_45px_-12px_rgba(212,175,55,.55)] sm:h-28 sm:w-28">
              <Check className="h-14 w-14 text-amber-300 sm:h-16 sm:w-16" strokeWidth={3.2} />
            </div>

            <span className="mt-6 inline-block rounded-full border border-amber-400/40 bg-amber-400/12 px-4 py-1 text-xs font-black uppercase tracking-[0.2em] text-amber-700">
              Reserva registrada
            </span>

            <h2 className="font-heading mt-3 text-4xl font-black leading-tight text-[#EAF0F6] sm:text-5xl">
              ¡Tu cita quedó <span className="text-oro">confirmada!</span>
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-base text-[#93A1B1] sm:text-lg">
              Te esperamos, <strong className="text-[#EAF0F6]">{c.cliente_nombre.split(' ')[0]}</strong>. Enviamos el
              comprobante a tu correo y te recordaremos por WhatsApp una hora antes.
            </p>

            {/* Datos grandes */}
            <div className="mx-auto mt-8 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/8 bg-[#141A21] p-4 text-left">
                <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-[#6B7A8C]"><CalendarDays className="h-3.5 w-3.5 text-amber-600" /> Fecha</span>
                <p className="font-heading mt-1 text-lg font-black text-[#EAF0F6]">{fechaLarga(c.fecha)}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-[#141A21] p-4 text-left">
                <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-[#6B7A8C]"><Clock className="h-3.5 w-3.5 text-amber-600" /> Rango horario</span>
                <p className="font-heading mt-1 text-lg font-black text-[#EAF0F6]">{rangoHorario(c.hora_inicio, c.hora_fin)}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-[#141A21] p-4 text-left">
                <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-[#6B7A8C]"><Timer className="h-3.5 w-3.5 text-amber-600" /> Duración</span>
                <p className="font-heading mt-1 text-lg font-black text-[#EAF0F6]">{duracionLegible(c.duracion_minutos)}</p>
              </div>
            </div>

            <div className="mx-auto mt-3 flex max-w-xl flex-col items-center justify-between gap-3 rounded-2xl border border-amber-400/30 bg-[#0F151C] px-5 py-4 sm:flex-row">
              <div className="text-left">
                <span className="text-[11px] uppercase tracking-widest text-[#6B7A8C]">Código de turno</span>
                <p className="font-heading text-3xl font-black tracking-[0.18em] text-amber-600">{c.codigo_reserva}</p>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-[11px] uppercase tracking-widest text-[#6B7A8C]">Con</span>
                <p className="text-sm font-bold text-[#EAF0F6]">{c.barbero_nombre}</p>
                <p className="text-xs text-[#93A1B1]">{c.servicio_nombre}</p>
                <p className="mt-0.5 text-sm font-black text-[#EAF0F6]">{formatoCOP(c.precio_total)}</p>
              </div>
            </div>

            {usuario && (
              <p className="mt-3 text-sm font-semibold text-amber-700">
                🎉 Sumaste puntos Globde · Saldo actual: {usuario.puntos} pts
              </p>
            )}

            <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
              <button onClick={() => setModoPase(true)} className="btn-primario flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold">
                <QrCode className="h-4 w-4" /> Ver mi pase digital
              </button>
              <a href={urlCalendario()} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 rounded-2xl border border-white/12 bg-[#141A21] px-5 py-3 text-sm font-bold text-[#C6D0DC] transition hover:border-amber-400/50">
                <Download className="h-4 w-4 text-amber-600" /> Agendar en calendario
              </a>
              <button onClick={compartir} className="flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-bold text-[#04211F] transition hover:bg-emerald-400">
                <Share2 className="h-4 w-4" /> Enviar por WhatsApp
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Vista 2: PASE DIGITAL ---------- */
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
      <div className="anim-zoom card w-full max-w-md overflow-hidden">
        <div className="relative bg-gradient-to-r from-neutral-900 to-neutral-800 px-6 py-5 text-white">
          <button onClick={cerrarTicket} className="absolute right-4 top-4 rounded-full bg-white/10 p-1.5 transition hover:bg-white/20">
            <X className="h-4 w-4" />
          </button>
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-300/90">Pase digital</span>
          <h3 className="font-heading text-2xl font-black">Globde Barber Studio</h3>
          <div className="mt-3 flex items-center justify-between rounded-2xl bg-black/40 px-4 py-2.5">
            <div>
              <span className="text-[10px] uppercase tracking-widest text-[#9A9A9A]">Código</span>
              <p className="font-heading text-xl font-black tracking-[0.2em] text-amber-300">{c.codigo_reserva}</p>
            </div>
            <span className="rounded-full bg-amber-400 px-3 py-1 text-[11px] font-black uppercase text-[#1A1400]">{c.estado}</span>
          </div>
        </div>

        <div className="relative flex items-center px-1">
          <span className="mx-1 flex-1 border-b-2 border-dashed border-white/10" />
        </div>

        <div className="space-y-4 p-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-[#0F151C] p-3">
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-[#6B7A8C]"><UserRound className="h-3 w-3" /> Cliente</span>
              <p className="mt-0.5 truncate text-sm font-bold text-[#EAF0F6]">{c.cliente_nombre}</p>
              <p className="truncate text-[11px] text-[#93A1B1]">{c.cliente_telefono}</p>
            </div>
            <div className="rounded-2xl bg-[#0F151C] p-3">
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-[#6B7A8C]"><Scissors className="h-3 w-3" /> Barbero</span>
              <p className="mt-0.5 truncate text-sm font-bold text-[#EAF0F6]">{c.barbero_nombre}</p>
              <p className="truncate text-[11px] text-amber-700">{c.servicio_nombre}</p>
            </div>
          </div>

          <div className="rounded-2xl border-2 border-dashed border-amber-400/40 bg-amber-400/8 p-4 text-center">
            <span className="text-[11px] font-bold uppercase tracking-widest text-amber-700">Tu franja reservada</span>
            <p className="font-heading mt-1 text-2xl font-black text-[#EAF0F6]">{rangoHorario(c.hora_inicio, c.hora_fin)}</p>
            <p className="text-xs font-semibold text-[#93A1B1]">{fechaLarga(c.fecha)} · {duracionLegible(c.duracion_minutos)}</p>
          </div>

          <div className="flex items-center gap-4 rounded-2xl border border-white/8 p-3">
            <div className="rounded-xl bg-[#EAF0F6] p-2">
              <QrCode className="h-14 w-14 text-[#0B0F14]" />
            </div>
            <div className="text-xs text-[#93A1B1]">
              <p className="font-bold text-[#EAF0F6]">Muestra este código al llegar</p>
              <p className="mt-0.5">Con él validamos tu turno y acreditamos tus puntos automáticamente.</p>
              <p className="mt-1.5 flex items-center gap-1 text-[11px] text-amber-700"><MapPin className="h-3 w-3" /> Calle 85 #14-20, Bogotá</p>
            </div>
          </div>

          {c.extras.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {c.extras.map((e) => (
                <span key={e} className="rounded-lg bg-amber-400/12 px-2 py-1 text-[11px] font-semibold text-amber-700">+ {e}</span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between rounded-2xl border border-amber-400/30 bg-[#0F151C] px-4 py-3">
            <span className="text-xs font-semibold text-[#93A1B1]">Total a pagar</span>
            <span className="font-heading text-xl font-black text-[#EAF0F6]">{formatoCOP(c.precio_total)}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <a href={urlCalendario()} target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-1.5 rounded-2xl border border-white/12 py-2.5 text-xs font-bold text-[#C6D0DC] transition hover:border-amber-400/50">
              <Download className="h-3.5 w-3.5 text-amber-600" /> Calendario
            </a>
            <button onClick={compartir} className="flex items-center justify-center gap-1.5 rounded-2xl bg-emerald-500 py-2.5 text-xs font-bold text-[#04211F] transition hover:bg-emerald-400">
              <Share2 className="h-3.5 w-3.5" /> WhatsApp
            </button>
          </div>

          {c.estado !== 'completada' && c.estado !== 'cancelada' && (
            <button
              onClick={() => { cancelarCita(c.id_cita, 'Cancelada desde el pase digital'); cerrarTicket(); }}
              className="flex w-full items-center justify-center gap-1.5 text-[11px] font-bold text-[#6B7A8C] transition hover:text-rose-600"
            >
              <Ban className="h-3.5 w-3.5" /> Cancelar esta reserva
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
