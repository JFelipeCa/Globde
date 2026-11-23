import React, { useEffect, useState } from 'react';
import { CalendarDays, Clock3, Plus, Save, Trash2 } from 'lucide-react';
import type { Barbero } from '../../types';
import { hoyISO } from '../../utils/helpers';
import { apiRequest } from '../../utils/apiClient';

interface FranjaHorario {
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  activo: boolean;
}

interface CitaAfectada {
  id_cita: number;
  codigo_reserva: string;
  hora_inicio: string;
  hora_fin: string;
  estado: string;
  cliente_nombre: string | null;
  barbero_nombre: string | null;
}

interface CierreNegocio {
  id_cierre: number;
  fecha: string;
  motivo: string;
  citas_afectadas: CitaAfectada[];
}

interface AgendaAdminProps {
  barberos: Barbero[];
}

const DIAS = [
  { numero: 1, nombre: 'Lunes' },
  { numero: 2, nombre: 'Martes' },
  { numero: 3, nombre: 'Miércoles' },
  { numero: 4, nombre: 'Jueves' },
  { numero: 5, nombre: 'Viernes' },
  { numero: 6, nombre: 'Sábado' },
  { numero: 7, nombre: 'Domingo' },
];

const CLASE_INPUT = 'rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100';

const mensajeDeError = (error: unknown, respaldo: string) =>
  error instanceof Error ? error.message : respaldo;

