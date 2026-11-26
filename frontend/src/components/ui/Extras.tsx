import React, { useEffect, useState } from 'react';
import {
  X, Sparkles, ArrowRight, RotateCcw, Crown, Clock, Check, Bell,
  CalendarDays, Scissors, MapPin, Phone, ShieldCheck, Code2, UserRound,
  Mail, LogIn, UserPlus,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatoCOP, hoyISO, sumarDiasISO, duracionLegible } from '../../utils/helpers';
import { apiRequest } from '../../utils/apiClient';

type FranjaEspera = 'manana' | 'tarde' | 'cualquiera';

interface HorarioNegocio {
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  activo: boolean;
}

interface CierreNegocio {
  fecha: string;
}

const fechaSolicitable = (
  fecha: string,
  franja: FranjaEspera,
  horarios: HorarioNegocio[],
  cierres: CierreNegocio[],
): boolean => {
  if (fecha < hoyISO() || cierres.some((cierre) => cierre.fecha === fecha)) return false;
  const [ano, mes, dia] = fecha.split('-').map(Number);
  const diaSemana = new Date(ano, mes - 1, dia).getDay() || 7;
  const ahora = new Date();
  const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();
  const limiteInicio = franja === 'manana' ? 0 : franja === 'tarde' ? 13 * 60 : 0;
  const limiteFin = franja === 'manana' ? 13 * 60 : franja === 'tarde' ? 24 * 60 : 24 * 60;

  return horarios.some((horario) => {
    if (!horario.activo || horario.dia_semana !== diaSemana) return false;
    const [horaInicio, minutoInicio] = horario.hora_inicio.split(':').map(Number);
    const [horaFin, minutoFin] = horario.hora_fin.split(':').map(Number);
    const inicio = Math.max(horaInicio * 60 + minutoInicio, limiteInicio);
    const fin = Math.min(horaFin * 60 + minutoFin, limiteFin);
    return fin > inicio && (fecha !== hoyISO() || fin > minutosAhora);
  });
};

const buscarProximaFechaSolicitable = (
  franja: FranjaEspera,
  horarios: HorarioNegocio[],
  cierres: CierreNegocio[],
): string | null => {
  for (let dias = 0; dias <= 90; dias++) {
    const fecha = sumarDiasISO(dias);
    if (fechaSolicitable(fecha, franja, horarios, cierres)) return fecha;
  }
  return null;
};

const mensajeErrorEspera = (causa: unknown): string => {
  if (causa instanceof Error && causa.message.toLowerCase() === 'not found') {
    return 'El servidor no reconoce esta ruta todavía. Recarga la aplicación y, si continúa, reinicia el backend.';
  }
  return causa instanceof Error ? causa.message : 'No se pudo completar la solicitud.';
};

/* =========================================================
   NOTIFICACIONES FLOTANTES
   ========================================================= */
