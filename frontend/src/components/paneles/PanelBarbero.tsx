import React, { useState } from 'react';
import {
  Scissors, CalendarDays, Play, Check, XCircle, Star, Timer,
  ChevronLeft, ChevronRight, ToggleLeft, ToggleRight, Coins, Users,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  formatoCOP, fechaLarga, rangoHorario, duracionLegible, estiloEstado,
  hoyISO, paginar, generarFranjasJornada, franjasVigentes, sumarMinutos, hora12, haySolape,
} from '../../utils/helpers';

const POR_PAGINA = 4;

export const PanelBarbero: React.FC = () => {
  const {
    usuario, citas, barberos, servicios, cambiarEstadoCita,
    alternarDisponibilidad, franjasOcupadas, verTicket,
  } = useApp();

  const barbero = barberos.find((b) => b.id_usuario === usuario?.id_usuario) ?? barberos[0];
  const hoy = hoyISO();

  const [pagHoy, setPagHoy] = useState(1);
  const [pagProx, setPagProx] = useState(1);
  const [filtro, setFiltro] = useState<'todas' | 'pendiente' | 'confirmada' | 'completada'>('todas');

  const mias = citas.filter((c) => c.id_barbero === barbero.id_barbero);
  const deHoyTodas = mias.filter((c) => c.fecha === hoy).sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
  const deHoy = filtro === 'todas' ? deHoyTodas : deHoyTodas.filter((c) => c.estado === filtro);
  const proximas = mias.filter((c) => c.fecha > hoy).sort((a, b) => (a.fecha + a.hora_inicio).localeCompare(b.fecha + b.hora_inicio));

  const pHoy = paginar(deHoy, pagHoy, POR_PAGINA);
  const pProx = paginar(proximas, pagProx, POR_PAGINA);

  const completadas = deHoyTodas.filter((c) => c.estado === 'completada').length;
  const ingresos = deHoyTodas.filter((c) => ['completada', 'en_atencion'].includes(c.estado)).reduce((a, c) => a + c.precio_total, 0);
  const comision = Math.round(ingresos * (0.5 + barbero.porcentaje_incremento / 100));
  const minutosOcupados = deHoyTodas.filter((c) => c.estado !== 'cancelada').reduce((a, c) => a + c.duracion_minutos, 0);

  const ocupadasHoy = franjasOcupadas(hoy, barbero.id_barbero);
  const franjasLibres = franjasVigentes(
    generarFranjasJornada(barbero, hoy, 30, 30),
    hoy,
  )
    .map((ini) => ({ ini, fin: sumarMinutos(ini, 30) }))
    .filter((f) => !ocupadasHoy.some((o) => haySolape(f.ini, f.fin, o.inicio, o.fin)));

  const Paginador: React.FC<{ p: ReturnType<typeof paginar>; set: (n: number) => void }> = ({ p, set }) => (
    <div className="flex items-center justify-between border-t border-white/8 px-4 py-3">
      <span className="text-xs font-semibold text-[#93A1B1]">
        Mostrando <strong className="text-[#EAF0F6]">{p.desde}–{p.hasta}</strong> de {p.total} citas
      </span>
      <div className="flex items-center gap-1">
        <button onClick={() => set(p.pagina - 1)} disabled={p.pagina === 1}
          className="rounded-xl border border-white/12 p-1.5 text-[#93A1B1] transition disabled:opacity-30 enabled:hover:bg-white/5">
          <ChevronLeft className="h-4 w-4" />
        </button>
        {Array.from({ length: p.totalPaginas }, (_, i) => i + 1).map((n) => (
          <button key={n} onClick={() => set(n)}
            className={`h-8 w-8 rounded-xl text-xs font-black transition ${
              n === p.pagina ? 'bg-amber-400 text-[#1A1400] shadow' : 'border border-white/12 text-[#93A1B1] hover:bg-white/5'
            }`}>{n}</button>
        ))}
        <button onClick={() => set(p.pagina + 1)} disabled={p.pagina === p.totalPaginas}
          className="rounded-xl border border-white/12 p-1.5 text-[#93A1B1] transition disabled:opacity-30 enabled:hover:bg-white/5">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-[70vh] bg-[#0B0F14] py-10">
      <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
        {/* Encabezado */}
        <div className="card overflow-hidden">
          <div className="flex flex-col items-start gap-5 malla-suave p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div className="flex items-center gap-4">
              <img src={barbero.foto_url} alt="" className="h-16 w-16 rounded-2xl object-cover shadow-md sm:h-20 sm:w-20" />
              <div>
                <h1 className="font-heading flex items-center gap-2 text-2xl font-black text-[#EAF0F6] sm:text-3xl">
                  {barbero.nombre}
                  <span className="rounded-full bg-amber-400/15 px-2.5 py-0.5 text-xs font-black text-amber-300">{barbero.nivel}</span>
                </h1>
                <p className="text-sm font-semibold text-[#6B7A8C]">{barbero.rol_titulo}</p>
                <button onClick={() => alternarDisponibilidad(barbero.id_barbero)}
                  className="mt-2 flex items-center gap-1.5 text-xs font-black transition hover:opacity-80">
                  {barbero.disponible_hoy
                    ? <><ToggleRight className="h-6 w-6 text-emerald-400" /><span className="text-emerald-300">Recibiendo citas en línea</span></>
                    : <><ToggleLeft className="h-6 w-6 text-[#6B7A8C]" /><span className="text-[#6B7A8C]">En pausa / almuerzo</span></>}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { t: 'Citas hoy', v: deHoyTodas.length, s: `${completadas} completadas`, i: CalendarDays, c: 'text-neutral-900 bg-white/8' },
            { t: 'Recaudado hoy', v: formatoCOP(ingresos), s: 'Servicios cobrados', i: Coins, c: 'text-emerald-300 bg-emerald-400/12' },
            { t: 'Comisión estimada', v: formatoCOP(comision), s: `+${barbero.porcentaje_incremento}% por nivel`, i: Star, c: 'text-amber-300 bg-amber-400/12' },
            { t: 'Tiempo en sillón', v: duracionLegible(minutosOcupados), s: 'Ocupación del día', i: Timer, c: 'text-neutral-900 bg-white/8' },
          ].map((k) => (
            <div key={k.t} className="card p-5">
              <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${k.c}`}><k.i className="h-5 w-5" /></span>
              <p className="mt-3 text-[11px] font-bold uppercase text-[#6B7A8C]">{k.t}</p>
              <p className="font-heading text-xl font-black text-[#EAF0F6]">{k.v}</p>
              <p className="text-[11px] text-[#93A1B1]">{k.s}</p>
            </div>
          ))}
        </div>

        {/* Agenda del día */}
        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 p-5">
            <h2 className="font-heading flex items-center gap-2 text-xl font-black text-[#EAF0F6]">
              <CalendarDays className="h-5 w-5 text-amber-600" /> Agenda de hoy · {fechaLarga(hoy)}
            </h2>
            <div className="flex flex-wrap gap-1.5 rounded-2xl bg-[#0F151C] p-1">
              {(['todas', 'pendiente', 'confirmada', 'completada'] as const).map((f) => (
                <button key={f} onClick={() => { setFiltro(f); setPagHoy(1); }}
                  className={`rounded-xl px-3 py-1.5 text-[11px] font-black capitalize transition ${
                    filtro === f ? 'bg-amber-400 text-[#1A1400] shadow' : 'text-[#93A1B1] hover:text-[#EAF0F6]'
                  }`}>{f}</button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-white/6">
            {pHoy.items.length === 0 && <p className="p-8 text-center text-sm text-[#93A1B1]">No hay citas para este filtro.</p>}
            {pHoy.items.map((c) => {
              const est = estiloEstado(c.estado);
              return (
                <div key={c.id_cita} className={`flex flex-col gap-3 p-5 transition hover:bg-white/3 lg:flex-row lg:items-center lg:justify-between ${c.estado === 'en_atencion' ? 'bg-amber-400/6' : ''}`}>
                  <div className="flex items-start gap-4">
                    <div className="rounded-2xl border border-white/10 bg-[#0F151C] px-3 py-2 text-center">
                      <span className="font-heading block text-sm font-black text-[#EAF0F6]">{hora12(c.hora_inicio)}</span>
                      <span className="block text-[10px] font-semibold text-[#6B7A8C]">a {hora12(c.hora_fin)}</span>
                    </div>
                    <div>
                      <p className="flex items-center gap-2 text-sm font-black text-[#EAF0F6]">
                        {c.cliente_nombre}
                        <span className="text-[10px] font-bold text-amber-700">{c.codigo_reserva}</span>
                      </p>
                      <p className="text-xs font-semibold text-amber-300">{c.servicio_nombre} · {formatoCOP(c.precio_total)}</p>
                      <p className="text-[11px] text-[#6B7A8C]">
                        <Timer className="mr-1 inline h-3 w-3" />{duracionLegible(c.duracion_minutos)}
                        {c.observaciones && ` · “${c.observaciones}”`}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-3 py-1 text-[11px] font-black ${est.clase}`}>{est.texto}</span>
                    {!['completada', 'cancelada', 'no_asistio'].includes(c.estado) && (
                      <>
                        {c.estado !== 'en_atencion' && (
                          <button onClick={() => cambiarEstadoCita(c.id_cita, 'en_atencion')}
                            className="flex items-center gap-1 rounded-xl bg-neutral-900 px-3 py-1.5 text-[11px] font-black text-white transition hover:bg-neutral-800">
                            <Play className="h-3.5 w-3.5" /> Iniciar
                          </button>
                        )}
                        <button onClick={() => cambiarEstadoCita(c.id_cita, 'completada')}
                          className="flex items-center gap-1 rounded-xl bg-emerald-400 px-3 py-1.5 text-[11px] font-black text-[#04211F] transition hover:bg-emerald-300">
                          <Check className="h-3.5 w-3.5" /> Completar
                        </button>
                        <button onClick={() => cambiarEstadoCita(c.id_cita, 'no_asistio')}
                          className="rounded-xl border border-white/12 p-1.5 text-[#6B7A8C] transition hover:text-rose-300" title="No asistió">
                          <XCircle className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    <button onClick={() => verTicket(c)} className="rounded-xl border border-white/12 px-3 py-1.5 text-[11px] font-bold text-[#93A1B1] hover:bg-white/5">
                      Detalle
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <Paginador p={pHoy} set={setPagHoy} />
        </div>

        {/* Próximos días */}
        <div className="card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-white/8 p-5">
            <Users className="h-5 w-5 text-amber-300" />
            <h2 className="font-heading text-xl font-black text-[#EAF0F6]">Próximos días</h2>
          </div>
          <div className="divide-y divide-white/6">
            {pProx.items.length === 0 && <p className="p-8 text-center text-sm text-[#93A1B1]">Sin citas futuras registradas.</p>}
            {pProx.items.map((c) => (
              <div key={c.id_cita} className="flex items-center justify-between p-4 text-sm transition hover:bg-white/3">
                <div>
                  <p className="font-black text-[#EAF0F6]">{c.cliente_nombre}</p>
                  <p className="text-xs text-amber-700">{c.servicio_nombre}</p>
                  <p className="text-[11px] text-[#6B7A8C]">{fechaLarga(c.fecha)} · {rangoHorario(c.hora_inicio, c.hora_fin)}</p>
                </div>
                <span className="font-black text-amber-300">{formatoCOP(c.precio_total)}</span>
              </div>
            ))}
          </div>
          <Paginador p={pProx} set={setPagProx} />
        </div>
      </div>

    </div>
  );
};