export const AgendaAdmin: React.FC<AgendaAdminProps> = ({ barberos }) => {
  const [horariosNegocio, setHorariosNegocio] = useState<FranjaHorario[]>([]);
  const [horariosBarbero, setHorariosBarbero] = useState<FranjaHorario[]>([]);
  const [cierres, setCierres] = useState<CierreNegocio[]>([]);
  const [barberoSeleccionado, setBarberoSeleccionado] = useState(0);
  const [fechaCierre, setFechaCierre] = useState(hoyISO());
  const [motivoCierre, setMotivoCierre] = useState('');
  const [cargando, setCargando] = useState(true);
  const [cargandoBarbero, setCargandoBarbero] = useState(false);
  const [guardandoNegocio, setGuardandoNegocio] = useState(false);
  const [guardandoBarbero, setGuardandoBarbero] = useState(false);
  const [guardandoCierre, setGuardandoCierre] = useState(false);
  const [error, setError] = useState('');
  const [errorBarbero, setErrorBarbero] = useState('');
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    let vigente = true;
    Promise.all([
      apiRequest<FranjaHorario[]>('/agenda/horarios-negocio'),
      apiRequest<CierreNegocio[]>(`/agenda/cierres?desde=${hoyISO()}`),
    ])
      .then(([horarios, cierresApi]) => {
        if (!vigente) return;
        setHorariosNegocio(horarios.filter((horario) => horario.activo));
        setCierres(cierresApi);
        setError('');
      })
      .catch((causa: unknown) => {
        if (vigente) setError(mensajeDeError(causa, 'No se pudo cargar la configuración de agenda.'));
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => { vigente = false; };
  }, []);

  useEffect(() => {
    if (!barberos.length) {
      setBarberoSeleccionado(0);
      setHorariosBarbero([]);
      return;
    }
    if (!barberos.some((barbero) => barbero.id_barbero === barberoSeleccionado)) {
      setBarberoSeleccionado(barberos[0].id_barbero);
    }
  }, [barberos, barberoSeleccionado]);

  useEffect(() => {
    if (!barberoSeleccionado) return;
    let vigente = true;
    setCargandoBarbero(true);
    setErrorBarbero('');
    apiRequest<FranjaHorario[]>(`/barberos/${barberoSeleccionado}/horarios`)
      .then((horarios) => {
        if (vigente) setHorariosBarbero(horarios.filter((horario) => horario.activo));
      })
      .catch((causa: unknown) => {
        if (vigente) setErrorBarbero(mensajeDeError(causa, 'No se pudo cargar la jornada del barbero.'));
      })
      .finally(() => {
        if (vigente) setCargandoBarbero(false);
      });
    return () => { vigente = false; };
  }, [barberoSeleccionado]);

  const cambiarFranja = (
    setHorarios: React.Dispatch<React.SetStateAction<FranjaHorario[]>>,
    indice: number,
    campo: 'hora_inicio' | 'hora_fin',
    valor: string,
  ) => {
    setHorarios((actuales) =>
      actuales.map((horario, index) => index === indice ? { ...horario, [campo]: valor } : horario),
    );
    setMensaje('');
  };

  const agregarFranja = (
    setHorarios: React.Dispatch<React.SetStateAction<FranjaHorario[]>>,
    dia: number,
  ) => {
    setHorarios((actuales) => [
      ...actuales,
      { dia_semana: dia, hora_inicio: '09:00', hora_fin: '17:00', activo: true },
    ]);
    setMensaje('');
  };

  const quitarFranja = (
    setHorarios: React.Dispatch<React.SetStateAction<FranjaHorario[]>>,
    indice: number,
  ) => {
    setHorarios((actuales) => actuales.filter((_, index) => index !== indice));
    setMensaje('');
  };

  const renderFranjas = (
    horarios: FranjaHorario[],
    setHorarios: React.Dispatch<React.SetStateAction<FranjaHorario[]>>,
  ) => DIAS.map((dia) => {
    const franjasDelDia = horarios
      .map((horario, indice) => ({ horario, indice }))
      .filter(({ horario }) => horario.dia_semana === dia.numero);
    return (
      <div key={dia.numero} className="grid gap-3 border-b border-slate-100 py-3 sm:grid-cols-[100px_1fr_auto] sm:items-start">
        <span className="pt-2 text-sm font-bold text-slate-800">{dia.nombre}</span>
        <div className="space-y-2">
          {franjasDelDia.length === 0 && <p className="pt-2 text-xs text-slate-500">Cerrado</p>}
          {franjasDelDia.map(({ horario, indice }) => (
            <div key={`${dia.numero}-${indice}`} className="flex flex-wrap items-center gap-2">
              <input
                type="time"
                aria-label={`${dia.nombre}: hora de apertura`}
                value={horario.hora_inicio}
                onChange={(evento) => cambiarFranja(setHorarios, indice, 'hora_inicio', evento.target.value)}
                className={CLASE_INPUT}
              />
              <span className="text-xs text-slate-500">a</span>
              <input
                type="time"
                aria-label={`${dia.nombre}: hora de cierre`}
                value={horario.hora_fin}
                onChange={(evento) => cambiarFranja(setHorarios, indice, 'hora_fin', evento.target.value)}
                className={CLASE_INPUT}
              />
              <button
                type="button"
                onClick={() => quitarFranja(setHorarios, indice)}
                aria-label={`Quitar franja de ${dia.nombre}`}
                className="rounded-lg p-2 text-rose-700 hover:bg-rose-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => agregarFranja(setHorarios, dia.numero)}
          className="inline-flex items-center gap-1 self-start rounded-lg px-2 py-2 text-xs font-bold text-cyan-800 hover:bg-cyan-50"
        >
          <Plus className="h-3.5 w-3.5" /> Agregar franja
        </button>
      </div>
    );
  });

  const validarFranjas = (horarios: FranjaHorario[]) =>
    horarios.every((horario) => horario.hora_inicio && horario.hora_fin && horario.hora_inicio < horario.hora_fin);

  const guardarHorariosNegocio = async (evento: React.FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setError('');
    setMensaje('');
    if (!validarFranjas(horariosNegocio)) {
      setError('Cada hora de cierre debe ser posterior a su hora de apertura.');
      return;
    }
    setGuardandoNegocio(true);
    try {
      const horarios = await apiRequest<FranjaHorario[]>('/agenda/horarios-negocio', {
        method: 'PUT',
        body: JSON.stringify({ horarios: horariosNegocio }),
      });
      setHorariosNegocio(horarios.filter((horario) => horario.activo));
      setMensaje('Horario general actualizado.');
    } catch (causa) {
      setError(mensajeDeError(causa, 'No se pudo guardar el horario general.'));
    } finally {
      setGuardandoNegocio(false);
    }
  };

  const guardarHorariosBarbero = async (evento: React.FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (!barberoSeleccionado) return;
    setErrorBarbero('');
    setMensaje('');
    if (!validarFranjas(horariosBarbero)) {
      setErrorBarbero('Cada hora de cierre debe ser posterior a su hora de apertura.');
      return;
    }
    setGuardandoBarbero(true);
    try {
      const horarios = await apiRequest<FranjaHorario[]>(
        `/barberos/${barberoSeleccionado}/horarios`,
        {
          method: 'PUT',
          body: JSON.stringify({ horarios: horariosBarbero }),
        },
      );
      setHorariosBarbero(horarios.filter((horario) => horario.activo));
      setMensaje('Jornada del barbero actualizada.');
    } catch (causa) {
      setErrorBarbero(mensajeDeError(causa, 'No se pudo guardar la jornada del barbero.'));
    } finally {
      setGuardandoBarbero(false);
    }
  };

  const crearCierre = async (evento: React.FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setError('');
    setMensaje('');
    setGuardandoCierre(true);
    try {
      const cierre = await apiRequest<CierreNegocio>('/agenda/cierres', {
        method: 'POST',
        body: JSON.stringify({ fecha: fechaCierre, motivo: motivoCierre }),
      });
      setCierres((actuales) => [...actuales.filter((item) => item.id_cierre !== cierre.id_cierre), cierre]
        .sort((a, b) => a.fecha.localeCompare(b.fecha)));
      setMotivoCierre('');
      setMensaje(
        cierre.citas_afectadas.length
          ? `Cierre registrado. Hay ${cierre.citas_afectadas.length} cita(s) activa(s) que requieren atención.`
          : 'Cierre registrado; no hay citas activas afectadas.',
      );
    } catch (causa) {
      setError(mensajeDeError(causa, 'No se pudo registrar el cierre.'));
    } finally {
      setGuardandoCierre(false);
    }
  };

  const eliminarCierre = async (cierre: CierreNegocio) => {
    setError('');
    setMensaje('');
    try {
      await apiRequest(`/agenda/cierres/${cierre.id_cierre}`, { method: 'DELETE' });
      setCierres((actuales) => actuales.filter((item) => item.id_cierre !== cierre.id_cierre));
      setMensaje('Cierre eliminado; el horario habitual vuelve a estar disponible.');
    } catch (causa) {
      setError(mensajeDeError(causa, 'No se pudo eliminar el cierre.'));
    }
  };

  if (cargando) {
    return <p className="rounded-xl bg-white p-6 text-sm text-slate-600">Cargando configuración de agenda…</p>;
  }

  return (
    <div className="anim-aparecer space-y-5">
      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {mensaje && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{mensaje}</p>}

      <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex items-start gap-3">
          <CalendarDays className="mt-1 h-5 w-5 text-cyan-700" />
          <div>
            <h2 className="text-lg font-black text-slate-950">Horario general del negocio</h2>
            <p className="text-sm text-slate-600">Define los días y franjas en que se pueden reservar citas.</p>
          </div>
        </div>
        <form onSubmit={guardarHorariosNegocio}>
          <div className="divide-y divide-slate-100">
            {renderFranjas(horariosNegocio, setHorariosNegocio)}
          </div>
          <button type="submit" disabled={guardandoNegocio}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
            <Save className="h-4 w-4" /> {guardandoNegocio ? 'Guardando…' : 'Guardar horario general'}
          </button>
        </form>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex items-start gap-3">
          <Clock3 className="mt-1 h-5 w-5 text-cyan-700" />
          <div>
            <h2 className="text-lg font-black text-slate-950">Jornada por barbero</h2>
            <p className="text-sm text-slate-600">Cada jornada debe estar dentro del horario general del negocio.</p>
          </div>
        </div>
        {barberos.length === 0 ? (
          <p className="text-sm text-slate-600">No hay barberos registrados.</p>
        ) : (
          <>
            <label htmlFor="agenda-barbero" className="mb-3 block text-xs font-bold text-slate-700">Barbero</label>
            <select id="agenda-barbero" value={barberoSeleccionado}
              onChange={(evento) => setBarberoSeleccionado(Number(evento.target.value))}
              className={`${CLASE_INPUT} mb-4 min-w-64`}>
              {barberos.map((barbero) => (
                <option key={barbero.id_barbero} value={barbero.id_barbero}>{barbero.nombre}</option>
              ))}
            </select>
            {errorBarbero && <p role="alert" className="mb-3 text-sm text-rose-800">{errorBarbero}</p>}
            {cargandoBarbero ? (
              <p className="py-4 text-sm text-slate-600">Cargando jornada…</p>
            ) : (
              <form onSubmit={guardarHorariosBarbero}>
                <div className="divide-y divide-slate-100">
                  {renderFranjas(horariosBarbero, setHorariosBarbero)}
                </div>
                <button type="submit" disabled={guardandoBarbero}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
                  <Save className="h-4 w-4" /> {guardandoBarbero ? 'Guardando…' : 'Guardar jornada'}
                </button>
              </form>
            )}
          </>
        )}
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex items-start gap-3">
          <CalendarDays className="mt-1 h-5 w-5 text-rose-700" />
          <div>
            <h2 className="text-lg font-black text-slate-950">Festivos y cierres especiales</h2>
            <p className="text-sm text-slate-600">Los cierres bloquean nuevas reservas para toda la barbería.</p>
          </div>
        </div>
        <form onSubmit={crearCierre} className="grid gap-3 sm:grid-cols-[180px_1fr_auto] sm:items-end">
          <label className="space-y-1 text-xs font-bold text-slate-700">
            Fecha
            <input type="date" min={hoyISO()} required value={fechaCierre}
              onChange={(evento) => setFechaCierre(evento.target.value)}
              className={`${CLASE_INPUT} block w-full`} />
          </label>
          <label className="space-y-1 text-xs font-bold text-slate-700">
            Motivo
            <input required minLength={3} maxLength={255} value={motivoCierre}
              onChange={(evento) => setMotivoCierre(evento.target.value)}
              placeholder="Festivo, mantenimiento, cierre especial…"
              className={`${CLASE_INPUT} block w-full`} />
          </label>
          <button type="submit" disabled={guardandoCierre}
            className="rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
            {guardandoCierre ? 'Guardando…' : 'Registrar cierre'}
          </button>
        </form>

        <div className="mt-5 space-y-3">
          {cierres.length === 0 && <p className="text-sm text-slate-600">No hay cierres futuros registrados.</p>}
          {cierres.map((cierre) => (
            <article key={cierre.id_cierre} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-900">{cierre.fecha} · {cierre.motivo}</p>
                  {cierre.citas_afectadas.length > 0 && (
                    <div className="mt-2 text-xs text-rose-800">
                      <p className="font-bold">Citas activas afectadas; requieren reprogramación o cancelación:</p>
                      <ul className="mt-1 list-inside list-disc">
                        {cierre.citas_afectadas.map((cita) => (
                          <li key={cita.id_cita}>
                            {cita.codigo_reserva} · {cita.hora_inicio} · {cita.cliente_nombre ?? 'Cliente'}
                            {cita.barbero_nombre ? ` · ${cita.barbero_nombre}` : ''}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <button type="button" onClick={() => void eliminarCierre(cierre)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50">
                  Eliminar cierre
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};
