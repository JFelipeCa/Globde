import React, { useEffect, useMemo, useState } from 'react';
import {
  X, Check, ArrowRight, ArrowLeft, Clock, Star, Crown, Timer,
  CalendarDays, Sparkles, CircleAlert, Plus,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { EXTRAS_SERVICIO } from '../../data/mockData';
import {
  formatoCOP, hoyISO, sumarDiasISO, desglosarFecha, generarFranjas, franjasVigentes,
  sumarMinutos, hora12, duracionLegible, haySolape, fechaLarga,
} from '../../utils/helpers';

const PASOS = ['Servicio', 'Barbero', 'Fecha y hora', 'Confirmar'];

export const BookingWizard: React.FC = () => {
  const {
    reservaAbierta, cerrarReserva, configReserva, servicios, barberos,
    usuario, crearCita, franjasOcupadas,
  } = useApp();

  const [paso, setPaso] = useState(1);
  const [idServicio, setIdServicio] = useState(1);
  const [idBarbero, setIdBarbero] = useState(1);
  const [fecha, setFecha] = useState(hoyISO());
  const [horaInicio, setHoraInicio] = useState('');
  const [extras, setExtras] = useState<string[]>([]);
  const [usarPuntos, setUsarPuntos] = useState(false);
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!reservaAbierta) return;
    setPaso(configReserva.servicioId ? 2 : 1);
    if (configReserva.servicioId) setIdServicio(configReserva.servicioId);
    if (configReserva.barberoId) setIdBarbero(configReserva.barberoId);
    if (usuario) { setNombre(usuario.nombre); setCorreo(usuario.correo); setTelefono(usuario.telefono); }
    setHoraInicio(''); setError('');
  }, [reservaAbierta, configReserva, usuario]);

  const servicio = servicios.find((s) => s.id_servicio === idServicio) ?? servicios[0];
  const barbero = barberos.find((b) => b.id_barbero === idBarbero) ?? barberos[0];

  const minutosExtras = extras.reduce((a, e) => a + (EXTRAS_SERVICIO.find((x) => x.id === e)?.minutos ?? 0), 0);
  const costoExtras = extras.reduce((a, e) => a + (EXTRAS_SERVICIO.find((x) => x.id === e)?.precio ?? 0), 0);
  const duracionTotal = servicio.duracion_minutos + minutosExtras;
  const subtotal = servicio.precio + costoExtras;
  const puntosUsables = usarPuntos && usuario && usuario.puntos >= 50 ? 50 : 0;
  const descuento = (puntosUsables / 100) * 10000;
  const total = Math.max(0, subtotal - descuento);

  const dias = useMemo(() => Array.from({ length: 10 }, (_, i) => sumarDiasISO(i)), []);
  const ocupadas = franjasOcupadas(fecha, idBarbero);

  // Solo los barberos que prestan el servicio elegido. Si el backend no envio
  // la relacion, se muestran todos para no dejar el paso vacio.
  const barberosDisponibles = useMemo(
    () =>
      barberos.filter(
        (b) => !b.servicios_ids?.length || b.servicios_ids.includes(idServicio)
      ),
    [barberos, idServicio]
  );

  // Domingo debe ser 7, no 0 (el backend usa 1=Lunes … 7=Domingo).
  const diaSemana = useMemo(() => {
    const [a, m, d] = fecha.split('-').map(Number);
    return new Date(a, m - 1, d).getDay() || 7;
  }, [fecha]);

  const jornadaDelDia = useMemo(
    () =>
      barbero.horarios?.filter((h) => h.dia_semana === diaSemana) ?? [],
    [barbero.horarios, diaSemana],
  );
  const barberoDescansa = Boolean(barbero.horarios?.length) && jornadaDelDia.length === 0;

  const franjas = useMemo(() => {
    // Se generan solo las horas de la jornada real de ese barbero ese dia.
    const base = barbero.horarios?.length
      ? jornadaDelDia.flatMap((j) => generarFranjas(j.hora_inicio, j.hora_fin, 15, duracionTotal))
      : generarFranjas(barbero.hora_apertura, barbero.hora_cierre, 15, duracionTotal);

    // Si la fecha es hoy, no tiene sentido ofrecer horas que ya pasaron.
    return franjasVigentes(base, fecha)
      .map((ini) => {
        const fin = sumarMinutos(ini, duracionTotal);
        const libre = !ocupadas.some((o) => haySolape(ini, fin, o.inicio, o.fin));
        return { ini, fin, libre };
      });
  }, [barbero, jornadaDelDia, duracionTotal, ocupadas, fecha]);

  const franjasManana = franjas.filter((f) => Number(f.ini.split(':')[0]) < 13);
  const franjasTarde = franjas.filter((f) => Number(f.ini.split(':')[0]) >= 13);

  if (!reservaAbierta) return null;

  const alternarExtra = (id: string) => {
    setHoraInicio('');
    setExtras((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };

  // Requisito que debe cumplirse para poder ABANDONAR cada paso. Se consulta
  // desde el boton "Continuar" y desde el stepper de cabecera, para que no
  // exista ninguna via de llegar al paso 4 sin haber elegido franja: esa fuga
  // era la que producia el error "Faltan datos de la cita: hora_inicio".
  const faltanteDelPaso = (n: number): string => {
    if (n === 2 && !barberosDisponibles.some((b) => b.id_barbero === idBarbero))
      return 'Elige un barbero que preste el servicio seleccionado.';
    if (n === 3 && !horaInicio) return 'Selecciona una franja horaria disponible para continuar.';
    return '';
  };

  // Solo se permite saltar a un paso si todos los anteriores estan completos.
  const puedeIrA = (destino: number) =>
    Array.from({ length: destino - 1 }, (_, i) => i + 1).every((n) => !faltanteDelPaso(n));

  const irAPaso = (destino: number) => {
    if (destino === paso) return;
    if (destino < paso) { setError(''); return setPaso(destino); }
    const primerFallo = Array.from({ length: destino - 1 }, (_, i) => i + 1)
      .map((n) => ({ n, falta: faltanteDelPaso(n) }))
      .find((x) => x.falta);
    if (primerFallo) { setPaso(primerFallo.n); return setError(primerFallo.falta); }
    setError('');
    setPaso(destino);
  };

  const siguiente = () => {
    setError('');
    // Si al cambiar de servicio el barbero elegido ya no lo presta, se reasigna.
    if (paso === 1 && !barberosDisponibles.some((b) => b.id_barbero === idBarbero)) {
      if (!barberosDisponibles.length) return setError('Ningún barbero presta ese servicio todavía.');
      setIdBarbero(barberosDisponibles[0].id_barbero);
      setHoraInicio('');
    }
    const falta = faltanteDelPaso(paso);
    if (falta) return setError(falta);
    setPaso((p) => Math.min(4, p + 1));
  };

  const confirmar = async () => {
    setError('');
    // Ultima red de seguridad: nunca enviar al backend una cita incompleta.
    for (const n of [1, 2, 3]) {
      const falta = faltanteDelPaso(n);
      if (falta) { setPaso(n); return setError(falta); }
    }
    if (!nombre.trim() || !telefono.trim()) return setError('Completa tu nombre y teléfono de contacto.');
    const r = await crearCita({
      servicio_id: idServicio, barbero_id: idBarbero, fecha, hora_inicio: horaInicio,
      extras, usar_puntos: usarPuntos, puntos_a_usar: puntosUsables,
      nombre, correo, telefono, observaciones,
    });
    if (!r.ok) setError(r.mensaje);
  };

  const inputCls = 'w-full rounded-xl border border-white/10 bg-[#0F151C] px-3.5 py-2.5 text-sm text-[#EAF0F6] placeholder-[#5A6878] outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-400/15';

  const BotonFranja: React.FC<{ f: { ini: string; fin: string; libre: boolean } }> = ({ f }) => (
    <button
      type="button" disabled={!f.libre} onClick={() => setHoraInicio(f.ini)}
      className={`rounded-2xl border px-2 py-2 text-center transition ${
        !f.libre
          ? 'cursor-not-allowed border-white/5 bg-[#0F151C] text-[#3D4855] line-through'
          : horaInicio === f.ini
          ? 'border-neutral-900 bg-neutral-900 text-white shadow-lg shadow-amber-400/25'
          : 'border-white/10 bg-[#141A21] text-[#C6D0DC] hover:-translate-y-0.5 hover:border-amber-400/50'
      }`}
    >
      <span className="block text-sm font-black">{hora12(f.ini)}</span>
      <span className={`block text-[10px] font-semibold ${horaInicio === f.ini ? 'text-amber-300' : 'text-[#6B7A8C]'}`}>
        hasta {hora12(f.fin)}
      </span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-4">
      <div className="anim-zoom card flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden">
        {/* Encabezado */}
        <div className="shrink-0 bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-800 px-5 py-4 text-white sm:px-7">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-300/90">Agendamiento en línea</span>
              <h3 className="font-heading text-2xl font-black">Reserva tu turno</h3>
            </div>
            <button onClick={cerrarReserva} className="rounded-full bg-white/10 p-2 transition hover:bg-white/20">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-1.5">
            {PASOS.map((p, i) => (
              <button
                key={p} onClick={() => irAPaso(i + 1)}
                disabled={i + 1 > paso && !puedeIrA(i + 1)}
                className={`rounded-xl px-1 py-1.5 text-[11px] font-bold transition ${
                  paso === i + 1 ? 'bg-amber-400 text-[#1A1400] shadow' : paso > i + 1 ? 'bg-white/20 text-white' : 'bg-white/8 text-white/60'
                } ${i + 1 > paso && !puedeIrA(i + 1) ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                <span className="flex items-center justify-center gap-1">
                  {paso > i + 1 ? <Check className="h-3 w-3" /> : <span>{i + 1}</span>}
                  <span className="hidden sm:inline">{p}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Cuerpo */}
        <div className="flex-1 overflow-y-auto bg-[#0B0F14] p-5 sm:p-7">
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-2xl border border-rose-400/30 bg-rose-400/10 p-3 text-xs font-semibold text-rose-300">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          {/* PASO 1 · SERVICIO */}
          {paso === 1 && (
            <div className="anim-aparecer space-y-3">
              <h4 className="font-heading text-lg font-black text-[#EAF0F6]">¿Qué servicio deseas?</h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {servicios.map((s) => (
                  <button
                    key={s.id_servicio} onClick={() => { setIdServicio(s.id_servicio); setHoraInicio(''); }}
                    className={`card card-hover flex gap-3 p-4 text-left ${idServicio === s.id_servicio ? 'ring-2 ring-amber-400' : ''}`}
                  >
                    <span className="text-2xl">{s.icono}</span>
                    <span className="flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-black text-[#EAF0F6]">{s.nombre}</span>
                        {s.popular && <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-black text-amber-700">Popular</span>}
                      </span>
                      <span className="mt-1 block text-[11px] leading-snug text-[#93A1B1] line-clamp-2">{s.descripcion}</span>
                      <span className="mt-2 flex items-center justify-between border-t border-white/8 pt-2">
                        <span className="text-sm font-black text-[#EAF0F6]">{formatoCOP(s.precio)}</span>
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-[#93A1B1]">
                          <Timer className="h-3.5 w-3.5 text-amber-600" /> {duracionLegible(s.duracion_minutos)}
                        </span>
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* PASO 2 · BARBERO */}
          {paso === 2 && (
            <div className="anim-aparecer space-y-3">
              <h4 className="font-heading text-lg font-black text-[#EAF0F6]">Elige a tu barbero</h4>
              {/* Si el catalogo tiene mas barberos que los mostrados, se avisa por que:
                  sin este texto parecia que la lista se habia roto. */}
              {barberosDisponibles.length > 0 && barberosDisponibles.length < barberos.length && (
                <p className="text-xs font-semibold text-[#93A1B1]">
                  Mostrando {barberosDisponibles.length} de {barberos.length} barberos: solo aparecen
                  quienes realizan «{servicio.nombre}».
                </p>
              )}
              {!barberosDisponibles.length && (
                <p className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-700">
                  Ningún barbero presta este servicio por ahora. Vuelve al paso anterior y elige otro.
                </p>
              )}
              {barberosDisponibles.map((b) => (
                <button
                  key={b.id_barbero} onClick={() => { setIdBarbero(b.id_barbero); setHoraInicio(''); }}
                  className={`card card-hover flex w-full items-center gap-4 p-4 text-left ${idBarbero === b.id_barbero ? 'ring-2 ring-amber-400' : ''}`}
                >
                  <img src={b.foto_url} alt={b.nombre} className="h-16 w-16 shrink-0 rounded-2xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-sm font-black text-[#EAF0F6]">
                        {b.nombre}
                        <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-black text-amber-700">{b.nivel}</span>
                      </span>
                      <span className="flex items-center gap-1 text-xs font-black text-amber-600">
                        <Star className="h-3.5 w-3.5 fill-amber-500" /> {b.rating}
                      </span>
                    </div>
                    <p className="text-[11px] font-semibold text-[#6B7A8C]">{b.rol_titulo}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-[#93A1B1] line-clamp-2">{b.bio}</p>
                    <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-[#6B7A8C]">
                      <Clock className="h-3 w-3" /> Atiende de {hora12(b.hora_apertura)} a {hora12(b.hora_cierre)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* PASO 3 · FECHA Y FRANJA */}
          {paso === 3 && (
            <div className="anim-aparecer space-y-5">
              <div>
                <h4 className="font-heading text-lg font-black text-[#EAF0F6]">Selecciona el día</h4>
                <p className="mt-1 text-sm text-[#EAF0F6]/60">
                  Solo mostramos los turnos que {barbero.nombre.split(' ')[0]} tiene libres según su
                  jornada. Si eliges hoy, las horas que ya pasaron desaparecen de la lista.
                </p>
                <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                  {dias.map((d) => {
                    const inf = desglosarFecha(d);
                    const activo = fecha === d;
                    return (
                      <button
                        key={d} onClick={() => { setFecha(d); setHoraInicio(''); }}
                        className={`min-w-[74px] shrink-0 rounded-2xl border px-3 py-2.5 text-center transition ${
                          activo ? 'border-neutral-900 bg-neutral-900 text-white shadow-lg shadow-amber-400/20'
                                 : 'border-white/10 bg-[#141A21] text-[#93A1B1] hover:-translate-y-0.5 hover:border-amber-400/40'
                        }`}
                      >
                        <span className="block text-[10px] font-bold uppercase">{inf.esHoy ? 'Hoy' : inf.diaSemanaCorto}</span>
                        <span className="font-heading block text-xl font-black">{inf.dia}</span>
                        <span className="block text-[10px] uppercase">{inf.mesCorto}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/8 pb-3">
                  <h4 className="font-heading text-base font-black text-[#EAF0F6]">
                    Franjas de {barbero.nombre.split(' ')[0]} · {fechaLarga(fecha)}
                  </h4>
                  <span className="flex items-center gap-1.5 rounded-full bg-amber-400/12 px-3 py-1 text-[11px] font-bold text-amber-700">
                    <Timer className="h-3.5 w-3.5" /> Bloques de {duracionLegible(duracionTotal)}
                  </span>
                </div>

                {barberoDescansa ? (
                  <p className="mt-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-700">
                    {barbero.nombre.split(' ')[0]} no atiende este día. Elige otra fecha u otro barbero.
                  </p>
                ) : !franjas.length ? (
                  <p className="mt-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-700">
                    No quedan turnos disponibles para este día. Prueba con la siguiente fecha.
                  </p>
                ) : (
                  <>
                    <p className="mt-3 text-[11px] font-semibold text-[#6B7A8C]">MAÑANA</p>
                    <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {franjasManana.length ? franjasManana.map((f) => <BotonFranja key={f.ini} f={f} />)
                        : <p className="col-span-4 text-xs text-[#6B7A8C]">Sin turnos en la mañana para este barbero.</p>}
                    </div>

                    <p className="mt-4 text-[11px] font-semibold text-[#6B7A8C]">TARDE Y NOCHE</p>
                    <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {franjasTarde.length ? franjasTarde.map((f) => <BotonFranja key={f.ini} f={f} />)
                        : <p className="col-span-4 text-xs text-[#6B7A8C]">Sin turnos en la tarde para este barbero.</p>}
                    </div>
                  </>
                )}

                {horaInicio && (
                  <div className="anim-aparecer mt-4 flex items-center gap-2 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm font-bold text-amber-700">
                    <Check className="h-4 w-4" />
                    Reservarás de {hora12(horaInicio)} a {hora12(sumarMinutos(horaInicio, duracionTotal))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PASO 4 · CONFIRMAR */}
          {paso === 4 && (
            <div className="anim-aparecer space-y-4">
              <h4 className="font-heading text-lg font-black text-[#EAF0F6]">Personaliza y confirma</h4>

              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-[#93A1B1]">
                  <Plus className="h-3.5 w-3.5 text-amber-600" /> Extras opcionales (suman tiempo y valor)
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {EXTRAS_SERVICIO.map((e) => {
                    const on = extras.includes(e.id);
                    return (
                      <button
                        key={e.id} onClick={() => alternarExtra(e.id)}
                        className={`flex items-center justify-between rounded-2xl border p-3 text-left text-xs transition ${
                          on ? 'border-amber-400/60 bg-amber-400/10 text-amber-700' : 'border-white/10 bg-[#141A21] text-[#93A1B1] hover:border-amber-400/30'
                        }`}
                      >
                        <span className="flex items-center gap-2 font-semibold">
                          <span>{e.icono}</span> {e.id}
                          <span className="text-[10px] text-[#6B7A8C]">+{e.minutos} min</span>
                        </span>
                        <span className="font-black text-[#EAF0F6]">+$6k</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {usuario && usuario.puntos >= 50 && (
                <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3.5">
                  <span className="flex items-center gap-2 text-xs font-bold text-amber-700">
                    <Crown className="h-4 w-4 text-amber-600" />
                    Usar 50 puntos y descontar $5.000 (tienes {usuario.puntos})
                  </span>
                  <input type="checkbox" checked={usarPuntos} onChange={(e) => setUsarPuntos(e.target.checked)}
                    className="h-5 w-5 accent-amber-500" />
                </label>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre completo" className={inputCls} />
                <input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Teléfono WhatsApp" className={inputCls} />
              </div>
              <input value={observaciones} onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Indicaciones para el barbero (opcional)" className={inputCls} />

              {/* Resumen */}
              <div className="card overflow-hidden">
                <div className="flex items-center gap-2 border-b border-white/8 bg-[#0F151C] px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-[#93A1B1]">
                  <CalendarDays className="h-4 w-4 text-amber-600" /> Resumen de tu reserva
                </div>
                <div className="space-y-2 p-4 text-sm">
                  <div className="flex justify-between"><span className="text-[#93A1B1]">Servicio</span><span className="font-semibold text-[#EAF0F6]">{servicio.nombre}</span></div>
                  <div className="flex justify-between"><span className="text-[#93A1B1]">Barbero</span><span className="font-semibold text-[#EAF0F6]">{barbero.nombre}</span></div>
                  <div className="flex justify-between"><span className="text-[#93A1B1]">Día</span><span className="font-semibold text-[#EAF0F6]">{fechaLarga(fecha)}</span></div>
                  <div className="flex justify-between">
                    <span className="text-[#93A1B1]">Rango horario</span>
                    <span className="font-black text-amber-700">
                      {horaInicio ? `${hora12(horaInicio)} – ${hora12(sumarMinutos(horaInicio, duracionTotal))}` : 'Sin seleccionar'}
                    </span>
                  </div>
                  <div className="flex justify-between"><span className="text-[#93A1B1]">Duración</span><span className="font-semibold text-[#EAF0F6]">{duracionLegible(duracionTotal)}</span></div>
                  {costoExtras > 0 && <div className="flex justify-between text-[#93A1B1]"><span>Extras ({extras.length})</span><span>+{formatoCOP(costoExtras)}</span></div>}
                  {descuento > 0 && <div className="flex justify-between text-emerald-600"><span>Descuento por puntos</span><span>-{formatoCOP(descuento)}</span></div>}
                  <div className="flex items-center justify-between border-t border-white/8 pt-2">
                    <span className="font-bold text-[#EAF0F6]">Total</span>
                    <span className="font-heading text-2xl font-black text-[#EAF0F6]">{formatoCOP(total)}</span>
                  </div>
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700">
                    <Sparkles className="h-3.5 w-3.5" /> Ganarás +{servicio.puntos_otorga} puntos Globde con esta cita.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pie */}
        <div className="flex shrink-0 items-center justify-between border-t border-white/8 bg-[#141A21] px-5 py-4 sm:px-7">
          {paso > 1 ? (
            <button onClick={() => setPaso(paso - 1)} className="flex items-center gap-1.5 rounded-2xl border border-white/12 px-4 py-2.5 text-xs font-bold text-[#93A1B1] transition hover:bg-white/5">
              <ArrowLeft className="h-4 w-4" /> Atrás
            </button>
          ) : <span />}

          {paso < 4 ? (
            <button
              onClick={siguiente}
              disabled={Boolean(faltanteDelPaso(paso))}
              title={faltanteDelPaso(paso) || undefined}
              className="btn-primario flex items-center gap-2 rounded-2xl px-6 py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continuar <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button onClick={confirmar} className="btn-oro flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-black">
              <Check className="h-4 w-4" /> Confirmar mi cita
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
