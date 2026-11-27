import React, { useEffect, useMemo, useState } from 'react';
import {
  X, Check, ArrowRight, ArrowLeft, Clock, Star, Crown, Timer,
  CalendarDays, Sparkles, CircleAlert, Plus, LogIn, UserPlus, ShieldCheck, UserRound,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { ClienteBusqueda } from '../../types';
import { EXTRAS_SERVICIO, SERVICIOS, BARBEROS } from '../../data/mockData';
import {
  formatoCOP, hoyISO, sumarDiasISO, desglosarFecha,
  sumarMinutos, hora12, duracionLegible, fechaLarga, validarCorreo,
} from '../../utils/helpers';
import { apiRequest } from '../../utils/apiClient';
import { BarberoFoto } from './BarberoFoto';

const PASOS = ['Servicio', 'Barbero', 'Fecha y hora', 'Confirmar'];

interface SlotDisponibilidad {
  hora_inicio: string;
  hora_fin: string;
  disponible: boolean;
}

export const BookingWizard: React.FC = () => {
  const {
    reservaAbierta, cerrarReserva, configReserva, servicios, barberos,
    catalogoCortes, usuario, crearCita, buscarClientes, abrirAuth,
    solicitarCodigoCitaInvitado, confirmarCitaInvitado,
  } = useApp();

  const [paso, setPaso] = useState(1);
  const [idServicio, setIdServicio] = useState(1);
  const [idBarbero, setIdBarbero] = useState(1);
  const [fecha, setFecha] = useState(hoyISO());
  const [hoySinDisponibilidad, setHoySinDisponibilidad] = useState(false);
  const [horaInicio, setHoraInicio] = useState('');
  const [solicitudInvitado, setSolicitudInvitado] = useState<number | null>(null);
  const [codigoInvitado, setCodigoInvitado] = useState('');
  const [mensajeCodigo, setMensajeCodigo] = useState('');
  const [enviandoCodigo, setEnviandoCodigo] = useState(false);
  const [reservandoCita, setReservandoCita] = useState(false);
  const [extras, setExtras] = useState<string[]>([]);
  const [usarPuntos, setUsarPuntos] = useState(false);
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [error, setError] = useState('');
  const [slots, setSlots] = useState<SlotDisponibilidad[]>([]);
  const [cargandoSlots, setCargandoSlots] = useState(false);
  const [errorSlots, setErrorSlots] = useState('');
  const [clienteTexto, setClienteTexto] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteBusqueda | null>(null);
  const [resultadosCliente, setResultadosCliente] = useState<ClienteBusqueda[]>([]);
  const [buscandoClientes, setBuscandoClientes] = useState(false);
  const [errorBusquedaCliente, setErrorBusquedaCliente] = useState('');
  const [saltarBarbero, setSaltarBarbero] = useState(false);

  useEffect(() => {
    if (!reservaAbierta) return;
    setSaltarBarbero(Boolean(configReserva.barberoId));
    setPaso(configReserva.servicioId ? 2 : 1);
    if (configReserva.servicioId) setIdServicio(configReserva.servicioId);
    if (configReserva.barberoId) setIdBarbero(configReserva.barberoId);
    setFecha(hoyISO());
    setHoySinDisponibilidad(false);
    setHoraInicio('');
    setSolicitudInvitado(null);
    setCodigoInvitado('');
    setMensajeCodigo('');
    setEnviandoCodigo(false);
    setReservandoCita(false);
    setError('');
    setClienteTexto('');
    setClienteSeleccionado(null);
    setResultadosCliente([]);
    setErrorBusquedaCliente('');
  }, [reservaAbierta, configReserva]);

  useEffect(() => {
    if (!reservaAbierta || !usuario) return;
    setNombre(usuario.nombre);
    setCorreo(usuario.correo);
    setTelefono(usuario.telefono);
  }, [reservaAbierta, usuario]);

  // Respaldo: si el backend no trae catálogo, se usan los datos mock
  const listaServicios = servicios.length ? servicios : SERVICIOS;
  const listaBarberos = barberos.length ? barberos : BARBEROS;

  // Si el catálogo de la API llega después de abrir la reserva, conserva la
  // selección cuando exista; de lo contrario selecciona un servicio válido.
  useEffect(() => {
    if (listaServicios.length && !listaServicios.some((s) => s.id_servicio === idServicio)) {
      setIdServicio(listaServicios[0].id_servicio);
    }
  }, [listaServicios, idServicio]);

  const servicio = listaServicios.find((s) => s.id_servicio === idServicio) ?? listaServicios[0];
  const barbero = listaBarberos.find((b) => b.id_barbero === idBarbero) ?? listaBarberos[0];
  const corteDeServicio = (servicioId: number, nombre: string) =>
    catalogoCortes.find((corte) => corte.id_servicio === servicioId) ??
    catalogoCortes.find((corte) => corte.nombre.trim().toLowerCase() === nombre.trim().toLowerCase()) ??
    catalogoCortes.find((corte) => corte.id_corte === servicioId);
  const corteSeleccionado = servicio ? corteDeServicio(servicio.id_servicio, servicio.nombre) : undefined;

  const minutosExtras = extras.reduce((a, e) => a + (EXTRAS_SERVICIO.find((x) => x.id === e)?.minutos ?? 0), 0);
  const costoExtras = extras.reduce((a, e) => a + (EXTRAS_SERVICIO.find((x) => x.id === e)?.precio ?? 0), 0);
  const duracionTotal = servicio.duracion_minutos + minutosExtras;
  const subtotal = servicio.precio + costoExtras;
  const puedeCanjearPuntos = usuario?.id_rol === 3;
  const puntosUsables = puedeCanjearPuntos && usarPuntos && usuario && usuario.puntos >= 50 ? 50 : 0;
  const descuento = (puntosUsables / 100) * 10000;
  const total = Math.max(0, subtotal - descuento);

  const dias = useMemo(() => Array.from({ length: 10 }, (_, i) => sumarDiasISO(i)), []);

  useEffect(() => {
    if (!reservaAbierta) return;
    const controlador = new AbortController();
    setHoraInicio('');
    setSlots([]);
    setErrorSlots('');
    setCargandoSlots(true);
    if (fecha === hoyISO()) setHoySinDisponibilidad(false);
    const parametros = new URLSearchParams({
      fecha,
      id_servicio: String(idServicio),
      duracion_adicional_minutos: String(minutosExtras),
    });
    apiRequest<{ slots: SlotDisponibilidad[] }>(
      `/barberos/${idBarbero}/disponibilidad?${parametros.toString()}`,
      { signal: controlador.signal },
    )
      .then((respuesta) => {
        if (controlador.signal.aborted) return;
        setSlots(respuesta.slots);
        if (fecha === hoyISO()) {
          const hayDisponibilidad = respuesta.slots.some((slot) => slot.disponible);
          setHoySinDisponibilidad(!hayDisponibilidad);
          if (!hayDisponibilidad) {
            setFecha(sumarDiasISO(1));
            setHoraInicio('');
          }
        }
      })
      .catch((causa: unknown) => {
        if (!controlador.signal.aborted) {
          setErrorSlots(causa instanceof Error ? causa.message : 'No se pudo consultar la disponibilidad.');
        }
      })
      .finally(() => {
        if (!controlador.signal.aborted) setCargandoSlots(false);
      });
    return () => controlador.abort();
  }, [reservaAbierta, idBarbero, idServicio, fecha, minutosExtras]);

  const franjas = useMemo(
    () => slots.filter((slot) => slot.disponible).map((slot) => ({
      ini: slot.hora_inicio,
      fin: slot.hora_fin,
    })),
    [slots],
  );

  const franjasManana = franjas.filter((f) => Number(f.ini.split(':')[0]) < 13);
  const franjasTarde = franjas.filter((f) => Number(f.ini.split(':')[0]) >= 13);

  if (!reservaAbierta) return null;

  const invalidarCodigoInvitado = () => {
    setSolicitudInvitado(null);
    setCodigoInvitado('');
    setMensajeCodigo('');
  };

  const alternarExtra = (id: string) => {
    setHoraInicio('');
    setExtras((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
    invalidarCodigoInvitado();
    setPaso(3);
  };

  const siguiente = () => {
    setError('');
    if (paso === 3 && !horaInicio) return setError('Selecciona una franja horaria disponible para continuar.');
    setPaso((p) => (p === 1 && saltarBarbero ? 3 : Math.min(4, p + 1)));
  };

  const solicitarCodigoInvitado = async () => {
    if (!validarCorreo(correo)) return setError('Ingresa un correo válido para enviarte el código de confirmación.');
    if (!nombre.trim() || !telefono.trim()) return setError('Completa tu nombre y teléfono de contacto.');
    setEnviandoCodigo(true);
    const resultado = await solicitarCodigoCitaInvitado({
      servicio_id: idServicio,
      barbero_id: idBarbero,
      fecha,
      hora_inicio: horaInicio,
      extras,
      usar_puntos: false,
      puntos_a_usar: 0,
      nombre,
      correo,
      telefono,
      observaciones,
    });
    setEnviandoCodigo(false);
    if (!resultado.ok || !resultado.idSolicitud) {
      setError(resultado.mensaje);
      return;
    }
    setSolicitudInvitado(resultado.idSolicitud);
    setCodigoInvitado('');
    setMensajeCodigo(resultado.mensaje);
    setError('');
  };

  const confirmar = async () => {
    if (reservandoCita || enviandoCodigo) return;
    setError('');
    const reservaInterna = Boolean(usuario && usuario.id_rol !== 3);
    if (reservaInterna && !clienteSeleccionado) {
      return setError('Busca y selecciona el cliente de esta cita.');
    }
    if (!horaInicio) {
      setPaso(3);
      return setError('Selecciona una franja horaria antes de confirmar.');
    }
    if (!nombre.trim() || !telefono.trim()) return setError('Completa tu nombre y teléfono de contacto.');
    if (!usuario && !validarCorreo(correo)) return setError('Ingresa un correo válido para enviarte el código de confirmación.');

    if (!usuario) {
      if (solicitudInvitado !== null) {
        if (!/^[0-9]{6}$/.test(codigoInvitado)) return setError('Ingresa el código de seis dígitos que enviamos a tu correo.');
        setEnviandoCodigo(true);
        try {
          const resultado = await confirmarCitaInvitado(solicitudInvitado, codigoInvitado);
          if (!resultado.ok) setError(resultado.mensaje);
        } finally {
          setEnviandoCodigo(false);
        }
        return;
      }
      return solicitarCodigoInvitado();
    }

    setReservandoCita(true);
    try {
      const r = await crearCita({
        servicio_id: idServicio, barbero_id: idBarbero, fecha, hora_inicio: horaInicio,
        extras, usar_puntos: usarPuntos, puntos_a_usar: puntosUsables,
        nombre, correo, telefono, observaciones,
        ...(reservaInterna && clienteSeleccionado ? { id_cliente: clienteSeleccionado.id_cliente } : {}),
      });
      if (!r.ok) setError(r.mensaje);
    } finally {
      setReservandoCita(false);
    }
  };

  const buscarClienteInterno = async () => {
    if (clienteTexto.trim().length < 2) {
      setErrorBusquedaCliente('Escribe al menos 2 caracteres para buscar.');
      return;
    }
    setBuscandoClientes(true);
    setErrorBusquedaCliente('');
    try {
      setResultadosCliente(await buscarClientes(clienteTexto));
    } catch (causa) {
      setErrorBusquedaCliente(causa instanceof Error ? causa.message : 'No se pudo buscar el cliente.');
    } finally {
      setBuscandoClientes(false);
    }
  };

  const seleccionarCliente = (cliente: ClienteBusqueda) => {
    setClienteSeleccionado(cliente);
    setResultadosCliente([]);
    setNombre(cliente.nombre);
    setCorreo(cliente.correo);
    setTelefono(cliente.telefono ?? '');
    setErrorBusquedaCliente('');
  };

  const inputCls = 'w-full rounded-xl border border-white/10 bg-[#0F151C] px-3.5 py-2.5 text-sm text-[#EAF0F6] placeholder-[#5A6878] outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-400/15';

  const BotonFranja: React.FC<{ f: { ini: string; fin: string } }> = ({ f }) => (
    <button
      type="button" onClick={() => {
        setHoraInicio(f.ini);
        invalidarCodigoInvitado();
      }}
      className={`rounded-2xl border px-2 py-2 text-center transition ${
        horaInicio === f.ini
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
            <button
              onClick={cerrarReserva}
              disabled={reservandoCita}
              aria-label="Cerrar reserva"
              className="rounded-full bg-white/10 p-2 transition hover:bg-white/20 disabled:cursor-wait disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className={`mt-4 grid gap-1.5 ${saltarBarbero ? 'grid-cols-3' : 'grid-cols-4'}`}>
            {PASOS
              .map((etiqueta, i) => ({ id: i + 1, etiqueta }))
              .filter((p) => !(saltarBarbero && p.id === 2))
              .map((p, i) => (
                <button
                  key={p.etiqueta} onClick={() => p.id < paso && setPaso(p.id)}
                  className={`rounded-xl px-1 py-1.5 text-[11px] font-bold transition ${
                    paso === p.id ? 'bg-amber-400 text-[#1A1400] shadow' : paso > p.id ? 'bg-white/20 text-white' : 'bg-white/8 text-white/60'
                  }`}
                >
                  <span className="flex items-center justify-center gap-1">
                    {paso > p.id ? <Check className="h-3 w-3" /> : <span>{i + 1}</span>}
                    <span className="hidden sm:inline">{p.etiqueta}</span>
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
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {listaServicios.map((s) => {
                  const corte = corteDeServicio(s.id_servicio, s.nombre);
                  const nombre = corte?.nombre ?? s.nombre;
                  return (
                    <button
                      key={s.id_servicio}
                      onClick={() => {
                        setIdServicio(s.id_servicio);
                        setHoraInicio('');
                        setSolicitudInvitado(null);
                        setCodigoInvitado('');
                        setMensajeCodigo('');
                      }}
                      className={`group card card-hover overflow-hidden text-left ${idServicio === s.id_servicio ? 'seleccionada' : ''}`}
                    >
                      <div className="relative h-28 overflow-hidden">
                        <img src={corte?.imagen_url ?? s.imagen_url} alt={nombre} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#141A21] via-[#141A21]/20 to-transparent" />
                        <span className="absolute left-3 top-3 rounded-full border border-white/10 bg-[#0B0F14]/85 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-amber-300 backdrop-blur">
                          {corte?.categoria ?? s.categoria}
                        </span>
                        {s.popular && (
                          <span className="absolute right-3 top-3 rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-black text-[#2B1E04]">
                            Popular
                          </span>
                        )}
                      </div>

                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <h5 className="font-heading text-lg font-black text-[#EAF0F6]">{nombre}</h5>
                          <span className="rounded-full bg-amber-400/12 px-2 py-0.5 text-[10px] font-black text-amber-700">
                            +{s.puntos_otorga} pts
                          </span>
                        </div>
                        <p className="mt-2 text-[11px] leading-relaxed text-[#93A1B1] line-clamp-3">{corte?.descripcion ?? s.descripcion}</p>

                        <div className="mt-4 flex items-center justify-between border-t border-white/8 pt-3">
                          <div>
                            <span className="block text-[10px] font-bold uppercase text-[#6B7A8C]">Valor</span>
                            <span className="font-heading text-xl font-black text-[#EAF0F6]">{formatoCOP(s.precio)}</span>
                          </div>
                          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#93A1B1]">
                            <Timer className="h-3.5 w-3.5 text-amber-600" /> {duracionLegible(s.duracion_minutos)}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* PASO 2 · BARBERO */}
          {paso === 2 && (
            <div className="anim-aparecer space-y-3">
              <h4 className="font-heading text-lg font-black text-[#EAF0F6]">Elige a tu barbero</h4>
              {listaBarberos.map((b) => (
                <button
                  key={b.id_barbero} onClick={() => {
                    setIdBarbero(b.id_barbero);
                    setHoraInicio('');
                    setSolicitudInvitado(null);
                    setCodigoInvitado('');
                    setMensajeCodigo('');
                  }}
                  className={`card card-hover flex w-full items-center gap-4 p-4 text-left ${idBarbero === b.id_barbero ? 'seleccionada' : ''}`}
                >
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#1B2024] text-amber-400">
                    <BarberoFoto
                      idBarbero={b.id_barbero}
                      nombre={b.nombre}
                      fotoUrl={b.foto_url}
                      className="h-full w-full object-cover"
                      iconClassName="h-7 w-7"
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-sm font-black text-[#EAF0F6]">
                        {b.nombre}
                        <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-black text-amber-700">{b.nivel}</span>
                      </span>
                      <span className="flex items-center gap-1 text-xs font-black text-amber-600">
                        <Star className="h-3.5 w-3.5 fill-amber-500" />
                        {b.total_resenas > 0 ? b.rating.toFixed(1) : 'Sin calificaciones aún'}
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
                <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                  {dias.filter((d) => d !== hoyISO() || !hoySinDisponibilidad).map((d) => {
                    const inf = desglosarFecha(d);
                    const activo = fecha === d;
                    return (
                      <button
                        key={d} onClick={() => {
                          setFecha(d);
                          setHoraInicio('');
                          setSolicitudInvitado(null);
                          setCodigoInvitado('');
                          setMensajeCodigo('');
                        }}
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

                {errorSlots ? (
                  <p role="alert" className="mt-4 rounded-xl bg-rose-400/10 p-3 text-xs font-semibold text-rose-300">
                    No se pudo consultar la disponibilidad: {errorSlots}
                  </p>
                ) : cargandoSlots ? (
                  <p className="mt-4 text-xs text-[#93A1B1]">Consultando horarios disponibles…</p>
                ) : franjas.length === 0 ? (
                  <p className="mt-4 text-xs text-[#93A1B1]">No hay horarios disponibles para esta fecha y servicio.</p>
                ) : (
                  <>
                    <p className="mt-3 text-[11px] font-semibold text-[#6B7A8C]">MAÑANA</p>
                    <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {franjasManana.length ? franjasManana.map((f) => <BotonFranja key={f.ini} f={f} />)
                        : <p className="col-span-4 text-xs text-[#6B7A8C]">Sin turnos en la mañana para este barbero.</p>}
                    </div>

                    <p className="mt-4 text-[11px] font-semibold text-[#6B7A8C]">TARDE Y NOCHE</p>
                    <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {franjasTarde.map((f) => <BotonFranja key={f.ini} f={f} />)}
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
                          on ? 'border-neutral-900 bg-amber-400/10 text-amber-700' : 'border-white/10 bg-[#141A21] text-[#93A1B1] hover:border-neutral-900'
                        }`}
                      >
                        <span className="flex min-w-0 flex-col gap-1 font-semibold">
                          <span className="text-sm font-bold text-[#EAF0F6]">{e.nombre}</span>
                          <span className="text-[10px] text-[#6B7A8C]">+{e.minutos} min</span>
                        </span>
                        <span className="shrink-0 font-black text-[#EAF0F6]">+{formatoCOP(e.precio)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {usuario?.id_rol === 3 && usuario.puntos >= 50 && (
                <label className="booking-points-toggle flex cursor-pointer items-center justify-between rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3.5">
                  <span className="flex items-center gap-2 text-xs font-bold text-amber-700">
                    <Crown className="h-4 w-4 text-amber-600" />
                    Usar 50 puntos y descontar $5.000 (tienes {usuario.puntos})
                  </span>
                  <input type="checkbox" checked={usarPuntos} onChange={(e) => setUsarPuntos(e.target.checked)}
                    className="h-5 w-5 accent-amber-500" />
                </label>
              )}

              {usuario && usuario.id_rol !== 3 && (
                <section className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4">
                  <p className="text-xs font-black text-[#EAF0F6]">Cliente de la cita</p>
                  {clienteSeleccionado ? (
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-cyan-200">{clienteSeleccionado.nombre}</p>
                        <p className="truncate text-[11px] text-[#93A1B1]">{clienteSeleccionado.correo} · {clienteSeleccionado.telefono || 'Sin teléfono'}</p>
                      </div>
                      <button type="button" onClick={() => {
                        setClienteSeleccionado(null);
                        setClienteTexto('');
                        setNombre('');
                        setCorreo('');
                        setTelefono('');
                      }} className="shrink-0 rounded-lg border border-white/12 px-3 py-1.5 text-[11px] font-bold text-[#93A1B1]">
                        Cambiar
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="mt-2 flex gap-2">
                        <input value={clienteTexto} onChange={(evento) => setClienteTexto(evento.target.value)}
                          onKeyDown={(evento) => {
                            if (evento.key === 'Enter') {
                              evento.preventDefault();
                              void buscarClienteInterno();
                            }
                          }}
                          placeholder="Buscar por nombre, correo o teléfono" className={inputCls} />
                        <button type="button" onClick={() => void buscarClienteInterno()} disabled={buscandoClientes}
                          className="shrink-0 rounded-xl bg-cyan-400 px-3 text-xs font-black text-[#06232A] disabled:opacity-50">
                          {buscandoClientes ? 'Buscando…' : 'Buscar'}
                        </button>
                      </div>
                      {errorBusquedaCliente && <p role="alert" className="mt-2 text-[11px] font-semibold text-rose-300">{errorBusquedaCliente}</p>}
                      {resultadosCliente.length > 0 && (
                        <div className="mt-2 max-h-36 overflow-y-auto rounded-xl border border-white/10">
                          {resultadosCliente.map((cliente) => (
                            <button key={cliente.id_cliente} type="button" onClick={() => seleccionarCliente(cliente)}
                              className="block w-full border-b border-white/8 px-3 py-2 text-left last:border-0 hover:bg-white/5">
                              <span className="block text-xs font-bold text-[#EAF0F6]">{cliente.nombre}</span>
                              <span className="block text-[10px] text-[#93A1B1]">{cliente.correo} · {cliente.telefono || 'Sin teléfono'}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </section>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input value={nombre} onChange={(e) => {
                  setNombre(e.target.value);
                  invalidarCodigoInvitado();
                }} placeholder="Nombre completo"
                  readOnly={Boolean(usuario && usuario.id_rol !== 3)} className={inputCls} />
                <input value={correo} onChange={(e) => {
                  setCorreo(e.target.value);
                  invalidarCodigoInvitado();
                }} placeholder="Correo electrónico"
                  readOnly={Boolean(usuario)} className={inputCls} />
                <input value={telefono} onChange={(e) => {
                  setTelefono(e.target.value);
                  invalidarCodigoInvitado();
                }} placeholder="Teléfono WhatsApp"
                  readOnly={Boolean(usuario && usuario.id_rol !== 3)} className={inputCls} />
              </div>
              {!usuario && (
                <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#141A21]">
                  <div className="flex items-start gap-3 p-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-700">
                      <UserRound className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h5 className="text-sm font-black text-[#EAF0F6]">¿Tienes una cuenta?</h5>
                      <p className="mt-1 text-xs leading-relaxed text-[#93A1B1]">
                        Inicia sesión para consultar tus citas o crea una cuenta para guardar tu historial.
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => abrirAuth('login')}
                          className="flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-3 py-2.5 text-xs font-black text-[#1A1400] transition hover:-translate-y-0.5 hover:shadow-md"
                        >
                          <LogIn className="h-4 w-4" /> Iniciar sesión
                        </button>
                        <button
                          type="button"
                          onClick={() => abrirAuth('registro')}
                          className="flex items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/5 px-3 py-2.5 text-xs font-black text-[#EAF0F6] transition hover:border-amber-400/50 hover:bg-white/10"
                        >
                          <UserPlus className="h-4 w-4" /> Crear cuenta
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 border-t border-white/8 bg-emerald-500/5 px-4 py-3">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <p className="text-[11px] leading-relaxed text-[#93A1B1]">
                      ¿Prefieres no registrarte? Puedes continuar como invitado; verificaremos tu correo para confirmar la cita.
                    </p>
                  </div>
                </section>
              )}
              {!usuario && solicitudInvitado !== null && (
                <div className="space-y-2 rounded-xl border border-cyan-400/30 bg-cyan-400/8 p-3">
                  <p role="status" className="text-xs font-semibold text-cyan-800">{mensajeCodigo}</p>
                  <label className="block text-xs font-bold text-[#93A1B1]" htmlFor="codigo-reserva-invitado">Código de verificación</label>
                  <div className="flex gap-2">
                    <input
                      id="codigo-reserva-invitado"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={codigoInvitado}
                      onChange={(e) => setCodigoInvitado(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className={inputCls}
                    />
                    <button
                      type="button"
                      onClick={() => void solicitarCodigoInvitado()}
                      disabled={enviandoCodigo}
                      className="shrink-0 rounded-xl border border-white/12 px-3 text-xs font-bold text-[#93A1B1] disabled:opacity-50"
                    >
                      {enviandoCodigo ? 'Enviando…' : 'Reenviar código'}
                    </button>
                  </div>
                </div>
              )}
              <input value={observaciones} onChange={(e) => {
                setObservaciones(e.target.value);
                invalidarCodigoInvitado();
              }}
                placeholder="Indicaciones para el barbero (opcional)" className={inputCls} />

              {/* Resumen */}
              <div className="card overflow-hidden">
                <div className="flex items-center gap-2 border-b border-white/8 bg-[#0F151C] px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-[#93A1B1]">
                  <CalendarDays className="h-4 w-4 text-amber-600" /> Resumen de tu reserva
                </div>
                <div className="space-y-2 p-4 text-sm">
                  <div className="flex justify-between"><span className="text-[#93A1B1]">Servicio</span><span className="font-semibold text-[#EAF0F6]">{corteSeleccionado?.nombre ?? servicio.nombre}</span></div>
                  <div className="flex justify-between"><span className="text-[#93A1B1]">Barbero</span><span className="font-semibold text-[#EAF0F6]">{barbero.nombre}</span></div>
                  <div className="flex justify-between"><span className="text-[#93A1B1]">Día</span><span className="font-semibold text-[#EAF0F6]">{fechaLarga(fecha)}</span></div>
                  <div className="flex justify-between">
                    <span className="text-[#93A1B1]">Rango horario</span>
                    {horaInicio
                      ? <span className="font-black text-amber-700">{hora12(horaInicio)} – {hora12(sumarMinutos(horaInicio, duracionTotal))}</span>
                      : <button type="button" onClick={() => setPaso(3)} className="font-black text-rose-500 underline">Seleccionar horario</button>}
                  </div>
                  <div className="flex justify-between"><span className="text-[#93A1B1]">Duración</span><span className="font-semibold text-[#EAF0F6]">{duracionLegible(duracionTotal)}</span></div>
                  {costoExtras > 0 && <div className="flex justify-between text-[#93A1B1]"><span>Extras ({extras.length})</span><span>+{formatoCOP(costoExtras)}</span></div>}
                  {descuento > 0 && <div className="flex justify-between text-emerald-600"><span>Descuento por puntos</span><span>-{formatoCOP(descuento)}</span></div>}
                  <div className="flex items-center justify-between border-t border-white/8 pt-2">
                    <span className="font-bold text-[#EAF0F6]">Total</span>
                    <span className="font-heading text-2xl font-black text-[#EAF0F6]">{formatoCOP(total)}</span>
                  </div>
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700">
                    <Sparkles className="h-3.5 w-3.5" /> Al completar el servicio se acreditan +{servicio.puntos_otorga} puntos.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pie */}
        <div className="flex shrink-0 items-center justify-between border-t border-white/8 bg-[#141A21] px-5 py-4 sm:px-7">
          {paso > 1 ? (
            <button
              onClick={() => setPaso(paso === 3 && saltarBarbero ? 1 : paso - 1)}
              disabled={reservandoCita}
              className="flex items-center gap-1.5 rounded-2xl border border-white/12 px-4 py-2.5 text-xs font-bold text-[#93A1B1] transition hover:bg-white/5 disabled:cursor-wait disabled:opacity-50"
            >
              <ArrowLeft className="h-4 w-4" /> Atrás
            </button>
          ) : <span />}

          {paso < 4 ? (
            <button onClick={siguiente} className="btn-primario flex items-center gap-2 rounded-2xl px-6 py-2.5 text-sm font-bold">
              Continuar <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => void confirmar()}
              disabled={enviandoCodigo || reservandoCita}
              aria-busy={enviandoCodigo || reservandoCita}
              className="btn-oro flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-black disabled:cursor-wait disabled:opacity-50"
            >
              {reservandoCita || enviandoCodigo ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {reservandoCita ? 'Reservando cita…' : enviandoCodigo ? 'Procesando…' : !usuario ? solicitudInvitado === null ? 'Enviar código de confirmación' : 'Confirmar mi cita' : 'Confirmar mi cita'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