export const Toasts: React.FC = () => {
  const { notificaciones, eliminarNotificacion } = useApp();
  const [errorEliminar, setErrorEliminar] = useState('');
  if (!notificaciones.length) return null;

  const estilo: Record<string, string> = {
    cita: 'border-amber-400/40',
    puntos: 'border-amber-400/30',
    promo: 'border-neutral-300',
    sistema: 'border-white/10',
    error: 'border-rose-400/30',
    recordatorio: 'border-neutral-300',
  };
  const punto: Record<string, string> = {
    cita: 'bg-amber-400', puntos: 'bg-amber-400', promo: 'bg-neutral-800',
    sistema: 'bg-[#6B7A8C]', error: 'bg-rose-400', recordatorio: 'bg-neutral-800',
  };

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-[min(92vw,22rem)] flex-col gap-2.5">
      {notificaciones.map((n) => (
        <div key={n.id} className={`anim-derecha pointer-events-auto rounded-2xl border bg-[#141A21] p-3.5 shadow-[0_24px_50px_-25px_rgba(0,0,0,1)] ${estilo[n.tipo]}`}>
          <div className="flex items-start gap-2.5">
            <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${punto[n.tipo]}`} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-[#EAF0F6]">{n.titulo}</p>
              <p className="mt-0.5 text-xs leading-snug text-[#93A1B1]">{n.mensaje}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setErrorEliminar('');
                void eliminarNotificacion(n.id).catch((error: unknown) => {
                  setErrorEliminar(error instanceof Error ? error.message : 'No se pudo quitar el aviso.');
                });
              }}
              aria-label="Quitar notificación"
              title="Quitar notificación"
              className="shrink-0 rounded-md p-1 text-[#93A1B1] transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {errorEliminar && <p role="alert" className="mt-2 text-[11px] font-semibold text-rose-300">{errorEliminar}</p>}
        </div>
      ))}
    </div>
  );
};

/* =========================================================
   ASESOR DE ESTILO (QUIZ)
   ========================================================= */
export const QuizModal: React.FC = () => {
  const { quizAbierto, setQuizAbierto, abrirReserva, catalogoCortes } = useApp();
  const [paso, setPaso] = useState(1);
  const [rostro, setRostro] = useState('');
  const [estilo, setEstilo] = useState('');
  const [barba, setBarba] = useState('');

  if (!quizAbierto) return null;

  const reiniciar = () => { setPaso(1); setRostro(''); setEstilo(''); setBarba(''); };
  const cerrar = () => { setQuizAbierto(false); reiniciar(); };

  let corte = catalogoCortes[0];
  let motivo = 'El más versátil de la temporada: juvenil, dinámico y muy favorecedor.';
  if (rostro === 'Cuadrado' || estilo === 'Ejecutivo clásico') {
    corte = catalogoCortes[2]; motivo = 'Suaviza los ángulos de la mandíbula y aporta una silueta elegante y ejecutiva.';
  } else if (barba === 'Barba densa') {
    corte = catalogoCortes[1]; motivo = 'El taper se integra con tu barba creando una transición armónica y natural.';
  } else if (estilo === 'Artístico') {
    corte = catalogoCortes[4]; motivo = 'Resalta tu personalidad audaz con textura y movimiento marcado.';
  } else if (estilo === 'Bajo mantenimiento') {
    corte = catalogoCortes[3]; motivo = 'Líneas limpias, frescura total y cero esfuerzo diario de peinado.';
  }

  const opciones = (items: string[], valor: string, set: (v: string) => void, next: number) => (
    <div className="grid grid-cols-2 gap-2.5">
      {items.map((o) => (
        <button key={o} onClick={() => { set(o); setPaso(next); }}
          className={`rounded-2xl border p-3.5 text-left text-sm font-bold transition hover:-translate-y-0.5 hover:border-neutral-900 ${
            valor === o ? 'border-neutral-900 bg-amber-400/10 text-amber-700' : 'border-white/10 bg-[#141A21] text-[#C6D0DC]'
          }`}>
          {o}
        </button>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="anim-zoom card w-full max-w-lg overflow-hidden">
        <div className="flex items-start justify-between bg-gradient-to-r from-neutral-950 to-neutral-800 px-6 py-5 text-white">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-300/90">Asesor de estilo</span>
            <h3 className="font-heading text-2xl font-black">¿Qué corte me queda mejor?</h3>
          </div>
          <button onClick={cerrar} className="rounded-full bg-white/10 p-2 hover:bg-white/20"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-4 p-6">
          {paso <= 3 && (
            <div className="flex gap-1.5">
              {[1, 2, 3].map((i) => (
                <span key={i} className={`h-1.5 flex-1 rounded-full ${paso >= i ? 'bg-amber-400' : 'bg-[#263140]'}`} />
              ))}
            </div>
          )}

          {paso === 1 && (
            <div className="anim-aparecer space-y-3">
              <p className="text-sm font-bold text-[#EAF0F6]">1. ¿Cómo es la forma de tu rostro?</p>
              {opciones(['Ovalado', 'Cuadrado', 'Redondo', 'Alargado'], rostro, setRostro, 2)}
            </div>
          )}
          {paso === 2 && (
            <div className="anim-aparecer space-y-3">
              <p className="text-sm font-bold text-[#EAF0F6]">2. ¿Cuál es tu estilo?</p>
              {opciones(['Urbano moderno', 'Ejecutivo clásico', 'Bajo mantenimiento', 'Artístico'], estilo, setEstilo, 3)}
            </div>
          )}
          {paso === 3 && (
            <div className="anim-aparecer space-y-3">
              <p className="text-sm font-bold text-[#EAF0F6]">3. ¿Cómo llevas tu barba?</p>
              {opciones(['Sin barba', 'Barba corta', 'Barba densa', 'Solo bigote'], barba, setBarba, 4)}
            </div>
          )}

          {paso === 4 && (
            <div className="anim-zoom space-y-4">
              <div className="rounded-2xl border border-amber-400/30 bg-amber-400/8 p-4 text-center">
                <span className="rounded-full bg-amber-400 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-[#1A1400]">
                  Compatibilidad 98%
                </span>
                <h4 className="font-heading mt-2 text-xl font-black text-[#EAF0F6]">{corte.nombre}</h4>
                <p className="mt-1 text-xs text-[#93A1B1]">{motivo}</p>
              </div>
              <img src={corte.imagen_url} alt={corte.nombre} className="h-44 w-full rounded-2xl object-cover" />
              <div className="flex items-center justify-between text-xs font-semibold text-[#93A1B1]">
                <span className="flex items-center gap-1"><Crown className="h-3.5 w-3.5 text-amber-600" /> {corte.barbero_recomendado}</span>
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-amber-600" /> {duracionLegible(corte.duracion_minutos)}</span>
                <span className="font-black text-[#EAF0F6]">{formatoCOP(corte.precio_sugerido)}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={reiniciar} className="flex items-center gap-1.5 rounded-2xl border border-white/12 px-4 py-2.5 text-xs font-bold text-[#93A1B1] hover:bg-white/5">
                  <RotateCcw className="h-3.5 w-3.5" /> Repetir
                </button>
                <button onClick={() => { cerrar(); abrirReserva({ servicioId: corte.id_servicio ?? undefined }); }}
                  className="btn-primario flex flex-1 items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-bold">
                  Agendar este corte <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   LISTA DE ESPERA
   ========================================================= */
export const EsperaModal: React.FC = () => {
  const { esperaAbierta, setEsperaAbierta, servicios, barberos, usuario, unirseListaEspera, abrirAuth } = useApp();
  const [servId, setServId] = useState(servicios[0]?.id_servicio ?? 1);
  const [barbId, setBarbId] = useState<number | ''>('');
  const [fecha, setFecha] = useState(hoyISO());
  const [franja, setFranja] = useState<FranjaEspera>('tarde');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [horariosNegocio, setHorariosNegocio] = useState<HorarioNegocio[]>([]);
  const [cierresNegocio, setCierresNegocio] = useState<CierreNegocio[]>([]);
  const [cargandoCalendario, setCargandoCalendario] = useState(false);
  const [errorCalendario, setErrorCalendario] = useState('');
  const [nombreInvitado, setNombreInvitado] = useState('');
  const [correoInvitado, setCorreoInvitado] = useState('');
  const [telefonoInvitado, setTelefonoInvitado] = useState('');
  const [idSolicitudInvitado, setIdSolicitudInvitado] = useState<number | null>(null);
  const [codigoInvitado, setCodigoInvitado] = useState('');
  const [mensajeCodigo, setMensajeCodigo] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');

  useEffect(() => {
    if (servicios.length && !servicios.some((servicio) => servicio.id_servicio === servId)) {
      setServId(servicios[0].id_servicio);
    }
  }, [servicios, servId]);

  useEffect(() => {
    if (!esperaAbierta) return;
    const controlador = new AbortController();
    setCargandoCalendario(true);
    setErrorCalendario('');
    Promise.all([
      apiRequest<HorarioNegocio[]>('/agenda/horarios-negocio', { signal: controlador.signal }),
      apiRequest<CierreNegocio[]>(
        `/agenda/cierres?desde=${hoyISO()}&hasta=${sumarDiasISO(90)}`,
        { signal: controlador.signal },
      ),
    ])
      .then(([horarios, cierres]) => {
        if (controlador.signal.aborted) return;
        setHorariosNegocio(horarios);
        setCierresNegocio(cierres);
        const proximaFecha = buscarProximaFechaSolicitable(franja, horarios, cierres);
        if (proximaFecha) setFecha(proximaFecha);
        else setErrorCalendario('No encontramos fechas abiertas en los próximos 90 días.');
      })
      .catch((causa: unknown) => {
        if (!controlador.signal.aborted) {
          setErrorCalendario(mensajeErrorEspera(causa));
        }
      })
      .finally(() => {
        if (!controlador.signal.aborted) setCargandoCalendario(false);
      });
    return () => controlador.abort();
  }, [esperaAbierta, franja]);

  if (!esperaAbierta) return null;

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMensajeExito('');
    if (cargandoCalendario || errorCalendario || !fechaValida) return;
    if (!fechaSolicitable(fecha, franja, horariosNegocio, cierresNegocio)) {
      setError('El negocio no atiende en esa fecha o franja. Elige un horario de atención disponible.');
      return;
    }
    if (!usuario && idSolicitudInvitado !== null && !/^[0-9]{6}$/.test(codigoInvitado)) {
      setError('Ingresa el código de seis dígitos que enviamos a tu correo.');
      return;
    }
    setGuardando(true);
    if (!usuario) {
      if (!nombreInvitado.trim() || !correoInvitado.trim() || !telefonoInvitado.trim()) {
        setGuardando(false);
        setError('Completa tu nombre, correo y teléfono.');
        return;
      }
      try {
        if (idSolicitudInvitado !== null) {
          const resultado = await apiRequest<{ id_espera: number }>('/lista-espera/invitado/confirmar', {
            method: 'POST',
            body: JSON.stringify({ id_solicitud: idSolicitudInvitado, codigo: codigoInvitado }),
          });
          setMensajeExito(`Listo. Tu solicitud quedó registrada (#${resultado.id_espera}).`);
          setIdSolicitudInvitado(null);
          setCodigoInvitado('');
        } else {
          const resultado = await apiRequest<{ id_solicitud: number; mensaje: string }>(
            '/lista-espera/invitado/verificacion',
            {
              method: 'POST',
              body: JSON.stringify({
                nombre: nombreInvitado,
                correo: correoInvitado,
                telefono: telefonoInvitado,
                id_servicio: Number(servId),
                id_barbero: barbId ? Number(barbId) : null,
                fecha_deseada: fecha,
                franja_horaria: franja,
              }),
            },
          );
          setIdSolicitudInvitado(resultado.id_solicitud);
          setMensajeCodigo(resultado.mensaje);
        }
      } catch (causa) {
        setError(mensajeErrorEspera(causa));
      } finally {
        setGuardando(false);
      }
      return;
    }

    if (usuario.id_rol !== 3 || !usuario.id_cliente) {
      setGuardando(false);
      setError('Inicia sesión con una cuenta de cliente para anotarte.');
      return;
    }
    const resultado = await unirseListaEspera({
      id_servicio: Number(servId),
      id_barbero: barbId ? Number(barbId) : undefined,
      fecha_deseada: fecha,
      franja_horaria: franja,
    });
    setGuardando(false);
    if (!resultado.ok) {
      setError(mensajeErrorEspera(new Error(resultado.mensaje)));
      return;
    }
    setMensajeExito('Tu solicitud quedó registrada. Te avisaremos si se libera un turno compatible.');
  };

  const input = 'w-full rounded-xl border border-white/10 bg-[#0F151C] px-3.5 py-2.5 text-sm text-[#EAF0F6] placeholder-[#5A6878] outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-400/15';
  const cambiarFranja = (nuevaFranja: FranjaEspera) => {
    setFranja(nuevaFranja);
    setError('');
    setIdSolicitudInvitado(null);
    setCodigoInvitado('');
    if (!fechaSolicitable(fecha, nuevaFranja, horariosNegocio, cierresNegocio)) {
      const proxima = buscarProximaFechaSolicitable(nuevaFranja, horariosNegocio, cierresNegocio);
      if (proxima) setFecha(proxima);
    }
  };
  const primeraFechaValida = buscarProximaFechaSolicitable(franja, horariosNegocio, cierresNegocio);
  const fechaValida = fechaSolicitable(fecha, franja, horariosNegocio, cierresNegocio);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-4">
      <div className="anim-zoom card flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden">
        <header className="shrink-0 bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-800 px-5 py-5 text-white sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-400 text-[#06232A] shadow-lg shadow-cyan-950/30">
                <Bell className="h-5 w-5" />
              </span>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">Un turno puede liberarse</span>
                <h3 className="font-heading mt-0.5 text-xl font-black sm:text-2xl">Lista de espera</h3>
                <p className="mt-1 text-xs text-white/65">Cuéntanos qué horario te sirve y te avisamos.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEsperaAbierta(false)}
              aria-label="Cerrar lista de espera"
              className="rounded-full bg-white/10 p-2 transition hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <form onSubmit={enviar} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {mensajeExito ? (
            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/8 p-5 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                <Check className="h-6 w-6" />
              </span>
              <h4 className="mt-3 text-base font-black text-[#EAF0F6]">¡Solicitud registrada!</h4>
              <p role="status" className="mt-1 text-sm text-[#93A1B1]">{mensajeExito}</p>
              <button
                type="button"
                onClick={() => setEsperaAbierta(false)}
                className="btn-primario mt-4 w-full rounded-xl py-2.5 text-sm font-bold"
              >
                Listo
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-3 rounded-2xl border border-cyan-400/25 bg-cyan-400/10 p-3.5">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan-400/20 text-cyan-800">
                  <Clock className="h-4 w-4" />
                </span>
                <p className="text-xs leading-relaxed text-[#3F555B]">
                  Si aparece un espacio que coincida con tus preferencias, te avisaremos para que puedas tomarlo.
                </p>
              </div>

              <section className="rounded-2xl border border-white/10 bg-[#141A21] p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400/15 text-xs font-black text-amber-700">1</span>
                  <h4 className="text-sm font-black text-[#EAF0F6]">¿Qué servicio buscas?</h4>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className="block min-w-0">
                    <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-[#93A1B1]">
                      <Scissors className="h-3.5 w-3.5 text-amber-600" /> Servicio
                    </span>
                    <select
                      value={servId}
                      onChange={(e) => {
                        setServId(Number(e.target.value));
                        setIdSolicitudInvitado(null);
                        setCodigoInvitado('');
                      }}
                      disabled={!servicios.length || Boolean(mensajeExito)}
                      className={input}
                    >
                      {servicios.map((servicio) => (
                        <option key={servicio.id_servicio} value={servicio.id_servicio}>{servicio.nombre}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block min-w-0">
                    <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-[#93A1B1]">
                      <UserRound className="h-3.5 w-3.5 text-amber-600" /> Barbero
                    </span>
                    <select
                      value={barbId}
                      onChange={(e) => {
                        setBarbId(e.target.value ? Number(e.target.value) : '');
                        setIdSolicitudInvitado(null);
                        setCodigoInvitado('');
                      }}
                      disabled={Boolean(mensajeExito)}
                      className={input}
                    >
                      <option value="">Cualquiera disponible</option>
                      {barberos.map((barbero) => (
                        <option key={barbero.id_barbero} value={barbero.id_barbero}>{barbero.nombre}</option>
                      ))}
                    </select>
                  </label>
                </div>
                {!servicios.length && (
                  <p role="alert" className="mt-3 text-xs font-semibold text-rose-500">
                    No hay servicios activos para solicitar un turno.
                  </p>
                )}
              </section>

              <section className="rounded-2xl border border-white/10 bg-[#141A21] p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400/15 text-xs font-black text-amber-700">2</span>
                  <h4 className="text-sm font-black text-[#EAF0F6]">¿Qué día y horario prefieres?</h4>
                </div>
                <label className="block">
                  <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-[#93A1B1]">
                    <CalendarDays className="h-3.5 w-3.5 text-amber-600" /> Fecha
                  </span>
                  <input
                    type="date"
                    min={primeraFechaValida ?? hoyISO()}
                    value={fecha}
                    onChange={(e) => {
                      setFecha(e.target.value);
                      setError('');
                      setIdSolicitudInvitado(null);
                      setCodigoInvitado('');
                      if (!fechaSolicitable(e.target.value, franja, horariosNegocio, cierresNegocio)) {
                        setError('Ese día el negocio está cerrado o ya terminó el horario seleccionado.');
                      }
                    }}
                    disabled={cargandoCalendario || Boolean(errorCalendario) || Boolean(mensajeExito)}
                    className={input}
                  />
                </label>
                <fieldset className="mt-3">
                  <legend className="mb-1.5 text-[11px] font-bold text-[#93A1B1]">Franja del día</legend>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { id: 'manana', titulo: 'Mañana', detalle: 'Antes de 1 p. m.' },
                      { id: 'tarde', titulo: 'Tarde', detalle: 'Desde 1 p. m.' },
                      { id: 'cualquiera', titulo: 'Flexible', detalle: 'Cualquier hora' },
                    ] as const).map((opcion) => (
                      <button
                        key={opcion.id}
                        type="button"
                        aria-pressed={franja === opcion.id}
                        onClick={() => cambiarFranja(opcion.id)}
                        disabled={Boolean(mensajeExito)}
                        className={`rounded-xl border px-2 py-2.5 text-left transition ${
                          franja === opcion.id
                            ? 'border-cyan-500 bg-cyan-400/15 shadow-sm'
                            : 'border-white/10 bg-white/5 hover:border-cyan-400/50'
                        } disabled:opacity-60`}
                      >
                        <span className="block text-xs font-black text-[#EAF0F6]">{opcion.titulo}</span>
                        <span className="mt-0.5 block text-[9px] leading-tight text-[#93A1B1]">{opcion.detalle}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>
              </section>

              {!usuario ? (
                <section className="rounded-2xl border border-white/10 bg-[#141A21] p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400/15 text-xs font-black text-amber-700">3</span>
                    <div>
                      <h4 className="text-sm font-black text-[#EAF0F6]">¿A quién avisamos?</h4>
                      <p className="text-[11px] text-[#93A1B1]">Puedes continuar como invitado; verificaremos tu correo.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-1.5 block text-[11px] font-bold text-[#93A1B1]">Nombre completo</span>
                      <input
                        autoComplete="name"
                        value={nombreInvitado}
                        onChange={(e) => {
                          setNombreInvitado(e.target.value);
                          setIdSolicitudInvitado(null);
                          setCodigoInvitado('');
                        }}
                        placeholder="Ej. Laura Cepeda"
                        disabled={Boolean(mensajeExito)}
                        className={input}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-[#93A1B1]">
                        <Mail className="h-3.5 w-3.5 text-amber-600" /> Correo electrónico
                      </span>
                      <input
                        type="email"
                        autoComplete="email"
                        value={correoInvitado}
                        onChange={(e) => {
                          setCorreoInvitado(e.target.value);
                          setIdSolicitudInvitado(null);
                          setCodigoInvitado('');
                        }}
                        placeholder="tucorreo@ejemplo.com"
                        disabled={Boolean(mensajeExito)}
                        className={input}
                      />
                    </label>
                    <label className="block md:col-span-2">
                      <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-[#93A1B1]">
                        <Phone className="h-3.5 w-3.5 text-amber-600" /> Teléfono de contacto
                      </span>
                      <input
                        type="tel"
                        autoComplete="tel"
                        value={telefonoInvitado}
                        onChange={(e) => {
                          setTelefonoInvitado(e.target.value);
                          setIdSolicitudInvitado(null);
                          setCodigoInvitado('');
                        }}
                        placeholder="Tu número de celular"
                        disabled={Boolean(mensajeExito)}
                        className={input}
                      />
                    </label>
                  </div>
                  <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3">
                    <p className="text-xs font-bold text-[#EAF0F6]">¿Ya tienes una cuenta?</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => abrirAuth('login')}
                        className="flex items-center justify-center gap-1.5 rounded-lg bg-amber-400 px-2 py-2 text-[11px] font-black text-[#1A1400] transition hover:brightness-105"
                      >
                        <LogIn className="h-3.5 w-3.5" /> Iniciar sesión
                      </button>
                      <button
                        type="button"
                        onClick={() => abrirAuth('registro')}
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-white/12 px-2 py-2 text-[11px] font-bold text-[#EAF0F6] transition hover:border-amber-400/50"
                      >
                        <UserPlus className="h-3.5 w-3.5" /> Crear cuenta
                      </button>
                    </div>
                  </div>
                </section>
              ) : (
                <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3.5">
                  <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600" />
                  <p className="text-xs text-[#93A1B1]">
                    La solicitud quedará vinculada a <strong className="text-[#EAF0F6]">{usuario.nombre}</strong>.
                  </p>
                </div>
              )}

              {errorCalendario && (
                <p role="alert" className="rounded-xl bg-rose-400/10 p-3 text-xs font-semibold text-rose-500">{errorCalendario}</p>
              )}
              {!cargandoCalendario && !errorCalendario && !fechaValida && (
                <p role="alert" className="rounded-xl bg-rose-400/10 p-3 text-xs font-semibold text-rose-500">
                  No hay atención en esa fecha y franja. Selecciona otra opción.
                </p>
              )}
              {idSolicitudInvitado !== null && (
                <div className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 p-4">
                  <p role="status" className="text-xs font-semibold text-[#3F555B]">{mensajeCodigo}</p>
                  <label htmlFor="codigo-espera-invitado" className="mb-1.5 mt-3 block text-[11px] font-bold text-[#3F555B]">
                    Código de seis dígitos
                  </label>
                  <input
                    id="codigo-espera-invitado"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={codigoInvitado}
                    onChange={(e) => setCodigoInvitado(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className={`${input} text-center text-lg font-black tracking-[0.35em]`}
                  />
                </div>
              )}
              {error && <p role="alert" className="rounded-xl bg-rose-400/10 p-3 text-xs font-semibold text-rose-500">{error}</p>}

              <button
                type="submit"
                disabled={guardando || cargandoCalendario || Boolean(errorCalendario) || !fechaValida || !servicios.length}
                className="btn-primario flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-black disabled:opacity-50"
              >
                {guardando ? (
                  <><span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" /> Procesando…</>
                ) : (
                  <><Check className="h-4 w-4" />{idSolicitudInvitado !== null ? 'Confirmar y unirme' : usuario ? 'Unirme a la lista' : 'Enviarme código por correo'}</>
                )}
              </button>
              <p className="text-center text-[10px] text-[#6B7A8C]">
                Sin costo · No se crea una reserva hasta que aceptes un turno disponible
              </p>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

/* =========================================================
   PIE DE PÁGINA
   ========================================================= */
export const Footer: React.FC = () => {
  const { irA, abrirReserva, setEsperaAbierta, vista, barberos } = useApp();

  if (vista === 'panel-cliente') {
    return (
      <footer className="panel-cliente-footer border-t border-[#e6e9e3] bg-white text-[#172124]">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:grid-cols-3 sm:px-6 lg:px-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="logo-marco relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#141A21]">
                <img src="/Logo.webp" alt="Logo Globde" className="relative z-10 h-full w-full object-contain p-1" />
              </span>
              <p className="font-heading text-sm font-black leading-none">GLOBDE</p>
            </div>
            <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.2em] text-[#18899a]">Barber Gestor</p>
            <p className="mt-2 text-[9px] leading-relaxed text-[#65716d]">Estilo y cuidado personal en Bogotá.</p>
          </div>
          <div>
            <h2 className="text-[9px] font-black uppercase tracking-wider text-[#394642]">Horarios</h2>
            <p className="mt-2 text-[9px] leading-relaxed text-[#65716d]">Lun–Vie 8:00 a. m.–8:00 p. m.<br />Sábados 8:00 a. m.–3:00 p. m.</p>
          </div>
          <div>
            <h2 className="text-[9px] font-black uppercase tracking-wider text-[#394642]">Contacto</h2>
            <p className="mt-2 text-[9px] leading-relaxed text-[#65716d]">Calle 85 #14-20, Bogotá<br />+57 312 456 7890</p>
          </div>
        </div>
        <p className="border-t border-[#edf0ec] py-2 text-center text-[8px] text-[#87918c]">© 2026 Globde Barber Studio</p>
      </footer>
    );
  }

  return (
    <footer className="border-t border-white/8 bg-[#141A21]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="poste-barberia logo-marco relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#0F151C] ring-1 ring-neutral-900/30">
                <img src="/Logo.webp" alt="Logo Globde" className="relative z-10 h-full w-full object-contain p-1" />
              </span>
              <span>
                <span className="font-heading block text-lg font-black text-[#EAF0F6]">GLOB<span className="text-amber-500">DE</span></span>
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-600">Barber Studio</span>
              </span>
            </div>
            <p className="text-xs leading-relaxed text-[#93A1B1]">
              Tu barbershop de confianza en Bogotá. Agenda tu cita en línea, acumula
              puntos con cada visita y disfruta de beneficios exclusivos en cada corte.
            </p>
          </div>

          <div>
            <h4 className="font-heading mb-3 text-sm font-black uppercase tracking-wide text-[#EAF0F6]">Navegación</h4>
            <ul className="space-y-2 text-xs font-semibold text-[#93A1B1]">
              <li><button onClick={() => irA('inicio')} className="hover:text-amber-600">Inicio</button></li>
              <li><button onClick={() => irA('catalogo')} className="hover:text-amber-600">Catálogo de servicios</button></li>
              <li><button onClick={() => irA('fidelizacion')} className="hover:text-amber-600">Club de puntos</button></li>
              <li><button onClick={() => setEsperaAbierta(true)} className="hover:text-amber-600">Lista de espera</button></li>
              <li><button onClick={() => abrirReserva()} className="font-black text-amber-600 hover:underline">Reservar cita</button></li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading mb-3 flex items-center gap-1.5 text-sm font-black uppercase tracking-wide text-[#EAF0F6]">
              <CalendarDays className="h-4 w-4 text-amber-600" /> Horarios
            </h4>
            <ul className="space-y-1.5 text-xs text-[#93A1B1]">
              <li className="flex justify-between"><span>Lunes a viernes</span><strong className="text-[#EAF0F6]">8:00 a.m. – 8:00 p.m.</strong></li>
              <li className="flex justify-between"><span>Sábados</span><strong className="text-[#EAF0F6]">8:00 a.m. – 7:30 p.m.</strong></li>
              <li className="flex justify-between"><span>Domingos</span><strong className="text-amber-600">10:00 a.m. – 5:00 p.m.</strong></li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading mb-3 text-sm font-black uppercase tracking-wide text-[#EAF0F6]">Contacto</h4>
            <ul className="space-y-2 text-xs text-[#93A1B1]">
              <li className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 text-amber-600" /> Calle 85 #14-20, Zona Rosa, Bogotá</li>
              <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-amber-600" /> +57 312 456 7890</li>
              <li className="flex items-center gap-2"><Scissors className="h-4 w-4 text-amber-600" /> {barberos.length} {barberos.length === 1 ? 'barbero certificado' : 'barberos certificados'}</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 rounded-2xl bg-[#0F151C] p-4 sm:flex-row">
          <span className="flex items-center gap-2 text-xs font-semibold text-[#93A1B1]">
            <Code2 className="h-4 w-4 text-amber-600" /> Equipo ADSO · SENA: Juan Felipe Cañón · Dayanna Patiño · Laura Cepeda
          </span>
          <span className="flex items-center gap-2 text-xs text-[#93A1B1]">
            <ShieldCheck className="h-4 w-4 text-emerald-600" /> Datos protegidos y contraseñas cifradas
          </span>
        </div>

        <p className="mt-6 text-center text-[11px] text-[#5A6878]">
          © 2026 Globde Barber Studio · Todos los derechos reservados
          <Sparkles className="ml-1 inline h-3 w-3 text-amber-500" />
        </p>
      </div>
    </footer>
  );
};