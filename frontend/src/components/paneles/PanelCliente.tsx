import React, { useState } from 'react';
import {
  CalendarDays, Crown, Plus, QrCode, Star, Timer, Ban, Check,
  RotateCcw, CircleAlert, Gift, History, Hourglass, X, Eye, Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { Cita } from '../../types';
import {
  formatoCOP, fechaLarga, rangoHorario, duracionLegible, estiloEstado,
  hoyISO, sumarDiasISO, generarFranjas, franjasVigentes, sumarMinutos, hora12, haySolape, desglosarFecha,
} from '../../utils/helpers';

const MOTIVOS = [
  'Me surgió un imprevisto',
  'Quiero cambiar de horario',
  'Problemas de transporte',
  'Ya no necesito el servicio',
  'Otro motivo',
];

export const PanelCliente: React.FC = () => {
  const {
    usuario, citas, barberos, abrirReserva, verTicket, cancelarCita,
    editarCita, calificarCita, setEsperaAbierta, irA, listaEspera, franjasOcupadas,
  } = useApp();

  const [tab, setTab] = useState<'proximas' | 'historial' | 'espera'>('proximas');
  const [aCancelar, setACancelar] = useState<Cita | null>(null);
  const [motivo, setMotivo] = useState(MOTIVOS[0]);
  const [aReprogramar, setAReprogramar] = useState<Cita | null>(null);
  const [nFecha, setNFecha] = useState(hoyISO());
  const [nHora, setNHora] = useState('');
  const [aCalificar, setACalificar] = useState<Cita | null>(null);
  const [rating, setRating] = useState(5);
  const [comentario, setComentario] = useState('');
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');

  const mias = citas.filter((c) => c.id_cliente === usuario?.id_usuario || c.cliente_correo === usuario?.correo);
  const proximas = mias.filter((c) => ['pendiente', 'confirmada', 'en_atencion'].includes(c.estado));
  const historial = mias.filter((c) => ['completada', 'cancelada', 'no_asistio'].includes(c.estado));
  const misEsperas = listaEspera.filter((e) => e.id_cliente === usuario?.id_usuario);

  const mostrarAviso = (t: string) => { setAviso(t); setTimeout(() => setAviso(''), 4500); };

  const confirmarCancelacion = async () => {
    if (!aCancelar) return;
    const r = await cancelarCita(aCancelar.id_cita, motivo);
    setACancelar(null);
    mostrarAviso(r.ok ? `Cita ${aCancelar.codigo_reserva} cancelada. ${r.mensaje}` : r.mensaje);
  };

  const barberoRep = barberos.find((b) => b.id_barbero === aReprogramar?.id_barbero) ?? barberos[0];
  const ocupadasRep = aReprogramar ? franjasOcupadas(nFecha, aReprogramar.id_barbero) : [];
  const franjasRep = aReprogramar
    ? franjasVigentes(
        generarFranjas(barberoRep.hora_apertura, barberoRep.hora_cierre, 15, aReprogramar.duracion_minutos),
        nFecha,
      ).map((ini) => {
        const fin = sumarMinutos(ini, aReprogramar.duracion_minutos);
        const propia = aReprogramar.fecha === nFecha && aReprogramar.hora_inicio === ini;
        return { ini, fin, libre: propia || !ocupadasRep.some((o) => haySolape(ini, fin, o.inicio, o.fin)) };
      })
    : [];

  const guardarReprogramacion = async () => {
    if (!aReprogramar || !nHora) { setError('Selecciona una nueva franja horaria.'); return; }
    const r = await editarCita(aReprogramar.id_cita, { fecha: nFecha, hora_inicio: nHora });
    if (!r.ok) { setError(r.mensaje); return; }
    setAReprogramar(null); setError(''); setNHora('');
    mostrarAviso('Tu cita fue reprogramada correctamente.');
  };

  const enviarResena = async () => {
    if (!aCalificar) return;
    const r = await calificarCita(aCalificar.id_cita, rating, comentario, ['Servicio Globde']);
    if (!r.ok) return;
    setACalificar(null); setComentario('');
  };

  const inputCls = 'w-full rounded-xl border border-white/10 bg-[#0F151C] px-3.5 py-2.5 text-sm text-[#EAF0F6] outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-400/15';

  return (
    <div className="min-h-[70vh] bg-[#0B0F14] py-10">
      <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
        {/* Encabezado */}
        <div className="card overflow-hidden">
          <div className="flex flex-col items-start gap-5 malla-suave p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div className="flex items-center gap-4">
      {usuario?.avatar_url
        ? <img src={usuario.avatar_url} alt="" className="h-16 w-16 rounded-2xl object-cover shadow-md sm:h-20 sm:w-20" />
        : <span className="avatar-respaldo flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl font-heading text-2xl font-black text-[#06232A] shadow-md ring-1 ring-cyan-300/60 sm:h-20 sm:w-20 sm:text-3xl">
      {(usuario?.nombre.trim()[0] ?? '?').toUpperCase()}
    </span>}              <div>
                <h1 className="font-heading text-2xl font-black text-[#EAF0F6] sm:text-3xl">
                  ¡Hola, {usuario?.nombre.split(' ')[0]}! 💈
                </h1>
                <p className="text-sm text-[#93A1B1]">Gestiona tus citas, cancela o reprograma cuando quieras.</p>
                <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-3 py-1 text-xs font-black text-amber-300">
                  <Crown className="h-3.5 w-3.5" /> {usuario?.puntos} pts · Nivel {usuario?.nivel_fidelizacion}
                </span>
              </div>
            </div>
            <div className="flex w-full gap-2 sm:w-auto">
              <button onClick={() => abrirReserva()} className="btn-primario flex flex-1 items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black sm:flex-none">
                <Plus className="h-4 w-4" /> Nueva cita
              </button>
              <button onClick={() => irA('fidelizacion')} className="flex items-center justify-center gap-2 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm font-bold text-amber-700 transition hover:bg-amber-400/20">
                <Gift className="h-4 w-4" /> Premios
              </button>
            </div>
          </div>
        </div>

        {aviso && (
          <div className="anim-aparecer flex items-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-3.5 text-sm font-bold text-emerald-300">
            <Check className="h-4 w-4" /> {aviso}
          </div>
        )}

        {/* Pestañas */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'proximas', t: `Próximas (${proximas.length})`, i: CalendarDays },
            { id: 'historial', t: `Historial (${historial.length})`, i: History },
            { id: 'espera', t: `Lista de espera (${misEsperas.length})`, i: Hourglass },
          ].map((x) => (
            <button key={x.id} onClick={() => setTab(x.id as typeof tab)}
              className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition ${
                tab === x.id ? 'bg-amber-400 text-[#1A1400] shadow-lg' : 'border border-white/10 bg-[#141A21] text-[#93A1B1] hover:border-amber-400/40'
              }`}>
              <x.i className="h-4 w-4" /> {x.t}
            </button>
          ))}
        </div>

        {/* PRÓXIMAS */}
        {tab === 'proximas' && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {proximas.length === 0 && (
              <div className="card col-span-full p-12 text-center">
                <p className="text-5xl">💈</p>
                <h3 className="font-heading mt-3 text-xl font-black text-[#EAF0F6]">No tienes citas programadas</h3>
                <p className="mt-1 text-sm text-[#93A1B1]">Reserva tu turno y asegura tu horario preferido.</p>
                <button onClick={() => abrirReserva()} className="btn-primario mx-auto mt-5 flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-black">
                  <Plus className="h-4 w-4" /> Agendar ahora
                </button>
              </div>
            )}

            {proximas.map((c) => {
              const est = estiloEstado(c.estado);
              return (
                <article key={c.id_cita} className="card card-hover overflow-hidden">
                  <div className="flex items-center justify-between border-b border-white/8 bg-[#0F151C] px-5 py-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#6B7A8C]">Código</span>
                      <p className="font-heading text-lg font-black text-amber-700">{c.codigo_reserva}</p>
                    </div>
                    <span className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black ${est.clase}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${est.punto}`} /> {est.texto}
                    </span>
                  </div>

                  <div className="space-y-4 p-5">
                    <div className="cita-horario rounded-2xl border-2 border-dashed border-amber-400/40 bg-amber-400/8 p-4">
                      <span className="text-[11px] font-black uppercase tracking-widest text-amber-700">Franja reservada</span>
                      <p className="font-heading text-2xl font-black text-[#EAF0F6]">{rangoHorario(c.hora_inicio, c.hora_fin)}</p>
                      <p className="text-xs font-semibold text-[#93A1B1]">
                        {fechaLarga(c.fecha)} · <Timer className="inline h-3 w-3 text-amber-300" /> {duracionLegible(c.duracion_minutos)}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-[11px] text-[#6B7A8C]">Servicio</span>
                        <p className="font-bold text-[#EAF0F6]">{c.servicio_nombre}</p>
                      </div>
                      <div>
                        <span className="text-[11px] text-[#6B7A8C]">Barbero</span>
                        <p className="font-bold text-amber-300">{c.barbero_nombre}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between rounded-2xl bg-[#0F151C] px-4 py-2.5">
                      <span className="text-xs font-semibold text-[#93A1B1]">Total</span>
                      <span className="font-heading text-lg font-black text-[#EAF0F6]">{formatoCOP(c.precio_total)}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <button onClick={() => verTicket(c)} className="flex items-center justify-center gap-1.5 rounded-2xl bg-amber-400/12 py-2.5 text-xs font-black text-amber-700 transition hover:bg-amber-400/20">
                        <QrCode className="h-3.5 w-3.5" /> Pase QR
                      </button>
                      <button onClick={() => { setAReprogramar(c); setNFecha(c.fecha); setNHora(''); setError(''); }}
                        className="flex items-center justify-center gap-1.5 rounded-2xl border border-white/12 py-2.5 text-xs font-bold text-[#93A1B1] transition hover:bg-white/5">
                        <RotateCcw className="h-3.5 w-3.5" /> Reprogramar
                      </button>
                      <button onClick={() => { setACancelar(c); setMotivo(MOTIVOS[0]); }}
                        className="flex items-center justify-center gap-1.5 rounded-2xl bg-rose-400/12 py-2.5 text-xs font-black text-rose-300 transition hover:bg-rose-400/20">
                        <Ban className="h-3.5 w-3.5" /> Cancelar
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* HISTORIAL */}
        {tab === 'historial' && (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#0F151C] text-[11px] uppercase tracking-wide text-[#6B7A8C]">
                  <tr>
                    <th className="p-4">Código</th><th className="p-4">Servicio</th><th className="p-4">Barbero</th>
                    <th className="p-4">Fecha y franja</th><th className="p-4">Total</th><th className="p-4">Estado</th>
                    <th className="p-4 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/6">
                  {historial.map((c) => {
                    const est = estiloEstado(c.estado);
                    return (
                      <tr key={c.id_cita} className="transition hover:bg-white/3">
                        <td className="p-4 font-black text-amber-700">{c.codigo_reserva}</td>
                        <td className="p-4 font-semibold text-[#EAF0F6]">{c.servicio_nombre}</td>
                        <td className="p-4 text-amber-300">{c.barbero_nombre}</td>
                        <td className="p-4 text-[#93A1B1]">
                          {fechaLarga(c.fecha)}<br />
                          <span className="text-xs font-semibold text-[#6B7A8C]">{rangoHorario(c.hora_inicio, c.hora_fin)}</span>
                        </td>
                        <td className="p-4 font-bold text-[#EAF0F6]">{formatoCOP(c.precio_total)}</td>
                        <td className="p-4">
                          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${est.clase}`}>{est.texto}</span>
                        </td>
                        <td className="p-4 text-center">
                          {c.estado === 'completada' && !c.resena ? (
                            <button onClick={() => setACalificar(c)} className="rounded-xl bg-amber-400/15 px-3 py-1.5 text-[11px] font-black text-amber-300 transition hover:bg-amber-400/25">
                              ⭐ Calificar (+15 pts)
                            </button>
                          ) : c.resena ? (
                            <span className="flex items-center justify-center gap-1 text-[11px] font-bold text-amber-300">
                              <Star className="h-3.5 w-3.5 fill-amber-300" /> {c.resena.rating}/5
                            </span>
                          ) : (
                            <button onClick={() => verTicket(c)} className="flex items-center gap-1 rounded-xl border border-white/12 px-3 py-1.5 text-[11px] font-bold text-[#93A1B1] hover:bg-white/5">
                              <Eye className="h-3.5 w-3.5" /> Ver detalle
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* LISTA DE ESPERA */}
        {tab === 'espera' && (
          <div className="space-y-4">
            <button onClick={() => setEsperaAbierta(true)} className="btn-primario flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold">
              <Plus className="h-4 w-4" /> Nueva solicitud
            </button>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {misEsperas.length === 0 && <p className="card p-8 text-center text-sm text-[#93A1B1]">Aún no tienes solicitudes en lista de espera.</p>}
              {misEsperas.map((e) => (
                <div key={e.id_espera} className="card p-5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-heading font-black text-[#EAF0F6]">{e.servicio_nombre}</h4>
                    <span className="rounded-full bg-neutral-500/15 px-3 py-1 text-[11px] font-black text-neutral-800">En espera</span>
                  </div>
                  <p className="mt-1 text-xs text-[#93A1B1]">{fechaLarga(e.fecha_deseada)} · franja {e.franja_horaria}</p>
                  {e.barbero_nombre && <p className="text-xs font-semibold text-amber-300">Con {e.barbero_nombre}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MODAL CANCELAR */}
      {aCancelar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="anim-zoom card w-full max-w-md overflow-hidden">
            <div className="flex items-start justify-between bg-rose-500 px-6 py-5 text-[#1C0508]">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] opacity-75">Cancelación</span>
                <h3 className="font-heading text-2xl font-black">¿Cancelar tu cita?</h3>
              </div>
              <button onClick={() => setACancelar(null)} className="rounded-full bg-[#1C0508]/15 p-2 hover:bg-[#1C0508]/25"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-4 p-6">
              <div className="rounded-2xl bg-[#0F151C] p-4 text-sm">
                <p className="font-black text-[#EAF0F6]">{aCancelar.servicio_nombre}</p>
                <p className="text-xs text-[#93A1B1]">{fechaLarga(aCancelar.fecha)} · {rangoHorario(aCancelar.hora_inicio, aCancelar.hora_fin)}</p>
                <p className="text-xs font-semibold text-amber-300">Con {aCancelar.barbero_nombre}</p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#93A1B1]">Cuéntanos el motivo</label>
                <select value={motivo} onChange={(e) => setMotivo(e.target.value)} className={inputCls}>
                  {MOTIVOS.map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>

              <div className="flex items-start gap-2 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3 text-[11px] font-semibold text-amber-800">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                Cancelando con más de 2 horas de anticipación no se aplica ninguna penalidad y tus puntos se conservan.
              </div>

              <div className="flex gap-2">
                <button onClick={() => setACancelar(null)} className="flex-1 rounded-2xl border border-white/12 py-3 text-sm font-bold text-[#93A1B1] hover:bg-white/5">
                  Mantener cita
                </button>
                <button onClick={confirmarCancelacion} className="flex-1 rounded-2xl bg-rose-500 py-3 text-sm font-black text-[#1C0508] transition hover:bg-rose-400">
                  Sí, cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REPROGRAMAR */}
      {aReprogramar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="anim-zoom card max-h-[90vh] w-full max-w-lg overflow-y-auto">
            <div className="sticky top-0 flex items-start justify-between bg-gradient-to-r from-neutral-950 to-neutral-800 px-6 py-5 text-white">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-300/90">{aReprogramar.codigo_reserva}</span>
                <h3 className="font-heading text-2xl font-black">Reprogramar cita</h3>
              </div>
              <button onClick={() => setAReprogramar(null)} className="rounded-full bg-white/10 p-2 hover:bg-white/20"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-4 p-6">
              {error && <p className="rounded-2xl bg-rose-400/10 p-3 text-xs font-bold text-rose-300">{error}</p>}

              <div className="flex gap-2 overflow-x-auto pb-1">
                {Array.from({ length: 8 }, (_, i) => sumarDiasISO(i)).map((d) => {
                  const inf = desglosarFecha(d);
                  return (
                    <button key={d} onClick={() => { setNFecha(d); setNHora(''); }}
                      className={`min-w-[68px] rounded-2xl border px-3 py-2 text-center transition ${
                        nFecha === d ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-white/10 bg-[#141A21] text-[#93A1B1]'
                      }`}>
                      <span className="block text-[10px] font-bold uppercase">{inf.esHoy ? 'Hoy' : inf.diaSemanaCorto}</span>
                      <span className="font-heading block text-lg font-black">{inf.dia}</span>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {franjasRep.map((f) => (
                  <button key={f.ini} disabled={!f.libre} onClick={() => setNHora(f.ini)}
                    className={`rounded-2xl border px-2 py-2 text-center text-xs transition ${
                      !f.libre ? 'cursor-not-allowed border-white/5 bg-[#0F151C] text-[#3D4855] line-through'
                      : nHora === f.ini ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-white/10 bg-[#141A21] text-[#C6D0DC] hover:border-amber-400/50'
                    }`}>
                    <span className="block font-black">{hora12(f.ini)}</span>
                    <span className="block text-[10px] opacity-70">a {hora12(f.fin)}</span>
                  </button>
                ))}
              </div>

              <button onClick={guardarReprogramacion} className="btn-primario w-full rounded-2xl py-3 text-sm font-black">
                Guardar nuevo horario
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CALIFICAR */}
      {aCalificar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="anim-zoom card w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-amber-300 to-amber-500 px-6 py-5">
              <h3 className="font-heading text-2xl font-black text-[#2B1E04]">Califica tu experiencia</h3>
              <p className="text-xs font-semibold text-[#2B1E04]/75">Con {aCalificar.barbero_nombre}</p>
            </div>
            <div className="space-y-4 p-6">
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} onClick={() => setRating(s)} className="transition hover:scale-125">
                    <Star className={`h-9 w-9 ${rating >= s ? 'fill-amber-300 text-amber-300' : 'text-[#263140]'}`} />
                  </button>
                ))}
              </div>
              <textarea rows={3} value={comentario} onChange={(e) => setComentario(e.target.value)}
                placeholder="¿Cómo estuvo tu corte y la atención?"
                className="w-full resize-none rounded-2xl border border-white/10 bg-[#0F151C] p-3 text-sm text-[#EAF0F6] outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/15" />
              <div className="flex gap-2">
                <button onClick={() => setACalificar(null)} className="flex-1 rounded-2xl border border-white/12 py-3 text-sm font-bold text-[#93A1B1]">Cerrar</button>
                <button onClick={enviarResena} className="btn-oro flex-1 rounded-2xl py-3 text-sm font-black">
                  <span className="flex items-center justify-center gap-1.5"><Sparkles className="h-4 w-4" /> Publicar (+15 pts)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
